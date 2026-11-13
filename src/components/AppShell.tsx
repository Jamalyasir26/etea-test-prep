// AppShell — Stage 3. EVERY page renders inside the new shell
// (Sidebar + Topbar). The foundation batch kept the legacy Nav on all
// pages except home behind a pathname switch; part 2 migrates the
// remaining pages, so the switch is removed. The legacy Nav component
// (src/components/Nav.tsx) is RETIRED but kept in the tree for now —
// deleting it is a merge-time decision, and test-i18n still audits its
// link keys.
//
// The shell reuses the EXISTING i18n + theme systems (useLang from
// src/lib/i18n.tsx): the language select and theme toggle in the
// Topbar call the same setLang/setTheme as the legacy Nav, and the
// sidebar side flips in Urdu mode via logical properties
// (inset-inline-start / border-inline-end) — see Sidebar.
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";
import {
  download,
  exportProgress,
  getStorageWarnings,
  isManagedStorageKey,
  safeRead,
  safeWrite,
} from "@/lib/tracking";
import Footer from "./Footer";
import Sidebar from "./Sidebar";
import ShellTopbar from "./ShellTopbar";
import { PageFade } from "./motion";

// Persisted collapse preference (desktop rail). "1" = collapsed.
const SIDEBAR_KEY = "etea_sidebar_collapsed";

export default function AppShell({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Step 3b-audit2 (F07/F09) — storage safety banners, shown on every
  // page. (1) A failed write (quota/full/blocked) anywhere in the app
  // wakes this banner via the "etea-storage-warning" event, so the
  // user sees the error on the page they are on — never silently
  // lost. Dismissing hides it until the NEXT failure. (2) A `storage`
  // event for a managed key means ANOTHER tab changed the user's
  // study data (the platform never fires it in the writing tab), so
  // the user is warned to reload before their own changes overwrite
  // it. Both are mount-gated: no localStorage access during SSR.
  const [storageFailed, setStorageFailed] = useState(false);
  const [otherTabChanged, setOtherTabChanged] = useState(false);
  useEffect(() => {
    const hasFailure = () =>
      getStorageWarnings().some((w) => w.type === "write-failed" || w.type === "write-conflict");
    if (hasFailure()) setStorageFailed(true);
    const onWarning = () => {
      if (hasFailure()) setStorageFailed(true);
    };
    const onStorage = (e: StorageEvent) => {
      if (isManagedStorageKey(e.key)) setOtherTabChanged(true);
    };
    window.addEventListener("etea-storage-warning", onWarning);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("etea-storage-warning", onWarning);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Collapse preference is read after mount (localStorage is client
  // only); the first render is always expanded, so there is no
  // hydration mismatch.
  useEffect(() => {
    if (safeRead(SIDEBAR_KEY) === "1") setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    safeWrite(SIDEBAR_KEY, next ? "1" : "0");
  };

  // On mobile the drawer is always full-width, so the persisted
  // collapsed state only affects the rail content on desktop: when
  // the drawer is open, show the expanded content regardless.
  const effectiveCollapsed = collapsed && !mobileOpen;

  return (
    <div className="tw:flex tw:min-h-screen tw:font-sans">
      <a href="#shell-main" className="shell-skip-link">
        {t("skipToContent")}
      </a>
      {mobileOpen && (
        <div
          className="tw:fixed tw:inset-0 tw:z-30 tw:bg-black/50 tw:md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar
        collapsed={effectiveCollapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        returnFocusRef={hamburgerRef}
      />
      <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col">
        <ShellTopbar
          onOpenMobile={() => setMobileOpen(true)}
          mobileOpen={mobileOpen}
          toggleRef={hamburgerRef}
        />
        {/* Step 2a — while the mobile drawer is open, the page content
            behind it is inert (no tab stops, no clicks, hidden from
            assistive tech). The Topbar is deliberately OUTSIDE the
            inert region: Escape closes the drawer and returns focus to
            the hamburger in the same tick, and focusing an inert
            element is a no-op. The Sidebar's focus trap keeps Tab
            inside the drawer, so the Topbar controls are unreachable
            by keyboard while it is open. */}
        <div inert={mobileOpen} className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col">
          <main id="shell-main" className="tw:mx-auto tw:w-full tw:max-w-5xl tw:flex-1 tw:px-4 tw:py-6">
            {storageFailed && (
              <div className="alert red" role="alert">
                <p>{t("storageSaveFailed")}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="secondary"
                    onClick={() =>
                      download(
                        `etea-prep-progress-${new Date().toISOString().slice(0, 10)}.json`,
                        exportProgress(),
                      )
                    }
                  >
                    {t("export")}
                  </button>
                  <button className="secondary" onClick={() => setStorageFailed(false)}>
                    {t("storageDismiss")}
                  </button>
                </div>
              </div>
            )}
            {otherTabChanged && (
              <div className="alert" role="alert">
                <p>{t("storageOtherTab")}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => window.location.reload()}>{t("storageReload")}</button>
                  <button className="secondary" onClick={() => setOtherTabChanged(false)}>
                    {t("storageDismiss")}
                  </button>
                </div>
              </div>
            )}
            {/* Stage 3 part 2 — route entrance (motion, reduced-motion
                safe). Keyed by pathname so every navigation re-runs the
                short fade; children themselves are untouched. */}
            <PageFade key={pathname}>{children}</PageFade>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
