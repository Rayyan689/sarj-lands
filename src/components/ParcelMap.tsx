"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, GeoJSONSource, StyleSpecification } from "maplibre-gl";
import type { Parcel } from "@/lib/portfolio";
import { useLang } from "@/lib/i18n";

export type Basemap = "clean" | "streets" | "satellite";

const TILES: Record<Basemap, { url: string; attribution: string }> = {
  clean: { url: "https://basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png", attribution: "© OpenStreetMap © CARTO" },
  streets: { url: "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png", attribution: "© OpenStreetMap © CARTO" },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "Imagery © Esri" },
};

function style(b: Basemap): StyleSpecification {
  return {
    version: 8,
    sources: { base: { type: "raster", tiles: [TILES[b].url], tileSize: 256, attribution: TILES[b].attribution, maxzoom: 19 } },
    layers: [{ id: "base", type: "raster", source: "base" }],
  };
}

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
};

function toGeo(parcels: Parcel[], highlight?: Set<string>, selected?: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: parcels.map((p) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      properties: {
        id: p.parcel_id, status: p.status,
        dim: highlight ? !highlight.has(p.parcel_id) : false,
        sel: selected === p.parcel_id,
      },
    })),
  };
}

export default function ParcelMap({
  parcels, highlight, selected, onSelect, basemap = "clean", showBasemapToggle = false,
  fit = false, interactive = true, zoom = 9.6, center = RIYADH, className = "",
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [base, setBase] = useState<Basemap>(basemap);
  const { lang } = useLang();
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // create once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelled || !el.current) return;
      const m = new ml.Map({
        container: el.current, style: style(base), center, zoom,
        interactive, attributionControl: { compact: true }, cooperativeGestures: false,
      });
      if (interactive) m.addControl(new ml.NavigationControl({ showCompass: false }), lang === "ar" ? "top-left" : "top-right");
      m.on("load", () => { if (!cancelled) setLoaded(true); });
      map.current = m;
    })();
    return () => { cancelled = true; map.current?.remove(); map.current = null; setLoaded(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // basemap switch
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    const src = m.getSource("base");
    if (src) { m.removeLayer("base"); m.removeSource("base"); }
    m.addSource("base", { type: "raster", tiles: [TILES[base].url], tileSize: 256, attribution: TILES[base].attribution, maxzoom: 19 });
    m.addLayer({ id: "base", type: "raster", source: "base" }, m.getLayer("halo") ? "halo" : undefined);
  }, [base, loaded]);

  // parcels layer
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    const data = toGeo(parcels, highlight, selected);
    const src = m.getSource("parcels") as GeoJSONSource | undefined;
    if (src) { src.setData(data); return; }
    m.addSource("parcels", { type: "geojson", data });
    const color = ["match", ["get", "status"], "available", "#e0a526", "reserved", "#1f5c45", "#9aa59f"] as unknown as string;
    m.addLayer({
      id: "halo", type: "circle", source: "parcels",
      filter: ["==", ["get", "sel"], true],
      paint: { "circle-radius": 16, "circle-color": "#e0a526", "circle-opacity": 0.25, "circle-stroke-width": 2, "circle-stroke-color": "#13261e" },
    });
    m.addLayer({
      id: "dots", type: "circle", source: "parcels",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, ["case", ["get", "dim"], 3, 5.5], 14, ["case", ["get", "dim"], 6, 10]],
        "circle-color": color,
        "circle-opacity": ["case", ["get", "dim"], 0.35, 1],
        "circle-stroke-width": ["case", ["get", "dim"], 0, 1.5],
        "circle-stroke-color": "#13261e",
      },
    });
    if (interactive) {
      m.on("click", "dots", (e) => { const id = e.features?.[0]?.properties?.id; if (id) onSelectRef.current?.(id); });
      m.on("mouseenter", "dots", () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", "dots", () => { m.getCanvas().style.cursor = ""; });
    }
  }, [parcels, highlight, selected, loaded, interactive]);

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
    clean: { ar: "خريطة", en: "Map" }, streets: { ar: "شوارع", en: "Streets" }, satellite: { ar: "قمر صناعي", en: "Satellite" },
  };

  return (
    <div className={`relative ${className}`}>
      <div ref={el} className="absolute inset-0" aria-label={lang === "ar" ? "خريطة الأراضي" : "Map of parcels"} role="region" />
      {showBasemapToggle && (
        <div className="absolute bottom-3 start-3 z-10 flex overflow-hidden rounded-md border border-line bg-sheet text-xs shadow-sm">
          {(["clean", "streets", "satellite"] as Basemap[]).map((b) => (
            <button key={b} onClick={() => setBase(b)}
              className={`px-3 py-1.5 ${base === b ? "bg-ink text-white" : "hover:bg-stone-2"}`}>{labels[b][lang]}</button>
          ))}
        </div>
      )}
    </div>
  );
}
