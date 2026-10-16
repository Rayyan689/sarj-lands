"use client";
import Link from "next/link";
import type { Parcel } from "@/lib/portfolio";
import { useLang } from "@/lib/i18n";
import { AREA_LABEL, DEAL_LABEL, STATUS_LABEL, TYPE_LABEL, district, hook, priceLabel, sqm, sqmPrice, street, type T } from "@/lib/format";
import { track } from "@/lib/track";

const STATUS_STYLE = {
  available: "bg-apricot-soft text-[#8C6A2F]",
  reserved: "bg-blue/10 text-blue-deep",
  sold: "bg-ink/5 text-muted",
  leased: "bg-ink/5 text-muted",
} as const;

export default function ParcelCard({
  p, reasons, note, selected, onHover, from,
}: { p: Parcel; reasons?: T[]; note?: T; selected?: boolean; onHover?: (id: string | null) => void; from?: string }) {
  const { lang } = useLang();
  const closed = p.status === "sold" || p.status === "leased";
  const h = hook(p);
  return (
    <Link
      id={`card-${p.parcel_id}`}
      href={`/lands/${p.parcel_id}`}
      onMouseEnter={() => onHover?.(p.parcel_id)} onMouseLeave={() => onHover?.(null)}
      onClick={() => track("parcel_click", { from }, p.parcel_id)}
      className={`glass group block rounded-[26px] p-5 transition-transform hover:-translate-y-0.5 ${selected ? "ring-2 ring-apricot" : ""} ${closed ? "opacity-80" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold leading-snug">{district(p, lang)}</h3>
          <p className="text-sm text-muted">
            {AREA_LABEL[p.area_of_city][lang]} · {TYPE_LABEL[p.land_type][lang]} {lang === "ar" ? DEAL_LABEL[p.listing_type].ar : DEAL_LABEL[p.listing_type].en.toLowerCase()}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[p.status]}`}>{STATUS_LABEL[p.status][lang]}</span>
      </div>

      {!closed && !reasons?.length && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-3 py-1 text-[13px] font-medium text-[#8C6A2F]">
          <span aria-hidden>✦</span>{h[lang]}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className={`text-[22px] font-semibold ${closed ? "text-muted" : ""}`}>{priceLabel(p, lang)}</span>
        <span className="text-sm text-muted">{sqmPrice(p, lang)}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[13px]">
        <span className="rounded-full bg-white/70 px-2.5 py-1">📐 {sqm(p.area_sqm, lang)}</span>
        <span className="rounded-full bg-white/70 px-2.5 py-1">🛣️ {street(p.street_width_m, lang)}</span>
      </div>

      {reasons && reasons.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-[14px]">
          {reasons.map((r, i) => (
            <li key={i} className="flex gap-2"><span aria-hidden className="text-mint">✓</span><span>{r[lang]}</span></li>
          ))}
        </ul>
      )}
      {note && <p className="mt-3 rounded-2xl bg-blue/8 px-3 py-2 text-[13px] text-blue-deep">{note[lang]}</p>}
    </Link>
  );
}
