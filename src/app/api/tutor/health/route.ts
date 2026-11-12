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
import { NextResponse } from "next/server";
import { probeProviders, type ProviderHealth } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

let instanceWarmed = false;

export async function GET() {
  const started = Date.now();
  const coldStart = !instanceWarmed;
  instanceWarmed = true;
  const providers = await probeProviders();
  const entries = Object.values(providers) as ProviderHealth[];
  const configured = entries.filter((p) => p.configured);
  const okCount = configured.filter((p) => p.status === "ok").length;
  const overall =
    configured.length === 0 ? "down" : okCount === configured.length ? "ok" : okCount > 0 ? "degraded" : "down";
  return NextResponse.json({
    overall,
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    coldStart,
    note:
      "Responsiveness probe (one tiny generation per provider), not key presence. No key material is ever included in this response." +
      (coldStart
        ? " This call ran on a cold instance — if a provider shows a timeout here, wait a few seconds and retry once; it usually answers warm."
        : ""),
    providers,
  });
}
