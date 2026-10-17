"use client";
import { useEffect, useState } from "react";
import { openChat } from "@/components/ChatWidget";
import { Avatar } from "@/components/ConsultantHero";
import { formatDate } from "@/lib/time";
import type { Lang } from "./ui";

/** The AI's morning letter to the owner, written once a day from the live numbers. */
export default function MorningLetter({ lang, today }: { lang: Lang; today: string }) {
  const ar = lang === "ar";
  const [body, setBody] = useState<string | null>(null);
  const [shown, setShown] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let off = false;
    setBody(null); setShown(0); setFailed(false);
    fetch(`/api/admin/brief?lang=${lang}`, { headers: { "x-sarj-admin": "1" } })
      .then((r) => r.json()).then((d) => { if (!off) { if (d.body) setBody(d.body); else setFailed(true); } })
      .catch(() => { if (!off) setFailed(true); });
    return () => { off = true; };
  }, [lang]);

  // Reveal it like it's being written, quickly.
  useEffect(() => {
    if (!body) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setShown(body.length); return; }
    let i = 0;
    const id = setInterval(() => { i = Math.min(body.length, i + Math.ceil(body.length / 70)); setShown(i); if (i >= body.length) clearInterval(id); }, 22);
    return () => clearInterval(id);
  }, [body]);

  if (failed) return null;
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-[#fffdf8] p-6 shadow-[0_1px_0_rgba(31,31,31,.04),0_12px_40px_-18px_rgba(140,106,47,.35)] ring-1 ring-[#e9dcc2] sm:p-7" aria-label={ar ? "رسالة الصباح" : "Morning letter"}>
      <div className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-apricot/15 blur-2xl" />
      <div className="flex items-center gap-3">
        <Avatar size={38} />
        <div>
          <p className="font-semibold leading-5">{ar ? "رسالة الصباح من مساعدك" : "Your morning letter"}</p>
          <p className="text-[12px] text-muted">{formatDate(today, lang)} · {ar ? "كتبها الذكاء الاصطناعي من أرقام اليوم" : "written by AI from today's numbers"}</p>
        </div>
        <button onClick={() => openChat(ar ? "عطني تفاصيل أكثر عن أولويات اليوم" : "Tell me more about today's priorities")} className="bubble ms-auto hidden px-3 py-1.5 text-[13px] sm:block">{ar ? "اسأله عنها" : "Ask about it"}</button>
      </div>
      {body == null ? (
        <div className="mt-5 space-y-2.5" aria-busy="true">
          {[92, 100, 85, 96, 60].map((w, i) => <div key={i} className="h-3.5 animate-pulse rounded-full bg-[#efe6d4]" style={{ width: `${w}%` }} />)}
          <p className="pt-1 text-[13px] text-muted">{ar ? "يكتب لك رسالة اليوم…" : "Writing today's letter…"}</p>
        </div>
      ) : (
        <p className="mt-4 whitespace-pre-line text-[16px] leading-[1.95] text-[#2a2620]" dir="auto">
          {body.slice(0, shown)}{shown < body.length && <span className="ms-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-apricot" />}
        </p>
      )}
    </section>
  );
}
