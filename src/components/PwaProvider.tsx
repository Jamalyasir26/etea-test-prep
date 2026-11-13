// PwaProvider — Stage 4A (PWA). One place for everything the shell
// needs to know about installability, connectivity, and service
// worker updates. Mount-gated throughout: the first render is always
// the SSR-safe default (online, no install affordance, no update
// notice), so there is no hydration mismatch.
//
// INSTALL: the beforeinstallprompt event is captured (preventDefault)
// and the stored event is only fired when the user clicks Install in
// the sidebar — never a popup on load. Dismissing hides the affordance
// permanently (localStorage); installed/standalone mode hides it too.
// iOS Safari has no beforeinstallprompt, so iPhones/iPads get the
// Share → Add to Home Screen instruction instead, and only there.
//
// UPDATES: registration happens on window load (never competing with
// first paint). A waiting worker means a NEW version is ready; the
// app shows the PwaUpdateBanner and only the user's Refresh click
// posts SKIP_WAITING — nobody is force-reloaded mid-quiz. The reload
// happens on controllerchange, guarded so only our own skipWaiting
// triggers it.
//
// OFFLINE: navigator.onLine + online/offline events. The badge in the
// topbar and the tutor's "needs internet" state both read this.
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { safeRead, safeWrite } from "@/lib/tracking";

// beforeinstallprompt is not in the TS DOM lib; the minimal shape we use.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type PwaState = {
  /** True after the first client effect — gate all PWA UI on this. */
  mounted: boolean;
  /** Current connectivity (navigator.onLine + online/offline events). */
  online: boolean;
  /** A stored install prompt is available and the user has not dismissed it. */
  canInstall: boolean;
  /** Running installed (standalone display mode) or just installed. */
  isInstalled: boolean;
  /** iOS Safari without the prompt API: show Add to Home Screen instructions. */
  showIosHint: boolean;
  /** The user dismissed the install affordance (persisted). */
  installDismissed: boolean;
  /** A new service worker version is installed and waiting. */
  updateWaiting: boolean;
  promptInstall: () => void;
  dismissInstall: () => void;
  applyUpdate: () => void;
  dismissUpdate: () => void;
};

const DEFAULT_STATE: PwaState = {
  mounted: false,
  online: true,
  canInstall: false,
  isInstalled: false,
  showIosHint: false,
  installDismissed: false,
  updateWaiting: false,
  promptInstall: () => {},
  dismissInstall: () => {},
  applyUpdate: () => {},
  dismissUpdate: () => {},
};

const PwaContext = createContext<PwaState>(DEFAULT_STATE);

export function usePwa(): PwaState {
  return useContext(PwaContext);
}

// Persisted install dismissal — "1" = the user said Not now; the
// affordance never nags again.
const INSTALL_DISMISSED_KEY = "etea_pwa_install_dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari: navigator.standalone (non-standard, hence the cast).
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  // iPadOS 13+ reports a Mac user agent; maxTouchPoints tells it apart.
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
  );
}

export default function PwaProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [online, setOnline] = useState(true);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [updateWaiting, setUpdateWaiting] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const waitingRef = useRef<ServiceWorker | null>(null);
  // True only between the user's Refresh click and the reload, so a
  // controllerchange from any other cause never reloads the page.
  const updatingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    setOnline(window.navigator.onLine);
    setIsInstalled(isStandalone());
    setIsIosDevice(isIos());
    if (safeRead(INSTALL_DISMISSED_KEY) === "1") setInstallDismissed(true);

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      if (safeRead(INSTALL_DISMISSED_KEY) !== "1" && !isStandalone()) {
        setCanInstall(true);
      }
    };
    const onAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      promptRef.current = null;
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    // Reload exactly once, only after OUR skipWaiting takes control.
    const onControllerChange = () => {
      if (updatingRef.current) {
        updatingRef.current = false;
        window.location.reload();
      }
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    }

    // Register on load so the worker never competes with first paint.
    let cancelled = false;
    const register = async () => {
      if (!("serviceWorker" in navigator)) return;
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        if (cancelled) return;
        // A worker already waiting + an existing controller = an
        // update is ready (first install has no controller).
        if (reg.waiting && navigator.serviceWorker.controller) {
          waitingRef.current = reg.waiting;
          setUpdateWaiting(true);
        }
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            // "installed" with a live controller = update waiting;
            // without a controller it is the first install.
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              waitingRef.current = worker;
              setUpdateWaiting(true);
            }
          });
        });
      } catch {
        // Registration failure (unsupported browser, blocked storage)
        // must never break the app: everything simply stays online-only.
      }
    };
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("load", register);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      }
    };
  }, []);

  const promptInstall = useCallback(() => {
    const evt = promptRef.current;
    if (!evt) return;
    promptRef.current = null;
    setCanInstall(false);
    void evt.prompt().then(() => evt.userChoice).catch(() => undefined);
  }, []);

  const dismissInstall = useCallback(() => {
    safeWrite(INSTALL_DISMISSED_KEY, "1");
    setInstallDismissed(true);
    setCanInstall(false);
    promptRef.current = null;
  }, []);

  const applyUpdate = useCallback(() => {
    const worker = waitingRef.current;
    if (!worker) return;
    updatingRef.current = true;
    setUpdateWaiting(false);
    worker.postMessage({ type: "SKIP_WAITING" });
  }, []);

  // Session-only: the notice returns on the next load while an update
  // is still waiting — a real update is worth mentioning once per
  // visit, not once per render.
  const dismissUpdate = useCallback(() => {
    setUpdateWaiting(false);
  }, []);

  const showIosHint =
    mounted && isIosDevice && !isInstalled && !canInstall && !installDismissed;

  return (
    <PwaContext.Provider
      value={{
        mounted,
        online,
        canInstall: canInstall && !installDismissed && !isInstalled,
        isInstalled,
        showIosHint,
        installDismissed,
        updateWaiting,
        promptInstall,
        dismissInstall,
        applyUpdate,
        dismissUpdate,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}
