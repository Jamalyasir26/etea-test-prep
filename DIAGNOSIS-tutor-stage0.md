# Stage 0 — Tutor Diagnosis (ETEA Prep)

**Date:** 2026-11-12
**Scope:** `~/workspace/etea-prep-next/` only. Local work; the deployed site was used read-only as an evaluation target.
**Status:** Diagnosis complete + SDK migration done locally. **NOT deployed.** No GitHub/Vercel/Pakhtunkhwa Insider changes.

---

## 0. Headline: root cause found (proven by Google's own documentation)

**The Gemini model the tutor calls — `gemini-2.0-flash` — was shut down by Google on 1 June 2026.**

- Source: https://ai.google.dev/gemini-api/docs/deprecations — "`gemini-2.0-flash`, released 5 Feb 2025, **shutdown 1 June 2026**, recommended replacement `gemini-3.6-flash`." The models page lists it as "Gemini 2.0 Flash (Shut down)".
- Consequence: every Gemini call from the live tutor gets a 404 "model not found". That error does **not** match the old code's invalid-key patterns (`API_KEY_INVALID|API key not valid|401|403`) or quota patterns, so `classifyGeminiError()` collapsed it to the generic **"Gemini could not answer right now. Please try again in a moment."** (HTTP 502) — exactly what the owner saw on 2026-11-12 ~00:27 PKT and in all 7 live probes below.
- Why it stayed hidden: the old code kept only the first error, discarded Groq/OpenRouter failure reasons, and logged nothing anywhere — so there was no evidence pointing at the model. The key was suspected instead, but the key was never the problem (see §3).
- Fix applied locally (Stage 0, step 5): model re-pinned to **`gemini-3.6-flash`** — Google's own recommended replacement for `gemini-2.0-flash` (Stable badge, released 21 July 2026, no shutdown date announced) — and the SDK migrated from deprecated `@google/generative-ai` 0.24.1 (sunset 30 Nov 2025) to **`@google/genai` 3.2.0** (latest 3.x; requires Node ≥ 22 — `engines: node >=22` added to package.json).

**What this does and does not prove:** the dead model fully explains the *Gemini* failure and the generic message. It does **not** by itself prove Groq/OpenRouter are healthy — their errors were discarded by the old code, and their live status is still unknown. The new per-provider logging + health endpoint (step 2) will reveal their live status on the first deploy. If Groq/OpenRouter keys are also bad, the tutor will still work via Gemini after this fix, and the logs will say so plainly.

---

## 1. What was built in Stage 0 (local only, not deployed)

1. **Per-provider error logging** (`src/lib/ai.ts`): every provider attempt logs one JSON line to stdout (captured by Vercel runtime logs): provider, model, durationMs, ok, and on failure an error class + a truncated (max 200 chars), secret-scrubbed error message. Scrubbing redacts anything shaped like a key (`AIza…`, `AQ.Ab8…`, `gsk_…`, `sk-or-v1-…`, `Bearer …`, `?key=…`) before logging. Verified: 0 key material in server logs, responses, repo files, or the production bundle (grep evidence in VERIFY-stage0.md).
2. **Error classifier** (`classifyProviderError`): maps thrown errors to stable classes — `invalid_key`, `quota`, `model_not_found`, `timeout`, `network`, `empty_response`, `payment`, `not_configured`, `http_<status>`, `unknown`. Message tokens are checked **before** the numeric status, because some errors wrap an upstream status (e.g. our own `AiError` carries status 502 while its message reports a provider 401). Unit-tested 11/11 (see VERIFY-stage0.md).
3. **Health-check endpoint** (`GET /api/tutor/health`, new route `src/app/api/tutor/health/route.ts`): probes each configured provider's **responsiveness** with one tiny generation (10 s bound each, run in parallel) and returns per-provider `{configured, status: ok|error|not_configured, latencyMs, model, errorClass, errorMessage}` + an overall verdict (`ok|degraded|down`). No key material in the response. `GET /api/tutor` now also points at it (`health: "/api/tutor/health"`).
4. **No behaviour change in the production answer path** except logging: no new timeouts/retries were added to `generateTutorAnswer` in this stage (per the owner's sequence — diagnosis first). Timeouts/retries remain recommended follow-up work (see §6).

---

## 2. Evaluation set — results

### 2a. Local eval (local prod server, placeholder/invalid keys only — never real keys)

| Case | Setup | Result |
|---|---|---|
| L-C1 `GET /api/tutor` | placeholder keys | 200, `{live:true, gemini:true, groq:true, openrouter:true}` — presence only, as before |
| L-C2 `GET /api/tutor/health` | placeholder keys | 200, `overall:"down"` — gemini `invalid_key` (353–812 ms), groq `network` (1,239–1,543 ms), openrouter `invalid_key` (714–987 ms). No key material in the response |
| L-C3 `POST /api/tutor` "What is scaffolding in pedagogy?" (en) | placeholder keys | 502, clean invalid-key message; server log shows all 3 attempts with correct classes (gemini invalid_key, groq network, openrouter invalid_key) |
| L-D1 invalid model names (temp edit: `gemini-9.9-fake-model`, `fake-org/fake-model-xyz:free`) | placeholder keys | **Masking found:** both providers still reported `invalid_key`, not `model_not_found` — Google/OpenRouter check the key *before* the model, so a bad key hides a bad model. The `model_not_found` class is implemented and unit-tested (11/11), but it can only be observed live with a *valid* key. Temp edits reverted; models restored and rebuilt |
| Unit tests (`/tmp/unit-classify2.cjs`, compiled from the real `ai.ts`) | synthetic errors | **11/11 classify cases pass**; `scrubSecrets` test: 4 redactions, 0 leaks |

### 2b. Live eval (deployed endpoint `https://etea-test-prep.vercel.app/api/tutor`, 7 POSTs, ~15 s apart, within the 100/day + 10/min limit)

| ID | Lang | Question | In-library? | Result |
|---|---|---|---|---|
| V-L1 | en | What is scaffolding in pedagogy? | Yes (note: "Scaffolding and the Zone of Proximal Development") | 502, generic "Gemini could not answer right now", 19,669 ms |
| V-L2 | ur | اسکیفولڈنگ کیا ہے اور یہ تدریس میں کیسے مدد کرتی ہے؟ | Yes | 502, same generic message, 1,283 ms |
| V-L3 | roman | Ikhfa kya hota hai aur Noon Sakinah ke rules kya hain? | Yes (note: "Noon Sakinah and Tanween — Four Rules") | 502, same, 1,392 ms |
| V-L4 | ar | ما هو الفاعل في النحو؟ | Yes (note: "Verbal Sentence — Fi'l, Fa'il, Maf'ul") | 502, same, 1,410 ms |
| V-L5 | en | Explain Bloom's taxonomy levels | Yes (note: "Bloom's Taxonomy — Levels of Learning") | 502, same, 1,009 ms |
| V-L6 | en | What is the capital of Australia? | **No — out of scope** | 502, same, 771 ms |
| V-L7 | ar | ما هي عاصمة أستراليا؟ | **No — out of scope** | 502, same, 1,574 ms |

**Live verdict: 0/7 answered. The live tutor answers nothing in any language, in-library or out-of-scope.** Because the endpoint fails before any answer is generated, the out-of-scope honesty check ("say plainly it is not in the library") and the RAG relevance check could not be observed live — they remain untested until a provider answers. Note: the API route only accepts `lang` en/roman/ur — Arabic questions are coerced to `en` (a real product gap: no Arabic language option).

**V-L1 took 19.7 s vs ~1 s for the other six.** Most likely a cold start (first request after idle loads the function + 590-item bank) — but a slow first provider call cannot be excluded from outside. Not a timeout: all 7 returned a JSON 502, so the function completed inside the platform budget.

### 2c. What the live results prove

- The failure is **fast** (~1 s for 6/7 probes): all three providers fail quickly, like auth/404 errors — not hangs or timeouts. Consistent with the dead-model 404 for Gemini.
- The generic message (not invalid-key, not quota) matches a 404 model error exactly: the old classifier had no 404 branch.
- The live probes cannot distinguish the Groq/OpenRouter causes — their errors were discarded by the old code. That is precisely what the new logging fixes.

---

## 3. Per-provider findings

### Gemini — root cause: dead model (proven). Key format is NOT the problem.
- `gemini-2.0-flash` shut down 1 June 2026 (Google docs, §0). Every call 404s → generic message.
- The saved key is the real Propertank026 "ETEA Prep Tutor" key in `AQ.Ab8…` format. That format **is** Google's current auth-key format (since 28 May 2026). Locally, the new SDK with a fake key gets a proper `400 API_KEY_INVALID` response — i.e. the SDK transport works and Google validates the key normally; nothing about the `AQ.Ab8` shape is rejected. The key's validity with the *real* value can only be confirmed by a live call after deploy (the health endpoint will report `invalid_key` vs `ok`).
- The old SDK (`@google/generative-ai` 0.24.1) is deprecated (sunset 30 Nov 2025) and used `response.text()` (method); the new SDK (`@google/genai` 3.2.0) uses `response.text` (property). Migration verified locally (see §5).

### Groq — live status UNKNOWN; local failure is a sandbox artifact, not evidence
- Locally the groq-sdk throws `APIConnectionError: "Connection error."` caused by `FetchError: ... write EPROTO ... wrong version number`. Root cause in this VM: `groq-sdk` 0.32.0 depends on **`node-fetch` 2.6.7**, which ignores the sandbox's egress proxy env vars (`HTTP_PROXY`/`HTTPS_PROXY`, `NODE_USE_ENV_PROXY=1`) and tries a direct TLS connection that the sandbox network breaks. Proof: plain Node `fetch` (undici, proxy-aware) to `https://api.groq.com/openai/v1/models` returns a proper **401 `{"error":{"message":"Invalid API Key","code":"invalid_api_key"}}`** — the API is reachable and behaves correctly.
- **On Vercel there is no egress proxy, so this artifact does not apply there.** The live Groq key/model status is genuinely unknown and will be answered by `GET /api/tutor/health` after the next deploy. Do not conclude from the local test that Groq is broken live.

### OpenRouter — live status UNKNOWN; local behaviour is correct for a bad key
- Locally (raw `fetch`, proxy-aware) a fake key returns **401 `{"error":{"message":"User not found.","code":401}}`**, correctly classified `invalid_key`. The free model id `google/gemma-4-26b-a4b-it:free` was verified against OpenRouter's model list on 2026-11-11; free-model ids churn, so re-check the list if the health probe reports `model_not_found` live. Live key validity unknown until the health endpoint is deployed.

### Rate limiting / quota — ruled out for this incident
- Single user, first tests of the day; a 429 would have surfaced the quota message, not the generic one. (Side note: the in-memory buckets are per serverless instance, not global, and failed calls still consume quota because the counter increments before the call — a pre-existing flaw, not this incident's cause.)

---

## 4. Secondary findings (from the eval)

1. **Classifier bug found and fixed during the eval:** the first version checked the numeric `status` before the message, so our own `AiError` (status 502 wrapping a provider 401) was logged as `http_502`, and bare `401` in a message was missed. Fixed: message tokens first (including bare 401/403 tokens and "invalid key"), then status. Re-verified 11/11 + live log lines.
2. **Model errors are masked by auth errors** (§2a L-D1): with an invalid key, a bad model name still reports `invalid_key`. So the local eval cannot prove a model id is live — only the docs + a live call with the real key can.
3. **No Arabic language option:** the tutor route coerces unknown `lang` values to `en`; Arabic questions are answered (when working) under the English instruction. V2's multilingual requirement should add `ar`.
4. **No timeouts/retries anywhere in the answer path** (unchanged in this stage, per the owner's sequence). The V-L1 19.7 s probe shows a slow first call is possible; a hung provider call can still burn the whole function budget. Recommended follow-up, not part of this diagnosis.
5. **Tutor page copy is now stale in a new way:** it says "the primary Gemini key status is unverified" — after the fix is deployed and the health probe passes, that line should be updated to the real status. Not changed in this stage (diagnosis + migration only).

---

## 5. Migration performed (local only, not deployed)

- `@google/generative-ai` 0.24.1 → **`@google/genai` 3.2.0** (latest 3.x; `npm install @google/genai@3.2.0`, `npm uninstall @google/generative-ai`; package-lock regenerated; zero references to the old SDK remain in `src/` or `package.json`).
- `GEMINI_MODEL`: `gemini-2.0-flash` → **`gemini-3.6-flash`** (Google's recommended replacement; Stable; released 21 Jul 2026; no shutdown announced). Source: ai.google.dev/gemini-api/docs/deprecations + /docs/models, both crawled 2026-11-12.
- `package.json`: added `"engines": {"node": ">=22"}` (the new SDK requires Node ≥ 22; local Node is 24.22.1; Vercel's runtime Node version is unverified — the first build after deploy will show it in the build log).
- Groq (`llama-3.3-70b-versatile`) and OpenRouter (`google/gemma-4-26b-a4b-it:free`) paths untouched; same sequential order, same response contract (`{text, provider}`), same rate limits.
- Re-verified after migration: `npm run build` PASS, `npx tsc --noEmit` clean; local health + tutor POST with placeholder keys behave identically-or-better (Gemini now reports the new SDK's full `API_KEY_INVALID` JSON, classified `invalid_key`; Groq `network` artifact unchanged; OpenRouter `invalid_key` unchanged); unit tests 11/11; 0 key material anywhere (grep evidence in VERIFY-stage0.md).
- **What the migration does NOT prove yet:** whether the real key works with the new model — that needs one live call after deploy. If the live health probe reports Gemini `ok`, the root cause is confirmed fixed. If it reports `invalid_key`, the key (not the model) needs attention next.

---

## 6. What still needs a deploy to confirm (not part of this stage)

1. Deploy Stage 0 (separate owner approval) → run `GET /api/tutor/health` live → per-provider live status with real keys.
2. One live tutor question after deploy → confirms Gemini answers via `gemini-3.6-flash` (root-cause fix confirmed) or reveals the next failure with an exact error class in Vercel runtime logs.
3. Vercel runtime logs for the new `tutor_provider_attempt` lines (only exist after deploy).
4. Vercel build log: Node version used (must be ≥ 22 for `@google/genai` 3.2.0; `engines` pins it).
5. Re-run the 7-question live eval set after deploy (in-library × 4 languages, out-of-scope × 2) to check answers, out-of-scope honesty, and RAG relevance.
6. Follow-up work (not in Stage 0): per-call timeouts + bounded retry in the answer path; honest fallback surfacing in the tutor UI (which provider answered/failed); Arabic `lang` option; tutor-page copy update once health is confirmed.

---

## 7. Files changed (local only)

- `src/lib/ai.ts` — logging (`scrubSecrets`, `classifyProviderError`, `timedCall`, `logAttempt`), `probeProviders` + `ProviderHealth`, Gemini path migrated to `@google/genai` 3.2.0, `GEMINI_MODEL` → `gemini-3.6-flash`, classifier message-first fix.
- `src/app/api/tutor/health/route.ts` — new health-check endpoint.
- `src/app/api/tutor/route.ts` — GET response adds `health: "/api/tutor/health"` pointer.
- `package.json` / `package-lock.json` — `@google/genai` ^3.2.0 in, `@google/generative-ai` out, `engines.node >= 22`.
- Backup: `~/workspace/etea-prep-next-backup-pre-stage0/` (62 files, verified identical to pre-Stage 0 source).
- Reports: `DIAGNOSIS-tutor-stage0.md` (this file), `VERIFY-stage0.md`, `CHANGELOG.md` (Stage 0 section appended).

**STOP — no production deploy, no GitHub push, no Vercel change. Awaiting the owner's deploy approval for Stage 0.**
