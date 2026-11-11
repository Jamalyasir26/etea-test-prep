// Mock Tests — list of all 20 mocks / practice tests.
"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCKS, PATTERN_BANNER, trustedOnlyCount } from "@/lib/data";

export default function MockList() {
  // Provisional = today's behaviour: mocks built from the full bank, which
  // is unreviewed AI-generated practice material. Trusted = reviewed items
  // only (never silently filled with unreviewed items).
  const [mode, setMode] = useState<"provisional" | "trusted">("provisional");

  return (
    <div>
      <h1>Mock Tests</h1>
      <div className="alert">
        <b>{PATTERN_BANNER}</b>
      </div>
      <p className="muted">
        Each mock states which pattern variant it follows. ZamungKor mocks are disjoint (no question
        repeats across them). Track mocks draw from the <b>shared practice bank</b> — questions may
        repeat across track mocks; this is stated on each mock because the 590-question bank cannot
        supply 8+ disjoint 100-question mocks. All mocks are <b>practice mocks, not official ETEA
        papers</b>.
      </p>
      <p className="muted">
        Mocks are <b>provisional practice</b> built from unreviewed AI-generated questions.
        <b> Trusted mode</b> uses reviewed questions only and returns fewer questions when not
        enough have been reviewed yet — it never fills the gap with unreviewed items.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }} role="group" aria-label="Mock mode">
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
        const trusted = trustedOnlyCount(m);
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
              {trusted > 0
                ? `${trusted} of ${m.total} reviewed questions available in Trusted mode.`
                : "No reviewed questions yet — provisional practice only."}
            </p>
            {trustedDisabled ? (
              <button className="btn" disabled>
                Start mock (Trusted)
              </button>
            ) : (
              <Link
                className="btn"
                href={mode === "trusted" ? `/mock/${m.id}?mode=trusted` : `/mock/${m.id}`}
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
