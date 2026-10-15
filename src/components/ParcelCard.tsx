"use client";
import Link from "next/link";
import type { Parcel } from "@/lib/portfolio";
import { useLang } from "@/lib/i18n";
import { AREA_LABEL, DEAL_LABEL, STATUS_LABEL, TYPE_LABEL, district, priceLabel, sqm, sqmPrice } from "@/lib/format";
import { track } from "@/lib/track";

type T = { ar: string; en: string };

export default function ParcelCard({
  p, reasons, note, selected, onHover, from,
}: { p: Parcel; reasons?: T[]; note?: T; selected?: boolean; onHover?: (id: string | null) => void; from?: string }) {
  const { lang } = useLang();
  const closed = p.status === "sold" || p.status === "leased";
  return (
    <Link
      id={`card-${p.parcel_id}`}
      href={`/lands/${p.parcel_id}`}
      onMouseEnter={() => onHover?.(p.parcel_id)} onMouseLeave={() => onHover?.(null)}
      onClick={() => track("parcel_click", { from }, p.parcel_id)}
      className={`group block border-s-4 bg-sheet px-4 py-4 transition-colors sm:px-5 ${
        selected ? "border-s-sun bg-sun-soft/50" : closed ? "border-s-closed" : p.status === "reserved" ? "border-s-palm" : "border-s-sun"
      } hover:bg-white`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold leading-snug">{district(p, lang)}</h3>
        <span className={`shrink-0 text-xs ${closed ? "text-muted" : p.status === "reserved" ? "text-palm" : "text-ink"}`}>
          {STATUS_LABEL[p.status][lang]}
        </span>
      </div>
      <p className="mt-0.5 text-sm text-muted">
        {AREA_LABEL[p.area_of_city][lang]}، {TYPE_LABEL[p.land_type][lang]} {DEAL_LABEL[p.listing_type][lang]}
      </p>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <span className={`text-xl font-semibold ${closed ? "text-muted" : ""}`}>{priceLabel(p, lang)}</span>
        <span className="text-sm text-muted">{sqmPrice(p, lang)}</span>
      </div>
      <p className="mt-1 text-sm">
        {sqm(p.area_sqm, lang)}
        <span className="mx-2 text-line">|</span>
        {lang === "ar" ? `شارع ${p.street_width_m} م` : `${p.street_width_m} m street`}
      </p>

      {reasons && reasons.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {reasons.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 bg-sun" />
              <span>{r[lang]}</span>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="mt-3 border-t border-line pt-2 text-sm text-palm">{note[lang]}</p>}
      <span className="mt-3 inline-block text-sm font-medium text-palm underline-offset-4 group-hover:underline">
        {lang === "ar" ? "تفاصيل الأرض" : "View this land"}
      </span>
    </Link>
  );
}
