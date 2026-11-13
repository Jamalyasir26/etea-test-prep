// Post Tracks — 12 visible teaching tracks (7 hidden — see the
// Step 3a visibility list in src/lib/data.ts; hidden data stays in
// content.json and can be shown again with a one-line change).
// Localization Pass 1 — converted to a client component so the UI
// strings can go through i18n.tsx (first render is English on server
// and client, then the stored language applies after mount — no new
// hydration risk). Track names/patterns/confidence stay English
// (content — see LOCALIZATION-PLAN.md) and are bidi-isolated.
"use client";

import Link from "next/link";
import { VISIBLE_MOCKS, PATTERN_BANNER, VISIBLE_TRACKS } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { TrackConfidenceBadge } from "@/components/StatusBadges";

export default function Tracks() {
  const { t, tf } = useLang();
  return (
    <div>
      <h1>{t("tracks")}</h1>
      <div className="alert">
        <b>
          <span dir="ltr">{PATTERN_BANNER}</span>
        </b>
      </div>
      {/* Step 3a — the teaching-only scope is stated plainly, with a
          link to the vacancy coverage ledger on the Vacancies page. */}
      <p className="muted">{t("teachingOnlyNote")}</p>
      <p>
        <Link href="/vacancies#ledger">{t("tracksLedgerLink")}</Link>
      </p>
      {VISIBLE_TRACKS.map((tr) => {
        const mocks = VISIBLE_MOCKS.filter((m) => m.track === tr.id);
        return (
          <div className="card" key={tr.id}>
            <h3>
              <Link href={`/tracks/${tr.id}`}>
                <span dir="auto">{tr.name}</span>
              </Link>{" "}
              <span dir="ltr" className="badge teal">
                {tr.bps}
              </span>
            </h3>
            <p className="muted">
              <span dir="auto">{tr.pattern}</span>
            </p>
            <p>
              {/* Step 2a — the conf string is shown verbatim, but the
                  tone is semantic: source-confirmed (official) only
                  when a named official source is cited; partial when
                  part is NOT VERIFIED; unknown for JOB-SITE-only.
                  The old green/red merge is gone. */}
              <TrackConfidenceBadge conf={tr.conf} />
              {mocks.length > 0 && (
                <span className="muted"> · {tf("mocksCount", { n: mocks.length })}</span>
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}
