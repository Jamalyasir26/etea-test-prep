// Stage 1 P2 (B06) — live AI tutor health indicator. Fetches
// GET /api/tutor/health ONCE on mount (no polling: every probe is a
// real tiny provider call and counts against quota) and shows the
// per-provider status. Handles loading, timeout, HTTP errors and
// malformed responses gracefully and never crashes the page if the
// endpoint is down. A manual Refresh button re-checks on demand.
// Renders the same "checking" state on the server and on first client
// render, so it cannot cause a hydration mismatch.
// Localization Pass 1 — all strings via i18n.tsx; provider/model names
// and error classes stay English (proper names / identifiers) and are
// isolated LTR in RTL mode.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { lri, useLang } from "@/lib/i18n";

type ProviderEntry = {
  configured?: boolean;
  status?: string;
  latencyMs?: number;
  model?: string;
  errorClass?: string;
};

type HealthData = {
  overall?: string;
  checkedAt?: string;
  coldStart?: boolean;
  providers?: Record<string, ProviderEntry>;
};

type State =
  | { kind: "loading" }
  | { kind: "loaded"; data: HealthData }
  | { kind: "failed"; reason: string };

const PROVIDER_LABELS: Record<string, string> = {
  gemini: "Gemini",
  groq: "Groq",
  openrouter: "OpenRouter",
};

// The health route probes each provider with a 15 s bound and the route
// itself allows 30 s; 28 s keeps us inside the route budget while still
// surviving a cold start.
const FETCH_TIMEOUT_MS = 28000;

function statusLabel(
  p: ProviderEntry,
  t: (key: string) => string,
  tf: (key: string, vars: Record<string, string | number>) => string,
): { text: string; tone: "green" | "red" | "grey" } {
  if (p.status === "ok") return { text: t("statusResponding"), tone: "green" };
  if (p.status === "not_configured" || p.configured === false)
    return { text: t("statusNotConfigured"), tone: "grey" };
  if (p.errorClass)
    return { text: tf("statusErrorClass", { errorClass: lri(p.errorClass) }), tone: "red" };
  return { text: t("statusError"), tone: "red" };
}

export default function TutorHealth({ variant }: { variant: "full" | "summary" }) {
  const { t, tf } = useLang();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch("/api/tutor/health", { signal: ctrl.signal });
      if (!res.ok) {
        setState({ kind: "failed", reason: tf("reasonHttp", { status: res.status }) });
        return;
      }
      const data = (await res.json()) as HealthData;
      if (!data || typeof data !== "object" || !data.providers || typeof data.providers !== "object") {
        setState({ kind: "failed", reason: t("reasonUnexpected") });
        return;
      }
      setState({ kind: "loaded", data });
    } catch (e) {
      if (ctrl.signal.aborted) {
        setState({ kind: "failed", reason: t("reasonTimeout") });
      } else {
        setState({ kind: "failed", reason: t("reasonUnreachable") });
      }
      void e;
    } finally {
      clearTimeout(timer);
      setRefreshing(false);
    }
  }, [t, tf]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  function refresh() {
    setRefreshing(true);
    setState({ kind: "loading" });
    load();
  }

  if (state.kind === "loading") {
    return variant === "summary" ? (
      <p className="muted">{t("checkingStatus")}</p>
    ) : (
      <div className="alert">{t("checkingStatus")}</div>
    );
  }

  if (state.kind === "failed") {
    const msg = tf(
      variant === "summary" ? "statusFailedSummary" : "statusFailedFull",
      { reason: state.reason },
    );
    return variant === "summary" ? (
      <p className="muted">{msg}</p>
    ) : (
      <div className="alert red">
        {msg}{" "}
        <button className="secondary" disabled={refreshing} onClick={refresh}>
          {t("refreshStatus")}
        </button>
      </div>
    );
  }

  const entries = Object.entries(state.data.providers ?? {});
  const okCount = entries.filter(([, p]) => p.status === "ok").length;
  const overall = state.data.overall ?? (okCount > 0 ? "degraded" : "down");
  const overallText =
    overall === "ok" ? t("healthOk") : overall === "degraded" ? t("healthDegraded") : t("healthDown");

  if (variant === "summary") {
    const okNames = entries.filter(([, p]) => p.status === "ok").map(([k]) => PROVIDER_LABELS[k] ?? k);
    const downNames = entries
      .filter(([, p]) => p.status !== "ok")
      .map(([k, p]) => `${PROVIDER_LABELS[k] ?? k}${p.errorClass ? ` (${p.errorClass})` : ""}`);
    return (
      <p className="muted">
        {t("liveStatusNow")}{" "}
        {okCount === 0
          ? t("noProvider")
          : `${tf("summaryResponding", { names: lri(okNames.join(", ")) })}${downNames.length ? `; ${tf("summaryNotResponding", { names: lri(downNames.join(", ")) })}` : ""}.`}{" "}
        {t("checkedJustNow")}
      </p>
    );
  }

  return (
    <div className={`alert ${overall === "ok" ? "green" : overall === "degraded" ? "" : "red"}`}>
      <p style={{ margin: "0 0 8px" }}>
        <b>{tf("fullStatusLine", { overall: overallText, ok: okCount, total: entries.length })}</b>
        {state.data.coldStart ? ` ${t("coldStartNote")}` : ""}
      </p>
      <ul style={{ margin: 0, paddingInlineStart: 18 }}>
        {entries.map(([key, p]) => {
          const s = statusLabel(p, t, tf);
          return (
            <li key={key}>
              {/* Provider + model are English identifiers: isolated LTR
                  so the colon and parentheses cannot jump in RTL mode. */}
              <span dir="ltr">
                {PROVIDER_LABELS[key] ?? key} ({p.model ?? t("unknownModel")})
              </span>
              : <span className={`badge ${s.tone}`}>{s.text}</span>
              {p.status === "ok" && typeof p.latencyMs === "number" ? (
                <>
                  {" "}
                  <span dir="ltr">{p.latencyMs} ms</span>
                </>
              ) : (
                ""
              )}
            </li>
          );
        })}
      </ul>
      <p style={{ margin: "8px 0 0" }}>
        <button className="secondary" disabled={refreshing} onClick={refresh}>
          {t("refreshStatus")}
        </button>
      </p>
    </div>
  );
}
