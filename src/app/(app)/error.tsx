"use client";

import { useEffect } from "react";

import { RouteError } from "@/features/shell/components/route-error";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // retry() refetches and rerenders the segment, so a passing blip recovers.
  return <RouteError reset={retry} />;
}
