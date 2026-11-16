# VERIFY — Phase 1, Subject 6: Maths bank 45 → 500 MCQs

Date: 2026-11-16. Local work only — NOT deployed. The parent agent handles the single-commit push, deploy, and live click-through verification. GitHub HEAD at start: `e16dfc7` (Phase 1, Subject 5 — Urdu).

## 1. What was added

455 NEW items, IDs **MAT-046 – MAT-500**, appended sequentially to `src/data/banks/maths.json` (no gaps, no renumbering). Each item was written trilingually at creation: English source + Urdu script + Roman Urdu, all 6 fields (`question`/`options`/`explanation` × `_ur`/`_roman`). The existing 45 items (MAT-001–MAT-045) were NOT modified: the bank file's bytes up to the end of MAT-045 are an exact prefix of the pre-batch file (verified by the lazybanks byte-prefix check, §7).

ID scheme: the existing bank's prefix `MAT-` + zero-padded 3-digit sequence, continued exactly.

Every new item carries the full 23-key schema in the existing items' key order (id, question_ur, question_roman, options_ur, options_roman, explanation_ur, explanation_roman, post, subject, subjectKey, topic, question, options, correctIndex, explanation, explanationUrdu, difficulty, pastPaperRef, verified, source, reviewStatus, reviewedBy, reviewedAt), with:
- `post`: the same 13-post array as every existing item: `["zamungkor","tt","at","pst","ct","ctit","dm","pet","qari","junior-clerk","computer-operator","police","forest"]`
- `subject`: `"Maths"`, `subjectKey`: `"maths"`, `difficulty`: `"medium"`
- `explanationUrdu`: `null`, `pastPaperRef`: `null`, `verified`: `false`, `reviewStatus`: `"draft"`, `reviewedBy`: `null`, `reviewedAt`: `null`
- `source`: `Original — concept-extracted from Standard School Mathematics Curriculum (Classes 5-10)` (exact string, em-dash U+2014, identical on every new item)

No item is marked verified — content is verified by the OWNER via /review only. No ETEA authorship is claimed anywhere. No backup was recreated (per the task brief).

## 2. Coverage table (§3.6 topic map)

The existing 45 items were classified by content (all 45 carry topic `"Maths"` in the bank, so classification was by the question's subject matter). New-item topic labels are `Maths — <topic>`; the coverage table in the new suite embeds the existing-45 classification and asserts the full distribution.

| Topic (§3.6) | Existing | New | Total | Map allocation |
|---|---:|---:|---:|---:|
| Number Systems & Operations | 13 | 57 | 70 | 70 |
| Percentages, Ratio & Proportion | 16 | 54 | 70 | 70 |
| Algebra | 9 | 61 | 70 | 70 |
| Geometry | 2 | 68 | 70 | 70 |
| Trigonometry | 0 | 40 | 40 | 40 |
| Coordinate Geometry & Graphs | 0 | 40 | 40 | 40 |
| Sets, Functions, Matrices & Logarithms | 0 | 40 | 40 | 40 |
| Statistics & Probability | 0 | 40 | 40 | 40 |
| Applied Arithmetic | 5 | 30 | 35 | 35 |
| Logic & Reasoning | 0 | 25 | 25 | 25 |
| **Total** | **45** | **455** | **500** | **500** |

Existing-45 classification (by content): Number Systems 13 (MAT-001,002,003,004,006,007,008,009,031,032,033,034,035); Percentages/Ratio 16 (MAT-005,010,011,012,013,014,015,016,026,027,030,036,037,038,041,045); Algebra 9 (MAT-017,018,019,020,021,039,040,043,044); Geometry 2 (MAT-028,029); Applied Arithmetic 5 (MAT-022,023,024,025,042). All map allocations are met exactly — no topic exceeds its allocation.

## 3. Slice inventory (24 slices, 24 workers, 0 omissions)

| Slice | IDs | Topic(s) | Count |
|---|---|---|---:|
| S01 | MAT-046–064 | Number Systems | 19 |
| S02 | MAT-065–083 | Number Systems | 19 |
| S03 | MAT-084–102 | Number Systems | 19 |
| S04 | MAT-103–120 | Percentages/Ratio | 18 |
| S05 | MAT-121–138 | Percentages/Ratio | 18 |
| S06 | MAT-139–156 | Percentages/Ratio | 18 |
| S07 | MAT-157–176 | Algebra | 20 |
| S08 | MAT-177–196 | Algebra | 20 |
| S09 | MAT-197–217 | Algebra | 21 |
| S10 | MAT-218–234 | Geometry | 17 |
| S11 | MAT-235–251 | Geometry | 17 |
| S12 | MAT-252–268 | Geometry | 17 |
| S13 | MAT-269–285 | Geometry | 17 |
| S14 | MAT-286–305 | Trigonometry | 20 |
| S15 | MAT-306–325 | Trigonometry | 20 |
| S16 | MAT-326–345 | Coordinate Geometry & Graphs | 20 |
| S17 | MAT-346–365 | Coordinate Geometry & Graphs | 20 |
| S18 | MAT-366–385 | Sets/Functions/Matrices/Logs | 20 |
| S19 | MAT-386–405 | Sets/Functions/Matrices/Logs | 20 |
| S20 | MAT-406–425 | Statistics & Probability | 20 |
| S21 | MAT-426–445 | Statistics & Probability | 20 |
| S22 | MAT-446–460 | Applied Arithmetic | 15 |
| S23 | MAT-461–475 | Applied Arithmetic | 15 |
| S24 | MAT-476–500 | Logic & Reasoning | 25 |

All 24 slice workers completed; no slice reported an omitted slot. Slice sources: `~/workspace/phase1-maths/slice-01.json` … `slice-24.json` (kept in sync with every post-merge item fix). Every slice passed the coordinator's 18-check slice validator (`~/workspace/phase1-maths/validate-slice.mjs`) before merging, plus a codepoint scan (zero U+2028/U+2029, zero non-ASCII strays outside Urdu script + the em-dash in the mandated `source`/`topic` strings; source/topic prefixes byte-match the known-good Urdu bank reference).

## 4. Merge findings

**Validator bug (found by the S06 worker, fixed before most slices validated):** the slice validator's `NON_ASCII_SYM` regex wrongly included en/em-dash, which the mandated `source` and `topic` strings necessarily contain — no compliant slice could pass. Fixed by removing `–—` from the regex; the fix note was sent to all still-running workers; S06 re-validated 18/18 clean. Workers that finished before the fix correctly did NOT alter the exact strings.

**Merge:** `~/workspace/phase1-maths/merge.mjs` appended the 455 new items byte-preserving and updated `content.json` (total 3361, Maths 500, `bySubject.maths` 500 ids). Output: "OK: maths.json merged, 500 items, first 45 deep-equal, bytes preserved."

**Dedupe audits (log `/tmp/maths-audit.log`):**
- Exact-duplicate scan: 0 duplicates across all 500 items (normalized question text).
- Jaccard scan (threshold 0.55, stopwords removed, all 500): 69 flagged pairs, ALL inspected. 68 are distinct-fact template siblings (same template family, different computation/answer) — kept. **1 genuine collision fixed: MAT-342 and MAT-355 both asked the slope through (1,2),(3,8).** MAT-355 was rewritten (coordinator edit, slice-17.json kept in sync, key order preserved): new points (1,3),(4,9), slope 2, options `["6","2","3","1/2"]`, correctIndex 1, all 3 languages. Slice-17 re-validated; the Jaccard pair is gone (68 inspected pairs remain).
- Answer-token scan: 16 warnings, all false positives on inspection (spaced fractions `"3 / 5"` vs `"3/5"`; MAT-199/MAT-497 explanations contain the answer text).
- The qa-540 stem rule (distinguishing number within the first 8 words of each stem) holds across all banks including the new items.

**Stratified sample recompute:** the coordinator independently re-verified 48 items by hand (first + middle item of each slice: arithmetic, geometry, trigonometry, coordinate geometry, sets, statistics, probability, series) — ALL correct, with the working shown in each explanation.

**Translation spot-checks:** MAT-316 and MAT-461 checked in all three languages — faithful, convention-consistent, digits identical.

## 5. Stage 5D fix rounds (first full run: 3 failures in `test-stage5d.mjs`, all fixed in ITEMS — no check weakened)

1. **Stale pin:** "5D maths bank still 45 items" → 500 (a 1:1 count update, same class as the rest of the ripple; the stale stage5d header comment "Maths (45 MCQs + 7 notes)" → 500 as well).
2. **5D operator-count check** (order-sensitive JSON comparison of `= + - * / × ÷ % √ −` counts per field):
   - MAT-134: translations dropped one `=` (EN has 4, translations had 3). `explanation_ur`/`explanation_roman` rewritten to mirror 4 `=` with identical digit runs.
   - MAT-158: translations reordered operators (`=` before `+`, EN has `+` before `=`). `question_ur`/`question_roman` reordered to expression-first ("5p + 8 … jab p = 9"), same digits.
   - Fixes applied by surgical text replacement to the BANK file + `slice-05.json`/`slice-07.json` (20/18/2 replacements respectively); all files still valid JSON; byte-prefix preserved.
3. **5D PURE_EXPR verbatim check** (options matching `/^[\d\s\/\.\+\-=\%\(\)xX\:\^\u2212]+$/` must be byte-identical in `_ur`/`_roman`): 16 ratio options (MAT-121..124, `"نسبت 4:7"` etc. in `_ur`) violated it. Fix: stripped the `"نسبت"` prefix — `options_ur` now byte-identical; `_roman` already was. **Consequence:** the slice validator and the new suite were aligned to the 5D rule — `isVerbatimOption()` = parseNumeric OR PURE_EXPR (ratios now count as verbatim-style, not word options). All three classifiers now agree.
4. After the fixes: stage5d passes (68 checks, 0 failures); the new suite passes. Slice validators re-run post-merge show ONLY the known self-duplicate artifact (slice vs merged bank, same as the Urdu batch documented) — not a defect.

## 6. Counts + manifest ripple

- **Bank manifest:** `npm run prebuild` run twice, byte-identical both times. sha256 `b701e07f9d59829d419876ed850874fb03f57dfa06e2d2c2cd8d130d67e69734`. Maths 500, 3361 total ids, BANK_TRUSTED maths still 1 (MAT-022, owner-reviewed, unchanged).
- **`content.json`:** counts 2906 → 3361; Maths count 500; `bySubject.maths` extended to 500 ids. Note data untouched (151 notes).
- **`src/app/layout.tsx`:** meta description count 2906 → 3361.
- **`2906` → `3361`** in 26 files: 25 scripts + `layout.tsx`. The scripts: `qa-540.mjs`, `test-lazy-banks.mjs`, `test-phase1-arabic.mjs`, `test-phase1-english.mjs`, `test-phase1-islamiyat.mjs`, `test-phase1-tajweed.mjs`, `test-phase1-urdu.mjs`, `test-phase4a.mjs`, `test-phase4b1.mjs`, `test-phase4b2.mjs`, `test-provenance.mjs`, `test-retrieval.mjs`, `test-stage5a.mjs`, `test-stage5b.mjs`, `test-stage5c.mjs`, `test-stage5d.mjs`, `test-stage5e.mjs`, `test-stage5f.mjs`, `test-stage5g.mjs`, `test-step2b.mjs`, `test-step2fixes.mjs`, `test-step3a.mjs`, `test-step3b-audit1.mjs`, `test-step3b-audit2.mjs`, `test-trilanguage.mjs`.
- **`maths: 45` → `maths: 500`** in qa-540's EXPECTED + all five prior Phase 1 suites' EXPECTED_OTHER. Stage 5D expected-count table `["maths","maths",45]` → 500. qa-540 header comment updated to name all six Phase 1 batches.
- **Lazy-banks suite extended:** the Phase 1 exception now covers 7 files (added `maths.json`), a maths byte-prefix check was added (+1 check), the `content.json` revert was extended with the Maths row + `bySubject.maths`, and a stale header comment was corrected.
- **Ledger:** recomputes from data — 12 rows, **8 Exact / 1 Proxy / 3 Partial (unchanged)**; tracks mapping Maths show 500 MCQs / 7 notes.
- **Mocks:** the 3 fixed ZamungKor lists (100 IDs each) still resolve and stay disjoint; dynamic sampling verified via the lazybanks three-way availability check (bank file → manifest → bundle).
- **No other bank or subject was touched.** The lazybanks backup byte-compare passes: all non-Phase-1 files byte-identical to the pre-lazyload backup.

## 7. Tests + build

New suite `scripts/test-phase1-maths.mjs`, wired as `test:phase1maths` in `package.json` — **31 checks**: shape/IDs, 23-key schema, dedupe + stem rule, correctIndex distribution, honorific/script/digit/F02 audits, numeric-option convention + numeric distinctness + banned-symbol audits, topic-coverage table (with the embedded existing-45 classification), manifest match, no-other-bank scope, fixed-mock resolution.

New-item `correctIndex` distribution: **112 / 116 / 118 / 109 (24.6% / 25.5% / 25.9% / 24.0%)** — inside the 20–30% band, asserted by the suite.

| Check | Baseline (before changes) | Final |
|---|---|---|
| `npm run build` | PASS | **PASS** |
| `npx tsc --noEmit` | clean | **clean** |
| Suites | 3161 checks / 46 suites, 0 failures | **3193 checks / 47 suites, 0 failures** |

Final counts reconcile exactly: 3161 + 31 (new suite) + 1 (lazybanks maths prefix pin) = 3193. Full-run log: `/tmp/suites-final2-maths.log`; build log: `/tmp/maths-final-build2.log`.

**Local prod smoke test** (server started, verified, stopped): all 14 routes + `/mock/tt-B`, `/tracks/tt`, `/robots.txt` returned **HTTP 200**; home HTML carries "3361 MCQs"; the Maths lazy chunk (`2875e6_56tou2.js`, 552,796 bytes) serves HTTP 200 and contains MAT-046 and MAT-500.

## 8. Caveats / flags for the owner

- **All 455 new items are `draft` / unverified.** The owner verifies via /review, as with the five prior Phase 1 batches. The coordinator's 48-item stratified recompute found no errors, but it is not owner verification.
- **No terminology flags** arose in this batch (unlike URD-068–070 in the Urdu batch). The one content collision found (MAT-355) was fixed during the batch, not left flagged.
- **Translation convention note:** new items follow the existing Maths bank's convention — Latin units (`Rs.`, `years`, `cm`, `sq cm`) are byte-identical across all three languages, and Urdu-script questions mix Urdu with Latin units exactly as MAT-001–045 do. Numeric and pure-expression options (including ratios like `4:7`) are byte-identical across languages per the Stage 5D rule.
- **Known pre-existing items untouched by this batch:** COMP_B.ct Pak Studies 10 vs Social Studies 10; SST-ETEA mock only 40Q non-subject part; the stale "AI Tutor — live, not yet tested with a real key" home line; the 9 cross-bank overlapping facts (owner decision pending).
- **Live click-through** (practice in all 3 languages, mock, /review, Library, tutor) is the parent's pass after deploy — lazy loading means question text is not in SSR HTML.

## 9. Files changed (33, for the parent's single-commit push)

- `src/data/banks/maths.json` — 45 → 500 items (additive only)
- `src/data/content.json` — counts + bySubject.maths
- `src/lib/bank-manifest.ts` — regenerated (sha256 b701e07f…)
- `src/app/layout.tsx` — meta count 2906 → 3361
- `package.json` — `test:phase1maths` script
- `CHANGELOG.md` — Phase 1 Subject 6 entry
- `VERIFY-phase1-maths.md` — this report
- `scripts/test-phase1-maths.mjs` — NEW suite (31 checks)
- 25 scripts with count pins (§6 list above)

The parent should verify the exact file list by diffing against HEAD `e16dfc7` before pushing.
