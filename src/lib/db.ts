import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
export const sql = url ? neon(url) : null;

let ready: Promise<void> | null = null;
/** Creates tables on first use. Safe to call on every request. */
export function ensureSchema() {
  if (!sql) return Promise.resolve();
  ready ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT now(),
      name TEXT, phone TEXT, parcel_id TEXT, kind TEXT, message TEXT,
      preferred_time TEXT, source TEXT, lang TEXT, session_id TEXT, context JSONB)`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false`;
    await sql`CREATE TABLE IF NOT EXISTS chats (
      id BIGSERIAL PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT now(),
      session_id TEXT, mode TEXT, lang TEXT, page TEXT, user_msg TEXT, reply TEXT, tools JSONB, usage JSONB)`;
    await sql`CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT now(),
      session_id TEXT, name TEXT, parcel_id TEXT, props JSONB)`;
    await sql`CREATE TABLE IF NOT EXISTS alerts (
      id SERIAL PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT now(),
      name TEXT, phone TEXT, criteria JSONB, session_id TEXT)`;
    await sql`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false`;
    await sql`CREATE TABLE IF NOT EXISTS briefs (day DATE, lang TEXT, body TEXT, created_at TIMESTAMPTZ DEFAULT now(), PRIMARY KEY (day, lang))`;
  })().catch((e) => { ready = null; throw e; });
  return ready;
}
