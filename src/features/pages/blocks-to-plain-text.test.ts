import { describe, expect, it } from "vitest";

import {
  blocksToPlainText,
  PLAIN_TEXT_MAX_BYTES,
  truncateUtf8,
} from "./blocks-to-plain-text";

const paragraph = (text: string, children: unknown[] = []) => ({
  id: text,
  type: "paragraph",
  props: {},
  content: text === "" ? [] : [{ type: "text", text, styles: {} }],
  children,
});

describe("blocksToPlainText", () => {
  it("joins paragraphs with line breaks", () => {
    expect(blocksToPlainText([paragraph("One"), paragraph("Two")])).toBe(
      "One\nTwo",
    );
  });

  it("walks children depth first", () => {
    const blocks = [paragraph("A", [paragraph("A1")]), paragraph("B")];
    expect(blocksToPlainText(blocks)).toBe("A\nA1\nB");
  });

  it("takes link text, not the URL", () => {
    const block = {
      id: "l",
      type: "paragraph",
      props: {},
      content: [
        { type: "text", text: "See ", styles: {} },
        {
          type: "link",
          href: "https://example.com",
          content: [{ type: "text", text: "the docs", styles: {} }],
        },
      ],
      children: [],
    };
    expect(blocksToPlainText([block])).toBe("See the docs");
  });

  it("includes table cell text", () => {
    const table = {
      id: "t",
      type: "table",
      props: {},
      content: {
        type: "tableContent",
        rows: [
          {
            cells: [
              [{ type: "text", text: "a", styles: {} }],
              {
                type: "tableCell",
                content: [{ type: "text", text: "b", styles: {} }],
              },
            ],
          },
        ],
      },
      children: [],
    };
    expect(blocksToPlainText([table])).toBe("a\tb");
  });

  it("drops trailing blank lines, keeps inner ones", () => {
    const blocks = [paragraph("A"), paragraph(""), paragraph("B")];
    expect(blocksToPlainText([...blocks, paragraph(""), paragraph("")])).toBe(
      "A\n\nB",
    );
  });

  it("returns an empty string for an empty or blank document", () => {
    expect(blocksToPlainText([])).toBe("");
    expect(blocksToPlainText([paragraph("")])).toBe("");
  });

  it("strips NUL characters", () => {
    expect(blocksToPlainText([paragraph("a\u0000b")])).toBe("ab");
  });

  it("stays within the byte limit for non Latin text", () => {
    const long = "日".repeat(200_000); // 600,000 bytes
    const text = blocksToPlainText([paragraph(long)]);
    expect(new TextEncoder().encode(text).length).toBeLessThanOrEqual(
      PLAIN_TEXT_MAX_BYTES,
    );
    expect(text.length).toBe(Math.floor(PLAIN_TEXT_MAX_BYTES / 3));
  });
});

describe("truncateUtf8", () => {
  it("never splits a character", () => {
    expect(truncateUtf8("aé", 2)).toBe("a");
    expect(truncateUtf8("a😀", 4)).toBe("a");
    expect(truncateUtf8("a😀", 5)).toBe("a😀");
  });
});
