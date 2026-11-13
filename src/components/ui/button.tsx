// shadcn/ui Button (new-york style), adapted for this codebase:
// - Every utility carries the `tw:` prefix (see globals.css — the
//   prefix keeps generated utilities from colliding with the legacy
//   class names .container/.grid/.card/.badge).
// - NO preflight is loaded, so the legacy `button` rule (base layer)
//   still sets border/background/padding. The base classes below
//   therefore carry an explicit transparent border: without it the
//   legacy teal border would show through the ghost/secondary/link
//   variants. The utilities layer wins over the base layer wherever
//   both set the same property.
// - No `asChild` / Radix Slot tonight: links that look like buttons
//   use the exported buttonVariants() directly (see Sidebar). Adding
//   @radix-ui/react-slot is a one-line change for a later batch if a
//   primitive ever needs it.
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "tw:inline-flex tw:items-center tw:justify-center tw:gap-2 tw:whitespace-nowrap tw:rounded-md tw:border tw:border-transparent tw:text-sm tw:font-medium tw:transition-colors tw:disabled:pointer-events-none tw:disabled:opacity-50 tw:[&_svg]:pointer-events-none tw:[&_svg:not([class*='size-'])]:tw:size-4 tw:shrink-0 tw:outline-none tw:focus-visible:border-ring tw:focus-visible:ring-ring/50 tw:focus-visible:ring-[3px] tw:aria-invalid:ring-destructive/20 tw:aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "tw:bg-primary tw:text-primary-foreground tw:shadow-xs tw:hover:bg-primary/90",
        destructive:
          "tw:bg-destructive tw:text-destructive-foreground tw:shadow-xs tw:hover:bg-destructive/90 tw:focus-visible:ring-destructive/20",
        outline:
          "tw:border-input tw:bg-background tw:shadow-xs tw:hover:bg-accent tw:hover:text-accent-foreground",
        secondary: "tw:bg-secondary tw:text-secondary-foreground tw:shadow-xs tw:hover:bg-secondary/80",
        ghost: "tw:hover:bg-accent tw:hover:text-accent-foreground",
        link: "tw:text-primary tw:underline-offset-4 tw:hover:underline",
      },
      size: {
        default: "tw:h-9 tw:px-4 tw:py-2 tw:has-[>svg]:tw:px-3",
        sm: "tw:h-8 tw:rounded-md tw:gap-1.5 tw:px-3 tw:has-[>svg]:tw:px-2.5",
        lg: "tw:h-10 tw:rounded-md tw:px-6 tw:has-[>svg]:tw:px-4",
        icon: "tw:size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button type={type} data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

export { Button, buttonVariants };
