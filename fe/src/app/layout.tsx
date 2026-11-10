import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Instrument_Serif } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PickaThrift",
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
    <html lang="id" className={`${inter.variable} ${instrumentSerif.variable} antialiased`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
