import { describe, expect, it } from "vitest";

import { emailSchema, otpCodeSchema } from "@/features/auth/schemas";

describe("auth schemas", () => {
  it("accepts a valid email and rejects a malformed one", () => {
    expect(emailSchema.safeParse("me@example.com").success).toBe(true);
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("accepts exactly six digits for the code", () => {
    expect(otpCodeSchema.safeParse("123456").success).toBe(true);
    expect(otpCodeSchema.safeParse("12345").success).toBe(false);
    expect(otpCodeSchema.safeParse("12345a").success).toBe(false);
  });
});
