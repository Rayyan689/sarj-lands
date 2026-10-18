"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { allWithRemoved, originalOf, syncLive, AREAS, type Area, type Deal, type Edits, type LandType, type Override, type Parcel, type Status } from "@/lib/portfolio";
import { AREA_SHORT, DEAL_LABEL, STATUS_LABEL, TYPE_LABEL, money, num } from "@/lib/format";
import { Empty, PageHeader, Pill, type Lang } from "../ui";

type Row = Parcel & { removed?: boolean };
type Filter = "all" | Status | "changed" | "removed";
type Body = { status?: Status; total_price_sar?: number | null; closed_price?: number | null; edits?: Edits; replace_edits?: boolean; removed?: boolean };
const DOT: Record<Status, string> = { available: "bg-[#b07f2c]", reserved: "bg-[#8a8378]", sold: "bg-ink", leased: "bg-[#7f9a6e]" };
const ERR_T: Record<string, { ar: string; en: string }> = {
  district_ar: { ar: "اسم الحي بالعربي لازم يكون حرفين أو أكثر.", en: "Arabic district name needs at least 2 letters." },
  district_en: { ar: "اسم الحي بالإنجليزي لازم يكون حرفين أو أكثر.", en: "English district name needs at least 2 letters." },
  area_sqm: { ar: "المساحة لازم تكون بين 100 و500,000 م².", en: "Size must be between 100 and 500,000 m²." },
  street_width_m: { ar: "عرض الشارع لازم يكون بين 6 و120 م.", en: "Street width must be between 6 and 120 m." },
  price: { ar: "اكتب سعر منطقي، أو علّم إنه عند الطلب.", en: "Enter a realistic price, or mark it on request." },
  save: { ar: "ما انحفظ التغيير. جرّب مرة ثانية.", en: "That change didn't save. Please try again." },
};

/** The full previous state of a property, to send back on undo. */
function restoreBody(id: string, before: Override | undefined): Body {
  const o = originalOf(id)!;
  return {
    status: before?.status ?? o.status,
    total_price_sar: before && "total_price_sar" in before ? before.total_price_sar ?? null : o.total_price_sar,
    edits: before?.edits ?? {}, replace_edits: true, removed: !!before?.removed, closed_price: before?.closed_price ?? null,
  };
}

export default function ManageView({ listings, overrides: initial }: { listings: Parcel[]; overrides: Record<string, Override> }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [ov, setOv] = useState(initial);
  const ovRef = useRef(ov);
  ovRef.current = ov;
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [closing, setClosing] = useState<{ p: Row; to: Status } | null>(null);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [err, setErr] = useState<{ id: string; key: string } | null>(null);

  // The page's own copy of the live layer.
  syncLive(listings, ov);
  const all = useMemo(() => allWithRemoved(), [ov]); // eslint-disable-line react-hooks/exhaustive-deps
  const live = all.filter((p) => !p.removed);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: live.length, changed: Object.values(ov).filter((o) => !o.removed).length, removed: all.length - live.length };
    for (const p of live) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [all, live, ov]);

  const rows = (filter === "removed" ? all.filter((p) => p.removed) : live)
    .filter((p) => (filter === "all" || filter === "removed" || (filter === "changed" ? !!ov[p.parcel_id] : p.status === filter)) &&
      (!q.trim() || `${p.parcel_id} ${p.district_ar} ${p.district_en}`.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => Number(!!ov[b.parcel_id]) - Number(!!ov[a.parcel_id]) || a.parcel_id.localeCompare(b.parcel_id));

  const say = (text: string, undo?: () => void) => {
    setToast({ text, undo });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 7000);
  };

  const save = async (p: Row, body: Body, message: string, undoable = true): Promise<boolean> => {
    setBusy(p.parcel_id); setErr(null);
    const before = ovRef.current[p.parcel_id];
    try {
      const res = await fetch("/api/admin/status", { method: "PATCH", headers: { "content-type": "application/json", "x-sarj-admin": "1" }, body: JSON.stringify({ id: p.parcel_id, ...body }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr({ id: p.parcel_id, key: d.field ?? "save" }); return false; }
      const next = { ...ovRef.current };
      if (d.override) next[p.parcel_id] = d.override; else delete next[p.parcel_id];
      setOv(next);
      say(message, undoable ? () => { save(p, restoreBody(p.parcel_id, before), ar ? "رجعناها مثل ما كانت" : "Undone", false); } : undefined);
      return true;
    } catch { setErr({ id: p.parcel_id, key: "save" }); return false; } finally { setBusy(null); }
  };

  const changeStatus = (p: Row, to: Status) => {
    if (to === p.status) return;
    if (to === "sold" || to === "leased") { setClosing({ p, to }); return; }
    save(p, { status: to }, ar ? `أرض حي ${p.district_ar} صارت ${STATUS_LABEL[to].ar}` : `${p.district_en} is now ${STATUS_LABEL[to].en.toLowerCase()}`);
  };
  const statusOptions = (p: Row): Status[] => ["available", "reserved", p.listing_type === "sale" ? "sold" : "leased"];

  return (
    <>
      <PageHeader title={ar ? "إدارة الأراضي" : "Manage properties"}
        sub={ar ? "غيّر حالة أي أرض أو سعرها أو تفاصيلها، أو احذفها. التغيير يطلع على الموقع وعند المستشار على طول، وأي تغيير تقدر ترجعه." : "Change any property's status, price or details, or delete it. Changes show on the website and in the AI consultant right away, and every change can be undone."}>
        <Link href="/admin/properties/new" className="btn-primary px-5 py-2.5 text-[14px] font-semibold text-white">+ {ar ? "أضف أرض" : "Add property"}</Link>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {(["all", "available", "reserved", "sold", "leased", "changed", "removed"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`bubble flex items-center gap-1.5 px-3 py-1.5 text-[13px] ${filter === f ? "bubble-on" : ""}`}>
            {f in DOT && <span className={`h-2 w-2 rounded-full ${DOT[f as Status]}`} />}
            {f === "all" ? (ar ? "الكل" : "All") : f === "changed" ? (ar ? "عدّلتها" : "Changed") : f === "removed" ? (ar ? "المحذوفة" : "Deleted") : STATUS_LABEL[f][lang]}
            <span className="opacity-60">{counts[f] ?? 0}</span>
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? "ابحث بالحي أو الرقم" : "Search district or ID"} aria-label={ar ? "بحث" : "Search"} className="field ms-auto h-9 w-full rounded-full px-4 text-[14px] sm:w-60" />
      </div>

      {!rows.length ? <Empty>{filter === "removed" ? (ar ? "ما حذفت أي أرض." : "Nothing deleted.") : (ar ? "ما فيه أراضي بهالفلتر." : "No properties match.")}</Empty> : (
        <div className="glass overflow-hidden rounded-[24px]">
          <div className="hidden grid-cols-[6.5rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_10.5rem_5.5rem] gap-3 border-b border-hair px-4 py-2.5 text-[12px] text-muted lg:grid">
            <span>{ar ? "الرقم" : "ID"}</span><span>{ar ? "الأرض" : "Property"}</span><span>{ar ? "المساحة والشارع" : "Size & street"}</span><span>{ar ? "السعر" : "Price"}</span><span>{ar ? "الحالة" : "Status"}</span><span />
          </div>
          <ul className="divide-y divide-[var(--hair)]">
            {rows.map((p) => {
              const o = ov[p.parcel_id];
              const orig = originalOf(p.parcel_id);
              return (
                <li key={p.parcel_id} className={`grid items-center gap-2 px-4 py-3 lg:grid-cols-[6.5rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_10.5rem_5.5rem] lg:gap-3 ${busy === p.parcel_id ? "opacity-60" : ""} ${p.removed ? "bg-ink/[0.03]" : ""}`}>
                  <span className="text-[13px] text-muted" dir="ltr">{p.parcel_id}</span>
                  <div className="min-w-0">
                    {p.removed ? <span className="font-semibold text-muted line-through">{ar ? `حي ${p.district_ar}` : p.district_en}</span>
                      : <Link href={`/lands/${p.parcel_id}`} target="_blank" className="font-semibold hover:underline">{ar ? `حي ${p.district_ar}` : p.district_en}</Link>}
                    <p className="text-[13px] text-muted">{AREA_SHORT[p.area_of_city][lang]} · {TYPE_LABEL[p.land_type][lang]} · {DEAL_LABEL[p.listing_type][lang]}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.added && <Pill tone="dark">{ar ? "أضفتها" : "Added"}</Pill>}
                      {o?.edits && <Pill>{ar ? "تفاصيل معدّلة" : "Details edited"}</Pill>}
                      {o && !p.removed && <Pill tone="gold">{ar ? "عدّلتها" : "Changed"}{o.updated_at ? ` · ${new Date(o.updated_at).toLocaleDateString(ar ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { day: "numeric", month: "short" })}` : ""}</Pill>}
                      {o?.closed_price != null && <Pill>{ar ? `أُغلقت بـ ${money(o.closed_price, "ar")}` : `Closed at ${money(o.closed_price, "en")}`}</Pill>}
                    </div>
                  </div>
                  <p className="text-[14px]">{num(p.area_sqm, lang)} {ar ? "م²" : "m²"} <span className="text-muted">· {ar ? `شارع ${p.street_width_m} م` : `${p.street_width_m} m street`}</span></p>
                  <p className="text-[14px]">
                    <span className="font-medium">{p.total_price_sar ? money(p.total_price_sar, lang) : (ar ? "عند الطلب" : "On request")}{p.listing_type === "lease" && p.total_price_sar ? (ar ? " بالسنة" : "/yr") : ""}</span>
                    {orig && orig.total_price_sar !== p.total_price_sar && <span className="block text-[12px] text-muted line-through">{orig.total_price_sar ? money(orig.total_price_sar, lang) : (ar ? "عند الطلب" : "On request")}</span>}
                  </p>
                  {p.removed ? (
                    <div className="flex items-center gap-2 lg:col-span-2">
                      <span className="text-[13px] text-muted">{ar ? "مخفية من الموقع" : "Hidden from the site"}</span>
                      <button onClick={() => save(p, { removed: false }, ar ? `رجعت أرض حي ${p.district_ar} للموقع` : `${p.district_en} is back on the site`)} className="btn-primary ms-auto px-3.5 py-2 text-[13px] font-medium text-white">{ar ? "رجّعها" : "Restore"}</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[p.status]}`} />
                        <label className="sr-only" htmlFor={`st-${p.parcel_id}`}>{ar ? "الحالة" : "Status"}</label>
                        <select id={`st-${p.parcel_id}`} value={p.status} disabled={busy === p.parcel_id} onChange={(e) => changeStatus(p, e.target.value as Status)} className="field h-10 w-full rounded-full px-3 text-[14px]">
                          {statusOptions(p).concat(statusOptions(p).includes(p.status) ? [] : [p.status]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s][lang]}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-1 lg:justify-end">
                        <button onClick={() => setEditingRow(p)} className="bubble grid h-10 w-10 place-items-center text-[15px]" aria-label={ar ? `عدّل ${p.parcel_id}` : `Edit ${p.parcel_id}`} title={ar ? "عدّل" : "Edit"}>✎</button>
                        <button onClick={() => setDeleting(p)} className="bubble grid h-10 w-10 place-items-center text-[15px] hover:text-red-600" aria-label={ar ? `احذف ${p.parcel_id}` : `Delete ${p.parcel_id}`} title={ar ? "احذف" : "Delete"}>🗑</button>
                      </div>
                    </>
                  )}
                  {err?.id === p.parcel_id && !editingRow && <p role="alert" className="text-[13px] text-red-600 lg:col-span-6">{(ERR_T[err.key] ?? ERR_T.save)[lang]}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {closing && <CloseDeal p={closing.p} to={closing.to} lang={lang} onCancel={() => setClosing(null)}
        onConfirm={(price) => { const { p, to } = closing; setClosing(null);
          save(p, { status: to, closed_price: price }, ar ? `مبروك! أرض حي ${p.district_ar} ${STATUS_LABEL[to].ar} 🎉` : `Congrats! ${p.district_en} is ${STATUS_LABEL[to].en.toLowerCase()} 🎉`); }} />}

      {editingRow && <EditProperty p={editingRow} lang={lang} busy={busy === editingRow.parcel_id} error={err?.id === editingRow.parcel_id ? (ERR_T[err.key] ?? ERR_T.save)[lang] : null}
        onCancel={() => { setEditingRow(null); setErr(null); }}
        onSave={async (body) => { const ok = await save(editingRow, body, ar ? `انحفظت تعديلات حي ${body.edits?.district_ar ?? editingRow.district_ar}` : `Saved changes to ${body.edits?.district_en ?? editingRow.district_en}`); if (ok) setEditingRow(null); }} />}

      {deleting && (
        <Modal label={ar ? "حذف الأرض" : "Delete property"} onClose={() => setDeleting(null)}>
          <p className="text-3xl" aria-hidden>🗑</p>
          <h2 className="mt-1 text-xl font-bold">{ar ? `تحذف أرض حي ${deleting.district_ar}؟` : `Delete ${deleting.district_en}?`}</h2>
          <p className="mt-1 text-[14px] text-muted">{ar ? "بتختفي من الموقع والبحث وعند المستشار. ما تنمسح نهائياً: تلقاها في «المحذوفة» وتقدر ترجعها بضغطة." : "It disappears from the website, search and the consultant. Nothing is erased: it stays under \"Deleted\" and you can restore it in one tap."}</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={() => { const p = deleting; setDeleting(null); save(p, { removed: true }, ar ? `انحذفت أرض حي ${p.district_ar}` : `Deleted ${p.district_en}`); }} className="rounded-full bg-red-600 px-4 py-3 text-[14px] font-semibold text-white hover:bg-red-700">{ar ? "احذفها" : "Delete"}</button>
            <button onClick={() => setDeleting(null)} className="bubble px-4 py-3 text-[14px]">{ar ? "إلغاء" : "Cancel"}</button>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4" role="status">
          <div className="flex items-center gap-3 rounded-full bg-ink px-5 py-3 text-[14px] text-white shadow-lg">
            <span>{toast.text}</span>
            {toast.undo && <button onClick={() => { const u = toast.undo!; setToast(null); u(); }} className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-medium hover:bg-white/25">{ar ? "تراجع" : "Undo"}</button>}
          </div>
        </div>
      )}
    </>
  );
}

function Modal({ label, onClose, children, wide = false }: { label: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <div className={`glass w-full ${wide ? "max-w-xl" : "max-w-md"} rounded-[28px] p-6`} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function EditProperty({ p, lang, busy, error, onCancel, onSave }: { p: Row; lang: Lang; busy: boolean; error: string | null; onCancel: () => void; onSave: (b: Body) => void }) {
  const ar = lang === "ar";
  const [f, setF] = useState({
    district_ar: p.district_ar, district_en: p.district_en, area: p.area_of_city as Area, type: p.land_type as LandType, deal: p.listing_type as Deal,
    sqm: String(p.area_sqm), street: String(p.street_width_m), price: p.total_price_sar ? String(p.total_price_sar) : "", onRequest: p.total_price_sar == null,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const seg = <V extends string>(value: V, options: [V, string][], on: (v: V) => void, label: string) => (
    <div className="glass-soft inline-flex flex-wrap gap-0.5 rounded-full p-1" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => <button type="button" key={v} role="radio" aria-checked={value === v} onClick={() => on(v)} className={`rounded-full px-3 py-1.5 text-[13px] ${value === v ? "bg-ink font-medium text-white" : "text-muted hover:text-ink"}`}>{l}</button>)}
    </div>
  );
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      edits: { district_ar: f.district_ar.trim(), district_en: f.district_en.trim(), area_of_city: f.area, land_type: f.type, listing_type: f.deal, area_sqm: Number(f.sqm), street_width_m: Number(f.street) },
      total_price_sar: f.onRequest ? null : Number(f.price),
    });
  };
  return (
    <Modal label={ar ? "تعديل الأرض" : "Edit property"} onClose={onCancel} wide>
      <form onSubmit={submit}>
        <h2 className="text-xl font-bold">{ar ? "عدّل تفاصيل الأرض" : "Edit property details"} <span className="text-[14px] font-normal text-muted" dir="ltr">{p.parcel_id}</span></h2>
        <p className="mt-1 text-[13px] text-muted">{ar ? "المقارنات بالسعر تنحسب من جديد تلقائياً. والموقع على الخريطة ما يتغير." : "Price comparisons update automatically. The map location stays the same."}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-[13px]"><span className="text-muted">{ar ? "اسم الحي بالعربي" : "District (Arabic)"}</span><input value={f.district_ar} onChange={(e) => set("district_ar", e.target.value)} maxLength={40} dir="rtl" className="field mt-1" /></label>
          <label className="block text-[13px]"><span className="text-muted">{ar ? "اسم الحي بالإنجليزي" : "District (English)"}</span><input value={f.district_en} onChange={(e) => set("district_en", e.target.value)} maxLength={40} dir="ltr" className="field mt-1" /></label>
        </div>
        <div className="mt-3 space-y-2">
          {seg(f.area, AREAS.map((a) => [a, AREA_SHORT[a][lang]] as [Area, string]), (v) => set("area", v), ar ? "المنطقة" : "Area")}
          <div className="flex flex-wrap gap-2">
            {seg(f.type, [["residential", TYPE_LABEL.residential[lang]], ["commercial", TYPE_LABEL.commercial[lang]]], (v) => set("type", v), ar ? "النوع" : "Type")}
            {seg(f.deal, [["sale", DEAL_LABEL.sale[lang]], ["lease", DEAL_LABEL.lease[lang]]], (v) => set("deal", v), ar ? "التعامل" : "Deal")}
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-[13px]"><span className="text-muted">{ar ? "المساحة (م²)" : "Size (m²)"}</span><input inputMode="numeric" dir="ltr" value={f.sqm} onChange={(e) => set("sqm", e.target.value.replace(/[^\d]/g, ""))} className="field mt-1" /></label>
          <label className="block text-[13px]"><span className="text-muted">{ar ? "عرض الشارع (م)" : "Street (m)"}</span><input inputMode="numeric" dir="ltr" value={f.street} onChange={(e) => set("street", e.target.value.replace(/[^\d]/g, ""))} className="field mt-1" /></label>
          <label className="block text-[13px]"><span className="text-muted">{f.deal === "lease" ? (ar ? "الإيجار بالسنة" : "Rent a year") : (ar ? "السعر الإجمالي" : "Total price")}</span><input inputMode="numeric" dir="ltr" disabled={f.onRequest} value={f.price} onChange={(e) => set("price", e.target.value.replace(/[^\d]/g, ""))} className="field mt-1 disabled:opacity-50" /></label>
        </div>
        <label className="mt-2 flex items-center gap-2 text-[13px] text-muted"><input type="checkbox" checked={f.onRequest} onChange={(e) => set("onRequest", e.target.checked)} className="accent-[var(--ink)]" />{ar ? "السعر عند الطلب" : "Price on request"}</label>
        {f.deal !== p.listing_type && (p.status === "sold" || p.status === "leased") && <p className="mt-2 text-[13px] text-muted">{ar ? "الحالة بتتعدل لتناسب نوع التعامل الجديد." : "Status will be adjusted to fit the new deal type."}</p>}
        {error && <p role="alert" className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button disabled={busy} className="btn-primary px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-60">{busy ? (ar ? "لحظة…" : "One sec…") : (ar ? "احفظ التعديلات" : "Save changes")}</button>
          <button type="button" onClick={onCancel} className="bubble px-4 py-3 text-[14px]">{ar ? "إلغاء" : "Cancel"}</button>
        </div>
      </form>
    </Modal>
  );
}

function CloseDeal({ p, to, lang, onCancel, onConfirm }: { p: Row; to: Status; lang: Lang; onCancel: () => void; onConfirm: (price: number | null) => void }) {
  const ar = lang === "ar";
  const [v, setV] = useState(p.total_price_sar ? String(p.total_price_sar) : "");
  const n = Number(v);
  const diff = p.total_price_sar && n ? Math.round((n / p.total_price_sar - 1) * 100) : null;
  return (
    <Modal label={ar ? "تأكيد الصفقة" : "Confirm the deal"} onClose={onCancel}>
      <form onSubmit={(e) => { e.preventDefault(); onConfirm(n >= 10000 ? n : null); }}>
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
    </Modal>
  );
}
