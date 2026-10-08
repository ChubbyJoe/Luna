import { describe, expect, it } from "vitest";

import {
  classifySaveError,
  createSession,
  hasUnsaved,
  jsonEqual,
  retryDelayMs,
  saveReducer,
  type SaveEvent,
  type Session,
} from "./save-machine";
import type { StoredBlock } from "./schemas";

const block = (text: string): StoredBlock => ({
  id: text,
  type: "paragraph",
  props: {},
  content: [{ type: "text", text, styles: {} }],
  children: [],
});

const origin = { title: "Old", content: [block("old")], updatedAt: "t0" };

function run(session: Session, ...events: SaveEvent[]): Session {
  return events.reduce(saveReducer, session);
}

const fresh = () => createSession(origin);
const dirty = () => run(fresh(), { type: "edit", title: "New" });
const saving = () => run(dirty(), { type: "send" });

describe("saveReducer: editing", () => {
  it("opens saved with a blank status", () => {
    expect(fresh()).toMatchObject({ state: "saved", status: "" });
  });

  it("an edit that differs marks the field dirty", () => {
    const session = dirty();
    expect(session).toMatchObject({
      state: "dirty",
      titleDirty: true,
      contentDirty: false,
    });
    expect(session.snapshot.title).toBe("New");
  });

  it("typing a title back to the saved value is not an edit", () => {
    const session = run(fresh(), { type: "edit", title: "Old" });
    expect(session.state).toBe("saved");
  });

  it("a dirty page keeps the status it showed, so it never flickers", () => {
    expect(dirty().status).toBe("");
    const afterSave = run(
      saving(),
      { type: "succeeded", updatedAt: "t1" },
      { type: "edit", title: "Newer" },
    );
    expect(afterSave).toMatchObject({ state: "dirty", status: "Saved" });
  });
});

describe("saveReducer: sending", () => {
  it("sends only the dirty fields", () => {
    expect(saving()).toMatchObject({
      state: "saving",
      status: "Saving…",
      inFlight: { title: "New", content: undefined },
    });
    const content = [block("new")];
    const both = run(
      fresh(),
      { type: "edit", content },
      { type: "edit", title: "T" },
      { type: "send" },
    );
    expect(both.inFlight).toEqual({ title: "T", content });
  });

  it("does not send while a save is in flight, or from saved", () => {
    const session = saving();
    expect(saveReducer(session, { type: "send" })).toBe(session);
    expect(saveReducer(fresh(), { type: "send" })).toEqual(fresh());
  });

  it("success with no new edits ends saved, with the new base", () => {
    const session = run(saving(), { type: "succeeded", updatedAt: "t1" });
    expect(session).toMatchObject({
      state: "saved",
      status: "Saved",
      base: "t1",
      titleDirty: false,
      inFlight: null,
      saved: { title: "New" },
    });
  });

  it("success with edits made meanwhile goes back to dirty", () => {
    const session = run(
      saving(),
      { type: "edit", title: "Newer" },
      { type: "succeeded", updatedAt: "t1" },
    );
    expect(session).toMatchObject({
      state: "dirty",
      base: "t1",
      titleDirty: true,
      saved: { title: "New" },
      snapshot: { title: "Newer" },
    });
  });

  it("a content edit during a save stays dirty after it", () => {
    const session = run(
      fresh(),
      { type: "edit", content: [block("a")] },
      { type: "send" },
      { type: "edit", content: [block("ab")] },
      { type: "succeeded", updatedAt: "t1" },
    );
    expect(session).toMatchObject({ state: "dirty", contentDirty: true });
  });
});

describe("saveReducer: failures", () => {
  it("a passing failure retries and counts the streak", () => {
    const once = run(saving(), { type: "failed", kind: "passing" });
    expect(once).toMatchObject({
      state: "retrying",
      status: "Not saved",
      failures: 1,
    });
    const twice = run(
      once,
      { type: "send" },
      { type: "failed", kind: "passing" },
    );
    expect(twice.failures).toBe(2);
    const recovered = run(
      twice,
      { type: "send" },
      { type: "succeeded", updatedAt: "t1" },
    );
    expect(recovered).toMatchObject({ state: "saved", failures: 0 });
  });

  it("edits while retrying only update the snapshot", () => {
    const retrying = run(saving(), { type: "failed", kind: "passing" });
    const edited = run(retrying, { type: "edit", title: "Later" });
    expect(edited).toMatchObject({
      state: "retrying",
      snapshot: { title: "Later" },
    });
  });

  it("a permanent failure does not retry; the next edit tries again", () => {
    const failed = run(saving(), { type: "failed", kind: "permanent" });
    expect(failed).toMatchObject({
      state: "failed",
      failureKind: "permanent",
      status: "Not saved",
    });
    expect(saveReducer(failed, { type: "send" })).toBe(failed);
    const edited = run(failed, { type: "edit", title: "Again" });
    expect(edited).toMatchObject({ state: "dirty", failures: 0 });
  });

  it("too large is a failure of its own kind", () => {
    const failed = run(saving(), { type: "failed", kind: "too_large" });
    expect(failed).toMatchObject({ state: "failed", failureKind: "too_large" });
  });

  it("sign out forces one more attempt from failed", () => {
    const failed = run(saving(), { type: "failed", kind: "permanent" });
    expect(run(failed, { type: "send", force: true }).state).toBe("saving");
  });

  it("remembers a signed out failure once per streak", () => {
    const session = run(saving(), {
      type: "failed",
      kind: "passing",
      signedOut: true,
    });
    expect(session.signedOutNotified).toBe(true);
    const recovered = run(
      session,
      { type: "send" },
      { type: "succeeded", updatedAt: "t1" },
    );
    expect(recovered.signedOutNotified).toBe(false);
  });
});

describe("saveReducer: conflicts", () => {
  const newer = {
    title: "Theirs",
    content: [block("theirs")],
    updatedAt: "t9",
  };

  it("a lost response whose save landed counts as saved", () => {
    const session = run(saving(), {
      type: "checked",
      row: { title: "New", content: origin.content, updatedAt: "t2" },
    });
    expect(session).toMatchObject({ state: "saved", base: "t2" });
  });

  it("another tab's version is a conflict that keeps this tab's text", () => {
    const session = run(saving(), { type: "checked", row: newer });
    expect(session).toMatchObject({
      state: "conflict",
      status: "Not saved",
      server: newer,
      snapshot: { title: "New" },
    });
    expect(saveReducer(session, { type: "send" })).toBe(session);
    const edited = run(session, { type: "edit", title: "Still mine" });
    expect(edited).toMatchObject({
      state: "conflict",
      snapshot: { title: "Still mine" },
    });
  });

  it("Load newer replaces this tab's version", () => {
    const session = run(
      saving(),
      { type: "checked", row: newer },
      { type: "loadNewer" },
    );
    expect(session).toMatchObject({
      state: "saved",
      base: "t9",
      snapshot: { title: "Theirs", content: newer.content },
      titleDirty: false,
      contentDirty: false,
    });
  });

  it("Keep mine sends the whole page over the newer version", () => {
    const session = run(
      saving(),
      { type: "checked", row: newer },
      { type: "keepMine" },
    );
    expect(session).toMatchObject({
      state: "saving",
      base: "t9",
      inFlight: { title: "New", content: origin.content },
    });
    const done = run(session, { type: "succeeded", updatedAt: "t10" });
    expect(done).toMatchObject({ state: "saved", saved: { title: "New" } });
  });

  it("a page that no longer reads back is gone, and never sends", () => {
    const gone = run(saving(), { type: "checked", row: null });
    expect(gone).toMatchObject({ state: "gone", status: "Not saved" });
    const edited = run(gone, { type: "edit", title: "x" }, { type: "send" });
    expect(edited.state).toBe("gone");
    expect(hasUnsaved(edited)).toBe(true);
  });
});

describe("retryDelayMs", () => {
  it("backs off 2, 4, 8, 16, then every 30 seconds", () => {
    expect([1, 2, 3, 4, 5, 9].map(retryDelayMs)).toEqual([
      2000, 4000, 8000, 16000, 30000, 30000,
    ]);
  });
});

describe("classifySaveError", () => {
  it.each([
    [{ code: "23514", status: 400 }, "too_large"],
    [{ code: "", status: 0 }, "passing"],
    [{}, "passing"],
    [{ code: "XX000", status: 503 }, "passing"],
    [{ code: "PGRST000", status: 408 }, "passing"],
    [{ code: "PGRST000", status: 429 }, "passing"],
    [{ code: "PGRST301", status: 401 }, "passing"],
    [{ code: "42501", status: 401 }, "passing"],
    [{ code: "22P02", status: 400 }, "permanent"],
    [{ code: "LN004", status: 400 }, "permanent"],
  ] as const)("%o is %s", (error, kind) => {
    expect(classifySaveError(error)).toBe(kind);
  });
});

describe("jsonEqual", () => {
  it("ignores key order and undefined keys", () => {
    expect(
      jsonEqual({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 }),
    ).toBe(true);
    expect(jsonEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(jsonEqual([1, 2], [2, 1])).toBe(false);
    expect(jsonEqual({ a: 1 }, { a: "1" })).toBe(false);
  });
});
