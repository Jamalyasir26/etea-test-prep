// Site footer — client component so the disclaimer paragraphs follow
// the site language (Localization Pass 1). The text is UI chrome
// (translated via i18n.tsx); the footer renders identically on server
// and first client render (English default), then follows the stored
// language after mount — the same pattern as every other client page.
"use client";

import { useLang } from "@/lib/i18n";

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="container">
      <p>{t("footerP1")}</p>
      <p>{t("footerP2")}</p>
      <p>{t("footerP3")}</p>
    </footer>
  );
}
