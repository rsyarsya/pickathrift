import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { DM_Mono, Instrument_Sans } from "next/font/google";
import "@/styles/globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "PickaThrift", template: "%s · PickaThrift" },
  description:
    "Toko thrift dengan satu unit per produk, jadi tidak ada dua pembeli untuk satu barang.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${instrumentSans.variable} ${dmMono.variable} antialiased`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
