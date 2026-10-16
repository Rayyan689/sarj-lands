import { saveAlert, resultResponse } from "@/lib/leads";

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  if (b.website) return Response.json({ ok: true });
  return resultResponse(await saveAlert(b as Parameters<typeof saveAlert>[0]));
}
