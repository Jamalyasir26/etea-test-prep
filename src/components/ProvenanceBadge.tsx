// Stage 1 P2 — first-class provenance badge for library / practice /
// review. Renders nothing when the item carries no sourceKind (no
// provenance claimed). Pure presentational component: no hooks, no
// storage, safe to render on the server and the client identically.
import { provenanceBadge, type SourceKind } from "@/lib/data";

export default function ProvenanceBadge({
  source,
  sourceKind,
  syllabusClause,
}: {
  source?: string | null;
  sourceKind?: SourceKind;
  syllabusClause?: string;
}) {
  const badge = provenanceBadge({ source, sourceKind, syllabusClause });
  if (!badge) return null;
  return (
    <span className={`badge ${badge.tone}`} title={badge.detail}>
      {badge.label}
    </span>
  );
}
