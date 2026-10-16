"use client";
import { useLang } from "@/lib/i18n";
import { AREA_LABEL, DEAL_LABEL, TYPE_LABEL, money } from "@/lib/format";
import type { Analytics } from "@/lib/admin/analytics";
import { Card, Empty, PageHeader, Tabs, useTab, CHANNEL_T, type Lang } from "../ui";

const TABS = ["demand", "buy", "channels"] as const;

export default function MarketView({ a, tab: initial }: { a: Analytics; tab?: string }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [tab, setTab] = useTab(initial, TABS);
  return (
    <>
      <PageHeader title={ar ? "السوق" : "Market"}
        sub={ar ? "وش يطلبون المستثمرين، وش عندنا، ووش نشتري بعدها. ومن وين يجون." : "What investors ask for, what we have, what to acquire next, and where they come from."} />
      <Tabs label={ar ? "أقسام السوق" : "Market sections"} value={tab} onChange={setTab} tabs={[
        { id: "demand", label: ar ? "الطلب مقابل المعروض" : "Demand vs. supply" },
        { id: "buy", label: ar ? "وش نشتري بعدها" : "Acquire next", count: a.buyNext.length },
        { id: "channels", label: ar ? "من وين يجون" : "Channels" },
      ]} />
      {tab === "demand" && <Matrix a={a} lang={lang} />}
      {tab === "buy" && <BuyNext a={a} lang={lang} />}
      {tab === "channels" && <Channels a={a} lang={lang} />}
    </>
  );
}

function Matrix({ a, lang }: { a: Analytics; lang: Lang }) {
  const ar = lang === "ar";
  const segs: { type: "residential" | "commercial"; deal: "sale" | "lease" }[] = [
    { type: "residential", deal: "sale" }, { type: "residential", deal: "lease" }, { type: "commercial", deal: "sale" }, { type: "commercial", deal: "lease" },
  ];
  const areas = ["North", "East", "Central", "West", "South"] as const;
  const gaps = a.matrix.filter((m) => m.demand > 0 && m.supply === 0).length;
  return (
    <Card title={ar ? "كم يطلبون، وكم عندنا" : "Asked for vs. what we have"}
      sub={ar ? `في كل خانة: طلبات المستثمرين / الأراضي المتاحة. كل ما غمق اللون زاد الطلب. الخانات المحددة بإطار (${gaps}) فيها طلب وما عندنا شي.` : `Each cell: investor inquiries / available properties. Darker means more demand. Outlined cells (${gaps}) have demand and no supply.`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-[14px]">
          <thead><tr className="text-muted">
            <th className="p-2 text-start font-normal">{ar ? "المنطقة" : "Area"}</th>
            {segs.map((s) => <th key={s.type + s.deal} className="p-2 text-center font-normal">{TYPE_LABEL[s.type][lang]} · {DEAL_LABEL[s.deal][lang]}</th>)}
          </tr></thead>
          <tbody>
            {areas.map((x) => (
              <tr key={x} className="border-t border-hair">
                <td className="p-2 font-medium">{AREA_LABEL[x][lang]}</td>
                {segs.map((s) => {
                  const c = a.matrix.find((m) => m.area === x && m.type === s.type && m.deal === s.deal) ?? { demand: 0, supply: 0 };
                  const gap = c.demand > 0 && c.supply === 0;
                  const heat = Math.min(1, c.demand / 8);
                  return (
                    <td key={s.type + s.deal} className="p-1.5">
                      <div title={ar ? `${c.demand} طلب، ${c.supply} أرض متاحة` : `${c.demand} inquiries, ${c.supply} available`} className={`rounded-2xl px-2 py-2 text-center ${gap ? "ring-2 ring-ink" : ""}`} style={{ background: `rgba(176,127,44,${0.06 + heat * 0.42})` }}>
                        <span className="font-semibold">{c.demand}</span><span className="text-muted"> / {c.supply}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function BuyNext({ a, lang }: { a: Analytics; lang: Lang }) {
  const ar = lang === "ar";
  return (
    <>
      <p className="mb-3 max-w-3xl text-[14px] text-muted">{ar ? "طلب حقيقي من مستثمرين على أراضي ما عندنا منها شي. قائمة تسوّق جاهزة لفريق الاستحواذ، مرتبة حسب عدد الطلبات." : "Real investor demand for land we have none of. A ready shopping list for the acquisitions team, ordered by number of inquiries."}</p>
      {!a.buyNext.length ? <Empty>{ar ? "كل الطلبات عندنا لها معروض." : "Every request has supply."}</Empty> : (
        <div className="grid gap-3 md:grid-cols-2">
          {a.buyNext.map((b) => (
            <div key={`${b.area}${b.type}${b.deal}`} className="glass rounded-[24px] p-5">
              <p className="text-[13px] text-muted">{ar ? "ابحثوا عن" : "Look for"}</p>
              <p className="text-xl font-bold">{ar ? `أرض ${TYPE_LABEL[b.type].ar} ${DEAL_LABEL[b.deal].ar} في ${AREA_LABEL[b.area].ar}` : `${TYPE_LABEL[b.type].en} land ${DEAL_LABEL[b.deal].en.toLowerCase()} in ${AREA_LABEL[b.area].en}`}</p>
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
      )}
    </>
  );
}

function Channels({ a, lang }: { a: Analytics; lang: Lang }) {
  const ar = lang === "ar";
  const max = Math.max(...a.channels.map((c) => c.count), 1);
  return (
    <Card title={ar ? "من وين يجون المستثمرين" : "Where investors come from"}
      sub={ar ? "قنوات الطلبات الحالية. نموذج الموقع القديم كان أضعف قناة، وهذا اللي الموقع الجديد جاي يغيره." : "Current inquiry channels. The old website form was the weakest one, which is what the new site is here to change."}>
      <div className="mb-3 flex flex-wrap gap-4 text-[12px] text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-ink" />{ar ? "كل الطلبات" : "All inquiries"}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#b07f2c]" />{ar ? "جاهزين" : "Ready"}</span>
      </div>
      <div className="space-y-4">
        {a.channels.map((c) => (
          <div key={c.channel}>
            <div className="flex flex-wrap justify-between gap-2 text-[14px]">
              <span className="font-medium">{CHANNEL_T[c.channel]?.[lang] ?? c.channel}</span>
              <span className="text-muted">{ar ? `${c.count} طلب · ${c.ready} جاهز · ${c.negotiating} في تفاوض` : `${c.count} inquiries · ${c.ready} ready · ${c.negotiating} negotiating`}</span>
            </div>
            <div className="mt-1 space-y-[3px]">
              <div className="h-2.5 rounded-e-[4px] bg-ink" style={{ width: `${(c.count / max) * 100}%` }} />
              <div className="h-2.5 rounded-e-[4px] bg-[#b07f2c]" style={{ width: `${Math.max((c.ready / max) * 100, c.ready ? 1 : 0)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
