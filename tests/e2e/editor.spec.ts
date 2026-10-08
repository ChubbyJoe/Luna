import type { Locator } from "@playwright/test";

import { ACCOUNT_A } from "./auth";
import { expect, test } from "./fixtures";
import {
  body,
  caretOffset,
  createPage,
  editableBody,
  expectSaved,
  paragraphs,
  settle,
  sidebar,
  titleField,
} from "./pages";

// Spec 0004 AC-5 and AC-6: a paragraph only body under a one line title.

test.use({ storageState: ACCOUNT_A });

// A paste with both rich and plain text, as a browser copy would carry.
async function paste(target: Locator, html: string, text: string) {
  await target.evaluate(
    (element, data) => {
      const transfer = new DataTransfer();
      transfer.setData("text/html", data.html);
      transfer.setData("text/plain", data.text);
      element.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: transfer,
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    { html, text },
  );
}

test.describe("body", () => {
  test("is plain paragraphs: no menus, no bold, plain paste", async ({
    page,
  }) => {
    await page.goto("/");
    await createPage(page);
    await page.keyboard.press("Enter");

    const empty = body(page).locator(".bn-block-content").first();
    const placeholder = await empty.evaluate(
      (element) => getComputedStyle(element, "::after").content,
    );
    expect(placeholder).toBe('"Start writing"');

    await page.keyboard.type("/");
    await expect(page.locator(".bn-suggestion-menu")).toHaveCount(0);
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await page.keyboard.press("Backspace");

    await paste(
      editableBody(page),
      "<h1>Big heading</h1><p><strong>Bold</strong> words</p>",
      "Big heading\nBold words",
    );
    await expect(paragraphs(page)).toHaveText(["Big heading", "Bold words"]);
    await expect(body(page).locator("h1, strong")).toHaveCount(0);
    await expect(
      body(page).locator('[data-content-type="heading"]'),
    ).toHaveCount(0);

    // Last, so no later key acts on the selection made here.
    for (let step = 0; step < "words".length; step++) {
      await settle(page);
      await page.keyboard.press("Shift+ArrowLeft");
    }
    await page.keyboard.press("ControlOrMeta+b");
    await expect(body(page).locator("strong")).toHaveCount(0);
    await expect(paragraphs(page)).toHaveText(["Big heading", "Bold words"]);
    await expectSaved(page);
  });

  test("pastes plain text exactly: spaces, tabs, blank lines", async ({
    page,
  }) => {
    await page.goto("/");
    await createPage(page);
    await page.keyboard.press("Enter");
    await expect(editableBody(page)).toBeFocused();
    await settle(page);
    await page.keyboard.type("Ab");
    await expect(paragraphs(page)).toHaveText(["Ab"]);
    await page.keyboard.press("ArrowLeft");
    await settle(page);

    const text = "x  y \n\n\tz";
    await paste(editableBody(page), `<p>${text}</p>`, text);

    // Raw text: `toHaveText` would normalize the very whitespace under test.
    const expected = ["Ax  y ", "", "\tzb"];
    await expect
      .poll(() => paragraphs(page).allTextContents())
      .toEqual(expected);
    await expectSaved(page);

    await page.reload();
    await expect
      .poll(() => paragraphs(page).allTextContents())
      .toEqual(expected);
  });

  test("splits a paste on every line ending: \\r\\n, \\r, \\n", async ({
    page,
  }) => {
    await page.goto("/");
    await createPage(page);
    await page.keyboard.press("Enter");
    await expect(editableBody(page)).toBeFocused();
    await settle(page);

    const text = "one\r\ntwo\rthree\n";
    await paste(editableBody(page), `<p>${text}</p>`, text);

    // The trailing line break leaves the caret in a new empty paragraph.
    await expect
      .poll(() => paragraphs(page).allTextContents())
      .toEqual(["one", "two", "three", ""]);
    await page.keyboard.type("four");
    await expect
      .poll(() => paragraphs(page).allTextContents())
      .toEqual(["one", "two", "three", "four"]);
    await expectSaved(page);
  });

  test("keeps pasted markup characters as literal text", async ({ page }) => {
    await page.goto("/");
    await createPage(page);
    await page.keyboard.press("Enter");
    await expect(editableBody(page)).toBeFocused();
    await settle(page);

    const text = "<b>bold</b> & <i>x</i> &amp;";
    await paste(editableBody(page), "<p>ignored</p>", text);

    await expect.poll(() => paragraphs(page).allTextContents()).toEqual([text]);
    await expect(body(page).locator("b, i, strong, em")).toHaveCount(0);
    await expectSaved(page);

    await page.reload();
    await expect.poll(() => paragraphs(page).allTextContents()).toEqual([text]);
  });

  test("replaces the selected text with the pasted lines", async ({ page }) => {
    await page.goto("/");
    await createPage(page);
    await page.keyboard.press("Enter");
    await expect(editableBody(page)).toBeFocused();
    await settle(page);
    await page.keyboard.type("Hello world");
    await expect(paragraphs(page)).toHaveText(["Hello world"]);

    for (let step = 0; step < "world".length; step++) {
      await settle(page);
      await page.keyboard.press("Shift+ArrowLeft");
    }
    await settle(page);

    const text = "there\nfriend";
    await paste(editableBody(page), `<p>${text}</p>`, text);

    await expect
      .poll(() => paragraphs(page).allTextContents())
      .toEqual(["Hello there", "friend"]);
    await expectSaved(page);
  });
});

test.describe("title", () => {
  test("moves between title and body by keyboard", async ({ page }) => {
    await page.goto("/");
    await createPage(page);
    await titleField(page).pressSequentially("Keys");

    // Enter moves to the start of the (empty) body; Backspace there returns.
    await page.keyboard.press("Enter");
    await expect(editableBody(page)).toBeFocused();
    await settle(page);
    await page.keyboard.press("Backspace");
    await expect(titleField(page)).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(editableBody(page)).toBeFocused();
    await page.keyboard.type("Body");
    await expect(paragraphs(page)).toHaveText(["Body"]);

    // Down at the end of the title lands at the very start of the body, so
    // Backspace there (with text after the caret) returns to the title end.
    await titleField(page).evaluate((element) => {
      const field = element as HTMLTextAreaElement;
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
    });
    await page.keyboard.press("ArrowDown");
    await expect(editableBody(page)).toBeFocused();
    await expect.poll(() => caretOffset(page)).toBe(0);
    await settle(page);
    await page.keyboard.press("Backspace");
    await expect(titleField(page)).toBeFocused();
    await page.keyboard.type("!");
    await expect(titleField(page)).toHaveValue("Keys!");
    await expect(paragraphs(page)).toHaveText(["Body"]);

    await page.keyboard.press("ArrowDown");
    await expect(editableBody(page)).toBeFocused();
    await settle(page);
    await page.keyboard.press("ArrowUp");
    await expect(titleField(page)).toBeFocused();
  });

  test("stays one line and is live everywhere as you type", async ({
    page,
  }) => {
    await page.goto("/");
    const id = await createPage(page);
    // Saves fail here, so only the live session title can update the views.
    await page.route("**/rest/v1/pages?*", (route) =>
      route.request().method() === "PATCH"
        ? route.abort("failed")
        : route.continue(),
    );

    await titleField(page).evaluate((element) => {
      (element as HTMLTextAreaElement).focus();
      document.execCommand("insertText", false, "Line one\nLine two");
    });
    await expect(titleField(page)).toHaveValue("Line one Line two");

    await page.keyboard.type("!");
    const live = "Line one Line two!";
    await expect(sidebar(page).locator(`a[href="/p/${id}"]`)).toHaveText(live);
    await expect(
      page.getByRole("navigation", { name: "breadcrumb" }),
    ).toHaveText(live);
    await expect(page).toHaveTitle(`${live} · Luna`);

    await titleField(page).fill("");
    await expect(sidebar(page).locator(`a[href="/p/${id}"]`)).toHaveText(
      "Untitled",
    );
    await expect(page).toHaveTitle("Untitled · Luna");
  });
});
