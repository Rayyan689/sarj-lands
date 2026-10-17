// Public: properties added from the admin panel, so the browser can merge them with the original portfolio.
import { loadListings } from "@/lib/listings";

export async function GET() {
  const list = await loadListings();
  return Response.json({ listings: list.map(({ archived: _a, created_at: _c, ...p }) => p) }, { headers: { "cache-control": "no-store" } });
}
