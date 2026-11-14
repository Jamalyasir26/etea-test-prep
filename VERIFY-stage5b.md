# VERIFY — Stage 5B: Tajweed pilot batch 2 (Urdu script + Roman Urdu)

**Date:** 2026-11-14 · **Branch:** `main` (GitHub HEAD `cea10d6` at task start) · **Scope:** translation DATA ONLY — ALL of Tajweed (82 MCQs + 24 notes) on the Stage 5A infrastructure. No schema, resolver, rendering, fallback, or badge change. No push/deploy was taken by this batch — the parent handles the single push, deploy, and live browser verification.

## 1. Baseline

Before any change: `npm run build` PASS, `npx tsc --noEmit` clean (strict), ALL suites green — **2625 checks / 34 suites, 0 failures** (the post-5A state). The pre-Stage-5 backup `~/workspace/etea-prep-next-backup-pre-stage5/` was left untouched (5A's backup; 5B did not recreate it).

## 2. Pattern followed (Stage 5A, unchanged)

Flat fields, exactly as 5A (`src/lib/data.ts` lines 90–95, 140–143; resolvers `resolveQuestionView` line 478, `resolveNoteView` line 498 — NOT modified):

- MCQ: `question_ur`, `question_roman`, `options_ur`, `options_roman`, `explanation_ur`, `explanation_roman` — inserted after `id` in `tajweed.json`, same key order as 5A's `islamiyat.json`.
- Note: `title_ur`, `title_roman`, `body_ur`, `body_roman` — appended after `body`/`title` on the 24 Tajweed notes in `content.json`, same order as 5A's Islamiyat notes.
- Item-level fallback (whole English item unless the full field set for the language is present) and the literal `[Auto-Translated]` badge are the 5A resolvers/renderers, reused untouched. The infrastructure needed NO change to accommodate Tajweed.

## 3. Translation record

**MCQs — 82/82 translated, none omitted, none pending:** TAJ-001–TAJ-082 (all sequential IDs present).

**Notes — 24/24 translated, none omitted, none pending.** Titles (verbatim English): "Makharij — The Places of Articulation", "The Five General Makharij in Detail", "Sifaat — The Qualities of Letters", "Noon Sakinah and Tanween — Four Rules", "Meem Sakinah — Three Rules", "Madd — Lengthening the Sound", "Waqf — Rules of Stopping", "Quranic Knowledge — Structure and Firsts", "Ikhfa — Hiding the Noon Sound (إخفاء)", "Idgham — Merging into the Next Letter (إدغام)", "Qalqalah — The Echo Letters (قلقلة)", "Madd Types Compared — How Long to Stretch (مد)", "Iqlab — Turning Noon into Meem (إقلاب)", "Common Tajweed Mistakes to Avoid", "Sifaat in Detail — Hams, Jahr, Shiddah and Rakhawah", "Heavy and Light — Tafkheem, Tarqeeq, Raa and Laam", "Sun and Moon Letters — Laam Qamariyyah and Shamsiyyah", "Hamzatul Wasl and Hamzatul Qat'", "More Madd Types — Leen, Iwaz, Silah and Far'i", "Waqf Signs in the Mushaf — Ja, La, Sali, Qali and Saktah", "Idgham Families — Same, Near and Close Letters", "Hifz Method — Sabq, Sabqi and Amukhta", "Revision Cycles — Keeping What You Memorised", "Listening, a Teacher and One Mushaf — Hifz Supports".

Rules applied (verified by the merge validation pass + the suite):

- Faithful translation of meaning; option order preserved exactly; all options arrays length 4, all strings non-empty.
- Digits 0-9 unchanged in both languages (every digit sequence in every source field is present in both translations — machine-checked).
- Proper names and Arabic/Tajweed terms intact, transliterated consistently (e.g. the two English "Ha" throat letters are distinguished in Urdu script only, ہا vs حا, in source order; Latin-script mnemonics/transliterated examples such as 'Khussadaghtin Qiz' are kept verbatim in Latin script in both languages to avoid altering them).
- Arabic script copied VERBATIM into BOTH languages (every Arabic-script run in every source field — incl. the 15-letter Ikhfa list, يَرْمَلُون, يَنْمُو, قُطْبُ جَدٍّ, Waqf glyphs ج/لا/صلى/قلى/س/م — is present character-for-character in both the `_ur` and `_roman` fields; machine-checked).
- Religious care: no invented or altered reference, date, Hadith number, or Quranic text. `src/data/quran-examples.json` untouched (suite-guarded).
- The 1 Roman-marked explanation (TAJ-029, `explanationLang: "roman"`): `explanation_roman` is a VERBATIM copy of `explanation` — forced programmatically at merge time (the merge script overwrites it with the exact source string; no overwrite was needed — the slice already matched). `explanation_ur` is its Urdu-script translation. The 81 English explanations were translated to both languages.
- Honorific convention (ONE, consistent across all Tajweed items — the 5A caveat addressed): Arabic honorific forms (ﷺ, رضی اللہ عنہ, etc.) in Urdu-script fields, and the SAME full forms spelled out in Roman fields ("Sallallahu Alaihi Wasallam", "Raziallahu Anhu") — never Latin abbreviations like (SAW)/(RA) in either language (machine-checked: zero hits). Parenthetical English glosses are kept, never dropped (descriptive glosses translated into the target language; Arabic/name glosses verbatim).
- Working files (intermediate, NOT part of the deploy): `~/workspace/stage5b-translations/src/` (5 source slices) + `out/` (6 translation slices, one per worker) + `merge.mjs` (validation + merge, with strip-checks). All 6 translation workers completed with all items; no slice needed re-dispatch.

## 4. Files changed (5B's own share)

| File | Change |
|---|---|
| `src/data/banks/tajweed.json` | 6 new keys per item, inserted after `id` — **+1312 / −0 lines** vs the pre-Stage-5 backup |
| `src/data/content.json` | 4 new keys on the 24 Tajweed notes only (minified single-line JSON; re-serialized byte-identically) |
| `scripts/test-stage5b.mjs` | New suite (30 checks) |
| `scripts/test-stage5a.mjs` | §5/§6 scope guards updated 1:1 to allow both pilot banks/subjects (islamiyat + tajweed) |
| `scripts/test-phase4b2.mjs` | 1 check updated 1:1 (see §5 — the `qariText` religious-safety scan now strips `_ur`/`_roman` fields first) |
| `package.json` | `test:stage5b` script |
| `CHANGELOG.md` | Stage 5B entry |
| `VERIFY-stage5b.md` | This report |

## 5. Suite interaction found + fixed (1:1, intent preserved)

`test-phase4b2.mjs` failed after the merge: its "Arabic script in new Qari text only Waqf sign glyphs" check scans `JSON.stringify` of the whole Tajweed question/note objects, which now legitimately include full Urdu-script `_ur` fields. Fix: strip keys ending in `_ur`/`_roman` before stringifying (new `stripTr` helper + comment). Stripped objects are identical to the pre-Stage-5 objects, so the check keeps its exact original meaning — the English-authored 4B2 content carries no invented religious references and no Arabic script beyond the Waqf sign glyphs. The translation fields are guarded separately by `test-stage5b.mjs` (§5 Arabic-verbatim + honorific checks). No other suite needed changes.

## 6. Verification

- **Insertions-only:** `tajweed.json` text diff vs the pre-Stage-5 backup is +1312/−0 lines. Semantic deep comparison (new keys stripped) is byte-identical for BOTH `tajweed.json` and `content.json` (the merge script's strip-checks; the backup was NOT modified). No bank other than islamiyat/tajweed carries any `_ur`/`_roman` field; no subject other than Islamiyat/Tajweed carries note translation fields; `explanationUrdu` still present on every Tajweed item; `correctIndex`, answers, `reviewStatus`, `verified`, `source`, `explanation` byte-identical.
- **Counts unchanged:** 763 MCQs · 151 notes · 70 flashcards · 12 teaching post tracks · 16 mocks; `/review` 15/200 untouched.
- **Build:** `npm run build` PASS (Compiled successfully in 23.5s). `npx tsc --noEmit` clean (strict).
- **Suites:** ALL green — **2655 checks / 35 suites, 0 failures** (baseline 2625 / 34; the new suite contributes 30 checks: field completeness all-or-none per language, options length, TAJ-029 verbatim rule, Arabic-verbatim + honorific guards, no-other-bank/subject scope, resolver checks on real Tajweed items, quran-data guard). Zero Nastaliq (grep-verified).
- **Local prod server:** all 14 routes HTTP 200 (`/`, `/library`, `/practice`, `/mock`, `/flashcards`, `/tutor`, `/plan`, `/analysis`, `/tracks`, `/topics`, `/vacancies`, `/links`, `/issues`, `/review`). Translated Tajweed Urdu ("عام مخارج") + Roman ("Aam Makharij") strings and the `[Auto-Translated]` literal are present in the built client chunks; home SSR carries the 763-MCQ counts.
- **NOT verified here** (no headless browser on this machine; needs the live browser check post-deploy): visual rendering of translated Tajweed questions/notes in Urdu + Roman modes, the badge's on-screen appearance, mid-run language switching, and 360px rendering. The parent's live browser pass after the deploy covers these.
