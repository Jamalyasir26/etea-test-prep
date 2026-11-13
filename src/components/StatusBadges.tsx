// Step 2a — semantic status badges. Every badge shows TEXT + an icon,
// with the full explanation as its title tooltip AND its aria-label, so
// meaning never depends on hue alone. Tones come from the semantic
// token system in globals.css (.sbadge-*); distinct meanings never
// share a tone. Owner-reviewed uses the reviewed neutral tone — never
// the success green reserved for genuine official-source confirmation.
"use client";

import {
  BookOpenText,
  CircleHelp,
  Copy,
  PencilLine,
  PieChart,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { reviewStatusBadge, topicBadge, trackConfidenceBadge, type BadgeTone } from "@/lib/data";
import { useLang } from "@/lib/i18n";

const TONE_ICON: Record<BadgeTone, LucideIcon> = {
  draft: PencilLine,
  reviewed: UserCheck,
  proxy: Copy,
  partial: PieChart,
  unknown: CircleHelp,
  official: ShieldCheck,
  topic: Sparkles,
  extracted: BookOpenText,
  error: TriangleAlert,
};

/** Generic semantic badge. `detail` is the plain-language explanation:
 *  visible on hover (title) and announced to screen readers
 *  (aria-label), so the explanation is never hover-only. */
export function StatusBadge({ label, detail, tone }: { label: string; detail: string; tone: BadgeTone }) {
  const Icon = TONE_ICON[tone];
  return (
    <span className={`sbadge sbadge-${tone}`} title={detail} aria-label={`${label}. ${detail}`}>
      <Icon size={12} aria-hidden="true" />
      {label}
    </span>
  );
}

/** Review-status badge for one item (Draft / Owner-reviewed / Approved /
 *  Needs review / Disputed / Unknown). Always renders: every item has
 *  a review status. */
export function ReviewStatusBadge({ status }: { status?: string | null }) {
  const { lang } = useLang();
  const badge = reviewStatusBadge(status, lang);
  return <StatusBadge label={badge.label} detail={badge.detail} tone={badge.tone} />;
}

/** Topic-inspired badge for past-paper-topic items. Renders nothing
 *  when the item carries no pastPaperRef. */
export function TopicBadge({ pastPaperRef }: { pastPaperRef?: string | null }) {
  const { lang } = useLang();
  const badge = topicBadge(pastPaperRef, lang);
  if (!badge) return null;
  return <StatusBadge label={badge.label} detail={badge.detail} tone={badge.tone} />;
}

/** Track confidence badge. The label is the track's stored `conf`
 *  string verbatim; only the tone + explanation are derived. */
export function TrackConfidenceBadge({ conf }: { conf: string }) {
  const { lang } = useLang();
  const badge = trackConfidenceBadge(conf, lang);
  return (
    <span dir="ltr">
      <StatusBadge label={badge.label} detail={badge.detail} tone={badge.tone} />
    </span>
  );
}
