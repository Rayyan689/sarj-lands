"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, StyleSpecification } from "maplibre-gl";
import type { Parcel } from "@/lib/portfolio";
import { useLang } from "@/lib/i18n";
import { track } from "@/lib/track";

/*
  A low, slow orbit around the plot: real satellite imagery, with the buildings around it raised in 3D
  from OpenStreetMap. Keyless, and it works for every plot, unlike street-level photos.
*/

/** A square the size of the plot, centred on its point. Shape is illustrative; area is real. */
function plotSquare(p: Parcel) {
  const half = Math.sqrt(p.area_sqm) / 2;
  const dLat = half / 111_320, dLng = half / (111_320 * Math.cos((p.lat * Math.PI) / 180));
  return {
    type: "Feature" as const, properties: {},
    geometry: { type: "Polygon" as const, coordinates: [[[p.lng - dLng, p.lat - dLat], [p.lng + dLng, p.lat - dLat], [p.lng + dLng, p.lat + dLat], [p.lng - dLng, p.lat + dLat], [p.lng - dLng, p.lat - dLat]]] },
  };
}

function tourStyle(p: Parcel): StyleSpecification {
  return {
    version: 8,
    sources: {
      sat: { type: "raster", tileSize: 256, maxzoom: 19, attribution: "Imagery © Esri", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"] },
      omt: { type: "vector", url: "https://tiles.openfreemap.org/planet", attribution: "© OpenStreetMap" },
      plot: { type: "geojson", data: plotSquare(p) },
    },
    layers: [
      { id: "sat", type: "raster", source: "sat" },
      { id: "buildings", type: "fill-extrusion", source: "omt", "source-layer": "building", minzoom: 14,
        paint: { "fill-extrusion-color": "#efe6d6", "fill-extrusion-opacity": 0.82, "fill-extrusion-height": ["coalesce", ["get", "render_height"], 7], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0] } },
      { id: "plot-fill", type: "fill-extrusion", source: "plot", paint: { "fill-extrusion-color": "#E2C891", "fill-extrusion-opacity": 0.45, "fill-extrusion-height": 1.2 } },
      { id: "plot-line", type: "line", source: "plot", paint: { "line-color": "#E2C891", "line-width": 3 } },
    ],
  };
}

export default function Tour3D({ p, onClose }: { p: Parcel; onClose: () => void }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const [spin, setSpin] = useState(true);
  const spinRef = useRef(true);
  spinRef.current = spin;

  useEffect(() => {
    let cancelled = false, raf = 0, last = 0;
    track("tour_3d", {}, p.parcel_id);
    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelled || !el.current) return;
      try { ml.setWorkerUrl("/map/maplibre-gl-worker.mjs"); } catch {}
      const m = new ml.Map({ container: el.current, style: tourStyle(p), center: [p.lng, p.lat], zoom: 15.2, pitch: 20, bearing: -20, maxPitch: 80, attributionControl: { compact: true } });
      map.current = m;
      m.addControl(new ml.NavigationControl({ visualizePitch: true }), ar ? "top-left" : "top-right");
      const stop = () => setSpin(false);
      m.on("mousedown", stop); m.on("touchstart", stop); m.on("wheel", stop);
      m.on("load", () => {
        m.flyTo({ center: [p.lng, p.lat], zoom: 17.6, pitch: 68, bearing: 30, duration: 3200, essential: true });
        m.once("moveend", () => {
          const tick = (t: number) => {
            if (!last) last = t;
            const dt = t - last; last = t;
            if (spinRef.current && !m.isMoving()) m.setBearing(m.getBearing() + dt * 0.006);
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        });
      });
    })();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { cancelled = true; cancelAnimationFrame(raf); map.current?.remove(); map.current = null; window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.parcel_id]);

  const view = (mode: "orbit" | "top") => {
    const m = map.current; if (!m) return;
    if (mode === "top") { setSpin(false); m.easeTo({ pitch: 0, bearing: 0, zoom: 17.8, duration: 1200 }); }
    else { m.easeTo({ pitch: 68, zoom: 17.6, duration: 1200 }); setSpin(true); }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black" role="dialog" aria-modal="true" aria-label={ar ? "جولة ثلاثية الأبعاد حول الأرض" : "3D tour around the property"}>
      <div ref={el} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3 sm:inset-x-5 sm:top-5">
        <div className="glass pointer-events-auto max-w-sm rounded-[22px] px-4 py-3">
          <p className="text-[12px] text-muted">{ar ? "جولة حول الأرض" : "Around the property"}</p>
          <p className="text-lg font-bold">{ar ? `حي ${p.district_ar}` : p.district_en}</p>
          <p className="text-[12px] text-muted">{ar ? "المربع الذهبي بمساحة الأرض الحقيقية، والمباني حولها مرفوعة من بيانات الخرائط المفتوحة." : "The gold square has the plot's real area; surrounding buildings are raised from open map data."}</p>
        </div>
        <button onClick={onClose} className="glass pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl" aria-label={ar ? "سكّر" : "Close"}>×</button>
      </div>
      <div className="absolute inset-x-0 bottom-5 flex justify-center px-3">
        <div className="glass flex flex-wrap items-center justify-center gap-1.5 rounded-full p-1.5">
          <button onClick={() => (spin ? setSpin(false) : view("orbit"))} className={`rounded-full px-4 py-2 text-[14px] font-medium ${spin ? "bg-ink text-white" : ""}`}>{spin ? (ar ? "⏸ وقّف اللفّة" : "⏸ Pause") : (ar ? "▶︎ لفّ حولها" : "▶︎ Orbit")}</button>
          <button onClick={() => view("top")} className="rounded-full px-4 py-2 text-[14px] font-medium">{ar ? "من فوق" : "Top view"}</button>
          <a href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`} target="_blank" rel="noopener" className="rounded-full px-4 py-2 text-[14px] font-medium">{ar ? "افتحها في Google Maps ↗" : "Open in Google Maps ↗"}</a>
        </div>
      </div>
    </div>
  );
}
