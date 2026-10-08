"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { notify } from "@/lib/notify";

export function useSignOut(): { signOut: () => void; pending: boolean } {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      const { error } = await getSupabaseBrowserClient().auth.signOut();
      if (error) {
        notify.error("Could not sign you out. Try again.");
        return;
      }
      router.replace("/sign-in");
      router.refresh();
    });
  }

  return { signOut, pending };
}
