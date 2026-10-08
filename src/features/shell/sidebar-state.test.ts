import { describe, expect, it } from "vitest";

import { getSidebarDefaultOpen } from "./sidebar-state";

describe("getSidebarDefaultOpen", () => {
  it.each([
    [undefined, true],
    ["true", true],
    ["false", false],
    ["garbage", true],
  ])("cookie %s gives open %s", (value, open) => {
    expect(getSidebarDefaultOpen(value)).toBe(open);
  });
});
