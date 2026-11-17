# VERIFY — Phase 1, Subject 10: Social Studies bank 30 → 500 MCQs

Date: 2026-11-17 (local; NOT deployed — parent handles push/deploy/live verification).
No push, deploy, GitHub, Vercel, or env changes by this batch. No backup recreated. No other bank or subject touched.

## 1. What was added

- **470 NEW items, SS-031–SS-500**, sequential, no gaps, appended to `src/data/banks/socialstudies.json` (now 500 items, 927,744 bytes). ID prefix/sequence continues the existing bank exactly (`SS-001..SS-030` pre-existing; the brief's SST/SOC guess was checked against the bank first — the actual prefix is `SS-`).
- **Trilingual at creation**: every new item carries all 6 fields (`question`/`options`/`explanation` × `_ur`/`_roman`) following the Stage 5 conventions — faithful translations, option order preserved, digits/values unchanged.
- **Standard convention**: new items have a pure-English `explanation` + faithful `_ur`/`_roman` translations and NO `explanationEn`, and NO `sourceNote`. The existing 30 keep their pre-existing `sourceNote` provenance key (`AI-drafted from ETEA 453 Social Studies block; unreviewed`) and their plain-English explanations untouched — unlike Science/Pak Studies, the original 30 carry NO `explanationEn`, so Stage 5E needed NO rescope (see §5).
- **Status**: every new item `reviewStatus: "draft"`, `verified: false`, `reviewedBy: null`, `reviewedAt: null` (23-key schema, key order verified). `source` = `Original — concept-extracted from Standard Social Studies Curriculum (Classes 4-8)` on all 470. `pastPaperRef: null`. `difficulty: "medium"`. `post` = the same 7-post array as the existing SS items (`tt`, `at`, `pst`, `ct`, `ctit`, `qari`, `swse`). No ETEA authorship claimed anywhere.
- **Additive only**: the existing 30 items are byte-identical — the merged bank file preserves the pre-merge file as an exact prefix (verified by `merge.mjs` output and by the lazy-banks byte-prefix check, `scripts/test-lazy-banks.mjs`). Note: `socialstudies.json` carries NO trailing newline (like `pedagogy.json`/`science.json`, unlike the other Phase 1 banks), so the prefix check strips 2 chars (`\n]`) instead of 3; the merge preserves this file's own serialization convention (`JSON.stringify(items, null, 1)`, no trailing newline).

## 2. Coverage table (§3.9 topic map)

Existing 30 classified by content (ID map embedded in the new suite); fill = map allocation minus existing. Map totals sum to 500 exactly; no topic exceeds its allocation.

| Topic (§3.9) | Existing | New | Total | Map |
|---|---|---|---|---|
| Geography Skills | 0 | 70 | 70 | 70 |
| Physical Geography | 8 (007–012, 027, 030) | 52 | 60 | 60 |
| Civics | 5 (005, 006, 016, 018, 020) | 55 | 60 | 60 |
| History | 5 (001–004, 025) | 55 | 60 | 60 |
| Economics | 4 (021–024) | 46 | 50 | 50 |
| Population & Demography | 1 (019) | 39 | 40 | 40 |
| Culture & Heritage | 2 (017, 029) | 48 | 50 | 50 |
| Government & Administration | 4 (013–015, 028) | 46 | 50 | 50 |
| Current Affairs & World Organizations | 1 (026) | 59 | 60 | 60 |
| **Total** | **30** | **470** | **500** | **500** |

Slice plan (29 slices, `~/workspace/phase1-socialstudies/slice-01.json` … `slice-29.json`; every slice re-validated clean by the coordinator with `validate-slice.mjs`, 28 checks each):

| Slice | IDs | Topic label | N |
|---|---|---|---|
| S01–S04 | 031–100 | Geography Skills | 17/17/18/18 |
| S05–S07 | 101–152 | Physical Geography | 17/17/18 |
| S08–S10 | 153–207 | Civics | 18/18/19 |
| S11–S13 | 208–262 | History | 18/18/19 |
| S14–S16 | 263–308 | Economics | 16/15/15 |
| S17–S19 | 309–347 | Population & Demography | 13/13/13 |
| S20–S22 | 348–395 | Culture & Heritage | 16/16/16 |
| S23–S25 | 396–441 | Government & Administration | 16/15/15 |
| S26–S29 | 442–500 | Current Affairs & World Organizations | 15/15/14/15 |

Done: SS-031–SS-500 (all 470). Pending: none. No topic slots left unfilled; no item omitted at the merge boundary. No worker errored; no slice was re-dispatched.

## 3. Content rules compliance

- **Original questions only**, own words; standard Classes 4–8 Social Studies facts only (civics, geography, history of Pakistan/world, culture, economy, environment, government). Omit-on-doubt applied as avoidance rather than omission (no slots were left empty): workers deliberately avoided uncertain specifics — no provincial census shares or urban/rural percentages; no member-count claims for ASEAN (Timor-Leste became the 11th member in Oct 2025, so the count was avoided); no rank/length claim for Baltoro (SS-106 says "among the longest" only); no reserved-seat counts (SS-416); no counts/dates for Cordoba libraries, bimaristan hospitals, or the Canon of Medicine (SS-236/234/239/231 — standard textbook claims only); no dates for Mehrgarh (SS-216).
- **Census rule** (brief): every census figure carries its census year in question AND explanation; only three dated figures permitted anywhere (2017 total ~207.7m; 2023 total ~241.5m; 2023 growth rate ~2.55%). Census-figure items: SS-319, SS-320, SS-327, SS-328, SS-329 — all flagged for owner verification (§8).
- **Current-affairs rule** (brief): no news events in S26–S29; stable textbook facts only (UN system, agencies, regional organizations, foreign-policy principles, capitals/flags).
- **Exactly one correct answer** per item; explanations support the correct answer; options plausible and distinct. New-item `correctIndex` distribution: **120/124/121/105** (25.5/26.4/25.7/22.3%) — asserted by the new suite (each position 20–30%).
- **Notation rules**: NO degree symbol anywhere — "degrees" written out (e.g. SS-031 latitude of the equator). NO × ÷ √ π ² ³ ≤ ≥ • characters. ASCII digits only, identical digit runs in all 3 languages in every field; no Urdu-Indic digits. Urdu fields use Urdu yeh ی U+06CC / kaf ک U+06A9 only (Arabic yeh/kaf normalized in slice files). No Urdu/Arabic script in EN or `_roman` fields. No Latin honorific abbreviations `(SAW)/(PBUH)/(RA)/(AS)` anywhere. No em/en-dash in content fields (only the mandated `source`/`topic` strings carry the em-dash). No `nastaliq` string anywhere (test-fonts clean).
- **F02 guard**: English fields contain zero Roman-Urdu detector hits on all 470 new items under the slice validator's strict zero-hit check; zero F02 rewords needed. The new suite asserts the repo-standard <2-hits rule.
- **Dedupe**: zero exact normalized-question duplicates across all 500; the qa-540 stem rule (first 12 normalized words) holds across ALL banks. Cross-bank Jaccard scan (threshold 0.55) of all 470 new items against all 4756 existing bank items flagged **0 pairs**. Within-batch Jaccard scan flagged 2 pairs, both inspected and kept as distinct-fact siblings; additional near-pairs found during the stratified read were likewise kept as distinct-fact siblings: second- vs third-largest continent SS-087/088; second census 1961 vs census after 1981 SS-314/317; growth-rate interpretation vs per-100 numeric meaning SS-320/328; doubling-time effect vs definition SS-329/330; which body provides services vs which services a municipal committee provides SS-399/438; DC's responsibilities vs which officer heads a district SS-409/435; which groups reserved seats serve vs what women's reserved seats increase SS-416/440. Cross-bank reverse-angle pairs kept as distinct: SS-425 vs PAK-261 (Senate staggered renewal every 3 years vs 6-year term); SS-095 vs SCI-411 (ocean surrounding the North Pole vs smallest ocean); SS-343 vs PAK-035 (population-vs-area concept vs most-populous-province recall); SS-290 vs PAK-397 (CPEC overall purpose vs energy-project purpose); S28 founding/HQ items vs PAK-460/461/463/464/467 (year/city in stem, organization acronym as answer — the assignment explicitly required founding + HQ coverage).
- **Numeric items recomputed**: census subtraction SS-327 (241.5 − 207.7 = about 33.8 million); census gap SS-316 (1998–2017 = 19 years); all year/count options checked against the three permitted census figures. Only brief-authorized standard values used (7 continents, 24 main time zones, 193 UN members, 22 Arab League members, 57 OIC members, 8 SAARC members, 10 ECO members).

## 4. Coordinator merge findings (4 rewrites; slice sources kept in sync)

1. **SS-327** (S18) — was a near-verbatim duplicate of SS-319 (Jaccard 0.765; both asked what the 2017-vs-2023 comparison shows). Rewritten to the subtraction item: 241.5 − 207.7 = about 33.8 million growth between censuses (correctIndex 0 preserved; years + figures in question and explanation). Slice re-validated SLICE VALID.
2. **SS-387** (S22) — was an exact reverse of PAK-438 (Makli/Thatta/cemetery fact swapped). Rewritten to the Chaukhandi Tombs near Karachi (verified: no PAK/GK Chaukhandi item exists; correctIndex 3 preserved). Slice re-validated.
3. **SS-405** (S23) — tested the same NFC revenue-sharing fact as PAK-251. Rewritten to local-government income (market fees + property taxes; correctIndex 1 preserved; verified no PAK local-government-revenue item exists). Slice re-validated.
4. **SS-412** (S24) — tested the same ECP free-and-fair-elections fact as SS-199 (caught in the stratified fact-check read, below the Jaccard threshold). Rewritten to the election-schedule angle (dates for nomination/campaigning/polling; correctIndex 0 preserved; verified no PAK "schedule" item exists). Slice re-validated.

All four rewrites preserve their slice's `correctIndex` (distributions unchanged) and pass the full 28-check slice validation. Jaccard scans were re-run after each rewrite. Post-fix audit: exact duplicates 0, stem-duplicate groups 0, cross-bank Jaccard pairs 0, remaining within-batch pairs all distinct-fact siblings. Stratified fact-check read (all 470 English questions + correct answers read in full; 34-item full trilingual sample — first/middle/last per slice + flagged items — read in all 3 languages): answers match questions, distractors plausible, translations faithful, no wrong answers spotted. Byte-level check: no U+FFFD replacement characters in any slice file (one terminal-rendering artifact in a dump was verified clean at the byte level).

## 5. Counts + manifest ripple (4756 → 5226)

- `src/lib/bank-manifest.ts` regenerated via `npm run prebuild` (twice, byte-identical; sha256 `4fecf56fc78e849c9df5c0abb67272c8da83c3e7b320ceaf3f06899ac2153024`, unchanged after the final build). `BANK_COUNTS.socialstudies = 500` (line 21), `BANK_TRUSTED.socialstudies = 0` (line 40, no verified items), `ID_BANK` holds 5226 ids.
- `src/data/content.json`: `counts.total` 4756 → 5226; `bySubject` row "Social Studies" → 500; `bySubject.socialstudies` index extended to 500 ids. Note data untouched. Serialization preserved (`JSON.stringify`, no indent, no trailing newline).
- `src/app/layout.tsx:30`: meta description → 5226 MCQs.
- `4756` → `5226` in 30 files (29 scripts + `layout.tsx`): `test-lazy-banks`, `test-phase4a`, `test-phase4b1`, `test-phase4b2`, `test-provenance`, `test-retrieval`, `test-stage5a–g`, `test-step2b`, `test-step2fixes`, `test-step3a`, `test-step3b-audit1`, `test-step3b-audit2`, `test-trilanguage`, `qa-540`, and the nine prior Phase 1 suites. `socialstudies: 30` → `socialstudies: 500` in `qa-540.mjs` (EXPECTED) and the nine prior suites' `EXPECTED_OTHER` blocks. `qa-540.mjs` header comment names all ten Phase 1 batches.
- **qa-540 SS-bank check rescope** (mirrors the `PAK_ORIG45`/`SCI_ORIG30` pattern — preserves exactly what the check asserted, nothing weakened): bank 500 items, all `SS-` ids, all draft + unverified, and the FIRST 30 keep `sourceNote` = "AI-drafted from ETEA 453 Social Studies block; unreviewed", while the 470 appended items carry no `sourceNote` (asserted by the new suite).
- **Stage 5E: NO rescope needed** (unlike Science/Pak Studies): the existing 30 have plain-English explanations and no `explanationEn`, so the existing §4 "no explanationEn" check and the plain-English digit loop already cover all 500 once counts are updated. Only the two `30` pins changed (§2 bank-size pin → 500 with Phase 1 wording; §3 expected-count table `["socialstudies", "socialstudies", 30]` → 500), plus a comment accuracy fix ("all 30" → "the original 30" for the `sourceNote` provenance key).
- **F02 pins UNCHANGED**: `test-step3b-audit2.mjs` "exactly 124 items carry explanationEn" stays as-is (new items carry no `explanationEn`); only its total pin changed (4756 → 5226).
- **Lazy-banks** (`scripts/test-lazy-banks.mjs`): added the socialstudies byte-prefix check (+1 check; 2-char strip documented — socialstudies.json has no trailing newline, like pedagogy.json/science.json); `PHASE1_CHANGED` exception set now lists eleven files incl. `socialstudies.json`; content.json revert extended with the Social Studies row + `bySubject.socialstudies`.
- `package.json`: new script `test:phase1socialstudies`.
- **Ledger** recomputes from data (via `tsc`-compiled `src/lib/ledger.ts`): 12 rows, 8 Exact / 1 Proxy / 3 Partial — unchanged pattern. TT/AT/PST/CT/CT-IT/Qari/SWSE show Social Studies 500 MCQs (totals +470 each: TT/AT 2560 → 3030; PST/CT 2060 → 2530; CT-IT 1620 → 2090; Qari 3060 → 3530; SWSE 2030 → 2500). All other tracks unchanged (ZamungKor Proxy 3000; DM 2080; PET 2076; SST-ETEA 2000; SST-KPPSC 1530) — Social Studies is not in their patterns.
- **Mocks**: fixed ZamungKor lists (3×100) still resolve and stay disjoint (asserted by the new suite); dynamic sampling verified via the lazy-banks three-way availability check.

## 6. Tests + build

- Baseline (before any change): `npm run build` PASS, `npx tsc --noEmit` clean, **3293 checks / 50 suites** green (counted by PASS lines; all suite files exit 0).
- New suite `scripts/test-phase1-socialstudies.mjs` (33 checks): 500 items, ID sequence SS-001..SS-500 in file order, existing 30 in place, new items SS-031..SS-500, 23-key schema + fixed fields + all-6-fields + 4 distinct options, dedupe + stem rule, correctIndex distribution (each position 20–30%), honorific/banned-symbol/`nastaliq`/script/codepoint/digit audits, F02 guard, numeric/formula-option convention, numeric distinctness, explanations-translated check, topic-coverage table vs §3.9 (embedded existing-30 classification + fill plan 70/52/55/55/46/39/48/46/59), manifest counts match, BANK_TRUSTED 0, no-other-bank scope, fixed-mock resolution + disjointness.
- No first-run failures: the new suite passed 33/33 on its first run, and the lazy-banks chunk-split check passed on the fresh build (cross-bank Jaccard had returned 0 pairs pre-merge, so no SCI-486-style probe collision arose).
- Final: `npm run build` **PASS**, `npx tsc --noEmit` **clean**, ALL suites green — **3327 checks / 51 suites** (baseline 3293/50; +33 new suite +1 lazy-banks prefix check). Zero failures.
- Local prod server (`next start`, fresh build): all 14 routes (`/`, `/practice`, `/topics`, `/review`, `/mock`, `/flashcards`, `/library`, `/plan`, `/analysis`, `/tracks`, `/tutor`, `/vacancies`, `/issues`, `/links`) + `/mock/tt-B` + `/tracks/tt` + `/robots.txt` all HTTP 200. Home HTML carries 5226. Social Studies lazy chunk (835,791 bytes, `.next/static/chunks/0fhocrwvavxha.js`) serves HTTP 200 and contains SS-031, SS-001, and SS-500; the bank's question text appears in exactly one chunk (the second chunk containing SS ids holds only ID_BANK manifest references). Server stopped afterwards; port verified closed.

## 7. Files changed (this batch)

1. `src/data/banks/socialstudies.json` — 30 → 500 items (470 appended).
2. `src/data/content.json` — counts + `bySubject.socialstudies` index.
3. `src/lib/bank-manifest.ts` — regenerated (sha256 `4fecf56f…`).
4. `src/app/layout.tsx` — meta description 5226 MCQs.
5. `package.json` — `test:phase1socialstudies` script.
6. `scripts/test-phase1-socialstudies.mjs` — new, 33 checks.
7. 29 existing scripts — count pins only (4756 → 5226; socialstudies 30 → 500 where applicable), plus the qa-540 SS-check rescope, the Stage 5E pin updates, and the lazy-banks exception extension documented in §5.
8. `CHANGELOG.md` — Subject 10 entry appended.
9. `VERIFY-phase1-socialstudies.md` — this report.

Total: 37 files (one more than Science's 36, because the ripple now also touches the prior Science suite — each batch adds one more prior suite to the count ripple). Slice sources (NOT part of the repo push): `~/workspace/phase1-socialstudies/` — `BRIEF.md`, `validate-slice.mjs`, `merge.mjs`, `jaccard.mjs`, `jaccard-crossbank.mjs`, `rewrite-items.mjs`, `rewrite-ss412.mjs`, `slice-01.json` … `slice-29.json`.

## 8. Caveats / flags for the owner (all items draft/unverified — owner verifies via /review)

- **Census values most deserving owner verification**: SS-319, SS-320, SS-327, SS-328, SS-329 (the three permitted dated figures: 2017 ~207.7m, 2023 ~241.5m, 2023 growth ~2.55%); SS-316 (longest gap 1998–2017, 19 years — a 2011 house-listing exercise existed but was not a full census); SS-318 (7 censuses by end-2023).
- **Values and wordings workers flagged**: SS-424 (90-day election rule — constitutionally standard but contested in practice 2023–24); SS-456 (Pakistan among largest peacekeeping contributors — rankings shift); SS-455 (Trusteeship Council suspended 1994); SS-443 (50 countries at the San Francisco conference; 51 original members incl. Poland); SS-461 (IMF "short term help" simplification); SS-471 (WHO 1948, constitution in force); SS-303 (State Bank "sole authority" for notes only — coins are government-issued); SS-304 ("bank of banks" phrase variant); SS-299 ("general acceptability" terminology); SS-287 (wool "mainly" from sheep); SS-121 (Nile longest — debated vs Amazon in specialist sources); SS-124 (Caspian as largest lake; SS-126 covers largest freshwater lake separately); SS-148/149 (meteors in mesosphere; auroras mainly in thermosphere); SS-150/151 (Sahara largest hot desert vs Antarctic largest overall — qualifiers carry the distinction); SS-145 (monsoon from an Arabic word meaning "season"); SS-062 (24 main time zones — half/quarter-hour offsets exist); SS-052/053/054 (International Date Line "mainly" 180 degrees; westward-forward / eastward-backward date rules, easily confused); SS-060 ("about 24 hours" rotation); SS-105 (Greenland largest island — school convention treating Australia as a continent); SS-106 (Baltoro "among the longest" — no rank/length claimed); SS-108 (Everest on the Nepal–China border); SS-110 (Lowari Pass road-route framing; modern traffic uses the tunnel); SS-089 (Europe second-smallest continent, 7-continent order); SS-095 (Arctic Ocean/North Pole — fact also appears in SCI-411's explanation); SS-240 (Istanbul name became official much later than 1453); SS-236/234/239/231 (Cordoba libraries, bimaristan hospitals, crops in Muslim Spain, Canon of Medicine — standard textbook claims, no counts/dates); SS-213 (Harappa "granary" identification debated); SS-210/211 (Great Bath ritual purpose, seals trade function — inferred, hedged); SS-220 (Gandhara "most" statues grey schist); SS-219 (Taxila curriculum from traditional accounts); SS-216 (Mehrgarh growth summary, no dates); SS-248 (APWA founded 1949 by Raana Liaquat Ali Khan — year in explanation); SS-245 (MAO College combined-education characterization); SS-365 (anthem mainly Persian); SS-369 (Faiz thematic framing — interpretive); SS-371 (Sassi Pannu "mainly" Sindh); SS-354 (Sindhi "Arabic script" — strictly a Perso-Arabic variant); SS-348 (Punjabi largest mother tongue — census-supported, no figure stated); SS-357 (Hindko also spoken outside Hazara; item claims Hazara usage only); SS-383 (Shandur teams "Chitral and Gilgit" short form); SS-388 (Takht-i-Bahi UNESCO membership; tentative-list status not verified); SS-391 (Gandhara "mixed local and Greek influences"); SS-188 (two-thirds majority simplification — strictly two-thirds of total membership of each house); SS-184 ("must take steps" per Article 31(2) "shall endeavour"); SS-173 (supremacy framing); SS-181/183/185/186 (5–16 education, 24 hours, President/PM Muslims, Federal Shariat Court — standard constitutional facts); SS-402/406/409/398 (Concurrent List, CCI, DC role, provincial subjects — standard textbook positions); SS-415 ("mainly" — Islamabad Senate seats elected by National Assembly); SS-416 (reserved-seat counts deliberately avoided); SS-425 (staggered renewal vs PAK-261 term — kept as distinct); SS-489 (Madrid "high plateau near the centre of Spain" — loosest phrasing in S29); SS-485 (Arab League 22 members); S28 member counts in explanations (OIC 57, SAARC 8, ECO 10; ASEAN count avoided); SS-481 (Jakarta secretariat, no capital claim — Nusantara transition).
- **Coordinator rewrites** (all draft, owner verification worthwhile): SS-327 (census subtraction, ~33.8m), SS-387 (Chaukhandi Tombs near Karachi), SS-405 (local-government income), SS-412 (election schedule).
- **Urdu terminology choices** (translation-label choices only; English answers unaffected): SS-273 opportunity cost → موقع کی لاگت; SS-274/278 fourth factor "enterprise"/"entrepreneur" → کاروبار/کاروباری; SS-260 Renaissance → نشاۃ ثانیہ; S19 push/pull factors → دھکیلنے/کھینچنے والے عوامل, urbanization → شہری کاری (owner may prefer دافع/جاذب); S23 Federal Legislative List → وفاقی قانون ساز فہرست, Concurrent List → مشترکہ فہرست; S03 "legend" → لیجنڈ, "compass rose" → کمپاس روز; SS-436 FIR → ابتدائی اطلاعی رپورٹ.
- **Coverage notes**: no news events in S26–S29 by design (stable textbook facts only); no ASEAN member count by design; the original 30's SS-026 UN-membership item is complemented, not repeated, by S26–S29's UN-system angles.
- **Known pre-existing limitations untouched**: one-active-practice-session limit; source/provenance line stays English in Urdu/Roman mode (Phase 2 scope); old `/topics` sessions orphaned; load-failure cache eviction untested automatically.
- **Not in scope / not done**: no push/deploy (parent); no backup recreated; no other bank/subject; no content/schema change beyond the socialstudies bank + count ripple; no owner-verification of any new item (all draft).
