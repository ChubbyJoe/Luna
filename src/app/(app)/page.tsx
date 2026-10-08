import { redirect } from "next/navigation";
import { connection } from "next/server";

import { HomeEmptyState } from "@/features/pages/components/home-empty-state";
import { PageColumn } from "@/features/shell/components/page-column";
import { TopBar } from "@/features/shell/components/top-bar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Home either redirects or shows the empty state, so it blocks on its read
// rather than streaming a skeleton that a redirect would replace at once.
export const instant = false;

// Home opens your most recently edited page, or offers to create the first.
export default async function HomePage() {
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pages")
    .select("id")
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  // Caught by (app)/error.tsx, which shows fixed copy and a retry.
  if (error) throw new Error(`Could not load your pages: ${error.message}`);
  if (data) redirect(`/p/${data.id}`);

  return (
    <>
      <TopBar breadcrumbs={[]} />
      <PageColumn>
        <HomeEmptyState />
      </PageColumn>
    </>
  );
}
