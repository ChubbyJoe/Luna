import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/features/design-system/components/style-guide", () => ({
  StyleGuide: () => null,
}));

import StyleGuidePage from "./page";

describe("/dev/ui", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is a 404 in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => StyleGuidePage()).toThrow("NOT_FOUND");
  });

  it("renders outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(() => StyleGuidePage()).not.toThrow();
  });
});
