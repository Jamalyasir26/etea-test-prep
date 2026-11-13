// PwaUpdateBanner — Stage 4A (PWA). Shown in the shell's main area
// (next to the storage banners) ONLY while a new service worker
// version is waiting. Refresh posts SKIP_WAITING and reloads on
// controllerchange; Later hides it for this visit. Nothing here ever
// reloads the page on its own — the user stays in control mid-quiz.
"use client";

import { useLang } from "@/lib/i18n";
import { usePwa } from "./PwaProvider";

export default function PwaUpdateBanner() {
  const { t } = useLang();
  const { updateWaiting, applyUpdate, dismissUpdate } = usePwa();

  if (!updateWaiting) return null;

  return (
    <div className="alert" role="status">
      <p>{t("pwaUpdateAvailable")}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={applyUpdate}>{t("pwaUpdateRefresh")}</button>
        <button className="secondary" onClick={dismissUpdate}>
          {t("pwaUpdateDismiss")}
        </button>
      </div>
    </div>
  );
}
