# VERIFY — Stage 5F: IT + PE translation batch (Urdu script + Roman Urdu)

Owner order (FINAL, full completion, 2026-11-14): translate ALL remaining subjects into BOTH Urdu script AND Roman Urdu, subject-wise batches with a build test after each, badge where translated, English fallback until translated, ONE deploy at the end. This batch: IT + PE. No push/deploy from this batch — the parent handles the single push, deploy, and live browser verification after ALL remaining batches (5F–5G).

## 1. Baseline

Before any change (2026-11-14): `npm run build` PASS, `npx tsc --noEmit` clean (strict), all suites green — **2846 checks / 38 suites, 0 failures**. GitHub HEAD `d8bdbb4`. The backup `~/workspace/etea-prep-next-backup-pre-stage5/` was left untouched (not recreated).

## 2. Pattern followed (Stage 5A/5B/5C/5D/5E, unchanged)

Translation data ONLY. No schema, resolver, rendering, fallback, or badge change was needed: the 5A resolvers (`resolveQuestionView` / `resolveNoteView` in `src/lib/data.ts`) are subject-agnostic, item-level fallback and the literal `[Auto-Translated]` badge are reused untouched. Flat fields `question_ur` / `question_roman`, `options_ur` / `options_roman`, `explanation_ur` / `explanation_roman` inserted after `id` in the bank files; notes gain `title_ur` / `title_roman`, `body_ur` / `body_roman` appended after `body` / `title` in `content.json`. `quran-examples.json` and `/review` untouched (suite-guarded). `drawing_pe.json` (dead/unregistered) untouched.

## 3. Translation record

**Done — ALL 106 MCQs + ALL 17 notes, none omitted, none pending:**

- IT: ITC-001–ITC-060 (60 MCQs).
- PE: DRW-011–DRW-020 + PE-001–PE-036 (46 MCQs).
- Notes: IT/Computer (17).

Pending IDs: none. Untranslated-on-purpose IDs: none.

Work was split into 8 slices (4×15 IT + 3 PE slices of 15/15/16 + 17 notes) translated in parallel; source slices in `~/workspace/stage5f-translations/src/`, outputs in `~/workspace/stage5f-translations/out/`, validated and merged by `~/workspace/stage5f-translations/merge.mjs` (field completeness, verbatim + gloss rules forced at merge, digit preservation per explanation pattern, honorific/gloss guards, Arabic-verbatim, then strip-checks: stripping the new keys must reproduce the pre-merge files byte-identically; originals restored on failure). All 8 translation workers completed with all items; no slice needed re-dispatch. Verbatim mismatches forced at merge: 0. Gloss mismatches forced: 0.

### ExplanationEn inspection result (required by the task)

IT (30) and PE (5) items carry `explanationEn`. Each stored `explanation` was inspected before translation:

- **IT (30/30, ITC-001–ITC-030): pure Roman-Urdu originals.** The stored `explanation` is Roman Urdu (e.g. "CPU ko computer ka dimagh kaha jata hai…"); `explanationEn` is the English version. None starts with its `explanationEn`; none carries a "Roman Urdu:" label. Handled per the verbatim rule: `explanation_roman` = byte-exact copy of `explanation` (forced at merge; **0 mismatches** — every slice already matched), `explanation_ur` = Urdu-script translation of the Roman original.
- **PE (5/5: DRW-011, DRW-012, DRW-016, DRW-019, PE-001): gloss pattern.** Every stored `explanation` = an English sentence + a "Roman Urdu: <gloss>" sentence, and every one starts with its `explanationEn` sentence (verified: 5/5, zero exceptions). Handled per the 5C/5D gloss rule: drop the label AND the English sentence, `explanation_roman` = the gloss content verbatim (forced at merge; 0 mismatches), `explanation_ur` = one clean Urdu-script rendering of the gloss.
- **Remaining items (30 IT + 41 PE): no `explanationEn`.** Plain English explanations, translated to both languages.
- **Roman-marked items (`explanationLang: "roman"`): 0** in 5F scope.

### Mixed-explanation flags

**None.** No mixed (English + Roman) explanations were found in 5F scope: a heuristic scan for Roman-Urdu function words in all non-`explanationEn` explanations returned zero hits, and the `explanationEn` inspection above accounts for every non-plain explanation (30 pure Roman originals + 5 gloss items — the gloss pattern, not mixed fields). No source data was rewritten.

### 5F-specific handling (decided, documented, suite-guarded)

- **IT:** technical terms, acronyms (CPU, RAM, ROM, HTML, WWW, USB, OS), keyboard shortcuts (Ctrl+S, Ctrl+X, Ctrl+Z, Ctrl+P, Alt+Tab, F5, F7, Shift+F5), file extensions (.docx, .xlsx, .pptx), formulas (=SUM(A1:A5), =A1+B1), cell references (B3, B5), email addresses (name@example.com) and URLs stay in Latin script in both languages; digits preserved in both languages.
- **PE:** sport names transliterated in Urdu script in `_ur` (کرکٹ، فٹ بال، اولمپکس، والی بال، بیڈمنٹن) and kept in familiar Latin spelling in `_roman`; unit abbreviations (m, km, kg) unchanged; decimals and ranges preserved (42.195, 2.43, 3.05, 4 × 100 m).
- **Honorifics (5B convention):** none occurred in 5F scope (audited). Zero Latin abbreviations ((SAW)/(RA)/(PBUH)) in either language, machine-checked.
- **Arabic script:** none anywhere in 5F scope (audited). No reference, date, or fact invented or altered.
- **Notes:** 13 of the 17 IT/Computer notes carry a "Roman Urdu:" gloss sentence — all follow the gloss rule (label dropped, gloss verbatim in `_roman`, translated in `_ur`), suite-guarded with exact-string checks on the MS Word and Binary notes plus a verbatim check on all 13. The "Recall first:" lead-in is kept in `body_roman` and rendered as "پہلے یاد کریں:" in `body_ur` on all 17 notes (suite-guarded). Product names (MS Word, MS Excel, MS PowerPoint) stay in Latin script in both languages.
- **Fidelity:** option order preserved exactly everywhere; proper names, dates, and technical terms intact.

## 4. Files changed (5F's own share)

Data (insertions-only vs the pre-Stage-5 backup; stripping the new keys reproduces the backup files byte-identically):

- `src/data/banks/it.json` — +960/−0 lines; first new field at line 4 (`question_ur`, ITC-001). No trailing newline (preserved).
- `src/data/banks/pe.json` — +736/−0 lines; first new field at line 4 (`question_ur`, DRW-011). Trailing newline present (preserved).
- `src/data/content.json` — IT/Computer (17) notes gain the 4 translation fields; deep-identical to the backup after stripping the new note keys.

`correctIndex`, answers, `reviewStatus`, `verified`, `source`, `explanation`, `explanationEn`, `explanationUrdu`, `sourceNote` byte-identical in both banks. Only the 13 expected banks differ from the backup (islamiyat, tajweed, arabic, urdu, english, maths, gk, science, pakstudies, socialstudies, pedagogy from prior batches + it, pe from this one). Pre-existing key: `sourceNote` ("AI-drafted; unreviewed") on PE-001–PE-010 — present in the pre-Stage-5 backup, not added by 5F.

Tests + docs:

- `scripts/test-stage5f.mjs` (new, 51 checks) + `package.json:72` (`test:stage5f` script).
- Scope guards updated 1:1 in `scripts/test-stage5a.mjs` (§5/§6), `scripts/test-stage5b.mjs` (§6/§7), `scripts/test-stage5c.mjs` (§6/§7), `scripts/test-stage5d.mjs` (§8/§9, incl. its "11 translated banks/subjects" check names → 13/12), `scripts/test-stage5e.mjs` (§7/§8, same count-name update) to allow the thirteen translated banks / twelve translated note subjects — same pattern prior batches used.
- `scripts/qa-540.mjs` §6 — check-side fix only (see §5).
- `CHANGELOG.md` — Stage 5F entry appended.
- This report: `VERIFY-stage5f.md`.

## 5. Suite interactions found + fixed (1:1, intent preserved)

1. **`qa-540.mjs` §6 legacy comparison (found by the full run, fixed check-side).** The `strip()` helper removed review fields + `explanationEn`/`explanationLang` before comparing `drawing_pe.json` against the first 10 drawing + first 10 pe items, but pe.json's first 10 items (DRW-011–DRW-020) now carry the 6 Stage 5 translation fields, so the comparison failed (2896 PASS lines, 1 failing suite). Fix: `strip()` now also removes the 6 translation keys, with a comment noting the legacy file predates them exactly as it predates the F02 fields. The check's intent (original content must still match exactly) is unchanged. After the fix: 2897 checks / 39 suites, 0 failures. Note for 5G: when drawing.json gains translation fields, this same `strip()` already covers them.

## 6. Verification

- `npm run build` — PASS (✓ Compiled successfully in 16.0s).
- `npx tsc --noEmit` — clean (strict), exit 0.
- ALL suites green — **2897 checks / 39 suites, 0 failures** (baseline 2846 / 38; +51 from `test-stage5f.mjs`).
- Nastaliq grep over `src/` — 0 matches (Noto Sans Arabic only).
- Counts unchanged: 763 MCQs / 151 notes / 70 cards / 12 tracks / 16 mocks (suite-guarded).
- Local prod server (`next start`): all 14 static routes HTTP 200 (`/`, `/analysis`, `/flashcards`, `/issues`, `/library`, `/links`, `/mock`, `/plan`, `/practice`, `/review`, `/topics`, `/tracks`, `/tutor`, `/vacancies`). Translated 5F strings present in the built server chunks (ITC-001 `question_ur` + `question_roman`, DRW-011 gloss `explanation_roman`); the `[Auto-Translated]` literal present in 2 built client chunks.
- Spot-checks passed: ITC-001 question/explanation (verbatim Roman + Urdu translation), DRW-011 gloss handling, MS Word + Binary note gloss handling, `sourceNote` preserved on PE-001–PE-010.
- NOT verified here (no headless browser on this machine; needs the parent's live browser pass after the deploy): visual rendering of the translated IT/PE quiz + Library views, mid-run language switching on 5F subjects, and the badge on 5F items.
