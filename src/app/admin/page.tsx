import { Suspense } from "react";
import { connection } from "next/server";
import { headers } from "next/headers";
import { buildAnalytics } from "@/lib/admin/analytics";
import { loadLive } from "@/lib/admin/live";
import AdminDashboard from "./AdminDashboard";

async function Content() {
  await connection(); // rendered per visit: every age and "days waiting" counts from today in Riyadh
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "sarj-lands-skg5.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const a = buildAnalytics(`${proto}://${host}`);
  const live = await loadLive();
  return <AdminDashboard a={JSON.parse(JSON.stringify(a))} live={JSON.parse(JSON.stringify(live))} />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl p-8 text-muted">…</div>}>
      <Content />
    </Suspense>
  );
}
