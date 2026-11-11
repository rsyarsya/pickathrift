"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

export function Gallery({
  images,
  name,
  dimmed,
}: {
  images: string[];
  name: string;
  dimmed: boolean;
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-12">
      <Image
        src={images[active] ?? images[0]!}
        alt={name}
        width={1280}
        height={1120}
        sizes="(min-width: 1024px) 640px, 100vw"
        priority
        className={cn(
          "aspect-[8/7] w-full rounded-[8px] bg-subtle object-cover",
          dimmed && "opacity-50",
        )}
      />
      {images.length > 1 && (
        <ul className="flex gap-10" aria-label="Foto lain">
          {images.map((src, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Foto ${i + 1} dari ${images.length}`}
                aria-current={i === active}
                className={cn(
                  "block overflow-hidden rounded-sm border-2",
                  i === active ? "border-fg" : "border-transparent hover:border-line-strong",
                )}
              >
                <Image
                  src={src}
                  alt=""
                  width={176}
                  height={176}
                  className="size-64 object-cover md:size-88"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
