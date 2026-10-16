import { portfolio, type Area, type Deal, type LandType, type Parcel, type Status } from "./portfolio";
import type { Lang } from "./i18n";

export type T = { ar: string; en: string };

// Latin digits, as most Saudi property sites use, with Arabic words around them.
const nf = (lang: Lang, max = 0) =>
  new Intl.NumberFormat(lang === "ar" ? "ar-SA-u-nu-latn" : "en-US", { maximumFractionDigits: max });

export const num = (n: number, lang: Lang, max = 0) => nf(lang, max).format(n);

/** 3,284,000 -> "3.28 مليون" / "SAR 3.28M" */
export function money(n: number, lang: Lang) {
  if (n >= 1_000_000) {
    const v = nf(lang, 2).format(n / 1_000_000);
    return lang === "ar" ? `${v} مليون ريال` : `SAR ${v}M`;
  }
  if (n >= 1_000) {
    const v = nf(lang, 0).format(n / 1_000);
    return lang === "ar" ? `${v} ألف ريال` : `SAR ${v}K`;
  }
  return lang === "ar" ? `${nf(lang).format(n)} ريال` : `SAR ${nf(lang).format(n)}`;
}

export function priceLabel(p: Parcel, lang: Lang) {
  if (p.price_on_request || p.total_price_sar == null) return lang === "ar" ? "السعر عند الطلب" : "Price on request";
  const m = money(p.total_price_sar, lang);
  return p.listing_type === "lease" ? (lang === "ar" ? `${m} بالسنة` : `${m} a year`) : m;
}

export function sqmPrice(p: Parcel, lang: Lang) {
  if (p.price_per_sqm_sar == null) return "";
  const v = num(p.price_per_sqm_sar, lang);
  if (p.listing_type === "lease") return lang === "ar" ? `${v} ريال للمتر بالسنة` : `SAR ${v}/m² a year`;
  return lang === "ar" ? `${v} ريال للمتر` : `SAR ${v}/m²`;
}

export const sqm = (n: number, lang: Lang) => (lang === "ar" ? `${num(n, lang)} م²` : `${num(n, lang)} m²`);
export const street = (w: number, lang: Lang) => (lang === "ar" ? `شارع ${w} م` : `${w} m street`);

export const AREA_LABEL: Record<Area, T> = {
  North: { ar: "شمال الرياض", en: "North Riyadh" },
  East: { ar: "شرق الرياض", en: "East Riyadh" },
  Central: { ar: "وسط الرياض", en: "Central Riyadh" },
  West: { ar: "غرب الرياض", en: "West Riyadh" },
  South: { ar: "جنوب الرياض", en: "South Riyadh" },
};
export const AREA_SHORT: Record<Area, T> = {
  North: { ar: "الشمال", en: "North" }, East: { ar: "الشرق", en: "East" }, Central: { ar: "الوسط", en: "Central" },
  West: { ar: "الغرب", en: "West" }, South: { ar: "الجنوب", en: "South" },
};

export const DEAL_LABEL: Record<Deal, T> = {
  sale: { ar: "للبيع", en: "For sale" },
  lease: { ar: "للإيجار", en: "For lease" },
};

export const TYPE_LABEL: Record<LandType, T> = {
  residential: { ar: "سكني", en: "Residential" },
  commercial: { ar: "تجاري", en: "Commercial" },
};

export const STATUS_LABEL: Record<Status, T> = {
  available: { ar: "متاحة", en: "Available" },
  reserved: { ar: "محجوزة", en: "Reserved" },
  sold: { ar: "انباعت", en: "Sold" },
  leased: { ar: "تأجّرت", en: "Leased" },
};

export const FRONTAGE_LABEL = {
  main_road: { ar: "على شارع رئيسي", en: "On a main road" },
  collector: { ar: "على شارع متوسط", en: "On a mid-size street" },
  internal: { ar: "على شارع داخلي هادي", en: "On a quiet inner street" },
};

export function district(p: Parcel, lang: Lang) {
  return lang === "ar" ? `حي ${p.district_ar}` : p.district_en;
}

/** One line that says why this parcel stands out. Facts from the data only. */
export function hook(p: Parcel): T {
  if (p.price_on_request) return { ar: "سعرها عند الطلب، كلّمنا", en: "Price on request, just ask" };
  const v = p.pricing.vs_area_pct;
  if (v != null && v <= -15)
    return { ar: `أرخص من متوسط ${AREA_SHORT[p.area_of_city].ar} بـ ${Math.abs(v)}%`, en: `${Math.abs(v)}% below the ${AREA_SHORT[p.area_of_city].en} average` };
  if (p.street_width_m >= 36) return { ar: `واجهتها على شارع ${p.street_width_m} م`, en: `Fronts a ${p.street_width_m} m road` };
  if (p.area_sqm >= 5000) return { ar: `مساحة كبيرة: ${p.area_sqm.toLocaleString("en-US")} م²`, en: `Big plot: ${p.area_sqm.toLocaleString("en-US")} m²` };
  if (p.segment_demand >= 4 && p.status === "available")
    return { ar: `عليها طلب: ${p.segment_demand} مستثمرين يدورون مثلها`, en: `In demand: ${p.segment_demand} investors want land like this` };
  const anchors = portfolio.anchors;
  const k = (Object.keys(p.distances_km) as (keyof typeof p.distances_km)[]).sort((a, b) => p.distances_km[a] - p.distances_km[b])[0];
  if (p.distances_km[k] <= 8) return { ar: `${p.distances_km[k]} كم بس عن ${anchors[k].ar}`, en: `Only ${p.distances_km[k]} km from ${anchors[k].en}` };
  if (v != null && v <= -5)
    return { ar: `سعرها أقل من متوسط منطقتها`, en: `Priced under its area average` };
  return { ar: `${p.area_sqm.toLocaleString("en-US")} م² على شارع ${p.street_width_m} م`, en: `${p.area_sqm.toLocaleString("en-US")} m² on a ${p.street_width_m} m street` };
}
