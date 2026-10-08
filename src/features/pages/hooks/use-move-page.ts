"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { notify } from "@/lib/notify";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import { usePendingSaves } from "../pending-saves";
import { moveAnnouncement, type Placement } from "../placement";
import {
  PAGE_LIST_COLUMNS,
  PAGE_TREE_MUTATION_KEY,
  pageKeys,
  withListItem,
} from "../queries";
import { pageListItemSchema, type PageListItem } from "../schemas";
import { liveTitle } from "../tree";
import { errorCode, treeErrorMessage } from "../tree-errors";
import { useTreeUi } from "./use-tree-ui";

export type MoveVariables = { id: string; placement: Placement };

// What onMutate hands to the other callbacks. Each move gets its own object,
// which is how onSuccess tells this move apart from a later one.
type MoveContext = {
  previous: Pick<PageListItem, "parent_id" | "position"> | null;
};

function isMove(variables: unknown): variables is MoveVariables {
  return (
    typeof variables === "object" &&
    variables !== null &&
    "placement" in variables
  );
}

// Moves or reorders one page (spec 0005). Optimistic, one row per request, and
// in the same scope as creates, so tree writes from this tab run in order.
export function useMovePage() {
  const queryClient = useQueryClient();
  const registry = usePendingSaves();
  const { markMoved, announce } = useTreeUi();

  const listOf = () =>
    queryClient.getQueryData<PageListItem[]>(pageKeys.list()) ?? [];

  return useMutation({
    mutationKey: PAGE_TREE_MUTATION_KEY,
    scope: { id: "page-tree" },
    mutationFn: async ({ id, placement }: MoveVariables) => {
      const { data, error } = await getSupabaseBrowserClient()
        .from("pages")
        .update(
          placement.parentChanged
            ? { parent_id: placement.parentId, position: placement.position }
            : { position: placement.position },
        )
        .eq("id", id)
        .select(PAGE_LIST_COLUMNS)
        .single();
      if (error) throw error;
      return pageListItemSchema.parse(data);
    },
    onMutate: async ({ id, placement }): Promise<MoveContext> => {
      await queryClient.cancelQueries({ queryKey: pageKeys.list() });
      const row = listOf().find((item) => item.id === id);
      if (!row) return { previous: null };
      queryClient.setQueryData<PageListItem[]>(pageKeys.list(), (list) =>
        withListItem(list, {
          ...row,
          parent_id: placement.parentId,
          position: placement.position,
        }),
      );
      markMoved(id);
      return { previous: { parent_id: row.parent_id, position: row.position } };
    },
    onSuccess: (saved, { id }, context) => {
      // A later move of this page is still on its way: its optimistic place wins.
      const newer = queryClient
        .getMutationCache()
        .findAll({ mutationKey: PAGE_TREE_MUTATION_KEY, status: "pending" })
        .some(
          (mutation) =>
            mutation.state.context !== context &&
            isMove(mutation.state.variables) &&
            mutation.state.variables.id === id,
        );
      if (!newer) {
        queryClient.setQueryData<PageListItem[]>(pageKeys.list(), (list) =>
          withListItem(list, saved),
        );
      }
      const sessions = registry.getSessions();
      const parent = listOf().find((item) => item.id === saved.parent_id);
      announce(
        moveAnnouncement(
          liveTitle(saved, sessions),
          parent ? liveTitle(parent, sessions) : null,
        ),
      );
    },
    onError: (error, { id }, context) => {
      const previous = context?.previous;
      if (previous) {
        // Only this row goes back; moves still queued keep their places.
        queryClient.setQueryData<PageListItem[]>(pageKeys.list(), (list) => {
          const row = list?.find((item) => item.id === id);
          return row ? withListItem(list, { ...row, ...previous }) : list;
        });
      }
      notify.error(treeErrorMessage(errorCode(error), "move"));
      // A refetch now would wipe moves still queued; the last one refetches.
      if (
        queryClient.isMutating({ mutationKey: PAGE_TREE_MUTATION_KEY }) <= 1
      ) {
        void queryClient.invalidateQueries({ queryKey: pageKeys.list() });
      }
    },
  });
}
