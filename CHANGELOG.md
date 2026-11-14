# Changelog — ETEA Prep (Phase 2)

Phase 2 changes to the Next.js app, assembled from the three workers' entries plus the verifier's one-line fix. No deploy is recorded here; this is a code changelog only.

## Data worker

1. `src/data/banks/pedagogy.json` — PED-009: `correctIndex` 2 → **1**. Stored answer was "Abstract reasoning"; correct is **"Egocentrism"** (index 1). Reason: audit Phase 1 finding — stored answer contradicted its own explanation.
2. All 14 bank files — added `"reviewStatus": "draft"`, `"reviewedBy": null`, `"reviewedAt": null` to every item (additive only). Reason: review labelling for trusted gating; nothing is reviewed yet.
3. `src/data/banks/socialstudies.json` (new) — 30 items SS-001..SS-030 mapped to the ETEA 453 Social Studies block, AI-drafted, `verified: false`, `reviewStatus: draft`. Reason: Phase 1 audit — no Social Studies bank existed (Pak Studies was used instead).
4. `src/data/banks/gk.json` — all 30 items rewritten in place (IDs GKN-001..GKN-030 kept) from generic world-capitals/organisations to syllabus-mapped GK (Pakistan Studies + Islamiat). Reason: audit — GK was generic, not syllabus-mapped.
5. `src/data/banks/drawing.json` (new, DRW-001..010) + `src/data/banks/pe.json` (new, DRW-011..020) — split from `drawing_pe.json` (file left on disk, unregistered). Reason: DM and PET were sharing one combined 20-item bank.
6. `src/data/content.json` — DM `drawing_pe:20` → `drawing:20`; PET `drawing_pe:20` → `pe:20`; Social Studies slots `pakstudies` → `socialstudies` (Version B mocks); added ZamungKor 891 corrigendum link; `patterns.B.confidence` softened (2025-paper match now labelled UNVERIFIED); 100-min timers labelled practice timers in mock notes; Qari 20+10 split documented as app heuristic. Reason: truthful composition, provenance and labelling per audit.
7. `scripts/qa-540.mjs` (new) + `package.json` "qa" script; `QA-540.md` (new). Reason: structural validation of every bank record (47 checks).
8. Near-duplicate fix — reworded 9 new-item stems that collided verbatim with pre-existing items (same fact, new wording). Reason: QA duplicate-stem check.

## Client worker

1. `src/lib/tracking.ts` — flashcards keyed by stable id `fc-` + hash(front|back), with legacy `card-N` migration; pure `buildSessionQueue` / `gradeCard`; Again = 0 days (due today, same-session relearning). Reason: index-based ids silently reassigned state on content edits; frozen queue stops mid-session re-sorting.
2. `src/lib/tracking.ts` — `computeStats` MCQ-only (flash attempts reported separately as `flashAttempts` / `flashReviewed` / `flashRecalled`). Reason: self-rated flash attempts were inflating MCQ accuracy.
3. `src/lib/tracking.ts` — Attempt gains optional `itemRecords` + `retryCount`; `KEY_VERSION = "v3"`. Reason: per-item audit trail; first-pass score is stamped against an answer-key version.
4. `src/lib/tracking.ts` — issues move to versioned `etea_issues_v2` with reason / proposedCorrection / source; legacy `etea_issues_next` imported on first load. Reason: structured, private issues inbox.
5. `src/lib/tracking.ts` — QuizSession v2 under `etea_session_next_v2`. Reason: resumable sessions with first-pass, retries, absolute deadline and submitted flag.
6. `src/lib/tracking.ts` — export v4 adds issues, preferences, in-progress sessions, `lastDay`; import validates per-record shape. Reason: full backup/restore of personal state.
7. `src/components/QuizRunner.tsx` — immutable `firstPass` + `retries` list; score = first-pass; mock picked option uses neutral "picked" style (green only for actually-correct after reveal in practice). Reason: Back-button re-picks must not change the score; a pick must never look like a correct answer.
8. `src/components/QuizRunner.tsx` — state saved per answer; absolute `deadlineTs`; auto-resume + Restart control; persisted `submitted` flag (idempotent submit); new props `trustedOnly` / `sessionScope` / `questionSeed`. Reason: reload-proof sessions and timer; timeout and manual submit must record exactly one attempt.
9. `src/components/QuizRunner.tsx` — issue form (reason / proposed correction / source); copy "Saved privately on this device only — nothing was sent." Reason: honest private reporting.
10. `src/app/flashcards/page.tsx` — frozen queue, due-only default + opt-in cram, "simple spaced-review schedule" label, intervals on grade buttons. Reason: honest scheduling language; no SM-2 claim.
11. `src/app/mock/[id]/page.tsx` — `?mode=trusted|provisional`, stable seed, trusted note with counts. Reason: trusted mode with an honestly stated shortfall.
12. `src/app/practice/page.tsx` — subject / round / seed persisted, reload restores same set. Reason: a reload must not silently shuffle a new set.
13. `src/app/analysis/page.tsx` — clickable attempts with per-item tables, flash stat card, MCQ-only labels. Reason: first-pass evidence per attempt; no mixed flash/MCQ accuracy.
14. `src/app/issues/page.tsx` (new) + Nav Issues link. Reason: the private issues inbox needs a home.

## Labels worker

1. `src/lib/data.ts` — Question gains optional `reviewStatus` / `reviewedBy` / `reviewedAt`; registry adds `drawing` / `pe` / `socialstudies`, removes `drawing_pe` (file stays on disk); `isTrusted` + `trustedOnlyCount(MockDef)` exported; `buildMockQuestions` gains `opts {trustedOnly}` (never fills shortfall); `drawing_pe` compatibility alias (draws 10+10 from drawing+pe) retained for safety. Reason: trusted gating in the data layer.
2. Mock list — Trusted/Provisional toggle (default Provisional), per-mock reviewed counts, Trusted disabled at zero with explanation. Reason: no silent use of unreviewed items.
3. Footer copy — "never appears in mocks" → "mocks are provisional practice built from unreviewed AI-generated items; Trusted mode uses reviewed items only." Reason: the old wording was false — AI content does enter provisional mocks.
4. Tutor copy — status line now says keys configured but live responsiveness not health-checked. Reason: key presence is not a health check.
5. Home — stale "not yet tested with a real key" → "live, answered via fallback; primary Gemini key status is unverified." Reason: the tutor had answered live via a fallback provider.
6. Privacy — `robots: {index:false}` metadata, `X-Robots-Tag: noindex` header, `robots.ts` disallows all; footer states noindex/robots is NOT access control. Reason: personal-use site asks not to be indexed, without pretending that is access control.

## Verifier (final verification, 2026-11-11)

- `src/app/page.tsx:14` — "70 cards, SM-2 spaced repetition" → **"70 cards, simple spaced-review schedule"**. Reason: one-line copy fix to match the flashcards page; the only content edit made during verification. Full results: `VERIFY-phase2.md`.

## Known issue found during verification (not fixed here)
- DM/PET mocks build **90 of 100** questions: comps ask `drawing:20` / `pe:20` but each split bank holds only 10 items, and mock building samples without replacement. The list still advertises "100 Q". See `VERIFY-phase2.md` §2(d) / §5. Owner decision needed before this is presented as complete.

## Post-verification fix (2026-11-11) — DM/PET 90/100 defect

Fix for the one real defect found in Phase 2 verification
(`VERIFY-phase2.md` §2d): DM/PET mocks built 90 of 100 questions because the
comps ask `drawing:20` / `pe:20` but each split bank held only 10 items.
No deploy; local changes only.

1. `src/data/banks/drawing.json` — +10 drawing-only items DRW-021..DRW-030
   (cool colours, complementary colours, horizon line, tints, shades, still
   life, portrait, landscape, texture, proportion). Reason: DM mock needs
   20 drawing items to build 100 questions without repeats.
2. `src/data/banks/pe.json` — +10 PE/sports-only items PE-001..PE-010
   (basketball, volleyball, badminton, 100 m sprint, flexibility, cooling
   down, kabaddi, shot put, heart rate, sportsmanship). Reason: PET mock
   needs 20 PE items. All 20 new items AI-drafted, `verified: false`,
   `reviewStatus: "draft"`, `sourceNote: "AI-drafted; unreviewed"` — not
   presented as verified.
3. `src/data/banks/drawing.json` (DRW-001..010) + `src/data/banks/pe.json`
   (DRW-011..020) + legacy `src/data/banks/drawing_pe.json` — `subject` /
   `subjectKey` relabelled from `Drawing/PE` / `drawing_pe` to `Drawing` /
   `drawing` and `Physical Education` / `pe`. IDs and question/option/
   explanation content unchanged. Reason: separation must rest on the
   item's own labels, not only the bank file + ID.
4. `src/data/content.json` — `counts.total` 570 → 590; `counts.bySubject`
   Drawing 10 → 20, Physical Education 10 → 20; `bySubject` indexes
   extended with the 20 new IDs. Reason: totals must match the banks.
5. `src/lib/data.ts` — header comment 540 → 590 MCQs; stale comments
   claiming `drawing_pe` is "still used by the DM/PET mock comps"
   corrected (no live comp uses it; the alias stays only as a safety net).
   Reason: comments must match the comps.
6. `src/app/layout.tsx` (metadata description 540 → 590 MCQs) +
   `src/app/mock/page.tsx` ("540-question bank" → "590-question bank").
   Home body already reads `COUNTS.total` (590). Reason: stale copy.
7. `scripts/qa-540.mjs` — expected counts 570 → 590 (Drawing 20, PE 20);
   ID checks updated (drawing DRW-001..030, pe DRW-011..020 + PE-001..010);
   legacy check now compares against the original 20 items; two new checks
   for the added items; new §9 built-length checks (every mock builds its
   advertised total; dm-B/pet-B composition). Filename kept (historical).
   Reason: QA must catch a too-small bank directly, not only comp text.
8. Docs — `QA-540.md` updated to the 51/51 re-run (new counts + added
   items); `VERIFY-phase2.md` §2(d) acceptance row changed to PASS with
   evidence and §8 post-verification fix section appended. Reason: the
   verification record must reflect the fixed state.
9. Verification after the fix: `node scripts/qa-540.mjs` 51/51 PASS (exit 0);
   `node scripts/test-flashcards.mjs` 29/29 PASS; `npx tsc --noEmit` clean;
   `npm run build` PASS (20/20 static pages); node harness replicating
   `buildMockQuestions`: dm-B 100 (20 drawing, 0 PE), pet-B 100 (20 PE,
   0 drawing), all 20 mocks at advertised totals; `next start` home page
   serves "590 MCQs" (HTTP 200).

# Stage 0 — Tutor diagnosis + SDK migration (2026-11-12, local only, NOT deployed)

1. `src/lib/ai.ts` — per-provider error logging (Stage 0): `scrubSecrets` (redacts AIza…/AQ.Ab8…/gsk_…/sk-or-v1-…/Bearer/key= before any log), `classifyProviderError` (stable classes: invalid_key/quota/model_not_found/timeout/network/empty_response/payment/not_configured/http_<status>/unknown; message tokens checked before numeric status), `timedCall` wrapper logging one JSON line per attempt (provider, model, durationMs, ok, errorClass, truncated ≤200-char message), `probeProviders` + `ProviderHealth` (one tiny generation per provider, 10 s bound each, parallel). Reason: the tutor failed silently — only the first error was kept, fallback reasons discarded, zero logging.
2. `src/lib/ai.ts` — **root cause + fix:** `GEMINI_MODEL` `gemini-2.0-flash` → **`gemini-3.6-flash`**. Reason: Google shut down `gemini-2.0-flash` on 1 June 2026 (ai.google.dev/gemini-api/docs/deprecations); every Gemini call 404'd and collapsed to the generic message. `gemini-3.6-flash` is Google's recommended replacement (Stable, released 21 Jul 2026, no shutdown announced).
3. `src/lib/ai.ts` — Gemini SDK migrated `@google/generative-ai` 0.24.1 → **`@google/genai` 3.2.0** (`GoogleGenAI`, `ai.models.generateContent`, `response.text` property). Reason: old SDK deprecated (sunset 30 Nov 2025). Groq/OpenRouter paths untouched; same order, same response contract.
4. `src/app/api/tutor/health/route.ts` (new) — `GET /api/tutor/health` probes each configured provider's responsiveness (not just key presence) and returns per-provider status/latency/errorClass + overall verdict; no key material in the response; `maxDuration = 30`.
5. `src/app/api/tutor/route.ts` — GET response adds `health: "/api/tutor/health"` pointer. Reason: the old GET reported key presence only.
6. `package.json` / `package-lock.json` — `@google/genai` ^3.2.0 in, `@google/generative-ai` out; added `"engines": {"node": ">=22"}` (new SDK requirement; local Node 24.22.1).
7. Classifier fix found during the eval: status was checked before the message, misclassifying a wrapped provider 401 as `http_502`; bare `401` in a message was missed. Fixed to message-first. Reason: the first local eval run exposed it; re-verified 11/11 unit cases + live log lines.
8. Reports: `DIAGNOSIS-tutor-stage0.md` (root cause + full eval), `VERIFY-stage0.md` (tests + results). Backup: `~/workspace/etea-prep-next-backup-pre-stage0/`.

# Stage 1 P0 — Negative marking, verification queue, concept-extraction content (2026-11-12, local only, NOT deployed)

Backup: `~/workspace/etea-prep-next-backup-pre-stage1p0/`. Full evidence: `VERIFY-stage1-p0.md`.

## P0.1 — Negative marking + configurable scoring
1. `src/lib/scoring.ts` (new) — `DEFAULT_SCORING` (zero penalty, policyStatus "unknown": ETEA has published no negative-marking policy), `KPPSC_UNVERIFIED_SCORING` (0.25, policyStatus "unverified-assumption"), `computeExamScore` (raw accuracy and exam score separate; floor at 0; unanswered = 0), `resolveScoring` (per-run override > mock config > default), `scoringLabel`, `isValidScoringConfig`.
2. `src/lib/data.ts` — `MockDef.scoring?` (optional per-mock config).
3. `src/data/content.json` — `sst-kppsc` carries the 0.25 unverified config; all other mocks use the default.
4. `src/components/QuizRunner.tsx` — results show Raw accuracy AND Exam score separately with the policy note; exam score stored on the attempt (`examScore`/`examTotal`/`scoringPolicy`); per-question source line is now dynamic (was hardcoded "AI-generated — not verified").
5. `src/app/mock/page.tsx` — per-mock "Scoring for this run" select (default / zero / 0.25), carried in `?penalty=`; `src/app/mock/[id]/page.tsx` resolves it and passes it to QuizRunner.
6. Tests: `scripts/test-scoring.mjs` 39/39 PASS (zero-penalty default, 0.25 penalty, unanswered, raw-vs-exam separation, floor at zero, resolve precedence).

## P0.2 — Verification queue (mock-first, TT + Qari)
1. `src/lib/tracking.ts` — review store `etea_reviews_next_v1` (`loadReviews`/`setReview`/`getReview`, vocabulary draft/needs-review/disputed/owner-reviewed/approved); **export v5** adds `reviews` + `annotations` (v4 restores unchanged; v6+ rejected); owner annotations store + tutor opt-in (default off).
2. `src/lib/data.ts` — `ReviewOverrides`, `effectiveReviewStatus`, `isTrusted(q, overrides?)`, `trustedOnlyCount(mock, overrides?)`, `buildMockQuestions(..., {trustedOnly, overrides})`. Trusted Mode fills ONLY from owner-reviewed/approved items.
3. `src/app/review/page.tsx` (new) — dashboard: filters by mock (zam1+zam2 default), post (TT/Qari first), status, structural result; actions Verify/Approve/Needs review/Disputed/Reset to draft; zam1+zam2 progress header.
4. `scripts/structural-check-mocks.mjs` (new) — zam1+zam2 (200 items): **186 pass, 14 needs-review (soft), 0 problems**. No item marked verified by the agent; all stay draft until the owner verifies them. Writes `src/data/structural-checks.json` (consumed by /review).
5. `src/components/QuizRunner.tsx` — results show a red "Provisional — not verified" badge unless the run was trusted-only or every item is verified.
6. Tests: `scripts/test-reviews.mjs` 37/37 PASS (round-trip, v5/v4 restore, future-version rejection, annotations); trusted-mode harness 11/11 PASS (5 reviewed → trusted build returns exactly those 5).

## P0.3 — Concept-extraction content (fills the Stage 0 Ikhfa / Al-Fa'il gaps)
1. `src/data/content.json` — 15 new notes (Tajweed 6, Arabic 5, Islamiyat 4); counts 590 → **645 MCQs**, 95 → **110 notes**.
2. `src/data/banks/tajweed.json` TAJ-031..050 (20), `arabic.json` ARB-061..080 (20), `islamiyat.json` ISL-091..105 (15) — 55 new MCQs, all draft, unverified, one correct answer, explanation names the answer, source "Original content — concept-extracted from <source name>". Sources named only (Riyad al-Quran, Riwaq Al Quran, Quranica, Hekma Academy, Al-Wafa Institute, Al-Muqaddimah al-Ajurrumiyyah, Teachy.ai, IlmHub, Arabify, Wikipedia (Kutub al-Sittah), QuranicMA, Jibreel.app). No PDF downloaded/hosted, no lines copied, no Hadith/verse numbers invented. 4 duplicate stems found and reworded; final duplicate count 0.
3. `src/lib/data.ts` — `Note.source?` (provenance label).
4. `src/app/library/page.tsx` — source label per note; per-note owner annotation field (private, local only) + opt-in "Include my note annotations in tutor answers" (default OFF).
5. `src/app/tutor/page.tsx` + `src/app/api/tutor/route.ts` + `src/lib/ai.ts` — annotations are sent to the tutor ONLY when the opt-in is on (validated, capped); `contextBlock` labels them as the owner's own notes, not verified library facts.
6. Tests: `scripts/test-retrieval.mjs` 28/28 PASS — V-L3 Ikhfa note + new TAJ MCQ retrieved; V-L4 Al-Fa'il note + Fa'il MCQ retrieved (was zero before); Qalqalah/Maf'ul/Madd/Seerat retrieved; V-L1 regression ok; V-L6 out-of-scope sanity ok.
7. `scripts/qa-540.mjs` counts updated 590 → 645: **51/51 PASS**.

## Verification (final state)
- `npm run build` PASS (21/21 pages incl. new `/review`); `npx tsc --noEmit` clean (TS strict NOT enabled — P1).
- Tests: scoring 39/39, reviews 37/37, retrieval 28/28, flashcards 29/29, structural 186/14/0, qa 51/51.
- Local prod server: home "645 MCQs · 110 notes · 70 flashcards · 19 post tracks · 20 mocks"; /review, /library, /mock, /practice, /tutor, /issues, /analysis, /flashcards all HTTP 200.
- NOT done here (honest): no real-browser click-through (code-inspected only); live tutor answers not re-tested (needs a live call after deploy); no item verified yet (owner's job on /review); Groq/OpenRouter/cold-start fixes are P1.

# Stage 1 P0.1 — Owner verification record: 15 items verified at bank level (2026-11-12, local only, NOT deployed)

Backup: `~/workspace/etea-prep-next-backup-pre-p1t0/` (flat copy, diff-verified). Full evidence: `VERIFY-p1t0-verified15.md`.

The owner personally reviewed and approved the 14 "needs-review" items from the structural check (`src/data/structural-checks.json`: 186 pass / 14 needs-review / 0 problems) and asked for them to be marked verified, plus ISL-001 (already verified on the /review dashboard, which lived only in that browser's localStorage). Verification is now stored at BANK level so it shows on every device, not just one browser.

## The 15 items (reviewStatus "owner-reviewed", reviewedBy "owner")
- ISL-001 — reviewedAt "2026-11-11T22:01:56Z" (its /review dashboard timestamp, 03:01:56 AM PKT 2026-11-12).
- The 14 flags — reviewedAt "2026-11-11T22:23:00Z" (owner's approval in chat, ~03:23 PKT 2026-11-12): ENG-005, ENG-006, ENG-008, ENG-012, ENG-013, ENG-019, ENG-020, ENG-025, ENG-026, ISL-029, ISL-055, MAT-022, PAK-008, URD-001.
- Vocabulary note: there is no bare "verified" status. The dashboard's Verify action sets "owner-reviewed", and the UI's "verified" counter counts owner-reviewed + approved items — so "owner-reviewed" is the correct stored value for all 15. The legacy `verified: false` field on the items was left untouched (it is not read by the trusted logic).

## Files changed
1. `src/data/banks/english.json` — 9 items (ENG-005/006/008/012/013/019/020/025/026): reviewStatus draft → owner-reviewed, reviewedBy null → "owner", reviewedAt null → "2026-11-11T22:23:00Z".
2. `src/data/banks/islamiyat.json` — 3 items: ISL-001 (reviewedAt "2026-11-11T22:01:56Z"), ISL-029, ISL-055 (reviewedAt "2026-11-11T22:23:00Z").
3. `src/data/banks/maths.json` — MAT-022. `src/data/banks/pakstudies.json` — PAK-008. `src/data/banks/urdu.json` — URD-001 (same three-field change, "2026-11-11T22:23:00Z").
4. `scripts/qa-540.mjs` — the review-status check now asserts exactly these 15 items are owner-reviewed (by owner, with the exact timestamps above) and every other item is draft; new check: trusted-only count for ZamungKor Mock 1 + Mock 2 is 15.
5. No change needed in `src/lib/data.ts`: the Question type already allows optional `reviewedBy`/`reviewedAt`, and `isTrusted` already counts bank-level owner-reviewed as trusted; `effectiveReviewStatus` keeps letting a localStorage override win over the bank value.

## Verification (local)
- Trusted-build check (real compiled `src/lib/data.ts`, `/tmp/check-trusted15.mjs`): zam1 trusted-only = 9, zam2 trusted-only = 6, together exactly the 15 IDs, no duplicates; `trustedOnlyCount` sums to 15; override path still works both ways (draft override un-trusts, owner-reviewed override trusts); provisional zam1/zam2 builds still 100 each. 13/13 PASS.
- `npm run qa` 52/52 PASS (was 51/51 — the new trusted-count check added). `node scripts/test-reviews.mjs` 37/37, `test-scoring.mjs` 39/39, `test-retrieval.mjs` 28/28, `test-flashcards.mjs` 29/29. `npm run build` PASS (21/21 pages). `npx tsc --noEmit` clean.

## Expected live behaviour after deploy
- /review header reads "15 / 200 verified" for ZamungKor Mock 1 + 2 (was 1/200 from the single browser's localStorage).
- Trusted Mode now fills from 15 items (was 0 on a fresh device). A trusted-only ZamungKor Mock 1 returns 9 questions, Mock 2 returns 6 — the shortfall is never filled with unreviewed items.
- Full mocks (200–300 verified items) still need the owner to keep verifying on /review during P1; the agent's job remains structural checks + the dashboard only.

# Stage 1 P1 Tier 1 — Fallback resilience (2026-11-12, local only, NOT deployed)

Backup: `~/workspace/etea-prep-next-backup-pre-p1t1/` (FLAT copy, diff-verified — no nested directory). Full evidence: `VERIFY-p1-tier1.md`.

## 1. Groq model fix — `llama-3.3-70b-versatile` was dead
- Groq shut it down for free/developer accounts on 16 Aug 2026; it is now Enterprise-only (Groq docs: console.groq.com/docs/deprecations — Groq's own recommended replacement is `openai/gpt-oss-120b`). Re-pinned `GROQ_MODEL` to `openai/gpt-oss-120b` (Production model, Developer plan, 500 tok/s, 131K context; free-plan limits 30 RPM / 1K RPD / 8K TPM).
- GPT-OSS is a reasoning model: it spends the output budget on reasoning before the visible reply, so the health probe's `max_tokens: 5` would come back empty — raised to 128 in `probeGroq` only. Answer path unchanged (temperature 0.3, max_tokens 1200; temperature 0–2 is supported).
- Risk noted, not hidden: GPT-OSS is pay-per-token on Groq ($0.15/$0.60 per 1M). If the owner's key has no usable balance, live calls fail with 402, which the classifier already reports as `payment` (unit-tested) — the health probe will show it plainly after deploy.

## 2. OpenRouter quota fix — alternative free model
- The old `google/gemma-4-26b-a4b-it:free` is STILL on OpenRouter's free list (verified against the public https://openrouter.ai/api/v1/models on 2026-11-12: 466 models, 13 free, pricing $0/$0), but its upstream provider rate-limited it (HTTP 429) on two consecutive live health runs. Switched `OPENROUTER_MODEL` to the sibling `google/gemma-4-31b-it:free` — same Gemma 4 family, also $0/$0 on the same list, 262K context, separate upstream pool. No paid model enabled (owner's decision). If 31b also 429s live, the documented next option is the `openrouter/free` router (auto-picks a free model with capacity).

## 3. Cold-start timeout fix — 15 s probe bound + honest reporting, NO cron
- Root cause was the probe's own 10 s bound, not the platform: Vercel's official Functions limits (vercel.com/docs/functions/limits, updated 2026-08-24) give Hobby 300 s default AND maximum duration with Fluid compute — the "10 s Hobby timeout" in old blogs is outdated. The route sets maxDuration = 30 and probes run in parallel, so a 15 s bound finishes in ~15 s worst case — inside both budgets. `PROBE_TIMEOUT_MS = 15000` (single constant, all three probes).
- NO warm-up cron added, deliberately: Vercel's own cron docs (vercel.com/docs/cron-jobs/usage-and-pricing) limit Hobby crons to once per day, while a serverless instance stays warm only minutes after an invocation — a daily ping cannot keep the function warm for an on-demand health check. Instead the health response now reports `coldStart` (module-level flag: true on an instance's first invocation) and a `timeoutHint` on any provider that times out ("retry once — usually warm-up, not a dead provider").
- NO live Gemini kill-switch added: the health probe already tests each provider independently, so health showing Groq ok IS the per-provider proof.

## 4. P0.1 follow-up — /review attribution fix
- `src/lib/data.ts`: new `reviewAttribution(q, override)` — localStorage decision wins, else the bank JSON's reviewedBy/reviewedAt. `src/app/review/page.tsx` uses it. Before, the page read ONLY the localStorage map, so the 14 bank-verified items rendered "· unreviewed" while their status/counts/Trusted Mode were correct. Node test proves all 15 verified items now render owner attribution from bank fields.

## 5. Fallback-chain test seam
- `generateTutorAnswer` gained an optional 4th `impls` parameter (default = the real provider calls) so node tests can stub failures and prove the order Gemini → Groq → OpenRouter. Production callers never pass it; no behaviour change. New suite `scripts/test-fallback-chain.mjs` (24/24): chain order, first error preserved (mapped to its user-facing message), unconfigured providers skipped, model constants, 15 s bound, timeout hint, attribution fallback incl. all 15 real items. `package.json` gains `test:fallback`.

## Verification (local; no keys here, live confirmation after deploy)
- `npm run build` PASS (21/21 pages). `npx tsc --noEmit` clean (TS strict NOT enabled — Tier 3).
- Suites: test-scoring 39/39, test-reviews 37/37, test-retrieval 28/28, test-fallback-chain 24/24, test-flashcards 29/29, qa 52/52.
- Local prod server: home + /library /mock /practice /tutor /review /analysis /flashcards all HTTP 200; /review prerendered HTML shows 25 items with ISL-001 "by owner" (the only verified item in the first 25) and the rest "unreviewed"; GET /api/tutor/health call 1 returns coldStart: true, call 2 returns coldStart: false (flag flips correctly); all three providers not_configured locally (expected — no keys in this environment) with the NEW model ids reported.
- NOT done here (honest): no live provider calls (no keys locally); Groq ok / OpenRouter ok / cold-start behaviour can only be confirmed live after deploy via GET /api/tutor/health. No real-browser click-through (code-inspected + node-tested only).

## Expected live behaviour after deploy
- GET /api/tutor/health: groq `ok` with model `openai/gpt-oss-120b` (was model_not_found); openrouter `ok` with model `google/gemma-4-31b-it:free` (was quota/429) — or a new, specific error class if the replacement also fails (402 payment on Groq, 429 again on OpenRouter). First health call after deploy reports coldStart: true and a 15 s bound; a cold timeout shows timeoutHint instead of a bare "down" reading.
- /review: all 15 verified items show "by owner · <timestamp>" (was "unreviewed" for the 14 bank-verified ones).

## Stage 1 P1 Tier 2 — reliability + data safety (local, 2026-11-12; NOT deployed)

### 1. Provider timeouts + retries — `src/lib/ai.ts`
- New constants `PROVIDER_TIMEOUT_MS = 8000`, `ANSWER_DEADLINE_MS = 15000`, `MAX_PROVIDER_ATTEMPTS = 2`. New `isTransientErrorClass()` (transient: timeout, network, quota, http_5xx; never retried: invalid_key, model_not_found, payment, not_configured, unknown, empty_response, http_4xx), driven by the existing `classifyProviderError` classes.
- `ProviderCallOptions {signal?, attempt?}`; Gemini wires `abortSignal` into the generateContent config, Groq passes `{signal}` as the 2nd SDK arg, OpenRouter passes `signal` to fetch. New `DeadlineError extends AiError` (502) naming the deadline.
- `generateTutorAnswer` gained a 5th `bounds` param (test seam, defaults 8000/15000) and an internal `tryProvider` helper: per-attempt bound = `min(providerTimeoutMs, remainingMs())` via `AbortSignal.timeout` AND the `withTimeout` race; at most one retry, only for transient errors with time remaining; `NO_*_KEY` errors never retried; `DeadlineError` stops the chain. First-error preservation and final error mapping unchanged; fallback order Gemini → Groq → OpenRouter and the response contract unchanged. Health probe untouched.
- `timedCall` exported, accepts `{attempt, retry}`; `ProviderAttempt` gained `attempt?`/`retry?` — retries log as separate `tutor_provider_attempt` JSON lines with a retry marker. New suite `scripts/test-timeouts.mjs` (43/43). `package.json` gains `test:timeouts`.

### 2. Storage corruption safety — `src/lib/tracking.ts` + Analysis UI
- New quarantine store `etea_quarantine_next_v1`: malformed JSON is stored verbatim as `{key, raw, at}`, deduped by (key, raw); the original key is NEVER cleared. `loadQuarantine()` / `exportQuarantine()` (separate from the v5 backup shape) / `clearQuarantine()` (explicit user action only). A corrupt quarantine store preserves its own raw text as a record.
- Exported `safeRead` / `safeWrite` (boolean, catches QuotaExceededError/SecurityError/DOMException) / `safeRemove`; all tracking.ts callers migrated. In-memory `storageWarnings` deduped by (type, key, detail) per page load, `console.warn` + `getStorageWarnings()` / `clearStorageWarnings()`. `safeParse` rewritten to a key-based signature that quarantines on failure and never deletes.
- `src/app/analysis/page.tsx`: red warning alert above the stats grid (affected keys, write-failed nudge), "Download quarantined data" + confirm-gated "Dismiss and clear quarantined data"; "Your data" copy explains quarantine. `src/lib/i18n.tsx` and `src/app/practice/page.tsx` routed through safe read/write (consistency; no import cycle). Export stays v5; v4/v5 restore, v6+ rejected. New suite `scripts/test-storage.mjs` (35/35). `package.json` gains `test:storage`. (One real bug found by the suite and fixed: warning dedup ignored the detail, so a SecurityError after a QuotaExceededError on the same key was swallowed.)

### 3. Arabic language option — API routes + tutor UI
- `src/lib/ai.ts`: `LANG_NAME.ar = "Arabic (العربية)"`, `TUTOR_LANGS = ["en","roman","ur","ar"]`, `normalizeTutorLang()` (unknown → "en"); the generation prompt gains "Answer in Arabic (العربية)." for lang=ar, library excerpts unchanged.
- `src/app/api/tutor/route.ts`, `src/app/api/explain/route.ts`, `src/app/api/plan/route.ts`: all three validate via `normalizeTutorLang(body.lang)` (shared generation path — explain/plan accept ar too). `src/app/tutor/page.tsx`: labelled language `<select>` with an العربية option, persisted under `etea_tutor_lang_next` (null = follow site language = previous behaviour), sent as `lang` in both POST bodies. Site-wide toggle untouched. New suite `scripts/test-tutor-lang.mjs` (30/30). `package.json` gains `test:lang`.

### Verification (local; no keys here, live confirmation after deploy)
- `npm run build` PASS (21/21 routes). `npx tsc --noEmit` clean (TS strict NOT enabled — Tier 3).
- Suites: test-scoring 39/39, test-reviews 37/37, test-retrieval 28/28, test-fallback-chain 24/24, test-flashcards 29/29, qa 52/52, test-timeouts 43/43, test-storage 35/35, test-tutor-lang 30/30.
- Local prod server: home + /library /mock /practice /tutor /review /analysis /flashcards /plan all HTTP 200; home shows 645 MCQs; tutor HTML contains the العربية option; GET /api/tutor/health reports all providers not_configured (expected) with the new model ids; POST tutor/explain/plan with lang=ar and garbage lang return the honest 503 in <60 ms.
- NOT done here (honest): no live provider calls (no keys locally); no real-browser click-through — Analysis warning UI and tutor language selector are code-inspected + node-tested only. Live Arabic answering, the quarantine banner, and retry/deadline behaviour against real providers need post-deploy live checks.

### Expected live behaviour after deploy
- Tutor answers within the 15 s bound; slow providers aborted at 8 s and retried once only for transient errors; runtime logs show `attempt`/`retry` markers.
- /analysis shows no storage warning in normal use; corrupt stored values quarantine with a download option instead of vanishing.
- /tutor offers العربية; picking it makes the tutor answer in Arabic; the choice persists; other languages unchanged.

## Stage 1 P1 Tier 3 — security + code quality (local, 2026-11-12; NOT deployed)

### 1. AI API access restriction — new `src/lib/apiGuard.ts` + 4 routes
- New server-only guard module (no Next.js imports, node-testable): `isAllowedOrigin()` (production origin, Vercel preview deployments of this project, localhost/127.0.0.1), `isSameOriginRequest()` (Origin must be ours; else Referer must be ours; neither header → GET allowed, POST rejected — browsers always send Origin on POST fetches), `clientIpFromHeaders()`. Honest limitation documented in the module header and VERIFY-p1-tier3.md: Origin/Referer are spoofable by a determined curl caller, so this deters casual abuse/hot-linking but is NOT access control. No IP allowlist (owner uses a phone on a dynamic mobile IP — it would lock him out); no client-side token (no real security). A real tutor-only token needs a Vercel env var + UI entry = separate owner decision, documented only.
- All four API routes (`tutor` GET+POST, `explain`, `plan`, `health`) reject cross-origin requests with 403 before body parsing/validation/quota. Health also gains the shared rate limit (each probe is a real provider call). New suite `scripts/test-api-guard.mjs` (60/60). `package.json` gains `test:guard`.

### 2. Rate limiter fix — trusted header + validate-before-limit
- `clientIpFromHeaders()` prefers Vercel's `x-vercel-forwarded-for` (edge-set, not spoofable) over the client-supplied `x-forwarded-for` (fallback for local dev only, then `"local"`). All three route-local `clientIp()` helpers deleted; no direct `x-forwarded-for` read remains.
- Route order is now: same-origin check → parse + validate (400/404) → rate limit → generate, so invalid requests never consume quota. Limits unchanged (100/day + 10/min per IP, same 429 messages); `rateLimitOk` itself unchanged (comment documents the contract). Known limitation: buckets are in-memory per instance — a shared atomic limiter (Upstash Redis) needs owner-approved env setup, documented as a future option. Live-proven on the local server: 11 invalid POSTs → all 400, then 10 valid → all 503 (no keys), 11th valid → 429.

### 3. Vulnerable dependencies — Next.js 16.4.6
- `next` 15.5.29 → **16.4.6** (exact pin); `postcss` 8.4.31 → **8.5.23** (transitive via Next — the PostCSS chain fix); lockfile regenerated (changes are exactly the Next 16.4.6 tree + one new transitive dep). `lint` script removed — Next 16 dropped the `next lint` command (no ESLint config exists here). `tsconfig.json`/`next-env.d.ts` rewritten by Next 16's build (jsx react-jsx, new type references) and kept as generated. No code change needed for the major upgrade (no removed APIs used). `npm audit` could NOT run in the sandbox (registry audit endpoint 403 policy_denied, verified twice) — no audit count to report; version record above is the evidence.

### 4. Security headers — `next.config.mjs`
- Added: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`, `X-Frame-Options: DENY`, `Content-Security-Policy` (default-src 'self'; script/style 'self' 'unsafe-inline' — required by React inline styles + Next.js inline hydration scripts, documented as weakening CSP with nonce-based CSP as future work; img/font 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri/form-action 'self'; object-src 'none'). `X-Robots-Tag: noindex` kept. Verified on the local prod server: all six headers on page + API responses, all pages 200, no resource the site loads is blocked (same-origin fetches only, no images/fonts/CSS imports).

### 5. TypeScript strict mode — `tsconfig.json`
- `"strict": true`. Zero errors to fix — the codebase was already strict-clean; no `@ts-ignore`/`@ts-expect-error` added (grep-verified none exist). No `typescript.ignoreBuildErrors` escape hatch in next.config. Gate proven: a deliberate type-error probe fails `next build` (exit 1) and is caught by `npx tsc --noEmit` including strictNullChecks (TS18048); probe removed, final tsc clean.

### Verification (local; no keys here, live confirmation after deploy)
- `npm run build` PASS (21/21 routes). `npx tsc --noEmit` clean with `strict: true`.
- Suites: test-scoring 39/39, test-reviews 37/37, test-retrieval 28/28, test-fallback-chain 24/24, test-flashcards 29/29, qa 52/52, test-timeouts 43/43, test-storage 36/36, test-tutor-lang 30/30, test-api-guard 60/60 (new). Total 378 checks, 0 failures.
- Local prod server: 14 pages HTTP 200 with security headers active; home shows 645 MCQs; tutor page contains the العربية option; guard/limiter behaviour proven live by curl (403 cross-origin, 403 headerless POST, 503 same-origin no-keys, 400s consume no quota, 429 at 11th valid request, health GET 200 no-headers / 403 cross-origin).
- NOT done here (honest): no live provider calls (no keys locally); no real-browser click-through — CSP behaviour in a real browser needs a post-deploy check; `npm audit` blocked in sandbox; per-instance limiter + spoofable-Origin limitations documented, not solved.

### Expected live behaviour after deploy
- Tutor/explain/plan answer normally from the site; cross-origin POSTs get 403; invalid requests get 400/404 without consuming quota; 11th tutor request in a minute gets 429.
- Health shows per-provider status as before; direct browser opens still work; cross-origin health fetches get 403.
- All six security headers present on every response; no CSP console errors in the browser.
- Vercel build runs on Next 16.4.6 with strict type-checking enforced.

## Stage 1 P1 Tier 4 — UI/accessibility fixes B01–B05 (local, 2026-11-12; NOT deployed)

### 1. B01 — Tutor overflow at 360px + vacancy table
- `src/app/tutor/page.tsx` — both the ask-row and explain-row inputs get `flex: 1; min-width: 0` so they shrink inside their flex rows and the buttons stay on-screen; the explain output wraps long strings (`overflowWrap: break-word`).
- `src/app/globals.css` — `.card` and `.msg` gain `overflow-wrap: break-word` (long URLs wrap instead of overflowing); new `.table-scroll` class (`overflow-x: auto`, touch scrolling).
- `src/app/vacancies/page.tsx` — the 6-column table is wrapped in a keyboard-focusable scroll region (`role="region"`, `aria-label="Vacancy table"`, `tabIndex={0}`).
- `src/app/mock/page.tsx` — the mock mode button row gains `flexWrap: "wrap"` (same overflow class: the two long buttons overflowed at 360px).
- Honest limit: no real 360px render exists locally — the 360px layout is a post-deploy browser check. Scope note: the analysis/issues/QuizRunner tables are the same overflow class but were not in the Tier 4 list — future work, not done here.

### 2. B02 — 299px sticky mobile header → accessible hamburger menu
- `src/components/Nav.tsx` — native `<button type="button" className="nav-toggle">` with `aria-expanded`, `aria-controls="main-nav"`, `aria-label="Navigation menu"` (☰/✕); the menu closes on link click (delegated onClick + brand link) and on Escape (listener active only while open, returns focus to the toggle). All 14 links, the language selector and the theme toggle are unchanged.
- `src/app/globals.css` — `.nav-toggle { display: none; }` on desktop; inside `@media (max-width: 640px)` the toggle is shown (44px touch target, white outline on the teal bar) and `.nav` is hidden until `.open`, then a full-width vertical list with 44px links. Desktop layout is unchanged; the header's look is not redesigned.
- `src/app/globals.css` — `:focus-visible` outlines (teal / light teal on dark / white in the topbar) so keyboard focus is visible on the toggle and every control; mouse users see no change.

### 3. B03 — RTL counter reversal
- Every rendered count/fraction is isolated with an explicit `dir="ltr"` span: plan progress (the reported "0/63" bug), QuizRunner results score + raw accuracy + exam score + "Question X of Y" + mm:ss timer, mock list trusted count, mock runner note counts, review progress + "Showing X of Y" + "Show 25 more (N left)", flashcard session + recalled + card counters, and all six analysis fractions (stat cards, daily row, mock history, attempt score, attempt detail). `QuizRunner`'s `note` prop widened from `string` to `ReactNode` so the caller can pass the isolated spans (only mock/[id] passes a note). A sweep test proves no bare `{a}/{b}` fraction remains in any `.tsx`. Single numbers with units, dates, bare percentages and aria-labels were inspected and left unchanged (single LTR runs, cannot reorder).

### 4. B04 — Dark badge contrast
- `src/app/globals.css` — dark-mode overrides only: green badge `#4CC38A` now with `#06231A` text = **7.51:1** (was white, 2.22:1); red badge `#FF8A80` now with `#3D0A06` text = **7.39:1** (was white, 2.28:1 — a second failure found by the same audit and fixed the same way). All 10 badge pairs (5 variants × 2 themes) audited — the other 8 already passed (5.15:1–9.99:1) and are untouched. `--green`/`--red` variables unchanged (they feed non-text elements, out of scope).

### 5. B05 — Flashcard keyboard fix
- `src/app/flashcards/page.tsx` — the card surface is now a native `<button type="button" className="card flashcard">` (was a `div` with `role="button"` + `tabIndex` and no key handler — Enter/Space did nothing). It flips on Enter/Space when focused, with a visible focus outline. Deliberately NO aria-label: the card text itself is the button's accessible name, so screen readers hear the question/answer. The native "Flip card" button, grade buttons and frozen-queue logic are untouched.
- `src/app/globals.css` — `.flashcard` gains `color: var(--ink); width: 100%` (the global `button` rule sets white text, which would be invisible on the card background).

### Verification (local; no keys here, live confirmation after deploy)
- `npm run build` PASS (full 22-route table, same as Tier 3). `npx tsc --noEmit` clean with `strict: true`.
- Suites: test-scoring 39/39, test-reviews 37/37, test-retrieval 28/28, test-fallback-chain 24/24, test-timeouts 43/43, test-storage 36/36, test-tutor-lang 30/30, test-api-guard 60/60, test-flashcards 29/29, test-tier4 46/46 (new), qa 52/52. Total 424 checks, 0 failures.
- Local prod server: 14 pages HTTP 200; home shows 645 MCQs; served HTML contains the nav-toggle/main-nav, table-scroll wrapper, dir="ltr" spans and min-width:0; built CSS contains all new rules; production JS bundle contains the flashcard button and the nav toggle with ARIA attributes.
- NOT done here (honest): no real 360px browser render, no real-browser keyboard/Escape/Tab check, no visual screenshot — all are post-deploy browser checks listed in VERIFY-p1-tier4.md.

### Expected live behaviour after deploy
- At 360px the tutor rows, mock mode buttons and vacancy table fit/scroll without page overflow; the header is short with a working hamburger menu (click, link-click, Escape, Tab).
- In Urdu (RTL) mode every count/fraction reads in logical order; in dark mode the green/red badges are readable.
- Flashcards flip on Enter/Space when focused, with a visible outline; the Flip card button still works as before.

## Stage 1 P2 — provenance, backup versioning, B06 wording, B07 hydration, privacy disclosure, fonts (local, 2026-11-12; NOT deployed)

### 1. Provenance / concept IDs
- `src/lib/data.ts` — `Question` and `Note` gain optional `conceptId?`, `syllabusClause?`, `sourceKind?` (`SourceKind = "official" | "concept-extracted" | "proxy" | "partial"`); new `provenanceBadge()` helper (null when no sourceKind; per-kind label + detail + tone; concept-extracted names its source).
- `src/components/ProvenanceBadge.tsx` (new) — pure presentational badge, renders null without a sourceKind, SSR-safe.
- Badges wired into `src/app/library/page.tsx` (notes), `src/components/QuizRunner.tsx` (every question — practice + mocks), `src/app/review/page.tsx` (every card).
- Data: the 55 P0.3 MCQs + 15 P0.3 notes get `concept-extracted` provenance (conceptId + Pattern B (ESED-453) section clause); the 15 owner-reviewed MCQs get `proxy` provenance (PAK-008 honestly has no clause — ambiguous section). Everything else has no provenance fields and no badge; zero items are marked "official". Same-concept items share one conceptId (e.g. passive-voice ×4, qalqalah-letters ×3 + note, ISL-001 + ISL-091 surah-count). Bank diffs purely additive; formats preserved. No question/answer/explanation text changed. Full mapping in VERIFY-p1-p2.md.

### 2. Backup versioning
- `src/lib/tracking.ts` — `BACKUP_VERSION = 5`, `SUPPORTED_BACKUP_VERSIONS = [4, 5]`, pure `migrateBackupPayload()` (v5 identity; older versions gain empty `reviews`/`annotations` defaults, input never mutated), `validateBackupPayload()` (app marker + numeric version + attempts list; newer versions rejected). `importProgress()` is now validate → migrate → merge; the merge body, v5 shape, stored keys and merge semantics are unchanged. `exportProgress()` stamps the constant. Version policy documented in code.

### 3. B06 — wording alignment + live health indicator
- `src/components/TutorHealth.tsx` (new) — fetches GET /api/tutor/health once on mount (no polling — probes cost quota), 28 s timeout, manual Refresh; loading / loaded (per-provider status + model + latency + errorClass, cold-start note) / failed states, never crashes the page. Full variant on /tutor, one-line summary on home.
- `src/app/page.tsx` — stale "answered via fallback … key status is unverified" alert replaced with accurate wording + live summary. `src/app/tutor/page.tsx` — old key-presence status box + "responsiveness not health-checked" wording replaced by the live indicator; "On-device study assistant is gone" → present-tense wording. No historical claims remain in user-facing copy (grep-verified).

### 4. API privacy disclosure
- `src/app/tutor/page.tsx` (before the chat form) and `src/app/plan/page.tsx` (before the AI plan form): the request goes to Gemini, Groq or OpenRouter; don't share sensitive personal data; questions are not stored on the site (tutor).

### 5. B07 — hydration investigation + telemetry + fixes
- Root cause PROVEN: old `src/app/review/page.tsx` rendered `new Date(at).toLocaleString()` during SSR — UTC on the server vs the visitor's timezone in the browser (same instant: "11/11/2026, 10:23:00 PM" vs "11/12/2026, 3:23:00 AM" in PKT) = React text-content hydration mismatch. Latent second cause: `loadReviews()`/`loadAnnotations()` in state initializers on prerendered pages (empty on server, stored values on client).
- Fixes (mount-gated, local-time display preserved): `src/app/review/page.tsx` (reviews + timestamp), `src/app/mock/page.tsx` (reviews), `src/app/library/page.tsx` (annotations + opt-in). Ruled out with evidence: practice/mock/[id] seeds (client-rendered Suspense boundaries — built practice.html has zero quiz content), flashcards, LangProvider.
- `src/lib/telemetry.ts` (new) + `src/components/TelemetryListener.tsx` (new, mounted in layout) — route-bound, on-device-only client-error telemetry (window error/unhandledrejection + a guarded once-only console.error wrap so React #418/#425 hydration failures are captured); capped at 50, never throws, SSR-safe. Viewable + clearable in the new "Client errors" section on `src/app/issues/page.tsx`.

### 6. Font delivery
- `src/app/layout.tsx` — `next/font/google`: Noto Nastaliq Urdu (arabic subset, 400/600/700) + Noto Sans Arabic (arabic + latin, 400/500/600/700), `display: swap`, CSS variables on `<html>`. Fonts are build-time downloaded and served from the site's own origin (CSP `font-src 'self' data:`); no external font links anywhere.
- `src/app/globals.css` — body uses the Sans Arabic variable (+ fallbacks); headings use the Nastaliq variable falling through to Sans Arabic + system; Urdu-mode headings get `line-height: 2`.

### Verification (local; no keys here, live confirmation after deploy)
- `npm run build` PASS (22 routes, same table as Tier 3). `npx tsc --noEmit` clean with `strict: true`.
- Suites: qa 52/52, test-scoring 39/39, test-reviews 37/37, test-retrieval 28/28, test-fallback-chain 24/24, test-timeouts 43/43, test-storage 36/36, test-tutor-lang 30/30, test-api-guard 60/60, test-tier4 46/46, test-flashcards 29/29, test-provenance 33/33 (new), test-backup-versioning 33/33 (new), test-telemetry 28/28 (new), test-fonts 19/19 (new). Total 537 checks, 0 failures.
- Local prod server: 14 pages HTTP 200; home shows 645 MCQs + health loading state; woff2 served same-origin (31 @font-face rules, zero Google Fonts URLs in served HTML/CSS); provenance badges in served library/review HTML; telemetry section on /issues; privacy lines on /tutor + /plan; stale wording absent; review SSR payloads contain no rendered timestamps; health endpoint returns honest "down" with no keys.
- NOT done here (honest): no live provider calls (TutorHealth loaded state needs the post-deploy check); no real-browser render (Nastaliq visuals, timestamp pop-in, 360px checks); B07 confirmation is an empty telemetry list after deploy, not a proof in advance. Full evidence in VERIFY-p1-p2.md.

### Expected live behaviour after deploy
- Provenance badges visible in library / practice / review with source + pattern-section tooltips; backup export/import unchanged in behaviour.
- Home + tutor show the live per-provider health status; privacy lines visible before both AI forms.
- No console hydration errors on /review in a PKT browser; /issues shows an empty client-errors list.
- Headings render in Nastaliq (Urdu) with Latin falling back to Sans Arabic; body in Noto Sans Arabic; no external font requests.

# Localization Pass 1 — Urdu UI, RTL isolation, Sans-Arabic-only fonts, tri-language scaffold (2026-11-12, local only, NOT deployed)

Owner decisions (2026-11-12 ~11:10 PKT, from the owner's own mobile testing): fonts — ONLY Noto Sans Arabic, the earlier Nastaliq decision CANCELLED; RTL punctuation bug — English text inside RTL flow isolated; Urdu UI translation — every UI string via i18n.tsx; tri-language content structure — plan + scaffold only. NOTE: the P2 deploy (commit 9f29935, live 2026-11-12 ~11:28 PKT) includes Nastaliq — this correction removes it in the NEXT deploy. Full evidence in VERIFY-localization-pass1.md; content-translation plan in LOCALIZATION-PLAN.md.

### 1. Fonts — Nastaliq cancelled, Sans Arabic only
- `src/app/layout.tsx` — `Noto_Nastaliq_Urdu` removed entirely; only `Noto_Sans_Arabic` (arabic+latin subsets, weights 400–700, `display: swap`, `--font-sans-arabic`) via `next/font/google`, served from `/_next/static` (CSP `font-src 'self' data:`).
- `src/app/globals.css` — headings use the Sans Arabic variable; the Urdu `line-height: 2` rule was Nastaliq-specific and is DROPPED (Sans Arabic reads comfortably at the default heading line-height).
- Grep-verified: ZERO Nastaliq references remain in `src/` (the word appears only in this changelog and the Pass 1 report, explaining the cancellation).

### 2. RTL punctuation bug — isolation sweep (extends B03)
- Principle: identifiers/counts/codes → `dir="ltr"`; free-form mixed-script content (questions, options, explanations, notes, flashcards, chat, AI output) → `dir="auto"`; plain-text constructed messages → `lri()` (Unicode LRI/PDI via explicit `"\u2066"`/`"\u2069"` escapes — never raw characters; a raw typed isolate was once U+0085 NEL).
- Sweep covered ALL pages and components (tutor, QuizRunner, library, home, mock list/runner, plan, flashcards, analysis, review, issues, vacancies, tracks, topics, links, Nav, TutorHealth). Counters keep the "N of M" English format inside isolated spans in all languages.

### 3. Urdu UI translation (UI strings only — no content translated)
- `src/lib/i18n.tsx` — STRINGS expanded to 423 keys, every key with non-empty `en` + `ur` (test-enforced); `roman` for short chrome, falling back to English for long paragraphs per the documented rule (current language → English → key). New `tf(key, vars)`; missing values become `""`, never a raw `{name}`. Deliberate English exceptions documented in the file header (proper names, acronyms, ids, scoring policy notes, CORRECTIONS/PATTERN_BANNER, format examples).
- Tutor page translated completely (greeting via a `__GREETING__` sentinel rendered through `t()`, so it matches the current language); all other pages, QuizRunner, TutorHealth and the new `src/components/Footer.tsx` translated. Vacancies/tracks/tracks-[id]/links converted server→client (first render still English on server and client; no new hydration risk).
- `localizedScoringLabel()` (`src/lib/scoring.ts`), `gradeButtonLabel(..., lang)` (`src/lib/tracking.ts`, default keeps English), `provenanceBadge(..., lang)` Urdu variant (`src/lib/data.ts`; source names/clauses stay English, LRI/PDI-wrapped).

### 4. Tri-language scaffold (plan + scaffold only, zero translated content)
- Optional `ur`/`roman` fields on Question (question/options/explanation) and Note (title/body); `localizeQuestion`/`localizeNote` (per-field fallback, never mutate) + `hasTranslation` in `src/lib/data.ts`. Options fall back as a whole array unless lengths match exactly.
- ONE proof-of-concept render path: library note rendering via `localizeNote()`; storage keys/annotations stay on the original English title. No bank JSON changed; no machine translation. Phased plan (TT/Qari core first, religious translations through the owner review queue, never auto-approved) in LOCALIZATION-PLAN.md.

### Verification (local; no keys here, live confirmation after deploy)
- `npm run build` PASS (20 pages; `/tracks/[id]` now dynamic like `/mock/[id]`). `npx tsc --noEmit` clean with `strict: true`.
- Suites: qa 52/52, flashcards 29/29, scoring 39/39, reviews 37/37, retrieval 28/28, fallback-chain 24/24, timeouts 43/43, storage 36/36, tutor-lang 30/30, api-guard 60/60, tier4 46/46, provenance 33/33, backup-versioning 33/33, telemetry 28/28, fonts 21/21 (rewritten Sans-Arabic-only), i18n 40/40 (new), rtl 59/59 (new), trilanguage 28/28 (new). Total 666 checks, 0 failures.
- Local prod server: 16 routes HTTP 200; home shows 645 MCQs; served CSS has 0 Nastaliq refs, 27 Noto Sans Arabic @font-face rules, 40 local woff2 refs, 0 gstatic refs; health endpoint returns honest "down" with no keys.
- NOT done here (honest): visual RTL/font confirmation needs a real browser post-deploy (owner's phone); QuizRunner/flashcard tri-language wiring is a later phase per LOCALIZATION-PLAN.md.

## Stage 2 — FSRS spaced repetition + tutor bold fix (local, 2026-11-12; NOT deployed)

1. `package.json` + lockfile — added `ts-fsrs` 6.0.0 (FSRS-7, exact pin); `engines` bumped `>=22` → `>=24` (v6 requires Node >= 24; Vercel runs 26.x; local Node is 24.22.1, so the authorized v5.4.2 fallback was not needed). New scripts `test:fsrs`, `test:flashcards`, `test:markdown`.
2. `src/lib/fsrs.ts` (new) — cached async scheduler init, v6 card shape + strict guard, serialize/deserialize (Date objects mandatory — `review()` rejects string dates), fresh/legacy seed helpers, `reviewFsrsCard` / `previewFsrsGrades` wrappers, `formatFsrsInterval` (en/ur/roman). Defaults kept: learning steps 1m/10m, relearning 10m, fuzz off (previews equal applied intervals). One `unknown`-cast bridge for the library's duplicate card typings (TS2719), runtime-verified by tests.
3. `src/lib/tracking.ts` — flash state is now the FSRS shape. `convertFlashStateToFsrs` (pure, idempotent): legacy entries seed with due dates preserved exactly (midnight UTC), intervals soft-reset, `card-N` keys remapped, counts `{migrated, reset, kept}`. `runFlashMigration`: verbatim backup under `etea_flashcards_v5_backup` written once before any change; backup failure leaves stored state untouched for retry. `buildReviewQueue` (due earliest-first, then new cards, no cap; cram appends future-due last), `advanceReviewQueue` (Learning/Relearning append, Review does not), `gradeButtonLabel(grade, intervalLabel, lang)`, `countDueFlashcards`. Removed: `migrateFlashState`, `buildSessionQueue`, `gradeCard`, `nextDue`. Backup export v6: `BACKUP_VERSION = 6`, `SUPPORTED = [4,5,6]`, chained `migrateV4ToV5` → `migrateV5ToV6` (flash entries converted, dues kept); v7+ rejected. Import `./fsrs.ts` uses an explicit `.ts` extension (Node ESM type-stripping requirement) + `allowImportingTsExtensions` in `tsconfig.json`.
4. `src/app/flashcards/page.tsx` (rewritten) — scheduler awaited once on load; migration banner (dismissible, shows counts + backup-failure sentence); grade buttons show FSRS-computed intervals; card info line shows the FSRS state + next review. B05 preserved (native `<button>` card surface, Enter/Space flip, separate Flip button); B03 LTR counters preserved; session counting + `recordAttempt` unchanged.
5. `src/lib/i18n.tsx` — FSRS-7 title/intro, updated quick-flash + session-finished text, new keys `stateNew/stateLearning/stateReview/stateRelearning`, `fsrsStateLine`, `flashMigratedNotice`, `flashMigrationBackupFailed`, `cardsDueLabel`; `lastGrade` removed. Zero "simple ladder"/"simple spaced" wording left in `src/` (remaining "fixed-ladder" mentions are comments naming the legacy format).
6. `src/app/page.tsx` — "Cards due today" stat card (link to `/flashcards`), in-memory count only, 0 when none due.
7. Tutor bold fix — NEW `src/lib/boldText.ts` (`parseBoldSegments`, bold-only pairing rules) + NEW `src/components/BoldText.tsx` (React text nodes, XSS-safe by construction, no `dangerouslySetInnerHTML`). Applied to tutor chat bubbles + explain output (`src/app/tutor/page.tsx`) and AI plan output (`src/app/plan/page.tsx`).
8. Tests — NEW `scripts/test-fsrs.mjs` (90 checks: real transitions, steps, lapse, preview determinism, purity, deserialization, seed-drift guard, formatting, migration fixtures) and `scripts/test-markdown.mjs` (20 checks: pairing rules, XSS structure); `scripts/test-flashcards.mjs` rewritten (39 checks; every changed/deleted assertion documented in its header); backup-versioning / i18n / storage / reviews / rtl suites updated for v6 + the new grade-label signature.

### Verification (local; no keys here, live confirmation after deploy)
- `npm run build` PASS (20 routes). `npx tsc --noEmit` clean with `strict: true`.
- Suites: qa 52/52, fsrs 90/90, flashcards 39/39, markdown 20/20, scoring 39/39, reviews 37/37, retrieval 28/28, fallback-chain 24/24, timeouts 43/43, storage 38/38, tutor-lang 30/30, api-guard 60/60, tier4 46/46, provenance 33/33, backup-versioning 44/44, telemetry 28/28, fonts 21/21, i18n 40/40, rtl 59/59, trilanguage 28/28. Total 799 checks, 0 failures.
- Local prod server: 14 page routes HTTP 200; home shows 645 MCQs; flashcards HTML carries the FSRS-7 title; security headers present; ts-fsrs in the client bundle; no API-key names in client chunks; health endpoint honestly "down" with no keys.
- NOT done here (honest): browser behaviors (grade flow, interval labels, in-session re-queue, migration banner on old stored state, dashboard due-count number, 360px layout) need a real browser post-deploy — see VERIFY-stage2-fsrs.md §9.
- Full report: `VERIFY-stage2-fsrs.md`.

## Stage 3 foundation — Tailwind v4 + shadcn/ui setup + AppShell (local only, 2026-11-12; NOT deployed, NOT merged)

Built in the SEPARATE folder `~/workspace/etea-prep-next-stage3/` under the owner's strict isolation rule: zero Stage 3 files in the Stage 2 + Localization deploy bundle, `~/workspace/etea-prep-next/` read-only throughout. Merge + deploy only after Stage 2 passes live verification. No content/data/bank/API changes; no animations, charts, or Command Center content (next batches).

1. `package.json` + lockfile — added `tailwindcss` 4.3.5 + `@tailwindcss/postcss` 4.3.5 (devDependencies), `class-variance-authority` 0.7.1, `clsx` 2.1.1, `tailwind-merge` 3.7.0, `lucide-react` 1.72.0, `motion` 14.12.0, `recharts` 3.10.1 (dependencies). No peer conflicts. New script `test:stage3`.
2. `postcss.config.mjs` (new) — `@tailwindcss/postcss` plugin; picked up automatically by Next.js 16, no `next.config.mjs` change.
3. `src/app/globals.css` (restructured) — Tailwind WITHOUT preflight: `@import "tailwindcss/theme.css" layer(theme) prefix(tw)` + `@import "tailwindcss/utilities.css" layer(utilities) prefix(tw)`; layer order `@layer theme, base, components, utilities` declared first; the entire legacy design system wrapped VERBATIM (byte-identical, verified by diff) in `@layer base`. `@theme` brand tokens (`--color-brand-teal/paper/amber/ink/muted/line` + `--font-sans` referencing the next/font `--font-sans-arabic` variable). `@theme inline` shadcn mapping that REUSES the legacy variables where semantics match (`--paper/--ink/--card/--line/--teal/--amber/--red/--muted`) so the existing `[data-theme="dark"]` block drives both systems; only `--secondary`, `--muted-surface`, `--destructive-foreground`, `--ring`, `--chart-1..5` are new (legacy `--muted` is deliberately NOT redefined — it is the muted text color, while shadcn muted is a surface). `@custom-variant dark` scoped to `[data-theme="dark"]` (the site's own toggle). Two plain-CSS shell helpers: `[dir="rtl"] .shell-flip-rtl` and `.shell-skip-link`.
4. `components.json` (new) — shadcn config: style new-york, rsc, tsx, css `src/app/globals.css`, cssVariables true, prefix `tw`, aliases `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`, iconLibrary lucide.
5. `src/lib/utils.ts` (new) — `cn()` with clsx + plain `twMerge`. Verified empirically: plain twMerge dedupes `tw:`-prefixed classes correctly; `extendTailwindMerge({ prefix })` BREAKS deduping for the v4 namespace syntax (it is the v3 dash-prefix option) — documented in the file, do not "fix" it.
6. `src/components/ui/` (new) — `button.tsx` (cva variants + exported `buttonVariants` for links; no Radix Slot/`asChild` tonight), `card.tsx`, `badge.tsx` (pill shape matching the legacy badge; destructive uses `text-destructive-foreground` per the B04 contrast audit), `input.tsx`, `skeleton.tsx`. Every utility `tw:`-prefixed; every bordered primitive carries an EXPLICIT border color (no preflight default exists) — Button base `border-transparent` so the legacy teal button border cannot show through ghost/secondary/link variants.
7. `src/components/AppShell.tsx`, `Sidebar.tsx`, `ShellTopbar.tsx` (new) — AppShell renders the new shell on `/` only (Sidebar + Topbar + `#shell-main` + Footer) and the legacy `Nav` + `.container` chrome on every other page. Sidebar: the same 14 links as Nav (same hrefs/keys) with lucide icons, nav filter, due-today Card (FSRS-7 badge, Skeleton while loading, `countDueFlashcards`), persisted collapse (`etea_sidebar_collapsed`), mobile drawer with overlay + Escape-to-close + focus return to the hamburger (Nav B02 pattern), aria-current/expanded/controls/labels. RTL: logical properties (`start-0`, `border-e`, `ms-auto`) + JS-chosen off-canvas direction by language + `.shell-flip-rtl` chevron. Topbar: hamburger, mobile brand, language select + theme toggle reusing the existing `setLang`/`setTheme` and option labels.
8. `src/app/layout.tsx` — composes through `<AppShell>`; font block, metadata, and `<TelemetryListener />` untouched.
9. `src/lib/i18n.tsx` — 8 new shell keys only (`sidebarCollapse`, `sidebarExpand`, `sidebarNavFilter`, `sidebarNavFilterLabel`, `closeMenu`, `skipToContent`, `reviewNow`, `noNavResults`), en + roman + ur. `t()`/`tf()` implementations untouched.
10. Dependency de-risk (scratch build, file deleted after): a temporary route importing `motion/react` + `recharts` built cleanly (SSR-safe render), and `tw:dark:` / `tw:rtl:` classes generated correctly — prefix-first ordering confirmed, dark variant scoped to `[data-theme="dark"]`, rtl variant scoped to `[dir="rtl"]`. No motion/recharts imports ship in `src/` tonight (enforced by the suite).
11. Tests — NEW `scripts/test-stage3.mjs` (129 checks: files, dependency versions, shadcn/PostCSS config, CSS coexistence + no-preflight signatures, zero cancelled-font refs in `src/`, shell i18n keys, sidebar 14 links/a11y/RTL, AppShell switch, layout composition, no shipped motion/recharts, built-CSS assertions, bundle-isolation checks against `../etea-prep-next/`).

### Verification (local; no keys here, live confirmation after deploy)
- `npm run build` PASS (20 static pages + dynamic routes; 21 routes total, same as baseline). `npx tsc --noEmit` clean with `strict: true`.
- Suites: all 21 green — qa 52/52 + the 19 pre-existing suites unchanged (799 checks total, identical to the Stage 2 baseline) + test:stage3 129/129. Total 928 checks, 0 failures. Baseline (pre-change, same folder): build PASS, tsc clean, 799 checks green.
- Local prod server: 14 page routes + `/tracks/1` + `/mock/1` HTTP 200 (`/topics/1` 404 — no such route, correct); home HTML carries `#app-sidebar`, `#shell-main`, skip link, all 14 sidebar links, filter input, FSRS-7 due card, language + theme controls, and NO legacy topbar; `/library` keeps the legacy Nav and has no sidebar; served CSS contains prefixed utilities + legacy rules + brand tokens, no preflight signatures.
- No key material anywhere in the folder (only `.env.example`, inherited); no writes to `~/workspace/etea-prep-next/` (newest file still 2026-11-12 07:22 UTC, Stage 2 work).
- NOT done here (honest): browser behaviors (sidebar interaction at 360px, collapse/expand, Escape + focus return, keyboard flip of nothing new, theme/language switching in a real browser, RTL drawer direction on device) need a real browser post-deploy — see VERIFY-stage3-foundation.md §8.
- Full report: `VERIFY-stage3-foundation.md`.

## Stage 3 part 2 — motion, 3D flip, Recharts charts, Command Center, full shell migration, 2 live-defect fixes (local only, 2026-11-13; NOT deployed, NOT merged)

Built in the SEPARATE folder `~/workspace/etea-prep-next-stage3/` after the Stage 2 bundle PASSED live verification (commit 568207b, deployment B8yLxhYmwB7YifaVSDkeVZzuwk4S) — Stage 3 proceeds per the owner's pre-authorization. Same strict isolation: zero writes to `~/workspace/etea-prep-next/` (diff vs the Stage 2 backup still exactly the 23 allowlisted files). Merge + deploy only on the owner's word. No content/bank/API changes; no PWA/offline (Stage 4).

1. `src/components/motion.tsx` (new) — `PageFade` (route entrance: 0.25s fade + 6px rise, re-run per navigation via `key={pathname}`; entrance-only, deliberately NO AnimatePresence exit so navigation is never delayed) + `FadeIn` (same entrance with stagger delay). Both gate on `useReducedMotion()`: reduced-motion users get a plain `<div>` / fragment with NO animation. All animation in the app goes through this file.
2. `src/app/flashcards/page.tsx` — REAL 3D FLIP: the card surface is now a `<motion.button>` rotating `rotateY 0 → 180` (0.45s easeInOut); both faces share one grid cell (card height = taller face); hidden face is `backface-visibility: hidden` + `aria-hidden`; `aria-pressed` reports flip state. Reduced-motion renders the plain instant-swap native `<button>` instead. Native button semantics preserved (B05: Enter/Space flip, visible focus, grade buttons + session logic untouched).
3. `src/app/globals.css` — flip CSS (legacy layer, after `.flashcard` on purpose so `display: grid` wins over `.flashcard`'s flex at equal specificity): `.flip-scene { perspective: 1200px }`, `.flip-inner { display: grid; transform-style: preserve-3d }`, `.flip-face` (grid-area 1/1, backface hidden), `.flip-back { transform: rotateY(180deg) }`.
4. `src/components/AnalysisCharts.tsx` (new) — `DueForecastChart` (BarChart from `forecastDue()`: stored FSRS state, new + already-due cards on day 0) + `AccuracyTrendChart` (ComposedChart: amber bars = questions/day, teal line = accuracy % from `computeStats().daily`, last 14 days with attempts only). Real local data only; empty accuracy state says `chartNoData` honestly. Theme-safe colours (amber #F5A10B, teal #14b8a6, neutral grid/ticks #94a3b8); tooltip uses `var(--card)/var(--line)/var(--ink)` via inline style; chart wrappers are `dir="ltr"` (Recharts must not mirror in RTL).
5. `src/lib/tracking.ts` — NEW pure `forecastDue(cards, state, now, days=7)`: local-calendar-day buckets (day 0 = today), cards beyond the window not counted, empty bank returns zero-count days (never invents data).
6. `src/app/analysis/page.tsx` — charts section after the stat grid; loads stored flash state read-only (`loadFlashState()` in `refresh()`).
7. `src/app/page.tsx` — COMMAND CENTER: same 6 live stats (same data/values), now shadcn Cards with staggered `FadeIn`; plan card adds a progress bar (planDone / 63, `role="img"` + aria-label); quick actions now icon Cards (lucide, same 8 links/descriptions). Home counts still from `COUNTS` via `homeIntro` (645 MCQs · 110 notes · 70 flashcards · 19 tracks · 20 mocks).
8. `src/components/AppShell.tsx` — FULL MIGRATION: pathname switch REMOVED; the shell (Sidebar + Topbar + `#shell-main` + Footer) now wraps EVERY page; children wrapped in `<PageFade key={pathname}>`. `src/components/Nav.tsx` is RETIRED but kept in the tree (merge-time deletion decision; test-i18n still audits its link keys).
9. LIVE DEFECT FIXES (Stage 2 live verification, 2026-11-13): (a) `src/app/page.tsx` — home "Plan tasks done" fraction wrapped `dir="ltr"` (was the only un-isolated fraction; RTL had shown "63 / 0"). (b) `src/app/review/page.tsx` — countsLine var key `sNeeds` → `sneeds` (template name, lowercase). ROOT CAUSE: `replaceVars()` is case-sensitive; `vars["sneeds"]` was undefined → rendered blank ("186 pass · needs review · 0 problem."). Verified live in served HTML: "Structural check: 186 pass · 14 needs review · 0 problem."
10. `src/lib/i18n.tsx` — 7 new keys (`planProgressLabel`, `chartDueForecast`, `chartAccuracyTrend`, `chartNoData`, `chartDueWord`, `chartAccuracyWord`, `chartQuestionsWord`), en + roman + ur. Keys 431 → 438. `t()`/`tf()` implementations untouched.
11. Tests — `scripts/test-i18n.mjs` §7 (NEW: tf() call-site coverage — every `tf("KEY", {...})` call site must pass every placeholder the en template requires, case-sensitively; shorthand properties count; template-literal `${...}` + comments handled; plus a countsLine render simulation in all 3 languages with the live values) and `scripts/test-flashcards.mjs` forecastDue section (7 checks: bucketing, overdue/new → day 0, beyond-window exclusion, empty bank = zero days). `scripts/test-stage3.mjs` extended to 165 checks (foundation §9/§12 rewritten for the new reality: no pathname switch, motion/recharts SHIPPED; new §12a–d motion/flip/charts/Command Center, §13 flip-CSS built checks, §14 isolation +2 files, §15 defect anchors, §16 migration, §17 dark-mode/typography). `scripts/test-tier4.mjs` B05 updated (two native-button branches: plain + motion.button).

### Verification (local; live confirmation after deploy)
- `npm run build` PASS (21 routes). `npx tsc --noEmit` clean with `strict: true`.
- Suites: all 21 green — qa 52/52 + 20 test scripts = **974 checks, 0 failures** (baseline 928 → +46: i18n +2, flashcards +7, tier4 +1, stage3 +36).
- Local prod server (port 3101, stopped after): all 15 routes HTTP 200; shell (`#app-sidebar`) on EVERY page, ZERO legacy topbar; home served HTML contains `<span dir="ltr">0 / 63</span>` (defect a) + progress bar + 10 brand-teal icon occurrences; review served HTML contains "Structural check: 186 pass · 14 needs review · 0 problem." (defect b, the 14 is back).
- No key material anywhere in the folder; no writes to `~/workspace/etea-prep-next/` (newest file still 2026-11-12 07:22 UTC, Stage 2 work).
- NOT verified here (honest, needs a real browser post-deploy): 3D flip animation + keyboard flip on device, chart SVGs rendering (both pages SSR a loading state first — the SVG only appears after hydration), sidebar at 360px, collapse/expand rail, Escape + focus return, theme/language switching, RTL drawer direction. See VERIFY-stage3-part2.md §8.
- Full report: `VERIFY-stage3-part2.md`.

## Step 2a — UI shell upgrades per owner-supplied report (local, 2026-11-13; NOT deployed)

1. `src/lib/data.ts` — new semantic badge label functions: `reviewStatusBadge()` (Draft default; owner-reviewed/approved use the `reviewed` tone with "personal review, not official certification", never success green), `topicBadge()` (label always leads "Topic-inspired"; English detail is the stored ref verbatim), `trackConfidenceBadge()` (label = conf string verbatim; tone from the string's words: JOB-SITE / leading NOT VERIFIED → Unknown, mid-string NOT VERIFIED → Partial, else Source Confirmed). `CORRECTIONS_VERSION = 1` (bump re-shows the full correction notice). Reason: distinct meanings must never merge into one green "Confirmed".
2. `src/components/StatusBadges.tsx` (new) + `src/components/ProvenanceBadge.tsx` (rewritten internals, same API) — `StatusBadge` renders text + icon + title + aria-label with the full detail; tones draft/reviewed/proxy/partial/unknown/official/topic/extracted/error; proxy dashed, unknown dotted. Reason: meaning never depends on hue alone.
3. Badges applied: QuizRunner question header (ReviewStatusBadge with effective status from bank + /review overrides loaded after mount per B07; TopicBadge replacing the plain Original/Reworded badge) + results screen (provisional → draft tone, verified → reviewed tone; showProvisionalBadge logic untouched); mock cards (coverage badge from the real trusted count + scoring-unknown badge; start flow untouched); tracks list + detail + home pattern selector (TrackConfidenceBadge, verbatim text). Library upgraded automatically via ProvenanceBadge. /review untouched (workflows out of scope).
4. `src/app/globals.css` — Step 2a semantic token section AFTER the legacy block (legacy contiguous + verbatim): report-exact light/dark/status/focus/selected/disabled tokens, aliasing brand variables where values match; `.sbadge-*` classes; `.shell-nav-active` (selected surface + 2px logical border); `select { max-width: 100% }`; flex-input `min-width: 0` guard. `:focus-visible` now uses `--focus-ring` (teal kept, not the report's purple — computed 8.19:1/10.45:1 beats purple's 5.49:1/9.66:1 in both themes; see test-contrast).
5. `src/app/page.tsx` — "Start Here" card first (fresh: practice/mock/plan; returning: Resume/Continue from the real live session, Review due cards with New/Due split, Continue plan with the real next task; practice scopes say "Continue", mock scopes "Resume"). Every stat card shows denominator/scope. Correction notice: full on first visit, compact + reopen control after versioned acknowledgement (never removed). Plan bar → progressbar; time duration isolated; pattern badge → TrackConfidenceBadge.
6. `src/lib/tracking.ts` — additive read-only helpers: `liveSessions()` (same liveness rules as loadSession, most recent first) and `countFlashcardBuckets()` (New/Due split; fresh + due === countDueFlashcards).
7. `src/components/Sidebar.tsx` — navigation groups (Home top-level; Study incl. Tutor — the report's list omits Tutor, placement documented; Progress; Exam Resources; Quality) with role="group" + aria-labelledby; filter label unchanged; focus trap in the drawer; 44px touch targets (links + close button); reduced-motion instant; active link uses `.shell-nav-active`. `src/components/ShellTopbar.tsx` — hamburger 44px. `src/components/AppShell.tsx` — main + Footer `inert` while the drawer is open (Topbar outside, so Escape focus-return works).
8. Overflow (P1.1): library + issues inputs `flex: 1` + `min-width: 0`; tutor B01 rows verified, untouched; scroll regions (role="region", tabIndex 0, labelled, visible scroll caption) added to issues (2), analysis (4), QuizRunner results (1); vacancies caption added. No `body { overflow-x: hidden }` anywhere (test-enforced).
9. RTL: all 8 `minsLabel` renders isolated; analysis + chart-table percentages isolated; `scaleX(-1)` only on the collapse chevron; "0 / 63" regression-tested.
10. ARIA: library reveal = one button with aria-expanded + aria-controls + hidden body; 4 progressbars with numeric values (home, plan, QuizRunner ×2); analysis daily bars decorative with text alternative; both Recharts charts get role="img" + aria-label + `<details>` data tables with the same data; flashcard keyboard surface smoke-tested, not rebuilt.
11. `src/lib/i18n.tsx` — 46 new keys (445 → 491; the merge report's "438" was stale — both files counted directly), en + ur (+ roman for short chrome). `t()`/`tf()` untouched.
12. Tests — `scripts/test-contrast.mjs` (new, 78 checks: parses real token values, computes WCAG ratios at full precision, reproduces all 20 report claims within ±0.1, old 2.22:1 regression) and `scripts/test-step2a.mjs` (new, 184 checks: real badge functions via tsc-compiled data.ts, real tracking helpers via stubbed storage, source-pattern coverage of components/tokens/nav/home/overflow/ARIA). `scripts/test-rtl.mjs` +13 checks. 4 assertions updated for intended behavior changes (tier4 B02 focus token, provenance null guard, rtl library body + home badge). `package.json` gains `test:contrast` + `test:step2a`.

### Verification (local; live confirmation after deploy)
- `npm run build` PASS (20/20 pages). `npx tsc --noEmit` clean with `strict: true`.
- Suites: all 23 green — **1249 checks, 0 failures** (baseline 974 → +275: rtl +13, contrast +78, step2a +184).
- Local prod server (port 3100, stopped after): all 16 routes HTTP 200; shell on every page; counts unchanged (645 · 110 · 70 · 19 · 20); /review 15/200 intact; served HTML confirms nav groups, correction full form + ack button, library reveal ARIA, track badges 17/1/1, mock coverage + scoring badges, vacancies caption.
- NOT verified here (honest, needs a real browser post-deploy — pre-existing SSR behavior, same gaps as Stage 3): Start Here card + stats (post-mount), chart SVGs + data tables (analysis SSRs a loading state), QuizRunner progressbars/badges (Suspense-gated), drawer trap/inert, 44px targets + 360px overflow on a real phone, hydrated Urdu "0 / 63". See VERIFY-step2a.md §8.
- Full report: `VERIFY-step2a.md`.

## Step 2 fixes — 3 live-verification defects (local, 2026-11-13; NOT deployed)

1. Practice resume on the bare URL — `src/lib/practice.ts` (new): `PRACTICE_STATE_KEY`, `PracticeState`, `loadPracticeState` moved verbatim out of the practice page, plus pure `resolvePracticeInitial(param, stored, isValidSubject, freshSeed)`. The stored round AND seed are now restored whenever the run's subject IS the stored subject — covering the bare URL (no `?subject=`), which previously always generated a fresh `Date.now()` seed so the shuffled set never matched the stored session and the compatibility guard always reported a mismatch. A `?subject=` naming a DIFFERENT valid subject still starts fresh (round 0, fresh seed): per-scope sessions are the design, the old session stays stored/resumable from Home, no incompatibility prompt on subject change. `src/app/practice/page.tsx` — initial state resolves through the one pure function; manual subject change and "New set" behavior unchanged.
2. Flashcard next-due calendar date — `src/app/flashcards/page.tsx`: `grade()` captures the graded card's scheduled next review (`dueAt` + interval at grade time) into `lastGraded`; rendered as a local-timezone calendar date + the relative interval via new i18n key `flashGradedNextReview` ("Last card graded — next review {date} ({interval})"), visible in the card view and on the finished screen, cleared by `startSession`. The current card's state line now shows the local calendar date alongside the relative interval for Learning/Relearning cards too (Review cards already showed the date). Grade-button intervals unchanged. `src/lib/i18n.tsx` — 1 new key (en + roman + ur).
3. Analysis heatmap spacing — `src/app/analysis/page.tsx`: both weak-area lines (weakest + provisional) now use an explicit `{" "}` between the `%` span and the `weakOver` text, so "0%over 60 questions" cannot render. Provisional weak-area threshold untouched (1–4 questions).
4. Tests — `scripts/test-step2fixes.mjs` (new, 65 checks: real practice helpers via stubbed storage; full bare-URL resume chain with real compiled data.ts + real `checkSessionCompatibility`; real FSRS date helpers incl. TZ-pinned child processes proving local-timezone rendering; source-pattern coverage of all three fixes). `package.json` gains `test:step2fixes`.

### Verification (local; live confirmation after deploy)
- `npm run build` PASS. `npx tsc --noEmit` clean with `strict: true`.
- Suites: all 25 green — **1672 checks, 0 failures** (baseline 1607 → +65, test-step2fixes).
- Local prod server (port 3127, stopped after): 13 routes HTTP 200 incl. `/api/tutor/health`; built chunks contain the practice-state key and the new graded-review string; counts unchanged (645 · 110 · 70 · 19 · 20, asserted in the new suite against real data.ts).
- NOT verified here (needs a real browser post-deploy): bare-URL Resume offer on a hydrated page, the graded-card date line after a real grade, the heatmap space in rendered text, hydrated Urdu "0 / 63" regression. See VERIFY-step2fixes.md §5.
- Full report: `VERIFY-step2fixes.md`.

## Step 3a — Teaching-only structure + vacancy coverage ledger + SST split (local, 2026-11-13; NOT deployed)

1. Teaching-only visibility — `src/lib/data.ts`: `TEACHING_TRACK_IDS` (the ONE source of truth: zamungkor, tt, at, pst, ct, ctit, dm, pet, qari, swse, sst-etea, sst-kppsc) + `VISIBLE_TRACKS` (12), `VISIBLE_MOCKS` (16), `VISIBLE_VACANCIES` (4, Rescue row hidden by exact post string), `VISIBLE_COUNTS`. Full `TRACKS`/`MOCKS`/`VACANCIES`/`COUNTS` and `content.json` untouched — hidden data retained in files, exports, and data helpers; re-showing is a one-line change. Hidden: junior-clerk, computer-operator, police, forest, lhv, rescue + lecturer (judgment call: teaching post by nature but not in the owner's named set, no mock/bank — see VERIFY-step3a.md §6a).
2. Browse surfaces — tracks list/detail, mock list/detail, vacancies, and home counts all read the visible sets; hidden detail ids hit the existing not-found screens; home offers no Resume link into a hidden mock; a teaching-only scope note appears on home/tracks/mock/vacancies. Analysis (name lookup for own history) and Review (already teaching-only filters) intentionally left on full data.
3. Vacancy Coverage Ledger — `src/lib/ledger.ts` (new, pure): one row per visible track on the Vacancies page (`#ledger`, linked from Tracks). Official source + last verified (11 Nov 2026), exact weightage/time/marks/language/negative-marking (Unknown unless an official source states it; KPPSC −0.25 stays UNVERIFIED), per-subject notes/MCQs/cards computed from the real banks, coverage Exact/Proxy/Partial/Unknown (8/1/3/0), missing skills, next action. "Source Confirmed" green only on the 10 rows with a named official document; SWSE Provisional (PDF 435), ZamungKor Official-scope-unavailable (no published syllabus, proxy pattern verified against the fixed-mock distributions). CT shows the shared PST/CT mock flagged as shared. `src/lib/i18n.tsx` — 33 new keys (en + ur); homeIntro now says "teaching post tracks".
4. SST split verified — sst-etea (100 MCQs, 2020 PDF) and sst-kppsc (45 MCQs, 5th Schedule) are separate tracks with separate mocks, totals, variants, and ledger rows; never merged anywhere. No fix was needed.
5. Pre-existing inconsistencies found, NOT fixed: COMP_B.ct lists Pak Studies 10 where the report/track/mock list Social Studies 10 (ledger follows the report, discrepancy noted on the CT row); CT track detail shows "No mock yet" (mock is filed under pst); SST-ETEA mock covers only the 40-Q non-subject part. See VERIFY-step3a.md §7.
6. Tests — `scripts/test-step3a.mjs` (new, 366 checks: real compiled data.ts + ledger.ts; independent recount from raw JSON; weightage table locked; SST split; page source patterns; i18n keys). `package.json` gains `test:step3a`.

### Verification (local; live confirmation after deploy)
- `npm run build` PASS. `npx tsc --noEmit` clean with `strict: true`.
- Suites: all 26 green — **2038 checks, 0 failures** (baseline 1672 → +366, test-step3a).
- Local prod server (port 3103, stopped after): all 14 static routes + 5 dynamic routes HTTP 200; served HTML confirms 12 tracks / 16 mocks / 4 vacancy rows visible, 7 tracks / 4 mocks / Rescue row hidden, ledger + badges + last-verified + UNVERIFIED present, home "12 teaching post tracks · 16 mocks", hidden detail routes render not-found screens; counts 645 · 110 · 70 unchanged.
- NOT verified here (needs a real browser post-deploy): hydrated Urdu ledger/RTL, /review 15/200, 360px ledger cards, hidden-mock Resume guard on a hydrated page. See VERIFY-step3a.md §8.
- Full report: `VERIFY-step3a.md`.

## Step 3b-audit Batch 1 — F21 badge overflow, F14/F18 health cache + attribution, F10 local-timezone streaks, stale dashboard counts (local, 2026-11-13; NOT deployed)

1. F21 — `src/app/globals.css` `.sbadge`: `white-space: normal`, `max-width: 100%`, `min-width: 0`, `overflow-wrap: break-word`. The verbatim 137-char Pattern B confidence string rendered ~869px wide with nowrap and broke the 360px screen; it now wraps. One fix covers every page (all semantic badges share `.sbadge`); the only remaining nowrap in globals.css is the skip link; the nowrap shadcn Badge is unused on badge pages.
2. F14/F18 — new `src/lib/healthCache.ts` (`createProbeCache`: 5-min TTL + in-flight sharing + failed probes never poison the cache); `src/app/api/tutor/health/route.ts` serves probes through it with `Cache-Control: private, max-age=300, must-revalidate`, `cached` flag, and `coldStart: false` on cache hits; guard + rate limit still run per request. Client TTL already 5 minutes (coherent). Attribution: `generateTutorAnswer` already returns the answering provider (test-proven); new `providerDisplayName()` in `src/lib/tutorHealth.ts` returns null for unknown values and `src/app/tutor/page.tsx` omits the via-line instead of defaulting to OpenRouter.
3. F10 — `src/lib/tracking.ts`: new `localDayKey()` (local getters); `dayKey()` returns the LOCAL day of each ISO instant; streak extracted as pure `countStreakDays()` on local keys; `DAY_KEY` written local. `src/app/analysis/page.tsx`: 7/30-day filter cutoff + comparison use local keys. Rate-limit day key (server-side) and export filenames stay UTC by design; per-row UTC date displays left (display-only, out of scope).
4. Stale counts — `quickMocksDesc`/`quickTracksDesc` in `src/lib/i18n.tsx` parameterized (`{mocks}`/`{tracks}`, en + roman + ur); `src/app/page.tsx` renders them via `tf()` with `descParams` from `VISIBLE_COUNTS` (16 mocks / 12 tracks). No new i18n keys.
5. Tests — `scripts/test-step3b-audit1.mjs` (new, 92 checks: real tracking.ts + TZ-pinned children, healthCache TTL/dedup/failure, route + attribution source assertions, badge CSS, counts derivation). `package.json` gains `test:step3b-audit1`.

### Verification (local; live confirmation after deploy)
- `npm run build` PASS. `npx tsc --noEmit` clean with `strict: true`.
- Suites: all 27 green — **2130 checks, 0 failures** (baseline 2038 → +92, test-step3b-audit1).
- Local prod server (port 3131, stopped after): all 14 routes HTTP 200; served HTML confirms "16 timed mocks", "12 post tracks", headline counts, review heading, zero stale literals; built CSS confirms the badge wrap rules; health double-hit confirms the server cache (hit 2 `cached:true`, identical `checkedAt`, `Cache-Control` header; no keys configured locally, zero quota spent).
- NOT verified here (needs a real browser post-deploy + owner phone check): 360px badge rendering (final arbiter: owner's phone), live health cache with real providers, streak behaviour across a real PKT midnight. See VERIFY-step3b-audit1.md §5.
- Full report: `VERIFY-step3b-audit1.md`.

## Phase 4A — Remove translation-verification queue + Home stats skeleton (local, 2026-11-13; NOT deployed)

1. Queue removal (owner decision — personal use, no manual verification needed) — `src/app/review/page.tsx`: deleted the "English explanations pending owner review" queue section (196-item list + count + Show-more), its `pendingVisible` paging state, and the `pendingEnglishExplanations()` import/call. KEPT: the pending labels on explanations (QuizRunner reveal + review cards), the `explanationEn`/`explanationLang` bank data (untouched), `displayExplanation()`, and `pendingEnglishExplanations()` in `src/lib/data.ts` (retained for the test suites' F02 accounting, with a comment noting the removal). `src/lib/i18n.tsx`: removed the queue-only keys `pendingEnglishHeading`/`pendingEnglishIntro`/`pendingEnglishShowMore`; `explanationPendingLabel` stays. No other /review behavior changes (15/200, filters, flags list intact).
2. Home stats skeleton — `src/app/page.tsx`: the Command Center grid is now a ternary on loaded `stats`: while `stats` is null (pre-mount), a `Loading...` status line + 6 skeleton cards (shadcn `Skeleton`, same grid shape, `aria-busy`, decorative grid `aria-hidden`) render instead of blank space; the real computed values replace them after mount. No computed value, layout, or RTL rendering changed. New i18n key `statsLoading` (en + roman + ur).
3. Tests — `scripts/test-phase4a.mjs` (new, 28 checks: queue absence, labels/data/logic kept, skeleton structure + no computed values in the skeleton branch, bank counts still 645/124/196). `package.json` gains `test:phase4a`. Updated: `scripts/test-step3b-audit2.mjs` (queue-presence check → absence checks; 3 queue keys dropped from the key list; net −2 checks) and `scripts/test-rtl.mjs` (the queue's raw-explanation `dir=auto` span no longer exists; card isolation asserted 1:1).

### Verification (local; live confirmation after deploy)
- `npm run build` PASS. `npx tsc --noEmit` clean with `strict: true`.
- Suites: all 29 green — **2283 checks, 0 failures** (baseline 2257 → +28 new, −2 net audit2, test-rtl 1:1).
- Local prod server (port 3141, stopped after): all 15 routes HTTP 200; home SSR HTML contains 19 skeleton slots (18 new + 1 pre-existing sidebar), `aria-busy`, `role="status"` + "Loading..." text, and the correct headline counts; /review SSR HTML contains zero `pendingEnglish` occurrences and the review heading; zero Nastaliq.
- NOT verified here (needs a real browser post-deploy): the visual skeleton→values swap after mount, and the flags list post-hydration (mount-gated, unchanged). See VERIFY-phase4a.md §4.
- Full report: `VERIFY-phase4a.md`.

## Stage 4A — PWA: manifest + service worker + install/offline UI (local, 2026-11-14; NOT deployed)

1. Manifest + icons — `public/manifest.webmanifest` (new): name "ETEA Prep Library", short_name "ETEA Prep", start_url/scope "/", display standalone, theme_color #09555E / background_color #FDFBF1 (the site's actual brand colours from globals.css). Icons script-generated with PIL (no external downloads, no Pakhtunkhwa Insider branding): `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (teal field, open-book glyph, "ETEA" wordmark; maskable artwork inside the 80% safe zone). `src/app/layout.tsx`: metadata `manifest`, `appleWebApp`, PNG + apple touch icons, and `viewport.themeColor #09555E`.
2. Service worker — `public/sw.js` (new, hand-written; NO next-pwa, NO Serwist): versioned cache `etea-prep-v1`; best-effort precache of the 14 static routes + manifest + 3 icons; cache-first for hashed `/_next/static/*` assets (the JS chunks carry the statically-imported content.json + 16 bank files, so chunk caching IS the offline data cache — the raw JSON files are never served as URLs); network-first for navigations with cached-home fallback; stale-while-revalidate for other same-origin GETs; NETWORK-ONLY for `/api/*` (tutor/explain/plan never cached). No unconditional skipWaiting: the worker waits, the app shows an update notice, and only the user's Refresh click posts SKIP_WAITING; activation claims clients and deletes old caches. `next.config.mjs`: `/sw.js` served `Cache-Control: no-store`.
3. Install + offline + update UI — `src/components/PwaProvider.tsx` (new): registers `/sw.js` on window load, captures beforeinstallprompt (stored, fired only on click), standalone + iOS detection, persisted dismissal (`etea_pwa_install_dismissed`), online/offline tracking, waiting-worker state with a guarded controllerchange reload. `src/components/PwaInstall.tsx` (new): sidebar install block (Install button, or iOS Share → Add to Home Screen instructions; renders nothing when installed/dismissed/no path). `src/components/PwaUpdateBanner.tsx` (new): update notice in the shell main area. `src/components/ShellTopbar.tsx`: mount-gated Offline badge. `src/app/tutor/page.tsx`: clear "needs internet" banner when offline (offline library search unchanged). `src/components/AppShell.tsx`: wraps the shell in PwaProvider, renders the banner. 10 new i18n keys (en + roman + ur) in `src/lib/i18n.tsx`. NO bank/data changes; no scoring, FSRS, flag, review, or tutor-logic changes.
4. Tests — `scripts/test-stage4a-pwa.mjs` (new, 100 checks: manifest fields + icon PNG validity/dimensions, SW strategy table incl. /api exclusion + no force-skipWaiting, data-bundling proof, wiring, no next-pwa/Serwist). `package.json` gains `test:stage4a-pwa`.

### Verification (local; live confirmation after deploy)
- `npm run build` PASS. `npx tsc --noEmit` clean with `strict: true`.
- Suites: all 32 green — **2477 checks, 0 failures** (baseline 2377 → +100, test-stage4a-pwa).
- Local prod server (port 3107, stopped after): all 14 routes + manifest + sw.js + 3 icons HTTP 200; sw.js serves `Cache-Control: no-store` + `application/javascript`; manifest serves `application/manifest+json`; icon serves `image/png`; home HTML carries the manifest link, theme-color meta, apple-touch-icon, and the unchanged counts (763/151/70/12/16); `node --check` passes on sw.js; zero Nastaliq.
- NOT verified here (no headless browser on this machine; needs the live browser check post-deploy): SW registration + precache population, the offline round-trip (first online visit, then offline navigation through Library/Flashcards/Practice), beforeinstallprompt capture + Install flow, the waiting-worker update notice + refresh, and the offline badge/tutor banner under real offline conditions. See VERIFY-stage4a-pwa.md §5.
- Full report: `VERIFY-stage4a-pwa.md`.

## Stage 4B — Quran Audio: owner-approved ayahs linked to Tajweed notes + sticky player (local, 2026-11-14; NOT deployed)

1. Approved data, generated never hand-typed — `src/data/quran-examples.json` (new): the 21 owner-approved rule→ayah entries (18 unique verses), built programmatically from `~/workspace/tajweed-ayah-proposals.md` (approved 2026-11-14) with every ayah text re-verified verbatim against the Quran.com API (`text_uthmani`, two independent fetches, identical; NFC-equal to the approved file — the only byte differences are Unicode combining-mark order). Global ayah numbers computed from the API's chapter verse counts. Demo words kept only where they appear verbatim (NFC) in the mushaf text (20/21; null for #3 Idgham without Ghunnah and #21 Saktah, whose textbook spellings differ from the assimilated mushaf forms). `scripts/quran-api-verified-2026-11-14.json` (new): the recorded API snapshot the suite asserts against. `src/lib/quranAudio.ts` (new): typed access + the mapping (13 note titles → 26 example slots, keyed by EXACT original title) + CDN URL builders (everyayah.com primary, cdn.islamic.network fallback, Alafasy voice, stream-only). All 36 audio URLs HEAD-checked 200 audio/mpeg at batch time (see report §3). NO note body edited; the 11 unmapped Tajweed notes (Makharij, Sifaat, Hifz, Waqf overview, etc.) stay text-only per the owner's decision.
2. Player + UI — `src/components/QuranAudioProvider.tsx` (new): one global HTMLAudioElement at shell level (survives navigation), preload="none", Play/Pause, Speed 0.5x/1x only, Repeat/Loop, Close; on audio error it tries the fallback CDN exactly once, then an honest "unavailable" state (Play retries from primary). `src/components/StickyPlayer.tsx` (new): fixed bottom mini bar (rule + Surah/ayah + reciter, 44px targets, single row with ellipsis truncation, safe-area padding) + a 72px in-flow spacer so it never covers content. `src/components/NoteAudioExamples.tsx` (new): one "Play Audio" block per example on linked notes (verified ayah text in RTL Uthmani, reference, demo word), buttons disabled with a "needs internet" note when the PWA state reports offline. `src/components/AppShell.tsx`: wraps the shell in the provider, renders the player outside the inert region. `src/app/library/page.tsx`: renders the examples block (keyed by original title) below the recall-gated body — Library is the only note render site (tutor cites titles only). 14 new i18n keys (en + roman + ur). `src/app/globals.css`: player/example/ayah styles (Noto Sans Arabic only). Audio is never cached: the service worker passes cross-origin requests through untouched (suite-asserted). Word-by-word highlighting and Speak & Check are OUT of scope (Stage 4C / owner: verse-by-verse is enough).
3. Tests — `scripts/test-stage4b-audio.mjs` (new, 85 checks: data shape/counts, stored text == API snapshot exact + NFC, titles exist exactly once, URL patterns, SW exclusion, player wiring, CSS, i18n keys, no bank contamination). `scripts/test-step3b-audit1.mjs`: F21 nowrap allowlist gains the bounded `.quran-player-label` (flex + min-width:0 + overflow:hidden + ellipsis — cannot overflow at 360px; +1 check). `package.json` gains `test:stage4b-audio`. No bank/data changes; no PWA-file changes except the shell integration.

### Verification (local; live confirmation after deploy)
- `npm run build` PASS. `npx tsc --noEmit` clean with `strict: true`.
- Suites: all 33 green — **2563 checks, 0 failures** (baseline 2477 → +85 new, +1 audit1).
- Local prod server (ports 3149/3150, stopped after): all 14 routes HTTP 200; home counts unchanged (763/151/70/12/16); /review heading present, zero `pendingEnglish`; built CSS contains the fixed player rules; client chunks contain the ayah text, "Example recitation", and the everyayah builder (Library is client-rendered, so its cards are verified in the browser pass, not via SSR HTML); zero Nastaliq.
- NOT verified here (no headless browser on this machine; needs the live browser check post-deploy): actual audio playback (primary + fallback), the sticky player while scrolling/navigating, 360px rendering of the bar, the offline disabled state, and the update notice interplay. See VERIFY-stage4b-audio.md §6.
- Full report: `VERIFY-stage4b-audio.md`.

## Stage 4B fix — CSP media-src (2026-11-14, live failure found 01:13 PKT)

Live verification of the Stage 4 deploy (deployment A7mMxvgKKVdzTHwoiLgmvJXA5oAj) found in-app Quran audio playback FAILING in all 5 attempts (sticky player showed "Audio could not be loaded"), while both CDN URLs played fine opened directly in a tab. Root cause: the CSP in `next.config.mjs` had `default-src 'self'` and NO `media-src` directive — `<audio>` loads fall back to `default-src`, so both cross-origin CDNs were blocked by the browser. The service worker was NOT the cause (it returns early for all cross-origin requests). Fix: one directive added — `media-src 'self' https://everyayah.com https://cdn.islamic.network` — plus the stale "no external resources" comments corrected. `scripts/test-stage4b-audio.mjs` gains §9 (12 checks: media-src present with exactly the two CDNs, all 10 other directives unchanged). No other file changed.

## Stage 5A — Translation infrastructure + Islamiyat pilot (2026-11-14)

Owner order (FINAL, 2026-11-14 ~08:57 PKT): translate content into BOTH Urdu script AND Roman Urdu; 3-way toggle English / اردو / Roman (existing toggle reused, no new state); per-MCQ and per-note `_ur` + `_roman` fields; no review queue; literal `[Auto-Translated]` badge on translated items; subject-wise batches with a build test after each; pilot = Islamiyat + Tajweed, ONE deploy + live test, then remaining subjects. This batch: infrastructure + ALL of Islamiyat (105 MCQs + 14 notes). Tajweed is the separate 5B batch; no other subject touched.

Schema (additive only, `src/lib/data.ts`): `Question` gains `question_ur`, `question_roman`, `options_ur`, `options_roman`, `explanation_ur`, `explanation_roman`; `Note` gains `title_ur`, `title_roman`, `body_ur`, `body_roman`. New pure resolvers `resolveQuestionView` / `resolveNoteView` implement ITEM-LEVEL fallback: a language renders its translation only when the full field set is present (question + same-length all-non-empty options + explanation; title + body for notes), otherwise the whole English item renders — never a half-translated mix. The Pass-1 nested tri-language scaffold (`Question.ur`/`roman`, `localizeQuestion`/`localizeNote`, `hasTranslation`) is left intact but unused by the renderers; the flat-field design follows the owner spec literally and is the pattern 5B must follow.

Rendering: QuizRunner resolves each question BEFORE shuffling (shuffle seed depends only on id + startTs, so switching language mid-run keeps option positions and index-based answers valid) and shows the literal `[Auto-Translated]` badge (dir="ltr" isolated, `autoTranslatedBadgeAria` i18n label) on the question card and in the review table whenever translated content renders. The Library renders notes via `resolveNoteView`, badges translated notes, and keeps the existing "English source text" label for untranslated notes in Urdu/Roman mode. Urdu-script content renders inside the existing RTL document flow (document.dir=rtl for `ur`); Roman renders LTR. Noto Sans Arabic only; zero Nastaliq. The tutor's answer-language behaviour is unchanged; `/review` and `quran-examples.json` are untouched (suite-guarded).

Translations (all 105 MCQs ISL-001–ISL-105 + all 14 Islamiyat notes, none omitted): faithful translations; option order preserved; digits 0-9 unchanged; proper names/Arabic terms intact; Arabic script copied verbatim. The 90 Roman-marked explanations: `explanation_roman` is a VERBATIM copy of the existing `explanation`; `explanation_ur` is its Urdu-script translation. The 15 English explanations were translated to both. Bank diffs are insertions-only: `islamiyat.json` +1680/−0 lines; `content.json` deep-identical to the pre-Stage-5 backup after stripping the new note keys; `correctIndex`, answers, `reviewStatus`, `verified`, `source`, `explanation`, `explanationEn`, `explanationUrdu` byte-identical.

Tests: new `scripts/test-stage5a.mjs` (50 checks: field completeness all-or-none per language, options length, verbatim Roman rule, no other bank/subject touched, resolver fallback/identity/partial cases incl. real translated items, badge/rendering wiring, /review + quran-data scope guards). One existing check updated 1:1: `test-step2b.mjs` "English source text label" now asserts the `!shown.translated` mechanism (rendered behaviour unchanged). Full verification: `npm run build` PASS, `npx tsc --noEmit` clean (strict), ALL suites green — 2625 checks / 34 suites (baseline 2575 / 33). Local prod server: all 14 routes HTTP 200; translated Urdu + Roman strings and the badge literal present in the built client chunks; /review shows zero pendingEnglish. Visual check of translated rendering is the parent's live browser pass after the 5B deploy.

- Full report: `VERIFY-stage5a.md`.

## Stage 5B — Tajweed pilot batch 2 (2026-11-14)

Translation data ONLY on the Stage 5A infrastructure (no schema, resolver, rendering, fallback, or badge change — the 5A resolvers are subject-agnostic). ALL of Tajweed: 82 MCQs (TAJ-001–TAJ-082) + all 24 Tajweed notes, Urdu script + Roman Urdu, none omitted. The 6 flat MCQ fields and 4 flat note fields follow the 5A pattern exactly (inserted after `id` in `tajweed.json`; appended after `body`/`title` on notes in `content.json`).

Rules applied: faithful translations; option order preserved; digits 0-9 unchanged; proper names/Arabic terms intact; Arabic script copied verbatim into BOTH languages (codepoint-checked in validation); no invented/altered religious reference, date, Hadith number, or Quranic text; `quran-examples.json` untouched. The 1 Roman-marked explanation (TAJ-029): `explanation_roman` is a VERBATIM copy of `explanation` (forced programmatically at merge); `explanation_ur` is its Urdu-script translation. The 81 English explanations were translated to both. Honorific convention (single, consistent): Arabic forms (ﷺ, رضی اللہ عنہ) in Urdu-script fields, the SAME full forms spelled out in Roman fields ("Sallallahu Alaihi Wasallam", "Raziallahu Anhu") — no Latin abbreviations in either language; parenthetical glosses kept, never dropped. Bank diffs insertions-only: `tajweed.json` +1312/−0 lines vs the pre-Stage-5 backup; `content.json` deep-identical after stripping the new note keys; `correctIndex`, answers, `reviewStatus`, `verified`, `source`, `explanation`, `explanationUrdu` byte-identical.

Tests: new `scripts/test-stage5b.mjs` (Tajweed field completeness all-or-none per language, options length, TAJ-029 verbatim rule, Arabic-verbatim + honorific guards, no-other-bank/subject scope, resolver checks on real Tajweed items, quran-data guard). `scripts/test-stage5a.mjs` §5/§6 scope guards updated to allow both pilot banks/subjects (islamiyat + tajweed). Full verification: `npm run build` PASS, `npx tsc --noEmit` clean (strict), ALL suites green — 2655 checks / 35 suites (baseline 2625 / 34). Local prod server: all 14 routes HTTP 200; translated Tajweed Urdu + Roman strings present in the built client chunks. Visual check of translated rendering is the parent's live browser pass after the deploy.

- Full report: `VERIFY-stage5b.md`.
