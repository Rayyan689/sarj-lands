"use client";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLang } from "@/lib/i18n";

export default function NotFound() {
  const { lang } = useLang();
  const ar = lang === "ar";
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-3 py-16 sm:px-5">
        <div className="glass w-full rounded-[34px] p-8 text-center">
          <p className="text-5xl" aria-hidden>🧭</p>
          <h1 className="mt-4 text-3xl font-bold">{ar ? "ما لقينا هالصفحة" : "We couldn't find that page"}</h1>
          <p className="mt-2 text-muted">{ar ? "يمكن الرابط قديم أو فيه غلطة بسيطة. خلّنا نرجعك للأراضي." : "The link may be old or have a small typo. Let's get you back to our properties."}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/" className="btn-primary px-5 py-2.5 font-medium">{ar ? "الصفحة الرئيسية" : "Home"}</Link>
            <Link href="/lands" className="bubble px-5 py-2.5">{ar ? "كل الأراضي" : "All properties"}</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
