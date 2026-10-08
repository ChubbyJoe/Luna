"use client";

import { Inter } from "next/font/google";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Replaces the root layout, so next-themes is gone: apply the saved theme here.
function savedThemeIsDark(): boolean {
  try {
    const theme = localStorage.getItem("theme") ?? "system";
    if (theme !== "system") return theme === "dark";
  } catch {
    // Storage can be blocked; fall back to the OS setting.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
    document.documentElement.classList.toggle("dark", savedThemeIsDark());
  }, [error]);

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <title>Something went wrong · Luna</title>
        <main
          id="main"
          className="mx-auto flex w-full max-w-page flex-1 flex-col justify-center gap-4 px-6 md:px-12"
        >
          <h1 className="text-h2">Something went wrong</h1>
          <p className="text-body text-muted-foreground">
            Luna could not load. Your pages are safe; reload to try again.
          </p>
          <div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
