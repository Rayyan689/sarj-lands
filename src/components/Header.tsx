"use client";
import { useLang } from "@/lib/i18n";

export default function Header() {
  const { lang, setLang } = useLang();
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <span className="text-lg font-semibold">{lang === "ar" ? "سرج العقارية" : "Sarj Real Estate"}</span>
      <button
        onClick={() => setLang(lang === "ar" ? "en" : "ar")}
        className="rounded-full border border-black/15 px-4 py-1.5 text-sm hover:bg-black/5"
      >
        {lang === "ar" ? "English" : "العربية"}
      </button>
    </header>
  );
}
