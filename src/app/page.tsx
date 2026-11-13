// Home — preparation dashboard (live numbers from real attempts only).
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarDays,
  FileText,
  GraduationCap,
  Layers,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import { CORRECTIONS, COUNTS, FLASHCARDS, PATTERN_BANNER, PATTERNS } from "@/lib/data";
import {
  computeStats,
  countDueFlashcards,
  loadAttempts,
  loadPlanState,
  type Stats,
} from "@/lib/tracking";
import { useLang } from "@/lib/i18n";
import TutorHealth from "@/components/TutorHealth";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion";

const QUICK: { href: string; key: string; descKey: string; Icon: LucideIcon }[] = [
  { href: "/library", key: "library", descKey: "quickLibraryDesc", Icon: BookOpen },
  { href: "/practice", key: "practice", descKey: "quickPracticeDesc", Icon: PenLine },
  { href: "/mock", key: "mocks", descKey: "quickMocksDesc", Icon: FileText },
  { href: "/flashcards", key: "flashcards", descKey: "quickFlashDesc", Icon: Layers },
  { href: "/tutor", key: "tutor", descKey: "quickTutorDesc", Icon: GraduationCap },
  { href: "/plan", key: "plan", descKey: "quickPlanDesc", Icon: CalendarDays },
  { href: "/analysis", key: "analysis", descKey: "quickAnalysisDesc", Icon: BarChart3 },
  { href: "/tracks", key: "tracks", descKey: "quickTracksDesc", Icon: Briefcase },
];

export default function Home() {
  const { t, tf } = useLang();
  const [stats, setStats] = useState<Stats | null>(null);
  const [planDone, setPlanDone] = useState(0);
  const [dueCards, setDueCards] = useState(0);
  const [pattern, setPattern] = useState("B");

  useEffect(() => {
    setStats(computeStats(loadAttempts()));
    setPlanDone(Object.values(loadPlanState()).filter(Boolean).length);
    // Stage 2 — FSRS due count (due-now + new cards, 0 when none due).
    // Pure in-memory read: it never writes or migrates stored state.
    setDueCards(countDueFlashcards(FLASHCARDS, new Date()));
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

      {/* Stage 3 part 2 — Command Center: the same 6 live stats as
          before (same data, same values), now shadcn Cards with a
          staggered entrance. The plan card adds a progress bar
          (planDone / 63). The due-today card links to /flashcards. */}
      {stats && (
        <div className="grid">
          <FadeIn delay={0}>
            <Card className="tw:h-full tw:gap-1 tw:p-4">
              <p className="tw:m-0 tw:text-3xl tw:font-bold">{stats.totalAttempts}</p>
              <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{t("attempts")}</p>
            </Card>
          </FadeIn>
          <FadeIn delay={0.05}>
            <Card className="tw:h-full tw:gap-1 tw:p-4">
              <p className="tw:m-0 tw:text-3xl tw:font-bold">{stats.hasData ? `${Math.round(stats.accuracy)}%` : "—"}</p>
              <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{t("accuracy")}</p>
            </Card>
          </FadeIn>
          <FadeIn delay={0.1}>
            <Card className="tw:h-full tw:gap-1 tw:p-4">
              <p className="tw:m-0 tw:text-3xl tw:font-bold">{stats.streakDays}</p>
              <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{t("streak")}</p>
            </Card>
          </FadeIn>
          <FadeIn delay={0.15}>
            <Card className="tw:h-full tw:gap-1 tw:p-4">
              <p className="tw:m-0 tw:text-3xl tw:font-bold">
                {/* Stage 3 part 2 — LIVE DEFECT (a): this fraction was NOT
                    isolated, so in Urdu (RTL) mode the bidi algorithm
                    displayed "63 / 0" instead of "0 / 63". Same B03
                    pattern as the other fractions on this page. */}
                <span dir="ltr">
                  {planDone} / 63
                </span>
              </p>
              <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{t("planTasksDone")}</p>
              <div
                className="tw:mt-2 tw:h-2 tw:w-full tw:overflow-hidden tw:rounded-full tw:bg-muted"
                role="img"
                aria-label={`${t("planProgressLabel")}: ${planDone} / 63`}
              >
                <div className="tw:h-full tw:rounded-full tw:bg-primary" style={{ width: `${(planDone / 63) * 100}%` }} />
              </div>
            </Card>
          </FadeIn>
          <FadeIn delay={0.2}>
            <Card className="tw:h-full tw:gap-1 tw:p-4">
              <p className="tw:m-0 tw:text-3xl tw:font-bold">{tf("minsLabel", { mins: stats.totalMinutes })}</p>
              <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{t("timeSpent")}</p>
            </Card>
          </FadeIn>
          <FadeIn delay={0.25}>
            <Link href="/flashcards" className="tw:block tw:h-full" style={{ textDecoration: "none", color: "inherit" }}>
              <Card className="tw:h-full tw:gap-1 tw:p-4">
                <p className="tw:m-0 tw:text-3xl tw:font-bold">
                  {/* Stage 2 (B03 pattern) — the count is isolated LTR. */}
                  <span dir="ltr">{dueCards}</span>
                </p>
                <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{t("cardsDueLabel")}</p>
              </Card>
            </Link>
          </FadeIn>
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
        {QUICK.map((q, i) => (
          <FadeIn key={q.href} delay={i * 0.04}>
            <Link href={q.href} className="tw:block tw:h-full" style={{ textDecoration: "none", color: "inherit" }}>
              <Card className="tw:h-full tw:gap-1 tw:p-4">
                <p className="tw:m-0 tw:flex tw:items-center tw:gap-2 tw:text-base tw:font-semibold">
                  <q.Icon className="tw:size-5 tw:shrink-0 tw:text-brand-teal" aria-hidden="true" />
                  {t(q.key)}
                </p>
                <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{t(q.descKey)}</p>
              </Card>
            </Link>
          </FadeIn>
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
