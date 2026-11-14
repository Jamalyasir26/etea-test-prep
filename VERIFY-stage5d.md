# VERIFY — Stage 5D: English + Maths + GK translation batch (Urdu script + Roman Urdu)

Owner order (FINAL, full completion, 2026-11-14): translate ALL remaining subjects into BOTH Urdu script AND Roman Urdu, subject-wise batches with a build test after each, badge where translated, English fallback until translated, ONE deploy at the end. This batch: English + Maths + GK. No push/deploy from this batch — the parent handles the single push, deploy, and live browser verification after ALL remaining batches (5D–5G).

## 1. Baseline

Before any change (2026-11-14): `npm run build` PASS, `npx tsc --noEmit` clean (strict), all suites green — **2696 checks / 36 suites, 0 failures**. GitHub HEAD `d8bdbb4`. The backup `~/workspace/etea-prep-next-backup-pre-stage5/` was left untouched (not recreated).

## 2. Pattern followed (Stage 5A/5B/5C, unchanged)

Translation data ONLY. No schema, resolver, rendering, fallback, or badge change was needed: the 5A resolvers (`resolveQuestionView` / `resolveNoteView` in `src/lib/data.ts`) are subject-agnostic, item-level fallback and the literal `[Auto-Translated]` badge are reused untouched. Flat fields `question_ur` / `question_roman`, `options_ur` / `options_roman`, `explanation_ur` / `explanation_roman` inserted after `id` in the bank files; notes gain `title_ur` / `title_roman`, `body_ur` / `body_roman` appended after `body` / `title` in `content.json`. `quran-examples.json` and `/review` untouched (suite-guarded). `drawing_pe.json` (dead/unregistered) untouched.

## 3. Translation record

**Done — ALL 120 MCQs + ALL 21 notes, none omitted, none pending:**

- English: ENG-001–ENG-045 (45 MCQs) + 8 notes.
- Maths: MAT-001–MAT-045 (45 MCQs) + 7 notes.
- GK: GKN-001–GKN-030 (30 MCQs) + 6 notes.

Pending IDs: none. Untranslated-on-purpose IDs: none.

Work was split into 9 slices (8×15 MCQs + 21 notes) translated in parallel; source slices in `~/workspace/stage5d-translations/src/`, outputs in `~/workspace/stage5d-translations/out/`, validated and merged by `~/workspace/stage5d-translations/merge.cjs` (digit-run preservation, Maths operator counts, English-bank verbatim options, honorific/gloss guards, Arabic-verbatim, then a strip-check: stripping the new keys must reproduce the pre-merge files byte-identically; originals restored on failure).

### ExplanationEn inspection result (required by the task)

The 5 English-bank items with `explanationEn` (ENG-001, ENG-003, ENG-007, ENG-028, ENG-042) were inspected before translation. Stored `explanation` on all 5 = an English sentence + a `"Roman Urdu: <gloss>"` sentence. **Roman originals found: 0.** Handled per the 5C gloss rule: drop the `"Roman Urdu:"` label, keep the gloss content — verbatim in `_roman`, translated in `_ur`. No Roman-marked items (`explanationLang: "roman"`) exist in these three banks.

### Mixed-explanation flags

**None.** No mixed (English + Roman) explanations were found in 5D scope (heuristic scan + worker reports agree). No source data was rewritten.

### 5D-specific handling (decided, documented, suite-guarded)

- **Maths:** digits, formulas, equations, symbols, and pure-number options EXACTLY as-is in both languages — only the surrounding words translate. Digit runs and operator counts are machine-checked in `test-stage5d.mjs`; U+2212 minus is preserved in the Algebra note in both languages. One option exception: the word "years" in MAT-042's options was translated (سال / saal) with digits preserved; units/abbreviations in numbered quantities stay as-is.
- **English bank:** options stay verbatim English in both languages (the tested vocabulary must stay visible); quoted English sentences/words stay verbatim in both languages — only instruction frames and explanatory prose translate. Quoted-span preservation is machine-checked.
- **GK:** names in Urdu script in `_ur`, source Latin spelling in `_roman`; dates keep digits, month names in Urdu script in `_ur`.
- **Honorifics (5B convention):** one honorific item — GKN-028 ("Who was the first Caliph of Islam?") has `(RA)` in source options/explanation; translations use رضی اللہ عنہ / "Raziallahu Anhu". Zero Latin abbreviations ((SAW)/(RA)/(PBUH)) in either language, machine-checked.
- **Arabic script:** none anywhere in 5D scope (audited). No reference, date, or fact invented or altered.
- **Notes:** the GK note "The United Nations (UN)" contains a `"Roman Urdu:"` gloss sentence — handled per the gloss rule above.
- **Fidelity:** option order preserved exactly everywhere; proper names, dates, and technical terms intact.

## 4. Files changed (5D's own share)

Data (insertions-only vs the pre-Stage-5 backup; stripping the new keys reproduces the backup files byte-identically):

- `src/data/banks/english.json` — +720/−0 lines; first new field at line 4 (`question_ur`, ENG-001).
- `src/data/banks/maths.json` — +720/−0 lines; first new field at line 4 (`question_ur`, MAT-001).
- `src/data/banks/gk.json` — +480/−0 lines; first new field at line 4 (`question_ur`, GKN-001).
- `src/data/content.json` — English (8), Maths (7), GK (6) notes gain the 4 translation fields; deep-identical to the backup after stripping the new note keys.

`correctIndex`, answers, `reviewStatus`, `verified`, `source`, `explanation`, `explanationEn`, `explanationUrdu` byte-identical in all three banks. Only the 7 expected banks differ from the backup (islamiyat, tajweed, arabic, urdu from prior batches + english, maths, gk from this one).

Tests + docs:

- `scripts/test-stage5d.mjs` (new, 68 checks) + `package.json:70` (`test:stage5d` script).
- Scope guards updated 1:1 in `scripts/test-stage5a.mjs` (§5/§6, lines 145/181), `scripts/test-stage5b.mjs` (§6/§7, lines 175/209), `scripts/test-stage5c.mjs` (§6/§7, lines 186/221) to allow the seven translated banks/subjects — same pattern 5C used for 5A/5B.
- `CHANGELOG.md` — Stage 5D entry appended.
- This report: `VERIFY-stage5d.md`.

## 5. Suite interactions found + fixed (1:1, intent preserved)

1. **5A untranslated-note fixture (found by the full run, fixed check-side).** `test-stage5a.mjs:237-241` hardcoded `NOTES.English[0]` as the "untranslated note" fixture for the fallback check; English notes are now translated, so the check failed (2763 PASS lines, 1 failing suite). Fix: the selector now finds the first note across all subjects with no `title_ur` — the same fix 5C applied to the untranslated-question selector. The check's intent (fallback on an untranslated note) is unchanged. After the fix: 2764 checks / 37 suites, 0 failures.
2. **Maths operator-count false positives (validation-side).** 7 mismatches in the merge validator were hyphens inside English compound words ("one-eighth", "one-fourth", "three-quarters") and "talib-e-ilm" in MAT-045 `question_roman`. The check now ignores hyphens between two letters; formulas were verbatim in all cases. Translations were correct; no translation changed.
3. **gk.json trailing newline (file quirk, durable).** The strip-check failed on `gk.json` only because `gk.json` has NO trailing newline (unlike the english/maths banks). The merge script now preserves each file's original trailing-newline state. Future batches merging `gk.json` must keep this in mind.
4. **Two `test-stage5d.mjs` check-side case artifacts (fixed in the checks, not the data).** ENG-028's gloss is sentence-capitalised ("Sakhi.") and ENG-013's quoted `'Will'` becomes mid-sentence `'will'`; both checks now compare case-insensitively with explanatory comments.

## 6. Verification

- `npm run build` — PASS (✓ Compiled successfully in 13.9s).
- `npx tsc --noEmit` — clean (strict), exit 0.
- ALL suites green — **2764 checks / 37 suites, 0 failures** (baseline 2696 / 36; +68 from `test-stage5d.mjs`).
- Nastaliq grep over `src/` — 0 matches (Noto Sans Arabic only).
- Counts unchanged: 763 MCQs / 151 notes / 70 cards / 12 tracks / 16 mocks (suite-guarded).
- Local prod server (`next start`): all 14 static routes HTTP 200 (`/`, `/analysis`, `/flashcards`, `/issues`, `/library`, `/links`, `/mock`, `/plan`, `/practice`, `/review`, `/topics`, `/tracks`, `/tutor`, `/vacancies`). Translated 5D strings present in the built server chunks (e.g. GKN-001 `question_ur`); the `[Auto-Translated]` literal present in 2 built client chunks.
- Spot-checks passed: GKN-028 honorifics, ENG-001 gloss handling, UN note gloss handling, Algebra note U+2212 minus in both languages.
- NOT verified here (no headless browser on this machine; needs the parent's live browser pass after the deploy): visual rendering of the translated English/Maths/GK quiz + Library views, mid-run language switching on 5D subjects, and the badge on 5D items.
