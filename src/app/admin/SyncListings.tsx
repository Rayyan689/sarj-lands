"use client";
import { syncLive, type Override, type Parcel } from "@/lib/portfolio";

/** Puts the server's live changes into the browser's portfolio before the page renders, so both match. */
export default function SyncListings({ list, overrides = {} }: { list: Parcel[]; overrides?: Record<string, Override> }) {
  syncLive(list, overrides);
  return null;
}
