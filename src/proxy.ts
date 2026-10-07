import type { NextRequest } from "next/server";

import { refreshSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, images, the favicon, the cron route, and the auth callback.
    "/((?!_next/static|_next/image|favicon.ico|api/cron|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
