"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";
import { waLink } from "@/lib/contact";
import { track } from "@/lib/track";

export default function Header() {
  const { lang, setLang } = useLang();
  const path = usePathname();
  const nav = [
    { href: "/match", ar: "اختر لي أرضاً", en: "Find my land" },
    { href: "/lands", ar: "كل الأراضي", en: "All land" },
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-stone/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
            <rect x="2" y="2" width="24" height="24" fill="none" stroke="var(--ink)" strokeWidth="2" />
            <rect x="9" y="9" width="10" height="10" fill="var(--sun)" />
          </svg>
          <span className="font-display text-xl font-semibold leading-none">
            {lang === "ar" ? "سرج العقارية" : "Sarj Real Estate"}
          </span>
        </Link>
        <nav className="hidden gap-1 sm:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href}
              className={`rounded-md px-3 py-2 text-sm ${path?.startsWith(n.href) ? "bg-stone-2 text-ink" : "text-muted hover:text-ink"}`}>
              {n[lang]}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <a href={waLink(lang === "ar" ? "السلام عليكم، أبحث عن أرض في الرياض" : "Hello, I'm looking for land in Riyadh")}
            target="_blank" rel="noopener" onClick={() => track("whatsapp_click", { from: "header" })}
            className="hidden rounded-md bg-palm px-3.5 py-2 text-sm text-white hover:bg-palm-deep sm:inline-block">
            {lang === "ar" ? "تحدث معنا عبر واتساب" : "WhatsApp us"}
          </a>
          <button onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="rounded-md border border-line px-3 py-2 text-sm hover:bg-stone-2" lang={lang === "ar" ? "en" : "ar"}>
            {lang === "ar" ? "English" : "العربية"}
          </button>
        </div>
      </div>
      <nav className="flex gap-1 border-t border-line px-4 py-1.5 sm:hidden">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className={`flex-1 rounded-md py-1.5 text-center text-sm ${path?.startsWith(n.href) ? "bg-stone-2" : "text-muted"}`}>
            {n[lang]}
          </Link>
        ))}
      </nav>
    </header>
  );
}
