"use client";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { postJSON, track } from "@/lib/track";

export default function LeadForm({ parcelId, kind = "site_visit" }: { parcelId: string; kind?: "site_visit" | "inquiry" }) {
  const { lang } = useLang();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [time, setTime] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      await postJSON("/api/lead", { name, phone, parcel_id: parcelId, kind, preferred_time: time, source: "parcel_page", lang });
      track("lead_submitted", { kind, source: "parcel_page" }, parcelId);
      setState("done");
    } catch { setState("error"); }
  }

  if (state === "done")
    return (
      <div className="border border-palm bg-sheet p-5">
        <p className="font-semibold">{lang === "ar" ? "تم حجز طلب الزيارة" : "Site visit requested"}</p>
        <p className="mt-1 text-sm text-muted">
          {lang === "ar" ? "سيتصل بك فريق المبيعات خلال يوم عمل لتأكيد الموعد." : "Our sales team will call you within one working day to confirm the time."}
        </p>
      </div>
    );

  const input = "w-full rounded-md border border-line bg-white px-3 py-2.5";
  return (
    <form onSubmit={submit} className="space-y-2.5">
      <label className="block text-sm">
        <span className="mb-1 block text-muted">{lang === "ar" ? "الاسم" : "Name"}</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={input} autoComplete="name" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">{lang === "ar" ? "رقم الجوال" : "Mobile number"}</span>
        <input required inputMode="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05X XXX XXXX" className={`${input} text-start`} autoComplete="tel" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">{lang === "ar" ? "الوقت المناسب للزيارة" : "Best time to visit"}</span>
        <select value={time} onChange={(e) => setTime(e.target.value)} className={input}>
          <option value="">{lang === "ar" ? "أي وقت" : "Any time"}</option>
          <option value="weekday_morning">{lang === "ar" ? "صباح أيام الأسبوع" : "Weekday morning"}</option>
          <option value="weekday_evening">{lang === "ar" ? "مساء أيام الأسبوع" : "Weekday evening"}</option>
          <option value="weekend">{lang === "ar" ? "نهاية الأسبوع" : "Weekend"}</option>
        </select>
      </label>
      <button disabled={state === "sending"} className="w-full rounded-md bg-palm px-4 py-3 font-medium text-white hover:bg-palm-deep disabled:opacity-60">
        {state === "sending" ? (lang === "ar" ? "جارٍ الإرسال" : "Sending") : (lang === "ar" ? "احجز زيارة للأرض" : "Book a site visit")}
      </button>
      {state === "error" && <p className="text-sm text-red-700">{lang === "ar" ? "تعذر الإرسال. تأكد من الاسم ورقم الجوال وحاول مرة أخرى." : "Couldn't send. Check your name and mobile number, then try again."}</p>}
    </form>
  );
}
