"use client";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParcelMap from "@/components/ParcelMap";
import ParcelCard from "@/components/ParcelCard";
import LeadForm from "@/components/LeadForm";
import AlertForm from "@/components/AlertForm";
import { useLang } from "@/lib/i18n";
import { byId, available, portfolio } from "@/lib/portfolio";
import { AREA_LABEL, DEAL_LABEL, FRONTAGE_LABEL, STATUS_LABEL, TYPE_LABEL, district, money, num, priceLabel, sqm, sqmPrice } from "@/lib/format";
import { waLink } from "@/lib/contact";
import { track } from "@/lib/track";

const USES = {
  residential: {
    small: { ar: "بيت عائلي أو فيلا", en: "A family home or villa" },
    mid: { ar: "فلل للبيع أو عمارة شقق", en: "Villas to sell or an apartment building" },
    large: { ar: "مجمع سكني أو مشروع فلل", en: "A residential compound or villa project" },
  },
  commercial: {
    small: { ar: "محل تجاري أو مكتب", en: "A shop or office" },
    mid: { ar: "معرض أو مبنى مكاتب", en: "A showroom or office building" },
    large: { ar: "مستودع أو مركز تجاري أو معرض سيارات", en: "A warehouse, retail centre or car showroom" },
  },
} as const;

export default function ParcelView({ id }: { id: string }) {
  const { lang } = useLang();
  const p = byId(id)!;
  useEffect(() => { track("parcel_view", { status: p.status }, p.parcel_id); }, [p]);

  const comps = useMemo(() => p.closed_comps.map((c) => byId(c)!).filter((x) => x.price_per_sqm_sar)
    .sort((a, b) => Number(b.district_en === p.district_en) - Number(a.district_en === p.district_en)).slice(0, 4), [p]);
  const similar = useMemo(() => available.filter((x) => x.parcel_id !== p.parcel_id && x.land_type === p.land_type &&
    x.listing_type === p.listing_type && x.area_of_city === p.area_of_city)
    .sort((a, b) => Math.abs(a.area_sqm - p.area_sqm) - Math.abs(b.area_sqm - p.area_sqm)).slice(0, 3), [p]);

  const closed = p.status === "sold" || p.status === "leased";
  const scale = p.area_sqm < 700 ? "small" : p.area_sqm < 2500 ? "mid" : "large";
  const anchors = portfolio.anchors;

  // "Why this land": only facts from the data.
  const why: { ar: string; en: string }[] = [];
  why.push({
    ar: `${FRONTAGE_LABEL[p.frontage].ar} بعرض ${p.street_width_m} م${p.frontage === "main_road" ? "، واجهة يراها كل من يمر" : ""}`,
    en: `${FRONTAGE_LABEL[p.frontage].en}, ${p.street_width_m} m wide${p.frontage === "main_road" ? ", frontage everyone passing will see" : ""}`,
  });
  const v = p.pricing.vs_area_pct, vd = p.pricing.vs_district_pct;
  if (v != null) {
    if (v <= -5) why.push({ ar: `سعر المتر أقل بـ ${Math.abs(v)}% من متوسط ${AREA_LABEL[p.area_of_city].ar} لنفس النوع`, en: `Price per m² is ${Math.abs(v)}% below the ${AREA_LABEL[p.area_of_city].en} median for this type` });
    else if (v >= 25) why.push({ ar: `من الأراضي المميزة في ${AREA_LABEL[p.area_of_city].ar}، وسعرها أعلى من المتوسط بـ ${v}%`, en: `A premium parcel for ${AREA_LABEL[p.area_of_city].en}, priced ${v}% above the median` });
    else why.push({ ar: `سعر المتر قريب من متوسط ${AREA_LABEL[p.area_of_city].ar}`, en: `Price per m² is in line with the ${AREA_LABEL[p.area_of_city].en} median` });
  }
  why.push({ ar: `مساحة ${num(p.area_sqm, "ar")} م² تناسب ${USES[p.land_type][scale].ar}`, en: `${num(p.area_sqm, "en")} m² suits ${USES[p.land_type][scale].en.toLowerCase()}` });
  const nearest = (Object.keys(p.distances_km) as (keyof typeof p.distances_km)[]).sort((a, b) => p.distances_km[a] - p.distances_km[b])[0];
  why.push({ ar: `على بعد ${p.distances_km[nearest]} كم من ${anchors[nearest].ar}`, en: `${p.distances_km[nearest]} km from ${anchors[nearest].en}` });
  if (p.segment_demand >= 2 && !closed)
    why.push({ ar: `${p.segment_demand} مستثمرين طلبوا أراضي ${TYPE_LABEL[p.land_type].ar} ${DEAL_LABEL[p.listing_type].ar} في هذه المنطقة`, en: `${p.segment_demand} investors have asked for ${TYPE_LABEL[p.land_type].en.toLowerCase()} land ${DEAL_LABEL[p.listing_type].en.toLowerCase()} in this area` });

  // Price context bars
  const bars = [
    { label: { ar: "هذه الأرض", en: "This land" }, v: p.price_per_sqm_sar, me: true },
    p.pricing.district_median_sqm ? { label: { ar: `متوسط ${district(p, "ar")}`, en: `${p.district_en} median` }, v: p.pricing.district_median_sqm } : null,
    p.pricing.area_median_sqm ? { label: { ar: `متوسط ${AREA_LABEL[p.area_of_city].ar}`, en: `${AREA_LABEL[p.area_of_city].en} median` }, v: p.pricing.area_median_sqm } : null,
    ...comps.map((c) => ({ label: { ar: `${STATUS_LABEL[c.status].ar} في ${district(c, "ar")}`, en: `${STATUS_LABEL[c.status].en} in ${c.district_en}` }, v: c.price_per_sqm_sar })),
  ].filter(Boolean) as { label: { ar: string; en: string }; v: number | null; me?: boolean }[];
  const maxBar = Math.max(...bars.map((b) => b.v ?? 0), 1);

  const wa = waLink(lang === "ar"
    ? `السلام عليكم، أرغب في معرفة المزيد عن الأرض ${p.parcel_id} في حي ${p.district_ar}`
    : `Hello, I'd like to know more about parcel ${p.parcel_id} in ${p.district_en}`);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <nav className="text-sm text-muted">
            <Link href="/lands" className="hover:text-ink">{lang === "ar" ? "كل الأراضي" : "All land"}</Link>
            <span className="mx-2">/</span>
            <Link href={`/lands?area=${p.area_of_city}`} className="hover:text-ink">{AREA_LABEL[p.area_of_city][lang]}</Link>
          </nav>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-semibold sm:text-5xl">{district(p, lang)}</h1>
              <p className="mt-2 text-muted">
                {AREA_LABEL[p.area_of_city][lang]}، {lang === "ar" ? `أرض ${TYPE_LABEL[p.land_type].ar} ${DEAL_LABEL[p.listing_type].ar}` : `${TYPE_LABEL[p.land_type].en} land ${DEAL_LABEL[p.listing_type].en.toLowerCase()}`}
                <span className="mx-2 text-line">|</span>
                <span dir="ltr">{p.parcel_id}</span>
              </p>
            </div>
            <span className={`px-3 py-1 text-sm ${p.status === "available" ? "bg-sun text-ink" : p.status === "reserved" ? "bg-palm text-white" : "bg-closed text-white"}`}>
              {STATUS_LABEL[p.status][lang]}
            </span>
          </div>
        </div>

        <div className="mx-auto mt-6 grid max-w-7xl gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-10">
            <ParcelMap parcels={[p]} selected={p.parcel_id} basemap="satellite" showBasemapToggle zoom={15.5} center={[p.lng, p.lat]}
              className="h-[340px] border border-line sm:h-[440px]" />

            <section>
              <h2 className="font-display text-2xl font-semibold">{lang === "ar" ? "لماذا هذه الأرض" : "Why this land"}</h2>
              <ul className="mt-4 space-y-3">
                {why.map((w, i) => (
                  <li key={i} className="flex gap-3 text-[17px] leading-relaxed">
                    <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 bg-sun" />{w[lang]}
                  </li>
                ))}
              </ul>
            </section>

            {p.price_per_sqm_sar != null && (
              <section>
                <h2 className="font-display text-2xl font-semibold">{lang === "ar" ? "السعر مقارنة بما حوله" : "Price against its neighbours"}</h2>
                <p className="mt-1 text-sm text-muted">
                  {lang === "ar" ? `سعر المتر ${p.listing_type === "lease" ? "السنوي " : ""}من أراضي محفظتنا الفعلية` : `Price per m²${p.listing_type === "lease" ? " per year" : ""}, from our actual portfolio`}
                </p>
                <div className="mt-5 space-y-3">
                  {bars.map((b, i) => (
                    <div key={i} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[14rem_1fr_auto]">
                      <span className={b.me ? "font-semibold" : "text-muted"}>{b.label[lang]}</span>
                      <div className="h-3 bg-stone-2"><div className={`h-full ${b.me ? "bg-sun" : "bg-closed"}`} style={{ width: `${((b.v ?? 0) / maxBar) * 100}%` }} /></div>
                      <span className={`tabular-nums ${b.me ? "font-semibold" : ""}`}>{num(b.v ?? 0, lang)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="font-display text-2xl font-semibold">{lang === "ar" ? "الموقع" : "Location"}</h2>
              <dl className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-2">
                {(Object.keys(p.distances_km) as (keyof typeof p.distances_km)[]).sort((a, b) => p.distances_km[a] - p.distances_km[b]).map((k) => (
                  <div key={k} className="flex items-baseline justify-between bg-sheet px-4 py-3">
                    <dt className="text-muted">{anchors[k][lang]}</dt>
                    <dd className="font-semibold">{lang === "ar" ? `${p.distances_km[k]} كم` : `${p.distances_km[k]} km`}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs text-muted">{lang === "ar" ? "مسافات تقريبية بخط مستقيم." : "Approximate straight-line distances."}</p>
            </section>

            {similar.length > 0 && (
              <section>
                <h2 className="font-display text-2xl font-semibold">{lang === "ar" ? "أراضٍ مشابهة متاحة" : "Similar land available"}</h2>
                <div className="mt-4 space-y-px border border-line bg-line">
                  {similar.map((s) => <ParcelCard key={s.parcel_id} p={s} from="similar" />)}
                </div>
              </section>
            )}
          </div>

          {/* Action panel */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="border border-line bg-sheet p-5">
              <p className={`text-3xl font-semibold ${closed ? "text-muted" : ""}`}>{priceLabel(p, lang)}</p>
              {p.price_per_sqm_sar != null && <p className="mt-1 text-muted">{sqmPrice(p, lang)}</p>}
              <dl className="mt-4 grid grid-cols-2 gap-y-3 border-t border-line pt-4 text-sm">
                <dt className="text-muted">{lang === "ar" ? "المساحة" : "Size"}</dt><dd className="font-semibold">{sqm(p.area_sqm, lang)}</dd>
                <dt className="text-muted">{lang === "ar" ? "عرض الشارع" : "Street width"}</dt><dd className="font-semibold">{lang === "ar" ? `${p.street_width_m} م` : `${p.street_width_m} m`}</dd>
                <dt className="text-muted">{lang === "ar" ? "الاستخدام" : "Zoning"}</dt><dd className="font-semibold">{TYPE_LABEL[p.land_type][lang]}</dd>
                {p.total_price_sar != null && p.listing_type === "sale" && (<>
                  <dt className="text-muted">{lang === "ar" ? "ضريبة التصرفات العقارية 5% (تقدير)" : "5% real estate transaction tax (estimate)"}</dt>
                  <dd className="font-semibold">{money(p.total_price_sar * 0.05, lang)}</dd>
                </>)}
                {p.total_price_sar != null && p.listing_type === "lease" && (<>
                  <dt className="text-muted">{lang === "ar" ? "ما يعادل شهرياً" : "Monthly equivalent"}</dt>
                  <dd className="font-semibold">{money(Math.round(p.total_price_sar / 12), lang)}</dd>
                </>)}
              </dl>

              <div className="mt-5 border-t border-line pt-5">
                {p.status === "available" && <LeadForm parcelId={p.parcel_id} />}
                {p.status === "reserved" && (
                  <AlertForm criteria={{ waitlist: p.parcel_id }} summary={{
                    ar: "هذه الأرض محجوزة لمستثمر آخر الآن. اترك بياناتك وسنبلغك فوراً إن عادت متاحة.",
                    en: "Another investor has reserved this land. Leave your details and we'll tell you right away if it becomes available.",
                  }} />
                )}
                {closed && (
                  <div>
                    <p className="font-semibold">{lang === "ar" ? `هذه الأرض ${STATUS_LABEL[p.status].ar}` : `This land is ${STATUS_LABEL[p.status].en.toLowerCase()}`}</p>
                    <p className="mt-1 text-sm text-muted">{lang === "ar" ? "نعرضها لتقارن الأسعار. الأراضي المشابهة المتاحة في الأسفل." : "We show it so you can compare prices. Similar available land is below."}</p>
                    <Link href={`/lands?area=${p.area_of_city}&type=${p.land_type}&deal=${p.listing_type}`} className="mt-3 inline-block rounded-md bg-palm px-4 py-2.5 text-white">
                      {lang === "ar" ? "أراضٍ مشابهة متاحة" : "Similar available land"}
                    </Link>
                  </div>
                )}
                <a href={wa} target="_blank" rel="noopener" onClick={() => track("whatsapp_click", { from: "parcel" }, p.parcel_id)}
                  className="mt-3 block w-full rounded-md border border-ink px-4 py-3 text-center font-medium hover:bg-stone-2">
                  {lang === "ar" ? "اسأل عن هذه الأرض عبر واتساب" : "Ask about this land on WhatsApp"}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
