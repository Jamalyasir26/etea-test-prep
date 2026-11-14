# VERIFY — Stage 5A: Translation infrastructure + Islamiyat pilot

**Date:** 2026-11-14 · **Branch:** `main` (GitHub HEAD `cea10d6` at task start) · **Scope:** infrastructure + ALL of Islamiyat (105 MCQs + 14 notes). Tajweed (5B) and all other subjects are untouched. No push/deploy was taken by this batch — the parent handles the single push, deploy, and live browser verification after 5B.

## 1. Owner order (FINAL, 2026-11-14 ~08:57 PKT)

- Translate content into BOTH Urdu script AND Roman Urdu; 3-way toggle English / اردو / Roman — the existing toggle/state is reused, no new toggle, no parallel language state.
- Schema: per MCQ + per note, `_ur` + `_roman` fields.
- No review queue for translations (owner checks while reading). Every translated item carries a small literal `[Auto-Translated]` badge.
- Subject-wise batches + build test after every batch (Vercel memory/timeout caution). Never translate everything at once.
- Pilot first: Islamiyat + Tajweed, ONE deploy + live test, then remaining subjects.
- UI: QuizRunner + Library render per selected language, English fallback when a translation is missing.

## 2. Schema (additive only)

`src/lib/data.ts`:

- `Question` (lines 90–95): optional `question_ur`, `question_roman`, `options_ur`, `options_roman`, `explanation_ur`, `explanation_roman`.
- `Note` (lines 140–143): optional `title_ur`, `title_roman`, `body_ur`, `body_roman`.

No existing key was modified or removed. `correctIndex`, answers, `reviewStatus`, `verified`, `source`, `explanation`, `explanationEn`, and the dead `explanationUrdu` field are byte-identical to the pre-Stage-5 backup (verified by deep comparison, §6). The Pass-1 nested tri-language scaffold (`Question.ur`/`roman`, `localizeQuestion`/`localizeNote`, `hasTranslation`) is left intact but is no longer used by the renderers — this is an implementation decision following the owner spec literally (flat fields); the 5B batch must follow the same pattern.

## 3. Rendering / fallback / badge rules

Resolvers — `resolveQuestionView(q, lang)` (data.ts:478) and `resolveNoteView(note, lang)` (data.ts:498) — are pure and never mutate their input:

- `en` mode: returns the input untouched (`translated: false`) for every item.
- `ur`/`roman` mode: returns a shallow copy carrying the translated fields in the standard `question`/`options`/`explanation` (or `title`/`body`) slots, `translated: true` — **only when the full field set is present**: question + same-length all-non-empty options + explanation (title + body for notes). Otherwise the whole English item is returned (`translated: false`). A partially translated item never renders a half-translated mix; a wrong-length or blank-field translation also falls back wholly.
- Because the resolved view carries translated text in the standard fields, the existing `displayExplanation()` F02 machinery keeps working unchanged (translated view → translated explanation, `pendingEnglish: false`).

QuizRunner (`src/components/QuizRunner.tsx`):

- `prepared` memo (line 365) resolves each question via `resolveQuestionView(q, lang)` BEFORE `shuffleOptions`, and carries a `translated` flag; deps are `[questions, startTs, lang]`. The shuffle seed depends only on (id + startTs), so switching language mid-run keeps option positions and index-based answers valid.
- The literal `[Auto-Translated]` badge renders after the subject badge on the question card (line 1161, `q.translated`) and after the correct/wrong badge in the review table (line 951, `p.translated`). Badge markup: `<span dir="ltr" className="badge grey" title={t("autoTranslatedBadgeAria")} aria-label={t("autoTranslatedBadgeAria")}>[Auto-Translated]</span>` — the literal text is identical in all languages; the accessible label comes from i18n.
- The existing render expressions (`q.question.question`, `currentExpl?.text ?? q.question.explanation`, `p.question.question`, `expl.text`) are unchanged, so the RTL suite's exact-string checks still pass.

Library (`src/app/library/page.tsx`):

- Each note renders via `shown = resolveNoteView(n, lang)` (line 161); `{shown.title}` / `{shown.body}` JSX unchanged. Storage keys/annotations still key on the original English title.
- The `[Auto-Translated]` badge renders when `shown.translated` (line 192); the existing "English source text" label renders when `lang !== "en" && !shown.translated` (line 187) — i.e. fallback to English in Urdu/Roman mode is still labelled, exactly as before.
- Urdu-script content renders inside the existing RTL document flow (`document.dir=rtl` for `ur` in the language provider); Roman renders LTR. Noto Sans Arabic only; zero Nastaliq (grep-verified).

i18n (`src/lib/i18n.tsx:1414`): new key `autoTranslatedBadgeAria` — en "Auto-translated content", roman "Auto-translated mawaad", ur "خودکار ترجمہ شدہ مواد".

Unchanged by design: the tutor's answer-language behaviour; `/review` (no badge, no resolver — suite-guarded); `src/data/quran-examples.json` and all ayah text (suite-guarded); flashcards, mocks, plan, and all other pages.

## 4. Translation record

**MCQs — 105/105 translated, none omitted, none pending:** ISL-001–ISL-105 (all sequential IDs present).

**Notes — 14/14 translated, none omitted, none pending.** Titles (verbatim English): "Quran: Surahs, Parahs and Revelation", "Makki and Madani Surahs — How to Tell Them Apart", "Sihah Sitta — The Six Authentic Hadith Books", "Seerat: Key Dates of the Prophet's Life (SAW)", "Ghazwat — The Major Battles", "Khulafa-e-Rashideen — The Four Rightly Guided Caliphs", "Arkan-e-Islam — The Five Pillars", "Hajj — Key Facts", "Fiqh Basics — Sources and Schools", "Important Islamic Personalities and Titles", "Wahi — The First Revelation (وحی)", "Hadith — What It Is and How It Is Preserved (حدیث)", "Seerat — The Hijrah and the Madani Period (ہجرت)", "Fiqh — The Four Schools and Their Founders (فقہ)".

Rules applied (verified by the suite + a pre-merge validation pass):

- Faithful translation of meaning; option order preserved exactly; all options arrays length 4.
- Digits 0-9 unchanged in both languages; proper names and Arabic/Islamic terms intact; Arabic script copied verbatim (the four parenthetical Arabic words in note titles appear verbatim in both `title_ur` and `title_roman`).
- Religious care: no invented or altered reference, date, Hadith number, or Quranic text.
- The 90 Roman-marked explanations (`explanationLang: "roman"`): `explanation_roman` is a VERBATIM copy of the existing `explanation` (it is already Roman Urdu — not re-translated); `explanation_ur` is its Urdu-script translation. The 15 English explanations were translated to both languages. Verified byte-for-byte for all 90.
- Working files (intermediate, NOT part of the deploy): `~/workspace/stage5a-translations/isl-001-026.json`, `isl-027-052.json`, `isl-053-078.json`, `isl-079-105.json`, `notes-islamiyat.json`. One translation child ended silently without producing its file; the ISL-027–052 slice was re-dispatched and completed with all 26 items.

## 5. Files changed (vs the pre-Stage-5 backup)

| File | Change |
|---|---|
| `src/lib/data.ts` | Flat-field types + `resolveQuestionView` / `resolveNoteView` |
| `src/lib/i18n.tsx` | `autoTranslatedBadgeAria` key |
| `src/components/QuizRunner.tsx` | Resolve-before-shuffle + 2 badge sites |
| `src/app/library/page.tsx` | `resolveNoteView` + badge; English-source label kept |
| `src/data/banks/islamiyat.json` | 6 new keys per item, inserted after `id` — **+1680 / −0 lines** |
| `src/data/content.json` | 4 new keys on the 14 Islamiyat notes only (file is minified single-line JSON; re-serialized byte-identically) |
| `scripts/test-stage5a.mjs` | New suite (50 checks) |
| `scripts/test-step2b.mjs` | 1 check updated 1:1 (label mechanism `hasTranslation` → `!shown.translated`; rendered behaviour unchanged) |
| `package.json` | `test:stage5a` script |
| `CHANGELOG.md` | Stage 5A entry |
| `VERIFY-stage5a.md` | This report |

Backup: `~/workspace/etea-prep-next-backup-pre-stage5/` (rsync, excluding node_modules/.next/tsconfig.tsbuildinfo; diff confirmed EMPTY before work started).

## 6. Verification

- **Insertions-only:** `islamiyat.json` text diff vs backup is +1680/−0 lines. Semantic deep comparison (new keys stripped) is byte-identical for BOTH `islamiyat.json` and `content.json`. No other bank file carries any `_ur`/`_roman` field; no other subject's notes carry any; `explanationUrdu` still present on every item.
- **Counts unchanged:** 763 MCQs · 151 notes · 70 flashcards · 12 teaching post tracks · 16 mocks; `/review` 15/200 untouched.
- **Build:** `npm run build` PASS (Compiled successfully). `npx tsc --noEmit` clean (strict).
- **Suites:** ALL green — **2625 checks / 34 suites, 0 failures** (baseline before Stage 5A: 2575 checks / 33 suites). The new suite contributes 50 checks: field completeness (all-or-none per language per item), options length, verbatim Roman rule, no-other-bank/subject scope, resolver fallback/identity/partial/wrong-length/blank cases on real + synthetic items, `displayExplanation` on resolved views, badge/rendering wiring, and /review + quran-data scope guards.
- **Local prod server:** all 14 routes HTTP 200 (`/`, `/library`, `/practice`, `/mock`, `/flashcards`, `/tutor`, `/plan`, `/analysis`, `/tracks`, `/topics`, `/vacancies`, `/links`, `/issues`, `/review`). Translated Urdu + Roman strings and the `[Auto-Translated]` literal are present in the built client chunks; home SSR carries the 763-MCQ counts; `/review` shows zero `pendingEnglish`.
- **NOT verified here** (no headless browser on this machine; needs the live browser check post-deploy): visual rendering of translated Islamiyat questions/notes in Urdu + Roman modes, the badge's on-screen appearance, mid-run language switching, and 360px rendering. The parent's live browser pass after the 5B deploy covers these.

## 7. Notes for the 5B batch (Tajweed)

- Follow the same pattern: add the 6 flat fields to `tajweed.json` items and the 4 fields to the 24 Tajweed notes; no renderer or type changes are needed (the resolvers are subject-agnostic).
- Tajweed has 81 English + 1 Roman-marked explanation — the verbatim-copy rule applies to the Roman one only.
- Do NOT touch `src/data/quran-examples.json` or any ayah text; Tajweed notes with audio blocks keep their existing audio behaviour (the resolver only swaps title/body text).
- Re-run the full suite set after merging; extend `test-stage5a.mjs` or add `test-stage5b.mjs` with Tajweed-specific field-completeness checks.
