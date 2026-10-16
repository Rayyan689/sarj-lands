"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";
import { byId } from "@/lib/portfolio";
import { AREA_LABEL, AREA_SHORT, DEAL_LABEL, TYPE_LABEL, money, num, district } from "@/lib/format";
import { formatDate } from "@/lib/time";
import type { Analytics } from "@/lib/admin/analytics";
import type { Live } from "@/lib/admin/live";
import Logo from "@/components/Logo";

type T = { ar: string; en: string };

const STATUS_T: Record<string, T> = { new: { ar: "جديد", en: "New" }, contacted: { ar: "تواصلنا", en: "Contacted" }, negotiating: { ar: "تفاوض", en: "Negotiating" } };
const INTENT_T: Record<string, T> = { "ready to move": { ar: "جاهز", en: "Ready" }, "comparing options": { ar: "يقارن", en: "Comparing" }, exploring: { ar: "يستكشف", en: "Exploring" } };
const CHANNEL_T: Record<string, T> = { "phone call": { ar: "اتصال", en: "Phone" }, "walk-in": { ar: "زيارة للمكتب", en: "Walk-in" }, whatsapp: { ar: "واتساب", en: "WhatsApp" }, "website form": { ar: "نموذج الموقع", en: "Website form" } };
const EVENT_T: Record<string, T> = {
  page_view: { ar: "زاروا الموقع", en: "Visited" }, match_started: { ar: "بدأوا الأسئلة", en: "Started matching" },
  match_completed: { ar: "كملوا الأسئلة", en: "Finished matching" }, parcel_view: { ar: "فتحوا أرض", en: "Opened a property" },
  chat_open: { ar: "فتحوا المستشار", en: "Opened the advisor" }, lead_submitted: { ar: "طلبوا زيارة", en: "Requested a visit" },
};

function Section({ id, title, sub, children }: { id: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-2xl font-bold">{title}</h2>
      {sub && <p className="mt-1 max-w-3xl text-[15px] text-muted">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Pill({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "gold" | "dark" }) {
  const c = tone === "gold" ? "bg-apricot-soft text-[#8C6A2F]" : tone === "dark" ? "bg-ink text-white" : "bg-ink/5 text-muted";
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium ${c}`}>{children}</span>;
}

/** Rent not collected since listing, ticking up every second. */
function VacancyClock({ base, perDay, lang }: { base: number; perDay: number; lang: "ar" | "en" }) {
  const [v, setV] = useState(base);
  useEffect(() => {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Riyadh", hour: "numeric", minute: "numeric", second: "numeric", hour12: false }).formatToParts(new Date());
    const g = (t: string) => Number(parts.find((x) => x.type === t)?.value ?? 0);
    const start = base + perDay * ((g("hour") * 3600 + g("minute") * 60 + g("second")) / 86400);
    const t0 = Date.now();
    const id = setInterval(() => setV(start + perDay * ((Date.now() - t0) / 86_400_000)), 1000);
    return () => clearInterval(id);
  }, [base, perDay]);
  return <span className="tabular-nums">{lang === "ar" ? `${num(Math.floor(v), "ar")} ريال` : `SAR ${num(Math.floor(v), "en")}`}</span>;
}

export default function AdminDashboard({ a, live }: { a: Analytics; live: Live }) {
  const { lang, setLang } = useLang();
  const ar = lang === "ar";
  const t = (x: T) => x[lang];
  const [greet, setGreet] = useState<T>({ ar: "هلا", en: "Hello" });
  useEffect(() => {
    const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Riyadh", hour: "numeric", hour12: false }).format(new Date()));
    setGreet(h < 12 ? { ar: "صباح الخير", en: "Good morning" } : { ar: "مساء الخير", en: "Good evening" });
  }, []);

  const nav = [
    ["brief", "الملخص", "Briefing"], ["calls", "اتصل اليوم", "Call today"], ["hot", "عليها تنافس", "Bidding"], ["buy", "وش نشتري", "Buy next"],
    ["matrix", "الطلب والعرض", "Demand"], ["vacancy", "الإيجار الضايع", "Vacancy"], ["stale", "المتأخرة", "Slow listings"],
    ["website", "الموقع", "Website"], ["pipeline", "القنوات", "Channels"], ["data", "جودة البيانات", "Data"],
  ];

  return (
    <div className="min-h-screen">
      {/* top bar */}
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="glass mx-auto flex h-14 max-w-7xl items-center gap-3 rounded-full ps-4 pe-2">
          <Logo className="h-9 w-auto text-ink" />
          <span className="border-s border-hair ps-3 text-[15px] font-semibold">{ar ? "لوحة الإدارة" : "Admin"}</span>
          <div className="ms-auto flex items-center gap-1">
            <Link href="/" className="rounded-full px-3 py-2 text-[14px] text-muted hover:bg-white hover:text-ink">{ar ? "الموقع" : "Website"}</Link>
            <button onClick={() => setLang(ar ? "en" : "ar")} className="rounded-full px-3 py-2 text-[14px] text-muted hover:bg-white hover:text-ink">{ar ? "EN" : "عربي"}</button>
          </div>
        </div>
        <nav className="mx-auto mt-2 flex max-w-7xl gap-1 overflow-x-auto px-1 pb-1" aria-label={ar ? "أقسام اللوحة" : "Sections"}>
          {nav.map(([id, arL, enL]) => (
            <a key={id} href={`#${id}`} className="glass-soft whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] hover:bg-white">{ar ? arL : enL}</a>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl space-y-14 px-3 pb-24 pt-6 sm:px-5">
        {/* briefing */}
        <section id="brief" className="scroll-mt-28">
          <p className="text-muted">{t(greet)} · {formatDate(a.today, lang)}</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{ar ? "هذي صورة شركتك اليوم" : "Here's your business today"}</h1>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {a.brief.map((b, i) => (
              <a key={i} href={b.href} className="glass flex gap-3 rounded-[24px] p-4 hover:bg-white">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${b.tone === "act" ? "bg-apricot" : b.tone === "risk" ? "bg-ink" : "bg-ink/30"}`} />
                <span className="text-[15px] leading-relaxed">{t(b)}</span>
              </a>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              { k: ar ? "متاحة للعرض" : "Available", v: num(a.kpis.available, lang), s: ar ? `من ${a.kpis.total} أرض` : `of ${a.kpis.total}` },
              { k: ar ? "صفقات تمت" : "Closed deals", v: num(a.kpis.sold + a.kpis.leased, lang), s: ar ? `${a.kpis.sold} بيع · ${a.kpis.leased} إيجار` : `${a.kpis.sold} sold · ${a.kpis.leased} leased` },
              { k: ar ? "ميزانيات مشترين جاهزين" : "Ready buyers' budgets", v: money(a.kpis.pipelineSale, lang), s: ar ? "طلبات شراء نيتها جاهزة" : "ready-to-move purchase inquiries" },
              { k: ar ? "متوسط عمر العرض" : "Avg. listing age", v: ar ? `${a.kpis.avgAge} يوم` : `${a.kpis.avgAge} days`, s: ar ? "للأراضي المتاحة، لين اليوم" : "available properties, as of today" },
            ].map((x) => (
              <div key={x.k} className="glass rounded-[24px] p-4">
                <p className="text-[13px] text-muted">{x.k}</p>
                <p className="mt-1 text-2xl font-bold">{x.v}</p>
                <p className="text-[12px] text-muted">{x.s}</p>
              </div>
            ))}
            <a href="#vacancy" className="col-span-2 rounded-[24px] bg-ink p-4 text-white lg:col-span-1">
              <p className="text-[13px] text-white/70">{ar ? "إيجار ضايع من الأراضي الفاضية" : "Rent missed on vacant leases"}</p>
              <p className="mt-1 text-2xl font-bold"><VacancyClock base={a.kpis.vacancyLost} perDay={a.kpis.vacancyPerDay} lang={lang} /></p>
              <p className="text-[12px] text-white/70">{ar ? `ويزيد ${money(a.kpis.vacancyPerDay, "ar")} كل يوم` : `growing ${money(a.kpis.vacancyPerDay, "en")} a day`}</p>
            </a>
          </div>
        </section>

        <Calls a={a} lang={lang} />
        <Hot a={a} lang={lang} />
        <BuyNext a={a} lang={lang} />
        <Matrix a={a} lang={lang} />
        <Vacancy a={a} lang={lang} />
        <Stale a={a} lang={lang} />
        <Website live={live} lang={lang} />
        <Channels a={a} lang={lang} />
        <DataQuality a={a} lang={lang} />
      </main>
    </div>
  );
}

/* ---------------- call list ---------------- */
function Calls({ a, lang }: { a: Analytics; lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const [status, setStatus] = useState<"all" | "new" | "contacted" | "negotiating">("all");
  const [all, setAll] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const rows = a.calls.filter((c) => status === "all" || c.status === status);
  const shown = all ? rows : rows.slice(0, 8);
  return (
    <Section id="calls" title={ar ? "اتصل اليوم" : "Who to call today"}
      sub={ar ? "كل الطلبات مرتبة حسب الأولوية: جاهزية المستثمر، هل عندنا أرض تناسبه، وكم له ينتظر. ولكل واحد رسالة واتساب جاهزة باسمه وبالأرض المناسبة له." : "Every inquiry ranked by priority: how ready they are, whether we have a fit, and how long they've waited. Each has a ready WhatsApp message with their name and best-fit property."}>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(["all", "new", "contacted", "negotiating"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`bubble px-3 py-1.5 text-[13px] ${status === s ? "bubble-on" : ""}`}>
            {s === "all" ? (ar ? `الكل (${a.calls.length})` : `All (${a.calls.length})`) : `${STATUS_T[s][lang]} (${a.calls.filter((c) => c.status === s).length})`}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {shown.map((c, i) => {
          const p = c.match ? byId(c.match) : null;
          return (
            <div key={c.id} className="glass grid gap-3 rounded-[22px] p-4 md:grid-cols-[2rem_minmax(0,1.3fr)_minmax(0,1.4fr)_auto] md:items-center">
              <span className="text-[13px] font-semibold text-muted">{i + 1}</span>
              <div>
                <p className="font-semibold">{ar ? c.name_ar : c.name} <span className="text-[12px] font-normal text-muted" dir="ltr">{c.id}</span></p>
                <p className="text-[14px] text-muted">
                  {ar ? c.wants_ar : c.wants} · {AREA_SHORT[c.area as keyof typeof AREA_SHORT][lang]} · {DEAL_LABEL[c.deal][lang]} · {money(c.budget, lang)}{c.deal === "lease" ? (ar ? " بالسنة" : "/yr") : ""}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <Pill tone={c.intent === "ready to move" ? "gold" : "plain"}>{INTENT_T[c.intent][lang]}</Pill>
                  <Pill tone={c.status === "new" ? "dark" : "plain"}>{STATUS_T[c.status][lang]}</Pill>
                  <Pill>{ar ? `ينتظر ${c.waiting} يوم` : `waiting ${c.waiting} days`}</Pill>
                </div>
              </div>
              <div className="text-[14px]">
                {p ? (
                  <>
                    <p className="text-muted">{c.exact ? (ar ? `أنسب أرض (${c.fits} تناسبه)` : `Best fit (${c.fits} fit)`) : (ar ? "أقرب خيار" : "Closest option")}</p>
                    <Link href={`/lands/${p.parcel_id}`} className="font-medium underline decoration-apricot decoration-2 underline-offset-4">
                      {district(p, lang)} · {money(p.total_price_sar ?? 0, lang)}
                    </Link>
                  </>
                ) : <p className="text-muted">{ar ? "ما عندنا شي يناسبه الحين" : "Nothing fits right now"}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="me-1 text-[13px] font-medium">{c.action[lang]}</span>
                <a href={c.wa} target="_blank" rel="noopener" className="btn-wa px-3.5 py-1.5 text-[13px] font-medium">{ar ? "واتساب" : "WhatsApp"}</a>
                <button onClick={() => { navigator.clipboard?.writeText(c.waText).then(() => { setCopied(c.id); setTimeout(() => setCopied(null), 1500); }).catch(() => {}); }}
                  className="bubble px-3 py-1.5 text-[13px]">{copied === c.id ? (ar ? "انسخت ✓" : "Copied ✓") : (ar ? "انسخ الرسالة" : "Copy message")}</button>
              </div>
            </div>
          );
        })}
      </div>
      {rows.length > 8 && (
        <button onClick={() => setAll(!all)} className="bubble mt-3 px-4 py-2 text-[14px]">{all ? (ar ? "أقل" : "Show less") : (ar ? `عرض الكل (${rows.length})` : `Show all (${rows.length})`)}</button>
      )}
    </Section>
  );
}

/* ---------------- bidding ---------------- */
function Hot({ a, lang }: { a: Analytics; lang: "ar" | "en" }) {
  const ar = lang === "ar";
  return (
    <Section id="hot" title={ar ? "أراضي عليها تنافس" : "Properties with competing buyers"}
      sub={ar ? "أراضي عندنا أكثر من مستثمر ميزانيته تناسبها بنفس المنطقة والنوع. تواصل معهم مع بعض واطلب أفضل عرض بدل ما تنتظر واحد واحد." : "Properties that several investors in our pipeline can afford, in the same area and type. Contact them together and ask for best offers instead of waiting one by one."}>
      <div className="grid gap-3 md:grid-cols-2">
        {a.hot.slice(0, 6).map((h) => (
          <div key={h.id} className="glass rounded-[24px] p-5">
            <div className="flex items-baseline justify-between gap-2">
              <Link href={`/lands/${h.id}`} className="text-lg font-semibold hover:underline">{ar ? `حي ${h.district_ar}` : h.district_en}</Link>
              <span className="text-[13px] text-muted" dir="ltr">{h.id}</span>
            </div>
            <p className="text-[14px] text-muted">{money(h.price ?? 0, lang)}{h.deal === "lease" ? (ar ? " بالسنة" : "/yr") : ""} · {ar ? `معروضة من ${h.age} يوم` : `listed ${h.age} days`}</p>
            <p className="mt-3 text-[13px] font-medium">{ar ? `${h.buyers.length} مشترين قادرين:` : `${h.buyers.length} able buyers:`}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {h.buyers.map((b) => (
                <span key={b.id} className="rounded-full bg-white/80 px-2.5 py-1 text-[12px]">
                  {ar ? b.name_ar : b.name} · {money(b.budget, lang)} · {STATUS_T[b.status][lang]}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- buy next ---------------- */
function BuyNext({ a, lang }: { a: Analytics; lang: "ar" | "en" }) {
  const ar = lang === "ar";
  return (
    <Section id="buy" title={ar ? "وش نشتري بعدها؟" : "What to acquire next"}
      sub={ar ? "طلب حقيقي من مستثمرين على أراضي ما عندنا منها شي. هذي قائمة تسوّق جاهزة لفريق الاستحواذ." : "Real investor demand for land we have none of. A ready shopping list for the acquisitions team."}>
      <div className="grid gap-3 md:grid-cols-2">
        {a.buyNext.map((b) => (
          <div key={`${b.area}${b.type}${b.deal}`} className="glass rounded-[24px] p-5">
            <p className="text-[13px] text-muted">{ar ? "ابحثوا عن" : "Look for"}</p>
            <p className="text-xl font-bold">
              {ar ? `أرض ${TYPE_LABEL[b.type].ar} ${DEAL_LABEL[b.deal].ar} في ${AREA_LABEL[b.area].ar}` : `${TYPE_LABEL[b.type].en} land ${DEAL_LABEL[b.deal].en.toLowerCase()} in ${AREA_LABEL[b.area].en}`}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/80 p-2"><p className="text-xl font-bold">{b.count}</p><p className="text-[12px] text-muted">{ar ? "مستثمر" : "investors"}</p></div>
              <div className="rounded-2xl bg-white/80 p-2"><p className="text-xl font-bold">{b.ready}</p><p className="text-[12px] text-muted">{ar ? "جاهزين" : "ready"}</p></div>
              <div className="rounded-2xl bg-white/80 p-2"><p className="text-[15px] font-bold leading-7">{money(b.budgetSum, lang)}</p><p className="text-[12px] text-muted">{ar ? "مجموع الميزانيات" : "total budgets"}</p></div>
            </div>
            <p className="mt-3 text-[14px]">
              {ar ? `ميزانية الواحد من ${money(b.budgetMin, "ar")} لين ${money(b.budgetMax, "ar")}${b.deal === "lease" ? " بالسنة" : ""}. يبونها لـ: ${b.uses_ar.join("، ")}.`
                : `Budgets from ${money(b.budgetMin, "en")} to ${money(b.budgetMax, "en")}${b.deal === "lease" ? " a year" : ""}. For: ${b.uses.map((u) => u.replace(/^(open|build) (a |an )?/, "")).join(", ")}.`}
            </p>
            <p className="mt-1 text-[12px] text-muted" dir="ltr">{b.ids.join(" · ")}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- demand vs supply ---------------- */
function Matrix({ a, lang }: { a: Analytics; lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const segs: { type: "residential" | "commercial"; deal: "sale" | "lease" }[] = [
    { type: "residential", deal: "sale" }, { type: "residential", deal: "lease" }, { type: "commercial", deal: "sale" }, { type: "commercial", deal: "lease" },
  ];
  const areas = ["North", "East", "Central", "West", "South"] as const;
  return (
    <Section id="matrix" title={ar ? "الطلب مقابل المعروض" : "Demand vs. supply"}
      sub={ar ? "في كل خانة: كم مستثمر يطلب، مقابل كم أرض متاحة عندنا. الخانات المحددة فيها طلب وما عندنا شي." : "Each cell: investors asking vs. properties we have available. Outlined cells have demand and no supply."}>
      <div className="glass overflow-x-auto rounded-[24px] p-4">
        <table className="w-full min-w-[620px] text-[14px]">
          <thead><tr className="text-muted">
            <th className="p-2 text-start font-normal">{ar ? "المنطقة" : "Area"}</th>
            {segs.map((s) => <th key={s.type + s.deal} className="p-2 text-center font-normal">{TYPE_LABEL[s.type][lang]} · {DEAL_LABEL[s.deal][lang]}</th>)}
          </tr></thead>
          <tbody>
            {areas.map((ar_) => (
              <tr key={ar_} className="border-t border-hair">
                <td className="p-2 font-medium">{AREA_LABEL[ar_][lang]}</td>
                {segs.map((s) => {
                  const c = a.matrix.find((m) => m.area === ar_ && m.type === s.type && m.deal === s.deal) ?? { demand: 0, supply: 0 };
                  const gap = c.demand > 0 && c.supply === 0;
                  const heat = Math.min(1, c.demand / 8);
                  return (
                    <td key={s.type + s.deal} className="p-1.5">
                      <div className={`rounded-2xl px-2 py-2 text-center ${gap ? "ring-2 ring-ink" : ""}`} style={{ background: `rgba(201,161,91,${0.08 + heat * 0.4})` }}>
                        <span className="font-semibold">{c.demand}</span>
                        <span className="text-muted"> / {c.supply}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 px-2 text-[12px] text-muted">{ar ? "الرقم الأول: طلبات المستثمرين. الثاني: الأراضي المتاحة." : "First number: investor inquiries. Second: available properties."}</p>
      </div>
    </Section>
  );
}

/* ---------------- vacancy ---------------- */
function Vacancy({ a, lang }: { a: Analytics; lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const max = Math.max(...a.vacancies.map((v) => v.lost), 1);
  return (
    <Section id="vacancy" title={ar ? "الإيجار اللي ضاع" : "Rent we've missed"}
      sub={ar ? "كل أرض إيجار متاحة: الإيجار السنوي المطلوب مقسوم على أيام السنة، مضروب في الأيام اللي قعدتها فاضية لين اليوم. رقم تقديري، ويكبر كل يوم." : "Each available lease property: asking annual rent per day, times the days it has sat vacant up to today. An estimate, and it grows every day."}>
      <div className="glass space-y-3 rounded-[24px] p-5">
        {a.vacancies.map((v) => (
          <div key={v.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-[14px]">
              <Link href={`/lands/${v.id}`} className="font-medium hover:underline">{ar ? `حي ${v.district_ar}` : v.district_en} <span className="text-muted" dir="ltr">{v.id}</span></Link>
              <span><b className="font-semibold">{money(v.lost, lang)}</b> <span className="text-muted">· {ar ? `${v.days} يوم فاضية` : `${v.days} days vacant`}{v.takers ? (ar ? ` · ${v.takers} مستثمر يقدر يستأجرها` : ` · ${v.takers} investors could lease it`) : ""}</span></span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-ink" style={{ width: `${(v.lost / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- slow listings + repricing simulator ---------------- */
function Stale({ a, lang }: { a: Analytics; lang: "ar" | "en" }) {
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
    return { price, perSqm, can, vsArea: areaMed ? Math.round((perSqm / areaMed - 1) * 100) : null, vsComps: s.compMed ? Math.round((perSqm / s.compMed - 1) * 100) : null };
  }, [s, cut]);
  if (!s) return null;
  return (
    <Section id="stale" title={ar ? "أراضي طوّلت في العرض" : "Slow listings"}
      sub={ar ? `أراضي معروضة من أكثر من 120 يوم لين اليوم. جرّب تخفيض السعر وشوف كم مستثمر من اللي عندنا تصير ميزانيته تكفيها، وكيف يصير سعرها مقارنة بالمنطقة والصفقات اللي تمت.` : "Properties listed for over 120 days as of today. Try a price cut and see how many investors in our pipeline could then afford it, and how it compares with the area and closed deals."}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="glass max-h-[460px] overflow-y-auto rounded-[24px] p-2">
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
        <div className="glass rounded-[24px] p-5">
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
            <input type="range" min={0} max={25} step={1} value={cut} onChange={(e) => setCut(Number(e.target.value))} className="mt-2 w-full rounded-full accent-[var(--apricot)] focus-visible:outline-offset-4" />
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
    </Section>
  );
}

/* ---------------- website ---------------- */
function Website({ live, lang }: { live: Live; lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const [archived, setArchived] = useState<Record<string, boolean>>({});
  const [showArchived, setShowArchived] = useState(false);
  const steps = ["page_view", "match_started", "match_completed", "parcel_view", "chat_open", "lead_submitted"];
  const f = steps.map((n) => ({ n, v: live.funnel.find((x) => x.name === n)?.sessions ?? 0 }));
  const top = Math.max(...f.map((x) => x.v), 1);
  const toggle = async (kind: "lead" | "alert", id: number, value: boolean) => {
    setArchived((m) => ({ ...m, [`${kind}${id}`]: value }));
    await fetch("/api/admin/archive", { method: "POST", headers: { "content-type": "application/json", "x-sarj-admin": "1" }, body: JSON.stringify({ kind, id, archived: value }) }).catch(() => {});
  };
  const isArch = (kind: string, id: number, db: boolean) => archived[`${kind}${id}`] ?? db;
  const leads = live.leads.filter((l) => showArchived || !isArch("lead", l.id, l.archived));
  const alerts = live.alerts.filter((l) => showArchived || !isArch("alert", l.id, l.archived));
  const when = (d: string) => new Date(d).toLocaleString(ar ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { timeZone: "Asia/Riyadh", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <Section id="website" title={ar ? "الموقع الجديد" : "The new website"}
      sub={ar ? "وش يصير في الموقع فعلياً خلال آخر 30 يوم: الزوار، وين يوقفون، الطلبات اللي جت منه ومن المستشار، ووش يسألون عنه." : "What's actually happening on the site over the last 30 days: visitors, where they drop off, requests from the site and the advisor, and what they ask."}>
      {!live.ok ? <p className="glass rounded-[24px] p-5 text-muted">{ar ? "ما قدرنا نوصل لقاعدة البيانات الحين." : "Couldn't reach the database right now."}</p> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass rounded-[24px] p-5">
            <p className="font-semibold">{ar ? "رحلة الزائر" : "Visitor journey"}</p>
            <p className="text-[12px] text-muted">{ar ? "زوار وافقوا على الكوكيز، آخر 30 يوم" : "Visitors who accepted cookies, last 30 days"}</p>
            <div className="mt-3 space-y-2">
              {f.map((x) => (
                <div key={x.n}>
                  <div className="flex justify-between text-[13px]"><span>{EVENT_T[x.n][lang]}</span><b>{x.v}</b></div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-apricot" style={{ width: `${(x.v / top) * 100}%` }} /></div>
                </div>
              ))}
            </div>
            {live.topViewed.length > 0 && (
              <>
                <p className="mt-4 font-semibold">{ar ? "أكثر أراضي انفتحت" : "Most viewed properties"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {live.topViewed.map((t) => { const p = byId(t.parcel_id); return p ? (
                    <Link key={t.parcel_id} href={`/lands/${t.parcel_id}`} className="rounded-full bg-white/80 px-3 py-1 text-[13px] hover:bg-white">{district(p, lang)} · {t.views}</Link>
                  ) : null; })}
                </div>
              </>
            )}
          </div>
          <div className="glass rounded-[24px] p-5">
            <p className="font-semibold">{ar ? "وش يسألون المستشار" : "What visitors ask the advisor"}</p>
            {live.questions.length ? (
              <ul className="mt-3 space-y-2 text-[14px]">
                {live.questions.map((q, i) => <li key={i} className="rounded-2xl bg-white/70 px-3 py-2"><span dir="auto">{q.user_msg}</span> <span className="block text-[11px] text-muted">{when(q.created_at)}{q.page ? ` · ${q.page}` : ""}</span></li>)}
              </ul>
            ) : <p className="mt-2 text-[14px] text-muted">{ar ? "ما فيه أسئلة للحين." : "No questions yet."}</p>}
          </div>
          <div className="glass rounded-[24px] p-5 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{ar ? `طلبات من الموقع (${leads.length})` : `Requests from the website (${leads.length})`}</p>
              <label className="flex items-center gap-2 text-[13px] text-muted"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-[var(--ink)]" />{ar ? "أظهر المؤرشفة" : "Show archived"}</label>
            </div>
            {leads.length || alerts.length ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-[14px]">
                  <thead><tr className="text-[12px] text-muted">
                    <th className="p-2 text-start font-normal">{ar ? "متى" : "When"}</th><th className="p-2 text-start font-normal">{ar ? "الاسم" : "Name"}</th>
                    <th className="p-2 text-start font-normal">{ar ? "الجوال" : "Mobile"}</th><th className="p-2 text-start font-normal">{ar ? "النوع" : "Type"}</th>
                    <th className="p-2 text-start font-normal">{ar ? "الأرض أو الطلب" : "Property or request"}</th><th className="p-2" />
                  </tr></thead>
                  <tbody>
                    {leads.map((l) => { const arch = isArch("lead", l.id, l.archived); const p = l.parcel_id ? byId(l.parcel_id) : null; return (
                      <tr key={`l${l.id}`} className={`border-t border-hair ${arch ? "opacity-50" : ""}`}>
                        <td className="p-2 whitespace-nowrap">{when(l.created_at)}</td><td className="p-2">{l.name}</td>
                        <td className="p-2" dir="ltr"><a className="underline-offset-2 hover:underline" href={`https://wa.me/966${l.phone.slice(1)}`} target="_blank" rel="noopener">{l.phone}</a></td>
                        <td className="p-2"><Pill tone="gold">{l.kind === "site_visit" ? (ar ? "زيارة" : "Visit") : (ar ? "استفسار" : "Inquiry")}</Pill> <Pill>{l.source === "chat" ? (ar ? "المستشار" : "Advisor") : (ar ? "نموذج" : "Form")}</Pill></td>
                        <td className="p-2">{p ? <Link href={`/lands/${p.parcel_id}`} className="hover:underline">{district(p, lang)}</Link> : "–"}{l.message ? <span className="block text-[12px] text-muted" dir="auto">{l.message}</span> : null}</td>
                        <td className="p-2 text-end"><button onClick={() => toggle("lead", l.id, !arch)} className="bubble px-3 py-1 text-[12px]">{arch ? (ar ? "استرجاع" : "Restore") : (ar ? "أرشفة" : "Archive")}</button></td>
                      </tr>); })}
                    {alerts.map((l) => { const arch = isArch("alert", l.id, l.archived); const c = l.criteria ?? {}; return (
                      <tr key={`a${l.id}`} className={`border-t border-hair ${arch ? "opacity-50" : ""}`}>
                        <td className="p-2 whitespace-nowrap">{when(l.created_at)}</td><td className="p-2">{l.name}</td>
                        <td className="p-2" dir="ltr">{l.phone}</td>
                        <td className="p-2"><Pill>{ar ? "تنبيه" : "Alert"}</Pill></td>
                        <td className="p-2 text-[13px]">{c.waitlist ? (ar ? `قائمة انتظار ${c.waitlist}` : `Waitlist ${c.waitlist}`) : [c.use, c.deal, c.area, c.budget ? money(Number(c.budget), lang) : null].filter(Boolean).join(" · ")}</td>
                        <td className="p-2 text-end"><button onClick={() => toggle("alert", l.id, !arch)} className="bubble px-3 py-1 text-[12px]">{arch ? (ar ? "استرجاع" : "Restore") : (ar ? "أرشفة" : "Archive")}</button></td>
                      </tr>); })}
                  </tbody>
                </table>
              </div>
            ) : <p className="mt-2 text-[14px] text-muted">{ar ? "ما فيه طلبات جديدة." : "No new requests."}</p>}
          </div>
        </div>
      )}
    </Section>
  );
}

/* ---------------- channels ---------------- */
function Channels({ a, lang }: { a: Analytics; lang: "ar" | "en" }) {
  const ar = lang === "ar";
  return (
    <Section id="pipeline" title={ar ? "من وين يجون المستثمرين" : "Where investors come from"}
      sub={ar ? "قنوات الطلبات الحالية. نموذج الموقع القديم كان أضعف قناة، وهذا اللي الموقع الجديد جاي يغيره." : "Current inquiry channels. The old website form was the weakest one, which is what the new site is here to change."}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-[24px] p-5">
          <table className="w-full text-[14px]">
            <thead><tr className="text-[12px] text-muted"><th className="p-2 text-start font-normal">{ar ? "القناة" : "Channel"}</th><th className="p-2 font-normal">{ar ? "طلبات" : "Inquiries"}</th><th className="p-2 font-normal">{ar ? "جاهزين" : "Ready"}</th><th className="p-2 font-normal">{ar ? "في تفاوض" : "Negotiating"}</th></tr></thead>
            <tbody>{a.channels.map((c) => (
              <tr key={c.channel} className="border-t border-hair text-center"><td className="p-2 text-start">{CHANNEL_T[c.channel]?.[lang] ?? c.channel}</td><td className="p-2 font-semibold">{c.count}</td><td className="p-2">{c.ready}</td><td className="p-2">{c.negotiating}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className="glass rounded-[24px] p-5">
          <p className="font-semibold">{ar ? "أسماء مكررة بأرقام مختلفة" : "Repeated names, different numbers"}</p>
          <p className="text-[13px] text-muted">{ar ? "ممكن نفس الشخص أو أشخاص مختلفين. يستاهل تتأكد قبل لا تتصل مرتين." : "Could be the same person or different people. Worth checking before calling twice."}</p>
          <ul className="mt-3 space-y-1.5 text-[14px]">
            {a.duplicates.map((d) => <li key={d.name}>{ar ? d.name_ar : d.name} <span className="text-muted" dir="ltr">· {d.ids.join(", ")}</span></li>)}
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* ---------------- data quality ---------------- */
function DataQuality({ a, lang }: { a: Analytics; lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const AR: Record<string, string> = {
    "lat/lng": "الإحداثيات", price: "السعر", days_on_market: "أيام العرض", total_price_sar: "السعر الإجمالي",
  };
  return (
    <Section id="data" title={ar ? "جودة البيانات" : "Data quality"}
      sub={ar ? "كل تصحيح سويناه على بيانات المحفظة، وليش. ولا أرض انحذفت: الـ120 كلها موجودة." : "Every correction we made to the portfolio data, and why. Nothing was dropped: all 120 properties are present."}>
      <div className="glass divide-y divide-[var(--hair)] rounded-[24px] px-5">
        {a.corrections.map((c, i) => (
          <div key={i} className="grid gap-1 py-3 text-[14px] md:grid-cols-[9rem_1fr_1fr] md:gap-4">
            <p className="font-medium">{c.parcel_id ?? (ar ? "كل الأراضي" : "All")} · {ar ? AR[c.field] ?? c.field : c.field}</p>
            <p className="text-muted">{ar ? c.issue_ar ?? c.issue : c.issue}</p>
            <p>{ar ? c.action_ar ?? c.action : c.action}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
