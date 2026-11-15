import Image from "next/image";

const STEPS = [
  "Bentangkan atasan favoritmu di lantai, rapikan.",
  "Lebar dada: ketiak kiri ke ketiak kanan.",
  "Panjang: jahitan bahu sampai ujung bawah.",
];

/** Kartu "Cara mengukur" di samping form B4. */
export function MeasuringGuide() {
  return (
    <div className="flex flex-col gap-16 rounded-[12px] bg-mint p-24">
      <Image
        src="/guides/cara-mengukur-kaos.jpg"
        alt="Kaos putih terbentang dengan meteran di garis dada"
        width={1600}
        height={1195}
        sizes="(min-width: 1024px) 40vw, 100vw"
        className="h-auto w-full rounded-[8px]"
      />
      <h2 className="text-[22px] font-medium tracking-[-0.02em]">Cara mengukur</h2>
      <ol className="flex flex-col gap-16">
        {STEPS.map((step, i) => (
          <li key={step} className="flex gap-10 text-sm leading-[1.45]">
            <span className="font-mono text-caption font-medium">{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
