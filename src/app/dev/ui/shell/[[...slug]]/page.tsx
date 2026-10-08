import type { Metadata } from "next";

import { ShellPreviewPage } from "@/features/design-system/components/shell-preview";

export const metadata: Metadata = {
  title: "Shell preview · Luna",
};

// Every sample breadcrumb lands here, so links change the path inside the shell.
export default function ShellPreviewRoute() {
  return <ShellPreviewPage />;
}
