// GET /api/tutor/health — provider RESPONSIVENESS check (Stage 0, 2026-11-12).
// Unlike GET /api/tutor (key presence only), this probes each configured
// provider with one tiny generation (10 s bound each, run in parallel) and
// reports per-provider {status, latencyMs, errorClass}.
// Response contains NO key material, ever — error messages are truncated to
// 200 chars and scrubbed for key-shaped strings before returning.
// NOTE: each probe is a real (tiny) API call and counts against the
// provider's quota, so call this sparingly (diagnostics only).
import { NextResponse } from "next/server";
import { probeProviders, type ProviderHealth } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const started = Date.now();
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
    note: "Responsiveness probe (one tiny generation per provider), not key presence. No key material is ever included in this response.",
    providers,
  });
}
