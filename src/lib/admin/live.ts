// Live data from the website itself: leads, alerts, visitor funnel, chatbot questions.
import "server-only";
import { sql, ensureSchema } from "../db";

export type Live = Awaited<ReturnType<typeof loadLive>>;

export async function loadLive() {
  const empty = { ok: false, leads: [], alerts: [], funnel: [], topViewed: [], questions: [], totals: { sessions: 0, events: 0 } };
  if (!sql) return empty;
  try {
    await ensureSchema();
    const [leads, alerts, funnel, topViewed, questions, totals] = await Promise.all([
      sql`SELECT id, created_at, name, phone, parcel_id, kind, preferred_time, source, lang, message, archived FROM leads ORDER BY created_at DESC LIMIT 100`,
      sql`SELECT id, created_at, name, phone, criteria, archived FROM alerts ORDER BY created_at DESC LIMIT 100`,
      sql`SELECT name, count(*)::int AS events, count(DISTINCT session_id)::int AS sessions FROM events WHERE created_at > now() - interval '30 days' GROUP BY name`,
      sql`SELECT parcel_id, count(*)::int AS views FROM events WHERE name = 'parcel_view' AND parcel_id IS NOT NULL AND created_at > now() - interval '30 days' GROUP BY parcel_id ORDER BY views DESC LIMIT 6`,
      sql`SELECT created_at, lang, page, user_msg FROM chats WHERE mode = 'investor' AND (session_id IS NULL OR session_id NOT LIKE 'qa-%') ORDER BY created_at DESC LIMIT 12`,
      sql`SELECT count(DISTINCT session_id)::int AS sessions, count(*)::int AS events FROM events WHERE created_at > now() - interval '30 days'`,
    ]);
    return {
      ok: true,
      leads: leads as { id: number; created_at: string; name: string; phone: string; parcel_id: string | null; kind: string; preferred_time: string; source: string; lang: string; message: string | null; archived: boolean }[],
      alerts: alerts as { id: number; created_at: string; name: string; phone: string; criteria: Record<string, unknown>; archived: boolean }[],
      funnel: funnel as { name: string; events: number; sessions: number }[],
      topViewed: topViewed as { parcel_id: string; views: number }[],
      questions: questions as { created_at: string; lang: string; page: string | null; user_msg: string }[],
      totals: (totals[0] ?? { sessions: 0, events: 0 }) as { sessions: number; events: number },
    };
  } catch {
    return empty;
  }
}
