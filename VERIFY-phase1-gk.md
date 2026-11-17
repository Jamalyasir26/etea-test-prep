# VERIFY — Phase 1, Subject 11: GK bank 30 → 500 MCQs

Date: 2026-11-17 (local; NOT deployed — parent handles push/deploy/live verification).
No push, deploy, GitHub, Vercel, or env changes by this batch. No backup recreated. No other bank or subject touched.

## 1. What was added

- **470 NEW items, GKN-031–GKN-500**, sequential, no gaps, appended to `src/data/banks/gk.json` (now 500 items, 809,396 bytes). ID prefix/sequence continues the existing bank exactly (`GKN-001..GKN-030` pre-existing; the brief's GKN-vs-GK question was checked against the bank first — the actual prefix is `GKN-`).
- **Trilingual at creation**: every new item carries all 6 fields (`question`/`options`/`explanation` × `_ur`/`_roman`) following the Stage 5 conventions — faithful translations, option order preserved, digits/values unchanged.
- **Standard convention**: new items have a pure-English `explanation` + faithful `_ur`/`_roman` translations and NO `explanationEn`, and NO `sourceNote`. The existing 30 keep their pre-existing `source: "ai-generated"`, their broad topic labels (`GK — Pakistan Studies` / `GK — Islamiat`), and their plain-English explanations untouched — like Social Studies, the original 30 carry NO `explanationEn`, so Stage 5E needed NO rescope (see §5).
- **Status**: every new item `reviewStatus: "draft"`, `verified: false`, `reviewedBy: null`, `reviewedAt: null` (23-key schema, key order verified). `source` = `Original — concept-extracted from Standard General Knowledge References` on all 470. `pastPaperRef: null`. `difficulty: "medium"`. `post` = the same 15-post array as the existing GK items (`tt`, `at`, `pst`, `ct`, `ctit`, `dm`, `pet`, `qari`, `sst-kppsc`, `junior-clerk`, `computer-operator`, `police`, `forest`, `lhv`, `rescue`). No ETEA authorship claimed anywhere.
- **Additive only**: the existing 30 items are byte-identical — the merged bank file preserves the pre-merge file as an exact prefix (verified by `merge.mjs` output and by the lazy-banks byte-prefix check, `scripts/test-lazy-banks.mjs`). Note: `gk.json` carries NO trailing newline (like `pedagogy.json`/`science.json`/`socialstudies.json`, unlike the other Phase 1 banks), so the prefix check strips 2 chars (`\n]`) instead of 3; the merge preserves this file's own serialization convention (`JSON.stringify(items, null, 1)`, no trailing newline).

## 2. Coverage table (§3.10 topic map)

Existing 30 classified by content (ID map embedded in the new suite); fill = map allocation minus existing. Map totals sum to 500 exactly; no topic exceeds its allocation. The existing 30 keep their original two broad topic strings; the classification below is by content, not by their stored `topic` field.

| Topic (§3.10) | Existing | New | Total | Map |
|---|---|---|---|---|
| Pakistan Facts | 18 (001–018) | 62 | 80 | 80 |
| World Geography | 0 | 70 | 70 | 70 |
| World History & Personalities | 0 | 50 | 50 | 50 |
| International Organizations | 0 | 50 | 50 | 50 |
| Science & Technology GK | 0 | 50 | 50 | 50 |
| Sports GK | 0 | 50 | 50 | 50 |
| Current Affairs | 0 | 60 | 60 | 60 |
| Everyday GK | 0 | 50 | 50 | 50 |
| Islamic GK | 12 (019–030) | 28 | 40 | 40 |
| **Total** | **30** | **470** | **500** | **500** |

Slice plan (29 slices, `~/workspace/phase1-gk/slices/slice-01.json` … `slice-29.json`; every slice re-validated clean by the coordinator with `validate-slice.mjs`, before and after the rewrites in §4):

| Slice | IDs | Topic label | N |
|---|---|---|---|
| S01–S04 | 031–092 | GK — Pakistan Facts | 16/16/15/15 |
| S05–S08 | 093–162 | GK — World Geography | 18/18/17/17 |
| S09–S11 | 163–212 | GK — World History & Personalities | 17/17/16 |
| S12–S14 | 213–262 | GK — International Organizations | 17/17/16 |
| S15–S17 | 263–312 | GK — Science & Technology GK | 17/17/16 |
| S18–S20 | 313–362 | GK — Sports GK | 17/17/16 |
| S21–S24 | 363–422 | GK — Current Affairs | 15/15/15/15 |
| S25–S27 | 423–472 | GK — Everyday GK | 17/17/16 |
| S28–S29 | 473–500 | GK — Islamic GK | 14/14 |

Done: GKN-031–GKN-500 (all 470). Pending: none. No topic slots left unfilled; no item omitted at the merge boundary. One worker issue: the first S12 worker ended "completed" without writing anything; S12 was re-dispatched and completed SLICE VALID. No other worker errored; no slice was split.

## 3. Content rules compliance

- **Original questions only**, own words; standard, stable GK facts only (Pakistan facts, world geography, history/personalities, organizations, science/technology, sports, everyday GK, Islamic GK). Omit-on-doubt applied as avoidance rather than omission (no slots were left empty): workers deliberately avoided uncertain specifics — no fast-changing rankings or figures; no current office-holders; no 2026 events; no disputed invention years without hedges; no population figures without year labels.
- **Generic-capitals guard** (qa-540 §7, GK-specific): no question may match the generic-capitals regex (capital of France/UK/US/China/Japan/Germany/Italy/Spain/Russia/Canada/Australia/India/Turkey/Egypt). The brief banned "capital of \<country\>" phrasing in ALL questions; only reverse angles (city → country, or a distinguishing attribute) were permitted. The new suite asserts the regex over all 500 items.
- **Current-affairs rule** (brief, GKN-363–422): every item carries a 4-digit year in question AND explanation; settled history only — no 2026 events, no current office-holders, no changing figures. Asserted by the new suite (60/60).
- **Exactly one correct answer** per item; explanations support the correct answer; options plausible and distinct. New-item `correctIndex` distribution: **119/121/120/110** (25.3/25.7/25.5/23.4%) — asserted by the new suite (each position 20–30%).
- **Notation rules**: NO √ π ° ² ³ × ÷ ≤ ≥ • characters. ASCII digits only, identical digit runs in all 3 languages in every field; no Urdu-Indic digits. Urdu fields use Urdu yeh ی U+06CC / kaf ک U+06A9 only (Arabic yeh/kaf normalized in slice files). No Urdu/Arabic script in EN or `_roman` fields. No Latin honorific abbreviations `(SAW)/(PBUH)/(RA)/(AS)` anywhere. No em/en-dash in content fields (only the mandated `source`/`topic` strings carry the em-dash). No `nastaliq` string anywhere (test-fonts clean). Honorific convention: Arabic forms (ﷺ / رضی اللہ عنہ) in Urdu script, spelled-out forms in Roman.
- **F02 guard**: English fields contain zero Roman-Urdu detector hits on all 470 new items under the slice validator's strict zero-hit check; zero F02 rewords needed. The new suite asserts the repo-standard <2-hits rule.
- **Dedupe**: zero exact normalized-question duplicates across all 500; the qa-540 stem rule (first 12 normalized words) holds across ALL banks. Cross-bank Jaccard scan (threshold 0.55) of all 470 new items against all 5226 existing bank items flagged 26 pairs pre-rewrite; targeted greps against all other banks found further reworded same-fact collisions Jaccard missed. Adjudication rule, applied consistently: same-direction + same tested proposition = rewrite (§4); reverse direction or genuinely different attribute = distinct angle, kept + logged (below). Post-rewrite re-scans: within-batch 29 flags, cross-bank 11 flags — ALL adjudicated distinct-fact siblings. Kept-as-distinct highlights: GKN-039 language pairing (PAK-023/SS-017 ask national language alone); GKN-044 paired observance dates (PAK-299 asks Defence Day year); GKN-086 first Foreign Minister (PAK-009 first PM); GKN-088 Majida Rizvi (PAK-445 is Supreme Court/Ayesha Malik); S15 year-anchored/reverse patent angles (GKN-263/266/267 reverse of SCI-487/489/490; GKN-270 discoverer vs SCI-425 source); GKN-304/305 reverse SI-unit items; GKN-308 light-year period vs SCI-405 distance; GKN-369 Concurrent List abolished (SS-402 asks consequence); GKN-400 institution angle (SS-021 year, PAK-398 date); GKN-404 city angle (PAK-391 year); GKN-407 PM angle (PAK-213/214/215/217/218); expansion items with no collision (GKN-446 GPS, GKN-453 CPU, GKN-454 RAM, GKN-447 ATM, GKN-448 SIM, GKN-449 PIN, GKN-455 LED, GKN-456 CCTV, GKN-440–445 FIFA/NATO/UNESCO/UNICEF/WHO/IMF); UN angles kept (GKN-218–229, GKN-230–246, GKN-249 reverse of SS-475, GKN-250 city vs PAK-463 year, GKN-258 building vs SS-470 city, GKN-259 city vs SS-484 reverse); player counts kept (GKN-318/319/320/321/325/327/328/329; GKN-324 American football vs DRW-013 soccer); S28/S29 kept (GKN-473/474/475, GKN-477–486, GKN-490/491, GKN-498 year vs ISL-383/384 place/teaching, GKN-499/500); complementary in-batch pairs (GKN-031/032, 078/080/082, 095/104, 157/158, 233/246, 283/284, 330/331, 342/345, 361/362, 365/366, 378/379, 382/383, 385/420, 397/406, 398/399, 409/410, currency cluster 426/432/434/438, observance-day cluster 467/468/469/470, 490/491, 084/085 longest/shortest coastline — Jaccard 0.778, distinct facts). Remaining cross-bank Jaccard flags (11, all siblings): GKN-080 vs PAK-314, GKN-086 vs PAK-009, GKN-087 vs PAK-191, GKN-121 vs SS-094, GKN-260 vs PAK-460, GKN-324 vs DRW-013, GKN-365 vs PAK-313, GKN-467/468/470/471 vs SS-193.
- **Numeric items recomputed**: all year/count options checked against the item's own stated values; Current Affairs years verified in question and explanation; no invented dates or quotes; no Hadith numbers, references, or verse citations anywhere (validator-enforced).

## 4. Coordinator merge findings (43 rewrites; slice sources kept in sync)

All 43 rewrites were applied by `~/workspace/phase1-gk/apply-rewrites.mjs` (43/43 applied; `correctIndex` preserved in every case; key order + all non-content fields asserted unchanged; `_ur` fields normalized to Urdu yeh/kaf). Every rewritten slice was re-validated SLICE VALID afterwards, and both Jaccard scans were re-run. The rewritten slice files in `~/workspace/phase1-gk/slices/` are the source of truth and match the merged bank exactly (the merge is the only transform). A pre-rewrite backup was copied to `/tmp/slices-pre-rewrite` (ephemeral).

| ID (ci) | Old fact / collision | New fact |
|---|---|---|
| GKN-066 (0) | Tirich Mir near which town = PAK-338 (district Chitral) | Tirich Mir height ≈ 7,708 m |
| GKN-072 (2) | Kharan Desert = PAK-344 | Largest natural lake = Manchar Lake |
| GKN-081 (3) | Quetta capital = PAK-314 | Quetta = "Fruit Garden of Pakistan" |
| GKN-083 (2) | Muzaffarabad capital = PAK-316 | Muzaffarabad at Jhelum + Neelum confluence |
| GKN-084 (3) | Largest province by area = PAK-034, SS-007 | Longest coastline = Balochistan |
| GKN-085 (1) | Smallest province by area = PAK-317 | Shortest coastline = Sindh |
| GKN-087 (1) | First C-in-C Messervy = PAK-191 | First Pakistani C-in-C Ayub Khan, 1951 |
| GKN-213 (1) | UN founded 1945 = SS-442 | 51 original UN member states (50 signed + Poland) |
| GKN-214 (2) | San Francisco conference = SS-443 | UN Charter signed 26 June 1945 |
| GKN-216 (3) | UN HQ New York = SS-444 | UN HQ borough = Manhattan |
| GKN-217 (1) | 6 principal organs = SS-446 | Rockefeller gift paid for UN HQ land |
| GKN-224 (1) | Secretariat chief admin office = SS-453 | Secretary General term = 5 years |
| GKN-247 (2) | OIC founded 1969 = PAK-460 | OIC founding followed Al-Aqsa arson attack |
| GKN-251 (2) | SAARC secretariat Kathmandu = PAK-464 | SAARC has 8 member states |
| GKN-252 (1) | ECO HQ Tehran = PAK-467 | ECO has 10 member states |
| GKN-264 (2) | Edison bulb inventor = SCI-488 | Edison demonstrated bulb in 1879 (patent 1880) |
| GKN-265 (1) | Gutenberg press inventor = SCI-491 | Gutenberg press developed in Germany (Mainz, ~1440) |
| GKN-280 (2) | Sputnik 1 first satellite = SCI-409 | Sputnik 1 launched by Soviet Union, 1957 |
| GKN-312 (3) | 1 byte = 8 bits = ITC-008 | 1 nibble = 4 bits |
| GKN-313 (2) | Cricket team 11 = DRW-011 | Boundary along ground = 4 runs |
| GKN-314 (0) | Football team 11 = DRW-013 | Most FIFA World Cups = Brazil (5) |
| GKN-315 (3) | Field hockey team 11 = DRW-015 | Most Olympic hockey golds = India (8) |
| GKN-316 (1) | Basketball 5 on court = PE-001 | Basketball invented by Naismith, 1891 |
| GKN-317 (2) | Volleyball 6 on court = PE-002 | Volleyball invented by Morgan, 1895 |
| GKN-322 (0) | Kabaddi 7 on court = PE-007 | Kabaddi = national sport of Bangladesh |
| GKN-394 (1) | First woman Speaker Fahmida Mirza = PAK-444 | Fahmida Mirza elected 2008 as PPP member |
| GKN-419 (2) | Artemis I spacecraft Orion = GKN-386 (in-batch) | Artemis I rocket = Space Launch System |
| GKN-450 (0) | USB expansion = ITC-040 | PDF = Portable Document Format |
| GKN-452 (1) | WWW expansion = ITC-026 | HTML = Hypertext Markup Language |
| GKN-463 (2) | Hamlet author = SS-375 | Hamlet set in Denmark (Elsinore) |
| GKN-466 (1) | Gitanjali author = SS-378 | Tagore Nobel Prize in Literature 1913 |
| GKN-471 (2) | Human Rights Day 10 Dec = SS-193 | World AIDS Day 1 December |
| GKN-472 (3) | Nobel categories 6 = GKN-210 (in-batch) | First woman Nobel laureate = Marie Curie (1903) |
| GKN-476 (0) | Hajj month Dhul-Hijjah = ISL-086 | Arafat gathering on 9 Dhul-Hijjah (Day of Arafah) |
| GKN-487 (2) | Adam first prophet = ISL-228 | Adam created from clay |
| GKN-488 (1) | 25 prophets named = ISL-227 | Most-mentioned prophet = Musa |
| GKN-489 (3) | Ibrahim + Ismail built Kaaba = ISL-231 | Ibrahim's title Khalilullah (Friend of Allah) |
| GKN-492 (1) | Zabur revealed to Dawud = ISL-223 | Zabur known in English as Psalms |
| GKN-493 (3) | Hijri calendar started by Umar = ISL-082 | Hijri years counted from the Hijrah |
| GKN-494 (0) | Hijrah year 622 CE = ISL-099 | Abu Bakr accompanied the Prophet on the Hijrah |
| GKN-495 (2) | Uhud 3 AH = ISL-067/101 | Uhud fought against the Quraysh |
| GKN-496 (1) | Khandaq 5 AH = ISL-068 | Khandaq = Battle of the Confederates (Ahzab) |
| GKN-497 (0) | Conquest of Makkah 8 AH = ISL-069 | Conquest of Makkah in Ramadan |

Rejected rewrite targets (already covered elsewhere — not reused): Thal Desert (GKN-071), OIC summit city Rabat (GKN-248), UN Day 24 Oct (GKN-229), smallest province by population (PAK-318), WWW inventor Berners-Lee (GKN-297), World Health Day 7 April (GKN-469), HTTP expansion (GKN-451), ECO founding trio (PAK-466), War and Peace/Tolstoy (GKN-464), Hague/ICJ seat (SS-451 + GKN-222), Trusteeship suspension (SS-455).

Full fact-check read: all 470 new items' English question + answer + explanation read in full; trilingual fidelity spot-check 29 items (1 per slice) — 29/29 faithful. Post-fix audit: exact duplicates 0, stem-duplicate groups 0, remaining Jaccard flags all distinct-fact siblings (see §3).

## 5. Counts + manifest ripple (5226 → 5696)

- `src/lib/bank-manifest.ts` regenerated via `npm run prebuild` (twice, byte-identical; sha256 `df461b543ba322d7a2db9e4d6b2a2e3ff9c193798a2cf180b2e376063ac199e2`, unchanged after the final build). `BANK_COUNTS.gk = 500` (line 11), `BANK_TRUSTED.gk = 0` (line 30, no verified items), `ID_BANK` holds 5696 ids.
- `src/data/content.json`: `counts.total` 5226 → 5696; `bySubject` row "GK" → 500; `bySubject.gk` index extended to 500 ids. Note data untouched. Serialization preserved (`JSON.stringify`, no indent, no trailing newline).
- `src/app/layout.tsx:30`: meta description → 5696 MCQs.
- `5226` → `5696` in 31 files (30 scripts + `layout.tsx`): `test-lazy-banks`, `test-phase4a`, `test-phase4b1`, `test-phase4b2`, `test-provenance`, `test-retrieval`, `test-stage5a–g`, `test-step2b`, `test-step2fixes`, `test-step3a`, `test-step3b-audit1`, `test-step3b-audit2`, `test-trilanguage`, `qa-540`, and the ten prior Phase 1 suites. `gk: 30` → `gk: 500` in `qa-540.mjs` (EXPECTED) and the ten prior suites' `EXPECTED_OTHER` blocks. `qa-540.mjs` header comment names all eleven Phase 1 batches.
- **qa-540 GK-bank check rescope** (mirrors the `PAK_ORIG45`/`SCI_ORIG30`/SS pattern — preserves exactly what the check asserted, nothing weakened): the generic-capitals regex check now runs over all 500 items (it always filtered the whole bank; only the detail string changed from a hardcoded "30 items" to the live count), and the ID check now asserts 500 items, all `GKN-` ids, all draft + unverified, the FIRST 30 keeping `source: "ai-generated"`, and the 470 appended items carrying `Original — concept-extracted from …` sources.
- **Stage 5D: count pins only** (§2 bank-size pin → 500 with Phase 1 wording; §3 expected-count table `["gk", "gk", 30]` → 500). §4 scopeQs (includes GK — new items carry `explanationUrdu: null`, no `explanationLang`, holds) and §7 GKN-028 honorific checks untouched. **Stage 5E: NO rescope needed** (like Social Studies): the existing 30 have plain-English explanations and no `explanationEn`, so only its total pin changed (GK appears only in `BANK_KEYS`).
- **F02 pins UNCHANGED**: `test-step3b-audit2.mjs` "exactly 124 items carry explanationEn" stays as-is (new items carry no `explanationEn`); only its total pin changed (5226 → 5696).
- **Lazy-banks** (`scripts/test-lazy-banks.mjs`): added the gk byte-prefix check (+1 check; 2-char strip documented — gk.json has no trailing newline, like pedagogy.json/science.json/socialstudies.json); `PHASE1_CHANGED` exception set now lists twelve files incl. `gk.json`; content.json revert extended with the GK row + `bySubject.gk`.
- `package.json`: new script `test:phase1gk`.
- **Ledger** recomputes from data (via `tsc`-compiled `src/lib/ledger.ts`): 12 rows, 8 Exact / 1 Proxy / 3 Partial — unchanged pattern. TT/AT/PST/CT/CT-IT/DM/PET/Qari/SST-KPPSC show GK 500 MCQs (totals +470 each: TT/AT 3030 → 3500; PST/CT 2530 → 3000; CT-IT 2090 → 2560; DM 2080 → 2550; PET 2076 → 2546; Qari 3530 → 4000; SST-KPPSC 1530 → 2000). All other tracks unchanged (ZamungKor Proxy 3000; SWSE 2500; SST-ETEA 2000) — GK is not in their patterns.
- **Mocks**: fixed ZamungKor lists (3×100) still resolve and stay disjoint (asserted by the new suite); dynamic sampling verified via the lazy-banks three-way availability check.

## 6. Tests + build

- Baseline (before any change): `npm run build` PASS, `npx tsc --noEmit` clean, **3327 checks / 51 suites** green (counted by PASS lines; all suite files exit 0).
- New suite `scripts/test-phase1-gk.mjs` (35 checks): 500 items, ID sequence GKN-001..GKN-500 in file order, existing 30 in place, new items GKN-031..GKN-500, 23-key schema + fixed fields + all-6-fields + 4 distinct options, dedupe + stem rule, correctIndex distribution (each position 20–30%), honorific/banned-symbol/`nastaliq`/script/codepoint/digit audits, NFKC repeated-Urdu-forms check, F02 guard, numeric/formula-option convention, numeric distinctness, explanations-translated check, GK generic-capitals guard over all 500, Current Affairs year rule (60/60), topic-coverage table vs §3.10 (embedded existing-30 classification + fill plan 62/70/50/50/50/50/60/50/28), manifest counts match, BANK_TRUSTED 0, no-other-bank scope, fixed-mock resolution + disjointness.
- No first-run failures: the new suite passed 35/35 on its first run (including the NFKC repeated-forms check, which the slice validator does not cover), and the lazy-banks chunk-split check passed on the fresh build.
- Final: `npm run build` **PASS**, `npx tsc --noEmit` **clean**, ALL suites green — **3363 checks / 52 suites** (baseline 3327/51; +35 new suite +1 lazy-banks prefix check). Zero failures.
- Local prod server (`next start`, fresh build): all 14 routes (`/`, `/practice`, `/topics`, `/review`, `/mock`, `/flashcards`, `/library`, `/plan`, `/analysis`, `/tracks`, `/tutor`, `/vacancies`, `/issues`, `/links`) + `/mock/tt-B` + `/tracks/tt` + `/robots.txt` all HTTP 200. Home HTML carries 5696. GK lazy chunk (701,598 bytes, `.next/static/chunks/07q1mjr_3gu9q.js`) serves HTTP 200 and contains the GKN-031 question text + GKN-001/GKN-500; the bank's question text appears in exactly one chunk (the second chunk containing GKN ids holds only ID_BANK manifest references). Server stopped afterwards; port verified closed.

## 7. Files changed (this batch)

1. `src/data/banks/gk.json` — 30 → 500 items (470 appended).
2. `src/data/content.json` — counts + `bySubject.gk` index.
3. `src/lib/bank-manifest.ts` — regenerated (sha256 `df461b54…`).
4. `src/app/layout.tsx` — meta description 5696 MCQs.
5. `package.json` — `test:phase1gk` script.
6. `scripts/test-phase1-gk.mjs` — new, 35 checks.
7. 30 existing scripts — count pins only (5226 → 5696; gk 30 → 500 where applicable), plus the qa-540 GK-check rescope, the Stage 5D pin updates, and the lazy-banks exception extension documented in §5.
8. `CHANGELOG.md` — Subject 11 entry appended.
9. `VERIFY-phase1-gk.md` — this report.

Total: 38 files (one more than Social Studies' 37, because the ripple now also touches the prior Social Studies suite — each batch adds one more prior suite to the count ripple; `structural-checks.json` was NOT regenerated this batch — the structural-check script was not run, as no mock changed). Slice sources (NOT part of the repo push): `~/workspace/phase1-gk/` — `BRIEF.md`, `validate-slice.mjs`, `merge.mjs`, `jaccard.mjs`, `jaccard-crossbank.mjs`, `apply-rewrites.mjs`, `slices/slice-01.json` … `slice-29.json`.

## 8. Caveats / flags for the owner (all items draft/unverified — owner verifies via /review)

- **Coordinator rewrite flags** (all draft, owner verification worthwhile): GKN-066 Tirich Mir 7,708 m (some sources 7,706 m); GKN-072 Manchar "largest natural lake" (seasonal size variation); GKN-213 51-vs-50 original UN members subtlety (50 signed the Charter + Poland); GKN-264 Edison 1879 demonstration vs 1880 patent; GKN-492 Zabur/Psalms correspondence + Urdu "مزامیر" rendering; GKN-496 Ahzab/Confederates terminology; GKN-488 Musa most-mentioned prophet (count 136 not stated in the item); GKN-085 shortest-coastline framing (Punjab/KP landlocked, stated in the explanation).
- **Values and wordings workers flagged**: S05 Pretoria three-capitals wording, Turkey/Türkiye spelling, seat-of-government Urdu rendering; S06 Pacific/Dead Sea/Caspian hedges; S15 attribution hedges (Edison/Swan, Gutenberg "about 1440", Marconi 1895, Perkins refrigerator, Sikorsky 1939); S20 Jahangir 555-match streak (Guinness caveat), Jansher consecutive-titles wording, Afridi 37-ball record broken 2014 (stated in GKN-356 explanation); S01 GKN-042 7 petals (2018-merger dating of the "4 provinces + 3 territories" symbolism); S04 GKN-086/088 firsts with conflicting sources (Zafarullah Khan first Foreign Minister; Majida Rizvi first woman High Court judge); GKN-334 Olympic motto "traditional" wording (current motto adds "Together" since 2021); GKN-201 stem gives away its answer (Romeo and Juliet); GKN-408 "newest member" South Sudan (true since 2011, time-sensitive phrasing).
- **Terminology inconsistency for the owner**: GKN-096/427 use "Turkey" while GKN-416 uses "Turkiye" — the owner may prefer one form everywhere.
- **S23 flags** (Current Affairs, Pakistan institutions): GKN-394 "Fahmida Mirza" spelling (matches PAK-444; the brief wrote "Fehmida"); GKN-396 NAB "replaced by"/successor wording re the Ehtesab Cell; GKN-397/406 FIA Act 1974 vs FIA existence 1975 (verified against fia.gov.pk: "FIA Act, 1974 (Act VIII of 1975)", promulgated 13 Jan 1975); GKN-398/399 PIA merger 11 Mar 1955 (PIA existed as a department from 1951, joint agreement 1953 — deliberately excluded from distractors; Orient founding day 23 vs 29 Oct 1946, item asks year only); GKN-401 census-gap angle (no figures); GKN-402 five-year plan term 1955–1960 vs formal approval 1957; GKN-403 PTV colour 1976 first/experimental vs 1982 full-time (1982 excluded from distractors); GKN-404 Radio Pakistan Lahore first announcement (Peshawar also broadcast that night; one weak source claims Karachi, contradicted); GKN-393 past-tense 2024-first phrasing only.
- **Coverage notes**: no generic "capital of \<country\>" questions by design (reverse angles only); Current Affairs items are settled history with years, not news; the original 30's Pakistan/Islamic items are complemented, not repeated, by the new angles (see §3–§4).
- **Known pre-existing limitations untouched**: one-active-practice-session limit; source/provenance line stays English in Urdu/Roman mode (Phase 2 scope); old `/topics` sessions orphaned; load-failure cache eviction untested automatically.
- **Not in scope / not done**: no push/deploy (parent); no backup recreated; no other bank/subject; no content/schema change beyond the gk bank + count ripple; no owner-verification of any new item (all draft).
