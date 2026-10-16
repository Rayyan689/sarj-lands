import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "لوحة الإدارة | سرج العقارية",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
