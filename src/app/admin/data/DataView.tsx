"use client";
import { useLang } from "@/lib/i18n";
import { formatDate } from "@/lib/time";
import type { Analytics } from "@/lib/admin/analytics";
import { PageHeader } from "../ui";

const AR: Record<string, string> = { "lat/lng": "الإحداثيات", price: "السعر", days_on_market: "أيام العرض", total_price_sar: "السعر الإجمالي" };

export default function DataView({ a }: { a: Analytics }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  return (
    <>
      <PageHeader title={ar ? "جودة البيانات" : "Data quality"}
        sub={ar ? `كل تصحيح سويناه على بيانات المحفظة (نسخة ${formatDate(a.snapshot, "ar")})، وليش. ولا أرض انحذفت: الـ${a.kpis.total} كلها موجودة، وأيام العرض تنحسب من تاريخ النزول لين اليوم.` : `Every correction we made to the portfolio data (snapshot ${formatDate(a.snapshot, "en")}), and why. Nothing was dropped: all ${a.kpis.total} properties are present, and listing ages count from listing date to today.`} />
      <div className="glass divide-y divide-[var(--hair)] rounded-[24px] px-5">
        <div className="hidden gap-4 py-3 text-[12px] text-muted md:grid md:grid-cols-[9rem_1fr_1fr]">
          <span>{ar ? "الأرض · الحقل" : "Property · field"}</span><span>{ar ? "المشكلة" : "Issue"}</span><span>{ar ? "وش سوينا" : "What we did"}</span>
        </div>
        {a.corrections.map((c, i) => (
          <div key={i} className="grid gap-1 py-3 text-[14px] md:grid-cols-[9rem_1fr_1fr] md:gap-4">
            <p className="font-medium">{c.parcel_id ?? (ar ? "كل الأراضي" : "All")} · {ar ? AR[c.field] ?? c.field : c.field}</p>
            <p className="text-muted">{ar ? c.issue_ar ?? c.issue : c.issue}</p>
            <p>{ar ? c.action_ar ?? c.action : c.action}</p>
          </div>
        ))}
      </div>
    </>
  );
}
