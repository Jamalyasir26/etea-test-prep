// Class-name helper (shadcn/ui convention): clsx for conditional
// classes + tailwind-merge for conflicting Tailwind utilities.
//
// PREFIX NOTE (verified empirically, 2026-11-12): the site uses
// Tailwind v4's `prefix(tw)` namespace syntax (tw:flex, tw:bg-...).
// Plain twMerge handles this correctly — it treats `tw:` as a
// variant-like segment and dedupes conflicts (twMerge("tw:p-4 tw:p-8")
// === "tw:p-8"). Do NOT switch to extendTailwindMerge({ prefix }):
// that option is for the v3 dash-prefix (tw-flex) and BREAKS
// deduping for the v4 namespace syntax (verified: it kept both
// conflicting classes).
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
