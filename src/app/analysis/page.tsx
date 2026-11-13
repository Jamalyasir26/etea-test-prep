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

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FLASHCARDS, TRACKS, subjectKeyForLabel } from "@/lib/data";
import {
  clearAttempts,
  clearQuarantine,
  clearStorageWarnings,
  computeStats,
  download,
  exportProgress,
  exportQuarantine,
  getStorageWarnings,
  importProgress,
  loadAttempts,
  loadFlashState,
  loadLastExport,
  loadLastImport,
  loadQuarantine,
  recordExport,
  recordImport,
  type Attempt,
  type FlashState,
  type QuarantineRecord,
  type Stats,
  type StorageWarning,
} from "@/lib/tracking";
import { lri, useLang } from "@/lib/i18n";
import { AccuracyTrendChart, DueForecastChart } from "@/components/AnalysisCharts";

function heat(acc: number) {
  return acc < 50 ? "red" : acc < 70 ? "yellow" : "green";
}

function fmtMs(ms?: number) {
  if (ms === undefined) return "—";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export default function Analysis() {
  const { t, tf } = useLang();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Attempt | null>(null);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  // Step 2b — date / subject / track filters. Stats, tables and history
  // below are all computed from the FILTERED attempts; the filter row
  // states how many of the total attempts are shown.
  const [dateFilter, setDateFilter] = useState<"all" | "7" | "30">("all");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [trackFilter, setTrackFilter] = useState("");
  // Stage 1 P1 Tier 2 — storage warnings: quarantined (unreadable) data
  // and failed saves surface HERE, the data-management page, with a
  // download/recovery option. Nothing is ever deleted silently.
  const [warnings, setWarnings] = useState<StorageWarning[]>([]);
  const [quarantine, setQuarantine] = useState<QuarantineRecord[]>([]);
  // Stage 3 part 2 — stored FSRS flash state for the due-forecast
  // chart (read here, never written).
  const [flashState, setFlashState] = useState<FlashState>({});
  // Step 2b — last backup export/import timestamps for the
  // data-management panel.
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [lastImport, setLastImport] = useState<string | null>(null);

  function refresh() {
    setAttempts(loadAttempts());
    setFlashState(loadFlashState());
    setLastExport(loadLastExport());
    setLastImport(loadLastImport());
    // Read warnings AFTER the loads above: a corrupt store is only
    // discovered (and quarantined) when it is read.
    setWarnings(getStorageWarnings());
    setQuarantine(loadQuarantine());
    setLoaded(true);
  }
  useEffect(refresh, []);

  function doExportQuarantine() {
    download(`etea-prep-quarantine-${new Date().toISOString().slice(0, 10)}.json`, exportQuarantine());
    setMsg(t("quarantineDownloadedMsg"));
  }
  function doDismissQuarantine() {
    if (window.confirm(t("quarantineClearConfirm"))) {
      clearQuarantine();
      clearStorageWarnings();
      refresh();
      setMsg(t("quarantineClearedMsg"));
    }
  }

  function doExport() {
    download(`etea-prep-progress-${new Date().toISOString().slice(0, 10)}.json`, exportProgress());
    recordExport();
    setLastExport(loadLastExport());
    setMsg(t("exportMsg"));
  }
  function doImport(file: File) {
    const r = new FileReader();
    r.onload = () => {
      const res = importProgress(String(r.result ?? ""));
      if (!res.ok) {
        setMsg(res.error ?? t("importFailed"));
      } else if (res.counts) {
        recordImport();
        setLastImport(loadLastImport());
        const c = res.counts;
        setMsg(
          tf("importMsg", {
            a: c.attempts,
            i: c.issues,
            s: c.sessions,
            p: c.planKeys,
            f: c.flashcardKeys,
          }) +
            (c.preferencesApplied ? t("importPrefs") : "") +
            (c.attemptsSkipped + c.issuesSkipped + c.sessionsSkipped > 0
              ? tf("importSkipped", { n: c.attemptsSkipped + c.issuesSkipped + c.sessionsSkipped })
              : "") +
            ".",
        );
      } else {
        setMsg(tf("importSimple", { n: res.imported ?? 0 }));
      }
      refresh();
    };
    r.readAsText(file);
  }

  // Step 2b — filtered attempts + stats. The date filter compares the
  // stored ISO date (yyyy-mm-dd) against a cutoff day; the subject
  // filter matches the attempt's subject label or any per-subject key;
  // the track filter matches the attempt's track id.
  const filteredAttempts = useMemo(() => {
    const cutoff =
      dateFilter === "all"
        ? null
        : (() => {
            const d = new Date();
            d.setDate(d.getDate() - (dateFilter === "7" ? 7 : 30));
            return d.toISOString().slice(0, 10);
          })();
    return attempts.filter((a) => {
      if (cutoff && a.date.slice(0, 10) < cutoff) return false;
      if (subjectFilter) {
        const labels = new Set(Object.keys(a.perSubject ?? {}));
        if (a.subject) labels.add(a.subject);
        if (!labels.has(subjectFilter)) return false;
      }
      if (trackFilter && a.trackId !== trackFilter) return false;
      return true;
    });
  }, [attempts, dateFilter, subjectFilter, trackFilter]);

  const stats: Stats = useMemo(() => computeStats(filteredAttempts), [filteredAttempts]);

  const subjectOptions = useMemo(() => {
    const labels = new Set<string>();
    for (const a of attempts) {
      for (const k of Object.keys(a.perSubject ?? {})) labels.add(k);
      if (a.subject) labels.add(a.subject);
    }
    return [...labels].sort();
  }, [attempts]);

  const trackOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const a of attempts) if (a.trackId) ids.add(a.trackId);
    return [...ids].sort();
  }, [attempts]);

  // Step 2b — drill links use the BANK key, not the display label:
  // per-subject stats are keyed by label ("Islamiyat") but /practice
  // expects a bank key ("islamiyat") — passing the label silently fell
  // back to the stored subject. An unmapped label links to /practice
  // with no subject (honest fallback, never a guessed subject).
  function drillHref(label: string, count?: number): string {
    const key = subjectKeyForLabel(label);
    if (!key) return "/practice";
    return `/practice?subject=${encodeURIComponent(key)}${count ? `&count=${count}` : ""}`;
  }

  if (!loaded) return <p>{t("loading")}</p>;
  const last14 = stats.daily.slice(-14);
  const maxDay = Math.max(1, ...last14.map((d) => d.total));
  const recent = [...filteredAttempts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);

  return (
    <div>
      <h1>
        {t("analysis")} {t("liveSuffix")}
      </h1>
      {!stats.hasData && (
        <div className="alert">
          <b>{t("noAttempts")}</b>
        </div>
      )}
      {(warnings.length > 0 || quarantine.length > 0) && (
        <div className="alert red">
          <b>{t("storageWarningTitle")}</b>
          {quarantine.length > 0 && (
            <p>
              {tf("quarantineBody", {
                n: quarantine.length,
                keys: lri([...new Set(quarantine.map((q) => q.key))].join(", ")),
              })}
            </p>
          )}
          {warnings.some((w) => w.type === "write-failed") && (
            <p>
              {t("writeFailedA")} (
              <span dir="ltr">
                {warnings
                  .filter((w) => w.type === "write-failed")
                  .map((w) => `${w.key}: ${w.detail}`)
                  .join("; ")}
              </span>
              ). {t("writeFailedB")}
            </p>
          )}
          {warnings.some((w) => w.type === "read-failed") && (
            <p>
              {t("readFailedA")} (
              <span dir="ltr">
                {warnings
                  .filter((w) => w.type === "read-failed")
                  .map((w) => `${w.key}: ${w.detail}`)
                  .join("; ")}
              </span>
              ). {t("readFailedB")}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {quarantine.length > 0 && <button onClick={doExportQuarantine}>{t("downloadQuarantine")}</button>}
            <button className="secondary" onClick={doDismissQuarantine}>
              {t("dismissQuarantine")}
            </button>
          </div>
        </div>
      )}
      {/* Step 2b — filters: every number below is computed from the
          filtered attempts, and the note states the denominator. */}
      <h2>{t("filtersHeading")}</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <label>
          {t("dateWord")}{" "}
          <select
            aria-label={t("dateWord")}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as "all" | "7" | "30")}
          >
            <option value="all">{t("filterDateAll")}</option>
            <option value="7">{t("filterDate7")}</option>
            <option value="30">{t("filterDate30")}</option>
          </select>
        </label>
        <label>
          {t("subjectWord")}{" "}
          <select
            aria-label={t("subjectWord")}
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="">{t("filterAllSubjects")}</option>
            {subjectOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("filterTrackLabel")}{" "}
          <select
            aria-label={t("filterTrackLabel")}
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
          >
            <option value="">{t("filterAllTracks")}</option>
            {trackOptions.map((id) => (
              <option key={id} value={id}>
                {TRACKS.find((tr) => tr.id === id)?.name ?? id}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        <span dir="ltr">{tf("filteredNote", { n: filteredAttempts.length, total: attempts.length })}</span>
      </p>
      <div className="grid">
        <div className="card stat">
          <b>{stats.totalAttempts}</b>
          <span>{t("attempts")}</span>
        </div>
        <div className="card stat">
          <b>{stats.hasData && stats.totalQuestions > 0 ? `${Math.round(stats.accuracy)}%` : "—"}</b>
          <span>
            {t("accuracy")} {t("mcqOnly")}
          </span>
        </div>
        <div className="card stat">
          <b>
            {/* Stage 1 P1 Tier 4 (B03) — fractions isolated LTR so they
                cannot reverse in RTL (Urdu) mode. */}
            <span dir="ltr">
              {stats.totalCorrect}/{stats.totalQuestions}
            </span>
          </b>
          <span>{t("mcqCorrectLabel")}</span>
        </div>
        <div className="card stat">
          <b>{stats.streakDays}</b>
          <span>{t("streak")}</span>
        </div>
        <div className="card stat">
          {/* Step 2a (RTL) — duration isolated. */}
          <b>
            <span dir="ltr">{tf("minsLabel", { mins: stats.totalMinutes })}</span>
          </b>
          <span>{t("timeSpent")}</span>
        </div>
        <div className="card stat">
          <b>
            <span dir="ltr">
              {stats.flashRecalled}/{stats.flashReviewed}
            </span>
          </b>
          <span>{tf("flashRecalledLabel", { n: stats.flashAttempts })}</span>
        </div>
      </div>
      <p className="muted">{t("firstAnswerNote")}</p>
      {/* Step 2b — denominator + sample-size caveat on the headline
          metrics: accuracy is always stated with its question and
          attempt counts, and flash self-ratings are never mixed in. */}
      {stats.totalQuestions > 0 && (
        <p className="muted">
          {tf("analysisDenominators", {
            pct: Math.round(stats.accuracy),
            questions: stats.totalQuestions,
            attempts: stats.mcqAttempts,
          })}
        </p>
      )}

      {/* Stage 3 part 2 — Recharts, real local data only. Due forecast
          from the stored FSRS state; accuracy trend from the same
          daily MCQ stats as the tables below. Empty states are
          honest (see AnalysisCharts). */}
      <div className="grid">
        <DueForecastChart cards={FLASHCARDS} state={flashState} />
        <AccuracyTrendChart daily={stats.daily} />
      </div>

      <h2>{t("perSubjectHeading")}</h2>
      {Object.keys(stats.perSubject).length === 0 ? (
        <p className="muted">{t("noSubjectData")}</p>
      ) : (
        <>
          {/* Step 2a (P1.1) — labelled, keyboard-accessible scoped
              horizontal scroll region (same pattern as vacancies). */}
          <p className="muted">{t("tableScrollHint")}</p>
          <div className="table-scroll" role="region" aria-label={t("analysisPerSubjectAria")} tabIndex={0}>
          <table>
          <thead>
            <tr>
              <th>{t("subjectWord")}</th>
              <th>{t("accuracy")}</th>
              <th>{t("correctWord")}</th>
              <th>{t("totalWord")}</th>
              <th>{t("attempts")}</th>
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
                    <span dir="ltr">{s}</span>
                    {/* Step 2b — small samples are labelled, never
                        hidden: a subject with under 5 questions gets
                        the provisional badge in the table too. */}
                    {v.total < 5 && (
                      <>
                        {" "}
                        <span className="badge grey">{t("provisionalSmallSample")}</span>
                      </>
                    )}
                  </td>
                  {/* Step 2a (RTL) — percentage isolated. */}
                  <td>
                    <span dir="ltr">{Math.round(v.accuracy)}%</span>
                  </td>
                  <td>{v.correct}</td>
                  <td>{v.total}</td>
                  <td>{v.attempts}</td>
                  <td>
                    <Link href={drillHref(s)}>{t("drill")}</Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
          </div>
        </>
      )}

      <h2>{t("weakHeatmap")}</h2>
      {stats.weakest.length === 0 ? (
        <p className="muted">{t("weakNeedData")}</p>
      ) : (
        stats.weakest.map((w) => (
          <p key={w.subject}>
            <span className={`heat ${heat(w.accuracy)}`} />
            <span dir="ltr">{w.subject}</span> —{" "}
            <span dir="ltr">{Math.round(w.accuracy)}%</span>{" "}{tf("weakOver", { total: w.total })}{" "}
            <Link href={drillHref(w.subject)}>{t("drillArrow")}</Link>
          </p>
        ))
      )}

      {/* Step 2b — provisional weak areas: subjects with 1–4 questions
          were previously suppressed entirely (weakest needs ≥5). They
          are now listed, labelled provisional, with a 10-question drill
          action — never silently hidden. */}
      {stats.provisional.length > 0 && (
        <>
          <h2>{t("provisionalHeading")}</h2>
          <p className="muted">{t("provisionalIntro")}</p>
          {stats.provisional.map((p) => (
            <p key={p.subject}>
              <span className={`heat ${heat(p.accuracy)}`} />
              <span dir="ltr">{p.subject}</span> —{" "}
              <span dir="ltr">{Math.round(p.accuracy)}%</span>{" "}{tf("weakOver", { total: p.total })}{" "}
              <span className="badge grey">{t("provisionalSmallSample")}</span>{" "}
              <Link href={drillHref(p.subject, 10)}>{t("run10Drill")}</Link>
            </p>
          ))}
        </>
      )}

      <h2>{t("last14Heading")}</h2>
      {last14.length === 0 ? (
        <p className="muted">{t("noActivity")}</p>
      ) : (
        <div>
          {last14.map((d) => (
            <div key={d.date} style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
              <span dir="ltr" style={{ width: 96 }}>
                {d.date.slice(5)}
              </span>
              {/* Step 2a — the bar is decorative: the fraction + attempts
                  text beside it is the text alternative carrying the
                  same data, so the bar is hidden from assistive tech. */}
              <div className="bar" style={{ flex: 1 }} aria-hidden="true">
                <i style={{ width: `${(d.total / maxDay) * 100}%` }} />
              </div>
              {/* Localization Pass 1 (RTL) — the fraction stays an
                  isolated LTR span; the attempts count is a translated
                  word, kept outside the span. */}
              <span dir="ltr">
                {d.correct}/{d.total}
              </span>{" "}
              ({d.attempts} {t("attempts")})
            </div>
          ))}
        </div>
      )}

      <h2>{t("mockHistoryHeading")}</h2>
      {stats.mockHistory.length === 0 ? (
        <p className="muted">{t("noMocks")}</p>
      ) : (
        <>
          <p className="muted">{t("tableScrollHint")}</p>
          <div className="table-scroll" role="region" aria-label={t("mockHistoryTableAria")} tabIndex={0}>
          <table>
          <thead>
            <tr>
              <th>{t("dateWord")}</th>
              <th>{t("mockWord")}</th>
              <th>{t("scoreWord")}</th>
              <th>{t("timeWord")}</th>
            </tr>
          </thead>
          <tbody>
            {stats.mockHistory.slice(0, 20).map((m) => (
              <tr
                key={m.id}
                onClick={() => setSelected(m)}
                style={{ cursor: "pointer" }}
                title={t("clickDetailTitle")}
              >
                <td dir="ltr">{m.date.slice(0, 10)}</td>
                <td dir="auto">{m.title}</td>
                <td>
                  <span dir="ltr">
                    {m.correct}/{m.total} ({Math.round((m.correct / m.total) * 100)}%)
                  </span>
                </td>
                {/* Step 2a (RTL) — duration isolated. */}
                <td>
                  <span dir="ltr">{tf("minsLabel", { mins: Math.round(m.seconds / 60) })}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
        </>
      )}

      <h2>{t("allAttemptsHeading")}</h2>
      {recent.length === 0 ? (
        <p className="muted">{t("noAttemptsYet")}</p>
      ) : (
        <>
          <p className="muted">{t("tableScrollHint")}</p>
          <div className="table-scroll" role="region" aria-label={t("allAttemptsTableAria")} tabIndex={0}>
          <table>
          <thead>
            <tr>
              <th>{t("dateWord")}</th>
              <th>{t("typeWord")}</th>
              <th>{t("titleWord")}</th>
              <th>{t("scoreWord")}</th>
              <th>{t("retriesWord")}</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((a) => (
              <tr
                key={a.id}
                onClick={() => setSelected(a)}
                style={{ cursor: "pointer" }}
                title={t("clickDetailTitle")}
              >
                <td dir="ltr">{a.date.slice(0, 10)}</td>
                <td dir="ltr">{a.kind}</td>
                <td dir="auto">{a.title}</td>
                <td>
                  <span dir="ltr">
                    {a.correct}/{a.total}
                  </span>
                </td>
                <td>{a.kind === "flash" ? "—" : (a.retryCount ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
        </>
      )}

      {selected && (
        <div className="card">
          <h3>
            {tf("attemptDetailHeading", {
              title: lri(selected.title),
              date: lri(selected.date.slice(0, 10)),
            })}
          </h3>
          <p className="muted">
            {selected.kind === "flash" ? (
              t("flashSessionNote")
            ) : (
              <>
                {t("firstPassScore")}{" "}
                {/* Stage 1 P1 Tier 4 (B03) — fraction isolated LTR. */}
                <span dir="ltr">
                  {selected.correct}/{selected.total}
                </span>
                {selected.retryCount
                  ? ` · ${tf("retriesCounted", { n: selected.retryCount, plural: selected.retryCount === 1 ? "y" : "ies" })}`
                  : ` · ${t("noRetries")}`}{" "}
                {/* Step 2a (RTL) — duration isolated. */}
                · <span dir="ltr">{tf("minsLabel", { mins: Math.round(selected.seconds / 60) })}</span>
              </>
            )}
            {" · "}
            <button className="secondary" style={{ minHeight: 36, padding: "4px 10px" }} onClick={() => setSelected(null)}>
              {t("closeWord")}
            </button>
          </p>
          {selected.kind !== "flash" &&
            (!selected.itemRecords || selected.itemRecords.length === 0 ? (
              <p className="muted">{t("noItemData")}</p>
            ) : (
              <>
                {/* Step 2a (P1.1) — the 10-column item table gets the
                    same scroll region; it is the widest table on the site. */}
                <p className="muted">{t("tableScrollHint")}</p>
                <div className="table-scroll" role="region" aria-label={t("itemRecordsTableAria")} tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t("questionWord")}</th>
                    <th>{t("topicWord")}</th>
                    <th>{t("firstAnswerWord")}</th>
                    <th>{t("finalAnswerWord")}</th>
                    <th>{t("correctWord")}</th>
                    <th>{t("modeWord")}</th>
                    <th>{t("keyWord")}</th>
                    <th>{t("answeredAtWord")}</th>
                    <th>{t("responseTimeWord")}</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.itemRecords.map((r, i) => (
                    <tr key={r.questionId}>
                      <td>{i + 1}</td>
                      <td dir="auto">{r.question}</td>
                      <td dir="auto">{r.topic}</td>
                      <td dir="auto">{r.firstAnswer ?? "—"}</td>
                      <td dir="auto">{r.finalAnswer ?? "—"}</td>
                      <td>{r.correct ? "✅" : "❌"}</td>
                      <td dir="ltr">{r.mode}</td>
                      <td dir="ltr">{r.keyVersion}</td>
                      <td dir="ltr">{r.answeredAt ? r.answeredAt.slice(11, 19) : "—"}</td>
                      <td dir="ltr">{fmtMs(r.responseMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
                </div>
              </>
            ))}
        </div>
      )}

      <h2>{t("yourDataHeading")}</h2>
      <p className="muted">{t("yourDataBody")}</p>
      {/* Step 2b — last export/import dates: the panel already had
          export/import/delete; the missing piece was knowing WHEN the
          last backup happened. Stored locally with the backup flow. */}
      <p className="muted">
        {lastExport
          ? tf("lastExportLine", { date: lri(new Date(lastExport).toLocaleString()) })
          : t("neverExported")}
        <br />
        {lastImport
          ? tf("lastImportLine", { date: lri(new Date(lastImport).toLocaleString()) })
          : t("neverImported")}
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
            if (window.confirm(t("deleteAttemptsConfirm"))) {
              clearAttempts();
              refresh();
              setMsg(t("attemptsDeletedMsg"));
            }
          }}
        >
          {t("deleteAttempts")}
        </button>
      </div>
      {msg && (
        <p dir="auto" className="muted">
          {msg}
        </p>
      )}
    </div>
  );
}
