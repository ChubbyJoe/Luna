import type { Page, Request } from "@playwright/test";

import { ACCOUNT_A } from "./auth";
import { expect, test } from "./fixtures";
import {
  chevron,
  createTitledPage,
  PAGE_URL,
  sidebar,
  subPageLink,
  treeLink,
  uniqueTitle,
} from "./pages";

// Spec 0005 M3: drag and drop in the sidebar (mouse, Chromium).

test.use({ storageState: ACCOUNT_A });

type Zone = "before" | "after" | "inside";
const ZONE_Y: Record<Zone, number> = { before: 0.1, inside: 0.5, after: 0.9 };

function row(page: Page, id: string) {
  return treeLink(page, id).locator("xpath=..");
}

// Presses on the source row's link, then moves to the target and (unless
// told not to) drops. Steps let the browser fire real drag events.
async function drag(
  page: Page,
  sourceId: string,
  to: { id: string; zone: Zone } | "end",
  { holdMs = 0, drop = true } = {},
) {
  const target =
    to === "end" ? page.getByTestId("page-tree-end") : row(page, to.id);
  await row(page, sourceId).scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  await expect(treeLink(page, sourceId)).toBeInViewport();
  const source = await treeLink(page, sourceId).boundingBox();
  if (!source) throw new Error("source row not visible");
  await page.mouse.move(source.x + 8, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(source.x + 16, source.y + source.height / 2 + 4, {
    steps: 4,
  });
  const box = await target.boundingBox();
  if (!box) throw new Error("target not visible");
  const y =
    to === "end"
      ? box.y + box.height / 2
      : box.y + box.height * ZONE_Y[to.zone];
  await page.mouse.move(box.x + box.width / 2, y, { steps: 8 });
  if (holdMs > 0) await page.waitForTimeout(holdMs);
  if (drop) await page.mouse.up();
}

// The ids of a parent's sub pages (null: the top level), in order.
async function childOrder(page: Page, parentId: string | null) {
  const list =
    parentId === null
      ? sidebar(page).locator("ul[role=list]").first()
      : page.locator(`li:has(> div a[href="/p/${parentId}"]) > ul`);
  return list
    .locator(":scope > li > div > a")
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")!.split("/").at(-1)!),
    );
}

function isMove(request: Request) {
  return (
    request.method() === "PATCH" &&
    (request.postData() ?? "").includes('"position"')
  );
}

// Drops, then waits until the server has the move (a reload too soon would
// cancel the request still in flight).
async function dragAndSave(
  page: Page,
  sourceId: string,
  to: Parameters<typeof drag>[2],
) {
  const saved = page.waitForResponse(
    (response) => isMove(response.request()) && response.ok(),
  );
  await drag(page, sourceId, to);
  await saved;
}

// A fresh parent holding A, B, C, so other specs' pages (account A is shared
// across parallel workers) never land between them.
async function threePages(page: Page) {
  await page.goto("/");
  const parent = await createTitledPage(page, uniqueTitle("Drag parent"));
  const titles = ["Drag A", "Drag B", "Drag C"].map(uniqueTitle);
  const ids: string[] = [];
  for (const title of titles) {
    ids.push(await createTitledPage(page, title, parent));
  }
  return { parent, titles, ids };
}

async function expectChildOrder(
  page: Page,
  parentId: string | null,
  ids: string[],
) {
  await expect
    .poll(async () =>
      (await childOrder(page, parentId)).filter((id) => ids.includes(id)),
    )
    .toEqual(ids);
}

// Tall, so the rows a drag needs fit on screen together.
test.use({ viewport: { width: 1280, height: 1400 } });

test("drag before, after, inside, and to the end, each surviving a reload", async ({
  page,
}) => {
  const { parent, titles, ids } = await threePages(page);
  const [a, b, c] = ids;

  await dragAndSave(page, c, { id: a, zone: "before" });
  await expectChildOrder(page, parent, [c, a, b]);
  await page.reload();
  await expectChildOrder(page, parent, [c, a, b]);

  await dragAndSave(page, c, { id: a, zone: "after" });
  await expectChildOrder(page, parent, [a, c, b]);
  await page.reload();
  await expectChildOrder(page, parent, [a, c, b]);

  await dragAndSave(page, c, { id: a, zone: "inside" });
  await expect(subPageLink(page, a, c)).toBeVisible();
  await expect(chevron(page, titles[0])).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.reload();
  await expect(subPageLink(page, a, c)).toBeVisible();

  // The end zone: the last top level page.
  await dragAndSave(page, c, "end");
  await expect(subPageLink(page, a, c)).toHaveCount(0);
  await expectChildOrder(page, null, [parent, c]);
  await page.reload();
  await expectChildOrder(page, null, [parent, c]);
});

test("holding a drag over a collapsed row opens it after a moment", async ({
  page,
}) => {
  const { titles, ids } = await threePages(page);
  const [a, b, c] = ids;
  await drag(page, c, { id: a, zone: "inside" });
  await expect(subPageLink(page, a, c)).toBeVisible();
  await chevron(page, titles[0]).click();
  await expect(subPageLink(page, a, c)).toHaveCount(0);

  await drag(page, b, { id: a, zone: "inside" }, { holdMs: 900, drop: false });
  await expect(chevron(page, titles[0])).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(row(page, a)).toHaveAttribute("data-drop-inside", "true");
  await page.mouse.up();
  await expect(subPageLink(page, a, b)).toBeVisible();
});

test("a page cannot be dropped on itself or below itself", async ({ page }) => {
  const { ids } = await threePages(page);
  const [a, , c] = ids;
  await drag(page, c, { id: a, zone: "inside" });
  await expect(subPageLink(page, a, c)).toBeVisible();

  const moves: Request[] = [];
  page.on("request", (request) => isMove(request) && moves.push(request));
  await drag(page, a, { id: c, zone: "inside" }, { drop: false });
  await expect(row(page, c)).not.toHaveAttribute("data-drop-inside");
  await expect(row(page, c).locator("[data-drop-line]")).toHaveCount(0);
  await expect(row(page, a)).toHaveAttribute("data-dragging", "true");
  await page.mouse.up();

  await page.waitForTimeout(500);
  expect(moves).toEqual([]);
  await expect(subPageLink(page, a, c)).toBeVisible();
});

test.describe("on a phone", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("rows are not draggable", async ({ page }) => {
    await page.goto("/");
    const drawer = page.getByRole("dialog", { name: "Sidebar" });
    await page.getByRole("button", { name: "Show sidebar" }).click();
    await drawer.getByRole("button", { name: "New page" }).click();
    await expect(page).toHaveURL(PAGE_URL);
    await page.getByRole("button", { name: "Show sidebar" }).click();
    const rows = drawer.locator("li > div:has(> a)");
    await expect(rows.first()).toBeVisible();
    await expect(drawer.locator('[draggable="true"]')).toHaveCount(0);
  });
});
