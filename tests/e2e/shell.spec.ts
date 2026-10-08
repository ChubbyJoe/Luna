import { expect, test } from "./fixtures";

const SHELL = "/dev/ui/shell";

test.describe("desktop shell", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("shows the shell anatomy", async ({ page }) => {
    await page.goto(SHELL);
    const sidebar = page.locator("[data-slot=sidebar-container]");
    await expect(sidebar.getByRole("link", { name: "Luna" })).toBeVisible();
    await expect(sidebar.getByText("Pages", { exact: true })).toBeVisible();
    await expect(sidebar.getByText("No pages yet")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "you@example.com" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "breadcrumb" }),
    ).toBeVisible();
    const heading = page.getByRole("heading", { level: 1, name: "Notes" });
    const column = heading.locator("..");
    const box = await column.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(720);
  });

  test("the skip link is the first Tab stop and focuses main", async ({
    page,
  }) => {
    await page.goto(SHELL);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
    await expect(page.locator("#main")).toHaveJSProperty("tagName", "MAIN");
  });

  test("hides and shows the sidebar by button and shortcut", async ({
    page,
  }) => {
    await page.goto(SHELL);
    const sidebar = page.locator("[data-slot=sidebar]");
    const container = page.locator("[data-slot=sidebar-container]");
    const show = page.getByRole("button", { name: "Show sidebar" });
    await expect(show).toBeHidden();

    await page.getByRole("button", { name: "Hide sidebar" }).click();
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");
    await expect(container).toHaveAttribute("inert", "");
    await expect(show).toBeVisible();

    await show.click();
    await expect(sidebar).toHaveAttribute("data-state", "expanded");
    await expect(container).not.toHaveAttribute("inert");

    await page.keyboard.press("Control+Backslash");
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");
    await page.keyboard.press("Control+Backslash");
    await expect(sidebar).toHaveAttribute("data-state", "expanded");

    await page.keyboard.press("Control+b");
    await expect(sidebar).toHaveAttribute("data-state", "expanded");
  });

  test("a collapsed sidebar survives a reload and takes no focus", async ({
    page,
  }) => {
    await page.goto(SHELL);
    await page.getByRole("button", { name: "Hide sidebar" }).click();
    await expect(page.locator("[data-slot=sidebar]")).toHaveAttribute(
      "data-state",
      "collapsed",
    );

    const response = await page.reload();
    // The server already renders the saved state, so nothing jumps on load.
    expect(await response?.text()).toMatch(
      /data-slot="sidebar-wrapper"[^>]*data-state="collapsed"/,
    );

    for (let step = 0; step < 8; step++) {
      await page.keyboard.press("Tab");
      const insideSidebar = await page.evaluate(
        () =>
          !!document.activeElement?.closest("[data-slot=sidebar-container]"),
      );
      expect(insideSidebar).toBe(false);
    }
  });
});

test.describe("theme", () => {
  test.use({ expectedConsoleError: /Failed to load resource/ });

  test("follows the OS, then the menu choice, across a reload", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(SHELL);
    const html = page.locator("html");
    await expect(html).toHaveClass(/\bdark\b/);

    await page.getByRole("button", { name: "you@example.com" }).click();
    await page.getByRole("menuitem", { name: "Theme" }).click();
    await page.getByRole("menuitemradio", { name: "Light" }).click();
    await expect(html).not.toHaveClass(/\bdark\b/);

    await page.reload();
    await expect(html).not.toHaveClass(/\bdark\b/);
  });

  test("the first paint already shows the saved theme", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(SHELL);
    const lightBackground = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );

    await page.addInitScript(() => localStorage.setItem("theme", "light"));
    await page.emulateMedia({ colorScheme: "dark" });
    // Without the app's JS, only next-themes' inline script can set the theme.
    await page.route("**/_next/static/chunks/**/*.js", (route) =>
      route.abort(),
    );
    await page.goto(SHELL);
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
    expect(
      await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      ),
    ).toBe(lightBackground);
  });
});

test.describe("mobile drawer", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens from the top bar and closes by Escape or a link", async ({
    page,
  }) => {
    await page.goto(`${SHELL}/notes`);
    await expect(page.getByText("No pages yet")).toBeHidden();

    const trigger = page.getByRole("button", { name: "Show sidebar" });
    const drawer = page.getByRole("dialog");
    await trigger.click();
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("No pages yet")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await drawer.getByRole("link", { name: "Luna" }).click();
    await expect(page).toHaveURL(new RegExp(`${SHELL}$`));
    await expect(drawer).toBeHidden();
    await expect(page.locator("#main")).toBeFocused();
  });
});
