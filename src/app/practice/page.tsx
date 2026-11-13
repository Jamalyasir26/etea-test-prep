// Practice — topic quizzes, 20 per attempt by default (?count= sets
// the drill size, 5–20), shuffled, instant feedback.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BY_SUBJECT, hashSeed, isTrusted, mulberry32, shuffled, SUBJECT_LABELS } from "@/lib/data";
import { lri, useLang } from "@/lib/i18n";
import { loadPracticeState, PRACTICE_STATE_KEY, resolvePracticeInitial } from "@/lib/practice";
import { loadReviews, safeWrite } from "@/lib/tracking";
import QuizRunner from "@/components/QuizRunner";
import { Suspense } from "react";

function PracticeInner() {
  const { t, tf } = useLang();
  const params = useSearchParams();
  const initial = params.get("subject") ?? "";
  // Step 2b — ?count= sets the drill size (the Analysis page's "Run
  // 10-question drill" links here with count=10). Clamped to 5–20: a
  // smaller set is not a drill, and 20 is the standard set size. The
  // count is part of the session scope (only when it differs from the
  // default 20, so existing stored sessions keep working).
  const countParam = Number(params.get("count") ?? "20");
  const count = Number.isFinite(countParam) ? Math.min(20, Math.max(5, Math.floor(countParam))) : 20;
  const subjects = useMemo(() => Object.keys(BY_SUBJECT).sort(), []);
  // Step 2 fixes — the initial subject/round/seed resolve through one
  // pure function (src/lib/practice.ts): the bare URL restores the
  // stored round + seed, so a reload resumes the SAME set and the
  // stored session. A ?subject= naming a different subject starts
  // fresh (per-scope sessions are the design).
  const [practiceInit] = useState(() => {
    const stored = loadPracticeState(initial || "islamiyat");
    return resolvePracticeInitial(initial, stored, (k) => Boolean(BY_SUBJECT[k]), Date.now());
  });
  const [subjectKey, setSubjectKey] = useState(practiceInit.subjectKey);
  const [round, setRound] = useState(practiceInit.round);
  const [seed, setSeed] = useState(practiceInit.seed);

  useEffect(() => {
    // Stage 1 P1 Tier 2: safeWrite never throws on full/blocked storage.
    safeWrite(PRACTICE_STATE_KEY, JSON.stringify({ subjectKey, round, seed }));
  }, [subjectKey, round, seed]);

  const labelByKey: Record<string, string> = SUBJECT_LABELS;
  const subjectLabel = labelByKey[subjectKey] ?? subjectKey;

  const questions = useMemo(() => {
    const bank = BY_SUBJECT[subjectKey] ?? [];
    const rand = mulberry32(hashSeed(`${subjectKey}-${round}-${seed}`));
    return shuffled(bank, rand).slice(0, count);
  }, [subjectKey, round, seed, count]);

  // Stage 1 P0.2 — the results screen shows "Provisional — not verified"
  // unless every question in this set is owner-reviewed/approved.
  const [reviews] = useState(() => loadReviews());
  const overrides: Record<string, string> = {};
  for (const [qid, r] of Object.entries(reviews)) overrides[qid] = r.reviewStatus;
  const allItemsVerified = questions.length > 0 && questions.every((q) => isTrusted(q, overrides));

  function newSet() {
    setRound((r) => r + 1);
    setSeed(Date.now());
  }

  return (
    <div>
      <h1>{t("practiceTitle")}</h1>
      <p className="muted">
        {t("practiceIntro1")} {t("notEteaQuestions")}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select
          aria-label={t("subjectWord")}
          value={subjectKey}
          onChange={(e) => {
            setSubjectKey(e.target.value);
            setRound(0);
            setSeed(Date.now());
          }}
        >
          {subjects.map((k) => (
            <option key={k} value={k}>
              {labelByKey[k] ?? k} ({BY_SUBJECT[k].length})
            </option>
          ))}
        </select>
        <button className="secondary" onClick={newSet}>
          {t("newSet")}
        </button>
      </div>
      <QuizRunner
        key={`${subjectKey}-${round}-${count}`}
        title={tf("quizTitle", { subject: lri(subjectLabel) })}
        questions={questions}
        mode="practice"
        subject={subjectLabel}
        allItemsVerified={allItemsVerified}
        sessionScope={count === 20 ? `practice:${subjectKey}:${round}` : `practice:${subjectKey}:${round}:c${count}`}
        questionSeed={String(seed)}
      />
    </div>
  );
}

export default function Practice() {
  return (
    <Suspense>
      <PracticeInner />
    </Suspense>
  );
}
