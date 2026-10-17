import { Suspense } from "react";
import SyncListings from "../SyncListings";
import { loadAdmin } from "../data-loader";
import InvestorsView from "./InvestorsView";

type SP = Promise<{ tab?: string | string[] }>;

async function Content({ sp }: { sp: SP }) {
  const { a, live, listings } = await loadAdmin(true);
  const t = (await sp).tab;
  const tab = Array.isArray(t) ? t[0] : t;
  return <><SyncListings list={listings} /><InvestorsView a={a} live={live} tab={tab} /></>;
}

export default function Page({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<div className="space-y-4" aria-busy="true"><div className="h-10 w-64 animate-pulse rounded-full bg-white/70" /><div className="h-64 animate-pulse rounded-[24px] bg-white/60" /></div>}>
      <Content sp={searchParams} />
    </Suspense>
  );
}
