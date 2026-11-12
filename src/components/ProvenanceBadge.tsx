// Stage 1 P2 — first-class provenance badge for library / practice /
// review. Renders nothing when the item carries no sourceKind (no
// provenance claimed). Localization Pass 1 — the badge label/detail
// follow the site language via provenanceBadge(item, lang); the
// component is a client component (it is only used from client pages).
"use client";

import { provenanceBadge, type SourceKind } from "@/lib/data";
import { useLang } from "@/lib/i18n";

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
  if (!badge) return null;
  return (
    <span className={`badge ${badge.tone}`} title={badge.detail}>
      {badge.label}
    </span>
  );
}
