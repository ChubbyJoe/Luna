"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { expandedStorageKey } from "../expanded-pages";
import {
  createExpandedStore,
  ExpandedPagesContext,
} from "../hooks/use-expanded-pages";
import { MOVED_HIGHLIGHT_MS, TreeUiContext } from "../hooks/use-tree-ui";

// Tree state shared by the sidebar and the hooks that write the tree: which
// pages are expanded (per account in this browser), the row that just moved,
// and what the live region says.
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
  const [movedId, setMovedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // A second move within the highlight time takes over the row and the timer.
  const markMoved = useCallback((id: string) => {
    clearTimeout(highlightTimer.current);
    setMovedId(id);
    highlightTimer.current = setTimeout(
      () => setMovedId(null),
      MOVED_HIGHLIGHT_MS,
    );
  }, []);
  useEffect(() => () => clearTimeout(highlightTimer.current), []);

  const treeUi = useMemo(
    () => ({ movedId, announcement, markMoved, announce: setAnnouncement }),
    [movedId, announcement, markMoved],
  );

  return (
    <ExpandedPagesContext.Provider value={store}>
      <TreeUiContext.Provider value={treeUi}>{children}</TreeUiContext.Provider>
    </ExpandedPagesContext.Provider>
  );
}
