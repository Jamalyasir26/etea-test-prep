// Step 2b — cached tutor-health probes + the ONE capability summary.
//
// Every health probe is a real (tiny) provider call that counts against
// quota, so probes are cached: automatic loads reuse a probe for
// HEALTH_CACHE_TTL_MS, simultaneous mounts share one in-flight request
// (no duplicate probes per page view), and manual refresh bypasses the
// cache but never duplicates an in-flight probe. The fetch lives in
// this module (not in a component) so unmounting a component cannot
// abort a probe another mount is waiting for.
//
// summarizeHealth() is the SINGLE computation behind the capability
// wording on the home page (TutorHealth summary variant) and the tutor
// page (full variant headline): both render formatCapabilityLine()
// from the same summary, so the wording can never disagree.
export type TutorProviderEntry = {
  configured?: boolean;
  status?: string;
  latencyMs?: number;
  model?: string;
  errorClass?: string;
};

export type TutorHealthData = {
  overall?: string;
  checkedAt?: string;
  coldStart?: boolean;
  providers?: Record<string, TutorProviderEntry>;
};

export type HealthSummary = {
  overall: "ok" | "degraded" | "down";
  okCount: number;
  total: number;
  okNames: string[];
  downNames: string[];
  coldStart: boolean;
};

export const PROVIDER_LABELS: Record<string, string> = {
  gemini: "Gemini",
  groq: "Groq",
  openrouter: "OpenRouter",
};

/** Automatic loads reuse a cached probe for 5 minutes (the cooldown:
 *  navigating between pages never re-probes within the window). */
export const HEALTH_CACHE_TTL_MS = 5 * 60 * 1000;
/** Manual Refresh is disabled for 30 s after a probe completes, so a
 *  double-click or impatient re-click cannot burn quota. */
export const HEALTH_REFRESH_COOLDOWN_MS = 30 * 1000;

// The health route probes each provider with a 15 s bound and the
// route itself allows 30 s; 28 s keeps us inside the route budget
// while still surviving a cold start.
const FETCH_TIMEOUT_MS = 28000;

type CachedProbe = { data: TutorHealthData; fetchedAt: number };
let cached: CachedProbe | null = null;
let inflight: Promise<CachedProbe> | null = null;

async function probeOnce(): Promise<CachedProbe> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch("/api/tutor/health", { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as TutorHealthData;
    if (!data || typeof data !== "object" || !data.providers || typeof data.providers !== "object") {
      throw new Error("unexpected response");
    }
    return { data, fetchedAt: Date.now() };
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch the tutor health probe, with cache + in-flight dedup.
 *  `force` bypasses the cache (manual Refresh) but still shares an
 *  in-flight probe. A failed probe never overwrites a good cache
 *  entry — the caller keeps showing the last good result with its
 *  checked-at age, and reports the failure separately. */
export async function fetchTutorHealth(opts?: { force?: boolean }): Promise<{
  data: TutorHealthData;
  fetchedAt: number;
  fromCache: boolean;
}> {
  const now = Date.now();
  if (!opts?.force && cached && now - cached.fetchedAt < HEALTH_CACHE_TTL_MS) {
    return { ...cached, fromCache: true };
  }
  if (!inflight) {
    inflight = probeOnce().then(
      (result) => {
        cached = result;
        inflight = null;
        return result;
      },
      (err) => {
        inflight = null;
        throw err;
      },
    );
  }
  const result = await inflight;
  return { ...result, fromCache: false };
}

/** Test-only: clear the module cache (plain-node tests share one
 *  module instance across cases). Never called by the app. */
export function __resetHealthCacheForTests() {
  cached = null;
  inflight = null;
}

/** The ONE capability summary, computed from a probe result. Pure:
 *  same data → same summary, on every page. */
export function summarizeHealth(data: TutorHealthData): HealthSummary {
  const entries = Object.entries(data.providers ?? {});
  const okEntries = entries.filter(([, p]) => p.status === "ok");
  const downEntries = entries.filter(([, p]) => p.status !== "ok");
  const overall =
    data.overall === "ok" || data.overall === "degraded" || data.overall === "down"
      ? data.overall
      : okEntries.length === 0
        ? "down"
        : okEntries.length === entries.length
          ? "ok"
          : "degraded";
  return {
    overall,
    okCount: okEntries.length,
    total: entries.length,
    okNames: okEntries.map(([k]) => PROVIDER_LABELS[k] ?? k),
    downNames: downEntries.map(
      ([k, p]) => `${PROVIDER_LABELS[k] ?? k}${p.errorClass ? ` (${p.errorClass})` : ""}`,
    ),
    coldStart: data.coldStart === true,
  };
}

/** The ONE capability line, rendered from a summary with the same
 *  i18n keys on every page. `t`/`tf` are the caller's i18n functions
 *  (same pattern as TutorHealth's statusLabel). Provider names are
 *  English identifiers, wrapped in bidi isolates by the caller via
 *  lri() inside the tf vars. */
export function formatCapabilityLine(
  summary: HealthSummary,
  t: (key: string) => string,
  tf: (key: string, vars: Record<string, string | number>) => string,
  lri: (s: string) => string,
): string {
  const prefix = t("liveStatusNow");
  if (summary.okCount === 0) return `${prefix} ${t("noProvider")}`;
  const responding = tf("summaryResponding", { names: lri(summary.okNames.join(", ")) });
  const notResponding =
    summary.downNames.length > 0
      ? `; ${tf("summaryNotResponding", { names: lri(summary.downNames.join(", ")) })}`
      : "";
  return `${prefix} ${responding}${notResponding}.`;
}

/** Checked-at age for a probe: which i18n key + vars render it.
 *  "Just now" under a minute, minutes under an hour, then the
 *  over-an-hour wording. Pure (takes `now` so tests control time). */
export function checkedAgeKey(
  fetchedAt: number,
  now: number,
): { key: "checkedAgeNow" | "checkedAgeMin" | "checkedAgeOld"; vars: Record<string, number> } {
  const ageMs = Math.max(0, now - fetchedAt);
  const mins = Math.floor(ageMs / 60000);
  if (mins < 1) return { key: "checkedAgeNow", vars: {} };
  if (mins < 60) return { key: "checkedAgeMin", vars: { n: mins } };
  return { key: "checkedAgeOld", vars: {} };
}
