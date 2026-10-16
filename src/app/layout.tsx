import type { Metadata } from "next";
import "@fontsource/rubik/arabic-400.css";
import "@fontsource/rubik/arabic-500.css";
import "@fontsource/rubik/arabic-600.css";
import "@fontsource/rubik/arabic-700.css";
import "@fontsource/rubik/400.css";
import "@fontsource/rubik/500.css";
import "@fontsource/rubik/600.css";
import "@fontsource/rubik/700.css";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "سرج العقارية | أرضك في الرياض",
  description: "علّمنا وش ناوي تبني، ونطلع لك الأراضي اللي تناسبك من ١٢٠ أرض في ٨٨ حي بالرياض.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
