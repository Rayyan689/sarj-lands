import raw from "../../data/portfolio.json";

export type Parcel = {
  parcel_id: string; district_en: string; district_ar: string;
  area_of_city: "Central" | "East" | "North" | "South" | "West";
  land_type: "residential" | "commercial"; listing_type: "sale" | "lease";
  price_basis: string; area_sqm: number; price_per_sqm_sar: number | null; total_price_sar: number | null;
  street_width_m: number; status: "available" | "reserved" | "sold" | "leased";
  listed_date: string; days_on_market: number; lat: number; lng: number;
  price_on_request: boolean; frontage: "main_road" | "collector" | "internal";
  size_class: string; listing_age_days: number;
  pricing: { area_median_sqm?: number; area_peer_count?: number; vs_area_pct?: number; district_median_sqm?: number; vs_district_pct?: number };
  distances_km: Record<string, number>; closed_comps: string[]; segment_demand: number;
};

export const portfolio = raw as unknown as {
  snapshot_date: string;
  parcels: Parcel[];
  corrections: { parcel_id: string | null; field: string; issue: string; action: string }[];
};

export const parcels = portfolio.parcels;
export const available = parcels.filter((p) => p.status === "available");
export const districtCount = new Set(parcels.map((p) => p.district_en)).size;
