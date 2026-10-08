import { describe, expect, it } from "vitest";

import type { PageListItem } from "./schemas";
import {
  ancestorsOf,
  buildTree,
  childrenOf,
  descendantIdsOf,
  liveTitle,
  type TreeNode,
} from "./tree";

// Readable fixed uuids: id(1) is 00000000-0000-4000-8000-000000000001.
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function page(
  n: number,
  parent: number | null,
  position: string,
  title = `P${n}`,
): PageListItem {
  return {
    id: id(n),
    parent_id: parent === null ? null : id(parent),
    position,
    title,
  };
}

// Tree as nested titles, so expectations read like the sidebar.
function shape(nodes: TreeNode[]): unknown[] {
  return nodes.map((node) =>
    node.children.length === 0
      ? node.page.title
      : [node.page.title, shape(node.children)],
  );
}

describe("buildTree", () => {
  it("nests rows given in any order and sorts siblings by position", () => {
    const list = [
      page(4, 2, "a1"),
      page(2, null, "a1"),
      page(3, 2, "a0"),
      page(1, null, "a0"),
      page(5, 3, "a0"),
    ];
    expect(shape(buildTree(list))).toEqual([
      "P1",
      ["P2", [["P3", ["P5"]], "P4"]],
    ]);
  });

  it("breaks position ties by id", () => {
    const list = [page(2, null, "a0"), page(1, null, "a0")];
    expect(shape(buildTree(list))).toEqual(["P1", "P2"]);
  });

  it("sets depth from 1 at the top level", () => {
    const [top] = buildTree([page(1, null, "a0"), page(2, 1, "a0")]);
    expect(top.depth).toBe(1);
    expect(top.children[0].depth).toBe(2);
  });

  it("shows rows whose parent is missing at the end of the top level", () => {
    const list = [page(3, 99, "a0"), page(1, null, "b0"), page(4, 3, "a0")];
    expect(shape(buildTree(list))).toEqual(["P1", ["P3", ["P4"]]]);
  });

  it("builds a 64 level chain", () => {
    const list = Array.from({ length: 64 }, (_, index) =>
      page(index + 1, index === 0 ? null : index, "a0"),
    );
    let node = buildTree(list)[0];
    while (node.children.length > 0) node = node.children[0];
    expect(node.depth).toBe(64);
    expect(node.page.id).toBe(id(64));
  });

  it("returns nothing for an empty list", () => {
    expect(buildTree([])).toEqual([]);
  });
});

describe("childrenOf", () => {
  it("returns one parent's rows in order", () => {
    const list = [page(3, 1, "b0"), page(2, 1, "a0"), page(1, null, "a0")];
    expect(childrenOf(list, id(1)).map((row) => row.title)).toEqual([
      "P2",
      "P3",
    ]);
    expect(childrenOf(list, null).map((row) => row.title)).toEqual(["P1"]);
  });
});

describe("ancestorsOf", () => {
  const list = [
    page(1, null, "a0"),
    page(2, 1, "a0"),
    page(3, 2, "a0"),
    page(4, null, "b0"),
  ];

  it("lists ancestors top level first", () => {
    expect(ancestorsOf(list, id(3)).map((row) => row.title)).toEqual([
      "P1",
      "P2",
    ]);
  });

  it("is empty for a top level page and for an unknown id", () => {
    expect(ancestorsOf(list, id(4))).toEqual([]);
    expect(ancestorsOf(list, id(99))).toEqual([]);
  });

  it("stops at a parent missing from the list", () => {
    expect(ancestorsOf([page(5, 99, "a0")], id(5))).toEqual([]);
  });
});

describe("descendantIdsOf", () => {
  it("finds every page below, at any depth, without the page itself", () => {
    const list = [
      page(1, null, "a0"),
      page(2, 1, "a0"),
      page(3, 2, "a0"),
      page(4, 1, "b0"),
      page(5, null, "b0"),
    ];
    expect(descendantIdsOf(list, id(1))).toEqual(
      new Set([id(2), id(3), id(4)]),
    );
    expect(descendantIdsOf(list, id(5))).toEqual(new Set());
  });
});

describe("liveTitle", () => {
  it("prefers the save session title, then the cached one, then Untitled", () => {
    const row = page(1, null, "a0", "Cached");
    expect(liveTitle(row, new Map())).toBe("Cached");
    expect(
      liveTitle(row, new Map([[id(1), { snapshot: { title: "Typing" } }]])),
    ).toBe("Typing");
    expect(
      liveTitle(row, new Map([[id(1), { snapshot: { title: " " } }]])),
    ).toBe("Untitled");
  });
});
