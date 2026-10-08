import { queryOptions } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import { comparePositioned } from "./position";
import {
  pageDetailSchema,
  pageListItemSchema,
  type PageDetail,
  type PageListItem,
} from "./schemas";

export const pageKeys = {
  all: ["pages"] as const,
  list: () => ["pages", "list"] as const,
  detail: (id: string) => ["pages", "detail", id] as const,
};

// Creates and moves share it (and one mutation scope), so tree writes from a
// tab run one at a time, in the order you made them (spec 0005).
export const PAGE_TREE_MUTATION_KEY = ["pages", "tree"] as const;

export const PAGE_LIST_COLUMNS = "id, parent_id, position, title";
export const PAGE_DETAIL_COLUMNS = "id, title, content, updated_at";
const LIST_RANGE = 1000;

async function fetchPageList(): Promise<PageListItem[]> {
  const supabase = getSupabaseBrowserClient();
  const rows: PageListItem[] = [];
  for (let from = 0; ; from += LIST_RANGE) {
    const { data, error } = await supabase
      .from("pages")
      .select(PAGE_LIST_COLUMNS)
      .order("position")
      .order("id")
      .range(from, from + LIST_RANGE - 1);
    if (error) throw error;
    rows.push(...pageListItemSchema.array().parse(data));
    if (data.length < LIST_RANGE) return rows;
  }
}

export function pageListQueryOptions() {
  return queryOptions({ queryKey: pageKeys.list(), queryFn: fetchPageList });
}

// Null means not found, or not yours: RLS makes the two look the same.
async function fetchPage(id: string): Promise<PageDetail | null> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("pages")
    .select(PAGE_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data === null ? null : pageDetailSchema.parse(data);
}

// The open page never refetches on its own: while you edit, the save session
// owns its title and body, and a background refetch must not replace them.
export function pageDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: pageKeys.detail(id),
    queryFn: () => fetchPage(id),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Pure cache updates, shared by create and save.
export function withListItem(
  list: PageListItem[] | undefined,
  item: PageListItem,
): PageListItem[] | undefined {
  if (!list) return list;
  const others = list.filter((row) => row.id !== item.id);
  return [...others, item].sort(comparePositioned);
}

export function withListTitle(
  list: PageListItem[] | undefined,
  id: string,
  title: string,
): PageListItem[] | undefined {
  return list?.map((row) => (row.id === id ? { ...row, title } : row));
}
