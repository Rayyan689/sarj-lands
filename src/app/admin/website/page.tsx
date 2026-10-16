import { Suspense } from "react";
import { loadAdmin } from "../data-loader";
import WebsiteView from "./WebsiteView";

async function Content() {
  const { live } = await loadAdmin(true);
  return <WebsiteView live={live} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="space-y-4" aria-busy="true"><div className="h-10 w-64 animate-pulse rounded-full bg-white/70" /><div className="h-64 animate-pulse rounded-[24px] bg-white/60" /></div>}>
      <Content />
    </Suspense>
  );
}
