// Stage 1 P2 — first-class provenance badge for library / practice /
// review. Renders nothing when the item carries no sourceKind (no
// provenance claimed). Localization Pass 1 — the badge label/detail
// follow the site language via provenanceBadge(item, lang); the
// component is a client component (it is only used from client pages).
// Step 2a — renders through the semantic StatusBadge (text + icon +
// explanation; tone per meaning). The old .badge tone classes are gone
// from this component: "official" is the only success-green tone,
// concept-extracted uses the extracted tone, proxy/partial keep their
// own tones.
"use client";

import { provenanceBadge, type BadgeTone, type SourceKind } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { StatusBadge } from "./StatusBadges";

const KIND_TONE: Record<SourceKind, BadgeTone> = {
  official: "official",
  "concept-extracted": "extracted",
  proxy: "proxy",
  partial: "partial",
};

export default function ProvenanceBadge({
  source,
  sourceKind,
  syllabusClause,
}: {
  source?: string | null;
  sourceKind?: SourceKind;
  syllabusClause?: string;
}) {
  const { lang } = useLang();
  const badge = provenanceBadge({ source, sourceKind, syllabusClause }, lang);
  if (!badge || !sourceKind) return null;
  return <StatusBadge label={badge.label} detail={badge.detail} tone={KIND_TONE[sourceKind]} />;
}
