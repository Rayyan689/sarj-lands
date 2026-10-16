// Copies MapLibre's web worker and the Arabic label plugin into /public/map so the browser can load them directly.
import { copyFileSync, mkdirSync } from "node:fs";
mkdirSync("public/map", { recursive: true });
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/map/maplibre-gl-worker.mjs");
copyFileSync("node_modules/@mapbox/mapbox-gl-rtl-text/mapbox-gl-rtl-text.min.js", "public/map/mapbox-gl-rtl-text.min.js");
console.log("map assets copied");
