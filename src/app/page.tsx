"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MatchFlow from "@/components/MatchFlow";
import PlotStory from "@/components/PlotStory";
import TrackRecord from "@/components/TrackRecord";
import { useLang } from "@/lib/i18n";
import { available, districtCount } from "@/lib/portfolio";
import { track } from "@/lib/track";

export default function Home() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const flowRef = useRef<HTMLDivElement>(null);
  useEffect(() => { track("page_view", { page: "home" }); }, []);

  const backToFlow = () => {
    flowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => flowRef.current?.querySelector("button")?.focus({ preventScroll: true }), 600);
  };

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* One focus: the question */}
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col justify-center px-3 pb-10 pt-6 sm:px-5">
          <div className="text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-1.5 text-[13px] text-muted ring-1 ring-black/5">
              <span className="h-2 w-2 rounded-full bg-apricot" />
              {ar ? `${available.length} أرض متاحة الحين في ${districtCount} حي` : `${available.length} properties available now in ${districtCount} districts`}
            </p>
            <h1 className="mx-auto mt-5 max-w-2xl text-[38px] font-bold leading-[1.15] sm:text-[56px]">
              {ar ? "أرضك في الرياض، نطلعها لك" : "Your place in Riyadh, found for you"}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-muted sm:text-lg">
              {ar ? "علّمنا وش ببالك بأربع ضغطات، ونجيب لك اللي فعلاً يناسبك. بدون لف ودوران." : "Tell us what you have in mind in four taps, and we'll bring you what actually fits. No runaround."}
            </p>
          </div>
          <div ref={flowRef} className="glass mt-8 rounded-[32px] p-5 sm:p-7">
            <MatchFlow />
          </div>
          <p className="mt-5 text-center text-[14px] text-muted">
            {ar ? "تعرف وش تبي؟ " : "Know what you want? "}
            <Link href="/lands" className="font-medium text-ink underline decoration-apricot decoration-2 underline-offset-4">{ar ? "تصفح كل الأراضي" : "Browse all properties"}</Link>
          </p>
          <div className="mt-10 flex flex-col items-center gap-1 text-[13px] text-muted" aria-hidden>
            <span>{ar ? "انزل وشوف كيف نشتغل" : "Scroll to see how we work"}</span>
            <span className="text-lg leading-none">⌄</span>
          </div>
        </section>

        <PlotStory onStart={backToFlow} />
        <TrackRecord onStart={backToFlow} />
      </main>
      <Footer />
    </>
  );
}
