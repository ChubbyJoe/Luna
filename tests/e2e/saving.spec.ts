import type { Page } from "@playwright/test";

import { ACCOUNT_A } from "./auth";
import { expect, test } from "./fixtures";
import {
  body,
  createPage,
  expectSaved,
  paragraphs,
  sidebar,
  status,
  titleField,
  uniqueTitle,
} from "./pages";

// Spec 0004 M2: saves survive failures, navigation, and closing the tab.

test.use({
  storageState: ACCOUNT_A,
  // Failed saves are the point of these tests.
  expectedConsoleError: /Failed to load resource|Failed to fetch/,
});

const SAVES = "**/rest/v1/pages?*";

// Saves fail with a network error until the returned function is called.
async function failSaves(page: Page): Promise<() => Promise<void>> {
  const handler = async (
    route: Parameters<Parameters<Page["route"]>[1]>[0],
  ) => {
    if (route.request().method() === "PATCH") await route.abort("failed");
    else await route.continue();
  };
  await page.route(SAVES, handler);
  return () => page.unroute(SAVES, handler);
}

async function newTitledPage(page: Page, label: string) {
  const id = await createPage(page);
  const title = uniqueTitle(label);
  await titleField(page).fill(title);
  await expectSaved(page);
  return { id, title };
}

test("offline edits are kept, retried, and saved once back online", async ({
  page,
  context,
}) => {
  test.slow();
  await page.goto("/");
  await newTitledPage(page, "Offline");

  await context.setOffline(true);
  await body(page).click();
  await page.keyboard.type("Written offline");
  await expect(status(page)).toHaveText("Not saved", { timeout: 10_000 });
  // 1 s idle, then retries after 2 s and 4 s: the third failure toasts once.
  await expect(
    page.getByText(
      "Can't save right now. Your text is kept and Luna keeps trying.",
    ),
  ).toBeVisible({ timeout: 15_000 });

  await context.setOffline(false);
  await expectSaved(page);
  await page.reload();
  await expect(paragraphs(page)).toHaveText(["Written offline"]);
});

test("leaving a page with unsaved edits keeps saving them", async ({
  page,
}) => {
  test.slow();
  await page.goto("/");
  const x = await newTitledPage(page, "Left");
  const y = await newTitledPage(page, "Other");

  await sidebar(page).locator(`a[href="/p/${x.id}"]`).click();
  await expect(titleField(page)).toHaveValue(x.title);
  const restore = await failSaves(page);
  await body(page).click();
  await page.keyboard.type("Unsaved when I left");
  await expect(status(page)).toHaveText("Not saved", { timeout: 10_000 });

  await sidebar(page).locator(`a[href="/p/${y.id}"]`).click();
  await expect(titleField(page)).toHaveValue(y.title);
  await restore();

  // The retry runs in the background; reopening shows the latest text.
  await sidebar(page).locator(`a[href="/p/${x.id}"]`).click();
  await expect(paragraphs(page)).toHaveText(["Unsaved when I left"]);
  await expectSaved(page);
  await page.reload();
  await expect(paragraphs(page)).toHaveText(["Unsaved when I left"]);
});

test("closing the tab warns only while an edit is unsaved", async ({
  page,
}) => {
  await page.goto("/");
  await newTitledPage(page, "Leave");

  const dialogs: string[] = [];
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.type());
    await dialog.dismiss();
  });

  // Everything saved: reloading asks nothing.
  await page.reload();
  await expect(titleField(page)).toBeVisible();
  expect(dialogs).toEqual([]);

  await failSaves(page);
  await body(page).click();
  await page.keyboard.type("Not yet saved");
  await expect(status(page)).toHaveText("Not saved", { timeout: 10_000 });
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => dialogs).toEqual(["beforeunload"]);
});

test("sign out asks before dropping unsaved edits", async ({ page }) => {
  await page.goto("/");
  await newTitledPage(page, "Sign out");
  await failSaves(page);
  await body(page).click();
  await page.keyboard.type("Unsaved");

  await sidebar(page)
    .getByRole("button", { name: /e2e-a@/ })
    .click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  const confirm = page.getByRole("alertdialog", {
    name: "You have unsaved changes. Sign out anyway?",
  });
  await expect(confirm).toBeVisible();
  // Keep writing: the session stays (signing out would end account A's
  // session for the other tests).
  await confirm.getByRole("button", { name: "Keep writing" }).click();
  await expect(confirm).toBeHidden();
  await expect(page).not.toHaveURL(/sign-in/);
});
