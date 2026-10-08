import { describe, expect, it } from "vitest";

import { displayTitle, sanitizeTitle, TITLE_MAX_LENGTH } from "./title";

describe("sanitizeTitle", () => {
  it("turns line breaks into spaces", () => {
    expect(sanitizeTitle("One\nTwo\r\nThree\rFour")).toBe("One Two Three Four");
  });

  it("cuts to the limit without splitting a surrogate pair", () => {
    expect(sanitizeTitle("a".repeat(600))).toHaveLength(TITLE_MAX_LENGTH);
    const emojiAtEdge = "a".repeat(TITLE_MAX_LENGTH - 1) + "😀";
    expect(sanitizeTitle(emojiAtEdge)).toBe("a".repeat(TITLE_MAX_LENGTH - 1));
  });
});

describe("displayTitle", () => {
  it("shows Untitled for a blank title", () => {
    expect(displayTitle("")).toBe("Untitled");
    expect(displayTitle("  ")).toBe("Untitled");
    expect(displayTitle("Plans")).toBe("Plans");
  });
});
