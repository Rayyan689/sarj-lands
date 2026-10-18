"use client";
import { useEffect, useState } from "react";
import { portfolioVersion, syncLive, type Override, type Parcel } from "@/lib/portfolio";

/** Brings in properties added from the admin panel and any status/price changes, once per page load. */
export default function ListingsLoader() {
  useEffect(() => {
    fetch("/api/listings").then((r) => r.json()).then((d: { listings?: Parcel[]; overrides?: Record<string, Override> }) => {
      if (syncLive(Array.isArray(d.listings) ? d.listings : [], d.overrides ?? {})) window.dispatchEvent(new CustomEvent("sarj:listings"));
    }).catch(() => {});
  }, []);
  return null;
}

/** Re-render when live changes arrive. */
export function usePortfolioVersion() {
  const [v, setV] = useState(portfolioVersion());
  useEffect(() => {
    const on = () => setV(portfolioVersion());
    window.addEventListener("sarj:listings", on);
    on();
    return () => window.removeEventListener("sarj:listings", on);
  }, []);
  return v;
}
