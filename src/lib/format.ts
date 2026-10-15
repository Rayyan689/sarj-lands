import type { Area, Deal, LandType, Parcel, Status } from "./portfolio";
import type { Lang } from "./i18n";

// Latin digits, as most Saudi property sites use, with Arabic words around them.
const nf = (lang: Lang, max = 0) =>
  new Intl.NumberFormat(lang === "ar" ? "ar-SA-u-nu-latn" : "en-US", { maximumFractionDigits: max });

export const num = (n: number, lang: Lang, max = 0) => nf(lang, max).format(n);

/** 3,284,000 -> "3.28 مليون ريال" / "SAR 3.28M" */
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
  return p.listing_type === "lease" ? (lang === "ar" ? `${m} سنوياً` : `${m} / year`) : m;
}

export function sqmPrice(p: Parcel, lang: Lang) {
  if (p.price_per_sqm_sar == null) return "";
  const v = num(p.price_per_sqm_sar, lang);
  if (p.listing_type === "lease") return lang === "ar" ? `${v} ريال/م² سنوياً` : `SAR ${v}/m² per year`;
  return lang === "ar" ? `${v} ريال/م²` : `SAR ${v}/m²`;
}

export const sqm = (n: number, lang: Lang) => (lang === "ar" ? `${num(n, lang)} م²` : `${num(n, lang)} m²`);

export const AREA_LABEL: Record<Area, { ar: string; en: string }> = {
  North: { ar: "شمال الرياض", en: "North Riyadh" },
  East: { ar: "شرق الرياض", en: "East Riyadh" },
  Central: { ar: "وسط الرياض", en: "Central Riyadh" },
  West: { ar: "غرب الرياض", en: "West Riyadh" },
  South: { ar: "جنوب الرياض", en: "South Riyadh" },
};

export const DEAL_LABEL: Record<Deal, { ar: string; en: string }> = {
  sale: { ar: "للبيع", en: "For sale" },
  lease: { ar: "للإيجار", en: "For lease" },
};

export const TYPE_LABEL: Record<LandType, { ar: string; en: string }> = {
  residential: { ar: "سكني", en: "Residential" },
  commercial: { ar: "تجاري", en: "Commercial" },
};

export const STATUS_LABEL: Record<Status, { ar: string; en: string }> = {
  available: { ar: "متاحة", en: "Available" },
  reserved: { ar: "محجوزة", en: "Reserved" },
  sold: { ar: "مباعة", en: "Sold" },
  leased: { ar: "مؤجرة", en: "Leased" },
};

export const FRONTAGE_LABEL = {
  main_road: { ar: "على شارع رئيسي", en: "On a main road" },
  collector: { ar: "على شارع تجميعي", en: "On a collector street" },
  internal: { ar: "على شارع داخلي هادئ", en: "On a quiet internal street" },
};

export function district(p: Parcel, lang: Lang) {
  return lang === "ar" ? `حي ${p.district_ar}` : p.district_en;
}
