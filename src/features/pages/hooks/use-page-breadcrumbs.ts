"use client";

import { useQuery } from "@tanstack/react-query";

import type { BreadcrumbItem } from "@/features/shell/breadcrumbs";

import { useSessions } from "../pending-saves";
import { pageListQueryOptions } from "../queries";
import { ancestorsOf, liveTitle } from "../tree";

// The path to the open page, from the list cache (never the page's own detail
// row, which goes stale after a move). Until the list loads, the page alone.
export function usePageBreadcrumbs(
  pageId: string,
  title: string,
): BreadcrumbItem[] {
  const { data } = useQuery(pageListQueryOptions());
  const sessions = useSessions();
  const ancestors = data ? ancestorsOf(data, pageId) : [];
  return [
    ...ancestors.map((row) => ({
      id: row.id,
      title: liveTitle(row, sessions),
      href: `/p/${row.id}`,
    })),
    { id: pageId, title, href: `/p/${pageId}` },
  ];
}
