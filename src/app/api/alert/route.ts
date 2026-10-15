import { sql, ensureSchema } from "@/lib/db";

export async function POST(req: Request) {
  if (!sql) return Response.json({ error: "Storage is not configured" }, { status: 503 });
  const { name, phone, criteria, session_id } = await req.json();
  const clean = String(phone ?? "").replace(/[^\d+]/g, "");
  if (!name || clean.length < 9) return Response.json({ error: "name and phone required" }, { status: 400 });
  await ensureSchema();
  await sql`INSERT INTO alerts (name, phone, criteria, session_id) VALUES (${String(name).slice(0, 80)}, ${clean}, ${JSON.stringify(criteria ?? {})}, ${session_id ?? null})`;
  return Response.json({ ok: true });
}
