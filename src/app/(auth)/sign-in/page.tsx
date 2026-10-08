import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInForm } from "@/features/auth/components/sign-in-form";
import { Wordmark } from "@/features/shell/components/wordmark";

export const metadata: Metadata = {
  title: "Sign in · Luna",
};

export default function SignInPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-11 shrink-0 items-center px-6 md:px-12">
        <Wordmark />
      </header>
      <main
        id="main"
        className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-16"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">Sign in to Luna</h1>
          <p className="text-sm text-muted-foreground">
            We will email you a link and a 6 digit code. No password needed.
          </p>
        </div>
        {/* The form reads the URL (?error=link), a request time value. */}
        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
      </main>
      <footer className="px-6 py-6 text-center text-xs text-muted-foreground md:px-12">
        A calm place for your pages.
      </footer>
    </div>
  );
}
