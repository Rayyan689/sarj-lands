"use client";
import { useLang } from "@/lib/i18n";
import { waLink } from "@/lib/contact";
import { portfolio } from "@/lib/portfolio";

export default function Footer() {
  const { lang } = useLang();
  const date = new Date(portfolio.snapshot_date).toLocaleDateString(lang === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <footer className="px-3 pb-4 pt-10 sm:px-5">
      <div className="glass-soft mx-auto flex max-w-6xl flex-col gap-3 rounded-[28px] px-6 py-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>{lang === "ar" ? `سرج العقارية، الرياض. الأسعار والتوفر محدّثة لين ${date}.` : `Sarj Real Estate, Riyadh. Prices and availability as of ${date}.`}</p>
        <a href={waLink(lang === "ar" ? "هلا" : "Hi")} target="_blank" rel="noopener" className="font-medium text-ink hover:text-blue" dir="ltr">
          +966 53 566 2255
        </a>
      </div>
    </footer>
  );
}
