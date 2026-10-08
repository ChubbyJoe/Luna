"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { usePendingSavesOptional } from "@/features/pages/pending-saves";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { notify } from "@/lib/notify";

export type SignOut = {
  signOut: () => void;
  pending: boolean;
  // Open when pending edits could not be saved before signing out.
  confirmOpen: boolean;
  confirm: () => void;
  cancel: () => void;
};

export function useSignOut(): SignOut {
  const router = useRouter();
  const pendingSaves = usePendingSavesOptional();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function endSession() {
    const { error } = await getSupabaseBrowserClient().auth.signOut();
    if (error) {
      notify.error("Could not sign you out. Try again.");
      return;
    }
    router.replace("/sign-in");
    router.refresh();
  }

  // Unsaved edits get one save attempt first; if any stay unsaved, ask.
  function signOut() {
    startTransition(async () => {
      const saved = pendingSaves ? await pendingSaves.flushAll() : true;
      if (!saved) {
        setConfirmOpen(true);
        return;
      }
      await endSession();
    });
  }

  function confirm() {
    setConfirmOpen(false);
    startTransition(endSession);
  }

  return {
    signOut,
    pending,
    confirmOpen,
    confirm,
    cancel: () => setConfirmOpen(false),
  };
}
