import { generateKeyBetween } from "fractional-indexing";
import { describe, expect, it } from "vitest";

import {
  invalidTargetIds,
  moveAnnouncement,
  moveTargets,
  placementFor,
  zoneFromInstruction,
  type MoveTarget,
} from "./placement";
import { comparePositioned } from "./position";
import type { PageListItem } from "./schemas";

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

// P1 (a0) > P2 (a0), P3 (a1)
// P4 (a1)
// P5 (a2)
const list = [
  page(1, null, "a0"),
  page(2, 1, "a0"),
  page(3, 1, "a1"),
  page(4, null, "a1"),
  page(5, null, "a2"),
];

// Applies a placement and returns the titles under `parent`, in order.
function orderAfter(
  rows: PageListItem[],
  pageId: string,
  target: MoveTarget,
  parent: number | null,
): string[] {
  const placement = placementFor(rows, pageId, target);
  if (!placement) throw new Error("expected a placement");
  const moved = rows.map((row) =>
    row.id === pageId
      ? { ...row, parent_id: placement.parentId, position: placement.position }
      : row,
  );
  return moved
    .filter((row) => row.parent_id === (parent === null ? null : id(parent)))
    .sort(comparePositioned)
    .map((row) => row.title);
}

const row = (
  zone: "before" | "after" | "inside",
  n: number,
  targetExpanded = false,
): MoveTarget => ({ kind: "row", zone, targetId: id(n), targetExpanded });

describe("placementFor", () => {
  it("before a row makes a sibling just above it", () => {
    expect(orderAfter(list, id(5), row("before", 4), null)).toEqual([
      "P1",
      "P5",
      "P4",
    ]);
  });

  it("after a collapsed row makes a sibling just below it", () => {
    expect(orderAfter(list, id(5), row("after", 1), null)).toEqual([
      "P1",
      "P5",
      "P4",
    ]);
  });

  it("after an expanded row with sub pages makes the first sub page", () => {
    expect(orderAfter(list, id(5), row("after", 1, true), 1)).toEqual([
      "P5",
      "P2",
      "P3",
    ]);
  });

  it("after an expanded row whose only sub page is the dragged one acts as a plain row", () => {
    const rows = [page(1, null, "a0"), page(2, 1, "a0"), page(3, null, "a1")];
    const placement = placementFor(rows, id(2), row("after", 1, true));
    expect(placement?.parentId).toBeNull();
    expect(orderAfter(rows, id(2), row("after", 1, true), null)).toEqual([
      "P1",
      "P2",
      "P3",
    ]);
  });

  it("inside a row makes its last sub page", () => {
    expect(orderAfter(list, id(5), row("inside", 1), 1)).toEqual([
      "P2",
      "P3",
      "P5",
    ]);
  });

  it("the end zone makes the last top level page", () => {
    expect(orderAfter(list, id(2), { kind: "end" }, null)).toEqual([
      "P1",
      "P4",
      "P5",
      "P2",
    ]);
  });

  it("a Move to item lands at the end of that parent, or the top level", () => {
    expect(
      orderAfter(list, id(4), { kind: "into", parentId: id(1) }, 1),
    ).toEqual(["P2", "P3", "P4"]);
    expect(
      orderAfter(list, id(3), { kind: "into", parentId: null }, null),
    ).toEqual(["P1", "P4", "P5", "P3"]);
  });

  it("names parent_id only when it changes", () => {
    expect(placementFor(list, id(5), row("before", 4))?.parentChanged).toBe(
      false,
    );
    expect(placementFor(list, id(5), row("inside", 4))?.parentChanged).toBe(
      true,
    );
  });

  it("removes the dragged page from its own sibling list", () => {
    // Moving P4 just after P5 (its next sibling) lands it last.
    expect(orderAfter(list, id(4), row("after", 5), null)).toEqual([
      "P1",
      "P5",
      "P4",
    ]);
  });

  it.each([
    ["before its next sibling", row("before", 5)],
    ["after its previous sibling", row("after", 1)],
    ["Move to its own parent when it is already last", null],
  ])("returns null for a no op: %s", (_name, target) => {
    const resolved =
      target ?? ({ kind: "into", parentId: null } satisfies MoveTarget);
    const pageId = target === null ? id(5) : id(4);
    expect(placementFor(list, pageId, resolved)).toBeNull();
  });

  it("treats Move to the current parent as a move to the end", () => {
    expect(
      orderAfter(list, id(2), { kind: "into", parentId: id(1) }, 1),
    ).toEqual(["P3", "P2"]);
  });

  it("returns null for the page itself and anything below it", () => {
    expect(placementFor(list, id(1), row("inside", 1))).toBeNull();
    expect(placementFor(list, id(1), row("before", 2))).toBeNull();
    expect(
      placementFor(list, id(1), { kind: "into", parentId: id(3) }),
    ).toBeNull();
  });

  it("never throws on duplicate keys", () => {
    const rows = [
      page(1, null, "a0"),
      page(2, null, "a0"),
      page(3, null, "a0"),
      page(4, null, "a1"),
    ];
    // Nothing fits between equal keys, so it lands after the whole run.
    const order = orderAfter(rows, id(4), row("after", 1), null);
    expect(order.indexOf("P4")).toBeGreaterThan(order.indexOf("P1"));
    expect(() => placementFor(rows, id(4), row("before", 2))).not.toThrow();
    expect(() => placementFor(rows, id(1), row("after", 2))).not.toThrow();
  });

  it("keeps generating valid keys in a busy gap", () => {
    let rows = [
      page(1, null, "a0"),
      page(2, null, generateKeyBetween("a0", null)),
    ];
    for (let n = 3; n < 30; n++) {
      rows = [...rows, page(n, null, "b0")];
      const placement = placementFor(rows, id(n), row("after", 1));
      rows = rows.map((item) =>
        item.id === id(n) ? { ...item, position: placement!.position } : item,
      );
    }
    expect(rows.sort(comparePositioned)[0].title).toBe("P1");
    expect(rows.every((item) => /^[0-9A-Za-z]+$/.test(item.position))).toBe(
      true,
    );
  });

  it("returns null for an unknown page or target", () => {
    expect(placementFor(list, id(99), { kind: "end" })).toBeNull();
    expect(placementFor(list, id(1), row("before", 99))).toBeNull();
  });
});

describe("invalidTargetIds", () => {
  it("holds the page and everything below it", () => {
    expect(invalidTargetIds(list, id(1))).toEqual(
      new Set([id(1), id(2), id(3)]),
    );
  });
});

describe("moveTargets", () => {
  it("lists Top level, then every other page depth first with its path", () => {
    const deep = [
      page(1, null, "a0", "A"),
      page(2, 1, "a0", "B"),
      page(3, 2, "a0", "C"),
      page(4, 3, "a0", "D"),
      page(5, null, "a1", "E"),
    ];
    expect(moveTargets(deep, id(5), new Map())).toEqual([
      { id: null, title: "Top level", path: "" },
      { id: id(1), title: "A", path: "" },
      { id: id(2), title: "B", path: "A" },
      { id: id(3), title: "C", path: "A / B" },
      { id: id(4), title: "D", path: "… / B / C" },
    ]);
  });

  it("leaves out the moved page and its sub pages, and uses live titles", () => {
    const sessions = new Map([[id(4), { snapshot: { title: "Typing" } }]]);
    expect(
      moveTargets(list, id(1), sessions).map((item) => item.title),
    ).toEqual(["Top level", "Typing", "P5"]);
  });
});

describe("moveAnnouncement", () => {
  it("names the new parent or the top level", () => {
    expect(moveAnnouncement("Notes", "Work")).toBe("Moved Notes into Work");
    expect(moveAnnouncement("Notes", null)).toBe(
      "Moved Notes to the top level",
    );
  });
});

describe("zoneFromInstruction", () => {
  it("maps the tree item hitbox to before, inside, and after", () => {
    expect(zoneFromInstruction("reorder-above")).toBe("before");
    expect(zoneFromInstruction("make-child")).toBe("inside");
    expect(zoneFromInstruction("reorder-below")).toBe("after");
  });

  it("gives no zone for a blocked or missing instruction", () => {
    expect(zoneFromInstruction("instruction-blocked")).toBeNull();
    expect(zoneFromInstruction("reparent")).toBeNull();
    expect(zoneFromInstruction(undefined)).toBeNull();
  });
});
