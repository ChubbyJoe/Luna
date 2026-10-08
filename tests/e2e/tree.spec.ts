import { ACCOUNT_A, ACCOUNT_B } from "./auth";
import { expect, test } from "./fixtures";
import {
  breadcrumbTrail,
  chevron,
  createTitledPage,
  expectSaved,
  openFromTree,
  PAGE_URL,
  sidebar,
  titleField,
  treeLink,
  uniqueTitle,
} from "./pages";
import { ensureTestUser, testEnv } from "../support/supabase-admin";

// Spec 0005: the page tree, M1 (nest, expand state, reveal, breadcrumb).

test.describe("as account A", () => {
  test.use({ storageState: ACCOUNT_A });

  test("add a sub page with +, and the tree and path survive a reload", async ({
    page,
  }) => {
    await page.goto("/");
    const parentTitle = uniqueTitle("Parent");
    const parent = await createTitledPage(page, parentTitle);
    await expect(chevron(page, parentTitle)).toHaveCount(0);

    // + opens the new page with its title focused, inside the expanded parent.
    const childTitle = uniqueTitle("Child");
    const child = await createTitledPage(page, childTitle, parent);
    await expect(chevron(page, parentTitle)).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(treeLink(page, child)).toHaveAttribute("aria-current", "page");
    await expect(
      sidebar(page)
        .locator("li", { has: page.locator(`a[href="/p/${parent}"]`) })
        .locator(`ul a[href="/p/${child}"]`),
    ).toBeVisible();
    await expect(breadcrumbTrail(page)).toHaveText([parentTitle, childTitle]);

    await page.reload();
    await expect(titleField(page)).toHaveValue(childTitle);
    await expect(chevron(page, parentTitle)).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(treeLink(page, child)).toBeVisible();
    await expect(breadcrumbTrail(page)).toHaveText([parentTitle, childTitle]);
    await expect(
      page.locator("header").getByRole("link", { name: parentTitle }),
    ).toHaveAttribute("href", `/p/${parent}`);
  });

  test("the breadcrumb shows a title as you type it", async ({ page }) => {
    await page.goto("/");
    const parentTitle = uniqueTitle("Typed");
    const parent = await createTitledPage(page, parentTitle);
    await createTitledPage(page, uniqueTitle("Under"), parent);
    await openFromTree(page, parent);
    await titleField(page).fill(`${parentTitle} more`);
    await expect(breadcrumbTrail(page)).toHaveText([`${parentTitle} more`]);
  });

  test("a collapsed branch stays collapsed after a reload", async ({
    page,
  }) => {
    await page.goto("/");
    const parentTitle = uniqueTitle("Fold");
    const parent = await createTitledPage(page, parentTitle);
    const child = await createTitledPage(page, uniqueTitle("Leaf"), parent);
    // Open the parent itself, so the reload does not reveal the child.
    await openFromTree(page, parent);

    await chevron(page, parentTitle).click();
    await expect(chevron(page, parentTitle)).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(treeLink(page, child)).toHaveCount(0);

    await page.reload();
    await expect(chevron(page, parentTitle)).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(treeLink(page, child)).toHaveCount(0);

    // Enter on the focused chevron opens it again.
    await chevron(page, parentTitle).focus();
    await page.keyboard.press("Enter");
    await expect(treeLink(page, child)).toBeVisible();
  });

  test("opening a deep page by URL expands its ancestors and shows its row", async ({
    page,
  }) => {
    await page.goto("/");
    const topTitle = uniqueTitle("Level1");
    const top = await createTitledPage(page, topTitle);
    const middleTitle = uniqueTitle("Level2");
    const middle = await createTitledPage(page, middleTitle, top);
    const deep = await createTitledPage(page, uniqueTitle("Level3"), middle);

    await openFromTree(page, top);
    await chevron(page, middleTitle).click();
    await chevron(page, topTitle).click();
    await expect(treeLink(page, deep)).toHaveCount(0);

    await page.goto(`/p/${deep}`);
    await expect(treeLink(page, deep)).toBeInViewport();
    await expect(treeLink(page, deep)).toHaveAttribute("aria-current", "page");
    await expect(chevron(page, topTitle)).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(chevron(page, middleTitle)).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});

test("expand state is per account in the same browser", async ({ browser }) => {
  const env = testEnv();
  const [userA, userB] = await Promise.all([
    ensureTestUser(env.emailA),
    ensureTestUser(env.emailB),
  ]);
  const context = await browser.newContext({ storageState: ACCOUNT_A });
  const page = await context.newPage();
  await page.goto("/");
  const parentTitle = uniqueTitle("A parent");
  const parent = await createTitledPage(page, parentTitle);
  await createTitledPage(page, uniqueTitle("A child"), parent);

  // Same browser (same localStorage), now signed in as B. B's set starts
  // empty and A's is left alone. (B owns no nested pages to show it: other
  // specs rely on B starting with no pages.)
  const contextB = await browser.newContext({ storageState: ACCOUNT_B });
  const { cookies } = await contextB.storageState();
  await contextB.close();
  await context.clearCookies();
  await context.addCookies(cookies);
  await page.goto("/");
  await expect(page.locator("#main")).toBeVisible();
  const stored = await page.evaluate(
    ([a, b]) => ({
      a: JSON.parse(localStorage.getItem(`luna:sidebar-expanded:${a}`) ?? "[]"),
      b: JSON.parse(localStorage.getItem(`luna:sidebar-expanded:${b}`) ?? "[]"),
    }),
    [userA, userB],
  );
  expect(stored.a).toContain(parent);
  expect(stored.b).toEqual([]);
  await context.close();
});

test.describe("on a phone", () => {
  test.use({
    storageState: ACCOUNT_A,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("+ is visible without hover in the drawer", async ({ page }) => {
    await page.goto("/");
    const drawer = page.getByRole("dialog");
    await page.getByRole("button", { name: "Show sidebar" }).click();
    await drawer.getByRole("button", { name: "New page" }).click();
    await expect(page).toHaveURL(PAGE_URL);
    const title = uniqueTitle("Phone");
    await titleField(page).fill(title);
    await expectSaved(page);

    await page.getByRole("button", { name: "Show sidebar" }).click();
    const add = drawer.getByRole("button", {
      name: `Add page inside ${title}`,
    });
    await expect(add).toBeVisible();
    await expect(add).toHaveCSS("opacity", "1");
  });
});
