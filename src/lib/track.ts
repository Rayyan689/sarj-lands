"use client";
// Anonymous funnel events. No personal data: a random session id per browser tab.
function sid() {
  try {
    let s = sessionStorage.getItem("sid");
    if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("sid", s); }
    return s;
  } catch { return "nosession"; }
}
export const sessionId = sid;

export function track(name: string, props: Record<string, unknown> = {}, parcel_id?: string) {
  try {
    const body = JSON.stringify({ name, props, parcel_id, session_id: sid() });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/event", new Blob([body], { type: "application/json" }));
    else fetch("/api/event", { method: "POST", body, keepalive: true });
  } catch {}
}

export async function postJSON(url: string, data: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...(data as object), session_id: sid() }) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "failed");
  return r.json();
}
