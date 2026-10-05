import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Football Hub", template: "%s | Football Hub" },
  description: "Public football tournament, standings, and live-score dashboard.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-500">Football Hub · REST-authoritative tournament scoring</footer>
      </body>
    </html>
  );
}
