# VERIFY — Phase 1, Subject 1: Islamiyat bank 105 → 500 MCQs (2026-11-16)

395 NEW items (ISL-106..ISL-500), each written trilingually at creation
(English + Urdu script + Roman Urdu). No push, deploy, GitHub, Vercel, or
env change was made by this batch — the parent handles push/deploy/live
verification. No backup was recreated. No other bank or subject was
touched. All new items are `reviewStatus: "draft"`, `verified: false` —
religious content is verified by the OWNER via `/review` only.

Source map: `~/workspace/research_notes/etea-syllabus-sources-20261116/report.md`
§3.1 (Islamiyat topic map, 500 with allocations). Translation conventions:
`VERIFY-stage5a.md` §4 + the 5B honorific convention. Lazy loading:
`VERIFY-lazyload.md`.

## 1. Coverage table (§3.1 map → existing → new → total)

The existing 105 items all carry `topic: "Islamiyat"`, so they were
classified by content (ID map embedded in the new suite, §6):

| Map topic | Map | Existing | New | Total |
|---|---|---|---|---|
| 1. Quran | 90 | 35 (ISL-001–030, 091–095) | 55 | 90 |
| 2. Hadith & Sunnah | 60 | 24 (ISL-031–045, 089–090, 096–098, 102–105) | 36 | 60 |
| 3. Aqa'id | 60 | 0 | 60 | 60 |
| 4. Ibadat | 80 | 6 (ISL-083–088) | 74 | 80 |
| 5. Seerat | 90 | 33 (ISL-046–075, 099–101) | 57 | 90 |
| 6. Khulafa & Companions | 50 | 7 (ISL-076–082) | 43 | 50 |
| 7. Islamic History & Civilisation | 40 | 0 | 40 | 40 |
| 8. Ethics & Society | 30 | 0 | 30 | 30 |
| **Total** | **500** | **105** | **395** | **500** |

No topic exceeds its map allocation. New items carry fine-grained `topic`
labels (`Islamiyat — Quran`, `Islamiyat — Hadith & Sunnah`,
`Islamiyat — Aqa'id`, `Islamiyat — Ibadat`, `Islamiyat — Seerat`,
`Islamiyat — Khulafa & Companions`, `Islamiyat — Islamic History`,
`Islamiyat — Ethics & Society`) — no suite pins the distinct-topics count,
and other banks already use fine-grained labels.

## 2. Done / pending IDs

DONE: all 395 — ISL-106..ISL-500, sequential, no gaps, no duplicates.
PENDING: none. No topic slot was left unfilled.

Slice provenance (16 slices, written by delegated subagents into
`~/workspace/phase1-islamiyat/slice-NN.json`, coordinator-validated and
merged; slice files live outside the repo and are not pushed):

| Slice | IDs | Topic |
|---|---|---|
| 01 | ISL-106–135 (30) | Quran: revelation / compilation / Makki-Madni / arrangement |
| 02 | ISL-136–160 (25) | Quran: selected surahs / verses |
| 03 | ISL-161–178 (18) | Hadith: kinds / classification |
| 04 | ISL-179–196 (18) | Hadith: compilation / books / Fiqh |
| 05 | ISL-197–226 (30) | Aqa'id: Tawhid / Risalat / angels / books |
| 06 | ISL-227–256 (30) | Aqa'id: prophets / Last Day / Qadar / articles |
| 07 | ISL-257–286 (30) | Ibadat: Taharat / Salah |
| 08 | ISL-287–308 (22) | Ibadat: Zakat / Sawm |
| 09 | ISL-309–330 (22) | Ibadat: Hajj / Umrah |
| 10 | ISL-331–360 (30) | Seerat: Makkah |
| 11 | ISL-361–387 (27) | Seerat: Madinah |
| 12 | ISL-388–409 (22) | Khulafa: the four Khulafa |
| 13 | ISL-410–430 (21) | Khulafa & Companions: other companions |
| 14 | ISL-431–450 (20) | Islamic History: dynasties |
| 15 | ISL-451–470 (20) | Islamic History: scholars / contributions |
| 16 | ISL-471–500 (30) | Ethics & Society |

## 3. Content rules compliance

- ORIGINAL questions only, in the authors' own words; no question text
  copied from any source. No Hadith number, reference, date, or quote was
  invented; no Quranic verse / Hadith text / Dua quotations. Quranic and
  surah facts only where standard and well-established.
- Deliberately NOT asked as standalone questions (disputed or
  varying across accounts; some folded into explanations instead): the
  Mahr figure; the "30 years" caliphate figure; the year Hajj became
  obligatory (9 AH); the Fitr Sa' amount (Hanafi half-Sa' vs one-Sa');
  the number of Uthmanic copies; the total verse count (varies by
  counting tradition); Khadija's age at marriage (40, in an explanation
  only). ISL-155 asks the Sajdah Tilawat count (14) qualified
  "According to standard Pakistani textbooks" (15 in some conventions).
  Hanafi positions are stated explicitly where schools differ (Wudu /
  Ghusl Fara'id, Sajdah count).
- Exactly one correct answer per item; explanations support the correct
  answer. New-item `correctIndex` distribution: 99/102/103/91
  (25.1/25.8/26.1/23.0%) — asserted 20–30% per position in the new suite
  (new items only; the existing 105 are skewed 19/46/36/4 and untouched).
- Dedupe: normalized full-question comparison across all 500 items — zero
  exact duplicates. A token-set Jaccard scan (≥0.60) flagged 137 pairs;
  every pair was inspected by the coordinator. Six were genuine
  same-fact collisions and were fixed by rewriting the NEW item (never an
  existing item); the rest are template siblings testing distinct facts
  (surah numbers, name meanings, caliphate durations, title meanings,
  Nisab gold/silver, Wudu/Ghusl Fara'id, rak'ah counts, pledge counts,
  inheritance shares) and were kept. The qa-540 first-12-words stem rule
  holds across all active banks (0 dup groups).
- Coordinator fixes applied during merge validation (all in the slice
  files AND the merged bank, trilingual throughout):
  - ISL-135 rewritten: Sajdah-count duplicate of ISL-155 → Hizb per Juz (2).
  - ISL-236 rewritten: Zabur duplicate of ISL-223 → iron made soft for Dawud.
  - ISL-238 rewritten: Injeel duplicate of ISL-224 → Isa speaking from the cradle.
  - ISL-369 rewritten: third "first Mu'adhdhin" (ISL-281, ISL-422) → Adhan
    from the Kaaba after the Conquest of Makkah.
  - ISL-422 rewritten: second "first Mu'adhdhin" → Bilal's homeland, Abyssinia.
  - ISL-429 re-stemmed: title-only ("Lion of Allah") to de-overlap ISL-373
    (martyrdom at Uhud).
  - ISL-293: explanation digit repeated in translations → single 8.
  - ISL-347: "10th" spelled out in translations → digit 10 in all 3 languages.
  - Stem rewords for the qa-540 12-word rule (distinguishing word moved
    early): ISL-266 (Ghusl lead), ISL-342 (secret-preaching lead),
    ISL-487/488/489 (heir lead). Options/explanations unchanged.
- Honorifics per the 5B convention, machine-checked: ZERO Latin
  abbreviations (`(SAW)`/`(PBUH)`/`(RA)`/`(AS)`) in any field of any new
  item; English uses full forms ("peace be upon him",
  "may Allah be pleased with him/her"); `_ur` uses Arabic forms
  (ﷺ, رضی اللہ عنہ/رضی اللہ عنہا, علیہ السلام); `_roman` uses full
  spelled-out forms. Zero Arabic-script characters in English/`_roman`
  fields. Digits 0–9 preserved across all three languages (question,
  each option, explanation — multiset-checked). Abu Talib carries no
  honorific (ISL-429 options), matching the ISL-053 precedent.
- `source` on every new item is honest: `Original — concept-extracted
  from <textbook/curriculum source>` per the standing label rule; no item
  claims ETEA authorship. `pastPaperRef: null` on all new items.

## 4. Schema (new items: 23 keys, exact order)

`id, question_ur, question_roman, options_ur, options_roman,
explanation_ur, explanation_roman, post, subject, subjectKey, topic,
question, options, correctIndex, explanation, explanationUrdu,
difficulty, pastPaperRef, verified, source, reviewStatus, reviewedBy,
reviewedAt`.

Fixed values: `post` = the same 6-post list as all existing items;
`subject` "Islamiyat"; `subjectKey` "islamiyat"; `difficulty` "medium";
`pastPaperRef` null; `explanationUrdu` null (dead field, present on all
existing items); `verified` false; `reviewStatus` "draft"; `reviewedBy`
/ `reviewedAt` null. No `explanationLang`, `explanationEn`, `conceptId`,
`syllabusClause`, or `sourceKind` on new items.

Note: the batch was first merged with 21 keys (no `reviewedBy` /
`reviewedAt`); the qa-540 review-status check requires those KEYS present
on every item (line 112 of `scripts/qa-540.mjs`), so both keys (null) were
added to all 395 new items in the bank and slice files. The 23-key shape
now matches the existing items' convention (`reviewStatus, reviewedBy,
reviewedAt` in that order — cf. ISL-001).

## 5. Additive-only evidence

- Bank serialization is `JSON.stringify(items, null, 1)` + trailing
  newline (verified by byte-identical round-trip of the pre-merge file).
- The merged file's bytes up to ISL-106 equal the pre-merge file's bytes
  plus the joining comma (verified); the first 105 items parse to
  deep-equal the pre-merge 105. The lazybanks suite now pins this
  byte-prefix property against the pre-lazyload backup (§8 below).
- `src/data/banks/islamiyat.json`: 500 items, 23,646 lines, 902,292 bytes.
- `content.json` note data untouched: the ONLY content.json changes are
  `counts.total` 763→1158, the `bySubject` counts row Islamiyat 105→500,
  and the `bySubject.islamiyat` id index extended 105→500 ids
  (ISL-001..ISL-500, sequential). Verified by parsed diff against the
  pre-lazyload backup (see the lazybanks check) and by structure-compare
  after reverting the three known differences.

## 6. Manifest ripple

- `npm run prebuild` regenerated `src/lib/bank-manifest.ts`:
  `BANK_COUNTS.islamiyat` 500 (line 12), 16 banks, 1158 ids in `ID_BANK`
  (ISL-001..ISL-500 all → "islamiyat"). `BANK_TRUSTED.islamiyat` still 3
  (new items all draft; trusted total still 15).
- Byte-identical regeneration verified on a second `prebuild` run, and
  the manifest was unchanged by `npm run build` (prebuild runs inside it).

## 7. Count ripple — every changed assertion (1:1, no check weakened)

Total 763 → 1158; Islamiyat 105 → 500. Mechanical `763`→`1158`
replacement in 20 script files (check names, values, comments):
`scripts/qa-540.mjs` (also `EXPECTED` islamiyat 105→500, line 28, and the
header comment now records the Phase 1 growth),
`test-phase4a.mjs`, `test-phase4b1.mjs`, `test-phase4b2.mjs`,
`test-provenance.mjs`, `test-trilanguage.mjs`, `test-step2b.mjs`,
`test-step2fixes.mjs`, `test-step3a.mjs`, `test-step3b-audit1.mjs`
(check name de-staled from "as of Phase 4B1"),
`test-step3b-audit2.mjs`, `test-stage5a.mjs`, `test-stage5b.mjs`,
`test-stage5c.mjs`, `test-stage5d.mjs`, `test-stage5e.mjs`,
`test-stage5f.mjs`, `test-stage5g.mjs`, `test-retrieval.mjs`,
`test-lazy-banks.mjs` (loadAllQuestions total + ID_BANK length, lines 223/235).

Targeted edits beyond the mechanical replacement:
- `scripts/test-stage5a.mjs:72` + `:127` (INFO line) and
  `test-stage5b.mjs:73`: "islamiyat bank still 105" → 500 items, with the
  Phase 1 growth noted; 5A header comment records the pilot history.
  (`test-stage5c.mjs` "105" is the Roman-marked count, 60 Arabic + 45
  Urdu — UNCHANGED, correctly left alone.)
- `scripts/test-phase4b2.mjs:228-229`: ledger Qari combined row
  187 → 582 MCQs (82 Tajweed + 500 Islamiyat).
- `scripts/test-phase4b2.mjs:253-256`: meta/i18n check now pins
  "1158 MCQs" + the reworded i18n sentence (below).
- `scripts/test-lazy-banks.mjs` content byte-compare (§8 below).
- `src/data/content.json`: counts + bySubject index (§5).
- `src/app/layout.tsx:30`: meta description "763 MCQs" → "1158 MCQs".
- `src/lib/i18n.tsx:529-531` (`mockIntroC`): REWORDED in all 3 languages,
  not just renumbered. The old sentence claimed the bank "cannot supply
  8+ disjoint 100-question mocks" — true at 763, FALSE at 1158
  (8×100=800 ≤ 1158). New sentence states the true reason: the track
  mocks share the same subject banks. The ZamungKor-disjoint claim in
  `mockIntroA` is unaffected (verified: the 3 fixed lists are disjoint).

## 8. Suite interactions found + fixed (first full run: 4 failures)

1. qa-540 review-status check → added `reviewedBy`/`reviewedAt` (null) to
   all new items (§4).
2. qa-540 `content.json bySubject index lengths` check → extended the
   `bySubject.islamiyat` id index to 500 (§5). (The index is unused by
   the app per the localization audit, but it is pinned by qa-540.)
3. test-phase4b2 Qari ledger row 187 → 582 (§7).
4. test-lazy-banks content byte-compare vs the pre-lazyload backup →
   updated to assert byte-identity for every content path EXCEPT the two
   Phase 1 files, plus exact delta pins for those two: the bank file's
   backup bytes are a byte-prefix (105 items untouched) + 395 appended,
   and content.json differs from the backup ONLY in counts + the
   bySubject.islamiyat index (parsed diff). Net +2 checks (1 → 3).
   No check was weakened; the delta pins are stricter than a hash for
   these two files.

## 9. Ledger recomputation (from data, via the step3a tsc harness)

12 rows; coverage tally UNCHANGED: 8 Exact / 1 Proxy / 3 Partial
(coverage is presence-based, and Islamiyat was already present). Rows
drawing on the Islamiyat bank now show the grown counts:

| Track | Coverage | Islamiyat MCQs | Row total MCQs | trustedInBank |
|---|---|---|---|---|
| zamungkor | proxy | 500 | 710 | 15 |
| tt | exact | 500 | 725 | 14 |
| qari (combined Tajweed+Islamiyat) | exact | 582 | 807 | 14 |
| swse | partial | 500 | 650 | 5 |
| sst-etea | partial | 500 | 620 | 13 |

`trustedInBank` values are unchanged (new items are all draft).

## 10. Mock integrity

- Fixed ZamungKor lists (`content.json` `zamFixed`: zam1/zam2/zam3, 100
  ids each): every id resolves to a bank item, and the three lists are
  disjoint (asserted in the new suite §9; also covered by the lazybanks
  suite §i). The fixed lists contain no new ids (they predate Phase 1).
- Dynamic sampling with the bigger bank: the lazybanks suite §e
  three-way availability equality (`mockAvailableCount` == fs-based
  computation == built mock length, incl. trusted-only) passes for all
  20 mock definitions. `test-step2b` mock-cap checks (computed from
  `BY_SUBJECT.islamiyat.length`) pass unchanged.

## 11. New suite

`scripts/test-phase1-islamiyat.mjs` (262 lines, 24 checks), wired as
`test:phase1islamiyat` in `package.json:76`. Asserts: 500 items + exact
ID sequence + file order; 23-key schema + fixed fields + all-6-fields +
4 distinct options; normalized dedupe across 500 + the qa-540 stem rule
across all active banks; correctIndex distribution on new items only
(20–30% per position); honorific / Arabic-script / digit audits;
topic-coverage table (existing-105 classification embedded, every ID
classified exactly once; new counts = fill plan; map totals = §3.1);
manifest counts match the bank; no-other-bank scope (15 banks at
pre-Phase-1 counts; content.json counts/rows); fixed ZamungKor lists
resolve + disjoint.

## 12. Tests + build + prod smoke

- Baseline (before any work): `npm run build` PASS, `npx tsc --noEmit`
  clean, 3024 checks / 41 suites, 0 failures.
- Final: `npm run build` PASS (compiled 16.9s, 20/20 static pages),
  `npx tsc --noEmit` clean (strict), ALL suites green —
  **3050 checks / 42 suites, 0 failures** (+24 new suite, +2 lazybanks
  delta pins).
- Local prod server (`next start`, port 3197, stopped after): all 14
  routes HTTP 200 (`/`, `/practice`, `/topics`, `/library`,
  `/flashcards`, `/mock`, `/plan`, `/review`, `/tracks`, `/tutor`,
  `/vacancies`, `/analysis`, `/issues`, `/links`) + `/mock/tt-1` and
  `/tracks/tt` HTTP 200; home HTML carries "1158"; the Islamiyat lazy
  chunk (containing ISL-500) serves HTTP 200, 812,261 bytes, loaded on
  demand only — first-load chunks unchanged in kind.
- Live click-through verification is the parent's pass after deploy.

## 13. Files changed

- `src/data/banks/islamiyat.json` — 395 items appended (additive only).
- `src/data/content.json` — counts + bySubject.islamiyat index only.
- `src/lib/bank-manifest.ts` — regenerated (prebuild).
- `src/app/layout.tsx` — meta description count.
- `src/lib/i18n.tsx` — `mockIntroC` reworded (3 languages).
- `package.json` — `test:phase1islamiyat` script.
- `scripts/test-phase1-islamiyat.mjs` — new suite.
- 20 existing suites — count assertions (§7) + the lazybanks delta pins (§8).
- `CHANGELOG.md` — entry appended. This report.
- NOT changed: any other bank file, notes, flashcards, audio, `ledger.ts`,
  `data.ts`, `banks.ts`, `tracking.ts`, `sw.js`, localStorage schema,
  Vercel env, or any backup.

## 14. Caveats / open items for the parent

- All 395 new items await OWNER verification via `/review` (draft).
  Nothing in this batch is marked verified, and no item should be
  described as verified beyond the owner's own review.
- Two content judgement calls are documented, not hidden: ISL-155's
  Sajdah count (14, textbook-qualified) and the Hanafi positions stated
  in the Taharat/Salah items. If the owner prefers a different
  convention, those items are the ones to revisit.
- The 133 remaining Jaccard-flagged pairs are template siblings with
  distinct tested facts (see §3); the adjudication list is the scan
  output, re-runnable via `~/workspace/phase1-islamiyat/merge-validate.mjs`
  (scratch validator, outside the repo).
- Known pre-existing items NOT touched by this batch: the existing 105
  keep their `topic: "Islamiyat"` label and their skewed correctIndex
  distribution; the already-noted `COMP_B.ct` Pak Studies vs Social
  Studies discrepancy and the CT "no mock of its own" state are
  unchanged.
