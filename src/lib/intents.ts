import type { Deal, LandType } from "./portfolio";

export type IntentKey =
  | "family_home" | "villas_sell" | "apartments_rent" | "compound"
  | "warehouse" | "showroom" | "office" | "retail" | "invest";

export type Intent = { key: IntentKey; icon: string; ar: string; en: string; type: LandType | null; defaultDeal: Deal };

// Intents mirror what real Sarj investors asked for in the inquiry log.
export const INTENTS: Intent[] = [
  { key: "family_home", icon: "🏡", ar: "بيت للعايلة", en: "A family home", type: "residential", defaultDeal: "sale" },
  { key: "villas_sell", icon: "🏘️", ar: "فلل أبيعها", en: "Villas to sell", type: "residential", defaultDeal: "sale" },
  { key: "apartments_rent", icon: "🏢", ar: "عمارة شقق للإيجار", en: "Apartments to rent out", type: "residential", defaultDeal: "sale" },
  { key: "compound", icon: "🌴", ar: "مجمع سكني", en: "A residential compound", type: "residential", defaultDeal: "sale" },
  { key: "showroom", icon: "🚘", ar: "معرض", en: "A showroom", type: "commercial", defaultDeal: "lease" },
  { key: "warehouse", icon: "📦", ar: "مستودع", en: "A warehouse", type: "commercial", defaultDeal: "lease" },
  { key: "office", icon: "💼", ar: "مبنى مكاتب", en: "An office building", type: "commercial", defaultDeal: "sale" },
  { key: "retail", icon: "🛍️", ar: "محل تجاري", en: "A shop", type: "commercial", defaultDeal: "lease" },
  { key: "invest", icon: "📈", ar: "أستثمر في الأرض نفسها", en: "Just invest in the plot", type: null, defaultDeal: "sale" },
];

export const intentByKey = (k: string | null | undefined) => INTENTS.find((i) => i.key === k);

// Budget ceilings. Sale = total price, lease = annual rent. null = no limit.
export const BUDGETS: Record<Deal, { max: number | null; ar: string; en: string }[]> = {
  sale: [
    { max: 1_500_000, ar: "لين 1.5 مليون", en: "Up to 1.5M" },
    { max: 3_000_000, ar: "لين 3 ملايين", en: "Up to 3M" },
    { max: 5_000_000, ar: "لين 5 ملايين", en: "Up to 5M" },
    { max: 10_000_000, ar: "لين 10 ملايين", en: "Up to 10M" },
    { max: 25_000_000, ar: "لين 25 مليون", en: "Up to 25M" },
    { max: null, ar: "مو مشكلة الميزانية", en: "Budget isn't the issue" },
  ],
  lease: [
    { max: 100_000, ar: "لين 100 ألف بالسنة", en: "Up to 100K a year" },
    { max: 300_000, ar: "لين 300 ألف بالسنة", en: "Up to 300K a year" },
    { max: 1_000_000, ar: "لين مليون بالسنة", en: "Up to 1M a year" },
    { max: 2_000_000, ar: "لين 2 مليون بالسنة", en: "Up to 2M a year" },
    { max: null, ar: "مو مشكلة الميزانية", en: "Budget isn't the issue" },
  ],
};
