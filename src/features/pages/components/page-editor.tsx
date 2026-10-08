"use client";

import "@blocknote/shadcn/style.css";

import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
} from "@blocknote/core";
import { en } from "@blocknote/core/locales";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useTheme } from "next-themes";
import { useEffect, type KeyboardEvent } from "react";

import type { StoredBlock } from "../schemas";

// Paragraphs of plain text only: no other blocks, no links, no styles, so
// there is no slash menu, toolbar, or bold. Feature 7 widens this schema.
// BlockNote 0.55 requires the link spec in every schema; `isValidLink` below
// keeps links out at every way in (typing, autolink, paste, HTML import).
export const editorSchema = BlockNoteSchema.create({
  blockSpecs: { paragraph: defaultBlockSpecs.paragraph },
  inlineContentSpecs: {
    text: defaultInlineContentSpecs.text,
    link: defaultInlineContentSpecs.link,
  },
  styleSpecs: {},
});

const noLinks = { isValidLink: () => false };

export type PageEditorInstance = typeof editorSchema.BlockNoteEditor;

const dictionary = {
  ...en,
  placeholders: {
    ...en.placeholders,
    // Shown while the body is one empty paragraph; nothing on later empty lines.
    emptyDocument: "Start writing",
    default: "",
  },
};

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// Pasted rich text arrives as plain paragraphs, one per line.
function plainParagraphs(text: string): string {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

// The caret sits before the first character of the first block. Read from
// the DOM: this runs before ProseMirror's own keydown handler, which is when
// ProseMirror catches its selection up with the caret.
function isAtBodyStart(root: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection?.isCollapsed || !selection.anchorNode) return false;
  const first = root.querySelector(".bn-editor [data-content-type]");
  if (!first?.contains(selection.anchorNode)) return false;
  const before = document.createRange();
  before.selectNodeContents(first);
  before.setEnd(selection.anchorNode, selection.anchorOffset);
  return before.toString() === "";
}

export function PageEditor({
  initialContent,
  editable,
  onChange,
  onBlur,
  onExitTop,
  onEditor,
}: {
  initialContent: StoredBlock[];
  editable: boolean;
  onChange: (blocks: StoredBlock[]) => void;
  onBlur: () => void;
  // Up or Backspace at the very start of the body moves to the title.
  onExitTop: () => void;
  onEditor: (editor: PageEditorInstance | null) => void;
}) {
  const { resolvedTheme } = useTheme();
  const editor = useCreateBlockNote({
    schema: editorSchema,
    // An empty array passes nothing: BlockNote starts with one empty paragraph.
    initialContent:
      initialContent.length > 0
        ? (initialContent as PageEditorInstance["document"])
        : undefined,
    dictionary,
    links: noLinks,
    pasteHandler: ({ event, editor: target }) => {
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (text !== "") target.pasteHTML(plainParagraphs(text));
      return true;
    },
  });

  // Hand the editor over only once its view is mounted: focusing it before
  // that drops the focus as soon as the view replaces its element.
  useEffect(() => {
    if (editor.domElement) onEditor(editor);
    const unsubscribe = editor.onMount(() => onEditor(editor));
    return () => {
      unsubscribe();
      onEditor(null);
    };
  }, [editor, onEditor]);

  function onKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowUp" && event.key !== "Backspace") return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
      return;
    }
    if (!isAtBodyStart(event.currentTarget)) return;
    event.preventDefault();
    event.stopPropagation();
    onExitTop();
  }

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      slashMenu={false}
      sideMenu={false}
      formattingToolbar={false}
      linkToolbar={false}
      filePanel={false}
      tableHandles={false}
      emojiPicker={false}
      onChange={() => onChange(editor.document as StoredBlock[])}
      onBlur={onBlur}
      onKeyDownCapture={onKeyDownCapture}
      className="luna-editor text-body"
    />
  );
}
