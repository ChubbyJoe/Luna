"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundMessage } from "@/features/shell/components/not-found-message";
import { PageColumn } from "@/features/shell/components/page-column";
import { RouteError } from "@/features/shell/components/route-error";
import { TopBar } from "@/features/shell/components/top-bar";

import { blocksToPlainText } from "../blocks-to-plain-text";
import { usePendingSaves, useSession } from "../pending-saves";
import { pageDetailQueryOptions, pageKeys } from "../queries";
import type { ServerPage } from "../save-machine";
import { isEditorContent, type PageDetail, type StoredBlock } from "../schemas";
import { displayTitle } from "../title";
import { ConflictNotice, GoneNotice } from "./conflict-notice";
import type { PageEditorInstance } from "./page-editor";
import { TitleField } from "./title-field";

function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-3 pt-2" aria-hidden="true">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}

// BlockNote touches the DOM on import, so it only ever renders in the browser.
const PageEditor = dynamic(
  () => import("./page-editor").then((module) => module.PageEditor),
  { ssr: false, loading: EditorSkeleton },
);

function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Luna`;
  }, [title]);
  useEffect(
    () => () => {
      document.title = "Luna";
    },
    [],
  );
}

export function PageNotFound() {
  useDocumentTitle("Not found");
  return (
    <>
      <TopBar breadcrumbs={[]} />
      <NotFoundMessage />
    </>
  );
}

export function PageLoading() {
  return (
    <>
      <TopBar breadcrumbs={[]} />
      <PageColumn>
        <Skeleton className="h-12 w-2/3" />
        <div className="mt-6">
          <EditorSkeleton />
        </div>
      </PageColumn>
    </>
  );
}

function focusStart(editor: PageEditorInstance) {
  const first = editor.document[0];
  if (first) editor.setTextCursorPosition(first, "start");
  editor.focus();
}

function fromDetail(page: PageDetail): ServerPage {
  return {
    title: page.title,
    content: page.content,
    updatedAt: page.updated_at,
  };
}

// Opens a page: from its save session when one is still running (unsaved
// edits survive navigation), else from the server.
export function PageView({ pageId }: { pageId: string }) {
  const registry = usePendingSaves();
  const [openSession] = useState(() => registry.getSessions().get(pageId));
  const query = useQuery({
    ...pageDetailQueryOptions(pageId),
    enabled: openSession === undefined,
  });

  useEffect(() => registry.attach(pageId), [registry, pageId]);

  if (openSession) {
    return (
      <EditorView
        pageId={pageId}
        origin={{ ...openSession.snapshot, updatedAt: openSession.base }}
      />
    );
  }
  if (query.isPending) return <PageLoading />;
  if (query.isError || (query.data && !isEditorContent(query.data.content))) {
    // Content this editor cannot show is never opened for editing.
    return (
      <>
        <TopBar breadcrumbs={[]} />
        <RouteError reset={() => query.refetch()} />
      </>
    );
  }
  if (query.data === null) return <PageNotFound />;
  return <EditorView pageId={pageId} origin={fromDetail(query.data)} />;
}

function EditorView({
  pageId,
  origin,
}: {
  pageId: string;
  origin: ServerPage;
}) {
  const registry = usePendingSaves();
  const queryClient = useQueryClient();
  const session = useSession(pageId);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<PageEditorInstance | null>(null);
  // Load newer remounts the editor with the newer body.
  const [editorKey, setEditorKey] = useState(0);
  // A page with no title opens with the caret in its title. Focused in an
  // effect, so it lands after the shell moves focus to #main on navigation.
  const [focusTitleOnOpen] = useState(() => origin.title === "");
  useEffect(() => {
    if (focusTitleOnOpen) titleRef.current?.focus();
  }, [focusTitleOnOpen]);

  const title = session?.snapshot.title ?? origin.title;
  const display = displayTitle(title);
  useDocumentTitle(display);

  // The version the first edit opens a session from: the cache tracks every
  // save, so it is never older than what this view started with.
  const currentOrigin = useCallback((): ServerPage => {
    const cached = queryClient.getQueryData<PageDetail | null>(
      pageKeys.detail(pageId),
    );
    return cached ? fromDetail(cached) : origin;
  }, [queryClient, pageId, origin]);

  const onTitleChange = useCallback(
    (next: string) => registry.edit(pageId, currentOrigin(), { title: next }),
    [registry, pageId, currentOrigin],
  );
  const onContentChange = useCallback(
    (content: StoredBlock[]) =>
      registry.edit(pageId, currentOrigin(), { content }),
    [registry, pageId, currentOrigin],
  );
  const onBlur = useCallback(
    () => registry.flush(pageId, "edit"),
    [registry, pageId],
  );
  // Enter in the title before the editor has loaded still lands in the body.
  const bodyFocusPending = useRef(false);
  const onEditor = useCallback((editor: PageEditorInstance | null) => {
    editorRef.current = editor;
    if (editor && bodyFocusPending.current) {
      bodyFocusPending.current = false;
      focusStart(editor);
    }
  }, []);

  function focusBodyStart() {
    if (editorRef.current) focusStart(editorRef.current);
    else bodyFocusPending.current = true;
  }

  function focusTitleEnd() {
    const field = titleRef.current;
    if (!field) return;
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }

  function loadNewer() {
    registry.loadNewer(pageId);
    setEditorKey((key) => key + 1);
  }

  const bodyText = () =>
    [title, blocksToPlainText(session?.snapshot.content ?? origin.content)]
      .filter((part) => part !== "")
      .join("\n");

  return (
    <>
      <TopBar
        breadcrumbs={[{ id: pageId, title: display, href: `/p/${pageId}` }]}
        status={session?.status}
      />
      <PageColumn>
        {session?.state === "conflict" && (
          <ConflictNotice
            onLoadNewer={loadNewer}
            onKeepMine={() => registry.keepMine(pageId)}
          />
        )}
        {session?.state === "gone" && <GoneNotice text={bodyText} />}
        <TitleField
          ref={titleRef}
          value={title}
          onChange={onTitleChange}
          onBlur={onBlur}
          onExitBottom={focusBodyStart}
        />
        <div className="mt-4">
          <PageEditor
            key={editorKey}
            initialContent={session?.snapshot.content ?? origin.content}
            editable
            onChange={onContentChange}
            onBlur={onBlur}
            onExitTop={focusTitleEnd}
            onEditor={onEditor}
          />
        </div>
      </PageColumn>
    </>
  );
}
