// Matches the `char_length(title) <= 500` check in the database.
export const TITLE_MAX_LENGTH = 500;

// The title is one line: pasted line breaks become spaces, and it never
// exceeds the limit (or ends on half of a surrogate pair).
export function sanitizeTitle(value: string): string {
  const oneLine = value.replace(/\r\n|\r|\n/g, " ");
  if (oneLine.length <= TITLE_MAX_LENGTH) return oneLine;
  const cut = oneLine.slice(0, TITLE_MAX_LENGTH);
  return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut;
}

// Blank titles read as "Untitled", matching the shell's breadcrumb rule.
export function displayTitle(title: string): string {
  return title.trim() === "" ? "Untitled" : title;
}
