import { sql, ensureSchema } from "@/lib/db";
import { cleanName, normalizeSaudiMobile } from "@/lib/validate";
import { byId } from "@/lib/portfolio";

const KINDS = new Set(["site_visit", "inquiry", "chat"]);
const TIMES = new Set(["", "weekday_morning", "weekday_evening", "weekend"]);

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  if (b.website) return Response.json({ ok: true }); // honeypot: bots fill hidden fields
  const name = cleanName(String(b.name ?? ""));
  if (!name) return Response.json({ error: "name", code: "name" }, { status: 400 });
  const phone = normalizeSaudiMobile(String(b.phone ?? ""));
  if (!phone) return Response.json({ error: "phone", code: "phone" }, { status: 400 });
  const parcel = b.parcel_id ? byId(String(b.parcel_id)) : null;
  if (b.parcel_id && !parcel) return Response.json({ error: "unknown parcel" }, { status: 400 });
  const kind = KINDS.has(String(b.kind)) ? String(b.kind) : "inquiry";
  const time = TIMES.has(String(b.preferred_time ?? "")) ? String(b.preferred_time ?? "") : "";
  if (!sql) return Response.json({ error: "Storage is not configured" }, { status: 503 });
  await ensureSchema();
  await sql`INSERT INTO leads (name, phone, parcel_id, kind, message, preferred_time, source, lang, session_id, context)
    VALUES (${name}, ${phone}, ${parcel?.parcel_id ?? null}, ${kind}, ${b.message ? String(b.message).slice(0, 1000) : null},
            ${time}, ${String(b.source ?? "web").slice(0, 40)}, ${b.lang === "en" ? "en" : "ar"}, ${b.session_id ? String(b.session_id).slice(0, 64) : null},
            ${JSON.stringify(b.context ?? {}).slice(0, 4000)})`;
  return Response.json({ ok: true });
}
