import { SignOutButton } from "@/features/auth/components/sign-out-button";

// Placeholder home until the core writing loop (feature 5) adds pages.
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">Luna</h1>
      <p className="text-muted-foreground">
        You are signed in. Your pages will live here.
      </p>
      <div>
        <SignOutButton />
      </div>
    </main>
  );
}
