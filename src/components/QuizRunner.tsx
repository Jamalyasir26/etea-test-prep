// Shared quiz / mock runner.
// Practice mode: instant feedback after each answer.
// Mock mode: no feedback until submit; timed, auto-submits at 0.
// Records every attempt (localStorage) for the live Analysis dashboard.
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
import { hashSeed, mulberry32, shuffleOptions, type Question } from "@/lib/data";
import ProvenanceBadge from "@/components/ProvenanceBadge";
import {
  computeExamScore,
  DEFAULT_SCORING,
  scoringLabel,
  type ScoringConfig,
} from "@/lib/scoring";
import {
  clearSession,
  KEY_VERSION,
  loadSession,
  loadSessionRaw,
  recordAttempt,
  reportIssueDetailed,
  saveSession,
  type ItemRecord,
  type IssueReason,
  type QuizSession,
} from "@/lib/tracking";
import { ISSUE_REASONS } from "@/lib/tracking";
import { useLang } from "@/lib/i18n";

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
};

function IssueForm({ qid, subject }: { qid: string; subject?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<IssueReason | "">("");
  const [correction, setCorrection] = useState("");
  const [source, setSource] = useState("");
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <p className="muted">
        Saved privately on this device only — nothing was sent. See the Issues page to review or
        export it.
      </p>
    );
  }
  if (!open) {
    return (
      <button className="secondary" onClick={() => setOpen(true)}>
        Report an issue
      </button>
    );
  }
  return (
    <div className="card">
      <p>
        <b>Report an issue</b>
      </p>
      <p className="muted">Saved privately on this device only — nothing is sent anywhere.</p>
      <label>
        Reason
        <select
          aria-label="Issue reason"
          value={reason}
          onChange={(e) => setReason(e.target.value as IssueReason | "")}
          style={{ display: "block", width: "100%", margin: "4px 0 8px" }}
        >
          <option value="">Choose a reason…</option>
          {ISSUE_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Proposed correction
        <textarea
          aria-label="Proposed correction"
          value={correction}
          onChange={(e) => setCorrection(e.target.value)}
          rows={3}
          style={{ display: "block", width: "100%", margin: "4px 0 8px" }}
          placeholder="What should it say instead?"
        />
      </label>
      <label>
        Source (optional)
        <input
          type="text"
          aria-label="Source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          style={{ display: "block", width: "100%", margin: "4px 0 8px" }}
          placeholder="e.g. ETEA advert, textbook page"
        />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => {
            reportIssueDetailed({
              qid,
              subject,
              reason: reason === "" ? null : reason,
              proposedCorrection: correction,
              source,
            });
            setSaved(true);
          }}
        >
          Save privately
        </button>
        <button className="secondary" onClick={() => setOpen(false)}>
          Cancel
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
}: Props) {
  const { t } = useLang();
  const scope = sessionScope ?? `quiz:${title}`;

  // Restore a live session for this scope (null when none, submitted, or expired).
  const [initialSession] = useState<QuizSession | null>(() => loadSession(scope));
  const [resumed] = useState(() => initialSession !== null);
  const [startTs, setStartTs] = useState(() => initialSession?.startedAt ?? Date.now());
  const [deadlineTs, setDeadlineTs] = useState<number | null>(() => {
    if (initialSession?.deadlineTs) return initialSession.deadlineTs;
    if (mode === "mock" && minutes > 0) return startTs + minutes * 60 * 1000;
    return null;
  });
  const [now, setNow] = useState(() => Date.now());

  const prepared = useMemo(
    () =>
      questions.map((q) => {
        const rand = mulberry32(hashSeed(q.id + String(startTs)));
        return shuffleOptions(q, rand);
      }),
    [questions, startTs],
  );

  const [answers, setAnswers] = useState<Record<string, number>>(() => initialSession?.answers ?? {});
  const [firstPass, setFirstPass] = useState<Record<string, number>>(() => initialSession?.firstPass ?? {});
  const [retries, setRetries] = useState<{ qid: string; answer: number; at: string }[]>(
    () => initialSession?.retries ?? [],
  );
  const [answeredAt, setAnsweredAt] = useState<Record<string, string>>(
    () => initialSession?.answeredAt ?? {},
  );
  const [responseMs, setResponseMs] = useState<Record<string, number>>(
    () => initialSession?.responseMs ?? {},
  );
  const [idx, setIdx] = useState(() =>
    Math.min(initialSession?.idx ?? 0, Math.max(0, prepared.length - 1)),
  );
  const [picked, setPicked] = useState<number | null>(() => {
    const id = prepared[Math.min(initialSession?.idx ?? 0, Math.max(0, prepared.length - 1))]?.question.id;
    return id !== undefined ? (initialSession?.answers[id] ?? null) : null;
  });
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const submittedRef = useRef(false);
  const shownAtRef = useRef<Record<string, number>>({});

  const q = prepared[idx];
  const total = prepared.length;

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
      version: 2,
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
    };
  }

  // Save live state per answer (and on navigation / submit).
  useEffect(() => {
    saveSession(buildSession(submittedRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, firstPass, retries, answeredAt, responseMs, idx, done, prepared]);

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
    recordAttempt({
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
    saveSession(buildSession(true));
    setDone(true);
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
    if (
      !window.confirm(
        "Discard this in-progress session and start again? Your recorded attempts are not affected.",
      )
    ) {
      return;
    }
    clearSession(scope);
    submittedRef.current = false;
    const fresh = Date.now();
    setStartTs(fresh);
    setDeadlineTs(mode === "mock" && minutes > 0 ? fresh + minutes * 60 * 1000 : null);
    setAnswers({});
    setFirstPass({});
    setRetries([]);
    setAnsweredAt({});
    setResponseMs({});
    setIdx(0);
    setPicked(null);
    setRevealed(false);
    setDone(false);
  }

  if (total === 0) return <p>No questions available for this set.</p>;

  if (done) {
    const pct = total ? Math.round((firstPassCount / total) * 100) : 0;
    const showProvisionalBadge = !trustedOnly && !allItemsVerified;
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
          {/* Stage 1 P0.2 — provisional badge while the items in this quiz are not verified. */}
          {showProvisionalBadge ? (
            <p>
              <span className="badge red">Provisional — not verified</span>
            </p>
          ) : (
            <p>
              <span className="badge green">Verified items — owner-reviewed</span>
            </p>
          )}
          <p className="muted">
            {title} · {Math.round((Date.now() - startTs) / 60000)} min
            {trustedOnly ? " · Trusted-only (owner-reviewed/approved questions)" : ""}
          </p>
          {/* Stage 1 P0.1 — raw accuracy and exam score are two separate numbers. */}
          <h3>Raw accuracy vs exam score</h3>
          <p>
            <b>
              Raw accuracy:{" "}
              <span dir="ltr">
                {firstPassCount} / {total} ({pct}%)
              </span>
            </b>{" "}
            — correct answers only, no penalty.
          </p>
          <p>
            <b>
              Exam score:{" "}
              <span dir="ltr">
                {examResult.examScore} / {examResult.examTotal} marks
              </span>
            </b>{" "}
            — {scoringLabel(examResult.config)}
            {examResult.floored ? " (floored at 0 — the raw score was negative)" : ""}
          </p>
          <p className="muted">{examResult.config.policyNote}</p>
          <p className="muted">
            Score counts your <b>first answer</b> to each question. Changing an answer afterwards
            is a retry: it is recorded for learning, but it does not change the score.
          </p>
          {retries.length > 0 && (
            <p className="muted">
              Corrected retries: <b>{retries.length}</b> (not counted in the score).
            </p>
          )}
          {unansweredCount > 0 && (
            <p className="muted">
              Unanswered: <b>{unansweredCount}</b>
            </p>
          )}
          <div className="bar" role="img" aria-label={`${pct}% correct`}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <h3>Per subject (first-pass)</h3>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Correct</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(perSubject).map(([s, [c, tt]]) => (
                <tr key={s}>
                  <td>{s}</td>
                  <td>{c}</td>
                  <td>{tt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>Review</h3>
        {prepared.map((p, i) => {
          const fp = firstPass[p.question.id];
          const fin = answers[p.question.id];
          const ok = fp !== undefined && fp === p.correctIndex;
          return (
            <div className="card" key={p.question.id}>
              <p>
                <b>Q{i + 1}.</b> {p.question.question}{" "}
                <span className={`badge ${fp === undefined ? "grey" : ok ? "green" : "red"}`}>
                  {fp === undefined ? "Unanswered" : ok ? "Correct (first try)" : "Wrong (first try)"}
                </span>
              </p>
              {p.options.map((o, oi) => (
                <p key={oi} style={{ margin: "4px 0" }}>
                  {oi === p.correctIndex ? "✅ " : fp === oi ? "❌ " : "· "}
                  {o}
                  {fp === oi ? " — your first answer" : ""}
                  {fin !== undefined && fin !== fp && fin === oi ? " — your final answer" : ""}
                </p>
              ))}
              {fin !== undefined && fp !== undefined && fin !== fp && (
                <p className="muted">
                  You changed this answer after feedback. First answer: {p.options[fp]} · Final
                  answer: {p.options[fin]} · Score uses the first answer.
                </p>
              )}
              <p className="muted">{p.question.explanation}</p>
              {p.question.pastPaperRef && <p className="muted">{p.question.pastPaperRef}</p>}
              <p className="muted">
                {p.question.source}
                {" — "}
                {p.question.reviewStatus === "owner-reviewed" ||
                p.question.reviewStatus === "approved"
                  ? "owner-reviewed"
                  : "not verified"}
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
      <h2>{title}</h2>
      {note && <div className="alert">{note}</div>}
      {resumed && (
        <div className="alert">
          Resumed your in-progress session — answers, first-pass scores and the timer were
          restored.{" "}
          <button className="secondary" onClick={restart}>
            Restart (discard session)
          </button>
        </div>
      )}
      {trustedOnly && (
        <p className="muted">Trusted-only: only owner-reviewed/approved questions.</p>
      )}
      <p className="muted">
        {/* Stage 1 P1 Tier 4 (B03) — question counter and timer isolated
            LTR so neither can reverse in RTL (Urdu) mode. */}
        Question{" "}
        <span dir="ltr">
          {idx + 1} of {total}
        </span>
        {mode === "mock" && minutes > 0 && (
          <>
            {" · "}⏱ <span dir="ltr">{mm}:{ss}</span> left
          </>
        )}
        {mode === "mock" && " · Practice mock — shares the practice bank; questions may repeat across track mocks."}
      </p>
      <div className="bar" role="img" aria-label={`Question ${idx + 1} of ${total}`}>
        <i style={{ width: `${((idx + 1) / total) * 100}%` }} />
      </div>
      <div className="card">
        <p>
          <b>Q{idx + 1}.</b> {q.question.question}{" "}
          <span className="badge grey">{q.question.subject}</span>
          {q.question.pastPaperRef && <span className="badge">{q.question.pastPaperRef.includes("reworded") ? "Reworded" : "Original"}</span>}
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
              {String.fromCharCode(65 + i)}. {o}
            </button>
          );
        })}
        {mode === "practice" && revealed && (
          <div className="alert green">
            <p>
              <b>{pickedCorrect ? t("correct") : t("wrong")}</b> — {q.question.explanation}
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
        <button className="secondary" onClick={restart}>
          Restart (discard session)
        </button>
      </div>
      <p className="muted">
        First-pass score so far: {firstPassCount} correct
        {retries.length > 0 ? ` · ${retries.length} corrected retr${retries.length === 1 ? "y" : "ies"} (not counted)` : ""}
        {mode === "mock" && minutes > 0
          ? " · The timer ends at a fixed time — reloading the page does not reset it."
          : ""}
      </p>
      <p className="muted">Scoring: {scoringLabel(scoring)}</p>
    </div>
  );
}
