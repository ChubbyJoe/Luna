// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// Every pair from spec 0003 "Contrast pairs": text needs 4.5:1, non text 3:1.
const PAIRS: { fg: string; bgs: string[]; ratio: number }[] = [
  { fg: "foreground", bgs: ["background", "popover", "muted"], ratio: 4.5 },
  {
    fg: "muted-foreground",
    bgs: ["background", "muted", "sidebar", "sidebar-accent", "popover"],
    ratio: 4.5,
  },
  { fg: "sidebar-foreground", bgs: ["sidebar", "sidebar-accent"], ratio: 4.5 },
  { fg: "primary-foreground", bgs: ["primary"], ratio: 4.5 },
  { fg: "link", bgs: ["background", "muted"], ratio: 4.5 },
  { fg: "destructive", bgs: ["background", "popover"], ratio: 4.5 },
  { fg: "input", bgs: ["background", "popover"], ratio: 3 },
  { fg: "ring", bgs: ["background", "sidebar", "popover", "muted"], ratio: 3 },
];

type Tokens = Record<string, string>;

function readBlock(css: string, selector: string): Tokens {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value.trim(),
    ]),
  );
}

// OKLCH to linear sRGB (Björn Ottosson's reference matrices), clamped to gamut.
function oklchToLinearRgb(value: string): [number, number, number] {
  const match = value.match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/);
  if (!match) throw new Error(`Not an opaque oklch() value: ${value}`);
  const [l, c, h] = match.slice(1).map(Number);
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  return [
    clamp(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    clamp(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    clamp(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ];
}

function luminance(value: string): number {
  const [r, g, b] = oklchToLinearRgb(value);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const themes = {
  light: readBlock(css, ":root"),
  dark: readBlock(css, ".dark"),
};

describe.each(Object.entries(themes))("%s theme", (_, tokens) => {
  const cases = PAIRS.flatMap(({ fg, bgs, ratio }) =>
    bgs.map((bg) => ({ fg, bg, ratio })),
  );

  it.each(cases)("--$fg on --$bg meets $ratio:1", ({ fg, bg, ratio }) => {
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(ratio);
  });
});

describe("token parity", () => {
  it("defines every token in both themes", () => {
    const light = Object.keys(themes.light).filter((name) => name !== "radius");
    expect(Object.keys(themes.dark).sort()).toEqual(light.sort());
  });
});
