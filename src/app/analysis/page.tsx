// Analysis — LIVE dashboard. Every number is computed from real stored
// attempts. Empty states say "no attempts yet". No sample data anywhere.
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  clearAttempts,
  computeStats,
  download,
  exportProgress,
  importProgress,
  loadAttempts,
  type Stats,
} from "@/lib/tracking";
import { useLang } from "@/lib/i18n";

function heat(acc: number) {
  return acc < 50 ? "red" : acc < 70 ? "yellow" : "green";
}

export default function Analysis() {
  const { t } = useLang();
  const [stats, setStats] = useState<Stats | null>(null);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function refresh() {
    setStats(computeStats(loadAttempts()));
  }
  useEffect(refresh, []);

  function doExport() {
    download(`etea-prep-progress-${new Date().toISOString().slice(0, 10)}.json`, exportProgress());
    setMsg("Progress exported as a JSON file.");
  }
  function doImport(file: File) {
    const r = new FileReader();
    r.onload = () => {
      const res = importProgress(String(r.result ?? ""));
      setMsg(res.ok ? `Imported ${res.imported ?? 0} new attempts.` : res.error ?? "Import failed.");
      refresh();
    };
    r.readAsText(file);
  }

  if (!stats) return <p>Loading…</p>;
  const last14 = stats.daily.slice(-14);
  const maxDay = Math.max(1, ...last14.map((d) => d.total));

  return (
    <div>
      <h1>{t("analysis")} — live</h1>
      {!stats.hasData && (
        <div className="alert">
          <b>{t("noAttempts")}</b>
        </div>
      )}
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
          <b>
            {stats.totalCorrect}/{stats.totalQuestions}
          </b>
          <span>Questions correct</span>
        </div>
        <div className="card stat">
          <b>{stats.streakDays}</b>
          <span>{t("streak")}</span>
        </div>
        <div className="card stat">
          <b>{stats.totalMinutes} min</b>
          <span>{t("timeSpent")}</span>
        </div>
      </div>

      <h2>Per-subject accuracy</h2>
      {Object.keys(stats.perSubject).length === 0 ? (
        <p className="muted">No subject data yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Accuracy</th>
              <th>Correct</th>
              <th>Total</th>
              <th>Attempts</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(stats.perSubject)
              .sort((a, b) => a[1].accuracy - b[1].accuracy)
              .map(([s, v]) => (
                <tr key={s}>
                  <td>
                    <span className={`heat ${heat(v.accuracy)}`} />
                    {s}
                  </td>
                  <td>{Math.round(v.accuracy)}%</td>
                  <td>{v.correct}</td>
                  <td>{v.total}</td>
                  <td>{v.attempts}</td>
                  <td>
                    <Link href={`/practice?subject=${encodeURIComponent(s)}`}>{t("drill")}</Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      <h2>Weak-area heatmap</h2>
      {stats.weakest.length === 0 ? (
        <p className="muted">Need at least 5 questions per subject before weak areas show.</p>
      ) : (
        stats.weakest.map((w) => (
          <p key={w.subject}>
            <span className={`heat ${heat(w.accuracy)}`} />
            {w.subject} — {Math.round(w.accuracy)}% over {w.total} questions{" "}
            <Link href={`/practice?subject=${encodeURIComponent(w.subject)}`}>{t("drill")} →</Link>
          </p>
        ))
      )}

      <h2>Last 14 days (questions per day)</h2>
      {last14.length === 0 ? (
        <p className="muted">No activity yet.</p>
      ) : (
        <div>
          {last14.map((d) => (
            <div key={d.date} style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
              <span style={{ width: 96 }}>{d.date.slice(5)}</span>
              <div className="bar" style={{ flex: 1 }}>
                <i style={{ width: `${(d.total / maxDay) * 100}%` }} />
              </div>
              <span>
                {d.correct}/{d.total} ({d.attempts} attempts)
              </span>
            </div>
          ))}
        </div>
      )}

      <h2>Mock history</h2>
      {stats.mockHistory.length === 0 ? (
        <p className="muted">No mocks taken yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Mock</th>
              <th>Score</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {stats.mockHistory.slice(0, 20).map((m) => (
              <tr key={m.id}>
                <td>{m.date.slice(0, 10)}</td>
                <td>{m.title}</td>
                <td>
                  {m.correct}/{m.total} ({Math.round((m.correct / m.total) * 100)}%)
                </td>
                <td>{Math.round(m.seconds / 60)} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Your data</h2>
      <p className="muted">
        Progress lives in this browser only (localStorage). Export it regularly so a cleared browser
        never loses your history.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={doExport}>{t("export")}</button>
        <button className="secondary" onClick={() => fileRef.current?.click()}>
          {t("import")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) doImport(f);
            e.target.value = "";
          }}
        />
        <button
          className="secondary"
          onClick={() => {
            if (window.confirm("Delete all recorded attempts? This cannot be undone (export first if you want a copy).")) {
              clearAttempts();
              refresh();
              setMsg("All attempts deleted.");
            }
          }}
        >
          Delete all attempts
        </button>
      </div>
      {msg && <p className="muted">{msg}</p>}
    </div>
  );
}
