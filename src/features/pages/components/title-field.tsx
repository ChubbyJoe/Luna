"use client";

import type { KeyboardEvent, Ref } from "react";

import { sanitizeTitle, TITLE_MAX_LENGTH } from "../title";

// The page title: one line that wraps, above the body.
export function TitleField({
  ref,
  value,
  readOnly,
  onChange,
  onBlur,
  onExitBottom,
}: {
  ref: Ref<HTMLTextAreaElement>;
  value: string;
  readOnly?: boolean;
  onChange: (title: string) => void;
  onBlur: () => void;
  // Enter, or Down at the end, moves the caret to the start of the body.
  onExitBottom: () => void;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return;
    const field = event.currentTarget;
    const atEnd =
      field.selectionStart === field.value.length &&
      field.selectionEnd === field.value.length;
    if (event.key === "Enter" || (event.key === "ArrowDown" && atEnd)) {
      event.preventDefault();
      onExitBottom();
    }
  }

  return (
    <textarea
      ref={ref}
      rows={1}
      aria-label="Page title"
      placeholder="Untitled"
      maxLength={TITLE_MAX_LENGTH}
      readOnly={readOnly}
      value={value}
      onChange={(event) => onChange(sanitizeTitle(event.target.value))}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      className="field-sizing-content w-full resize-none bg-transparent text-title-sm text-foreground outline-none placeholder:text-muted-foreground md:text-title"
    />
  );
}
