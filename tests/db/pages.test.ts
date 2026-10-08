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
