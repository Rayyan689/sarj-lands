import { sql, ensureSchema } from "@/lib/db";

const ALLOWED = new Set(["page_view", "match_started", "match_step", "match_completed", "parcel_view", "parcel_click",
  "explorer_filter", "compare", "chat_open", "chat_message", "lead_submitted", "alert_created", "whatsapp_click", "shortlist_add", "share"]);

export async function POST(req: Request) {
  if (!sql) return Response.json({ ok: false });
  try {
    const { name, props, parcel_id, session_id } = await req.json();
    if (!ALLOWED.has(name)) return Response.json({ ok: false }, { status: 400 });
    await ensureSchema();
    await sql`INSERT INTO events (session_id, name, parcel_id, props) VALUES (${String(session_id).slice(0, 64)}, ${name}, ${parcel_id ?? null}, ${JSON.stringify(props ?? {})})`;
    return Response.json({ ok: true });
  } catch { return Response.json({ ok: false }, { status: 400 }); }
}
