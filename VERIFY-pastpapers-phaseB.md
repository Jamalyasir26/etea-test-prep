# VERIFY — Phase B: Past-Paper Topics (Reworded) bank 20 → 500 (2026-11-24, local; NOT deployed)

Owner decision (2026-11-24 ~17:40 PKT): **Option 3 — "Dono"** (same as Phase A). Design: `~/workspace/pastpapers/BRIEF-PhaseB.md` — each new bank (b) item is the **1:1 reworded twin** of the matching bank (a) item PPT-021..500 (same tested fact, same correct answer, DIFFERENT wording + DIFFERENT option order). The twin **inherits** its (a) item's provenance/conceptId/sourceKind/syllabusClause/source verbatim — paper twins carry the past-paper label, textbook twins carry the textbook-topic label. The 20 legacy seed items PPR-001..020 stay byte-identical (24-key legacy, no provenance; seed precedent: 16/20 keep an identical option set reordered). New twins: 28-key schema, trilingual at creation, draft/unverified, `explanation` EN only + `explanationEn` same sentence, `explanationUrdu: null`, difficulty = twin's. SST: textbook label ONLY (zero paper evidence — inherited from (a)).

## 1. Slices — all 12 delivered, all validated green

| Slice | Range | Items | Validator | Dedupe (vs 7520) | Provenance paper/textbook | correctIndex |
|---|---|---|---|---|---|---|
| B1 | PPR-021..060 | 40 | 3056, 0 fail | 0 FAIL / 0 WARN | 38 / 2 | 10/8/11/11 |
| B2a | PPR-061..080 | 20 | 1317, 0 fail | 0 / 0 | 12 / 8 | 5/5/5/5 |
| B2b | PPR-081..100 | 20 | 1234, 0 fail | 0 / 0 | 14 / 6 | 6/7/3/4 |
| B3 | PPR-101..140 | 40 | 2446, 0 fail | 0 / 0 | 36 / 4 | 10/10/10/10 |
| B4 | PPR-141..180 | 40 | 2454, 0 fail | 0 / 0 | 27 / 13 | 12/9/12/7 |
| B5 | PPR-181..220 | 40 | 2446, 0 fail | 0 / 0 | 33 / 7 | 11/10/10/9 |
| B6 | PPR-221..260 | 40 | 2443, 0 fail | 0 / 0 | 30 / 10 | 9/11/10/10 |
| B7 | PPR-261..300 | 40 | 2441, 0 fail | 0 / 0 | 25 / 15 | 10/10/10/10 |
| B8 | PPR-301..340 | 40 | 2441, 0 fail | 0 / 0 | 38 / 2 | 9/10/12/9 |
| B9 | PPR-341..380 | 40 | 2445, 0 fail | 0 / 0 | 22 / 18 | 6/14/13/7 |
| B10 | PPR-381..420 | 40 | 2612, 0 fail | 0 / 0 | 14 / 26 | 10/10/11/9 |
| B11 | PPR-421..460 | 40 | 2491, 0 fail | 0 / 0 | 15 / 25 | 12/8/8/12 |
| B12 | PPR-461..500 | 40 | 2540, 0 fail | 0 / 0 | 25 / 15 | 10/10/10/10 |

**Total: 480 new items, PPR-021..500, no ID gaps or collisions.**
- **B2 split:** the B2 worker errored on the output token cap with NO file delivered (Phase 1 lesson: split on cap). Re-dispatched as halves B2a (PPR-061..080) + B2b (PPR-081..100); coordinator combined them into `slices/ppr-B2.json` (40 items, validator 2550 ALL GREEN, dedupe 0/0).
- **Validator quirk (Phase B, observed 3×):** the Latin-token check absorbs a trailing full stop, so a Latin term placed sentence-final in an EN field (e.g. "...formula O3.", "aurum.", "trigraph.") fails its `_ur` counterpart — workers worked around it by moving Latin terms mid-sentence in EN. The rule was NOT weakened; a coordinator adjudication would be needed before any change.
- Coordinator independently re-validated every delivered slice (validator ALL GREEN + dedupe 0 FAIL / 0 WARN each) before merging.

## 2. Merge (coordinator, `merge-ppr.cjs`)

- 500 items (20 legacy + 480 new); first 20 deep-equal to the pre-merge backup (`pre-merge-pastpapers-reworded.json`, md5 `9f86c9d205d6fbb58aaf192f5e414a27`) and to remote HEAD 334f7446's 20.
- Provenance paper **329** / textbook **151** (identical split to bank (a)); **451 distinct conceptIds** (29 second-item concepts appear 4×: 2 (a) items + 2 (b) twins; 422 appear 2×: 1 (a) + 1 (b)); labels 329 paper-reworded + 151 textbook-reworded.
- correctIndex (new 480): **120/122/125/113** — balanced, no rotation needed (Phase A N-PPT-1 lesson applied as a check, not a fix).
- 0 exact-duplicate EN questions in-bank; 0 cross-bank duplicate EN questions (dedupe vs the 8000-item index, paired PPT twin exempted only — the only exemption in the tool); 0 twin-pairing violations (every new twin's provenance/conceptId/sourceKind/syllabusClause/source byte-identical to its (a) item; every twin's question string differs from its (a) item; every twin's option order differs; option SET identical; correct-option EN text identical).
- Merged bank `src/data/banks/pastpapers_reworded.json` (990,449 bytes). Per-slice provenance sums to 329/151 (see §1).

## 3. Count ripple (Phase B)

- `content.json`: total 7520→**8000**; Past-Paper Topics (Reworded) row 20→500; `bySubject.pastpapers_reworded` index 20→500 ids (rows sum 8000). `bank-manifest.ts` regenerated (diff vs remote: ONLY the reworded count 20→500 + 480 new ID mappings). `layout.tsx` meta "7520 MCQs"→"8000 MCQs".
- `src/lib/data.ts` — NO change needed: `topicBadge()` textbook branch already fires on `includes("textbook")` FIRST (Phase A), so the new textbook-reworded label takes the textbook branch.
- Suite pins (mechanical, count literals only): 7520→8000 in 35 files; `pastpapers_reworded: 20`→500 in all 14 EXPECTED_OTHER maps + qa-540 EXPECTED map; qa-540 header updated (Phase B note). F02 explanationEn 604→**1084** in test-phase4a/b1/b2 + test-step3b-audit2, plus new pin "F02 EN by bank: pastpapers_reworded 480 (Phase B: 480 new; legacy 0)". stage5g: reworded bank 500 items (20 legacy + 480 Phase B), triple-loop expected 500, label check now 349 paper-reworded + 151 textbook-reworded (new TB_REWORDED_LABEL const), no-explanationEn label now "20 reworded legacy" (count stays 531: 492 drawing + 19 pastpapers + 20 reworded legacy — legacy PPR items carry ZERO explanationEn, unlike PPT-001). test-lazy-banks: pastpapers_reworded.json added to PHASE1_CHANGED set + content revert + check message (Phase B exception documented). test-pastpapers.mjs extended with **§9 Phase B pins** (19 new checks) + §7 updated (total 8000, reworded 500) + new topicBadge pin (textbook-reworded label takes textbook branch FIRST).

## 4. New suite pins — `scripts/test-pastpapers.mjs` §9 (19 checks, ALL PASS; suite now 50 checks)

Bank 500; ID sequence PPR-001..500; legacy prefix (first 20 byte-identical to remote, 24-key, no provenance); 28-key schema for new items; trilingual + fixed fields (draft/unverified, explanationEn == explanation, explanationUrdu null, difficulty inherited); subject convention (PPR-xxx subjectKey matches its PPT twin's); provenance inheritance (every new twin's provenance/conceptId/sourceKind/syllabusClause/source == its (a) item); split 329/151; labels 349 paper-reworded + 151 textbook-reworded + label/provenance agreement; wording-difference (0 twins share their (a) item's question); option-order-difference (0 twins share their (a) item's option order); option-set identity (all 480 sets identical to twin); correct-text identity (all 480 correct-option EN texts identical to twin); dedupe in-bank + vs other 15 banks (normalized, paired twin exempted); CI balance (each index 100..140); bySubject index 500.

## 5. Battery fixes (found by the full battery after merge; 2 adjudicated test updates + 1 data repair, no guard weakened)

- **test-lazy-banks.mjs — content.json revert check (the open issue at merge):** the revert resets `counts.bySubject` rows for the 14 subjects + "Past-Paper Topics" but NOT "Past-Paper Topics (Reworded)". In Phase A the reworded row was 20 in both current and backup, so no reset was needed; Phase B makes it 500 vs backup 20 and the comparison failed. Fix in the TEST, narrow and documented: one added reset line for the Reworded row, mirroring the Past-Paper Topics line. test-lazy-banks PASS.
- **test-provenance.mjs — "no conceptId spans two subjects":** every Phase B twin shares its conceptId with its (a) item BY DESIGN (BRIEF.md §0: "Phase B twin reuses it"), so all 451 new conceptIds now span pastpapers + pastpapers_reworded. Fix in the TEST, narrow and documented: the {pastpapers, pastpapers_reworded} pair is allowed to share; any other cross-subject sharing still fails. New pin: exactly the 451 new conceptIds span the pair — 29 second-item concepts at 4 items each (2 (a) + 2 (b)), 422 at 2 items each, equal counts per bank. test-provenance PASS (34 checks).
- **PPR-389 / PPR-393 — corrupted `question_roman` (DATA repair, B10):** the worker's substitution mangled the verbatim Arabic runs into garbage ("lafz 'id mein lafz ' kis qism ka ism hai?", "jumla 'id mein jumla ' kis zamane se talluq rakhta hai?"). Stage 5G §6 caught it (Arabic runs from the EN question missing in `_roman`). Repaired in `slices/ppr-B10.json` AND the merged bank, identically, with the runs extracted programmatically from the twin EN questions (never retyped): PPR-389 → "Urdu qawa'id ke mutabiq lafz 'کتاب' kis qism ka ism hai?"; PPR-393 → "Urdu jumla 'وہ جاتا ہے' kis zamane se talluq rakhta hai?" (the (a) items' own pattern: PPT-389 `question_roman` "Urdu qawa'id mein lafz 'کتاب' kis qism ka ism hai?"). B10 validator re-run ALL GREEN (2616); dedupe on the repaired slice shows ONLY self-matches vs the merged bank (40 FAILs, all PPR-nnn vs itself — expected post-merge behaviour, 0 non-self). Scope confirmed: exactly these 2 fields in the whole bank carried the corruption.
- **test-stage5g.mjs — explanationEn pin:** the old check asserted the reworded bank carries NO explanationEn items (true when it held only the 20 legacy items). Phase B new items carry explanationEn == explanation by design (same as Phase A). Fix in the TEST, mirroring the pastpapers check: legacy 20 carry none; all 480 new carry explanationEn == explanation. test-stage5g PASS (84 checks).

## 6. Full verification (final state)

- `npm run build` PASS, `npx tsc --noEmit` clean.
- **Full battery: 4529 checks / 68 suites, ALL GREEN** — half 1: 1713/0; half 2a: 1003/0; half 2b: 1813/0 (halves run with `/tmp` cleanup; the first half-2 attempt crashed on the 512M tmpfs filling — runner crash, not a test failure — re-run in two chunks from a clean /tmp, exactly as in Phase A). **qa-540: 52/52 PASS.** Total **4581 checks** (4529 + 52; Phase A was 4560 — delta +21 = test-pastpapers +20 (§9 19 + §8 badge 1) + test-provenance +1 net).
- **test-timeouts.mjs — intermittent wall-clock failure (NOT a Phase B defect):** the suite failed 1 check once inside the full-battery half-2b run and 3× standalone immediately after heavy runs, then passed 6/6 consecutive standalone runs when the machine was idle (final clean run 43/43). The failing checks are the wall-clock assertions ("Slow-provider chain finished near the bounds, not after the 500ms sleep", elapsed < 400ms; "Deadline caps total time near 200ms", elapsed < 600ms) — `setTimeout` overshoot on the shared 1.5-CPU VM under load. No tutor code was touched in Phase B and `test-timeouts.mjs` is NOT in the push set; the suite is unchanged. No action taken (no guard weakened, no tolerance edited).
- **Diff vs remote HEAD 334f7446 (fresh read-only clone):** 40 changed files + 2 files in the push set that are new/added below (see §7). Bank (a) `pastpapers.json` byte-identical to remote; all 14 subject banks byte-identical; `content.json` other top-level keys byte-identical; `bySubject` other keys byte-identical.
- **Production smoke (local prod server, port 3109):** home HTML carries "8000 MCQs"; routes home/library/review/mock/practice?bank=pastpapers_reworded all HTTP 200; the true reworded lazy chunk (`1h9-582dxc15-.js`, 817,621 bytes) holds 500/500 PPR ids and 0 PPT ids; zero server errors; next-server child PID 20100 killed cleanly (0 processes left). Smoke script: `~/workspace/pastpapers/smoke-ppr.cjs` (10/10 PASS).

## 7. Expected push file list (42 files; remote HEAD verified 334f7446 immediately before this report)

Changed (40): `src/data/banks/pastpapers_reworded.json`, `src/data/content.json`, `src/lib/bank-manifest.ts`, `src/app/layout.tsx`, `scripts/qa-540.mjs`, `scripts/test-lazy-banks.mjs`, `scripts/test-pastpapers.mjs`, 14× `scripts/test-phase1-*.mjs`, `scripts/test-phase4-library.mjs`, `scripts/test-phase4a.mjs`, `scripts/test-phase4b1.mjs`, `scripts/test-phase4b2.mjs`, `scripts/test-provenance.mjs`, `scripts/test-retrieval.mjs`, `scripts/test-stage5a.mjs`…`test-stage5g.mjs`, `scripts/test-step2b.mjs`, `scripts/test-step2fixes.mjs`, `scripts/test-step3a.mjs`, `scripts/test-step3b-audit1.mjs`, `scripts/test-step3b-audit2.mjs`, `scripts/test-trilanguage.mjs`, `CHANGELOG.md`.
New (1): `VERIFY-pastpapers-phaseB.md`.
NOT in the push set: `AUDIT-PHASE1.md`, `AUDIT-V2.md` (local-only, never pushed), `tsconfig.tsbuildinfo` (never pushed), `~/workspace/pastpapers/` working files (slices, validator, dedupe, merge scripts, reports, smoke script — outside the repo), `~/workspace/pastpapers/slices/ppr-B2a.json` + `ppr-B2b.json` (intermediates; the combined `ppr-B2.json` is the canonical slice).

## 8. Flags for the owner (mirrored, not resolved)

- **PPT-119's `explanation_roman` is literally the string "medium"** — a Phase A data defect in bank (a); out of Phase B scope, bank (a) untouched. Needs a repair (owner decision — it changes existing data).
- **PPT-034 explanation is positionally wrong** ("first sentence" but the correct option is the second sentence); its twin PPR-034 works around it by naming content. Bank (a) fix needs owner decision.
- PPR-444 distractor "Doubled" describes a true feature of رَبِّ (Shaddah) though not the answer; PPR-384 vs PAK-415 same fact (English = Pakistan's official language) — an (a)/(b) pair duplicating a Pak Studies bank fact; PPT-195 Iskandar Mirza dismissing four PMs (not independently re-verified); PPT-226 "originally" (7 schedules) load-bearing; PPT-243/244 (14 Badr / 70 Uhud), PPT-251 ('Iqra'); PPR-289 keeps "Yellow-green" alongside "Green" (genuinely distinct: tertiary vs secondary); PPR-262 keeps 6,236 verses (Kufi count), 6,666 distractor; PPT-470/482/483/498 soft/time-sensitive facts; all PE source items carry "(doubtful)" in syllabusClause (inherited verbatim); Drawing PPR-301..308 + PPR-286..300 carry "C1 (Scribd-only, doubtful)" verbatim.
- The [Auto-Translated] badge still sits on all rewritten Urdu (standing open flag from U1/U2); the 480 new twins' `_ur` fields were written at creation, not machine-translated, but the badge rule is unchanged.
- Mixed-explanation cleanup (33 ISL + 45 PAK + PPT-001 fields) still awaits owner decision — untouched by Phase B.
- test-timeouts.mjs wall-clock flakiness under load (see §6) — pre-existing suite behaviour, no Phase B code involved.

## 9. Working files (outside the repo)

`~/workspace/pastpapers/BRIEF-PhaseB.md` (design), `slices/ppr-B1.json`…`ppr-B12.json` (+ `ppr-B2a.json`/`ppr-B2b.json` intermediates, `ppr-source-B1.json`…`ppr-source-B12.json`), `validate-ppr-slices.cjs`, `dedupe-check-ppr.cjs`, `merge-ppr.cjs`, `smoke-ppr.cjs`, `pre-merge-pastpapers-reworded.json` (md5 `9f86c9d205d6fbb58aaf192f5e414a27`; also saved as `pre-merge-pastpapers-reworded-phaseB.json`).

No push/deploy/Git/Vercel touched by this coordinator — parent handles that. Remote HEAD must be re-verified immediately before pushing. **Phase B COMPLETE: total 7520 → 8000 MCQs.**
