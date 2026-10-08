"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PageTreeView } from "@/features/pages/components/page-tree";
import { PageTreeProvider } from "@/features/pages/components/page-tree-provider";
import type { PageListItem } from "@/features/pages/schemas";
import { AppSidebar } from "@/features/shell/components/app-sidebar";
import { PageColumn } from "@/features/shell/components/page-column";
import { SkipLink } from "@/features/shell/components/skip-link";
import { TopBar } from "@/features/shell/components/top-bar";

const SHELL_ROOT = "/dev/ui/shell";
const SAMPLE_EMAIL = "you@example.com";
const SAMPLE_TITLES = ["Work", "Projects", "Luna", "Design", "Notes"];
const SAMPLE_BREADCRUMBS = SAMPLE_TITLES.map((title) => ({
  id: title.toLowerCase(),
  title,
  href: `${SHELL_ROOT}/${title.toLowerCase()}`,
}));

// A small nested tree: the breadcrumb chain, plus a sibling and a top level page.
const SAMPLE_TREE: PageListItem[] = [
  ...SAMPLE_BREADCRUMBS.map((item, index) => ({
    id: item.id,
    parent_id: index === 0 ? null : SAMPLE_BREADCRUMBS[index - 1].id,
    position: "a0",
    title: item.title,
  })),
  { id: "ideas", parent_id: "work", position: "a1", title: "Ideas" },
  { id: "reading", parent_id: null, position: "a1", title: "Reading list" },
];
const NO_SESSIONS = new Map<string, { snapshot: { title: string } }>();

function signOutPreview() {}
function addChildPreview() {}
function movePreview() {}

function previewHref(id: string) {
  return `${SHELL_ROOT}/${id}`;
}

function PreviewTree() {
  const pathname = usePathname();
  const activeId = pathname.startsWith(`${SHELL_ROOT}/`)
    ? pathname.slice(SHELL_ROOT.length + 1)
    : null;
  return (
    <PageTreeView
      list={SAMPLE_TREE}
      activeId={activeId}
      sessions={NO_SESSIONS}
      hrefFor={previewHref}
      onAddChild={addChildPreview}
      onMove={movePreview}
    />
  );
}

// The real shell pieces with sample data, mirroring the (app) layout.
export function ShellPreview({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <SkipLink />
      <SidebarProvider defaultOpen={defaultOpen} className="flex-1">
        <PageTreeProvider userId="preview">
          <AppSidebar
            email={SAMPLE_EMAIL}
            homeHref={SHELL_ROOT}
            onSignOut={signOutPreview}
            pages={<PreviewTree />}
          />
          <SidebarInset id="main" tabIndex={-1} className="outline-none">
            {children}
          </SidebarInset>
        </PageTreeProvider>
      </SidebarProvider>
    </>
  );
}

export function ShellPreviewPage() {
  return (
    <>
      <TopBar breadcrumbs={SAMPLE_BREADCRUMBS} status="Saved" />
      <PageColumn>
        <h1 className="text-title-sm md:text-title">Notes</h1>
        <div className="mt-6 flex flex-col gap-4 text-body">
          <p>
            This is the shell every signed in page sits in. The sidebar holds
            your pages and your account, the top bar shows where you are, and
            the page itself stays in a calm column about 720 pixels wide, so
            lines never grow too long to read comfortably.
          </p>
          <p className="text-muted-foreground">
            Press Cmd+\ (Ctrl+\) to hide or show the sidebar. On a phone it
            becomes a drawer you open from the top bar.
          </p>
        </div>
      </PageColumn>
    </>
  );
}
