"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { getConsent, setConsent } from "@/lib/track";

export default function CookieNotice() {
  const { lang } = useLang();
  const [show, setShow] = useState(false);
  useEffect(() => { if (getConsent() === null) setShow(true); }, []);
  if (!show) return null;
  const ar = lang === "ar";
  const choose = (c: "all" | "essential") => { setConsent(c); setShow(false); };
  return (
    <div role="dialog" aria-live="polite" aria-label={ar ? "تنبيه الكوكيز" : "Cookie notice"}
      className="step-in fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:bottom-5 sm:start-5 sm:max-w-sm">
      <div className="glass rounded-[24px] p-4">
        <p className="text-[14px] leading-relaxed">
          <span aria-hidden>🍪 </span>
          {ar
            ? "نستخدم كوكيز بسيطة عشان الموقع يشتغل صح، ونعرف وش يعجب الزوار ونحسّنه. ما نبيع بياناتك لأحد."
            : "We use a few simple cookies so the site works and we can see what visitors like. We never sell your data."}{" "}
          <Link href="/privacy" className="text-blue underline-offset-2 hover:underline">{ar ? "التفاصيل" : "Details"}</Link>
        </p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => choose("all")} className="btn-primary flex-1 px-4 py-2 text-[14px] font-medium">{ar ? "تمام" : "Sounds good"}</button>
          <button onClick={() => choose("essential")} className="bubble flex-1 px-4 py-2 text-[14px]">{ar ? "بس الضرورية" : "Essential only"}</button>
        </div>
      </div>
    </div>
  );
}
