"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

import {
  parseExpanded,
  pruneExpanded,
  serializeExpanded,
  withExpanded,
  withoutExpanded,
} from "../expanded-pages";

export type ExpandedStore = {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => ReadonlySet<string>;
  expand: (ids: readonly string[]) => void;
  collapse: (id: string) => void;
  prune: (existing: ReadonlySet<string>) => void;
};

const NOTHING_EXPANDED: ReadonlySet<string> = new Set();

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private windows and blocked storage keep the set in memory only.
  }
}

// The expanded set for one account, over localStorage. Read lazily on the
// client, so the server and the first render see nothing expanded.
export function createExpandedStore(key: string): ExpandedStore {
  let ids: readonly string[] | null = null;
  let snapshot = NOTHING_EXPANDED;
  const listeners = new Set<() => void>();

  function current(): readonly string[] {
    if (ids === null) {
      ids = parseExpanded(readStorage(key));
      snapshot = new Set(ids);
    }
    return ids;
  }

  function write(next: readonly string[]) {
    if (next === current()) return;
    ids = next;
    snapshot = new Set(next);
    writeStorage(key, serializeExpanded(next));
    for (const listener of listeners) listener();
  }

  return {
    subscribe: (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    getSnapshot: () => {
      current();
      return snapshot;
    },
    expand: (add) => write(withExpanded(current(), add)),
    collapse: (id) => write(withoutExpanded(current(), id)),
    prune: (existing) => write(pruneExpanded(current(), existing)),
  };
}

export const ExpandedPagesContext = createContext<ExpandedStore | null>(null);

export function useExpandedStore(): ExpandedStore {
  const store = useContext(ExpandedPagesContext);
  if (!store) {
    throw new Error("useExpandedPages must be used inside PageTreeProvider.");
  }
  return store;
}

export function useExpandedPages(): ReadonlySet<string> {
  const store = useExpandedStore();
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => NOTHING_EXPANDED,
  );
}
