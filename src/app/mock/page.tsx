// Mock Tests — list of all 20 mocks / practice tests.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MOCKS, PATTERN_BANNER, mockLabels } from "@/lib/data";
import { lri, useLang } from "@/lib/i18n";
import { loadReviews, type ReviewRecord } from "@/lib/tracking";
import { DEFAULT_SCORING, localizedScoringLabel, type ScoringConfig } from "@/lib/scoring";
import { StatusBadge } from "@/components/StatusBadges";

export default function MockList() {
  const { lang, t, tf } = useLang();
  // Provisional = today's behaviour: mocks built from the full bank, which
  // is unreviewed AI-generated practice material. Trusted = reviewed items
  // only (never silently filled with unreviewed items).
  const [mode, setMode] = useState<"provisional" | "trusted">("provisional");
  // Stage 1 P0.2 — the owner's local review decisions. Trusted counts are
  // computed against these overrides, so a Verify on /review immediately
  // unlocks the item in Trusted Mode.
  // Stage 1 P2 (B07) — loaded after mount, not in the state initializer:
  // loadReviews() returns {} during SSR but the stored decisions on the
  // client, which mismatched the prerendered trusted counts whenever a
  // local decision existed.
  const [reviews, setReviews] = useState<Record<string, ReviewRecord>>({});
  useEffect(() => {
    setReviews(loadReviews());
  }, []);
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
      <h1>{t("mocks")}</h1>
      <div className="alert">
        {/* Factual banner stays English (precision); isolated LTR so its
            punctuation cannot jump in RTL mode. */}
        <b>
          <span dir="ltr">{PATTERN_BANNER}</span>
        </b>
      </div>
      <p className="muted">
        {t("mockIntroA")} <b>{t("mockIntroB")}</b> {t("mockIntroC")} <b>{t("mockIntroD")}</b>
      </p>
      <p className="muted">
        {t("mockProv1")} <b>{t("trustedModeLabel")}</b> {t("mockProv2")}
      </p>
      {/* Stage 1 P1 Tier 4 (B01) — the two long mode buttons overflowed at
          360px without wrapping; they now stack instead of running off-screen. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }} role="group" aria-label={t("mockModeGroup")}>
        <button
          className={mode === "provisional" ? "" : "secondary"}
          onClick={() => setMode("provisional")}
          aria-pressed={mode === "provisional"}
        >
          {t("provisionalMode")}
        </button>
        <button
          className={mode === "trusted" ? "" : "secondary"}
          onClick={() => setMode("trusted")}
          aria-pressed={mode === "trusted"}
        >
          {t("trustedMode")}
        </button>
      </div>
      {MOCKS.map((m) => {
        const labels = mockLabels(m, overrides);
        const trusted = labels.trusted;
        const trustedDisabled = mode === "trusted" && trusted === 0;
        return (
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
            {/* Step 2b — labels from REAL counts (mockLabels in data.ts;
                supersedes the Step 2a trusted-coverage badges, which
                showed the same numbers in a different framing):
                Full / Partial / Proxy for availability, Reviewed
                subset when trusted mode is a true subset (full review
                is stated by the trusted-count line below), and
                Scoring policy unknown when the mock has no own scoring
                config. ETEA and KPPSC patterns are never merged: the
                variant is the mock's own stored string, shown by the
                pre-start disclosure verbatim. */}
            <p>
              {labels.coverage === "proxy" ? (
                <StatusBadge label={t("mockLabelProxy")} detail={t("mockLabelProxyDetail")} tone="proxy" />
              ) : labels.coverage === "full" ? (
                <StatusBadge
                  label={t("mockLabelFull")}
                  detail={tf("mockLabelFullDetail", { total: m.total })}
                  tone="reviewed"
                />
              ) : (
                <StatusBadge
                  label={t("mockLabelPartial")}
                  detail={tf("mockLabelPartialDetail", { n: labels.available, total: m.total })}
                  tone="partial"
                />
              )}
              {trusted > 0 && trusted < m.total && (
                <StatusBadge
                  label={t("mockLabelReviewedSubset")}
                  detail={tf("mockLabelReviewedSubsetDetail", { n: trusted, total: m.total })}
                  tone="partial"
                />
              )}
              {labels.scoringUnknown && (
                <StatusBadge label={t("mockScoringUnknown")} detail={t("mockScoringUnknownDetail")} tone="unknown" />
              )}
            </p>
            <p className="muted">
              <span dir="auto">{m.note}</span>
            </p>
            <p className="muted">
              {trusted > 0 ? (
                <>
                  {/* Stage 1 P1 Tier 4 (B03) — count isolated LTR so it
                      cannot reverse in RTL (Urdu) mode. */}
                  <span dir="ltr">
                    {trusted} of {m.total}
                  </span>{" "}
                  {t("trustedAvailableRest")}
                </>
              ) : (
                t("noReviewedYet")
              )}
            </p>
            <p className="muted">
              {t("scoringWord")} {localizedScoringLabel(mockScoring(m), lang)}
              {m.scoring ? t("mockOwnConfig") : t("noPolicyNote")}
            </p>
            <label>
              <span className="muted">{t("scoringForRun")}</span>
              <select
                aria-label={tf("scoringForAria", { title: lri(m.title) })}
                value={penaltyOverride[m.id] ?? "default"}
                onChange={(e) =>
                  setPenaltyOverride((prev) => ({ ...prev, [m.id]: e.target.value }))
                }
              >
                <option value="default">
                  {tf("scoringDefaultOption", { label: localizedScoringLabel(mockScoring(m), lang) })}
                </option>
                <option value="zero">{t("scoringZeroOption")}</option>
                <option value="0.25">{t("scoringPenaltyOption")}</option>
              </select>
            </label>
            {trustedDisabled ? (
              <button className="btn" disabled>
                {t("startMockTrusted")}
              </button>
            ) : (
              <Link
                className="btn"
                href={startHref(m)}
              >
                {/* Step 2b — reviewed subsets get the explicit CTA with
                    the real X/Y; full trusted sets and provisional mode
                    keep the existing labels. */}
                {mode === "trusted" && trusted < m.total
                  ? tf("startReviewedPractice", { n: trusted, total: m.total })
                  : mode === "trusted"
                    ? t("startMockTrusted")
                    : t("startMock")}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
