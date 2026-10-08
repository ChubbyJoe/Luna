import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import { COLOR_SCHEMES, expect, test } from "./fixtures";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();
  expect(
    violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map((node) => node.target.join(" ")),
    })),
  ).toEqual([]);
}

for (const colorScheme of COLOR_SCHEMES) {
  test.describe(`${colorScheme} scheme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme });
    });

    for (const path of ["/dev/ui", "/sign-in"]) {
      test(`${path} has no axe violations`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator("html")).toHaveClass(
          colorScheme === "dark" ? /\bdark\b/ : /^(?!.*\bdark\b)/,
        );
        await expectNoViolations(page);
      });
    }

    test("/dev/ui/shell has no axe violations, menu closed and open", async ({
      page,
    }) => {
      await page.goto("/dev/ui/shell");
      await expectNoViolations(page);
      await page.getByRole("button", { name: "you@example.com" }).click();
      await expect(page.getByRole("menu")).toBeVisible();
      await expectNoViolations(page);
    });
  });
}
