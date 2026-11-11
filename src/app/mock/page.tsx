// Practice — topic quizzes, 20 per attempt, shuffled, instant feedback.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BY_SUBJECT, hashSeed, mulberry32, shuffled, SUBJECT_LABELS } from "@/lib/data";
import QuizRunner from "@/components/QuizRunner";
import { Suspense } from "react";

// The current subject/round/seed is persisted so a reload resumes the SAME
// 20-question set (and QuizRunner resumes its saved session for that scope)
// instead of silently shuffling a new set. "New set" bumps the round and
// stores a fresh seed.
const PRACTICE_STATE_KEY = "etea_practice_state_next";

type PracticeState = { subjectKey: string; round: number; seed: number };

function loadPracticeState(fallbackSubject: string): PracticeState {
  if (typeof window === "undefined") return { subjectKey: fallbackSubject, round: 0, seed: Date.now() };
  try {
    const raw = localStorage.getItem(PRACTICE_STATE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<PracticeState>;
      if (typeof p.subjectKey === "string" && typeof p.round === "number" && typeof p.seed === "number") {
        return { subjectKey: p.subjectKey, round: p.round, seed: p.seed };
      }
    }
  } catch {
    // fall through to a fresh state
  }
  return { subjectKey: fallbackSubject, round: 0, seed: Date.now() };
}

function PracticeInner() {
  const params = useSearchParams();
  const initial = params.get("subject") ?? "";
  const subjects = useMemo(() => Object.keys(BY_SUBJECT).sort(), []);
  const [stored] = useState(() => loadPracticeState(initial || "islamiyat"));
  const [subjectKey, setSubjectKey] = useState(() =>
    initial && BY_SUBJECT[initial] ? initial : stored.subjectKey,
  );
  const [round, setRound] = useState(() =>
    initial && BY_SUBJECT[initial] && initial === stored.subjectKey ? stored.round : 0,
  );
  const [seed, setSeed] = useState(() =>
    initial && BY_SUBJECT[initial] && initial === stored.subjectKey ? stored.seed : Date.now(),
  );

  useEffect(() => {
    localStorage.setItem(PRACTICE_STATE_KEY, JSON.stringify({ subjectKey, round, seed }));
  }, [subjectKey, round, seed]);

  const labelByKey: Record<string, string> = SUBJECT_LABELS;
  const subjectLabel = labelByKey[subjectKey] ?? subjectKey;

  const questions = useMemo(() => {
    const bank = BY_SUBJECT[subjectKey] ?? [];
    const rand = mulberry32(hashSeed(`${subjectKey}-${round}-${seed}`));
    return shuffled(bank, rand).slice(0, 20);
  }, [subjectKey, round, seed]);

  function newSet() {
    setRound((r) => r + 1);
    setSeed(Date.now());
  }

  return (
    <div>
      <h1>Practice — Topic Quizzes</h1>
      <p className="muted">
        20 questions per attempt, shuffled every time. Instant feedback after each question. All
        questions are original practice questions, labelled “AI-generated — not verified” (drafted by
        AI, structurally checked). They are <b>not</b> ETEA questions.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select
          aria-label="Subject"
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
          New set (shuffle again)
        </button>
      </div>
      <QuizRunner
        key={`${subjectKey}-${round}`}
        title={`${subjectLabel} quiz — 20 questions`}
        questions={questions}
        mode="practice"
        subject={subjectLabel}
        sessionScope={`practice:${subjectKey}:${round}`}
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
