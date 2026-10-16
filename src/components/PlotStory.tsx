"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { available, districtCount, parcels, type Parcel } from "@/lib/portfolio";
import { AREA_LABEL, money, num } from "@/lib/format";

/*
  A quiet scroll story: one plot of land, drawn in isometric line-art,
  gains its boundary, street, honest price and finally a home as the visitor scrolls.
  Every number on it comes from a real parcel in the portfolio.
*/

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ramp = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const S = 26, CX = 300, CY = 150;
const iso = (x: number, y: number, z = 0): [number, number] => [CX + (x - y) * 0.866 * S, CY + (x + y) * 0.5 * S - z * S];
const pts = (...ps: [number, number][]) => ps.map((q) => q.join(",")).join(" ");

/** An isometric box with three visible faces. h scales its height (0..1). */
function Box({ x0, x1, y0, y1, z0, z1, h, lit }: { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number; h: number; lit: number }) {
  if (h <= 0.001) return null;
  const top = z0 + (z1 - z0) * h;
  const winOn = `rgba(201,161,91,${0.25 + 0.75 * lit})`;
  const winOff = "rgba(31,31,31,0.16)";
  const win = lit > 0 ? winOn : winOff;
  // windows on the two visible walls, only once the wall is tall enough
  const wins: React.ReactNode[] = [];
  if (h > 0.6) {
    const wz0 = z0 + (top - z0) * 0.35, wz1 = z0 + (top - z0) * 0.7;
    for (let i = 0; i < 2; i++) {
      const a = x0 + (x1 - x0) * (0.2 + i * 0.4), b = a + (x1 - x0) * 0.2;
      wins.push(<polygon key={`r${i}`} points={pts(iso(a, y1, wz0), iso(b, y1, wz0), iso(b, y1, wz1), iso(a, y1, wz1))} fill={win} />);
    }
    const c = y0 + (y1 - y0) * 0.3, d = c + (y1 - y0) * 0.35;
    wins.push(<polygon key="l" points={pts(iso(x1, c, wz0), iso(x1, d, wz0), iso(x1, d, wz1), iso(x1, c, wz1))} fill={win} />);
  }
  return (
    <g>
      <polygon points={pts(iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, top), iso(x0, y1, top))} fill="#f6f1e9" stroke="#1f1f1f" strokeWidth="1.2" strokeLinejoin="round" />
      <polygon points={pts(iso(x1, y0, z0), iso(x1, y1, z0), iso(x1, y1, top), iso(x1, y0, top))} fill="#e9e1d4" stroke="#1f1f1f" strokeWidth="1.2" strokeLinejoin="round" />
      <polygon points={pts(iso(x0, y0, top), iso(x1, y0, top), iso(x1, y1, top), iso(x0, y1, top))} fill="#fffdf9" stroke="#1f1f1f" strokeWidth="1.2" strokeLinejoin="round" />
      {wins}
    </g>
  );
}

function Palm({ x, y, k }: { x: number; y: number; k: number }) {
  if (k <= 0.001) return null;
  const [bx, by] = iso(x, y, 0);
  return (
    <g transform={`translate(${bx},${by}) scale(${k}) translate(${-bx},${-by})`}>
      <path d={`M${bx},${by} q4,-22 2,-44`} stroke="#8c6a2f" strokeWidth="3" fill="none" strokeLinecap="round" />
      {[-60, -20, 20, 60, 100].map((r) => (
        <path key={r} d={`M${bx + 2},${by - 44} q14,-6 24,6`} stroke="#6f7f55" strokeWidth="3" fill="none" strokeLinecap="round" transform={`rotate(${r} ${bx + 2} ${by - 44})`} />
      ))}
    </g>
  );
}

function Chip({ x, y, o, children, w = 120 }: { x: number; y: number; o: number; children: React.ReactNode; w?: number }) {
  if (o <= 0.001) return null;
  return (
    <g opacity={o} transform={`translate(0 ${(1 - o) * 8})`}>
      <rect x={x - w / 2} y={y - 15} width={w} height={30} rx={15} fill="rgba(255,255,255,.9)" stroke="rgba(31,31,31,.12)" />
      <text x={x} y={y + 5} textAnchor="middle" fontSize="13" fontWeight="600" fill="#1f1f1f" fontFamily="Rubik, sans-serif">{children}</text>
    </g>
  );
}

function Scene({ p, hero, lang }: { p: number; hero: Parcel; lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const boundary = ramp(p, 0.12, 0.3);
  const details = ramp(p, 0.22, 0.34);
  const price = ramp(p, 0.42, 0.52);
  const floor1 = ramp(p, 0.6, 0.72);
  const floor2 = ramp(p, 0.7, 0.8);
  const palms = ramp(p, 0.76, 0.86);
  const lit = ramp(p, 0.84, 0.95);
  const sunX = 140 + p * 320, sunY = 70 - Math.sin(p * Math.PI) * 26;
  const corners = [iso(1.5, 1.4), iso(8.5, 1.4), iso(8.5, 7.7), iso(1.5, 7.7)];
  const per = corners.reduce((sum, c, i) => { const n = corners[(i + 1) % 4]; return sum + Math.hypot(n[0] - c[0], n[1] - c[1]); }, 0) + 1;
  const v = hero.pricing.vs_area_pct ?? 0;
  const med = hero.pricing.area_median_sqm ?? 0;
  const me = hero.price_per_sqm_sar ?? 0;

  return (
    <svg viewBox="0 0 600 520" className="h-full w-full" role="img"
      aria-label={ar ? "رسم لأرض يتحول لبيت مع النزول" : "Illustration of a plot becoming a home as you scroll"}>
      <defs>
        <radialGradient id="glow" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor={`rgba(201,161,91,${0.18 + lit * 0.22})`} />
          <stop offset="1" stopColor="rgba(201,161,91,0)" />
        </radialGradient>
      </defs>
      <circle cx="300" cy="260" r="260" fill="url(#glow)" />
      <circle cx={sunX} cy={sunY} r="16" fill="#e2c891" opacity="0.9" />

      {/* ground slab */}
      <polygon points={pts(iso(0, 10, 0), iso(10, 10, 0), iso(10, 10, -0.5), iso(0, 10, -0.5))} fill="#e3d6bf" />
      <polygon points={pts(iso(10, 0, 0), iso(10, 10, 0), iso(10, 10, -0.5), iso(10, 0, -0.5))} fill="#d8c9ae" />
      <polygon points={pts(iso(0, 0), iso(10, 0), iso(10, 10), iso(0, 10))} fill="#f1e8d8" stroke="#d8c9ae" />
      {Array.from({ length: 9 }, (_, i) => i + 1).map((i) => (
        <g key={i} stroke="rgba(31,31,31,.06)">
          <line x1={iso(i, 0)[0]} y1={iso(i, 0)[1]} x2={iso(i, 10)[0]} y2={iso(i, 10)[1]} />
          <line x1={iso(0, i)[0]} y1={iso(0, i)[1]} x2={iso(10, i)[0]} y2={iso(10, i)[1]} />
        </g>
      ))}

      {/* street along the front edge */}
      <g opacity={details}>
        <polygon points={pts(iso(0, 8.6), iso(10, 8.6), iso(10, 10), iso(0, 10))} fill="#3a3a3a" />
        <line x1={iso(0.4, 9.3)[0]} y1={iso(0.4, 9.3)[1]} x2={iso(9.6, 9.3)[0]} y2={iso(9.6, 9.3)[1]} stroke="#f1e8d8" strokeWidth="2" strokeDasharray="10 10" />
      </g>

      {/* plot boundary draws itself */}
      <polygon points={pts(iso(1.5, 1.4), iso(8.5, 1.4), iso(8.5, 7.7), iso(1.5, 7.7))} fill={`rgba(201,161,91,${0.08 * boundary})`}
        stroke="#c9a15b" strokeWidth="2.5" strokeLinejoin="round" strokeDasharray={per} strokeDashoffset={per * (1 - boundary)} />
      {boundary > 0.98 && [iso(1.5, 1.4), iso(8.5, 1.4), iso(8.5, 7.7), iso(1.5, 7.7)].map((q, i) => (
        <circle key={i} cx={q[0]} cy={q[1]} r="4" fill="#c9a15b" stroke="#fff" strokeWidth="1.5" />
      ))}

      {/* the home */}
      <Box x0={3} x1={7} y0={2.4} y1={6.4} z0={0} z1={1.6} h={floor1} lit={lit} />
      <Box x0={3} x1={5.6} y0={2.4} y1={4.8} z0={1.6} z1={2.9} h={floor2} lit={lit} />
      <Palm x={7.8} y={6.9} k={palms} />
      <Palm x={2} y={7.2} k={palms * 0.85} />

      {/* real numbers */}
      <Chip x={iso(1.2, 4.6)[0] - 20} y={iso(1.2, 4.6)[1]} o={details * (1 - floor1 * 0.6)}>
        {ar ? `${num(hero.area_sqm, "ar")} م²` : `${num(hero.area_sqm, "en")} m²`}
      </Chip>
      <Chip x={iso(5, 10.2)[0]} y={iso(5, 10.2)[1] + 22} o={details} w={130}>
        {ar ? `شارع ${hero.street_width_m} م` : `${hero.street_width_m} m street`}
      </Chip>
      {price > 0.001 && (
        <g opacity={price * (1 - lit * 0.15)} transform={`translate(0 ${(1 - price) * 10})`}>
          <rect x="392" y="40" width="190" height="96" rx="18" fill="rgba(255,255,255,.92)" stroke="rgba(31,31,31,.12)" />
          <text x="487" y="64" textAnchor="middle" fontSize="12" fill="#6b6760" fontFamily="Rubik, sans-serif">{ar ? "سعر المتر" : "Price per m²"}</text>
          <rect x="410" y="74" width={154 * (me / Math.max(me, med))} height="9" rx="4.5" fill="#c9a15b" />
          <rect x="410" y="90" width={154 * (med / Math.max(me, med))} height="9" rx="4.5" fill="rgba(31,31,31,.18)" />
          <text x="487" y="122" textAnchor="middle" fontSize="13" fontWeight="600" fill="#8c6a2f" fontFamily="Rubik, sans-serif">
            {ar ? `أرخص من المتوسط بـ ${Math.abs(v)}%` : `${Math.abs(v)}% below average`}
          </text>
        </g>
      )}
    </svg>
  );
}

export default function PlotStory({ onStart }: { onStart: () => void }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);

  // The featured parcel: best-priced available home plot against its own area. Real data, not a mock.
  const hero = useMemo(() => available
    .filter((x) => x.land_type === "residential" && x.listing_type === "sale" && x.pricing.vs_area_pct != null)
    .sort((a, b) => a.pricing.vs_area_pct! - b.pricing.vs_area_pct!)[0], []);

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

  const sold = parcels.filter((x) => x.status === "sold").length;
  const leased = parcels.filter((x) => x.status === "leased").length;
  const v = Math.abs(hero.pricing.vs_area_pct ?? 0);

  const steps = [
    { t: { ar: "كل مشروع يبدأ بأرض", en: "Every project starts with a plot" },
      d: { ar: `عندنا ${available.length} أرض متاحة في ${districtCount} حي، من شمال الرياض لجنوبها.`, en: `We have ${available.length} properties available across ${districtCount} districts, from north Riyadh to south.` } },
    { t: { ar: "نعرف كل تفاصيلها", en: "We know every detail" },
      d: { ar: "مساحتها، عرض شارعها، وكم دقيقة بالسيارة لأهم أماكن الرياض. محسوبة على الطرق الفعلية.", en: "Its size, its street width, and how many minutes it is by car to Riyadh's key places, on real roads." } },
    { t: { ar: "ونقولك سعرها بصراحة", en: "And we're honest about price" },
      d: { ar: `نقارن سعر كل متر بجيرانها وباللي انباع حولها. مثلاً أرض حي ${hero.district_ar} أرخص من متوسط ${AREA_LABEL[hero.area_of_city].ar} بـ ${v}%.`, en: `We compare every price per m² with its neighbours and nearby sales. ${hero.district_en}, for example, is ${v}% below the ${AREA_LABEL[hero.area_of_city].en} average.` } },
    { t: { ar: "وتشوف خطتك تكبر قدامك", en: "Then watch your plan take shape" },
      d: { ar: "بيت للعايلة، فلل، معرض أو مستودع. علّمنا وش ناوي، ونرتب لك الأراضي حسب اللي يناسبه.", en: "A family home, villas, a showroom or a warehouse. Tell us your plan and we rank properties by how well they fit it." } },
  ];
  const active = Math.min(steps.length - 1, Math.floor(p * steps.length * 1.05));

  return (
    <section ref={ref} className="relative mx-auto max-w-6xl px-3 sm:px-5" style={{ height: `${steps.length * 85 + 40}vh` }}>
      <div className="sticky top-[4.75rem] grid h-[calc(100vh-5.5rem)] pb-16 lg:pb-0 grid-rows-[minmax(0,1fr)_auto] gap-4 lg:top-24 lg:h-[calc(100vh-7rem)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:grid-rows-1 lg:items-center">
        {/* words */}
        <div className="order-2 lg:order-1">
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
                <Link href={`/lands/${hero.parcel_id}`} className="bubble px-5 py-2.5">
                  {ar ? `شوف أرض ${hero.district_ar}، ${money(hero.total_price_sar!, "ar")}` : `See ${hero.district_en}, ${money(hero.total_price_sar!, "en")}`}
                </Link>
              </div>
            )}
          </div>
          <p className="mt-3 px-2 text-[13px] text-muted">
            {ar ? `بعنا ${sold} أرض وأجّرنا ${leased} من نفس هالمحفظة.` : `We've sold ${sold} and leased ${leased} properties from this same portfolio.`}
          </p>
        </div>
        {/* picture */}
        <div className="order-1 min-h-0 lg:order-2 lg:h-full">
          <Scene p={p} hero={hero} lang={lang} />
        </div>
      </div>
    </section>
  );
}
