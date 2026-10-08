import { z } from "zod";

// A stored BlockNote block. Only the shape is checked here; whether every
// block fits the paragraph only editor is `isEditorContent`'s job.
export type StoredBlock = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  content?: unknown;
  children: StoredBlock[];
};

export const blockSchema: z.ZodType<StoredBlock> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    props: z.record(z.string(), z.unknown()),
    content: z.unknown().optional(),
    children: z.array(blockSchema).default([]),
  }),
);

export const pageContentSchema = z.array(blockSchema);

// `updated_at` stays the exact string the server sent: it is only ever sent
// back as the save guard, never parsed into a date.
export const pageDetailSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  content: pageContentSchema,
  updated_at: z.string(),
});

export const pageListItemSchema = z.object({
  id: z.uuid(),
  parent_id: z.uuid().nullable(),
  position: z.string(),
  title: z.string(),
});

export type PageDetail = z.infer<typeof pageDetailSchema>;
export type PageListItem = z.infer<typeof pageListItemSchema>;

export const pageIdSchema = z.uuid();

function isPlainText(node: unknown): boolean {
  if (typeof node !== "object" || node === null) return false;
  const { type, text, styles } = node as Record<string, unknown>;
  return (
    type === "text" &&
    typeof text === "string" &&
    (styles === undefined ||
      (typeof styles === "object" &&
        styles !== null &&
        Object.keys(styles).length === 0))
  );
}

// The editor schema holds paragraphs of unstyled text only. Content with any
// other block, inline node, or style opens read only, so the narrower editor
// never silently drops what a later, wider editor wrote.
export function isEditorContent(blocks: readonly StoredBlock[]): boolean {
  return blocks.every(
    (block) =>
      block.type === "paragraph" &&
      (block.content === undefined ||
        (Array.isArray(block.content) && block.content.every(isPlainText))) &&
      isEditorContent(block.children),
  );
}
