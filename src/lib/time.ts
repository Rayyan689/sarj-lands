// All time-relative numbers are computed from the real date in Riyadh, every time a page loads.
// Nothing in the UI is frozen to the data snapshot date.
import { useEffect, useState } from "react";

const TZ = "Asia/Riyadh";

/** Today's calendar date in Riyadh as YYYY-MM-DD. */
export function riyadhToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Whole days from an ISO date (YYYY-MM-DD) to today in Riyadh. */
export function daysSince(iso: string, today: string = riyadhToday()): number {
  const a = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  const b = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function formatDate(iso: string, lang: "ar" | "en") {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString(lang === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
}

/** Client hook: today's Riyadh date, set after mount so static pages never show a build-time date. */
export function useToday() {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(riyadhToday());
    // Roll over at midnight if the tab stays open.
    const id = setInterval(() => setToday(riyadhToday()), 60_000);
    return () => clearInterval(id);
  }, []);
  return today;
}
