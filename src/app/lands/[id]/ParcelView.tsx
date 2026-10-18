"use client";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParcelMap from "@/components/ParcelMap";
import ParcelCard from "@/components/ParcelCard";
import LeadForm from "@/components/LeadForm";
import AlertForm from "@/components/AlertForm";
import YourLand from "@/components/YourLand";
import { openChat } from "@/components/ChatWidget";
import { useLang } from "@/lib/i18n";
import { byId, available, portfolio, syncLive, originalOf, type Override, type Parcel } from "@/lib/portfolio";
import { usePortfolioVersion } from "@/components/ListingsLoader";
import { AREA_LABEL, DEAL_LABEL, STATUS_LABEL, TYPE_LABEL, byDrive, district, hook, minutes, money, num, priceLabel, sqm, sqmPrice, street, type T } from "@/lib/format";
import { waLink } from "@/lib/contact";
import { track } from "@/lib/track";

const USES = {
  residential: {
    small: { ar: "بيت للعايلة أو فيلا", en: "a family home or villa" },
    mid: { ar: "فلل للبيع أو عمارة شقق", en: "villas to sell or an apartment building" },
    large: { ar: "مجمع سكني أو مشروع فلل", en: "a residential compound or villa project" },
  },
  commercial: {
    small: { ar: "محل أو مكتب", en: "a shop or office" },
    mid: { ar: "معرض أو مبنى مكاتب", en: "a showroom or office building" },
    large: { ar: "مستودع أو مركز تجاري أو معرض سيارات", en: "a warehouse, retail centre or car showroom" },
  },
} as const;

const STATUS_STYLE = {
  available: "bg-apricot text-white",
  reserved: "bg-blue text-white",
  sold: "bg-ink/60 text-white",
  leased: "bg-ink/60 text-white",
} as const;

export default function ParcelView({ id, live }: { id: string; live?: { listings: Parcel[]; overrides: Record<string, Override> } }) {
  if (live) syncLive(live.listings, live.overrides);
  const ver = usePortfolioVersion();
  const { lang } = useLang();
  const ar = lang === "ar";
  const p = byId(id) ?? originalOf(id)!;
  useEffect(() => { track("parcel_view", { status: p.status }, p.parcel_id); }, [p, ver]); // eslint-disable-line react-hooks/exhaustive-deps

  const comps = useMemo(() => p.closed_comps.map((c) => byId(c)!).filter((x) => x.price_per_sqm_sar)
    .sort((a, b) => Number(b.district_en === p.district_en) - Number(a.district_en === p.district_en)).slice(0, 3), [p]);
  const similar = useMemo(() => available.filter((x) => x.parcel_id !== p.parcel_id && x.land_type === p.land_type &&
    x.listing_type === p.listing_type && x.area_of_city === p.area_of_city)
    .sort((a, b) => Math.abs(a.area_sqm - p.area_sqm) - Math.abs(b.area_sqm - p.area_sqm)).slice(0, 2), [p]);

  const closed = p.status === "sold" || p.status === "leased";
  const scale = p.area_sqm < 700 ? "small" : p.area_sqm < 2500 ? "mid" : "large";
  const anchors = portfolio.anchors;
  const area = AREA_LABEL[p.area_of_city];

  // "What makes it special": facts from the data, said like a person would say them.
  const why: { icon: string; t: T }[] = [];
  const w = p.street_width_m;
  why.push(p.frontage === "main_road"
    ? { icon: "🛣️", t: { ar: `واجهتها على شارع ${w} م، تنشاف من بعيد`, en: `Fronts a ${w} m road, visible from far away` } }
    : p.frontage === "collector"
      ? { icon: "🛣️", t: { ar: `على شارع ${w} م، حركة معقولة ووصول سهل`, en: `On a ${w} m street, steady traffic and easy access` } }
      : { icon: "🌙", t: { ar: `على شارع داخلي ${w} م، هادي وفيه خصوصية`, en: `On a quiet ${w} m inner street, calm and private` } });
  const v = p.pricing.vs_area_pct;
  if (v != null) {
    if (v <= -5) why.push({ icon: "💰", t: { ar: `سعر المتر أرخص بـ ${Math.abs(v)}% من متوسط ${area.ar}`, en: `${Math.abs(v)}% cheaper per m² than the ${area.en} average` } });
    else if (v >= 25) why.push({ icon: "⭐", t: { ar: `من الأراضي المميزة في ${area.ar}، وسعرها فوق المتوسط بـ ${v}%`, en: `One of the standout plots in ${area.en}, priced ${v}% above average` } });
    else why.push({ icon: "⚖️", t: { ar: `سعر المتر قريب من متوسط ${area.ar}، يعني سعر عادل`, en: `Priced right around the ${area.en} average, a fair price` } });
  }
  why.push({ icon: "📐", t: { ar: `${num(p.area_sqm, "ar")} م²، تكفي ${USES[p.land_type][scale].ar}`, en: `${num(p.area_sqm, "en")} m², enough for ${USES[p.land_type][scale].en}` } });
  const nearest = byDrive(p)[0];
  why.push({ icon: "🚗", t: { ar: `${minutes(p.drive[nearest].min, "ar")} بالسيارة عن ${anchors[nearest].ar}`, en: `${minutes(p.drive[nearest].min, "en")} drive to ${anchors[nearest].en}` } });
  if (p.segment_demand >= 2 && !closed)
    why.push({ icon: "🔥", t: { ar: `${p.segment_demand} مستثمرين يدورون أراضي ${TYPE_LABEL[p.land_type].ar} ${DEAL_LABEL[p.listing_type].ar} بنفس المنطقة`, en: `${p.segment_demand} investors are looking for ${TYPE_LABEL[p.land_type].en.toLowerCase()} properties ${DEAL_LABEL[p.listing_type].en.toLowerCase()} in this area` } });

  const bars = [
    { label: { ar: "هالأرض", en: "This property" }, v: p.price_per_sqm_sar, me: true },
    p.pricing.district_median_sqm ? { label: { ar: `متوسط ${district(p, "ar")}`, en: `${p.district_en} average` }, v: p.pricing.district_median_sqm } : null,
    p.pricing.area_median_sqm ? { label: { ar: `متوسط ${area.ar}`, en: `${area.en} average` }, v: p.pricing.area_median_sqm } : null,
    ...comps.map((c) => ({ label: { ar: `${STATUS_LABEL[c.status].ar} في ${district(c, "ar")}`, en: `${STATUS_LABEL[c.status].en} in ${c.district_en}` }, v: c.price_per_sqm_sar })),
  ].filter(Boolean) as { label: T; v: number | null; me?: boolean }[];
  const maxBar = Math.max(...bars.map((b) => b.v ?? 0), 1);

  const wa = waLink(ar
    ? `هلا، ودّي أعرف أكثر عن الأرض ${p.parcel_id} في حي ${p.district_ar}`
    : `Hi, I'd like to know more about parcel ${p.parcel_id} in ${p.district_en}`);
  const h = hook(p);

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero: the land from above, with a glass name card */}
        <section className="relative mx-3 mt-3 h-[58vh] min-h-[380px] overflow-hidden rounded-[34px] sm:mx-5 sm:rounded-[40px]">
          <ParcelMap parcels={[p]} selected={p.parcel_id} basemap="satellite" showBasemapToggle zoom={16} center={[p.lng, p.lat]} className="h-full" />
          <div className="pointer-events-none absolute inset-x-3 bottom-4 sm:inset-x-auto sm:bottom-6 sm:start-6 sm:w-[26rem]">
            <div className="glass pointer-events-auto rounded-[28px] p-5">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[p.status]}`}>{STATUS_LABEL[p.status][lang]}</span>
                {p.added && <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-white">{ar ? "نزلت جديد" : "Just listed"}</span>}
                <Link href={`/lands?area=${p.area_of_city}`} className="text-[13px] text-muted hover:text-ink">{area[lang]}</Link>
              </div>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{district(p, lang)}</h1>
              <p className="mt-1 text-muted">{ar ? `أرض ${TYPE_LABEL[p.land_type].ar} ${DEAL_LABEL[p.listing_type].ar}` : `${TYPE_LABEL[p.land_type].en} property ${DEAL_LABEL[p.listing_type].en.toLowerCase()}`}</p>
              {!closed && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-3 py-1 text-[13px] font-medium text-[#8C6A2F]">
                  <span aria-hidden>✦</span>{h[lang]}
                </p>
              )}

            </div>
          </div>
        </section>

        <div className="mx-auto mt-5 grid max-w-6xl gap-5 px-3 pb-6 sm:px-5 lg:grid-cols-[minmax(0,1fr)_370px]">
          <div className="min-w-0 space-y-5">
            {!closed && <YourLand p={p} />}
            <section className="glass rounded-[30px] p-6">
              <h2 className="text-2xl font-bold">{ar ? "وش يميزها؟" : "What makes it special?"}</h2>
              <ul className="mt-4 space-y-3">
                {why.map((x, i) => (
                  <li key={i} className="flex items-start gap-3 text-[17px] leading-relaxed">
                    <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white/80 text-lg">{x.icon}</span>
                    <span className="pt-1">{x.t[lang]}</span>
                  </li>
                ))}
              </ul>
            </section>

            {p.price_per_sqm_sar != null && (
              <section className="glass rounded-[30px] p-6">
                <h2 className="text-2xl font-bold">{ar ? "سعرها جنب جيرانها" : "Price next to its neighbours"}</h2>
                <p className="mt-1 text-[15px] text-muted">
                  {ar ? `سعر المتر${p.listing_type === "lease" ? " بالسنة" : ""}، من أراضي محفظتنا الفعلية` : `Price per m²${p.listing_type === "lease" ? " a year" : ""}, from our actual portfolio`}
                </p>
                <div className="mt-5 space-y-3.5">
                  {bars.map((b, i) => (
                    <div key={i}>
                      <div className="mb-1 flex items-baseline justify-between text-[14px]">
                        <span className={b.me ? "font-semibold" : "text-muted"}>{b.label[lang]}</span>
                        <span className={`tabular-nums ${b.me ? "font-semibold" : "text-muted"}`}>{num(b.v ?? 0, lang)}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white/70">
                        <div className={`h-full rounded-full ${b.me ? "bg-gradient-to-l from-[#e2c891] to-apricot" : "bg-ink/15"}`} style={{ width: `${((b.v ?? 0) / maxBar) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="glass rounded-[30px] p-6">
              <h2 className="text-2xl font-bold">{ar ? "يومك من هنا" : "A day from here"}</h2>
              <p className="mt-1 text-[15px] text-muted">{ar ? "وين بتكون الرياض منك لو صارت هذي أرضك." : "Where Riyadh sits from your door, if this were yours."}</p>
              <ol className="relative mt-5 space-y-4 ps-9">
                <span aria-hidden className="absolute inset-y-2 start-[15px] w-[2px] rounded-full bg-gradient-to-b from-[#e2c891] via-apricot to-[#2b2f3a]" />
                {(p.land_type === "residential" ? [
                  { k: "kafd" as const, icon: "🌅", ar: "الصبح، رايح الدوام", en: "Morning, off to work", tail: { ar: "وأنت في المركز المالي", en: "and you're at the financial district" } },
                  { k: "kingdom" as const, icon: "☕", ar: "الظهر، مشوار للعليا", en: "Midday, a run to Olaya", tail: { ar: "وأنت عند برج المملكة", en: "to Kingdom Centre" } },
                  { k: "airport" as const, icon: "✈️", ar: "عندك سفرة؟", en: "Catching a flight?", tail: { ar: "وأنت في المطار", en: "to the airport" } },
                  { k: "diriyah" as const, icon: "🌙", ar: "ليلة الويكند", en: "Weekend evening", tail: { ar: "وأنت تتمشى في الدرعية", en: "and you're strolling in Diriyah" } },
                ] : [
                  { k: "kingdom" as const, icon: "🤝", ar: "عملاءك من قلب الرياض", en: "Clients from central Riyadh", tail: { ar: "من العليا لبابك", en: "from Olaya to your door" } },
                  { k: "kafd" as const, icon: "💼", ar: "اجتماع في المركز المالي", en: "A meeting at the financial district", tail: { ar: "وأنت هناك", en: "and you're there" } },
                  { k: "airport" as const, icon: "📦", ar: "شحنة أو ضيف من المطار", en: "A shipment or guest from the airport", tail: { ar: "ويوصلك", en: "to reach you" } },
                  { k: "diriyah" as const, icon: "🌙", ar: "عشا عمل في الدرعية", en: "A business dinner in Diriyah", tail: { ar: "من مكانك", en: "from here" } },
                ]).map((s) => (
                  <li key={s.k} className="relative">
                    <span aria-hidden className="absolute -start-9 top-0 grid h-8 w-8 place-items-center rounded-full bg-white text-[16px] shadow-sm ring-1 ring-black/5">{s.icon}</span>
                    <p className="text-[14px] text-muted">{ar ? s.ar : s.en}</p>
                    <p className="text-[17px]"><b className="font-semibold">{minutes(p.drive[s.k].min, lang)}</b> {s.tail[lang]}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-[13px] text-muted">
                {p.drive_estimated
                  ? (ar ? "أوقات تقريبية محسوبة من المسافة، بدون زحمة. نحدّثها بالطرق الفعلية قريب." : "Approximate times worked out from distance, without traffic. We'll update them with real routes soon.")
                  : (ar ? "وقت السواقة بدون زحمة، محسوب على الطرق الفعلية. وقت الذروة غالباً أطول." : "Driving time without traffic, on real roads. Rush hour usually takes longer.")}
              </p>
            </section>

            {similar.length > 0 && (
              <section>
                <h2 className="px-1 text-2xl font-bold">{ar ? "أراضي تشبهها" : "Similar properties"}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {similar.map((s) => <ParcelCard key={s.parcel_id} p={s} from="similar" />)}
                </div>
              </section>
            )}
          </div>

          {/* Action card */}
          <aside className="order-first lg:order-none lg:sticky lg:top-24 lg:self-start">
            <div className="glass rounded-[30px] p-6">
              <p className={`text-[32px] font-bold leading-tight ${closed ? "text-muted" : ""}`}>{priceLabel(p, lang)}</p>
              {p.price_per_sqm_sar != null && <p className="mt-1 text-muted">{sqmPrice(p, lang)}</p>}
              <div className="mt-4 flex flex-wrap gap-1.5 text-[14px]">
                <span className="rounded-full bg-white/80 px-3 py-1.5">📐 {sqm(p.area_sqm, lang)}</span>
                <span className="rounded-full bg-white/80 px-3 py-1.5">🛣️ {street(p.street_width_m, lang)}</span>
                <span className="rounded-full bg-white/80 px-3 py-1.5">{p.land_type === "residential" ? "🏡" : "🏬"} {TYPE_LABEL[p.land_type][lang]}</span>
              </div>
              {p.total_price_sar != null && p.listing_type === "sale" && !closed && (
                <p className="mt-3 text-[13px] text-muted">
                  {ar ? `ضريبة التصرفات العقارية 5% تقريباً ${money(p.total_price_sar * 0.05, lang)}` : `5% real estate transaction tax, roughly ${money(p.total_price_sar * 0.05, lang)}`}
                </p>
              )}
              {p.total_price_sar != null && p.listing_type === "lease" && !closed && (
                <p className="mt-3 text-[13px] text-muted">{ar ? `يعني تقريباً ${money(Math.round(p.total_price_sar / 12), lang)} بالشهر` : `About ${money(Math.round(p.total_price_sar / 12), lang)} a month`}</p>
              )}

              <div className="mt-5 border-t border-hair pt-5">
                {p.status === "available" && <LeadForm parcelId={p.parcel_id} />}
                {p.status === "reserved" && (
                  <AlertForm criteria={{ waitlist: p.parcel_id }} title={{ ar: "أحد حجزها قبلك 😅", en: "Someone reserved it first 😅" }} summary={{
                    ar: "بس الحجوزات أحياناً ما تكمل. خلّ رقمك ونعلمك أول ما ترجع متاحة.",
                    en: "Reservations sometimes fall through. Leave your number and we'll tell you first if it opens up.",
                  }} />
                )}
                {closed && (
                  <div>
                    <p className="text-lg font-semibold">{ar ? `هالأرض ${STATUS_LABEL[p.status].ar}` : `This one's ${STATUS_LABEL[p.status].en.toLowerCase()}`}</p>
                    <p className="mt-1 text-[15px] text-muted">{ar ? "نعرضها عشان تقارن الأسعار. شوف اللي يشبهها ومتاح الحين." : "We show it so you can compare prices. See similar properties available now."}</p>
                    <Link href={`/lands?area=${p.area_of_city}&type=${p.land_type}&deal=${p.listing_type}`} className="btn-primary mt-3 block px-4 py-3 text-center font-medium">
                      {ar ? "أراضي مشابهة متاحة" : "Similar available properties"}
                    </Link>
                  </div>
                )}
                <a href={wa} target="_blank" rel="noopener" onClick={() => track("whatsapp_click", { from: "parcel" }, p.parcel_id)}
                  className="btn-wa mt-3 block w-full px-4 py-3.5 text-center font-semibold">
                  {ar ? "اسألنا عنها واتساب" : "Ask us on WhatsApp"}
                </a>
                <button onClick={() => openChat()} className="bubble mt-2 block w-full px-4 py-3 text-center font-medium">
                  💬 {ar ? "اسأل المستشار عنها الحين" : "Ask our advisor about it now"}
                </button>
              </div>
            </div>
            <p className="mt-2 px-2 text-center text-[12px] text-muted" dir="ltr">{p.parcel_id}</p>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
