import { expect, test as base } from "@playwright/test";

// Every page test fails if the page logs a console error (spec 0003, AC-14).
// A spec that blocks requests on purpose can list the errors it expects.
export const test = base.extend<{
  consoleErrors: string[];
  expectedConsoleErrors: RegExp[];
}>({
  expectedConsoleErrors: [[], { option: true }],
  consoleErrors: [
    async ({ page, expectedConsoleErrors }, use) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await use(errors);
      const unexpected = errors.filter(
        (text) => !expectedConsoleErrors.some((pattern) => pattern.test(text)),
      );
      expect(unexpected, "console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const COLOR_SCHEMES = ["light", "dark"] as const;
