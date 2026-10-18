"use client";
import { useEffect, useState } from "react";

let ready = false;
import { portfolioVersion, syncLive, type Override, type Parcel } from "@/lib/portfolio";

/** Brings in properties added from the admin panel and any status/price changes, once per page load. */
export default function ListingsLoader() {
  useEffect(() => {
    fetch("/api/listings").then((r) => r.json()).then((d: { listings?: Parcel[]; overrides?: Record<string, Override> }) => {
      syncLive(Array.isArray(d.listings) ? d.listings : [], d.overrides ?? {});
    }).catch(() => {}).finally(() => { ready = true; window.dispatchEvent(new CustomEvent("sarj:listings")); });
  }, []);
  return null;
}

/** True once the latest statuses have arrived (or failed to), so lists never show a stale status. */
export function useLiveReady() {
  const [r, setR] = useState(ready);
  useEffect(() => {
    const on = () => setR(ready);
    window.addEventListener("sarj:listings", on);
    on();
    const t = setTimeout(() => setR(true), 3000); // never block the page for long
    return () => { window.removeEventListener("sarj:listings", on); clearTimeout(t); };
  }, []);
  return r;
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
