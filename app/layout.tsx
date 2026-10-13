import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bendahara — Catatan Keuangan",
  description: "Catat pemasukan dan pengeluaran dengan aman di satu tempat.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
