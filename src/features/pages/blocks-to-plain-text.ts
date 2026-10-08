// Spec 0002 (as amended by spec 0004): the plain text saved as `content_text`.
// Kept under the 512 KB database check with room to spare.
export const PLAIN_TEXT_MAX_BYTES = 500_000;

type Node = Record<string, unknown>;

function isNode(value: unknown): value is Node {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Inline content: text nodes carry `text`; links and custom inline nodes nest
// their text in `content`. Only text is taken, never URLs or props.
function inlineText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((node) => {
      if (!isNode(node)) return "";
      if (typeof node.text === "string") return node.text;
      return inlineText(node.content);
    })
    .join("");
}

// A table holds rows of cells; a cell is either inline content or a
// `tableCell` node wrapping it.
function tableText(content: Node): string[] {
  const rows = Array.isArray(content.rows) ? content.rows : [];
  return rows.map((row) => {
    const cells = isNode(row) && Array.isArray(row.cells) ? row.cells : [];
    return cells
      .map((cell) => inlineText(isNode(cell) ? cell.content : cell))
      .join("\t");
  });
}

function blockLines(block: unknown): string[] {
  if (!isNode(block)) return [];
  const own =
    isNode(block.content) && block.content.type === "tableContent"
      ? tableText(block.content)
      : [inlineText(block.content)];
  const children = Array.isArray(block.children)
    ? block.children.flatMap(blockLines)
    : [];
  return [...own, ...children];
}

function dropTrailingBlankLines(lines: string[]): string[] {
  let end = lines.length;
  while (end > 0 && lines[end - 1].trim() === "") end -= 1;
  return lines.slice(0, end);
}

// Cut to at most `maxBytes` of UTF-8 without splitting a character.
export function truncateUtf8(text: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  if (encoder.encode(text).length <= maxBytes) return text;
  let bytes = 0;
  let end = 0;
  for (const char of text) {
    const size = encoder.encode(char).length;
    if (bytes + size > maxBytes) break;
    bytes += size;
    end += char.length;
  }
  return text.slice(0, end);
}

export function blocksToPlainText(blocks: readonly unknown[]): string {
  const lines = dropTrailingBlankLines(blocks.flatMap(blockLines));
  const text = lines.join("\n").replaceAll("\u0000", "");
  return dropTrailingBlankLines(
    truncateUtf8(text, PLAIN_TEXT_MAX_BYTES).split("\n"),
  ).join("\n");
}
