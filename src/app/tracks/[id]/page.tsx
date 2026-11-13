// Track detail — /tracks/[id]
// Localization Pass 1 — converted to a client component (useParams
// instead of the async params prop) so the UI strings can go through
// i18n.tsx. Track content stays English (see LOCALIZATION-PLAN.md)
// and is bidi-isolated.
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MOCKS, TRACKS } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { TrackConfidenceBadge } from "@/components/StatusBadges";

export default function TrackDetail() {
  const { t, tf } = useLang();
  const params = useParams();
  const id = String(params.id ?? "");
  const tr = TRACKS.find((t) => t.id === id);
  if (!tr) {
    return (
      <div>
        <h1>{t("trackNotFound")}</h1>
        <p>
          <Link href="/tracks">{t("backToTracks")}</Link>
        </p>
      </div>
    );
  }
  const mocks = MOCKS.filter((m) => m.track === tr.id);
  return (
    <div>
      <h1>
        <span dir="auto">{tr.name}</span>{" "}
        <span dir="ltr" className="badge teal">
          {tr.bps}
        </span>
      </h1>
      <div className="card">
        <h3>{t("eligibilityHeading")}</h3>
        <p dir="auto">{tr.elig}</p>
        <h3>{t("patternHeading")}</h3>
        <p dir="auto">{tr.pattern}</p>
        <p>
          {/* Step 2a — semantic confidence badge (see tracks list). */}
          <TrackConfidenceBadge conf={tr.conf} />
        </p>
      </div>
      <h2>{t("mocksForTrack")}</h2>
      {mocks.length === 0 ? (
        <p className="muted">{t("noMockYet")}</p>
      ) : (
        mocks.map((m) => (
          <div className="card" key={m.id}>
            <h3>
              <span dir="auto">{m.title}</span>{" "}
              <span dir="ltr" className="badge teal">
                {m.total} Q
              </span>{" "}
              <span dir="ltr" className="badge grey">
                {tf("minsLabel", { mins: m.minutes })}
              </span>
            </h3>
            <p className="muted">
              <span dir="auto">{m.note}</span>
            </p>
            <Link className="btn" href={`/mock/${m.id}`}>
              {t("startMock")}
            </Link>
          </div>
        ))
      )}
      <p>
        <Link href="/tracks">{t("allTracksLink")}</Link>
      </p>
    </div>
  );
}
