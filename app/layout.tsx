import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Portal Rasmi | SMK Agama Pahang",
  applicationName: "SMKAP Digital",
  description:
    "Pusat sehenti urusan OPR, keberadaan, relief, pelawat dan pengurusan SMK Agama Pahang, Muadzam Shah.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "48x48" }],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#061520",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ms">
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
