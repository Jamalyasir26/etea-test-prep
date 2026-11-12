// Mock Tests — list of all 20 mocks / practice tests.
"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCKS, PATTERN_BANNER, trustedOnlyCount } from "@/lib/data";
import { loadReviews } from "@/lib/tracking";
import { DEFAULT_SCORING, scoringLabel, type ScoringConfig } from "@/lib/scoring";

export default function MockList() {
  // Provisional = today's behaviour: mocks built from the full bank, which
  // is unreviewed AI-generated practice material. Trusted = reviewed items
  // only (never silently filled with unreviewed items).
  const [mode, setMode] = useState<"provisional" | "trusted">("provisional");
  // Stage 1 P0.2 — the owner's local review decisions. Trusted counts are
  // computed against these overrides, so a Verify on /review immediately
  // unlocks the item in Trusted Mode.
  const [reviews] = useState(() => loadReviews());
  const overrides: Record<string, string> = {};
  for (const [qid, r] of Object.entries(reviews)) overrides[qid] = r.reviewStatus;
  // Stage 1 P0.1 — per-mock scoring override for this run only. "default"
  // = the mock's own config (or the zero-penalty default, policy unknown).
  // "zero" / "0.25" override it for this run; the choice is carried in the
  // Start link's ?penalty= query param and actually changes the score.
  const [penaltyOverride, setPenaltyOverride] = useState<Record<string, string>>({});

  function mockScoring(m: (typeof MOCKS)[number]): ScoringConfig {
    return m.scoring ?? DEFAULT_SCORING;
  }
  function startHref(m: (typeof MOCKS)[number]): string {
    const base = `/mock/${m.id}${mode === "trusted" ? "?mode=trusted" : ""}`;
    const ov = penaltyOverride[m.id];
    if (!ov || ov === "default") return base;
    return `${base}${mode === "trusted" ? "&" : "?"}penalty=${ov}`;
  }

  return (
    <div>
      <h1>Mock Tests</h1>
      <div className="alert">
        <b>{PATTERN_BANNER}</b>
      </div>
      <p className="muted">
        Each mock states which pattern variant it follows. ZamungKor mocks are disjoint (no question
        repeats across them). Track mocks draw from the <b>shared practice bank</b> — questions may
        repeat across track mocks; this is stated on each mock because the 645-question bank cannot
        supply 8+ disjoint 100-question mocks. All mocks are <b>practice mocks, not official ETEA
        papers</b>.
      </p>
      <p className="muted">
        Mocks are <b>provisional practice</b> built from unreviewed AI-generated questions.
        <b> Trusted mode</b> uses reviewed questions only and returns fewer questions when not
        enough have been reviewed yet — it never fills the gap with unreviewed items.
      </p>
      {/* Stage 1 P1 Tier 4 (B01) — the two long mode buttons overflowed at
          360px without wrapping; they now stack instead of running off-screen. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }} role="group" aria-label="Mock mode">
        <button
          className={mode === "provisional" ? "" : "secondary"}
          onClick={() => setMode("provisional")}
          aria-pressed={mode === "provisional"}
        >
          Provisional (all questions)
        </button>
        <button
          className={mode === "trusted" ? "" : "secondary"}
          onClick={() => setMode("trusted")}
          aria-pressed={mode === "trusted"}
        >
          Trusted (reviewed only)
        </button>
      </div>
      {MOCKS.map((m) => {
        const trusted = trustedOnlyCount(m, overrides);
        const trustedDisabled = mode === "trusted" && trusted === 0;
        return (
          <div className="card" key={m.id}>
            <h3>
              {m.title}{" "}
              <span className="badge teal">{m.total} Q</span>
              <span className="badge grey">{m.minutes} min</span>
            </h3>
            <p className="muted">{m.note}</p>
            <p className="muted">
              {trusted > 0 ? (
                <>
                  {/* Stage 1 P1 Tier 4 (B03) — count isolated LTR so it
                      cannot reverse in RTL (Urdu) mode. */}
                  <span dir="ltr">
                    {trusted} of {m.total}
                  </span>{" "}
                  reviewed questions available in Trusted mode.
                </>
              ) : (
                "No reviewed questions yet — provisional practice only."
              )}
            </p>
            <p className="muted">
              Scoring: {scoringLabel(mockScoring(m))}
              {m.scoring
                ? " — this mock's own config."
                : " — ETEA has published no negative-marking policy for these projects."}
            </p>
            <label>
              <span className="muted">Scoring for this run: </span>
              <select
                aria-label={`Scoring for ${m.title}`}
                value={penaltyOverride[m.id] ?? "default"}
                onChange={(e) =>
                  setPenaltyOverride((prev) => ({ ...prev, [m.id]: e.target.value }))
                }
              >
                <option value="default">Mock default ({scoringLabel(mockScoring(m))})</option>
                <option value="zero">No penalty (policy unknown)</option>
                <option value="0.25">−0.25 per wrong answer (unverified assumption)</option>
              </select>
            </label>
            {trustedDisabled ? (
              <button className="btn" disabled>
                Start mock (Trusted)
              </button>
            ) : (
              <Link
                className="btn"
                href={startHref(m)}
              >
                Start mock{mode === "trusted" ? " (Trusted)" : ""}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
