import type { Metadata } from "next";

import { PageNotFound } from "@/features/pages/components/page-view";

export const metadata: Metadata = {
  title: "Not found · Luna",
};

// A malformed page id, inside the shell so the sidebar stays. The id streams
// in after the head, so the view also sets the tab title itself.
export default function NotFound() {
  return <PageNotFound />;
}
