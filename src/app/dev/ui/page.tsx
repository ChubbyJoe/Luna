import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StyleGuide } from "@/features/design-system/components/style-guide";
import { PageColumn } from "@/features/shell/components/page-column";

export const metadata: Metadata = {
  title: "Style guide · Luna",
};

// A development only reference for tokens and components.
export default function StyleGuidePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <PageColumn>
        <StyleGuide />
      </PageColumn>
    </main>
  );
}
