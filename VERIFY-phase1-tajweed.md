# VERIFY — Phase 1, Subject 2: Tajweed bank 82 → 500 MCQs (2026-11-16)

418 NEW items (TAJ-083..TAJ-500), each written trilingually at creation
(English + Urdu script + Roman Urdu). No push, deploy, GitHub, Vercel, or
env change was made by this batch — the parent handles push/deploy/live
verification. No backup was recreated. No other bank or subject was
touched. `src/data/quran-examples.json` (audio data) was NOT touched. All
new items are `reviewStatus: "draft"`, `verified: false` — religious
content is verified by the OWNER via `/review` only.

Source map: `~/workspace/research_notes/etea-syllabus-sources-20261116/report.md`
§3.2 (Tajweed topic map, 500 with allocations). Translation conventions:
`VERIFY-stage5a.md` §4 + the 5B honorific convention + the Stage 5B
Arabic-verbatim rule (§3 below). Pattern: `VERIFY-phase1-islamiyat.md`.
Lazy loading: `VERIFY-lazyload.md`.

## 1. Coverage table (§3.2 map → existing → new → total)

The existing 82 items carry mixed `topic` labels (50 plain "Tajweed" +
fine-grained labels), so they were classified by content (ID map embedded
in the new suite, §6):

| Map topic | Map | Existing | New | Total |
|---|---|---|---|---|
| 1. Makharij al-Huruf | 90 | 8 (TAJ-001–007, 029) | 82 | 90 |
| 2. Sifat al-Huruf | 70 | 15 (TAJ-025, 039–042, 051–060) | 55 | 70 |
| 3. Noon Sakinah & Tanween | 90 | 16 (TAJ-008–015, 031, 032, 034–037, 047, 048) | 74 | 90 |
| 4. Meem Sakinah | 50 | 8 (TAJ-016–019, 033, 038, 049, 050) | 42 | 50 |
| 5. Madd | 70 | 12 (TAJ-020–024, 043–046, 064–066) | 58 | 70 |
| 6. Ghunnah + Lam Shamsiyyah/Qamariyyah | 40 | 3 (TAJ-026, 061, 062) | 37 | 40 |
| 7. Waqf | 40 | 7 (TAJ-027, 028, 063, 067–070) | 33 | 40 |
| 8. Hifz & Quranic facts | 50 | 13 (TAJ-030, 071–082) | 37 | 50 |
| **Total** | **500** | **82** | **418** | **500** |

Classification notes: TAJ-029 (the general "meaning of Tajweed"
definition) is counted under Makharij as the opening topic of the science;
TAJ-063 (Hamzatul Wasl) is counted under Waqf via Ibtida basics, which the
map lists under topic 7; TAJ-030 (Juz count) is counted under Hifz &
Quranic facts. No topic exceeds its map allocation. New items carry
fine-grained `topic` labels (`Tajweed — Makharij`, `Tajweed — Sifaat`,
`Tajweed — Noon Sakinah`, `Tajweed — Meem Sakinah`, `Tajweed — Madd`,
`Tajweed — Ghunnah & Sun/Moon Letters`, `Tajweed — Waqf`,
`Hifz — Quranic Facts` (26), `Hifz — Method` (11)) — no suite pins the
distinct-topics count, and other banks already use fine-grained labels.

## 2. Done / pending IDs

DONE: all 418 — TAJ-083..TAJ-500, sequential, no gaps, no duplicates.
PENDING: none. No topic slot was left unfilled.

Slice provenance (16 slices + 1 split, written by delegated subagents into
`~/workspace/phase1-tajweed/slice-NN.json`, coordinator-validated and
merged; slice files live outside the repo and are not pushed). Slice 07
was first attempted as a single 30-item slice; that worker errored on an
output cap having written nothing, so it was re-dispatched as two 15-item
halves (slice-07a/slice-07b) and concatenated mechanically into
slice-07.json by the coordinator (order verified: TAJ-250..264 + 265..279):

| Slice | IDs | Topic |
|---|---|---|
| 01 | TAJ-083–112 (30) | Makharij: regions / 17 points / Jawf / Halq |
| 02 | TAJ-113–142 (30) | Makharij: Lisan, 10 tongue points |
| 03 | TAJ-143–164 (22) | Makharij: lips / nose / confused pairs / review |
| 04 | TAJ-165–194 (30) | Sifaat: Hams/Jahr, Shiddah/Tawassut/Rikhwah |
| 05 | TAJ-195–219 (25) | Sifaat: Isti'la/Itbaq/Idhlaq, Tafkheem/Tarqeeq, Raa/Laam, Qalqalah |
| 06 | TAJ-220–249 (30) | Noon: Izhar + Idgham |
| 07 | TAJ-250–279 (30) | Noon: Iqlab + Ikhfa (07a Iqlab/Ikhfa intro, 07b Ikhfa membership) |
| 08 | TAJ-280–293 (14) | Noon: Tanween forms / comparison / Izhar Mutlaq |
| 09 | TAJ-294–323 (30) | Meem Sakinah: three rules |
| 10 | TAJ-324–335 (12) | Meem Sakinah: identification / Ghunnah / errors |
| 11 | TAJ-336–365 (30) | Madd: Tabee'i / Muttasil / Munfasil / Lazim |
| 12 | TAJ-366–393 (28) | Madd: Aarid / Leen / Silah / Iwaz / Badal / Far'i |
| 13 | TAJ-394–418 (25) | Ghunnah + Sun/Moon letters |
| 14 | TAJ-419–430 (12) | Ghunnah + Sun/Moon: identification / review |
| 15 | TAJ-431–463 (33) | Waqf: stopping rules / Rawm-Ishmam / signs / types / Ibtida |
| 16 | TAJ-464–500 (37) | Hifz & Quranic facts (26) + Hifz method (11) |

## 3. Content rules compliance

- ORIGINAL questions only, in the authors' own words; no question text
  copied from any source. No Hadith number, reference, date, or quote was
  invented; no Hadith-pattern text at all in new items (machine-checked:
  no `hadith <digit>`, `sahih`, `bukhari`, `muslim <digit>`,
  `surah N:M`, `ayah N`, `verse N:M`, or `narrat*` in English fields).
- Quranic example words: ONLY the approved demo words from
  `src/data/quran-examples.json` (injected programmatically from the file
  by the slice authors, byte-identical in all three languages — e.g.
  TAJ-222 أَنْعَمْتَ, TAJ-229 مَن يَقُولُ, TAJ-251/253 مِنۢ بَعْدِ /
  مِن شَرِّ, TAJ-302–305 Meem examples, TAJ-349–351 Madd examples,
  TAJ-462 بِسْمِ), plus single Arabic letters and the standard mnemonic
  collections (يرملون، قطب جد، خص ضغط قظ، حثه شخص سكت، أجد قط بكت،
  لن عمر، فر من لب) and the plain word الدنيا (TAJ-293, the standard
  Izhar Mutlaq example, undiacritized). Nothing was retyped from memory.
  Most slices used letter names only and quoted no Quranic text at all.
- Deliberately NOT asked as standalone questions (disputed, varying
  across conventions, or already covered in the Islamiyat bank): the last
  revealed verse; the total verse count of the Quran; the Sajdah Tilawat
  count; the number of Saktah places. The Ikhfa mnemonic poem was not
  quoted (letters listed instead). Two items rest on standard taught
  material and are flagged for owner verification: TAJ-470 (Al-Fatiha as
  As-Sab' al-Mathani, the seven oft-repeated verses) and TAJ-473 (three
  recitations of Al-Ikhlas described as equal to the whole Quran, derived
  arithmetically from the one-third description, phrased as "described
  as"). Narrowed-to-undisputed items: TAJ-214 (Raa Sakinah after Kasrah
  before an Isti'la letter carrying a Fatha); TAJ-239 (incomplete merging
  described only for Ya/Waw, where the Ghunnah trace is undisputed).
- Exactly one correct answer per item; explanations support the correct
  answer. New-item `correctIndex` distribution: 105/109/105/99
  (25.1/26.1/25.1/23.7%) — asserted 20–30% per position in the new suite
  (new items only; the existing 82 are skewed 12/49/19/2 and untouched).
- Dedupe: normalized full-question comparison across all 500 items — zero
  exact duplicates. A token-set Jaccard scan (≥0.60) flagged 67 pairs;
  every pair was inspected by the coordinator. ALL are distinct-fact
  template siblings (per-letter drills: "which Sifah does letter X
  carry"; per-rule drills: "letter Y follows Tanween, which rule
  applies"; paired contrasts: Muttasil/Munfasil, Kilmi/Harfi, sun/moon
  sets; mnemonic-collection questions for different collections) — none
  was rewritten. 27 of the 67 pairs are pre-existing pairs among the
  untouched 82 (e.g. TAJ-017/TAJ-033, jac 0.90). Reverse-direction drills
  (letter-given → name-the-rule, e.g. TAJ-326/327 vs TAJ-017/038;
  TAJ-291's Tanween-across-words Iqlab framing vs TAJ-032; TAJ-428's
  four-case Ghunnah-free comparison vs TAJ-013/035) use distinct stems
  and wordings and were kept as legitimate drill variants. The qa-540
  first-12-words stem rule holds across all active banks (0 dup groups).
- Honorifics per the 5B convention, machine-checked: ZERO Latin
  abbreviations in any field of any new item. Arabic-verbatim rule (the
  Stage 5B rule, which differs from Islamiyat's zero-Arabic rule because
  Tajweed questions name Arabic letters): EVERY Arabic run in an English
  field appears byte-identical in the `_ur` AND `_roman` versions of the
  SAME field, and no `_roman` field introduces an Arabic run absent from
  its English source — machine-checked in the new suite. Digits 0–9
  preserved across all three languages (question, each option,
  explanation — multiset-checked). `_ur` question + explanation carry
  Urdu/Arabic script on every new item.
- `source` on every new item is honest: `Original — concept-extracted
  from Standard Tajweed and Hifz Curriculum` (the label already used by 32
  existing items); no item claims ETEA authorship. `pastPaperRef: null`
  on all new items.

## 4. Schema (new items: 23 keys, exact order)

`id, question_ur, question_roman, options_ur, options_roman,
explanation_ur, explanation_roman, post, subject, subjectKey, topic,
question, options, correctIndex, explanation, explanationUrdu,
difficulty, pastPaperRef, verified, source, reviewStatus, reviewedBy,
reviewedAt`.

Fixed values: `post` = `["zamungkor-qari", "qari"]` (the same 2-post list
as all existing Tajweed items); `subject` "Tajweed"; `subjectKey`
"tajweed"; `difficulty` "medium"; `pastPaperRef` null; `explanationUrdu`
null (dead field, present on all existing items); `verified` false;
`reviewStatus` "draft"; `reviewedBy` / `reviewedAt` null. No
`explanationLang`, `explanationEn`, `conceptId`, `syllabusClause`, or
`sourceKind` on new items. The 23-key shape (incl. `reviewedBy` /
`reviewedAt`, required present by the qa-540 review-status check) was
specified up front this time — no post-merge key fix was needed, unlike
the Islamiyat batch.

## 5. Additive-only evidence

- Bank serialization is `JSON.stringify(items, null, 1)` + trailing
  newline (verified by byte-identical round-trip of the pre-merge file).
- The merged file's bytes up to TAJ-083 equal the pre-merge file's bytes
  plus the joining comma (verified against the pre-lazyload backup copy,
  which is byte-identical to the pre-merge file); the first 82 items
  parse to deep-equal the pre-merge 82. The lazybanks suite now pins this
  byte-prefix property against the pre-lazyload backup (§8 below).
- `src/data/banks/tajweed.json`: 500 items, 21,660 lines, 772,641 bytes.
- `content.json` note data untouched: the ONLY content.json changes are
  `counts.total` 1158→1576, the `bySubject` counts row Tajweed 82→500,
  and the `bySubject.tajweed` id index extended 82→500 ids
  (TAJ-001..TAJ-500, sequential). Verified by parsed diff (reverting the
  three known differences reproduces the original bytes exactly) and by
  the lazybanks delta pin (§8). content.json stays minified, no trailing
  newline, key order preserved.

## 6. Manifest ripple

- `npm run prebuild` regenerated `src/lib/bank-manifest.ts`:
  `BANK_COUNTS.tajweed` 500 (line 22), 16 banks, 1576 ids in `ID_BANK`
  (TAJ-001..TAJ-500 all → "tajweed"). `BANK_TRUSTED.tajweed` still 0
  (new items all draft; trusted total still 15).
- Byte-identical regeneration verified on a second `prebuild` run
  (sha256 6d80b40d… identical both runs), and the manifest was unchanged
  by `npm run build` (prebuild runs inside it).

## 7. Count ripple — every changed assertion (1:1, no check weakened)

Total 1158 → 1576; Tajweed 82 → 500. Mechanical `1158`→`1576`
replacement in 20 script files (check names, values, comments):
`scripts/qa-540.mjs` (also `EXPECTED` tajweed 82→500, and the header
comment now records both Phase 1 growths),
`test-phase4a.mjs`, `test-phase4b1.mjs`, `test-phase4b2.mjs`,
`test-provenance.mjs`, `test-trilanguage.mjs`, `test-step2b.mjs`,
`test-step2fixes.mjs`, `test-step3a.mjs`, `test-step3b-audit1.mjs`,
`test-step3b-audit2.mjs`, `test-stage5a.mjs`, `test-stage5b.mjs`,
`test-stage5c.mjs`, `test-stage5d.mjs`, `test-stage5e.mjs`,
`test-stage5f.mjs`, `test-stage5g.mjs`, `test-retrieval.mjs`,
`test-lazy-banks.mjs`, `test-phase1-islamiyat.mjs`.

Targeted edits beyond the mechanical replacement:
- `scripts/test-phase4b2.mjs`: the TAJ-051..082 append check now uses
  `slice(50, 82)` (was `slice(50)`, which now returns 450 items); the
  qari-B/qari-MD mock checks say "500-item pool"; the ledger Qari
  combined row 582 → 1000 MCQs (500 Tajweed + 500 Islamiyat); the
  content.json counts check (Tajweed 500) and bySubject index check
  (`tajweed[499] === "TAJ-500"`); the bank-size check "Tajweed bank 500
  items (82 + 418 Phase 1)".
- `scripts/test-stage5b.mjs`: header comment records the Phase 1 growth;
  "tajweed bank still 82" → 500 items; "all 82 translated" → all 500 +
  INFO line `/500`.
- `scripts/test-phase1-islamiyat.mjs`: `EXPECTED_OTHER` tajweed 82→500
  (its no-other-bank scope check now expects the grown bank).
- `scripts/test-lazy-banks.mjs` content byte-compare (§8 below).
- `src/data/content.json`: counts + bySubject index (§5).
- `src/app/layout.tsx:30`: meta description "1158 MCQs" → "1576 MCQs".
- No i18n change was needed: the home subtitle and mock intro read counts
  from data, and `mockIntroC` was already reworded in the Islamiyat batch.

## 8. Suite interactions found + fixed (first full run: 1 failure)

1. test-phase4b2 "Tajweed bank 82 items" pin → updated to 500 (§7).
   The `slice(50)` append check was fixed proactively in the same edit
   round (it would have failed identically).
2. test-lazy-banks content byte-compare vs the pre-lazyload backup →
   extended to assert byte-identity for every content path EXCEPT the
   three Phase 1 files, plus exact delta pins for those three: the
   tajweed byte-prefix pin (82 untouched + 418 appended) is new (+1
   check), and the content.json revert now also reverts the Tajweed
   counts row + `bySubject.tajweed` index. No check was weakened; the
   delta pins are stricter than a hash for these files.

## 9. Ledger recomputation (from data, via the step3a-style tsc harness)

12 rows; coverage tally UNCHANGED: 8 Exact / 1 Proxy / 3 Partial
(coverage is presence-based, and Tajweed was already present). Only the
Qari track draws on the Tajweed bank:

| Track | Coverage | Combined-block MCQs | Row total MCQs | trustedInBank |
|---|---|---|---|---|
| qari (Tajweed/Hifz + Islamiyat combined) | exact | 1000 (500 + 500) | 1225 | 14 |

`trustedInBank` is unchanged (new items are all draft). Notes 38 / cards
12 on the combined row are unchanged.

## 10. Mock integrity

- Fixed ZamungKor lists (`content.json` `zamFixed`: zam1/zam2/zam3, 100
  ids each): every id resolves to a bank item, and the three lists are
  disjoint (asserted in the new suite §9; also covered by the lazybanks
  suite §i). The fixed lists contain no new ids (they predate Phase 1).
- Dynamic sampling with the bigger bank: the lazybanks suite §e
  three-way availability equality (`mockAvailableCount` == fs-based
  computation == built mock length, incl. trusted-only) passes for all
  20 mock definitions. The 4B2 qari-B (20 tajweed) / qari-MD (30
  tajweed) mock-build checks pass against the 500-item pool.
  `test-step2b` mock-cap checks (computed from `BY_SUBJECT.tajweed.length`)
  pass unchanged.

## 11. New suite

`scripts/test-phase1-tajweed.mjs` (25 checks), wired as
`test:phase1tajweed` in `package.json`. Asserts: 500 items + exact
ID sequence + file order; 23-key schema + fixed fields + all-6-fields +
4 distinct options; normalized dedupe across 500 + the qa-540 stem rule
across all active banks; correctIndex distribution on new items only
(20–30% per position); honorific / Arabic-verbatim / digit /
Hadith-pattern audits; topic-coverage table (existing-82 classification
embedded, every ID classified exactly once; new counts = fill plan; map
totals = §3.2); manifest counts match the bank; no-other-bank scope
(15 banks at expected counts incl. islamiyat 500; content.json counts);
fixed ZamungKor lists resolve + disjoint.

## 12. Tests + build + prod smoke

- Baseline (before any work): `npm run build` PASS, `npx tsc --noEmit`
  clean, 3050 checks / 42 suites, 0 failures.
- Final: `npm run build` PASS (20/20 static pages),
  `npx tsc --noEmit` clean (strict), ALL suites green —
  **3076 checks / 43 suites, 0 failures** (+25 new suite, +1 lazybanks
  delta pin).
- Local prod server (`next start`, port 3198, stopped after): all 14
  routes HTTP 200 (`/`, `/practice`, `/topics`, `/library`,
  `/flashcards`, `/mock`, `/plan`, `/review`, `/tracks`, `/tutor`,
  `/vacancies`, `/analysis`, `/issues`, `/links`) + `/mock/tt-B`,
  `/tracks/tt`, `/robots.txt` HTTP 200; home HTML carries "1576"; the
  Tajweed lazy chunk (containing TAJ-083..TAJ-500, no Islamiyat content)
  serves HTTP 200, 789,402 bytes, loaded on demand only.
- Live click-through verification is the parent's pass after deploy.

## 13. Files changed

- `src/data/banks/tajweed.json` — 418 items appended (additive only).
- `src/data/content.json` — counts + bySubject.tajweed index only.
- `src/lib/bank-manifest.ts` — regenerated (prebuild).
- `src/app/layout.tsx` — meta description count.
- `package.json` — `test:phase1tajweed` script.
- `scripts/test-phase1-tajweed.mjs` — new suite.
- 20 existing suites — count assertions (§7) + the lazybanks delta pins (§8).
- `CHANGELOG.md` — entry appended. This report.
- NOT changed: any other bank file, notes, flashcards, audio data
  (`quran-examples.json`), `ledger.ts`, `data.ts`, `banks.ts`,
  `tracking.ts`, `sw.js`, `i18n.tsx`, localStorage schema, Vercel env,
  or any backup.

## 14. Caveats / open items for the parent

- All 418 new items await OWNER verification via `/review` (draft).
  Nothing in this batch is marked verified, and no item should be
  described as verified beyond the owner's own review.
- Two content judgement calls are documented, not hidden: TAJ-470
  (Al-Fatiha as As-Sab' al-Mathani) and TAJ-473 (three recitations of
  Al-Ikhlas = whole Quran, derived from the one-third description). If
  the owner prefers different phrasing, those items are the ones to
  revisit.
- The 67 Jaccard-flagged pairs are template siblings with distinct
  tested facts (see §3); the adjudication is the scan output,
  re-runnable via `~/workspace/phase1-tajweed/merge-validate.mjs`
  (scratch validator, outside the repo).
- Known pre-existing items NOT touched by this batch: the existing 82
  keep their mixed `topic` labels and their skewed correctIndex
  distribution (12/49/19/2); the already-noted `COMP_B.ct` Pak Studies
  vs Social Studies discrepancy and the CT "no mock of its own" state
  are unchanged; one existing item (TAJ-029) carries
  `explanationLang: "roman"` (pinned by test-stage5b) — new items carry
  no such marker.
