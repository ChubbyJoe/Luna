import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        // Real queries against luna-dev as two signed in accounts and anon.
        extends: true,
        test: {
          name: "db",
          environment: "node",
          include: ["tests/db/**/*.test.ts"],
          testTimeout: 20_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
