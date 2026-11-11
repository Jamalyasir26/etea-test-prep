// Shared quiz / mock runner.
// Practice mode: instant feedback after each answer.
// Mock mode: no feedback until submit; timed, auto-submits at 0.
// Records every attempt (localStorage) for the live Analysis dashboard.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { hashSeed, mulberry32, shuffleOptions, type Question } from "@/lib/data";
import { recordAttempt } from "@/lib/tracking";
import { useLang } from "@/lib/i18n";

type Props = {
  title: string;
  questions: Question[];
  minutes?: number; // 0 = no timer
  mode: "practice" | "mock";
  subject?: string;
  mockId?: string;
  trackId?: string;
  note?: string;
};

export default function QuizRunner({ title, questions, minutes = 0, mode, subject, mockId, trackId, note }: Props) {
  const { t } = useLang();
  const [startTs] = useState(() => Date.now());
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null); // index into displayed options
  const [answers, setAnswers] = useState<Record<string, number>>({}); // qid -> displayed option index
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const [issueNote, setIssueNote] = useState("");
  const recorded = useRef(false);

  const prepared = useMemo(
    () =>
      questions.map((q) => {
        const rand = mulberry32(hashSeed(q.id + String(startTs)));
        return shuffleOptions(q, rand);
      }),
    [questions, startTs],
  );

  // timer (mock mode only)
  useEffect(() => {
    if (mode !== "mock" || minutes <= 0 || done) return;
    const iv = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(iv);
  }, [mode, minutes, done]);

  const q = prepared[idx];
  const total = prepared.length;

  const correctCount = useMemo(() => {
    let c = 0;
    for (const p of prepared) {
      const a = answers[p.question.id];
      if (a !== undefined && a === p.correctIndex) c++;
    }
    return c;
  }, [answers, prepared]);

  const perSubject = useMemo(() => {
    const m: Record<string, [number, number]> = {};
    for (const p of prepared) {
      const a = answers[p.question.id];
      const e = m[p.question.subject] ?? [0, 0];
      e[1] += 1;
      if (a !== undefined && a === p.correctIndex) e[0] += 1;
      m[p.question.subject] = e;
    }
    return m;
  }, [answers, prepared]);

  function finish() {
    if (!recorded.current) {
      recorded.current = true;
      recordAttempt({
        kind: mode === "mock" ? "mock" : "quiz",
        subject,
        mockId,
        trackId,
        title,
        total,
        correct: correctCount,
        seconds: Math.round((Date.now() - startTs) / 1000),
        perSubject,
      });
    }
    setDone(true);
  }

  useEffect(() => {
    if (mode === "mock" && minutes > 0 && secondsLeft === 0 && !done) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  function reportIssue(qid: string) {
    const raw = localStorage.getItem("etea_issues_next");
    const list = raw ? JSON.parse(raw) : [];
    list.push({ qid, date: new Date().toISOString() });
    localStorage.setItem("etea_issues_next", JSON.stringify(list));
    setIssueNote("Thanks — noted. (Report an issue)");
  }

  if (total === 0) return <p>No questions available for this set.</p>;

  if (done) {
    const pct = Math.round((correctCount / total) * 100);
    return (
      <div>
        <div className="card">
          <h2>
            {t("score")}: {correctCount} / {total} ({pct}%)
          </h2>
          <p className="muted">
            {title} · {Math.round((Date.now() - startTs) / 60000)} min
          </p>
          <div className="bar" role="img" aria-label={`${pct}% correct`}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <h3>Per subject</h3>
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
          const a = answers[p.question.id];
          const ok = a === p.correctIndex;
          return (
            <div className="card" key={p.question.id}>
              <p>
                <b>Q{i + 1}.</b> {p.question.question}{" "}
                <span className={`badge ${ok ? "green" : "red"}`}>{ok ? "Correct" : "Wrong"}</span>
              </p>
              {p.options.map((o, oi) => (
                <p key={oi} style={{ margin: "4px 0" }}>
                  {oi === p.correctIndex ? "✅ " : a === oi ? "❌ " : "· "}
                  {o}
                </p>
              ))}
              <p className="muted">{p.question.explanation}</p>
              {p.question.pastPaperRef && <p className="muted">{p.question.pastPaperRef}</p>}
              <p className="muted">AI-generated — not verified</p>
              <button className="secondary" onClick={() => reportIssue(p.question.id)}>
                Report an issue
              </button>
            </div>
          );
        })}
        {issueNote && <p className="muted">{issueNote}</p>}
      </div>
    );
  }

  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const pickedCorrect = picked !== null && picked === q.correctIndex;

  function choose(i: number) {
    if (mode === "practice") {
      if (revealed) return;
      setPicked(i);
      setAnswers((prev) => ({ ...prev, [q.question.id]: i }));
      setRevealed(true);
    } else {
      setPicked(i);
      setAnswers((prev) => ({ ...prev, [q.question.id]: i }));
    }
  }

  function next() {
    if (idx + 1 >= total) finish();
    else {
      setIdx(idx + 1);
      setPicked(answers[prepared[idx + 1].question.id] ?? null);
      setRevealed(false);
    }
  }

  return (
    <div>
      <h2>{title}</h2>
      {note && <div className="alert">{note}</div>}
      <p className="muted">
        Question {idx + 1} of {total}
        {mode === "mock" && minutes > 0 && (
          <>
            {" · "}⏱ {mm}:{ss} left
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
        </p>
        {q.options.map((o, i) => {
          let cls = "opt";
          if (mode === "practice" && revealed) {
            if (i === q.correctIndex) cls += " picked-correct";
            else if (i === picked) cls += " picked-wrong";
          } else if (mode === "mock" && picked === i) {
            cls += " show-correct";
          }
          return (
            <button key={i} className={cls} onClick={() => choose(i)} disabled={mode === "practice" && revealed}>
              {String.fromCharCode(65 + i)}. {o}
            </button>
          );
        })}
        {mode === "practice" && revealed && (
          <div className="alert green">
            <p>
              <b>{pickedCorrect ? t("correct") : t("wrong")}</b> — {q.question.explanation}
            </p>
            <button className="secondary" onClick={() => reportIssue(q.question.id)}>
              Report an issue
            </button>
            {issueNote && <p className="muted">{issueNote}</p>}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="secondary"
          disabled={idx === 0}
          onClick={() => {
            setIdx(idx - 1);
            setPicked(answers[prepared[idx - 1].question.id] ?? null);
            setRevealed(false);
          }}
        >
          {t("back")}
        </button>
        {mode === "practice" ? (
          <button disabled={!revealed} onClick={next}>
            {idx + 1 >= total ? t("submit") : t("next")}
          </button>
        ) : (
          <button onClick={next}>{idx + 1 >= total ? t("submit") : t("next")}</button>
        )}
      </div>
    </div>
  );
}
