"use client";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParcelMap from "@/components/ParcelMap";
import MatchFlow from "@/components/MatchFlow";
import ParcelCard from "@/components/ParcelCard";
import { useLang } from "@/lib/i18n";
import { AREAS, available, districtCount, parcels } from "@/lib/portfolio";
import { AREA_LABEL, num } from "@/lib/format";
import { track } from "@/lib/track";

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const AREA_VIBE = {
  North: { ar: "أحياء جديدة ومطلوبة، قريبة من المطار والمركز المالي", en: "New, sought-after districts near the airport and KAFD" },
  East: { ar: "أحياء عائلية، وأراضي تجارية على شوارع كبيرة", en: "Family districts, plus commercial land on big roads" },
  Central: { ar: "قلب الرياض، قريب من كل شي", en: "The heart of Riyadh, close to everything" },
  West: { ar: "أسعار حلوة ومساحات أكبر، قريب من الدرعية", en: "Friendly prices and bigger plots, near Diriyah" },
  South: { ar: "أراضي تجارية واسعة للمستودعات والمعارض", en: "Wide commercial land for warehouses and showrooms" },
} as const;

export default function Home() {
  const { lang } = useLang();
  useEffect(() => { track("page_view", { page: "home" }); }, []);

  // One standout parcel per area: the best-priced against its own area.
  const picks = useMemo(() => {
    const ranked = available.filter((p) => p.pricing.vs_area_pct != null).sort((x, y) => x.pricing.vs_area_pct! - y.pricing.vs_area_pct!);
    const first = AREAS.map((a) => ranked.find((p) => p.area_of_city === a)).filter(Boolean) as typeof ranked;
    const extra = ranked.filter((p) => !first.includes(p) && p.land_type === "commercial").slice(0, 6 - first.length);
    return [...first, ...extra];
  }, []);

  const areas = useMemo(() => AREAS.map((a) => ({
    a,
    count: available.filter((p) => p.area_of_city === a).length,
    sqm: median(parcels.filter((p) => p.area_of_city === a && p.land_type === "residential" && p.listing_type === "sale" && p.price_per_sqm_sar).map((p) => p.price_per_sqm_sar!)),
  })), []);

  const sold = parcels.filter((p) => p.status === "sold").length;
  const leased = parcels.filter((p) => p.status === "leased").length;

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero: the live map of Riyadh behind a glass card */}
        <section className="relative mt-3 overflow-hidden sm:mx-5 sm:rounded-[40px]">
          <div className="absolute inset-0 overflow-hidden">
            <ParcelMap parcels={parcels} interactive={false} zoom={9.5} center={[46.66, 24.70]} className="h-full w-full" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-canvas/70 via-transparent to-transparent sm:from-transparent" />
          </div>
          <div className="relative mx-auto max-w-6xl px-3 pb-10 pt-8 sm:px-5 sm:pt-16 lg:pb-24">
            <div className="glass max-w-2xl rounded-[34px] p-6 sm:p-8">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[13px] text-muted">
                <span className="h-2 w-2 rounded-full bg-apricot" />
                {lang === "ar" ? `${available.length} أرض متاحة في ${districtCount} حي` : `${available.length} parcels available in ${districtCount} districts`}
              </p>
              <h1 className="mt-4 text-[34px] font-bold leading-[1.2] sm:text-5xl">
                {lang === "ar" ? "أرضك في الرياض، نطلعها لك" : "Your land in Riyadh, found for you"}
              </h1>
              <p className="mt-3 text-[17px] leading-relaxed text-muted">
                {lang === "ar"
                  ? "علّمنا وش ببالك بأربع ضغطات، ونجيب لك الأراضي اللي فعلاً تناسبك. بدون لف ودوران."
                  : "Tell us what you have in mind in four taps, and we'll bring you the land that actually fits. No runaround."}
              </p>
              <div className="mt-6"><MatchFlow /></div>
            </div>
          </div>
        </section>

        {/* Standout land, one per area */}
        <section className="mx-auto max-w-6xl px-3 py-12 sm:px-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl font-bold">{lang === "ar" ? "أراضي تستاهل نظرة 👀" : "Land worth a look 👀"}</h2>
              <p className="mt-1.5 text-muted">
                {lang === "ar" ? "من كل جهة بالرياض اخترنا لك أرض سعرها حلو مقارنة بجيرانها." : "From every side of Riyadh, one parcel that's well priced next to its neighbours."}
              </p>
            </div>
            <Link href="/lands" className="bubble px-5 py-2.5 text-[15px] font-medium">{lang === "ar" ? "شوف كل الأراضي" : "See all land"}</Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {picks.map((p) => <ParcelCard key={p.parcel_id} p={p} from="home_picks" />)}
          </div>
        </section>

        {/* Areas */}
        <section className="mx-auto max-w-6xl px-3 py-6 sm:px-5">
          <h2 className="text-3xl font-bold">{lang === "ar" ? "وين تبي تكون؟" : "Where do you want to be?"}</h2>
          <p className="mt-1.5 text-muted">{lang === "ar" ? "كل جهة بالرياض لها طابعها وأسعارها. هذي أرقامنا الفعلية." : "Every side of Riyadh has its own feel and prices. These are our real numbers."}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {areas.map((r) => (
              <Link key={r.a} href={`/lands?area=${r.a}`} className="glass group flex flex-col rounded-[26px] p-5 transition-transform hover:-translate-y-0.5">
                <span className="text-lg font-semibold">{AREA_LABEL[r.a][lang]}</span>
                <span className="mt-1 text-[14px] leading-relaxed text-muted">{AREA_VIBE[r.a][lang]}</span>
                <span className="mt-4 text-3xl font-bold">{num(r.count, lang)}</span>
                <span className="text-sm text-muted">{lang === "ar" ? "أرض متاحة" : "available"}</span>
                {r.sqm && (
                  <span className="mt-3 rounded-full bg-white/70 px-3 py-1 text-[13px]">
                    {lang === "ar" ? `السكني بحدود ${num(r.sqm, lang)} ريال للمتر` : `Home plots around SAR ${num(r.sqm, lang)}/m²`}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>

        {/* Proof */}
        <section className="mx-auto max-w-6xl px-3 py-12 sm:px-5">
          <div className="glass flex flex-col items-start gap-4 rounded-[34px] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="text-2xl font-bold">{lang === "ar" ? `بعنا ${sold} أرض وأجّرنا ${leased} من نفس هالمحفظة` : `We've sold ${sold} and leased ${leased} parcels from this same portfolio`}</p>
              <p className="mt-1 text-muted">{lang === "ar" ? "تقدر تشوف أسعارها وتقارن قبل لا تقرر." : "You can see what they went for and compare before you decide."}</p>
            </div>
            <Link href="/lands?closed=1" className="btn-primary shrink-0 px-6 py-3 font-medium">{lang === "ar" ? "قارن الأسعار" : "Compare prices"}</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
