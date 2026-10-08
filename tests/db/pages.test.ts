import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "../../src/types/database";
import {
  anonClient,
  ensureTestUser,
  signedInClient,
  testEnv,
} from "../support/supabase-admin";

type Client = SupabaseClient<Database>;

// Spec 0002 M1 rules for `pages`, and spec 0004 AC-7, AC-10, AC-12, AC-13.
let a: Client;
let b: Client;
const created: string[] = [];

async function createPage(client: Client, fields: { title?: string } = {}) {
  const id = crypto.randomUUID();
  const { data, error } = await client
    .from("pages")
    .insert({ id, position: "a0", ...fields })
    .select("id, title, updated_at")
    .single();
  if (error) throw new Error(`insert failed: ${error.message}`);
  created.push(id);
  return data;
}

beforeAll(async () => {
  const env = testEnv();
  await Promise.all([ensureTestUser(env.emailA), ensureTestUser(env.emailB)]);
  [a, b] = await Promise.all([
    signedInClient(env.emailA),
    signedInClient(env.emailB),
  ]);
});

afterAll(async () => {
  if (created.length > 0) await a.from("pages").delete().in("id", created);
});

describe("isolation", () => {
  it("account B cannot read, update, or delete A's page", async () => {
    const page = await createPage(a, { title: "A only" });

    const read = await b.from("pages").select("id").eq("id", page.id);
    expect(read.error).toBeNull();
    expect(read.data).toEqual([]);

    const update = await b
      .from("pages")
      .update({ title: "taken" })
      .eq("id", page.id)
      .select("id");
    expect(update.data).toEqual([]);

    const remove = await b
      .from("pages")
      .delete()
      .eq("id", page.id)
      .select("id");
    expect(remove.data).toEqual([]);

    const after = await a
      .from("pages")
      .select("title")
      .eq("id", page.id)
      .single();
    expect(after.data?.title).toBe("A only");
  });

  it("account B's list holds none of A's pages", async () => {
    const page = await createPage(a);
    const { data } = await b.from("pages").select("id");
    expect(data?.map((row) => row.id)).not.toContain(page.id);
  });

  it("anon is denied", async () => {
    const { error } = await anonClient().from("pages").select("id");
    expect(error?.code).toBe("42501");
  });

  it("a parent of another owner is rejected", async () => {
    const parent = await createPage(a);
    const { error } = await b
      .from("pages")
      .insert({ position: "a0", parent_id: parent.id });
    expect(error?.code).toBe("23503");
  });
});

describe("protected columns", () => {
  it("an insert cannot set owner_id", async () => {
    const env = testEnv();
    const ownerB = await ensureTestUser(env.emailB);
    const { error } = await a
      .from("pages")
      .insert({ position: "a0", owner_id: ownerB } as never);
    expect(error?.code).toBe("42501");
  });

  it("an update cannot set updated_at, created_at, or id", async () => {
    const page = await createPage(a);
    for (const fields of [
      { updated_at: "2000-01-01T00:00:00Z" },
      { created_at: "2000-01-01T00:00:00Z" },
      { id: crypto.randomUUID() },
    ]) {
      const { error } = await a
        .from("pages")
        .update(fields as never)
        .eq("id", page.id);
      expect(error?.code).toBe("42501");
    }
  });
});

describe("limits", () => {
  it.each([
    ["a 501 character title", { position: "a0", title: "x".repeat(501) }],
    ["content that is not an array", { position: "a0", content: {} }],
    ["a position with a space", { position: "a 0" }],
    ["an empty position", { position: "" }],
  ])("rejects %s", async (_name, fields) => {
    const { error } = await a.from("pages").insert(fields as never);
    expect(error?.code).toBe("23514");
  });

  it("rejects content over 2 MB", async () => {
    const page = await createPage(a);
    // `["…"]` as text is the string plus 4 bytes: 2,097,153 bytes in all.
    const content = ["x".repeat(2_097_153 - 4)];
    const { error } = await a
      .from("pages")
      .update({ content })
      .eq("id", page.id);
    expect(error?.code).toBe("23514");
  });

  it("rejects plain text over 512 KB", async () => {
    const page = await createPage(a);
    const { error } = await a
      .from("pages")
      .update({ content_text: "x".repeat(524_289) })
      .eq("id", page.id);
    expect(error?.code).toBe("23514");
  });
});

describe("updated_at guard", () => {
  it("a save with a stale updated_at changes nothing", async () => {
    const page = await createPage(a);
    const first = await a
      .from("pages")
      .update({ title: "first" })
      .eq("id", page.id)
      .eq("updated_at", page.updated_at)
      .select("updated_at");
    expect(first.data).toHaveLength(1);

    const stale = await a
      .from("pages")
      .update({ title: "stale" })
      .eq("id", page.id)
      .eq("updated_at", page.updated_at)
      .select("updated_at");
    expect(stale.error).toBeNull();
    expect(stale.data).toEqual([]);
  });

  it("the returned updated_at string round trips exactly", async () => {
    const page = await createPage(a);
    const saved = await a
      .from("pages")
      .update({ title: "one" })
      .eq("id", page.id)
      .eq("updated_at", page.updated_at)
      .select("updated_at")
      .single();
    const read = await a
      .from("pages")
      .select("updated_at")
      .eq("id", page.id)
      .single();
    expect(read.data?.updated_at).toBe(saved.data?.updated_at);

    const next = await a
      .from("pages")
      .update({ title: "two" })
      .eq("id", page.id)
      .eq("updated_at", read.data!.updated_at)
      .select("updated_at");
    expect(next.data).toHaveLength(1);
  });

  it("moves on a title change and not on a position change", async () => {
    const page = await createPage(a);
    const moved = await a
      .from("pages")
      .update({ position: "b0" })
      .eq("id", page.id)
      .select("updated_at")
      .single();
    expect(moved.data?.updated_at).toBe(page.updated_at);

    const renamed = await a
      .from("pages")
      .update({ title: "renamed" })
      .eq("id", page.id)
      .select("updated_at")
      .single();
    expect(renamed.data?.updated_at).not.toBe(page.updated_at);
  });
});

// Spec 0005 AC-11: spec 0002 M2 tree rules through private.check_page_parent().
describe("tree rules", () => {
  async function child(client: Client, parentId: string | null) {
    const id = crypto.randomUUID();
    const { error } = await client
      .from("pages")
      .insert({ id, position: "a0", parent_id: parentId });
    if (error) throw new Error(`insert failed: ${error.code} ${error.message}`);
    created.push(id);
    return id;
  }

  async function chain(length: number): Promise<string[]> {
    const ids: string[] = [];
    for (let level = 0; level < length; level++) {
      ids.push(await child(a, ids.at(-1) ?? null));
    }
    return ids;
  }

  async function parentOf(id: string) {
    const { data } = await a
      .from("pages")
      .select("parent_id")
      .eq("id", id)
      .single();
    return data?.parent_id;
  }

  it("rejects a move under its own grandchild with LN001 and changes nothing", async () => {
    const [top, middle, bottom] = await chain(3);
    const { error } = await a
      .from("pages")
      .update({ parent_id: bottom })
      .eq("id", top);
    expect(error?.code).toBe("LN001");
    expect(await parentOf(top)).toBeNull();
    expect(await parentOf(bottom)).toBe(middle);
  });

  it("rejects a page as its own parent", async () => {
    const page = await child(a, null);
    const { error } = await a
      .from("pages")
      .update({ parent_id: page })
      .eq("id", page);
    expect(error?.code).toBe("LN001");
  });

  it("applies exactly one of two crossing moves made at the same time", async () => {
    // A second session for the same account, so the two updates really overlap.
    const second = await signedInClient(testEnv().emailA);
    const x = await child(a, null);
    const y = await child(a, null);
    const results = await Promise.all([
      a.from("pages").update({ parent_id: y }).eq("id", x),
      second.from("pages").update({ parent_id: x }).eq("id", y),
    ]);
    const codes = results.map((result) => result.error?.code ?? "ok").sort();
    expect(codes).toEqual(["LN001", "ok"]);
    const parents = [await parentOf(x), await parentOf(y)];
    expect(parents.filter((parent) => parent === null)).toHaveLength(1);
  });

  it("allows 64 levels and rejects the 65th with LN003", async () => {
    const ids = await chain(64);
    const { error } = await a
      .from("pages")
      .insert({ position: "a0", parent_id: ids.at(-1) });
    expect(error?.code).toBe("LN003");
  }, 120_000);

  it("rejects moving a two level subtree under level 63 with LN003", async () => {
    const ids = await chain(63);
    const [top] = await chain(2);
    const { error } = await a
      .from("pages")
      .update({ parent_id: ids.at(-1) })
      .eq("id", top);
    expect(error?.code).toBe("LN003");
    expect(await parentOf(top)).toBeNull();
  }, 120_000);

  it("rejects a move under a parent of another account with 23503", async () => {
    const page = await child(a, null);
    const foreign = crypto.randomUUID();
    const insert = await b
      .from("pages")
      .insert({ id: foreign, position: "a0" });
    expect(insert.error).toBeNull();
    try {
      const { error } = await a
        .from("pages")
        .update({ parent_id: foreign })
        .eq("id", page);
      expect(error?.code).toBe("23503");
    } finally {
      await b.from("pages").delete().eq("id", foreign);
    }
  });

  it("still allows a reorder that only changes position", async () => {
    const parent = await child(a, null);
    const page = await child(a, parent);
    const { data, error } = await a
      .from("pages")
      .update({ position: "b0", parent_id: parent })
      .eq("id", page)
      .select("position, parent_id")
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({ position: "b0", parent_id: parent });
  });

  it("account B cannot move A's page", async () => {
    const parent = await child(a, null);
    const page = await child(a, null);
    const { data } = await b
      .from("pages")
      .update({ parent_id: parent })
      .eq("id", page)
      .select("id");
    expect(data).toEqual([]);
    expect(await parentOf(page)).toBeNull();
  });
});
