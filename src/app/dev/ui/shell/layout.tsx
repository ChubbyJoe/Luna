import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ShellPreview } from "@/features/design-system/components/shell-preview";
import { readSidebarDefaultOpen } from "@/features/shell/sidebar-state";

// Reads the sidebar cookie on every request, like the (app) layout.
export const instant = false;

export default async function ShellPreviewLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const defaultOpen = await readSidebarDefaultOpen();
  return <ShellPreview defaultOpen={defaultOpen}>{children}</ShellPreview>;
}
