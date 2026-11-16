# VERIFY — Phase 1, Subject 3: Arabic bank 80 → 500 MCQs

Date: 2026-11-16. Coordinator batch: 16 slice workers, each writing one
slice file under `~/workspace/phase1-arabic/` (outside the repo, kept in
sync with the bank including coordinator fixes). No push, deploy, GitHub,
Vercel, or env changes; no backup recreated; no other bank/subject touched.

## Baseline (before any change)

- `npm run build` PASS; `npx tsc --noEmit` clean.
- All suites green: 3076 checks / 43 suites (42 `test-*.mjs` files + qa-540
  at 52/52). Baseline re-verified by exit code per suite (an early grep-based
  count misfired on the word "fail" inside suite text; the exit-code run is
  authoritative: 42/42 + qa-540, 0 failures).

## What was added

420 NEW items, **ARB-081..ARB-500**, sequential, no gaps — each in English +
Urdu script + Roman Urdu at creation, all `reviewStatus: "draft"`,
`verified: false`, `reviewedBy`/`reviewedAt` null (23-key schema, key order
byte-exact per the brief template). ID prefix `ARB-` continued from the
existing bank. `post: ["at"]`, `subject: "Arabic"`, `subjectKey: "arabic"`,
`difficulty: "medium"`, `pastPaperRef: null`, `explanationUrdu: null`,
source `Original — concept-extracted from Standard Arabic Grammar
(Nahw/Sarf) Curriculum` on every new item.

## Coverage table (§3.3 topic map → existing → new → total)

| Topic | Map | Existing | New | Total |
|---|---|---|---|---|
| Kalimah & kinds | 60 | 4 | 56 | 60 |
| I'rab & case endings | 70 | 14 | 56 | 70 |
| Sentences | 70 | 16 | 54 | 70 |
| Verbs | 80 | 8 | 72 | 80 |
| Sarf | 60 | 15 | 45 | 60 |
| Pronouns & Particles | 60 | 19 | 41 | 60 |
| Vocabulary | 60 | 2 | 58 | 60 |
| Islamic Context & Translation | 40 | 2 | 38 | 40 |
| **Total** | **500** | **80** | **420** | **500** |

Existing-80 classification (by content; embedded as `EXISTING_MAP` in the
new suite, file:line `scripts/test-phase1-arabic.mjs` §6):
- Kalimah 4: ARB-003/004/005 (Ism/Fi'l/Harf) + ARB-030 (Al- definiteness,
  an Ism property).
- I'rab 14: ARB-001/080 (Nahw definitions) + 006/007/008 (case vowel signs)
  + 031 (Tanween) + 061/062/063/065/066/067 (Fa'il/Maf'ul case signs) +
  077/078 (Raf'/Jarr signs).
- Sentences 16: ARB-009–018 + 064/068 (role identification in sentences) +
  069–072 (nominal-sentence parts).
- Verbs 8: ARB-019–024 + 074/075 (kataba/uktub forms).
- Sarf 15: ARB-002/079 (Sarf definitions) + 025–029 (singular/dual/plural/
  feminine word forms) + 051–056 (root families) + 073 (root-letter count)
  + 076 (Wazn).
- Pronouns & Particles 19: ARB-032–050.
- Vocabulary 2: ARB-057/058 (Bayt/Shams).
- Islamic Context 2: ARB-059/060 (Badr/Uhud).

New-item topic labels (8, exact): `Arabic — Kalimah`, `Arabic — I'rab`,
`Arabic — Sentences`, `Arabic — Verbs`, `Arabic — Sarf`,
`Arabic — Pronouns & Particles`, `Arabic — Vocabulary`,
`Arabic — Islamic Context & Translation`.

Slice plan (16 slices, all landed complete, no gaps, no omitted slots):
01 ARB-081–108 Kalimah a · 02 ARB-109–136 Kalimah b · 03 ARB-137–164
I'rab a · 04 ARB-165–192 I'rab b · 05 ARB-193–219 Sentences a ·
06 ARB-220–246 Sentences b · 07 ARB-247–270 Verbs a · 08 ARB-271–294
Verbs b · 09 ARB-295–318 Verbs c · 10 ARB-319–341 Sarf a ·
11 ARB-342–363 Sarf b · 12 ARB-364–384 Pronouns a · 13 ARB-385–404
Pronouns b · 14 ARB-405–433 Vocabulary a · 15 ARB-434–462 Vocabulary b ·
16 ARB-463–500 Islamic Context & Translation.

## Content-rule compliance

- Original questions only; **zero** Hadith numbers/citations/narration words
  (machine-checked, same pattern as the Tajweed suite, English fields).
  No long ayah quotations; T8 asks phrase MEANINGS only (Bismillah,
  Alhamdulillah, etc.). No invented references, dates, or quotes.
- Arabic script: English fields restricted to an approved list (forms
  attested in the existing 80 + a short whitelist of standard unvocalized
  words; never vocalized from memory). In the event, **all 420 new English
  fields use transliteration only** (zero Arabic-script runs), so the
  Arabic-verbatim rule holds trivially and `_roman` fields contain no
  Arabic script. `_ur` fields carry Urdu script throughout.
- Deliberately avoided: a Harf item on Ma'a (مع is a zarf/Ism, not a Harf —
  replaced with Wa); repeats of ARB-032–050 pronoun/demonstrative/preposition
  meanings (new angles only: dual/plural, agreement, attachment); repeats of
  ARB-057–060 (Bayt/Shams/Badr/Uhud).
- Honorifics per 5B (zero Latin abbreviations, machine-checked over the
  whole item JSON). Digits preserved across languages (ASCII digits
  everywhere; only ARB-402/403 carry digits).
- One convention note: slice-09 uses the standard term "Sahih" (sound verb)
  in `_ur`/`_roman` fields only; English fields say "sound verb" because the
  Hadith-pattern audit bans the word in English fields. The audit scopes to
  English fields only, matching the Tajweed suite — no change needed.
- Dedupe: 0 exact duplicates (normalized question text, all 500). A Jaccard
  scan (threshold 0.55, stopwords removed) flagged 47 pairs — ALL inspected:
  19 pre-existing pairs among the old 80 (never touched) + 28 new-item pairs,
  all distinct-fact template siblings (per-case/per-ending/per-form drills,
  e.g. Raf'/Nasb/Jarr triplets, -un/-an/-in triplets, Lan-vs-Lam,
  Mithal/Ajwaf/Naqis positions). None rewritten; no genuine same-fact
  collision found. The qa-540 first-12-words stem rule holds across all
  active banks.
- CorrectIndex distribution on new items: 104/107/106/103
  (24.8/25.5/25.2/24.5%) — within the 20–30% band.

## Merge findings (all fixed, no check weakened)

1. **Stage 5C pins (2 failures, first full run):** `test-stage5c.mjs` pinned
   the arabic bank at 80 items and 80 translated. Updated 1:1 to 500
   (bank-size check + the `["arabic", "arabic", 80]` expected-count table).
   All 500 items carry complete translation triples, so the all-or-none and
   ur==roman checks pass unchanged.
2. **F02 Roman-Urdu guard (1 failure, first full run):**
   `test-step3b-audit2.mjs` flagged ARB-372 and ARB-500: transliterated
   Arabic words collide with the detector's function-word list ("ka"/"ki"
   pronoun suffixes; "Ana" pronoun, twice). Both English explanations were
   reworded in ALL THREE languages (same facts, coordinator edit, verified
   by byte-diff: exactly 6 explanation lines changed in the bank file):
   - ARB-372: "The two endings mark a male addressee and a female
     addressee, so the pair differs in the gender of the person being
     addressed." (0 detector hits; was 2.)
   - ARB-500: "Joining the pronoun for 'I' with the word for 'a student'
     gives 'Ana talib'." (1 detector hit; threshold is 2.)
   Slice sources (`slice-12.json`, `slice-16.json`) kept in sync
   (verified byte-equal JSON for both items).
3. **Slice validators post-merge:** re-running a slice validator AFTER the
   merge reports self-duplicates (the bank now contains the slice items).
   Expected artifact of the pre-merge tool, not a defect; the authoritative
   checks are the repo suites, all green.

## Counts + manifest ripple (1:1)

Total **1576 → 1996**. `bank-manifest.ts` regenerated via prebuild
(arabic 500, 1996 ids, sha256 `c19d4358…`; byte-identical regeneration
verified by two consecutive runs). `content.json` counts + `bySubject.arabic`
index extended to 500 ids (indent-0 round-trip verified; note/flashcard/
plan data untouched). Layout meta → 1996 MCQs. 22 suites' count assertions
updated (1576 → 1996; `arabic: 80` → `arabic: 500` in qa-540 + both prior
Phase 1 suites' `EXPECTED_OTHER` blocks; qa-540 header comment updated to
name all three Phase 1 batches). Lazy-banks backup byte-compare extended:
fourth Phase 1 exception (arabic byte-prefix check, 80 untouched + 420
appended) + content.json revert extended to the Arabic row/index (+1 check).
Ledger recomputes from data: 12 rows, 8 Exact / 1 Proxy / 3 Partial
(unchanged); AT row shows Arabic 500 MCQs / 13 notes, totalMcqs 725, Exact.
Fixed ZamungKor lists (3×100) resolve and stay disjoint; dynamic sampling
verified via the lazybanks three-way availability check.

## Tests + build + prod smoke

- Baseline: build PASS, tsc clean, **3076 checks / 43 suites**.
- Final: build PASS, tsc clean, **3102 checks / 44 suites, 0 failures**
  (+25 new suite, +1 lazybanks delta pin). New suite
  `scripts/test-phase1-arabic.mjs` wired as `test:phase1arabic`.
- Prod smoke (port 3199, stopped): all 14 routes + `/mock/tt-B`,
  `/tracks/tt`, `/robots.txt` HTTP 200; home HTML carries "1996 MCQs";
  Arabic lazy chunk (636,591 bytes, contains ARB-500) serves HTTP 200.
  (`/about` 404 was my own wrong guess — no such route exists.)
- Additive-only verified: merged bank bytes up to ARB-081 equal the
  pre-merge bytes + joining comma; first 80 deep-equal; the two
  coordinator explanation edits touch only new items.

## Files changed (repo)

- `src/data/banks/arabic.json` (80 → 500 items)
- `src/data/content.json` (counts + bySubject.arabic index)
- `src/lib/bank-manifest.ts` (regenerated)
- `src/app/layout.tsx` (meta description 1996 MCQs)
- `package.json` (new `test:phase1arabic` script)
- `scripts/test-phase1-arabic.mjs` (new, 25 checks)
- 22 existing suites (count pins only, + lazybanks Phase 1 exception)
- `CHANGELOG.md` (entry appended)
- This report: `VERIFY-phase1-arabic.md`

Slice sources + brief + validators in `~/workspace/phase1-arabic/` (outside
the repo, not pushed): `BRIEF.md`, `validate-slice.mjs`, `merge.mjs`,
`slice-01.json` … `slice-16.json`.

## Caveats for the parent / owner

- All 420 new items are `draft`/unverified — owner verification via /review
  only, as always. No item is flagged as doubtful beyond the normal
  draft status; the two F02 rewords are documented above.
- T8 translation items (ARB-483–500) use transliterated Arabic in English
  and `_roman` fields; `_ur` options render the same sentences in Arabic
  script. This is by design (verbatim rule) and matches the brief.
- Ready for the parent's single-commit push + deploy + live click-through
  verification.
