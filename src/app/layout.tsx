import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "سرج العقارية | أراضٍ في الرياض",
  description: "أخبرنا بما تريد بناءه ونريك الأراضي المناسبة من محفظة سرج العقارية: 120 أرضاً في 88 حياً بالرياض.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;500;600;700&family=Reem+Kufi:wght@500;600;700&display=swap" />
      </head>
      <body className="min-h-full flex flex-col">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
