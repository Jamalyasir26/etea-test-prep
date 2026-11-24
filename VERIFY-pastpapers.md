# VERIFY — Phase A: Past-Paper Topics bank 20 → 500 (2026-11-24, local; NOT deployed)

Owner decision (2026-11-24 ~17:40 PKT): **Option 3 — "Dono: multiple items per concept + textbook fill with an ACCURATE label".**
Research basis: `~/workspace/research_notes/etea-pastpapers-concept-extraction-20261116/report.md` — ZERO official ETEA/KPPSC past papers exist; ≈315 distinct concepts inventoried (319 slots, 4 overlaps); SST 0; Drawing 58 (51 Scribd-only, doubtful); PE 30 (generic guide only).
Design: BRIEF.md `~/workspace/pastpapers/BRIEF.md` — human label `pastPaperRef` (paper: "Original practice question based on past-paper topics — not the actual paper"; textbook: NEW "Original practice question based on textbook topics — not from a past paper") + machine provenance (`provenance: "past-paper-concept" | "textbook-topic"`, `conceptId` pp-<subj>-<nn> / tb-<subj>-<slug>, `sourceKind: "concept-extracted"`, `syllabusClause`). Existing 20 items untouched (provenance absent = legacy paper). New items: 28-key schema, trilingual at creation, draft/unverified, `explanation` EN only + `explanationEn` same sentence, `explanationUrdu: null`. SST: textbook label ONLY (zero paper evidence). Second items ONLY for the fixed 32-concept list, only where the second tests a genuinely different fact.

## 1. Slices — all 12 delivered, all validated green

| Slice | Range | Items | Validator | Dedupe (vs 7040) |
|---|---|---|---|---|
| S1 ENG | PPT-021..068 | 48 | 3329, 0 fail | 0 FAIL / 0 WARN |
| S2 MAT | PPT-069..104 | 36 | 1978, 0 fail | 0 / 0 |
| S3 SCI | PPT-105..150 | 46 | 2492, 0 fail | 0 / 0 |
| S4a+S4b PED | PPT-151..193 | 43 | 1193 + 1148, 0 fail | 0 / 0 |
| S5 PAK | PPT-194..239 | 46 | 2487, 0 fail | 0 / 0 |
| S6 ISL | PPT-240..278 | 39 | 2107, 0 fail | 0 / 0 |
| S7 DRW-a | PPT-279..309 | 31 | 1675, 0 fail | 0 / 0 |
| S8 DRW-b | PPT-310..343 | 34 | 1837, 0 fail | 0 / 0 |
| S9 GK+SS | PPT-344..386 | 43 | 2327, 0 fail | 0 / 0 |
| S10 URD+ARB | PPT-387..418 | 32 | 1729, 0 fail | 0 / 0 |
| S11 IT+TAJ | PPT-419..455 | 37 | 2045, 0 fail | 0 / 0 |
| S12 PE+SST | PPT-456..500 | 45 | 2484, 0 fail | 0 / 0 |

**Total: 480 new items, PPT-021..500, no ID gaps or collisions.**
- **S3** (the missing slice): re-dispatched by the finishing coordinator to worker c3c128c0; delivered 46 items (first 32 + second 4 — PPT-137 SCI-01 Mercury shortest orbit, PPT-138 SCI-06 vinegar turns blue litmus red, PPT-139 SCI-28 respiratory removes CO₂, PPT-140 SCI-29 chloroplast plant-only — + fill 10). Doubtful-evidence concepts PP-SCI-17/18/19/20/27 flagged (standard textbook facts only). Coordinator verified independently (sequential IDs, 28-key order, 36 paper / 10 textbook, balanced correctIndex 11/11/12/12).
- **S9 canonical:** `ppt-S9.json` ONLY. S9a/S9b are IGNORED duplicates. The S9b claim of 2 validation failures (PPT-345, PPT-374 digit mismatches) was disproven by independent re-run: ALL GREEN 2327 checks, md5 `ef4fa7cde3d4a393d82bbdb2f82e6cc6`. S9 swap: PP-GK-10 could not support an honest timeless item → PPT-353 is an extra textbook fill (tb-gk-largest-hot-desert). Provenance split shifts by 1: paper **329** / textbook **151** (was 330/150).

## 2. Merge fixes (coordinator)

- **FIX 1 — S4 conceptId typo:** 19 items PPT-151..169 carried `pp-pp-ped-<nn>`; fixed in ppt-S4a.json, ppt-S4.json regenerated (S4a 22 + S4b 21 = 43), re-validated green, re-merged. Post-fix: 29 second-item concepts in-new (other 3 seconds pair with legacy first items ENG-13/14, ISL-16 — correct, 32 total).
- **FIX 2 — cross-slice duplicates:** PPT-497 (gold symbol) duplicated PPT-144; PPT-500 (Red Planet) duplicated PPT-105; PPT-191 (hidden curriculum) same correct answer as PPT-170. All three replaced (PPT-497 subjunctive mood tb-sst-grammar-subjunctive; PPT-500 line slope tb-sst-algebra-slope; PPT-191 guidance tb-ped-guidance). Validator green; dedupe re-run shows ONLY self-matches vs the merged bank (index now 7520) — 0 non-self FAILs.
- **FIX 3 — correctIndex normalization (N-PPT-1):** correctIndex was 250/480 at index 0 (S1 47/48, S2 35/36, S10 30/32, S4 31/43, S5 30/46). Deterministic option rotation applied to slices S1/S2/S4a/S4b/S5/S7/S10 (130 items rotated); verified against pre-rotation merged bank: option SETS identical and correct-answer text identical in EN/UR/Roman for all 236 checked items (only intentional PPT-191 replacement differs). Final distribution **122/120/126/112** at first merge; after the §7 PPT-494 replacement (below) **122/121/125/112**.

## 3. Final merge (2026-11-24, re-run after §6/§7 fixes)

500 items; first 20 byte-identical to pre-merge backup (md5 `7612d39b46ba`, deep-equal to remote HEAD e6160d88's 20 and to `pre-merge-pastpapers.json`); provenance paper **329** / textbook **151**; 0 exact-duplicate questions; 0 duplicate textbook conceptIds; 451 distinct conceptIds (300 paper distinct + 151 textbook). Merged bank `src/data/banks/pastpapers.json` (954,743 bytes). Per-slice provenance: S1 38/10, S2 26/10, S3 36/10, S4 33/10, S5 36/10, S6 24/15, S7 31/0, S8 29/5, S9 22/21, S10 12/20, S11 12/25, S12 30/15.

## 4. Count ripple (Phase A)

- `content.json`: total 7040→**7520**; Past-Paper Topics row 20→500; `bySubject.pastpapers` index 20→500 ids (rows sum 7520). `bank-manifest.ts` regenerated (pastpapers: 500, reworded: 20). `layout.tsx` meta "7040 MCQs"→"7520 MCQs".
- `src/lib/data.ts` (already in repo before this coordinator): `Question.provenance?` + `topicBadge()` textbook branch (checked FIRST, before reworded; UR "نصابی موضوع سے · اصل/دوبارہ لکھا گیا", Roman "Nisabi mauzu se · Asal/Dobara likha gaya", EN "Textbook-topic · Original/Reworded", EN detail = stored string verbatim).

## 5. New suite `scripts/test-pastpapers.mjs` (30 checks, ALL PASS)

Counts/order/legacy prefix; 28-key schema; trilingual completeness; fixed fields (draft/unverified, explanationEn == explanation); provenance split 329/151; labels 349/151 + label/provenance agreement; seconds 29 in-new + legacy-paired ENG-13/14 + ISL-16; textbook conceptIds unique; ledger coverage (300 distinct paper concepts = 297 true firsts + 3 legacy-paired; PP-GK-10 has no paper item; PPT-353 = tb-gk-largest-hot-desert); dedupe (no duplicate EN questions in-bank or vs other 15 banks, normalized); correctIndex balanced 100..140 each; counts ripple (content.json 7520/500/20, bySubject index 500, manifest 500/20/7520); topicBadge branches via tsc harness (textbook FIRST, original, reworded, null).

## 6. Stage 5G §6 script fix (data defect found at merge; fixed, NOT waived)

189 Arabic-script-verbatim violations in S10 (PPT-389..418) + S11-TAJ (PPT-441..452) — workers transliterated quoted/tested Urdu/Arabic words in `_roman` instead of carrying them verbatim (5B/5C pattern: URD-001 `question_roman` "'دوست' ka mutradif…"; ARB-064 EN sentence كَتَبَ عَلِيٌّ اَلدَّرْسَ verbatim in both `_ur` and `_roman`; TAJ-037 "Lafz Yarmaloon (يَرْمَلُون)…"). Fix worker d257033b repaired slices/ppt-S10.json (28 items) + ppt-S11.json (12 items) in place — 121 run-level changes, all mechanical and EN-sourced, nothing retyped; includes codepoint variants (EN 'كتاب' Arabic kaf U+0643 vs `_ur` 'کتاب' Urdu kaf U+06A9; هجرة vs ہجرت). Report: `slices/ppt-S10-S11-SCRIPTFIX-REPORT.md`; audit script `check-s10-s11-s6.cjs` (replicates §6 exactly). **§6 audit: 189 → 0 violations (PASS).** Coordinator verified independently: only `question_ur` (6), `question_roman` (27), `options_roman` (22 items) changed; options, correctIndex, `options_ur`, explanations, provenance, conceptId byte-identical per item; JSON formatting preserved. Dedupe on the fixed slices: only self-matches (32 + 37 FAILs, 0 non-self).
- **Validator adjudication (coordinator, 2026-11-24):** `validate-ppt-slices.cjs` had a blanket "no Arabic script in `_roman`" rule that directly conflicted with §6 (115 failures on the fixed slices, all that one rule). The rule is narrowed, not weakened: an Arabic-script run in a `_roman` field is allowed ONLY when the run appears verbatim in the corresponding EN field (mirroring §6); any run NOT in the EN field still fails. Validator now ALL GREEN on S10 (1708) + S11 (3543). The validator's header comment records the adjudication.

## 7. Battery fixes (found by the full battery after merge; all data fixes, no guard weakened)

- **PPT-339 (S8) — Nastaliq:** EN options carried "Nastaliq script" / `options_roman` "Nastaliq", tripping test-fonts' zero-Nastaliq rule (owner-cancelled font; the rule bans the string anywhere under src/). Fixed to "Nasta'liq" (apostrophe form, the Drawing bank's own convention — DRW items use "Nasta'liq"). test-fonts PASS.
- **PPT-494 (S12) — stem collision:** "Use pi = 22/7. What is the area of a circle with radius 7 cm?" shares its first-12-words stem with MAT-259 (same fact, radius 14) — qa-540 stem rule failed in all 14 phase1 suites. Replaced with rectangle perimeter (tb-sst-geometry-rectangle-perimeter): "What is the perimeter of a rectangle 12 cm long and 8 cm wide?", options 20/40/96/32 cm, correctIndex 1, easy. All 14 phase1 suites PASS.
- **PPT-390 / PPT-393 / PPT-395 (S10) — F02 Roman-Urdu detector:** their EN explanations named the tested Urdu words ("Yeh…", "Jata hai…Haal", "Se…"), tripping the F02 guard (≥2 hits: PPT-393) and the "every explanationEn is RU-free" check (PPT-390 "yeh", PPT-395 "se"). EN explanations reworded to name the form without the detector words ("This demonstrative…", "The verb form describes…", "This postposition…"), `explanation` == `explanationEn` kept, `_ur`/`_roman` explanations unchanged (they correctly carry the tested words). test-step3b-audit2 PASS.
- **F02 pin updates (mechanical count literals, Phase A design):** the 480 new items carry `explanationEn` == `explanation` by design (their stored explanation IS English), so the legacy "124 items carry explanationEn" pins now read 604 (124 legacy + 480) in test-phase4a / test-phase4b1 / test-phase4b2 / test-step3b-audit2, and "EN by bank: pastpapers 1" → 481 (PPT-001 + 480 new). No other F02 invariant changed: roman-marker count still 196, pendingEnglish still 196, no item has both `explanationEn` and the marker.

## 8. Full verification (final state)

- `npm run build` PASS, `npx tsc --noEmit` clean.
- **Full battery: 4508 checks / 68 suites, ALL GREEN** — half 1: 1726/0; half 2a: 1037/0; half 2b: 1745/0 (halves run with `/tmp` cleanup; the first half-2 attempt crashed on the 512M tmpfs filling — runner crash, not a test failure — re-run in two chunks from a clean /tmp). **qa-540: 52/52 PASS.**
- Suite pins (mechanical, count literals only): 7040→7520 in 35 files (phase1 ×14, phase4a/b1/b2/library, provenance, retrieval, step2b, step2fixes, step3a, step3b-audit1/2, trilanguage, stage5a–g, lazy-banks, qa-540) + pastpapers: 20→500 in all 14 EXPECTED_OTHER maps + qa-540 EXPECTED map (reworded stays 20). stage5g pastpapers bank 20→500; triple-loop expected 20→500; MCQ_ORIG_KEYS += "provenance"; pastPaperRef check pins 349 ORIG_LABEL + 151 TB_LABEL. lazy-banks: pastpapers added to content revert (row + index) and to PHASE1_CHANGED set as Phase A exception.
- **Diff vs remote HEAD e6160d88 (fresh read-only clone):** 41 changed files + 2 new files (see §9). Every changed suite differs ONLY in the intended pins (spot-checked: phase1-islamiyat, stage5a, trilanguage, stage5g, lazy-banks, phase4a, step3b-audit2, qa-540, data.ts, layout.tsx, bank-manifest.ts, content.json counts). `content.json` other top-level keys byte-identical. `data.ts` diff is ONLY the provenance comment block (the `provenance?` type + `topicBadge()` branch were already in the repo).
- **Production smoke (local prod server, port 3107):** home HTML carries "7520 MCQs"; routes home/library/review/mock/practice?bank=pastpapers all HTTP 200; pastpapers bank data present in built lazy chunks; zero server errors; next-server child PID killed cleanly (0 processes left).

## 9. Expected push file list (43 files; remote HEAD verified e6160d88 immediately before this report)

Changed (41): `src/data/banks/pastpapers.json`, `src/data/content.json`, `src/lib/bank-manifest.ts`, `src/app/layout.tsx`, `src/lib/data.ts`, `scripts/qa-540.mjs`, `scripts/test-lazy-banks.mjs`, 14× `scripts/test-phase1-*.mjs`, `scripts/test-phase4-library.mjs`, `scripts/test-phase4a.mjs`, `scripts/test-phase4b1.mjs`, `scripts/test-phase4b2.mjs`, `scripts/test-provenance.mjs`, `scripts/test-retrieval.mjs`, `scripts/test-stage5a.mjs`…`test-stage5g.mjs`, `scripts/test-step2b.mjs`, `scripts/test-step2fixes.mjs`, `scripts/test-step3a.mjs`, `scripts/test-step3b-audit1.mjs`, `scripts/test-step3b-audit2.mjs`, `scripts/test-trilanguage.mjs`, `CHANGELOG.md`.
New (2): `scripts/test-pastpapers.mjs`, `VERIFY-pastpapers.md`.
NOT in the push set: `AUDIT-PHASE1.md`, `AUDIT-V2.md` (local-only, never pushed), `tsconfig.tsbuildinfo` (never pushed), `~/workspace/pastpapers/` working files (slices, validator, reports — outside the repo).

## 10. Flags for the owner (mirrored, not resolved)

- Doubtful-evidence concepts PP-SCI-17/18/19/20/27 (S3): standard textbook facts only, per BRIEF.
- Drawing/PE paper evidence is thin (Drawing 51/58 Scribd-only; PE generic guide) — the textbook-fill label carries that honestly; SST is textbook-only by design.
- The [Auto-Translated] badge still sits on all rewritten Urdu (standing open flag from U1/U2); the new 480 items' `_ur` fields were written at creation, not machine-translated, but the badge rule is unchanged.
- Mixed-explanation cleanup (33 ISL + 45 PAK + PPT-001 fields) still awaits owner decision — untouched by Phase A.

## 11. Next step (NOT started)

**Phase B — bank (b) pastpapers_reworded 20 → 500** (reworded 1:1 twins of the 500 paper-bank items, same pattern, reword workers paired by ID range). Expected push set: pastpapers_reworded.json + manifest + suites + VERIFY + CHANGELOG; total 7520→8000. Parent to dispatch after Phase A is pushed/deployed.

No push/deploy/Git/Vercel touched by this coordinator — parent handles that. Remote HEAD must be re-verified immediately before pushing.
