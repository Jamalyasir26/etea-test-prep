# VERIFY — Phase 1, Subject 4: English bank 45 → 500 MCQs

Date: 2026-11-16. Coordinator batch: 21 slice workers, each writing one
slice file under `~/workspace/phase1-english/` (outside the repo, kept in
sync with the bank including coordinator fixes). No push, deploy, GitHub,
Vercel, or env changes; no backup recreated; no other bank/subject touched.

## Baseline (before any change)

- `npm run build` PASS; `npx tsc --noEmit` clean.
- All suites green: 3102 checks / 44 suites (counted by exit code per suite
  + PASS-line sum via `/tmp/run-all-suites.sh`, which loops
  `scripts/test-*.mjs` + `scripts/qa-540.mjs`).

## What was added

455 NEW items, **ENG-046..ENG-500**, sequential, no gaps — each in English +
Urdu script + Roman Urdu at creation, all `reviewStatus: "draft"`,
`verified: false`, `reviewedBy`/`reviewedAt` null (23-key schema, key order
byte-exact per the brief template). ID prefix `ENG-` continued from the
existing bank. `post` = the existing English 18-post array (copied verbatim
from existing items), `subject: "English"`, `subjectKey: "english"`,
`difficulty: "medium"`, `pastPaperRef: null`, `explanationUrdu: null`,
source `Original — concept-extracted from Standard English Grammar &
Composition Curriculum` on every new item.

## Coverage table (§3.5 topic map → existing → new → total)

| Topic | Map | Existing | New | Total |
|---|---|---|---|---|
| Parts of Speech | 60 | 0 | 60 | 60 |
| Tenses | 50 | 2 | 48 | 50 |
| Active & Passive Voice | 45 | 6 | 39 | 45 |
| Direct & Indirect Narration | 45 | 6 | 39 | 45 |
| Articles, Prepositions & Pronouns | 50 | 11 | 39 | 50 |
| Synonyms & Antonyms | 45 | 14 | 31 | 45 |
| Homophones & One-Word Substitution | 30 | 0 | 30 | 30 |
| Nouns | 40 | 0 | 40 | 40 |
| Agreement & Sentence Correction | 40 | 6 | 34 | 40 |
| Gerunds, Infinitives & Participles | 25 | 0 | 25 | 25 |
| Clauses & Sentence Types | 25 | 0 | 25 | 25 |
| Idioms, Phrasal Verbs & Spelling | 25 | 0 | 25 | 25 |
| Comprehension | 20 | 0 | 20 | 20 |
| **Total** | **500** | **45** | **455** | **500** |

Existing-45 classification (by content; embedded as `EXISTING_MAP` in the
new suite, file:line `scripts/test-phase1-english.mjs` §6):
- Tenses 2: ENG-018, ENG-038.
- Voice 6: ENG-005, 012, 019, 025, 032, 039.
- Narration 6: ENG-006, 013, 020, 026, 033, 040.
- Articles/Prepositions/Pronouns 11: prepositions ENG-001, 007, 014, 021,
  030, 037, 044 + articles ENG-002, 011, 022, 031.
- Synonyms/Antonyms 14: synonyms ENG-003, 009, 016, 023, 028, 035, 042 +
  antonyms ENG-004, 010, 017, 024, 029, 036, 043.
- Agreement/Correction 6: ENG-008, 015, 027, 034, 041, 045.

New-item topic labels (13, exact): `English — Parts of Speech`,
`English — Tenses`, `English — Active & Passive Voice`,
`English — Direct & Indirect Narration`,
`English — Articles, Prepositions & Pronouns`,
`English — Synonyms & Antonyms`,
`English — Homophones & One-Word Substitution`, `English — Nouns`,
`English — Agreement & Sentence Correction`,
`English — Gerunds, Infinitives & Participles`,
`English — Clauses & Sentence Types`,
`English — Idioms, Phrasal Verbs & Spelling`, `English — Comprehension`.

Slice plan (21 slices, all landed complete, validator-clean, no gaps,
no omitted slots):
S01 ENG-046–075 PoS a (30) · S02 ENG-076–105 PoS b (30) ·
S03 ENG-106–129 Tenses a (24) · S04 ENG-130–153 Tenses b (24) ·
S05 ENG-154–173 Voice a (20) · S06 ENG-174–192 Voice b (19) ·
S07 ENG-193–212 Narration a (20) · S08 ENG-213–231 Narration b (19) ·
S09 ENG-232–251 Art/Prep/Pron a (20) · S10 ENG-252–270 Art/Prep/Pron b (19) ·
S11 ENG-271–286 Synonyms (16) · S12 ENG-287–301 Antonyms (15) ·
S13 ENG-302–331 Homophones/OWS (30) · S14 ENG-332–351 Nouns a (20) ·
S15 ENG-352–371 Nouns b (20) · S16 ENG-372–388 Agreement a (17) ·
S17 ENG-389–405 Correction b (17) · S18 ENG-406–430 Gerunds (25) ·
S19 ENG-431–455 Clauses (25) · S20 ENG-456–480 Idioms/Spelling (25) ·
S21 ENG-481–500 Comprehension (20).

## Content-rule compliance

- Original questions only; standard English grammar, vocabulary,
  comprehension and usage facts only. Disputed/ambiguous usage questions
  (where two answers could be defended) were avoided; every item has
  exactly one clearly correct answer, with the explanation supporting it.
- Stage 5D rules (English bank): `options_ur` and `options_roman` are
  JSON-identical to `options` (verbatim English options — 0 violators in
  this batch); quoted spans (`"..."` and `'...'` in question/explanation)
  appear verbatim (case-insensitive) in both translations — see the
  quoted-span fix below.
- F02 Roman-Urdu guard: every new English-mode display explanation has
  <2 hits from the strict Roman-Urdu function-word list (machine-checked
  in the new suite; no new item needed a reword for this guard).
- Banned vocabulary targets (already asked by the existing 45) were not
  reused: brave, happy, abundant, ancient, honest, rich, rapid, victory,
  generous, truth, difficult, beginning, polite, expand. Synonym/antonym
  target words are unique across all 500 (machine-checked; no
  same-word/different-sense pairs).
- Digits: ASCII digits preserved per field across all 3 languages.
  `_ur` question + explanation contain Urdu script; `_roman` fields
  contain NO Urdu/Arabic script; English fields contain NO Urdu/Arabic
  script. Zero Latin honorific abbreviations anywhere.
- Dedupe: 0 exact duplicates (normalized question text, all 500). A
  Jaccard scan (threshold 0.55, stopwords removed) flagged 14 pairs —
  ALL inspected. 4 genuine same-fact collisions were rewritten (new
  items only, options/correctIndex unchanged; see below); the other 10
  were distinct-fact template siblings (pre-existing ENG-026/033;
  narration ENG-214/220; plurals ENG-335/342; feminine nouns
  ENG-353/355/357/359; phrasal verbs ENG-468/469) and were left
  untouched. The qa-540 first-12-words stem rule holds across all active
  banks (mitigation: the word/sentence under test goes in the stem,
  early; no bare stems like "Choose the correct sentence:").
- CorrectIndex distribution on new items: 114/115/114/112
  (25.1/25.3/25.1/24.6%) — within the 20–30% band.

## Coordinator fixes (all fixed, no check weakened)

1. **Jaccard near-duplicates (4 items rewritten, all 3 languages, slice
   sources synced):**
   - ENG-368: was "What kind of noun is 'gold'?" (same fact as ENG-056)
     → `"The bridge is made of steel." What kind of noun is 'steel'?`
     ('steel' unused anywhere in the bank; 'iron' already in ENG-109,
     'silver' in ENG-499).
   - ENG-264: was "'mine' possessive pronoun" with a near-identical
     sentence to ENG-060 → `"The blue bag is hers."` / 'hers' ('hers'
     previously unused).
   - ENG-266: was the SAME sentence as ENG-063 ("The boy who won the
     prize is my friend", 'who' relative, 0.88 Jaccard) → `"The book
     that I read yesterday was very interesting."` / 'that' relative
     pronoun.
   - ENG-104: was 'Hurrah' interjection, near-identical sentence to
     ENG-073 → `"Wow! What a beautiful garden."` / 'Wow' ('Wow'
     previously unused).
   Post-fix verification: 0 stem dups, 0 question dups, F02 0 hits on
   all 4 rewrites, no Jaccard ≥0.55 pairs involving them; only the 4
   items changed; first 45 deep-equal; slice-02/10/15 synced (byte-equal
   JSON per item).
2. **Stage 5D quoted spans (35 items, translations only, slice sources
   synced):** the first full run after merge failed
   `test-stage5d.mjs` on "5D English-bank quoted spans stay verbatim in
   both languages" — 70 failures in 35 items. English sources untouched;
   all root causes were translation fidelity:
   - Group A, slice-01 (23 items, ENG-046..074): translations quoted the
     English sentence but dropped its terminal punctuation inside the
     closing quote (EN `"...day,"` vs translation `"...day"`). Fix:
     added the terminal punctuation inside the closing quote in
     question_ur + question_roman.
   - ENG-106: EN explanation quotes 'waters'; translations had unquoted
     `waters`. Fix: `: waters` → `: 'waters'` in both explanation
     translations.
   - Group C, slice-06 (ENG-174..184, 11 items): EN explanations quote
     'had been'/'will be'/'can be'/'must be'/'should be'/'may be';
     translations had `'X + past participle'` so the span `'X'` never
     appeared. Fix: `'X + past participle'` → `'X' + past participle`
     in both explanation translations.
   Applied via byte-preserving block replacement (same serializer as
   merge.mjs); verification: remaining quoted-span failures 0; changed
   items = exactly the 35 touched; first 45 deep-equal; slice-01/03/06
   synced.
3. **Slice validators post-merge:** re-running a slice validator AFTER
   the merge reports self-duplicates (the bank now contains the slice
   items). Expected artifact of the pre-merge tool, not a defect; the
   authoritative checks are the repo suites, all green.

## Counts + manifest ripple (1:1)

Total **1996 → 2451**. `bank-manifest.ts` regenerated via prebuild
(english 500, 2451 ids, sha256
`5b613aa8d1590cf8b886aa24302bd9e3b3a6f573de1c2b0cb7d0a4e1e17320b3`;
byte-identical regeneration verified by two consecutive runs);
BANK_TRUSTED english still 9 (owner-reviewed count among the existing
45; new items all draft). `content.json` counts + `bySubject.english`
index extended to 500 ids (indent-0 round-trip verified; note data
untouched). Layout meta → 2451 MCQs. `1996` → `2451` in 24 files (23
scripts + `src/app/layout.tsx` meta description); `english: 45` →
`english: 500` in qa-540 EXPECTED + the three prior Phase 1 suites'
EXPECTED_OTHER blocks; test-stage5d header comment, bank-size check,
expected-count table, "(all 45)" → "(all 500)"; qa-540 header comment
now names all four Phase 1 batches. F02 pins unchanged where they must
be: exactly 124 explanationEn items, exactly 5 in the english bank,
196 roman markers — new items carry neither. Lazy-banks backup
byte-compare extended: fifth Phase 1 exception (english byte-prefix
check, 45 untouched + 455 appended) + content.json revert extended to
the English row + bySubject.english ("four Phase 1 files" → "five";
+1 check).
Ledger recomputes from data (harness adapted from
`~/workspace/phase1-islamiyat/ledger-harness.mjs`): 12 rows, 8 Exact /
1 Proxy / 3 Partial (tally unchanged); all 11 English-drawing tracks
show English 500 MCQs / 8 notes (zamungkor proxy totalMcqs 1165; tt/at
1180; pst/ct 665; ctit 695; dm 685; pet 681; qari 1680; sst-etea
partial 1075; sst-kppsc partial 605). Fixed ZamungKor lists (3×100)
resolve and stay disjoint; dynamic sampling verified via the lazybanks
three-way availability check.

## Tests + build + prod smoke

- Baseline: build PASS, tsc clean, **3102 checks / 44 suites**.
- Final: build PASS, tsc clean, **3130 checks / 45 suites, 0 failures**
  (+27 new suite, +1 lazybanks delta pin). New suite
  `scripts/test-phase1-english.mjs` (27 checks: §1 shape/IDs 4, §2
  schema 1, §3 dedupe/stems 2, §4 distribution 1, §5 audits 7 incl.
  F02 guard + vocab-target uniqueness, §6 coverage 5 incl. EXISTING_MAP
  classification, §7 manifest 4, §8 no-other-bank + content.json 2,
  §9 zamFixed 1), wired as `test:phase1english`. Passed 27/27 on
  first run.
- Prod smoke (port 3201, stopped): all 14 routes + `/mock/tt-B`,
  `/tracks/tt`, `/robots.txt` HTTP 200; home HTML carries "2451 MCQs";
  English lazy chunk (772,322 bytes, contains ENG-500) serves HTTP 200.
  (`/start` and `/settings` 404s were my own wrong guesses — no such
  routes exist.)
- Additive-only verified: merged bank bytes up to ENG-046 equal the
  pre-merge bytes + joining comma; first 45 deep-equal; the coordinator
  fixes touch only new items.

## Files changed (repo)

- `src/data/banks/english.json` (45 → 500 items)
- `src/data/content.json` (counts + bySubject.english index)
- `src/lib/bank-manifest.ts` (regenerated)
- `src/app/layout.tsx` (meta description 2451 MCQs)
- `package.json` (new `test:phase1english` script)
- `scripts/test-phase1-english.mjs` (new, 27 checks)
- 23 existing suites (count pins only, + lazybanks Phase 1 exception)
- `CHANGELOG.md` (entry appended)
- This report: `VERIFY-phase1-english.md`

Slice sources + brief + validators in `~/workspace/phase1-english/`
(outside the repo, not pushed): `BRIEF.md`, `validate-slice.mjs`,
`merge.mjs`, `slice-01.json` … `slice-21.json`.

## Caveats for the parent / owner

- All 455 new items are `draft`/unverified — owner verification via
  /review only, as always. No item is flagged as doubtful beyond the
  normal draft status; the 4 Jaccard rewrites and 35 quoted-span fixes
  are documented above.
- The source/provenance line stays English in Urdu/Roman mode (known
  Phase 2 scope, same as the Tajweed/Arabic batches).
- Ready for the parent's single-commit push + deploy + live click-through
  verification.
