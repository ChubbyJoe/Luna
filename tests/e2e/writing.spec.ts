import { ACCOUNT_A, ACCOUNT_B } from "./auth";
import { expect, test } from "./fixtures";
import {
  body,
  createPage,
  expectSaved,
  PAGE_URL,
  paragraphs,
  sidebar,
  status,
  titleField,
  uniqueTitle,
} from "./pages";

// Spec 0004: the core writing loop.

test.describe("as account A", () => {
  test.use({ storageState: ACCOUNT_A });

  test("create a page, write, and find it after a reload", async ({ page }) => {
    await page.goto("/");
    const id = await createPage(page);
    const link = sidebar(page).locator(`a[href="/p/${id}"]`);
    await expect(link).toHaveText("Untitled");
    await expect(status(page)).toHaveCount(0);

    // Hold each save briefly so "Saving…" is observable.
    await page.route("**/rest/v1/pages?*", async (route) => {
      if (route.request().method() === "PATCH") {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      await route.continue();
    });

    const title = uniqueTitle("Happy");
    await titleField(page).pressSequentially(title);
    await page.keyboard.press("Enter");
    await page.keyboard.type("First paragraph");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Second paragraph");

    await expect(status(page)).toHaveText("Saving…");
    await expectSaved(page);
    await expect(link).toHaveText(title);

    await page.reload();
    await expect(titleField(page)).toHaveValue(title);
    await expect(paragraphs(page)).toHaveText([
      "First paragraph",
      "Second paragraph",
    ]);
    await expect(link).toHaveText(title);
    await expect(page).toHaveTitle(`${title} · Luna`);
  });

  test("another account sees neither the page nor its title", async ({
    page,
    browser,
  }) => {
    await page.goto("/");
    const id = await createPage(page);
    const title = uniqueTitle("Private");
    await titleField(page).fill(title);
    await expectSaved(page);

    const other = await browser.newContext({ storageState: ACCOUNT_B });
    const pageB = await other.newPage();
    await pageB.goto(`/p/${id}`);
    await expect(
      pageB.getByRole("heading", { name: "This page does not exist" }),
    ).toBeVisible();
    await expect(sidebar(pageB)).not.toContainText(title);
    await expect(sidebar(pageB).locator(`a[href="/p/${id}"]`)).toHaveCount(0);
    await other.close();
  });
});

test.describe("not found", () => {
  test.use({
    storageState: ACCOUNT_A,
    expectedConsoleError: /Failed to load resource.*404/,
  });

  for (const path of ["/p/not-a-uuid", `/p/${crypto.randomUUID()}`]) {
    test(`${path.length > 20 ? "an unknown id" : "a malformed id"} shows not found`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { name: "This page does not exist" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Go to your pages" }),
      ).toBeVisible();
      await expect(page).toHaveTitle("Not found · Luna");
    });
  }
});

// Account B writes only here, and runs serially, so its page set is known.
test.describe("home as account B", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: ACCOUNT_B });

  test("starts empty, then opens the most recently edited page", async ({
    page,
  }) => {
    await page.goto("/");
    const main = page.locator("#main");
    await expect(
      main.getByRole("heading", { name: "No pages yet" }),
    ).toBeVisible();

    await main.getByRole("button", { name: "New page" }).click();
    await expect(page).toHaveURL(PAGE_URL);
    const first = page.url();
    await titleField(page).fill(uniqueTitle("First"));
    await expectSaved(page);

    const secondId = await createPage(page);
    await titleField(page).fill(uniqueTitle("Second"));
    await expectSaved(page);

    await page.goto("/");
    await expect(page).toHaveURL(`/p/${secondId}`);

    await page.goto(first);
    await body(page).click();
    await page.keyboard.type("Edited again");
    await expectSaved(page);

    await page.goto("/");
    await expect(page).toHaveURL(first);
  });
});
