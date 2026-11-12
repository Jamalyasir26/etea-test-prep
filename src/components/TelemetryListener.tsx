// Stage 1 P2 (B07) — mounts the client-error listeners that feed the
// telemetry store (see src/lib/telemetry.ts). Renders nothing. Listens
// for window "error" and "unhandledrejection", and wraps console.error
// ONCE (calling through to the original for every message) so React
// hydration failures (#418/#425), which React reports via console.error
// rather than window.onerror, are captured with their route. The wrap
// is guarded against double-installation and never swallows a message.
// Mounted once in the root layout; everything recorded stays on-device.
"use client";

import { useEffect } from "react";
import { looksLikeHydrationError, recordTelemetry } from "@/lib/telemetry";

const WRAP_FLAG = "__eteaTelemetryConsoleWrapped";

export default function TelemetryListener() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      const message = e.message || "Unknown error";
      recordTelemetry(
        looksLikeHydrationError(message) ? "hydration" : "error",
        message,
        window.location.pathname,
      );
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      const message =
        reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "Unhandled promise rejection";
      recordTelemetry("unhandledrejection", message, window.location.pathname);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    // Wrap console.error once so hydration failures are captured. The
    // original is always called with the original arguments.
    const g = globalThis as Record<string, unknown>;
    if (!g[WRAP_FLAG]) {
      g[WRAP_FLAG] = true;
      const originalError = console.error;
      console.error = (...args: unknown[]) => {
        try {
          const text = args
            .map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : String(a)))
            .join(" ");
          if (looksLikeHydrationError(text)) {
            recordTelemetry("hydration", text, window.location.pathname);
          }
        } catch {
          // Telemetry must never break logging.
        }
        originalError.apply(console, args);
      };
    }

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      // The console.error wrap is intentionally NOT removed on unmount:
      // this component mounts once in the root layout and never unmounts
      // in practice; removing the wrap would need the original, which a
      // second mount would then re-wrap incorrectly.
    };
  }, []);

  return null;
}
