import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in · Luna",
};

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sign in to Luna
        </h1>
        <p className="text-sm text-muted-foreground">
          We will email you a link and a code. No password needed.
        </p>
      </div>
      {/* The form reads the URL (?error=link), a request time value. */}
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </main>
  );
}
