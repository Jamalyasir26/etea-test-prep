// SERVER-ONLY request guard for the public AI API routes
// (tutor, explain, plan, health). Pure functions over request headers —
// no Next.js imports — so the node test suites can import this file
// directly.
//
// Stage 1 P1 Tier 3 (2026-11-12) — honest anti-abuse, NOT access control:
// the site is public with NO login gate (owner decision C11) and the owner
// uses it from his phone on a dynamic mobile IP, so an IP allowlist would
// lock him out, and a "signed token" embedded in client JavaScript would
// provide no real security (anyone can read it from the page/network).
// What this module does instead:
//   1. Same-origin check — a request whose Origin/Referer is NOT the
//      site's own origin is rejected (403) before it can consume quota.
//      This stops casual abuse and hot-linking from other websites.
//   2. Trusted client-IP extraction — Vercel's `x-vercel-forwarded-for`
//      (set by Vercel's edge, not spoofable by the client) is preferred
//      over the client-supplied `x-forwarded-for`, so the rate limiter
//      in src/lib/ai.ts keys on a trustworthy identity.
// HONEST LIMITATION: Origin/Referer headers are spoofable by a determined
// caller with curl, so this deters casual abuse but is NOT access control.
// The rate limiter (100/day + 10/min per IP) is the main defense, and a
// real gate would need a server-side tutor token — that needs a Vercel
// env var and a one-time entry in the UI, i.e. a separate owner decision
// (documented in VERIFY-p1-tier3.md, not implemented here).

/** Minimal header access — satisfied by NextRequest.headers and by the
 *  plain-object stand-in used in the node tests. */
export type HeaderBag = {
  get(name: string): string | null;
};

const PRODUCTION_ORIGIN = "https://etea-test-prep.vercel.app";

/** The site's own origins: production, Vercel preview deployments of this
 *  project, and local development. Anything else is a foreign origin. */
export function isAllowedOrigin(origin: string): boolean {
  const o = origin.trim();
  if (o === PRODUCTION_ORIGIN) return true;
  // Vercel preview deployments: etea-test-prep-<branch-or-hash>.vercel.app
  if (/^https:\/\/etea-test-prep-[a-z0-9-]+\.vercel\.app$/.test(o)) return true;
  // Local development, any port.
  if (/^https?:\/\/localhost(:\d+)?$/.test(o)) return true;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(o)) return true;
  return false;
}

/**
 * Same-origin decision for an API request.
 * - Origin header present → it must be one of the site's own origins.
 * - Origin absent, Referer present → the Referer's origin must be ours
 *   (covers same-origin navigations and older clients).
 * - Neither header → GET is allowed (directly opening a diagnostic URL
 *   in a browser tab sends neither header, and that must keep working),
 *   but POST is rejected: browsers always send Origin on POST fetches,
 *   so a POST with neither header is not a browser call from our pages.
 * Returns true when the request may proceed, false when it must get 403.
 */
export function isSameOriginRequest(headers: HeaderBag, method: string): boolean {
  const origin = headers.get("origin");
  if (origin) return isAllowedOrigin(origin);
  const referer = headers.get("referer");
  if (referer) {
    try {
      return isAllowedOrigin(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  return method.toUpperCase() === "GET";
}

/**
 * Client identity for rate limiting. Vercel's edge sets
 * `x-vercel-forwarded-for` to the real client IP and overwrites any
 * client-supplied value, so it is the trusted source on Vercel. The
 * `x-forwarded-for` fallback exists only for local development (where
 * neither header is set, the identity is "local").
 */
export function clientIpFromHeaders(headers: HeaderBag): string {
  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const first = vercel.split(",")[0].trim();
    if (first) return first;
  }
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0].trim();
    if (first) return first;
  }
  return "local";
}
