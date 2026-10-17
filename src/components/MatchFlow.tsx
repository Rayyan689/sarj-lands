"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { INTENTS, BUDGETS, intentByKey, type IntentKey } from "@/lib/intents";
import { AREAS, available, type Area, type Deal } from "@/lib/portfolio";
import { AREA_LABEL } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { track } from "@/lib/track";
import { saveProfile } from "@/lib/profile";

/** One question at a time. Four taps from intent to a shortlist. */
export default function MatchFlow() {
  const { lang } = useLang();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [use, setUse] = useState<IntentKey | null>(null);
  const [deal, setDeal] = useState<Deal>("sale");
  const [area, setArea] = useState<Area | "any">("any");

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

  const go = (n: number) => { setStep(n); track("match_step", { step: n, use, deal, area }); };
  const finish = (budget: number | null) => {
    const q = new URLSearchParams({ use: use!, deal, area });
    if (budget != null) q.set("budget", String(budget));
    track("match_completed", { use, deal, area, budget });
    saveProfile({ use: use!, deal, area, budget, anchor: null, said: null, summary: null });
    router.push(`/match?${q}`);
  };

  const Q = [
    { ar: "وش ناوي تبني؟", en: "What are you planning to build?" },
    { ar: "بتشتري ولا بتستأجر؟", en: "Buying or leasing?" },
    { ar: "وين تبيها في الرياض؟", en: "Where in Riyadh?" },
    { ar: deal === "sale" ? "كم ميزانيتك تقريباً؟" : "كم تقدر تدفع إيجار بالسنة؟", en: deal === "sale" ? "Roughly what's your budget?" : "How much rent a year works for you?" },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        {step > 0 && (
          <button onClick={() => go(step - 1)} className="bubble grid h-9 w-9 place-items-center text-lg" aria-label={lang === "ar" ? "رجوع" : "Back"}>
            <span aria-hidden className={lang === "ar" ? "" : "rotate-180"}>›</span>
          </button>
        )}
        <h2 className="text-xl font-semibold sm:text-2xl">{Q[step][lang]}</h2>
        <div className="ms-auto flex gap-1.5" aria-label={lang === "ar" ? `السؤال ${step + 1} من 4` : `Question ${step + 1} of 4`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-6 bg-blue" : i < step ? "w-2 bg-blue/50" : "w-2 bg-ink/15"}`} />
          ))}
        </div>
      </div>

      <div key={step} className="step-in">
        {step === 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {INTENTS.map((i) => (
              <button key={i.key} onClick={() => { setUse(i.key); setDeal(i.defaultDeal); track("match_started", { use: i.key }); go(1); }}
                className={`bubble flex items-center gap-2.5 px-4 py-3 text-start text-[15px] ${use === i.key ? "bubble-on" : ""}`}
                style={{ borderRadius: 20 }}>
                <span aria-hidden className="text-xl leading-none">{i.icon}</span>{i[lang]}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-2 gap-2">
            {(["sale", "lease"] as Deal[]).map((d) => (
              <button key={d} onClick={() => { setDeal(d); go(2); }} className={`bubble px-5 py-5 text-start ${deal === d ? "ring-2 ring-blue/40" : ""}`} style={{ borderRadius: 24 }}>
                <span aria-hidden className="mb-1 block text-2xl">{d === "sale" ? "🔑" : "📅"}</span>
                <span className="block text-lg font-semibold">{d === "sale" ? (lang === "ar" ? "أشتري" : "Buy") : (lang === "ar" ? "أستأجر" : "Lease")}</span>
                <span className="text-sm text-muted">{d === "sale" ? (lang === "ar" ? "تصير الأرض باسمك" : "The property is yours") : (lang === "ar" ? "إيجار سنوي، بدون دفعة كبيرة" : "Yearly rent, no big upfront cost")}</span>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <>
          <p className="mb-3 text-[14px] text-muted">
            {lang === "ar"
              ? `من أصل ${available.length} أرض متاحة، فيه ${counts.any ?? 0} ${intent?.type ? `أرض ${intent.type === "residential" ? "سكنية" : "تجارية"}` : "أرض"} ${deal === "sale" ? "للبيع" : "للإيجار"}. هذا توزيعها:`
              : `Of ${available.length} available properties, ${counts.any ?? 0} are ${intent?.type ?? ""} properties ${deal === "sale" ? "for sale" : "for lease"}. Here's where they are:`}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(["any", ...AREAS] as (Area | "any")[]).map((a) => {
              const n = counts[a] ?? 0;
              return (
                <button key={a} onClick={() => { setArea(a); go(3); }} className={`bubble px-4 py-3 text-start ${area === a && step > 2 ? "bubble-on" : ""}`} style={{ borderRadius: 20 }}>
                  <span className="block text-[15px] font-medium">{a === "any" ? (lang === "ar" ? "ما تفرق معي" : "Anywhere works") : AREA_LABEL[a][lang]}</span>
                  <span className={`text-xs ${n ? "text-muted" : "text-muted/70"}`}>
                    {n ? (lang === "ar" ? `${n} تناسب طلبك` : `${n} match`) : (lang === "ar" ? "ما فيه شي الحين" : "None right now")}
                  </span>
                </button>
              );
            })}
          </div>
          </>
        )}

        {step === 3 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {BUDGETS[deal].map((b) => (
              <button key={b.en} onClick={() => finish(b.max)} className="bubble px-4 py-3.5 text-start text-[15px] font-medium" style={{ borderRadius: 20 }}>
                {b[lang]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
