import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../src/types/database";

// Test only: the luna-dev secret key lives in .env.test.local and never in src/.
// Loaded here so both Playwright and the db Vitest suite see the same values.
function loadTestEnv() {
  for (const file of [".env.local", ".env.test.local"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      // A missing file surfaces below as a named missing variable.
    }
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to .env.test.local (luna-dev only, see .env.example).`,
    );
  }
  return value;
}

export function testEnv() {
  loadTestEnv();
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    secretKey: required("SUPABASE_SECRET_KEY"),
    emailA: required("E2E_EMAIL_A"),
    emailB: required("E2E_EMAIL_B"),
  };
}

export function adminClient(): SupabaseClient<Database> {
  const env = testEnv();
  return createClient<Database>(env.url, env.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonClient(): SupabaseClient<Database> {
  const env = testEnv();
  return createClient<Database>(env.url, env.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Finds the test user, or creates it confirmed. The allowlist hook must know
// the email (a one time SQL insert on luna-dev, never a migration).
export async function ensureTestUser(email: string): Promise<string> {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers failed: ${error.message}`);
  const existing = data.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );
  if (existing) return existing.id;

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (created.error) {
    throw new Error(
      `Could not create ${email}: ${created.error.message}. If the sign up hook rejected it, ` +
        `allowlist it on luna-dev: insert into private.allowed_emails (email) values ('${email}');`,
    );
  }
  return created.data.user.id;
}

export async function deleteTestPages(userIds: string[]): Promise<void> {
  const { error } = await adminClient()
    .from("pages")
    .delete()
    .in("owner_id", userIds);
  if (error) throw new Error(`Could not delete test pages: ${error.message}`);
}

async function emailOtp(email: string): Promise<string> {
  const { data, error } = await adminClient().auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw new Error(`generateLink failed: ${error.message}`);
  return data.properties.email_otp;
}

export type MintedCookie = { name: string; value: string };

// A real session for `email`, as the cookies @supabase/ssr would set in the
// browser. generateLink sends no email; its code is verified right away.
export async function mintSession(email: string): Promise<MintedCookie[]> {
  const env = testEnv();
  const jar = new Map<string, string>();
  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value } of cookies) {
          if (value) jar.set(name, value);
          else jar.delete(name);
        }
      },
    },
  });
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: await emailOtp(email),
    type: "email",
  });
  if (error) throw new Error(`verifyOtp failed for ${email}: ${error.message}`);
  if (jar.size === 0) throw new Error(`No session cookies for ${email}`);
  return [...jar].map(([name, value]) => ({ name, value }));
}

// A signed in supabase-js client for the db suite (publishable key, RLS on).
export async function signedInClient(
  email: string,
): Promise<SupabaseClient<Database>> {
  const supabase = anonClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: await emailOtp(email),
    type: "email",
  });
  if (error) throw new Error(`verifyOtp failed for ${email}: ${error.message}`);
  return supabase;
}
