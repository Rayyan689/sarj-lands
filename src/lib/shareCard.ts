"use client";
// Draws a 1080x1350 card (the "your land" scene + the facts) for the visitor to send to family.
import { ARABIC_D, LATIN_D } from "@/components/logo-paths";
import type { Parcel } from "./portfolio";
import { priceLabel, num } from "./format";

type Lang = "ar" | "en";

function svgToImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", "1200");
  clone.setAttribute("height", "940");
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
  return new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); no(e); };
    img.src = url;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export async function makeShareCard(svg: SVGSVGElement, p: Parcel, plan: string, lang: Lang, url: string): Promise<Blob> {
  const ar = lang === "ar";
  try { await Promise.all([document.fonts.load('700 60px "Rubik"'), document.fonts.load('400 30px "Rubik"')]); } catch {}
  const W = 1080, H = 1350, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#faf8f5"); g.addColorStop(1, "#f1e8d8");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // logo, top start corner
  ctx.save();
  const k = 230 / 508;
  ctx.translate(ar ? W - 60 - 230 : 60, 54); ctx.scale(k, k); ctx.translate(2, 2);
  ctx.fillStyle = "#1f1f1f"; ctx.fill(new Path2D(ARABIC_D)); ctx.fill(new Path2D(LATIN_D));
  ctx.restore();

  // the scene
  const img = await svgToImage(svg);
  const sx = 60, sy = 200, sw = 960, sh = 752;
  ctx.save(); roundRect(ctx, sx, sy, sw, sh, 44); ctx.clip(); ctx.drawImage(img, sx, sy, sw, sh); ctx.restore();

  // words
  ctx.direction = ar ? "rtl" : "ltr";
  ctx.textAlign = ar ? "right" : "left";
  const x = ar ? W - 64 : 64;
  ctx.fillStyle = "#1f1f1f";
  ctx.font = '700 66px "Rubik", sans-serif';
  ctx.fillText(ar ? `حي ${p.district_ar}` : p.district_en, x, 1040);
  ctx.font = '400 32px "Rubik", sans-serif';
  ctx.fillStyle = "#6b6760";
  ctx.fillText(ar ? `${plan} · ${num(p.area_sqm, "ar")} م² · شارع ${p.street_width_m} م` : `${plan} · ${num(p.area_sqm, "en")} m² · ${p.street_width_m} m street`, x, 1092);
  ctx.fillStyle = "#8c6a2f";
  ctx.font = '700 46px "Rubik", sans-serif';
  ctx.fillText(priceLabel(p, lang), x, 1166);

  // footer
  ctx.fillStyle = "#1f1f1f";
  roundRect(ctx, 60, 1220, W - 120, 78, 39); ctx.fill();
  ctx.fillStyle = "#e2c891";
  ctx.font = '400 28px "Rubik", sans-serif';
  ctx.textAlign = "center"; ctx.direction = "ltr";
  ctx.fillText(url.replace(/^https?:\/\//, ""), W / 2, 1269);

  return new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("blob"))), "image/png"));
}
