// GET /api/tutor/health — provider RESPONSIVENESS check (Stage 0, 2026-11-12).
// Unlike GET /api/tutor (key presence only), this probes each configured
// provider with one tiny generation (15 s bound each, run in parallel) and
// reports per-provider {status, latencyMs, errorClass}.
// Response contains NO key material, ever — error messages are truncated to
// 200 chars and scrubbed for key-shaped strings before returning.
// NOTE: each probe is a real (tiny) API call and counts against the
// provider's quota, so call this sparingly (diagnostics only).
//
// Stage 1 P1 Tier 1 — cold-start honesty: the old 10 s probe bound timed
// out Gemini on the first (cold) call while warm calls answer in ~2 s.
// The bound is now 15 s (see PROBE_TIMEOUT_MS in src/lib/ai.ts — it fits
// the Hobby 300 s function budget with huge margin), and this route also
// reports whether THIS invocation ran on a cold instance, so a timeout on
// a cold call reads as "cold instance, retry once" instead of a misleading
// "down". `instanceWarmed` is module state: it survives across warm
// invocations on the same instance and resets when Vercel starts a fresh
// instance — a best-effort signal, not a guarantee. NO warm-up cron was
// added: Vercel limits Hobby crons to once per day, and an instance stays
// warm only minutes after an invocation, so a daily ping cannot keep the
// function warm for an on-demand check.
import { NextRequest, NextResponse } from "next/server";
import { probeProviders, rateLimitOk, type ProviderHealth } from "@/lib/ai";
import { clientIpFromHeaders, isSameOriginRequest } from "@/lib/apiGuard";
import { createProbeCache } from "@/lib/healthCache";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

let instanceWarmed = false;

// Step 3b-audit F14/F18 — server-side 5-minute probe cache (per
// instance). The client already caches 5 minutes (tutorHealth.ts);
// the TTLs match, so a manual Refresh inside the window returns the
// cached probe WITH its original checkedAt — the UI's checked-at age
// stays honest. Cache-Control: private, max-age=300 lets the browser
// reuse the response too; the guard + rate limit below still run on
// every request (the handler always executes — only the probe is
// skipped on a cache hit).
const HEALTH_TTL_MS = 5 * 60 * 1000;
const healthCache = createProbeCache<{
  overall: string;
  checkedAt: string;
  durationMs: number;
  providers: Record<string, ProviderHealth>;
}>(HEALTH_TTL_MS);

export async function GET(req: NextRequest) {
  // Stage 1 P1 Tier 3 — each probe is a real (tiny) provider call, so the
  // health check gets the same-origin guard and the same rate limit as the
  // AI routes. GET with no Origin/Referer (directly opening this URL in a
  // browser tab) is still allowed — see src/lib/apiGuard.ts.
  if (!isSameOriginRequest(req.headers, "GET")) {
    return NextResponse.json(
      { error: "This API only accepts requests from the ETEA Prep site itself." },
      { status: 403 }
    );
  }
  const rl = rateLimitOk(clientIpFromHeaders(req.headers));
  if (!rl.ok) return NextResponse.json({ error: rl.message }, { status: 429 });
  const coldStart = !instanceWarmed;
  instanceWarmed = true;
  const { value: base, cached } = await healthCache.load(async () => {
    const started = Date.now();
    const providers = await probeProviders();
    const entries = Object.values(providers) as ProviderHealth[];
    const configured = entries.filter((p) => p.configured);
    const okCount = configured.filter((p) => p.status === "ok").length;
    const overall =
      configured.length === 0 ? "down" : okCount === configured.length ? "ok" : okCount > 0 ? "degraded" : "down";
    return {
      overall,
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      providers,
    };
  });
  return NextResponse.json(
    {
      ...base,
      // A cache hit ran on an already-warm instance by definition (this
      // instance probed before); never report it as a cold start.
      coldStart: cached ? false : coldStart,
      cached,
      note:
        "Responsiveness probe (one tiny generation per provider), not key presence. No key material is ever included in this response." +
        (!cached && coldStart
          ? " This call ran on a cold instance — if a provider shows a timeout here, wait a few seconds and retry once; it usually answers warm."
          : "") +
        (cached ? " Served from the 5-minute server cache; checkedAt is the original probe time." : ""),
    },
    { headers: { "Cache-Control": "private, max-age=300, must-revalidate" } },
  );
}
