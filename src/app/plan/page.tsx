// Study Plan — 21-day base plan (63 tasks) spread over 3 / 6 / 12 weeks,
// with checkboxes, progress, and an AI-generated plan option.
"use client";

import { useEffect, useMemo, useState } from "react";
import { PLAN21 } from "@/lib/data";
import { computeStats, loadAttempts, loadPlanState, savePlanState } from "@/lib/tracking";
import { useLang } from "@/lib/i18n";
import BoldText from "@/components/BoldText";

export default function PlanPage() {
  const { lang, t, tf } = useLang();
  const [weeks, setWeeks] = useState<3 | 6 | 12>(3);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [aiPlan, setAiPlan] = useState("");
  const [busy, setBusy] = useState(false);
  const [weakSubjects, setWeakSubjects] = useState<string[]>([]);

  useEffect(() => {
    setChecked(loadPlanState());
    setWeakSubjects(computeStats(loadAttempts()).weakest.map((w) => w.subject));
  }, []);

  const spread = weeks === 3 ? 1 : weeks === 6 ? 2 : 4;
  const totalDays = 21 * spread;
  const totalTasks = useMemo(() => PLAN21.reduce((s, [, t]) => s + t.length, 0), []);
  const doneCount = useMemo(() => Object.values(checked).filter(Boolean).length, [checked]);
  const dailyLoad = weeks === 3 ? t("load3") : weeks === 6 ? t("load6") : t("load12");

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    savePlanState(next);
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
          {totalDays} {t("daysWord")} · {dailyLoad}
          {t("perDay")} ·{" "}
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
      <div className="bar" role="img" aria-label={tf("tasksDoneAria", { done: doneCount, total: totalTasks })}>
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
      {PLAN21.map(([day, tasks], di) => (
        <div className="card" key={day}>
          <h3>
            {/* Day headings and task text are English content — isolated
                so their punctuation cannot jump in RTL mode. */}
            <span dir="auto">{day}</span>
            {spread > 1 && (
              <span className="muted"> — {tf("spreadOver", { spread })}</span>
            )}
          </h3>
          {tasks.map(([mins, text], ti) => {
            const id = `d${di}-t${ti}`;
            return (
              <label key={id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0" }}>
                <input type="checkbox" checked={!!checked[id]} onChange={() => toggle(id)} style={{ marginTop: 6 }} />
                <span>
                  <b>{tf("minsLabel", { mins })}</b> — <span dir="auto">{text}</span>
                </span>
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}
