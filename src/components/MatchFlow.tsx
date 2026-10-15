"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { INTENTS, BUDGETS, intentByKey, type IntentKey } from "@/lib/intents";
import { AREAS, available, type Area, type Deal } from "@/lib/portfolio";
import { AREA_LABEL } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { track } from "@/lib/track";

const chip = (on: boolean) =>
  `rounded-md border px-3.5 py-2.5 text-start text-[15px] transition-colors ${
    on ? "border-ink bg-ink text-white" : "border-line bg-sheet hover:border-ink"
  }`;

export default function MatchFlow({ compact = false }: { compact?: boolean }) {
  const { lang } = useLang();
  const router = useRouter();
  const [use, setUse] = useState<IntentKey | null>(null);
  const [deal, setDeal] = useState<Deal>("sale");
  const [area, setArea] = useState<Area | "any" | null>(null);
  const [step, setStep] = useState(1);

  const intent = intentByKey(use);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of available) {
      if (intent?.type && p.land_type !== intent.type) continue;
      if (p.listing_type !== deal) continue;
      c[p.area_of_city] = (c[p.area_of_city] ?? 0) + 1;
      c.any = (c.any ?? 0) + 1;
    }
    return c;
  }, [intent, deal]);

  const pickUse = (k: IntentKey) => {
    setUse(k);
    setDeal(intentByKey(k)!.defaultDeal);
    setStep(2);
    track("match_started", { use: k });
  };
  const finish = (budget: number | null) => {
    const q = new URLSearchParams({ use: use!, deal, area: area ?? "any" });
    if (budget != null) q.set("budget", String(budget));
    track("match_completed", { use, deal, area, budget });
    router.push(`/match?${q}`);
  };

  const label = (n: number, ar: string, en: string) => (
    <h2 className="mb-3 flex items-baseline gap-2 text-base font-semibold">
      <span className="font-display text-sun">{n}</span>
      {lang === "ar" ? ar : en}
    </h2>
  );

  return (
    <div className="space-y-6">
      <section>
        {label(1, "ماذا تخطط أن تبني؟", "What are you planning to build?")}
        <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
          {INTENTS.map((i) => (
            <button key={i.key} onClick={() => pickUse(i.key)} className={chip(use === i.key)}>{i[lang]}</button>
          ))}
        </div>
      </section>

      {step >= 2 && (
        <section>
          {label(2, "تشتري أم تستأجر؟", "Buy or lease?")}
          <div className="grid grid-cols-2 gap-2">
            {(["sale", "lease"] as Deal[]).map((d) => (
              <button key={d} onClick={() => { setDeal(d); setStep(Math.max(step, 3)); }} className={chip(deal === d && step >= 3)}>
                {d === "sale" ? (lang === "ar" ? "أشتري الأرض" : "Buy the land") : (lang === "ar" ? "أستأجرها سنوياً" : "Lease it yearly")}
              </button>
            ))}
          </div>
        </section>
      )}

      {step >= 3 && (
        <section>
          {label(3, "في أي جزء من الرياض؟", "Which part of Riyadh?")}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(["any", ...AREAS] as (Area | "any")[]).map((a) => (
              <button key={a} onClick={() => { setArea(a); setStep(4); }} className={chip(area === a)}>
                <span className="block">{a === "any" ? (lang === "ar" ? "أي مكان مناسب" : "Anywhere that fits") : AREA_LABEL[a][lang]}</span>
                <span className={`text-xs ${area === a ? "text-white/70" : "text-muted"}`}>
                  {lang === "ar" ? `${counts[a] ?? 0} متاحة` : `${counts[a] ?? 0} available`}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step >= 4 && (
        <section>
          {label(4, deal === "sale" ? "ميزانية الشراء" : "الإيجار السنوي الذي يناسبك",
            deal === "sale" ? "Purchase budget" : "Annual rent you can pay")}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {BUDGETS[deal].map((b) => (
              <button key={b.en} onClick={() => finish(b.max)} className={chip(false)}>{b[lang]}</button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
