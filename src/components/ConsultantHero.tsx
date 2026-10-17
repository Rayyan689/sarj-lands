"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n";
import { available } from "@/lib/portfolio";
import { saveProfile } from "@/lib/profile";
import { track } from "@/lib/track";
import MatchFlow from "./MatchFlow";
import Logo from "./Logo";

type Phase = "idle" | "thinking" | "answer" | "ask";

const EXAMPLES = {
  ar: ["أبي أبني بيت لعيالي بالشمال، ميزانيتي 3 مليون", "مستودع للإيجار قريب من المطار", "عمارة شقق للإيجار، قريبة من العليا", "معرض سيارات على شارع رئيسي"],
  en: ["A family home in the north, budget 3 million", "A warehouse to lease near the airport", "An apartment building near Olaya", "A car showroom on a main road"],
};

export function Avatar({ size = 40 }: { size?: number }) {
  return (
    <span className="relative grid shrink-0 place-items-center rounded-full bg-ink text-white" style={{ width: size, height: size }}>
      <Logo variant="mark" className="h-auto w-[68%]" title="" />
      <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#3fbf6f]" />
    </span>
  );
}

/** The homepage starts as a conversation with the consultant, not a form. */
export default function ConsultantHero() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const router = useRouter();
  const [mode, setMode] = useState<"talk" | "taps">("talk");
  const [text, setText] = useState("");
  const [said, setSaid] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [reply, setReply] = useState("");
  const [step, setStep] = useState(0);
  const [ph, setPh] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { const id = setInterval(() => setPh((x) => (x + 1) % 4), 3200); return () => clearInterval(id); }, []);
  useEffect(() => {
    if (phase !== "thinking") return;
    setStep(0);
    const id = setInterval(() => setStep((s) => Math.min(s + 1, 2)), 750);
    return () => clearInterval(id);
  }, [phase]);

  const send = async (msg: string) => {
    const t = msg.trim();
    if (t.length < 3 || phase === "thinking") return;
    setSaid(t); setText(""); setPhase("thinking"); setReply("");
    track("match_started", { via: "consultant" });
    const started = Date.now();
    try {
      const res = await fetch("/api/understand", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: t, lang }) });
      if (!res.ok) throw new Error(String(res.status));
      const r = await res.json();
      await new Promise((ok) => setTimeout(ok, Math.max(0, 2300 - (Date.now() - started))));
      setReply(r.reply);
      if (!r.understood) { setPhase("ask"); setTimeout(() => inputRef.current?.focus(), 50); return; }
      saveProfile({ use: r.use, deal: r.deal, area: r.area, budget: r.budget, anchor: r.anchor, family: r.family, said: t, summary: r.reply });
      setPhase("answer");
      track("match_completed", { via: "consultant", use: r.use, deal: r.deal, area: r.area, budget: r.budget, near: r.anchor });
      const q = new URLSearchParams({ use: r.use, deal: r.deal, area: r.area });
      if (r.budget) q.set("budget", String(r.budget));
      if (r.anchor) q.set("near", r.anchor);
      setTimeout(() => router.push(`/match?${q}`), 1600);
    } catch {
      setReply(ar ? "معليش، ما قدرت أفهم طلبك الحين. خلنا نسويها بأربع ضغطات بدالها." : "Sorry, I couldn't read that right now. Let's do it in four taps instead.");
      setPhase("ask");
      setTimeout(() => setMode("taps"), 1800);
    }
  };

  const steps = ar
    ? ["قريت طلبك", `أدوّر بين ${available.length} أرض متاحة`, "أرتّب لك الأنسب"]
    : ["Read your request", `Searching ${available.length} available properties`, "Ranking the best fits"];

  return (
    <div>
      <div className="flex items-center gap-3">
        <Avatar />
        <div className="min-w-0">
          <p className="font-semibold leading-5">{ar ? "مستشار سرج" : "Sarj consultant"}</p>
          <p className="text-[12px] text-muted">{ar ? "متصل الحين" : "Online"}<span className="hidden sm:inline">{ar ? " · يعرف كل أرض عندنا" : " · knows every property we have"}</span></p>
        </div>
        <div className="glass-soft ms-auto inline-flex rounded-full p-1 text-[13px]" role="tablist" aria-label={ar ? "طريقة البحث" : "How to search"}>
          <button role="tab" aria-selected={mode === "talk"} onClick={() => setMode("talk")} className={`whitespace-nowrap rounded-full px-3 py-1.5 ${mode === "talk" ? "bg-ink text-white" : "text-muted"}`}>{ar ? "اكتب له" : "Type"}</button>
          <button role="tab" aria-selected={mode === "taps"} onClick={() => setMode("taps")} className={`whitespace-nowrap rounded-full px-3 py-1.5 ${mode === "taps" ? "bg-ink text-white" : "text-muted"}`}>{ar ? "اختيارات" : "Choices"}</button>
        </div>
      </div>

      {mode === "taps" ? (
        <div className="step-in mt-5"><MatchFlow /></div>
      ) : (
        <div className="mt-4 space-y-3" aria-live="polite">
          <div className="step-in max-w-[92%] rounded-[22px] rounded-ss-md bg-white/85 px-4 py-3 text-[16px] leading-relaxed shadow-sm">
            {ar ? <>هلا والله! قل لي <b className="font-semibold">بكلامك</b> وش ببالك: وش ناوي تسوي بالأرض، وين تقريباً، وكم ميزانيتك. وأنا أدوّر لك.</>
              : <>Hi! Tell me <b className="font-semibold">in your own words</b> what you have in mind: what you want to do with the land, roughly where, and your budget. I&apos;ll find it.</>}
          </div>

          {said && (
            <div className="step-in ms-auto w-fit max-w-[88%] rounded-[22px] rounded-se-md bg-ink px-4 py-3 text-[15px] leading-relaxed text-white" dir="auto">{said}</div>
          )}

          {phase === "thinking" && (
            <div className="step-in max-w-[92%] rounded-[22px] rounded-ss-md bg-white/85 px-4 py-3 shadow-sm">
              <ul className="space-y-1.5 text-[14px]">
                {steps.map((s, i) => (
                  <li key={s} className={`flex items-center gap-2 transition-opacity ${i <= step ? "opacity-100" : "opacity-30"}`}>
                    <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${i < step ? "bg-ink text-white" : "bg-ink/10"}`}>{i < step ? "✓" : <span className={i === step ? "h-1.5 w-1.5 animate-pulse rounded-full bg-ink" : ""} />}</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(phase === "answer" || phase === "ask") && reply && (
            <div className="step-in max-w-[92%] rounded-[22px] rounded-ss-md bg-white/85 px-4 py-3 text-[16px] leading-relaxed shadow-sm" dir="auto">
              {reply}
              {phase === "answer" && <span className="mt-2 flex items-center gap-2 text-[13px] text-muted"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-apricot" />{ar ? "أفتح لك النتائج…" : "Opening your results…"}</span>}
            </div>
          )}

          {phase !== "answer" && phase !== "thinking" && (
            <>
              <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="relative mt-2">
                <label htmlFor="ask-consultant" className="sr-only">{ar ? "اكتب طلبك للمستشار" : "Tell the consultant what you want"}</label>
                <textarea id="ask-consultant" ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={600}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
                  placeholder={EXAMPLES[lang][ph]} dir={ar ? "rtl" : "ltr"}
                  className="field block min-h-[64px] w-full resize-none rounded-[24px] py-4 pe-16 ps-5 text-[16px] leading-relaxed" />
                <button type="submit" disabled={text.trim().length < 3} aria-label={ar ? "أرسل" : "Send"}
                  className="btn-primary absolute bottom-3 end-3 grid h-11 w-11 place-items-center rounded-full text-white disabled:opacity-35">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              </form>
              {!said && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="py-1.5 text-[13px] text-muted">{ar ? "جرّب:" : "Try:"}</span>
                  {EXAMPLES[lang].slice(0, 3).map((x) => (
                    <button key={x} onClick={() => send(x)} className="bubble px-3 py-1.5 text-[13px]">{x}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
