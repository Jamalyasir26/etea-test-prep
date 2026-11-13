// Vacancy Tracker — manually curated. No next-ESED date is invented.
// Step 3a — the tracker shows the 4 visible TEACHING vacancy rows (the
// Rescue 1122 row is hidden — see the visibility list in
// src/lib/data.ts; its data stays in content.json). Below the tracker
// sits the Vacancy Coverage Ledger: one card per teaching post with
// the official source, exact weightage/time/marks/language/
// negative-marking policy, real per-subject counts, coverage status,
// missing skills and next action (see src/lib/ledger.ts).
// Localization Pass 1 — converted to a client component so the UI
// strings can go through i18n.tsx (same pattern as the other pages:
// first render is English on server and client, then the stored
// language applies after mount — no new hydration risk).
"use client";

import Link from "next/link";
import { VISIBLE_VACANCIES } from "@/lib/data";
import {
  buildLedger,
  type LedgerCoverage,
  type LedgerRow,
  type LedgerSourceState,
} from "@/lib/ledger";
import { useLang } from "@/lib/i18n";
import { StatusBadge } from "@/components/StatusBadges";
import type { BadgeTone } from "@/lib/data";

// Step 3a — coverage badge tones (Step 2a badge system). "Exact" uses
// the teal-tinted reviewed neutral, NEVER the success green: it is
// our assessment that material exists for every blueprint subject,
// not official certification. "Source Confirmed" (official green) is
// reserved for the source badge, and only where a named official
// document confirms the pattern.
const COVERAGE_TONE: Record<LedgerCoverage, BadgeTone> = {
  exact: "reviewed",
  proxy: "proxy",
  partial: "partial",
  unknown: "unknown",
};

function CoverageBadge({ row }: { row: LedgerRow }) {
  const { t } = useLang();
  const labelKey = {
    exact: "ledgerCoverageExact",
    proxy: "ledgerCoverageProxy",
    partial: "ledgerCoveragePartial",
    unknown: "ledgerCoverageUnknown",
  }[row.coverage];
  const detailKey = {
    exact: "ledgerCoverageExactDetail",
    proxy: "ledgerCoverageProxyDetail",
    partial: "ledgerCoveragePartialDetail",
    unknown: "ledgerCoverageUnknownDetail",
  }[row.coverage];
  return <StatusBadge label={t(labelKey)} detail={t(detailKey)} tone={COVERAGE_TONE[row.coverage]} />;
}

function SourceBadge({ state }: { state: LedgerSourceState }) {
  const { t } = useLang();
  if (state === "confirmed") {
    return (
      <StatusBadge
        label={t("ledgerSourceConfirmed")}
        detail={t("ledgerSourceConfirmedDetail")}
        tone="official"
      />
    );
  }
  if (state === "provisional") {
    return (
      <StatusBadge
        label={t("ledgerSourceProvisional")}
        detail={t("ledgerSourceProvisionalDetail")}
        tone="partial"
      />
    );
  }
  return (
    <StatusBadge
      label={t("ledgerSourceUnavailable")}
      detail={t("ledgerSourceUnavailableDetail")}
      tone="unknown"
    />
  );
}

function LedgerCard({ row }: { row: LedgerRow }) {
  const { t, tf } = useLang();
  return (
    <div className="card">
      <h3>
        <span dir="auto">{row.trackName}</span>{" "}
        <span dir="ltr" className="badge teal">
          {row.bps}
        </span>{" "}
        <CoverageBadge row={row} /> <SourceBadge state={row.sourceState} />
      </h3>
      {/* The coverage reason is visible text (not tooltip-only): it
          says WHY this row has its status. */}
      <p className="muted">
        <span dir="auto">{row.coverageReason}</span>
      </p>
      <p>
        <b>{t("ledgerSourceLabel")}:</b>{" "}
        {row.sourceUrl ? (
          <a dir="ltr" href={row.sourceUrl} target="_blank" rel="noreferrer">
            {row.sourceLabel}
          </a>
        ) : (
          <span dir="auto">{row.sourceLabel}</span>
        )}{" "}
        · {t("ledgerLastVerified")}: <span dir="ltr">{row.lastVerified}</span>
      </p>
      {/* Admin fields: one line each, English factual values isolated
          so mixed text cannot reorder in RTL mode. */}
      <ul style={{ marginTop: 0 }}>
        <li>
          <b>{t("ledgerTotalLabel")}:</b> <span dir="ltr">{row.totalLabel}</span>
        </li>
        <li>
          <b>{t("ledgerTimeLabel")}:</b> <span dir="auto">{row.timeLabel}</span>
        </li>
        <li>
          <b>{t("ledgerLanguageLabel")}:</b> <span dir="auto">{row.languageLabel}</span>
        </li>
        <li>
          <b>{t("ledgerNegativeLabel")}:</b> <span dir="auto">{row.negativeMarkingLabel}</span>
        </li>
      </ul>
      {row.patternNote && (
        <p className="muted">
          <span dir="auto">{row.patternNote}</span>
        </p>
      )}
      <p>
        <b>{t("ledgerAvailableLabel")}:</b>
      </p>
      <ul style={{ marginTop: 0 }}>
        {row.subjects.map((s) => (
          <li key={s.label}>
            <span dir="ltr">{s.label}</span> — <span dir="ltr">{s.weightLabel}</span> ·{" "}
            <span dir="auto">
              {tf("ledgerSubjectCounts", { notes: s.notes, mcqs: s.mcqs, cards: s.cards })}
            </span>
          </li>
        ))}
      </ul>
      <p>
        <b>{t("ledgerMocksLabel")}:</b>{" "}
        {row.mocks.length === 0 ? (
          <span className="muted">{t("ledgerNoMock")}</span>
        ) : (
          row.mocks.map((m, i) => (
            <span key={m.id}>
              {i > 0 && " · "}
              <Link href={`/mock/${m.id}`}>
                <span dir="auto">{m.title}</span>
              </Link>
              {m.shared && (
                <span className="muted">
                  {" "}
                  ({t("ledgerSharedMock")})
                </span>
              )}
            </span>
          ))
        )}
      </p>
      <p className="muted">
        <span dir="auto">
          {tf("ledgerBankReview", { n: row.trustedInBank, total: row.totalMcqs })}
        </span>
      </p>
      <p>
        <b>{t("ledgerMissingLabel")}:</b> <span dir="auto">{row.missing}</span>
      </p>
      <p>
        <b>{t("ledgerNextLabel")}:</b> <span dir="auto">{row.nextAction}</span>
      </p>
      <p>
        <Link href={`/tracks/${row.trackId}`}>{t("ledgerViewTrack")}</Link>
      </p>
    </div>
  );
}

export default function Vacancies() {
  const { t } = useLang();
  const ledger = buildLedger();
  return (
    <div>
      <h1>{t("vacTitle")}</h1>
      <div className="alert">
        <b>
          {t("vacAlertA")}{" "}
          <a dir="ltr" href="https://etea.online/" target="_blank" rel="noreferrer">
            etea.online
          </a>{" "}
          {t("vacAlertB")}
        </b>{" "}
        {t("vacAlertC")}
      </div>
      {/* Step 3a — teaching-only scope, stated plainly. */}
      <p className="muted">{t("teachingOnlyNote")}</p>
      {/* Stage 1 P1 Tier 4 (B01) — the 6-column table overflowed on mobile.
          The scroll region keeps the table layout and scrolls horizontally
          instead; it is keyboard-focusable so keyboard users can scroll it.
          Step 2a — the visible caption says the table scrolls
          horizontally (report P1.1 acceptance: the affordance must be
          visible, not discoverable only by trying). */}
      <p className="muted">{t("tableScrollHint")}</p>
      <div className="table-scroll" role="region" aria-label={t("vacTableAria")} tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>{t("postWord")}</th>
              <th>BPS</th>
              <th>{t("vacanciesWord")}</th>
              <th>{t("lastDateWord")}</th>
              <th>{t("eligibilityWord")}</th>
              <th>{t("sourceWord")}</th>
            </tr>
          </thead>
          <tbody>
            {VISIBLE_VACANCIES.map((v) => (
              <tr key={v.post}>
                <td dir="auto">{v.post}</td>
                <td dir="ltr">{v.bps}</td>
                <td>{v.vac}</td>
                <td dir="ltr">{v.last}</td>
                <td dir="auto">{v.elig}</td>
                <td dir="auto">{v.src}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Step 3a — Vacancy Coverage Ledger (teaching posts only). The
          id anchors the link from the Tracks page. */}
      <h2 id="ledger">{t("ledgerHeading")}</h2>
      <p className="muted">{t("ledgerIntro")}</p>
      {ledger.map((row) => (
        <LedgerCard key={row.trackId} row={row} />
      ))}
    </div>
  );
}
