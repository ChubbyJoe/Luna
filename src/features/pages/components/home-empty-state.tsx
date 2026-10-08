import { NewPageButton } from "./new-page-button";

// Home with no pages yet: the one place to start.
export function HomeEmptyState() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-h2">No pages yet</h1>
      <p className="text-body text-muted-foreground">
        Create your first page and start writing. It saves as you type.
      </p>
      <NewPageButton />
    </div>
  );
}
