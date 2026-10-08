"use client";

import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SidebarGroupAction } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useCreatePage } from "../hooks/use-create-page";
import { pageListQueryOptions } from "../queries";

// The new page's position comes from the cached list, so creating waits for it.
function useNewPage() {
  const { isSuccess } = useQuery(pageListQueryOptions());
  const createPage = useCreatePage();
  return {
    create: () => createPage.mutate({ parentId: null }),
    disabled: !isSuccess || createPage.isPending,
  };
}

// The "+" in the sidebar's Pages header.
export function NewPageAction() {
  const { create, disabled } = useNewPage();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <SidebarGroupAction
          aria-label="New page"
          disabled={disabled}
          onClick={create}
        >
          <PlusIcon />
        </SidebarGroupAction>
      </TooltipTrigger>
      <TooltipContent side="right">New page</TooltipContent>
    </Tooltip>
  );
}

export function NewPageButton() {
  const { create, disabled } = useNewPage();
  return (
    <Button disabled={disabled} onClick={create}>
      <PlusIcon aria-hidden="true" />
      New page
    </Button>
  );
}
