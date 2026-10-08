import { z } from "zod";

// Which pages are open in the sidebar, per account in this browser (spec 0005).
// Ids only: no titles or content ever go into storage.

const storedListSchema = z.array(z.unknown());
const pageIdSchema = z.uuid();

export function expandedStorageKey(userId: string): string {
  return `luna:sidebar-expanded:${userId}`;
}

// Anything unparseable reads as nothing expanded; entries that are not page
// ids are dropped.
export function parseExpanded(raw: string | null): string[] {
  if (raw === null) return [];
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return [];
  }
  const parsed = storedListSchema.safeParse(json);
  if (!parsed.success) return [];
  const ids = parsed.data.filter(
    (entry): entry is string => pageIdSchema.safeParse(entry).success,
  );
  return [...new Set(ids)];
}

export function serializeExpanded(ids: readonly string[]): string {
  return JSON.stringify(ids);
}

// Each helper returns the same array when nothing changes, so callers can
// skip a write and a render.
export function withExpanded(
  ids: readonly string[],
  add: readonly string[],
): readonly string[] {
  const missing = [...new Set(add)].filter((id) => !ids.includes(id));
  return missing.length === 0 ? ids : [...ids, ...missing];
}

export function withoutExpanded(
  ids: readonly string[],
  id: string,
): readonly string[] {
  return ids.includes(id) ? ids.filter((entry) => entry !== id) : ids;
}

// Drops ids of pages that no longer exist.
export function pruneExpanded(
  ids: readonly string[],
  existing: ReadonlySet<string>,
): readonly string[] {
  const kept = ids.filter((id) => existing.has(id));
  return kept.length === ids.length ? ids : kept;
}
