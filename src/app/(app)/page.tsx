import { PageColumn } from "@/features/shell/components/page-column";
import { TopBar } from "@/features/shell/components/top-bar";

// Placeholder home until the core writing loop (feature 5) adds pages.
export default function HomePage() {
  return (
    <>
      <TopBar breadcrumbs={[]} />
      <PageColumn>
        <h1 className="text-title-sm md:text-title">Welcome to Luna</h1>
        <p className="mt-4 text-body text-muted-foreground">
          You are signed in. Your pages will live here.
        </p>
      </PageColumn>
    </>
  );
}
