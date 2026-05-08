import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase transition-all focus:outline-none font-mono",
  {
    variants: {
      variant: {
        default: "border-warden-lichen/30 bg-warden-lichen/10 text-warden-lichen glow-primary",
        secondary: "border-warden-moss/30 bg-warden-moss/10 text-warden-bone",
        destructive: "border-red-500/30 bg-red-500/10 text-red-400 glow-red",
        outline: "text-foreground border-border",
        success: "border-warden-lichen/30 bg-warden-lichen/10 text-warden-lichen glow-primary",
        warning: "border-amber-500/30 bg-amber-500/10 text-amber-400 glow-amber",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
