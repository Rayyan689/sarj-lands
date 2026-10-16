"use client";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { postJSON, track } from "@/lib/track";
import { ERR, cleanName, normalizeSaudiMobile } from "@/lib/validate";

export default function LeadForm({ parcelId }: { parcelId: string }) {
  const { lang } = useLang();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [time, setTime] = useState("");
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
      await postJSON("/api/lead", { website: hp, name, phone: normalizeSaudiMobile(phone), parcel_id: parcelId, kind: "site_visit", preferred_time: time, source: "parcel_page", lang });
      track("lead_submitted", { kind: "site_visit", source: "parcel_page" }, parcelId);
      setState("done");
    } catch (x) { const c = (x as { code?: string }).code; setErr(c === "phone" || c === "name" ? c : "network"); setState("error"); }
  }

  if (state === "done")
    return (
      <div className="rounded-3xl bg-mint-soft p-5">
        <p className="text-lg font-semibold">{lang === "ar" ? "تم الحجز! 🎉" : "Visit booked! 🎉"}</p>
        <p className="mt-1 text-[15px]">{lang === "ar" ? "بيكلمك أحد من فريقنا خلال يوم عمل ونرتب الموعد سوا." : "Someone from our team will call you within a working day to set the time."}</p>
      </div>
    );

  const times = [
    ["", "أي وقت يناسبكم", "Any time"],
    ["weekday_morning", "الصباح، أيام الدوام", "Weekday morning"],
    ["weekday_evening", "العصر أو المغرب، أيام الدوام", "Weekday afternoon"],
    ["weekend", "الويكند", "Weekend"],
  ];
  return (
    <form onSubmit={submit} className="space-y-2.5">
      <input type="text" name="website" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <p className="text-lg font-semibold">{lang === "ar" ? "ودّك تشوفها على الطبيعة؟" : "Want to see it in person?"}</p>
      <input aria-label={lang === "ar" ? "اسمك" : "Your name"} value={name} onChange={(e) => { setName(e.target.value); if (err === "name") { setErr(null); setState("idle"); } }} aria-invalid={err === "name"} placeholder={lang === "ar" ? "اسمك" : "Your name"} className="field" autoComplete="name" />
      <input aria-label={lang === "ar" ? "جوالك" : "Mobile"} inputMode="tel" dir="ltr" value={phone} onChange={(e) => { setPhone(e.target.value); if (err === "phone") { setErr(null); setState("idle"); } }} aria-invalid={err === "phone"} placeholder="05X XXX XXXX" className="field text-start" autoComplete="tel" />
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={lang === "ar" ? "الوقت المناسب" : "Best time"}>
        {times.map(([v, ar, en]) => (
          <button type="button" key={v} role="radio" aria-checked={time === v} onClick={() => setTime(v)}
            className={`bubble px-3 py-1.5 text-[13px] ${time === v ? "bubble-on" : ""}`}>{lang === "ar" ? ar : en}</button>
        ))}
      </div>
      <button disabled={state === "sending"} className="btn-primary w-full px-4 py-3.5 text-[16px] font-semibold disabled:opacity-60">
        {state === "sending" ? (lang === "ar" ? "لحظة..." : "One sec...") : (lang === "ar" ? "احجز زيارة للأرض" : "Book a site visit")}
      </button>
      {state === "error" && err && <p role="alert" className="text-sm text-red-600">{ERR[err][lang]}</p>}
    </form>
  );
}
