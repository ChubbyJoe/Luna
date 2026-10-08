"use client";

import { MoreHorizontalIcon, SunMoonIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, type ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmptyState } from "@/features/shell/components/empty-state";
import { notify } from "@/lib/notify";

import { DemoErrorBoundary } from "./demo-error-boundary";

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <SunMoonIcon data-icon="inline-start" aria-hidden="true" />
          Theme
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OverlayDemos() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Page menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuItem>
              Add to favorites
              <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>Copy link</DropdownMenuItem>
            <DropdownMenuItem disabled>Move to</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive">
              Move to trash
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Popover</Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="flex flex-col gap-2">
          <p className="text-sm font-medium">Share this page</p>
          <p className="text-sm text-muted-foreground">
            Anyone with the link can read it.
          </p>
        </PopoverContent>
      </Popover>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More actions">
            <MoreHorizontalIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>More actions</TooltipContent>
      </Tooltip>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename page</DialogTitle>
            <DialogDescription>
              The new name shows in the sidebar and the top bar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sg-dialog-name">Name</Label>
            <Input id="sg-dialog-name" defaultValue="Notes" />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button>Save</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Empty trash</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Empty the trash?</AlertDialogTitle>
            <AlertDialogDescription>
              Every page in the trash is deleted for good. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive">
              Empty trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function FeedbackDemos() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        onClick={() => notify.error("Could not save your changes.")}
      >
        Show error toast
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          notify.undoable("Moved to trash", () => notify.info("Restored"))
        }
      >
        Show undo toast
      </Button>
      <Button variant="outline" onClick={() => notify.info("Link copied")}>
        Show info toast
      </Button>
    </div>
  );
}

export function StateDemos() {
  const [broken, setBroken] = useState(false);

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <Demo label="Loading">
        <div className="flex flex-col gap-3" aria-hidden="true">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </Demo>
      <Demo label="Empty">
        <div className="rounded-lg border bg-sidebar py-2">
          <EmptyState
            action={
              <Button size="sm" variant="outline" className="self-start">
                New page
              </Button>
            }
          >
            No pages yet
          </EmptyState>
        </div>
      </Demo>
      <Demo label="Route error" className="sm:col-span-2">
        <div className="rounded-lg border">
          <DemoErrorBoundary onReset={() => setBroken(false)}>
            <Fragile broken={broken} />
            <div className="flex flex-col items-start gap-3 p-6">
              <p className="text-body">Content that renders normally.</p>
              <Button variant="outline" onClick={() => setBroken(true)}>
                Throw
              </Button>
            </div>
          </DemoErrorBoundary>
        </div>
      </Demo>
    </div>
  );
}

// Throws during render, which is what an error boundary catches.
function Fragile({ broken }: { broken: boolean }) {
  if (broken) throw new Error("Demo render error");
  return null;
}

function Demo({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <p className="mb-2 text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
