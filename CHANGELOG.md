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
