import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Portal Rasmi | SMK Agama Pahang",
  description:
    "Pusat sehenti urusan OPR, keberadaan, relief, pelawat dan pengurusan SMK Agama Pahang, Muadzam Shah.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Portal Rasmi SMK Agama Pahang",
    description: "Satu portal. Semua urusan sekolah.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Portal Rasmi SMK Agama Pahang",
    description: "Satu portal. Semua urusan sekolah.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ms">
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
