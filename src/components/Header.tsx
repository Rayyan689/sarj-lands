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
    { href: "/match", ar: "طلّع لي أرض", en: "Find my property" },
    { href: "/lands", ar: "كل الأراضي", en: "All properties" },
  ];
  return (
    <>
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <div className="glass mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full ps-4 pe-2 sm:gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-b from-[#d6b475] to-[#b4893f] text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.5)]">س</span>
          <span className="text-[17px] font-semibold">{lang === "ar" ? "سرج العقارية" : "Sarj Real Estate"}</span>
        </Link>
        <nav className="ms-2 hidden gap-1 sm:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href}
              className={`rounded-full px-4 py-2 text-[15px] transition-colors ${path?.startsWith(n.href) ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
              {n[lang]}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-1.5">
          <a href={waLink(lang === "ar" ? "هلا، أدوّر أرض بالرياض" : "Hi, I'm looking for a property in Riyadh")}
            target="_blank" rel="noopener" onClick={() => track("whatsapp_click", { from: "header" })}
            className="btn-wa hidden px-4 py-2 text-[15px] sm:inline-block">
            {lang === "ar" ? "كلّمنا واتساب" : "WhatsApp us"}
          </a>
          <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} lang={lang === "ar" ? "en" : "ar"}
            className="rounded-full px-3.5 py-2 text-[15px] text-muted hover:bg-white hover:text-ink">
            {lang === "ar" ? "EN" : "عربي"}
          </button>
        </div>
      </div>
    </header>
      <nav className="glass-soft mx-3 mt-2 flex gap-1 rounded-full p-1 sm:hidden">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className={`flex-1 rounded-full py-2 text-center text-sm ${path?.startsWith(n.href) ? "bg-white shadow-sm" : "text-muted"}`}>
            {n[lang]}
          </Link>
        ))}
      </nav>
    </>
  );
}
