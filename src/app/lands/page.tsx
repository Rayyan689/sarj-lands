"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import ParcelMap from "@/components/ParcelMap";
import ParcelCard from "@/components/ParcelCard";
import { useLang } from "@/lib/i18n";
import { AREAS, parcels, type Area, type Deal, type LandType } from "@/lib/portfolio";
import { AREA_LABEL, num } from "@/lib/format";
import { track } from "@/lib/track";

type Sort = "fit" | "price_asc" | "price_desc" | "size_desc" | "value";

function Explorer() {
  const { lang } = useLang();
  const sp = useSearchParams();
  const [area, setArea] = useState<Area | "all">((sp.get("area") as Area) || "all");
  const [deal, setDeal] = useState<Deal | "all">((sp.get("deal") as Deal) || "all");
  const [type, setType] = useState<LandType | "all">((sp.get("type") as LandType) || "all");
  const [showClosed, setShowClosed] = useState(sp.get("closed") === "1");
  const [sort, setSort] = useState<Sort>("fit");
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => { track("page_view", { page: "explorer" }); }, []);
  useEffect(() => { track("explorer_filter", { area, deal, type, showClosed, sort }); }, [area, deal, type, showClosed, sort]);

  const list = useMemo(() => {
    const rank = { available: 0, reserved: 1, sold: 2, leased: 2 } as const;
    const xs = parcels.filter((p) =>
      (area === "all" || p.area_of_city === area) && (deal === "all" || p.listing_type === deal) &&
      (type === "all" || p.land_type === type) && (showClosed || p.status === "available" || p.status === "reserved"));
    const price = (p: (typeof xs)[number]) => p.total_price_sar ?? Infinity;
    return xs.sort((a, b) => {
      const s = rank[a.status] - rank[b.status];
      if (s) return s;
      if (sort === "price_asc") return price(a) - price(b);
      if (sort === "price_desc") return (b.total_price_sar ?? 0) - (a.total_price_sar ?? 0);
      if (sort === "size_desc") return b.area_sqm - a.area_sqm;
      if (sort === "value") return (a.pricing.vs_area_pct ?? 999) - (b.pricing.vs_area_pct ?? 999);
      return a.listing_age_days - b.listing_age_days; // newest first
    });
  }, [area, deal, type, showClosed, sort]);

  const ids = useMemo(() => new Set(list.map((p) => p.parcel_id)), [list]);
  const sel_ = (on: boolean) => `rounded-md border px-3 py-1.5 text-sm ${on ? "border-ink bg-ink text-white" : "border-line bg-sheet hover:border-ink"}`;

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="min-w-0">
        <div className="sticky top-16 z-20 space-y-3 border-b border-line bg-stone px-4 py-4 sm:px-6">
          <div className="flex flex-wrap gap-1.5">
            <button className={sel_(area === "all")} onClick={() => setArea("all")}>{lang === "ar" ? "كل الرياض" : "All Riyadh"}</button>
            {AREAS.map((a) => (
              <button key={a} className={sel_(area === a)} onClick={() => setArea(a)}>{AREA_LABEL[a][lang].replace(" الرياض", "").replace(" Riyadh", "")}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {([["all", "الكل", "All"], ["sale", "للبيع", "For sale"], ["lease", "للإيجار", "For lease"]] as const).map(([v, ar, en]) => (
              <button key={v} className={sel_(deal === v)} onClick={() => setDeal(v)}>{lang === "ar" ? ar : en}</button>
            ))}
            <span className="mx-1 h-5 w-px bg-line" />
            {([["all", "كل الأنواع", "All types"], ["residential", "سكني", "Residential"], ["commercial", "تجاري", "Commercial"]] as const).map(([v, ar, en]) => (
              <button key={v} className={sel_(type === v)} onClick={() => setType(v)}>{lang === "ar" ? ar : en}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} className="accent-[var(--palm)]" />
              {lang === "ar" ? "أظهر المباعة والمؤجرة للمقارنة" : "Show sold and leased, for comparison"}
            </label>
            <label className="flex items-center gap-2">
              <span className="text-muted">{lang === "ar" ? "الترتيب" : "Sort"}</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-md border border-line bg-sheet px-2 py-1.5">
                <option value="fit">{lang === "ar" ? "الأحدث" : "Newest"}</option>
                <option value="value">{lang === "ar" ? "الأفضل سعراً مقارنة بالمنطقة" : "Best value for the area"}</option>
                <option value="price_asc">{lang === "ar" ? "السعر: الأقل أولاً" : "Price: low to high"}</option>
                <option value="price_desc">{lang === "ar" ? "السعر: الأعلى أولاً" : "Price: high to low"}</option>
                <option value="size_desc">{lang === "ar" ? "المساحة: الأكبر أولاً" : "Size: largest first"}</option>
              </select>
            </label>
          </div>
        </div>
        <p className="px-4 pt-4 text-sm text-muted sm:px-6">
          {lang === "ar" ? `${num(list.length, lang)} أرض` : `${list.length} parcels`}
        </p>
        {list.length ? (
          <div className="mx-4 my-3 space-y-px border border-line bg-line sm:mx-6">
            {list.map((p) => <ParcelCard key={p.parcel_id} p={p} onHover={setSel} selected={sel === p.parcel_id} from="explorer" />)}
          </div>
        ) : (
          <div className="mx-4 my-6 border border-line bg-sheet p-6 sm:mx-6">
            <p className="font-semibold">{lang === "ar" ? "لا توجد أراضٍ بهذه المواصفات" : "No land matches these filters"}</p>
            <p className="mt-1 text-sm text-muted">
              {lang === "ar" ? "جرّب منطقة أخرى، أو اعرض المباعة والمؤجرة لتعرف أسعار المنطقة." : "Try another area, or show sold and leased land to see prices in this area."}
            </p>
          </div>
        )}
      </div>
      <div className="order-first h-[42vh] border-line lg:order-none lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:border-s">
        <ParcelMap parcels={parcels} highlight={ids} selected={sel} onSelect={(id) => { setSel(id); document.getElementById(`card-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" }); }}
          fit showBasemapToggle basemap="streets" className="h-full" />
      </div>
    </div>
  );
}

export default function LandsPage() {
  return (
    <>
      <Header />
      <main className="flex-1"><Suspense fallback={<div className="p-10" />}><Explorer /></Suspense></main>
    </>
  );
}
