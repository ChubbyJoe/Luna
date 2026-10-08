// @vitest-environment node
// The samples below are the raw colors the rule must catch.
/* eslint-disable no-restricted-syntax */
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: process.cwd() });

async function colorErrors(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter(
    (message) => message.ruleId === "no-restricted-syntax",
  );
}

describe("token only color rule", { timeout: 30_000 }, () => {
  it.each([
    'const a = "text-gray-500";',
    "const b = `p-2 bg-[#fff]`;",
    'const c = "border-t-red-500";',
    'const w = "hover:bg-white";',
    'const o = "bg-[oklch(0.5_0.1_250)]";',
  ])("flags %s in feature code", async (code) => {
    expect(await colorErrors(code, "src/features/x.tsx")).toHaveLength(1);
  });

  it("allows token classes", async () => {
    expect(
      await colorErrors(
        'const d = "text-muted-foreground bg-sidebar-accent";',
        "src/features/x.tsx",
      ),
    ).toEqual([]);
  });

  it("does not flag generated shadcn components", async () => {
    expect(
      await colorErrors('const e = "bg-black/50";', "src/components/ui/x.tsx"),
    ).toEqual([]);
  });
});
