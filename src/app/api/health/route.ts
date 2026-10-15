import { connection } from "next/server";
import { parcels } from "@/lib/portfolio";

export async function GET() {
  await connection(); // evaluate per request so env vars set in Vercel are read live
  return Response.json({ ok: true, parcels: parcels.length, llm: Boolean(process.env.ANTHROPIC_API_KEY) });
}
