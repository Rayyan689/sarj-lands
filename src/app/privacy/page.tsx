"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLang } from "@/lib/i18n";
import { getConsent, setConsent, type Consent } from "@/lib/track";

const SECTIONS = [
  {
    ar: ["وش نجمع؟", "إذا حجزت زيارة أو طلبت ننبهك، نحفظ اسمك ورقم جوالك والأرض أو الطلب اللي اخترته. هذا بس عشان فريقنا يتواصل معك."],
    en: ["What we collect", "If you book a visit or ask us to notify you, we keep your name, mobile number and the land or request you picked, only so our team can reach you."],
  },
  {
    ar: ["الكوكيز وتخزين المتصفح", "نحفظ في متصفحك لغتك المفضلة واختيارك للكوكيز. وإذا وافقت على الكوكيز، نسجل زياراتك للصفحات بشكل مجهول (بدون اسم أو رقم) عشان نعرف وش يعجب الزوار ونحسّن الموقع."],
    en: ["Cookies and browser storage", "We keep your language and cookie choice in your browser. If you accept cookies, we also record page visits anonymously (no name or number) to learn what visitors like and improve the site."],
  },
  {
    ar: ["الخرايط", "الخرايط تجي من OpenFreeMap والصور الجوية من Esri. لما تفتح الخريطة، متصفحك يطلب منهم الصور مباشرة."],
    en: ["Maps", "Maps come from OpenFreeMap and aerial imagery from Esri. When you open a map, your browser requests the tiles from them directly."],
  },
  {
    ar: ["وش ما نسويه", "ما نبيع بياناتك، وما نشاركها مع أي جهة إعلانية، وما نرسل لك رسائل ما طلبتها."],
    en: ["What we don't do", "We don't sell your data, share it with advertisers, or send you messages you didn't ask for."],
  },
  {
    ar: ["تبي نحذف بياناتك؟", "كلمنا على الواتساب 0535662255 ونحذفها لك."],
    en: ["Want your data deleted?", "Message us on WhatsApp at +966 53 566 2255 and we'll delete it."],
  },
];

export default function Privacy() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [c, setC] = useState<Consent>(null);
  useEffect(() => { setC(getConsent()); }, []);
  const pick = (v: "all" | "essential") => { setConsent(v); setC(v); };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-8 sm:px-5">
        <div className="glass rounded-[34px] p-6 sm:p-8">
          <h1 className="text-3xl font-bold">{ar ? "الخصوصية والكوكيز" : "Privacy & cookies"}</h1>
          <p className="mt-2 text-muted">{ar ? "باختصار وبدون لف: وش نحفظ، وليش." : "In short, no fine print: what we keep and why."}</p>
          <div className="mt-6 space-y-5">
            {SECTIONS.map((s, i) => (
              <section key={i}>
                <h2 className="text-lg font-semibold">{s[lang][0]}</h2>
                <p className="mt-1 leading-relaxed text-[16px]">{s[lang][1]}</p>
              </section>
            ))}
          </div>
          <div className="mt-8 rounded-3xl bg-white/70 p-5">
            <p className="font-semibold">{ar ? "اختيارك الحالي للكوكيز" : "Your current cookie choice"}</p>
            <p className="mt-1 text-muted">
              {c === "all" ? (ar ? "موافق على كل الكوكيز" : "All cookies accepted")
                : c === "essential" ? (ar ? "بس الضرورية" : "Essential only")
                  : (ar ? "ما اخترت بعد" : "Not chosen yet")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => pick("all")} className={`bubble px-4 py-2 text-[14px] ${c === "all" ? "bubble-on" : ""}`}>{ar ? "أوافق على الكل" : "Accept all"}</button>
              <button onClick={() => pick("essential")} className={`bubble px-4 py-2 text-[14px] ${c === "essential" ? "bubble-on" : ""}`}>{ar ? "بس الضرورية" : "Essential only"}</button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
