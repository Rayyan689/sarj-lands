import { saveLead, resultResponse } from "@/lib/leads";

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  if (b.website) return Response.json({ ok: true }); // honeypot: bots fill hidden fields
  return resultResponse(await saveLead(b as Parameters<typeof saveLead>[0]));
}
