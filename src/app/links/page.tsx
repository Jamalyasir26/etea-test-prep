// Official Links — link out only. No textbook or past-paper PDFs hosted.
// Localization Pass 1 — converted to a client component so the UI
// strings can go through i18n.tsx (first render is English on server
// and client, then the stored language applies after mount — no new
// hydration risk). Link names/notes stay English (content) and are
// bidi-isolated.
"use client";

import { OFFICIAL_LINKS } from "@/lib/data";
import { useLang } from "@/lib/i18n";

export default function Links() {
  const { t } = useLang();
  return (
    <div>
      <h1>{t("links")}</h1>
      <p className="muted">{t("linksIntro")}</p>
      {OFFICIAL_LINKS.map(([name, url, note]) => (
        <div className="card" key={url}>
          <h3>
            <a dir="ltr" href={url} target="_blank" rel="noreferrer">
              {name} ↗
            </a>
          </h3>
          <p className="muted">
            <span dir="auto">{note}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
