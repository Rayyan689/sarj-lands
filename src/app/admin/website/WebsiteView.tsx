"use client";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { byId, parcels } from "@/lib/portfolio";
import ParcelMap from "@/components/ParcelMap";
import { district } from "@/lib/format";
import type { Live } from "@/lib/admin/live";
import { Card, Empty, MoreLink, PageHeader, EVENT_T, whenFmt } from "../ui";

export default function WebsiteView({ live }: { live: Live | null }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const header = <PageHeader title={ar ? "الموقع" : "Website"} sub={ar ? "وش يصير في الموقع الجديد خلال آخر 30 يوم: الزوار، وين يوقفون، أكثر الأراضي اللي تنفتح، ووش يسألون المستشار." : "What's happening on the new site over the last 30 days: visitors, where they drop off, most opened properties, and what they ask the advisor."} />;
  if (!live?.ok) return <>{header}<Empty>{ar ? "ما قدرنا نوصل لقاعدة البيانات الحين." : "Couldn't reach the database right now."}</Empty></>;
  const steps = ["page_view", "match_started", "match_completed", "parcel_view", "chat_open", "lead_submitted"];
  const f = steps.map((n) => ({ n, v: live.funnel.find((x) => x.name === n)?.sessions ?? 0 }));
  const top = Math.max(f[0].v, ...f.map((x) => x.v), 1);
  const requests = live.leads.filter((l) => !l.archived).length + live.alerts.filter((l) => !l.archived).length;
  const viewsMax = Math.max(...live.topViewed.map((t) => t.views), 1);
  return (
    <>
      {header}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { k: ar ? "زوار" : "Visitors", v: live.totals.sessions },
          { k: ar ? "فتحوا أرض" : "Opened a property", v: f[3].v },
          { k: ar ? "طلبوا زيارة" : "Requested a visit", v: f[5].v },
          { k: ar ? "طلبات تنتظر رد" : "Requests awaiting reply", v: requests, href: "/admin/investors?tab=requests" },
        ].map((x) => {
          const body = <><p className="text-[12px] text-muted">{x.k}</p><p className="text-[22px] font-bold">{x.v}</p></>;
          return x.href ? <Link key={x.k} href={x.href} className="glass rounded-[20px] px-4 py-3 hover:bg-white">{body}</Link> : <div key={x.k} className="glass rounded-[20px] px-4 py-3">{body}</div>;
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={ar ? "رحلة الزائر" : "Visitor journey"} sub={ar ? "كم زائر وصل لكل خطوة. الفرق الكبير بين خطوتين هو المكان اللي يوقفون فيه." : "How many visitors reached each step. A big drop between two steps is where people stop."}>
          <div className="space-y-2.5">
            {f.map((x, i) => (
              <div key={x.n} title={`${EVENT_T[x.n][lang]}: ${x.v}`}>
                <div className="flex justify-between text-[13px]"><span>{EVENT_T[x.n][lang]}</span><span><b className="tabular-nums">{x.v}</b>{i > 0 && f[0].v ? <span className="ms-1.5 text-muted">{Math.round((x.v / f[0].v) * 100)}%</span> : null}</span></div>
                <div className="mt-1 h-2.5 rounded-full bg-white/70"><div className="h-full rounded-e-[4px] rounded-s-full bg-[#b07f2c]" style={{ width: `${Math.max((x.v / top) * 100, x.v ? 2 : 0)}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2" title={ar ? "وين يدورون الزوار" : "Where visitors are looking"}
          sub={ar ? `كل ما كبر التوهج حول الأرض، زاد اللي فتحوها آخر 30 يوم. آخر 24 ساعة: ${Object.keys(live.views24).length} أرض انفتحت.` : `The bigger the glow, the more people opened that property in the last 30 days. Last 24 hours: ${Object.keys(live.views24).length} properties opened.`}>
          <div className="h-[380px] overflow-hidden rounded-[20px]">
            <ParcelMap parcels={parcels} heat={live.views} highlight={new Set(Object.keys(live.views))} className="h-full" />
          </div>
        </Card>
        <Card title={ar ? "أكثر أراضي انفتحت" : "Most opened properties"} sub={ar ? "اللي يشد الناس. استخدمها في الإعلانات والرسائل." : "What draws people in. Use these in ads and outreach."}>
          {live.topViewed.length ? (
            <div className="space-y-2.5">
              {live.topViewed.map((t) => { const p = byId(t.parcel_id); return p ? (
                <div key={t.parcel_id}>
                  <div className="flex justify-between text-[13px]"><Link href={`/lands/${t.parcel_id}`} className="font-medium hover:underline">{district(p, lang)} <span className="text-muted" dir="ltr">{t.parcel_id}</span></Link><b className="tabular-nums">{t.views}</b></div>
                  <div className="mt-1 h-2.5 rounded-full bg-white/70"><div className="h-full rounded-e-[4px] rounded-s-full bg-ink" style={{ width: `${(t.views / viewsMax) * 100}%` }} /></div>
                </div>
              ) : null; })}
            </div>
          ) : <Empty>{ar ? "ما فيه مشاهدات للحين." : "No views yet."}</Empty>}
        </Card>
        <Card className="lg:col-span-2" title={ar ? "وش يسألون المستشار" : "What visitors ask the advisor"} sub={ar ? "آخر الأسئلة. تكشف وش ناقص في صفحات الأراضي." : "Latest questions. They show what's missing from property pages."}
          action={requests ? <MoreLink href="/admin/investors?tab=requests">{ar ? `${requests} طلبات تنتظر` : `${requests} waiting`}</MoreLink> : undefined}>
          {live.questions.length ? (
            <ul className="grid gap-2 text-[14px] md:grid-cols-2">
              {live.questions.map((q, i) => <li key={i} className="rounded-2xl bg-white/70 px-3 py-2"><span dir="auto">{q.user_msg}</span> <span className="block text-[11px] text-muted">{whenFmt(q.created_at, lang)}{q.page ? ` · ${q.page}` : ""}</span></li>)}
            </ul>
          ) : <Empty>{ar ? "ما فيه أسئلة للحين." : "No questions yet."}</Empty>}
        </Card>
      </div>
    </>
  );
}
