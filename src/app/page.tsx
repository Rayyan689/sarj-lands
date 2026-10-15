"use client";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParcelMap from "@/components/ParcelMap";
import MatchFlow from "@/components/MatchFlow";
import { useLang } from "@/lib/i18n";
import { AREAS, available, districtCount, parcels, portfolio } from "@/lib/portfolio";
import { AREA_LABEL, STATUS_LABEL, district, money, num, sqm, sqmPrice } from "@/lib/format";
import { track } from "@/lib/track";

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export default function Home() {
  const { lang } = useLang();
  useEffect(() => { track("page_view", { page: "home" }); }, []);

  const areaRows = useMemo(() => AREAS.map((a) => {
    const av = available.filter((p) => p.area_of_city === a);
    const resSale = parcels.filter((p) => p.area_of_city === a && p.land_type === "residential" && p.listing_type === "sale" && p.price_per_sqm_sar);
    return {
      a, count: av.length,
      res: av.filter((p) => p.land_type === "residential").length,
      com: av.filter((p) => p.land_type === "commercial").length,
      sqmMed: median(resSale.map((p) => p.price_per_sqm_sar!)),
      demand: portfolio.demand.filter((d) => d.area_of_city === a).reduce((s, d) => s + d.count, 0),
    };
  }), []);

  const closed = useMemo(() => parcels.filter((p) => p.status === "sold" || p.status === "leased")
    .sort((a, b) => b.listed_date.localeCompare(a.listed_date)).slice(0, 6), []);

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero: Riyadh with every parcel, and the one question that matters */}
        <section className="relative border-b border-line">
          <ParcelMap parcels={parcels} interactive={false} zoom={9.4} center={[46.72, 24.70]}
            className="h-56 sm:h-72 lg:absolute lg:inset-0 lg:h-auto" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:py-14">
            <div className="bg-stone px-1 py-8 lg:max-w-xl lg:border lg:border-line lg:bg-stone/95 lg:p-8 lg:backdrop-blur-sm">
              <h1 className="font-display text-4xl font-semibold leading-[1.25] sm:text-5xl">
                {lang === "ar" ? "ماذا تريد أن تبني؟" : "What do you want to build?"}
              </h1>
              <p className="mt-3 max-w-md text-lg leading-relaxed text-muted">
                {lang === "ar"
                  ? `أخبرنا بخطتك، ونريك الأراضي التي تناسبها من بين ${available.length} أرضاً متاحة في ${districtCount} حياً بالرياض.`
                  : `Tell us your plan and we'll show you the land that fits it, out of ${available.length} available parcels across ${districtCount} Riyadh districts.`}
              </p>
              <div className="mt-7"><MatchFlow compact /></div>
              <p className="mt-6 text-sm text-muted">
                {lang === "ar" ? "تعرف ما تبحث عنه؟ " : "Know what you're after? "}
                <Link href="/lands" className="font-medium text-palm underline underline-offset-4">
                  {lang === "ar" ? "تصفح كل الأراضي على الخريطة" : "Browse every parcel on the map"}
                </Link>
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-3 end-4 hidden gap-4 bg-sheet/90 px-3 py-1.5 text-xs lg:flex">
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-sun ring-1 ring-ink" />{STATUS_LABEL.available[lang]}</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-palm ring-1 ring-ink" />{STATUS_LABEL.reserved[lang]}</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-closed ring-1 ring-ink" />{lang === "ar" ? "مباعة أو مؤجرة" : "Sold or leased"}</span>
          </div>
        </section>

        {/* Where it makes sense: the city by area */}
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-3xl font-semibold">{lang === "ar" ? "الرياض بحسب المنطقة" : "Riyadh, area by area"}</h2>
          <p className="mt-2 max-w-2xl text-muted">
            {lang === "ar"
              ? "أسعار المتر تختلف كثيراً بين أطراف المدينة. هذه أرقام محفظتنا الفعلية لتعرف من أين تبدأ."
              : "Land prices vary a lot across the city. These are our actual portfolio numbers, so you know where to start."}
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-start">
              <thead>
                <tr className="border-b-2 border-ink text-sm text-muted">
                  <th className="py-2 text-start font-normal">{lang === "ar" ? "المنطقة" : "Area"}</th>
                  <th className="py-2 text-start font-normal">{lang === "ar" ? "متاحة الآن" : "Available now"}</th>
                  <th className="py-2 text-start font-normal">{lang === "ar" ? "سكني / تجاري" : "Residential / commercial"}</th>
                  <th className="py-2 text-start font-normal">{lang === "ar" ? "متوسط سعر متر السكني" : "Median residential price"}</th>
                  <th className="py-2 text-start font-normal">{lang === "ar" ? "طلبات المستثمرين" : "Investor requests"}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {areaRows.map((r) => (
                  <tr key={r.a} className="border-b border-line">
                    <td className="py-4 font-semibold">{AREA_LABEL[r.a][lang]}</td>
                    <td className="py-4 text-xl font-semibold">{num(r.count, lang)}</td>
                    <td className="py-4">{num(r.res, lang)} / {num(r.com, lang)}</td>
                    <td className="py-4">{r.sqmMed ? (lang === "ar" ? `${num(r.sqmMed, lang)} ريال/م²` : `SAR ${num(r.sqmMed, lang)}/m²`) : "–"}</td>
                    <td className="py-4">{num(r.demand, lang)}</td>
                    <td className="py-4 text-end">
                      <Link href={`/lands?area=${r.a}`} className="text-sm font-medium text-palm underline-offset-4 hover:underline">
                        {lang === "ar" ? "عرض الأراضي" : "See land"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Proof: deals that already closed from this portfolio */}
        <section className="border-t border-line bg-stone-2/60">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <h2 className="font-display text-3xl font-semibold">{lang === "ar" ? "أراضٍ بِيعت وأُجّرت من محفظتنا" : "Land we've already sold and leased"}</h2>
            <p className="mt-2 max-w-2xl text-muted">
              {lang === "ar"
                ? `${num(parcels.filter((p) => p.status === "sold").length, lang)} أرضاً بيعت و${num(parcels.filter((p) => p.status === "leased").length, lang)} أُجّرت. استخدمها لتقارن الأسعار قبل أن تقرر.`
                : `${parcels.filter((p) => p.status === "sold").length} parcels sold and ${parcels.filter((p) => p.status === "leased").length} leased. Use them to compare prices before you decide.`}
            </p>
            <ul className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {closed.map((p) => (
                <li key={p.parcel_id} className="bg-sheet px-5 py-4">
                  <Link href={`/lands/${p.parcel_id}`} className="block hover:text-palm">
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold">{district(p, lang)}</span>
                      <span className="text-xs text-muted">{STATUS_LABEL[p.status][lang]}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{AREA_LABEL[p.area_of_city][lang]}، {sqm(p.area_sqm, lang)}</p>
                    <p className="mt-2">{sqmPrice(p, lang)}{p.total_price_sar ? <span className="text-muted">{lang === "ar" ? "، الإجمالي " : ", total "}{money(p.total_price_sar, lang)}</span> : null}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
