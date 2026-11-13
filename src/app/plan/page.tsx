// Study Plan — 21-day base plan (63 tasks) spread over 3 / 6 / 12 weeks,
// with checkboxes, progress, and an AI-generated plan option.
//
// Step 2b — stable content-addressed task ids (see src/lib/plan.ts) with
// a migration preserving existing completions; a real calendar (actual
// local dates, rest days, catch-up days); 6-week labelled exactly "21
// study units paced over 42 days"; 12-week as two cycles (Cycle 2
// revisits each unit with unseen/mixed practice, sharing one checkbox
// per task); every task deep-links to its Library note, practice drill,
// or mock; per-unit workload shown.
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PLAN21 } from "@/lib/data";
import {
  buildPlanCalendar,
  countPlanDone,
  formatPlanDay,
  formatPlanRange,
  loadMigratedPlanState,
  parseLocalDateKey,
  PLAN_START_KEY,
  planCalendarTotals,
  planTaskId,
  planTaskLink,
  toLocalDateKey,
  type PlanTaskLinkKind,
} from "@/lib/plan";
import { computeStats, loadAttempts, safeRead, safeWrite, savePlanState } from "@/lib/tracking";
import { lri, useLang } from "@/lib/i18n";
import BoldText from "@/components/BoldText";

const LINK_KEY: Record<PlanTaskLinkKind, string> = {
  library: "planTaskLinkLibrary",
  practice: "planTaskLinkPractice",
  flashcards: "planTaskLinkFlashcards",
  mock: "planTaskLinkMock",
  analysis: "planTaskLinkAnalysis",
};

const PACING_KEY = { 3: "planPacing3", 6: "planPacing6", 12: "planPacing12" } as const;

export default function PlanPage() {
  const { lang, t, tf } = useLang();
  const [weeks, setWeeks] = useState<3 | 6 | 12>(3);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [aiPlan, setAiPlan] = useState("");
  const [busy, setBusy] = useState(false);
  const [weakSubjects, setWeakSubjects] = useState<string[]>([]);
  // Step 2b — plan start date (local yyyy-mm-dd). Loaded after mount
  // (B07: storage reads in initializers would mismatch the server
  // HTML); set to today on first visit. Dates render only once it
  // loads, so the first render matches the server HTML.
  const [startDate, setStartDate] = useState<Date | null>(null);

  useEffect(() => {
    setChecked(loadMigratedPlanState().state);
    setWeakSubjects(computeStats(loadAttempts()).weakest.map((w) => w.subject));
    const stored = safeRead(PLAN_START_KEY);
    const parsed = stored ? parseLocalDateKey(stored) : null;
    if (parsed) {
      setStartDate(parsed);
    } else {
      const today = new Date();
      safeWrite(PLAN_START_KEY, toLocalDateKey(today));
      setStartDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    }
  }, []);

  const spread = weeks === 3 ? 1 : weeks === 6 ? 2 : 4;
  const totalTasks = useMemo(() => PLAN21.reduce((s, [, t]) => s + t.length, 0), []);
  const doneCount = useMemo(() => countPlanDone(checked), [checked]);
  // The calendar STRUCTURE (unit order, rest days) never depends on
  // the start date, so it renders on the first pass with a provisional
  // start; only the date TEXT is mount-gated (startDate !== null), so
  // the server HTML and the first client render always match (B07).
  const calendar = useMemo(
    () => buildPlanCalendar(startDate ?? new Date(), spread as 1 | 2 | 4),
    [startDate, spread],
  );
  const totals = useMemo(() => planCalendarTotals(calendar), [calendar]);

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    savePlanState(next);
  }

  function resetDates() {
    const today = new Date();
    safeWrite(PLAN_START_KEY, toLocalDateKey(today));
    setStartDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  }

  async function generateAiPlan() {
    setBusy(true);
    setAiPlan(t("generatingPlan"));
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeks, lang, weakSubjects }),
      });
      const j = await res.json();
      setAiPlan(res.ok ? j.plan : j.error ?? t("planError"));
    } catch {
      setAiPlan(t("reachTutorError"));
    } finally {
      setBusy(false);
    }
  }

  const refYear = startDate?.getFullYear() ?? new Date().getFullYear();

  return (
    <div>
      <h1>{t("studyPlanHeading")}</h1>
      <div className="alert">
        <b>{t("planAlertTitle")}</b> <span dir="auto">{t("planAlertBody")}</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {[3, 6, 12].map((w) => (
          <button key={w} className={weeks === w ? "" : "secondary"} onClick={() => setWeeks(w as 3 | 6 | 12)}>
            {tf("weeksLabel", { n: w })}
          </button>
        ))}
        <span className="muted">
          {t(PACING_KEY[weeks])}
          {startDate && (
            <>
              {" · "}
              {tf("planCalendarSpan", {
                study: totals.studyDays,
                rest: totals.restDays,
                total: totals.totalDays,
              })}
            </>
          )}
          {" · "}
          {/* Stage 1 P1 Tier 4 (B03) — the progress fraction isolated LTR:
              it rendered reversed ("63/0") in RTL (Urdu) mode. */}
          <span dir="ltr">
            {doneCount}/{totalTasks}
          </span>{" "}
          {t("tasksDone")}
        </span>
        <button className="secondary" onClick={generateAiPlan} disabled={busy}>
          {t("generateAiPlan")}
        </button>
      </div>
      {/* Stage 1 P2 — API privacy disclosure, shown before the AI plan
          form: the request leaves this device for the AI providers. */}
      <p className="muted">{t("planPrivacy")}</p>
      {startDate && (
        <p className="muted">
          {tf("planStartDate", { date: lri(formatPlanDay(startDate, refYear)) })}{" "}
          <button className="secondary" onClick={resetDates}>
            {t("planResetDates")}
          </button>{" "}
          {t("planResetDatesNote")}
        </p>
      )}
      {weeks === 12 && (
        <div className="alert">
          <span dir="auto">{t("planCycle2Banner")}</span>
        </div>
      )}
      {/* Step 2a — numeric progressbar semantics (was role="img"). */}
      <div
        className="bar"
        role="progressbar"
        aria-valuenow={doneCount}
        aria-valuemin={0}
        aria-valuemax={totalTasks}
        aria-label={tf("tasksDoneAria", { done: doneCount, total: totalTasks })}
      >
        <i style={{ width: `${(doneCount / totalTasks) * 100}%` }} />
      </div>
      {aiPlan && (
        <div className="card">
          <h3>{tf("aiPlanHeading", { weeks })}</h3>
          <p className="muted">{t("aiPlanNote")}</p>
          {/* Localization Pass 1 (RTL) — the AI plan may be English,
              Urdu or Arabic depending on the answer language; dir="auto"
              follows the text's own first strong character. */}
          <p dir="auto" style={{ whiteSpace: "pre-wrap" }}>
            {/* Stage 2 — same bold-only renderer as the tutor chat. */}
            <BoldText text={aiPlan} />
          </p>
        </div>
      )}
      {calendar.map((entry, entryIndex) => {
        if (entry.kind === "rest") {
          return (
            <div className="card" key={`rest-${entryIndex}`}>
              <h3>{t("planRestDay")}</h3>
              {startDate && (
                <p className="muted">
                  <span dir="ltr">{formatPlanDay(entry.startDate, refYear)}</span>
                </p>
              )}
              <p className="muted">{t("planRestDayNote")}</p>
            </div>
          );
        }
        const day = entry.dayLabel;
        const tasks = PLAN21[entry.unitIndex][1];
        const workload = tasks.reduce((s, [mins]) => s + mins, 0);
        return (
          <div className="card" key={day} id={`plan-day-${entry.unitIndex + 1}`}>
            <h3>
              {/* Day headings and task text are English content — isolated
                  so their punctuation cannot jump in RTL mode. */}
              <span dir="auto">{day}</span>
              {entry.catchUp && (
                <>
                  {" "}
                  <span className="badge teal">{t("planCatchUpLabel")}</span>
                </>
              )}
            </h3>
            <p className="muted">
              {startDate && (
                <>
                  <span dir="ltr">{formatPlanRange(entry.startDate, entry.endDate, refYear)}</span>
                  {" · "}
                </>
              )}
              {t("planWorkloadWord")}:{" "}
              {/* Step 2a (RTL) — duration isolated. */}
              <span dir="ltr">{tf("minsLabel", { mins: workload })}</span>
            </p>
            {entry.catchUp && <p className="muted">{t("planCatchUpNote")}</p>}
            {startDate && entry.cycle2Start && entry.cycle2End && (
              <p className="muted">
                <b>{t("planCycle2Label")}:</b>{" "}
                <span dir="ltr">{formatPlanRange(entry.cycle2Start, entry.cycle2End, refYear)}</span>
                {" — "}
                {t("planCycle2Note")}
              </p>
            )}
            {tasks.map(([mins, text]) => {
              const id = planTaskId(day, mins, text);
              const link = planTaskLink(text);
              return (
                <label key={id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0" }}>
                  <input type="checkbox" checked={!!checked[id]} onChange={() => toggle(id)} style={{ marginTop: 6 }} />
                  <span>
                    {/* Step 2a (RTL) — duration isolated. */}
                    <b>
                      <span dir="ltr">{tf("minsLabel", { mins })}</span>
                    </b>{" "}
                    — <span dir="auto">{text}</span>
                    {link && (
                      <>
                        {" — "}
                        <Link href={link.href}>{t(LINK_KEY[link.kind])}</Link>
                      </>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
