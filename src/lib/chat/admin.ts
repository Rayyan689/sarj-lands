// Leadership-mode assistant. Sees the private inquiry pipeline, the live analytics and the website's activity.
import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { buildAnalytics, inquiries, nameAr, WANTS_AR } from "../admin/analytics";
import { loadLive } from "../admin/live";
import { tools as investorTools, runTool as investorTool, type ToolEffects } from "./investor";
import { parcels } from "../portfolio";
import { riyadhToday, daysSince } from "../time";

function parcelTable() {
  return parcels.map((p) => [p.parcel_id, `${p.district_ar}/${p.district_en}`, p.area_of_city, p.land_type, p.listing_type, p.status,
    `${p.area_sqm}m²`, p.total_price_sar ?? "on request", `listed ${p.listed_date}`].join(" | ")).join("\n");
}

function inquiryTable(today: string) {
  return inquiries.map((q) => [q.inquiry_id, `${q.investor_name} (${nameAr(q.investor_name)})`, q.phone, q.wants_to, `(${WANTS_AR[q.wants_to]})`,
    q.land_type_wanted, q.area_of_city_wanted, q.prefers, `budget ${q.budget_sar} (${q.budget_basis})`, q.intent, q.channel, q.status,
    `inquired ${q.date}, waiting ${daysSince(q.date, today)} days`].join(" | ")).join("\n");
}

export function adminSystem(origin: string): Anthropic.TextBlockParam[] {
  const today = riyadhToday();
  const a = buildAnalytics(origin);
  const summary = {
    kpis: a.kpis, briefing: a.brief.map((b) => b.en),
    top_calls: a.calls.slice(0, 12).map((c) => ({ id: c.id, name: c.name, intent: c.intent, status: c.status, waiting_days: c.waiting, best_match: c.match, exact_fit: c.exact, fits: c.fits })),
    competing_buyers: a.hot.map((h) => ({ parcel: h.id, district: h.district_en, price: h.price, listed_days: h.age, buyers: h.buyers.map((b) => `${b.id} ${b.name} budget ${b.budget} ${b.status}`) })),
    acquire_next: a.buyNext, vacancy: a.vacancies.slice(0, 8).map((v) => ({ parcel: v.id, district: v.district_en, days_vacant: v.days, rent_missed_sar: Math.round(v.lost), investors_who_could_lease: v.takers })),
    slow_listings: a.stale.slice(0, 15).map((s) => ({ parcel: s.id, district: s.district_en, days: s.days, price: s.price, vs_area_pct: s.vsArea, closed_comps_median_sqm: s.compMed, investors_who_can_afford_now: s.buyers })),
    channels: a.channels, possible_duplicates: a.duplicates.map((d) => ({ name: d.name, ids: d.ids })),
  };
  const fixed = `You are the internal assistant for Sarj Real Estate's leadership, inside the admin dashboard. You help them understand their business and decide what to do next.

How you talk
- Reply in the language of the user's latest message. Arabic: clear Saudi business Arabic, lightly Najdi, warm but direct. English: plain and concise.
- Lead with the answer, then the 2 to 4 facts behind it, then one clear next step. Keep it under about 150 words unless asked for detail. Short bullets are fine. No em dash character. Western digits.
- Most answers are already in the LIVE ANALYTICS and tables below. Use them first; call a tool only if you truly need more (at most 2 calls).

Facts
- Use only the data below and tool results. Never invent investors, numbers or events. If something isn't in the data, say so.
- Sale prices are asking prices; lease prices are annual rent; budgets follow their stated basis.
- "Days" are counted up to today (${today}). Days on market is listing age, not time to sell. For closed deals we only know they closed after listing; don't claim sale prices beyond the listing price.
- Investor names and phone numbers are internal; you may share them here because the users are Sarj staff.
- Vacancy "rent missed" is an estimate: asking annual rent / 365 x days vacant.

Tools: search_parcels and get_parcel for inventory detail, get_website_activity for live leads, alerts and visitor numbers from the new website.

INQUIRIES (all 48, private)
${inquiryTable(today)}

PARCELS (all 120)
${parcelTable()}`;
  return [
    { type: "text", text: fixed, cache_control: { type: "ephemeral" } },
    { type: "text", text: `LIVE ANALYTICS as of today (${today}):\n${JSON.stringify(summary)}` },
  ];
}

export const adminTools: Anthropic.Tool[] = [
  ...investorTools.filter((t) => t.name === "search_parcels" || t.name === "get_parcel"),
  {
    name: "get_website_activity",
    description: "Live activity from the new website over the last 30 days: visitor funnel, most viewed properties, leads and alerts (not archived), recent advisor questions.",
    input_schema: { type: "object", properties: {} },
  },
];

export async function runAdminTool(name: string, input: Record<string, unknown>, fx: ToolEffects) {
  if (name === "get_website_activity") {
    const live = await loadLive();
    if (!live.ok) return { error: "Database unavailable right now." };
    return {
      funnel_sessions: Object.fromEntries(live.funnel.map((f) => [f.name, f.sessions])),
      most_viewed: live.topViewed,
      leads: live.leads.filter((l) => !l.archived).map((l) => ({ at: l.created_at, name: l.name, phone: l.phone, parcel: l.parcel_id, kind: l.kind, via: l.source, note: l.message })),
      alerts: live.alerts.filter((l) => !l.archived).map((l) => ({ at: l.created_at, name: l.name, phone: l.phone, criteria: l.criteria })),
      recent_questions: live.questions.map((q) => q.user_msg),
    };
  }
  return investorTool(name, input, fx);
}
