import { generateKeyBetween } from "fractional-indexing";

export type Positioned = { id: string; position: string };

// Sort order of the sidebar: Postgres `position collate "C"`, then `id`.
// Base62 keys are ASCII, so JS string compare matches the C collation.
export function comparePositioned(a: Positioned, b: Positioned): number {
  if (a.position !== b.position) return a.position < b.position ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

// A key that sorts after `prev` and before `next` (null means the start or the end).
export function positionBetween(
  prev: string | null,
  next: string | null,
): string {
  return generateKeyBetween(prev, next);
}

// Spec 0002 neighbour rule: land after `siblings[index]` (-1 for the start).
// `next` is the first later sibling whose key is strictly greater than `prev`,
// so duplicate keys left by a restore or two tabs never make the helper throw.
export function positionAfter(
  sortedSiblings: readonly Positioned[],
  index: number,
): string {
  const prev = index >= 0 ? (sortedSiblings[index]?.position ?? null) : null;
  const next =
    sortedSiblings
      .slice(index + 1)
      .find((sibling) => prev === null || sibling.position > prev)?.position ??
    null;
  return positionBetween(prev, next);
}
