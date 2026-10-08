"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useSidebar } from "@/components/ui/sidebar";
import { notify } from "@/lib/notify";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import { comparePositioned, positionBetween } from "../position";
import { pageKeys, withListItem } from "../queries";
import {
  pageDetailSchema,
  pageListItemSchema,
  type PageListItem,
} from "../schemas";

// After the last top level page, by spec 0002's neighbour rule.
export function nextTopLevelPosition(list: readonly PageListItem[]): string {
  const topLevel = list
    .filter((row) => row.parent_id === null)
    .sort(comparePositioned);
  return positionBetween(topLevel.at(-1)?.position ?? null, null);
}

export function useCreatePage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  return useMutation({
    mutationFn: async () => {
      const list = queryClient.getQueryData<PageListItem[]>(pageKeys.list());
      if (!list) throw new Error("The page list has not loaded yet.");
      const { data, error } = await getSupabaseBrowserClient()
        .from("pages")
        .insert({
          id: crypto.randomUUID(),
          position: nextTopLevelPosition(list),
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
      setOpenMobile(false);
      router.push(`/p/${row.id}`);
    },
    onError: () => {
      notify.error("Could not create a page. Try again.");
    },
  });
}
