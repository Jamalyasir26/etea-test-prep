# VERIFY — Phase 1, Subject 7: Pak Studies bank 45 → 500 MCQs

Date: 2026-11-16 (local; NOT deployed — parent handles push/deploy/live verification).
GitHub HEAD per brief: `c508457`. No push, deploy, GitHub, Vercel, or env changes by this batch. No backup recreated. No other bank or subject touched.

## 1. What was added

- **455 NEW items, PAK-046–PAK-500**, sequential, no gaps, appended to `src/data/banks/pakstudies.json` (now 500 items, 890,755 bytes). ID prefix/sequence continues the existing bank exactly (`PAK-001..PAK-045` pre-existing).
- **Trilingual at creation**: every new item carries all 6 fields (`question`/`options`/`explanation` × `_ur`/`_roman`) following the Stage 5 conventions — faithful translations, option order preserved, digits/values unchanged.
- **Standard convention** (NOT the existing-45 pattern): new items have a pure-English `explanation` + faithful `_ur`/`_roman` translations and NO `explanationEn`. The existing 45's stored explanations are mixed English+Roman originals with `explanationEn` (documented Stage 5E finding); they were NOT touched and the pattern was NOT copied.
- **Status**: every new item `reviewStatus: "draft"`, `verified: false`, `reviewedBy: null`, `reviewedAt: null` (23-key schema, key order verified). `source` = `Original — concept-extracted from Standard Pakistan Studies Curriculum (Classes 9-10)` on all 455. `pastPaperRef: null`. `difficulty: "medium"`. `post` = the same 15-post array as the existing PAK items. No ETEA authorship claimed anywhere.
- **Additive only**: the existing 45 items are byte-identical — the merged bank file starts with the exact bytes of the pre-merge 45-item file (verified by `merge.mjs` output and by the lazy-banks byte-prefix check, `scripts/test-lazy-banks.mjs:196`). PAK-008 keeps its 26 keys (`conceptId`, `sourceKind` extras), `reviewStatus: "owner-reviewed"`, `reviewedBy: "owner"`, `reviewedAt: 2026-11-11T22:23:00Z`; the other 44 keep their 24 keys incl. `explanationEn`.

## 2. Coverage table (§3.8 topic map)

Existing 45 classified by content (ID map embedded in the new suite); fill = map allocation minus existing. Map totals sum to 500 exactly; no topic exceeds its allocation.

| Topic (§3.8) | Existing | New | Total | Map |
|---|---|---|---|---|
| Ideological Basis | 1 (PAK-003) | 49 | 50 | 50 |
| Pakistan Movement | 10 (001, 002, 004–006, 012–016) | 80 | 90 | 90 |
| Establishment & Early Problems | 2 (007, 010) | 38 | 40 | 40 |
| Constitutional Development | 10 (017–026) | 50 | 60 | 60 |
| History Since 1947 | 9 (008, 009, 011, 027–032) | 51 | 60 | 60 |
| Land, Climate & Topography | 6 (033–037, 042) | 44 | 50 | 50 |
| Economic Development | 0 | 50 | 50 | 50 |
| Population, Society & Culture | 6 (038–041, 044, 045) | 44 | 50 | 50 |
| Pakistan & World Affairs | 1 (043) | 49 | 50 | 50 |
| **Total** | **45** | **455** | **500** | **500** |

Slice plan (25 slices, `~/workspace/phase1-pakstudies/slice-01.json` … `slice-25.json`; every slice re-validated clean by the coordinator with `validate-slice.mjs`, 26 checks each):

| Slice | IDs | Topic label | N |
|---|---|---|---|
| S01–S03 | 046–094 | Ideological Basis | 16/16/17 |
| S04–S07 | 095–174 | Pakistan Movement | 20/20/20/20 |
| S08–S09 | 175–212 | Establishment & Early Problems | 19/19 |
| S10–S12 | 213–262 | Constitutional Development | 17/17/16 |
| S13–S15 | 263–313 | History Since 1947 | 17/17/17 |
| S16–S17 | 314–357 | Land, Climate & Topography | 22/22 |
| S18–S20 | 358–407 | Economic Development | 17/17/16 |
| S21–S22 | 408–451 | Population, Society & Culture | 22/22 |
| S23–S25 | 452–500 | Pakistan & World Affairs | 16/16/17 |

Done: PAK-046–PAK-500 (all 455). Pending: none. No topic slots left unfilled; no item omitted at the merge boundary.

## 3. Content rules compliance

- **Original questions only**, own words; standard textbook facts only; dates/figures/names in standard textbook versions. Two worker substitutions under the omit-on-doubt rule (both verified by web search before writing): PAK-128's planned "first secretary of the League" angle was dropped as ambiguous (joint secretaries / Bilgrami 1908) and replaced with Nawab Salimullah Khan proposing the founding resolution; the Simla Deputation "35 members" figure was dropped (sources differ 30/32/35/70) and PAK-123 asks the deputation's outcome instead.
- **Exactly one correct answer** per item; explanations support the correct answer; options plausible and distinct. New-item `correctIndex` distribution: **115/117/119/104** (25.3/25.7/26.2/22.9%) — asserted by the new suite.
- **Digits**: ASCII only, identical digit runs in all 3 languages in every field; no Urdu-Indic digits. Urdu fields use Urdu yeh ی U+06CC / kaf ک U+06A9 only. No Urdu/Arabic script in EN or `_roman` fields. Pure-expression options (digits/symbols only, incl. commas and ratios) byte-identical across languages; number+word options (e.g. "6 years" → "6 سال") translated with digits preserved. No Latin honorific abbreviations `(SAW)/(PBUH)/(RA)/(AS)` anywhere. No em/en-dash in content fields (only the mandated `source`/`topic` strings carry the em-dash). No √/π/°/²/³/×/÷/≤/≥/• symbols.
- **F02 guard**: English fields contain zero Roman-Urdu detector hits on all 455 new items (stricter than the repo suite's ≥2 threshold); zero rewords needed. Never the English word "thin".
- **Dedupe**: zero exact normalized-question duplicates across all 500; the qa-540 stem rule (first 12 normalized words) holds across ALL banks. Cross-slice Jaccard scan (threshold 0.55, stopwords removed) flagged 20 pairs — all inspected; 4 genuine same-fact collisions rewritten by the coordinator (see §4), the remaining 16 are distinct-fact siblings (e.g. first vs second constitution year, date vs person, 17th vs 18th vs 26th Amendment years) and were kept.

## 4. Coordinator merge findings (5 rewrites; slice sources kept in sync)

All rewrites preserve ID, topic label, 23-key schema, and trilingual completeness; affected slices re-validated after each fix.

1. **PAK-210** (S09) — collided with PAK-078 (both asked who moved the Objectives Resolution). Rewritten to the principles clause: "Which principles did the Objectives Resolution declare shall be fully observed in Pakistan?" (democracy, freedom, equality, tolerance, social justice).
2. **PAK-212** (S09) — collided with PAK-079 (same sovereignty fact; also the only stem-rule duplicate). Rewritten to the chosen-representatives clause: "the State shall exercise its powers and authority through whom?"
3. **PAK-485** (S25) — collided with PAK-195 (both asked the Indus Waters Treaty mediator). Rewritten to the signing city: "The Indus Waters Treaty of 1960 was signed in which city?" (Karachi, 19 September 1960).
4. **PAK-487** (S25) — collided with PAK-301 (both asked the Tashkent Declaration mediator). Rewritten to the signatory: "signed by President Ayub Khan and which Indian Prime Minister?" (Lal Bahadur Shastri).
5. **PAK-414** (S21) — used the literal Latin word "Nastaliq" (option + explanations), which `test-fonts.mjs` forbids anywhere under `src/` (the Noto Nastaliq Urdu font decision was cancelled by the owner 2026-11-12). Rewritten to the script-family fact: "The writing system of Urdu belongs to which script family?" (Perso-Arabic). The check was NOT weakened; the item was reworded, same pattern as the Arabic batch's F02 rewords. Verified: zero `nastaliq` (case-insensitive) matches remain under `src/` outside the fonts suite itself.

Post-fix audit: exact duplicates 0, stem-duplicate groups 0, remaining Jaccard pairs all distinct-fact siblings. Stratified fact-check sample (first/middle items per slice + all worker-flagged items, ~40 items read in full): answers match explanations, distractors are wrong, translations faithful. Judgment calls kept: PAK-213 (23 March 1956 full date) vs existing PAK-017 (year) — distinct granularity, same pattern as PAK-126 (date) vs PAK-002 (year).

## 5. Counts + manifest ripple (3361 → 3816)

- `src/lib/bank-manifest.ts` regenerated via `npm run prebuild` (twice, byte-identical; sha256 `779abff1d5278dc6a11e551cd026bc3e778d11e76df3ecbf93ce5db41d9c59cc`, unchanged after the final build). `BANK_COUNTS.pakstudies = 500` (line 15), `BANK_TRUSTED.pakstudies = 1` (line 34, PAK-008 only), `ID_BANK` holds 3816 ids.
- `src/data/content.json`: `counts.total` 3361 → 3816; `bySubject` row "Pak Studies" → 500; `bySubject.pakstudies` index extended to 500 ids. Note data untouched. Serialization preserved (`JSON.stringify`, no indent, no trailing newline).
- `src/app/layout.tsx:30`: meta description → 3816 MCQs.
- `3361` → `3816` in 27 files (26 scripts + `layout.tsx`): `test-lazy-banks`, `test-phase4a`, `test-phase4b1`, `test-phase4b2`, `test-provenance`, `test-retrieval`, `test-stage5a–g`, `test-step2b`, `test-step2fixes`, `test-step3a`, `test-step3b-audit1`, `test-step3b-audit2`, `test-trilanguage`, `qa-540`, and the six prior Phase 1 suites. `pakstudies: 45` → `pakstudies: 500` in `qa-540.mjs:29` (EXPECTED) and the six prior suites' `EXPECTED_OTHER` blocks. `qa-540.mjs` header comment names all seven Phase 1 batches.
- **Stage 5E rescope (not a weakening)**: §4's three mixed-explanation checks and the §5 digit loop asserted properties that hold only for the original 45 (they would throw on `explanationEn` for new items, which carry none). Rescoped to `PAK_ORIG45 = BY_SUBJECT.pakstudies.slice(0, 45)` (`scripts/test-stage5e.mjs:170–182`) and `slice(0, 45)` in the §5 loop (line 241), with the reason documented in comments. §2 bank-size pin → 500 (line 76); §3 expected-count table → 500. All other 5E checks still run over all 500 (triples, keys, labels, question/option digits, §6 audit).
- **F02 pins UNCHANGED**: `test-step3b-audit2.mjs` "exactly 124 items carry explanationEn" and "EN by bank: pakstudies 45" stay as-is (new items carry no `explanationEn`); only its total pin changed (3361 → 3816).
- **Lazy-banks** (`scripts/test-lazy-banks.mjs`): added the pakstudies byte-prefix check (line 196, +1 check); `PHASE1_CHANGED` exception set now lists eight files incl. `pakstudies.json` (line 134); content.json revert extended with the Pak Studies row + `bySubject.pakstudies` (lines 222–227).
- **New suite verbatim classifier fix**: the suite inherited the maths suite's classifier, which misclassified "6 years" (unit-stripped → demanded verbatim) and "40,000" (comma → demanded translation). Fixed in the NEW suite only to the brief's rule — digits/symbols-only options verbatim; number+word options translated. No existing check was weakened.
- `package.json:82`: new script `test:phase1pakstudies`.
- **Ledger** recomputes from data (via `tsc`-compiled `src/lib/ledger.ts`): 12 rows, 8 Exact / 1 Proxy / 3 Partial — unchanged pattern. ZamungKor row: Pak Studies 500 MCQs / 7 notes, totalMcqs 2530 (Proxy). SST-ETEA row: Pak Studies 500 MCQs / 7 notes, totalMcqs 1530 (Partial). No other row draws on pakstudies.
- **Mocks**: fixed ZamungKor lists (3×100) still resolve and stay disjoint (asserted by the new suite); dynamic sampling verified via the lazy-banks three-way availability check.

## 6. Tests + build

- Baseline (before any change): `npm run build` PASS, `npx tsc --noEmit` clean, **3193 checks / 47 suites** green. (`test-timeouts.mjs` failed once during a parallel loaded run but passes standalone — timing flake, not a baseline defect.)
- New suite `scripts/test-phase1-pakstudies.mjs` (351 lines, 32 checks): 500 items, ID sequence PAK-001..PAK-500 in file order, new items PAK-046..PAK-500, 23-key schema + key order, all-6-fields completeness, dedupe + stem rule, one-correct-answer + explanation presence, correctIndex distribution, F02 guard, numeric-option convention, numeric distinctness, banned-symbol audit, Urdu codepoint + repeated-form audits, digit preservation, honorific/Arabic audits, topic-coverage table vs §3.8 (embedded existing-45 classification), manifest counts match, no-other-bank scope, fixed-mock resolution + disjointness.
- Final: `npm run build` **PASS**, `npx tsc --noEmit` **clean**, ALL suites green — **3226 checks / 48 suites** (baseline 3193/47; +32 new suite +1 lazy-banks prefix check). Zero failures.
- Local prod server (`next start`, fresh build): all 14 routes (`/`, `/practice`, `/topics`, `/review`, `/mock`, `/flashcards`, `/library`, `/plan`, `/analysis`, `/tracks`, `/tutor`, `/vacancies`, `/issues`, `/links`) + `/mock/tt-B` + `/tracks/tt` + `/robots.txt` all HTTP 200. Home HTML carries 3816. Pak Studies lazy chunk (567,813 bytes, `.next/static/chunks/0mleqh7_qcbpm.js`) serves HTTP 200 and contains PAK-046, PAK-414, and PAK-500. Server stopped afterwards; port verified closed.

## 7. Files changed (this batch)

1. `src/data/banks/pakstudies.json` — 45 → 500 items (455 appended).
2. `src/data/content.json` — counts + `bySubject.pakstudies` index.
3. `src/lib/bank-manifest.ts` — regenerated (sha256 `779abff1…`).
4. `src/app/layout.tsx` — meta description 3816 MCQs.
5. `package.json` — `test:phase1pakstudies` script.
6. `scripts/test-phase1-pakstudies.mjs` — new, 32 checks.
7. 26 existing scripts — count pins only (3361 → 3816; pakstudies 45 → 500 where applicable), plus the Stage 5E rescope and lazy-banks exception extension documented in §5.
8. `CHANGELOG.md` — Subject 7 entry appended.
9. `VERIFY-phase1-pakstudies.md` — this report.

Slice sources (NOT part of the repo push): `~/workspace/phase1-pakstudies/` — `BRIEF.md`, `validate-slice.mjs`, `merge.mjs`, `fix-collisions.mjs`, `fix-pak414.mjs`, `slice-01.json` … `slice-25.json` (slice files kept in sync with all 5 coordinator rewrites).

## 8. Caveats / flags for the owner (all items draft/unverified — owner verifies via /review)

- **Figures most deserving owner verification**: PAK-411 (2023 growth 2.55%), PAK-412 (2023 urban 38.8%), PAK-443 (literacy 60.65%, PBS 2023 Census Table 12, age 10+; 62.8% appears as a distractor), PAK-381 (USA largest export buyer — rankings shift over time), PAK-328 (Sutlej longest of the five rivers — no figures stated), PAK-338 (Tirich Mir 7,708 m; some sources 7,706 m), PAK-497 (NAM membership 1979).
- **Single-fact flags**: PAK-161 (Khaliquzzaman as Lahore Resolution seconder — standard textbook version, least re-verified); PAK-106 (MAO College "opened 1875" — founded as Madrasatul Uloom, renamed 1877; standard simplification); PAK-108 (Asbab-e-Baghawat-e-Hind 1859 — written 1858/published 1859); PAK-127 (Aga Khan first president — formally elected at Aligarh, March 1908; item carries no year); PAK-132 (Lucknow Pact Punjab 50% — dominant textbook figure; one secondary source says "less than fifty percent"); PAK-176 (~7m refugees, approximate, hedged as "standard textbook accounts"); PAK-192/193 (Rs 750m/200m Partition settlement figures); PAK-201 (Miangul Abdul Wadud ruled Swat 1926–1949, ruler at 1947 accession); PAK-399 (Zahid Husain Governor 1948–1953); PAK-396 (CPEC "commonly described" three routes — deliberate hedging); PAK-085 (softest item — Urdu as medium of "many" Muslim newspapers); PAK-094 (Objectives Resolution as Preamble; Art 2A since 1985 not asked); PAK-430 (Mohenjo-daro excavations 1922, R. D. Banerji); PAK-450 (anthem first broadcast 13 Aug 1954; official adoption followed the same year); PAK-317/318 (smallest-area / least-populous province rankings, no figures); PAK-332 (Sukkur Barrage 1932); PAK-364 (Punjab leads cotton); PAK-369 (Karachi largest fish harbour); PAK-372 ("among the largest" canal system — deliberate softening).
- **Coverage notes**: S13 covers governors-general/presidents in order but Fazal Elahi Chaudhry (1973–78) and Rafiq Tarar (1997–2001) have no dedicated item — no false succession claims are made. S14 uses "Huseyn Shaheed Suhrawardy"; S22 uses "Fahmida Mirza" and "Raana Liaquat Ali Khan" spellings. S10 treats the Bogra Formula as the "Muhammad Ali Formula" (no separate item). S12 avoids seat totals and uses Article 25 / Article 228 (CII) angles to avoid duplicating socialstudies items.
- **Known pre-existing limitations untouched**: one-active-practice-session limit; source/provenance line stays English in Urdu/Roman mode (Phase 2 scope); old `/topics` sessions orphaned; load-failure cache eviction untested automatically.
- **Not in scope / not done**: no push/deploy (parent); no backup recreated; no other bank/subject; no content/schema change beyond the pakstudies bank + count ripple; no owner-verification of any new item (all draft).
