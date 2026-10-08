import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { test as setup } from "@playwright/test";

import {
  deleteTestPages,
  ensureTestUser,
  mintSession,
  testEnv,
} from "../support/supabase-admin";

const AUTH_DIR = path.join(__dirname, ".auth");

// Sessions are minted fresh on every run, so a run never refreshes a token and
// parallel workers never trip refresh token reuse detection.
setup("sign in the test accounts", async () => {
  const env = testEnv();
  const ids = await Promise.all([
    ensureTestUser(env.emailA),
    ensureTestUser(env.emailB),
  ]);
  await deleteTestPages(ids);
  await mkdir(AUTH_DIR, { recursive: true });

  for (const [file, email] of [
    ["a.json", env.emailA],
    ["b.json", env.emailB],
  ] as const) {
    const cookies = (await mintSession(email)).map(({ name, value }) => ({
      name,
      value,
      domain: "localhost",
      path: "/",
      expires: -1,
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    }));
    await writeFile(
      path.join(AUTH_DIR, file),
      JSON.stringify({ cookies, origins: [] }, null, 2),
    );
  }
});
