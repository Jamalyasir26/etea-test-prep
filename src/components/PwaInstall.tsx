// PwaInstall — Stage 4A (PWA). The sidebar's install affordance.
// Renders ONLY when an install path actually exists: a captured
// beforeinstallprompt (Chromium/Android) or the iOS Share → Add to
// Home Screen instruction (Safari has no prompt API). Renders nothing
// when installed, when dismissed, or before mount — never a popup,
// never nagging. The parent (Sidebar) hides it in the collapsed rail.
"use client";

import { Download, Share, X } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { Button } from "./ui/button";
import { usePwa } from "./PwaProvider";

export default function PwaInstall() {
  const { t } = useLang();
  const { mounted, canInstall, showIosHint, promptInstall, dismissInstall } = usePwa();

  if (!mounted || (!canInstall && !showIosHint)) return null;

  return (
    <div className="tw:mx-3 tw:mb-3 tw:rounded-md tw:border tw:border-border tw:p-3">
      <div className="tw:flex tw:items-start tw:justify-between tw:gap-2">
        <p className="tw:m-0 tw:text-sm tw:font-semibold">{t("pwaInstallTitle")}</p>
        <Button
          variant="ghost"
          size="icon"
          className="tw:size-8 tw:shrink-0"
          aria-label={t("pwaInstallDismiss")}
          title={t("pwaInstallDismiss")}
          onClick={dismissInstall}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <p className="tw:mt-1 tw:mb-3 tw:text-xs tw:text-muted-foreground">{t("pwaInstallBody")}</p>
      {canInstall ? (
        <Button size="sm" className="tw:w-full" onClick={promptInstall}>
          <Download aria-hidden="true" />
          {t("pwaInstallButton")}
        </Button>
      ) : (
        <p className="tw:m-0 tw:flex tw:items-start tw:gap-2 tw:text-xs tw:text-muted-foreground">
          <Share className="tw:mt-0.5 tw:size-4 tw:shrink-0" aria-hidden="true" />
          <span>{t("pwaIosHint")}</span>
        </p>
      )}
    </div>
  );
}
