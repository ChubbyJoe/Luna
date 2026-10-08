import Link from "next/link";

import { PageColumn } from "./page-column";

// The not found copy, shared by the root 404 and an unreadable page in the shell.
export function NotFoundMessage() {
  return (
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
  );
}
