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
const AXIS_TICK = { fill: "#94a3b8", fontSize: 12 } as const;
const GRID = { stroke: "#94a3b8", strokeOpacity: 0.25, vertical: false } as const;

type FlashCardLite = { front: string; back: string; category: string };

export function DueForecastChart({ cards, state }: { cards: FlashCardLite[]; state: FlashState }) {
  const { t } = useLang();
  const data = forecastDue(cards, state, new Date(), 7);
  return (
    <div className="card">
      <h3>{t("chartDueForecast")}</h3>
      {/* Step 2a — the chart is an image with a text alternative: the
          same data in a table below it, inside a disclosure. */}
      <div dir="ltr" className="tw:h-64 tw:w-full" role="img" aria-label={t("chartDueAria")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="label" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(label) => `${label}`} />
            <Bar dataKey="due" name={t("chartDueWord")} fill="#F5A10B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details>
        <summary>{t("chartViewData")}</summary>
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
      </details>
    </div>
  );
}

export type DailyPoint = { date: string; correct: number; total: number; attempts: number };

export function AccuracyTrendChart({ daily }: { daily: DailyPoint[] }) {
  const { t } = useLang();
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
            <XAxis dataKey="date" tick={AXIS_TICK} />
            <YAxis yAxisId="left" tick={AXIS_TICK} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} domain={[0, 100]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar yAxisId="left" dataKey="questions" name={t("chartQuestionsWord")} fill="#F5A10B" fillOpacity={0.35} radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="accuracy" name={t("chartAccuracyWord")} stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <details>
        <summary>{t("chartViewData")}</summary>
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
      </details>
    </div>
  );
}
