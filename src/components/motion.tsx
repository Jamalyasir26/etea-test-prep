// Motion helpers — Stage 3 part 2 (motion 14.12.0, package "motion").
// All animation goes through here so the reduced-motion rule is
// enforced in exactly one place: when the user prefers reduced
// motion, every helper renders a plain <div> with NO animation
// (no fade, no slide, no flip). Never animate around this file.
//
// PageFade: the route-change entrance for the shell's <main> — a
// short fade + 6px rise, re-run on every navigation (keyed by
// pathname in AppShell). Deliberately entrance-only: no
// AnimatePresence exit (an exit would delay the new page appearing).
// FadeIn: the same entrance for cards/sections, with an optional
// stagger delay (home Command Center).
"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

const ENTER = { opacity: 0, y: 6 };
const SHOWN = { opacity: 1, y: 0 };

export function PageFade({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div initial={ENTER} animate={SHOWN} transition={{ duration: 0.25, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={ENTER}
      animate={SHOWN}
      transition={{ duration: 0.25, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
