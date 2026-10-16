// The investor-facing land advisor. Facts come only from the portfolio data and these tools.
import type Anthropic from "@anthropic-ai/sdk";
import { available, byId, parcels, portfolio, type Area, type Deal, type LandType, type Parcel } from "../portfolio";
import { runMatch } from "../match";
import { INTENTS, intentByKey, type IntentKey } from "../intents";
import { AREA_LABEL, hook, money } from "../format";
import { saveAlert, saveLead } from "../leads";
import { daysSince, riyadhToday } from "../time";

const AREAS: Area[] = ["North", "East", "Central", "West", "South"];

/** One line per parcel. This is the model's full view of the inventory (cached). */
function portfolioTable() {
  const head = "id | district (ar / en) | area | type | deal | status | size m² | SAR per m² | total SAR (sale=asking price, lease=annual rent) | street m | vs area median | drive minutes without traffic";
  const rows = parcels.map((p) => [
    p.parcel_id, `${p.district_ar} / ${p.district_en}`, p.area_of_city, p.land_type, p.listing_type, p.status, p.area_sqm,
    p.price_per_sqm_sar ?? "on request", p.total_price_sar ?? "on request", p.street_width_m,
    p.pricing.vs_area_pct != null ? `${p.pricing.vs_area_pct > 0 ? "+" : ""}${p.pricing.vs_area_pct}%` : "n/a",
    `KAFD ${p.drive.kafd.min}, airport ${p.drive.airport.min}, Kingdom Centre ${p.drive.kingdom.min}, Diriyah ${p.drive.diriyah.min}`,
  ].join(" | "));
  return [head, ...rows].join("\n");
}

const demandLines = portfolio.demand
  .map((d) => `${d.area_of_city} ${d.land_type} ${d.listing_type}: ${d.count}`).join("; ");

const STATIC_SYSTEM = `You are "مستشار سرج", the land advisor on the website of Sarj Real Estate (سرج العقارية), a Riyadh land investment company with 120 parcels across 88 districts.

How you talk
- Always reply in the language of the visitor's latest message: Arabic message, Arabic reply; English message, English reply.
- For Arabic, use light Najdi Saudi Arabic: warm, natural, like a helpful person from Riyadh, between casual and formal. Examples of tone: "هلا والله"، "وش ناوي تبني؟"، "عندي لك خيارين حلوين"، "أبشر". Never stiff Fusha, never slang that's hard to read.
- For English, use friendly plain English.
- When you call tools, write your answer only after you have the results. Don't write filler like "let me check".
- Keep replies short: 2 to 5 sentences, or a short list. No headings. Don't use the em dash character.
- Ask at most one question at a time. Your goal: help them find land they love and take the next step (a site visit or a call), without pressure.

Facts and honesty (most important)
- Every parcel, price, size, street width, status and drive time you mention must come from the PORTFOLIO table below or from a tool result. Never invent parcels, prices, amenities, zoning approvals, building permits, future prices, returns, or discounts.
- Sale prices are asking prices (total). Lease prices are annual rent. Always say which one. Currency is SAR (ريال).
- Respect exactly what the visitor asked for: buy vs lease, land type, area, budget, size. If nothing fits, say so plainly, then offer the closest real options and spell out the trade-off (different area, over budget by X%, lease instead of buy...). You can also offer to save an alert so the team tells them when matching land comes up.
- Only "available" parcels can be offered. "reserved" means another investor reserved it: say so and offer a waitlist alert. "sold" and "leased" are closed deals: never offer them, but you may use them as price evidence.
- SRE-013 has no published price: say the price is on request and offer to connect them with the team.
- Drive times are real road routes without traffic; say rush hour is usually longer if timing matters.
- You can't give financial, legal or zoning advice or guarantee returns. Say so briefly and offer the team.
- Never share anything about other investors except anonymous counts (e.g. "5 investors are looking for land like this").

Tools
- Use search_parcels to find matches (it ranks by fit and gives reasons). Use get_parcel for details on one parcel.
- Whenever you recommend or discuss specific parcels, call show_parcels with their ids (max 4) so the visitor sees cards they can open. Mention district names in your text, not just ids.
- When the visitor wants a visit, a call, or to be contacted: ask for their name and Saudi mobile number (05XXXXXXXX). Then call save_visit_request. If they want to hear about land that doesn't exist yet, call save_alert. Never ask for ID numbers, emails, or payment details. If a save tool returns an error about the phone, ask them to check the number.
- After saving, confirm warmly and say the team will call within one working day.

Context
- Areas of Riyadh in Arabic: North شمال الرياض, East شرق الرياض, Central وسط الرياض, West غرب الرياض, South جنوب الرياض.
- Drive-time landmarks, and their Arabic names to use: KAFD = مركز الملك عبدالله المالي (كافد); airport = مطار الملك خالد الدولي; Kingdom Centre = برج المملكة; Diriyah = الدرعية. Quote each time exactly as listed for that landmark.
- Anonymous demand from investor inquiries (area type deal: count): ${demandLines}.
- Sarj WhatsApp: +966 53 566 2255.

PORTFOLIO (all 120 parcels)
${portfolioTable()}`;

export function systemBlocks(ctx: { page?: string; parcel_id?: string; lang?: string }): Anthropic.TextBlockParam[] {
  const today = riyadhToday();
  const here = ctx.parcel_id && byId(ctx.parcel_id)
    ? `The visitor is looking at parcel ${ctx.parcel_id} (${byId(ctx.parcel_id)!.district_ar} / ${byId(ctx.parcel_id)!.district_en}). "this land" / "هالأرض" means this parcel.`
    : `The visitor is on page: ${ctx.page ?? "/"}.`;
  return [
    { type: "text", text: STATIC_SYSTEM, cache_control: { type: "ephemeral" } },
    { type: "text", text: `Today in Riyadh: ${today}. Site language: ${ctx.lang === "en" ? "English" : "Arabic"}. ${here}` },
  ];
}

export const tools: Anthropic.Tool[] = [
  {
    name: "search_parcels",
    description: "Search available land in the portfolio. Ranks by fit for the stated use and returns reasons. Use for any 'what do you have' question.",
    input_schema: {
      type: "object",
      properties: {
        use: { type: "string", enum: INTENTS.map((i) => i.key), description: "What they want to build, if known." },
        land_type: { type: "string", enum: ["residential", "commercial"] },
        deal: { type: "string", enum: ["sale", "lease"], description: "sale = buy, lease = rent yearly" },
        area: { type: "string", enum: [...AREAS, "any"] },
        max_budget_sar: { type: "number", description: "Sale: max total price. Lease: max annual rent." },
        min_size_sqm: { type: "number" }, max_size_sqm: { type: "number" },
        min_street_m: { type: "number" },
        district: { type: "string", description: "District name in Arabic or English (partial is fine)." },
        sort: { type: "string", enum: ["best_fit", "cheapest", "largest", "best_value"] },
        include_reserved: { type: "boolean" },
        limit: { type: "number", description: "Default 5, max 8" },
      },
    },
  },
  {
    name: "get_parcel",
    description: "Full details for one parcel: price, price vs district/area, drive times, nearby closed deals, similar available land.",
    input_schema: { type: "object", properties: { parcel_id: { type: "string" } }, required: ["parcel_id"] },
  },
  {
    name: "show_parcels",
    description: "Show parcel cards in the chat. Call whenever you recommend or discuss specific parcels.",
    input_schema: { type: "object", properties: { parcel_ids: { type: "array", items: { type: "string" }, maxItems: 4 } }, required: ["parcel_ids"] },
  },
  {
    name: "save_visit_request",
    description: "Save a site-visit or call-back request after the visitor gives their name and Saudi mobile.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" }, phone: { type: "string" },
        parcel_id: { type: "string", description: "The parcel they want, if any." },
        kind: { type: "string", enum: ["site_visit", "inquiry"] },
        preferred_time: { type: "string", enum: ["", "weekday_morning", "weekday_evening", "weekend"] },
        note: { type: "string", description: "Short summary of what they want, in their words." },
      },
      required: ["name", "phone"],
    },
  },
  {
    name: "save_alert",
    description: "Save a 'notify me' request for land that isn't available now.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" }, phone: { type: "string" },
        criteria: { type: "object", description: "e.g. {use, land_type, deal, area, budget, waitlist_parcel}" },
      },
      required: ["name", "phone", "criteria"],
    },
  },
];

function brief(p: Parcel) {
  return {
    id: p.parcel_id, district: `${p.district_ar} / ${p.district_en}`, area: p.area_of_city, type: p.land_type, deal: p.listing_type,
    status: p.status, size_sqm: p.area_sqm, sar_per_sqm: p.price_per_sqm_sar, total_sar: p.total_price_sar,
    price_basis: p.listing_type === "lease" ? "annual rent" : "asking price", street_m: p.street_width_m,
    vs_area_median_pct: p.pricing.vs_area_pct ?? null, highlight: hook(p).en,
  };
}

export type ToolEffects = { cards: string[]; saved: ("lead" | "alert")[] };

export async function runTool(name: string, input: Record<string, unknown>, fx: ToolEffects, session_id?: string, lang?: string) {
  switch (name) {
    case "search_parcels": {
      const limit = Math.min(Number(input.limit) || 5, 8);
      const deal = input.deal as Deal | undefined;
      const area = (input.area as Area | "any" | undefined) ?? "any";
      const budget = typeof input.max_budget_sar === "number" ? input.max_budget_sar : null;
      const type = (input.land_type as LandType | undefined) ?? intentByKey(String(input.use))?.type ?? undefined;
      const extra = (p: Parcel) =>
        (!input.min_size_sqm || p.area_sqm >= Number(input.min_size_sqm)) &&
        (!input.max_size_sqm || p.area_sqm <= Number(input.max_size_sqm)) &&
        (!input.min_street_m || p.street_width_m >= Number(input.min_street_m)) &&
        (!input.district || `${p.district_ar} ${p.district_en}`.toLowerCase().includes(String(input.district).toLowerCase()));

      if (input.use && deal) {
        const r = runMatch({ use: input.use as IntentKey, deal, area, budget });
        const pack = (ms: typeof r.fits) => ms.filter((m) => extra(m.parcel)).slice(0, limit)
          .map((m) => ({ ...brief(m.parcel), reasons: m.reasons.map((x) => x.en), note: m.note?.en }));
        return { fits: pack(r.fits), close_to_budget: pack(r.stretch), alternatives: pack(r.alternatives) };
      }
      const pool = (input.include_reserved ? parcels.filter((p) => p.status === "available" || p.status === "reserved") : available)
        .filter((p) => (!type || p.land_type === type) && (!deal || p.listing_type === deal) && (area === "any" || p.area_of_city === area)
          && (budget == null || (p.total_price_sar ?? Infinity) <= budget) && extra(p));
      const sort = String(input.sort ?? "best_value");
      pool.sort((a, b) => sort === "cheapest" ? (a.total_price_sar ?? Infinity) - (b.total_price_sar ?? Infinity)
        : sort === "largest" ? b.area_sqm - a.area_sqm
          : (a.pricing.vs_area_pct ?? 999) - (b.pricing.vs_area_pct ?? 999));
      return { count: pool.length, results: pool.slice(0, limit).map(brief) };
    }
    case "get_parcel": {
      const p = byId(String(input.parcel_id));
      if (!p) return { error: "No parcel with that id." };
      const comps = p.closed_comps.map((c) => byId(c)!).filter((c) => c.price_per_sqm_sar).slice(0, 4)
        .map((c) => ({ id: c.parcel_id, district: c.district_en, status: c.status, sar_per_sqm: c.price_per_sqm_sar, size_sqm: c.area_sqm }));
      const similar = available.filter((x) => x.parcel_id !== p.parcel_id && x.land_type === p.land_type && x.listing_type === p.listing_type && x.area_of_city === p.area_of_city)
        .sort((a, b) => Math.abs(a.area_sqm - p.area_sqm) - Math.abs(b.area_sqm - p.area_sqm)).slice(0, 3).map(brief);
      return {
        ...brief(p), district_median_sar_per_sqm: p.pricing.district_median_sqm ?? null, area_median_sar_per_sqm: p.pricing.area_median_sqm ?? null,
        frontage: p.frontage, listed_days_ago: daysSince(p.listed_date),
        drive_minutes_no_traffic: { KAFD: p.drive.kafd.min, airport: p.drive.airport.min, kingdom_centre: p.drive.kingdom.min, diriyah: p.drive.diriyah.min },
        rett_5pct_estimate_sar: p.listing_type === "sale" && p.total_price_sar ? Math.round(p.total_price_sar * 0.05) : null,
        investors_seeking_similar: p.segment_demand,
        closed_deals_nearby: comps, similar_available: similar, page: `/lands/${p.parcel_id}`,
        price_text: p.total_price_sar ? money(p.total_price_sar, "en") : "on request", area_label: AREA_LABEL[p.area_of_city].en,
      };
    }
    case "show_parcels": {
      const ids = (Array.isArray(input.parcel_ids) ? input.parcel_ids : []).map(String).filter((id) => byId(id)).slice(0, 4);
      for (const id of ids) if (!fx.cards.includes(id)) fx.cards.push(byId(id)!.parcel_id);
      return { shown: ids };
    }
    case "save_visit_request": {
      const r = await saveLead({ ...input, name: input.name, phone: input.phone, message: input.note, source: "chat", lang, session_id, context: { via: "chat" } });
      if (r.ok) fx.saved.push("lead");
      return r.ok ? { saved: true } : { saved: false, error: r.code === "phone" ? "Invalid Saudi mobile. Ask them to re-check it (05XXXXXXXX)." : r.code === "name" ? "Name missing." : r.code === "parcel" ? "Unknown parcel id." : "Could not save right now. Offer WhatsApp instead." };
    }
    case "save_alert": {
      const r = await saveAlert({ ...input, name: input.name, phone: input.phone, session_id, criteria: { ...(input.criteria as object), via: "chat" } });
      if (r.ok) fx.saved.push("alert");
      return r.ok ? { saved: true } : { saved: false, error: r.code === "phone" ? "Invalid Saudi mobile. Ask them to re-check it (05XXXXXXXX)." : "Could not save right now. Offer WhatsApp instead." };
    }
  }
  return { error: "unknown tool" };
}
