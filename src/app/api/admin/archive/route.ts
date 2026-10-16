import { sql, ensureSchema } from "@/lib/db";

// Archive (or restore) a lead or alert from the admin view. Demo access has no login by design of the brief.
export async function POST(req: Request) {
  if (req.headers.get("x-sarj-admin") !== "1") return Response.json({ error: "forbidden" }, { status: 403 });
  if (!sql) return Response.json({ error: "storage" }, { status: 503 });
  const { kind, id, archived = true } = await req.json().catch(() => ({}));
  const n = Number(id);
  if (!Number.isInteger(n) || (kind !== "lead" && kind !== "alert")) return Response.json({ error: "bad request" }, { status: 400 });
  await ensureSchema();
  if (kind === "lead") await sql`UPDATE leads SET archived = ${!!archived} WHERE id = ${n}`;
  else await sql`UPDATE alerts SET archived = ${!!archived} WHERE id = ${n}`;
  return Response.json({ ok: true });
}
