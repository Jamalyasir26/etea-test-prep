// Analysis charts — Stage 3 part 2 (recharts 3.10.1).
// Two charts from REAL local data only — never invented:
//  - DueForecastChart: forecastDue() buckets of the stored FSRS flash
//    state (new + already-due cards count toward today).
//  - AccuracyTrendChart: computeStats().daily (MCQ attempts only,
//    first-pass scores — the same source as the tables below it).
// Empty states say so honestly (chartNoData). Colours read on BOTH
// themes (light paper / dark ink): mid-tone series colours, neutral
// grid/ticks; the tooltip uses the theme variables via inline style
// (var() works in inline styles, unlike SVG presentation attributes).
// The chart wrapper is dir="ltr": Recharts lays out left-to-right
// and must not mirror in Urdu (RTL) mode.
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FlashState } from "@/lib/tracking";
import { forecastDue } from "@/lib/tracking";
import { useLang } from "@/lib/i18n";

const TOOLTIP_STYLE = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  color: "var(--ink)",
} as const;
const GRID = { stroke: "#94a3b8", strokeOpacity: 0.25, vertical: false } as const;

type FlashCardLite = { front: string; back: string; category: string };

export function DueForecastChart({ cards, state }: { cards: FlashCardLite[]; state: FlashState }) {
  const { t, theme } = useLang();
  // U1 (F3.2) — theme-aware ticks: #94a3b8 fails on light cards
  // (2.56:1); the site's own --muted passes (5.57:1). Dark keeps #94a3b8.
  const tick = { fill: theme === "dark" ? "#94a3b8" : "#5a6b70", fontSize: 12 } as const;
  // UI/UX2 (scope addition, M07 follow-through) — the bar fill is
  // theme-aware, matching the --chart-2 token W4 fixed in globals.css:
  // light #b45309 is 5.02:1 vs the white card, dark #f5a10b is 7.41:1
  // vs the dark card (#182628). The old hardcoded fill="#F5A10B" was
  // 2.10:1 in light mode, so the token fix alone never reached the
  // rendered bars.
  const barFill = theme === "dark" ? "#f5a10b" : "#b45309";
  const data = forecastDue(cards, state, new Date(), 7);
  // UI/UX2 M39 — mirror the accuracy chart's empty state: when every
  // bucket is 0 (all cards graded, none due within 7 days), say so
  // honestly instead of rendering empty axes plus a table of zeros.
  // (A fresh user is unaffected — new cards count toward today.)
  if (data.every((d) => d.due === 0)) {
    return (
      <div className="card">
        <h3>{t("chartDueForecast")}</h3>
        <p className="muted">{t("chartNoData")}</p>
      </div>
    );
  }
  return (
    <div className="card">
      <h3>{t("chartDueForecast")}</h3>
      {/* Step 2a — the chart is an image with a text alternative: the
          same data in a table below it, inside a disclosure. */}
      <div dir="ltr" className="tw:h-64 tw:w-full" role="img" aria-label={t("chartDueAria")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="label" tick={tick} />
            <YAxis tick={tick} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(label) => `${label}`} />
            <Bar dataKey="due" name={t("chartDueWord")} fill={barFill} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* UI/UX2 M10 — the summary is a 44px tap target (min-height +
          centered flex, the audit's sketch applied inline because the
          global summary rule lives in globals.css, owned by W4). */}
      {/* UI/UX2 M38 — the data table uses the same labelled,
          keyboard-accessible .table-scroll region as the other tables
          on the site. */}
      <details>
        <summary style={{ minHeight: 44, display: "flex", alignItems: "center" }}>{t("chartViewData")}</summary>
        <p className="muted">{t("tableScrollHint")}</p>
        <div className="table-scroll" role="region" aria-label={t("chartDueForecast")} tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>{t("dateWord")}</th>
              <th>{t("chartDueWord")}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date}>
                <td dir="ltr">{d.date.slice(5)}</td>
                <td>{d.due}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </details>
    </div>
  );
}

export type DailyPoint = { date: string; correct: number; total: number; attempts: number };

export function AccuracyTrendChart({ daily }: { daily: DailyPoint[] }) {
  const { t, theme } = useLang();
  // U1 (F3.2) — theme-aware ticks + accuracy line (see DueForecastChart):
  // light line #0f766e passes (5.47:1) where #14b8a6 fails (2.49:1).
  const tick = { fill: theme === "dark" ? "#94a3b8" : "#5a6b70", fontSize: 12 } as const;
  const lineStroke = theme === "dark" ? "#14b8a6" : "#0f766e";
  // UI/UX2 (scope addition) — same theme-aware bar fill as
  // DueForecastChart above. The questions bar keeps translucency so
  // it stays a background to the accuracy line, but at 0.8 opacity,
  // not 0.35: the effective (blended-over-card) contrast at 0.8 is
  // light 3.54:1 / dark 5.21:1, both passing the 3:1 non-text bar.
  // At the old 0.35 it was light 1.30:1 / dark 2.04:1; even 0.7 would
  // still fail in light mode (2.95:1). The line renders after the
  // bars, so it stays on top.
  const barFill = theme === "dark" ? "#f5a10b" : "#b45309";
  const points = daily
    .slice(-14)
    .filter((d) => d.total > 0)
    .map((d) => ({
      date: d.date.slice(5),
      accuracy: Math.round((d.correct / d.total) * 100),
      questions: d.total,
    }));
  if (points.length === 0) {
    return (
      <div className="card">
        <h3>{t("chartAccuracyTrend")}</h3>
        <p className="muted">{t("chartNoData")}</p>
      </div>
    );
  }
  return (
    <div className="card">
      <h3>{t("chartAccuracyTrend")}</h3>
      {/* Step 2a — same text-alternative pattern as the forecast chart. */}
      <div dir="ltr" className="tw:h-64 tw:w-full" role="img" aria-label={t("chartAccuracyAria")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" tick={tick} />
            <YAxis yAxisId="left" tick={tick} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={tick} domain={[0, 100]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar yAxisId="left" dataKey="questions" name={t("chartQuestionsWord")} fill={barFill} fillOpacity={0.8} radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="accuracy" name={t("chartAccuracyWord")} stroke={lineStroke} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {/* UI/UX2 M10/M38 — see DueForecastChart above: 44px summary +
          labelled .table-scroll region for the data table. */}
      <details>
        <summary style={{ minHeight: 44, display: "flex", alignItems: "center" }}>{t("chartViewData")}</summary>
        <p className="muted">{t("tableScrollHint")}</p>
        <div className="table-scroll" role="region" aria-label={t("chartAccuracyTrend")} tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>{t("dateWord")}</th>
              <th>{t("chartAccuracyWord")}</th>
              <th>{t("chartQuestionsWord")}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.date}>
                <td dir="ltr">{p.date}</td>
                <td>
                  <span dir="ltr">{p.accuracy}%</span>
                </td>
                <td>{p.questions}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </details>
    </div>
  );
}
