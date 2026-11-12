# Verification — Stage 1 P1 Tier 3 (security + code quality)

Date: 2026-11-12 (local work, ~10:02–10:20 PKT). **NOT deployed.** No GitHub/Vercel/env changes. Backup: `~/workspace/etea-prep-next-backup-pre-p1t3/` (flat copy, `diff -rq` identical, no nested directory).

Scope: five items only — (1) AI API access restriction, (2) rate limiter fix, (3) vulnerable dependencies, (4) security headers, (5) TypeScript strict mode. Tier 4 untouched. Model choices untouched (Groq gpt-oss-120b, OpenRouter gemma-4-31b-it:free — the live OpenRouter 429 is upstream throttling, not this tier's problem).

## 1. AI API access restriction — new `src/lib/apiGuard.ts` + 4 routes

Why this shape (decided before implementing, per the brief): the site is PUBLIC with NO login gate (owner decision C11) and the owner uses it from his phone on a dynamic mobile IP — an IP allowlist would lock him out. A "signed token" embedded in client JavaScript would provide no real security (anyone can read it from the page/network). So the honest, working combination is a same-origin check (stops casual abuse and hot-linking from other websites) paired with the strengthened rate limiter as the main defense. Origin/Referer headers ARE spoofable by a determined caller with curl — this is documented in the code comment (`src/lib/apiGuard.ts` header) and here: it is NOT access control.

| Change | File:line | Before | After |
|---|---|---|---|
| Guard module | `src/lib/apiGuard.ts` (new, 96 lines) | No guard existed. | `isAllowedOrigin()` (production origin, Vercel preview deployments of this project, localhost/127.0.0.1 any port), `isSameOriginRequest(headers, method)`, `clientIpFromHeaders(headers)`. No Next.js imports — node-testable directly. |
| Same-origin rule | `src/lib/apiGuard.ts:47-62` | — | Origin present → must be allowed. Origin absent + Referer present → Referer's origin must be allowed. Neither header → GET allowed (directly opening a diagnostic URL in a tab sends neither), POST rejected (browsers always send Origin on POST fetches, so a headerless POST is not a browser call from our pages). |
| Routes | `src/app/api/tutor/route.ts:14,34`, `src/app/api/explain/route.ts:11`, `src/app/api/plan/route.ts:11`, `src/app/api/tutor/health/route.ts:28` | No origin check on any route. | All four routes reject cross-origin requests with 403 + "This API only accepts requests from the ETEA Prep site itself." — checked FIRST, before body parsing/validation/quota. GET /api/tutor (key presence only) also guarded. |
| Health rate limit | `src/app/api/tutor/health/route.ts:35` | Health had no rate limit, yet each probe is a real (tiny) provider call. | Health now shares the same 100/day + 10/min limiter. A human refreshing diagnostics stays far under the limit; the parent's post-deploy health checks (a handful of calls) are unaffected. |

**Tests:** `scripts/test-api-guard.mjs` — **60/60 PASS** (new suite, `npm run test:guard`). Proves: production/preview/localhost origins pass; foreign, lookalike-subdomain (`etea-test-prep.vercel.app.evil.com`), lookalike-suffix, http-production, `null`, and empty origins rejected; POST cross-origin/no-header/malformed-Referer rejected; POST same-origin Origin and Referer-only pass; GET no-header allowed, GET cross-origin rejected; Origin wins over Referer; header/method case-insensitivity.

**Live proof (local prod server, curl):** cross-origin POST → 403; headerless POST → 403; same-origin POST → 503 "not configured" (guard passed, no keys locally — honest); health GET no-headers → 200; health GET cross-origin → 403.

**Verify live after deploy:** from the site, the tutor/explain/plan still answer (same-origin fetches pass). From curl with `-H "Origin: https://evil.example.com"`, POST /api/tutor → 403. Opening /api/tutor/health directly in a browser tab still works (GET, no headers).

**Optional follow-up (owner decision, NOT implemented):** a real tutor-only token would need a token value + a Vercel env var + a one-time entry in the UI. Env changes need owner approval, so this is documented here only.

## 2. Rate limiter fix — trusted header + validate-before-limit

| Change | File:line | Before | After |
|---|---|---|---|
| Trusted identity | `src/lib/apiGuard.ts:72-88` | Each route read `x-forwarded-for` directly (client-supplied, spoofable). | `clientIpFromHeaders()` prefers Vercel's `x-vercel-forwarded-for` (set by Vercel's edge, client values overwritten — not spoofable), falls back to `x-forwarded-for` (local dev only), then `"local"`. All three route-local `clientIp()` helpers deleted; no direct `x-forwarded-for` read remains in any route. |
| Order | tutor `route.ts:34-52`, explain `route.ts:11-25`, plan `route.ts:11-30` | `rateLimitOk()` ran BEFORE body validation — invalid requests consumed quota. | Order is now: same-origin check → parse + validate (400/404) → rate limit → generate. Plan has no hard-fail validation (weeks/weakSubjects sanitised with defaults), so its limit runs after body parse/sanitise. |
| Limiter itself | `src/lib/ai.ts:43-50` (comment only) | Unchanged behaviour. | No code change to `rateLimitOk` — limits stay 100/day + 10/min per IP with the same 429 messages. Comment documents the contract (trusted identity, validate-before-limit) and the per-instance limitation. |

**Tests:** same `test-api-guard.mjs` suite (60/60). Proves: vercel header preferred over a spoofed `x-forwarded-for`; first entry of a list wins; empty vercel header falls through; no headers → `"local"`; LIMITS still {100, 10}; first 10 requests pass, 11th/12th 429; exhausted IP does not affect another IP; source-order checks prove validation and the origin check precede `rateLimitOk` in all three POST routes and that no route reads `x-forwarded-for` directly.

**Live proof (local prod server, fresh bucket):** 11 invalid POSTs (empty message) → all 400; then 10 valid POSTs → all 503 (the 400s consumed NO quota); 11th valid POST → 429. Threshold and ordering both proven against the real running server.

**Known limitation (honest):** buckets are in-memory per server instance — on Vercel Fluid, several instances may each hold their own bucket, so the effective limit is per-instance, not global. A shared atomic limiter (Upstash Redis) would fix that but needs owner-approved env setup — documented as a future option, not adopted here.

**Verify live after deploy:** 11 rapid tutor questions from one browser → the 11th gets the 429 "wait a minute" message; an empty question → 400 and does not count toward the limit (verify by sending an empty question first, then 10 real ones, all passing).

## 3. Vulnerable dependencies — Next.js 15.5.29 → 16.4.6

| Change | Before | After |
|---|---|---|
| `next` | 15.5.29 | **16.4.6** (exact pin, matching the repo's exact-version convention; `npm view` confirmed 16.4.6 is the current release and its peer range accepts React 19 — installed React 19.3.1 satisfies it; engines need Node ≥20.9 — local Node 24, Vercel runtime nodejs26.x). |
| `postcss` (transitive via Next) | 8.4.31 | **8.5.23** — the PostCSS chain fix came with the Next upgrade; `npm ls postcss` shows a single 8.5.23 under next@16.4.6. |
| Lockfile | — | Regenerated with `npm install`. Version changes are exactly the Next 16.4.6 tree (@next/*, @swc/helpers 0.5.15→0.5.23, postcss) plus one new transitive dep (`baseline-browser-mapping` 2.11.36). No other package changed. |
| `lint` script | `"lint": "next lint"` | **Removed.** Next.js 16 removed the `next lint` command (it now treats "lint" as a project directory). No ESLint config exists in this repo, so nothing is lost; the build does not use it. |
| `tsconfig.json` / `next-env.d.ts` | jsx "preserve", routes.d.ts reference | Next 16's build rewrote them (jsx → "react-jsx", added `.next/dev/types`, routes/root-params imports). Kept as generated — they are Next-managed files. |

**npm audit — BLOCKED, recorded honestly:** `npm audit` cannot run in this sandbox: the registry audit endpoint returns `403 Forbidden - policy_denied` (verified twice, before and after the upgrade). So there is no audit before/after count to report. The evidence instead is the concrete version record above (Next 15.5.29→16.4.6, postcss 8.4.31→8.5.23, full lockfile diff reviewed). The parent should run `npm audit` from an unrestricted environment after deploy if a count is wanted.

**Upgrade verification:** `npm run build` PASS (21/21 routes, same route table as Tier 2), `npx tsc --noEmit` clean, and ALL suites green immediately after the upgrade (before the strict/header work): scoring 39/39, reviews 37/37, retrieval 28/28, fallback 24/24, timeouts 43/43, storage 36/36, lang 30/30, guard 60/60, flashcards 29/29, QA 52/52. No code change was needed for the major upgrade — the app uses no removed APIs (no `next/image`, no middleware, no `next/headers`).

**Verify live after deploy:** Vercel build log shows Next 16.4.6; the site serves all pages; `next start` behaviour locally already proves the route table is unchanged.

## 4. Security headers — `next.config.mjs`

| Change | File:line | Before | After |
|---|---|---|---|
| Headers | `next.config.mjs` (rewritten, X-Robots-Tag kept) | Only `X-Robots-Tag: noindex`. | Added: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`, `X-Frame-Options: DENY`, `Content-Security-Policy`. |
| CSP | `next.config.mjs:15-26` | None. | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`. |

**CSP honesty:** `'unsafe-inline'` is kept for scripts AND styles because the site uses React inline styles (`style={{...}}`) and Next.js injects inline scripts for hydration — without it the UI breaks. That weakens CSP (an injected inline script would still run); nonce-based CSP is future work. The remaining directives still block foreign scripts, framing, plugins, and cross-origin form posts. Pre-flight check confirmed the policy cannot break anything the site loads: all client fetches are same-origin `/api/*`, there are no `<img>` tags, no web fonts, no CSS `@import`s, and external links are plain `<a href>` navigations.

**Live proof (local prod server, curl -I):** all six headers present on `/` AND on `/api/tutor` responses; all 14 pages HTTP 200 with the headers active; home still shows "645 MCQs"; the tutor page still contains the العربية option; the tutor API still answers (503 no-keys = reached the generator, not blocked by CSP — CSP governs the browser, and `connect-src 'self'` permits the same-origin calls).

**Verify live after deploy:** `curl -I https://etea-test-prep.vercel.app/` shows all six headers; open the site in a browser and confirm no console CSP errors and the tutor still answers.

## 5. TypeScript strict mode — `tsconfig.json`

| Change | File:line | Before | After |
|---|---|---|---|
| Strict flag | `tsconfig.json` | `"strict": false` | `"strict": true`. |
| Errors fixed | — | — | **Zero.** `npx tsc --noEmit` is clean with strict on. The codebase was already strict-clean (no `any` leaks, no unchecked undefined access) — no code change was needed, and NO `@ts-ignore` / `@ts-expect-error` was added (grep-verified: none exist in src/). |
| Build gate | `next.config.mjs` | — | Confirmed: no `typescript.ignoreBuildErrors` escape hatch exists. Proven live: a probe file with a deliberate type error fails `next build` (exit 1, TS2322 reported) — `next build` type-checks by default, so strict mode is enforced on every deploy. The probe also proved strictNullChecks is active (TS18048 "possibly undefined" caught). Probe file removed afterwards; final `npx tsc --noEmit` clean. |

**Verify live after deploy:** the Vercel build log runs type checking; a future type error will fail the deploy (by design — that is the gate working).

## Regression verification (local)

- `npm run build` **PASS** — 21 routes (same table as Tier 2), strict on, headers active.
- `npx tsc --noEmit` **clean** with `strict: true`. Gate proven with a deliberate-error probe (build fails, then clean after removal).
- Suites: scoring **39/39**, reviews **37/37**, retrieval **28/28**, fallback-chain **24/24**, flashcards **29/29**, QA **52/52**, timeouts **43/43**, storage **36/36**, tutor-lang **30/30**, api-guard **60/60** (new). Total **378 checks, 0 failures**. (Storage counts 36 measured PASS lines; the Tier 2 report's "35/35" was off by one — the suite itself exits 0 with no failures.)
- Local prod server (`next start`, port 3108): `/`, `/library`, `/mock`, `/practice`, `/tutor`, `/review`, `/analysis`, `/flashcards`, `/plan`, `/tracks`, `/links`, `/vacancies`, `/topics`, `/issues` all HTTP 200; home shows 645 MCQs; tutor page contains the العربية option; `GET /api/tutor/health` reports all providers `not_configured` (expected — no keys locally) with the new model ids; guard/limiter behaviour proven live by curl (see items 1–2). Server stopped afterwards; no stray process.
- **Honest limits:** no live provider calls (no keys locally); no real-browser click-through — CSP behaviour in a real browser (console errors, tutor fetch under `connect-src 'self'`) needs a post-deploy browser check; `npm audit` could not run in this sandbox (403 policy block — see item 3); the per-instance limiter limitation and the spoofable-Origin limitation are documented, not solved.

## Files changed (local only, no deploy)

- `src/lib/apiGuard.ts` (new) — same-origin check + trusted client IP.
- `src/lib/ai.ts` — limiter-contract comment only (no behaviour change).
- `src/app/api/tutor/route.ts`, `src/app/api/explain/route.ts`, `src/app/api/plan/route.ts` — guard + validate-before-limit + trusted IP; local `clientIp()` helpers deleted.
- `src/app/api/tutor/health/route.ts` — guard + rate limit.
- `scripts/test-api-guard.mjs` (new), `package.json` (Next 16.4.6, `test:guard` script added, dead `lint` script removed).
- `package-lock.json` (regenerated), `next.config.mjs` (security headers), `tsconfig.json` (`strict: true` + Next 16 reformat), `next-env.d.ts` (Next 16 regenerated references).
- `VERIFY-p1-tier3.md` (this file), `CHANGELOG.md` (Tier 3 section appended).

## Expected live behaviour after deploy

- Tutor/explain/plan answer normally from the site; cross-origin POSTs get 403; invalid requests get 400/404 without consuming quota; the 11th tutor request in a minute gets 429.
- Health shows per-provider status as before; direct browser opens still work; cross-origin health fetches get 403.
- All six security headers present on every response; no CSP console errors in the browser.
- Vercel build runs on Next 16.4.6 with strict type-checking enforced.
