import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// The signed in shell reads the session on every request, so it can never be
// prerendered. Let it block on the server: signed out visitors get a real 307.
export const instant = false;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  // getClaims verifies the JWT; never trust getSession() on the server.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/sign-in");
  }
  return children;
}
