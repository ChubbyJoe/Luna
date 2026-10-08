import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

async function focusedName(page: Page) {
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    return (
      element?.getAttribute("aria-label") ?? element?.textContent?.trim() ?? ""
    );
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/dev/ui");
});

test("Tab follows the visual order", async ({ page }) => {
  const expected = [
    "Theme",
    "an inline link",
    "Default",
    "Outline",
    "Secondary",
    "Ghost",
    "Destructive",
    "Link",
    "Page menu",
    "Popover",
    "More actions",
    "Dialog",
    "Empty trash",
    "Show error toast",
    "Show undo toast",
  ];
  const seen: string[] = [];
  for (let step = 0; step < 40 && seen.length < 40; step++) {
    await page.keyboard.press("Tab");
    seen.push(await focusedName(page));
    if (seen.at(-1) === expected.at(-1)) break;
  }
  const positions = expected.map((name) => seen.indexOf(name));
  expect(positions).not.toContain(-1);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
});

test("menus open with Enter, move with arrows, close with Escape", async ({
  page,
}) => {
  const trigger = page.getByRole("button", { name: "Page menu" });
  const menu = page.getByRole("menu");
  // Radix moves focus to the first item only once its keydown listener has
  // mounted after hydration. An Enter that lands earlier still opens the menu
  // but leaves focus on the menu itself, so retry until hydration is done.
  await expect(async () => {
    if (await menu.isVisible()) await page.keyboard.press("Escape");
    // An Enter during the close animation is lost, so wait it out.
    await expect(menu).toBeHidden();
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitem").first()).toBeFocused({
      timeout: 1000,
    });
  }).toPass();
  const focusedItem = () =>
    page.evaluate(() =>
      document.activeElement?.getAttribute("role") === "menuitem"
        ? document.activeElement.textContent
        : null,
    );
  const before = await focusedItem();
  await page.keyboard.press("ArrowDown");
  await expect.poll(focusedItem).not.toBe(before);
  expect(await focusedItem()).not.toBeNull();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("dialogs trap focus and return it on Escape", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Dialog", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let step = 0; step < 10; step++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () => !!document.activeElement?.closest("[role=dialog]"),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("the focus ring shows for keyboard, not for a mouse click", async ({
  page,
}) => {
  // A probe with the same ring classes serializes the color the same way.
  const ringColor = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.className = "ring-3 ring-ring";
    document.body.append(probe);
    const shadow = getComputedStyle(probe).boxShadow;
    probe.remove();
    const ring = shadow
      .split(/,(?![^(]*\))/)
      .find((entry) => !entry.trim().startsWith("rgba(0, 0, 0, 0)"));
    return ring?.trim().replace(/ 0px 0px 0px .*$/, "") ?? "missing";
  });
  // The first of each name is the variant row.
  const button = (name: string) =>
    page.getByRole("button", { name, exact: true }).first();
  const shadow = (name: string) =>
    button(name).evaluate((element) => getComputedStyle(element).boxShadow);

  await page.getByRole("button", { name: "Theme" }).focus();
  await page.keyboard.press("Tab"); // the inline link
  await page.keyboard.press("Tab"); // the Default button
  await expect(button("Default")).toBeFocused();
  // Poll: the ring fades in through a short transition.
  await expect.poll(() => shadow("Default")).toContain(ringColor);
  expect(await shadow("Outline")).not.toContain(ringColor);

  await button("Outline").click();
  await expect(button("Outline")).toBeFocused();
  expect(await shadow("Outline")).not.toContain(ringColor);
});
