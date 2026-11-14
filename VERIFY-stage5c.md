# VERIFY — Stage 5C: Arabic + Urdu translation batch (Urdu script + Roman Urdu)

**Date:** 2026-11-14 · **Branch:** `main` (GitHub HEAD `d8bdbb4` at task start) · **Scope:** translation DATA ONLY — ALL of Arabic (80 MCQs + 13 notes) + Urdu (45 MCQs + 6 notes) on the Stage 5A/5B infrastructure. No schema, resolver, rendering, fallback, or badge change. No push/deploy was taken by this batch — the parent handles the single push, deploy, and live browser verification after ALL remaining batches (5C–5G). The pre-Stage-5 backup `~/workspace/etea-prep-next-backup-pre-stage5/` was left untouched (not recreated).

## 1. Baseline

Before any change: `npm run build` PASS, `npx tsc --noEmit` clean (strict), ALL suites green — **2655 checks / 35 suites, 0 failures** (the post-pilot state: 5A + 5B deployed at `d8bdbb4`).

## 2. Pattern followed (Stage 5A/5B, unchanged)

Flat fields, exactly as 5A/5B (`src/lib/data.ts` types + resolvers `resolveQuestionView` / `resolveNoteView` — NOT modified):

- MCQ: `question_ur`, `question_roman`, `options_ur`, `options_roman`, `explanation_ur`, `explanation_roman` — inserted after `id` in `arabic.json` / `urdu.json`, same key order as 5A/5B.
- Note: `title_ur`, `title_roman`, `body_ur`, `body_roman` — appended after `body`/`title` on the 13 Arabic + 6 Urdu notes in `content.json`.
- Item-level fallback (whole English item unless the full field set for the language is present) and the literal `[Auto-Translated]` badge are the 5A resolvers/renderers, reused untouched. The infrastructure needed NO change to accommodate Arabic/Urdu.

## 3. Translation record

**MCQs — 125/125 translated, none omitted, none pending:** ARB-001–ARB-080 (all sequential) + URD-001–URD-045 (all sequential).

**Notes — 19/19 translated, none omitted, none pending.** Arabic titles (verbatim English): "Nahw vs Sarf — Syntax and Morphology", "Three Word Types — Ism, Fi'l, Harf", "I'rab — Marfu', Mansub, Majrur", "Nominal Sentence — Mubtada' and Khabar", "Verbal Sentence — Fi'l, Fa'il, Maf'ul", "Three-Letter Roots — One Root, Many Words", "Demonstratives — Hadha, Hadhihi, Dhalika, Tilka", "Gender and Number — Singular, Dual, Plural", "Al-Fa'il — The Doer (الفاعل) in Nahw (النحو)", "Al-Maf'ul Bihi — The Object (المفعول به)", "Al-Mubtada' and Al-Khabar in Detail (المبتدأ والخبر)", "Sarf — Roots and Verb Patterns (صرف)", "I'rab Signs — How Case Endings Show (إعراب)". Urdu titles (already Urdu script, verbatim): "اردو گرامر — اسم، فعل، صفت", "مترادف اور متضاد الفاظ", "واحد جمع اور مذکر مونث", "محاورے اور ضرب الامثال", "اردو ادب — مشہور شعرا و ادبا", "حروف اور جملے کی اقسام".

Rules applied (verified by the merge validation pass + the suite):

- Faithful translation of meaning; option order preserved exactly; all options arrays length 4, all strings non-empty.
- Digits 0-9 unchanged in both languages (machine-checked).
- Proper names and Arabic/Urdu linguistic terms intact, transliterated consistently. Grammar terms in Urdu/Arabic script in `_ur` fields (نحو، صرف، اعراب، مرفوع…) with consistent transliteration in `_roman` fields.
- Arabic script copied VERBATIM into BOTH languages (every Arabic-script run in every source field — incl. fully vocalized sentences such as كَتَبَ عَلِيٌّ اَلدَّرْسَ, اَلْكِتَابُ كَبِيرٌ, كَتَبَ, اُكْتُبْ, ف ع ل, and all parenthetical terms — is present character-for-character, diacritics included, in both the `_ur` and `_roman` fields; machine-checked).
- Religious care: no invented or altered reference, date, Hadith number, or Quranic text. `src/data/quran-examples.json` untouched (suite-guarded).
- The 105 Roman-marked explanations (60 Arabic + 45 Urdu, `explanationLang: "roman"`): `explanation_roman` is a VERBATIM copy of `explanation` — forced programmatically at merge time (0 overwrites were needed — every slice already matched byte-for-byte). `explanation_ur` is the Urdu-script translation. The 20 English explanations (Arabic bank, concept-extracted) were translated to both languages.
- **Mixed explanations: NONE found.** A heuristic scan (English-sentence + Roman-Urdu-sentence in one field) over both banks plus all 9 worker reports agree: zero mixed explanations in 5C scope (unlike the 33 known Islamiyat cases). No IDs to flag.
- Honorific convention (ONE, consistent — the 5B convention): Arabic honorific forms (ﷺ, رضی اللہ عنہ, etc.) in Urdu-script fields, and the SAME full forms spelled out in Roman fields ("Sallallahu Alaihi Wasallam", "Raziallahu Anhu") — zero Latin abbreviations in either language (machine-checked). Parenthetical glosses kept, never dropped. (No honorifics occurred in this batch's source content.)
- "Roman Urdu:" gloss sentences (3 Arabic notes + URD-001's explanation): the gloss sentence's content is kept in the target language and the "Roman Urdu:" label is dropped (in `_roman` the sentence was already Roman — kept as-is minus the label; in `_ur` translated minus the label).
- Working files (intermediate, NOT part of the deploy): `~/workspace/stage5c-translations/src/` (9 source slices) + `out/` (9 translation slices) + `merge.mjs` (validation + merge, with strip-checks). All 9 translation workers completed with all items; no slice needed re-dispatch.

### 5C-specific handling (decided, documented, suite-guarded)

1. **Urdu bank** (every question is an English frame around Urdu-script quoted words; every option is a Urdu-script word): questions keep the quoted word verbatim in both languages; `options_ur` are verbatim Urdu-script words; `options_roman` are transliteration + verbatim script word in parentheses (e.g. "saathi (ساتھی)") so the tested word is preserved exactly in Roman mode.
2. **Urdu notes are already Urdu script**: `title_ur`/`body_ur` are byte-exact verbatim copies of the source; `title_roman`/`body_roman` are pure-Latin transliterations (zero Arabic-script runs — machine-checked). This is the documented exception to the strict verbatim-in-`_roman` rule, which cannot apply to wholly Urdu-script source fields.
3. **ARB-064 options**: the source options "Ad-darsa" vs "Al-dars" differ only by case ending; `options_ur` uses vocalized forms (اَلدَّرْسَ vs اَلدَّرْس) to preserve the distinction, `options_roman` keeps the source transliterations.
4. **ARB-061 source quirk**: the source explanation accidentally repeats "(in the nominative, Raf' state)" twice. Rendered ONCE in each translation; source data untouched.
5. **ARB-034/035**: Anta/Anti distinguished in Urdu script with fatha/kasra (انتَ / انتِ), since unvocalized both spell identically.
6. **Arabic note 12 `_ur`**: the 7 verb forms exist in the source only in Latin script (kataba, yaktubu, …); rendered in vowelled Urdu script (کَتَبَ، یَکْتُبُ، …) in `body_ur`, Latin forms kept in `body_roman`. Worth an owner glance while reading (flagged by the worker, meaning preserved).

## 4. Files changed (5C's own share)

| File | Change |
|---|---|
| `src/data/banks/arabic.json` | 6 new keys per item, inserted after `id` — **+1280 / −0 lines** vs the pre-Stage-5 backup |
| `src/data/banks/urdu.json` | 6 new keys per item, inserted after `id` — **+720 / −0 lines** vs the pre-Stage-5 backup |
| `src/data/content.json` | 4 new keys on the 13 Arabic + 6 Urdu notes only (minified single-line JSON; re-serialized byte-identically) |
| `scripts/test-stage5c.mjs` | New suite (41 checks) |
| `scripts/test-stage5a.mjs` | §5/§6 scope guards + §7 untranslated-item selector updated 1:1 (see §5) |
| `scripts/test-stage5b.mjs` | §6/§7 scope sets extended to the four translated banks/subjects |
| `package.json` | `test:stage5c` script |
| `CHANGELOG.md` | Stage 5C entry |
| `VERIFY-stage5c.md` | This report |

`drawing_pe.json` (dead, unregistered) untouched — confirmed by the §6 scope scan over all bank files.

## 5. Suite interactions found + fixed (1:1, intent preserved)

1. **5A §7 untranslated-item selector:** `QUESTIONS.find((q) => q.subjectKey !== "islamiyat")` returns ARB-001, which loads first in `QUESTIONS` and is now translated — the fallback-identity checks would fail. Fix: select the first item with no `question_ur` field. The check's intent (an untranslated item falls back to identity) is unchanged.
2. **5A §5/§6 + 5B §6/§7 scope guards:** extended to allow `arabic.json`/`urdu.json` and the "Arabic"/"Urdu" note subjects, same as 5B did for the pilot. No other suite needed changes (the 5B `test-phase4b2.mjs` strip fix already covers translation fields).

## 6. Verification

- **Insertions-only:** `arabic.json` +1280/−0 and `urdu.json` +720/−0 lines vs the pre-Stage-5 backup. Semantic deep comparison (new keys stripped) is byte-identical for BOTH bank files and `content.json` (the merge script's strip-checks, with restore-on-failure). No bank other than islamiyat/tajweed/arabic/urdu carries any `_ur`/`_roman` field; no subject other than Islamiyat/Tajweed/Arabic/Urdu carries note translation fields; `explanationUrdu` still present on every item; `correctIndex`, answers, `reviewStatus`, `verified`, `source`, `explanation` byte-identical.
- **Counts unchanged:** 763 MCQs · 151 notes · 70 flashcards · 12 teaching post tracks · 16 mocks; `/review` 15/200 untouched.
- **Build:** `npm run build` PASS (Compiled successfully in 11.1s). `npx tsc --noEmit` clean (strict).
- **Suites:** ALL green — **2696 checks / 36 suites, 0 failures** (baseline 2655 / 35; the new suite contributes 41 checks: field completeness all-or-none per language for both banks, 105-item verbatim rule, Arabic-verbatim + honorific guards, Urdu-note verbatim/transliteration guards, no-other-bank/subject scope, resolver checks on real Arabic/Urdu items + notes, quran-data guard). Zero Nastaliq (grep-verified).
- **Local prod server:** all 14 routes HTTP 200 (`/`, `/library`, `/practice`, `/mock`, `/flashcards`, `/tutor`, `/plan`, `/analysis`, `/tracks`, `/topics`, `/vacancies`, `/links`, `/issues`, `/review`). Translated Arabic/Urdu strings ("مترادف", "saathi (ساتھی)", "Urdu Grammar — Ism") and the `[Auto-Translated]` literal are present in the built client chunks.
- **NOT verified here** (no headless browser on this machine; needs the live browser check post-deploy): visual rendering of translated Arabic/Urdu questions/notes in Urdu + Roman modes, the badge's on-screen appearance, mid-run language switching, and 360px rendering. The parent's live browser pass after the single push (batches 5C–5G) covers these.
