"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "ar", setLang: () => {} });

/** Arabic first: every visitor starts in Arabic. English only if they chose it before. */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  useEffect(() => {
    try { if (localStorage.getItem("lang") === "en") setLangState("en"); } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem("lang", l); } catch {} };
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
export function useT() {
  const { lang } = useLang();
  return (s: { ar: string; en: string }) => s[lang];
}
