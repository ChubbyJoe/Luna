"use client";

import { ChevronsLeftIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { AccountMenu } from "./account-menu";
import { CloseDrawerOnNavigate, focusMain } from "./close-drawer-on-navigate";
import { EmptyState } from "./empty-state";
import { Wordmark } from "./wordmark";

export function AppSidebar({
  email,
  homeHref = "/",
  onSignOut,
}: {
  email?: string;
  // The shell preview keeps its links inside /dev/ui/shell.
  homeHref?: string;
  onSignOut?: () => void;
}) {
  const { toggleSidebar } = useSidebar();
  // Set when a link inside the drawer navigates, read when the drawer closes.
  const navigatedFromDrawer = useRef(false);
  const onDrawerNavigate = useCallback(() => {
    navigatedFromDrawer.current = true;
  }, []);

  function onMobileCloseAutoFocus(event: Event) {
    event.preventDefault();
    if (navigatedFromDrawer.current) {
      navigatedFromDrawer.current = false;
      focusMain();
      return;
    }
    document.querySelector<HTMLElement>('[data-sidebar="trigger"]')?.focus();
  }

  return (
    <Sidebar
      collapsible="offcanvas"
      onMobileCloseAutoFocus={onMobileCloseAutoFocus}
    >
      <CloseDrawerOnNavigate onDrawerNavigate={onDrawerNavigate} />
      <SidebarHeader className="h-11 flex-row items-center justify-between px-3 py-0">
        <Link
          href={homeHref}
          className="-mx-1 rounded-md px-1 py-0.5 outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring"
        >
          <Wordmark />
        </Link>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden text-sidebar-foreground md:inline-flex"
              aria-label="Hide sidebar"
              onClick={toggleSidebar}
            >
              <ChevronsLeftIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Hide sidebar ⌘\</TooltipContent>
        </Tooltip>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Pages</SidebarGroupLabel>
          <EmptyState>No pages yet</EmptyState>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <AccountMenu email={email} onSignOut={onSignOut} />
      </SidebarFooter>
    </Sidebar>
  );
}
