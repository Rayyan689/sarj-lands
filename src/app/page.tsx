"use client";
import Header from "@/components/Header";
import { useT } from "@/lib/i18n";
import { available, districtCount, parcels } from "@/lib/portfolio";

export default function Home() {
  const t = useT();
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
          {t({ ar: "ماذا تريد أن تبني؟", en: "What do you want to build?" })}
        </h1>
        <p className="text-lg opacity-70">
          {t({
            ar: `${available.length} أرضاً متاحة من أصل ${parcels.length} في ${districtCount} حياً في الرياض`,
            en: `${available.length} parcels available out of ${parcels.length}, across ${districtCount} Riyadh districts`,
          })}
        </p>
      </main>
    </>
  );
}
