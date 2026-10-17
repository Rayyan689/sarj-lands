"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { portfolio, type Parcel } from "@/lib/portfolio";
import { INTENTS, intentByKey, type IntentKey } from "@/lib/intents";
import { minutes, num } from "@/lib/format";
import { getProfile, setFamily, type Profile } from "@/lib/profile";
import { track } from "@/lib/track";
import { Avatar } from "./ConsultantHero";
import { makeShareCard } from "@/lib/shareCard";
import { priceLabel } from "@/lib/format";

/*
  "See your land": the parcel, with what the visitor said they'd build standing on it,
  from morning to night, with their family name on the gate. An illustration, labelled as one.
*/

const S = 25, CX = 300, CY = 175;
const iso = (x: number, y: number, z = 0): [number, number] => [CX + (x - y) * 0.866 * S, CY + (x + y) * 0.5 * S - z * S];
const pts = (...ps: [number, number][]) => ps.map((q) => q.map((n) => n.toFixed(1)).join(",")).join(" ");
const mix = (a: string, b: string, t: number) => {
  const h = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const [x, y] = [h(a), h(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};

type Tone = "plain" | "glass" | "metal";
type B = { x0: number; x1: number; y0: number; y1: number; z0?: number; z: number; floors: number; tone?: Tone; doors?: boolean };

function Box({ b, h, night }: { b: B; h: number; night: number }) {
  if (h <= 0.001) return null;
  const z0 = b.z0 ?? 0, top = z0 + (b.z - z0) * h;
  const wallA = b.tone === "glass" ? "#dfe8ea" : b.tone === "metal" ? "#e4e1db" : "#f6f1e9";
  const wallB = b.tone === "glass" ? "#cfdadd" : b.tone === "metal" ? "#d4d0c8" : "#e9e1d4";
  const dark = night * 0.55;
  const win = night > 0.5 ? `rgba(232,190,110,${0.55 + night * 0.45})` : b.tone === "glass" ? "rgba(90,120,130,.35)" : "rgba(31,31,31,.18)";
  const wins: React.ReactNode[] = [];
  const fh = (b.z - z0) / b.floors;
  for (let f = 0; f < b.floors; f++) {
    const fz0 = z0 + f * fh + fh * 0.3, fz1 = z0 + f * fh + fh * 0.75;
    if (fz1 > top) break;
    if (b.doors && f === 0) {
      const n = Math.max(2, Math.round((b.x1 - b.x0) / 1.6));
      for (let i = 0; i < n; i++) {
        const a = b.x0 + (b.x1 - b.x0) * ((i + 0.2) / n), c = a + (b.x1 - b.x0) * (0.6 / n);
        wins.push(<polygon key={`d${i}`} points={pts(iso(a, b.y1, z0), iso(c, b.y1, z0), iso(c, b.y1, z0 + fh * 0.8), iso(a, b.y1, z0 + fh * 0.8))} fill="rgba(31,31,31,.35)" />);
      }
      continue;
    }
    const nA = Math.max(1, Math.round((b.x1 - b.x0) / 1.1)), nB = Math.max(1, Math.round((b.y1 - b.y0) / 1.1));
    for (let i = 0; i < nA; i++) {
      const a = b.x0 + (b.x1 - b.x0) * ((i + 0.25) / nA), c = a + (b.x1 - b.x0) * (0.5 / nA);
      wins.push(<polygon key={`a${f}${i}`} points={pts(iso(a, b.y1, fz0), iso(c, b.y1, fz0), iso(c, b.y1, fz1), iso(a, b.y1, fz1))} fill={win} />);
    }
    for (let i = 0; i < nB; i++) {
      const a = b.y0 + (b.y1 - b.y0) * ((i + 0.25) / nB), c = a + (b.y1 - b.y0) * (0.5 / nB);
      wins.push(<polygon key={`b${f}${i}`} points={pts(iso(b.x1, a, fz0), iso(b.x1, c, fz0), iso(b.x1, c, fz1), iso(b.x1, a, fz1))} fill={win} />);
    }
  }
  const st = { stroke: "#1f1f1f", strokeWidth: 1.1, strokeLinejoin: "round" as const };
  return (
    <g>
      <polygon points={pts(iso(b.x0, b.y1, z0), iso(b.x1, b.y1, z0), iso(b.x1, b.y1, top), iso(b.x0, b.y1, top))} fill={mix(wallA.startsWith("#") ? wallA : "#f6f1e9", "#2a2f3a", dark)} {...st} />
      <polygon points={pts(iso(b.x1, b.y0, z0), iso(b.x1, b.y1, z0), iso(b.x1, b.y1, top), iso(b.x1, b.y0, top))} fill={mix(wallB, "#232833", dark)} {...st} />
      <polygon points={pts(iso(b.x0, b.y0, top), iso(b.x1, b.y0, top), iso(b.x1, b.y1, top), iso(b.x0, b.y1, top))} fill={mix("#fffdf9", "#3a4150", dark)} {...st} />
      {h > 0.5 && wins}
    </g>
  );
}

function Palm({ x, y, k, night }: { x: number; y: number; k: number; night: number }) {
  if (k <= 0.001) return null;
  const [bx, by] = iso(x, y, 0);
  const leaf = mix("#6f7f55", "#2f3a2c", night);
  return (
    <g transform={`translate(${bx},${by}) scale(${k}) translate(${-bx},${-by})`}>
      <path d={`M${bx},${by} q4,-20 2,-40`} stroke={mix("#8c6a2f", "#3a3226", night)} strokeWidth="3" fill="none" strokeLinecap="round" />
      {[-60, -20, 20, 60, 100].map((r) => <path key={r} d={`M${bx + 2},${by - 40} q13,-6 22,6`} stroke={leaf} strokeWidth="3" fill="none" strokeLinecap="round" transform={`rotate(${r} ${bx + 2} ${by - 40})`} />)}
    </g>
  );
}

/** What stands on the plot for each plan. Grid units, plot spans x 1..9, y 1..8.4. */
function layout(use: IntentKey, sqm: number): { boxes: B[]; palms: [number, number][]; wall: boolean; pool?: [number, number, number, number] } {
  switch (use) {
    case "family_home":
      return { wall: true, boxes: [{ x0: 3, x1: 7.2, y0: 2.2, y1: 6.2, z: 1.5, floors: 1 }, { x0: 3, x1: 5.8, y0: 2.2, y1: 4.6, z0: 1.5, z: 2.8, floors: 1 }], palms: [[7.9, 7.3], [1.9, 7.4]] };
    case "villas_sell": {
      const n = Math.min(4, Math.max(2, Math.round(sqm / 400)));
      const w = 7.4 / n;
      return { wall: false, palms: [[8.6, 7.9]], boxes: Array.from({ length: n }, (_, i) => ({ x0: 1.4 + i * w + 0.15, x1: 1.4 + (i + 1) * w - 0.25, y0: 2.6, y1: 6.4, z: 2.4, floors: 2 })) };
    }
    case "apartments_rent":
      return { wall: false, boxes: [{ x0: 2.6, x1: 7.4, y0: 2, y1: 6.4, z: 4.8, floors: 5 }], palms: [[8.2, 7.6], [1.8, 7.6]] };
    case "compound": {
      const bx: B[] = [];
      for (const [x, y] of [[1.6, 1.6], [4.4, 1.6], [7.0, 1.6], [1.6, 5.0], [7.0, 5.0]] as const) bx.push({ x0: x, x1: x + 1.8, y0: y, y1: y + 2.2, z: 1.8, floors: 2 });
      return { wall: true, boxes: bx, palms: [[3.9, 6.9], [6.4, 6.9], [4.2, 4.3]], pool: [3.9, 6.3, 4.6, 6.4] };
    }
    case "warehouse":
      return { wall: false, boxes: [{ x0: 1.8, x1: 8.4, y0: 1.6, y1: 6.4, z: 1.9, floors: 1, tone: "metal", doors: true }], palms: [] };
    case "showroom":
      return { wall: false, boxes: [{ x0: 2.2, x1: 7.8, y0: 2, y1: 6.2, z: 2.2, floors: 1, tone: "glass" }], palms: [[1.6, 7.6], [8.4, 7.6]] };
    case "office":
      return { wall: false, boxes: [{ x0: 3.2, x1: 6.8, y0: 2.4, y1: 5.8, z: 6.6, floors: 8, tone: "glass" }], palms: [[2.2, 7.4], [7.8, 7.4]] };
    case "retail":
      return { wall: false, boxes: [{ x0: 1.8, x1: 8.2, y0: 3, y1: 6.4, z: 1.6, floors: 1, tone: "glass" }], palms: [[1.4, 7.8], [8.6, 7.8]] };
    default:
      return { wall: true, boxes: [], palms: [[2.4, 7.4], [7.6, 7.4]] };
  }
}

function Scene({ p, use, t, grow, family, lang }: { p: Parcel; use: IntentKey; t: number; grow: number; family: string; lang: "ar" | "en" }) {
  const night = Math.max(0, (t - 0.55) / 0.45);
  const golden = 1 - Math.abs(t - 0.45) / 0.45;
  const sky = night > 0 ? mix("#f2d9a8", "#1b2232", night) : mix("#f4efe6", "#f2d9a8", Math.max(0, golden));
  const L = layout(use, p.area_sqm);
  const order = [...L.boxes].sort((a, b) => (a.x0 + a.y0) - (b.x0 + b.y0));
  const sunA = Math.PI * (0.15 + Math.min(t, 0.6) * 1.15);
  const sun: [number, number] = [300 - Math.cos(sunA) * 230, 150 - Math.sin(sunA) * 110];
  const signText = family ? (p.land_type === "residential" ? (lang === "ar" ? `دار ${family}` : `The ${family} home`) : family) : "";
  const gate = iso(5, 8.4, 0);
  const ground = mix("#f1e8d8", "#2b3140", night * 0.9);
  const plot = [iso(1, 1), iso(9, 1), iso(9, 8.4), iso(1, 8.4)];

  return (
    <svg viewBox="0 0 600 470" className="h-full w-full" role="img" aria-label={lang === "ar" ? "رسم توضيحي للأرض وعليها مشروعك" : "Illustration of the land with your project on it"}>
      <rect width="600" height="470" fill={sky} />
      {night > 0.3 && [[60, 40], [140, 80], [470, 50], [540, 110], [380, 30], [230, 55], [90, 130]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.4" fill="#fff" opacity={night} />)}
      {night < 0.6 ? <circle cx={sun[0]} cy={sun[1]} r="18" fill={mix("#f0d79c", "#e8a75a", Math.max(0, golden))} opacity={1 - night} />
        : <circle cx="470" cy="70" r="14" fill="#f3ecd8" opacity={night} />}

      {/* ground and street */}
      <polygon points={pts(iso(-1, 11, 0), iso(11, 11, 0), iso(11, 11, -0.5), iso(-1, 11, -0.5))} fill={mix("#e3d6bf", "#20252f", night)} />
      <polygon points={pts(iso(11, -1, 0), iso(11, 11, 0), iso(11, 11, -0.5), iso(11, -1, -0.5))} fill={mix("#d8c9ae", "#1b1f28", night)} />
      <polygon points={pts(iso(-1, -1), iso(11, -1), iso(11, 11), iso(-1, 11))} fill={ground} />
      <polygon points={pts(iso(-1, 8.9), iso(11, 8.9), iso(11, 11), iso(-1, 11))} fill={mix("#4a4a4a", "#15181f", night)} />
      <line x1={iso(-0.6, 9.95)[0]} y1={iso(-0.6, 9.95)[1]} x2={iso(10.6, 9.95)[0]} y2={iso(10.6, 9.95)[1]} stroke={mix("#f1e8d8", "#c9a15b", night)} strokeWidth="2" strokeDasharray="10 10" />
      {/* street lamps */}
      {[1.5, 5, 8.5].map((x) => { const [lx, ly] = iso(x, 8.75, 0); return (
        <g key={x}>
          {night > 0.3 && <circle cx={lx} cy={ly - 34} r="26" fill="rgba(240,200,120,.25)" opacity={night} />}
          <line x1={lx} y1={ly} x2={lx} y2={ly - 34} stroke={mix("#6b6760", "#9a958c", night)} strokeWidth="2" />
          <circle cx={lx} cy={ly - 35} r="3" fill={night > 0.3 ? "#f3d28c" : "#9a958c"} />
        </g>); })}

      {/* the plot */}
      <polygon points={pts(...plot)} fill={mix("#ece0c8", "#323a4a", night * 0.9)} stroke="#c9a15b" strokeWidth="2.4" strokeLinejoin="round" />
      {L.pool && <polygon points={pts(iso(L.pool[0], L.pool[2], 0.02), iso(L.pool[1], L.pool[2], 0.02), iso(L.pool[1], L.pool[3], 0.02), iso(L.pool[0], L.pool[3], 0.02))} fill={night > 0.4 ? "#3f8fb0" : "#8fc9de"} stroke="#fff" strokeWidth="1.5" opacity={grow} />}

      {/* back walls, buildings, front walls */}
      {L.wall && <><Box b={{ x0: 1, x1: 9, y0: 1, y1: 1.15, z: 0.45, floors: 0 }} h={grow} night={night} /><Box b={{ x0: 1, x1: 1.15, y0: 1, y1: 8.4, z: 0.45, floors: 0 }} h={grow} night={night} /></>}
      {order.map((b, i) => <Box key={i} b={b} h={Math.min(1, Math.max(0, grow * 1.25 - i * 0.08))} night={night} />)}
      {L.palms.map(([x, y], i) => <Palm key={i} x={x} y={y} k={grow} night={night} />)}
      {L.wall && <>
        <Box b={{ x0: 8.85, x1: 9, y0: 1, y1: 8.4, z: 0.45, floors: 0 }} h={grow} night={night} />
        <Box b={{ x0: 1, x1: 4.3, y0: 8.25, y1: 8.4, z: 0.45, floors: 0 }} h={grow} night={night} />
        <Box b={{ x0: 5.7, x1: 9, y0: 8.25, y1: 8.4, z: 0.45, floors: 0 }} h={grow} night={night} />
      </>}

      {/* the family's sign */}
      {signText && grow > 0.6 && (
        <g opacity={Math.min(1, (grow - 0.6) / 0.4)}>
          {night > 0.3 && <ellipse cx={gate[0]} cy={gate[1] - 2} rx="80" ry="22" fill="rgba(240,200,120,.25)" />}
          <rect x={gate[0] - Math.max(54, signText.length * 6.5)} y={gate[1] + 10} width={Math.max(108, signText.length * 13)} height="30" rx="8" fill="#1f1f1f" stroke="#c9a15b" strokeWidth="1.5" />
          <text x={gate[0]} y={gate[1] + 30} textAnchor="middle" fontSize="15" fontWeight="700" fill="#e2c891" fontFamily="Rubik, sans-serif" direction={lang === "ar" ? "rtl" : "ltr"}>{signText}</text>
        </g>
      )}

      {/* real numbers */}
      <g fontFamily="Rubik, sans-serif" fontSize="12.5" fontWeight="600" direction={lang === "ar" ? "rtl" : "ltr"}>
        <rect x={iso(1, 4.7)[0] - 92} y={iso(1, 4.7)[1] - 14} width="84" height="28" rx="14" fill="rgba(255,255,255,.92)" stroke="rgba(31,31,31,.12)" />
        <text x={iso(1, 4.7)[0] - 50} y={iso(1, 4.7)[1] + 4.5} textAnchor="middle" fill="#1f1f1f">{lang === "ar" ? `${num(p.area_sqm, "ar")} م²` : `${num(p.area_sqm, "en")} m²`}</text>
        <rect x={iso(9.6, 10.4)[0] - 4} y={iso(9.6, 10.4)[1] - 2} width="92" height="28" rx="14" fill="rgba(255,255,255,.92)" stroke="rgba(31,31,31,.12)" />
        <text x={iso(9.6, 10.4)[0] + 42} y={iso(9.6, 10.4)[1] + 16.5} textAnchor="middle" fill="#1f1f1f">{lang === "ar" ? `شارع ${p.street_width_m} م` : `${p.street_width_m} m street`}</text>
      </g>
    </svg>
  );
}

function defaultUse(p: Parcel): IntentKey {
  if (p.land_type === "residential") return p.area_sqm < 700 ? "family_home" : p.area_sqm < 2500 ? "apartments_rent" : "compound";
  return p.area_sqm < 900 ? "retail" : p.area_sqm < 3000 ? "showroom" : "warehouse";
}

export default function YourLand({ p }: { p: Parcel }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [profile, setProfile] = useState<Profile | null>(null);
  const options = useMemo(() => INTENTS.filter((i) => i.type === p.land_type), [p.land_type]);
  const [use, setUse] = useState<IntentKey>(defaultUse(p));
  const [t, setT] = useState(0.2);
  const [family, setFam] = useState("");
  const [draft, setDraft] = useState("");
  const [grow, setGrow] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pr = getProfile();
    setProfile(pr);
    if (pr?.use && intentByKey(pr.use)?.type === p.land_type) setUse(pr.use);
    if (pr?.family) { setFam(pr.family); setDraft(pr.family); }
  }, [p.land_type]);

  // The building rises once, when the scene scrolls into view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      if (reduce) { setGrow(1); return; }
      const t0 = performance.now();
      const tick = (now: number) => { const k = Math.min(1, (now - t0) / 1600); setGrow(1 - Math.pow(1 - k, 3)); if (k < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  const [card, setCard] = useState<{ url: string; blob: Blob } | null>(null);
  const [busy, setBusy] = useState(false);
  const pageUrl = typeof window !== "undefined" ? `${location.origin}/lands/${p.parcel_id}` : "";
  const shareText = ar
    ? `شوفوا هالأرض في حي ${p.district_ar}: ${num(p.area_sqm, "ar")} م²، ${priceLabel(p, "ar")}. ودي أسمع رايكم 👇\n${pageUrl}`
    : `Have a look at this property in ${p.district_en}: ${num(p.area_sqm, "en")} m², ${priceLabel(p, "en")}. I'd love your thoughts 👇\n${pageUrl}`;
  const openCard = async () => {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    setBusy(true); setGrow(1);
    try {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const blob = await makeShareCard(svg as SVGSVGElement, p, intentByKey(use)![lang], lang, pageUrl);
      setCard({ url: URL.createObjectURL(blob), blob });
      track("share_card", { use }, p.parcel_id);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener");
    } finally { setBusy(false); }
  };
  const sendCard = async () => {
    if (!card) return;
    const file = new File([card.blob], `sarj-${p.parcel_id}.png`, { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: shareText }); track("share_sent", { how: "native" }, p.parcel_id); return; }
    } catch { return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener");
    track("share_sent", { how: "whatsapp" }, p.parcel_id);
  };
  const closeCard = () => { if (card) URL.revokeObjectURL(card.url); setCard(null); };

  const pick = (k: IntentKey) => { setUse(k); setGrow(0.35); requestAnimationFrame(() => setGrow(1)); track("your_land_plan", { use: k }, p.parcel_id); };
  const saveName = (e: React.FormEvent) => {
    e.preventDefault();
    const v = draft.trim().slice(0, 24);
    setFam(v);
    if (v) { setFamily(v); track("your_land_name", {}, p.parcel_id); }
  };

  const intent = intentByKey(use)!;
  const fromProfile = profile?.use === use && !!profile?.said;
  const anchor = profile?.anchor && p.drive?.[profile.anchor] ? profile.anchor : null;
  const times = [{ v: 0.2, ar: "الصبح", en: "Morning" }, { v: 0.45, ar: "العصر", en: "Golden hour" }, { v: 0.95, ar: "الليل", en: "Night" }];

  return (
    <section className="glass overflow-hidden rounded-[30px]">
      <div className="p-6 pb-3">
        <h2 className="text-2xl font-bold">{ar ? "شوف أرضك" : "See your land"}</h2>
        <p className="mt-1 text-[15px] text-muted">{ar ? `أرض حي ${p.district_ar}، وعليها ${intent.ar}. غيّر الخطة والوقت، واكتب اسم عايلتك.` : `${p.district_en}, with ${intent.en.toLowerCase()} on it. Change the plan and the time, and add your family name.`}</p>
        {fromProfile && (
          <div className="step-in mt-3 flex items-start gap-2.5">
            <Avatar size={30} />
            <p className="rounded-[18px] rounded-ss-md bg-white/85 px-3.5 py-2 text-[14px] leading-relaxed shadow-sm">
              {ar ? `قلت لي تبي ${intent.ar}، فرسمته لك هنا.` : `You said you want ${intent.en.toLowerCase()}, so I've drawn it here.`}
              {anchor && (p.drive[anchor].min <= 20
                ? (ar ? ` وهي على بعد ${minutes(p.drive[anchor].min, "ar")} بس عن ${portfolio.anchors[anchor].ar}، مثل ما طلبت.` : ` And it's just ${minutes(p.drive[anchor].min, "en")} from ${portfolio.anchors[anchor].en}, like you asked.`)
                : (ar ? ` للأمانة، هي على بعد ${minutes(p.drive[anchor].min, "ar")} عن ${portfolio.anchors[anchor].ar} بدون زحمة.` : ` To be fair, it's ${minutes(p.drive[anchor].min, "en")} from ${portfolio.anchors[anchor].en} without traffic.`))}
            </p>
          </div>
        )}
      </div>
      <div ref={ref} className="aspect-[600/470] w-full">
        <Scene p={p} use={use} t={t} grow={grow} family={family} lang={lang} />
      </div>
      <div className="space-y-3 p-5 pt-4">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={ar ? "وش بتبني" : "What you'd build"}>
          {options.map((o) => (
            <button key={o.key} role="radio" aria-checked={use === o.key} onClick={() => pick(o.key)} className={`bubble px-3 py-1.5 text-[13px] ${use === o.key ? "bubble-on" : ""}`}>
              <span aria-hidden>{o.icon}</span> {o[lang]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="glass-soft inline-flex rounded-full p-1" role="radiogroup" aria-label={ar ? "الوقت" : "Time of day"}>
            {times.map((x) => (
              <button key={x.v} role="radio" aria-checked={Math.abs(t - x.v) < 0.01} onClick={() => setT(x.v)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${Math.abs(t - x.v) < 0.01 ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>{x[lang]}</button>
            ))}
          </div>
          <form onSubmit={saveName} className="flex min-w-[220px] flex-1 items-center gap-1.5">
            <label htmlFor={`fam-${p.parcel_id}`} className="sr-only">{ar ? "اسم العايلة" : "Family name"}</label>
            <input id={`fam-${p.parcel_id}`} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={24} placeholder={ar ? "اسم عايلتك، مثلاً العتيبي" : "Your family name"}
              className="field h-10 min-w-0 flex-1 rounded-full px-4 text-[14px]" dir="auto" />
            <button className="btn-primary h-10 shrink-0 rounded-full px-4 text-[13px] font-medium text-white">{ar ? "اكتبه" : "Add"}</button>
          </form>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-white/70 p-3.5">
          <p className="text-[14px] leading-relaxed"><b className="font-semibold">{ar ? "شاور أهلك" : "Ask your family"}</b><span className="text-muted">{ar ? "، قرار الأرض قرار عايلة. نسوي لك صورة حلوة لها ترسلها لهم." : ". Land is a family decision. We'll make a card you can send them."}</span></p>
          <button onClick={openCard} disabled={busy} className="btn-wa shrink-0 px-4 py-2.5 text-[14px] font-semibold disabled:opacity-60">{busy ? (ar ? "لحظة…" : "One sec…") : (ar ? "سوّ لي صورة أرسلها" : "Make my card")}</button>
        </div>
        <p className="text-[12px] text-muted">{ar ? "رسم توضيحي للفكرة، مو مخطط معتمد. المساحة وعرض الشارع من بيانات الأرض." : "An illustration of the idea, not an approved plan. Size and street width come from the property's data."}</p>
      </div>
      {card && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label={ar ? "صورة الأرض" : "Property card"} onClick={closeCard}>
          <div className="glass max-h-full w-full max-w-sm overflow-auto rounded-[28px] p-4" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.url} alt={ar ? `صورة أرض حي ${p.district_ar}` : `Card for ${p.district_en}`} className="w-full rounded-[18px] shadow-sm" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={sendCard} className="btn-wa px-3 py-3 text-[14px] font-semibold">{ar ? "أرسلها" : "Send it"}</button>
              <a href={card.url} download={`sarj-${p.parcel_id}.png`} className="bubble px-3 py-3 text-center text-[14px] font-medium">{ar ? "احفظ الصورة" : "Save image"}</a>
            </div>
            <button onClick={closeCard} className="mt-2 w-full rounded-full py-2 text-[13px] text-muted hover:text-ink">{ar ? "سكّر" : "Close"}</button>
          </div>
        </div>
      )}
    </section>
  );
}
