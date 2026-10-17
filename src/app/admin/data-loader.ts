// Server-side loader shared by every admin page. Rendered per visit so ages and "days waiting" count from today in Riyadh.
import "server-only";
import { connection } from "next/server";
import { headers } from "next/headers";
import { buildAnalytics } from "@/lib/admin/analytics";
import { loadLive } from "@/lib/admin/live";
import { syncFromDb } from "@/lib/listings";

export async function loadAdmin(withLive = true) {
  await connection();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "sarj-lands-skg5.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const listings = await syncFromDb();
  const a = buildAnalytics(`${proto}://${host}`);
  const live = withLive ? await loadLive() : null;
  return JSON.parse(JSON.stringify({ a, live, listings })) as { a: typeof a; live: Awaited<ReturnType<typeof loadLive>> | null; listings: typeof listings };
}
