// Step 3b-audit F14/F18 — tiny TTL cache for the tutor-health probe.
//
// Each probe is a real (tiny) provider call that counts against
// quota, so repeated hits within the TTL share one probe result
// instead of re-probing. Concurrent loads share one in-flight probe
// (no duplicate probes). A failed probe never poisons the cache: the
// in-flight slot clears and the next load probes again; a STALE
// entry is never served (the loader probes fresh past the TTL).
//
// Pure + clock-injectable so tests can prove TTL expiry and in-flight
// sharing without waiting or touching the network. The route keeps
// the same-origin guard + rate limit on every request — only the
// probe is skipped on a cache hit.
export type ProbeCache<T> = {
  /** The fresh cached entry, or null when empty/expired. Never probes. */
  peek: () => { value: T; probedAt: number } | null;
  /** Fresh entry when cached (cached: true); otherwise one shared
   *  probe (cached: false), even under concurrent loads. */
  load: (probe: () => Promise<T>) => Promise<{ value: T; probedAt: number; cached: boolean }>;
};

export function createProbeCache<T>(ttlMs: number, now: () => number = Date.now): ProbeCache<T> {
  let entry: { value: T; probedAt: number } | null = null;
  let inflight: Promise<{ value: T; probedAt: number }> | null = null;

  const peek = () => {
    if (!entry) return null;
    return now() - entry.probedAt < ttlMs ? entry : null;
  };

  const load = async (probe: () => Promise<T>) => {
    const fresh = peek();
    if (fresh) return { ...fresh, cached: true };
    if (!inflight) {
      inflight = (async () => {
        const value = await probe();
        entry = { value, probedAt: now() };
        return entry;
      })();
      // Clear the slot whether the probe succeeds or fails, so a
      // failure never wedges later loads onto a rejected promise.
      inflight.then(
        () => {
          if (inflight) inflight = null;
        },
        () => {
          inflight = null;
        },
      );
    }
    const done = await inflight;
    return { ...done, cached: false };
  };

  return { peek, load };
}
