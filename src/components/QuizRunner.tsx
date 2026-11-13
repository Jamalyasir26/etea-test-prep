// Shared quiz / mock runner.
// Practice mode: instant feedback after each answer.
// Mock mode: no feedback until submit; timed, auto-submits at 0.
// Records every attempt (localStorage) for the live Analysis dashboard.
//
// Step 2b behaviour:
// - PRE-START DISCLOSURE: the quiz never starts automatically. A
//   disclosure screen shows subject, pattern, item count, content
//   status, scoring policy and duration first; the user clicks Start,
//   Resume, or Start fresh.
// - SESSION COMPATIBILITY: a stored session is resumed only when its
//   fingerprint (scope + subject/mock + seed + question ids + content
//   revision) matches the current run exactly (see
//   checkSessionCompatibility in tracking.ts). On mismatch the old
//   session is never applied — Start fresh begins with the current
//   questions.
// - QUESTION MAP + FLAG-FOR-REVIEW: a jump-to grid and per-question
//   flags, persisted in the version 3 session.
// - RETRIEVAL-FIRST REVEAL (practice): the user's own answer/blank
//   first, then the correct answer, the reason, the source + Library
//   note link, then Report issue.
//
// Phase 2 behaviour:
// - FIRST-PASS SCORING: the first response per question is recorded
//   immutably (firstPass, set on first choose() only, never overwritten).
//   Changing an answer afterwards (Back + re-pick in practice, re-pick in
//   mock) is a corrected retry: recorded in `retries`, never overwriting
//   firstPass. The final score and per-subject table are first-pass only;
//   retries are shown separately and do not change the score.
// - SESSION PERSISTENCE: live state is saved per answer to the versioned
//   key `etea_session_next_v2` (one JSON object keyed by scope). Reload
//   resumes the same seeded question/option order. Mock timing uses an
//   ABSOLUTE deadline (deadlineTs, ms epoch); the countdown derives from
//   deadlineTs - Date.now(), so reload/background/sleep cannot reset it.
// - IDEMPOTENT SUBMIT: a persisted `submitted` flag; finish() is a no-op
//   once submitted, so timeout and manual submit record exactly one attempt.
// - ITEM-LEVEL RECORDS: every attempt stores per-item first/final answers,
//   correctness, mode, topic, source, key version and response time.
// - Mock mode: the picked option gets a neutral "picked" style (teal
//   outline). Green is only for actually-correct options after reveal in
//   practice mode — never for a mere pick in mock mode.
// - "Report an issue" saves privately on this device only (Issues inbox);
//   the copy never implies anything was sent anywhere.
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  displayExplanation,
  effectiveReviewStatus,
  hashSeed,
  isTrusted,
  libraryScopeForSubjectLabel,
  mulberry32,
  shuffleOptions,
  type Question,
  type ReviewOverrides,
} from "@/lib/data";
import ProvenanceBadge from "@/components/ProvenanceBadge";
import { ReviewStatusBadge, StatusBadge, TopicBadge } from "@/components/StatusBadges";
import {
  computeExamScore,
  DEFAULT_SCORING,
  localizedScoringLabel,
  type ScoringConfig,
} from "@/lib/scoring";
import {
  checkSessionCompatibility,
  clearSession,
  download,
  KEY_VERSION,
  loadReviews,
  loadSession,
  loadSessionRaw,
  recordAttempt,
  removeFlag,
  reportIssueDetailed,
  saveFlag,
  saveSession,
  type Attempt,
  type IncompatibilityReason,
  type ItemRecord,
  type IssueReason,
  type QuizSession,
} from "@/lib/tracking";
import { ISSUE_REASONS } from "@/lib/tracking";
import { lri, useLang } from "@/lib/i18n";

// Localization Pass 1 — stored issue-reason values are stable English
// keys; only their DISPLAY labels are translated (via i18n.tsx).
const REASON_KEY: Record<IssueReason, string> = {
  "wrong-answer": "issueReasonWrongAnswer",
  "wrong-explanation": "issueReasonWrongExplanation",
  typo: "issueReasonTypo",
  outdated: "issueReasonOutdated",
  other: "issueReasonOther",
};

type Props = {
  title: string;
  questions: Question[];
  minutes?: number; // 0 = no timer
  mode: "practice" | "mock";
  subject?: string;
  mockId?: string;
  trackId?: string;
  /** Stage 1 P1 Tier 4 (B03) — a ReactNode (not a plain string) so the
   *  caller can isolate counts with dir="ltr" spans; rendered verbatim
   *  in the alert box below the title. */
  note?: ReactNode;
  /** Trusted-only run: only owner-reviewed/approved questions were passed in. Default false (provisional). */
  trustedOnly?: boolean;
  /** Stage 1 P0.1 — scoring config for this run (default: zero penalty, policy unknown). */
  scoring?: ScoringConfig;
  /** Stage 1 P0.2 — true when every question in this run is owner-reviewed/approved.
   *  Drives the "Provisional — not verified" badge on the results screen. */
  allItemsVerified?: boolean;
  /** Scope id for the persisted session, e.g. "mock:zam1:trusted". Defaults to `quiz:<title>`. */
  sessionScope?: string;
  /** Seed the parent used to pick/order the questions; stored in the session so a reload reuses it. */
  questionSeed?: string;
  /** Step 2b — extra disclosure lines for the pre-start screen
   *  (e.g. the mock page's subject allocation). Rendered verbatim
   *  inside the disclosure card, after the standard lines. */
  disclosureExtra?: ReactNode;
  /** Step 2b — the pattern identity for the pre-start disclosure
   *  (e.g. a mock's stored variant string, shown verbatim). Absent
   *  for subject drills, which claim no exam pattern. */
  patternLabel?: string;
};

function IssueForm({ qid, subject }: { qid: string; subject?: string }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<IssueReason | "">("");
  const [correction, setCorrection] = useState("");
  const [source, setSource] = useState("");
  // Step 2b — explicit "no suggested correction" choice: a reason is
  // always required, and details are required UNLESS the reporter
  // explicitly ticks this box. Nothing saves until the form validates.
  const [noCorrection, setNoCorrection] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  // Step 3b-audit2 (F07) — the report is only "saved" when storage
  // accepted it; a failed write keeps the form open with a retry
  // message instead of a false confirmation.
  const [saveFailed, setSaveFailed] = useState(false);

  if (saved) {
    return <p className="muted">{t("issueSaved")}</p>;
  }
  if (!open) {
    return (
      <button className="secondary" onClick={() => setOpen(true)}>
        {t("reportIssue")}
      </button>
    );
  }
  return (
    <div className="card">
      <p>
        <b>{t("reportIssue")}</b>
      </p>
      <p className="muted">{t("issuePrivateNote")}</p>
      <label>
        {t("reasonWord")}
        <select
          aria-label={t("reasonWord")}
          value={reason}
          onChange={(e) => setReason(e.target.value as IssueReason | "")}
          style={{ display: "block", width: "100%", margin: "4px 0 8px" }}
        >
          <option value="">{t("chooseReason")}</option>
          {ISSUE_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {t(REASON_KEY[r.value])}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("correctionWord")}
        <textarea
          aria-label={t("correctionWord")}
          value={correction}
          onChange={(e) => setCorrection(e.target.value)}
          rows={3}
          disabled={noCorrection}
          style={{ display: "block", width: "100%", margin: "4px 0 8px" }}
          placeholder={t("correctionPlaceholder")}
        />
      </label>
      <label style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={noCorrection}
          onChange={(e) => setNoCorrection(e.target.checked)}
        />
        {t("noCorrectionChoice")}
      </label>
      <label>
        {t("sourceOptional")}
        <input
          type="text"
          aria-label={t("sourceWord")}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          style={{ display: "block", width: "100%", margin: "4px 0 8px" }}
          placeholder={t("sourcePlaceholder")}
        />
      </label>
      {error && (
        <p role="alert" className="muted">
          {t("issueValidationError")}
        </p>
      )}
      {saveFailed && (
        <p role="alert" className="muted">
          {t("issueSaveFailed")}
        </p>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => {
            if (reason === "" || (!noCorrection && correction.trim() === "")) {
              setError(true);
              return;
            }
            const res = reportIssueDetailed({
              qid,
              subject,
              reason,
              proposedCorrection: correction,
              source,
              noSuggestedCorrection: noCorrection,
            });
            if (res.saved) {
              setSaved(true);
            } else {
              // Storage refused the write: keep the form (and the
              // user's text) open so they can retry.
              setSaveFailed(true);
            }
          }}
        >
          {t("savePrivately")}
        </button>
        <button className="secondary" onClick={() => setOpen(false)}>
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}

export default function QuizRunner({
  title,
  questions,
  minutes = 0,
  mode,
  subject,
  mockId,
  trackId,
  note,
  trustedOnly = false,
  scoring = DEFAULT_SCORING,
  allItemsVerified = false,
  sessionScope,
  questionSeed,
  disclosureExtra,
  patternLabel,
}: Props) {
  const { t, tf, lang } = useLang();
  const scope = sessionScope ?? `quiz:${title}`;

  // Step 2b — PRE-START FLOW. Nothing starts automatically: the
  // disclosure screen shows first, and the quiz begins only when the
  // user clicks Start / Resume / Start fresh. The stored-session check
  // runs AFTER mount (B07: storage reads in initializers would make
  // the first render differ from the server HTML), so the first render
  // always shows the plain Start button and the Resume/Start-fresh
  // options appear once the check completes. Quiz state starts FRESH;
  // Resume populates it from the stored session (see beginResume).
  const [started, setStarted] = useState(false);
  const [storedCheck, setStoredCheck] = useState<{
    status: "none" | "compatible" | "incompatible";
    session: QuizSession | null;
    reason?: IncompatibilityReason;
  }>({ status: "none", session: null });
  const [startTs, setStartTs] = useState(() => Date.now());
  const [deadlineTs, setDeadlineTs] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Step 2b — flag-for-review state (qid -> true), persisted in the
  // version 3 session. Empty until Resume restores it or the user
  // flags a question.
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [mapOpen, setMapOpen] = useState(false);

  // Step 3b-audit2 (F07) — the submitted attempt is only "saved" when
  // storage accepted it. When the write fails, the results screen
  // shows an error with retry/download instead of acting as if the
  // result were stored; pendingAttempt holds the record for both.
  const [attemptSaveFailed, setAttemptSaveFailed] = useState(false);
  const [attemptSaveRecovered, setAttemptSaveRecovered] = useState(false);
  const [pendingAttempt, setPendingAttempt] = useState<Attempt | null>(null);

  // Step 2a — per-question review-status badges use the EFFECTIVE
  // status (bank status overridden by this device's /review decisions,
  // same source the mock page uses for its trusted counts). Loaded in
  // an effect, not in the initializer: the B07 rule — storage reads in
  // initializers would make the first render differ from the server
  // HTML. Until the effect runs, bank status alone is shown (the 15
  // bank-verified items are correct from the first render).
  const [overrides, setOverrides] = useState<ReviewOverrides>({});
  useEffect(() => {
    // Same conversion as the mock page: ReviewRecord -> status string.
    const o: ReviewOverrides = {};
    for (const [qid, r] of Object.entries(loadReviews())) o[qid] = r.reviewStatus;
    setOverrides(o);
  }, []);

  // Step 2b — stored-session compatibility check, after mount only
  // (same B07 rule as the overrides effect above). A live session for
  // this scope is resumed ONLY when its fingerprint matches the
  // current run exactly; on any mismatch the pre-start screen offers
  // Start fresh and the stale answers are never applied. The component
  // is keyed by scope/round by its parents, so the mount-time
  // questions are the run's questions.
  useEffect(() => {
    const stored = loadSession(scope);
    if (!stored) {
      setStoredCheck({ status: "none", session: null });
      return;
    }
    const check = checkSessionCompatibility(stored, {
      scope,
      subject,
      mockId,
      trackId,
      questionSeed: questionSeed ?? "",
      questionIds: questions.map((q) => q.id),
      contentRevision: KEY_VERSION,
    });
    setStoredCheck(
      check.compatible
        ? { status: "compatible", session: stored }
        : { status: "incompatible", session: stored, reason: check.reason },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prepared = useMemo(
    () =>
      questions.map((q) => {
        const rand = mulberry32(hashSeed(q.id + String(startTs)));
        return shuffleOptions(q, rand);
      }),
    [questions, startTs],
  );

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [firstPass, setFirstPass] = useState<Record<string, number>>({});
  const [retries, setRetries] = useState<{ qid: string; answer: number; at: string }[]>([]);
  const [answeredAt, setAnsweredAt] = useState<Record<string, string>>({});
  const [responseMs, setResponseMs] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const submittedRef = useRef(false);
  const shownAtRef = useRef<Record<string, number>>({});

  const q = prepared[idx];
  const total = prepared.length;
  // Step 3b-audit2 (F02) — the current question's display explanation
  // (English text when one exists; Roman Urdu text + pending label
  // otherwise, in English mode only).
  const currentExpl = q ? displayExplanation(q.question, lang) : null;

  // Per-item response time: when the current question became current.
  useEffect(() => {
    const id = prepared[idx]?.question.id;
    if (id) shownAtRef.current[id] = Date.now();
  }, [idx, prepared]);

  // Absolute-deadline countdown: tick from the wall clock, not a decrement.
  useEffect(() => {
    if (mode !== "mock" || minutes <= 0 || done) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [mode, minutes, done]);

  const secondsLeft = deadlineTs === null ? minutes * 60 : Math.max(0, Math.ceil((deadlineTs - now) / 1000));

  // First-pass score (immutable first responses only).
  const firstPassCount = useMemo(() => {
    let c = 0;
    for (const p of prepared) {
      const a = firstPass[p.question.id];
      if (a !== undefined && a === p.correctIndex) c++;
    }
    return c;
  }, [firstPass, prepared]);

  const perSubject = useMemo(() => {
    const m: Record<string, [number, number]> = {};
    for (const p of prepared) {
      const a = firstPass[p.question.id];
      const e = m[p.question.subject] ?? [0, 0];
      e[1] += 1;
      if (a !== undefined && a === p.correctIndex) e[0] += 1;
      m[p.question.subject] = e;
    }
    return m;
  }, [firstPass, prepared]);

  const unansweredCount = useMemo(
    () => prepared.filter((p) => firstPass[p.question.id] === undefined).length,
    [firstPass, prepared],
  );

  // Stage 1 P0.1 — raw accuracy and exam score are two separate numbers,
  // computed from the same first-pass counts under this run's scoring config.
  const wrongCount = useMemo(
    () =>
      prepared.filter((p) => {
        const a = firstPass[p.question.id];
        return a !== undefined && a !== p.correctIndex;
      }).length,
    [firstPass, prepared],
  );
  const examResult = useMemo(
    () =>
      computeExamScore(scoring, {
        correct: firstPassCount,
        wrong: wrongCount,
        unanswered: unansweredCount,
        total,
      }),
    [scoring, firstPassCount, wrongCount, unansweredCount, total],
  );

  function buildSession(submitted: boolean): QuizSession {
    return {
      version: 3,
      id: `${scope}@${startTs}`,
      scope,
      mode,
      title,
      questionIds: prepared.map((p) => p.question.id),
      questionSeed: questionSeed ?? "",
      optionSeed: startTs,
      answers,
      firstPass,
      retries,
      answeredAt,
      responseMs,
      idx,
      startedAt: startTs,
      deadlineTs,
      minutes,
      submitted,
      trustedOnly,
      subject,
      mockId,
      trackId,
      contentRevision: KEY_VERSION,
      flags,
    };
  }

  // Save live state per answer (and on navigation / submit). Gated on
  // `started`: the pre-start screen must never overwrite a stored
  // session the user has not resumed yet.
  useEffect(() => {
    if (!started) return;
    saveSession(buildSession(submittedRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, answers, firstPass, retries, answeredAt, responseMs, idx, done, flags, prepared]);

  // Step 2b — begin handlers (pre-start screen buttons). Fresh starts
  // clear any stored session for this scope first, so a stale session
  // can never leak into the new run. Resume restores the checked
  // session's answers, option order (optionSeed), deadline and flags.
  function beginFresh() {
    clearSession(scope);
    submittedRef.current = false;
    shownAtRef.current = {};
    const fresh = Date.now();
    setStartTs(fresh);
    setDeadlineTs(mode === "mock" && minutes > 0 ? fresh + minutes * 60 * 1000 : null);
    setAnswers({});
    setFirstPass({});
    setRetries([]);
    setAnsweredAt({});
    setResponseMs({});
    setFlags({});
    setIdx(0);
    setPicked(null);
    setRevealed(false);
    setDone(false);
    setStarted(true);
  }

  function beginResume() {
    const s = storedCheck.session;
    if (!s) return;
    submittedRef.current = false;
    shownAtRef.current = {};
    setStartTs(s.optionSeed);
    setDeadlineTs(s.deadlineTs ?? null);
    setAnswers(s.answers ?? {});
    setFirstPass(s.firstPass ?? {});
    setRetries(s.retries ?? []);
    setAnsweredAt(s.answeredAt ?? {});
    setResponseMs(s.responseMs ?? {});
    setFlags(s.flags ?? {});
    const resumeIdx = Math.min(s.idx ?? 0, Math.max(0, prepared.length - 1));
    setIdx(resumeIdx);
    const resumeId = prepared[resumeIdx]?.question.id;
    setPicked(resumeId !== undefined ? (s.answers?.[resumeId] ?? null) : null);
    setRevealed(false);
    setDone(false);
    setStarted(true);
  }

  function buildItemRecords(): ItemRecord[] {
    return prepared.map((p) => {
      const fp = firstPass[p.question.id];
      const fin = answers[p.question.id];
      return {
        questionId: p.question.id,
        question: p.question.question,
        topic: p.question.topic,
        firstAnswer: fp !== undefined ? p.options[fp] : null,
        finalAnswer: fin !== undefined ? p.options[fin] : null,
        correctAnswer: p.options[p.correctIndex],
        correct: fp !== undefined && fp === p.correctIndex,
        mode,
        source: p.question.source,
        keyVersion: KEY_VERSION,
        answeredAt: answeredAt[p.question.id] ?? null,
        responseMs: responseMs[p.question.id],
      };
    });
  }

  function finish() {
    // Idempotent submit: in-memory flag + persisted submitted flag.
    if (submittedRef.current) {
      setDone(true);
      return;
    }
    if (loadSessionRaw(scope)?.submitted) {
      submittedRef.current = true;
      setDone(true);
      return;
    }
    submittedRef.current = true;
    const res = recordAttempt({
      kind: mode === "mock" ? "mock" : "quiz",
      subject,
      mockId,
      trackId,
      title,
      total,
      correct: firstPassCount,
      seconds: Math.round((Date.now() - startTs) / 1000),
      perSubject,
      // Stage 1 P0.1: the exam score under this run's scoring config,
      // stored alongside the raw first-pass count (never replacing it).
      examScore: examResult.examScore,
      examTotal: examResult.examTotal,
      scoringPolicy: examResult.config.policyStatus,
      itemRecords: buildItemRecords(),
      retryCount: retries.length,
    });
    // Step 3b-audit2 (F07) — never act as if a failed save succeeded:
    // the results screen offers retry + download when saved is false.
    setPendingAttempt(res.attempt);
    setAttemptSaveFailed(!res.saved);
    if (res.saved) setAttemptSaveRecovered(false);
    saveSession(buildSession(true));
    setDone(true);
  }

  // Step 3b-audit2 (F07) — retry storing the submitted attempt after
  // a failed save. The first write never landed (safeWrite is atomic
  // per key), so re-recording cannot duplicate anything.
  function retryAttemptSave() {
    if (!pendingAttempt) return;
    const { id: _id, ...input } = pendingAttempt;
    const res = recordAttempt(input);
    setPendingAttempt(res.attempt);
    setAttemptSaveFailed(!res.saved);
    if (res.saved) setAttemptSaveRecovered(true);
  }

  // Step 3b-audit2 (F12) — toggle the session flag AND mirror it into
  // the durable store, so the flag survives submit + reload and shows
  // on /review. Unflagging removes it from both.
  function toggleFlag(qid: string) {
    const next = !flags[qid];
    setFlags((prev) => ({ ...prev, [qid]: next }));
    if (next) saveFlag(qid, mode, title);
    else removeFlag(qid);
  }
  const finishRef = useRef(finish);
  finishRef.current = finish;

  // Auto-submit at the absolute deadline (timeout path uses the same
  // idempotent finish() as the manual Submit button).
  useEffect(() => {
    if (mode === "mock" && minutes > 0 && deadlineTs !== null && secondsLeft === 0 && !done) {
      finishRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, done]);

  function restart() {
    if (!window.confirm(t("restartConfirm"))) {
      return;
    }
    clearSession(scope);
    submittedRef.current = false;
    shownAtRef.current = {};
    const fresh = Date.now();
    setStartTs(fresh);
    setDeadlineTs(mode === "mock" && minutes > 0 ? fresh + minutes * 60 * 1000 : null);
    setAnswers({});
    setFirstPass({});
    setRetries([]);
    setAnsweredAt({});
    setResponseMs({});
    setFlags({});
    setIdx(0);
    setPicked(null);
    setRevealed(false);
    setDone(false);
  }

  if (total === 0) return <p>{t("noQuestions")}</p>;

  // Step 2b — pre-start disclosure screen. Shown until the user
  // starts: subject, pattern, item count, content status, scoring
  // policy, duration, and (for mocks) the subject allocation from the
  // parent. Resume appears only for a compatible stored session.
  if (!started) {
    const reviewedCount = questions.filter((q) => isTrusted(q, overrides)).length;
    const provisionalCount = total - reviewedCount;
    const reasonKey: Record<IncompatibilityReason, string> = {
      version: "incompatReasonVersion",
      scope: "incompatReasonScope",
      subject: "incompatReasonSubject",
      mock: "incompatReasonMock",
      seed: "incompatReasonSeed",
      questions: "incompatReasonQuestions",
      revision: "incompatReasonRevision",
    };
    return (
      <div>
        <h2>
          <span dir="auto">{title}</span>
        </h2>
        {note && <div className="alert">{note}</div>}
        <div className="card">
          <h3>{t("prestartHeading")}</h3>
          {subject && (
            <p>
              <b>{t("prestartSubjectLabel")}:</b> <span dir="auto">{subject}</span>
            </p>
          )}
          <p>
            <b>{t("prestartPatternLabel")}:</b>{" "}
            {patternLabel ? (
              <span dir="ltr">{patternLabel}</span>
            ) : (
              t("prestartNoPattern")
            )}
          </p>
          <p>
            <span dir="ltr">{tf("prestartQuestions", { n: total })}</span>
          </p>
          <p>
            <span dir="ltr">{tf("prestartReviewed", { n: reviewedCount, total })}</span>
            {" · "}
            <span dir="ltr">{tf("prestartProvisional", { n: provisionalCount })}</span>
          </p>
          <p>
            <b>{t("scoringWord")}</b> {localizedScoringLabel(scoring, lang)}
          </p>
          {/* The policy note stays English (factual precision
              statement); isolated LTR so its trailing period cannot
              jump in RTL mode. */}
          <p className="muted">
            <span dir="ltr">{scoring.policyNote}</span>
          </p>
          <p className="muted">
            {tf("prestartUnanswered", { marks: scoring.unansweredMarks ?? 0 })}
          </p>
          <p>
            <b>{t("prestartDurationLabel")}:</b>{" "}
            {minutes > 0 ? (
              <span dir="ltr">{tf("minsLabel", { mins: minutes })}</span>
            ) : (
              t("prestartNoTimer")
            )}
          </p>
          {disclosureExtra}
          {storedCheck.status === "compatible" && (
            <p>
              <b>{t("prestartResumeNote")}</b>
            </p>
          )}
          {storedCheck.status === "incompatible" && (
            <div className="alert">
              {tf("prestartIncompatible", {
                reason: t(reasonKey[storedCheck.reason ?? "questions"]),
              })}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {storedCheck.status === "compatible" ? (
              <>
                <button onClick={beginResume}>{t("resumeButton")}</button>
                <button className="secondary" onClick={beginFresh}>
                  {t("startFreshButton")}
                </button>
              </>
            ) : storedCheck.status === "incompatible" ? (
              <button onClick={beginFresh}>{t("startFreshButton")}</button>
            ) : (
              <button onClick={beginFresh}>{t("start")}</button>
            )}
          </div>
          {trustedOnly && <p className="muted">{t("trustedOnlyLine")}</p>}
        </div>
      </div>
    );
  }

  if (done) {
    const pct = total ? Math.round((firstPassCount / total) * 100) : 0;
    const showProvisionalBadge = !trustedOnly && !allItemsVerified;
    // Step 2b — results breakdown, each figure separate: first-pass
    // accuracy over ANSWERED questions only (unanswered shown
    // separately below), the provisional-content count (never
    // owner-reviewed items in this run), and the flagged questions.
    const answeredCount = total - unansweredCount;
    const answeredPct = answeredCount ? Math.round((firstPassCount / answeredCount) * 100) : 0;
    const provisionalCount = prepared.filter((p) => !isTrusted(p.question, overrides)).length;
    const flaggedList = prepared
      .map((p, i) => (flags[p.question.id] ? i + 1 : null))
      .filter((n): n is number => n !== null);
    return (
      <div>
        <div className="card">
          <h2>
            {/* Stage 1 P1 Tier 4 (B03) — score fractions isolated LTR so
                they cannot reverse in RTL (Urdu) mode. */}
            {t("score")}:{" "}
            <span dir="ltr">
              {firstPassCount} / {total} ({pct}%)
            </span>
          </h2>
          {/* Step 3b-audit2 (F07) — the save failed: say so BEFORE the
              result is lost, with retry + download. The answers above
              stay on screen either way. */}
          {attemptSaveFailed && pendingAttempt && (
            <div className="alert red" role="alert">
              <p>{t("attemptSaveFailed")}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={retryAttemptSave}>{t("attemptRetrySave")}</button>
                <button
                  className="secondary"
                  onClick={() =>
                    download(
                      `etea-prep-result-${new Date().toISOString().slice(0, 10)}.json`,
                      JSON.stringify(
                        {
                          app: "etea-prep-next",
                          kind: "attempt",
                          exportedAt: new Date().toISOString(),
                          attempt: pendingAttempt,
                        },
                        null,
                        2,
                      ),
                    )
                  }
                >
                  {t("attemptDownloadResult")}
                </button>
              </div>
            </div>
          )}
          {attemptSaveRecovered && !attemptSaveFailed && <p className="muted">{t("attemptSaveRecovered")}</p>}
          {/* Stage 1 P0.2 — provisional badge while the items in this quiz are not verified.
              Step 2a — semantic badges: the verified badge uses the
              REVIEWED tone, never success green (local owner review is
              not certification); the provisional badge uses the draft
              tone. The showProvisionalBadge logic is unchanged. */}
          {showProvisionalBadge ? (
            <p>
              <StatusBadge label={t("provisionalBadge")} detail={t("provisionalBadgeDetail")} tone="draft" />
            </p>
          ) : (
            <p>
              <StatusBadge label={t("verifiedBadge")} detail={t("verifiedBadgeDetail")} tone="reviewed" />
            </p>
          )}
          <p className="muted">
            {/* Localization Pass 1 (RTL) — the run title may be English
                or translated depending on the caller; dir="auto" picks
                the direction from its first strong character. */}
            <span dir="auto">{title}</span> ·{" "}
            {/* Step 2a (RTL) — duration isolated: "0 min" / "5 منٹ" must
                not let its number jump to the wrong end in RTL mode. */}
            <span dir="ltr">{tf("minsLabel", { mins: Math.round((Date.now() - startTs) / 60000) })}</span>
            {trustedOnly ? ` · ${t("trustedOnlyNote")}` : ""}
          </p>
          {/* Stage 1 P0.1 — raw accuracy and exam score are two separate numbers. */}
          <h3>{t("rawVsExam")}</h3>
          <p>
            <b>
              {t("rawAccuracyWord")}{" "}
              <span dir="ltr">
                {firstPassCount} / {total} ({pct}%)
              </span>
            </b>{" "}
            — {t("rawAccuracyNote")}
          </p>
          <p>
            <b>
              {t("examScoreWord")}{" "}
              <span dir="ltr">
                {examResult.examScore} / {examResult.examTotal}
              </span>{" "}
              {t("marksLabel")}
            </b>{" "}
            — {localizedScoringLabel(examResult.config, lang)}
            {examResult.floored ? t("flooredNote") : ""}
          </p>
          {/* Localization Pass 1 (RTL) — the policy note stays English
              (factual precision statement); isolated LTR so its
              trailing period cannot jump in RTL mode. */}
          <p className="muted">
            <span dir="ltr">{examResult.config.policyNote}</span>
          </p>
          <p className="muted">{t("qrFirstAnswerNote")}</p>
          {retries.length > 0 && (
            <p className="muted">{tf("retriesLine", { n: retries.length })}</p>
          )}
          {unansweredCount > 0 && (
            <p className="muted">
              {t("unansweredWord")}: <b>{unansweredCount}</b>
            </p>
          )}
          {answeredCount > 0 && (
            <p className="muted">
              <span dir="ltr">
                {tf("firstPassAccuracyLine", {
                  correct: firstPassCount,
                  answered: answeredCount,
                  pct: answeredPct,
                })}
              </span>
            </p>
          )}
          <p className="muted">
            <span dir="ltr">
              {tf("provisionalContentLine", { n: provisionalCount, total })}
            </span>
          </p>
          {flaggedList.length > 0 && (
            <p className="muted">
              {tf("flaggedResultsLine", {
                list: lri(flaggedList.map((n) => `Q${n}`).join(", ")),
              })}
            </p>
          )}
          {/* Step 2a — numeric progressbar semantics (was role="img"). */}
          <div
            className="bar"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${pct}% ${t("correctCount")}`}
          >
            <i style={{ width: `${pct}%` }} />
          </div>
          <h3>{t("perSubjectFirst")}</h3>
          {/* Step 2a (P1.1) — labelled, keyboard-accessible scoped
              horizontal scroll region; the caption tells narrow-screen
              readers the table scrolls. No global overflow-x hiding. */}
          <p className="muted">{t("tableScrollHint")}</p>
          <div className="table-scroll" role="region" aria-label={t("perSubjectTableAria")} tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>{t("subjectWord")}</th>
                <th>{t("correctWord")}</th>
                <th>{t("totalWord")}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(perSubject).map(([s, [c, tt]]) => (
                <tr key={s}>
                  <td dir="ltr">{s}</td>
                  <td>{c}</td>
                  <td>{tt}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        <h3>{t("review")}</h3>
        {prepared.map((p, i) => {
          const fp = firstPass[p.question.id];
          const fin = answers[p.question.id];
          const ok = fp !== undefined && fp === p.correctIndex;
          // Step 3b-audit2 (F02) — English mode shows the faithful
          // English explanation; untranslated Roman Urdu text carries
          // the honest pending label.
          const expl = displayExplanation(p.question, lang);
          return (
            <div className="card" key={p.question.id}>
              <p>
                <span dir="ltr">
                  <b>Q{i + 1}.</b>
                </span>{" "}
                <span dir="auto">{p.question.question}</span>{" "}
                <span className={`badge ${fp === undefined ? "grey" : ok ? "green" : "red"}`}>
                  {fp === undefined ? t("badgeUnanswered") : ok ? t("badgeCorrectFirst") : t("badgeWrongFirst")}
                </span>
              </p>
              {p.options.map((o, oi) => (
                <p key={oi} style={{ margin: "4px 0" }}>
                  {oi === p.correctIndex ? "✅ " : fp === oi ? "❌ " : "· "}
                  <span dir="auto">{o}</span>
                  {fp === oi ? t("yourFirstAnswer") : ""}
                  {fin !== undefined && fin !== fp && fin === oi ? t("yourFinalAnswer") : ""}
                </p>
              ))}
              {fin !== undefined && fp !== undefined && fin !== fp && (
                <p className="muted">
                  {t("changedAnswer1")} <span dir="auto">{p.options[fp]}</span> {t("changedAnswerMid")}{" "}
                  <span dir="auto">{p.options[fin]}</span> {t("changedAnswerEnd")}
                </p>
              )}
              <p className="muted">
                <span dir="auto">{expl.text}</span>
                {expl.pendingEnglish && (
                  <>
                    {" "}
                    <span className="badge grey">{t("explanationPendingLabel")}</span>
                  </>
                )}
              </p>
              {p.question.pastPaperRef && (
                <p className="muted">
                  <span dir="auto">{p.question.pastPaperRef}</span>
                </p>
              )}
              <p className="muted">
                <span dir="auto">{p.question.source}</span>
                {" — "}
                {p.question.reviewStatus === "owner-reviewed" ||
                p.question.reviewStatus === "approved"
                  ? t("ownerReviewedLabel")
                  : t("notVerifiedLabel")}
              </p>
              <IssueForm qid={p.question.id} subject={p.question.subject} />
            </div>
          );
        })}
      </div>
    );
  }

  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const pickedCorrect = picked !== null && picked === q.correctIndex;

  function choose(i: number) {
    const qid = q.question.id;
    if (mode === "practice" && revealed) return; // go Back first to retry
    const nowMs = Date.now();
    setPicked(i);
    setAnswers((prev) => ({ ...prev, [qid]: i }));
    if (firstPass[qid] === undefined) {
      // First response: immutable from here on.
      setFirstPass((prev) => ({ ...prev, [qid]: i }));
      setAnsweredAt((prev) => ({ ...prev, [qid]: new Date(nowMs).toISOString() }));
      setResponseMs((prev) => {
        if (prev[qid] !== undefined) return prev;
        const shown = shownAtRef.current[qid] ?? nowMs;
        return { ...prev, [qid]: Math.max(0, nowMs - shown) };
      });
    } else if (answers[qid] !== i) {
      // Corrected retry: a separate learning event, never overwrites firstPass.
      setRetries((prev) => [...prev, { qid, answer: i, at: new Date(nowMs).toISOString() }]);
    }
    if (mode === "practice") setRevealed(true);
  }

  function goTo(n: number) {
    setIdx(n);
    setPicked(answers[prepared[n].question.id] ?? null);
    setRevealed(false);
  }

  function next() {
    if (idx + 1 >= total) finish();
    else goTo(idx + 1);
  }

  // In practice mode Next needs a reveal — unless this question already has
  // a first-pass answer (e.g. after resuming), so a resumed run is not
  // forced to re-pick every answered question to move on.
  const canAdvance =
    mode === "mock" || revealed || firstPass[q.question.id] !== undefined;

  return (
    <div>
      <h2>
        <span dir="auto">{title}</span>
      </h2>
      {note && <div className="alert">{note}</div>}
      {trustedOnly && <p className="muted">{t("trustedOnlyLine")}</p>}
      <p className="muted">
        {/* Stage 1 P1 Tier 4 (B03) — question counter and timer isolated
            LTR so neither can reverse in RTL (Urdu) mode. */}
        {t("questionWord")}{" "}
        <span dir="ltr">
          {idx + 1} of {total}
        </span>
        {mode === "mock" && minutes > 0 && (
          <>
            {" · "}⏱ <span dir="ltr">{mm}:{ss}</span> {t("timeLeft")}
          </>
        )}
        {mode === "mock" && (
          <>
            {" · "}
            {t("practiceMockNote")}
          </>
        )}
      </p>
      {/* Step 2a — numeric progressbar semantics (was role="img"). */}
      <div
        className="bar"
        role="progressbar"
        aria-valuenow={idx + 1}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${t("questionWord")} ${idx + 1} of ${total}`}
      >
        <i style={{ width: `${((idx + 1) / total) * 100}%` }} />
      </div>
      {/* Step 2b — question map + flag-for-review. The map is a grid of
          real buttons (keyboard accessible); each button's label names
          its state in words, never by colour alone. Flags persist in
          the session (version 3). The map is a plain wrapping grid,
          not a scroll region (the 2a single-scroll-region count for
          this component is unchanged). */}
      <p>
        <button
          className="secondary"
          aria-expanded={mapOpen}
          onClick={() => setMapOpen(!mapOpen)}
        >
          {t("questionMapToggle")}
        </button>
      </p>
      {mapOpen && (
        <div
          role="group"
          aria-label={t("questionMapLabel")}
          style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}
        >
          {prepared.map((p, i) => {
            const id = p.question.id;
            const isCurrent = i === idx;
            const isAnswered = answers[id] !== undefined;
            const isFlagged = !!flags[id];
            const stateWords = [
              isCurrent ? t("questionMapCurrent") : "",
              isAnswered ? t("questionMapAnswered") : t("questionMapUnanswered"),
              isFlagged ? t("questionMapFlagged") : "",
            ]
              .filter(Boolean)
              .join(", ");
            return (
              <button
                key={id}
                className="secondary"
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  padding: "6px 8px",
                  borderColor: isCurrent ? "var(--teal)" : undefined,
                  borderWidth: isCurrent ? 2 : undefined,
                  fontWeight: isCurrent ? "bold" : undefined,
                }}
                aria-label={`${t("questionWord")} ${i + 1}: ${stateWords}`}
                aria-current={isCurrent ? "true" : undefined}
                onClick={() => goTo(i)}
              >
                <span dir="ltr">
                  {i + 1}
                  {isFlagged ? " ⚑" : ""}
                  {isAnswered ? " ✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="card">
        <p>
          <span dir="ltr">
            <b>Q{idx + 1}.</b>
          </span>{" "}
          <span dir="auto">{q.question.question}</span>{" "}
          <span dir="ltr" className="badge grey">
            {q.question.subject}
          </span>
          {/* Step 2a — semantic badges: review status (effective: bank
              status + this device's /review decisions), topic-inspired
              disclosure for past-paper-topic items, and provenance.
              The old plain "Original"/"Reworded" badge is replaced by
              the TopicBadge, which always leads with "Topic-inspired". */}
          <ReviewStatusBadge status={effectiveReviewStatus(q.question, overrides)} />
          <TopicBadge pastPaperRef={q.question.pastPaperRef} />
          {/* Stage 1 P2 — provenance badge (renders only when the item
              carries a sourceKind). */}
          <ProvenanceBadge source={q.question.source} sourceKind={q.question.sourceKind} syllabusClause={q.question.syllabusClause} />
        </p>
        {q.options.map((o, i) => {
          let cls = "opt";
          if (mode === "practice" && revealed) {
            // Green only for the actually-correct option after reveal.
            if (i === q.correctIndex) cls += " picked-correct";
            else if (i === picked) cls += " picked-wrong";
          } else if (picked === i) {
            // Neutral "picked" style in both modes before reveal: a pick is
            // not a correct answer, so it must never look green.
            cls += " picked";
          }
          const isPicked = picked === i;
          return (
            <button
              key={i}
              className={cls}
              style={
                mode === "mock" && isPicked
                  ? { borderColor: "var(--teal)", borderWidth: 2 }
                  : undefined
              }
              aria-pressed={isPicked}
              onClick={() => choose(i)}
              disabled={mode === "practice" && revealed}
            >
              {/* Localization Pass 1 (RTL) — the option letter is an
                  LTR identifier; the option text is content (dir="auto"
                  so English and future Urdu/Arabic options both render
                  with their punctuation on the right side). */}
              <span dir="ltr">{String.fromCharCode(65 + i)}.</span>{" "}
              <span dir="auto">{o}</span>
            </button>
          );
        })}
        {mode === "practice" && revealed && (
          <div className="alert green">
            {/* Step 2b — retrieval-first reveal sequence: the user's
                own answer (or blank) FIRST, then the correct answer,
                then the short reason, then the source + note link,
                then Report issue. The verdict word stays at the top
                (existing behaviour); the sequence below it is new. */}
            <p>
              <b>{pickedCorrect ? t("correct") : t("wrong")}</b>
            </p>
            <p>
              {picked !== null ? (
                <span dir="ltr">
                  {tf("yourAnswerLine", { answer: lri(q.options[picked]) })}
                </span>
              ) : (
                t("yourBlankLine")
              )}
            </p>
            <p>
              <span dir="ltr">
                {tf("correctAnswerLine", { answer: lri(q.options[q.correctIndex]) })}
              </span>
            </p>
            <p>
              <b>{t("revealReasonLabel")}:</b>{" "}
              <span dir="auto">{currentExpl?.text ?? q.question.explanation}</span>
              {currentExpl?.pendingEnglish && (
                <>
                  {" "}
                  <span className="badge grey">{t("explanationPendingLabel")}</span>
                </>
              )}
            </p>
            <p className="muted">
              {t("sourceLabel")} <span dir="auto">{q.question.source}</span>
              {" — "}
              <Link
                href={`/library?subject=${encodeURIComponent(libraryScopeForSubjectLabel(q.question.subject))}&q=${encodeURIComponent(q.question.topic)}`}
              >
                {t("sourceNoteLink")}
              </Link>
            </p>
            <IssueForm qid={q.question.id} subject={q.question.subject} />
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="secondary" disabled={idx === 0} onClick={() => goTo(idx - 1)}>
          {t("back")}
        </button>
        {mode === "practice" ? (
          <button disabled={!canAdvance} onClick={next}>
            {idx + 1 >= total ? t("submit") : t("next")}
          </button>
        ) : (
          <button onClick={next}>{idx + 1 >= total ? t("submit") : t("next")}</button>
        )}
        <button
          className="secondary"
          aria-pressed={!!flags[q.question.id]}
          onClick={() => toggleFlag(q.question.id)}
        >
          {flags[q.question.id] ? t("flaggedButton") : t("flagButton")}
        </button>
        <button className="secondary" onClick={restart}>
          {t("restartButton")}
        </button>
      </div>
      <p className="muted">
        {t("firstPassSoFar")} {firstPassCount} {t("correctCount")}
        {retries.length > 0
          ? ` · ${tf("retriesNotCounted", { n: retries.length, plural: retries.length === 1 ? "y" : "ies" })}`
          : ""}
        {mode === "mock" && minutes > 0 ? ` · ${t("timerNote")}` : ""}
      </p>
      <p className="muted">
        {t("scoringWord")} {localizedScoringLabel(scoring, lang)}
      </p>
    </div>
  );
}
