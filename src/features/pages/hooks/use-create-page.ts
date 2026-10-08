"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useContext } from "react";

import { useSidebar } from "@/components/ui/sidebar";
import { notify } from "@/lib/notify";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import { positionAfter } from "../position";
import { pageKeys, PAGE_TREE_MUTATION_KEY, withListItem } from "../queries";
import {
  pageDetailSchema,
  pageListItemSchema,
  type PageListItem,
} from "../schemas";
import { childrenOf } from "../tree";
import { errorCode, treeErrorMessage } from "../tree-errors";
import { ExpandedPagesContext } from "./use-expanded-pages";

// After a parent's last sub page (null: the last top level page), by spec
// 0002's neighbour rule.
export function nextChildPosition(
  list: readonly PageListItem[],
  parentId: string | null,
): string {
  const siblings = childrenOf(list, parentId);
  return positionAfter(siblings, siblings.length - 1);
}

// Not optimistic: the new page shows once the server has it (spec 0004).
// Shares the tree scope with moves, so tree writes go out in order.
export function useCreatePage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const expandedStore = useContext(ExpandedPagesContext);

  return useMutation({
    mutationKey: PAGE_TREE_MUTATION_KEY,
    scope: { id: "page-tree" },
    mutationFn: async ({ parentId }: { parentId: string | null }) => {
      const list = queryClient.getQueryData<PageListItem[]>(pageKeys.list());
      if (!list) throw new Error("The page list has not loaded yet.");
      const { data, error } = await getSupabaseBrowserClient()
        .from("pages")
        .insert({
          id: crypto.randomUUID(),
          parent_id: parentId,
          position: nextChildPosition(list, parentId),
        })
        .select("id, parent_id, position, title, content, updated_at")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      queryClient.setQueryData<PageListItem[]>(pageKeys.list(), (list) =>
        withListItem(list, pageListItemSchema.parse(row)),
      );
      queryClient.setQueryData(
        pageKeys.detail(row.id),
        pageDetailSchema.parse(row),
      );
      if (row.parent_id !== null) expandedStore?.expand([row.parent_id]);
      setOpenMobile(false);
      router.push(`/p/${row.id}`);
    },
    onError: (error) => {
      notify.error(treeErrorMessage(errorCode(error), "create"));
    },
  });
}
