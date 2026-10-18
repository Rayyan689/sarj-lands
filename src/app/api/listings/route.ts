// Public: properties added from the admin panel and status/price changes, so the browser can layer them on the original data.
import { loadLiveState } from "@/lib/listings";

export async function GET() {
  const s = await loadLiveState();
  const overrides = Object.fromEntries(Object.entries(s.overrides).map(([id, o]) => [id, { status: o.status, ...("total_price_sar" in o ? { total_price_sar: o.total_price_sar } : {}) }]));
  return Response.json({ listings: s.listings, overrides }, { headers: { "cache-control": "no-store" } });
}
