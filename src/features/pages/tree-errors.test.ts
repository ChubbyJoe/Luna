import { describe, expect, it } from "vitest";

import { errorCode, treeErrorMessage } from "./tree-errors";

describe("treeErrorMessage", () => {
  it.each(["move", "create"] as const)(
    "maps the tree codes for a %s",
    (kind) => {
      expect(treeErrorMessage("LN001", kind)).toBe(
        "A page can't be moved inside itself.",
      );
      expect(treeErrorMessage("LN003", kind)).toBe(
        "Pages can only be nested 64 levels deep.",
      );
    },
  );

  it("falls back to the generic text for each kind", () => {
    expect(treeErrorMessage("23503", "move")).toBe(
      "Could not move the page. Try again.",
    );
    expect(treeErrorMessage(undefined, "create")).toBe(
      "Could not create a page. Try again.",
    );
  });
});

describe("errorCode", () => {
  it("reads a string code and ignores everything else", () => {
    expect(errorCode({ code: "LN003", message: "deep" })).toBe("LN003");
    expect(errorCode(new Error("plain"))).toBeUndefined();
    expect(errorCode({ code: 500 })).toBeUndefined();
    expect(errorCode(null)).toBeUndefined();
  });
});
