# VERIFY — Stage 5E: Science + Pak Studies + Social Studies + Pedagogy translation batch (Urdu script + Roman Urdu)

Owner order (FINAL, full completion, 2026-11-14): translate ALL remaining subjects into BOTH Urdu script AND Roman Urdu, subject-wise batches with a build test after each, badge where translated, English fallback until translated, ONE deploy at the end. This batch: Science + Pak Studies + Social Studies + Pedagogy. No push/deploy from this batch — the parent handles the single push, deploy, and live browser verification after ALL remaining batches (5E–5G).

## 1. Baseline

Before any change (2026-11-14): `npm run build` PASS, `npx tsc --noEmit` clean (strict), all suites green — **2764 checks / 37 suites, 0 failures**. GitHub HEAD `d8bdbb4`. The backup `~/workspace/etea-prep-next-backup-pre-stage5/` was left untouched (not recreated).

## 2. Pattern followed (Stage 5A/5B/5C/5D, unchanged)

Translation data ONLY. No schema, resolver, rendering, fallback, or badge change was needed: the 5A resolvers (`resolveQuestionView` / `resolveNoteView` in `src/lib/data.ts`) are subject-agnostic, item-level fallback and the literal `[Auto-Translated]` badge are reused untouched. Flat fields `question_ur` / `question_roman`, `options_ur` / `options_roman`, `explanation_ur` / `explanation_roman` inserted after `id` in the bank files; notes gain `title_ur` / `title_roman`, `body_ur` / `body_roman` appended after `body` / `title` in `content.json`. `quran-examples.json` and `/review` untouched (suite-guarded). `drawing_pe.json` (dead/unregistered) untouched.

## 3. Translation record

**Done — ALL 135 MCQs + ALL 32 notes, none omitted, none pending:**

- Science: SCI-001–SCI-030 (30 MCQs) + 8 notes.
- Pak Studies: PAK-001–PAK-045 (45 MCQs) + 7 notes.
- Social Studies: SS-001–SS-030 (30 MCQs) + 4 notes.
- Pedagogy: PED-001–PED-030 (30 MCQs) + 13 notes.

Pending IDs: none. Untranslated-on-purpose IDs: none.

Work was split into 10 slices (9×15 MCQs + 32 notes) translated in parallel; source slices in `~/workspace/stage5e-translations/src/`, outputs in `~/workspace/stage5e-translations/out/`, validated and merged by `~/workspace/stage5e-translations/merge.mjs` (field completeness, verbatim rules, digit preservation incl. the PAK sub/super invariant, honorific/gloss guards, Arabic-verbatim, then strip-checks: stripping the new keys must reproduce the pre-merge files byte-identically; originals restored on failure). All 10 translation workers completed with all items; no slice needed re-dispatch.

### ExplanationEn inspection result (required by the task)

Science and Pak Studies ALL carry `explanationEn` (30 + 45). Each stored `explanation` was inspected before translation:

- **Science (30/30): pure Roman-Urdu originals.** The stored `explanation` is Roman Urdu (e.g. "Vitamin C ki kami se scurvy hota hai…"); `explanationEn` is the English version. None starts with its `explanationEn`; none carries a "Roman Urdu:" label. Handled per the verbatim rule: `explanation_roman` = byte-exact copy of `explanation` (forced at merge; **0 mismatches** — every slice already matched), `explanation_ur` = Urdu-script translation of the Roman original.
- **Pak Studies (45/45): MIXED fields.** Every stored `explanation` = an English sentence + a Roman-Urdu sentence saying the same thing, and every one starts with its `explanationEn` sentence (verified: 45/45, zero exceptions). Handled per the standing mixed-explanation rule: `explanation_roman` = verbatim copy of the WHOLE mixed field (forced at merge; 0 mismatches), `explanation_ur` = ONE clean Urdu-script rendering of the meaning. Where the two source sentences carry DIFFERENT facts (PAK-024: 18th Amendment + provinces point; PAK-029: 1973–1977 dates + first-PM-under-1973-Constitution point), `explanation_ur` combines both facts into one sentence rather than dropping either — this is why the PAK `_ur` digit check uses the sub/super multiset invariant (see §5). All 45 IDs are flagged in §3.1 below; source data was NOT rewritten.
- **Social Studies + Pedagogy (60/60): no `explanationEn`.** Plain English explanations, translated to both languages.
- **Roman-marked items (`explanationLang: "roman"`): 0** in 5E scope. **"Roman Urdu:" gloss sentences in MCQ fields: 0** in 5E scope.

### 3.1 Mixed-explanation flags (standing rule: verbatim copy + flag, no source rewrite)

All 45 Pak Studies items are mixed (English + Roman in one `explanation` field). Their `explanation_roman` therefore shows the same mix in Roman mode — the same handling as the 33 known Islamiyat mixed cases, whose cleanup (rewriting 33 source fields) awaits an owner decision. IDs: PAK-001, PAK-002, PAK-003, PAK-004, PAK-005, PAK-006, PAK-007, PAK-008, PAK-009, PAK-010, PAK-011, PAK-012, PAK-013, PAK-014, PAK-015, PAK-016, PAK-017, PAK-018, PAK-019, PAK-020, PAK-021, PAK-022, PAK-023, PAK-024, PAK-025, PAK-026, PAK-027, PAK-028, PAK-029, PAK-030, PAK-031, PAK-032, PAK-033, PAK-034, PAK-035, PAK-036, PAK-037, PAK-038, PAK-039, PAK-040, PAK-041, PAK-042, PAK-043, PAK-044, PAK-045. The Urdu-script translations (`explanation_ur`) are clean single renderings. No other mixed explanations were found in 5E scope (Science explanations are purely Roman, not mixed).

### 5E-specific handling (decided, documented, suite-guarded)

- **Science:** formulas (H2O, CO2, NaCl, O2), unit names (Newton, Pascal, Joule, Watt), planet/ocean names, and scientific terms kept in Latin script in both languages, matching the source explanations' terminology; everyday words translated. Digits preserved in both languages.
- **Pak Studies:** names in Urdu script in `_ur`, source Latin spelling in `_roman`; dates keep digits, month names in Urdu script in `_ur`. "K2" kept as-is in both languages (PAK-037).
- **Social Studies / Pedagogy:** technical terms transliterated consistently (e.g. Bloom's taxonomy = بلوم کی درجہ بندی / Bloom ki darja bandi; ZPD kept intact in both languages). PED-019's shortened option "Autonomy vs shame" preserved as-is (no "and doubt" added).
- **Honorifics (5B convention):** none occurred in 5E scope (audited). Zero Latin abbreviations ((SAW)/(RA)/(PBUH)) in either language, machine-checked.
- **Arabic script:** none anywhere in 5E scope (audited). No reference, date, or fact invented or altered.
- **Notes:** the 2 notes carrying a "Roman Urdu:" gloss sentence — General Science "Vitamins and Deficiency Diseases" and Pedagogy "Bruner — Spiral Curriculum and Modes of Representation" — follow the gloss rule (label dropped, gloss verbatim in `_roman`, translated in `_ur`), suite-guarded with exact-string checks.
- **K2 coordinator fix (translation slice, not source data):** the notes worker had transliterated "K2" as کے ٹو in both Geography note `_ur` bodies, dropping the digit. Both occurrences were corrected to "K2" (Latin) before merge, consistent with PAK-037 and the digit rule; suite-guarded.
- **Fidelity:** option order preserved exactly everywhere; proper names, dates, and technical terms intact.

## 4. Files changed (5E's own share)

Data (insertions-only vs the pre-Stage-5 backup; stripping the new keys reproduces the backup files byte-identically):

- `src/data/banks/science.json` — +480/−0 lines; first new field at line 4 (`question_ur`, SCI-001).
- `src/data/banks/pakstudies.json` — +720/−0 lines; first new field at line 4 (`question_ur`, PAK-001).
- `src/data/banks/socialstudies.json` — +480/−0 lines; first new field at line 4 (`question_ur`, SS-001).
- `src/data/banks/pedagogy.json` — +480/−0 lines; first new field at line 4 (`question_ur`, PED-001).
- `src/data/content.json` — General Science (8), Pak Studies (7), Social Studies (4), Pedagogy (13) notes gain the 4 translation fields; deep-identical to the backup after stripping the new note keys.

`correctIndex`, answers, `reviewStatus`, `verified`, `source`, `explanation`, `explanationEn`, `explanationUrdu` byte-identical in all four banks. Only the 11 expected banks differ from the backup (islamiyat, tajweed, arabic, urdu, english, maths, gk from prior batches + science, pakstudies, socialstudies, pedagogy from this one). Pre-existing key found: `sourceNote` on all 30 socialstudies items (also on drawing/pe banks) — present in the pre-Stage-5 backup, not added by 5E.

Tests + docs:

- `scripts/test-stage5e.mjs` (new, 82 checks) + `package.json:71` (`test:stage5e` script).
- Scope guards updated 1:1 in `scripts/test-stage5a.mjs` (§5/§6), `scripts/test-stage5b.mjs` (§6/§7), `scripts/test-stage5c.mjs` (§6/§7), `scripts/test-stage5d.mjs` (§8/§9, incl. its "7 translated banks/subjects" check names → 11) to allow the eleven translated banks/subjects — same pattern prior batches used.
- `CHANGELOG.md` — Stage 5E entry appended.
- This report: `VERIFY-stage5e.md`.

## 5. Suite interactions found + fixed (1:1, intent preserved)

1. **PAK `_ur` digit invariant (check-side, merge validator + suite).** The first merge validation flagged PAK-029: `explanation_ur` has digits [1973, 1973, 1977] vs `explanationEn`'s [1973, 1977] — correct, because the two source sentences carry different facts and `_ur` combines both. The invariant is now: PAK `_ur` digits must be a sub-multiset of the FULL mixed explanation's digits and a super-multiset of `explanationEn`'s digits. Implemented in both `merge.mjs` and `test-stage5e.mjs` §5. No translation changed.
2. **K2 transliteration (translation fix, §3).** The notes worker's کے ٹو in two `_ur` bodies dropped the "2" digit. Corrected to "K2" in the worker output file before merge. No source data touched.
3. **`sourceNote` key (check-side).** `test-stage5e.mjs` initially failed on "unexpected keys" for all 30 socialstudies items: `sourceNote` is a pre-existing provenance key (in the pre-Stage-5 backup; also on drawing/pe). Added to the suite's allowed original-keys set with a comment. Future batches (5F/5G) touching drawing/pe banks must allow it too.

## 6. Verification

- `npm run build` — PASS (✓ Compiled successfully in 14.9s).
- `npx tsc --noEmit` — clean (strict), exit 0.
- ALL suites green — **2846 checks / 38 suites, 0 failures** (baseline 2764 / 37; +82 from `test-stage5e.mjs`).
- Nastaliq grep over `src/` — 0 matches (Noto Sans Arabic only).
- Counts unchanged: 763 MCQs / 151 notes / 70 cards / 12 tracks / 16 mocks (suite-guarded).
- Local prod server (`next start`): all 14 static routes HTTP 200 (`/`, `/analysis`, `/flashcards`, `/issues`, `/library`, `/links`, `/mock`, `/plan`, `/practice`, `/review`, `/topics`, `/tracks`, `/tutor`, `/vacancies`). Translated 5E strings present in the built server chunks (SCI-001 `question_ur`, PAK-024 `explanation_ur`, PED-001 `question_ur`, SCI-001 `question_roman`); the `[Auto-Translated]` literal present in 2 built client chunks.
- Spot-checks passed: SCI-001 question/explanation, PAK-024 combined-facts `_ur`, PED-001 options, Vitamins + Bruner gloss handling, K2 in both Geography notes.
- NOT verified here (no headless browser on this machine; needs the parent's live browser pass after the deploy): visual rendering of the translated Science/Pak Studies/Social Studies/Pedagogy quiz + Library views, mid-run language switching on 5E subjects, and the badge on 5E items.
