import { connection } from "next/server";
import { parcels } from "@/lib/portfolio";
import { sql, ensureSchema } from "@/lib/db";

export async function GET() {
  await connection(); // evaluate per request so env vars set in Vercel are read live
  let db: string = "not configured";
  if (sql) {
    try { await ensureSchema(); await sql`SELECT 1`; db = "ok"; }
    catch (e) { db = "error: " + (e as Error).message.slice(0, 120); }
  }
  return Response.json({ ok: true, parcels: parcels.length, llm: Boolean(process.env.ANTHROPIC_API_KEY), db });
}
