import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-opacity transition-transform duration-(--motion-quick,150ms) disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:opacity-90",
        secondary: "bg-bg-subtle text-fg border border-border hover:border-border-strong",
        ghost: "text-fg-muted hover:text-fg hover:bg-bg-subtle",
        danger: "bg-danger text-fg hover:opacity-90",
        fold: "bg-bg-subtle text-fg border border-border hover:border-danger",
        call: "bg-accent text-accent-fg hover:opacity-90",
        raise: "bg-fg text-accent-fg hover:opacity-90",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-sm",
        md: "h-11 px-4 text-sm rounded-md",
        lg: "h-12 px-5 text-base rounded-md",
        xl: "h-14 px-6 text-base rounded-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
