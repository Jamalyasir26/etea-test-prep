// Home — preparation dashboard (live numbers from real attempts only).
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CORRECTIONS, COUNTS, PATTERN_BANNER, PATTERNS } from "@/lib/data";
import { computeStats, loadAttempts, loadPlanState, type Stats } from "@/lib/tracking";
import { useLang } from "@/lib/i18n";

const QUICK = [
  { href: "/library", key: "library", desc: "95 notes with recall-first prompts" },
  { href: "/practice", key: "practice", desc: "Topic quizzes, 20 per attempt" },
  { href: "/mock", key: "mocks", desc: "20 timed mocks / practice tests" },
  { href: "/flashcards", key: "flashcards", desc: "70 cards, simple spaced-review schedule" },
  { href: "/tutor", key: "tutor", desc: "Live AI tutor (Gemini, Groq + OpenRouter fallbacks)" },
  { href: "/plan", key: "plan", desc: "3 / 6 / 12-week study plans" },
  { href: "/analysis", key: "analysis", desc: "Live accuracy, trends, weak areas" },
  { href: "/tracks", key: "tracks", desc: "19 post tracks with patterns" },
];

export default function Home() {
  const { t } = useLang();
  const [stats, setStats] = useState<Stats | null>(null);
  const [planDone, setPlanDone] = useState(0);
  const [pattern, setPattern] = useState("B");

  useEffect(() => {
    setStats(computeStats(loadAttempts()));
    setPlanDone(Object.values(loadPlanState()).filter(Boolean).length);
  }, []);

  const p = PATTERNS[pattern];
  return (
    <div>
      <h1>ETEA Prep Library — KP Government Jobs</h1>
      <p className="muted">
        Personal preparation — everything for upcoming KP tests in one place. {COUNTS.total} MCQs ·{" "}
        {COUNTS.notes} notes · {COUNTS.cards} flashcards · {COUNTS.tracks} post tracks · {COUNTS.mocks}{" "}
        mocks.
      </p>

      <div className="alert red">
        <b>⚠️ Corrections — read first.</b>
        <ul>
          {CORRECTIONS.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p>
          <b>{PATTERN_BANNER}</b>
        </p>
      </div>

      {stats && (
        <div className="grid">
          <div className="card stat">
            <b>{stats.totalAttempts}</b>
            <span>{t("attempts")}</span>
          </div>
          <div className="card stat">
            <b>{stats.hasData ? `${Math.round(stats.accuracy)}%` : "—"}</b>
            <span>{t("accuracy")}</span>
          </div>
          <div className="card stat">
            <b>{stats.streakDays}</b>
            <span>{t("streak")}</span>
          </div>
          <div className="card stat">
            <b>
              {planDone} / 63
            </b>
            <span>Plan tasks done</span>
          </div>
          <div className="card stat">
            <b>{stats.totalMinutes} min</b>
            <span>{t("timeSpent")}</span>
          </div>
        </div>
      )}
      {stats && !stats.hasData && <p className="muted">{t("noAttempts")}</p>}
      {stats && stats.weakest.length > 0 && (
        <div className="card">
          <h3>{t("weakAreas")}</h3>
          {stats.weakest.map((w) => (
            <p key={w.subject}>
              <span className={`heat ${w.accuracy < 50 ? "red" : w.accuracy < 70 ? "yellow" : "green"}`} />
              {w.subject} — {Math.round(w.accuracy)}% ({w.total} Q){" "}
              <Link href={`/practice?subject=${encodeURIComponent(w.subject)}`}>{t("drill")} →</Link>
            </p>
          ))}
          <p>
            <Link href="/analysis">Full analysis →</Link>
          </p>
        </div>
      )}

      <h2>Pattern selector — pick the version your advert follows</h2>
      <div className="card">
        <select aria-label="Pattern version" value={pattern} onChange={(e) => setPattern(e.target.value)}>
          {Object.entries(PATTERNS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.name}
            </option>
          ))}
        </select>
        <p>
          <b>{p.name}</b>
        </p>
        <p className="muted">Source: {p.source}</p>
        <p>
          <span className={`badge ${pattern === "MD" ? "red" : "green"}`}>{p.confidence}</span>
        </p>
      </div>

      <h2>{t("dashboard")}</h2>
      <div className="grid">
        {QUICK.map((q) => (
          <Link key={q.href} href={q.href} className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <b>{t(q.key)}</b>
            <p className="muted">{q.desc}</p>
          </Link>
        ))}
      </div>

      <div className="alert">
        <b>AI Tutor — live, answered via fallback.</b> The tutor calls Gemini (primary) with
        Groq and OpenRouter (free model) as fallbacks, server-side only. It has answered live via a
        fallback provider; the primary Gemini key status is unverified. If a saved key is rejected,
        the page will say so clearly — and the offline Study Assistant (library search) still works.
      </div>
    </div>
  );
}
