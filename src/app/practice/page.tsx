// Practice — topic quizzes, 20 per attempt, shuffled, instant feedback.
"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BY_SUBJECT, hashSeed, mulberry32, shuffled, SUBJECT_LABELS } from "@/lib/data";
import QuizRunner from "@/components/QuizRunner";
import { Suspense } from "react";

function PracticeInner() {
  const params = useSearchParams();
  const initial = params.get("subject") ?? "";
  const subjects = useMemo(() => Object.keys(BY_SUBJECT).sort(), []);
  const [subjectKey, setSubjectKey] = useState(initial || "islamiyat");
  const [round, setRound] = useState(0);

  const labelByKey: Record<string, string> = SUBJECT_LABELS;
  const subjectLabel = labelByKey[subjectKey] ?? subjectKey;

  const questions = useMemo(() => {
    const bank = BY_SUBJECT[subjectKey] ?? [];
    const rand = mulberry32(hashSeed(`${subjectKey}-${round}-${Date.now()}`));
    return shuffled(bank, rand).slice(0, 20);
  }, [subjectKey, round]);

  return (
    <div>
      <h1>Practice — Topic Quizzes</h1>
      <p className="muted">
        20 questions per attempt, shuffled every time. Instant feedback after each question. All
        questions are original practice questions, labelled “AI-generated — not verified” (drafted by
        AI, structurally checked). They are <b>not</b> ETEA questions.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select aria-label="Subject" value={subjectKey} onChange={(e) => { setSubjectKey(e.target.value); setRound((r) => r + 1); }}>
          {subjects.map((k) => (
            <option key={k} value={k}>
              {labelByKey[k] ?? k} ({BY_SUBJECT[k].length})
            </option>
          ))}
        </select>
        <button className="secondary" onClick={() => setRound((r) => r + 1)}>
          New set (shuffle again)
        </button>
      </div>
      <QuizRunner
        key={`${subjectKey}-${round}`}
        title={`${subjectLabel} quiz — 20 questions`}
        questions={questions}
        mode="practice"
        subject={subjectLabel}
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
