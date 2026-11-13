// Mock runner — /mock/[id]?mode=trusted|provisional
// Trusted mode passes { trustedOnly: true } to buildMockQuestions: only
// owner-reviewed/approved items are used and the shortfall is NEVER filled,
// so a trusted mock may have fewer questions than the mock's total.
// The question seed comes from the live session (if one exists for this
// scope) so a reload resumes the SAME questions; otherwise a fresh seed is
// used and QuizRunner persists it in the session. QuizRunner is keyed by
// scope so switching modes remounts it instead of leaking state.
"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { buildMockQuestions, isTrusted, MOCKS, trustedOnlyCount } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { loadReviews, loadSession } from "@/lib/tracking";
import { localizedScoringLabel, resolveScoring } from "@/lib/scoring";
import QuizRunner from "@/components/QuizRunner";

function MockRunInner() {
  const { lang, t, tf } = useLang();
  const params = useParams();
  const search = useSearchParams();
  const id = String(params.id ?? "");
  const mock = MOCKS.find((m) => m.id === id);
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
  const questions = useMemo(
    () => (mock ? buildMockQuestions(mock, questionSeed, { trustedOnly, overrides }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mock, questionSeed, trustedOnly],
  );
  const allItemsVerified = questions.length > 0 && questions.every((q) => isTrusted(q, overrides));

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
  // Stage 1 P1 Tier 4 (B03) — the trusted-only counts are isolated LTR
  // so they cannot reverse in RTL (Urdu) mode; the note prop is a
  // ReactNode for exactly this reason (see QuizRunner Props).
  // Localization Pass 1 — the mock note is English content, isolated
  // with dir="auto"; the scoring note is JSX so the (English) policy
  // note can be isolated LTR while the label is translated.
  const note = trustedOnly ? (
    <>
      {t("trustedOnlyLabel")}{" "}
      <span dir="ltr">
        {questions.length} of {mock.total}
      </span>{" "}
      {t("trustedNoteRest")} —{" "}
      <span dir="ltr">{trustedOnlyCount(mock, overrides)}</span> {t("reviewedWord")}{" "}
      {t("trustedNoteInMock")}. {t("trustedNoteShortfall")} <span dir="auto">{mock.note}</span>
    </>
  ) : (
    <span dir="auto">{mock.note}</span>
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
    for (const q of questions) m.set(q.subject, (m.get(q.subject) ?? 0) + 1);
    return [...m.entries()];
  }, [questions]);
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
      title={mock.title}
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
