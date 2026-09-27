import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dorixona Boshqaruv Tizimi | SaaS",
  description: "Ko‘p dorixonali zamonaviy dorixona boshqaruv platformasi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body className="min-h-screen bg-slate-50 text-slate-700 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
