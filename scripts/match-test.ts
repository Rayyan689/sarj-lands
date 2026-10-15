// Sanity check for the matching engine, using real scenarios from the inquiry log.
// Run: node --import tsx scripts/match-test.ts
import { runMatch, type Criteria } from "../src/lib/match";

const cases: [string, Criteria][] = [
  ["INQ-004 warehouse North lease", { use: "warehouse", deal: "lease", area: "North", budget: 1_000_000 }],
  ["INQ-027 car showroom East sale", { use: "showroom", deal: "sale", area: "East", budget: null }],
  ["INQ-010 showroom East sale 51.6M", { use: "showroom", deal: "sale", area: "East", budget: 51_641_000 }],
  ["INQ-015 family home North sale", { use: "family_home", deal: "sale", area: "North", budget: 10_000_000 }],
  ["INQ-020 family home West lease", { use: "family_home", deal: "lease", area: "West", budget: 100_000 }],
  ["INQ-031 showroom South lease", { use: "showroom", deal: "lease", area: "South", budget: 2_000_000 }],
  ["East residential up to 1.5M", { use: "family_home", deal: "sale", area: "East", budget: 1_500_000 }],
];

for (const [n, c] of cases) {
  const r = runMatch(c);
  console.log(`\n## ${n}: fits ${r.fits.length}, stretch ${r.stretch.length}, alt ${r.alternatives.length}`);
  const groups = [["fit", r.fits.slice(0, 3)], ["stretch", r.stretch], ["alt", r.alternatives]] as const;
  for (const [g, xs] of groups)
    for (const m of xs)
      console.log(` ${g} ${m.parcel.parcel_id} ${m.parcel.district_en} ${m.parcel.total_price_sar} | ${m.reasons.map((x) => x.ar).join(" ؛ ")}${m.note ? " | " + m.note.ar : ""}`);
}
