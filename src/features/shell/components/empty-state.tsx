import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 px-2 py-1.5", className)}>
      <p className="text-sm text-muted-foreground">{children}</p>
      {action}
    </div>
  );
}
