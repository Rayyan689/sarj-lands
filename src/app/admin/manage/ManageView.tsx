"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { parcels, originalOf, syncLive, type Override, type Parcel, type Status } from "@/lib/portfolio";
import { AREA_SHORT, DEAL_LABEL, STATUS_LABEL, TYPE_LABEL, money, num } from "@/lib/format";
import { Empty, PageHeader, Pill, type Lang } from "../ui";

type Filter = "all" | Status | "changed";
const DOT: Record<Status, string> = { available: "bg-[#b07f2c]", reserved: "bg-[#8a8378]", sold: "bg-ink", leased: "bg-[#7f9a6e]" };

export default function ManageView({ listings, overrides: initial }: { listings: Parcel[]; overrides: Record<string, Override> }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [ov, setOv] = useState(initial);
  const ovRef = useRef(ov);
  ovRef.current = ov;
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [closing, setClosing] = useState<{ p: Parcel; to: Status } | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // The page's own copy of the live layer: everything below reads the merged parcels.
  syncLive(listings, ov);
  const all = useMemo(() => [...parcels], [ov]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length, changed: Object.keys(ov).length };
    for (const p of all) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [all, ov]);

  const rows = all.filter((p) => (filter === "all" || (filter === "changed" ? !!ov[p.parcel_id] : p.status === filter)) &&
    (!q.trim() || `${p.parcel_id} ${p.district_ar} ${p.district_en}`.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => Number(!!ov[b.parcel_id]) - Number(!!ov[a.parcel_id]) || a.parcel_id.localeCompare(b.parcel_id));

  const say = (text: string, undo?: () => void) => {
    setToast({ text, undo });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 7000);
  };

  const save = async (p: Parcel, body: { status?: Status; total_price_sar?: number | null; closed_price?: number | null }, message: string, silent = false) => {
    setBusy(p.parcel_id); setErr(null);
    const before = ovRef.current[p.parcel_id];
    try {
      const res = await fetch("/api/admin/status", { method: "PATCH", headers: { "content-type": "application/json", "x-sarj-admin": "1" }, body: JSON.stringify({ id: p.parcel_id, ...body }) });
      if (!res.ok) throw new Error(String(res.status));
      const orig = originalOf(p.parcel_id)!;
      const next = { ...ovRef.current };
      const o: Override = { ...(next[p.parcel_id] ?? {}) };
      if (body.status) { if (body.status === orig.status) delete o.status; else o.status = body.status; }
      if (body.total_price_sar !== undefined) { if (body.total_price_sar === orig.total_price_sar) delete o.total_price_sar; else o.total_price_sar = body.total_price_sar; }
      if (body.closed_price !== undefined) o.closed_price = body.closed_price;
      o.updated_at = new Date().toISOString();
      if (o.status === undefined && !("total_price_sar" in o)) delete next[p.parcel_id]; else next[p.parcel_id] = o;
      setOv(next);
      if (!silent) say(message, () => {
        const back: { status?: Status; total_price_sar?: number | null } = {};
        if (body.status) back.status = before?.status ?? orig.status;
        if (body.total_price_sar !== undefined) back.total_price_sar = before && "total_price_sar" in before ? before.total_price_sar ?? null : orig.total_price_sar;
        save({ ...p }, back, ar ? "رجعناها مثل ما كانت" : "Undone", false);
      });
    } catch { setErr(p.parcel_id); } finally { setBusy(null); }
  };

  const changeStatus = (p: Parcel, to: Status) => {
    if (to === p.status) return;
    if (to === "sold" || to === "leased") { setClosing({ p, to }); return; }
    save(p, { status: to }, ar ? `أرض حي ${p.district_ar} صارت ${STATUS_LABEL[to].ar}` : `${p.district_en} is now ${STATUS_LABEL[to].en.toLowerCase()}`);
  };

  const statusOptions = (p: Parcel): Status[] => ["available", "reserved", p.listing_type === "sale" ? "sold" : "leased"];

  return (
    <>
      <PageHeader title={ar ? "إدارة الأراضي" : "Manage properties"}
        sub={ar ? "غيّر حالة أي أرض أو سعرها، والتغيير يطلع على الموقع وعند المستشار على طول. وأي تغيير تقدر ترجعه." : "Change any property's status or price; it shows on the website and in the AI consultant right away. Every change can be undone."}>
        <Link href="/admin/properties/new" className="btn-primary px-5 py-2.5 text-[14px] font-semibold text-white">+ {ar ? "أضف أرض" : "Add property"}</Link>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {(["all", "available", "reserved", "sold", "leased", "changed"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`bubble flex items-center gap-1.5 px-3 py-1.5 text-[13px] ${filter === f ? "bubble-on" : ""}`}>
            {f !== "all" && f !== "changed" && <span className={`h-2 w-2 rounded-full ${DOT[f]}`} />}
            {f === "all" ? (ar ? "الكل" : "All") : f === "changed" ? (ar ? "عدّلتها" : "Changed") : STATUS_LABEL[f][lang]}
            <span className="opacity-60">{counts[f] ?? 0}</span>
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? "ابحث بالحي أو الرقم" : "Search district or ID"} aria-label={ar ? "بحث" : "Search"} className="field ms-auto h-9 w-full rounded-full px-4 text-[14px] sm:w-60" />
      </div>

      {!rows.length ? <Empty>{ar ? "ما فيه أراضي بهالفلتر." : "No properties match."}</Empty> : (
        <div className="glass overflow-hidden rounded-[24px]">
          <div className="hidden grid-cols-[7rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_11rem] gap-3 border-b border-hair px-4 py-2.5 text-[12px] text-muted md:grid">
            <span>{ar ? "الرقم" : "ID"}</span><span>{ar ? "الأرض" : "Property"}</span><span>{ar ? "المساحة والشارع" : "Size & street"}</span><span>{ar ? "السعر" : "Price"}</span><span>{ar ? "الحالة" : "Status"}</span>
          </div>
          <ul className="divide-y divide-[var(--hair)]">
            {rows.map((p) => {
              const o = ov[p.parcel_id];
              const orig = originalOf(p.parcel_id);
              return (
                <li key={p.parcel_id} className={`grid items-center gap-2 px-4 py-3 md:grid-cols-[7rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_11rem] md:gap-3 ${busy === p.parcel_id ? "opacity-60" : ""}`}>
                  <span className="text-[13px] text-muted" dir="ltr">{p.parcel_id}</span>
                  <div className="min-w-0">
                    <Link href={`/lands/${p.parcel_id}`} target="_blank" className="font-semibold hover:underline">{ar ? `حي ${p.district_ar}` : p.district_en}</Link>
                    <p className="text-[13px] text-muted">{AREA_SHORT[p.area_of_city][lang]} · {TYPE_LABEL[p.land_type][lang]} · {DEAL_LABEL[p.listing_type][lang]}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.added && <Pill tone="dark">{ar ? "أضفتها" : "Added"}</Pill>}
                      {o && <Pill tone="gold">{ar ? "عدّلتها" : "Changed"}{o.updated_at ? ` · ${new Date(o.updated_at).toLocaleDateString(ar ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { day: "numeric", month: "short" })}` : ""}</Pill>}
                      {o?.closed_price != null && <Pill>{ar ? `أُغلقت بـ ${money(o.closed_price, "ar")}` : `Closed at ${money(o.closed_price, "en")}`}</Pill>}
                    </div>
                  </div>
                  <p className="text-[14px]">{num(p.area_sqm, lang)} {ar ? "م²" : "m²"} <span className="text-muted">· {ar ? `شارع ${p.street_width_m} م` : `${p.street_width_m} m street`}</span></p>
                  <div className="text-[14px]">
                    {editing === p.parcel_id ? (
                      <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); const v = Number(priceDraft); if (!v || v < 10000) { setErr(p.parcel_id); return; } setEditing(null); save(p, { total_price_sar: v }, ar ? `سعر حي ${p.district_ar} صار ${money(v, "ar")}` : `${p.district_en} price is now ${money(v, "en")}`); }}>
                        <input autoFocus inputMode="numeric" dir="ltr" value={priceDraft} onChange={(e) => setPriceDraft(e.target.value.replace(/[^\d]/g, ""))} aria-label={ar ? "السعر الجديد" : "New price"} className="field h-9 w-32 rounded-full px-3 text-[14px]" />
                        <button className="btn-primary h-9 rounded-full px-3 text-[13px] text-white">{ar ? "احفظ" : "Save"}</button>
                        <button type="button" onClick={() => setEditing(null)} className="h-9 rounded-full px-2 text-[13px] text-muted">{ar ? "إلغاء" : "Cancel"}</button>
                      </form>
                    ) : (
                      <button onClick={() => { setEditing(p.parcel_id); setPriceDraft(p.total_price_sar ? String(p.total_price_sar) : ""); }} className="group text-start" title={ar ? "عدّل السعر" : "Edit price"}>
                        <span className="font-medium">{p.total_price_sar ? money(p.total_price_sar, lang) : (ar ? "عند الطلب" : "On request")}{p.listing_type === "lease" && p.total_price_sar ? (ar ? " بالسنة" : "/yr") : ""}</span>
                        <span className="ms-1.5 text-[12px] text-muted group-hover:text-ink">✎</span>
                        {orig && orig.total_price_sar !== p.total_price_sar && <span className="block text-[12px] text-muted line-through">{orig.total_price_sar ? money(orig.total_price_sar, lang) : ""}</span>}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[p.status]}`} />
                    <label className="sr-only" htmlFor={`st-${p.parcel_id}`}>{ar ? "الحالة" : "Status"}</label>
                    <select id={`st-${p.parcel_id}`} value={p.status} disabled={busy === p.parcel_id} onChange={(e) => changeStatus(p, e.target.value as Status)}
                      className="field h-10 w-full rounded-full px-3 text-[14px]">
                      {statusOptions(p).concat(statusOptions(p).includes(p.status) ? [] : [p.status]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s][lang]}</option>)}
                    </select>
                  </div>
                  {err === p.parcel_id && <p role="alert" className="text-[13px] text-red-600 md:col-span-5">{ar ? "ما انحفظ التغيير. جرّب مرة ثانية." : "That change didn't save. Please try again."}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {closing && <CloseDeal p={closing.p} to={closing.to} lang={lang} onCancel={() => setClosing(null)}
        onConfirm={(price) => { const { p, to } = closing; setClosing(null);
          save(p, { status: to, closed_price: price }, ar ? `مبروك! أرض حي ${p.district_ar} ${STATUS_LABEL[to].ar} 🎉` : `Congrats! ${p.district_en} is ${STATUS_LABEL[to].en.toLowerCase()} 🎉`); }} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4" role="status">
          <div className="flex items-center gap-3 rounded-full bg-ink px-5 py-3 text-[14px] text-white shadow-lg">
            <span>{toast.text}</span>
            {toast.undo && <button onClick={() => { const u = toast.undo!; setToast(null); u(); }} className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-medium hover:bg-white/25">{ar ? "تراجع" : "Undo"}</button>}
          </div>
        </div>
      )}
    </>
  );
}

function CloseDeal({ p, to, lang, onCancel, onConfirm }: { p: Parcel; to: Status; lang: Lang; onCancel: () => void; onConfirm: (price: number | null) => void }) {
  const ar = lang === "ar";
  const [v, setV] = useState(p.total_price_sar ? String(p.total_price_sar) : "");
  const n = Number(v);
  const diff = p.total_price_sar && n ? Math.round((n / p.total_price_sar - 1) * 100) : null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={ar ? "تأكيد الصفقة" : "Confirm the deal"} onClick={onCancel}>
      <form className="glass w-full max-w-md rounded-[28px] p-6" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onConfirm(n >= 10000 ? n : null); }}>
        <p className="text-3xl" aria-hidden>🎉</p>
        <h2 className="mt-1 text-xl font-bold">{ar ? `أرض حي ${p.district_ar} ${to === "sold" ? "انباعت" : "تأجّرت"}؟` : `${p.district_en} ${to === "sold" ? "sold" : "leased"}?`}</h2>
        <p className="mt-1 text-[14px] text-muted">{ar ? "بتختفي من الأراضي المتاحة، وتصير من الصفقات اللي تمت في سجل الشركة." : "It leaves the available list and joins the company's closed deals."}</p>
        <label className="mt-4 block text-[13px]"><span className="text-muted">{to === "sold" ? (ar ? "سعر البيع الفعلي (اختياري)" : "Actual sale price (optional)") : (ar ? "الإيجار السنوي الفعلي (اختياري)" : "Actual annual rent (optional)")}</span>
          <input autoFocus inputMode="numeric" dir="ltr" value={v} onChange={(e) => setV(e.target.value.replace(/[^\d]/g, ""))} className="field mt-1" />
        </label>
        {diff != null && <p className="mt-1.5 text-[13px] text-muted">{diff === 0 ? (ar ? "نفس السعر المطلوب." : "Same as asking.") : ar ? `${Math.abs(diff)}% ${diff < 0 ? "تحت" : "فوق"} السعر المطلوب.` : `${Math.abs(diff)}% ${diff < 0 ? "below" : "above"} asking.`}</p>}
        <p className="mt-2 text-[12px] text-muted">{ar ? "نحفظه عشان نعرف الفرق بين المطلوب والفعلي مع الوقت." : "We keep it to learn the gap between asking and actual prices over time."}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className="btn-primary px-4 py-3 text-[14px] font-semibold text-white">{ar ? "أكّد الصفقة" : "Confirm deal"}</button>
          <button type="button" onClick={onCancel} className="bubble px-4 py-3 text-[14px]">{ar ? "إلغاء" : "Cancel"}</button>
        </div>
      </form>
    </div>
  );
}
