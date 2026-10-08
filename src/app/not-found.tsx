import type { Metadata } from "next";
import Link from "next/link";

import { PageColumn } from "@/features/shell/components/page-column";

export const metadata: Metadata = {
  title: "Not found · Luna",
};

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="flex-1 outline-none">
      <PageColumn className="flex flex-col items-start gap-4">
        <h1 className="text-h2">This page does not exist</h1>
        <p className="text-body text-muted-foreground">
          It may have been moved, or the link is mistyped.
        </p>
        <Link
          href="/"
          className="rounded-sm text-sm font-medium text-link underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring"
        >
          Go to your pages
        </Link>
      </PageColumn>
    </main>
  );
}
