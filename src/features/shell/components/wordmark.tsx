import { MoonIcon } from "lucide-react";

export function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <MoonIcon className="size-4" aria-hidden="true" />
      Luna
    </span>
  );
}
