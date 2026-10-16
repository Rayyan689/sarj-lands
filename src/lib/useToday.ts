"use client";
import { useEffect, useState } from "react";
import { riyadhToday } from "./time";

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
