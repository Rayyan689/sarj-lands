"use client";
// What the visitor told the consultant. Kept in this browser only, so every page can speak to their plan.
import type { AnchorKey, Area, Deal } from "./portfolio";
import type { IntentKey } from "./intents";

export type Profile = {
  use: IntentKey; deal: Deal; area: Area | "any"; budget: number | null;
  anchor?: AnchorKey | null; family?: string | null; said?: string | null; summary?: string | null; ts: number;
};
const KEY = "sarj_profile_v1";

export function getProfile(): Profile | null {
  try { const p = JSON.parse(localStorage.getItem(KEY) || "null"); return p && p.use ? p : null; } catch { return null; }
}
export function saveProfile(p: Omit<Profile, "ts"> & { ts?: number }) {
  const prev = getProfile();
  const next = { ...prev, ...p, family: p.family ?? prev?.family ?? null, ts: Date.now() } as Profile;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  try { window.dispatchEvent(new CustomEvent("sarj:profile")); } catch {}
  return next;
}
export function setFamily(family: string) {
  const prev = getProfile();
  try { localStorage.setItem(KEY, JSON.stringify({ ...(prev ?? { use: "family_home", deal: "sale", area: "any", budget: null }), family, ts: Date.now() })); } catch {}
  try { window.dispatchEvent(new CustomEvent("sarj:profile")); } catch {}
}
