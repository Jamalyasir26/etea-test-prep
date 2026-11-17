// Mock runner — /mock/[id]?mode=trusted|provisional
// Trusted mode passes { trustedOnly: true } to buildMockQuestions: only
// owner-reviewed/approved items are used and the shortfall is NEVER filled,
// so a trusted mock may have fewer questions than the mock's total.
// The question seed comes from the live session (if one exists for this
// scope) so a reload resumes the SAME questions; otherwise a fresh seed is
// used and QuizRunner persists it in the session. QuizRunner is keyed by
// scope so switching modes remounts it instead of leaking state.
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { buildMockQuestions, isTrusted, resolveMockView, VISIBLE_MOCKS, trustedOnlyCount, type Question } from "@/lib/data";
import { lri, useLang } from "@/lib/i18n";
import { loadReviews, loadSession } from "@/lib/tracking";
import { localizedScoringLabel, resolveScoring } from "@/lib/scoring";
import QuizRunner from "@/components/QuizRunner";

function MockRunInner() {
  const { lang, t, tf } = useLang();
  const params = useParams();
  const search = useSearchParams();
  const id = String(params.id ?? "");
  // Step 3a — hidden mocks resolve to the not-found screen below
  // (same behaviour as an unknown id): they are hidden everywhere
  // users browse, including direct navigation.
  const mock = VISIBLE_MOCKS.find((m) => m.id === id);
  const trustedOnly = search.get("mode") === "trusted";
  const scope = `mock:${id}:${trustedOnly ? "trusted" : "provisional"}`;
  // Stage 1 P0.2 — the owner's local review decisions. Trusted Mode fills
  // only from items the owner verified; the same overrides drive the
  // "Provisional — not verified" badge on the results screen.
  const [reviews] = useState(() => loadReviews());
  const overrides: Record<string, string> = {};
  for (const [qid, r] of Object.entries(reviews)) overrides[qid] = r.reviewStatus;
  // Stage 1 P0.1 — the mock page's ?penalty= override ("zero" / "0.25"),
  // resolved against this mock's own config (or the zero-penalty default).
  const { config: scoring, source: scoringSource } = resolveScoring(
    mock?.scoring,
    search.get("penalty"),
  );

  const [questionSeed] = useState(() => {
    const live = loadSession(scope);
    return live?.questionSeed ? live.questionSeed : String(Date.now());
  });
  // Lazy banks: the mock's questions build async (sampling waits for
  // the needed bank chunks); QuizRunner mounts only once they arrive.
  // A failed load shows a failure state with retry instead of a blank
  // page. `overrides` is intentionally excluded from the deps (same as
  // the old useMemo): reviews load once, before first paint here.
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [trustedCount, setTrustedCount] = useState(0);
  const [bankError, setBankError] = useState<"offline" | "error" | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  useEffect(() => {
    let live = true;
    setQuestions(null);
    setBankError(null);
    if (mock) {
      Promise.all([
        buildMockQuestions(mock, questionSeed, { trustedOnly, overrides }),
        trustedOnlyCount(mock, overrides),
      ]).then(
        ([qs, n]) => {
          if (live) {
            setQuestions(qs);
            setTrustedCount(n);
          }
        },
        () => {
          if (live)
            setBankError(
              typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error",
            );
        },
      );
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mock, questionSeed, trustedOnly, retryNonce]);
  const allItemsVerified =
    (questions?.length ?? 0) > 0 && (questions ?? []).every((q) => isTrusted(q, overrides));

  if (!mock) {
    return (
      <div>
        <h1>{t("mockNotFound")}</h1>
        <p>
          <Link href="/mock">{t("backToMocks")}</Link>
        </p>
      </div>
    );
  }
  // Phase 2 — title/note resolve into the chosen language
  // (item-level fallback); variant/comp/seeds are untouched.
  const view = resolveMockView(mock, lang);
  // Stage 1 P1 Tier 4 (B03) — the trusted-only counts are isolated LTR
  // so they cannot reverse in RTL (Urdu) mode; the note prop is a
  // ReactNode for exactly this reason (see QuizRunner Props).
  // Phase 2 — the mock note renders in the chosen language, isolated
  // with dir="auto"; the scoring note is JSX so the (English) policy
  // note can be isolated LTR while the label is translated.
  const note = trustedOnly ? (
    <>
      {t("trustedOnlyLabel")}{" "}
      {tf("ofCount", { a: lri(String(questions?.length ?? 0)), b: lri(String(mock.total)) })}{" "}
      {t("trustedNoteRest")} —{" "}
      <span dir="ltr">{trustedCount}</span> {t("reviewedWord")}{" "}
      {t("trustedNoteInMock")}{lang === "ur" ? "۔" : "."} {t("trustedNoteShortfall")} <span dir="auto">{view.note}</span>
    </>
  ) : (
    <span dir="auto">{view.note}</span>
  );
  const scoringNote = (
    <>
      {t("scoringForRun")} {localizedScoringLabel(scoring, lang)}
      {scoringSource === "override-zero" || scoringSource === "override-penalty" ? t("overrideSuffix") : ""}
      {" "}
      <span dir="ltr">{scoring.policyNote}</span>
    </>
  );
  // Step 2b — pre-start disclosure extras: the ACTUAL subject
  // allocation of the built question set (grouped from the real
  // questions, in bank order), shown on QuizRunner's disclosure
  // screen. The pattern identity is the mock's stored variant string,
  // shown verbatim — ETEA and KPPSC variants are never merged.
  const allocation = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of questions ?? []) m.set(q.subject, (m.get(q.subject) ?? 0) + 1);
    return [...m.entries()];
  }, [questions]);
  if (bankError !== null) {
    return (
      <div>
        <h1>{view.title}</h1>
        <div className="alert">
          <p>{t(bankError === "offline" ? "bankLoadFailedOffline" : "bankLoadFailed")}</p>
          <button className="secondary" onClick={() => setRetryNonce((n) => n + 1)}>
            {t("retryButton")}
          </button>
        </div>
        <p>
          <Link href="/mock">{t("backToMocks")}</Link>
        </p>
      </div>
    );
  }
  if (questions === null) {
    return (
      <div>
        <h1>{view.title}</h1>
        <p className="muted" role="status">{t("loading")}</p>
      </div>
    );
  }
  const disclosureExtra = (
    <>
      <p>
        <b>{t("prestartAllocation")}:</b>
      </p>
      <ul style={{ marginTop: 0 }}>
        {allocation.map(([s, n]) => (
          <li key={s}>
            <span dir="ltr">{s}</span>:{" "}
            <span dir="ltr">{tf("prestartQuestions", { n })}</span>
          </li>
        ))}
      </ul>
    </>
  );
  return (
    <QuizRunner
      key={scope}
      title={view.title}
      questions={questions}
      minutes={mock.minutes}
      mode="mock"
      mockId={mock.id}
      trackId={mock.track}
      note={
        <>
          {note} {scoringNote}
        </>
      }
      trustedOnly={trustedOnly}
      scoring={scoring}
      allItemsVerified={allItemsVerified}
      sessionScope={scope}
      questionSeed={questionSeed}
      disclosureExtra={disclosureExtra}
      patternLabel={mock.variant}
    />
  );
}

export default function MockRun() {
  return (
    <Suspense>
      <MockRunInner />
    </Suspense>
  );
}
