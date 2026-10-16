"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { byId } from "@/lib/portfolio";
import { AREA_LABEL, AREA_SHORT, money, num, district } from "@/lib/format";
import type { Analytics } from "@/lib/admin/analytics";
import type { Live } from "@/lib/admin/live";
import { Card, MoreLink, Pill, STATUS_COLOR, STATUS_T, INTENT_T, VacancyClock, type Lang } from "./ui";

type Task = { id: string; title: string; why: string; href: string; cta: string; tone: "act" | "risk" | "plan"; empty?: boolean };

function buildTasks(a: Analytics, live: Live | null, lang: Lang): Task[] {
  const ar = lang === "ar";
  const out: Task[] = [];
  const openReq = live?.ok ? live.leads.filter((l) => !l.archived).length + live.alerts.filter((l) => !l.archived).length : 0;
  if (!live?.ok) out.push({ id: "requests", tone: "act", href: "/admin/investors?tab=requests", cta: ar ? "افتح الطلبات" : "Open requests",
    title: ar ? "راجع طلبات الموقع" : "Check website requests", why: ar ? "ما قدرنا نجيب عددها الحين. افتح الصفحة وشوف إذا فيه شي جديد." : "We couldn't load the count right now. Open the page to check for anything new." });
  else out.push(openReq
    ? { id: "requests", tone: "act", href: "/admin/investors?tab=requests", cta: ar ? "افتح الطلبات" : "Open requests",
      title: ar ? `ردّ على ${openReq} ${openReq === 1 ? "طلب" : "طلبات"} من الموقع` : `Reply to ${openReq} website request${openReq === 1 ? "" : "s"}`,
      why: ar ? "ناس طلبوا زيارة أو تنبيه من الموقع الجديد. الرد السريع أكبر سبب يخليهم يكملون." : "People asked for a visit or an alert on the new site. A fast reply is the biggest reason they continue." }
    : { id: "requests", tone: "act", empty: true, href: "/admin/investors?tab=requests", cta: ar ? "شوف" : "View",
      title: ar ? "ما فيه طلبات جديدة من الموقع" : "No new website requests", why: ar ? "كل الطلبات انردّ عليها وانأرشفت." : "Every request has been handled and archived." });
  const ready = a.calls.filter((c) => c.intent === "ready to move" && c.status === "new");
  if (ready.length) out.push({ id: "ready", tone: "act", href: "/admin/investors?tab=calls", cta: ar ? "قائمة الاتصال" : "Call list",
    title: ar ? `كلّم ${ready.length} مستثمرين جاهزين ما أحد كلمهم` : `Call ${ready.length} ready investors nobody has contacted`,
    why: ar ? `أقدمهم ينتظر من ${Math.max(...ready.map((c) => c.waiting))} يوم. لكل واحد رسالة واتساب جاهزة بالأرض المناسبة له.` : `The oldest has waited ${Math.max(...ready.map((c) => c.waiting))} days. Each has a ready WhatsApp message with a matching property.` });
  const h = a.hot[0];
  if (h) out.push({ id: "hot", tone: "act", href: "/admin/properties?tab=hot", cta: ar ? "شوف المشترين" : "See buyers",
    title: ar ? `اطلب أفضل عرض على أرض ${h.district_ar}` : `Ask for best offers on ${h.district_en}`,
    why: ar ? `${h.buyers.length} مشترين يقدرون عليها، ومعروضة من ${h.age} يوم. وعندك ${a.hot.length - 1} أراضي ثانية بنفس الوضع.` : `${h.buyers.length} buyers can afford it and it's been listed ${h.age} days. ${a.hot.length - 1} more properties are in the same spot.` });
  const slow = a.stale.filter((s) => s.affordableNow > 0);
  if (slow.length) out.push({ id: "slow", tone: "act", href: "/admin/properties?tab=slow", cta: ar ? "الأراضي المتأخرة" : "Slow listings",
    title: ar ? `اعرض ${slow.length} أراضي متأخرة على اللي يقدرون عليها` : `Show ${slow.length} slow listings to investors who can afford them`,
    why: ar ? "معروضة من أكثر من 120 يوم، وعندنا مستثمرين ميزانيتهم تكفيها. المشكلة مو السعر." : "Listed over 120 days, and investors in our pipeline can already afford them. Price isn't the problem." });
  out.push({ id: "vacancy", tone: "risk", href: "/admin/properties?tab=vacancy", cta: ar ? "أراضي الإيجار" : "Lease properties",
    title: ar ? "وقّف نزيف أراضي الإيجار الفاضية" : "Stop the bleed on vacant lease properties",
    why: ar ? `تخسر تقريباً ${money(a.kpis.vacancyPerDay, "ar")} كل يوم إيجار ما انحصّل.` : `About ${money(a.kpis.vacancyPerDay, "en")} of rent goes uncollected every day.` });
  const b = a.buyNext[0];
  if (b) out.push({ id: "buy", tone: "plan", href: "/admin/market?tab=buy", cta: ar ? "قائمة الاستحواذ" : "Acquisition list",
    title: ar ? `ابحث عن ${b.type === "commercial" ? "تجاري" : "سكني"} ${b.deal === "sale" ? "للبيع" : "للإيجار"} في ${AREA_LABEL[b.area].ar}` : `Source ${b.type} land ${b.deal === "sale" ? "for sale" : "for lease"} in ${AREA_LABEL[b.area].en}`,
    why: ar ? `${b.count} مستثمرين يطلبونها وما عندنا ولا أرض هناك. هذا لهالأسبوع، مو لازم اليوم.` : `${b.count} investors want it and we have none there. This week, not necessarily today.` });
  return out;
}

export default function TodayView({ a, live }: { a: Analytics; live: Live | null }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const tasks = buildTasks(a, live, lang);
  const key = `sarj_admin_done_${a.today}`;
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => { try { setDone(JSON.parse(localStorage.getItem(key) || "{}")); } catch {} }, [key]);
  const toggle = (id: string) => setDone((d) => { const n = { ...d, [id]: !d[id] }; try { localStorage.setItem(key, JSON.stringify(n)); } catch {} return n; });
  const actionable = tasks.filter((t) => !t.empty);
  const doneCount = actionable.filter((t) => done[t.id]).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold leading-tight sm:text-[34px]">{ar ? "وش يحتاجك اليوم" : "What needs you today"}</h1>
        <p className="mt-1 text-[15px] text-muted">
          {doneCount === actionable.length && actionable.length
            ? (ar ? "خلصت كل مهام اليوم. الباقي تحت للمتابعة." : "All of today's tasks are done. The rest below is for follow-up.")
            : (ar ? `${actionable.length - doneCount} من ${actionable.length} مهام باقية. ابدأ من فوق، كل وحدة تفتح لك الصفحة اللي تحتاجها.` : `${actionable.length - doneCount} of ${actionable.length} tasks left. Start at the top; each one opens the page you need.`)}
        </p>
      </div>

      {/* 1. what to do */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card title={ar ? "مهام اليوم" : "Today's tasks"} sub={ar ? "مرتبة حسب الأهمية. علّم اللي خلصته، وبكرة تبدأ القائمة من جديد." : "Ordered by importance. Tick what you finish; tomorrow the list starts fresh."}
          action={<span className="text-[13px] font-medium text-muted">{ar ? `${doneCount} من ${actionable.length}` : `${doneCount} of ${actionable.length}`}</span>}>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-apricot transition-all" style={{ width: `${actionable.length ? (doneCount / actionable.length) * 100 : 0}%` }} /></div>
          <ol className="space-y-2">
            {tasks.map((t, i) => {
              const isDone = !!done[t.id] || t.empty;
              return (
                <li key={t.id} className={`flex items-start gap-3 rounded-[18px] bg-white/70 p-3 transition ${isDone ? "opacity-60" : ""}`}>
                  {t.empty ? (
                    <span aria-hidden className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#7f9a6e] text-[14px] text-white">✓</span>
                  ) : (
                    <button onClick={() => toggle(t.id)} aria-pressed={!!done[t.id]} aria-label={ar ? (done[t.id] ? "رجّعها" : "خلصت") : (done[t.id] ? "Mark not done" : "Mark done")}
                      className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-[13px] font-bold ${done[t.id] ? "border-ink bg-ink text-white" : "border-ink/20 text-muted hover:border-ink"}`}>
                      {done[t.id] ? "✓" : i + 1}
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${done[t.id] ? "line-through" : ""}`}>
                      {t.tone === "risk" && <span className="me-1.5 inline-block h-2 w-2 rounded-full bg-ink align-middle" />}
                      {t.tone === "plan" && <span className="me-1.5"><Pill>{ar ? "هالأسبوع" : "This week"}</Pill></span>}
                      {t.title}
                    </p>
                    <p className="text-[14px] text-muted">{t.why}</p>
                    <Link href={t.href} className={`mt-2 inline-block rounded-full px-3.5 py-2 text-[13px] font-medium sm:hidden ${isDone ? "bubble" : "btn-primary text-white"}`}>{t.cta}</Link>
                  </div>
                  <Link href={t.href} className={`hidden shrink-0 self-center rounded-full px-3.5 py-2 text-[13px] font-medium sm:inline-block ${isDone ? "bubble" : "btn-primary text-white"}`}>{t.cta}</Link>
                </li>
              );
            })}
          </ol>
        </Card>

        <Card title={ar ? "أول 3 اتصالات" : "First 3 calls"} sub={ar ? "الأعلى أولوية من كل الطلبات" : "Highest priority across all inquiries"} action={<MoreLink href="/admin/investors?tab=calls">{ar ? "الكل" : "All"}</MoreLink>}>
          <div className="space-y-2">
            {a.calls.slice(0, 3).map((c) => {
              const p = c.match ? byId(c.match) : null;
              return (
                <div key={c.id} className="rounded-[18px] bg-white/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{ar ? c.name_ar : c.name}</p>
                      <p className="text-[13px] text-muted">{ar ? c.wants_ar : c.wants} · {AREA_SHORT[c.area as keyof typeof AREA_SHORT][lang]} · {money(c.budget, lang)}</p>
                    </div>
                    <a href={c.wa} target="_blank" rel="noopener" className="btn-wa shrink-0 px-3 py-1.5 text-[13px] font-medium">{ar ? "واتساب" : "WhatsApp"}</a>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <Pill tone={c.intent === "ready to move" ? "gold" : "plain"}>{INTENT_T[c.intent][lang]}</Pill>
                    <Pill tone={c.status === "new" ? "dark" : "plain"}>{STATUS_T[c.status][lang]}</Pill>
                    <Pill>{ar ? `ينتظر ${c.waiting} يوم` : `${c.waiting} days`}</Pill>
                  </div>
                  {p && <p className="mt-2 text-[13px]">{c.action[lang]}: <Link href={`/lands/${p.parcel_id}`} className="font-medium underline decoration-apricot decoration-2 underline-offset-4">{district(p, lang)}</Link></p>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* 2. the numbers */}
      <section aria-label={ar ? "الأرقام" : "Key numbers"} className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { href: "/admin/properties", k: ar ? "متاحة للعرض" : "Available", v: num(a.kpis.available, lang), s: ar ? `من ${a.kpis.total} أرض` : `of ${a.kpis.total} properties` },
          { href: "/admin/properties", k: ar ? "محجوزة" : "Reserved", v: num(a.kpis.reserved, lang), s: ar ? "بانتظار إتمام الصفقة" : "awaiting completion" },
          { href: "/admin/market", k: ar ? "صفقات تمت" : "Closed deals", v: num(a.kpis.sold + a.kpis.leased, lang), s: ar ? `${a.kpis.sold} بيع · ${a.kpis.leased} إيجار` : `${a.kpis.sold} sold · ${a.kpis.leased} leased` },
          { href: "/admin/investors", k: ar ? "ميزانيات مشترين جاهزين" : "Ready buyers' budgets", v: money(a.kpis.pipelineSale, lang), s: ar ? "طلبات شراء نيتها جاهزة" : "ready-to-move purchase inquiries" },
        ].map((x) => (
          <Link key={x.k} href={x.href} className="glass rounded-[22px] p-4 hover:bg-white">
            <p className="text-[13px] text-muted">{x.k}</p>
            <p className="mt-1 text-[22px] font-bold leading-8 xl:text-[24px]">{x.v}</p>
            <p className="text-[12px] text-muted">{x.s}</p>
          </Link>
        ))}
        <Link href="/admin/properties?tab=vacancy" className="col-span-2 rounded-[22px] bg-ink p-4 text-white lg:col-span-1">
          <p className="text-[13px] text-white/70">{ar ? "إيجار ضايع من الأراضي الفاضية" : "Rent missed on vacant leases"}</p>
          <p className="mt-1 text-[22px] font-bold leading-8"><VacancyClock base={a.kpis.vacancyLost} perDay={a.kpis.vacancyPerDay} lang={lang} /></p>
          <p className="text-[12px] text-white/70">{ar ? `ويزيد ${money(a.kpis.vacancyPerDay, "ar")} كل يوم` : `growing ${money(a.kpis.vacancyPerDay, "en")} a day`}</p>
        </Link>
      </section>

      {/* 3. the picture */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PortfolioChart a={a} lang={lang} />
        <AreaChart a={a} lang={lang} />
        <WebsiteChart live={live} lang={lang} />
      </div>
    </div>
  );
}

function PortfolioChart({ a, lang }: { a: Analytics; lang: Lang }) {
  const ar = lang === "ar";
  const segs = [
    { k: "available", label: ar ? "متاحة" : "Available", v: a.kpis.available },
    { k: "reserved", label: ar ? "محجوزة" : "Reserved", v: a.kpis.reserved },
    { k: "sold", label: ar ? "انباعت" : "Sold", v: a.kpis.sold },
    { k: "leased", label: ar ? "تأجّرت" : "Leased", v: a.kpis.leased },
  ] as const;
  const total = a.kpis.total;
  return (
    <Card title={ar ? "المحفظة كاملة" : "The whole portfolio"} sub={ar ? `${total} أرض حسب حالتها` : `${total} properties by status`} action={<MoreLink href="/admin/properties">{ar ? "الأراضي" : "Properties"}</MoreLink>}>
      <div className="flex h-9 gap-[2px] overflow-hidden rounded-[10px]" role="img" aria-label={segs.map((s) => `${s.label} ${s.v}`).join("، ")}>
        {segs.map((s) => (
          <div key={s.k} title={`${s.label}: ${s.v} (${Math.round((s.v / total) * 100)}%)`} className="h-full transition-opacity hover:opacity-80" style={{ width: `${(s.v / total) * 100}%`, background: STATUS_COLOR[s.k] }} />
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {segs.map((s) => (
          <div key={s.k} className="flex items-center gap-2.5">
            <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: STATUS_COLOR[s.k] }} />
            <dt className="text-[14px] text-muted">{s.label}</dt>
            <dd className="ms-auto text-[15px] font-semibold tabular-nums">{s.v} <span className="text-[12px] font-normal text-muted">{Math.round((s.v / total) * 100)}%</span></dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function AreaChart({ a, lang }: { a: Analytics; lang: Lang }) {
  const ar = lang === "ar";
  const areas = ["North", "East", "Central", "West", "South"] as const;
  const rows = areas.map((x) => {
    const cells = a.matrix.filter((m) => m.area === x);
    return { area: x, demand: cells.reduce((s, c) => s + c.demand, 0), supply: cells.reduce((s, c) => s + c.supply, 0) };
  });
  const max = Math.max(...rows.flatMap((r) => [r.demand, r.supply]), 1);
  const gap = [...rows].sort((p, q) => (q.demand - q.supply) - (p.demand - p.supply))[0];
  return (
    <Card title={ar ? "وين الطلب، ووين أراضينا" : "Where demand is vs. our land"} sub={ar ? "طلبات المستثمرين مقابل الأراضي المتاحة، حسب المنطقة" : "Investor inquiries vs. available properties, by area"} action={<MoreLink href="/admin/market">{ar ? "السوق" : "Market"}</MoreLink>}>
      <div className="mb-3 flex gap-4 text-[12px] text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-ink" />{ar ? "طلبات" : "Inquiries"}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#b07f2c]" />{ar ? "أراضي متاحة" : "Available"}</span>
      </div>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.area} className="grid grid-cols-[4.5rem_1fr] items-center gap-2">
            <span className="text-[13px] font-medium">{AREA_SHORT[r.area][lang]}</span>
            <div className="space-y-[3px]">
              {([["demand", "bg-ink"], ["supply", "bg-[#b07f2c]"]] as const).map(([k, c]) => (
                <div key={k} className="flex items-center gap-2" title={`${AREA_SHORT[r.area][lang]}: ${r[k]} ${k === "demand" ? (ar ? "طلب" : "inquiries") : (ar ? "أرض متاحة" : "available")}`}>
                  <div className={`h-2.5 rounded-e-[4px] ${c}`} style={{ width: `${Math.max((r[k] / max) * 85, r[k] ? 2 : 0)}%` }} />
                  <span className="text-[12px] tabular-nums text-muted">{r[k]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {gap && gap.demand > gap.supply && (
        <p className="mt-4 rounded-2xl bg-apricot-soft px-3 py-2 text-[13px] text-[#6d531f]">
          {ar ? `أكبر فجوة في ${AREA_LABEL[gap.area].ar}: ${gap.demand} طلب مقابل ${gap.supply} أرض متاحة.` : `Biggest gap: ${AREA_LABEL[gap.area].en}, ${gap.demand} inquiries vs. ${gap.supply} available.`}
        </p>
      )}
    </Card>
  );
}

function WebsiteChart({ live, lang }: { live: Live | null; lang: Lang }) {
  const ar = lang === "ar";
  const f = (n: string) => live?.funnel.find((x) => x.name === n)?.sessions ?? 0;
  const steps = [
    { label: ar ? "زاروا الموقع" : "Visited", v: f("page_view") },
    { label: ar ? "فتحوا أرض" : "Opened a property", v: f("parcel_view") },
    { label: ar ? "كلموا المستشار" : "Used the advisor", v: f("chat_open") },
    { label: ar ? "طلبوا زيارة" : "Requested a visit", v: f("lead_submitted") },
  ];
  const max = Math.max(steps[0].v, 1);
  const conv = steps[0].v ? Math.round((steps[3].v / steps[0].v) * 1000) / 10 : 0;
  return (
    <Card title={ar ? "الموقع، آخر 30 يوم" : "Website, last 30 days"} sub={ar ? "زوار وافقوا على الكوكيز" : "Visitors who accepted cookies"} action={<MoreLink href="/admin/website">{ar ? "التفاصيل" : "Details"}</MoreLink>}>
      {!live?.ok ? <p className="text-[14px] text-muted">{ar ? "ما قدرنا نوصل لقاعدة البيانات الحين." : "Couldn't reach the database right now."}</p> : (
        <>
          <div className="space-y-2.5">
            {steps.map((s) => (
              <div key={s.label} title={`${s.label}: ${s.v}`}>
                <div className="flex justify-between text-[13px]"><span>{s.label}</span><b className="tabular-nums">{s.v}</b></div>
                <div className="mt-1 h-2.5 rounded-full bg-white/70"><div className="h-full rounded-e-[4px] rounded-s-full bg-[#b07f2c]" style={{ width: `${Math.max((s.v / max) * 100, s.v ? 2 : 0)}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-muted">{ar ? `${conv}% من الزوار طلبوا زيارة.` : `${conv}% of visitors requested a visit.`}</p>
        </>
      )}
    </Card>
  );
}
