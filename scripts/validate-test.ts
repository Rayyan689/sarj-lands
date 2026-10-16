import { normalizeSaudiMobile as n } from "../src/lib/validate";
const cases: [string, string | null][] = [
  ["0535662255", "0535662255"], ["+966535662255", "0535662255"], ["966 53 566 2255", "0535662255"], ["00966535662255", "0535662255"],
  ["535662255", "0535662255"], ["٠٥٣٥٦٦٢٢٥٥", "0535662255"], ["053-566-2255", "0535662255"],
  ["0135662255", null], ["05356622", null], ["053566225555", null], ["abc", null], ["", null],
];
let bad = 0;
for (const [i, want] of cases) { const got = n(i); if (got !== want) { bad++; console.log("FAIL", i, got, want); } }
console.log(bad ? `${bad} failed` : "all phone cases pass");
