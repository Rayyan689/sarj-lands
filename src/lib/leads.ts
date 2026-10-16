// One place that validates and stores leads and alerts. Used by the forms' API routes and by the chatbot.
import { sql, ensureSchema } from "./db";
import { cleanName, normalizeSaudiMobile } from "./validate";
import { byId } from "./portfolio";

type Result = { ok: true } | { ok: false; code: "name" | "phone" | "parcel" | "storage" | "bad" };

const KINDS = new Set(["site_visit", "inquiry"]);
const TIMES = new Set(["", "weekday_morning", "weekday_evening", "weekend"]);

export async function saveLead(b: {
  name: unknown; phone: unknown; parcel_id?: unknown; kind?: unknown; message?: unknown; preferred_time?: unknown;
  source?: unknown; lang?: unknown; session_id?: unknown; context?: unknown;
}): Promise<Result> {
  const name = cleanName(String(b.name ?? ""));
  if (!name) return { ok: false, code: "name" };
  const phone = normalizeSaudiMobile(String(b.phone ?? ""));
  if (!phone) return { ok: false, code: "phone" };
  const parcel = b.parcel_id ? byId(String(b.parcel_id)) : null;
  if (b.parcel_id && !parcel) return { ok: false, code: "parcel" };
  if (!sql) return { ok: false, code: "storage" };
  const kind = KINDS.has(String(b.kind)) ? String(b.kind) : "inquiry";
  const time = TIMES.has(String(b.preferred_time ?? "")) ? String(b.preferred_time ?? "") : "";
  await ensureSchema();
  await sql`INSERT INTO leads (name, phone, parcel_id, kind, message, preferred_time, source, lang, session_id, context)
    VALUES (${name}, ${phone}, ${parcel?.parcel_id ?? null}, ${kind}, ${b.message ? String(b.message).slice(0, 1000) : null},
            ${time}, ${String(b.source ?? "web").slice(0, 40)}, ${b.lang === "en" ? "en" : "ar"}, ${b.session_id ? String(b.session_id).slice(0, 64) : null},
            ${JSON.stringify(b.context ?? {}).slice(0, 4000)})`;
  return { ok: true };
}

export async function saveAlert(b: { name: unknown; phone: unknown; criteria?: unknown; session_id?: unknown }): Promise<Result> {
  const name = cleanName(String(b.name ?? ""));
  if (!name) return { ok: false, code: "name" };
  const phone = normalizeSaudiMobile(String(b.phone ?? ""));
  if (!phone) return { ok: false, code: "phone" };
  const criteria = JSON.stringify(b.criteria ?? {});
  if (criteria.length > 2000) return { ok: false, code: "bad" };
  if (!sql) return { ok: false, code: "storage" };
  await ensureSchema();
  await sql`INSERT INTO alerts (name, phone, criteria, session_id) VALUES (${name}, ${phone}, ${criteria}, ${b.session_id ? String(b.session_id).slice(0, 64) : null})`;
  return { ok: true };
}

export function resultResponse(r: Result) {
  if (r.ok) return Response.json({ ok: true });
  const status = r.code === "storage" ? 503 : 400;
  return Response.json({ error: r.code, code: r.code }, { status });
}
