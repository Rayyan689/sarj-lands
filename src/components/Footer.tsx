"use client";
import { useLang } from "@/lib/i18n";
import { waLink } from "@/lib/contact";
import { portfolio } from "@/lib/portfolio";

export default function Footer() {
  const { lang } = useLang();
  return (
    <footer className="border-t border-line bg-ink text-white/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          {lang === "ar"
            ? `سرج العقارية، الرياض. بيانات المحفظة محدّثة حتى ${new Date(portfolio.snapshot_date).toLocaleDateString("ar-SA-u-nu-latn-ca-gregory", { day: "numeric", month: "long", year: "numeric" })}.`
            : `Sarj Real Estate, Riyadh. Portfolio data as of ${new Date(portfolio.snapshot_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`}
        </p>
        <a href={waLink(lang === "ar" ? "السلام عليكم" : "Hello")} target="_blank" rel="noopener" className="text-white underline underline-offset-4" dir="ltr">
          +966 53 566 2255
        </a>
      </div>
    </footer>
  );
}
