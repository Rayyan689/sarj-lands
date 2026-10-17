// The morning letter: written once a day by the AI from the live numbers, then cached for everyone.
import Anthropic from "@anthropic-ai/sdk";
import { buildAnalytics } from "@/lib/admin/analytics";
import { loadLive } from "@/lib/admin/live";
import { sql, ensureSchema } from "@/lib/db";
import { riyadhToday } from "@/lib/time";

const MODEL = process.env.CHAT_MODEL || "claude-sonnet-5-5";
const inflight = new Map<string, Promise<string>>();

function fallback(a: ReturnType<typeof buildAnalytics>, lang: "ar" | "en") {
  const lines = a.brief.slice(0, 3).map((b, i) => `${i + 1}. ${b[lang]}`).join("\n");
  return lang === "ar" ? `صباح الخير،\nهذي أهم ثلاث أشياء اليوم:\n${lines}\n\nيومك سعيد، مساعدك في سرج.` : `Good morning,\nHere are today's three priorities:\n${lines}\n\nHave a good day, your Sarj assistant.`;
}

async function write(origin: string, lang: "ar" | "en") {
  const a = buildAnalytics(origin);
  if (!process.env.ANTHROPIC_API_KEY) return fallback(a, lang);
  const live = await loadLive();
  const data = {
    today: a.today, kpis: a.kpis, briefing: a.brief.map((b) => b.en),
    top_calls: a.calls.slice(0, 5).map((c) => ({ name: lang === "ar" ? c.name_ar : c.name, intent: c.intent, status: c.status, waiting_days: c.waiting, wants: c.wants, best_match: c.match })),
    competing: a.hot.slice(0, 2).map((h) => ({ parcel: h.id, district: lang === "ar" ? h.district_ar : h.district_en, buyers: h.buyers.length, listed_days: h.age })),
    acquire_next: a.buyNext.slice(0, 1),
    website_last_30_days: live.ok ? { visitors: live.totals.sessions, open_requests: live.leads.filter((l) => !l.archived).length + live.alerts.filter((l) => !l.archived).length } : "unavailable",
  };
  const res = await new Anthropic().messages.create({
    model: MODEL, max_tokens: 900,
    system: lang === "ar"
      ? "أنت مساعد مدير شركة سرج العقارية. اكتب رسالة الصباح لصاحب الشركة: بين 90 و140 كلمة، بلهجة نجدية خفيفة ودافية وذكية، مثل موظف ثقة يعرف الشغل. ابدأ بـ \"صباح الخير\" وجملة وحدة تلخص اليوم. بعدها ثلاث أولويات مرقمة، كل وحدة فيها اسم أو رقم حقيقي من البيانات ووش يسوي بالضبط. اختم بسطر قصير مشجع وتوقيع \"مساعدك في سرج\". استخدم البيانات المعطاة بس، لا تخترع شي. أرقام إنجليزية. لا تستخدم الشرطة الطويلة. بدون عناوين أو نجوم."
      : "You are the chief-of-staff assistant at Sarj Real Estate. Write the owner's morning letter: 90 to 140 words, warm, sharp and plain. Start with \"Good morning\" and one line that sums up the day. Then three numbered priorities, each with a real name or number from the data and exactly what to do. End with a short encouraging line signed \"Your Sarj assistant\". Use only the data given. No em dashes, no headings, no asterisks.",
    messages: [{ role: "user", content: `Data for today (${a.today}):\n${JSON.stringify(data)}` }],
  });
  const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
  return (text || fallback(a, lang)).replace(/\s*—\s*/g, "، ").replace(/\*\*/g, "");
}

export async function GET(req: Request) {
  if (req.headers.get("x-sarj-admin") !== "1") return Response.json({ error: "forbidden" }, { status: 403 });
  const lang = new URL(req.url).searchParams.get("lang") === "en" ? "en" : "ar";
  const day = riyadhToday();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost";
  const origin = `${req.headers.get("x-forwarded-proto") ?? "https"}://${host}`;
  try {
    if (sql) {
      await ensureSchema();
      const rows = await sql`SELECT body FROM briefs WHERE day = ${day} AND lang = ${lang}`;
      if (rows[0]?.body) return Response.json({ day, body: rows[0].body, cached: true });
    }
    const key = `${day}:${lang}`;
    if (!inflight.has(key)) inflight.set(key, write(origin, lang).finally(() => setTimeout(() => inflight.delete(key), 60_000)));
    const body = await inflight.get(key)!;
    if (sql) await sql`INSERT INTO briefs (day, lang, body) VALUES (${day}, ${lang}, ${body}) ON CONFLICT (day, lang) DO NOTHING`;
    return Response.json({ day, body, cached: false });
  } catch {
    return Response.json({ day, body: fallback(buildAnalytics(origin), lang), cached: false, fallback: true });
  }
}
