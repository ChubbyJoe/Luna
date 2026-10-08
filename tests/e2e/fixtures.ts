import { expect, test as base } from "@playwright/test";

// Every page test fails if the page logs a console error (spec 0003, AC-14).
// A spec that triggers errors on purpose can name the ones it expects.
export const test = base.extend<{
  consoleErrors: string[];
  expectedConsoleError: RegExp | null;
}>({
  expectedConsoleError: [null, { option: true }],
  consoleErrors: [
    async ({ page, expectedConsoleError }, use) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await use(errors);
      const unexpected = errors.filter(
        (text) => !expectedConsoleError?.test(text),
      );
      expect(unexpected, "console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const COLOR_SCHEMES = ["light", "dark"] as const;
