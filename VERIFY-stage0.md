# Stage 0 — Final Verification (Tutor diagnosis + SDK migration)

**Date:** 2026-11-12
**Scope:** `~/workspace/etea-prep-next/` only. **No deploy, no GitHub/Vercel change.**
**Backup:** `~/workspace/etea-prep-next-backup-pre-stage0/` — 62 files, `diff -rq` identical to the pre-Stage 0 source (excluding node_modules/.next).

## 1. Build + types

| Command | Result |
|---|---|
| `npx tsc --noEmit` (before migration) | Clean, exit 0 |
| `npm run build` (before migration) | PASS — 21 routes incl. `ƒ /api/tutor/health` |
| `npx tsc --noEmit` (after migration) | Clean, exit 0 |
| `npm run build` (after migration) | PASS — `✓ Compiled successfully in 9.2s`, 21 routes |

## 2. Local eval — placeholder/invalid keys only (never real keys)

Local prod server (`next start -p 3100`) with obviously-fake placeholder keys
(`AIzaFakePlaceholder…`, `gsk_FakePlaceholder…`, `sk-or-v1-FakePlaceholder…`).

| Case | Result |
|---|---|
| `GET /api/tutor` | 200, `{live:true, gemini:true, groq:true, openrouter:true}` + `health: "/api/tutor/health"` |
| `GET /api/tutor/health` (pre-migration build) | 200, `overall:"down"` — gemini `invalid_key`, groq `network` (sandbox artifact, see §4), openrouter `invalid_key`; no key material in the response |
| `POST /api/tutor` "What is scaffolding in pedagogy?" (pre-migration) | 502, clean invalid-key message; log shows 3 attempts with correct classes |
| Invalid-model temp edit (`gemini-9.9-fake-model`, `fake-org/fake-model-xyz:free`) | Masking found: both still `invalid_key` (auth checked before model). Temp edits reverted, models restored, rebuilt |
| `GET /api/tutor/health` (post-migration build) | 200, `overall:"down"` — gemini `invalid_key` (new SDK surfaces full `API_KEY_INVALID` JSON, 81 ms), groq `network`, openrouter `invalid_key` |
| `POST /api/tutor` (post-migration) | 502, clean invalid-key message, 1.46 s; log shows 3 attempts, correct classes |
| Unit tests (`/tmp/unit-classify2.cjs`, compiled from the real `ai.ts`) | **11/11 classify cases pass**; `scrubSecrets`: 4 redactions, 0 leaks |
| Key-material grep | `FakePlaceholder` count = **0** in `src/`, scripts, `package.json`, and the `.next` bundle; only key-shaped strings in `src/` are the scrub regexes + one comment in `ai.ts`. The only occurrences of the string anywhere in the repo are in this file itself, documenting the fake placeholder key pattern used as the test fixture |

## 3. Live eval — deployed endpoint (read-only target, 7 POSTs, ~15 s apart)

`https://etea-test-prep.vercel.app/api/tutor`, full results in `/tmp/stage0-live-eval.jsonl`
(and summarised in `DIAGNOSIS-tutor-stage0.md` §2b).

| ID | Lang | Result |
|---|---|---|
| V-L1 en scaffolding (exact 00:27 repeat) | 502 generic "Gemini could not answer right now", 19,669 ms |
| V-L2 ur scaffolding | 502 same, 1,283 ms |
| V-L3 roman Ikhfa | 502 same, 1,392 ms |
| V-L4 ar Fa'il | 502 same, 1,410 ms |
| V-L5 en Bloom's taxonomy | 502 same, 1,009 ms |
| V-L6 en out-of-scope (capital of Australia) | 502 same, 771 ms |
| V-L7 ar out-of-scope | 502 same, 1,574 ms |

**0/7 live questions answered.** No provider answered; no live answer in any language, in-library or out-of-scope. Out-of-scope honesty and RAG relevance could not be observed live (endpoint fails before generating).

## 4. Root-cause evidence (the diagnosis)

- **Proven:** `gemini-2.0-flash` was **shut down 1 June 2026** (ai.google.dev/gemini-api/docs/deprecations; recommended replacement `gemini-3.6-flash`; models page lists it as "Shut down"). A 404 from a dead model collapses to the generic message under the old classifier (no 404 branch) — exactly the observed live behaviour (fast ~1 s failures, generic message, all languages).
- **Groq local failure is a sandbox artifact:** `groq-sdk` 0.32.0 depends on `node-fetch` 2.6.7, which ignores the sandbox egress proxy; direct Node `fetch` (undici, proxy-aware) to `api.groq.com` returns a proper 401 `Invalid API Key`. Not evidence about live Groq. Live Groq status unknown until the health endpoint is deployed.
- **Key format is not the problem:** the `AQ.Ab8…` format is Google's current auth-key format; the new SDK returns a normal `400 API_KEY_INVALID` for a fake key (transport works). The real key's validity still needs one live call after deploy.
- **Classifier bug found + fixed in this stage:** status-checked-before-message misclassified a wrapped provider 401 as `http_502`; bare `401` in a message was missed. Fixed (message tokens first), re-verified 11/11 and in live log lines.

## 5. Migration — verified

- `@google/generative-ai` 0.24.1 → `@google/genai` **3.2.0** (latest 3.x; engines node `>=22.0.0`; local Node 24.22.1). `package.json` + `package-lock.json` updated; zero references to the old SDK remain in `src/` or `package.json`.
- `GEMINI_MODEL`: `gemini-2.0-flash` → **`gemini-3.6-flash`** (Google's recommended replacement; Stable; released 21 Jul 2026; no shutdown announced).
- `package.json` adds `"engines": {"node": ">=22"}`.
- Groq + OpenRouter paths untouched; same order, same response contract, same rate limits.
- Post-migration local eval behaves identically-or-better (see §2).

## 6. Files changed (local only)

- `src/lib/ai.ts` — logging, classifier, probes, Gemini migration, model re-pin.
- `src/app/api/tutor/health/route.ts` — new.
- `src/app/api/tutor/route.ts` — GET adds health pointer.
- `package.json`, `package-lock.json` — SDK swap + engines.
- `DIAGNOSIS-tutor-stage0.md` (new), `VERIFY-stage0.md` (this file), `CHANGELOG.md` (Stage 0 section).

## 7. Remaining gaps / not verified

- **Live health probe with real keys** — impossible until Stage 0 is deployed (separate owner approval). This is the single most important remaining check: it will show per-provider live status and confirm whether the model fix alone restores the tutor.
- **Live tutor answer after migration** — needs one live question post-deploy.
- **Vercel runtime Node version** — unverified (must be ≥ 22 for `@google/genai` 3.2.0; `engines` pins it; first build log will show it).
- **Groq/OpenRouter live key validity** — unknown (errors were discarded pre-Stage 0; health endpoint will report them post-deploy).
- **V-L1 19.7 s first-probe latency** — most likely a cold start; a slow first provider call cannot be excluded from outside.
- **Not in this stage (per owner sequence):** per-call timeouts/retries in the answer path; fallback surfacing in the tutor UI; Arabic `lang` option; tutor-page copy update once health is confirmed.
- Eval harness files live in `/tmp` (`stage0-live-eval.jsonl`, `unit-classify2.cjs`, server logs `stage0-server*.log`) — ephemeral; the evidence above is the record.

**STOP — no production deploy, no GitHub push, no Vercel change. Awaiting the owner's deploy approval for Stage 0.**
