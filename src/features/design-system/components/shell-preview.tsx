"use client";

import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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

function signOutPreview() {}

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
        <AppSidebar
          email={SAMPLE_EMAIL}
          homeHref={SHELL_ROOT}
          onSignOut={signOutPreview}
        />
        <SidebarInset id="main" tabIndex={-1} className="outline-none">
          {children}
        </SidebarInset>
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
