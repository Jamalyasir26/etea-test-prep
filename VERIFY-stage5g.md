# VERIFY — Stage 5G: Drawing + Past Papers translation batch, FINAL (Urdu script + Roman Urdu)

Owner order (FINAL, full completion, 2026-11-14): translate ALL remaining subjects into BOTH Urdu script AND Roman Urdu, subject-wise batches with a build test after each, badge where translated, English fallback until translated, ONE deploy at the end. This batch: Drawing + Past Papers + Past Papers Reworded — the FINAL Stage 5 batch. No push/deploy from this batch — the parent handles the single push, deploy, and live browser verification after ALL remaining batches (5C–5G).

## 1. Baseline

Before any change (2026-11-14): `npm run build` PASS, `npx tsc --noEmit` clean (strict), all suites green — **2897 checks / 39 suites, 0 failures**. GitHub HEAD `d8bdbb4`. The backup `~/workspace/etea-prep-next-backup-pre-stage5/` was left untouched (not recreated).

## 2. Pattern followed (Stage 5A/5B/5C/5D/5E/5F, unchanged)

Translation data ONLY. No schema, resolver, rendering, fallback, or badge change was needed: the 5A resolvers (`resolveQuestionView` / `resolveNoteView` in `src/lib/data.ts`) are subject-agnostic, item-level fallback and the literal `[Auto-Translated]` badge are reused untouched. Flat fields `question_ur` / `question_roman`, `options_ur` / `options_roman`, `explanation_ur` / `explanation_roman` inserted after `id` in the bank files; notes gain `title_ur` / `title_roman`, `body_ur` / `body_roman` appended after `body` / `title` in `content.json`. `quran-examples.json` and `/review` untouched (suite-guarded). `drawing_pe.json` (dead/unregistered) untouched.

## 3. Translation record

**Done — ALL 90 MCQs + ALL 24 notes, none omitted, none pending:**

- Drawing: DRW-001–DRW-010 + DRW-021–DRW-060 (50 MCQs).
- Past Papers: PPT-001–PPT-020 (20 MCQs).
- Past Papers Reworded: PPR-001–PPR-020 (20 MCQs).
- Notes: Drawing/PE (24).

Pending IDs: none. Untranslated-on-purpose IDs: none.

Work was split into 8 slices (3 Drawing slices of 15/15/20 + 2×10 pastpapers + 2×10 reworded + 24 notes) translated in parallel; source slices in `~/workspace/stage5g-translations/src/`, outputs in `~/workspace/stage5g-translations/out/`, validated and merged by `~/workspace/stage5g-translations/merge.mjs` (field completeness, gloss/mixed verbatim rules forced at merge, digit preservation per explanation pattern, honorific/Arabic guards incl. the Urdu-dominant exception, then strip-checks: stripping the new keys must reproduce the pre-merge files byte-identically; originals restored on failure). All 8 translation workers completed with all items; no slice needed re-dispatch. Verbatim/gloss mismatches forced at merge: 0. **Count correction for the record:** the brief said "15 registered banks" — the tree has **16** registered banks (17 bank files minus dead `drawing_pe.json`); all 16 are now fully translated.

### ExplanationEn inspection result (required by the task)

Drawing (8) and pastpapers (1) items carry `explanationEn`. Each stored `explanation` was inspected before translation:

- **Drawing (8/8: DRW-001, DRW-002, DRW-003, DRW-004, DRW-005, DRW-021, DRW-024, DRW-025): gloss pattern.** Every stored `explanation` = an English sentence + a "Roman Urdu: <gloss>" sentence, and every one starts with its `explanationEn` sentence (verified: 8/8, zero exceptions). Handled per the 5C/5D/5F gloss rule: drop the label AND the English sentence, `explanation_roman` = the gloss content verbatim (forced at merge; 0 mismatches), `explanation_ur` = one clean Urdu-script rendering of the gloss.
- **Pastpapers (1/1: PPT-001): MIXED field.** The stored `explanation` = an English sentence + a Roman-Urdu sentence saying the same thing, starts with its `explanationEn` sentence, and carries NO "Roman Urdu:" label. Handled per the standing mixed-explanation rule: `explanation_roman` = verbatim copy of the WHOLE mixed field (forced at merge; 0 mismatches), `explanation_ur` = ONE clean Urdu-script rendering ("قرآن مجید میں حضرت محمد ﷺ کا نام 4 مرتبہ آیا ہے۔"). Flagged in §3.1 below; source data was NOT rewritten. The digit check uses the PAK-style sub/super invariant from 5E (both source sentences carry the digit 4).
- **Reworded (20/20): no `explanationEn`.** Plain English explanations, translated to both languages. PPR-001 (the reworded counterpart of PPT-001) is NOT mixed — its explanation is a single English sentence.
- **Remaining items (42 drawing + 19 pastpapers): no `explanationEn`.** Plain English explanations, translated to both languages.
- **Roman-marked items (`explanationLang: "roman"`): 0** in 5G scope.

### 3.1 Mixed-explanation flag (standing rule: verbatim copy + flag, no source rewrite)

**PPT-001 only.** Its `explanation_roman` shows the same English + Roman mix in Roman mode — the same handling as the 33 known Islamiyat mixed cases and the 45 Pak Studies mixed cases, whose cleanup (rewriting source fields) awaits an owner decision. One consequence, documented here and suite-guarded: the mixed source field contains the Latin abbreviation "(SAW)" in its Roman sentence, so the verbatim `explanation_roman` carries "(SAW)" too. That abbreviation is SOURCE data copied under the standing mixed rule, not translator-introduced text — the 5G suite's honorific audit exempts exactly this one field, and asserts the exemption is exactly the source field (`explanation_roman === explanation`). The Urdu-script translation is clean (ﷺ), and the question translations use the spelled-out honorific in both languages. No other mixed explanations were found in 5G scope (heuristic scan over all non-`explanationEn` explanations + worker reports agree).

### 5G-specific handling (decided, documented, suite-guarded)

- **Past-paper disclosure labels:** the labels live in `pastPaperRef` ("Original practice question based on past-paper topics — not the actual paper" / "Same concept as a past-paper question, reworded in a different style — not the actual paper") and are rendered by the EXISTING `topicBadge()` in `src/lib/data.ts:710` — English detail verbatim in en/roman modes, the hardcoded Urdu disclosure ("…اصل پرچہ نہیں") in ur mode. No schema/rendering change was made or needed: the labels stay byte-identical on all 40 items (suite-guarded), so the badge's `includes("reworded")` classification keeps working, and no translation field copies the label text (the badge owns it). Drawing items carry `pastPaperRef: null`.
- **Each past-paper bank translated on its own wording:** no translations were copied between the original and reworded banks; terminology is consistent across both for the same tested fact. PPT-001/PPR-001 (Quranic content, extraction-only): gloss-only translation, no new religious wording, reference, or citation added.
- **Urdu-script items (PPT-011/012/013, PPR-011/012/013):** the 5C Urdu-bank pattern — fully Urdu-script questions get `question_ur` verbatim + `question_roman` as a pure-Latin transliteration (the 5C Urdu-notes exception to the strict verbatim-in-`_roman` rule); Urdu-script options get `options_ur` verbatim + `options_roman` as transliteration + verbatim word in parentheses (e.g. "kitaabein (کتابیں)"); quoted Urdu words in English-framed explanations are kept verbatim in both languages. PPT-013/PPR-013 explanations quote the title in Latin ('Shair-e-Mashriq') in the source — kept verbatim in both languages, with the Urdu-script name form used in `explanation_ur` from the source options.
- **Honorifics (5B convention):** ﷺ / "Sallallahu Alaihi Wasallam" and رضی اللہ عنہ / "Raziallahu Anhu" in PPT-003/PPR-003, PPT-005/PPR-005, PPT-001/PPR-001 (whose questions carry "(peace be upon him)"). **Feminine form:** Hazrat Khadija's option uses رضی اللہ عنہا / "Raziallahu Anha" in PPT-005/PPR-005 (both banks, consistently) — grammatically correct for a female companion; male companions use the masculine form. Suite-guarded per option. Zero Latin abbreviations in translator-written text, machine-checked (one documented verbatim exemption: §3.1).
- **English-grammar items (PPT-006–PPT-010, PPR-006–PPR-010):** the tested English sentences/words/options stay verbatim in both languages; only instructions, frames, and explanations translate (5D English-bank pattern), so the grammar being tested is not destroyed by translation.
- **Arabic script:** only the 6 Urdu-script past-paper items above (audited) — every Arabic-script run handled per the rules above, machine-checked. No reference, date, or fact invented or altered.
- **Notes:** 22 of the 24 Drawing/PE notes carry a "Roman Urdu:" gloss sentence — all follow the gloss rule (label dropped, gloss verbatim in `body_roman`, translated in `body_ur`), suite-guarded with exact-string checks on the Drawing Basics and Hockey notes plus a verbatim check on all 22. The "Recall first:" lead-in is kept in `body_roman` and rendered as "پہلے یاد کریں:" in `body_ur` on all 24 notes (suite-guarded). Sport names transliterated in `_ur`, familiar Latin spelling in `_roman`; acronyms (RICE, FIFA, ICC, IOC, ODI, T20) and art terms used as terms (focal point, negative space, vanishing point) stay in Latin script in both languages. One source quirk preserved faithfully, not "fixed": the Fitness note's gloss lists 4 components while saying "paanchon".
- **Fidelity:** option order preserved exactly everywhere; proper names, dates, and technical terms intact.

## 4. Files changed (5G's own share)

Data (insertions-only vs the pre-Stage-5 backup; stripping the new keys reproduces the backup files byte-identically):

- `src/data/banks/drawing.json` — +800/−0 lines; first new field at line 4 (`question_ur`, DRW-001).
- `src/data/banks/pastpapers.json` — +320/−0 lines; first new field at line 4 (`question_ur`, PPT-001).
- `src/data/banks/pastpapers_reworded.json` — +320/−0 lines; first new field at line 4 (`question_ur`, PPR-001).
- `src/data/content.json` — Drawing/PE (24) notes gain the 4 translation fields; deep-identical to the backup after stripping the new note keys.

`correctIndex`, answers, `reviewStatus`, `verified`, `source`, `explanation`, `explanationEn`, `explanationUrdu`, `sourceNote`, `pastPaperRef` byte-identical in all three banks. All 16 registered banks now differ from the backup (translation fields only); `drawing_pe.json` and `quran-examples.json` are byte-identical to the backup. Pre-existing key: `sourceNote` ("AI-drafted; unreviewed") on DRW-021–DRW-030 — present in the pre-Stage-5 backup, not added by 5G.

Tests + docs:

- `scripts/test-stage5g.mjs` (new, 84 checks) + `package.json:73` (`test:stage5g` script).
- Scope guards updated 1:1 in `scripts/test-stage5a.mjs` (§5/§6), `scripts/test-stage5b.mjs` (§6/§7), `scripts/test-stage5c.mjs` (§6/§7), `scripts/test-stage5d.mjs` (§8/§9, incl. its "13 translated banks / 12 translated subjects" check names → 16/13), `scripts/test-stage5e.mjs` (§7/§8, same count-name update), `scripts/test-stage5f.mjs` (§7/§8, same count-name update) to allow all sixteen translated banks / thirteen translated note subjects — same pattern prior batches used.
- `scripts/test-stage5a.mjs` §7 — untranslated-fixture fix (see §5).
- `CHANGELOG.md` — Stage 5G entry appended.
- This report: `VERIFY-stage5g.md`.

## 5. Suite interactions found + fixed (1:1, intent preserved)

1. **5A §7 untranslated fixtures (REQUIRED final-batch fix, check-side).** `QUESTIONS.find((q) => q.question_ur === undefined)` and the notes equivalent now return `undefined` — every registered bank and note subject is translated, so no real untranslated item exists and the resolver calls would throw. Fix: the fixtures are now synthetic copies of real items with the translation keys stripped (`stripTrKeys`/`stripNoteTrKeys` helpers + comments). The resolver sees exactly an untranslated item, so the checks' intent (fallback to identity / fallback to English) is unchanged. After the fix the full set is green.
2. **Perl scope-guard over-match (caught + repaired before running).** The batch edit extending the translated-subject sets also rewrote four `NOTES["IT/Computer"]` references in `test-stage5f.mjs` into `NOTES["IT/Computer", "Drawing/PE"]` (comma-operator form, which would silently have checked the wrong subject). All four were restored to `NOTES["IT/Computer"]` and verified by grep + `node --check` + the full green run; the set literal itself is intact. No other file was affected (verified by grep).

## 6. Verification

- `npm run build` — PASS (✓ Compiled successfully in 11.0s).
- `npx tsc --noEmit` — clean (strict), exit 0.
- ALL suites green — **2981 checks / 40 suites, 0 failures** (baseline 2897 / 39; +84 from `test-stage5g.mjs`).
- Nastaliq grep over `src/` — 0 matches (Noto Sans Arabic only).
- Counts unchanged: 763 MCQs / 151 notes / 70 cards / 12 tracks / 16 mocks (suite-guarded).
- FINAL completeness (suite-guarded): all 763 questions carry complete translation triples in both languages; all 151 notes carry all 4 translation fields; all 16 registered banks + all 13 note subjects translated; `drawing_pe.json` untouched.
- Local prod server (`next start`): all 14 static routes HTTP 200 (`/`, `/analysis`, `/flashcards`, `/issues`, `/library`, `/links`, `/mock`, `/plan`, `/practice`, `/review`, `/topics`, `/tracks`, `/tutor`, `/vacancies`). Translated 5G strings present in the built server chunks (DRW-001 `explanation_ur`, Hockey gloss `body_roman`, PPT-011 `options_roman`); the `[Auto-Translated]` literal present in 2 built client chunks.
- Spot-checks passed: DRW-001 gloss handling, PPT-001 mixed verbatim + clean `_ur`, PPT-011 Urdu-dominant handling, PPT-005 Khadija feminine form, Hockey note gloss handling, `sourceNote` preserved on DRW-021–DRW-030, `pastPaperRef` labels intact.
- NOT verified here (no headless browser on this machine; needs the parent's live browser pass after the deploy): visual rendering of the translated Drawing/Past Papers quiz + Library views, mid-run language switching on 5G subjects, and the badge on 5G items.
