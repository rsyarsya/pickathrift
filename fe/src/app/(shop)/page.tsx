import { FeatureSection } from "@/modules/home/components/FeatureSection";
import { Hero } from "@/modules/home/components/Hero";
import { WeeklyEdit } from "@/modules/home/components/WeeklyEdit";

/** Landing. Desain dan isi awal oleh Ola (branch frontend/ola-landing-page). */
export default function HomePage() {
  return (
    <>
      <Hero />
      <WeeklyEdit />
      <FeatureSection
        id="cari-yang-cocok-title"
        overline="TEMUKAN GAYAMU"
        title="Cari yang Cocok"
        description="Bingung memilih pakaian thrift? Temukan pilihan yang sesuai dengan gaya, ukuran, dan preferensimu."
        cta={{ label: "Cari yang cocok →", href: "/cari-yang-cocok" }}
        image={{
          src: "/images/cari-yang-cocok.png",
          alt: "Pilihan pakaian thrift untuk menemukan gaya yang cocok",
        }}
        imageBg="bg-mint"
      />
      <FeatureSection
        id="meja-perbandingan-title"
        overline="BANDINGKAN PILIHANMU"
        title="Meja Perbandingan"
        description="Punya beberapa pilihan pakaian favorit? Bandingkan harga, ukuran, kondisi, dan detail produk dalam satu tempat sebelum menentukan pilihan terbaikmu."
        cta={{ label: "Mulai bandingkan →", href: "/meja-perbandingan" }}
        image={{
          src: "/images/meja-perbandingan.png",
          alt: "Pilihan jaket thrift untuk dibandingkan",
        }}
        imageSide="right"
        tone="canvas"
      />
    </>
  );
}
