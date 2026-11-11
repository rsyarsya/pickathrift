import type { SVGProps } from "react";

/*
 * Ikon di Figma adalah ikon Lucide. Path disalin ke sini supaya warnanya ikut
 * currentColor dan tidak perlu satu file SVG per warna.
 */
const paths = {
  search: ["M21 21l-4.34-4.34", "M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"],
  heart: [
    "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
  ],
  bag: ["M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z", "M3 6h18", "M16 10a4 4 0 0 1-8 0"],
  user: ["M17 8A5 5 0 1 1 7 8a5 5 0 0 1 10 0Z", "M20 21a8 8 0 0 0-16 0"],
  check: ["M20 6 9 17l-5-5"],
  clock: ["M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z", "M12 6v6l3 3"],
  tag: [
    "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42Z",
    "M8.5 7.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z",
  ],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  close: ["M18 6 6 18", "M6 6l12 12"],
} as const;

export type IconName = keyof typeof paths;

type IconProps = Omit<SVGProps<SVGSVGElement>, "strokeWidth"> & {
  name: IconName;
  size?: number;
  /** Tebal garis dalam piksel layar, sama dengan angka di Figma. */
  strokeWidth?: number;
  filled?: boolean;
};

export function Icon({ name, size = 16, strokeWidth = 1.6, filled, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {paths[name].map((d) => (
        <path key={d} d={d} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
