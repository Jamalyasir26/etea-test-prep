# VERIFY — Phase 1, Subject 9: Science bank 30 → 500 MCQs

Date: 2026-11-17 (local; NOT deployed — parent handles push/deploy/live verification).
GitHub HEAD per brief: `bae662a`. No push, deploy, GitHub, Vercel, or env changes by this batch. No backup recreated. No other bank or subject touched.

## 1. What was added

- **470 NEW items, SCI-031–SCI-500**, sequential, no gaps, appended to `src/data/banks/science.json` (now 500 items, 928,070 bytes). ID prefix/sequence continues the existing bank exactly (`SCI-001..SCI-030` pre-existing).
- **Trilingual at creation**: every new item carries all 6 fields (`question`/`options`/`explanation` × `_ur`/`_roman`) following the Stage 5 conventions — faithful translations, option order preserved, digits/values unchanged.
- **Standard convention**: new items have a pure-English `explanation` + faithful `_ur`/`_roman` translations and NO `explanationEn`. The existing 30 keep their documented pure-Roman-original stored explanations (with `explanationEn`) untouched — Stage 5E is rescoped to them (see §5), mirroring the Pak Studies pattern.
- **Status**: every new item `reviewStatus: "draft"`, `verified: false`, `reviewedBy: null`, `reviewedAt: null` (23-key schema, key order verified). `source` = `Original — concept-extracted from Standard General Science Curriculum (Classes 4-8)` on all 470. `pastPaperRef: null`. `difficulty: "medium"`. `post` = the same 5-post array as the existing SCI items (`pst`, `ct`, `dm`, `pet`, `sst-etea`). No ETEA authorship claimed anywhere.
- **Additive only**: the existing 30 items are byte-identical — the merged bank file preserves the pre-merge file as an exact prefix (verified by `merge.mjs` output and by the lazy-banks byte-prefix check, `scripts/test-lazy-banks.mjs`). Note: `science.json` carries NO trailing newline (like `pedagogy.json`, unlike the other Phase 1 banks), so the prefix check strips 2 chars (`\n]`) instead of 3; the merge preserves this file's own serialization convention (`JSON.stringify(items, null, 1)`, no trailing newline).

## 2. Coverage table (§3.7 topic map)

Existing 30 classified by content (ID map embedded in the new suite); fill = map allocation minus existing. Map totals sum to 500 exactly; no topic exceeds its allocation.

| Topic (§3.7) | Existing | New | Total | Map |
|---|---|---|---|---|
| Human Body & Organ Systems | 3 (007–009) | 67 | 70 | 70 |
| Cell Biology & Heredity | 1 (012) | 49 | 50 | 50 |
| Plants, Animals, Ecology & Environment | 4 (010, 011, 013, 014) | 46 | 50 | 50 |
| Matter & Chemistry | 4 (015–018) | 56 | 60 | 60 |
| Force, Pressure, Motion & Energy | 2 (026, 029) | 53 | 55 | 55 |
| Electricity, Magnetism & Light | 3 (027, 028, 030) | 52 | 55 | 55 |
| Measurement | 1 (025) | 29 | 30 | 30 |
| Earth & Space | 4 (019–022) | 36 | 40 | 40 |
| Biotechnology, Microbes & Health | 6 (001–006) | 39 | 45 | 45 |
| Everyday Science & Technology | 2 (023, 024) | 43 | 45 | 45 |
| **Total** | **30** | **470** | **500** | **500** |

Slice plan (28 slices, `~/workspace/phase1-science/slice-01.json` … `slice-28.json`; every slice re-validated clean by the coordinator with `validate-slice.mjs`, 28 checks each):

| Slice | IDs | Topic label | N |
|---|---|---|---|
| S01–S04 | 031–097 | Human Body & Organ Systems | 17/17/17/16 |
| S05–S07 | 098–146 | Cell Biology & Heredity | 17/16/16 |
| S08–S10 | 147–192 | Plants, Animals, Ecology & Environment | 16/15/15 |
| S11–S13 | 193–248 | Matter & Chemistry | 19/19/18 |
| S14–S16 | 249–301 | Force, Pressure, Motion & Energy | 18/18/17 |
| S17–S19 | 302–353 | Electricity, Magnetism & Light | 18/17/17 |
| S20–S21 | 354–382 | Measurement | 15/14 |
| S22–S23 | 383–418 | Earth & Space | 18/18 |
| S24–S25 | 419–457 | Biotechnology, Microbes & Health | 20/19 |
| S26–S28 | 458–500 | Everyday Science & Technology | 15/14/14 |

Done: SCI-031–SCI-500 (all 470). Pending: none. No topic slots left unfilled; no item omitted at the merge boundary.

## 3. Content rules compliance

- **Original questions only**, own words; standard Classes 4–8 General Science facts only. Omit-on-doubt applied as avoidance rather than omission (no slots were left empty): workers deliberately avoided uncertain specifics — no exact value of g (SCI-280 uses only the brief-permitted "about 10 metres per second squared"); no Avogadro's number or Planck's constant; no disputed invention years ("who invented" only, SCI-487–491); no Pluto question (8-planet framing throughout S22); no exact muscle counts; no 4-vs-5 ocean count (SCI-412 asks the smallest ocean instead); no Indus dolphin population numbers (SCI-192: blind / Indus River / endangered / protected only); Dolly's year omitted (SCI-434); Hooke's year omitted (SCI-098).
- **Exactly one correct answer** per item; explanations support the correct answer; options plausible and distinct. New-item `correctIndex` distribution: **119/125/119/107** (25.3/26.6/25.3/22.8%) — asserted by the new suite (each position 20–30%).
- **Notation rules**: formulas in plain ASCII only (H2O, CO2, O2, NaCl, HCl, CaCO3, C6H12O6…); formula-only options byte-identical across languages. NO degree symbol anywhere — "degrees Celsius/Fahrenheit" written out. NO × ÷ √ π ² ³ ≤ ≥ • characters. Units as words (Newton, Joule, metres per second), never standalone symbols. Element names, not symbols, as standalone options. NEVER standalone "Ne"/"Se"/"Ho". Never the English word "thin" in English fields ("narrow" used instead, e.g. SCI-258, SCI-480).
- **Digits**: ASCII only, identical digit runs in all 3 languages in every field; no Urdu-Indic digits. Urdu fields use Urdu yeh ی U+06CC / kaf ک U+06A9 only. No Urdu/Arabic script in EN or `_roman` fields. No Latin honorific abbreviations `(SAW)/(PBUH)/(RA)/(AS)` anywhere. No em/en-dash in content fields (only the mandated `source`/`topic` strings carry the em-dash). No `nastaliq` string anywhere (test-fonts clean).
- **F02 guard**: English fields contain zero Roman-Urdu detector hits on all 470 new items under the slice validator's strict zero-hit check; zero F02 rewords needed. The new suite asserts the repo-standard <2-hits rule.
- **Dedupe**: zero exact normalized-question duplicates across all 500; the qa-540 stem rule (first 12 normalized words) holds across ALL banks. Cross-slice Jaccard scan (threshold 0.55, stopwords removed, `~/workspace/phase1-science/jaccard.mjs`) flagged 6 pairs over the first 455 items — 1 genuine same-fact collision rewritten (SCI-126/SCI-431, see §4); the final scan over all 470 flagged 5 pairs, all inspected and kept as distinct-fact siblings: arteries vs veins SCI-055/056 (away vs back), largest internal organ vs largest organ SCI-069/080 (liver vs skin), 46 chromosomes vs 23 pairs SCI-123/124, litmus pair SCI-233/234 (acid vs base), Fahrenheit freezing vs boiling SCI-292/293 (32 vs 212).
- **Numeric items recomputed**: Ohm's-law calculations SCI-308–310 (V = 2 x 3 = 6; I = 12 / 4 = 3; R = 9 / 3 = 3); speed/work/energy SCI-267/270/273/276/279/280/284; unit conversions SCI-366–368 (2 km = 2000 m; 3 kg = 3000 g; 4 m = 400 cm); conservation of mass SCI-228 (10g + 15g = 25g). All recomputed by the workers with working shown in all three languages; coordinator re-verified the sample. Only brief-authorized standard values used (206 bones, 32 teeth, 4 heart chambers, 46 chromosomes, 37 degrees Celsius, 100/0 degrees Celsius, 300,000 km/s light, ~340 m/s sound, pH 7, 7 periods / 18 groups, ~71% oceans, 20–20,000 Hz).

## 4. Coordinator merge findings (6 rewrites + 1 re-dispatch; slice sources kept in sync)

1. **SCI-431** (S24) — asked the name of the DNA double-helix shape, the same fact and answer as SCI-126 (Jaccard 0.647). Rewritten to the full form of DNA (deoxyribonucleic acid), a fact asked nowhere else. Slice re-validated SLICE VALID.
2. **SCI-097** (S04) — "sweating cools the body" duplicated SCI-081's tested fact in different words (below the Jaccard threshold; caught in the stratified fact-check read). Rewritten to newborn-bones-join-together (complements SCI-082's 206-bone count). Slice re-validated.
3. **SCI-292** (S16) — Celsius freezing at 0 degrees duplicated the value/fact pair with SCI-196 (ice melts at 0 degrees). Rewritten to Fahrenheit freezing at 32 degrees Fahrenheit (complements SCI-293, Fahrenheit boiling at 212). Slice re-validated.
4. **SCI-390** (S22) — "Sun is the main source of light and heat" duplicated SCI-285. Rewritten to the Sun being made mostly of hydrogen. Slice re-validated.
5. **SCI-454** (S25) — plain immunity definition duplicated SCI-426's vaccination-context immunity item. Rewritten to the skin acting as a barrier against germs. Slice re-validated.
6. **SCI-486** (S27) — the CPU/"brain of the computer" stem contained ITC-001's question verbatim ("Which part of the computer is called its brain?"), sharing a 40-character string that broke the lazy-banks chunk-split check on the fresh build (the IT probe appeared in 2 chunks). Fixed by CONTENT rewrite, not by weakening the check: rewritten to remote-control infrared rays (a fact appearing nowhere else in any bank). Both the slice source and the merged bank were updated together; bank serialization round-trip, backup byte-prefix, and first-30 deep-equality re-verified; probe-collision scan re-run clean; project rebuilt and all suites re-run green. (Post-merge slice re-validation shows only the expected self-match artifact on the 2 bank-comparison checks — the merged bank now contains the slice itself; all 26 content checks pass, and SCI-486 is flagged against no other item.)
7. **S10 re-dispatch** — the first S10 worker errored on an output token cap with no file written. Re-dispatched split into two part-files (`slice-10a.json` SCI-178–185, `slice-10b.json` SCI-186–192), concatenated by the coordinator into `slice-10.json` and validated clean (SLICE VALID, 15 items). No other worker errored.

All six rewrites preserve their slice's `correctIndex` (distributions unchanged) and pass the full 28-check slice validation (pre-merge slices) / all content checks (post-merge). Post-fix audit: exact duplicates 0, stem-duplicate groups 0, remaining Jaccard pairs all distinct-fact siblings. Stratified fact-check sample (first/middle/last items per slice + all worker-flagged items, ~100 items read in full): answers match explanations, distractors are wrong, translations faithful. Judgment calls kept: motor-vs-fan energy-conversion pair SCI-329/470 (device definition vs household application, different answers) and generator pair SCI-330/471 (conversion vs name); melting-point vs freezing-point pair SCI-196/292 (different processes, different scales after the rewrite).

## 5. Counts + manifest ripple (4286 → 4756)

- `src/lib/bank-manifest.ts` regenerated via `npm run prebuild` (twice, byte-identical; sha256 `e97517547d679c7a132b2b58d44c59d89da16d7e06bd01a3e2d515da0fcc1ef0`, unchanged after the final build). `BANK_COUNTS.science = 500` (line 20), `BANK_TRUSTED.science = 0` (line 39, no verified items), `ID_BANK` holds 4756 ids.
- `src/data/content.json`: `counts.total` 4286 → 4756; `bySubject` row "General Science" → 500; `bySubject.science` index extended to 500 ids. Note data untouched. Serialization preserved (`JSON.stringify`, no indent, no trailing newline).
- `src/app/layout.tsx:30`: meta description → 4756 MCQs.
- `4286` → `4756` in 29 files (28 scripts + `layout.tsx`): `test-lazy-banks`, `test-phase4a`, `test-phase4b1`, `test-phase4b2`, `test-provenance`, `test-retrieval`, `test-stage5a–g`, `test-step2b`, `test-step2fixes`, `test-step3a`, `test-step3b-audit1`, `test-step3b-audit2`, `test-trilanguage`, `qa-540`, and the eight prior Phase 1 suites. `science: 30` → `science: 500` in `qa-540.mjs` (EXPECTED) and the eight prior suites' `EXPECTED_OTHER` blocks. `qa-540.mjs` header comment names all nine Phase 1 batches.
- **Stage 5E rescope** (mirrors the Pak Studies `PAK_ORIG45` pattern exactly — preserves every assertion, nothing weakened): `SCI_ORIG30 = BY_SUBJECT.science.slice(0, 30)`; the 3 §4 pure-Roman-original checks (all-30-carry-`explanationEn`, pure-Roman-originals, `_roman`-verbatim) rescoped to `SCI_ORIG30`; §2 bank-size pin 30 → 500 ("Phase 1: 30 original + 470 new"); §3 expected-count table `["science", "science", 30]` → 500; §5 science digit loop rescoped to `slice(0, 30)` and `BY_SUBJECT.science.slice(30)` added to the plain-English digit loop (socialstudies + pedagogy). §4 no-Roman-marker / label-leak / `explanationUrdu` checks and §6/§9 run UNCHANGED over all 500 and pass.
- **F02 pins UNCHANGED**: `test-step3b-audit2.mjs` "exactly 124 items carry explanationEn" and `enByBank.science === 30` stay as-is (new items carry no `explanationEn`); only its total pin changed (4286 → 4756).
- **Lazy-banks** (`scripts/test-lazy-banks.mjs`): added the science byte-prefix check (+1 check; 2-char strip documented — science.json has no trailing newline, like pedagogy.json); `PHASE1_CHANGED` exception set now lists ten files incl. `science.json`; content.json revert extended with the General Science row + `bySubject.science`.
- `package.json:84`: new script `test:phase1science`.
- **Ledger** recomputes from data (via `tsc`-compiled `src/lib/ledger.ts`): 12 rows, 8 Exact / 1 Proxy / 3 Partial — unchanged pattern. PST/CT/DM/PET show General Science 500 MCQs / 8 notes (totals +470 each: PST/CT 1590 → 2060; DM 1610 → 2080; PET 1606 → 2076). All other tracks unchanged (ZamungKor Proxy 3000; TT/AT 2560; CT-IT 1620; Qari 3060; SWSE 2030; SST-ETEA 2000; SST-KPPSC 1530) — General Science is not in their patterns.
- **Mocks**: fixed ZamungKor lists (3×100) still resolve and stay disjoint (asserted by the new suite); dynamic sampling verified via the lazy-banks three-way availability check.

## 6. Tests + build

- Baseline (before any change): `npm run build` PASS, `npx tsc --noEmit` clean, **3259 checks / 49 suites** green (counted by PASS lines; all 49 suite files exit 0).
- New suite `scripts/test-phase1-science.mjs` (33 checks): 500 items, ID sequence SCI-001..SCI-500 in file order, existing 30 in place, new items SCI-031..SCI-500, 23-key schema + fixed fields + all-6-fields + 4 distinct options, dedupe + stem rule, correctIndex distribution (each position 20–30%), honorific/banned-symbol/`nastaliq`/script/codepoint/digit audits, F02 guard, numeric/formula-option convention, numeric distinctness, explanations-translated check, topic-coverage table vs §3.7 (embedded existing-30 classification + fill plan 67/49/46/56/53/52/29/36/39/43), manifest counts match, BANK_TRUSTED 0, no-other-bank scope, fixed-mock resolution + disjointness.
- One first-run failure, fixed WITHOUT weakening any check: the lazy-banks chunk-split check failed on the fresh build (IT probe in 2 chunks) — root cause was the SCI-486/ITC-001 content collision (§4 item 6). Fixed by rewriting SCI-486, rebuilding, and re-running everything.
- Final: `npm run build` **PASS**, `npx tsc --noEmit` **clean**, ALL suites green — **3293 checks / 50 suites** (baseline 3259/49; +33 new suite +1 lazy-banks prefix check). Zero failures.
- Local prod server (`next start`, fresh build): all 14 routes (`/`, `/practice`, `/topics`, `/review`, `/mock`, `/flashcards`, `/library`, `/plan`, `/analysis`, `/tracks`, `/tutor`, `/vacancies`, `/issues`, `/links`) + `/mock/tt-B` + `/tracks/tt` + `/robots.txt` all HTTP 200. Home HTML carries 4756. Science lazy chunk (840,125 bytes, `.next/static/chunks/1sww8ubua5uod.js`) serves HTTP 200 and contains SCI-031, SCI-001, and SCI-500. First-load `/` unchanged at 555,784 bytes raw / 171,156 bytes gzip. Server stopped afterwards; port verified closed.

## 7. Files changed (this batch)

1. `src/data/banks/science.json` — 30 → 500 items (470 appended).
2. `src/data/content.json` — counts + `bySubject.science` index.
3. `src/lib/bank-manifest.ts` — regenerated (sha256 `e9751754…`).
4. `src/app/layout.tsx` — meta description 4756 MCQs.
5. `package.json` — `test:phase1science` script.
6. `scripts/test-phase1-science.mjs` — new, 33 checks.
7. 28 existing scripts — count pins only (4286 → 4756; science 30 → 500 where applicable), plus the Stage 5E rescope and lazy-banks exception extension documented in §5.
8. `CHANGELOG.md` — Subject 9 entry appended.
9. `VERIFY-phase1-science.md` — this report.

Total: 36 files. Slice sources (NOT part of the repo push): `~/workspace/phase1-science/` — `BRIEF.md`, `validate-slice.mjs`, `merge.mjs`, `jaccard.mjs`, `slice-01.json` … `slice-28.json` (plus `slice-10a.json`/`slice-10b.json`, the S10 part-files; `slice-10.json` is their concatenation and the merge input).

## 8. Caveats / flags for the owner (all items draft/unverified — owner verifies via /review)

- **Figures and values most deserving owner verification**: SCI-292/293 (Fahrenheit freezing 32 / boiling 212); SCI-297 (sound about 340 metres per second); SCI-301 (ultrasound above 20000 hertz); SCI-352 (light 300,000 km/s); SCI-410 (oceans about 71 percent); SCI-280 (gravity "about 10" approximation); SCI-094 (11 organ systems usually counted); SCI-123/124 (46 chromosomes / 23 pairs); SCI-231/232 (pH 7 neutral, scale 0–14); SCI-243/244 (7 periods / 18 groups); SCI-357 (7 SI base units); SCI-414 (tides "mainly" caused by the Moon — the Sun also contributes); SCI-397 (revolution about 365 days); SCI-054 (universal donor Group O — ABO-only convention, no Rh mention); SCI-192 (Indus dolphin — blind / Indus River / endangered / protected, no numbers by design).
- **School-level simplifications and hedges**: SCI-078 (urea "formed from the breakdown of proteins" — liver urea formation simplified); SCI-294 (heat-vs-temperature distinction); SCI-322 (copper/aluminium/plastic "not pulled in the same way" by magnets — negligible effects not denied); SCI-327 (electromagnet "loses most of its magnetism" — residual magnetism allowed for); SCI-207 (dissolving sugar as a physical change — standard textbook classification); SCI-240/242 ("most metals" / "most non-metals" — graphite conduction and floating alkali metals allowed for); SCI-498 (soap letting water mix with grease — standard simplification); SCI-191 (greenhouse effect overview, no figures); SCI-489 (James Watt "improving" the steam engine, not inventing it); SCI-493 (rainbow seen opposite the Sun — observer-position angle, distinct from S19 dispersion); SCI-202 (perfume spreading as diffusion, evaporation as deliberate distractor); SCI-446/447/451 (thiamine/B-complex/zinc functions as school-level simplifications).
- **Coordinator rewrites** (all draft, owner verification worthwhile): SCI-431 (DNA full form), SCI-097 (newborn bones join together → 206), SCI-292 (Fahrenheit freezing), SCI-390 (Sun mostly hydrogen, helium next), SCI-454 (skin as barrier), SCI-486 (remote-control infrared rays).
- **Urdu terminology choices** (translation-label choices only; English answers unaffected): spinal cord حرام مغز, reflex action اضطراری عمل (S01); endocrine درون افرازی غدود, pituitary پچوٹری غدود, integumentary انٹیگومنٹری نظام (S04); transpiration تبخیر, stomata سٹومیٹا (S08); amphibians جل تھلیے, herbivore سبزی خور, decomposer تحلیل کنندہ (S09); community برادری, consumer صارف, apex predator ایپکس پریڈیٹر with سب سے اوپر کا گوشت خور in the explanation, food pyramid غذائی اہرام as distractor (S10); displacement reaction جگہ بدلنے والا تعامل, zinc زنک, tin قلعی, lead سیسہ (S12); alloys کھوٹ, mild base ہلکا اساس (S13); electromagnetic induction برقی مقناطیسی القا (S18); natural satellite قدرتی سیارہ, meteor شہاب (S22); ringworm داد, algae کائی (S24); goitre گلھڑ (some books use گھینگا), rock salt سنگ نمک (S25); fulcrum سہارا, biomass energy حیاتیاتی توانائی (S26).
- **Coverage notes**: no Pluto question (8-planet framing only); no standalone item on the ozone layer's depletion (SCI-417 covers its location in the stratosphere only); the original 30's SCI-013 food-chain item is complemented, not repeated, by S10's food-chain/web/ecosystem angles.
- **Known pre-existing limitations untouched**: one-active-practice-session limit; source/provenance line stays English in Urdu/Roman mode (Phase 2 scope); old `/topics` sessions orphaned; load-failure cache eviction untested automatically.
- **Not in scope / not done**: no push/deploy (parent); no backup recreated; no other bank/subject; no content/schema change beyond the science bank + count ripple; no owner-verification of any new item (all draft).
