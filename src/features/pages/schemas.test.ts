import { describe, expect, it } from "vitest";

import {
  isEditorContent,
  pageContentSchema,
  pageDetailSchema,
} from "./schemas";

const paragraph = (text: string, styles: Record<string, unknown> = {}) => ({
  id: text,
  type: "paragraph",
  props: { textAlignment: "left" },
  content: [{ type: "text", text, styles }],
  children: [],
});

describe("pageContentSchema", () => {
  it("accepts an empty document and paragraph blocks", () => {
    expect(pageContentSchema.safeParse([]).success).toBe(true);
    expect(pageContentSchema.safeParse([paragraph("Hi")]).success).toBe(true);
  });

  it("fills in missing children", () => {
    const noChildren: Partial<ReturnType<typeof paragraph>> = paragraph("Hi");
    delete noChildren.children;
    const parsed = pageContentSchema.parse([noChildren]);
    expect(parsed[0].children).toEqual([]);
  });

  it("rejects content that is not a block array", () => {
    expect(pageContentSchema.safeParse({}).success).toBe(false);
    expect(pageContentSchema.safeParse([{ type: "paragraph" }]).success).toBe(
      false,
    );
  });
});

describe("pageDetailSchema", () => {
  it("keeps updated_at as the exact string", () => {
    const updatedAt = "2026-10-08T09:16:29.123456+00:00";
    const parsed = pageDetailSchema.parse({
      id: "8f8b2f4e-2b0c-4b7e-9a35-0c1d2e3f4a5b",
      title: "",
      content: [],
      updated_at: updatedAt,
    });
    expect(parsed.updated_at).toBe(updatedAt);
  });
});

describe("isEditorContent", () => {
  it("accepts unstyled paragraphs, nested or not", () => {
    const nested = { ...paragraph("A"), children: [paragraph("B")] };
    expect(isEditorContent(pageContentSchema.parse([nested]))).toBe(true);
    expect(isEditorContent([])).toBe(true);
  });

  it("rejects other block types, inline nodes, and styles", () => {
    const heading = { ...paragraph("H"), type: "heading" };
    const link = {
      ...paragraph("L"),
      content: [{ type: "link", href: "https://x.dev", content: [] }],
    };
    const bold = paragraph("B", { bold: true });
    const nestedHeading = { ...paragraph("A"), children: [heading] };
    for (const block of [heading, link, bold, nestedHeading]) {
      expect(isEditorContent(pageContentSchema.parse([block]))).toBe(false);
    }
  });
});
