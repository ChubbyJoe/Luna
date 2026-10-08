"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { MoveTargetItem } from "../placement";

// Items are keyed by page id, so filter on the titles alone: ids are hex and
// would match almost any search.
function filterByTitle(_value: string, search: string, keywords?: string[]) {
  const needle = search.trim().toLowerCase();
  if (needle === "") return 1;
  return (keywords ?? []).some((word) => word.toLowerCase().includes(needle))
    ? 1
    : 0;
}

const TOP_LEVEL_VALUE = "top-level";

// "Move <title> to": search every place the page can go (spec 0005 AC-9).
export function MoveToDialog({
  open,
  title,
  items,
  onOpenChange,
  onChoose,
  onCloseAutoFocus,
}: {
  open: boolean;
  title: string;
  items: MoveTargetItem[];
  onOpenChange: (open: boolean) => void;
  // null is "Top level".
  onChoose: (parentId: string | null) => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const heading = `Move ${title} to`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0"
        showCloseButton={false}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>
            Choose the page to move it into, or the top level.
          </DialogDescription>
        </DialogHeader>
        <Command label={heading} filter={filterByTitle}>
          <CommandInput placeholder="Search pages" />
          <CommandList>
            <CommandEmpty className="text-muted-foreground">
              No pages found
            </CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id ?? TOP_LEVEL_VALUE}
                  value={item.id ?? TOP_LEVEL_VALUE}
                  keywords={[item.title]}
                  onSelect={() => onChoose(item.id)}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{item.title}</span>
                    {item.path !== "" && (
                      <span className="truncate text-xs text-muted-foreground">
                        {item.path}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
