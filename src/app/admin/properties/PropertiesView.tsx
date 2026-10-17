"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";
import { DEAL_LABEL, TYPE_LABEL, money, num } from "@/lib/format";
import type { Analytics } from "@/lib/admin/analytics";
import type { Parcel } from "@/lib/portfolio";
import { priceLabel, district } from "@/lib/format";
import { Card, Empty, PageHeader, Tabs, useTab, STATUS_T, type Lang } from "../ui";

const TABS = ["hot", "slow", "vacancy", "added"] as const;

export default function PropertiesView({ a, tab: initial, listings = [] }: { a: Analytics; tab?: string; listings?: Parcel[] }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [tab, setTab] = useTab(initial, TABS);
  return (
    <>
      <PageHeader title={ar ? "الأراضي" : "Properties"}
        sub={ar ? "وش يتحرك ووش واقف. ابدأ بالأراضي اللي عليها تنافس، بعدها اللي طوّلت، وآخرها أراضي الإيجار الفاضية." : "What's moving and what's stuck. Start with competing buyers, then slow listings, then vacant leases."}>
        <Link href="/admin/properties/new" className="btn-primary px-5 py-2.5 text-[14px] font-semibold text-white">+ {ar ? "أضف أرض" : "Add property"}</Link>
      </PageHeader>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { k: ar ? "متاحة" : "Available", v: num(a.kpis.available, lang) },
          { k: ar ? "متوسط عمر العرض" : "Avg. listing age", v: ar ? `${a.kpis.avgAge} يوم` : `${a.kpis.avgAge} days` },
          { k: ar ? "طوّلت +120 يوم" : "Listed 120+ days", v: num(a.stale.length, lang) },
          { k: ar ? "قيمة المعروض للبيع" : "For-sale inventory value", v: money(a.kpis.availableSaleValue, lang) },
        ].map((x) => (
          <div key={x.k} className="glass rounded-[20px] px-4 py-3"><p className="text-[12px] text-muted">{x.k}</p><p className="text-[20px] font-bold">{x.v}</p></div>
        ))}
      </div>
      <Tabs label={ar ? "أقسام الأراضي" : "Property sections"} value={tab} onChange={setTab} tabs={[
        { id: "hot", label: ar ? "عليها تنافس" : "Competing buyers", count: a.hot.length },
        { id: "slow", label: ar ? "طوّلت في العرض" : "Slow listings", count: a.stale.length },
        { id: "vacancy", label: ar ? "إيجار ضايع" : "Missed rent", count: a.vacancies.length },
        { id: "added", label: ar ? "أضفتها من اللوحة" : "Added here", count: listings.length },
      ]} />
      {tab === "hot" && <Hot a={a} lang={lang} />}
      {tab === "slow" && <Stale a={a} lang={lang} />}
      {tab === "vacancy" && <Vacancy a={a} lang={lang} />}
      {tab === "added" && <Added listings={listings} lang={lang} />}
    </>
  );
}

function Hot({ a, lang }: { a: Analytics; lang: Lang }) {
  const ar = lang === "ar";
  return (
    <>
      <p className="mb-3 max-w-3xl text-[14px] text-muted">{ar ? "أراضي عندنا أكثر من مستثمر ميزانيته تناسبها، بنفس المنطقة والنوع. تواصل معهم مع بعض واطلب أفضل عرض بدل ما تنتظر واحد واحد." : "Properties that several investors in our pipeline can afford, in the same area and type. Contact them together and ask for best offers instead of waiting one by one."}</p>
      {!a.hot.length ? <Empty>{ar ? "ما فيه أراضي عليها أكثر من مشتري الحين." : "No properties with several buyers right now."}</Empty> : (
        <div className="grid gap-3 md:grid-cols-2">
          {a.hot.map((h) => (
            <div key={h.id} className="glass rounded-[24px] p-5">
              <div className="flex items-baseline justify-between gap-2">
                <Link href={`/lands/${h.id}`} className="text-lg font-semibold hover:underline">{ar ? `حي ${h.district_ar}` : h.district_en}</Link>
                <span className="text-[13px] text-muted" dir="ltr">{h.id}</span>
              </div>
              <p className="text-[14px] text-muted">{money(h.price ?? 0, lang)}{h.deal === "lease" ? (ar ? " بالسنة" : "/yr") : ""} · {ar ? `معروضة من ${h.age} يوم` : `listed ${h.age} days`}</p>
              <p className="mt-3 text-[13px] font-medium">{ar ? `${h.buyers.length} مشترين قادرين:` : `${h.buyers.length} able buyers:`}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {h.buyers.map((b) => (
                  <span key={b.id} className="rounded-full bg-white/80 px-2.5 py-1 text-[12px]">{ar ? b.name_ar : b.name} · {money(b.budget, lang)} · {STATUS_T[b.status][lang]}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Stale({ a, lang }: { a: Analytics; lang: Lang }) {
  const ar = lang === "ar";
  const sales = a.stale.filter((s) => s.deal === "sale" && s.price);
  const [sel, setSel] = useState(sales[0]?.id ?? "");
  const [cut, setCut] = useState(0);
  const s = sales.find((x) => x.id === sel) ?? sales[0];
  const sim = useMemo(() => {
    if (!s || !s.price || !s.perSqm) return null;
    const price = s.price * (1 - cut / 100);
    const perSqm = s.perSqm * (1 - cut / 100);
    const can = s.budgets.filter((b) => b >= price).length;
    const areaMed = s.vsArea != null ? s.perSqm / (1 + s.vsArea / 100) : null;
    return { price, can, vsArea: areaMed ? Math.round((perSqm / areaMed - 1) * 100) : null, vsComps: s.compMed ? Math.round((perSqm / s.compMed - 1) * 100) : null };
  }, [s, cut]);
  if (!s) return <Empty>{ar ? "ما فيه أراضي طوّلت." : "No slow listings."}</Empty>;
  return (
    <>
      <p className="mb-3 max-w-3xl text-[14px] text-muted">{ar ? "أراضي معروضة من أكثر من 120 يوم لين اليوم. اختر أرض للبيع، وجرّب تخفيض السعر وشوف كم مستثمر تصير ميزانيته تكفيها، وكيف يصير سعرها مقارنة بالمنطقة والصفقات اللي تمت." : "Properties listed over 120 days as of today. Pick a sale property, try a price cut, and see how many investors could then afford it and how it compares with the area and closed deals."}</p>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="glass max-h-[520px] overflow-y-auto rounded-[24px] p-2">
          {a.stale.map((x) => (
            <button key={x.id} onClick={() => { if (x.deal === "sale" && x.price) { setSel(x.id); setCut(0); } }}
              className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-start text-[14px] ${x.id === s.id ? "bg-white shadow-sm" : "hover:bg-white/60"} ${x.deal === "sale" && x.price ? "" : "cursor-default opacity-70"}`}>
              <span>{ar ? `حي ${x.district_ar}` : x.district_en} <span className="text-muted" dir="ltr">{x.id}</span>
                <span className="block text-[12px] text-muted">{TYPE_LABEL[x.type][lang]} · {DEAL_LABEL[x.deal][lang]}{x.affordableNow ? (ar ? ` · ${x.affordableNow} مستثمر يقدر عليها الحين` : ` · ${x.affordableNow} investors can afford it now`) : ""}</span>
              </span>
              <span className="shrink-0 font-semibold">{ar ? `${x.days} يوم` : `${x.days}d`}</span>
            </button>
          ))}
        </div>
        <div className="glass self-start rounded-[24px] p-5">
          <p className="text-[13px] text-muted">{ar ? "محاكي التسعير" : "Repricing simulator"}</p>
          <p className="text-xl font-bold">{ar ? `حي ${s.district_ar}` : s.district_en} <span className="text-[14px] font-normal text-muted" dir="ltr">{s.id}</span></p>
          <p className="text-[14px] text-muted">{ar ? `معروضة من ${s.days} يوم · ${num(s.sqm, "ar")} م²` : `Listed ${s.days} days · ${num(s.sqm, "en")} m²`}</p>
          {s.affordableNow > 0 && (
            <p className="mt-3 rounded-2xl bg-apricot-soft px-3 py-2 text-[14px] text-[#6d531f]">
              {ar ? `قبل ما تخفض: ${s.affordableNow} مستثمر عندنا ميزانيته تكفيها بالسعر الحالي (${s.buyers.join("، ")}). كلمهم أول.` : `Before cutting: ${s.affordableNow} investors in our pipeline can already afford it (${s.buyers.join(", ")}). Call them first.`}
            </p>
          )}
          <label className="mt-4 block text-[14px]">
            <span className="flex justify-between"><span>{ar ? "تخفيض" : "Price cut"}</span><b>{cut}%</b></span>
            <input dir="ltr" type="range" min={0} max={25} step={1} value={cut} onChange={(e) => setCut(Number(e.target.value))} className="mt-2 w-full rounded-full accent-[var(--apricot)] focus-visible:outline-offset-4" />
          </label>
          {sim && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/80 p-3"><p className="text-[12px] text-muted">{ar ? "السعر الجديد" : "New price"}</p><p className="text-lg font-bold">{money(sim.price, lang)}</p></div>
              <div className="rounded-2xl bg-white/80 p-3"><p className="text-[12px] text-muted">{ar ? "مستثمرين يقدرون عليها" : "Investors who can afford it"}</p><p className="text-lg font-bold">{ar ? `${sim.can} من ${s.budgets.length}` : `${sim.can} of ${s.budgets.length}`}</p></div>
              <div className="rounded-2xl bg-white/80 p-3"><p className="text-[12px] text-muted">{ar ? "مقارنة بمتوسط المنطقة" : "vs. area average"}</p><p className="text-lg font-bold">{sim.vsArea == null ? "–" : `${sim.vsArea > 0 ? "+" : ""}${sim.vsArea}%`}</p></div>
              <div className="rounded-2xl bg-white/80 p-3"><p className="text-[12px] text-muted">{ar ? "مقارنة بالصفقات اللي تمت" : "vs. closed deals"}</p><p className="text-lg font-bold">{sim.vsComps == null ? "–" : `${sim.vsComps > 0 ? "+" : ""}${sim.vsComps}%`}</p></div>
            </div>
          )}
          <p className="mt-3 text-[12px] text-muted">{ar ? "المستثمرين: اللي طلبوا نفس النوع ونفس المنطقة ونفس طريقة التعامل." : "Investors: those who asked for the same type, area and deal."}</p>
        </div>
      </div>
    </>
  );
}

function Vacancy({ a, lang }: { a: Analytics; lang: Lang }) {
  const ar = lang === "ar";
  const max = Math.max(...a.vacancies.map((v) => v.lost), 1);
  return (
    <Card title={ar ? `${money(a.kpis.vacancyLost, lang)} إيجار ضايع لين اليوم` : `${money(a.kpis.vacancyLost, lang)} in rent missed so far`}
      sub={ar ? "لكل أرض إيجار متاحة: الإيجار السنوي المطلوب مقسوم على 365، مضروب في الأيام اللي قعدتها فاضية. رقم تقديري ويكبر كل يوم. ابدأ بالأعلى، خصوصاً اللي عندها مستثمر يقدر يستأجرها." : "Each available lease: asking annual rent / 365 × days vacant. An estimate that grows daily. Start at the top, especially where an investor could already lease it."}>
      <div className="space-y-3">
        {a.vacancies.map((v) => (
          <div key={v.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-[14px]">
              <Link href={`/lands/${v.id}`} className="font-medium hover:underline">{ar ? `حي ${v.district_ar}` : v.district_en} <span className="text-muted" dir="ltr">{v.id}</span></Link>
              <span><b className="font-semibold">{money(v.lost, lang)}</b> <span className="text-muted">· {ar ? `${v.days} يوم فاضية` : `${v.days} days vacant`}{v.takers ? (ar ? ` · ${v.takers} مستثمر يقدر يستأجرها` : ` · ${v.takers} investors could lease it`) : ""}</span></span>
            </div>
            <div className="mt-1 h-2.5 rounded-full bg-white/70"><div className="h-full rounded-e-[4px] rounded-s-full bg-ink" style={{ width: `${(v.lost / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Added({ listings, lang }: { listings: Parcel[]; lang: Lang }) {
  const ar = lang === "ar";
  const [gone, setGone] = useState<Record<string, boolean>>({});
  const toggle = async (id: string, archived: boolean) => {
    setGone((g) => ({ ...g, [id]: archived }));
    await fetch("/api/admin/listings", { method: "PATCH", headers: { "content-type": "application/json", "x-sarj-admin": "1" }, body: JSON.stringify({ id, archived }) }).catch(() => {});
  };
  if (!listings.length) return (
    <div className="glass rounded-[24px] p-8 text-center">
      <p className="text-lg font-semibold">{ar ? "ما أضفت أراضي من اللوحة للحين" : "No properties added here yet"}</p>
      <p className="mt-1 text-[14px] text-muted">{ar ? "أي أرض تضيفها تنزل على الموقع فوراً، ونقولك مين ينتظرها." : "Anything you add goes live instantly, and we'll tell you who's waiting for it."}</p>
      <Link href="/admin/properties/new" className="btn-primary mt-4 inline-block px-5 py-2.5 text-[14px] font-semibold text-white">+ {ar ? "أضف أرض" : "Add property"}</Link>
    </div>
  );
  return (
    <div className="space-y-2">
      {listings.map((p) => (
        <div key={p.parcel_id} className={`glass flex flex-wrap items-center justify-between gap-3 rounded-[22px] p-4 ${gone[p.parcel_id] ? "opacity-50" : ""}`}>
          <div>
            <Link href={`/lands/${p.parcel_id}`} className="font-semibold hover:underline">{district(p, lang)}</Link> <span className="text-[12px] text-muted" dir="ltr">{p.parcel_id}</span>
            <p className="text-[13px] text-muted">{TYPE_LABEL[p.land_type][lang]} · {DEAL_LABEL[p.listing_type][lang]} · {num(p.area_sqm, lang)} {ar ? "م²" : "m²"} · {priceLabel(p, lang)}</p>
          </div>
          <button onClick={() => toggle(p.parcel_id, !gone[p.parcel_id])} className="bubble px-3 py-1.5 text-[13px]">
            {gone[p.parcel_id] ? (ar ? "رجّعها للموقع" : "Put back online") : (ar ? "شيلها من الموقع" : "Take offline")}
          </button>
        </div>
      ))}
    </div>
  );
}
