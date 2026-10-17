import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { portfolio } from "@/lib/portfolio";
import { loadListings } from "@/lib/listings";
import ParcelView from "./ParcelView";

const original = (id: string) => portfolio.parcels.find((p) => p.parcel_id.toLowerCase() === id.toLowerCase());

export function generateStaticParams() {
  return portfolio.parcels.map((p) => ({ id: p.parcel_id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = original((await params).id);
  return { title: p ? `حي ${p.district_ar} | ${p.parcel_id} | سرج العقارية` : "أرض جديدة | سرج العقارية" };
}

/** Properties added from the admin panel live in the database, so they're looked up per visit. */
async function Added({ id }: { id: string }) {
  await connection();
  const p = (await loadListings()).find((x) => x.parcel_id.toLowerCase() === id.toLowerCase());
  if (!p) notFound();
  const { archived: _a, created_at: _c, ...parcel } = p;
  return <ParcelView id={parcel.parcel_id} extra={parcel} />;
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = original(id);
  if (p) return <ParcelView id={p.parcel_id} />;
  if (!/^SRE-\d{3,4}$/i.test(id)) notFound();
  return <Added id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Content params={params} />
    </Suspense>
  );
}
