"use client";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { waLink } from "@/lib/contact";
import { formatDate } from "@/lib/time";
import { useToday } from "@/lib/useToday";

export default function Footer() {
  const { lang } = useLang();
  const today = useToday();
  const ar = lang === "ar";
  return (
    <footer className="px-3 pb-4 pt-10 sm:px-5">
      <div className="glass-soft mx-auto flex max-w-6xl flex-col gap-3 rounded-[28px] px-6 py-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          {ar ? "سرج العقارية، الرياض." : "Sarj Real Estate, Riyadh."}
          {today && <span> {ar ? `الأسعار والتوفر محدّثة، ${formatDate(today, lang)}.` : `Prices and availability up to date, ${formatDate(today, lang)}.`}</span>}
        </p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-ink">{ar ? "الخصوصية والكوكيز" : "Privacy & cookies"}</Link>
          <a href={waLink(ar ? "هلا" : "Hi")} target="_blank" rel="noopener" className="font-medium text-ink hover:text-blue" dir="ltr">
            +966 53 566 2255
          </a>
        </div>
      </div>
    </footer>
  );
}
