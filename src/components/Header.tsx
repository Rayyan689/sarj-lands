"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";
import { waLink } from "@/lib/contact";
import { track } from "@/lib/track";
import Logo from "./Logo";

export default function Header() {
  const { lang, setLang } = useLang();
  const path = usePathname();
  const nav = [
    { href: "/lands", ar: "كل الأراضي", en: "All properties" },
  ];
  return (
    <>
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <div className="glass mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full ps-4 pe-2 sm:gap-4">
        <Link href="/" className="flex items-center text-ink" aria-label={lang === "ar" ? "سرج العقارية، الصفحة الرئيسية" : "Sarj Real Estate, home"}>
          <Logo className="h-9 w-auto sm:h-10" />
        </Link>
        <nav className="ms-1 flex gap-1 sm:ms-2">
          {nav.map((n) => (
            <Link key={n.href} href={n.href}
              className={`whitespace-nowrap rounded-full px-3 py-2 text-[14px] transition-colors sm:px-4 sm:text-[15px] ${path?.startsWith(n.href) ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
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

    </>
  );
}
