// Runs every combination the match flow can produce and flags anything odd.
import { runMatch } from "../src/lib/match";
import { INTENTS, BUDGETS } from "../src/lib/intents";
import { AREAS } from "../src/lib/portfolio";
import { hook } from "../src/lib/format";
import { parcels } from "../src/lib/portfolio";

let n = 0, empty = 0; const issues: string[] = [];
for (const i of INTENTS) for (const deal of ["sale", "lease"] as const) for (const area of ["any", ...AREAS] as const) for (const b of BUDGETS[deal]) {
  n++;
  const r = runMatch({ use: i.key, deal, area, budget: b.max });
  const all = [...r.fits, ...r.stretch, ...r.alternatives];
  if (!all.length) { empty++; issues.push(`EMPTY ${i.key}/${deal}/${area}/${b.max}`); }
  for (const m of all) {
    const txt = JSON.stringify(m.note ? [m.reasons, m.note] : m.reasons);
    if (/undefined|NaN|null|Infinity/.test(txt)) issues.push(`${i.key}/${deal}/${area}/${b.max}: ${m.parcel.parcel_id} ${txt}`);
    if (m.parcel.status !== "available") issues.push(`non-available shown: ${m.parcel.parcel_id}`);
  }
  for (const m of r.fits) if (b.max != null && (m.parcel.total_price_sar ?? Infinity) > b.max) issues.push(`over budget in fits: ${m.parcel.parcel_id}`);
  const ids = all.map((m) => m.parcel.parcel_id); if (new Set(ids).size !== ids.length) issues.push(`duplicate ${i.key}/${deal}/${area}/${b.max}`);
}
for (const p of parcels) { const h = JSON.stringify(hook(p)); if (/undefined|NaN|null/.test(h)) issues.push(`hook ${p.parcel_id} ${h}`); }
console.log(`${n} combinations, ${empty} with nothing at all to show`);
console.log(issues.length ? issues.slice(0, 20).join("\n") : "no issues");
