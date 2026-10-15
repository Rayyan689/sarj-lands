import { sql, ensureSchema } from "@/lib/db";

export async function POST(req: Request) {
  if (!sql) return Response.json({ error: "Storage is not configured" }, { status: 503 });
  const b = await req.json();
  const clean = String(b.phone ?? "").replace(/[^\d+]/g, "");
  if (!b.name || clean.length < 9) return Response.json({ error: "name and phone required" }, { status: 400 });
  await ensureSchema();
  await sql`INSERT INTO leads (name, phone, parcel_id, kind, message, preferred_time, source, lang, session_id, context)
    VALUES (${String(b.name).slice(0, 80)}, ${clean}, ${b.parcel_id ?? null}, ${b.kind ?? "inquiry"}, ${b.message ?? null},
            ${b.preferred_time ?? null}, ${b.source ?? "web"}, ${b.lang ?? "ar"}, ${b.session_id ?? null}, ${JSON.stringify(b.context ?? {})})`;
  return Response.json({ ok: true });
}
