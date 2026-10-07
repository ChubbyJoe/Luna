import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

// Anonymous, sessionless client used only by the keep alive cron to call `ping`.
export async function pingProject(url: string, publishableKey: string) {
  const supabase = createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("ping");
  if (error)
    throw new Error(`ping failed for ${new URL(url).host}: ${error.message}`);
  return data;
}
