import { afterEach, describe, expect, it, vi } from "vitest";

import {
  expandedStorageKey,
  parseExpanded,
  pruneExpanded,
  serializeExpanded,
  withExpanded,
  withoutExpanded,
} from "./expanded-pages";
import { createExpandedStore } from "./hooks/use-expanded-pages";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

describe("parseExpanded", () => {
  it.each([
    ["nothing stored", null],
    ["bad JSON", "{not json"],
    ["an object", '{"a":1}'],
    ["a string", '"x"'],
    ["null", "null"],
  ])("reads %s as empty", (_name, raw) => {
    expect(parseExpanded(raw)).toEqual([]);
  });

  it("keeps page ids and drops everything else", () => {
    const raw = JSON.stringify([A, "nope", 3, null, B, A]);
    expect(parseExpanded(raw)).toEqual([A, B]);
  });

  it("round trips through serializeExpanded", () => {
    expect(parseExpanded(serializeExpanded([A, B]))).toEqual([A, B]);
  });
});

describe("set helpers", () => {
  it("adds only missing ids and keeps the same array when nothing changes", () => {
    const ids = [A];
    expect(withExpanded(ids, [A])).toBe(ids);
    expect(withExpanded(ids, [B, B])).toEqual([A, B]);
  });

  it("removes an id, or keeps the same array", () => {
    const ids = [A, B];
    expect(withoutExpanded(ids, A)).toEqual([B]);
    expect(withoutExpanded(ids, "other")).toBe(ids);
  });

  it("prunes ids of pages that no longer exist", () => {
    const ids = [A, B];
    expect(pruneExpanded(ids, new Set([B]))).toEqual([B]);
    expect(pruneExpanded(ids, new Set([A, B]))).toBe(ids);
  });
});

describe("expandedStorageKey", () => {
  it("is per account", () => {
    expect(expandedStorageKey("u1")).toBe("luna:sidebar-expanded:u1");
  });
});

describe("createExpandedStore", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("reads, writes, and notifies through localStorage", () => {
    window.localStorage.setItem("k", JSON.stringify([A]));
    const store = createExpandedStore("k");
    const onChange = vi.fn();
    store.subscribe(onChange);
    expect([...store.getSnapshot()]).toEqual([A]);

    store.expand([B]);
    expect(JSON.parse(window.localStorage.getItem("k")!)).toEqual([A, B]);
    store.collapse(A);
    expect([...store.getSnapshot()]).toEqual([B]);
    expect(onChange).toHaveBeenCalledTimes(2);

    store.expand([B]);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("keeps working in memory when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const store = createExpandedStore("k");
    expect(store.getSnapshot().size).toBe(0);
    store.expand([A]);
    expect([...store.getSnapshot()]).toEqual([A]);
  });

  it("prunes unknown ids from storage", () => {
    window.localStorage.setItem("k", JSON.stringify([A, B]));
    const store = createExpandedStore("k");
    store.prune(new Set([A]));
    expect(JSON.parse(window.localStorage.getItem("k")!)).toEqual([A]);
  });
});
