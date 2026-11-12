// Stage 1 P2 (B07) — route-bound client telemetry for hydration and
// other client errors. Everything stays on this device: entries are
// written to localStorage only (key `etea_telemetry_next_v1`), never
// sent anywhere, and are viewable on /issues. Every function is
// defensive: it never throws, works when storage is blocked, and is
// safe to call during server rendering (no-ops without `window`).
// This exists because React hydration errors (#418/#425) only happen in
// a real browser — they cannot be reproduced from a server log — so the
// site records them where they happen, with the route attached.

export const TELEMETRY_KEY = "etea_telemetry_next_v1";
export const TELEMETRY_MAX_ENTRIES = 50;
const MAX_MESSAGE_LENGTH = 300;

export type TelemetryEntry = {
  at: string; // ISO timestamp (UTC — stable across timezones)
  route: string; // window.location.pathname at capture time
  kind: "hydration" | "error" | "unhandledrejection";
  message: string; // truncated to 300 chars
};

/** True when a console message looks like a React hydration failure
 *  (React error #418/#425 and friends, or the words "hydration"). */
export function looksLikeHydrationError(message: string): boolean {
  return /hydrat/i.test(message) || /Minified React error #(418|419|423|425)\b/.test(message);
}

export function loadTelemetry(): TelemetryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TELEMETRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: TelemetryEntry[] = [];
    for (const e of parsed) {
      if (!e || typeof e !== "object") continue;
      const r = e as Record<string, unknown>;
      if (
        typeof r.at === "string" &&
        typeof r.route === "string" &&
        (r.kind === "hydration" || r.kind === "error" || r.kind === "unhandledrejection") &&
        typeof r.message === "string"
      ) {
        out.push({ at: r.at, route: r.route, kind: r.kind, message: r.message });
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Record one telemetry entry. Newest first, capped at
 *  TELEMETRY_MAX_ENTRIES (oldest dropped). Never throws. */
export function recordTelemetry(
  kind: TelemetryEntry["kind"],
  message: string,
  route?: string,
): void {
  if (typeof window === "undefined") return;
  try {
    const entry: TelemetryEntry = {
      at: new Date().toISOString(),
      route: route ?? window.location?.pathname ?? "/",
      kind,
      message: String(message).slice(0, MAX_MESSAGE_LENGTH),
    };
    const entries = [entry, ...loadTelemetry()].slice(0, TELEMETRY_MAX_ENTRIES);
    window.localStorage.setItem(TELEMETRY_KEY, JSON.stringify(entries));
  } catch {
    // Storage blocked or full: telemetry is best-effort, never fatal.
  }
}

export function clearTelemetry(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TELEMETRY_KEY);
  } catch {
    // Best-effort.
  }
}
