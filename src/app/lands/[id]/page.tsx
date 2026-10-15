import { notFound } from "next/navigation";
import { byId, parcels } from "@/lib/portfolio";
import ParcelView from "./ParcelView";

export function generateStaticParams() {
  return parcels.map((p) => ({ id: p.parcel_id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = byId((await params).id);
  return { title: p ? `حي ${p.district_ar} | ${p.parcel_id} | سرج العقارية` : "سرج العقارية" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const p = byId((await params).id);
  if (!p) notFound();
  return <ParcelView id={p.parcel_id} />;
}
