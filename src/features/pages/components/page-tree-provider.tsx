"use client";

import { useMemo, type ReactNode } from "react";

import { expandedStorageKey } from "../expanded-pages";
import {
  createExpandedStore,
  ExpandedPagesContext,
} from "../hooks/use-expanded-pages";

// Tree state shared by the sidebar and the hooks that write the tree: which
// pages are expanded, per account in this browser.
export function PageTreeProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const store = useMemo(
    () => createExpandedStore(expandedStorageKey(userId)),
    [userId],
  );
  return (
    <ExpandedPagesContext.Provider value={store}>
      {children}
    </ExpandedPagesContext.Provider>
  );
}
