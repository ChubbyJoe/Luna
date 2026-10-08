import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageLoading, PageView } from "@/features/pages/components/page-view";
import { pageIdSchema } from "@/features/pages/schemas";

// The id streams in behind a skeleton, so navigating between pages is instant.
export default function Page({ params }: PageProps<"/p/[pageId]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <PageRoute params={params} />
    </Suspense>
  );
}

async function PageRoute({ params }: Pick<PageProps<"/p/[pageId]">, "params">) {
  const { pageId } = await params;
  if (!pageIdSchema.safeParse(pageId).success) notFound();
  // Keyed so each page gets its own editor and save session wiring.
  return <PageView key={pageId} pageId={pageId} />;
}
