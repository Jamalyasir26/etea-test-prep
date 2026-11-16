# VERIFY — Phase 1, Subject 5: Urdu bank 45 → 500 MCQs

Date: 2026-11-16. Coordinator batch: 29 slice workers (20 slices, several
split into halves after output-cap errors), each writing one slice file
under `~/workspace/phase1-urdu/` (outside the repo, kept in sync with the
bank including coordinator fixes). No push, deploy, GitHub, Vercel, or env
changes; no backup recreated; no other bank/subject touched.

## Baseline (before any change)

- `npm run build` PASS; `npx tsc --noEmit` clean.
- All suites green: 3130 checks / 45 suites (counted by exit code per suite
  + PASS-line sum via `/tmp/run-all-suites-urdu.sh`, which loops
  `scripts/test-*.mjs` + `scripts/qa-540.mjs`).

## What was added

455 NEW items, **URD-046..URD-500**, sequential, no gaps — each in English +
Urdu script + Roman Urdu at creation, all `reviewStatus: "draft"`,
`verified: false`, `reviewedBy`/`reviewedAt` null (23-key schema, key order
byte-exact per the brief template). ID prefix `URD-` continued from the
existing bank. `post` = the existing Urdu 7-post array
`["zamungkor","tt","at","qari","sst-kppsc","police","forest"]` (copied
verbatim from existing items), `subject: "Urdu"`, `subjectKey: "urdu"`,
`difficulty: "medium"`, `pastPaperRef: null`, `explanationUrdu: null`,
source `Original — concept-extracted from Standard Urdu Qawaid-o-Insha &
Adab Curriculum` on every new item. No new item carries `explanationLang`
or `explanationEn` (0 violators, machine-checked).

## Coverage table (§3.4 topic map → existing → new → total)

The existing 45 all carry the generic topic label `Urdu`; they were
classified by content (embedded as `EXISTING_MAP` in the new suite, §6).
New items carry the 10 topic labels below.

| Topic | Map | Existing | New | Total |
|---|---|---|---|---|
| Ism & Kinds | 80 | 5 | 75 | 80 |
| Fi'l & Kinds | 70 | 4 | 66 | 70 |
| Harf & Kinds | 40 | 1 | 39 | 40 |
| Jumla & Tarkeeb | 50 | 0 | 50 | 50 |
| Jins & Adad | 50 | 8 | 42 | 50 |
| Lughat | 50 | 27 | 23 | 50 |
| Muhavare & Zarb-ul-Amsal | 60 | 0 | 60 | 60 |
| Ilm-e-Bayan & Badee | 30 | 0 | 30 | 30 |
| Urdu Adab | 40 | 0 | 40 | 40 |
| Talafuz, Sabqay & Huroof | 30 | 0 | 30 | 30 |
| **Total** | **500** | **45** | **455** | **500** |

Existing-45 classification: Lughat 27 (URD-001–025 + 044–045,
synonyms/antonyms), Ism 5 (026, 028, 029, 042, 043), Fi'l 4 (027, 039,
040, 041), Harf 1 (030), Jins & Adad 8 (031–038). Only URD-001 is
owner-reviewed (`BANK_TRUSTED` urdu = 1, unchanged).

## Slice inventory (all 20 landed, coordinator re-validated)

| Slice | IDs | Topic | Notes |
|---|---|---|---|
| S01 | URD-046–070 | Ism — Marfa | See Musawwaf→Mausool correction below |
| S02 | URD-071–095 | Ism — Nakra | Istifham items avoid "Zameer" distractors |
| S03 | URD-096–120 | Ism — Jamid/Masdar/Mushtaq | URD-120 rewritten by coordinator (see below) |
| S04 | URD-121–143 | Fi'l — tenses | |
| S05 | URD-144–165 | Fi'l — Maroof/Majhool, Mufrad/Murakkab | Passive examples all agentless |
| S06 | URD-166–186 | Fi'l — Maavun, Amr/Nahy | Nahy items never test lone `mat` |
| S07 | URD-187–206 | Harf — Jarr/Atf/Takhsees/Istisna | `bhi` avoided; `magar` not tested as Istisna |
| S08 | URD-207–225 | Harf — Shart/Nafi/Istifham, Ne/Ko | Halves 8a+8b; `se` kept out entirely |
| S09 | URD-226–250 | Jumla — Ismiya/Failiya/Sada/Murakkab/Hum-Rutba | "ke lihaz se" framing only (see caveats) |
| S10 | URD-251–275 | Jumla by meaning + Tarkeeb | Halves 10a+10b; URD-253 re-sentenced (see below) |
| S11 | URD-276–296 | Jins | `aurat → admi` and `billa` avoided |
| S12 | URD-297–317 | Adad | Same-form plurals + disputed spellings left out |
| S13 | URD-318–340 | Lughat — synonyms/antonyms | 23 fresh targets; 16 existing targets not reused |
| S14 | URD-341–365 | Muhavare — meanings | 25 standard muhavare |
| S15 | URD-366–390 | Muhavare — sentence use | Halves 15a+15b; 4 items rewritten (see below) |
| S16 | URD-391–400 | Zarb-ul-Amsal | 10 standard proverbs; distractors also genuine |
| S17 | URD-401–430 | Bayan & Badee | Halves 17a+17b; original illustrative sentences only |
| S18 | URD-431–455 | Urdu Adab — poets/writers/books | No years, no quoted couplets |
| S19 | URD-456–470 | Urdu Adab — forms/terms | No ghazal couplet-count question |
| S20 | URD-471–500 | Talafuz/Sabqay/Huroof/Rozmarrah | No disputed pronunciations; no alphabet count |

Five first-attempt workers errored with output-cap failures and wrote
nothing (S08, S10, S15, S17) or ended silent with no file (S12); all were
recovered by re-dispatch / half-splits. Every landed slice was re-validated
by the coordinator with `validate-slice.mjs` (16 checks, exit 0) — not just
worker-reported. Half-slice files retained in `~/workspace/phase1-urdu/`
(slice-08a/08b, 10a/10b, 15a/15b, 17a/17b); concatenations were mechanical
with order verification + full-slice re-validation.

## Merge findings (coordinator fixes — all in new items only, slice sources kept in sync)

1. **Slice 15b idiom overlap (4 items rewritten).** The 15b worker reused
   four idioms already tested as correct answers in 15a: `daal mein kuch
   kaala hona` (URD-367), `chaar chaand lagana` (URD-366), `khoon ka
   ghoont peena` (URD-371), `kaan bharna` (URD-369). The coordinator
   rewrote URD-379, URD-381, URD-384, URD-390 with fresh standard idioms
   (`aankhein bichhana`, `rang laana`, `haath baantna`, `hawa ho jana`),
   keeping formats and correctIndex values. A tested-phrase scan over
   slices 14/15/16 then showed 60 distinct tested idioms/proverbs, zero
   duplicates. Patch applied to both `slice-15b.json` and `slice-15.json`;
   both re-validated clean.
2. **Jaccard scan (threshold 0.55, stopwords removed, all 500 items).**
   224 flagged pairs: ~189 were pre-existing pairs among the old 45
   (template items, untouched). Of the 35 new-item pairs, all were
   inspected: 33 are distinct-fact template siblings (per-kind, per-verb,
   per-form, definition-vs-identification, contrasting-kind pairs) and
   stand, documented here. Two were genuine collisions and were fixed:
   - **URD-120 rewritten** — it duplicated URD-090 exactly (both asked
     what kind of Ism `kaun` is, both answered Ism-e-Istifham). Rewritten
     as an Ism-e-Jama definition item (`qafila` example), in S03 scope,
     correctIndex kept at 3. Jaccard vs URD-090 fell 0.67 → 0.08.
   - **URD-253 re-sentenced** — it reused URD-235's exact example sentence
     (`Mali bagh mein phool lagata hai`) for a different classification
     axis. New sentence `Dukaan subah khulti hai`, same options/answer.
     Jaccard vs URD-235 fell 0.70 → 0.15.
   Patch applied to `slice-03.json`, `slice-10.json` and `slice-10a.json`;
   both slices re-validated clean. `_ur`-question dedupe: 0 duplicates.
3. **Suite check rescope (not a weakening).** The new suite's
   synonym/antonym target-uniqueness check as drafted failed on the
   pre-existing 45, which deliberately pair a synonym item and an antonym
   item on the SAME target word (URD-001/002 both target `dost`, etc.).
   The check is now scoped to the 455 new items, with the design
   documented in a comment; new-vs-existing collisions remain covered by
   the banned-targets check (16 existing targets forbidden to new items).
   No other check was weakened. F02 guard: all 455 new English
   explanations pass with <2 detector hits; **zero** F02 rewords needed.

## Script / codepoint / translation audits (all machine-checked)

- Zero Urdu/Arabic script in any new English or `_roman` field; every
  `_ur` option is full Urdu script. Urdu codepoints only: ی (U+06CC) and
  ک (U+06A9) — never Arabic ي/ك. Repeated script forms byte-identical
  within each item (NFKC-collision check). Digits preserved across all
  three languages (no digits in this batch's content).
- Stage 5C §5 verbatim audit holds trivially: zero script in new English
  fields, so there is nothing to match. Roman-marker count for Urdu stays
  at 45 (existing items only); `explanationUrdu` is null on all 455 new
  items. The qa-540 12-word stem rule holds across all banks.
- New-item `correctIndex` distribution: **111/113/122/109**
  (24.4% / 24.8% / 26.8% / 24.0%).
- Content bans honored: no disputed gender/plural/pronunciation; no
  alphabet-letter-count questions; no poet birth/death years; no verses
  or couplets quoted from memory (Adab = prose facts; Bayan = original
  illustrative sentences); only well-known standard muhavare/proverbs.

## Counts + manifest ripple (mechanical, 1:1)

- Total 2451 → **2906**. `src/lib/bank-manifest.ts` regenerated via
  `npm run prebuild` (urdu 500, 16 banks, 2906 ids, `BANK_TRUSTED` urdu
  still 1; sha256
  `27f4b8711305e40a031ff500e3dd2fcb72e3e79cd5b6e5c2028d25aa123b2161`;
  byte-identical regeneration verified over two consecutive runs).
- `content.json` counts + `bySubject.urdu` index extended to 500 ids
  (merge output; indent 0, no trailing newline preserved; note data
  untouched). Layout meta description → 2906 MCQs.
- `2451` → `2906` in 25 files (24 scripts + `src/app/layout.tsx`):
  qa-540, test-lazy-banks, test-phase4a, test-phase4b1, test-phase4b2,
  test-provenance, test-retrieval, test-stage5a–g, test-step2b,
  test-step2fixes, test-step3a, test-step3b-audit1, test-step3b-audit2,
  test-trilanguage, and the four prior Phase 1 suites. `urdu: 45` →
  `urdu: 500` in qa-540 EXPECTED + all four prior Phase 1 suites'
  EXPECTED_OTHER blocks; qa-540 header comment now names all five Phase 1
  batches. Stage 5C bank-size + expected-count pins → 500 (roman-marker
  checks and the 5C §5 verbatim audit untouched). F02 marker pin
  (`test-step3b-audit2.mjs`, urdu 45) deliberately UNCHANGED.
- The lazybanks backup byte-compare now pins the exact Phase 1 delta for
  all six changed files (+1 check: urdu byte-prefix — backup bytes an
  exact prefix, 45 untouched + 455 appended, URD-046 first new, URD-500
  last; pre-lazyload backup urdu.json verified byte-identical to the
  pre-merge file). Content.json revert extended with the Urdu row +
  `bySubject.urdu`.
- Ledger recomputes from data: 12 rows, **8 Exact / 1 Proxy / 3 Partial**
  (unchanged); all 6 Urdu-drawing tracks (zamungkor, tt, at, qari, swse,
  sst-kppsc) show Urdu 500 MCQs / 6 notes. Fixed ZamungKor lists (3×100)
  still resolve and stay disjoint; dynamic sampling verified via the
  lazybanks three-way availability check.

## Tests + build

- New `scripts/test-phase1-urdu.mjs` (30 checks: shape/IDs, 23-key
  schema, all-6-fields, dedupe + stem rule, distribution, F02 guard +
  vocab-target uniqueness + script/codepoint/digit audits, topic-coverage
  table with the embedded existing-45 classification, manifest match,
  no-other-bank scope, fixed-mock resolution), wired as `test:phase1urdu`
  in `package.json`. 30/30 PASS.
- Full verification: `npm run build` PASS, `npx tsc --noEmit` clean, ALL
  suites green — **3161 checks / 46 suites, 0 failures** (baseline 3130 /
  45; +30 new suite +1 lazybanks pin, exactly as expected).
- Local prod server (port 3107, stopped afterwards): all 14 routes +
  `/mock/tt-B`, `/tracks/tt`, `/robots.txt` HTTP 200 (`/settings`,
  `/about`, `/start` return 404 as before — those routes do not exist);
  home HTML carries "2906 MCQs"; Urdu lazy chunk
  `.next/static/chunks/0ut_km_cfows2.js` (639,566 bytes) serves 200 and
  contains URD-046 and URD-500.

## Caveats / flags for the owner

1. **Terminology correction — flag for owner confirmation.** The slice
   brief listed "Ism-e-Musawwaf" as a kind of Ism-e-Marfa; the S01 worker
   verified via web search that the standard four kinds are Alam, Zameer,
   Ishara and **Mausool** — "Musawwaf" is not a recognised kind (apparent
   garbling of Mausool). URD-068–070 were written as Ism-e-Mausool and
   "Musawwaf" appears nowhere in the bank. The owner should confirm the
   correction stands.
2. **All 455 new items are draft/unverified** — content is verified by the
   owner via `/review` only. No item was marked verified by the agent.
3. **Disclosures (kept, not defects):** S09 uses the banned word "se" only
   in the framing phrase "ke lihaz se" (10 stems), never as a tested word;
   the substring "علم" in URD-245 is "معلم" (muallim), not the banned
   "ilm". URD-082/083 both answer Zarf-e-Makan with different example
   words (`upar`/`andar`) — per-example drills, kept like the
   per-verb/per-word drill pairs elsewhere in the batch. S02 and S03 both
   use `darya` under compatible classifications (Zaat / Nakrah).
4. **No slots left unfilled.** All 455 planned items were written; nothing
   was omitted for doubt. Disputed/ambiguous usages were avoided by
   design (see slice notes above).
5. Live click-through verification is the parent's pass after deploy.
   Source/provenance line staying English in Urdu/Roman mode is unchanged
   (Phase 2 scope, pre-existing).

## Files changed (32, for the parent's single-commit push)

- `src/data/banks/urdu.json`, `src/data/content.json`,
  `src/lib/bank-manifest.ts`, `src/app/layout.tsx`, `package.json`,
  `CHANGELOG.md`, `VERIFY-phase1-urdu.md` (this file)
- `scripts/test-phase1-urdu.mjs` (new)
- `scripts/qa-540.mjs`, `scripts/test-lazy-banks.mjs`,
  `scripts/test-phase4a.mjs`, `scripts/test-phase4b1.mjs`,
  `scripts/test-phase4b2.mjs`, `scripts/test-provenance.mjs`,
  `scripts/test-retrieval.mjs`, `scripts/test-stage5a.mjs`,
  `scripts/test-stage5b.mjs`, `scripts/test-stage5c.mjs`,
  `scripts/test-stage5d.mjs`, `scripts/test-stage5e.mjs`,
  `scripts/test-stage5f.mjs`, `scripts/test-stage5g.mjs`,
  `scripts/test-step2b.mjs`, `scripts/test-step2fixes.mjs`,
  `scripts/test-step3a.mjs`, `scripts/test-step3b-audit1.mjs`,
  `scripts/test-step3b-audit2.mjs`, `scripts/test-trilanguage.mjs`,
  `scripts/test-phase1-islamiyat.mjs`, `scripts/test-phase1-tajweed.mjs`,
  `scripts/test-phase1-arabic.mjs`, `scripts/test-phase1-english.mjs`
