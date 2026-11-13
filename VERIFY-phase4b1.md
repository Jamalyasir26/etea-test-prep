# VERIFY — Phase 4B1: CT-IT + PET content batch (concept extraction)

Date: 2026-11-13. Scope: fill the missing-subject gaps for **CT-IT (IT /
Computer Basics)** and **PET (Physical Education)** only. DM (Drawing) and
Qari (Tajweed/Hifz) are Phase 4B2 and were NOT touched. No push, deploy,
GitHub, Vercel, or env changes — the parent handles the single push after
all Phase 4 batches. No UI/logic changes, no translations, no flashcards.

## 1. Gap analysis (from `src/lib/ledger.ts` + the banks, before writing)

Both rows were already coverage "exact" by presence (≥1 note + ≥1 MCQ +
mock exists); "improved coverage" here means deeper per-subject counts
for the blueprint portions (CT-IT: IT/CS 25 of 100; PET: PE 20 of 100).

| Subject | Before | Ledger `missing` line (before) | Gaps found |
|---|---|---|---|
| IT (`it.json`, ITC-001..030; 6 notes; 6 cards) | 30 MCQs, 6 notes | "IT/CS depth — 30 MCQs and 6 notes for a 25-question portion." | OS functions/GUI/desktop; system vs application software; printer types, scanner, monitor, USB; SSD vs HDD, optical discs, MB/GB/TB; Word formatting shortcuts + spell check; Excel AVERAGE/MAX, cell address, workbook; PowerPoint F5; URL/HTTPS, email CC, download vs upload; passwords, phishing, backup; binary/BIT; file extensions, Save As. |
| PE (`pe.json`, DRW-011..020 + PE-001..010; 4 shared notes; 0 card categories) | 20 MCQs, 2 PE notes of 4 shared | "Physical Education depth — 4 notes shared with Drawing, 20 MCQs; no physical/practical module." | Hockey duration/surface; tennis scoring/doubles; table tennis 11; badminton 21; volleyball net height; basketball hoop height; cricket stumps/ODI/T20 overs; football penalty/goalkeeper/cards; 400 m lap/relay; javelin/discus/long jump; resting heart rate/pulse; femur/stapes/gluteus; carbohydrates/protein; (notes only: RICE, governing bodies FIFA/ICC/IOC, Olympic rings, BMI concept). |

Already covered (NOT duplicated): CPU/RAM/ROM, input/output devices,
bits/byte/KB, Office extensions, 7 shortcuts, OS identification, SUM,
formula `=`, cell, slide, WWW, browser, email `@`, search engine,
antivirus; cricket/football/hockey player counts, Olympics frequency,
marathon distance, warm-up, 206 bones, aerobic exercise, basketball/
volleyball players, shuttlecock name, 100 m sprint, sit-and-reach,
cool-down, kabaddi, shot put, heart rate, sportsmanship.

## 2. Content added (all original wording, concept extraction only)

| | MCQs | Notes | IDs / titles |
|---|---|---|---|
| IT | +30 (ITC-031..060) | +11 (`IT/Computer`) | Topics: Operating systems (031–033), Software types (034–035), Hardware (036–040), Storage (041–044), MS Word (045–047), Files & folders (048), MS Excel (049–052), MS PowerPoint (053), Internet & email (054–057), Computer security (058–060). Notes: Operating Systems / System vs Application / Storage Devices / Hardware–Printers, Scanners, Ports / Files and Folders / MS Word / MS Excel / MS PowerPoint / Internet and Email / Staying Safe / Binary. |
| PE | +26 (PE-011..036) | +10 (`Drawing/PE`) | Topics: hockey (011–012), tennis (013–014), table tennis (015), badminton (016), volleyball (017), basketball (018), cricket (019–021), football (022–024), track (025–026), field (027–029), heart rate (030–031), bones/muscles (032–034), nutrition (035–036). Notes: Hockey / Racket Games / Volleyball and Basketball / Cricket / Football / Athletics / Body in Sport / Food for Sport / First Aid–RICE / Sports Bodies and Olympics. |

Totals after: **701 MCQs** (645 + 56), **131 notes** (110 + 21),
**70 flashcards** (unchanged), 12 visible tracks, 16 visible mocks.

Sources (general curricula named honestly; no copied material, no
past-paper documents, no PDF download/hosting):
- IT: `Original content — concept-extracted from Standard Computer Fundamentals Curriculum`, clause `Pattern B (ESED-453) — CT-IT: IT/CS section (25)`.
- PE: `Original content — concept-extracted from Standard Physical Education Curriculum`, clause `Pattern B (ESED-453) — PET: Physical Education section (20)`.

Every new MCQ: exactly one correct answer with a matching explanation,
`reviewStatus: "draft"`, `verified: false`, null review fields, no
`explanationEn` / `explanationLang` / `sourceNote` keys, distinct
`conceptId` within the batch (4 note conceptIds intentionally share an
MCQ conceptId per the P0.3 grouping convention: `it-os-job`,
`it-system-software`, `it-f5-slideshow`, `pe-hockey-duration`).
`post` wiring follows existing conventions (IT: `ctit`,
`junior-clerk`, `computer-operator`, `lhv`; PE: `dm`, `pet`). No new
subject keys; `it` / `pe` and SUBJECT_LABELS already existed.

## 3. Files changed

| File | Change |
|---|---|
| `src/data/banks/it.json` (lines 903–1861) | Appended ITC-031..060 (30 items). Diff vs pre-Phase-4 backup: **960 insertions, 0 removals**. |
| `src/data/banks/pe.json` (lines 558–1337) | Appended PE-011..036 (26 items). Diff: **780 insertions, 0 removals**. |
| `src/data/content.json` (single line) | Appended 11 notes to `notes["IT/Computer"]` (6→17) and 10 to `notes["Drawing/PE"]` (4→14); `counts`: total 645→701, IT 30→60, Physical Education 20→46, notes 110→131 (cards 70 / tracks 19 / mocks 20 unchanged); `bySubject` index extended (it 60, pe 46 — required by qa-540 §8; see §6). All other buckets byte-identical prefixes. |
| `src/lib/ledger.ts` (lines 347–348, 391–392) | ctit + pet `missing`/`nextAction` prose only: count-free wording noting Phase 4B1 growth. DM/Qari rows untouched. |
| `src/app/layout.tsx` (line 30) | Meta description numeral: 645→701 MCQs (stale hardcoded count fix, same class as the Step 3a fix). |
| `src/lib/i18n.tsx` (`quickLibraryDesc`, `mockIntroC`) | Numerals only: 110→131 notes (en/roman/ur), 645→701-question bank (en/ur). No new translations; the "cannot supply 8+ disjoint 100-question mocks" claim stays true at 701. |
| `scripts/test-phase4b1.mjs` (new, 207 lines) | New suite, 46 checks (see §5). Wired as `test:phase4b1` in `package.json`. |
| 11 existing suites | Count assertions only: qa-540 (EXPECTED it 60 / pe 46, pe ID list to PE-036, post-fix slice bounded to `pe.slice(10, 20)`), test-retrieval, test-provenance (645→701; concept-extracted notes 15→**36** — 15 + 21; an earlier planning note said 34, the data says 36), test-trilanguage, test-step2b, test-step2fixes, test-step3a, test-step3b-audit1, test-step3b-audit2, test-phase4a. F02 guards UNCHANGED: `explanationEn` 124, roman markers 196, pending 196. |

## 4. Deliberately omitted (and why)

- **BMI formula** — concept only in the "Food for Sport" note, no formula
  (keeps the item checkable without a memorised formula).
- **Vitamin C / scurvy** — already covered in the science bank.
- **Olympic motto** — wording changed in 2021; omitted rather than risk
  a stale fact.
- **Squash; exact Excel row/column counts** (version-specific);
  **game durations that vary by governing body** (e.g. basketball game
  length) — omitted as uncertain or version-dependent.
- **RICE / FITT / governing bodies as MCQs** — covered in notes only;
  no MCQ written where the fact is procedural rather than testable.
- **Flashcards: none added.** PE has no ledger card category (cards
  would not register in the ledger), IT already has 6 cards, and the
  gaps were MCQ/note depth. Reported as a decision, not an oversight.

## 5. Verification

Baseline (before this batch, per the task brief): build PASS, tsc clean,
2283 checks / 29 suites.

Final (2026-11-13, this tree):
- `npm run build`: **PASS** (all routes listed; no errors).
- `npx tsc --noEmit`: **clean** (strict).
- All suites: **2329 PASS / 0 FAIL / 30 suites** (2283 + 46 new
  checks; every suite exit 0). Per-suite counts recorded in
  `/tmp/phase4b1-suites.log` (ephemeral; rerun to reproduce).
- New suite `scripts/test-phase4b1.mjs` (46 checks): new-item
  structural QA (one correct answer, explanation present, unique IDs,
  draft status, provenance, no F02 keys), counts 701/131/70, F02
  pending still 196, RU guard 0 hits on all 56 new explanations (exact
  detector + word set copied from test-step3b-audit2.mjs), ledger
  recompute (ctit IT row 60 MCQs / 17 notes / 6 cards; pet PE row
  46 MCQs / 14 notes / 0 cards; coverage still exact), ctit-B builds
  100 (25 IT) and pet-B builds 100 (20 PE) with no duplicates,
  zam1+zam2 fixed scope still 200 with 15 trusted, DM/Qari rows
  untouched.
- Pre-write validation script (`/tmp/phase4b1-apply.mjs`, dry-run
  first): 24/24 checks — ID uniqueness, no collisions, stem uniqueness
  (full-stem + qa-540 §4 first-12-words: 0 duplicate groups across all
  701 items), RU 0 hits on explanations/questions/options, JSON
  roundtrip byte-identity for all three data files before writing.
- Local prod server (`next start`, port 3100): **19/19 routes HTTP
  200** (/, /practice, /review, /library, /flashcards, /mock, /plan,
  /tracks, /tutor, /analysis, /issues, /links, /vacancies, /topics,
  /tracks/ctit, /tracks/pet, /mock/ctit-B, /mock/pet-B,
  /api/tutor/health). Home renders "701 MCQs · 131 notes · 70
  flashcards · 12 teaching post tracks · 16 mocks." Vacancies renders
  the recomputed ledger rows and the new ctit/pet prose. /review
  returns 200 with bank data present and no pending-English queue
  section; the 15/200 + flags state is client-side (localStorage) and
  is covered by the suites (test-reviews, test-step3b-audit2 F12,
  test-phase4b1 zam scope), not by the curl check. Server stopped
  after verification.
- Backup `~/workspace/etea-prep-next-backup-pre-phase4/` untouched
  (its `it.json` still holds 30 items).

## 6. Notes for the parent / Phase 4B2

1. **DM-prose knock-on (expected, leave for 4B2):** the DM ledger row
   still says "4 notes shared with Physical Education" — the shared
   `Drawing/PE` bucket is now 14 notes, and the DM ledger row already
   recomputes to 14. Phase 4B2 (Drawing content) should rewrite the DM
   prose; this batch deliberately did not touch it. The "20 MCQs" in
   the DM prose is still accurate (drawing bank unchanged).
2. **`content.bySubject` index is NOT dead:** `src/` never reads it,
   but qa-540 §8 asserts its lengths match the banks. This batch
   extended it (it 60 / pe 46). Any future bank growth must extend it
   too, or qa-540 fails.
3. **Stale hardcoded counts found beyond the suites:** the meta
   description and two i18n strings carried 645/110 (fixed here, §3).
   Future content batches should grep `src/` for the old totals, not
   just `scripts/`.
4. **New items flow into mocks automatically** (ctit-B/pet-B use `comp`
   sampling, not fixed ID lists); trusted counts are unchanged because
   all new items are draft. Owner verification of the 56 new items
   happens via /review — nothing was marked verified.
5. **One pre-existing inconsistency, NOT fixed** (out of scope, already
   flagged in Step 3a): `COMP_B.ct` Pak Studies 10 vs the report's
   Social Studies 10. Unchanged by this batch.
