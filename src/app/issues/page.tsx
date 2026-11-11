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

function csvCell(v: string | null): string {
  const s = v ?? "";
  return `"${s.replace(/"/g, '""')}"`;
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [reasonFilter, setReasonFilter] = useState<IssueReason | "all" | "__none">("all");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [msg, setMsg] = useState("");

  function refresh() {
    setIssues(loadIssues());
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
    setMsg(`Exported ${filtered.length} report(s) as JSON.`);
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
    setMsg(`Exported ${filtered.length} report(s) as CSV.`);
  }

  return (
    <div>
      <h1>Issues — private correction inbox</h1>
      <p className="muted">
        Reports saved privately on this device only — nothing was sent anywhere. Review them here,
        fix the bank, then delete the resolved ones. Legacy reports (from before the reason /
        correction fields existed) show “—” for the missing fields.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select
          aria-label="Filter by reason"
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value as IssueReason | "all" | "__none")}
        >
          <option value="all">All reasons ({issues.length})</option>
          {ISSUE_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
          <option value="__none">No reason given</option>
        </select>
        <input
          type="text"
          aria-label="Filter by subject or question id"
          placeholder="Filter by subject or question id"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        />
        <button className="secondary" onClick={exportJson} disabled={filtered.length === 0}>
          Export JSON
        </button>
        <button className="secondary" onClick={exportCsv} disabled={filtered.length === 0}>
          Export CSV
        </button>
        <button
          className="secondary"
          disabled={issues.length === 0}
          onClick={() => {
            if (
              window.confirm(
                `Delete all ${issues.length} issue report(s)? This cannot be undone (export first if you want a copy).`,
              )
            ) {
              clearIssues();
              refresh();
              setMsg("All issue reports deleted.");
            }
          }}
        >
          Delete all
        </button>
      </div>
      {msg && <p className="muted">{msg}</p>}
      {filtered.length === 0 ? (
        <p className="muted">
          {issues.length === 0 ? "No issue reports yet." : "No reports match this filter."}
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Question</th>
              <th>Subject</th>
              <th>Reason</th>
              <th>Proposed correction</th>
              <th>Source</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id}>
                <td>{i.date.slice(0, 10)}</td>
                <td>
                  <code>{i.qid}</code>
                </td>
                <td>{i.subject ?? "—"}</td>
                <td>{ISSUE_REASONS.find((r) => r.value === i.reason)?.label ?? "—"}</td>
                <td>{i.proposedCorrection ?? "—"}</td>
                <td>{i.source ?? "—"}</td>
                <td>
                  <button
                    className="secondary"
                    style={{ minHeight: 36, padding: "4px 10px" }}
                    onClick={() => {
                      if (window.confirm(`Delete this report (${i.qid})?`)) {
                        deleteIssue(i.id);
                        refresh();
                      }
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
