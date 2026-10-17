import Anthropic from "@anthropic-ai/sdk";
import { systemBlocks, tools, runTool, type ToolEffects } from "@/lib/chat/investor";
import { adminSystem, adminTools, runAdminTool } from "@/lib/chat/admin";
import { sql, ensureSchema } from "@/lib/db";

const MODEL = process.env.CHAT_MODEL || "claude-sonnet-5-5";
const MAX_TURNS = 12;        // conversation messages sent to the model
const MAX_CHARS = 1200;      // per visitor message
const MAX_TOOL_ROUNDS = 4;

// Best-effort abuse guard (per server instance): 40 messages per 10 minutes per IP.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now(), win = 10 * 60_000;
  const xs = (hits.get(ip) ?? []).filter((t) => now - t < win);
  xs.push(now); hits.set(ip, xs);
  return xs.length > 40;
}

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "not configured" }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return Response.json({ error: "rate", code: "rate" }, { status: 429 });

  let body: { messages?: Msg[]; context?: { page?: string; parcel_id?: string; lang?: string; profile?: Record<string, never> }; session_id?: string; mode?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const history = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (history.length && history[0].role !== "user") history.shift();
  if (!history.length || history[history.length - 1].role !== "user") return Response.json({ error: "bad request" }, { status: 400 });

  const ctx = body.context ?? {};
  const isAdmin = body.mode === "admin";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost";
  const origin = `${req.headers.get("x-forwarded-proto") ?? "https"}://${host}`;
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = history;
  const fx: ToolEffects = { cards: [], saved: [] };
  const toolLog: { name: string; input: unknown }[] = [];
  const usage = { input: 0, output: 0, cache_read: 0, cache_write: 0 };
  let reply = "";
  const parts: string[] = [];

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const res = await client.messages.create({
        model: MODEL, max_tokens: isAdmin ? 3000 : 1600,
        system: isAdmin ? adminSystem(origin) : systemBlocks(ctx), tools: isAdmin ? adminTools : tools, messages,
        // On the last round, no more tools: the model must answer with what it has.
        ...(round === MAX_TOOL_ROUNDS ? { tool_choice: { type: "none" as const } } : {}),
      });
      usage.input += res.usage.input_tokens; usage.output += res.usage.output_tokens;
      usage.cache_read += res.usage.cache_read_input_tokens ?? 0; usage.cache_write += res.usage.cache_creation_input_tokens ?? 0;
      const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
      if (text) parts.push(text);
      if (process.env.CHAT_DEBUG) console.log("round", round, res.stop_reason, res.content.map((b) => b.type).join(","), res.usage.output_tokens);
      if (res.stop_reason !== "tool_use") break;
      messages.push({ role: "assistant", content: res.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const b of res.content) {
        if (b.type !== "tool_use") continue;
        toolLog.push({ name: b.name, input: b.input });
        let out: unknown;
        try {
          out = isAdmin ? await runAdminTool(b.name, b.input as Record<string, unknown>, fx)
            : await runTool(b.name, b.input as Record<string, unknown>, fx, body.session_id, ctx.lang);
        }
        catch { out = { error: "tool failed" }; }
        results.push({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify(out) });
      }
      messages.push({ role: "user", content: results });
    }
    reply = parts.join("\n\n").trim();
  } catch (e) {
    const status = (e as { status?: number }).status;
    return Response.json({ error: "llm", code: status === 429 || status === 529 ? "busy" : "llm" }, { status: 502 });
  }

  if (!reply) reply = ctx.lang === "en" ? "Here's what I found." : "هذا اللي لقيته لك.";
  reply = reply.replace(/\s*—\s*/g, "، ");

  // Anonymous log for the admin view (what investors ask). Never blocks the reply.
  if (sql) {
    const lastUser = history[history.length - 1].content;
    ensureSchema().then(() => sql!`INSERT INTO chats (session_id, mode, lang, page, user_msg, reply, tools, usage)
      VALUES (${body.session_id ?? null}, ${isAdmin ? "admin" : "investor"}, ${ctx.lang ?? "ar"}, ${ctx.parcel_id ?? ctx.page ?? null}, ${lastUser}, ${reply},
              ${JSON.stringify(toolLog)}, ${JSON.stringify(usage)})`).catch(() => {});
  }

  return Response.json({ reply, cards: fx.cards, saved: fx.saved });
}
