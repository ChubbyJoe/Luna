import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// The calm 720px column every signed in route renders its content in.
export function PageColumn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-page px-6 pt-8 pb-16 md:px-12 md:pt-16",
        className,
      )}
    >
      {children}
    </div>
  );
}
