import { describe, expect, it } from "vitest";

import { breadcrumbTitle, collapseBreadcrumbs } from "./breadcrumbs";

const items = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: String(index),
    title: `Page ${index}`,
    href: `/p/${index}`,
  }));

const ids = (list: { id: string }[]) => list.map((item) => item.id);

describe("collapseBreadcrumbs", () => {
  it("keeps up to three items as they are", () => {
    expect(collapseBreadcrumbs([])).toEqual({ visible: [], hidden: [] });
    const three = collapseBreadcrumbs(items(3));
    expect(ids(three.visible)).toEqual(["0", "1", "2"]);
    expect(three.hidden).toEqual([]);
  });

  it("keeps the first and last two of a longer trail", () => {
    const five = collapseBreadcrumbs(items(5));
    expect(ids(five.visible)).toEqual(["0", "3", "4"]);
    expect(ids(five.hidden)).toEqual(["1", "2"]);
  });

  it("does not change its input", () => {
    const input = items(5);
    collapseBreadcrumbs(input);
    expect(ids(input)).toEqual(["0", "1", "2", "3", "4"]);
  });
});

describe("breadcrumbTitle", () => {
  it("shows Untitled for an empty title", () => {
    expect(breadcrumbTitle("")).toBe("Untitled");
    expect(breadcrumbTitle("  ")).toBe("Untitled");
    expect(breadcrumbTitle("Notes")).toBe("Notes");
  });
});
