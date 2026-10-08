import type { BrowserContext } from "@playwright/test";

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

// Spec 0004 AC-7: two tabs never overwrite each other silently.

test.use({ storageState: ACCOUNT_A });

const NOTICE = "This page changed in another tab.";

// Two tabs on the same page; the first has saved a newer title.
async function openConflict(context: BrowserContext) {
  const first = await context.newPage();
  await first.goto("/");
  const id = await createPage(first);
  await titleField(first).fill(uniqueTitle("Shared"));
  await expectSaved(first);

  const second = await context.newPage();
  await second.goto(`/p/${id}`);
  await expect(titleField(second)).toHaveValue(
    await titleField(first).inputValue(),
  );

  const theirs = uniqueTitle("From tab one");
  await titleField(first).fill(theirs);
  await expectSaved(first);

  await body(second).click();
  await second.keyboard.type("From tab two");
  await expect(second.getByText(NOTICE)).toBeVisible({ timeout: 10_000 });
  await expect(status(second)).toHaveText("Not saved");
  return { first, second, id, theirs };
}

test("Load newer takes the other tab's version", async ({ context }) => {
  const { first, second, theirs } = await openConflict(context);

  // Nothing was overwritten: the server still has tab one's version.
  await first.reload();
  await expect(titleField(first)).toHaveValue(theirs);
  await expect(paragraphs(first)).toHaveText([""]);

  // Typing while the notice shows is fine, and never sends.
  await second.keyboard.type(" and more");
  await second.getByRole("button", { name: "Load newer" }).click();
  await expect(second.getByText(NOTICE)).toBeHidden();
  await expect(titleField(second)).toHaveValue(theirs);
  await expect(paragraphs(second)).toHaveText([""]);
  await expect(status(second)).toHaveText("Saved");
});

test("Keep mine saves this tab's whole version over it", async ({
  context,
}) => {
  const { second, id } = await openConflict(context);
  const mine = await titleField(second).inputValue();

  // The notice comes back when you reopen a page left in conflict.
  await createPage(second);
  await sidebar(second).locator(`a[href="/p/${id}"]`).click();
  await expect(titleField(second)).toHaveValue(mine);
  await expect(second.getByText(NOTICE)).toBeVisible();

  await second.getByRole("button", { name: "Keep mine" }).click();
  await expect(second.getByText(NOTICE)).toBeHidden();
  await expectSaved(second);

  await second.reload();
  await expect(titleField(second)).toHaveValue(mine);
  await expect(paragraphs(second)).toHaveText(["From tab two"]);
});
