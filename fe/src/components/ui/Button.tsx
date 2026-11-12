import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "danger";
type Size = "lg" | "md" | "sm";

const variants: Record<Variant, string> = {
  primary: "bg-fg text-night-fg hover:bg-black disabled:bg-disabled disabled:text-disabled-fg",
  outline:
    "border-[1.5px] border-fg text-fg hover:bg-fg/5 disabled:border-disabled disabled:text-disabled-fg",
  danger:
    "bg-danger text-night-fg hover:bg-danger/90 disabled:bg-disabled disabled:text-disabled-fg",
};

const sizes: Record<Size, string> = {
  lg: "px-22 py-16 text-base",
  md: "px-22 py-12 text-sm",
  sm: "px-18 py-10 text-sm",
};

/** Kelas tombol pil, dipakai bersama oleh <Button> dan <ButtonLink>. */
export function buttonClass(variant: Variant = "primary", size: Size = "lg", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-8 rounded-full font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
