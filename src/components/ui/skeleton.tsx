// shadcn/ui Skeleton (new-york style), adapted for this codebase:
// every utility carries the `tw:` prefix (see globals.css). The pulse
// animation comes from Tailwind's animate-pulse utility; no keyframes
// are defined locally.
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("tw:animate-pulse tw:rounded-md tw:bg-muted", className)} {...props} />;
}

export { Skeleton };
