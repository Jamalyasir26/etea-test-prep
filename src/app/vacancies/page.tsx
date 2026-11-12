// Vacancy Tracker — manually curated. No next-ESED date is invented.
// Localization Pass 1 — converted to a client component so the UI
// strings can go through i18n.tsx (same pattern as the other pages:
// first render is English on server and client, then the stored
// language applies after mount — no new hydration risk).
"use client";

import { VACANCIES } from "@/lib/data";
import { useLang } from "@/lib/i18n";

export default function Vacancies() {
  const { t } = useLang();
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
      {/* Stage 1 P1 Tier 4 (B01) — the 6-column table overflowed on mobile.
          The scroll region keeps the table layout and scrolls horizontally
          instead; it is keyboard-focusable so keyboard users can scroll it. */}
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
            {VACANCIES.map((v) => (
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
    </div>
  );
}
