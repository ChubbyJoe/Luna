import { cookies } from "next/headers";

// Must match the cookie the generated SidebarProvider writes.
const SIDEBAR_COOKIE = "sidebar_state";

// Open unless the visitor explicitly closed it.
export function getSidebarDefaultOpen(
  cookieValue: string | undefined,
): boolean {
  return cookieValue !== "false";
}

// Server only: lets the first render match the saved state, so nothing jumps.
export async function readSidebarDefaultOpen(): Promise<boolean> {
  const cookieStore = await cookies();
  return getSidebarDefaultOpen(cookieStore.get(SIDEBAR_COOKIE)?.value);
}
