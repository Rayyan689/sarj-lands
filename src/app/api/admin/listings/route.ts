// Admin: add a property, or archive/restore one that was added here.
import { sql, ensureSchema } from "@/lib/db";
import { derive, nextId, syncFromDb, validate } from "@/lib/listings";
import { affordable, inquiries, nameAr, waText, WANTS_AR } from "@/lib/admin/analytics";
import { daysSince } from "@/lib/time";

const hits = new Map<string, number[]>();
const limited = (ip: string) => { const now = Date.now(); const xs = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000); xs.push(now); hits.set(ip, xs); return xs.length > 15; };

export async function POST(req: Request) {
  if (req.headers.get("x-sarj-admin") !== "1") return Response.json({ error: "forbidden" }, { status: 403 });
  if (!sql) return Response.json({ error: "db" }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return Response.json({ error: "rate" }, { status: 429 });
  let raw: Record<string, unknown>;
  try { raw = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const r = validate(raw);
  if (!r.ok) return Response.json({ error: "invalid", field: r.field }, { status: 400 });
  try {
    await ensureSchema();
    await syncFromDb();
    let id = await nextId();
    let p = derive(id, r.v);
    for (let tries = 0; tries < 3; tries++) {
      const ins = await sql`INSERT INTO listings (id, data, ip) VALUES (${id}, ${JSON.stringify(p)}, ${ip}) ON CONFLICT (id) DO NOTHING RETURNING id`;
      if (ins.length) break;
      id = await nextId(); p = derive(id, r.v);
    }
    await syncFromDb();
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost";
    const origin = `${req.headers.get("x-forwarded-proto") ?? "https"}://${host}`;
    const today = new Date().toISOString().slice(0, 10);
    const buyers = inquiries.filter((q) => affordable(q, p)).map((q) => ({
      id: q.inquiry_id, name: q.investor_name, name_ar: nameAr(q.investor_name), wants_ar: WANTS_AR[q.wants_to], wants: q.wants_to,
      budget: q.budget_sar, status: q.status, intent: q.intent, waiting: daysSince(q.date, today),
      wa: `https://wa.me/966${q.phone.slice(1)}?text=${encodeURIComponent(waText(q, p, origin, true))}`,
    })).sort((a, b) => Number(b.intent === "ready to move") - Number(a.intent === "ready to move") || b.waiting - a.waiting);
    return Response.json({ parcel: p, buyers });
  } catch {
    return Response.json({ error: "db" }, { status: 502 });
  }
}

export async function PATCH(req: Request) {
  if (req.headers.get("x-sarj-admin") !== "1") return Response.json({ error: "forbidden" }, { status: 403 });
  if (!sql) return Response.json({ error: "db" }, { status: 503 });
  let b: { id?: string; archived?: boolean };
  try { b = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  if (!b.id || !/^SRE-\d{3,4}$/.test(b.id)) return Response.json({ error: "bad id" }, { status: 400 });
  await ensureSchema();
  await sql`UPDATE listings SET archived = ${!!b.archived} WHERE id = ${b.id}`;
  await syncFromDb();
  return Response.json({ ok: true });
}
