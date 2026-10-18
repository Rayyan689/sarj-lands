// Admin: change a property's status or price. Stored as an override over the original data, so it can be undone.
import { sql, ensureSchema } from "@/lib/db";
import { syncFromDb } from "@/lib/listings";
import { originalOf } from "@/lib/portfolio";
import { riyadhToday } from "@/lib/time";

const hits = new Map<string, number[]>();
const limited = (ip: string) => { const now = Date.now(); const xs = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000); xs.push(now); hits.set(ip, xs); return xs.length > 120; };

export async function PATCH(req: Request) {
  if (req.headers.get("x-sarj-admin") !== "1") return Response.json({ error: "forbidden" }, { status: 403 });
  if (!sql) return Response.json({ error: "db" }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return Response.json({ error: "rate" }, { status: 429 });
  let b: { id?: string; status?: string; total_price_sar?: number | null; closed_price?: number | null };
  try { b = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  await ensureSchema();
  await syncFromDb();
  const orig = b.id ? originalOf(b.id) : undefined;
  if (!orig) return Response.json({ error: "not found" }, { status: 404 });
  const closedWord = orig.listing_type === "sale" ? "sold" : "leased";
  const allowed = ["available", "reserved", closedWord];
  const status = b.status ?? orig.status;
  if (!allowed.includes(status) && status !== orig.status) return Response.json({ error: "invalid", field: "status" }, { status: 400 });
  const priceSet = b.total_price_sar !== undefined;
  const price = priceSet ? (b.total_price_sar == null ? null : Math.round(Number(b.total_price_sar))) : null;
  if (priceSet && price != null && !(price >= 10_000 && price <= 5_000_000_000)) return Response.json({ error: "invalid", field: "price" }, { status: 400 });
  const closedPrice = b.closed_price == null ? null : Math.round(Number(b.closed_price));
  if (closedPrice != null && !(closedPrice >= 10_000 && closedPrice <= 5_000_000_000)) return Response.json({ error: "invalid", field: "closed_price" }, { status: 400 });

  const prev = (await sql`SELECT status, total_price_sar, price_set FROM overrides WHERE id = ${orig.parcel_id}`)[0];
  const keepPriceSet = priceSet ? price !== orig.total_price_sar : !!prev?.price_set;
  const keepPrice = priceSet ? price : prev?.price_set ? (prev.total_price_sar == null ? null : Number(prev.total_price_sar)) : null;
  const closing = status === "sold" || status === "leased";
  // Back to exactly the original: drop the override entirely.
  if (status === orig.status && !keepPriceSet) {
    await sql`DELETE FROM overrides WHERE id = ${orig.parcel_id}`;
  } else {
    await sql`INSERT INTO overrides (id, status, total_price_sar, price_set, closed_price, closed_date, updated_at)
      VALUES (${orig.parcel_id}, ${status === orig.status ? null : status}, ${keepPrice}, ${keepPriceSet}, ${closing ? closedPrice : null}, ${closing ? riyadhToday() : null}, now())
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, total_price_sar = EXCLUDED.total_price_sar, price_set = EXCLUDED.price_set,
        closed_price = EXCLUDED.closed_price, closed_date = COALESCE(CASE WHEN EXCLUDED.closed_date IS NOT NULL THEN overrides.closed_date END, EXCLUDED.closed_date), updated_at = now()`;
  }
  await syncFromDb();
  return Response.json({ ok: true, id: orig.parcel_id, status });
}
