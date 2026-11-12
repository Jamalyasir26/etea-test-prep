// Issues inbox — the private "Report an issue" list.
// Everything here lives in localStorage only (key `etea_issues_v2`).
// Nothing was ever sent anywhere: reports are saved privately on this
// device, and this page is the only place they can be reviewed, exported
// or deleted. Legacy `etea_issues_next` entries ({qid, date} only) are
// imported on first load with the missing fields shown as "—".
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearIssues,
  deleteIssue,
  download,
  ISSUE_REASONS,
  loadIssues,
  type IssueReason,
  type IssueReport,
} from "@/lib/tracking";
import {
  clearTelemetry,
  loadTelemetry,
  type TelemetryEntry,
} from "@/lib/telemetry";
import { lri, useLang } from "@/lib/i18n";

// Localization Pass 1 — stored issue-reason values are stable English
// keys; only their DISPLAY labels are translated (via i18n.tsx). Same
// mapping as the QuizRunner IssueForm.
const REASON_KEY: Record<IssueReason, string> = {
  "wrong-answer": "issueReasonWrongAnswer",
  "wrong-explanation": "issueReasonWrongExplanation",
  typo: "issueReasonTypo",
  outdated: "issueReasonOutdated",
  other: "issueReasonOther",
};

function csvCell(v: string | null): string {
  const s = v ?? "";
  return `"${s.replace(/"/g, '""')}"`;
}

export default function IssuesPage() {
  const { t, tf } = useLang();
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [reasonFilter, setReasonFilter] = useState<IssueReason | "all" | "__none">("all");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [msg, setMsg] = useState("");
  // Stage 1 P2 (B07) — on-device client-error telemetry (hydration
  // errors etc.), recorded with the route where they happened.
  const [telemetry, setTelemetry] = useState<TelemetryEntry[]>([]);

  function refresh() {
    setIssues(loadIssues());
    setTelemetry(loadTelemetry());
  }
  useEffect(refresh, []);

  const filtered = useMemo(
    () =>
      issues.filter(
        (i) =>
          (reasonFilter === "all" ||
            (reasonFilter === "__none" ? i.reason === null : i.reason === reasonFilter)) &&
          (subjectFilter === "" ||
            (i.subject ?? "").toLowerCase().includes(subjectFilter.toLowerCase()) ||
            i.qid.toLowerCase().includes(subjectFilter.toLowerCase())),
      ),
    [issues, reasonFilter, subjectFilter],
  );

  function exportJson() {
    download(`etea-prep-issues-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(filtered, null, 2));
    setMsg(tf("exportedJsonMsg", { n: filtered.length }));
  }

  function exportCsv() {
    const header = "date,question_id,subject,reason,proposed_correction,source";
    const rows = filtered.map((i) =>
      [
        csvCell(i.date),
        csvCell(i.qid),
        csvCell(i.subject),
        csvCell(i.reason),
        csvCell(i.proposedCorrection),
        csvCell(i.source),
      ].join(","),
    );
    download(
      `etea-prep-issues-${new Date().toISOString().slice(0, 10)}.csv`,
      [header, ...rows].join("\n"),
      "text/csv",
    );
    setMsg(tf("exportedCsvMsg", { n: filtered.length }));
  }

  return (
    <div>
      <h1>{t("issuesTitle")}</h1>
      <p className="muted">{t("issuesIntro")}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select
          aria-label={t("filterReasonAria")}
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value as IssueReason | "all" | "__none")}
        >
          <option value="all">{tf("allReasons", { n: issues.length })}</option>
          {ISSUE_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {t(REASON_KEY[r.value])}
            </option>
          ))}
          <option value="__none">{t("noReason")}</option>
        </select>
        <input
          type="text"
          aria-label={t("filterPlaceholder")}
          placeholder={t("filterPlaceholder")}
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        />
        <button className="secondary" onClick={exportJson} disabled={filtered.length === 0}>
          {t("exportJsonLabel")}
        </button>
        <button className="secondary" onClick={exportCsv} disabled={filtered.length === 0}>
          {t("exportCsvLabel")}
        </button>
        <button
          className="secondary"
          disabled={issues.length === 0}
          onClick={() => {
            if (window.confirm(tf("deleteAllConfirm", { n: issues.length }))) {
              clearIssues();
              refresh();
              setMsg(t("allDeletedMsg"));
            }
          }}
        >
          {t("deleteAll")}
        </button>
      </div>
      {msg && (
        <p dir="auto" className="muted">
          {msg}
        </p>
      )}
      {filtered.length === 0 ? (
        <p className="muted">{issues.length === 0 ? t("noReports") : t("noReportsMatch")}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t("dateWord")}</th>
              <th>{t("questionWord")}</th>
              <th>{t("subjectWord")}</th>
              <th>{t("reasonWord")}</th>
              <th>{t("proposedCorrectionWord")}</th>
              <th>{t("sourceWord")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id}>
                <td dir="ltr">{i.date.slice(0, 10)}</td>
                <td>
                  <code dir="ltr">{i.qid}</code>
                </td>
                <td dir="ltr">{i.subject ?? "—"}</td>
                <td>{i.reason ? t(REASON_KEY[i.reason]) : "—"}</td>
                <td dir="auto">{i.proposedCorrection ?? "—"}</td>
                <td dir="auto">{i.source ?? "—"}</td>
                <td>
                  <button
                    className="secondary"
                    style={{ minHeight: 36, padding: "4px 10px" }}
                    onClick={() => {
                      if (window.confirm(tf("deleteConfirm", { qid: lri(i.qid) }))) {
                        deleteIssue(i.id);
                        refresh();
                      }
                    }}
                  >
                    {t("deleteWord")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Stage 1 P2 (B07) — client-error telemetry. Recorded on this
          device only, never sent anywhere. Hydration failures (#418 /
          #425) can only be observed in a real browser, so this list is
          where they surface, with the route attached. */}
      <h2>{t("telemetryHeading")}</h2>
      <p className="muted">{t("telemetryIntro")}</p>
      <button
        className="secondary"
        disabled={telemetry.length === 0}
        onClick={() => {
          if (window.confirm(tf("clearTelemetryConfirm", { n: telemetry.length }))) {
            clearTelemetry();
            refresh();
            setMsg(t("telemetryClearedMsg"));
          }
        }}
      >
        {t("clearTelemetry")}
      </button>
      {telemetry.length === 0 ? (
        <p className="muted">{t("noTelemetry")}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t("timeUtcWord")}</th>
              <th>{t("routeWord")}</th>
              <th>{t("typeWord")}</th>
              <th>{t("messageWord")}</th>
            </tr>
          </thead>
          <tbody>
            {telemetry.map((t, i) => (
              <tr key={`${t.at}-${i}`}>
                <td dir="ltr">{t.at.replace("T", " ").slice(0, 19)}</td>
                <td>
                  <code dir="ltr">{t.route}</code>
                </td>
                <td dir="ltr">{t.kind}</td>
                <td dir="auto" style={{ overflowWrap: "break-word" }}>
                  {t.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
