import { expect, test } from "@playwright/test";

test("signed out visitors are sent to sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in to Luna" })).toBeVisible();
});

test("a failed magic link offers the code field", async ({ page }) => {
  await page.goto("/sign-in?error=link");
  await expect(page.getByLabel("6 digit code")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
});
