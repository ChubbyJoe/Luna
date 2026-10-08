"use client";

import { Button } from "@/components/ui/button";

import { PageColumn } from "./page-column";

// Fixed copy only: an error's message can leak details, so it is never shown.
export function RouteError({ reset }: { reset: () => void }) {
  return (
    <PageColumn>
      <div role="alert" className="flex flex-col items-start gap-4">
        <h1 className="text-h2">Something went wrong</h1>
        <p className="text-body text-muted-foreground">
          This page could not be shown. Your pages are safe; try again in a
          moment.
        </p>
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </div>
    </PageColumn>
  );
}
