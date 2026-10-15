"use client";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { postJSON, track } from "@/lib/track";

/** Captures demand the portfolio can't serve today. Feeds the admin demand-gap view. */
export default function AlertForm({ criteria, summary }: { criteria: object; summary: { ar: string; en: string } }) {
  const { lang } = useLang();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      await postJSON("/api/alert", { name, phone, criteria: { ...criteria, lang } });
      track("alert_created", criteria as Record<string, unknown>);
      setState("done");
    } catch { setState("error"); }
  }

  if (state === "done")
    return (
      <div className="border border-palm bg-sheet p-5">
        <p className="font-semibold">{lang === "ar" ? "تم حفظ طلبك" : "Your request is saved"}</p>
        <p className="mt-1 text-sm text-muted">
          {lang === "ar" ? "سنتواصل معك على واتساب فور توفر أرض تطابق طلبك." : "We'll message you on WhatsApp as soon as matching land comes up."}
        </p>
      </div>
    );

  return (
    <form onSubmit={submit} className="border border-line bg-sheet p-5">
      <p className="font-semibold">{lang === "ar" ? "أبلغني عند توفر أرض مناسبة" : "Tell me when matching land comes up"}</p>
      <p className="mt-1 text-sm text-muted">{summary[lang]}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <label className="sr-only" htmlFor="al-name">{lang === "ar" ? "الاسم" : "Name"}</label>
        <input id="al-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === "ar" ? "الاسم" : "Name"}
          className="rounded-md border border-line bg-white px-3 py-2.5" />
        <label className="sr-only" htmlFor="al-phone">{lang === "ar" ? "رقم الجوال" : "Mobile number"}</label>
        <input id="al-phone" required inputMode="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05X XXX XXXX"
          className="rounded-md border border-line bg-white px-3 py-2.5 text-start" />
        <button disabled={state === "sending"} className="rounded-md bg-palm px-4 py-2.5 text-white hover:bg-palm-deep disabled:opacity-60">
          {state === "sending" ? (lang === "ar" ? "جارٍ الحفظ" : "Saving") : (lang === "ar" ? "أبلغني" : "Notify me")}
        </button>
      </div>
      {state === "error" && <p className="mt-2 text-sm text-red-700">{lang === "ar" ? "تعذر الحفظ. تأكد من الاسم ورقم الجوال وحاول مرة أخرى." : "Couldn't save. Check your name and mobile number, then try again."}</p>}
    </form>
  );
}
