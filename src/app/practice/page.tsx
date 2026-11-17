// Practice — topic quizzes, 20 per attempt by default (?count= sets
// the drill size, 5–20), shuffled, instant feedback.
//
// Phase 3 modes (?mode=): standard (default — today's behaviour plus
// an optional timer), revise (previously-wrong questions, across
// subjects, no subject selector), adaptive (weak-topic-weighted set
// for one subject, with a transparency line). Standard mode keeps the
// stored round/seed restore exactly as before; revise/adaptive run on
// in-memory round/seed and never touch the stored standard state.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { findQuestionsByIds, hashSeed, isTrusted, mulberry32, shuffled, SUBJECT_LABELS, type Question } from "@/lib/data";
import { BANK_COUNTS, BANK_KEYS, loadBank } from "@/lib/banks";
import { lri, useLang } from "@/lib/i18n";
import { loadPracticeState, PRACTICE_STATE_KEY, resolvePracticeInitial } from "@/lib/practice";
import { buildAdaptiveSet, buildReviseQueue, computeTopicStats, type TopicStat } from "@/lib/practice-advance";
import { loadAttempts, loadReviews, safeWrite } from "@/lib/tracking";
import QuizRunner from "@/components/QuizRunner";
import { Suspense } from "react";

type PracticeMode = "standard" | "revise" | "adaptive";

function PracticeInner() {
  const { t, tf } = useLang();
  const params = useSearchParams();
  const initial = params.get("subject") ?? "";
  // Step 2b — ?count= sets the drill size (the Analysis page's "Run
  // 10-question drill" links here with count=10). Clamped to 5–20: a
  // smaller set is not a drill, and 20 is the standard set size. The
  // count is part of the session scope (only when it differs from the
  // default 20, so existing stored sessions keep working). The clamp
  // applies in all three modes.
  const countParam = Number(params.get("count") ?? "20");
  const count = Number.isFinite(countParam) ? Math.min(20, Math.max(5, Math.floor(countParam))) : 20;
  const subjects = useMemo(() => [...BANK_KEYS].sort(), []);
  // Phase 3 — mode is UI state initialised from ?mode=: revise |
  // adaptive | anything else = standard. Changing mode does NOT write
  // PRACTICE_STATE_KEY (see the gated write effect below).
  const modeParam = params.get("mode");
  const [mode, setMode] = useState<PracticeMode>(
    modeParam === "revise" ? "revise" : modeParam === "adaptive" ? "adaptive" : "standard",
  );
  // Step 2 fixes — the initial subject/round/seed resolve through one
  // pure function (src/lib/practice.ts): the bare URL restores the
  // stored round + seed, so a reload resumes the SAME set and the
  // stored session. A ?subject= naming a different subject starts
  // fresh (per-scope sessions are the design).
  const [practiceInit] = useState(() => {
    const stored = loadPracticeState(initial || "islamiyat");
    return resolvePracticeInitial(initial, stored, (k) => (BANK_KEYS as readonly string[]).includes(k), Date.now());
  });
  const [subjectKey, setSubjectKey] = useState(practiceInit.subjectKey);
  const [round, setRound] = useState(practiceInit.round);
  const [seed, setSeed] = useState(practiceInit.seed);
  // Phase 3 — revise/adaptive run on IN-MEMORY subject/round/seed
  // (fresh Date.now() seed at mount). They are never written to
  // PRACTICE_STATE_KEY, so switching modes never overwrites the
  // stored standard run's resume position.
  // P1 per-subject resume is NOT implemented here (design only).
  const [altSubjectKey, setAltSubjectKey] = useState(practiceInit.subjectKey);
  const [altRound, setAltRound] = useState(0);
  const [altSeed, setAltSeed] = useState(() => Date.now());

  useEffect(() => {
    // Phase 3 mode rule: ONLY standard mode writes PRACTICE_STATE_KEY.
    // Revise/adaptive use the in-memory round/seed above and must
    // never overwrite the stored standard state, so switching modes
    // never loses the standard run's resume position.
    // P1 per-subject resume is NOT implemented here (design only).
    if (mode !== "standard") return;
    // Stage 1 P1 Tier 2: safeWrite never throws on full/blocked storage.
    safeWrite(PRACTICE_STATE_KEY, JSON.stringify({ subjectKey, round, seed }));
  }, [mode, subjectKey, round, seed]);

  const labelByKey: Record<string, string> = SUBJECT_LABELS;
  // Adaptive runs against its own (in-memory) subject; in standard
  // mode this is exactly today's subjectKey.
  const effSubjectKey = mode === "adaptive" ? altSubjectKey : subjectKey;
  const subjectLabel = labelByKey[effSubjectKey] ?? effSubjectKey;

  // Timed runs (standard + adaptive): OFF by default, 10 minutes when
  // enabled. When ON, the toggle appends :t<minutes> to the session
  // scope and the timed marker to the QuizRunner key so toggling
  // remounts; when OFF, both suffixes are empty, so scope and key are
  // byte-identical to the untimed form.
  const [timedEnabled, setTimedEnabled] = useState(false);
  const [timedMinutes, setTimedMinutes] = useState(10);
  const countScopeSuffix = count === 20 ? "" : `:c${count}`;
  const timedScopeSuffix = timedEnabled ? `:t${timedMinutes}` : "";
  const timedKeySuffix = timedEnabled ? `-t${timedMinutes}` : "";
  const standardScope = `practice:${subjectKey}:${round}${countScopeSuffix}${timedScopeSuffix}`;

  // Lazy bank: the subject's chunk loads on demand; QuizRunner mounts
  // only once it arrives (an empty question list must never create a
  // session fingerprint for this scope). A failed load shows a
  // failure state with retry instead of a blank page: offline, a
  // subject never opened online has no cached chunk yet. Revise mode
  // loads its questions by id (see below) and needs no bank chunk.
  const [bank, setBank] = useState<Question[] | null>(null);
  const [bankError, setBankError] = useState<"offline" | "error" | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  useEffect(() => {
    if (mode === "revise") {
      setBank(null);
      setBankError(null);
      return;
    }
    let live = true;
    setBank(null);
    setBankError(null);
    loadBank(effSubjectKey).then(
      (b) => {
        if (live) setBank(b);
      },
      () => {
        if (live)
          setBankError(
            typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error",
          );
      },
    );
    return () => {
      live = false;
    };
  }, [mode, effSubjectKey, retryNonce]);

  // Standard sampling — unchanged: seeded shuffle of the bank, first
  // `count` questions.
  const questions = useMemo(() => {
    const rand = mulberry32(hashSeed(`${subjectKey}-${round}-${seed}`));
    return shuffled(bank ?? [], rand).slice(0, count);
  }, [bank, subjectKey, round, seed, count]);

  // ---- Adaptive: topic stats from stored attempts, refreshed on
  // every new set (round/seed bump) so a just-finished run counts.
  // The statsHash pins the set to the stats it was built from: the
  // QuizRunner key carries it, so a stats change remounts.
  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);
  const [topicStatsReady, setTopicStatsReady] = useState(false);
  useEffect(() => {
    if (mode !== "adaptive") return;
    setTopicStats(computeTopicStats(loadAttempts()));
    setTopicStatsReady(true);
  }, [mode, altRound, altSeed]);
  const statsHash = useMemo(
    () => hashSeed(topicStats.map((s) => `${s.topic}:${s.correct}/${s.total}`).join("|")),
    [topicStats],
  );
  const adaptiveSeed = `${altSubjectKey}-${altRound}-${altSeed}-${statsHash}`;
  const adaptiveQuestions = useMemo(
    () => buildAdaptiveSet({ bank: bank ?? [], topicStats, count, seed: adaptiveSeed }),
    [bank, topicStats, count, adaptiveSeed],
  );
  const adaptiveScope = `practice:adaptive:${altSubjectKey}:${altRound}${countScopeSuffix}${timedScopeSuffix}`;

  // ---- Revise: derive the queue from stored attempts, take the first
  // `count` ids, load those questions by id. Missing ids are skipped
  // silently by findQuestionsByIds, never a crash; an empty queue (or
  // all ids missing) renders the empty state and never mounts
  // QuizRunner, so no session fingerprint is created for an empty
  // list. The queue spans subjects, so the revise QuizRunner gets no
  // `subject` prop: that keeps its session fingerprint
  // language-stable, while per-question subjects are still recorded
  // via perSubject/itemRecords.
  const [reviseNonce, setReviseNonce] = useState(0);
  const [reviseRetryNonce, setReviseRetryNonce] = useState(0);
  const [reviseQueueIds, setReviseQueueIds] = useState<string[]>([]);
  const [reviseQueueLength, setReviseQueueLength] = useState(0);
  const [reviseQuestions, setReviseQuestions] = useState<Question[] | null>(null);
  const [reviseError, setReviseError] = useState<"offline" | "error" | null>(null);
  useEffect(() => {
    if (mode !== "revise") return;
    let live = true;
    setReviseQuestions(null);
    setReviseError(null);
    const queue = buildReviseQueue(loadAttempts());
    const queueIds = queue.slice(0, count).map((e) => e.questionId);
    setReviseQueueIds(queueIds);
    setReviseQueueLength(queue.length);
    if (queueIds.length === 0) {
      setReviseQuestions([]);
      return;
    }
    findQuestionsByIds(queueIds).then(
      (qs) => {
        if (live) setReviseQuestions(qs);
      },
      () => {
        if (live)
          setReviseError(
            typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error",
          );
      },
    );
    return () => {
      live = false;
    };
  }, [mode, count, reviseNonce, reviseRetryNonce]);
  const queueHash = hashSeed(reviseQueueIds.join(","));

  // Stage 1 P0.2 — the results screen shows "Provisional — not verified"
  // unless every question in this set is owner-reviewed/approved.
  const [reviews] = useState(() => loadReviews());
  const overrides: Record<string, string> = {};
  for (const [qid, r] of Object.entries(reviews)) overrides[qid] = r.reviewStatus;
  const activeQuestions =
    mode === "revise" ? (reviseQuestions ?? []) : mode === "adaptive" ? adaptiveQuestions : questions;
  const allItemsVerified = activeQuestions.length > 0 && activeQuestions.every((q) => isTrusted(q, overrides));

  function newSet() {
    // Revise re-derives the queue from the latest attempts; standard
    // and adaptive bump round + fresh seed (adaptive's are in-memory).
    if (mode === "revise") {
      setReviseNonce((n) => n + 1);
      return;
    }
    if (mode === "adaptive") {
      setAltRound((r) => r + 1);
      setAltSeed(Date.now());
      return;
    }
    setRound((r) => r + 1);
    setSeed(Date.now());
  }

  // Adaptive transparency: weakest-first (computeTopicStats sorts
  // accuracy ascending), top 3 topics with a real sample (total >= 3)
  // below 70% accuracy. The localized line carries {topics}; tf
  // substitutes inline, so the English names are isolated in a
  // dir="ltr" span by splitting the rendered line on the joined
  // names. If a translation ever drops the placeholder, the line
  // renders as-is.
  const weakTopics = topicStats.filter((s) => s.total >= 3 && s.accuracy < 70).slice(0, 3);
  const weakNames = weakTopics.map((s) => s.topic).join(", ");
  const pickedLine = weakTopics.length > 0 ? tf("adaptivePickedLine", { topics: weakNames }) : "";
  const pickedParts = weakTopics.length > 0 ? pickedLine.split(weakNames) : [pickedLine];

  return (
    <div>
      <h1>{t("practiceTitle")}</h1>
      <p className="muted">
        {t("practiceIntro1")} {t("notEteaQuestions")}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select
          aria-label={t("practiceModeLabel")}
          value={mode}
          onChange={(e) => {
            const v = e.target.value;
            setMode(v === "revise" ? "revise" : v === "adaptive" ? "adaptive" : "standard");
          }}
        >
          <option value="standard">{t("practiceModeStandard")}</option>
          <option value="revise">{t("practiceModeRevise")}</option>
          <option value="adaptive">{t("practiceModeAdaptive")}</option>
        </select>
        {mode !== "revise" && (
          <select
            aria-label={t("subjectWord")}
            value={mode === "adaptive" ? altSubjectKey : subjectKey}
            onChange={(e) => {
              if (mode === "adaptive") {
                setAltSubjectKey(e.target.value);
                setAltRound(0);
                setAltSeed(Date.now());
              } else {
                setSubjectKey(e.target.value);
                setRound(0);
                setSeed(Date.now());
              }
            }}
          >
            {subjects.map((k) => (
              <option key={k} value={k}>
                {labelByKey[k] ?? k} ({BANK_COUNTS[k] ?? 0})
              </option>
            ))}
          </select>
        )}
        <button className="secondary" onClick={newSet}>
          {t("newSet")}
        </button>
        {mode !== "revise" && (
          <>
            <label>
              <input
                type="checkbox"
                checked={timedEnabled}
                onChange={(e) => setTimedEnabled(e.target.checked)}
              />
              {t("timedToggleLabel")}
            </label>
            {timedEnabled && (
              <label>
                {t("timedMinutesLabel")}{" "}
                <select
                  aria-label={t("timedMinutesAria")}
                  value={timedMinutes}
                  onChange={(e) => setTimedMinutes(Number(e.target.value))}
                >
                  {[5, 10, 15, 20, 30].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}
      </div>
      {mode !== "revise" && timedEnabled && <p className="muted">{t("timedExpiryNote")}</p>}
      {mode === "adaptive" &&
        topicStatsReady &&
        (weakTopics.length > 0 ? (
          <p className="muted">
            {pickedParts.length > 1 ? (
              <>
                {pickedParts[0]}
                <span dir="ltr">{weakNames}</span>
                {pickedParts.slice(1).join(weakNames)}
              </>
            ) : (
              pickedLine
            )}
          </p>
        ) : (
          <p className="muted">{t("adaptiveUniformLine")}</p>
        ))}
      {mode === "revise" && reviseError === null && reviseQuestions !== null && (
        <>
          <p className="muted">{tf("reviseQueueCount", { n: reviseQueueLength })}</p>
          <p className="muted">{t("reviseClearedNote")}</p>
        </>
      )}
      {mode !== "revise" ? (
        bankError !== null ? (
          <div className="alert">
            <p>{t(bankError === "offline" ? "bankLoadFailedOffline" : "bankLoadFailed")}</p>
            <button className="secondary" onClick={() => setRetryNonce((n) => n + 1)}>
              {t("retryButton")}
            </button>
          </div>
        ) : bank === null ? (
          <p className="muted" role="status">{t("loading")}</p>
        ) : mode === "adaptive" ? (
          <QuizRunner
            key={`adaptive-${altSubjectKey}-${altRound}-${count}${timedKeySuffix}-${statsHash}`}
            title={tf("quizTitle", { subject: lri(subjectLabel) })}
            questions={adaptiveQuestions}
            mode="practice"
            minutes={timedEnabled ? timedMinutes : 0}
            subject={subjectLabel}
            allItemsVerified={allItemsVerified}
            sessionScope={adaptiveScope}
            questionSeed={adaptiveSeed}
          />
        ) : (
          <QuizRunner
            key={`${subjectKey}-${round}-${count}${timedKeySuffix}`}
            title={tf("quizTitle", { subject: lri(subjectLabel) })}
            questions={questions}
            mode="practice"
            minutes={timedEnabled ? timedMinutes : 0}
            subject={subjectLabel}
            allItemsVerified={allItemsVerified}
            sessionScope={standardScope}
            questionSeed={String(seed)}
          />
        )
      ) : reviseError !== null ? (
        <div className="alert">
          <p>{t(reviseError === "offline" ? "bankLoadFailedOffline" : "bankLoadFailed")}</p>
          <button className="secondary" onClick={() => setReviseRetryNonce((n) => n + 1)}>
            {t("retryButton")}
          </button>
        </div>
      ) : reviseQuestions === null ? (
        <p className="muted" role="status">{t("loading")}</p>
      ) : reviseQuestions.length === 0 ? (
        <p>{t("reviseEmpty")}</p>
      ) : (
        <QuizRunner
          key={`revise-${queueHash}-${count}`}
          title={t("reviseTitle")}
          questions={reviseQuestions}
          mode="practice"
          allItemsVerified={allItemsVerified}
          sessionScope={`practice:revise:${queueHash}`}
          questionSeed={String(queueHash)}
        />
      )}
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
