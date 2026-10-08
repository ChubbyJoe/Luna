"use client";

import { catchError, type ErrorInfo } from "next/error";

import { RouteError } from "@/features/shell/components/route-error";

// Shows RouteError like a real route error, so the style guide can demo it.
// onReset clears the state that made the child throw, then the boundary resets.
function DemoFallback(
  { onReset }: { onReset: () => void },
  { reset }: ErrorInfo,
) {
  return (
    <RouteError
      reset={() => {
        onReset();
        reset();
      }}
    />
  );
}

export const DemoErrorBoundary = catchError(DemoFallback);
