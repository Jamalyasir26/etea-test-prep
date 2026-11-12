// Home — preparation dashboard (live numbers from real attempts only).
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CORRECTIONS, COUNTS, PATTERN_BANNER, PATTERNS } from "@/lib/data";
import { computeStats, loadAttempts, loadPlanState, type Stats } from "@/lib/tracking";
import { useLang } from "@/lib/i18n";
import TutorHealth from "@/components/TutorHealth";

const QUICK = [
  { href: "/library", key: "library", descKey: "quickLibraryDesc" },
  { href: "/practice", key: "practice", descKey: "quickPracticeDesc" },
  { href: "/mock", key: "mocks", descKey: "quickMocksDesc" },
  { href: "/flashcards", key: "flashcards", descKey: "quickFlashDesc" },
  { href: "/tutor", key: "tutor", descKey: "quickTutorDesc" },
  { href: "/plan", key: "plan", descKey: "quickPlanDesc" },
  { href: "/analysis", key: "analysis", descKey: "quickAnalysisDesc" },
  { href: "/tracks", key: "tracks", descKey: "quickTracksDesc" },
];

export default function Home() {
  const { t, tf } = useLang();
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
      {/* Localization Pass 1 (RTL) — the site name is a proper name kept
          in English; isolated LTR so it cannot reorder in RTL mode. */}
      <h1>
        <span dir="ltr">ETEA Prep Library — KP Government Jobs</span>
      </h1>
      <p className="muted">
        {tf("homeIntro", {
          total: COUNTS.total,
          notes: COUNTS.notes,
          cards: COUNTS.cards,
          tracks: COUNTS.tracks,
          mocks: COUNTS.mocks,
        })}
      </p>

      <div className="alert red">
        <b>{t("correctionsHeading")}</b>
        <ul>
          {CORRECTIONS.map((c) => (
            // Factual correction statements stay English (precision) and
            // are isolated LTR so their punctuation cannot jump in RTL.
            <li key={c} dir="ltr">
              {c}
            </li>
          ))}
        </ul>
        <p>
          <b>
            <span dir="ltr">{PATTERN_BANNER}</span>
          </b>
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
            <span>{t("planTasksDone")}</span>
          </div>
          <div className="card stat">
            <b>{tf("minsLabel", { mins: stats.totalMinutes })}</b>
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
              <span dir="ltr">{w.subject}</span> —{" "}
              <span dir="ltr">
                {Math.round(w.accuracy)}% ({w.total} Q)
              </span>{" "}
              <Link href={`/practice?subject=${encodeURIComponent(w.subject)}`}>{t("drillArrow")}</Link>
            </p>
          ))}
          <p>
            <Link href="/analysis">{t("fullAnalysis")}</Link>
          </p>
        </div>
      )}

      <h2>{t("patternSelectorHeading")}</h2>
      <div className="card">
        <select aria-label={t("patternHeading")} value={pattern} onChange={(e) => setPattern(e.target.value)}>
          {Object.entries(PATTERNS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.name}
            </option>
          ))}
        </select>
        <p>
          <b>
            <span dir="auto">{p.name}</span>
          </b>
        </p>
        <p className="muted">
          {t("sourceLabel")} <span dir="ltr">{p.source}</span>
        </p>
        <p>
          <span dir="ltr" className={`badge ${pattern === "MD" ? "red" : "green"}`}>
            {p.confidence}
          </span>
        </p>
      </div>

      <h2>{t("dashboard")}</h2>
      <div className="grid">
        {QUICK.map((q) => (
          <Link key={q.href} href={q.href} className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <b>{t(q.key)}</b>
            <p className="muted">{t(q.descKey)}</p>
          </Link>
        ))}
      </div>

      {/* Stage 1 P2 (B06) — the stale Stage 0 wording ("answered via
          fallback … key status is unverified") is replaced by accurate
          wording plus the LIVE health status below. No historical claims. */}
      <div className="alert">
        <b>{t("tutorLiveHeading")}</b> {t("tutorLiveBody")}
        <TutorHealth variant="summary" />
      </div>
    </div>
  );
}
