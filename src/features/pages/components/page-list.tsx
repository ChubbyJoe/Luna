"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/features/shell/components/empty-state";

import { useSessions } from "../pending-saves";
import { pageListQueryOptions } from "../queries";
import { displayTitle } from "../title";

// The sidebar's Pages section: top level pages in order. A page with a save
// session shows its live title, so a refetch never reverts what you typed.
export function PageList() {
  const { data, isPending, isError, refetch } = useQuery(
    pageListQueryOptions(),
  );
  const sessions = useSessions();
  const pathname = usePathname();

  if (isPending) {
    return (
      // Fixed widths: shadcn's menu skeleton picks random ones, which breaks hydration.
      <div aria-label="Loading pages" className="flex flex-col gap-1 px-2">
        {["w-3/5", "w-4/5", "w-2/3"].map((width) => (
          <div key={width} className="flex h-8 items-center">
            <Skeleton className={`h-4 ${width}`} />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        action={
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        }
      >
        Could not load pages
      </EmptyState>
    );
  }

  const topLevel = data.filter((row) => row.parent_id === null);
  if (topLevel.length === 0) return <EmptyState>No pages yet</EmptyState>;

  return (
    <SidebarMenu>
      {topLevel.map((row) => {
        const href = `/p/${row.id}`;
        const title = displayTitle(
          sessions.get(row.id)?.snapshot.title ?? row.title,
        );
        return (
          <SidebarMenuItem key={row.id}>
            <SidebarMenuButton asChild isActive={pathname === href}>
              <Link
                href={href}
                aria-current={pathname === href ? "page" : undefined}
              >
                <span className="truncate">{title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
