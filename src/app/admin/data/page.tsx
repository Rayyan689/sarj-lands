import { Suspense } from "react";
import { loadAdmin } from "../data-loader";
import DataView from "./DataView";

async function Content() {
  const { a } = await loadAdmin(false);
  return <DataView a={a} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="space-y-4" aria-busy="true"><div className="h-10 w-64 animate-pulse rounded-full bg-white/70" /><div className="h-64 animate-pulse rounded-[24px] bg-white/60" /></div>}>
      <Content />
    </Suspense>
  );
}
