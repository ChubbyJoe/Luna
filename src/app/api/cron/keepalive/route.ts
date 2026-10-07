import { connection, NextResponse, type NextRequest } from "next/server";

import { getKeepaliveEnv, getPublicEnv } from "@/lib/env";
import { pingProject } from "@/lib/supabase/keepalive";

// Daily Vercel Cron (production only): keeps luna-prod and luna-dev from pausing.
export async function GET(request: NextRequest) {
  // Request time only: never prerender this at build, where env vars are absent.
  await connection();
  const keepalive = getKeepaliveEnv();
  if (request.headers.get("authorization") !== `Bearer ${keepalive.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const prod = getPublicEnv();
  const results = await Promise.allSettled([
    pingProject(prod.NEXT_PUBLIC_SUPABASE_URL, prod.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    pingProject(
      keepalive.KEEPALIVE_DEV_SUPABASE_URL,
      keepalive.KEEPALIVE_DEV_SUPABASE_PUBLISHABLE_KEY,
    ),
  ]);

  const failures = results
    .filter((result) => result.status === "rejected")
    .map((result) => String(result.reason));
  if (failures.length > 0) {
    console.error("keepalive failed", failures);
    return NextResponse.json({ ok: false, failures }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
