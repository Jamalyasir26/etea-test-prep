// Stage 1 P2 (B06) — live AI tutor health indicator. Step 2b: probes
// go through the shared cache in src/lib/tutorHealth.ts (5-minute TTL
// for automatic loads, in-flight dedup across mounts, manual refresh
// with a 30 s cooldown), and BOTH variants render the ONE capability
// line from summarizeHealth(), so the home page and the tutor page can
// never disagree. Handles loading, timeout, HTTP errors and malformed
// responses gracefully and never crashes the page if the endpoint is
// down. Renders the same "checking" state on the server and on first
// client render, so it cannot cause a hydration mismatch.
// Localization Pass 1 — all strings via i18n.tsx; provider/model names
// and error classes stay English (proper names / identifiers) and are
// isolated LTR in RTL mode.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { lri, useLang } from "@/lib/i18n";
import {
  checkedAgeKey,
  fetchTutorHealth,
  formatCapabilityLine,
  HEALTH_REFRESH_COOLDOWN_MS,
  PROVIDER_LABELS,
  summarizeHealth,
  type TutorHealthData,
  type TutorProviderEntry,
} from "@/lib/tutorHealth";

type State =
  | { kind: "loading" }
  | { kind: "loaded"; data: TutorHealthData; fetchedAt: number }
  | { kind: "failed"; reason: string };

function statusLabel(
  p: TutorProviderEntry,
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
  const [cooldownUntil, setCooldownUntil] = useState(0);
  // Ticks every 60 s while loaded so the checked-at age stays truthful,
  // and once when the refresh cooldown expires so the button re-enables.
  const [tick, setTick] = useState(() => Date.now());
  const cancelledRef = useRef(false);

  const load = useCallback(
    async (force: boolean) => {
      setRefreshing(true);
      try {
        const { data, fetchedAt } = await fetchTutorHealth({ force });
        if (cancelledRef.current) return;
        setState({ kind: "loaded", data, fetchedAt });
        setCooldownUntil(Date.now() + HEALTH_REFRESH_COOLDOWN_MS);
      } catch (e) {
        if (cancelledRef.current) return;
        const msg = e instanceof Error ? e.message : "";
        const http = /^HTTP (\d+)/.exec(msg);
        const reason = http
          ? tf("reasonHttp", { status: Number(http[1]) })
          : msg === "unexpected response"
            ? t("reasonUnexpected")
            : e instanceof DOMException && e.name === "AbortError"
              ? t("reasonTimeout")
              : t("reasonUnreachable");
        setState({ kind: "failed", reason });
      } finally {
        if (!cancelledRef.current) setRefreshing(false);
      }
    },
    [t, tf],
  );

  useEffect(() => {
    cancelledRef.current = false;
    load(false);
    return () => {
      cancelledRef.current = true;
    };
  }, [load]);

  // Re-render when the cooldown expires (re-enables Refresh) and every
  // 60 s while loaded (keeps the checked-at age fresh).
  useEffect(() => {
    if (state.kind !== "loaded") return;
    const delay = Math.max(0, Math.min(60000, cooldownUntil - Date.now()));
    const timer = setTimeout(() => setTick(Date.now()), delay === 0 ? 60000 : delay);
    return () => clearTimeout(timer);
  }, [state.kind, cooldownUntil, tick]);

  function refresh() {
    setState({ kind: "loading" });
    load(true);
  }

  const inCooldown = cooldownUntil > Date.now();

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
        <button className="secondary" disabled={refreshing || inCooldown} onClick={refresh}>
          {t("refreshStatus")}
        </button>
        {inCooldown && !refreshing && <p className="muted">{t("refreshCooldownNote")}</p>}
      </div>
    );
  }

  const summary = summarizeHealth(state.data);
  const capabilityLine = formatCapabilityLine(summary, t, tf, lri);
  const age = checkedAgeKey(state.fetchedAt, tick);
  const ageText = age.key === "checkedAgeMin" ? tf(age.key, age.vars) : t(age.key);

  if (variant === "summary") {
    return (
      <p className="muted">
        {capabilityLine} {ageText}
      </p>
    );
  }

  const entries = Object.entries(state.data.providers ?? {});
  return (
    <div className={`alert ${summary.overall === "ok" ? "green" : summary.overall === "degraded" ? "" : "red"}`}>
      <p style={{ margin: "0 0 8px" }}>
        <b>{capabilityLine}</b> {ageText}
        {summary.coldStart ? ` ${t("coldStartNote")}` : ""}
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
        <button className="secondary" disabled={refreshing || inCooldown} onClick={refresh}>
          {t("refreshStatus")}
        </button>
        {inCooldown && !refreshing && (
          <span className="muted"> {t("refreshCooldownNote")}</span>
        )}
      </p>
    </div>
  );
}
