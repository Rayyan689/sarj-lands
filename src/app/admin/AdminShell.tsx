"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { formatDate } from "@/lib/time";
import { useToday } from "@/lib/useToday";
import Logo from "@/components/Logo";
import { openChat } from "@/components/ChatWidget";

const I = {
  today: <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" />,
  investors: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.2a4.5 4.5 0 0 1 5 4.8" /></>,
  properties: <><path d="M4 20V9l8-5 8 5v11" /><path d="M9 20v-5h6v5" /><path d="M2.5 20h19" /></>,
  market: <><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>,
  website: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" /></>,
  data: <><path d="M12 3.5 19 6v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6z" /><path d="m8.8 12 2.2 2.2 4.2-4.4" /></>,
  chat: <path d="M5 18.5V6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9z" />,
};
const Icon = ({ d }: { d: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" className="h-[19px] w-[19px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);

const NAV = [
  { href: "/admin", icon: I.today, ar: "اليوم", en: "Today", subAr: "وش يحتاجك الحين", subEn: "What needs you now" },
  { href: "/admin/investors", icon: I.investors, ar: "المستثمرين", en: "Investors", subAr: "مين تكلم ووش تقول", subEn: "Who to contact" },
  { href: "/admin/properties", icon: I.properties, ar: "الأراضي", en: "Properties", subAr: "وش يتحرك ووش واقف", subEn: "What's moving, what's stuck" },
  { href: "/admin/market", icon: I.market, ar: "السوق", en: "Market", subAr: "الطلب ووش نشتري", subEn: "Demand and what to buy" },
  { href: "/admin/website", icon: I.website, ar: "الموقع", en: "Website", subAr: "الزوار ووش يسألون", subEn: "Visitors and questions" },
  { href: "/admin/data", icon: I.data, ar: "جودة البيانات", en: "Data quality", subAr: "وش صححنا وليش", subEn: "What we fixed and why" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { lang, setLang } = useLang();
  const ar = lang === "ar";
  const path = usePathname();
  const today = useToday();
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  const [greet, setGreet] = useState("");
  useEffect(() => {
    const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Riyadh", hour: "numeric", hour12: false }).format(new Date()));
    setGreet(h < 12 ? (ar ? "صباح الخير" : "Good morning") : (ar ? "مساء الخير" : "Good evening"));
  }, [ar]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="glass mx-auto flex h-14 max-w-[1400px] items-center gap-3 rounded-full ps-4 pe-2">
          <Link href="/admin" className="flex items-center gap-3" aria-label={ar ? "لوحة الإدارة، اليوم" : "Admin, today"}>
            <Logo className="h-9 w-auto text-ink" />
            <span className="border-s border-hair ps-3 text-[15px] font-semibold">{ar ? "لوحة الإدارة" : "Admin"}</span>
          </Link>
          <span className="hidden text-[13px] text-muted md:inline">{greet}{greet && today && " · "}{today && formatDate(today, lang)}</span>
          <div className="ms-auto flex items-center gap-1">
            <Link href="/" className="rounded-full px-3 py-2 text-[14px] text-muted hover:bg-white hover:text-ink">{ar ? "الموقع" : "Website"}</Link>
            <button onClick={() => setLang(ar ? "en" : "ar")} className="rounded-full px-3 py-2 text-[14px] text-muted hover:bg-white hover:text-ink">{ar ? "EN" : "عربي"}</button>
          </div>
        </div>
        {/* mobile and tablet: pages as a scrollable row */}
        <nav className="mx-auto mt-2 flex max-w-[1400px] gap-1 overflow-x-auto px-1 pb-1 lg:hidden" aria-label={ar ? "صفحات اللوحة" : "Admin pages"}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium ${active(n.href) ? "bg-ink text-white" : "glass-soft text-ink"}`}>
              <Icon d={n.icon} />{ar ? n.ar : n.en}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-6 px-3 pb-28 pt-5 sm:px-5">
        <aside className="sticky top-[88px] hidden h-[calc(100vh-110px)] w-[244px] shrink-0 flex-col lg:flex">
          <nav className="glass flex flex-col gap-1 rounded-[26px] p-2" aria-label={ar ? "صفحات اللوحة" : "Admin pages"}>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}
                className={`flex items-center gap-3 rounded-[18px] px-3 py-2.5 transition ${active(n.href) ? "bg-ink text-white shadow-sm" : "text-ink hover:bg-white"}`}>
                <Icon d={n.icon} />
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold leading-5">{ar ? n.ar : n.en}</span>
                  <span className={`block truncate text-[12px] ${active(n.href) ? "text-white/70" : "text-muted"}`}>{ar ? n.subAr : n.subEn}</span>
                </span>
              </Link>
            ))}
          </nav>
          <button onClick={() => openChat()} className="glass mt-3 flex items-center gap-3 rounded-[22px] p-3 text-start hover:bg-white">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-apricot-soft text-[#6d531f]"><Icon d={I.chat} /></span>
            <span>
              <span className="block text-[14px] font-semibold">{ar ? "اسأل مساعد الإدارة" : "Ask the admin assistant"}</span>
              <span className="block text-[12px] text-muted">{ar ? "يشوف كل الأرقام اللي هنا" : "Sees every number here"}</span>
            </span>
          </button>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
