export const dynamic = "force-dynamic";
import { parcels } from "@/lib/portfolio";
export function GET() {
  return Response.json({ ok: true, parcels: parcels.length, llm: Boolean(process.env.ANTHROPIC_API_KEY) });
}
