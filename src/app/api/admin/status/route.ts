// Admin: change a property's status, price or details, or delete/restore it.
// Stored as an override over the original data, so every change can be undone.
import { sql, ensureSchema } from "@/lib/db";
import { syncFromDb, loadOverrides } from "@/lib/listings";
import { originalOf, type Edits } from "@/lib/portfolio";
import { riyadhToday } from "@/lib/time";

const hits = new Map<string, number[]>();
const limited = (ip: string) => { const now = Date.now(); const xs = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000); xs.push(now); hits.set(ip, xs); return xs.length > 150; };
const AREAS = ["North", "East", "Central", "West", "South"];
const clean = (s: unknown, n: number) => String(s ?? "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, n);

function checkEdits(raw: Record<string, unknown>): { ok: true; e: Edits } | { ok: false; field: string } {
  const e: Edits = {};
  if ("district_ar" in raw) { const v = clean(raw.district_ar, 40); if (v.length < 2) return { ok: false, field: "district_ar" }; e.district_ar = v; }
  if ("district_en" in raw) { const v = clean(raw.district_en, 40); if (v.length < 2) return { ok: false, field: "district_en" }; e.district_en = v; }
  if ("area_of_city" in raw) { if (!AREAS.includes(String(raw.area_of_city))) return { ok: false, field: "area_of_city" }; e.area_of_city = raw.area_of_city as Edits["area_of_city"]; }
  if ("land_type" in raw) { if (raw.land_type !== "residential" && raw.land_type !== "commercial") return { ok: false, field: "land_type" }; e.land_type = raw.land_type; }
  if ("listing_type" in raw) { if (raw.listing_type !== "sale" && raw.listing_type !== "lease") return { ok: false, field: "listing_type" }; e.listing_type = raw.listing_type; }
  if ("area_sqm" in raw) { const v = Math.round(Number(raw.area_sqm)); if (!(v >= 100 && v <= 500_000)) return { ok: false, field: "area_sqm" }; e.area_sqm = v; }
  if ("street_width_m" in raw) { const v = Math.round(Number(raw.street_width_m)); if (!(v >= 6 && v <= 120)) return { ok: false, field: "street_width_m" }; e.street_width_m = v; }
  return { ok: true, e };
}

export async function PATCH(req: Request) {
  if (req.headers.get("x-sarj-admin") !== "1") return Response.json({ error: "forbidden" }, { status: 403 });
  if (!sql) return Response.json({ error: "db" }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return Response.json({ error: "rate" }, { status: 429 });
  let b: { id?: string; status?: string; total_price_sar?: number | null; closed_price?: number | null; edits?: Record<string, unknown>; replace_edits?: boolean; removed?: boolean };
  try { b = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  await ensureSchema();
  await syncFromDb();
  const orig = b.id ? originalOf(b.id) : undefined;
  if (!orig) return Response.json({ error: "not found" }, { status: 404 });
  const prev = (await loadOverrides())[orig.parcel_id] ?? {};

  // Details: keep only fields that differ from the original.
  let edits: Edits = { ...(prev.edits ?? {}) };
  if (b.edits) {
    const c = checkEdits(b.edits);
    if (!c.ok) return Response.json({ error: "invalid", field: c.field }, { status: 400 });
    edits = b.replace_edits ? c.e : { ...edits, ...c.e };
  }
  for (const k of Object.keys(edits) as (keyof Edits)[]) if (edits[k] === orig[k]) delete edits[k];
  const deal = edits.listing_type ?? orig.listing_type;

  // Status must fit the deal: a sale can be sold, a lease can be leased.
  let status = b.status ?? prev.status ?? orig.status;
  if (status === "sold" && deal === "lease") status = "leased";
  if (status === "leased" && deal === "sale") status = "sold";
  if (!["available", "reserved", "sold", "leased"].includes(status)) return Response.json({ error: "invalid", field: "status" }, { status: 400 });

  const priceSet = b.total_price_sar !== undefined ? b.total_price_sar !== orig.total_price_sar : "total_price_sar" in prev;
  const price = b.total_price_sar !== undefined ? (b.total_price_sar == null ? null : Math.round(Number(b.total_price_sar))) : prev.total_price_sar ?? null;
  if (priceSet && price != null && !(price >= 10_000 && price <= 5_000_000_000)) return Response.json({ error: "invalid", field: "price" }, { status: 400 });
  const closedPrice = b.closed_price !== undefined ? (b.closed_price == null ? null : Math.round(Number(b.closed_price))) : prev.closed_price ?? null;
  if (closedPrice != null && !(closedPrice >= 10_000 && closedPrice <= 5_000_000_000)) return Response.json({ error: "invalid", field: "closed_price" }, { status: 400 });
  const removed = b.removed !== undefined ? !!b.removed : !!prev.removed;
  const closing = status === "sold" || status === "leased";
  const statusDiff = status !== orig.status;

  if (!statusDiff && !priceSet && !Object.keys(edits).length && !removed) {
    await sql`DELETE FROM overrides WHERE id = ${orig.parcel_id}`;
  } else {
    await sql`INSERT INTO overrides (id, status, total_price_sar, price_set, closed_price, closed_date, edits, removed, updated_at)
      VALUES (${orig.parcel_id}, ${statusDiff ? status : null}, ${priceSet ? price : null}, ${priceSet}, ${closing ? closedPrice : null},
              ${closing ? prev.closed_date ?? riyadhToday() : null}, ${Object.keys(edits).length ? JSON.stringify(edits) : null}, ${removed}, now())
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, total_price_sar = EXCLUDED.total_price_sar, price_set = EXCLUDED.price_set,
        closed_price = EXCLUDED.closed_price, closed_date = EXCLUDED.closed_date, edits = EXCLUDED.edits, removed = EXCLUDED.removed, updated_at = now()`;
  }
  await syncFromDb();
  return Response.json({ ok: true, id: orig.parcel_id, status, removed, override: (await loadOverrides())[orig.parcel_id] ?? null });
}
