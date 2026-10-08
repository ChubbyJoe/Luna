import type { Page } from "@playwright/test";

import { expect } from "./fixtures";

// Shared steps for the page writing specs (feature 5).

export const PAGE_URL = /\/p\/[0-9a-f-]{36}$/;

export function sidebar(page: Page) {
  return page.locator("[data-slot=sidebar-container]");
}

export function titleField(page: Page) {
  return page.getByRole("textbox", { name: "Page title" });
}

export function body(page: Page) {
  return page.locator(".bn-editor");
}

// `.bn-editor` is the contenteditable element itself.
export function editableBody(page: Page) {
  return page.locator(".bn-editor[contenteditable=true]");
}

export function paragraphs(page: Page) {
  return page.locator('.bn-editor [data-content-type="paragraph"]');
}

export function status(page: Page) {
  return page.locator("header").getByText(/^(Saving…|Saved|Not saved)$/);
}

// Creates a page from the sidebar and returns its id. Home redirects to the
// latest page, so wait for a page other than the one already open.
export async function createPage(page: Page): Promise<string> {
  const before = page.url();
  await sidebar(page).getByRole("button", { name: "New page" }).click();
  await expect(page).not.toHaveURL(before);
  await expect(page).toHaveURL(PAGE_URL);
  await expect(titleField(page)).toBeFocused();
  return page.url().split("/").at(-1)!;
}

// A title nobody else's test uses, so assertions never collide.
export function uniqueTitle(label: string): string {
  return `${label} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function expectSaved(page: Page) {
  await expect(status(page)).toHaveText("Saved", { timeout: 10_000 });
}

// Lets the editor catch up: ProseMirror syncs its selection from the caret
// asynchronously, and test keys can arrive faster than any person types.
export async function settle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

export async function caretOffset(page: Page): Promise<number> {
  return page.evaluate(() => getSelection()?.anchorOffset ?? -1);
}
