// The first Tab stop on every signed in page.
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-md bg-popover px-3 py-2 text-sm font-medium text-popover-foreground shadow-md focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
    >
      Skip to content
    </a>
  );
}
