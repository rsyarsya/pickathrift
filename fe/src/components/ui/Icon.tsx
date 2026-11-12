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
  eye: [
    "M2.1 12.3a1 1 0 0 1 0-.6 10.6 10.6 0 0 1 19.8 0 1 1 0 0 1 0 .6 10.6 10.6 0 0 1-19.8 0Z",
    "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  ],
  tag: [
    "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42Z",
    "M8.5 7.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z",
  ],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  close: ["M18 6 6 18", "M6 6l12 12"],
  arrowLeft: ["M12 19l-7-7 7-7", "M19 12H5"],
  circle: ["M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"],
  box: [
    "M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z",
    "m3.3 7 8.7 5 8.7-5",
    "M12 22V12",
  ],
  truck: [
    "M1 3h15v13H1z",
    "M16 8h4l3 3v5h-7",
    "M7 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM21 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  ],
  star: [
    "M11.5 2.8a.6.6 0 0 1 1 0l2.8 5.6 6.2.9a.6.6 0 0 1 .3 1l-4.5 4.4 1.1 6.1a.6.6 0 0 1-.8.6L12 18.5l-5.6 2.9a.6.6 0 0 1-.8-.6l1.1-6.1-4.5-4.4a.6.6 0 0 1 .3-1l6.2-.9Z",
  ],
  lock: [
    "M7 11V7a5 5 0 0 1 10 0v4",
    "M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z",
  ],
  list: ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"],
  external: [
    "M15 3h6v6",
    "M10 14 21 3",
    "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
  ],
  eyeOff: [
    "M10.7 5.1A10.7 10.7 0 0 1 21.9 11.7a1 1 0 0 1 0 .7 10.7 10.7 0 0 1-1.4 2.5",
    "M14.1 14.2a3 3 0 0 1-4.3-4.3",
    "M17.5 17.5A10.7 10.7 0 0 1 2.1 12.3a1 1 0 0 1 0-.7 10.7 10.7 0 0 1 4.4-5.1",
    "M2 2l20 20",
  ],
  more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  alert: [
    "M21.7 18 13.7 4a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z",
    "M12 9v4",
    "M12 17h.01",
  ],
  wifiOff: [
    "M12 20h.01",
    "M8.5 16.4a5 5 0 0 1 7 0",
    "M2 8.8a15 15 0 0 1 4.2-2.6",
    "M10.7 5c4-.4 8.1.9 11.3 3.8",
    "M16.9 11.3a10 10 0 0 1 2.2 1.7",
    "M5 13a10 10 0 0 1 5.2-2.8",
    "M2 2l20 20",
  ],
  logOut: ["M16 17l5-5-5-5", "M21 12H9", "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"],
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
