import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { NewPageAction } from "@/features/pages/components/new-page-button";
import { PageList } from "@/features/pages/components/page-list";
import { PendingSavesProvider } from "@/features/pages/pending-saves";
import { AppSidebar } from "@/features/shell/components/app-sidebar";
import { SkipLink } from "@/features/shell/components/skip-link";
import { readSidebarDefaultOpen } from "@/features/shell/sidebar-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// The signed in shell reads the session on every request, so it can never be
// prerendered. Let it block on the server: signed out visitors get a real 307.
export const instant = false;

export default async function AppLayout({ children }: { children: ReactNode }) {
  // getClaims compares the token expiry to Date.now(), so render at request time.
  await connection();
  const supabase = await createSupabaseServerClient();
  // getClaims verifies the JWT; never trust getSession() on the server.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/sign-in");
  }
  const defaultOpen = await readSidebarDefaultOpen();
  const email =
    typeof data.claims.email === "string" ? data.claims.email : undefined;

  return (
    <>
      <SkipLink />
      <SidebarProvider defaultOpen={defaultOpen} className="flex-1">
        {/* Save sessions live here, above the page, so a save outlives navigation. */}
        <PendingSavesProvider>
          <AppSidebar
            email={email}
            pages={<PageList />}
            pagesAction={<NewPageAction />}
          />
          <SidebarInset id="main" tabIndex={-1} className="outline-none">
            {children}
          </SidebarInset>
        </PendingSavesProvider>
      </SidebarProvider>
    </>
  );
}
