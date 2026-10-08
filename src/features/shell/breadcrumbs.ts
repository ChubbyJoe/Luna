export type BreadcrumbItem = { id: string; title: string; href: string };

export type CollapsedBreadcrumbs = {
  visible: BreadcrumbItem[];
  // Items folded into the ellipsis menu, in order; they sit after visible[0].
  hidden: BreadcrumbItem[];
};

// More than three items: keep the first and the last two, fold the rest.
export function collapseBreadcrumbs(
  items: BreadcrumbItem[],
): CollapsedBreadcrumbs {
  if (items.length <= 3) return { visible: items, hidden: [] };
  return {
    visible: [items[0], ...items.slice(-2)],
    hidden: items.slice(1, -2),
  };
}

export function breadcrumbTitle(title: string): string {
  return title.trim() === "" ? "Untitled" : title;
}
