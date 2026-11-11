// Analysis — LIVE dashboard. Every number is computed from real stored
// attempts. Empty states say "no attempts yet". No sample data anywhere.
//
// Phase 2: MCQ accuracy counts quiz + mock attempts ONLY (first-pass
// scores). Flashcard attempts are self-ratings and are shown separately —
// they are never mixed into MCQ accuracy. Click any attempt to reopen its
// exact per-item table (first/final answer, correctness, mode, key version,
// response time); attempts recorded before item-level tracking show a note
// instead of a table.
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
  type Attempt,
  type Stats,
} from "@/lib/tracking";
import { useLang } from "@/lib/i18n";

function heat(acc: number) {
  return acc < 50 ? "red" : acc < 70 ? "yellow" : "green";
}

function fmtMs(ms?: number) {
  if (ms === undefined) return "—";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export default function Analysis() {
  const { t } = useLang();
  const [stats, setStats] = useState<Stats | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selected, setSelected] = useState<Attempt | null>(null);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function refresh() {
    setStats(computeStats(loadAttempts()));
    setAttempts(loadAttempts());
  }
  useEffect(refresh, []);

  function doExport() {
    download(`etea-prep-progress-${new Date().toISOString().slice(0, 10)}.json`, exportProgress());
    setMsg("Progress exported as a JSON file (attempts, plan, flashcards, issues, preferences, in-progress sessions).");
  }
  function doImport(file: File) {
    const r = new FileReader();
    r.onload = () => {
      const res = importProgress(String(r.result ?? ""));
      if (!res.ok) {
        setMsg(res.error ?? "Import failed.");
      } else if (res.counts) {
        const c = res.counts;
        setMsg(
          `Imported ${c.attempts} new attempt(s), ${c.issues} issue(s), ${c.sessions} session(s)` +
            `; merged ${c.planKeys} plan key(s), ${c.flashcardKeys} flashcard(s)` +
            `${c.preferencesApplied ? "; preferences applied" : ""}` +
            `${c.attemptsSkipped + c.issuesSkipped + c.sessionsSkipped > 0 ? `; skipped ${c.attemptsSkipped + c.issuesSkipped + c.sessionsSkipped} invalid record(s)` : ""}.`,
        );
      } else {
        setMsg(`Imported ${res.imported ?? 0} new attempts.`);
      }
      refresh();
    };
    r.readAsText(file);
  }

  if (!stats) return <p>Loading…</p>;
  const last14 = stats.daily.slice(-14);
  const maxDay = Math.max(1, ...last14.map((d) => d.total));
  const recent = [...attempts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);

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
          <b>{stats.hasData && stats.totalQuestions > 0 ? `${Math.round(stats.accuracy)}%` : "—"}</b>
          <span>{t("accuracy")} (MCQ only)</span>
        </div>
        <div className="card stat">
          <b>
            {stats.totalCorrect}/{stats.totalQuestions}
          </b>
          <span>MCQ questions correct (first-pass)</span>
        </div>
        <div className="card stat">
          <b>{stats.streakDays}</b>
          <span>{t("streak")}</span>
        </div>
        <div className="card stat">
          <b>{stats.totalMinutes} min</b>
          <span>{t("timeSpent")}</span>
        </div>
        <div className="card stat">
          <b>
            {stats.flashRecalled}/{stats.flashReviewed}
          </b>
          <span>
            Flashcards recalled ({stats.flashAttempts} session{stats.flashAttempts === 1 ? "" : "s"} — self-rated, not in MCQ accuracy)
          </span>
        </div>
      </div>
      <p className="muted">
        Scores count your first answer to each question; corrected retries never change a score.
        Flashcard self-ratings are kept separate from MCQ accuracy.
      </p>

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

      <h2>Last 14 days (MCQ questions per day)</h2>
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
              <tr
                key={m.id}
                onClick={() => setSelected(m)}
                style={{ cursor: "pointer" }}
                title="Click to see the per-item table"
              >
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

      <h2>All attempts (latest 20)</h2>
      {recent.length === 0 ? (
        <p className="muted">No attempts yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Title</th>
              <th>Score</th>
              <th>Retries</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((a) => (
              <tr
                key={a.id}
                onClick={() => setSelected(a)}
                style={{ cursor: "pointer" }}
                title="Click to see the per-item table"
              >
                <td>{a.date.slice(0, 10)}</td>
                <td>{a.kind}</td>
                <td>{a.title}</td>
                <td>
                  {a.correct}/{a.total}
                </td>
                <td>{a.kind === "flash" ? "—" : (a.retryCount ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="card">
          <h3>
            Attempt detail — {selected.title} ({selected.date.slice(0, 10)})
          </h3>
          <p className="muted">
            {selected.kind === "flash"
              ? "Flashcard session (self-rated). No per-item MCQ table applies."
              : `First-pass score ${selected.correct}/${selected.total}` +
                (selected.retryCount
                  ? ` · ${selected.retryCount} corrected retr${selected.retryCount === 1 ? "y" : "ies"} (not counted in the score)`
                  : " · no corrected retries") +
                ` · ${Math.round(selected.seconds / 60)} min`}
            {" · "}
            <button className="secondary" style={{ minHeight: 36, padding: "4px 10px" }} onClick={() => setSelected(null)}>
              Close
            </button>
          </p>
          {selected.kind !== "flash" &&
            (!selected.itemRecords || selected.itemRecords.length === 0 ? (
              <p className="muted">
                No per-item data recorded for this attempt — it was recorded before item-level
                tracking existed.
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Question</th>
                    <th>Topic</th>
                    <th>First answer</th>
                    <th>Final answer</th>
                    <th>Correct</th>
                    <th>Mode</th>
                    <th>Key</th>
                    <th>Answered at</th>
                    <th>Response time</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.itemRecords.map((r, i) => (
                    <tr key={r.questionId}>
                      <td>{i + 1}</td>
                      <td>{r.question}</td>
                      <td>{r.topic}</td>
                      <td>{r.firstAnswer ?? "—"}</td>
                      <td>{r.finalAnswer ?? "—"}</td>
                      <td>{r.correct ? "✅" : "❌"}</td>
                      <td>{r.mode}</td>
                      <td>{r.keyVersion}</td>
                      <td>{r.answeredAt ? r.answeredAt.slice(11, 19) : "—"}</td>
                      <td>{fmtMs(r.responseMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
        </div>
      )}

      <h2>Your data</h2>
      <p className="muted">
        Progress lives in this browser only (localStorage). Export it regularly so a cleared browser
        never loses your history. A full backup covers attempts, plan, flashcards, issues,
        preferences (language/theme) and in-progress sessions — and never contains API keys (there
        are none client-side). Import merges into what is already stored (attempts deduplicated by
        id; a live in-progress session is never overwritten by an import).
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
