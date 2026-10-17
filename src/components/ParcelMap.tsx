"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, GeoJSONSource, StyleSpecification } from "maplibre-gl";
import type { Parcel } from "@/lib/portfolio";
import { useLang } from "@/lib/i18n";

export type Basemap = "clean" | "streets" | "satellite";

// Free, keyless basemaps: OpenFreeMap vector styles, and Esri imagery for satellite.
const STYLE_URL = {
  clean: "https://tiles.openfreemap.org/styles/positron",
  streets: "https://tiles.openfreemap.org/styles/liberty",
} as const;

function style(b: Basemap): string | StyleSpecification {
  if (b !== "satellite") return STYLE_URL[b];
  return {
    version: 8,
    sources: {
      base: {
        type: "raster", tileSize: 256, maxzoom: 19, attribution: "Imagery © Esri",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      },
    },
    layers: [{ id: "base", type: "raster", source: "base" }],
  };
}

let workerSet = false;
const RIYADH: [number, number] = [46.70, 24.72];

type Props = {
  parcels: Parcel[];
  highlight?: Set<string>;        // emphasised parcels; others are dimmed
  selected?: string | null;
  onSelect?: (id: string) => void;
  basemap?: Basemap;
  showBasemapToggle?: boolean;
  fit?: boolean;                  // zoom to the (highlighted) parcels
  interactive?: boolean;
  zoom?: number;
  center?: [number, number];
  className?: string;
  heat?: Record<string, number>;  // views per parcel: draws a warm glow sized by interest
};

function toGeo(parcels: Parcel[], highlight?: Set<string>, selected?: string | null, heat?: Record<string, number>) {
  return {
    type: "FeatureCollection" as const,
    features: parcels.map((p) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      properties: {
        id: p.parcel_id, status: p.status,
        dim: highlight ? !highlight.has(p.parcel_id) : false,
        sel: selected === p.parcel_id,
        views: heat?.[p.parcel_id] ?? 0,
      },
    })),
  };
}

export default function ParcelMap({
  parcels, highlight, selected, onSelect, basemap = "clean", showBasemapToggle = false,
  fit = false, interactive = true, zoom = 9.6, center = RIYADH, className = "", heat,
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [base, setBase] = useState<Basemap>(basemap);
  const { lang } = useLang();
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const dataRef = useRef(toGeo(parcels, highlight, selected, heat));
  dataRef.current = toGeo(parcels, highlight, selected, heat);

  // create once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelled || !el.current) return;
      // Bundlers break MapLibre's worker path, so we serve it ourselves (copied at build time).
      if (!workerSet) {
        workerSet = true;
        ml.setWorkerUrl("/map/maplibre-gl-worker.mjs");
        // Shapes Arabic map labels correctly.
        try { ml.setRTLTextPlugin("/map/mapbox-gl-rtl-text.min.js", true); } catch {}
      }
      const m = new ml.Map({
        container: el.current, style: style(base), center, zoom,
        interactive, attributionControl: { compact: true }, cooperativeGestures: false,
      });
      if (interactive) {
        m.addControl(new ml.NavigationControl({ showCompass: false }), lang === "ar" ? "top-left" : "top-right");
        m.on("click", "dots", (e) => { const id = e.features?.[0]?.properties?.id; if (id) onSelectRef.current?.(id); });
        m.on("mouseenter", "dots", () => { m.getCanvas().style.cursor = "pointer"; });
        m.on("mouseleave", "dots", () => { m.getCanvas().style.cursor = ""; });
      }
      m.on("style.load", () => addParcels(m));
      m.on("load", () => { if (!cancelled) setLoaded(true); });
      map.current = m;
    })();
    return () => { cancelled = true; map.current?.remove(); map.current = null; setLoaded(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addParcels(m: MLMap) {
    if (m.getSource("parcels")) return;
    m.addSource("parcels", { type: "geojson", data: dataRef.current });
    const color = ["match", ["get", "status"], "available", "#C9A15B", "reserved", "#5E6670", "#B9B4AC"] as unknown as string;
    m.addLayer({
      id: "heat", type: "circle", source: "parcels",
      filter: [">", ["get", "views"], 0],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["get", "views"], 1, 14, 10, 30, 40, 52],
        "circle-color": "#E0A84F", "circle-opacity": 0.38, "circle-blur": 0.7,
      },
    });
    m.addLayer({
      id: "halo", type: "circle", source: "parcels",
      filter: ["==", ["get", "sel"], true],
      paint: { "circle-radius": 18, "circle-color": "#C9A15B", "circle-opacity": 0.3, "circle-stroke-width": 3, "circle-stroke-color": "#ffffff" },
    });
    m.addLayer({
      id: "dots", type: "circle", source: "parcels",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, ["case", ["get", "dim"], 3.5, 6.5], 14, ["case", ["get", "dim"], 6, 11]],
        "circle-color": color,
        "circle-opacity": ["case", ["get", "dim"], 0.4, 1],
        "circle-stroke-width": ["case", ["get", "dim"], 1, 2.5],
        "circle-stroke-color": "#ffffff",
      },
    });
  }

  // basemap switch (style reload re-adds the parcels via style.load)
  const firstBase = useRef(true);
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    if (firstBase.current) { firstBase.current = false; return; }
    m.setStyle(style(base), { diff: false });
  }, [base, loaded]);

  // parcels data
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    const src = m.getSource("parcels") as GeoJSONSource | undefined;
    if (src) src.setData(dataRef.current); else if (m.isStyleLoaded()) addParcels(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcels, highlight, selected, heat, loaded]);

  // fit to highlighted results
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded || !fit) return;
    const pts = parcels.filter((p) => !highlight || highlight.has(p.parcel_id));
    if (!pts.length) return;
    if (pts.length === 1) { m.easeTo({ center: [pts[0].lng, pts[0].lat], zoom: 14 }); return; }
    const lngs = pts.map((p) => p.lng), lats = pts.map((p) => p.lat);
    m.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 60, maxZoom: 14, duration: 600 });
  }, [parcels, highlight, fit, loaded]);

  // fly to selection
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded || !selected || !interactive) return;
    const p = parcels.find((x) => x.parcel_id === selected);
    if (p) m.easeTo({ center: [p.lng, p.lat], zoom: Math.max(m.getZoom(), 12.5), duration: 500 });
  }, [selected, loaded, parcels, interactive]);

  const labels: Record<Basemap, { ar: string; en: string }> = {
    clean: { ar: "خريطة", en: "Map" }, streets: { ar: "شوارع", en: "Streets" }, satellite: { ar: "صورة جوية", en: "Satellite" },
  };

  return (
    <div className={`relative ${className}`}>
      <div ref={el} style={{ position: "absolute", inset: 0 }} aria-label={lang === "ar" ? "خريطة الأراضي" : "Map of properties"} role="region" />
      {showBasemapToggle && (
        <div className="glass absolute top-3 start-3 z-10 flex gap-1 rounded-full p-1 text-xs">
          {(["clean", "streets", "satellite"] as Basemap[]).map((b) => (
            <button key={b} onClick={() => setBase(b)}
              className={`rounded-full px-3 py-1.5 ${base === b ? "bg-ink text-white" : "hover:bg-white"}`}>{labels[b][lang]}</button>
          ))}
        </div>
      )}
    </div>
  );
}
