// Study Plan — 21-day base plan (63 tasks) spread over 3 / 6 / 12 weeks,
// with checkboxes, progress, and an AI-generated plan option.
"use client";

import { useEffect, useMemo, useState } from "react";
import { PLAN21 } from "@/lib/data";
import { computeStats, loadAttempts, loadPlanState, savePlanState } from "@/lib/tracking";
import { useLang } from "@/lib/i18n";

export default function PlanPage() {
  const { lang } = useLang();
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
  const dailyLoad = weeks === 3 ? "2–3 hours" : weeks === 6 ? "about 1–1.5 hours" : "about 45 minutes";

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    savePlanState(next);
  }

  async function generateAiPlan() {
    setBusy(true);
    setAiPlan("Generating your plan…");
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeks, lang, weakSubjects }),
      });
      const j = await res.json();
      setAiPlan(res.ok ? j.plan : j.error ?? "Could not generate a plan right now.");
    } catch {
      setAiPlan("Could not reach the tutor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Study Plan</h1>
      <div className="alert">
        <b>Sample timetable — adjust to your schedule.</b> No credible source prescribes 2–3
        hours/day for ETEA. The base plan is 21 days, 2–3 hours/day, 63 tasks (~50 hours).
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {[3, 6, 12].map((w) => (
          <button key={w} className={weeks === w ? "" : "secondary"} onClick={() => setWeeks(w as 3 | 6 | 12)}>
            {w} weeks
          </button>
        ))}
        <span className="muted">
          {totalDays} days · {dailyLoad}/day · {doneCount}/{totalTasks} tasks done
        </span>
        <button className="secondary" onClick={generateAiPlan} disabled={busy}>
          Generate AI plan
        </button>
      </div>
      <div className="bar" role="img" aria-label={`${doneCount} of ${totalTasks} tasks done`}>
        <i style={{ width: `${(doneCount / totalTasks) * 100}%` }} />
      </div>
      {aiPlan && (
        <div className="card">
          <h3>AI-generated plan ({weeks} weeks)</h3>
          <p className="muted">AI-generated — not verified. Sample timetable; adjust to your schedule.</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{aiPlan}</p>
        </div>
      )}
      {PLAN21.map(([day, tasks], di) => (
        <div className="card" key={day}>
          <h3>
            {day}
            {spread > 1 && <span className="muted"> — spread over {spread} days</span>}
          </h3>
          {tasks.map(([mins, text], ti) => {
            const id = `d${di}-t${ti}`;
            return (
              <label key={id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0" }}>
                <input type="checkbox" checked={!!checked[id]} onChange={() => toggle(id)} style={{ marginTop: 6 }} />
                <span>
                  <b>{mins} min</b> — {text}
                </span>
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}
