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
};

type Raw = {
  snapshot_date: string;
  parcels: Parcel[];
  corrections: { parcel_id: string | null; field: string; issue: string; action: string; issue_ar?: string; action_ar?: string }[];
  demand: { area_of_city: Area; land_type: LandType; listing_type: Deal; count: number }[];
  anchors: Record<string, { en: string; ar: string; lat: number; lng: number }>;
};

export const portfolio = raw as unknown as Raw;
export const parcels = portfolio.parcels;
export const byId = (id: string) => parcels.find((p) => p.parcel_id.toLowerCase() === id.toLowerCase());
export const available = parcels.filter((p) => p.status === "available");
export const districtCount = new Set(parcels.map((p) => p.district_en)).size;
export const AREAS: Area[] = ["North", "East", "Central", "West", "South"];
