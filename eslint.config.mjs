import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// Feature code uses design tokens only (docs/design.md). These catch raw
// palette classes (text-gray-500, bg-white) and arbitrary colors (bg-[#fff]).
const PALETTE_CLASS =
  /(?:^|[\s:])(?:bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|divide|shadow|decoration|placeholder|caret|accent)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})/
    .source;
const ARBITRARY_COLOR = /-\[(?:#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?|oklch|oklab)\()/
  .source;
const TOKENS_ONLY =
  "Use a design token class (see docs/design.md), not a raw or arbitrary color.";

const tokenColorsOnly = {
  files: ["src/**/*.{ts,tsx}"],
  ignores: ["src/components/ui/**"],
  rules: {
    "no-restricted-syntax": [
      "error",
      ...[PALETTE_CLASS, ARBITRARY_COLOR].flatMap((pattern) => [
        { selector: `Literal[value=/${pattern}/]`, message: TOKENS_ONLY },
        {
          selector: `TemplateElement[value.raw=/${pattern}/]`,
          message: TOKENS_ONLY,
        },
      ]),
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  tokenColorsOnly,
  // Last, so Prettier owns formatting and ESLint only checks code quality.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
