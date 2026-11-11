# Stage 1 P0.1 — Verification Report: 15 items marked verified at bank level
Date: 2026-11-12 (local only, NOT deployed, NOT committed)
Backup: `~/workspace/etea-prep-next-backup-pre-p1t0/` (FLAT copy of the repo contents — verified: no nested `etea-prep-next` directory inside it; diff-verified identical to the pre-task tree before edits)

## What was asked
The owner personally reviewed and approved the 14 "needs-review" items from the structural check and asked for them to be marked verified, plus ISL-001 (already verified on the /review dashboard, which lived only in that browser's localStorage). The verification had to move to BANK level so it shows on every device.

## Source of truth for the 14
`src/data/structural-checks.json` — counts `{total: 200, pass: 186, needsReview: 14, problem: 0}`; items with status `needs-review` (read from the file, not from memory):
ENG-005, ENG-006, ENG-008, ENG-012, ENG-013, ENG-019, ENG-020, ENG-025, ENG-026, ISL-029, ISL-055, MAT-022, PAK-008, URD-001 — matches the expected list exactly.

## The 15 items changed (all: reviewStatus draft → "owner-reviewed", reviewedBy null → "owner")
| Item | Bank file | reviewedAt | Notes |
|---|---|---|---|
| ISL-001 | src/data/banks/islamiyat.json (index 0) | 2026-11-11T22:01:56Z | Its /review dashboard timestamp (03:01:56 AM PKT 2026-11-12) |
| ENG-005, ENG-006, ENG-008, ENG-012, ENG-013, ENG-019, ENG-020, ENG-025, ENG-026 | src/data/banks/english.json (indices 4, 5, 7, 11, 12, 18, 19, 24, 25) | 2026-11-11T22:23:00Z | Owner's approval in chat (~03:23 PKT 2026-11-12) |
| ISL-029, ISL-055 | src/data/banks/islamiyat.json (indices 28, 54) | 2026-11-11T22:23:00Z | |
| MAT-022 | src/data/banks/maths.json (index 21) | 2026-11-11T22:23:00Z | |
| PAK-008 | src/data/banks/pakstudies.json (index 7) | 2026-11-11T22:23:00Z | |
| URD-001 | src/data/banks/urdu.json (index 0) | 2026-11-11T22:23:00Z | |

Vocabulary: there is no bare "verified" status. The dashboard's Verify action sets "owner-reviewed", and the UI's "verified" counter counts owner-reviewed + approved items — so "owner-reviewed" is the correct stored value for all 15. The legacy `verified: false` field on the items was left untouched (it is not read by the trusted logic; QA still asserts `verified === false` for the Phase 2 post-fix items, which are unaffected).

## Files changed (vs backup — 7 files, nothing else)
- `src/data/banks/english.json` — 9 items × 3 fields (54 changed lines, 27 per side).
- `src/data/banks/islamiyat.json` — 3 items × 3 fields (18 changed lines).
- `src/data/banks/maths.json`, `src/data/banks/pakstudies.json`, `src/data/banks/urdu.json` — 1 item each × 3 fields (6 changed lines each).
- Bank files were re-serialised with `json.dumps(indent=1, ensure_ascii=False)`; a round-trip check proved this is byte-identical to the original formatting, and the final diff contains ONLY the reviewStatus/reviewedBy/reviewedAt lines — no other line changed in any bank file.
- `scripts/qa-540.mjs` — the review-status check now asserts exactly these 15 items are owner-reviewed (by owner, with the exact timestamps above) and every other item is draft; new check: trusted-only count for ZamungKor Mock 1 + Mock 2 is 15.
- `CHANGELOG.md` — Stage 1 P0.1 verification record appended (15 IDs, verifier, timestamps, expected live behaviour).
- `src/lib/data.ts` — NO change needed: the Question type already allows optional `reviewedBy`/`reviewedAt`, `isTrusted` already counts bank-level owner-reviewed as trusted, and `effectiveReviewStatus` keeps letting a localStorage override win over the bank value (verified by test, below).

## Before / after
- Before: all 15 items `reviewStatus: "draft"`, `reviewedBy: null`, `reviewedAt: null`. Trusted Mode filled from 0 items on a fresh device (ISL-001's verification existed only in one browser's localStorage). /review showed "1 / 200 verified" only in that browser.
- After: all 15 `reviewStatus: "owner-reviewed"`, `reviewedBy: "owner"`, `reviewedAt` as in the table above. Trusted Mode fills from 15 items on every device.

## Verification (all run after the final file state)
- Trusted-build check — real compiled `src/lib/data.ts` (`/tmp/check-trusted15.mjs`, same compile-to-CJS approach as `scripts/test-retrieval.mjs`): **13/13 PASS**. zam1 trusted-only = 9 (ENG-005, ENG-006, ENG-008, ENG-012, ENG-013, ISL-001, ISL-029, PAK-008, URD-001), zam2 trusted-only = 6 (ENG-019, ENG-020, ENG-025, ENG-026, ISL-055, MAT-022); together exactly the 15 IDs, no duplicates; `trustedOnlyCount` sums to 15; override path still works both ways (draft override un-trusts a bank item; owner-reviewed override trusts a draft item and grows the trusted build by 1); provisional zam1/zam2 builds still 100 each.
- `npm run qa` — **52/52 PASS** (was 51/51 — the new trusted-count check added). Includes the new checks by name: "review status: exactly the 15 owner-approved items are owner-reviewed (by owner, with timestamps); all others draft — 665 items checked, 15 owner-reviewed" and "trusted-only count for ZamungKor Mock 1 + Mock 2 is 15".
- `node scripts/test-reviews.mjs` — 37/37 PASS. `node scripts/test-scoring.mjs` — 39/39 PASS. `node scripts/test-retrieval.mjs` — 28/28 PASS. `node scripts/test-flashcards.mjs` — 29/29 PASS.
- `npx tsc --noEmit` — clean. `npm run build` — PASS (21/21 pages).

## Expected live behaviour after deploy (small deploy, same 7 files + this report)
- /review header reads **"15 / 200 verified"** for ZamungKor Mock 1 + 2 (was 1/200, and only in the browser where ISL-001 was verified).
- Trusted Mode now fills from **15 items** on every device. A trusted-only ZamungKor Mock 1 returns 9 questions, Mock 2 returns 6 — the shortfall is never filled with unreviewed items.
- The owner's earlier localStorage decision for ISL-001 is now redundant but harmless: the bank value agrees with it, and an override would still win if the owner ever changes it on /review.
- Full mocks (200–300 verified items) still need the owner to keep verifying on /review during P1; the agent's job remains structural checks + the dashboard only. No P1 work was done in this task.
