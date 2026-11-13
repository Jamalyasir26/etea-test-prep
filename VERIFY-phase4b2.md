# VERIFY — Phase 4B2: DM (Drawing) + Qari (Tajweed + Hifz) content batch

Date: 2026-11-13 (local; NOT deployed). Parent handles the single push,
deploy, and live browser verification. No push/deploy/GitHub/Vercel/env
action was taken in this batch. Backup `~/workspace/etea-prep-next-backup-pre-phase4/`
was NOT recreated and was left untouched (used read-only for diffs).

## 1. Gap analysis (from `src/lib/ledger.ts` + bank counts, before this batch)

| Post / subject | Before | Gap found | Filled by this batch |
|---|---|---|---|
| DM — Drawing MCQs | 20 (DRW-001..010 + DRW-021..030) | dm-B needs exactly 20 → zero slack, every mock identical. Thin: line types, contour, shape vs form, 3D forms, value/highlight/cast shadow, cross-hatching/stippling/blending, one-/two-point perspective, eye level, wheel order, analogous/neutral/monochrome/tertiary, blue–orange + yellow–purple complements, pencil grades, kneaded eraser, set square, bisector/compass/angle construction, foreground/composition, figure head-unit | +30 MCQs (DRW-031..060) → 50 |
| DM — Drawing notes | 2 drawing notes in the shared 14-note Drawing/PE bucket (other 12 are PE) | No notes on value/perspective/colour-wheel depth/construction/tools/composition/observation/figure/shading techniques | +10 notes → bucket 24 |
| Qari — Tajweed MCQs | 50, all Tajweed rules | ZERO Sifaat MCQs (note existed, no questions); no Tafkheem/Tarqeeq, Raa rules, Laam-of-Allah rules, sun/moon letters, Hamzatul Wasl/Qat', Madd Leen/Iwaz/Silah; Waqf signs only م covered; no Waqf categories | +20 Tajweed MCQs (TAJ-051..070) |
| Qari — Hifz MCQs | 0 — the ledger's stated gap ("no memorisation material") | No Hifz material at all | +12 Hifz MCQs (TAJ-071..082) → Tajweed bank 82 |
| Qari — notes | 14 Tajweed notes, 0 Hifz notes | No Sifaat detail, heavy/light, sun/moon, Hamzah, extra Madd types, Waqf signs, Idgham families; no Hifz method/revision/supports notes | +10 notes (7 Tajweed + 3 Hifz) → bucket 24 |

Overlap check before writing: Islamiyat bank already covers 114 Surahs
(ISL-001), Juz (ISL-002), Makki/Madani counts (ISL-013/014), first Hafiz
(ISL-024), longest/shortest Surah and Surah titles — none duplicated.
TAJ-030 (Juz), TAJ-041 (strongest Qalqalah), TAJ-026/034 (Ghunnah),
TAJ-028 (Meem sign) not duplicated. qa-540 §4 stem check passes (no
duplicate full stems or first-12-word stems, active banks).

## 2. What was added

Counts: **763 MCQs** (701 + 62), **151 notes** (131 + 20), **70 flashcards**
(unchanged). Concept-extracted notes: 36 → 56. All new items
`reviewStatus: draft`, `verified: false`, null review fields; nothing marked
verified (owner verifies religious content himself via /review).

| Item set | IDs / titles | Source label (every item) |
|---|---|---|
| 30 Drawing MCQs | DRW-031..060 | Original content — concept-extracted from Standard Drawing Fundamentals Curriculum |
| 10 Drawing notes | Line/Shape/Form; Value/Shading; Perspective; Colour Wheel; Geometric Construction; Tools/Materials; Composition; Observation; Human Figure; Shading Techniques | same Drawing label |
| 20 Tajweed MCQs | TAJ-051..070 (Sifaat, Tafkheem/Tarqeeq, Raa, Laam, sun/moon, Hamzah, Madd, Waqf) | Original content — concept-extracted from Standard Tajweed and Hifz Curriculum |
| 12 Hifz MCQs | TAJ-071..082 (Sabq/Sabqi/Amukhta, repetition, revision, listening, teacher, one Mushaf, meaning, consistency, linking, aloud) | same Tajweed label |
| 10 Tajweed/Hifz notes | Sifaat detail; Heavy/Light; Sun/Moon; Hamzah; More Madd; Waqf signs; Idgham families; Hifz method; Revision cycles; Hifz supports | same Tajweed label |

Syllabus clauses: Drawing items `Pattern B (ESED-453) — DM: Drawing section
(20)`; Tajweed/Hifz items `Pattern B (ESED-453) — Qari: Tajweed/Hifz +
Islamiyat block (30)`. Drawing posts `["dm","pet"]`; Tajweed posts
`["zamungkor-qari","qari"]`. conceptIds: `drw-*` / `taj-*` / `hifz-*` /
`drw-note-*` / `taj-note-*` / `hifz-note-*`, all distinct, none spanning
subjects. Notes follow the house style (`Roman Urdu:` + `Recall first:`).

Concept extraction only: concepts/facts were extracted and all wording is
original. NO copied questions, NO past-paper documents, NO PDF
download/hosting. Religious-content rules observed: only universally-taught
rules and standard Hifz methods; NO Hadith numbers, references, narrations,
dates, or Quranic citations anywhere (suite-asserted); NO Quranic words —
all examples are abstract letter/rule references; the only Arabic script in
new Qari text is the six Waqf-sign glyphs (ج لا صلى قلى س م, suite-asserted).
Early-morning revision + starting with short Surahs are framed as common
teacher advice, not doctrine.

## 3. Ledger prose fix (the 4B1 knock-on) + Qari prose

`src/lib/ledger.ts:369-370` (DM) and `:415-416` (Qari), rewritten in the
count-free Phase 4B1 pattern — no hardcoded numbers; per-subject counts
recompute from the real banks:

- DM `missing`: "No missing blueprint subject. Drawing depth was grown in
  Phase 4B2 — see per-subject counts above; no practical drawing module."
  (replaces the stale "4 notes shared with Physical Education, 20 MCQs").
  `nextAction`: "Practise the DM Version B mock; owner verification of the
  new draft items via /review."
- Qari `missing`: "No missing blueprint subject. Hifz revision material was
  added in Phase 4B2 — see per-subject counts above; Quran audio revision
  arrives in Stage 4. Qualification ambiguous (see track)." (replaces "no
  memorisation material", now false). `nextAction`: "Practise the Qari
  Version B mock; owner verification of the new draft items via /review.
  Hifz revision via Quran audio (Stage 4)."

Ledger recompute verified (real data.ts + ledger.ts): DM Drawing row
50 MCQs / 24 notes / 0 cards; Qari combined row 187 MCQs (82 Tajweed + 105
Islamiyat) / 38 notes (24 + 14) / 12 cards; coverage still `exact` for both;
ledger still 12 rows.

## 4. Files changed (this batch only)

Data (insertions-only vs the pre-phase4 backup; 0 removals in every bank):
- `src/data/banks/drawing.json` — DRW-031 at line 561, DRW-060 at line 1431;
  20 → 50 items, prefix-identical to backup.
- `src/data/banks/tajweed.json` — TAJ-051 at line 1414, TAJ-082 at line 2344;
  50 → 82 items, prefix-identical to backup.
- `src/data/content.json` (single line) — notes `Drawing/PE` 14 → 24,
  `Tajweed` 14 → 24; `bySubject.drawing` 20 → 50, `bySubject.tajweed`
  50 → 82 (IDs match banks exactly, in order); `counts` total 763, notes
  151, bySubject Drawing 50 / Tajweed 82. All other content.json keys
  deep-identical to the backup.

Prose + numerals:
- `src/lib/ledger.ts:369-370,415-416` — DM + Qari prose (§3).
- `src/app/layout.tsx:30` — meta description 701 → 763 MCQs.
- `src/lib/i18n.tsx:168-170` — `quickLibraryDesc` 131 → 151 notes
  (en/roman/ur); `:438-439` — `mockIntroC` 701 → 763 (en/ur; the
  "cannot supply 8+ disjoint 100-question mocks" claim stays true).
  `src/lib/ai.ts` "131K context" is unrelated and untouched.

Suites + wiring:
- `scripts/test-phase4b2.mjs` (new, 242 lines, 48 checks) +
  `package.json` `test:phase4b2` script.
- `scripts/qa-540.mjs` — EXPECTED drawing 50 / tajweed 82 (total 763);
  drawing ID-list extended to DRW-031..060; post-fix slice bounded to
  `drawing.slice(10, 20)` (the 4B1 pe-side precedent); header/comments
  updated.
- Count assertions updated to 763/151 in: `test-retrieval.mjs`,
  `test-provenance.mjs` (also concept-extracted notes 36 → 56),
  `test-trilanguage.mjs`, `test-step2b.mjs`, `test-step2fixes.mjs`,
  `test-step3a.mjs`, `test-step3b-audit1.mjs`, `test-step3b-audit2.mjs`,
  `test-phase4a.mjs`, `test-phase4b1.mjs` (also: Drawing/PE bucket 14 → 24,
  PE-note slice bounded to `slice(4, 14)`, concept-extracted notes 36 → 56,
  pet/DM ledger rows 14 → 24 notes). The "only ctit + pet rows mention
  Phase 4B1" check still passes (count 2; new prose says "Phase 4B2").
- No CHANGELOG.md entry (4B1 precedent for content batches).

## 5. Tests

Baseline (before any change): build PASS, tsc clean, 30 suites green,
2329 PASS lines, 0 failures.
Final: build PASS, `npx tsc --noEmit` clean (strict), **31 suites green,
2377 PASS lines (2329 + 48 new), 0 failures.**

New suite `test-phase4b2.mjs` (48 checks, tsc harness on real data.ts +
ledger.ts): totals; bank/bucket sizes; new IDs appended in order; structural
QA (4 distinct options, valid correctIndex, explanation present, draft/
unverified/nulls, no explanationEn/explanationLang/sourceNote keys,
provenance + distinct conceptIds, per-subject post/source/clause); RU guard
0 hits on new text; F02 guards unchanged (124 EN / 196 markers / 196
pending); religious safety (no Hadith numbers/citations; Arabic only Waqf
glyphs); note titles/provenance/house style; concept-extracted notes 56;
dm-B/qari-B/qari-MD build 100 with 20/20/30 subject questions, no
duplicates; /review scope untouched (zam1+zam2 200, 15 trusted, no new item
in fixed lists); ledger recompute + prose guards; content.json counts/
bySubject; meta + i18n numerals.

Pre-apply validation (dry-run script `/tmp/phase4b2-apply.mjs`, 32 checks,
all passing before any write): JSON roundtrip byte-identity for all three
data files; ID/stem uniqueness (qa-540 §4 Unicode-aware norm, active banks);
RU guard; structural QA; key set/order match with ITC-031 / 4B1 notes;
conceptId distinctness + no cross-subject span; F02 counts; religious
safety. The apply script's counts were then corrected from the plan's
48/80 to the real 50/82 (20+30, 50+32) — see §7.

Local prod server (`next start`, stopped after): all 19 routes HTTP 200
(/, /practice, /review, /library, /flashcards, /mock, /plan, /tracks,
/tutor, /analysis, /issues, /links, /vacancies, /topics, /tracks/dm,
/tracks/qari, /mock/dm-B, /mock/qari-B, /api/tutor/health). Home SSR HTML
renders "763 MCQs · 151 notes · 70 flashcards · 12 teaching post tracks ·
16 mocks." Vacancies SSR HTML contains both new Phase 4B2 prose lines and
zero occurrences of the stale lines. /review 15/200 + flags: covered by
suites (client-side state; flags list is mount-gated, unchanged).

NOT verified here (needs the live deploy + browser): visual rendering of
the new items in practice/mocks/library, and the flags list post-hydration.

## 6. Omissions + decisions

- Omitted entirely: exact figure landmarks beyond safe approximations
  (note uses "about three" / "below the halfway mark"); Raa Sakinah
  exception rules; Hamzatul Wasl starting-vowel rules; any uncertain
  construction or rule. When in doubt, the item was omitted or softened.
- Notes-only concepts (no MCQ, 4B1 precedent): Qalqalah Sughra detail is
  NOT covered (existing TAJ items cover Qalqalah); Idgham families, Madd
  Far'i, Saktah detail, T-square/fixative/media detail, rule of thirds /
  focal point, sighting/grid/negative space, figure landmarks beyond the
  head unit, gradient — notes only.
- Flashcards: NONE added. No Drawing card category and no Hifz category
  exist in the ledger (drawing cardCategories []); Tajweed already has 12
  cards. The gaps were MCQ/note depth — same reasoning as 4B1. This is a
  decision, not an oversight.
- Transliteration: the sun/moon note follows the existing Makharij note's
  spellings (Ta/Tha/Dal/Dhal/Ra/Za/Seen/Sheen/Sad/Dad/Lam/Noon; Alif/Ba/
  Jeem/Ha/Kha/Ain/Ghain/Fa/Qaf/Kaf/Meem/Waw/Ya) with parenthetical
  clarifiers for the two Ta sounds, two Za sounds, and two Ha sounds, so
  the repeated names do not read as errors. TAJ-055's heavy-letter list
  matches the existing Sifaat note verbatim.
- Pre-existing COMP_B.ct Pak Studies 10 vs report/Social Studies 10
  inconsistency NOT fixed (out of scope, 4B1 precedent).

## 7. Correction to the batch plan (arithmetic)

The plan's per-bank targets (drawing 48, tajweed 80) were arithmetic slips:
20 + 30 = 50 and 50 + 32 = 82. The applied data, counts, bySubject index,
and all suite assertions use the correct 50 / 82 (total 763 was correct
throughout). The apply script initially wrote counts rows 48/80; this was
caught by a consistency check and corrected to values derived from the real
bySubject lengths before any suite ran.

## 8. For the parent (push / deploy / live verify)

Push manifest (this batch only): the 3 data files + ledger.ts + layout.tsx
+ i18n.tsx + package.json + 11 updated suite files + new
`scripts/test-phase4b2.mjs` + this report = 20 files. Single-commit push
via the GitHub connector (approval card), then deploy + live browser
verification: home counts 763/151/70, vacancies DM/Qari rows + prose,
dm-B/qari-B mocks build, /review 15/200. No deletions, no env changes.
