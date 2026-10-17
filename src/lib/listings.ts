// Properties added from the admin panel: validation, derived facts, storage. Server only.
import "server-only";
import { sql, ensureSchema } from "./db";
import { parcels, portfolio, syncListings, type AnchorKey, type Area, type Deal, type LandType, type Parcel } from "./portfolio";
import { riyadhToday } from "./time";
import { inquiries } from "./admin/analytics";

export type ListingInput = {
  district_ar: string; district_en?: string; area_of_city: Area; land_type: LandType; listing_type: Deal;
  area_sqm: number; total_price_sar: number | null; street_width_m: number; lat: number; lng: number;
};

const AREAS: Area[] = ["North", "East", "Central", "West", "South"];
const median = (xs: number[]) => { if (!xs.length) return undefined; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};
const clean = (s: unknown, n: number) => String(s ?? "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, n);

export function validate(raw: Record<string, unknown>): { ok: true; v: ListingInput } | { ok: false; field: string } {
  const num = (k: string) => Number(raw[k]);
  const v: ListingInput = {
    district_ar: clean(raw.district_ar, 40), district_en: clean(raw.district_en, 40) || undefined,
    area_of_city: raw.area_of_city as Area, land_type: raw.land_type as LandType, listing_type: raw.listing_type as Deal,
    area_sqm: Math.round(num("area_sqm")), total_price_sar: raw.total_price_sar === null || raw.total_price_sar === "" ? null : Math.round(num("total_price_sar")),
    street_width_m: Math.round(num("street_width_m")), lat: num("lat"), lng: num("lng"),
  };
  if (v.district_ar.length < 2) return { ok: false, field: "district_ar" };
  if (!AREAS.includes(v.area_of_city)) return { ok: false, field: "area_of_city" };
  if (v.land_type !== "residential" && v.land_type !== "commercial") return { ok: false, field: "land_type" };
  if (v.listing_type !== "sale" && v.listing_type !== "lease") return { ok: false, field: "listing_type" };
  if (!(v.area_sqm >= 100 && v.area_sqm <= 500_000)) return { ok: false, field: "area_sqm" };
  if (v.total_price_sar != null && !(v.total_price_sar >= 10_000 && v.total_price_sar <= 5_000_000_000)) return { ok: false, field: "total_price_sar" };
  if (!(v.street_width_m >= 6 && v.street_width_m <= 120)) return { ok: false, field: "street_width_m" };
  if (!(v.lat >= 24.3 && v.lat <= 25.3 && v.lng >= 46.2 && v.lng <= 47.3)) return { ok: false, field: "location" };
  return { ok: true, v };
}

/** Everything the site shows about a property, worked out the same way as for the original 120. */
export function derive(id: string, v: ListingInput): Parcel {
  const today = riyadhToday();
  const perSqm = v.total_price_sar != null ? Math.round(v.total_price_sar / v.area_sqm) : null;
  const peers = parcels.filter((p) => p.parcel_id !== id && p.area_of_city === v.area_of_city && p.land_type === v.land_type && p.listing_type === v.listing_type && p.price_per_sqm_sar);
  const areaMed = median(peers.map((p) => p.price_per_sqm_sar!));
  const distPeers = peers.filter((p) => p.district_en.toLowerCase() === (v.district_en ?? "").toLowerCase() || p.district_ar === v.district_ar);
  const distMed = distPeers.length >= 2 ? median(distPeers.map((p) => p.price_per_sqm_sar!)) : undefined;
  const pricing: Parcel["pricing"] = {};
  if (areaMed) { pricing.area_median_sqm = areaMed; pricing.area_peer_count = peers.length; if (perSqm) pricing.vs_area_pct = Math.round((perSqm / areaMed - 1) * 100); }
  if (distMed) { pricing.district_median_sqm = distMed; if (perSqm) pricing.vs_district_pct = Math.round((perSqm / distMed - 1) * 100); }
  const anchors = portfolio.anchors as Record<AnchorKey, { lat: number; lng: number }>;
  const distances_km = {} as Record<AnchorKey, number>;
  const drive = {} as Record<AnchorKey, { min: number; km: number }>;
  for (const k of Object.keys(anchors) as AnchorKey[]) {
    const d = km(v, anchors[k]);
    distances_km[k] = Math.round(d * 10) / 10;
    const road = d * 1.3; // straight line to road distance, typical for Riyadh's grid
    drive[k] = { km: Math.round(road * 10) / 10, min: Math.max(3, Math.round((road / 55) * 60 + 2)) };
  }
  const closed = parcels.filter((p) => (p.status === "sold" || p.status === "leased") && p.land_type === v.land_type && p.listing_type === v.listing_type && p.price_per_sqm_sar)
    .sort((a, b) => km(v, a) - km(v, b)).slice(0, 3).map((p) => p.parcel_id);
  return {
    parcel_id: id, district_ar: v.district_ar, district_en: v.district_en || v.district_ar,
    area_of_city: v.area_of_city, land_type: v.land_type, listing_type: v.listing_type,
    price_basis: v.listing_type === "lease" ? "annual" : "total", area_sqm: v.area_sqm,
    price_per_sqm_sar: perSqm, total_price_sar: v.total_price_sar, street_width_m: v.street_width_m, status: "available",
    listed_date: today, days_on_market: 0, lat: Math.round(v.lat * 1e6) / 1e6, lng: Math.round(v.lng * 1e6) / 1e6,
    price_on_request: v.total_price_sar == null,
    frontage: v.street_width_m >= 36 ? "main_road" : v.street_width_m >= 20 ? "collector" : "internal",
    size_class: v.area_sqm < 700 ? "small" : v.area_sqm < 2500 ? "medium" : "large", listing_age_days: 0,
    pricing, distances_km, drive, closed_comps: closed,
    segment_demand: inquiries.filter((q) => q.area_of_city_wanted === v.area_of_city && q.land_type_wanted === v.land_type && q.prefers === v.listing_type).length,
    added: true, drive_estimated: true,
  };
}

export async function loadListings(includeArchived = false): Promise<(Parcel & { archived?: boolean; created_at?: string })[]> {
  if (!sql) return [];
  try {
    await ensureSchema();
    const rows = includeArchived
      ? await sql`SELECT id, data, archived, created_at FROM listings ORDER BY created_at DESC LIMIT 200`
      : await sql`SELECT id, data, archived, created_at FROM listings WHERE archived = false ORDER BY created_at DESC LIMIT 200`;
    return rows.map((r) => ({ ...(r.data as Parcel), archived: !!r.archived, created_at: String(r.created_at) }));
  } catch { return []; }
}

/** Pull admin-added properties into the shared portfolio for this server instance. */
export async function syncFromDb() {
  const list = await loadListings();
  syncListings(list);
  return list;
}

export async function nextId() {
  let n = 121;
  if (sql) {
    const rows = await sql`SELECT id FROM listings`;
    for (const r of rows) { const m = /^SRE-(\d+)$/.exec(String(r.id)); if (m) n = Math.max(n, Number(m[1]) + 1); }
  }
  return `SRE-${String(n).padStart(3, "0")}`;
}
