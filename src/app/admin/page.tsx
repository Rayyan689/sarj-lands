import { Suspense } from "react";
import SyncListings from "./SyncListings";
import { loadAdmin } from "./data-loader";
import TodayView from "./TodayView";

async function Content() {
  const { a, live, listings, overrides } = await loadAdmin(true);
  return <><SyncListings list={listings} overrides={overrides} /><TodayView a={a} live={live} /></>;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="space-y-4" aria-busy="true"><div className="h-10 w-64 animate-pulse rounded-full bg-white/70" /><div className="h-64 animate-pulse rounded-[24px] bg-white/60" /></div>}>
      <Content />
    </Suspense>
  );
}
