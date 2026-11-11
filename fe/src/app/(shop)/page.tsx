import { CategoryStrip } from "@/modules/home/components/CategoryStrip";
import { Features } from "@/modules/home/components/Features";
import { Hero } from "@/modules/home/components/Hero";
import { WeeklyEdit } from "@/modules/home/components/WeeklyEdit";

/** Landing (Figma "2 Landing D Final"). Versi awal oleh Ola. */
export default function HomePage() {
  return (
    // Semua section di dalam Hero supaya naik menimpa foto yang diam.
    <Hero>
      <WeeklyEdit />
      <CategoryStrip />
      <Features />
    </Hero>
  );
}
