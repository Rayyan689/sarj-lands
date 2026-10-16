import { sql, ensureSchema } from "@/lib/db";
import { cleanName, normalizeSaudiMobile } from "@/lib/validate";

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  if (b.website) return Response.json({ ok: true });
  const name = cleanName(String(b.name ?? ""));
  if (!name) return Response.json({ error: "name", code: "name" }, { status: 400 });
  const phone = normalizeSaudiMobile(String(b.phone ?? ""));
  if (!phone) return Response.json({ error: "phone", code: "phone" }, { status: 400 });
  const criteria = JSON.stringify(b.criteria ?? {});
  if (criteria.length > 2000) return Response.json({ error: "bad request" }, { status: 400 });
  if (!sql) return Response.json({ error: "Storage is not configured" }, { status: 503 });
  await ensureSchema();
  await sql`INSERT INTO alerts (name, phone, criteria, session_id) VALUES (${name}, ${phone}, ${criteria}, ${b.session_id ? String(b.session_id).slice(0, 64) : null})`;
  return Response.json({ ok: true });
}
