import { z } from "zod";

// Validated at request time (not import time) so `next build` runs without real values.

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const keepaliveEnvSchema = z.object({
  CRON_SECRET: z.string().min(16),
  KEEPALIVE_DEV_SUPABASE_URL: z.url(),
  KEEPALIVE_DEV_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type KeepaliveEnv = z.infer<typeof keepaliveEnvSchema>;

// NEXT_PUBLIC_ vars are inlined at build time, so each one is read by its full literal name.
export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

// Server only: these vars exist only in the Vercel Production scope.
export function getKeepaliveEnv(): KeepaliveEnv {
  return keepaliveEnvSchema.parse({
    CRON_SECRET: process.env.CRON_SECRET,
    KEEPALIVE_DEV_SUPABASE_URL: process.env.KEEPALIVE_DEV_SUPABASE_URL,
    KEEPALIVE_DEV_SUPABASE_PUBLISHABLE_KEY:
      process.env.KEEPALIVE_DEV_SUPABASE_PUBLISHABLE_KEY,
  });
}
