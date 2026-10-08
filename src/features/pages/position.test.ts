import { describe, expect, it } from "vitest";

import { comparePositioned, positionAfter, positionBetween } from "./position";

const KEY = /^[0-9A-Za-z]{1,128}$/;

describe("positionBetween", () => {
  it("makes a first key with no neighbours", () => {
    expect(positionBetween(null, null)).toMatch(KEY);
  });

  it("appends after the last key", () => {
    const first = positionBetween(null, null);
    const second = positionBetween(first, null);
    expect(second > first).toBe(true);
    expect(second).toMatch(KEY);
  });

  it("lands strictly between two keys", () => {
    const a = positionBetween(null, null);
    const c = positionBetween(a, null);
    const b = positionBetween(a, c);
    expect(a < b && b < c).toBe(true);
  });
});

describe("positionAfter", () => {
  const sorted = (
    rows: { id: string; position: string }[],
  ): { id: string; position: string }[] => [...rows].sort(comparePositioned);

  it("lands at the start with index -1", () => {
    const siblings = [{ id: "a", position: "a0" }];
    expect(positionAfter(siblings, -1) < "a0").toBe(true);
  });

  it("skips a duplicate key instead of throwing", () => {
    const siblings = sorted([
      { id: "a", position: "a0" },
      { id: "b", position: "a0" },
      { id: "c", position: "a1" },
    ]);
    const key = positionAfter(siblings, 0);
    expect(key > "a0" && key < "a1").toBe(true);
  });

  it("appends after the last sibling", () => {
    const siblings = [{ id: "a", position: "a0" }];
    expect(positionAfter(siblings, 0) > "a0").toBe(true);
  });
});

describe("comparePositioned", () => {
  it("orders by position, then id, in byte order", () => {
    const rows = [
      { id: "2", position: "a" },
      { id: "1", position: "a" },
      { id: "0", position: "Z" },
    ];
    expect([...rows].sort(comparePositioned).map((row) => row.id)).toEqual([
      "0",
      "1",
      "2",
    ]);
  });
});
