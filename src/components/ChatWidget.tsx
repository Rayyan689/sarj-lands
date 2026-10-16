"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { byId } from "@/lib/portfolio";
import { district, priceLabel, sqm } from "@/lib/format";
import { sessionId, track } from "@/lib/track";

type Msg = { role: "user" | "assistant"; content: string; cards?: string[]; saved?: string[]; error?: boolean };
const STORE = "sarj_chat_v1";
const STORE_ADMIN = "sarj_chat_admin_v1";

/** Opens the chat from anywhere: window.dispatchEvent(new CustomEvent("sarj:chat", { detail: "optional message" })) */
export function openChat(message?: string) {
  window.dispatchEvent(new CustomEvent("sarj:chat", { detail: message }));
}

// Tiny, safe formatter: **bold**, "- " bullets, line breaks. No HTML injection.
function Rich({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((ln, i) => {
        if (!ln.trim()) return null;
        const bullet = /^\s*[-•]\s+/.test(ln);
        const body = ln.replace(/^\s*[-•]\s+/, "");
        const parts = body.split(/(\*\*[^*]+\*\*)/g).map((s, j) =>
          s.startsWith("**") && s.endsWith("**") ? <b key={j} className="font-semibold">{s.slice(2, -2)}</b> : <Fragment key={j}>{s}</Fragment>);
        return bullet
          ? <div key={i} className="flex gap-2"><span aria-hidden className="text-apricot">●</span><span>{parts}</span></div>
          : <p key={i}>{parts}</p>;
      })}
    </div>
  );
}

function MiniCard({ id }: { id: string }) {
  const { lang } = useLang();
  const p = byId(id);
  if (!p) return null;
  return (
    <Link href={`/lands/${p.parcel_id}`} onClick={() => track("parcel_click", { from: "chat" }, p.parcel_id)}
      className="block min-w-[200px] max-w-[220px] shrink-0 rounded-2xl bg-white/90 p-3 text-[13px] shadow-sm ring-1 ring-black/5 hover:ring-blue/40">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{district(p, lang)}</span>
        <span className={`h-2 w-2 rounded-full ${p.status === "available" ? "bg-apricot" : p.status === "reserved" ? "bg-blue" : "bg-closed"}`} />
      </div>
      <p className="mt-1 text-[15px] font-semibold">{priceLabel(p, lang)}</p>
      <p className="text-muted">{sqm(p.area_sqm, lang)} · {lang === "ar" ? `شارع ${p.street_width_m} م` : `${p.street_width_m} m street`}</p>
      <p className="mt-1.5 text-blue">{lang === "ar" ? "افتح الأرض" : "Open"}</p>
    </Link>
  );
}

function ChatWidget() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const path = usePathname() ?? "/";
  const isAdmin = path.startsWith("/admin");
  const parcelId = /^\/lands\/(SRE-\d{3})$/i.exec(path)?.[1]?.toUpperCase();
  const parcel = parcelId ? byId(parcelId) : undefined;

  const [open, setOpen] = useState(false);
  // Restore this tab's conversation. Safe at first render: the panel starts closed, so nothing differs from the server HTML.
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(sessionStorage.getItem(location.pathname.startsWith("/admin") ? STORE_ADMIN : STORE) || "[]"); } catch { return []; }
  });
  const sendRef = useRef<(t: string) => void>(() => {});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { try { sessionStorage.setItem(isAdmin ? STORE_ADMIN : STORE, JSON.stringify(msgs.slice(-30))); } catch {} }, [msgs, isAdmin]);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy, open]);
  useEffect(() => {
    const h = (e: Event) => {
      setOpen(true); track("chat_open", { from: "event" }, parcelId);
      const m = (e as CustomEvent<string | undefined>).detail;
      if (m) setTimeout(() => sendRef.current(m), 50); else setTimeout(() => inputRef.current?.focus(), 50);
    };
    window.addEventListener("sarj:chat", h);
    return () => window.removeEventListener("sarj:chat", h);
  });
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  async function send(text: string) {
    const t = text.trim().slice(0, 1200);
    if (!t || busy) return;
    const next = [...msgs.filter((m) => !m.error), { role: "user" as const, content: t }];
    setMsgs(next); setInput(""); setBusy(true);
    track("chat_message", { page: path }, parcelId);
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })), context: { page: path, parcel_id: parcelId, lang }, session_id: sessionId(), mode: isAdmin ? "admin" : "investor" }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.code || "error");
      setMsgs([...next, { role: "assistant", content: j.reply, cards: j.cards, saved: j.saved }]);
      if (j.saved?.includes("lead")) track("lead_submitted", { kind: "chat", source: "chat" }, parcelId);
      if (j.saved?.includes("alert")) track("alert_created", { source: "chat" });
    } catch (e) {
      const code = (e as Error).message;
      const msg = code === "rate" ? (ar ? "أرسلت رسايل كثير ورا بعض. استريح دقيقة وارجع لي 🙏" : "That's a lot of messages in a row. Give it a minute and try again 🙏")
        : code === "busy" ? (ar ? "الضغط عالي شوي الحين، جرّب بعد لحظات." : "Things are busy right now, try again in a moment.")
          : (ar ? "صار خلل بسيط وما وصلني ردّك. جرّب مرة ثانية، أو كلّمنا واتساب." : "Something went wrong on our side. Try again, or message us on WhatsApp.");
      setMsgs([...next, { role: "assistant", content: msg, error: true }]);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }

  useEffect(() => { sendRef.current = send; });

  const suggestions = isAdmin
    ? (ar ? ["لخص لي وضع الشركة بثلاث نقاط", "مين أكلم اليوم عن SRE-015؟", "ليش أراضي المهدية ما تتحرك؟", "وش أكثر شي يطلبونه وما عندنا؟"] : ["Summarise the business in 3 points", "Who should I call about SRE-015?", "Why isn't Al Mahdiyah selling?", "What do investors want that we don't have?"])
    : parcel
    ? (ar ? ["وش يميز هالأرض؟", "كم تبعد عن المطار؟", "فيه أرخص منها بنفس المنطقة؟", "أبي أحجز زيارة"] : ["What makes this property special?", "How far is the airport?", "Anything cheaper nearby?", "I'd like to book a visit"])
    : (ar ? ["أبي أرض لبيت العايلة", "وش عندكم تجاري للإيجار؟", "وين أحلى سعر متر؟", "ميزانيتي 3 ملايين، وش يناسبني؟"] : ["Land for a family home", "Commercial properties to lease?", "Where's the best price per m²?", "What fits a 3M budget?"]);

  const greeting = isAdmin
    ? (ar ? "هلا! أنا مساعد الإدارة. أشوف الطلبات كلها، الأراضي، ونشاط الموقع لين اليوم. اسألني وش تبي تعرف أو وش نسوي هالأسبوع." : "Hi! I'm the admin assistant. I can see every inquiry, every property and the website's activity up to today. Ask me anything, or what to do this week.")
    : parcel
    ? (ar ? `هلا! تبي تعرف أكثر عن أرض ${district(parcel, "ar")}؟ اسألني أي شي عنها، أو عن أراضي ثانية.` : `Hi! Want to know more about this property in ${parcel.district_en}? Ask me anything about it, or about other properties.`)
    : (ar ? "هلا والله! أنا مستشار سرج. علّمني وش ناوي تبني أو وش ميزانيتك، وأطلع لك الأراضي اللي تناسبك من محفظتنا." : "Hi! I'm Sarj's property advisor. Tell me what you want to build or your budget, and I'll find properties that fit from our portfolio.");

  return (
    <>
      {!open && (
        <button onClick={() => { setOpen(true); track("chat_open", { from: "bubble" }, parcelId); setTimeout(() => inputRef.current?.focus(), 50); }}
          className="btn-primary fixed bottom-4 end-4 z-40 flex h-14 w-14 items-center justify-center gap-2 text-[15px] font-medium sm:bottom-6 sm:end-6 sm:h-auto sm:w-auto sm:px-4 sm:py-3"
          aria-label={ar ? "افتح المحادثة مع مستشار سرج" : "Chat with Sarj's advisor"}>
          <span aria-hidden className="text-xl leading-none sm:text-lg">💬</span>
          <span className="hidden sm:inline">{isAdmin ? (ar ? "اسأل مساعد الإدارة" : "Ask the admin assistant") : (ar ? "اسأل مستشار سرج" : "Ask our advisor")}</span>
        </button>
      )}

      {open && (
        <div role="dialog" aria-label={ar ? "محادثة مستشار سرج" : "Sarj advisor chat"}
          className="step-in fixed inset-0 z-50 flex flex-col sm:inset-auto sm:bottom-6 sm:end-6 sm:h-[min(640px,calc(100vh-7rem))] sm:w-[400px]">
          <div className="glass flex h-full flex-col overflow-hidden sm:rounded-[30px]" style={{ background: "linear-gradient(160deg, rgba(255,255,255,.92), rgba(246,249,253,.86))" }}>
            <div className="flex items-center gap-3 border-b border-hair px-4 py-3">
              <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-b from-[#d6b475] to-[#b4893f] text-lg font-bold text-white">س</span>
              <div className="min-w-0">
                <p className="font-semibold leading-tight">{isAdmin ? (ar ? "مساعد الإدارة" : "Admin assistant") : (ar ? "مستشار سرج" : "Sarj advisor")}</p>
                <p className="truncate text-[12px] text-muted">{ar ? "يرد فوراً، ومن بيانات أراضينا الفعلية" : "Instant answers from our real listings"}</p>
              </div>
              <div className="ms-auto flex items-center gap-1">
                {msgs.length > 0 && (
                  <button onClick={() => setMsgs([])} className="whitespace-nowrap rounded-full px-2.5 py-1.5 text-[12px] text-muted hover:bg-white">{ar ? "محادثة جديدة" : "New chat"}</button>
                )}
                <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-xl text-muted hover:bg-white" aria-label={ar ? "إغلاق" : "Close"}>×</button>
              </div>
            </div>

            <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              <div className="max-w-[88%] rounded-3xl rounded-ss-md bg-white/90 px-4 py-3 text-[15px] leading-relaxed shadow-sm">{greeting}</div>
              {msgs.length === 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {suggestions.map((s) => <button key={s} onClick={() => send(s)} className="bubble px-3 py-1.5 text-[13px]">{s}</button>)}
                </div>
              )}
              {msgs.map((m, i) => m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div dir="auto" className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-se-md bg-blue px-4 py-2.5 text-[15px] text-white">{m.content}</div>
                </div>
              ) : (
                <div key={i} className="space-y-2">
                  <div dir="auto" className={`max-w-[92%] rounded-3xl rounded-ss-md px-4 py-3 text-[15px] leading-relaxed shadow-sm ${m.error ? "bg-red-50 text-red-700" : "bg-white/90"}`}>
                    <Rich text={m.content} />
                  </div>
                  {m.cards && m.cards.length > 0 && (
                    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">{m.cards.map((id) => <MiniCard key={id} id={id} />)}</div>
                  )}
                  {m.saved?.includes("lead") && <p className="inline-block rounded-full bg-mint-soft px-3 py-1 text-[12px] text-[#8C6A2F]">✓ {ar ? "سجلنا طلبك، وبيكلمك الفريق" : "Request saved, the team will call you"}</p>}
                  {m.saved?.includes("alert") && <p className="inline-block rounded-full bg-mint-soft px-3 py-1 text-[12px] text-[#8C6A2F]">✓ {ar ? "سجلنا تنبيهك" : "Alert saved"}</p>}
                </div>
              ))}
              {busy && (
                <div className="inline-flex gap-1 rounded-3xl rounded-ss-md bg-white/90 px-4 py-3.5 shadow-sm" aria-label={ar ? "يكتب" : "Typing"}>
                  {[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-muted/60" style={{ animationDelay: `${d * 120}ms` }} />)}
                </div>
              )}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-hair p-3">
              <div className="flex items-end gap-2 rounded-[22px] bg-white px-3 py-2 ring-1 ring-black/10 focus-within:ring-2 focus-within:ring-blue/50">
                <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} rows={1} dir="auto" maxLength={1200}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); } }}
                  placeholder={ar ? "اكتب سؤالك هنا..." : "Type your question..."} aria-label={ar ? "رسالتك" : "Your message"}
                  className="max-h-32 min-h-[1.75rem] flex-1 resize-none bg-transparent py-1 text-[15px] outline-none" />
                <button disabled={busy || !input.trim()} className="btn-primary grid h-9 w-9 shrink-0 place-items-center disabled:opacity-40" aria-label={ar ? "إرسال" : "Send"}>
                  <span aria-hidden className={ar ? "-scale-x-100" : ""}>➤</span>
                </button>
              </div>
              <p className="mt-1.5 px-2 text-[11px] text-muted">{ar ? "المستشار يعتمد على بيانات أراضينا. للتفاصيل القانونية كلّم فريقنا." : "Answers come from our listings. For legal details, talk to our team."}</p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/** Investor and admin conversations are kept apart: switching areas mounts a fresh widget with its own history. */
export default function ChatRoot() {
  const path = usePathname() ?? "/";
  return <ChatWidget key={path.startsWith("/admin") ? "admin" : "investor"} />;
}
