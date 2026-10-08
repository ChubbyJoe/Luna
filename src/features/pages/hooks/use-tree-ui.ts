"use client";

import { createContext, useContext } from "react";

// Short lived tree feedback shared by the move hook and the sidebar: the row
// that just moved (its fill, for 1.5s) and the polite live region's text.
export type TreeUi = {
  movedId: string | null;
  announcement: string;
  markMoved: (id: string) => void;
  announce: (text: string) => void;
};

export const MOVED_HIGHLIGHT_MS = 1500;

export const TreeUiContext = createContext<TreeUi | null>(null);

export function useTreeUi(): TreeUi {
  const treeUi = useContext(TreeUiContext);
  if (!treeUi)
    throw new Error("useTreeUi must be used inside PageTreeProvider.");
  return treeUi;
}
