# Verification — Stage 1 P1 Tier 2 (reliability + data safety)

Date: 2026-11-12 (local work, ~09:36–10:00 PKT). **NOT deployed.** No GitHub/Vercel/env changes. Backup: `~/workspace/etea-prep-next-backup-pre-p1t2/` (flat copy, `diff -rq` identical, no nested directory).

Scope: three items only — (1) provider timeouts + retries, (2) storage corruption safety, (3) Arabic tutor language option. Tier 3/4 untouched: TS strict stays `false`, OpenRouter model choice untouched, health probe 15 s bound untouched, site-wide EN/Roman/Urdu toggle untouched.

## 1. Provider timeouts + retries — `src/lib/ai.ts`

| Change | File:line | Before | After |
|---|---|---|---|
| Bounds constants | `src/lib/ai.ts:248-252` | No per-provider bound in the answer path; a slow provider could hang the whole attempt. | `PROVIDER_TIMEOUT_MS = 8000`, `ANSWER_DEADLINE_MS = 15000`, `MAX_PROVIDER_ATTEMPTS = 2`. |
| Transient classification | `src/lib/ai.ts:262` | No retry concept. | `isTransientErrorClass()`: transient = `timeout`, `network`, `quota`, `http_5xx`; never retried = `invalid_key`, `model_not_found`, `payment`, `not_configured`, `unknown`, `empty_response`, `http_4xx`. Driven by the existing `classifyProviderError` classes. |
| AbortSignal wiring | `src/lib/ai.ts:475-594` | Provider calls had no signal. | New `ProviderCallOptions {signal?, attempt?}`. Gemini: `abortSignal` in the generateContent config (verified supported by `@google/genai` 3.2.0 `GenerateContentConfig`); Groq: `{signal}` as the 2nd SDK arg (verified in groq-sdk `RequestOptions`); OpenRouter: `signal` on fetch. All three pass attempt markers to `timedCall`. |
| Deadline error | `src/lib/ai.ts:408` | — | `DeadlineError extends AiError` (502), message names the configured deadline in seconds — the honest error when the overall deadline hits. |
| Retry + deadline engine | `src/lib/ai.ts:658-710` | `generateTutorAnswer` called each provider once, unbounded. | New `tryProvider` helper inside `generateTutorAnswer` (5th `bounds` param, test seam, defaults 8000/15000): per-attempt bound = `min(providerTimeoutMs, remainingMs())` via `AbortSignal.timeout(bound)` AND the `withTimeout` race (the signal cancels fetch/Groq/Gemini promptly; the race enforces the bound even if an SDK ignored the signal). At most one retry, only for transient errors with time remaining. `NO_*_KEY` errors never retried (fall through, existing behaviour). `DeadlineError` stops the whole chain immediately. First-error preservation and final error mapping unchanged. `AbortSignal.any` deliberately NOT used — the attempt signal's bound is derived from the remaining overall budget, so no call can outlive the deadline. |
| Retry logging | `src/lib/ai.ts:169` + `ProviderAttempt` | — | `timedCall` exported and accepts `{attempt, retry}`; `ProviderAttempt` gained `attempt?`/`retry?`. Retries log as separate `tutor_provider_attempt` JSON lines with `attempt: 2, retry: true`. |

Fallback order Gemini → Groq → OpenRouter and the response contract are unchanged. Health probe untouched (its own 15 s bound, `src/lib/ai.ts:354`).

**Tests:** `scripts/test-timeouts.mjs` — **43/43 PASS** (new suite, `npm run test:timeouts`). Proves: constants 8000/15000/2; transient vs non-transient classification incl. 429→quota, 503→http_503, 402→payment; a 500 ms provider aborted at the 50 ms test bound (attempted exactly twice, attempts numbered 1+2, signal fired, chain finished in <400 ms); transient failure retried exactly once then succeeds; transient failure twice falls through (never a third call); non-transient failures (invalid_key, model_not_found, payment, unknown, empty_response) called exactly once, no retry; all providers hanging → `DeadlineError` at ~200 ms (not seconds); retry log lines carry the marker; first-error preservation still holds with retries in the chain. Existing `test-fallback-chain.mjs` still **24/24 PASS** (its stub errors are all non-transient, so no retries fire).

**Verify live after deploy:** `GET /api/tutor/health` unchanged (probe path untouched). Send a tutor question and confirm it answers in well under 15 s; check Vercel runtime logs for `tutor_provider_attempt` lines with `attempt`/`retry` fields. A forced slow-provider test is not possible without a controllable provider — the deadline behaviour is proven by the node suite with injected millisecond bounds.

## 2. Storage corruption safety — `src/lib/tracking.ts` (+ Analysis UI)

| Change | File:line | Before | After |
|---|---|---|---|
| Quarantine store | `src/lib/tracking.ts:86,215-221,316-366` | `safeParse` returned the fallback and the corrupt value stayed unreadable with no trace. | `QUARANTINE_KEY = "etea_quarantine_next_v1"`. `quarantine()` stores `{key, raw, at}` — raw text verbatim, deduped by (key, raw) so repeat page loads don't pile up records. The original key is NEVER cleared. `loadQuarantine()` / `exportQuarantine()` (app marker + kind, separate from the v5 backup shape) / `clearQuarantine()` (explicit user action only). If the quarantine store itself is corrupt JSON, its raw text is preserved as a record of its own (no recursion: `loadQuarantineRaw` never calls `safeParse`). |
| Safe read/write/remove | `src/lib/tracking.ts:260-288` | Direct `localStorage.*` calls everywhere; a blocked/full store threw. | Exported `safeRead` (never throws), `safeWrite` (returns boolean, catches QuotaExceededError/SecurityError/any DOMException), `safeRemove` (never throws). All tracking.ts callers migrated (reviews, annotations, attempts, plan, flashcards, issues, sessions, preferences, export/import). The only remaining direct calls are inside these three helpers plus one deliberate try/caught write in `quarantine()`. |
| Warning surface | `src/lib/tracking.ts:230-250` | Failures were silent. | In-memory `storageWarnings` (deduped by type+key+detail per page load — a *different* failure on the same key still surfaces), `console.warn` + `getStorageWarnings()` / `clearStorageWarnings()`. Detail is the error name only, never content. |
| `safeParse` rewrite | `src/lib/tracking.ts:373` | `safeParse(raw, fallback)` — caller-side, could not quarantine. | `safeParse<T>(key, fallback)`: reads via `safeRead`, quarantines on parse failure, returns the fallback, never clears the original key. |
| Analysis warning UI | `src/app/analysis/page.tsx:49-73,121-160` | No surface for storage problems. | Red alert above the stats grid when warnings/quarantine are non-empty: affected keys listed, write-failed warnings shown with an export nudge, "Download quarantined data" button (`exportQuarantine()`), and a confirm-gated "Dismiss and clear quarantined data" button (`clearQuarantine()` + `clearStorageWarnings()`). Warnings load inside `refresh()` AFTER the data loads, so quarantine triggers first. "Your data" copy explains quarantine. |
| Write-safety consistency | `src/lib/i18n.tsx:6,78-92`, `src/app/practice/page.tsx:7,51` | Bare `localStorage.getItem/setItem` for lang/theme + practice state. | Routed through `safeRead`/`safeWrite` (no import cycle — tracking.ts imports nothing). Practice page's own try/catch parse already never deleted — left as is. |

**Export/import versioning (unchanged, regression-tested):** v5 stays current; v4 and v5 restore exactly; v6+ rejected; quarantine is NOT part of the backup payload.

**Tests:** `scripts/test-storage.mjs` — **35/35 PASS** (new suite, `npm run test:storage`). Proves: malformed JSON → quarantined verbatim + default returned + original key untouched; repeat loads don't duplicate; second corrupt key quarantines separately; export contains raw texts verbatim; clear only via explicit action; QuotaExceededError write → caught + warning + prior data intact; SecurityError write → caught + warning with its name; failed read → default + warning; v4/v5 restore, v6 rejected, rejected import changes nothing; corrupt quarantine store preserves its own text. Two failures found during development were fixed honestly: a typo in the test itself (extra `}` in an expected string) and a real dedup bug — `recordWarning` deduped by (type, key) only, so a SecurityError after a QuotaExceededError on the same key was swallowed; dedup now includes the detail.

**Verify live after deploy:** open `/analysis` — no warning in normal use. In the browser console, corrupt a key (`localStorage.setItem("etea_attempts_next", "{bad")`), reload, open `/analysis`: the red alert appears, "Download quarantined data" yields the verbatim raw text, and the original key is still present in localStorage. (Do this in a throwaway browser profile, or restore the key afterwards.)

## 3. Arabic language option — API routes + tutor UI

| Change | File:line | Before | After |
|---|---|---|---|
| Language validation | `src/lib/ai.ts:424,432-434` | `LANG_NAME` had en/roman/ur only; routes used a 3-language allow-list. | `LANG_NAME.ar = "Arabic (العربية)"`; `TUTOR_LANGS = ["en","roman","ur","ar"]`, `TutorLang` type, `normalizeTutorLang()` (unknown → `"en"`). `langInstruction` already derives from `LANG_NAME`, so `lang="ar"` yields "Answer in Arabic (العربية)." in the generation prompt; library excerpts unchanged. |
| Routes | `src/app/api/tutor/route.ts:33`, `src/app/api/explain/route.ts:19`, `src/app/api/plan/route.ts:18` | `["en","roman","ur"].includes(body.lang) ? body.lang : "en"`. | All three call `normalizeTutorLang(body.lang)` — they share `generateTutorAnswer`, so explain and plan accept `ar` too. No stale 3-language allow-list remains. |
| Tutor UI | `src/app/tutor/page.tsx:23-31,58-68,103,149,181-194` | No per-tutor language choice; tutor followed the site language. | Labelled `<select id="tutor-lang">` above the chat log with English / Roman Urdu / اردو / العربية (Arabic). `tutorLang` state (`string | null`; null = follow site language = previous behaviour), persisted via `safeWrite` under `etea_tutor_lang_next`, loaded via `safeRead` on mount. Both POST bodies (tutor + explain) send `lang: effectiveTutorLang`. Other languages work exactly as before. Site-wide toggle untouched. |

**Tests:** `scripts/test-tutor-lang.mjs` — **30/30 PASS** (new suite, `npm run test:lang`). Proves: `normalizeTutorLang` accepts all four, rejects garbage/undefined/null/number/`AR`/padded input → `en`; a stub impl capturing the prompt proves `lang="ar"` puts "Answer in Arabic (العربية)." in the prompt while excerpts and question stay; ur/roman/en instructions unchanged; unknown lang passed straight to the chain falls back to English (two-layer defence); all three routes validate through the helper; tutor page wiring (option, persistence key, both POST bodies, site toggle untouched).

**Verify live after deploy (REQUIRED — no keys locally):** open `/tutor`, pick العربية, ask a question in Arabic or English, confirm the answer comes back in Arabic. Also confirm the other three options still answer in their languages and that the choice persists across reloads. The node suite proves the instruction reaches the model; only a live call proves the model's reply language.

## Regression verification (local)

- `npm run build` **PASS** — 21 routes (same as Tier 1).
- `npx tsc --noEmit` **clean**. TS strict NOT enabled (`"strict": false` in tsconfig.json — Tier 3 work, untouched).
- Suites: scoring **39/39**, reviews **37/37**, retrieval **28/28**, fallback-chain **24/24**, flashcards **29/29**, QA **52/52**, timeouts **43/43** (new), storage **35/35** (new), tutor-lang **30/30** (new). Total 277 checks, 0 failures.
- Local prod server (`next start`, port 3107): `/`, `/library`, `/mock`, `/practice`, `/tutor`, `/review`, `/analysis`, `/flashcards`, `/plan` all HTTP 200. Home shows 645 MCQs. Tutor page HTML contains the العربية option. `GET /api/tutor/health`: overall "down", all three providers `not_configured` (expected — no keys locally), coldStart flag present, NEW model ids reported (gemini-3.6-flash, openai/gpt-oss-120b, google/gemma-4-31b-it:free). POST `/api/tutor`, `/api/explain`, `/api/plan` with `lang=ar` and with garbage lang: honest 503 "Live AI is not configured yet" in <60 ms — no hang, no crash. Server stopped afterwards; no stray process.
- **Honest limits:** no live provider calls (no keys locally); no real-browser click-through — the Analysis warning UI and the tutor language selector are code-inspected + node-tested only. Live Arabic answering, the Analysis quarantine banner, and retry/deadline behaviour against real providers need post-deploy live checks (see per-item sections above).

## Files changed (local only, no deploy)

- `src/lib/ai.ts` — timeouts/retries/deadline, Arabic language, retry logging.
- `src/lib/tracking.ts` — quarantine + safe read/write/remove + warnings.
- `src/app/api/tutor/route.ts`, `src/app/api/explain/route.ts`, `src/app/api/plan/route.ts` — `normalizeTutorLang`.
- `src/app/tutor/page.tsx` — Arabic option, persistence, POST bodies.
- `src/app/analysis/page.tsx` — storage warning UI.
- `src/lib/i18n.tsx`, `src/app/practice/page.tsx` — safe read/write consistency.
- `scripts/test-timeouts.mjs`, `scripts/test-storage.mjs`, `scripts/test-tutor-lang.mjs` (new), `package.json` (three new test scripts).
- `VERIFY-p1-tier2.md` (this file), `CHANGELOG.md` (Tier 2 section appended).

## Expected live behaviour after deploy

- Tutor answers arrive within the 15 s overall bound; a slow provider is aborted at 8 s and retried once only for transient errors; runtime logs show `tutor_provider_attempt` lines with `attempt`/`retry` markers.
- `/analysis` shows no storage warning in normal use; a corrupt stored value quarantines instead of vanishing, with a download option.
- `/tutor` offers العربية; picking it makes the tutor answer in Arabic; the choice persists; other languages unchanged.
