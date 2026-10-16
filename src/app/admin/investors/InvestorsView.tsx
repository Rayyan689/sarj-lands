"use client";
import Link from "next/link";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { byId } from "@/lib/portfolio";
import { AREA_SHORT, DEAL_LABEL, money, district } from "@/lib/format";
import type { Analytics } from "@/lib/admin/analytics";
import type { Live } from "@/lib/admin/live";
import { Card, Empty, PageHeader, Pill, Tabs, useTab, STATUS_T, INTENT_T, whenFmt, type Lang } from "../ui";

const TABS = ["calls", "requests", "duplicates"] as const;

export default function InvestorsView({ a, live, tab: initial }: { a: Analytics; live: Live | null; tab?: string }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [tab, setTab] = useTab(initial, TABS);
  const [archived, setArchived] = useState<Record<string, boolean>>({});
  const isArch = (kind: string, id: number, db: boolean) => archived[`${kind}${id}`] ?? db;
  const openReq = live?.ok ? live.leads.filter((l) => !isArch("lead", l.id, l.archived)).length + live.alerts.filter((l) => !isArch("alert", l.id, l.archived)).length : 0;

  return (
    <>
      <PageHeader title={ar ? "المستثمرين" : "Investors"}
        sub={ar ? "كل من طلب أرض، من الموقع الجديد ومن القنوات القديمة. ابدأ بطلبات الموقع الجديدة، بعدها قائمة الاتصال." : "Everyone who asked for land, from the new website and older channels. Start with new website requests, then the call list."} />
      <Tabs label={ar ? "أقسام المستثمرين" : "Investor sections"} value={tab} onChange={setTab} tabs={[
        { id: "calls", label: ar ? "قائمة الاتصال" : "Call list", count: a.calls.length },
        { id: "requests", label: ar ? "طلبات الموقع" : "Website requests", count: openReq },
        { id: "duplicates", label: ar ? "أسماء مكررة" : "Possible duplicates", count: a.duplicates.length },
      ]} />
      {tab === "calls" && <Calls a={a} lang={lang} />}
      {tab === "requests" && <Requests live={live} lang={lang} archived={archived} setArchived={setArchived} isArch={isArch} />}
      {tab === "duplicates" && <Duplicates a={a} lang={lang} />}
    </>
  );
}

function Calls({ a, lang }: { a: Analytics; lang: Lang }) {
  const ar = lang === "ar";
  const [status, setStatus] = useState<"all" | "new" | "contacted" | "negotiating">("all");
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const rows = a.calls.filter((c) => (status === "all" || c.status === status) && (!ready || c.intent === "ready to move") &&
    (!q.trim() || `${c.name} ${c.name_ar} ${c.id} ${c.phone}`.toLowerCase().includes(q.trim().toLowerCase())));
  const shown = all ? rows : rows.slice(0, 10);
  return (
    <>
      <p className="mb-3 max-w-3xl text-[14px] text-muted">{ar ? "مرتبين حسب مين تكلم أول: جاهزية المستثمر، هل عندنا أرض تناسبه، وكم له ينتظر. زر واتساب يفتح رسالة جاهزة باسمه والأرض المناسبة له." : "Ordered by who to contact first: readiness, whether we have a fit, and how long they've waited. WhatsApp opens a ready message with their name and best-fit property."}</p>
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {(["all", "new", "contacted", "negotiating"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`bubble px-3 py-1.5 text-[13px] ${status === s ? "bubble-on" : ""}`}>
            {s === "all" ? (ar ? "الكل" : "All") : STATUS_T[s][lang]} <span className="opacity-60">{s === "all" ? a.calls.length : a.calls.filter((c) => c.status === s).length}</span>
          </button>
        ))}
        <button onClick={() => setReady(!ready)} aria-pressed={ready} className={`bubble px-3 py-1.5 text-[13px] ${ready ? "bubble-on" : ""}`}>{ar ? "الجاهزين بس" : "Ready only"}</button>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? "ابحث بالاسم أو الرقم" : "Search name or number"} aria-label={ar ? "بحث" : "Search"} className="field ms-auto h-9 w-full rounded-full px-4 text-[14px] sm:w-56" />
      </div>
      {!rows.length ? <Empty>{ar ? "ما فيه أحد بهالفلتر." : "Nobody matches this filter."}</Empty> : (
        <div className="space-y-2">
          {shown.map((c, i) => {
            const p = c.match ? byId(c.match) : null;
            return (
              <div key={c.id} className="glass grid gap-3 rounded-[22px] p-4 md:grid-cols-[2rem_minmax(0,1.3fr)_minmax(0,1.2fr)_auto] md:items-center">
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
                      <Link href={`/lands/${p.parcel_id}`} className="font-medium underline decoration-apricot decoration-2 underline-offset-4">{district(p, lang)} · {money(p.total_price_sar ?? 0, lang)}</Link>
                    </>
                  ) : <p className="text-muted">{ar ? "ما عندنا شي يناسبه الحين" : "Nothing fits right now"}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                  <span className="me-1 text-[13px] font-medium">{c.action[lang]}</span>
                  <a href={c.wa} target="_blank" rel="noopener" className="btn-wa px-3.5 py-1.5 text-[13px] font-medium">{ar ? "واتساب" : "WhatsApp"}</a>
                  <button onClick={() => { navigator.clipboard?.writeText(c.waText).then(() => { setCopied(c.id); setTimeout(() => setCopied(null), 1500); }).catch(() => {}); }}
                    className="bubble px-3 py-1.5 text-[13px]">{copied === c.id ? (ar ? "انسخت ✓" : "Copied ✓") : (ar ? "انسخ الرسالة" : "Copy message")}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {rows.length > 10 && (
        <button onClick={() => setAll(!all)} className="bubble mt-3 px-4 py-2 text-[14px]">{all ? (ar ? "أقل" : "Show less") : (ar ? `عرض الكل (${rows.length})` : `Show all (${rows.length})`)}</button>
      )}
    </>
  );
}

function Requests({ live, lang, setArchived, isArch }: { live: Live | null; lang: Lang; archived: Record<string, boolean>; setArchived: React.Dispatch<React.SetStateAction<Record<string, boolean>>>; isArch: (k: string, id: number, db: boolean) => boolean }) {
  const ar = lang === "ar";
  const [showArchived, setShowArchived] = useState(false);
  if (!live?.ok) return <Empty>{ar ? "ما قدرنا نوصل لقاعدة البيانات الحين." : "Couldn't reach the database right now."}</Empty>;
  const toggle = async (kind: "lead" | "alert", id: number, value: boolean) => {
    setArchived((m) => ({ ...m, [`${kind}${id}`]: value }));
    await fetch("/api/admin/archive", { method: "POST", headers: { "content-type": "application/json", "x-sarj-admin": "1" }, body: JSON.stringify({ kind, id, archived: value }) }).catch(() => {});
  };
  const leads = live.leads.filter((l) => showArchived || !isArch("lead", l.id, l.archived));
  const alerts = live.alerts.filter((l) => showArchived || !isArch("alert", l.id, l.archived));
  return (
    <Card title={ar ? "طلبات من الموقع الجديد" : "Requests from the new website"}
      sub={ar ? "طلبات زيارة واستفسارات وتنبيهات من النماذج والمستشار. ردّ عليها، وبعدها أرشفها عشان تبقى القائمة نظيفة." : "Visit requests, questions and alerts from forms and the advisor. Reply, then archive to keep the list clean."}
      action={<label className="flex items-center gap-2 text-[13px] text-muted"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-[var(--ink)]" />{ar ? "أظهر المؤرشفة" : "Show archived"}</label>}>
      {leads.length || alerts.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-[14px]">
            <thead><tr className="text-[12px] text-muted">
              <th className="p-2 text-start font-normal">{ar ? "متى" : "When"}</th><th className="p-2 text-start font-normal">{ar ? "الاسم" : "Name"}</th>
              <th className="p-2 text-start font-normal">{ar ? "الجوال" : "Mobile"}</th><th className="p-2 text-start font-normal">{ar ? "النوع" : "Type"}</th>
              <th className="p-2 text-start font-normal">{ar ? "الأرض أو الطلب" : "Property or request"}</th><th className="p-2" />
            </tr></thead>
            <tbody>
              {leads.map((l) => { const arch = isArch("lead", l.id, l.archived); const p = l.parcel_id ? byId(l.parcel_id) : null; return (
                <tr key={`l${l.id}`} className={`border-t border-hair ${arch ? "opacity-50" : ""}`}>
                  <td className="whitespace-nowrap p-2">{whenFmt(l.created_at, lang)}</td><td className="p-2 font-medium">{l.name}</td>
                  <td className="p-2" dir="ltr"><a className="underline-offset-2 hover:underline" href={`https://wa.me/966${l.phone.slice(1)}`} target="_blank" rel="noopener">{l.phone}</a></td>
                  <td className="p-2"><Pill tone="gold">{l.kind === "site_visit" ? (ar ? "زيارة" : "Visit") : (ar ? "استفسار" : "Inquiry")}</Pill> <Pill>{l.source === "chat" ? (ar ? "المستشار" : "Advisor") : (ar ? "نموذج" : "Form")}</Pill></td>
                  <td className="p-2">{p ? <Link href={`/lands/${p.parcel_id}`} className="hover:underline">{district(p, lang)}</Link> : "–"}{l.message ? <span className="block text-[12px] text-muted" dir="auto">{l.message}</span> : null}</td>
                  <td className="p-2 text-end"><button onClick={() => toggle("lead", l.id, !arch)} className="bubble px-3 py-1 text-[12px]">{arch ? (ar ? "استرجاع" : "Restore") : (ar ? "أرشفة" : "Archive")}</button></td>
                </tr>); })}
              {alerts.map((l) => { const arch = isArch("alert", l.id, l.archived); const c = l.criteria ?? {}; return (
                <tr key={`a${l.id}`} className={`border-t border-hair ${arch ? "opacity-50" : ""}`}>
                  <td className="whitespace-nowrap p-2">{whenFmt(l.created_at, lang)}</td><td className="p-2 font-medium">{l.name}</td>
                  <td className="p-2" dir="ltr">{l.phone}</td>
                  <td className="p-2"><Pill>{ar ? "تنبيه" : "Alert"}</Pill></td>
                  <td className="p-2 text-[13px]">{c.waitlist ? (ar ? `قائمة انتظار ${c.waitlist}` : `Waitlist ${c.waitlist}`) : [c.use, c.deal, c.area, c.budget ? money(Number(c.budget), lang) : null].filter(Boolean).join(" · ")}</td>
                  <td className="p-2 text-end"><button onClick={() => toggle("alert", l.id, !arch)} className="bubble px-3 py-1 text-[12px]">{arch ? (ar ? "استرجاع" : "Restore") : (ar ? "أرشفة" : "Archive")}</button></td>
                </tr>); })}
            </tbody>
          </table>
        </div>
      ) : <Empty>{ar ? "ما فيه طلبات جديدة. أي طلب يجي من الموقع بيطلع هنا." : "No new requests. Anything from the website will show up here."}</Empty>}
    </Card>
  );
}

function Duplicates({ a, lang }: { a: Analytics; lang: Lang }) {
  const ar = lang === "ar";
  return (
    <Card title={ar ? "أسماء مكررة بأرقام مختلفة" : "Repeated names, different numbers"} sub={ar ? "ممكن نفس الشخص أو أشخاص مختلفين. تأكد قبل لا تتصل مرتين أو تحسبهم طلبين." : "Could be the same person or different people. Check before calling twice or counting them as two."}>
      {a.duplicates.length ? (
        <ul className="divide-y divide-[var(--hair)]">
          {a.duplicates.map((d) => (
            <li key={d.name} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[14px]">
              <span className="font-medium">{ar ? d.name_ar : d.name}</span>
              <span className="text-muted" dir="ltr">{d.ids.map((id, i) => `${id} (${d.phones[i]})`).join(" · ")}</span>
            </li>
          ))}
        </ul>
      ) : <Empty>{ar ? "ما فيه تكرار." : "No duplicates."}</Empty>}
    </Card>
  );
}
