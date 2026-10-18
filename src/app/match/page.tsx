"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParcelMap from "@/components/ParcelMap";
import ParcelCard from "@/components/ParcelCard";
import MatchFlow from "@/components/MatchFlow";
import AlertForm from "@/components/AlertForm";
import { useLang } from "@/lib/i18n";
import { criteriaFromParams, runMatch, type Criteria, type Match } from "@/lib/match";
import { intentByKey, BUDGETS } from "@/lib/intents";
import { AREA_LABEL, TYPE_LABEL, money } from "@/lib/format";
import { parcels, portfolio } from "@/lib/portfolio";
import { getProfile, type Profile } from "@/lib/profile";
import { Avatar } from "@/components/ConsultantHero";
import { track } from "@/lib/track";
import { usePortfolioVersion, useLiveReady } from "@/components/ListingsLoader";

function chips(c: Criteria) {
  const i = intentByKey(c.use)!;
  const b = BUDGETS[c.deal].find((x) => x.max === c.budget) ?? BUDGETS[c.deal][BUDGETS[c.deal].length - 1];
  const area = c.area === "any" ? { ar: "أي مكان بالرياض", en: "Anywhere in Riyadh" } : AREA_LABEL[c.area];
  const budget = c.budget != null && !BUDGETS[c.deal].some((x) => x.max === c.budget)
    ? { ar: `لين ${money(c.budget, "ar")}${c.deal === "lease" ? " بالسنة" : ""}`, en: `Up to ${money(c.budget, "en")}${c.deal === "lease" ? " a year" : ""}` } : b;
  const out = [
    { ar: `${i.icon} ${i.ar}`, en: `${i.icon} ${i.en}` },
    c.deal === "sale" ? { ar: "شراء", en: "Buy" } : { ar: "إيجار", en: "Lease" },
    area,
    budget,
  ];
  if (c.anchor) out.push({ ar: `📍 قريب من ${portfolio.anchors[c.anchor].ar}`, en: `📍 Near ${portfolio.anchors[c.anchor].en}` });
  return out;
}

function Group({ title, sub, items, hover, sel, from }: { title: string; sub?: string; items: Match[]; hover: (id: string | null) => void; sel: string | null; from: string }) {
  if (!items.length) return null;
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      {sub && <p className="mt-0.5 text-[15px] text-muted">{sub}</p>}
      <div className="mt-3 grid gap-3">
        {items.map((m) => (
          <ParcelCard key={m.parcel.parcel_id} p={m.parcel} reasons={m.reasons} note={m.note} onHover={hover} selected={sel === m.parcel.parcel_id} from={from} />
        ))}
      </div>
    </section>
  );
}

/** The question lives on the homepage; this page only shows results. */
function RedirectHome() {
  const router = useRouter();
  useEffect(() => { router.replace("/"); }, [router]);
  return <div className="p-10" />;
}

function Results() {
  const sp = useSearchParams();
  const { lang } = useLang();
  const c = useMemo(() => criteriaFromParams(new URLSearchParams(sp.toString())), [sp]);
  const ver = usePortfolioVersion();
  const ready = useLiveReady();
  const r = useMemo(() => (c ? runMatch(c) : null), [c, ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => { setProfile(getProfile()); }, [sp]);

  useEffect(() => { track("page_view", { page: "match", ...(c ?? {}) }); setEditing(false); }, [c]);

  if (!c || !r) return <RedirectHome />;
  if (editing) {
    return (
      <div className="mx-auto max-w-3xl px-3 py-10 sm:px-5">
        <div className="glass rounded-[34px] p-6 sm:p-8">
          <h1 className="text-3xl font-bold sm:text-4xl">{lang === "ar" ? "خلّنا نلقى أرضك" : "Let's find your property"}</h1>
          <p className="mt-2 text-muted">{lang === "ar" ? "أربع أسئلة سريعة، وبعدها نوريك اللي يناسبك." : "Four quick questions, then we'll show you what fits."}</p>
          <div className="mt-6"><MatchFlow /></div>
        </div>
      </div>
    );
  }

  const ids = new Set([...r.fits, ...r.stretch, ...r.alternatives].map((m) => m.parcel.parcel_id));
  const intent = intentByKey(c.use)!;
  const typeName = intent.type ? TYPE_LABEL[intent.type] : { ar: "", en: "" };
  const noneInArea = c.area !== "any" && !parcels.some((p) => p.status === "available" && p.area_of_city === c.area && (!intent.type || p.land_type === intent.type) && p.listing_type === c.deal);

  let headline: string, sub: string;
  if (r.fits.length) {
    headline = lang === "ar"
      ? (r.fits.length === 1 ? "لقينا لك أرض وحدة تناسبك 🎯" : r.fits.length === 2 ? "لقينا لك أرضين تناسبك 🎯" : `لقينا لك ${r.fits.length} أراضي تناسبك 🎯`)
      : `We found ${r.fits.length} ${r.fits.length === 1 ? "property" : "properties"} that fit 🎯`;
    sub = lang === "ar" ? "رتبناها حسب وش يناسب اللي ناوي تبنيه، مو بس حسب السعر." : "Sorted by how well each suits what you want to build, not just price.";
  } else if (r.considered === 0 || noneInArea) {
    headline = lang === "ar" ? "بصراحة، ما عندنا هالطلب الحين" : "Honestly, we don't have this right now";
    sub = lang === "ar"
      ? `ما فيه أراضي ${typeName.ar} ${c.deal === "sale" ? "للبيع" : "للإيجار"} في ${c.area === "any" ? "المحفظة" : AREA_LABEL[c.area].ar} حالياً. بس هذي أقرب الخيارات، وإذا تبي نعلمك أول ما ينزل شي.`
      : `There are no ${typeName.en.toLowerCase()} properties ${c.deal === "sale" ? "for sale" : "for lease"} in ${c.area === "any" ? "the portfolio" : AREA_LABEL[c.area].en} right now. Here are the closest options, and we can ping you when one comes up.`;
  } else {
    headline = lang === "ar" ? "ما فيه شي بنفس ميزانيتك بالضبط" : "Nothing fits your budget exactly";
    sub = lang === "ar" ? "بس هذي أقرب شي، وكتبنا لك وش الفرق في كل وحدة." : "But these are close, and we've noted the difference on each one.";
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {chips(c).map((x, i) => <span key={i} className="glass-soft rounded-full px-3 py-1.5 text-[13px]">{x[lang]}</span>)}
          <button onClick={() => setEditing(true)} className="rounded-full px-3 py-1.5 text-[13px] font-medium text-blue hover:bg-white">
            {lang === "ar" ? "غيّر طلبك" : "Change"}
          </button>
        </div>
        {profile?.said && profile.use === c.use && (
          <div className="step-in mt-4 flex items-start gap-3">
            <Avatar size={36} />
            <div className="min-w-0 rounded-[20px] rounded-ss-md bg-white/85 px-4 py-3 text-[15px] leading-relaxed shadow-sm">
              <p className="text-[13px] text-muted">{lang === "ar" ? "قلت لي:" : "You told me:"} <span dir="auto">«{profile.said}»</span></p>
              {profile.summary && <p className="mt-1" dir="auto">{profile.summary}</p>}
            </div>
          </div>
        )}
        {ready ? <>
        <h1 className="mt-4 text-3xl font-bold leading-snug sm:text-4xl">{headline}</h1>
        <p className="mt-2 max-w-xl text-[16px] text-muted">{sub}</p>
        </> : <div className="mt-5 h-10 w-72 animate-pulse rounded-full bg-white/70" aria-busy="true" />}

        {!ready && <div className="mt-8 grid gap-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-[26px] bg-white/60" />)}</div>}
        {ready && <>
        <Group title={lang === "ar" ? "تناسبك" : "Good fits"} items={r.fits.slice(0, 6)} hover={setSel} sel={sel} from="match_fit" />
        {r.fits.length > 6 && <Group title={lang === "ar" ? "وفيه بعد" : "There's more"} items={r.fits.slice(6)} hover={setSel} sel={sel} from="match_fit_more" />}
        <Group title={lang === "ar" ? "قريبة من ميزانيتك" : "Close to your budget"}
          sub={lang === "ar" ? "فوقها بشوي، أو سعرها عند الطلب." : "A little over, or priced on request."}
          items={r.stretch} hover={setSel} sel={sel} from="match_stretch" />
        <Group title={lang === "ar" ? "بدائل تستاهل" : "Alternatives worth a look"}
          sub={lang === "ar" ? "كل وحدة مكتوب عليها وش يختلف عن طلبك." : "Each one says how it differs from your ask."}
          items={r.alternatives} hover={setSel} sel={sel} from="match_alt" />
        </>}

        <div className="mt-10">
          <AlertForm criteria={c} summary={{
            ar: "خلّ اسمك ورقمك، وأول ما تنزل أرض تطابق طلبك بالضبط نرسلها لك.",
            en: "Leave your name and number, and we'll send you the first property that matches exactly.",
          }} />
        </div>
      </div>
      <div className="order-first h-[44vh] overflow-hidden rounded-[30px] lg:order-none lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
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
