"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import ParcelMap from "@/components/ParcelMap";
import ParcelCard from "@/components/ParcelCard";
import { useLang } from "@/lib/i18n";
import { AREAS, parcels, type Area, type Deal, type LandType } from "@/lib/portfolio";
import { AREA_SHORT, num } from "@/lib/format";
import { track } from "@/lib/track";

type Sort = "new" | "price_asc" | "price_desc" | "size_desc" | "value";

function Seg<V extends string>({ value, onChange, options }: { value: V; onChange: (v: V) => void; options: [V, string][] }) {
  return (
    <div className="glass-soft inline-flex flex-wrap gap-0.5 rounded-full p-1">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`rounded-full px-3.5 py-1.5 text-[14px] transition-colors ${value === v ? "bg-white font-medium shadow-sm" : "text-muted hover:text-ink"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Explorer() {
  const { lang } = useLang();
  const sp = useSearchParams();
  const [area, setArea] = useState<Area | "all">((sp.get("area") as Area) || "all");
  const [deal, setDeal] = useState<Deal | "all">((sp.get("deal") as Deal) || "all");
  const [type, setType] = useState<LandType | "all">((sp.get("type") as LandType) || "all");
  const [showClosed, setShowClosed] = useState(sp.get("closed") === "1");
  const [sort, setSort] = useState<Sort>("value");
  const [sel, setSel] = useState<string | null>(null);
  const ar = lang === "ar";

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
      return a.listing_age_days - b.listing_age_days;
    });
  }, [area, deal, type, showClosed, sort]);

  const ids = useMemo(() => new Set(list.map((p) => p.parcel_id)), [list]);

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold">{ar ? "كل أراضينا" : "All our land"}</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Seg value={area} onChange={setArea} options={[["all", ar ? "كل الرياض" : "All"], ...AREAS.map((a) => [a, AREA_SHORT[a][lang]] as [Area, string])]} />
          <Seg value={deal} onChange={setDeal} options={[["all", ar ? "بيع وإيجار" : "Buy & lease"], ["sale", ar ? "للبيع" : "For sale"], ["lease", ar ? "للإيجار" : "For lease"]]} />
          <Seg value={type} onChange={setType} options={[["all", ar ? "الكل" : "All types"], ["residential", ar ? "سكني" : "Residential"], ["commercial", ar ? "تجاري" : "Commercial"]]} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[14px]">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} className="h-4 w-4 accent-[var(--blue)]" />
            {ar ? "ورّني اللي انباع وتأجر عشان أقارن" : "Show sold and leased so I can compare"}
          </label>
          <label className="flex items-center gap-2">
            <span className="text-muted">{ar ? "رتّب حسب" : "Sort by"}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="glass-soft rounded-full px-3 py-1.5">
              <option value="value">{ar ? "الأحلى سعراً مقارنة بالمنطقة" : "Best value for the area"}</option>
              <option value="price_asc">{ar ? "الأرخص أول" : "Cheapest first"}</option>
              <option value="price_desc">{ar ? "الأغلى أول" : "Priciest first"}</option>
              <option value="size_desc">{ar ? "الأكبر مساحة" : "Biggest first"}</option>
              <option value="new">{ar ? "الأحدث" : "Newest"}</option>
            </select>
          </label>
        </div>
        <p className="mt-4 text-[14px] text-muted">{ar ? `${num(list.length, lang)} أرض` : `${list.length} parcels`}</p>
        {list.length ? (
          <div className="mt-2 grid gap-3 pb-6 xl:grid-cols-2">
            {list.map((p) => <ParcelCard key={p.parcel_id} p={p} onHover={setSel} selected={sel === p.parcel_id} from="explorer" />)}
          </div>
        ) : (
          <div className="glass mt-3 rounded-[26px] p-6">
            <p className="text-lg font-semibold">{ar ? "ما فيه أراضي بهالمواصفات" : "Nothing matches these filters"}</p>
            <p className="mt-1 text-muted">{ar ? "جرّب جهة ثانية، أو فعّل خيار اللي انباع عشان تشوف أسعار المنطقة." : "Try another area, or switch on sold land to see what prices look like there."}</p>
          </div>
        )}
      </div>
      <div className="order-first h-[40vh] overflow-hidden rounded-[30px] lg:order-none lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
        <ParcelMap parcels={parcels} highlight={ids} selected={sel}
          onSelect={(id) => { setSel(id); document.getElementById(`card-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" }); }}
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
