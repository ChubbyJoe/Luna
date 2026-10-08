import AxeBuilder from "@axe-core/playwright";
import type { Page, Request } from "@playwright/test";

import { ACCOUNT_A } from "./auth";
import { COLOR_SCHEMES, expect, test } from "./fixtures";
import {
  body,
  chevron,
  createTitledPage,
  expectSaved,
  liveRegion,
  moreActions,
  PAGE_URL,
  sidebar,
  status,
  subPageLink,
  titleField,
  treeLink,
  uniqueTitle,
} from "./pages";

// Spec 0005 M2: moving pages with the Move to dialog.

test.use({ storageState: ACCOUNT_A });

const PAGES = "**/rest/v1/pages?*";

function isMove(request: Request) {
  return (
    request.method() === "PATCH" &&
    (request.postData() ?? "").includes('"position"')
  );
}

// Tab from the page's link to its … button, then open Move to by keyboard.
async function openMoveToByKeyboard(page: Page, id: string, title: string) {
  await treeLink(page, id).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(moreActions(page, title)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: "Move to…" })).toBeFocused();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: `Move ${title} to` });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByPlaceholder("Search pages")).toBeFocused();
  return dialog;
}

// The unique tail of a uniqueTitle, which only that page's title contains.
const tail = (title: string) => title.split(" ").at(-1)!;

test("Move to by keyboard moves the page, focuses it, and announces it", async ({
  page,
}) => {
  await page.goto("/");
  const targetTitle = uniqueTitle("Target");
  const target = await createTitledPage(page, targetTitle);
  const movedTitle = uniqueTitle("Moved");
  const moved = await createTitledPage(page, movedTitle);

  const dialog = await openMoveToByKeyboard(page, moved, movedTitle);
  // Top level comes first; the page itself is not offered.
  await expect(dialog.getByRole("option").first()).toHaveText("Top level");
  await expect(dialog.getByRole("option", { name: movedTitle })).toHaveCount(0);
  await page.keyboard.type(tail(targetTitle));
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await page.keyboard.press("Enter");

  await expect(dialog).toBeHidden();
  await expect(subPageLink(page, target, moved)).toBeVisible();
  await expect(treeLink(page, moved)).toBeFocused();
  await expect(liveRegion(page)).toHaveText(
    `Moved ${movedTitle} into ${targetTitle}`,
  );
  await expect(
    page
      .locator("header [data-slot=breadcrumb-item]")
      .filter({ visible: true }),
  ).toHaveText([targetTitle, movedTitle]);

  await page.reload();
  await expect(chevron(page, targetTitle)).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(subPageLink(page, target, moved)).toBeVisible();
});

test("Escape closes Move to with no change; No pages found when nothing matches", async ({
  page,
}) => {
  await page.goto("/");
  const title = uniqueTitle("Stay");
  const id = await createTitledPage(page, title);
  const moves: Request[] = [];
  page.on("request", (request) => isMove(request) && moves.push(request));

  const dialog = await openMoveToByKeyboard(page, id, title);
  await page.keyboard.type("zzzz nothing matches this");
  await expect(dialog.getByText("No pages found")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(moreActions(page, title)).toBeFocused();
  expect(moves).toEqual([]);
});

test("moving a page to where it already is sends nothing", async ({ page }) => {
  await page.goto("/");
  const title = uniqueTitle("Last");
  const id = await createTitledPage(page, title);
  const moves: Request[] = [];
  page.on("request", (request) => isMove(request) && moves.push(request));

  // A new page is already the last top level page.
  const dialog = await openMoveToByKeyboard(page, id, title);
  await page.keyboard.type("Top level");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(treeLink(page, id)).toBeFocused();
  await page.waitForTimeout(500);
  expect(moves).toEqual([]);
});

test.describe("when the server rejects a move", () => {
  test.use({ expectedConsoleError: /Failed to load resource/ });

  for (const [name, reply, message] of [
    [
      "too deep",
      {
        status: 400,
        body: { code: "LN003", message: "deeper than 64 levels" },
      },
      "Pages can only be nested 64 levels deep.",
    ],
    [
      "a server error",
      { status: 500, body: { message: "boom" } },
      "Could not move the page. Try again.",
    ],
  ] as const) {
    test(`puts the row back and explains it: ${name}`, async ({ page }) => {
      await page.goto("/");
      const parentTitle = uniqueTitle("Parent");
      const parent = await createTitledPage(page, parentTitle);
      const title = uniqueTitle("Bounce");
      const id = await createTitledPage(page, title);
      await page.route(PAGES, (route) =>
        isMove(route.request())
          ? route.fulfill({
              status: reply.status,
              contentType: "application/json",
              body: JSON.stringify({
                details: null,
                hint: null,
                ...reply.body,
              }),
            })
          : route.continue(),
      );

      const dialog = await openMoveToByKeyboard(page, id, title);
      await page.keyboard.type(tail(parentTitle));
      await page.keyboard.press("Enter");
      await expect(dialog).toBeHidden();

      await expect(page.getByText(message)).toBeVisible();
      await expect(subPageLink(page, parent, id)).toHaveCount(0);
      await expect(treeLink(page, id)).toBeVisible();
      await expect(chevron(page, parentTitle)).toHaveCount(0);
      await expect(moreActions(page, title)).toBeFocused();
    });
  }
});

test.describe("on a phone", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("Move to works inside the drawer", async ({ page }) => {
    await page.goto("/");
    const drawer = page.getByRole("dialog", { name: "Sidebar" });
    const titles: string[] = [];
    const ids: string[] = [];
    for (const label of ["Phone parent", "Phone child"]) {
      const before = page.url();
      await page.getByRole("button", { name: "Show sidebar" }).click();
      await drawer.getByRole("button", { name: "New page" }).click();
      await expect(page).not.toHaveURL(before);
      await expect(page).toHaveURL(PAGE_URL);
      ids.push(page.url().split("/").at(-1)!);
      const title = uniqueTitle(label);
      titles.push(title);
      await titleField(page).fill(title);
      await expectSaved(page);
    }

    await page.getByRole("button", { name: "Show sidebar" }).click();
    await drawer
      .getByRole("button", { name: `More actions for ${titles[1]}` })
      .tap();
    await page.getByRole("menuitem", { name: "Move to…" }).tap();
    const dialog = page.getByRole("dialog", { name: `Move ${titles[1]} to` });
    await dialog.getByPlaceholder("Search pages").fill(tail(titles[0]));
    await dialog.getByRole("option", { name: titles[0] }).tap();
    await expect(dialog).toBeHidden();
    await expect(drawer).toBeVisible();
    await expect(subPageLink(page, ids[0], ids[1])).toBeVisible();
  });
});

test("a move in another tab shows up when this tab regains focus", async ({
  context,
}) => {
  const first = await context.newPage();
  await first.goto("/");
  const parentTitle = uniqueTitle("Tabs parent");
  const parent = await createTitledPage(first, parentTitle);
  const title = uniqueTitle("Tabs child");
  const id = await createTitledPage(first, title);
  await expect(chevron(first, parentTitle)).toHaveCount(0);

  const second = await context.newPage();
  await second.goto(`/p/${parent}`);
  const dialog = await openMoveToByKeyboard(second, id, title);
  await second.keyboard.type(tail(parentTitle));
  await second.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(subPageLink(second, parent, id)).toBeVisible();
  await expect(liveRegion(second)).toHaveText(/^Moved /);

  // Coming back to the first tab refetches the tree.
  await first.bringToFront();
  // TanStack Query refetches on the window's visibilitychange.
  await first.evaluate(() =>
    window.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(chevron(first, parentTitle)).toBeVisible();
});

test("moving the open page while it saves never raises a conflict", async ({
  page,
}) => {
  await page.goto("/");
  const parentTitle = uniqueTitle("Save parent");
  await createTitledPage(page, parentTitle);
  const title = uniqueTitle("Saving");
  const id = await createTitledPage(page, title);

  // Hold text saves, so the move happens while one is in flight.
  await page.route(PAGES, async (route) => {
    const request = route.request();
    if (request.method() === "PATCH" && !isMove(request)) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    await route.continue();
  });
  await body(page).click();
  await page.keyboard.type("Typed while moving");
  const dialog = await openMoveToByKeyboard(page, id, title);
  await page.keyboard.type(tail(parentTitle));
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();

  await expectSaved(page);
  await expect(page.getByText("This page changed in another tab.")).toHaveCount(
    0,
  );
  await page.reload();
  await expect(body(page)).toContainText("Typed while moving");
  await expect(status(page)).toHaveCount(0);
});

for (const colorScheme of COLOR_SCHEMES) {
  test(`a nested, expanded tree has no axe violations (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    const top = await createTitledPage(page, uniqueTitle("Axe 1"));
    const middle = await createTitledPage(page, uniqueTitle("Axe 2"), top);
    await createTitledPage(page, uniqueTitle("Axe 3"), middle);
    await expect(sidebar(page).locator("ul ul ul").first()).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .include("[data-slot=sidebar-container]")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map((node) => node.target.join(" ")),
      })),
    ).toEqual([]);
  });
}
