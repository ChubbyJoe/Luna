"use client";

import Link from "next/link";
import { Fragment, useRef, useState, type ReactNode } from "react";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  breadcrumbTitle,
  collapseBreadcrumbs,
  type BreadcrumbItem as Crumb,
} from "../breadcrumbs";

// Rendered by each route, since its contents come from the route's data.
export function TopBar({
  breadcrumbs,
  status,
  actions,
}: {
  breadcrumbs: Crumb[];
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex h-11 shrink-0 items-center gap-2 px-3">
      <Tooltip>
        <TooltipTrigger asChild>
          {/* CSS only visibility: phones always, desktop only while collapsed. */}
          <SidebarTrigger
            aria-label="Show sidebar"
            className="hidden max-md:inline-flex md:group-data-[state=collapsed]/sidebar-wrapper:inline-flex"
          />
        </TooltipTrigger>
        <TooltipContent side="bottom">Show sidebar ⌘\</TooltipContent>
      </Tooltip>
      <Breadcrumbs items={breadcrumbs} />
      <div className="ml-auto flex items-center gap-2">
        {status && (
          <span className="text-sm text-muted-foreground">{status}</span>
        )}
        {actions}
      </div>
    </header>
  );
}

function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  const { visible, hidden } = collapseBreadcrumbs(items);
  const [first, ...rest] = visible;

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        <Crumb item={first} current={visible.length === 1} />
        {hidden.length > 0 && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <HiddenCrumbs items={hidden} />
            </BreadcrumbItem>
          </>
        )}
        {rest.map((item, index) => (
          <Fragment key={item.id}>
            <BreadcrumbSeparator />
            <Crumb item={item} current={index === rest.length - 1} />
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function Crumb({ item, current }: { item: Crumb; current: boolean }) {
  const title = breadcrumbTitle(item.title);
  return (
    <BreadcrumbItem className="min-w-0">
      {current ? (
        <BreadcrumbPage className="block max-w-40 truncate" title={title}>
          {title}
        </BreadcrumbPage>
      ) : (
        <TruncatedLink href={item.href} title={title} />
      )}
    </BreadcrumbItem>
  );
}

// Shows the full title in a tooltip only when the link is cut off.
function TruncatedLink({ href, title }: { href: string; title: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);

  function onOpenChange(next: boolean) {
    const element = ref.current;
    setOpen(next && !!element && element.scrollWidth > element.clientWidth);
  }

  return (
    <Tooltip open={open} onOpenChange={onOpenChange}>
      <TooltipTrigger asChild>
        <BreadcrumbLink
          asChild
          className="block max-w-40 truncate rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          <Link ref={ref} href={href}>
            {title}
          </Link>
        </BreadcrumbLink>
      </TooltipTrigger>
      <TooltipContent side="bottom">{title}</TooltipContent>
    </Tooltip>
  );
}

function HiddenCrumbs({ items }: { items: Crumb[] }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="Show hidden pages">
          <BreadcrumbEllipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          {items.map((item) => (
            <DropdownMenuItem key={item.id} asChild>
              <Link href={item.href}>{breadcrumbTitle(item.title)}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
