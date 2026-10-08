import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/features/shell/sidebar-state", () => ({
  readSidebarDefaultOpen: async () => true,
}));
vi.mock("@/features/design-system/components/shell-preview", () => ({
  ShellPreview: () => null,
}));

import ShellPreviewLayout from "./layout";

describe("/dev/ui/shell", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is a 404 in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(ShellPreviewLayout({ children: null })).rejects.toThrow(
      "NOT_FOUND",
    );
  });

  it("renders outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await expect(ShellPreviewLayout({ children: null })).resolves.toBeTruthy();
  });
});
