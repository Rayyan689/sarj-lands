"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { parcels, portfolio, AREAS, type Parcel } from "@/lib/portfolio";
import { AREA_LABEL, money, num } from "@/lib/format";
import { daysSince } from "@/lib/time";

/*
  Our track record, told with the real closed deals.
  Every property is a dot at its true location; closed deals light up as you scroll.
  Only claims the data supports: deals are "listed at" asking prices; "closed within X days"
  is the gap between the listing date and the date the status was recorded.
*/

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ramp = (p: number, a: number, b: number) => clamp((p - a) / (b - a));

// Project real coordinates into the drawing (lng scaled by cos(lat) so Riyadh keeps its shape).
const LNG0 = 46.43, LNG1 = 46.98, LAT0 = 24.42, LAT1 = 25.0;
const W = 600, H = 560, PAD = 34;
const k = Math.cos((24.7 * Math.PI) / 180);
const spanX = (LNG1 - LNG0) * k, spanY = LAT1 - LAT0;
const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY);
const offX = (W - spanX * scale) / 2, offY = (H - spanY * scale) / 2;
const proj = (p: { lat: number; lng: number }) => [offX + (p.lng - LNG0) * k * scale, offY + (LAT1 - p.lat) * scale] as const;

export default function TrackRecord({ onStart }: { onStart: () => void }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      setP(clamp(total > 0 ? -r.top / total : 0));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);

  const d = useMemo(() => {
    const closed = parcels.filter((x) => x.status === "sold" || x.status === "leased")
      .sort((a, b) => a.listed_date.localeCompare(b.listed_date));
    const sold = closed.filter((x) => x.status === "sold");
    const leased = closed.filter((x) => x.status === "leased");
    // days between listing and the date the closed status was recorded (an upper bound on time to close)
    const within = (x: Parcel) => daysSince(x.listed_date, portfolio.snapshot_date);
    const fast = closed.filter((x) => within(x) <= 30);
    const fastest = [...closed].sort((a, b) => within(a) - within(b))[0];
    const biggest = [...sold].sort((a, b) => (b.total_price_sar ?? 0) - (a.total_price_sar ?? 0))[0];
    const byArea = AREAS.map((a) => ({ a, n: closed.filter((x) => x.area_of_city === a).length }))
      .sort((x, y) => y.n - x.n);
    const areaCenter = Object.fromEntries(AREAS.map((a) => {
      const xs = parcels.filter((x) => x.area_of_city === a).map(proj);
      return [a, [xs.reduce((s, q) => s + q[0], 0) / xs.length, xs.reduce((s, q) => s + q[1], 0) / xs.length]];
    })) as Record<string, [number, number]>;
    return {
      closed, sold, leased, fast, fastest, fastestDays: within(fastest), biggest, byArea, areaCenter,
      fastIds: new Set(fast.map((x) => x.parcel_id)),
      districts: new Set(closed.map((x) => x.district_en)).size,
      soldValue: sold.reduce((s, x) => s + (x.total_price_sar ?? 0), 0),
      rent: leased.reduce((s, x) => s + (x.total_price_sar ?? 0), 0),
    };
  }, []);

  const reveal = ramp(p, 0.02, 0.24);            // closed deals light up one by one
  const shown = Math.round(reveal * d.closed.length);
  const areas = ramp(p, 0.26, 0.36);
  const speed = ramp(p, 0.46, 0.56);
  const big = ramp(p, 0.66, 0.76);
  const order = new Map(d.closed.map((x, i) => [x.parcel_id, i]));

  const steps = [
    { t: { ar: "هذي قصتنا بالأرقام", en: "Our story, in numbers" },
      d: { ar: `من نفس هالمحفظة تمت ${d.closed.length} صفقة: بعنا ${d.sold.length} أرض وأجّرنا ${d.leased.length}. كل نقطة ذهبية صفقة حقيقية.`, en: `${d.closed.length} deals closed from this same portfolio: ${d.sold.length} sold and ${d.leased.length} leased. Every gold dot is a real deal.` } },
    { t: { ar: "في كل جهات الرياض", en: "All across Riyadh" },
      d: { ar: `صفقات في ${d.districts} حي، وفي كل الجهات الخمس. أكثرها في ${AREA_LABEL[d.byArea[0].a].ar} (${d.byArea[0].n} صفقة).`, en: `Deals in ${d.districts} districts and all five parts of the city. Most in ${AREA_LABEL[d.byArea[0].a].en} (${d.byArea[0].n}).` } },
    { t: { ar: "والأرض الحلوة ما تطوّل", en: "Good land doesn't wait" },
      d: { ar: `${d.fast.length} صفقة تمت خلال أقل من شهر من نزول الأرض. أرض ${d.fastest.district_ar} انباعت خلال ${d.fastestDays} يوم بس.`, en: `${d.fast.length} deals closed less than a month after listing. The ${d.fastest.district_en} plot sold within ${d.fastestDays} days.` } },
    { t: { ar: `أكبر صفقة: ${d.biggest.district_ar}`, en: `Biggest deal: ${d.biggest.district_en}` },
      d: { ar: `${num(d.biggest.area_sqm, "ar")} م² على شارع ${d.biggest.street_width_m} م، كانت معروضة بـ ${money(d.biggest.total_price_sar!, "ar")} وانباعت.`, en: `${num(d.biggest.area_sqm, "en")} m² on a ${d.biggest.street_width_m} m road, listed at ${money(d.biggest.total_price_sar!, "en")} and sold.` } },
    { t: { ar: "وما نخبي الأسعار", en: "And we don't hide prices" },
      d: { ar: `${money(d.soldValue, "ar")} مبيعات و${money(d.rent, "ar")} إيجار بالسنة. كل صفقة تمت تقدر تشوفها وتقارن فيها قبل لا تقرر.`, en: `${money(d.soldValue, "en")} in sales and ${money(d.rent, "en")} a year in leases. You can see every closed deal and compare before you decide.` } },
  ];
  const active = Math.min(steps.length - 1, Math.floor(p * steps.length * 1.04));
  const [bx, by] = proj(d.biggest);
  const counter = Math.round(reveal * d.closed.length);

  return (
    <section ref={ref} aria-label={ar ? "سجلّنا" : "Our track record"} className="relative mx-auto max-w-6xl px-3 sm:px-5" style={{ height: `${steps.length * 80 + 40}vh` }}>
      <div className="sticky top-[4.5rem] grid h-[calc(100vh-5.25rem)] grid-rows-[minmax(0,1fr)_auto] gap-4 pb-16 lg:top-24 lg:h-[calc(100vh-7rem)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:grid-rows-1 lg:items-center lg:pb-0">
        {/* the map of deals */}
        <div className="relative min-h-0 lg:h-full">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img"
            aria-label={ar ? `خريطة لكل الأراضي، والصفقات اللي تمت باللون الذهبي (${d.closed.length})` : `Map of all properties with ${d.closed.length} closed deals in gold`}>
            <defs>
              <radialGradient id="tr-bg" cx="50%" cy="50%" r="55%">
                <stop offset="0" stopColor="rgba(201,161,91,.16)" /><stop offset="1" stopColor="rgba(201,161,91,0)" />
              </radialGradient>
            </defs>
            <ellipse cx={W / 2} cy={H / 2} rx={W * 0.48} ry={H * 0.47} fill="url(#tr-bg)" />
            {/* every property */}
            {parcels.map((x) => {
              const [cx, cy] = proj(x);
              const i = order.get(x.parcel_id);
              const lit = i != null && i < shown;
              const fast = lit && d.fastIds.has(x.parcel_id);
              const dim = big > 0 && x.parcel_id !== d.biggest.parcel_id ? 1 - big * 0.55 : 1;
              return (
                <g key={x.parcel_id} opacity={dim}>
                  {fast && speed > 0 && <circle cx={cx} cy={cy} r={6 + 6 * speed} fill="none" stroke="#c9a15b" strokeOpacity={0.55 * speed * (1 - big)} strokeWidth="1.5" />}
                  <circle cx={cx} cy={cy} r={lit ? 5.5 : 3.6}
                    fill={lit ? "#c9a15b" : "rgba(255,255,255,.9)"} stroke={lit ? "#fff" : "#cfc6b8"} strokeWidth={lit ? 1.6 : 1.2} />
                </g>
              );
            })}
            {/* area labels with counts, on pills so they stay readable over the dots */}
            {d.byArea.map(({ a, n }) => {
              const [x, y] = d.areaCenter[a];
              const w = ar ? 104 : 118;
              return (
                <g key={a} opacity={areas * (1 - big)}>
                  <rect x={x - w / 2} y={y - 22} width={w} height={44} rx={14} fill="rgba(255,255,255,.92)" stroke="rgba(31,31,31,.1)" />
                  <text x={x} y={y - 5} textAnchor="middle" fontSize="12" fill="#6b6760" fontFamily="Rubik, sans-serif">{AREA_LABEL[a][lang]}</text>
                  <text x={x} y={y + 14} textAnchor="middle" fontSize="16" fontWeight="700" fill="#1f1f1f" fontFamily="Rubik, sans-serif">
                    {ar ? `${n} صفقة` : `${n} deals`}
                  </text>
                </g>
              );
            })}
            {/* biggest deal callout */}
            {big > 0 && (
              <g opacity={big}>
                <circle cx={bx} cy={by} r={16} fill="none" stroke="#1f1f1f" strokeWidth="1.5" />
                <line x1={bx} y1={by - 16} x2={bx} y2={by - 52} stroke="#1f1f1f" strokeWidth="1.2" />
                <rect x={bx - 92} y={by - 112} width={184} height={60} rx={16} fill="rgba(255,255,255,.95)" stroke="rgba(31,31,31,.12)" />
                <text x={bx} y={by - 88} textAnchor="middle" fontSize="13" fill="#6b6760" fontFamily="Rubik, sans-serif">{ar ? `حي ${d.biggest.district_ar}` : d.biggest.district_en}</text>
                <text x={bx} y={by - 66} textAnchor="middle" fontSize="17" fontWeight="700" fill="#1f1f1f" fontFamily="Rubik, sans-serif">{money(d.biggest.total_price_sar!, lang)}</text>
              </g>
            )}
          </svg>
          {/* live counter */}
          <div className="glass pointer-events-none absolute start-2 top-2 rounded-[22px] px-4 py-3 sm:start-4 sm:top-4">
            <p className="text-[34px] font-bold leading-none tabular-nums">{counter}</p>
            <p className="mt-1 text-[12px] text-muted">{ar ? "صفقة تمت" : "deals closed"}</p>
          </div>
        </div>

        {/* words */}
        <div>
          <div className="glass rounded-[30px] p-6 sm:p-7">
            <div className="mb-4 flex gap-1.5" aria-hidden>
              {steps.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-8 bg-apricot" : "w-3 bg-ink/15"}`} />)}
            </div>
            <div key={active} className="step-in">
              <h2 className="text-[26px] font-bold leading-snug sm:text-3xl">{steps[active].t[lang]}</h2>
              <p className="mt-2 text-[16px] leading-relaxed text-muted sm:text-[17px]">{steps[active].d[lang]}</p>
            </div>
            {active === steps.length - 1 && (
              <div className="step-in mt-5 flex flex-wrap gap-2">
                <button onClick={onStart} className="btn-primary px-5 py-2.5 font-medium">{ar ? "طلّع لي أرض" : "Find my property"}</button>
                <Link href="/lands?closed=1" className="bubble px-5 py-2.5">{ar ? "شوف الصفقات وقارن" : "See the deals and compare"}</Link>
              </div>
            )}
          </div>
          <p className="mt-3 px-2 text-[12px] text-muted">
            {ar ? "الأسعار المذكورة أسعار عرض. مدة الصفقة محسوبة من تاريخ عرض الأرض لين تاريخ تسجيل البيع أو الإيجار." : "Prices shown are listing prices. Time to close is counted from the listing date to the date the sale or lease was recorded."}
          </p>
        </div>
      </div>
    </section>
  );
}
