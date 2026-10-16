// Server-only analytics for the admin view. Everything time-based is computed from today's date in Riyadh.
import "server-only";
import privateData from "../../../data/private-inquiries.json";
import { available, parcels, portfolio, AREAS, type Area, type Deal, type LandType, type Parcel } from "../portfolio";
import { runMatch } from "../match";
import type { IntentKey } from "../intents";
import { AREA_LABEL, money } from "../format";
import { daysSince, riyadhToday } from "../time";

export type Inquiry = {
  inquiry_id: string; date: string; investor_name: string; phone: string; wants_to: string;
  land_type_wanted: LandType; area_of_city_wanted: Area; prefers: Deal; budget_sar: number; budget_basis: string;
  intent: "ready to move" | "comparing options" | "exploring"; channel: string; status: "new" | "contacted" | "negotiating";
};
export const inquiries = (privateData as { inquiries: Inquiry[] }).inquiries;

const USE: Record<string, IntentKey> = {
  "open a warehouse": "warehouse", "build a residential compound": "compound", "open a car showroom": "showroom",
  "build a family home": "family_home", "build apartments to rent": "apartments_rent", "open an office building": "office",
  "open a retail store": "retail", "open a showroom": "showroom", "build villas to sell": "villas_sell",
};
export const WANTS_AR: Record<string, string> = {
  "open a warehouse": "مستودع", "build a residential compound": "مجمع سكني", "open a car showroom": "معرض سيارات",
  "build a family home": "بيت للعايلة", "build apartments to rent": "عمارة شقق للإيجار", "open an office building": "مبنى مكاتب",
  "open a retail store": "محل تجاري", "open a showroom": "معرض", "build villas to sell": "فلل للبيع",
};
const NAME_AR: Record<string, string> = {
  Maha: "مها", Nasser: "ناصر", Majed: "ماجد", Lama: "لمى", Abdullah: "عبدالله", Bandar: "بندر", Reem: "ريم", Faisal: "فيصل",
  Fahad: "فهد", Hessa: "حصة", Sultan: "سلطان", Noura: "نورة", Mohammed: "محمد", Khalid: "خالد", Turki: "تركي", Sara: "سارة",
  Dana: "دانة", Saud: "سعود", Omar: "عمر",
};
const FAMILY_AR: Record<string, string> = {
  "Al-Subaie": "السبيعي", "Al-Shammari": "الشمري", "Al-Qahtani": "القحطاني", "Al-Mutairi": "المطيري", "Al-Harbi": "الحربي",
  "Al-Anazi": "العنزي", "Al-Rashid": "الرشيد", "Al-Ghamdi": "الغامدي", "Al-Dossari": "الدوسري", "Al-Otaibi": "العتيبي",
};
const FEMALE = new Set(["Maha", "Reem", "Hessa", "Noura", "Lama", "Sara", "Dana"]);
export const nameAr = (n: string) => { const [f, l] = n.split(" "); return `${NAME_AR[f] ?? f} ${FAMILY_AR[l] ?? l ?? ""}`.trim(); };

const INTENT_W = { "ready to move": 3, "comparing options": 2, exploring: 1 } as const;
const STALE_DAYS = 120;

/** A realistic buyer for this parcel: same segment, price within 15% over budget and not trivially small for them (>= 35% of budget). */
function affordable(q: Inquiry, p: Parcel, stretch = 1.15) {
  return p.status === "available" && p.land_type === q.land_type_wanted && p.listing_type === q.prefers &&
    p.area_of_city === q.area_of_city_wanted && p.total_price_sar != null &&
    p.total_price_sar <= q.budget_sar * stretch && p.total_price_sar >= q.budget_sar * 0.35;
}

function waText(q: Inquiry, p: Parcel | null, origin: string, exact: boolean) {
  const first = q.investor_name.split(" ")[0];
  const title = FEMALE.has(first) ? "أستاذة" : "أستاذ";
  const hi = `السلام عليكم ${title} ${NAME_AR[first] ?? first}، معك فريق سرج العقارية.`;
  if (!p) return `${hi} بخصوص طلبك لـ${WANTS_AR[q.wants_to]} في ${AREA_LABEL[q.area_of_city_wanted].ar}: سجلنا طلبك، وأول ما تنزل أرض تناسبه بنكلمك على طول. يهمك تشوف خيارات قريبة بجهة ثانية؟`;
  const price = p.listing_type === "lease" ? `${money(p.total_price_sar!, "ar")} بالسنة` : `بسعر ${money(p.total_price_sar!, "ar")}`;
  const lead = exact ? "عندنا أرض تناسبك" : "ما عندنا بالضبط اللي طلبته، بس عندنا خيار قريب";
  return `${hi} بخصوص طلبك لـ${WANTS_AR[q.wants_to]}: ${lead} في حي ${p.district_ar} (${AREA_LABEL[p.area_of_city].ar})، مساحتها ${p.area_sqm.toLocaleString("en-US")} م² على شارع ${p.street_width_m} م، ${price}. التفاصيل هنا: ${origin}/lands/${p.parcel_id}\nتحب نرتب لك زيارة؟`;
}

export function buildAnalytics(origin: string) {
  const today = riyadhToday();
  const age = (p: Parcel) => daysSince(p.listed_date, today);

  // ---------- inquiries: match, priority, outreach ----------
  const calls = inquiries.map((q) => {
    const use = USE[q.wants_to];
    const r = runMatch({ use, deal: q.prefers, area: q.area_of_city_wanted, budget: q.budget_sar });
    const best = r.fits[0] ?? r.stretch[0] ?? null;
    const alt = !best ? r.alternatives[0] ?? null : null;
    const p = best?.parcel ?? alt?.parcel ?? null;
    const exact = !!r.fits.length;
    const waiting = daysSince(q.date, today);
    const fitScore = r.fits.length ? 10 : r.stretch.length ? 5 : 0;
    const statusScore = q.status === "new" ? 8 : q.status === "negotiating" ? 6 : 0;
    const score = INTENT_W[q.intent] * 10 + fitScore + statusScore + Math.min(waiting, 90) / 9;
    const action = q.status === "new" ? { ar: "أول اتصال", en: "First call" }
      : q.status === "contacted" ? { ar: "أرسل له الخيارات", en: "Send options" } : { ar: "سكّر الصفقة", en: "Close the deal" };
    return {
      id: q.inquiry_id, name: q.investor_name, name_ar: nameAr(q.investor_name), phone: q.phone,
      wants: q.wants_to, wants_ar: WANTS_AR[q.wants_to], type: q.land_type_wanted, area: q.area_of_city_wanted, deal: q.prefers,
      budget: q.budget_sar, intent: q.intent, status: q.status, channel: q.channel, date: q.date, waiting,
      fits: r.fits.length, stretch: r.stretch.length, match: p?.parcel_id ?? null, exact, score,
      action, wa: `https://wa.me/966${q.phone.slice(1)}?text=${encodeURIComponent(waText(q, p, origin, exact))}`,
      waText: waText(q, p, origin, exact),
    };
  }).sort((a, b) => b.score - a.score || b.waiting - a.waiting);

  // ---------- hot listings: several qualified buyers ----------
  const hot = available.map((p) => {
    const buyers = inquiries.filter((q) => affordable(q, p));
    return { id: p.parcel_id, district_ar: p.district_ar, district_en: p.district_en, area: p.area_of_city, price: p.total_price_sar, deal: p.listing_type, age: age(p),
      buyers: buyers.map((q) => ({ id: q.inquiry_id, name: q.investor_name, name_ar: nameAr(q.investor_name), budget: q.budget_sar, status: q.status, intent: q.intent })) };
  }).filter((h) => h.buyers.length >= 2).sort((a, b) => b.buyers.length * (b.price ?? 0) - a.buyers.length * (a.price ?? 0)).slice(0, 8);

  // ---------- unmet demand → what to buy next ----------
  const segKey = (t: LandType, d: Deal, a: Area) => `${a}|${t}|${d}`;
  const supply = new Map<string, number>();
  for (const p of available) supply.set(segKey(p.land_type, p.listing_type, p.area_of_city), (supply.get(segKey(p.land_type, p.listing_type, p.area_of_city)) ?? 0) + 1);
  const gapMap = new Map<string, Inquiry[]>();
  for (const q of inquiries) {
    const k = segKey(q.land_type_wanted, q.prefers, q.area_of_city_wanted);
    if (!supply.get(k)) gapMap.set(k, [...(gapMap.get(k) ?? []), q]);
  }
  const buyNext = [...gapMap.entries()].map(([k, qs]) => {
    const [area, type, deal] = k.split("|") as [Area, LandType, Deal];
    const budgets = qs.map((q) => q.budget_sar).sort((a, b) => a - b);
    const uses = [...new Set(qs.map((q) => q.wants_to))];
    // size guide from closed deals in the same segment anywhere in the city
    const closedSame = parcels.filter((p) => (p.status === "sold" || p.status === "leased") && p.land_type === type && p.listing_type === deal);
    const sqmMed = closedSame.length ? closedSame.map((p) => p.price_per_sqm_sar ?? 0).sort((a, b) => a - b)[Math.floor(closedSame.length / 2)] : null;
    return { area, type, deal, count: qs.length, ready: qs.filter((q) => q.intent === "ready to move").length,
      budgetMin: budgets[0], budgetMax: budgets[budgets.length - 1], budgetSum: budgets.reduce((s, b) => s + b, 0),
      uses, uses_ar: uses.map((u) => WANTS_AR[u]), cityClosedSqm: sqmMed, ids: qs.map((q) => q.inquiry_id) };
  }).sort((a, b) => b.count - a.count || b.budgetSum - a.budgetSum);

  // ---------- demand vs supply matrix ----------
  const matrix = AREAS.flatMap((a) => (["residential", "commercial"] as LandType[]).flatMap((t) => (["sale", "lease"] as Deal[]).map((d) => ({
    area: a, type: t, deal: d,
    demand: inquiries.filter((q) => q.area_of_city_wanted === a && q.land_type_wanted === t && q.prefers === d).length,
    supply: supply.get(segKey(t, d, a)) ?? 0,
  })))).filter((r) => r.demand || r.supply);

  // ---------- vacancy cost (lease) and slow inventory ----------
  const vacancies = available.filter((p) => p.listing_type === "lease" && p.total_price_sar).map((p) => ({
    id: p.parcel_id, district_ar: p.district_ar, district_en: p.district_en, area: p.area_of_city, rent: p.total_price_sar!, days: age(p),
    perDay: p.total_price_sar! / 365, lost: (p.total_price_sar! / 365) * age(p),
    takers: inquiries.filter((q) => affordable(q, p, 1)).length,
  })).sort((a, b) => b.lost - a.lost);
  const vacancyLost = vacancies.reduce((s, v) => s + v.lost, 0);
  const vacancyPerDay = vacancies.reduce((s, v) => s + v.perDay, 0);

  const stale = available.filter((p) => age(p) >= STALE_DAYS).map((p) => {
    const seg = inquiries.filter((q) => q.land_type_wanted === p.land_type && q.prefers === p.listing_type && q.area_of_city_wanted === p.area_of_city);
    const comps = p.closed_comps.map((c) => parcels.find((x) => x.parcel_id === c)!).filter((c) => c.price_per_sqm_sar);
    const compMed = comps.length ? comps.map((c) => c.price_per_sqm_sar!).sort((a, b) => a - b)[Math.floor(comps.length / 2)] : null;
    return {
      id: p.parcel_id, district_ar: p.district_ar, district_en: p.district_en, area: p.area_of_city, type: p.land_type, deal: p.listing_type,
      price: p.total_price_sar, sqm: p.area_sqm, perSqm: p.price_per_sqm_sar, days: age(p), vsArea: p.pricing.vs_area_pct ?? null,
      compMed, budgets: seg.map((q) => q.budget_sar), affordableNow: seg.filter((q) => affordable(q, p, 1)).length,
      buyers: seg.filter((q) => affordable(q, p, 1)).map((q) => q.inquiry_id),
    };
  }).sort((a, b) => b.days - a.days);

  // ---------- channels, duplicates, pipeline ----------
  const channels = [...new Set(inquiries.map((q) => q.channel))].map((c) => {
    const qs = inquiries.filter((q) => q.channel === c);
    return { channel: c, count: qs.length, negotiating: qs.filter((q) => q.status === "negotiating").length, ready: qs.filter((q) => q.intent === "ready to move").length };
  }).sort((a, b) => b.count - a.count);
  const byName = new Map<string, Inquiry[]>();
  for (const q of inquiries) byName.set(q.investor_name, [...(byName.get(q.investor_name) ?? []), q]);
  const duplicates = [...byName.entries()].filter(([, qs]) => qs.length > 1).map(([n, qs]) => ({ name: n, name_ar: nameAr(n), ids: qs.map((q) => q.inquiry_id), phones: qs.map((q) => q.phone) }));
  const readyUncontacted = calls.filter((c) => c.intent === "ready to move" && c.status === "new");
  const pipelineSale = inquiries.filter((q) => q.intent === "ready to move" && q.prefers === "sale").reduce((s, q) => s + q.budget_sar, 0);

  // ---------- inventory snapshot ----------
  const status = { available: 0, reserved: 0, sold: 0, leased: 0 };
  for (const p of parcels) status[p.status]++;
  const availableSaleValue = available.filter((p) => p.listing_type === "sale").reduce((s, p) => s + (p.total_price_sar ?? 0), 0);
  const avgAge = Math.round(available.reduce((s, p) => s + age(p), 0) / available.length);

  // ---------- briefing headlines ----------
  const brief: { ar: string; en: string; tone: "act" | "risk" | "info"; href: string }[] = [];
  if (readyUncontacted.length) brief.push({ tone: "act", href: "/admin/investors?tab=calls",
    ar: `${readyUncontacted.length} مستثمرين جاهزين يشترون أو يستأجرون، وما أحد كلمهم للحين. أقدمهم ينتظر من ${Math.max(...readyUncontacted.map((c) => c.waiting))} يوم.`,
    en: `${readyUncontacted.length} ready-to-move investors haven't been contacted yet. The oldest has waited ${Math.max(...readyUncontacted.map((c) => c.waiting))} days.` });
  if (hot[0]) brief.push({ tone: "act", href: "/admin/properties?tab=hot",
    ar: `أرض ${hot[0].district_ar} (${hot[0].id}) عليها ${hot[0].buyers.length} مشترين قادرين عليها، ومعروضة من ${hot[0].age} يوم. فرصة لطلب أفضل عرض.`,
    en: `${hot[0].district_en} (${hot[0].id}) has ${hot[0].buyers.length} buyers who can afford it, yet it's been listed ${hot[0].age} days. Time for best-and-final offers.` });
  if (buyNext[0]) brief.push({ tone: "info", href: "/admin/market?tab=buy",
    ar: `${buyNext[0].count} مستثمرين يبون ${buyNext[0].type === "commercial" ? "تجاري" : "سكني"} ${buyNext[0].deal === "sale" ? "للبيع" : "للإيجار"} في ${AREA_LABEL[buyNext[0].area].ar}، وما عندنا ولا أرض هناك.`,
    en: `${buyNext[0].count} investors want ${buyNext[0].type} land ${buyNext[0].deal === "sale" ? "to buy" : "to lease"} in ${AREA_LABEL[buyNext[0].area].en}, and we have none there.` });
  brief.push({ tone: "risk", href: "/admin/properties?tab=vacancy",
    ar: `أراضي الإيجار الفاضية فوّتت تقريباً ${money(vacancyLost, "ar")} إيجار من يوم نزلت، وتزيد ${money(vacancyPerDay, "ar")} كل يوم.`,
    en: `Vacant lease properties have missed about ${money(vacancyLost, "en")} in rent since listing, growing ${money(vacancyPerDay, "en")} a day.` });
  const staleWithBuyers = stale.filter((s) => s.affordableNow > 0);
  if (staleWithBuyers.length) brief.push({ tone: "act", href: "/admin/properties?tab=slow",
    ar: `${staleWithBuyers.length} أرض معروضة من أكثر من ${STALE_DAYS} يوم وعندنا مستثمرين ميزانيتهم تكفيها الحين. المشكلة مو السعر، محد عرضها عليهم.`,
    en: `${staleWithBuyers.length} properties listed over ${STALE_DAYS} days already fit the budgets of investors in our pipeline. The problem isn't price; nobody showed them.` });

  return {
    today, origin, snapshot: portfolio.snapshot_date, corrections: portfolio.corrections,
    kpis: { ...status, total: parcels.length, availableSaleValue, avgAge, inquiries: inquiries.length, readyUncontacted: readyUncontacted.length, pipelineSale,
      vacancyLost, vacancyPerDay, newInquiries: inquiries.filter((q) => q.status === "new").length },
    brief, calls, hot, buyNext, matrix, vacancies, stale, channels, duplicates,
  };
}

export type Analytics = ReturnType<typeof buildAnalytics>;
