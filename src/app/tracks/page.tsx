// Post Tracks — 19 tracks with BPS, eligibility, pattern, confidence.
// Localization Pass 1 — converted to a client component so the UI
// strings can go through i18n.tsx (first render is English on server
// and client, then the stored language applies after mount — no new
// hydration risk). Track names/patterns/confidence stay English
// (content — see LOCALIZATION-PLAN.md) and are bidi-isolated.
"use client";

import Link from "next/link";
import { MOCKS, PATTERN_BANNER, TRACKS } from "@/lib/data";
import { useLang } from "@/lib/i18n";

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
      {TRACKS.map((tr) => {
        const mocks = MOCKS.filter((m) => m.track === tr.id);
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
              <span
                dir="ltr"
                className={`badge ${tr.conf.includes("NOT VERIFIED") || tr.conf.includes("JOB-SITE") ? "red" : "green"}`}
              >
                {tr.conf}
              </span>
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
