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

// ---- Properties added from the admin panel (stored in the database) ----
// They are merged into the same arrays everything reads, on the server per request and in the browser after load.
const extraIds = new Set<string>();
let version = 0;
export const portfolioVersion = () => version;

/** Replace the set of admin-added properties with `list`. Safe to call repeatedly. */
export function syncListings(list: Parcel[]) {
  const next = new Map(list.map((p) => [p.parcel_id, p]));
  let changed = false;
  for (const id of [...extraIds]) {
    if (next.has(id)) continue;
    for (const arr of [parcels, available]) { const i = arr.findIndex((p) => p.parcel_id === id); if (i >= 0) arr.splice(i, 1); }
    extraIds.delete(id); changed = true;
  }
  for (const p of next.values()) {
    if (portfolio.parcels.some((x) => x.parcel_id === p.parcel_id && !extraIds.has(x.parcel_id))) continue; // never shadow the original 120
    const i = parcels.findIndex((x) => x.parcel_id === p.parcel_id);
    if (i >= 0) parcels[i] = p; else parcels.push(p);
    const j = available.findIndex((x) => x.parcel_id === p.parcel_id);
    if (p.status === "available") { if (j >= 0) available[j] = p; else available.push(p); } else if (j >= 0) available.splice(j, 1);
    if (!extraIds.has(p.parcel_id)) changed = true;
    extraIds.add(p.parcel_id);
  }
  if (changed) version++;
  return changed;
}
export const isAdded = (id: string) => extraIds.has(id);

/** Add one admin-added property (e.g. the one a page was opened for) without touching the rest. */
export function ensureListing(p: Parcel) {
  if (parcels.some((x) => x.parcel_id === p.parcel_id)) return;
  syncListings([...parcels.filter((x) => extraIds.has(x.parcel_id)), p]);
}
