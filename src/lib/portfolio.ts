import raw from "../../data/portfolio.json";

export type AnchorKey = "kafd" | "airport" | "kingdom" | "diriyah";
export type Area = "Central" | "East" | "North" | "South" | "West";
export type Deal = "sale" | "lease";
export type LandType = "residential" | "commercial";
export type Status = "available" | "reserved" | "sold" | "leased";

export type Parcel = {
  parcel_id: string; district_en: string; district_ar: string;
  area_of_city: Area; land_type: LandType; listing_type: Deal;
  price_basis: string; area_sqm: number; price_per_sqm_sar: number | null; total_price_sar: number | null;
  street_width_m: number; status: Status;
  listed_date: string; days_on_market: number; lat: number; lng: number;
  price_on_request: boolean; frontage: "main_road" | "collector" | "internal";
  size_class: string; listing_age_days: number;
  pricing: { area_median_sqm?: number; area_peer_count?: number; vs_area_pct?: number; district_median_sqm?: number; vs_district_pct?: number };
  distances_km: Record<AnchorKey, number>;
  /** Real road driving time (free-flow) and road distance to each landmark. */
  drive: Record<AnchorKey, { min: number; km: number }>;
  closed_comps: string[]; segment_demand: number;
  /** Set on properties added from the admin panel: drive times are estimated from distance, not routed. */
  added?: boolean; drive_estimated?: boolean;
};

type Raw = {
  snapshot_date: string;
  parcels: Parcel[];
  corrections: { parcel_id: string | null; field: string; issue: string; action: string; issue_ar?: string; action_ar?: string }[];
  demand: { area_of_city: Area; land_type: LandType; listing_type: Deal; count: number }[];
  anchors: Record<string, { en: string; ar: string; lat: number; lng: number }>;
};

export const portfolio = raw as unknown as Raw;
export const parcels: Parcel[] = [...portfolio.parcels];
export const byId = (id: string) => parcels.find((p) => p.parcel_id.toLowerCase() === id.toLowerCase());
export const available = parcels.filter((p) => p.status === "available");
export const districtCount = new Set(parcels.map((p) => p.district_en)).size;
export const AREAS: Area[] = ["North", "East", "Central", "West", "South"];

// ---- Live changes from the admin panel (stored in the database) ----
// Added properties and status/price changes are layered over the original data and written into the same
// arrays everything reads: on the server per request, and in the browser after load.
export type Edits = Partial<Pick<Parcel, "district_ar" | "district_en" | "area_of_city" | "land_type" | "listing_type" | "area_sqm" | "street_width_m">>;
export type Override = { status?: Status; total_price_sar?: number | null; edits?: Edits; removed?: boolean; closed_price?: number | null; closed_date?: string | null; updated_at?: string };

/** Median price per m² of the original properties in a segment, for recomputing comparisons after an edit. */
const medianCache = new Map<string, number | undefined>();
function segMedian(area: Area, type: LandType, deal: Deal) {
  const k = `${area}|${type}|${deal}`;
  if (!medianCache.has(k)) {
    const xs = portfolio.parcels.filter((p) => p.area_of_city === area && p.land_type === type && p.listing_type === deal && p.price_per_sqm_sar).map((p) => p.price_per_sqm_sar!).sort((a, b) => a - b);
    medianCache.set(k, xs.length ? xs[Math.floor(xs.length / 2)] : undefined);
  }
  return medianCache.get(k);
}

let extras: Parcel[] = [];
let overrides: Record<string, Override> = {};
let version = 0;
let signature = JSON.stringify([[], {}]);
export const portfolioVersion = () => version;
export const getOverride = (id: string) => overrides[id];
export const originalOf = (id: string) => portfolio.parcels.find((p) => p.parcel_id === id) ?? extras.find((p) => p.parcel_id === id);

function applyOne(p: Parcel, o?: Override): Parcel {
  if (!o) return p;
  const q: Parcel = { ...p, ...(o.edits ?? {}), pricing: { ...p.pricing } };
  if (o.status) q.status = o.status;
  const segChanged = q.area_of_city !== p.area_of_city || q.land_type !== p.land_type || q.listing_type !== p.listing_type;
  const priceChanged = o.total_price_sar !== undefined && o.total_price_sar !== p.total_price_sar;
  if (priceChanged) { q.total_price_sar = o.total_price_sar!; q.price_on_request = o.total_price_sar == null; }
  if (q.street_width_m !== p.street_width_m) q.frontage = q.street_width_m >= 36 ? "main_road" : q.street_width_m >= 20 ? "collector" : "internal";
  if (q.area_sqm !== p.area_sqm) q.size_class = q.area_sqm < 700 ? "small" : q.area_sqm < 2500 ? "medium" : "large";
  if (priceChanged || segChanged || q.area_sqm !== p.area_sqm) {
    q.price_per_sqm_sar = q.total_price_sar == null ? null : Math.round(q.total_price_sar / q.area_sqm);
    if (segChanged) { q.pricing.area_median_sqm = segMedian(q.area_of_city, q.land_type, q.listing_type); delete q.pricing.district_median_sqm; delete q.pricing.vs_district_pct; }
    const per = q.price_per_sqm_sar;
    if (per && q.pricing.area_median_sqm) q.pricing.vs_area_pct = Math.round((per / q.pricing.area_median_sqm - 1) * 100); else delete q.pricing.vs_area_pct;
    if (per && q.pricing.district_median_sqm) q.pricing.vs_district_pct = Math.round((per / q.pricing.district_median_sqm - 1) * 100); else delete q.pricing.vs_district_pct;
  }
  return q;
}

/** Every property with today's changes applied, including deleted ones (for the admin list). */
export function allWithRemoved(): (Parcel & { removed?: boolean })[] {
  const ids = new Set(portfolio.parcels.map((p) => p.parcel_id));
  return [...portfolio.parcels, ...extras.filter((p) => !ids.has(p.parcel_id))].map((p) => ({ ...applyOne(p, overrides[p.parcel_id]), removed: !!overrides[p.parcel_id]?.removed }));
}

function rebuild() {
  const ids = new Set(portfolio.parcels.map((p) => p.parcel_id));
  const all = [...portfolio.parcels, ...extras.filter((p) => !ids.has(p.parcel_id))]
    .filter((p) => !overrides[p.parcel_id]?.removed).map((p) => applyOne(p, overrides[p.parcel_id]));
  const sig = JSON.stringify([extras.map((p) => p.parcel_id), overrides]);
  if (sig === signature) return false;
  signature = sig;
  parcels.length = 0; parcels.push(...all);
  available.length = 0; available.push(...all.filter((p) => p.status === "available"));
  version++;
  return true;
}

/** Replace the set of admin-added properties with `list`. Safe to call repeatedly. */
export function syncListings(list: Parcel[]) { extras = list; return rebuild(); }
/** Replace the status/price changes made from the admin panel. */
export function syncOverrides(o: Record<string, Override>) { overrides = o ?? {}; return rebuild(); }
/** Both at once (one re-render). */
export function syncLive(list: Parcel[], o: Record<string, Override>) { extras = list; overrides = o ?? {}; return rebuild(); }
export const isAdded = (id: string) => extras.some((p) => p.parcel_id === id);

/** Add one admin-added property (e.g. the one a page was opened for) without touching the rest. */
export function ensureListing(p: Parcel) {
  if (extras.some((x) => x.parcel_id === p.parcel_id) || portfolio.parcels.some((x) => x.parcel_id === p.parcel_id)) return;
  extras = [...extras, p]; rebuild();
}
