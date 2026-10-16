"use client";
// Shared building blocks for the admin pages.
import Link from "next/link";
import { useEffect, useState } from "react";
import { num } from "@/lib/format";

export type T = { ar: string; en: string };
export type Lang = "ar" | "en";

export const STATUS_T: Record<string, T> = { new: { ar: "جديد", en: "New" }, contacted: { ar: "تواصلنا", en: "Contacted" }, negotiating: { ar: "تفاوض", en: "Negotiating" } };
export const INTENT_T: Record<string, T> = { "ready to move": { ar: "جاهز", en: "Ready" }, "comparing options": { ar: "يقارن", en: "Comparing" }, exploring: { ar: "يستكشف", en: "Exploring" } };
export const CHANNEL_T: Record<string, T> = { "phone call": { ar: "اتصال", en: "Phone" }, "walk-in": { ar: "زيارة للمكتب", en: "Walk-in" }, whatsapp: { ar: "واتساب", en: "WhatsApp" }, "website form": { ar: "نموذج الموقع القديم", en: "Old website form" } };
export const EVENT_T: Record<string, T> = {
  page_view: { ar: "زاروا الموقع", en: "Visited" }, match_started: { ar: "بدأوا الأسئلة", en: "Started matching" },
  match_completed: { ar: "كملوا الأسئلة", en: "Finished matching" }, parcel_view: { ar: "فتحوا أرض", en: "Opened a property" },
  chat_open: { ar: "فتحوا المستشار", en: "Opened the advisor" }, lead_submitted: { ar: "طلبوا زيارة", en: "Requested a visit" },
};

/** Inventory status colors: brand neutrals plus a sage for leases. Every use is direct-labeled. */
export const STATUS_COLOR = { available: "#b07f2c", reserved: "#d8c8a6", sold: "#2b2b2b", leased: "#7f9a6e" } as const;

export function PageHeader({ title, sub, children }: { title: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">{title}</h1>
        <p className="mt-1 max-w-2xl text-[15px] text-muted">{sub}</p>
      </div>
      {children}
    </div>
  );
}

export function Card({ title, sub, action, children, className = "" }: { title?: string; sub?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass rounded-[24px] p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && <h2 className="text-[17px] font-semibold">{title}</h2>}
            {sub && <p className="text-[13px] text-muted">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Pill({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "gold" | "dark" }) {
  const c = tone === "gold" ? "bg-apricot-soft text-[#6d531f]" : tone === "dark" ? "bg-ink text-white" : "bg-ink/5 text-muted";
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium ${c}`}>{children}</span>;
}

export function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-white">{children} <span aria-hidden className="inline-block rtl:rotate-180">→</span></Link>;
}

/** Segmented tabs that keep the choice in the URL (?tab=), so links from "Today" land on the right one. */
export function Tabs<K extends string>({ tabs, value, onChange, label }: { tabs: { id: K; label: string; count?: number }[]; value: K; onChange: (k: K) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="glass-soft mb-5 inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={`whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-medium transition ${value === t.id ? "bg-ink text-white shadow-sm" : "text-muted hover:bg-white hover:text-ink"}`}>
          {t.label}{t.count != null && <span className={`ms-1.5 rounded-full px-1.5 text-[12px] ${value === t.id ? "bg-white/20" : "bg-ink/5"}`}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function useTab<K extends string>(initial: string | undefined, ids: readonly K[]) {
  const [tab, setTab] = useState<K>(ids.includes(initial as K) ? (initial as K) : ids[0]);
  const change = (k: K) => {
    setTab(k);
    try { history.replaceState(null, "", `${location.pathname}?tab=${k}`); } catch {}
  };
  return [tab, change] as const;
}

/** Rent not collected since listing, ticking up every second. */
export function VacancyClock({ base, perDay, lang }: { base: number; perDay: number; lang: Lang }) {
  const [v, setV] = useState(base);
  useEffect(() => {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Riyadh", hour: "numeric", minute: "numeric", second: "numeric", hour12: false }).formatToParts(new Date());
    const g = (t: string) => Number(parts.find((x) => x.type === t)?.value ?? 0);
    const start = base + perDay * ((g("hour") * 3600 + g("minute") * 60 + g("second")) / 86400);
    const t0 = Date.now();
    const id = setInterval(() => setV(start + perDay * ((Date.now() - t0) / 86_400_000)), 1000);
    return () => clearInterval(id);
  }, [base, perDay]);
  return <span className="tabular-nums">{lang === "ar" ? `${num(Math.floor(v), "ar")} ريال` : `SAR ${num(Math.floor(v), "en")}`}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-white/60 px-4 py-6 text-center text-[14px] text-muted">{children}</p>;
}

export const whenFmt = (d: string, lang: Lang) => new Date(d).toLocaleString(lang === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { timeZone: "Asia/Riyadh", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
