"use client";
import { syncListings, type Parcel } from "@/lib/portfolio";

/** Puts the server's admin-added properties into the browser's portfolio before the page renders, so both match. */
export default function SyncListings({ list }: { list: Parcel[] }) {
  syncListings(list);
  return null;
}
