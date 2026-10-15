"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParcelMap from "@/components/ParcelMap";
import ParcelCard from "@/components/ParcelCard";
import MatchFlow from "@/components/MatchFlow";
import AlertForm from "@/components/AlertForm";
import { useLang } from "@/lib/i18n";
import { criteriaFromParams, runMatch, type Criteria, type Match } from "@/lib/match";
import { intentByKey, BUDGETS } from "@/lib/intents";
import { AREA_LABEL, TYPE_LABEL } from "@/lib/format";
import { parcels } from "@/lib/portfolio";
import { track } from "@/lib/track";

function summary(c: Criteria) {
  const i = intentByKey(c.use)!;
  const b = BUDGETS[c.deal].find((x) => x.max === c.budget) ?? BUDGETS[c.deal][BUDGETS[c.deal].length - 1];
  const area = c.area === "any" ? { ar: "أي منطقة", en: "any area" } : AREA_LABEL[c.area];
  return {
    ar: `${i.ar}، ${c.deal === "sale" ? "شراء" : "إيجار"}، ${area.ar}، ${b.ar}`,
    en: `${i.en}, ${c.deal === "sale" ? "buy" : "lease"}, ${area.en}, ${b.en}`,
  };
}

function Group({ title, sub, items, hover, sel, from }: { title: string; sub?: string; items: Match[]; hover: (id: string | null) => void; sel: string | null; from: string }) {
  if (!items.length) return null;
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      <div className="mt-3 space-y-px border border-line bg-line">
        {items.map((m) => (
          <ParcelCard key={m.parcel.parcel_id} p={m.parcel} reasons={m.reasons} note={m.note} onHover={hover} selected={sel === m.parcel.parcel_id} from={from} />
        ))}
      </div>
    </section>
  );
}

function Results() {
  const sp = useSearchParams();
  const { lang } = useLang();
  const c = useMemo(() => criteriaFromParams(new URLSearchParams(sp.toString())), [sp]);
  const r = useMemo(() => (c ? runMatch(c) : null), [c]);
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => { track("page_view", { page: "match", ...(c ?? {}) }); }, [c]);

  if (!c || !r || editing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl font-semibold">{lang === "ar" ? "ماذا تريد أن تبني؟" : "What do you want to build?"}</h1>
        <p className="mt-2 text-muted">{lang === "ar" ? "أربعة أسئلة قصيرة، ثم نريك الأراضي المناسبة." : "Four short questions, then we show you the land that fits."}</p>
        <div className="mt-8"><MatchFlow /></div>
      </div>
    );
  }

  const shown = [...r.fits, ...r.stretch, ...r.alternatives];
  const ids = new Set(shown.map((m) => m.parcel.parcel_id));
  const s = summary(c);
  const intent = intentByKey(c.use)!;
  const typeName = intent.type ? TYPE_LABEL[intent.type] : { ar: "", en: "" };

  let headline: string, sub: string;
  if (r.fits.length) {
    headline = lang === "ar"
      ? (r.fits.length === 1 ? "وجدنا أرضاً واحدة تناسب خطتك" : `وجدنا ${r.fits.length} أراضٍ تناسب خطتك`)
      : `${r.fits.length} ${r.fits.length === 1 ? "parcel fits" : "parcels fit"} your plan`;
    sub = lang === "ar" ? "مرتبة بحسب ملاءمتها لما تريد بناءه، وليس بالسعر فقط." : "Ranked by how well each suits what you want to build, not just by price.";
  } else if (r.considered === 0 || (c.area !== "any" && !parcels.some((p) => p.status === "available" && p.area_of_city === c.area && (!intent.type || p.land_type === intent.type) && p.listing_type === c.deal))) {
    headline = lang === "ar" ? "لا توجد لدينا أرض بهذه المواصفات الآن" : "We don't have land like this right now";
    sub = lang === "ar"
      ? `لا تتوفر حالياً أراضٍ ${typeName.ar} ${c.deal === "sale" ? "للبيع" : "للإيجار"} في ${c.area === "any" ? "المحفظة" : AREA_LABEL[c.area].ar}. هذه أقرب الخيارات، ويمكنك أن تطلب إبلاغك عند توفر أرض مناسبة.`
      : `There's no available ${typeName.en.toLowerCase()} land ${c.deal === "sale" ? "for sale" : "for lease"} in ${c.area === "any" ? "the portfolio" : AREA_LABEL[c.area].en} today. Here are the closest options, and we can notify you when one comes up.`;
  } else {
    headline = lang === "ar" ? "لا توجد أرض ضمن ميزانيتك تماماً" : "Nothing fits your budget exactly";
    sub = lang === "ar" ? "هذه الأقرب لطلبك، مع توضيح الفرق في كل خيار." : "These are the closest to your ask, with the trade-off spelled out for each.";
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span>{s[lang]}</span>
          <button onClick={() => setEditing(true)} className="font-medium text-palm underline underline-offset-4">
            {lang === "ar" ? "عدّل طلبك" : "Change"}
          </button>
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-snug sm:text-4xl">{headline}</h1>
        <p className="mt-2 max-w-xl text-muted">{sub}</p>

        <Group title={lang === "ar" ? "تناسبك" : "Good fits"} items={r.fits.slice(0, 6)} hover={setSel} sel={sel} from="match_fit" />
        {r.fits.length > 6 && (
          <Group title={lang === "ar" ? "خيارات أخرى تناسبك" : "More that fit"} items={r.fits.slice(6)} hover={setSel} sel={sel} from="match_fit_more" />
        )}
        <Group title={lang === "ar" ? "قريبة من ميزانيتك" : "Close to your budget"}
          sub={lang === "ar" ? "تتجاوز ميزانيتك بقليل، أو سعرها عند الطلب." : "Slightly above your budget, or priced on request."}
          items={r.stretch} hover={setSel} sel={sel} from="match_stretch" />
        <Group title={lang === "ar" ? "بدائل تستحق النظر" : "Alternatives worth a look"}
          sub={lang === "ar" ? "كل بديل يوضح ما يختلف عن طلبك." : "Each one says what differs from your ask."}
          items={r.alternatives} hover={setSel} sel={sel} from="match_alt" />

        <div className="mt-10">
          <AlertForm criteria={c} summary={{
            ar: `نحفظ طلبك (${s.ar}) ونرسل لك أول أرض تطابقه.`,
            en: `We'll save your request (${s.en}) and send you the first land that matches.`,
          }} />
        </div>
      </div>
      <div className="h-[50vh] border-line lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:border-s">
        <ParcelMap parcels={parcels} highlight={ids} selected={sel} onSelect={(id) => setSel(id)} fit showBasemapToggle basemap="streets" className="h-full" />
      </div>
    </div>
  );
}

export default function MatchPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Suspense fallback={<div className="p-10" />}><Results /></Suspense>
      </main>
      <Footer />
    </>
  );
}
