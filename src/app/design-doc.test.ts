// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// docs/design.md documents every token; this keeps it in step with the CSS.
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const css = read("src/app/globals.css");
const doc = read("docs/design.md");

function readBlock(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value.trim(),
    ]),
  );
}

// Rows like: | `--background` | `oklch(...)` | `oklch(...)` | use |
const documented = Object.fromEntries(
  [...doc.matchAll(/^\| `--([\w-]+)` \| `([^`]+)` \| `([^`]+)` \|/gm)].map(
    ([, name, light, dark]) => [name, { light, dark }],
  ),
);

describe("docs/design.md", () => {
  const light = readBlock(":root");
  const dark = readBlock(".dark");
  const colorTokens = Object.keys(light).filter((name) => name !== "radius");

  it.each(colorTokens)("documents --%s with the CSS values", (name) => {
    expect(documented[name]).toEqual({ light: light[name], dark: dark[name] });
  });

  it("documents no token the CSS lacks", () => {
    expect(Object.keys(documented).sort()).toEqual([...colorTokens].sort());
  });

  it("matches the radius and page width", () => {
    expect(doc).toContain(`\`--radius: ${light.radius}\``);
    const page = css.match(/--container-page:\s*([^;]+);/)?.[1];
    expect(doc).toContain(`\`--container-page: ${page}\``);
  });
});
