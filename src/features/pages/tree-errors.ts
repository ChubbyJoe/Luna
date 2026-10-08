// The one toast a rejected tree write shows (spec 0005 AC-10). The codes come
// from private.check_page_parent(); anything else gets the generic text.
export type TreeWrite = "move" | "create";

const GENERIC: Record<TreeWrite, string> = {
  move: "Could not move the page. Try again.",
  create: "Could not create a page. Try again.",
};

export function treeErrorMessage(
  code: string | undefined,
  kind: TreeWrite,
): string {
  if (code === "LN001") return "A page can't be moved inside itself.";
  if (code === "LN003") return "Pages can only be nested 64 levels deep.";
  return GENERIC[kind];
}

// Supabase errors carry the Postgres code; a thrown Error does not.
export function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}
