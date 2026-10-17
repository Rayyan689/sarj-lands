// Drafts a personal WhatsApp message for one investor, from their inquiry and the property that fits them best.
import Anthropic from "@anthropic-ai/sdk";
import { buildAnalytics } from "@/lib/admin/analytics";
import { byId } from "@/lib/portfolio";
import { AREA_LABEL, money } from "@/lib/format";

const MODEL = process.env.CHAT_MODEL || "claude-sonnet-5-5";

export async function POST(req: Request) {
  if (req.headers.get("x-sarj-admin") !== "1") return Response.json({ error: "forbidden" }, { status: 403 });
  let body: { id?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost";
  const origin = `${req.headers.get("x-forwarded-proto") ?? "https"}://${host}`;
  const a = buildAnalytics(origin);
  const c = a.calls.find((x) => x.id === body.id);
  if (!c) return Response.json({ error: "not found" }, { status: 404 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ text: c.waText, fallback: true });
  const p = c.match ? byId(c.match) : null;
  const facts = {
    investor_first_name_ar: c.name_ar.split(" ")[0], wants_ar: c.wants_ar, area_ar: AREA_LABEL[c.area as keyof typeof AREA_LABEL].ar,
    deal: c.deal, budget: money(c.budget, "ar"), status: c.status, intent: c.intent, waiting_days: c.waiting, channel: c.channel,
    property: p ? { district_ar: p.district_ar, area_ar: AREA_LABEL[p.area_of_city].ar, sqm: p.area_sqm, street_m: p.street_width_m, price: p.total_price_sar ? money(p.total_price_sar, "ar") + (p.listing_type === "lease" ? " بالسنة" : "") : "عند الطلب", vs_area_pct: p.pricing.vs_area_pct ?? null, link: `${origin}/lands/${p.parcel_id}`, exact_fit: c.exact } : null,
  };
  try {
    const res = await new Anthropic().messages.create({
      model: MODEL, max_tokens: 3000,
      system: "اكتب رسالة واتساب من فريق سرج العقارية لمستثمر. 45 إلى 80 كلمة. نجدي خفيف ومحترم (أستاذ/أستاذة حسب الاسم). ابدأ بالسلام واسمه الأول. اربط الأرض باللي يبيه هو بالضبط (مثلاً بيت العايلة أو المستودع)، واذكر ميزة وحدة أو ثنتين حقيقية من البيانات. إذا مو تطابق تام قلها بصراحة. حط الرابط في سطر لحاله. اختم بسؤال واحد سهل يخليه يرد (مثل موعد زيارة). إذا ينتظر من زمان، اعتذر بلطف عن التأخير بجملة قصيرة. استخدم البيانات بس. أرقام إنجليزية. بدون شرطة طويلة. بدون نجوم.",
      messages: [{ role: "user", content: JSON.stringify(facts) }],
    });
    const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim().replace(/\s*—\s*/g, "، ").replace(/\*\*/g, "");
    if (!text || res.stop_reason === "max_tokens") return Response.json({ text: c.waText, fallback: true });
    return Response.json({ text });
  } catch {
    return Response.json({ text: c.waText, fallback: true });
  }
}
