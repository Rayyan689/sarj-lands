import { Suspense } from "react";
import { loadAdmin } from "../data-loader";
import MarketView from "./MarketView";

type SP = Promise<{ tab?: string | string[] }>;

async function Content({ sp }: { sp: SP }) {
  const { a } = await loadAdmin(false);
  const t = (await sp).tab;
  const tab = Array.isArray(t) ? t[0] : t;
  return <MarketView a={a} tab={tab} />;
}

export default function Page({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<div className="space-y-4" aria-busy="true"><div className="h-10 w-64 animate-pulse rounded-full bg-white/70" /><div className="h-64 animate-pulse rounded-[24px] bg-white/60" /></div>}>
      <Content sp={searchParams} />
    </Suspense>
  );
}
