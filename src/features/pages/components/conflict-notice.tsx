"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

function Notice({
  children,
  actions,
}: {
  children: string;
  actions: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="mb-6 flex flex-col gap-3 rounded-md border border-border bg-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-foreground">{children}</p>
      <div className="flex shrink-0 gap-2">{actions}</div>
    </div>
  );
}

// Another tab saved this page first. Nothing is overwritten until you pick.
export function ConflictNotice({
  onLoadNewer,
  onKeepMine,
}: {
  onLoadNewer: () => void;
  onKeepMine: () => void;
}) {
  return (
    <Notice
      actions={
        <>
          <Button variant="outline" size="sm" onClick={onLoadNewer}>
            Load newer
          </Button>
          <Button size="sm" onClick={onKeepMine}>
            Keep mine
          </Button>
        </>
      }
    >
      This page changed in another tab.
    </Notice>
  );
}

// The page was deleted elsewhere: your text is still here to copy.
export function GoneNotice({ text }: { text: () => string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text());
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Notice
      actions={
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? "Copied" : "Copy text"}
        </Button>
      }
    >
      This page no longer exists, so it cannot be saved. Copy your text to keep
      it.
    </Notice>
  );
}
