"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";
import { AREAS, portfolio, type Area, type Deal, type LandType } from "@/lib/portfolio";
import { AREA_LABEL, AREA_SHORT, DEAL_LABEL, TYPE_LABEL, money, num } from "@/lib/format";
import ParcelMap from "@/components/ParcelMap";
import { Card, PageHeader, Pill, STATUS_T, INTENT_T, type Lang } from "../../ui";

type Buyer = { id: string; name: string; name_ar: string; wants_ar: string; wants: string; budget: number; status: string; intent: string; waiting: number; wa: string };
type Saved = { parcel: { parcel_id: string; district_ar: string; district_en: string; pricing: { vs_area_pct?: number }; segment_demand: number }; buyers: Buyer[] };

const originals = portfolio.parcels;
const dist = (a: [number, number], lng: number, lat: number) => Math.hypot((a[0] - lng) * Math.cos((lat * Math.PI) / 180), a[1] - lat) * 111;

const ERR: Record<string, { ar: string; en: string }> = {
  location: { ar: "اختر مكان الأرض على الخريطة (داخل الرياض).", en: "Pick the property's spot on the map (inside Riyadh)." },
  district_ar: { ar: "اكتب اسم الحي.", en: "Enter the district name." },
  area_sqm: { ar: "المساحة لازم تكون بين 100 و500,000 م².", en: "Size must be between 100 and 500,000 m²." },
  street_width_m: { ar: "عرض الشارع لازم يكون بين 6 و120 م.", en: "Street width must be between 6 and 120 m." },
  total_price_sar: { ar: "اكتب سعر منطقي، أو علّم إن السعر عند الطلب.", en: "Enter a realistic price, or mark it as price on request." },
  rate: { ar: "أضفت أراضي كثير بوقت قصير. جرّب بعد شوي.", en: "Too many properties added in a short time. Try again shortly." },
  db: { ar: "ما قدرنا نحفظها الحين. جرّب مرة ثانية.", en: "Couldn't save it right now. Please try again." },
};

export default function AddProperty() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [near, setNear] = useState<string | null>(null);
  const [f, setF] = useState({ district_ar: "", district_en: "", area: "North" as Area, type: "residential" as LandType, deal: "sale" as Deal, sqm: "", street: "", price: "", onRequest: false });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setErr(null); };

  // Picking a spot suggests the district and area from the nearest property we already know.
  const pick = (lng: number, lat: number) => {
    setPin([lng, lat]); setErr(null);
    const n = [...originals].sort((a, b) => dist([a.lng, a.lat], lng, lat) - dist([b.lng, b.lat], lng, lat))[0];
    const d = dist([n.lng, n.lat], lng, lat);
    if (d < 2.5) {
      setNear(ar ? `قريبة من حي ${n.district_ar} (${d.toFixed(1)} كم)` : `Near ${n.district_en} (${d.toFixed(1)} km)`);
      setF((x) => ({ ...x, district_ar: x.district_ar || n.district_ar, district_en: x.district_en || n.district_en, area: n.area_of_city }));
    } else {
      setNear(null);
      setF((x) => ({ ...x, area: n.area_of_city }));
    }
  };

  const sqm = Number(f.sqm), price = Number(f.price);
  const insight = useMemo(() => {
    if (!sqm || f.onRequest || !price) return null;
    const per = price / sqm;
    const peers = originals.filter((p) => p.area_of_city === f.area && p.land_type === f.type && p.listing_type === f.deal && p.price_per_sqm_sar);
    if (!peers.length) return { per, vs: null as number | null, n: 0 };
    const s = peers.map((p) => p.price_per_sqm_sar!).sort((a, b) => a - b);
    const med = s[Math.floor(s.length / 2)];
    return { per, vs: Math.round((per / med - 1) * 100), n: peers.length, med };
  }, [sqm, price, f.onRequest, f.area, f.type, f.deal]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return setErr("location");
    if (f.district_ar.trim().length < 2) return setErr("district_ar");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/listings", {
        method: "POST", headers: { "content-type": "application/json", "x-sarj-admin": "1" },
        body: JSON.stringify({ district_ar: f.district_ar, district_en: f.district_en, area_of_city: f.area, land_type: f.type, listing_type: f.deal,
          area_sqm: sqm, street_width_m: Number(f.street), total_price_sar: f.onRequest ? null : price, lat: pin[1], lng: pin[0] }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.field ?? d.error ?? "db"); return; }
      setSaved(d);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch { setErr("db"); } finally { setBusy(false); }
  };

  if (saved) return <Done saved={saved} lang={lang} onAnother={() => { setSaved(null); setPin(null); setNear(null); setF((x) => ({ ...x, district_ar: "", district_en: "", sqm: "", street: "", price: "", onRequest: false })); }} />;

  const seg = <V extends string>(value: V, options: [V, string][], on: (v: V) => void, label: string) => (
    <div className="glass-soft inline-flex flex-wrap gap-0.5 rounded-full p-1" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <button type="button" key={v} role="radio" aria-checked={value === v} onClick={() => on(v)}
          className={`rounded-full px-3.5 py-1.5 text-[14px] ${value === v ? "bg-ink font-medium text-white" : "text-muted hover:text-ink"}`}>{l}</button>
      ))}
    </div>
  );

  return (
    <>
      <PageHeader title={ar ? "أضف أرض جديدة" : "Add a new property"}
        sub={ar ? "حدد مكانها على الخريطة وعبّ تفاصيلها. أول ما تحفظها تنزل على الموقع، ونقولك مين من المستثمرين ينتظر أرض مثلها." : "Mark it on the map and fill in the details. The moment you save, it goes live on the site, and we'll tell you which investors are waiting for one like it."}>
        <Link href="/admin/properties" className="bubble px-4 py-2 text-[14px]">{ar ? "رجوع للأراضي" : "Back to properties"}</Link>
      </PageHeader>
      <form onSubmit={submit} className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card title={ar ? "1. وين الأرض؟" : "1. Where is it?"} sub={ar ? "اضغط على مكانها بالخريطة. النقاط الذهبية أراضينا الحالية." : "Click its spot on the map. Gold dots are our current properties."}>
          <div className={`h-[420px] overflow-hidden rounded-[20px] ${err === "location" ? "ring-2 ring-red-500" : ""}`}>
            <ParcelMap parcels={originals} onPick={pick} pin={pin} basemap="streets" showBasemapToggle className="h-full" />
          </div>
          <p className="mt-2 text-[13px] text-muted" dir="auto">
            {pin ? <>📍 <span dir="ltr">{pin[1].toFixed(5)}, {pin[0].toFixed(5)}</span>{near ? ` · ${near}` : ""}</> : (ar ? "ما اخترت مكان للحين." : "No spot chosen yet.")}
          </p>
        </Card>

        <div className="space-y-4">
          <Card title={ar ? "2. تفاصيلها" : "2. Details"}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[13px]"><span className="text-muted">{ar ? "اسم الحي بالعربي" : "District (Arabic)"}</span>
                <input value={f.district_ar} onChange={(e) => set("district_ar", e.target.value)} maxLength={40} dir="rtl" aria-invalid={err === "district_ar"} className="field mt-1" placeholder="الملقا" /></label>
              <label className="block text-[13px]"><span className="text-muted">{ar ? "اسم الحي بالإنجليزي (اختياري)" : "District (English, optional)"}</span>
                <input value={f.district_en} onChange={(e) => set("district_en", e.target.value)} maxLength={40} dir="ltr" className="field mt-1" placeholder="Al Malqa" /></label>
            </div>
            <div className="mt-3 space-y-2.5">
              {seg(f.area, AREAS.map((a) => [a, AREA_SHORT[a][lang]] as [Area, string]), (v) => set("area", v), ar ? "المنطقة" : "Area")}
              <div className="flex flex-wrap gap-2">
                {seg(f.type, [["residential", TYPE_LABEL.residential[lang]], ["commercial", TYPE_LABEL.commercial[lang]]], (v) => set("type", v), ar ? "النوع" : "Type")}
                {seg(f.deal, [["sale", DEAL_LABEL.sale[lang]], ["lease", DEAL_LABEL.lease[lang]]], (v) => set("deal", v), ar ? "التعامل" : "Deal")}
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block text-[13px]"><span className="text-muted">{ar ? "المساحة (م²)" : "Size (m²)"}</span>
                <input inputMode="numeric" value={f.sqm} onChange={(e) => set("sqm", e.target.value.replace(/[^\d]/g, ""))} aria-invalid={err === "area_sqm"} className="field mt-1" dir="ltr" placeholder="600" /></label>
              <label className="block text-[13px]"><span className="text-muted">{ar ? "عرض الشارع (م)" : "Street width (m)"}</span>
                <input inputMode="numeric" value={f.street} onChange={(e) => set("street", e.target.value.replace(/[^\d]/g, ""))} aria-invalid={err === "street_width_m"} className="field mt-1" dir="ltr" placeholder="20" /></label>
              <label className="block text-[13px]"><span className="text-muted">{f.deal === "lease" ? (ar ? "الإيجار بالسنة (ريال)" : "Rent a year (SAR)") : (ar ? "السعر الإجمالي (ريال)" : "Total price (SAR)")}</span>
                <input inputMode="numeric" value={f.price} disabled={f.onRequest} onChange={(e) => set("price", e.target.value.replace(/[^\d]/g, ""))} aria-invalid={err === "total_price_sar"} className="field mt-1 disabled:opacity-50" dir="ltr" placeholder={f.deal === "lease" ? "250000" : "2500000"} /></label>
            </div>
            <label className="mt-2 flex items-center gap-2 text-[13px] text-muted"><input type="checkbox" checked={f.onRequest} onChange={(e) => set("onRequest", e.target.checked)} className="accent-[var(--ink)]" />{ar ? "السعر عند الطلب" : "Price on request"}</label>
          </Card>

          <Card title={ar ? "3. كيف تبان للمستثمر" : "3. How investors will see it"}>
            {insight ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/80 p-3"><p className="text-[12px] text-muted">{ar ? "سعر المتر" : "Price per m²"}</p><p className="text-lg font-bold">{num(Math.round(insight.per), lang)} {ar ? "ريال" : "SAR"}</p></div>
                <div className="rounded-2xl bg-white/80 p-3"><p className="text-[12px] text-muted">{ar ? `مقارنة بمتوسط ${AREA_LABEL[f.area].ar}` : `vs. ${AREA_LABEL[f.area].en} average`}</p>
                  <p className={`text-lg font-bold ${insight.vs != null && insight.vs <= -5 ? "text-[#5f7a4f]" : ""}`}>{insight.vs == null ? (ar ? "ما فيه مقارنة" : "No comparison") : `${insight.vs > 0 ? "+" : ""}${insight.vs}%`}</p></div>
                <p className="col-span-2 text-[13px] text-muted">
                  {insight.vs == null ? (ar ? "ما عندنا أراضي مشابهة في هالمنطقة نقارن فيها." : "We have no similar properties in this area to compare with.")
                    : insight.vs <= -10 ? (ar ? "سعرها تحت المتوسط بوضوح، بنبرزها للمستثمرين كفرصة." : "Clearly under average; we'll highlight it to investors as a deal.")
                    : insight.vs >= 25 ? (ar ? "سعرها فوق المتوسط بكثير. تأكد إن عندها ميزة تبرر السعر، وإلا ممكن تطوّل." : "Well above average. Make sure something justifies it, or it may sit.")
                    : (ar ? "سعرها قريب من المتوسط، سعر عادل." : "Close to average, a fair price.")}
                  {insight.n ? (ar ? ` مقارنة بـ${insight.n} أرض ${TYPE_LABEL[f.type].ar} ${DEAL_LABEL[f.deal].ar} عندنا.` : ` Compared with ${insight.n} of our ${f.type} properties ${f.deal === "sale" ? "for sale" : "for lease"}.`) : ""}
                </p>
              </div>
            ) : <p className="text-[14px] text-muted">{ar ? "عبّ المساحة والسعر ونوريك وين سعرها من السوق." : "Fill in size and price to see where it sits in the market."}</p>}
          </Card>

          {err && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[14px] text-red-700">{(ERR[err] ?? ERR.db)[lang]}</p>}
          <button disabled={busy} className="btn-primary w-full px-5 py-3.5 text-[16px] font-semibold text-white disabled:opacity-60">{busy ? (ar ? "لحظة…" : "One sec…") : (ar ? "انشرها على الموقع" : "Publish to the website")}</button>
        </div>
      </form>
    </>
  );
}

function Done({ saved, lang, onAnother }: { saved: Saved; lang: Lang; onAnother: () => void }) {
  const ar = lang === "ar";
  const p = saved.parcel;
  return (
    <div className="space-y-4">
      <div className="glass rounded-[28px] p-6">
        <p className="text-[13px] font-medium text-[#5f7a4f]">✓ {ar ? "نزلت على الموقع" : "Live on the website"}</p>
        <h1 className="mt-1 text-[28px] font-bold">{ar ? `أرض حي ${p.district_ar}` : p.district_en} <span className="text-[16px] font-normal text-muted" dir="ltr">{p.parcel_id}</span></h1>
        <p className="mt-1 text-[15px] text-muted">{ar ? "الحين تطلع في البحث، وصفحة كل الأراضي، وعند المستشار." : "It now shows in search, the full list and the AI consultant."}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/lands/${p.parcel_id}`} className="btn-primary px-4 py-2.5 text-[14px] font-medium text-white">{ar ? "شوف صفحتها" : "View its page"}</Link>
          <button onClick={onAnother} className="bubble px-4 py-2.5 text-[14px]">{ar ? "أضف أرض ثانية" : "Add another"}</button>
        </div>
      </div>
      <Card title={ar ? "مين تكلمه عنها؟" : "Who should hear about it?"}
        sub={saved.buyers.length ? (ar ? "مستثمرين في القائمة ميزانيتهم ونوع طلبهم يناسبون هالأرض. كل رسالة جاهزة باسمه ورابط الأرض." : "Investors whose budget and request fit this property. Each message is ready with their name and the link.")
          : (ar ? `ما فيه أحد ميزانيته تناسبها بالضبط الحين. فيه ${p.segment_demand} طلبات بنفس النوع والمنطقة، تقدر تشوفهم في قائمة الاتصال.` : `Nobody's budget fits it exactly right now. ${p.segment_demand} inquiries share its type and area; see them in the call list.`)}>
        {saved.buyers.length > 0 && (
          <div className="space-y-2">
            {saved.buyers.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[18px] bg-white/70 p-3">
                <div>
                  <p className="font-semibold">{ar ? b.name_ar : b.name} <span className="text-[12px] font-normal text-muted" dir="ltr">{b.id}</span></p>
                  <p className="text-[13px] text-muted">{ar ? b.wants_ar : b.wants} · {money(b.budget, lang)}</p>
                  <div className="mt-1 flex flex-wrap gap-1"><Pill tone={b.intent === "ready to move" ? "gold" : "plain"}>{INTENT_T[b.intent]?.[lang]}</Pill><Pill>{STATUS_T[b.status]?.[lang]}</Pill><Pill>{ar ? `ينتظر ${b.waiting} يوم` : `${b.waiting} days`}</Pill></div>
                </div>
                <a href={b.wa} target="_blank" rel="noopener" className="btn-wa px-4 py-2 text-[13px] font-semibold">{ar ? "بلّغه واتساب" : "Tell them on WhatsApp"}</a>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
