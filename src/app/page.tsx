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
import {
  CORRECTIONS,
  CORRECTIONS_VERSION,
  COUNTS,
  FLASHCARDS,
  PATTERN_BANNER,
  PATTERNS,
  PLAN21,
  SUBJECT_LABELS,
} from "@/lib/data";
import {
  computeStats,
  countDueFlashcards,
  countFlashcardBuckets,
  liveSessions,
  loadAttempts,
  safeRead,
  safeWrite,
  type QuizSession,
  type Stats,
} from "@/lib/tracking";
import { countPlanDone, loadMigratedPlanState, planTaskId } from "@/lib/plan";
import { useLang } from "@/lib/i18n";
import TutorHealth from "@/components/TutorHealth";
import { TrackConfidenceBadge } from "@/components/StatusBadges";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion";

// Step 2a — the acknowledged correction-notice version. The stored
// value is compared against CORRECTIONS_VERSION; a version bump
// re-shows the full notice.
const CORRECTIONS_ACK_KEY = "etea_corrections_ack_v1";

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
  const [planState, setPlanState] = useState<Record<string, boolean>>({});
  const [dueCards, setDueCards] = useState(0);
  const [buckets, setBuckets] = useState({ fresh: 0, due: 0 });
  const [resumeSession, setResumeSession] = useState<QuizSession | null>(null);
  const [pattern, setPattern] = useState("B");
  // Step 2a — correction notice: full on first render (matches the
  // server HTML), compact after mount when this version was already
  // acknowledged. `expanded` is the reopen control's local state; it
  // never clears the acknowledgement.
  const [correctionsAcked, setCorrectionsAcked] = useState(false);
  const [correctionsExpanded, setCorrectionsExpanded] = useState(false);

  useEffect(() => {
    setStats(computeStats(loadAttempts()));
    const ps = loadMigratedPlanState().state;
    setPlanState(ps);
    setPlanDone(countPlanDone(ps));
    // Stage 2 — FSRS due count (due-now + new cards, 0 when none due).
    // Pure in-memory read: it never writes or migrates stored state.
    const now = new Date();
    setDueCards(countDueFlashcards(FLASHCARDS, now));
    setBuckets(countFlashcardBuckets(FLASHCARDS, now));
    // Step 2a — the most recently started live session, if any, for
    // the genuine Resume action (never a fabricated one).
    setResumeSession(liveSessions()[0] ?? null);
    setCorrectionsAcked(safeRead(CORRECTIONS_ACK_KEY) === String(CORRECTIONS_VERSION));
  }, []);

  function acknowledgeCorrections() {
    safeWrite(CORRECTIONS_ACK_KEY, String(CORRECTIONS_VERSION));
    setCorrectionsAcked(true);
    setCorrectionsExpanded(false);
  }

  // Step 2b — the next unchecked task in PLAN21 order (read-only scan
  // of the stored plan state; task ids are the plan page's STABLE
  // content-addressed ids — read here, never changed). Null when all 63
  // tasks are done.
  let nextTask: string | null = null;
  outer: for (let di = 0; di < PLAN21.length; di++) {
    const tasks = PLAN21[di][1];
    for (let ti = 0; ti < tasks.length; ti++) {
      if (!planState[planTaskId(PLAN21[di][0], tasks[ti][0], tasks[ti][1])]) {
        nextTask = tasks[ti][1];
        break outer;
      }
    }
  }

  // Step 2a — returning learner = any real stored activity: attempts,
  // flashcard reviews, plan progress, or a live session. A fresh
  // learner sees the three starting actions instead.
  const returning =
    stats !== null &&
    (stats.hasData || stats.flashReviewed > 0 || planDone > 0 || resumeSession !== null);

  // Step 2a — the Resume/Continue action, derived from the live
  // session's scope. Mock scopes resume deterministically (the mock
  // detail page reads the live session for that exact scope). Practice
  // scopes link to the subject's practice page, which resumes when its
  // stored subject/round still matches and otherwise starts a fresh
  // set — so the label says "Continue", never "Resume". Any other
  // scope falls back to starting topic practice (no guessing).
  let resumeAction: { href: string; label: string } | null = null;
  if (resumeSession) {
    const parts = resumeSession.scope.split(":");
    if (parts[0] === "mock" && parts[1]) {
      resumeAction = {
        href: `/mock/${parts[1]}${parts[2] === "trusted" ? "?mode=trusted" : ""}`,
        label: tf("resumeSession", { title: resumeSession.title }),
      };
    } else if (parts[0] === "practice" && parts[1]) {
      resumeAction = {
        href: `/practice?subject=${encodeURIComponent(parts[1])}`,
        label: tf("continuePractice", { subject: SUBJECT_LABELS[parts[1]] ?? parts[1] }),
      };
    }
  }

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

      {/* Step 2a — "Start here": the dominant first card. Fresh learners
          get the three starting actions; returning learners get Resume
          / Continue (from the real live session), Review due cards
          (real New/Due counts), and Continue plan (real next task).
          Rendered only once stats load, so the card never flashes the
          wrong variant. */}
      {stats && (
        <div className="card">
          <h2>{t("startHereHeading")}</h2>
          <p className="muted">{returning ? t("startHereReturning") : t("startHereFresh")}</p>
          <p>
            {resumeAction ? (
              <Link className="btn" href={resumeAction.href}>
                <span dir="auto">{resumeAction.label}</span>
              </Link>
            ) : (
              <Link className="btn" href="/practice">
                {t("startHerePractice")}
              </Link>
            )}{" "}
            {/* Fresh learners choose a mock; returning learners review
                due cards — the middle action follows the variant. */}
            <Link className="btn secondary" href={returning ? "/flashcards" : "/mock"}>
              {returning ? t("startHereCards") : t("startHereMock")}
            </Link>{" "}
            <Link className="btn secondary" href="/plan">
              {returning ? t("startHereContinuePlan") : t("startHerePlan")}
            </Link>
          </p>
          <p className="muted">
            <span dir="ltr">
              {tf("cardsDueNew", { due: buckets.due, fresh: buckets.fresh })}
            </span>
            {nextTask ? (
              <>
                {" · "}
                {t("planNextLabel")}{" "}
                <span dir="auto">{nextTask}</span>
              </>
            ) : (
              <>
                {" · "}
                {t("planComplete")}
              </>
            )}
          </p>
        </div>
      )}

      {/* Step 2a — correction notice, versioned acknowledgement. Full
          on first visit (or after a version bump); compact + reopen
          control once acknowledged. The notice is NEVER removed: the
          compact form keeps the heading, the pattern banner, and a
          control that reopens the full text. */}
      {!correctionsAcked || correctionsExpanded ? (
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
          {correctionsAcked ? (
            <p>
              <button className="secondary" onClick={() => setCorrectionsExpanded(false)}>
                {t("correctionsShowCompact")}
              </button>
            </p>
          ) : (
            <p>
              <button onClick={acknowledgeCorrections}>{t("correctionsAck")}</button>
            </p>
          )}
        </div>
      ) : (
        <div className="alert red">
          <b>{t("correctionsHeading")}</b>{" "}
          <span dir="ltr">{PATTERN_BANNER}</span>{" "}
          <button className="secondary" onClick={() => setCorrectionsExpanded(true)}>
            {t("correctionsShowFull")}
          </button>
        </div>
      )}

      {/* Stage 3 part 2 — Command Center: the same 6 live stats as
          before (same data, same values), now shadcn Cards with a
          staggered entrance. The plan card adds a progress bar
          (planDone / 63). The due-today card links to /flashcards.
          Step 2a — every metric now shows its denominator/scope
          (sample size, streak rule, time scope, New/Due split), so no
          number stands alone without its meaning. */}
      {stats && (
        <div className="grid">
          <FadeIn delay={0}>
            <Card className="tw:h-full tw:gap-1 tw:p-4">
              <p className="tw:m-0 tw:text-3xl tw:font-bold">{stats.totalAttempts}</p>
              <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{t("attempts")}</p>
              <p className="tw:m-0 tw:text-xs tw:text-muted-foreground">
                <span dir="ltr">
                  {tf("attemptsScope", { mcq: stats.totalQuestions, flash: stats.flashAttempts })}
                </span>
              </p>
            </Card>
          </FadeIn>
          <FadeIn delay={0.05}>
            <Card className="tw:h-full tw:gap-1 tw:p-4">
              <p className="tw:m-0 tw:text-3xl tw:font-bold">{stats.hasData ? `${Math.round(stats.accuracy)}%` : "—"}</p>
              <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{t("accuracy")}</p>
              <p className="tw:m-0 tw:text-xs tw:text-muted-foreground">
                {stats.hasData ? (
                  <span dir="ltr">
                    {tf("accuracySample", { correct: stats.totalCorrect, total: stats.totalQuestions })}
                  </span>
                ) : (
                  t("accuracyNoData")
                )}
              </p>
            </Card>
          </FadeIn>
          <FadeIn delay={0.1}>
            <Card className="tw:h-full tw:gap-1 tw:p-4">
              <p className="tw:m-0 tw:text-3xl tw:font-bold">{stats.streakDays}</p>
              <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{t("streak")}</p>
              <p className="tw:m-0 tw:text-xs tw:text-muted-foreground">{t("streakRule")}</p>
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
              <p className="tw:m-0 tw:text-xs tw:text-muted-foreground">
                {nextTask ? (
                  <>
                    {t("planNextLabel")} <span dir="auto">{nextTask}</span>
                  </>
                ) : (
                  t("planComplete")
                )}
              </p>
              {/* Step 2a — numeric progressbar semantics (was role="img"). */}
              <div
                className="tw:mt-2 tw:h-2 tw:w-full tw:overflow-hidden tw:rounded-full tw:bg-muted"
                role="progressbar"
                aria-valuenow={planDone}
                aria-valuemin={0}
                aria-valuemax={63}
                aria-label={`${t("planProgressLabel")}: ${planDone} / 63`}
              >
                <div className="tw:h-full tw:rounded-full tw:bg-primary" style={{ width: `${(planDone / 63) * 100}%` }} />
              </div>
            </Card>
          </FadeIn>
          <FadeIn delay={0.2}>
            <Card className="tw:h-full tw:gap-1 tw:p-4">
              <p className="tw:m-0 tw:text-3xl tw:font-bold">
                {/* Step 2a (RTL) — duration isolated, like every other
                    number-bearing label on this page. */}
                <span dir="ltr">{tf("minsLabel", { mins: stats.totalMinutes })}</span>
              </p>
              <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{t("timeSpent")}</p>
              <p className="tw:m-0 tw:text-xs tw:text-muted-foreground">{t("timeScope")}</p>
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
                <p className="tw:m-0 tw:text-xs tw:text-muted-foreground">
                  <span dir="ltr">
                    {tf("cardsDueNew", { due: buckets.due, fresh: buckets.fresh })}
                  </span>
                </p>
              </Card>
            </Link>
          </FadeIn>
        </div>
      )}
      {/* Step 2a — the empty state gets an immediate action, not just zeros. */}
      {stats && !stats.hasData && (
        <p className="muted">
          {t("noAttempts")}{" "}
          <Link className="btn" href="/practice">
            {t("startHerePractice")}
          </Link>
        </p>
      )}
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
          {/* Step 2a — semantic confidence badge (same function as the
              track badges): the confidence string stays verbatim, the
              tone distinguishes confirmed / mixed / unverified. The
              old green/red merge is gone. */}
          <TrackConfidenceBadge conf={p.confidence} />
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
