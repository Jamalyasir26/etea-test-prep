# Stage 1 P1 Tier 1 — Verification Report (2026-11-12, local only, NOT deployed)

Scope: P1 Tier 1 only — Groq model fix, OpenRouter quota fix, cold-start
timeout fix, plus the P0.1 /review attribution follow-up. No Tier 2/3/4
work, no deploy, no GitHub/Vercel change, no env-var change, no key
material anywhere (no keys exist in this environment; live provider calls
were impossible locally and were NOT attempted).
Backup: `~/workspace/etea-prep-next-backup-pre-p1t1/` (FLAT copy of the
repo contents, diff-verified identical to the pre-Tier-1 tree, and verified
to contain NO nested `etea-prep-next` directory — the P0 backup nesting
mistake was not repeated).

## 1. Groq model fix — `llama-3.3-70b-versatile` is dead

### Research (read, not guessed from memory)
- Groq's own deprecation page, https://console.groq.com/docs/deprecations
  (crawled 2026-11-12): "`llama-3.3-70b-versatile` | 08/16/26 |
  `openai/gpt-oss-120b` or `qwen/qwen3.6-27b`" — Groq emailed users on
  17 June 2026, shutdown 16 Aug 2026, "applies to free and developer-tier
  usage; enterprise customers with a committed-spend contract are not
  affected." (The qwen3.6 alternative was itself deprecated 14 Sep 2026
  in favour of qwen3.8-27b, so it is not a stable pick.)
- Groq's own models page, https://console.groq.com/docs/models (crawled
  2026-11-12): `llama-3.3-70b-versatile` is listed "Enterprise / Contact
  Sales"; `openai/gpt-oss-120b` is a Production model, 500 tok/s, 131,072
  context, $0.15 in / $0.60 out per 1M tokens, Developer-plan limits
  250K TPM / 1K RPM. `openai/gpt-oss-20b` is the smaller sibling
  (1000 tok/s, $0.075/$0.30).
- Groq free-plan guide (localai.co.kr, updated 2026-10-30): GPT-OSS
  models on the Free Plan share 30 RPM / 1K RPD / 8K TPM / 200K TPD.
  It also warns: "GPT-OSS also spends the response budget on reasoning,
  so if the final text is empty, shorten the request or raise
  `max_completion_tokens` and try again."
- Groq model page, https://console.groq.com/docs/model/openai/gpt-oss-120b:
  temperature 0–2 supported; max output 65,536 tokens.

### What changed (file:line)
- `src/lib/ai.ts` — `GROQ_MODEL` (:~19): `"llama-3.3-70b-versatile"` →
  `"openai/gpt-oss-120b"`, with a comment citing the deprecation page,
  the shutdown date, and the free-plan limits.
- `src/lib/ai.ts` — `probeGroq` (`max_tokens`): 5 → 128, with a comment.
  GPT-OSS is a reasoning model: it spends the output-token budget on
  reasoning before the visible reply, so the old 5-token probe budget
  (fine for Llama) would come back empty and the probe would report a
  false "Empty response" error. 128 leaves room for a short reasoning
  trace + "OK". Answer path unchanged (temperature 0.3, max_tokens 1200;
  temperature 0–2 is supported, and 1200 leaves room for reasoning +
  a short tutor answer).
- No other Groq code changed: same SDK call, same order, same response
  contract.

### Before / after
- Before: every Groq call 404s `model_not_found` ("does not exist or
  you do not have access"); health reports Groq error; if Gemini ever
  fails, the tutor has only OpenRouter left.
- After: Groq calls `openai/gpt-oss-120b`, Groq's own recommended
  replacement for the dead model.

### Risk noted, not hidden
GPT-OSS is pay-per-token on Groq ($0.15/$0.60 per 1M). The owner's Groq
key was created on a free account; if that account has no usable balance,
live calls may fail with HTTP 402. That failure is NOT hidden: the
classifier already maps 402 → `payment` (unit-tested in the new suite),
so the live health probe will report `errorClass: "payment"` plainly
instead of a generic failure. No paid tier was enabled and no billing
decision was made — that stays the owner's call.

### Live verification after deploy
`GET /api/tutor/health` → groq: `status: "ok"`, `model:
"openai/gpt-oss-120b"`, latency ~1–3 s. If it reports `payment`, the
Groq account needs a billing decision from the owner. If it reports
`model_not_found` again, the model id itself is wrong and must be
re-checked against Groq's models page.

## 2. OpenRouter quota fix — alternative free model

### Research (read from the authoritative source, not a blog list)
- OpenRouter's own public models API, fetched directly on 2026-11-12
  (`curl https://openrouter.ai/api/v1/models`, saved to /tmp/or-models.json):
  466 models total, **13 free** (ids ending `:free`, all pricing $0/$0).
  The old model `google/gemma-4-26b-a4b-it:free` is STILL on the free
  list (262K context) — it was not removed; its upstream provider
  rate-limited it (HTTP 429) on two consecutive live health runs.
  `google/gemma-4-31b-it:free` is also on the same list ($0/$0, 262K
  context). Other free ids on the list include
  `nvidia/nemotron-3-ultra-550b-a55b:free`,
  `nvidia/nemotron-3.5-lightning:free`, `liquid/lfm-3-1.7b:free`,
  `baidu/ernie-5.5-flash-preview:free`.
- Free-tier limits (OpenRouter docs, via byoklist 2026-11-11): accounts
  with under $10 lifetime purchases are capped at 20 RPM / 50 RPD
  across all keys; a one-time ≥ $10 purchase lifts it to 1,000 RPD
  (owner's decision, not taken here).

### What changed (file:line)
- `src/lib/ai.ts` — `OPENROUTER_MODEL` (:~33): `"google/gemma-4-26b-a4b-it:free"`
  → `"google/gemma-4-31b-it:free"`, with a comment recording the
  verification (API list, date, pricing) and the fallback plan.
- No other OpenRouter code changed: same fetch call, same headers, same
  response contract.

### Before / after
- Before: OpenRouter 429 "temporarily rate-limited upstream" on the
  26b model; health reports OpenRouter error/quota.
- After: OpenRouter calls the 31b sibling — same Gemma 4 family, same
  $0 price, but a separate upstream capacity pool.

### Choice rationale (why 31b, not the `openrouter/free` router)
The `openrouter/free` router auto-picks whichever free model has
capacity, which would also dodge the 429 — but it is non-deterministic
(the backend model varies per call) and the health probe should report
one deterministic model so a failure has a name. The 31b sibling keeps
the probe meaningful. If 31b also 429s live, the router is the documented
next step (Tier 2 follow-up, not adopted now).

### Live verification after deploy
`GET /api/tutor/health` → openrouter: `status: "ok"`, `model:
"google/gemma-4-31b-it:free"`. If it reports `quota` (429) again, the
Gemma upstream pool is throttled as a family and the router option
should be taken next.

## 3. Cold-start timeout fix — 15 s bound + honest reporting, NO cron

### Investigation (the REAL constraint, checked first)
- The old probe bound was 10 s per provider. The first (cold) health
  call timed out Gemini at exactly 10,002 ms; warm calls answer in
  ~1.6–2 s. So the bound — not the provider — was the failure.
- Vercel's OFFICIAL Functions limits, https://vercel.com/docs/functions/limits
  (last updated 2026-08-24, crawled 2026-11-12): "Maximum duration |
  Hobby: **300s default and maximum**. Pro and Enterprise: 300s default,
  800s maximum." The "10 s Hobby timeout" repeated in third-party blogs
  is the OLD pre-Fluid-compute limit and is outdated. This route already
  sets `maxDuration = 30`, and the three probes run in parallel — so a
  15 s probe bound finishes in ~15 s worst case: inside the route's 30 s
  budget, and inside the Hobby 300 s budget by 20x. A 15 s probe inside a
  10 s function limit would NOT have been a fix; on the real 300 s limit
  it is.
- Warm-up cron: REJECTED after checking the constraint. Vercel's own
  cron docs, https://vercel.com/docs/cron-jobs/usage-and-pricing (last
  updated 2026-07-15): "Hobby accounts are limited to cron jobs that run
  **once per day**. Cron expressions that would run more frequently will
  fail during deployment." A serverless instance stays warm only minutes
  after an invocation, so a once-daily ping cannot keep the function warm
  for an on-demand health check — it would burn a cron slot and fix
  nothing. No `vercel.json`, no cron route, no `CRON_SECRET` was added.

### What changed (file:line)
- `src/lib/ai.ts` — new `PROBE_TIMEOUT_MS = 15000` constant (single
  source of truth) + `TIMEOUT_HINT` string; the three hardcoded `10000`
  bounds (probeGemini `withTimeout`, probeGroq `withTimeout`,
  probeOpenRouter `AbortSignal.timeout`) now use it. Comment cites the
  Vercel docs and the no-cron reasoning.
- `src/lib/ai.ts` — `ProviderHealth` gains optional `timeoutHint`; each
  probe's catch sets it when `errorClass === "timeout"`.
- `src/app/api/tutor/health/route.ts` — module-level `instanceWarmed`
  flag; the response now includes `coldStart: boolean` (true on an
  instance's first invocation) and, when cold, extends the note with
  "This call ran on a cold instance — if a provider shows a timeout
  here, wait a few seconds and retry once; it usually answers warm."
  `instanceWarmed` is module state: it survives warm invocations on the
  same instance and resets on a fresh instance — a best-effort honest
  signal, documented as such in the code comment. The `overall` verdict
  logic is unchanged (a timeout is still an error for that call); only
  the explanation is honest now.

### Before / after
- Before: cold health call → Gemini `error/timeout` at 10,002 ms,
  overall `"down"` — reads as "the tutor is dead" when it is only cold.
- After: cold health call → 15 s bound (cold Gemini usually answers
  inside it), and if it still times out the response says
  `coldStart: true` + `timeoutHint: "…retry once…"`.

### Live verification after deploy
First `GET /api/tutor/health` after deploy: `coldStart: true`,
`durationMs` under ~15,000, Gemini `ok` (warm runs were ~2 s). A second
call shortly after: `coldStart: false`. If Gemini still shows `timeout`
on the first call, the response now carries `timeoutHint` and the owner
retries once instead of reading it as a dead provider.

## 4. P0.1 follow-up — /review attribution fix

### The bug (live evidence from the P1T0 deploy)
`/review` showed the 14 bank-verified items as "· unreviewed" while
ISL-001 (which has a localStorage record) showed "by owner ·
11/12/2026, 3:01:56 AM". Status, counts and Trusted Mode were correct;
only the attribution line was wrong.

### Root cause
`src/app/review/page.tsx` (~line 214-215) read ONLY the localStorage
overrides map (`const rec = reviews[q.id]`) for the attribution slot.
The 14 items are verified at BANK level (bank JSON carries
reviewedBy/reviewedAt since the P1T0 deploy), so they have no
localStorage record on a fresh device.

### What changed (file:line)
- `src/lib/data.ts` — new `reviewAttribution(q, override)` helper:
  the local decision wins; otherwise fall back to the bank item's
  `reviewedBy`/`reviewedAt`; nulls when neither source has one.
- `src/app/review/page.tsx` — imports `reviewAttribution` and renders
  `by`/`at` from it instead of `rec` directly (2 lines changed).
  No change to status/counts/Trusted Mode logic.

### Before / after (verified, not just inspected)
- Before: bank-verified items render "· unreviewed".
- After: node test proves all 15 real verified items render
  `by: "owner"` + their timestamp from bank fields; override still wins
  when present; draft items still render nulls. Local prod server:
  prerendered /review HTML shows 25 items with exactly one "by owner"
  (ISL-001 — the only verified item among the first 25 of zam1+zam2)
  and the rest "unreviewed", which is exactly correct for that page.

## 5. Fallback-chain test seam (no production behaviour change)

### What changed (file:line)
- `src/lib/ai.ts` — `generateTutorAnswer` gained an optional 4th
  parameter `impls: TutorProviderImpls` (default = the real provider
  calls) plus the exported `TutorProviderImpls` type. Production callers
  (the tutor route) never pass it. The chain logic itself is untouched:
  same order, same first-error preservation, same NO_KEY fall-through.
- NO live kill-switch was added anywhere, per the owner's question:
  the health probe already tests each provider independently, so a
  health run showing Groq `ok` IS the per-provider proof. Disabling
  Gemini live to test a fallback is unnecessary and was not built.
- `scripts/test-fallback-chain.mjs` (new) — compiles the REAL ai.ts to
  CommonJS in /tmp with tsc (same pattern as test-retrieval.mjs) and
  tests the compiled code with stubbed impls: no live keys, no network.
- `package.json` — `test:fallback` script added.

### Tests — `node scripts/test-fallback-chain.mjs`: 24/24 PASS (exit 0)
Chain order: Gemini-only success (only Gemini called); Gemini fails →
Groq answers (OpenRouter never called); Gemini+Groq fail → OpenRouter
answers last; all fail → all three attempted in order and the final
message is Gemini's (first provider's, mapped by classifyGeminiError —
an invalid-key Gemini error keeps its invalid-key message); Groq
unconfigured → skipped entirely. Model constants: Groq
`openai/gpt-oss-120b`, OpenRouter `google/gemma-4-31b-it:free` and
`:free`-suffixed, Gemini unchanged, probe bound 15000, timeout hint
present, 404 → model_not_found, 402 → payment. Attribution: override
wins, bank fallback works, draft → nulls, all 15 real items render
owner attribution.
- One test assertion was corrected during the run (recorded, not
  hidden): the first version expected the raw stub error text
  ("Gemini first error") to survive as the final message. The real code
  maps a plain provider error to its user-facing message via
  classifyGeminiError — that is the intended behaviour (first error's
  CLASS preserved, text mapped), so the test now asserts the mapped
  Gemini message and the invalid-key preservation instead.

## Full verification (all run after the final file state)
- `npm run build` — PASS (21/21 pages).
- `npx tsc --noEmit` — clean (TS strict NOT enabled — that is Tier 3).
- `node scripts/test-scoring.mjs` — 39/39 PASS.
- `node scripts/test-reviews.mjs` — 37/37 PASS.
- `node scripts/test-retrieval.mjs` — 28/28 PASS.
- `node scripts/test-fallback-chain.mjs` — 24/24 PASS (new).
- `node scripts/test-flashcards.mjs` — 29/29 PASS (unchanged).
- `npm run qa` — 52/52 PASS (was 51/51 — the P1T0 QA update added the
  trusted-count check for the 15 owner-reviewed items).
- Local prod server (`next start`, port 3101): home + /library /mock
  /practice /tutor /review /analysis /flashcards all HTTP 200; home
  shows "645 MCQs"; GET /api/tutor/health call 1 → `coldStart: true`,
  call 2 → `coldStart: false` (flag flips correctly on the same
  instance); all three providers `not_configured` locally (expected —
  no keys in this environment) with the NEW model ids reported
  (gemini-3.6-flash, openai/gpt-oss-120b, google/gemma-4-31b-it:free).

## Regression check
Code-inspected + local prod server (no real-browser access in this
session, stated honestly): the answer path is unchanged except the two
model constants and the injectable impls default; the health route only
adds response fields; /review only changes the attribution line. No
existing feature was removed or renamed. Home counts, library, mock,
practice, tutor, /review, analysis, flashcards all serve 200 locally.

## Blockers / open items (for the owner / next stage)
1. **Live provider confirmation needs the deploy.** Groq `ok` /
   OpenRouter `ok` / cold-start behaviour can only be confirmed live
   with the real keys via GET /api/tutor/health. If Groq reports
   `payment` (402), the Groq account needs a billing decision from the
   owner. If OpenRouter reports `quota` (429) again, take the
   `openrouter/free` router next.
2. **No real-browser click-through** (no browser access in this
   session): the /review attribution render was verified via the
   prerendered HTML + the node test, not a live click.
3. Tier 2 items untouched (timeouts/retries in the answer path,
   storage corruption safety, Arabic lang option). Tier 3/4 untouched.

## Files changed (vs backup-pre-p1t1; diff-verified)
New: `scripts/test-fallback-chain.mjs`.
Changed: `src/lib/ai.ts`, `src/app/api/tutor/health/route.ts`,
`src/lib/data.ts`, `src/app/review/page.tsx`, `package.json`,
`VERIFY-p1-tier1.md` (this report), `CHANGELOG.md` (Tier 1 section).
