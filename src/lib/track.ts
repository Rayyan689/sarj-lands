"use client";
// Anonymous funnel events, only with the visitor's consent.
// Before they choose, events wait in memory. "تمام" sends them; "بس الضرورية" drops them.

export type Consent = "all" | "essential" | null;
const KEY = "sarj_consent";
let queue: { name: string; props: Record<string, unknown>; parcel_id?: string }[] = [];
const listeners = new Set<(c: Consent) => void>();

export function getConsent(): Consent {
  try { const v = localStorage.getItem(KEY); return v === "all" || v === "essential" ? v : null; } catch { return null; }
}

export function setConsent(c: Exclude<Consent, null>) {
  try { localStorage.setItem(KEY, c); } catch {}
  if (c === "all") { const q = queue; queue = []; q.forEach((e) => send(e.name, e.props, e.parcel_id)); }
  else queue = [];
  listeners.forEach((l) => l(c));
}

export function onConsent(l: (c: Consent) => void) { listeners.add(l); return () => { listeners.delete(l); }; }

function sid() {
  try {
    let s = sessionStorage.getItem("sid");
    if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("sid", s); }
    return s;
  } catch { return "nosession"; }
}
export const sessionId = sid;

function send(name: string, props: Record<string, unknown>, parcel_id?: string) {
  try {
    const body = JSON.stringify({ name, props, parcel_id, session_id: sid() });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/event", new Blob([body], { type: "application/json" }));
    else fetch("/api/event", { method: "POST", body, keepalive: true });
  } catch {}
}

export function track(name: string, props: Record<string, unknown> = {}, parcel_id?: string) {
  const c = getConsent();
  if (c === "all") send(name, props, parcel_id);
  else if (c === null && queue.length < 50) queue.push({ name, props, parcel_id });
}

/** Lead and alert forms are things the visitor asked for, so they always go through. */
export async function postJSON(url: string, data: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...(data as object), session_id: sid() }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || "failed"), { code: j.code });
  return j;
}
