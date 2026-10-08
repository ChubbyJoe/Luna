import { expect, test } from "./fixtures";

test.describe("reduced motion", () => {
  test("menus do not animate", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dev/ui");
    await page.getByRole("button", { name: "Page menu" }).click();
    const durations = await page.getByRole("menu").evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.transitionDuration, style.animationDuration]
        .flatMap((value) => value.split(","))
        .map((value) => parseFloat(value));
    });
    for (const seconds of durations) {
      expect(seconds).toBeLessThanOrEqual(0.00001);
    }
  });

  test("menus animate for 150ms or less otherwise", async ({ page }) => {
    await page.goto("/dev/ui");
    await page.getByRole("button", { name: "Page menu" }).click();
    const durations = await page.getByRole("menu").evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.transitionDuration, style.animationDuration]
        .flatMap((value) => value.split(","))
        .map((value) => parseFloat(value));
    });
    for (const seconds of durations) {
      expect(seconds).toBeLessThanOrEqual(0.15);
    }
  });
});

test.describe("toasts", () => {
  test("an error toast is announced and leaves after 8s", async ({ page }) => {
    await page.clock.install();
    await page.goto("/dev/ui");
    await page.getByRole("button", { name: "Show error toast" }).click();
    const region = page.locator("section[aria-live=polite]");
    const toast = region.locator("[data-sonner-toast]");
    await expect(toast).toContainText("Could not save your changes.");
    await page.clock.runFor(7_000);
    await expect(toast).toBeVisible();
    await page.clock.runFor(2_000);
    await expect(toast).toHaveCount(0);
  });

  test("an undo toast stays and is reachable by keyboard", async ({ page }) => {
    await page.clock.install();
    await page.goto("/dev/ui");
    await page.getByRole("button", { name: "Show undo toast" }).click();
    const undoToast = page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Moved to trash" });
    await expect(undoToast).toBeVisible();
    await page.clock.runFor(30_000);
    await expect(undoToast).toBeVisible();

    await page.keyboard.press("Alt+KeyT");
    const undo = page.getByRole("button", { name: "Undo", exact: true });
    for (let step = 0; step < 3; step++) {
      if (await undo.evaluate((element) => element === document.activeElement))
        break;
      await page.keyboard.press("Tab");
    }
    await expect(undo).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: "Restored" }),
    ).toBeVisible();
  });
});

test.describe("errors", () => {
  test.use({ expectedConsoleError: /Demo render error|error boundary/i });

  test("a render error shows the calm fallback and recovers", async ({
    page,
  }) => {
    await page.goto("/dev/ui");
    await page.getByRole("button", { name: "Throw" }).click();
    await expect(page.getByText("Something went wrong")).toBeVisible();
    await expect(page.locator("#main")).not.toContainText("Demo render error");
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(
      page.getByText("Content that renders normally."),
    ).toBeVisible();
  });
});

test.describe("not found", () => {
  test.use({ expectedConsoleError: /status of 404/ });

  test("an unknown URL is a calm 404", async ({ page }) => {
    const response = await page.goto("/no-such-route");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "This page does not exist" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Go to your pages" }),
    ).toHaveAttribute("href", "/");
  });
});
