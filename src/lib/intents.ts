import type { Deal, LandType } from "./portfolio";

export type IntentKey =
  | "family_home" | "villas_sell" | "apartments_rent" | "compound"
  | "warehouse" | "showroom" | "office" | "retail" | "invest";

export type Intent = { key: IntentKey; ar: string; en: string; type: LandType | null; defaultDeal: Deal };

// Intents mirror what real Sarj investors asked for in the inquiry log.
export const INTENTS: Intent[] = [
  { key: "family_home", ar: "بيت للعائلة", en: "A family home", type: "residential", defaultDeal: "sale" },
  { key: "villas_sell", ar: "فلل للبيع", en: "Villas to sell", type: "residential", defaultDeal: "sale" },
  { key: "apartments_rent", ar: "عمارة شقق للتأجير", en: "Apartments to rent out", type: "residential", defaultDeal: "sale" },
  { key: "compound", ar: "مجمع سكني", en: "A residential compound", type: "residential", defaultDeal: "sale" },
  { key: "showroom", ar: "معرض أو صالة عرض", en: "A showroom", type: "commercial", defaultDeal: "lease" },
  { key: "warehouse", ar: "مستودع", en: "A warehouse", type: "commercial", defaultDeal: "lease" },
  { key: "office", ar: "مبنى مكاتب", en: "An office building", type: "commercial", defaultDeal: "sale" },
  { key: "retail", ar: "محل تجاري", en: "A retail store", type: "commercial", defaultDeal: "lease" },
  { key: "invest", ar: "أستثمر في الأرض نفسها", en: "Invest in the land itself", type: null, defaultDeal: "sale" },
];

export const intentByKey = (k: string | null | undefined) => INTENTS.find((i) => i.key === k);

// Budget ceilings. Sale = total price, lease = annual rent. null = no limit.
export const BUDGETS: Record<Deal, { max: number | null; ar: string; en: string }[]> = {
  sale: [
    { max: 1_500_000, ar: "حتى 1.5 مليون", en: "Up to 1.5M" },
    { max: 3_000_000, ar: "حتى 3 ملايين", en: "Up to 3M" },
    { max: 5_000_000, ar: "حتى 5 ملايين", en: "Up to 5M" },
    { max: 10_000_000, ar: "حتى 10 ملايين", en: "Up to 10M" },
    { max: 25_000_000, ar: "حتى 25 مليون", en: "Up to 25M" },
    { max: null, ar: "بلا حد", en: "No limit" },
  ],
  lease: [
    { max: 100_000, ar: "حتى 100 ألف سنوياً", en: "Up to 100K / yr" },
    { max: 300_000, ar: "حتى 300 ألف سنوياً", en: "Up to 300K / yr" },
    { max: 1_000_000, ar: "حتى مليون سنوياً", en: "Up to 1M / yr" },
    { max: 2_000_000, ar: "حتى 2 مليون سنوياً", en: "Up to 2M / yr" },
    { max: null, ar: "بلا حد", en: "No limit" },
  ],
};
