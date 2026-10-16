"use client";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { postJSON, track } from "@/lib/track";
import { ERR, cleanName, normalizeSaudiMobile } from "@/lib/validate";

/** Captures demand the portfolio can't serve today. Feeds the admin demand-gap view. */
export default function AlertForm({ criteria, title, summary }: { criteria: object; title?: { ar: string; en: string }; summary: { ar: string; en: string } }) {
  const { lang } = useLang();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState<keyof typeof ERR | null>(null);
  const [hp, setHp] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cleanName(name)) { setErr("name"); setState("error"); return; }
    if (!normalizeSaudiMobile(phone)) { setErr("phone"); setState("error"); return; }
    setErr(null);
    setState("sending");
    try {
      await postJSON("/api/alert", { website: hp, name, phone: normalizeSaudiMobile(phone), criteria: { ...criteria, lang } });
      track("alert_created", criteria as Record<string, unknown>);
      setState("done");
    } catch (x) { const c = (x as { code?: string }).code; setErr(c === "phone" || c === "name" ? c : "network"); setState("error"); }
  }

  if (state === "done")
    return (
      <div className="glass rounded-[26px] p-5">
        <p className="text-lg font-semibold">{lang === "ar" ? "أبشر! 🙌" : "You're on the list 🙌"}</p>
        <p className="mt-1 text-muted">{lang === "ar" ? "أول ما تنزل أرض تناسبك بنرسل لك على الواتساب." : "The moment a matching property comes up, we'll WhatsApp you."}</p>
      </div>
    );

  return (
    <form onSubmit={submit} className="glass rounded-[26px] p-5">
      <input type="text" name="website" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <p className="text-lg font-semibold">{(title ?? { ar: "علّمني أول ما تنزل أرض تناسبني", en: "Tell me when a matching property comes up" })[lang]}</p>
      <p className="mt-1 text-[15px] text-muted">{summary[lang]}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input aria-label={lang === "ar" ? "اسمك" : "Your name"} value={name} onChange={(e) => { setName(e.target.value); if (err === "name") { setErr(null); setState("idle"); } }} aria-invalid={err === "name"} placeholder={lang === "ar" ? "اسمك" : "Your name"} className="field" autoComplete="name" />
        <input aria-label={lang === "ar" ? "جوالك" : "Mobile"} inputMode="tel" dir="ltr" value={phone} onChange={(e) => { setPhone(e.target.value); if (err === "phone") { setErr(null); setState("idle"); } }} aria-invalid={err === "phone"} placeholder="05X XXX XXXX" className="field text-start" autoComplete="tel" />
        <button disabled={state === "sending"} className="btn-primary px-6 py-3 font-medium disabled:opacity-60">
          {state === "sending" ? (lang === "ar" ? "لحظة..." : "One sec...") : (lang === "ar" ? "علّمني" : "Notify me")}
        </button>
      </div>
      {state === "error" && err && <p role="alert" className="mt-2 text-sm text-red-600">{ERR[err][lang]}</p>}
    </form>
  );
}
