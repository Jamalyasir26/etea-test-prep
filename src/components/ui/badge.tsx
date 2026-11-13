// shadcn/ui Badge (new-york style), adapted for this codebase: every
// utility carries the `tw:` prefix (see globals.css). Two deliberate
// deviations from the canonical shadcn badge, both for consistency
// with this site:
// - Rounded-full (pill) instead of rounded-md, matching the legacy
//   `.badge` look used across the existing pages.
// - The destructive variant uses text-destructive-foreground instead
//   of white: in dark mode the destructive surface is the bright red
//   from the site's own B04 contrast audit, whose passing foreground
//   is the dark #3d0a06 (white on it would fail contrast).
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "tw:inline-flex tw:items-center tw:justify-center tw:rounded-full tw:border tw:px-2 tw:py-0.5 tw:text-xs tw:font-medium tw:w-fit tw:whitespace-nowrap tw:shrink-0 tw:[&>svg]:tw:size-3 tw:gap-1 tw:[&>svg]:tw:pointer-events-none tw:focus-visible:border-ring tw:focus-visible:ring-ring/50 tw:focus-visible:ring-[3px] tw:aria-invalid:ring-destructive/20 tw:aria-invalid:border-destructive tw:transition-[color,box-shadow] tw:overflow-hidden",
  {
    variants: {
      variant: {
        default: "tw:border-transparent tw:bg-primary tw:text-primary-foreground tw:[a&]:hover:bg-primary/90",
        secondary: "tw:border-transparent tw:bg-secondary tw:text-secondary-foreground tw:[a&]:hover:bg-secondary/90",
        destructive:
          "tw:border-transparent tw:bg-destructive tw:text-destructive-foreground tw:[a&]:hover:bg-destructive/90 tw:focus-visible:ring-destructive/20",
        outline: "tw:border-border tw:text-foreground tw:[a&]:hover:bg-accent tw:[a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
