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
