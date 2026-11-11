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
