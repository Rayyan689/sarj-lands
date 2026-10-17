// Sunset in Riyadh (NOAA approximation, good to a couple of minutes). Used to suggest the nicest time to visit a plot.
export function riyadhSunset(d = new Date(), lat = 24.71, lng = 46.68) {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const n = Math.floor((d.getTime() - start) / 86_400_000);
  const g = (2 * Math.PI / 365) * (n - 1);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const r = Math.PI / 180;
  const ha = Math.acos(Math.cos(90.833 * r) / (Math.cos(lat * r) * Math.cos(decl)) - Math.tan(lat * r) * Math.tan(decl)) / r;
  const utcMin = 720 - 4 * (lng - ha) - eq;
  return Math.round(utcMin + 180); // minutes after midnight, Riyadh time (UTC+3, no DST)
}

/** "4:30" style clock for minutes after midnight, 12-hour. */
export const clock = (m: number) => `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")}`;

/** The suggested visit: about an hour before sunset, on a quarter hour. */
export function visitTime(d = new Date()) {
  const sunset = riyadhSunset(d);
  return { sunset, visit: Math.floor((sunset - 60) / 15) * 15 };
}
