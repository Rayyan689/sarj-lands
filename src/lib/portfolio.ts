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
export type Override = { status?: Status; total_price_sar?: number | null; closed_price?: number | null; closed_date?: string | null; updated_at?: string };

let extras: Parcel[] = [];
let overrides: Record<string, Override> = {};
let version = 0;
let signature = JSON.stringify([[], {}]);
export const portfolioVersion = () => version;
export const getOverride = (id: string) => overrides[id];
export const originalOf = (id: string) => portfolio.parcels.find((p) => p.parcel_id === id) ?? extras.find((p) => p.parcel_id === id);

function applyOne(p: Parcel, o?: Override): Parcel {
  if (!o) return p;
  const q: Parcel = { ...p, pricing: { ...p.pricing } };
  if (o.status) q.status = o.status;
  if (o.total_price_sar !== undefined && o.total_price_sar !== p.total_price_sar) {
    q.total_price_sar = o.total_price_sar;
    q.price_on_request = o.total_price_sar == null;
    q.price_per_sqm_sar = o.total_price_sar == null ? null : Math.round(o.total_price_sar / p.area_sqm);
    const per = q.price_per_sqm_sar;
    if (per && q.pricing.area_median_sqm) q.pricing.vs_area_pct = Math.round((per / q.pricing.area_median_sqm - 1) * 100); else delete q.pricing.vs_area_pct;
    if (per && q.pricing.district_median_sqm) q.pricing.vs_district_pct = Math.round((per / q.pricing.district_median_sqm - 1) * 100); else delete q.pricing.vs_district_pct;
  }
  return q;
}

function rebuild() {
  const ids = new Set(portfolio.parcels.map((p) => p.parcel_id));
  const all = [...portfolio.parcels, ...extras.filter((p) => !ids.has(p.parcel_id))].map((p) => applyOne(p, overrides[p.parcel_id]));
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
