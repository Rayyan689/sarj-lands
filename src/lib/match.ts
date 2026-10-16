import { available, type Area, type Deal, type Parcel } from "./portfolio";
import { intentByKey, type IntentKey } from "./intents";
import { AREA_LABEL, money } from "./format";

export type Criteria = { use: IntentKey; deal: Deal; area: Area | "any"; budget: number | null };
export type T = { ar: string; en: string };
export type Match = { parcel: Parcel; score: number; reasons: T[]; note?: T };
export type MatchResult = { fits: Match[]; stretch: Match[]; alternatives: Match[]; considered: number };

const pct = (n: number) => Math.abs(Math.round(n));
const priceTxt = (p: Parcel): T => p.listing_type === "lease"
  ? { ar: `${money(p.total_price_sar!, "ar")} بالسنة`, en: `${money(p.total_price_sar!, "en")} a year` }
  : { ar: money(p.total_price_sar!, "ar"), en: money(p.total_price_sar!, "en") };

/** Plain facts about why a parcel suits the stated use. Only uses fields from the data. */
function reasonsFor(p: Parcel, use: IntentKey): { score: number; reasons: T[] } {
  let s = 0;
  const r: T[] = [];
  const w = p.street_width_m, a = p.area_sqm;
  const street: T = { ar: `على شارع ${w} م`, en: `On a ${w} m street` };
  const size: T = { ar: `مساحتها ${a.toLocaleString("en-US")} م²`, en: `${a.toLocaleString("en-US")} m² plot` };

  switch (use) {
    case "warehouse":
      if (a >= 5000) { s += 20; r.push({ ar: `مساحتها ${a.toLocaleString("en-US")} م²، تكفي مستودع كبير`, en: `${a.toLocaleString("en-US")} m², room for a big warehouse` }); }
      else if (a >= 2000) { s += 10; r.push(size); }
      if (w >= 20) { s += 6; r.push({ ar: `شارعها ${w} م، الشاحنات تدخل وتطلع براحتها`, en: `${w} m street, easy in and out for trucks` }); }
      break;
    case "showroom":
      if (w >= 36) { s += 20; r.push({ ar: `واجهتها على شارع ${w} م، يعني معرضك بيشوفه كل اللي يمر`, en: `Fronts a ${w} m road, so everyone driving by sees your showroom` }); }
      else if (w >= 30) { s += 12; r.push(street); }
      if (a >= 1500) { s += 5; r.push(size); }
      break;
    case "office":
      if (w >= 30) { s += 15; r.push({ ar: `شارع ${w} م يعطي المبنى حضور وهيبة`, en: `A ${w} m street gives the building real presence` }); }
      if (a >= 1000) { s += 5; r.push(size); }
      break;
    case "retail":
      if (w >= 20) { s += 12; r.push({ ar: `شارع ${w} م فيه حركة وزباين`, en: `A ${w} m street with steady passing trade` }); }
      break;
    case "family_home":
      if (a >= 300 && a <= 900) { s += 15; r.push({ ar: `${a.toLocaleString("en-US")} م²، مساحة مريحة لبيت العايلة`, en: `${a.toLocaleString("en-US")} m², a comfy size for a family home` }); }
      if (p.frontage === "internal") { s += 5; r.push({ ar: `على شارع داخلي ${w} م، هادي وبعيد عن الزحمة`, en: `On a quiet ${w} m inner street, away from traffic` }); }
      break;
    case "villas_sell":
      if (a >= 700) { s += 15; r.push({ ar: `${a.toLocaleString("en-US")} م² تكفي أكثر من فيلا`, en: `${a.toLocaleString("en-US")} m², room for more than one villa` }); }
      break;
    case "apartments_rent":
      if (w >= 20) { s += 12; r.push(street); }
      if (a >= 500) { s += 8; r.push(size); }
      break;
    case "compound":
      if (a >= 1500) { s += 20; r.push({ ar: `${a.toLocaleString("en-US")} م² تكفي مجمع`, en: `${a.toLocaleString("en-US")} m², enough for a compound` }); }
      else if (a >= 900) { s += 10; r.push(size); }
      break;
    case "invest":
      if (p.segment_demand >= 3) { s += 10; r.push({ ar: `${p.segment_demand} مستثمرين يدورون أراضي مثلها بنفس المنطقة`, en: `${p.segment_demand} investors are hunting for land like this here` }); }
      break;
  }

  const v = p.pricing.vs_area_pct;
  if (v != null && v <= -10) {
    s += 10;
    r.push({ ar: `سعر المتر أرخص بـ ${pct(v)}% من متوسط ${AREA_LABEL[p.area_of_city].ar}`, en: `${pct(v)}% cheaper per m² than the ${AREA_LABEL[p.area_of_city].en} average` });
  } else if (v != null && v >= 30) s -= 5;

  if (r.length === 0) r.push(size, street);
  return { score: s, reasons: r.slice(0, 3) };
}

export function runMatch(c: Criteria): MatchResult {
  const intent = intentByKey(c.use);
  const typeOk = (p: Parcel) => !intent?.type || p.land_type === intent.type;
  const pool = available.filter((p) => typeOk(p) && p.listing_type === c.deal);
  const areaOk = (p: Parcel) => c.area === "any" || p.area_of_city === c.area;
  const budget = c.budget ?? Infinity;

  const fits: Match[] = [], stretch: Match[] = [];
  for (const p of pool.filter(areaOk)) {
    const { score, reasons } = reasonsFor(p, c.use);
    const price = p.total_price_sar;
    if (price == null) {
      stretch.push({ parcel: p, score, reasons, note: { ar: "سعرها عند الطلب، كلّمنا ونعطيك إياه", en: "Price on request, message us and we'll tell you" } });
    } else if (price <= budget) {
      fits.push({ parcel: p, score: score + 30, reasons });
    } else if (price <= budget * 1.15) {
      const over = pct((price / budget - 1) * 100);
      stretch.push({ parcel: p, score, reasons, note: { ar: `فوق ميزانيتك بـ ${over}% بس، تستاهل تسأل عنها`, en: `Only ${over}% over your budget, worth asking about` } });
    }
  }
  fits.sort((a, b) => b.score - a.score);
  stretch.sort((a, b) => b.score - a.score);

  // Honest alternatives when the exact ask has few answers.
  const alternatives: Match[] = [];
  if (fits.length < 3) {
    const seen = new Set([...fits, ...stretch].map((m) => m.parcel.parcel_id));
    const add = (p: Parcel, note: T) => {
      if (seen.has(p.parcel_id)) return;
      seen.add(p.parcel_id);
      const { score, reasons } = reasonsFor(p, c.use);
      alternatives.push({ parcel: p, score, reasons, note });
    };
    // 1) Same use, deal and budget, other areas.
    if (c.area !== "any") {
      pool.filter((p) => !areaOk(p) && (p.total_price_sar ?? Infinity) <= budget)
        .map((p) => ({ p, s: reasonsFor(p, c.use).score }))
        .sort((a, b) => b.s - a.s).slice(0, 3)
        .forEach(({ p }) => add(p, {
          ar: `في ${AREA_LABEL[p.area_of_city].ar} بدال ${AREA_LABEL[c.area as Area].ar}`,
          en: `In ${AREA_LABEL[p.area_of_city].en} instead of ${AREA_LABEL[c.area as Area].en}`,
        }));
    }
    // 2) Same use and area, the other deal type.
    const other: Deal = c.deal === "sale" ? "lease" : "sale";
    available.filter((p) => typeOk(p) && areaOk(p) && p.listing_type === other && p.total_price_sar != null)
      .sort((a, b) => a.total_price_sar! - b.total_price_sar!)
      .slice(0, 2)
      .forEach((p) => add(p, other === "lease"
        ? { ar: "متاحة للإيجار بدال الشراء", en: "You can lease this one instead of buying" }
        : { ar: "متاحة للشراء بدال الإيجار", en: "You can buy this one instead of leasing" }));
    // 3) Same everything, closest over budget.
    if (c.budget != null) {
      pool.filter((p) => areaOk(p) && (p.total_price_sar ?? 0) > budget * 1.15)
        .sort((a, b) => (a.total_price_sar ?? 0) - (b.total_price_sar ?? 0)).slice(0, 1)
        .forEach((p) => add(p, {
          ar: `أقرب شي لطلبك، بـ ${money(p.total_price_sar!, "ar")}`,
          en: `Closest to your ask, at ${money(p.total_price_sar!, "en")}`,
        }));
    }
  }

  // Never leave the visitor with an empty page: show the cheapest real options of the same type anywhere.
  if (!fits.length && !stretch.length && !alternatives.length) {
    const near = (pool.length ? pool : available.filter(typeOk))
      .filter((p) => p.total_price_sar != null)
      .sort((a, b) => a.total_price_sar! - b.total_price_sar!).slice(0, 3);
    for (const p of near) {
      const { score, reasons } = reasonsFor(p, c.use);
      const price = priceTxt(p);
      alternatives.push({ parcel: p, score, reasons, note: {
        ar: `أقرب شي لطلبك: في ${AREA_LABEL[p.area_of_city].ar}، بـ ${price.ar}`,
        en: `Closest to your ask: in ${AREA_LABEL[p.area_of_city].en}, at ${price.en}`,
      } });
    }
  }

  return { fits, stretch: stretch.slice(0, 4), alternatives: alternatives.slice(0, 5), considered: pool.length };
}

export function criteriaFromParams(sp: URLSearchParams): Criteria | null {
  const use = sp.get("use") as IntentKey | null;
  if (!use || !intentByKey(use)) return null;
  const deal = (sp.get("deal") === "lease" ? "lease" : "sale") as Deal;
  const area = (sp.get("area") || "any") as Area | "any";
  const b = sp.get("budget");
  return { use, deal, area, budget: b ? Number(b) : null };
}
