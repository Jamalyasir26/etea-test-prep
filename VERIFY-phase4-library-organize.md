# VERIFY — Phase 4 (expansion): library material + organize/IA cleanup

Phase 4 is the LAST phase of the expansion program (owner order 2026-11-16).
Scope: (A) concept-extracted study notes for the topic-map areas least
covered by the 151 existing notes, prioritizing ZamungKor TT + Qari and
the thinnest subjects; (B) organize/IA cleanup — the stale home tutor
line, the /mock LIST translation observation from the Phase 3 live
check, dead imports, and nav/grouping consistency. No bank/question
changes, no reviewStatus/verified/correctIndex changes, no localStorage
schema changes, no file deletions, one-active-session behaviour
unchanged, P1 per-subject resume NOT implemented (design only, Phase 3
report §3 — still awaiting owner approval).

## 1. What was built

### A. Library: 150 new notes, 151 → 301 total, trilingual at creation

25 worker slices (S01–S14b) wrote 150 notes, each with exactly the 10
schema keys (`title`, `body`, `title_ur`, `title_roman`, `body_ur`,
`body_roman`, `source`, `conceptId`, `syllabusClause`, `sourceKind`),
English bodies of 50–100 words, honest concept-extraction source labels
(§3), and a unique conceptId from the brief registry. All 150 are
`reviewStatus`-less notes (notes carry no review fields); all are
draft/unverified content for the owner's own review — nothing is marked
verified. Per-subject additions:

| Subject | Before | Added | After |
|---|---|---|---|
| Islamiyat | 14 | 12 | 26 |
| Tajweed | 24 | 11 | 35 |
| Arabic | 13 | 10 | 23 |
| Urdu | 6 | 14 | 20 |
| English | 8 | 12 | 20 |
| Maths | 7 | 13 | 20 |
| General Science | 8 | 12 | 20 |
| Pak Studies | 7 | 13 | 20 |
| Social Studies | 4 | 17 | 21 |
| GK | 6 | 14 | 20 |
| Pedagogy | 13 | 10 | 23 |
| IT/Computer | 17 | 7 | 24 |
| Drawing/PE | 24 | 5 (3 drawing + 2 PE) | 29 |
| **Total** | **151** | **150** | **301** |

Concept-extracted notes: 56 → 206. Every new note renders with the
`ProvenanceBadge` + source line in the library (existing UI, unchanged).
Translation conventions follow Stage 5/Phase 2 exactly: flat `_ur` /
`_roman` fields, item-level fallback (whole note renders English if any
field is missing — never half-translated), literal `[Auto-Translated]`
badge only when translated content renders, Roman-marked explanations
n/a (notes have no explanations), honorific convention (Arabic forms in
Urdu script, spelled-out forms in Roman, zero Latin abbreviations),
Arabic script in source fields copied verbatim, no review-queue
changes. Urdu notes follow the verified Urdu-subject exception:
`title`/`body` are Urdu script, `_ur` copies them verbatim, `_roman`
is a pure-Latin transliteration. Arabic notes carry zero Arabic script
in their English fields (new-note rule, suite-pinned).

### B. Organize findings (worker report: `~/workspace/phase4/organize/ORGANIZE-REPORT.md`)

1. **Stale home line — GONE, no fix needed.** The wording "AI Tutor —
   live, not yet tested with a real key" has 0 hits in `src/` or
   `public/`; variant searches found no stale tutor copy. Current home
   tutor strings (`tutorLiveHeading` "AI Tutor — live.",
   `tutorLiveBody`, `quickTutorDesc`, live `TutorHealth` states) are
   accurate and match the Gemini → Groq → OpenRouter fallback order.
   The stale wording survives only in historical docs. (The standing
   memory claim that home "still carries" this line is outdated.)
2. **/mock LIST translation — STALE SERVICE-WORKER CACHE, not a code
   bug. Nothing in the resolver/rendering was fixed.** Evidence chain
   (full detail in the organize report §B): all 28 defs carry complete
   non-empty `_ur`/`_roman` title+note; `resolveMockView`
   (`src/lib/data.ts`) is pure and must return translated output given
   complete data + `lang="ur"`; the list page resolves at render time
   from the live `lang` with no memo/ref/state snapshot, and the same
   `lang` feeds the Urdu chrome in the same render — so "Urdu chrome +
   English titles" cannot come from the current bundle. The decisive
   mechanism: question translation shipped in Stage 5, mock-title
   translation in Phase 2, so a bundle cached between them renders
   exactly the observed split; `sw.js` bytes never changed in Phase
   2/3 (no new worker, no update banner) and `CACHE_VERSION` stayed
   `v2` (old caches survive activation); RSC payloads from client-side
   navigation hit the stale-while-revalidate branch while `/mock/[id]`
   misses cache and goes to network. Precedent: the Phase 2 check
   itself saw stale SW flashcards until reload. Honest limit: the
   checker's Cache Storage could not be inspected (no live-browser
   access); §8 gives the one-reload re-check procedure.
3. **Dead imports — NOTHING TO REMOVE.** Grep scan of all 46 files
   under `src/app/**` + `src/components/**`: 0 dead, 0 comment-only,
   independently confirmed by `tsc --noUnusedLocals
   --noUnusedParameters` exiting 0. Two apparent lib hits
   (`BANK_COUNTS`/`BANK_TRUSTED`) are live re-exports. Retired
   unimported `Nav.tsx` reported as a dead file, left in place (see
   §8 deletion note).
4. **IA tidy — NONE NEEDED.** Sidebar's 14 links match Nav's exactly;
   home's 8 quick cards match their routes; all page headings are
   consistent with their nav labels; Footer has no links.

### C. CACHE_VERSION v3 bump (coordinator decision — the stale-cache remediation)

`public/sw.js`: `CACHE_VERSION` `etea-prep-v2` → `etea-prep-v3`
(the ONLY change to the file; SW logic byte-identical otherwise,
pinned by the lazy-banks normalized byte-compare). Rationale: the
file's own header rule says to bump "whenever a deploy changes the
shell in a way old cached HTML must not survive"; Phase 2/3 did not
bump, which is exactly why stale bundles persisted. The byte change
makes browsers install the new worker (update banner, no forced
reload — the user taps Refresh), and activation then evicts the v2
cache on all devices. Cost: a one-time re-download of shell + chunks.
Pinned exactly by the new organize suite (§6) and the lazy-banks
suite, so a future deploy must consciously bump again. If the owner
prefers no bump, dropping it is a one-line revert in `public/sw.js`
plus the two suite pins — flagging it here so the decision is visible.

## 2. Coverage table — new notes mapped to topic-map sections

Topic maps: `~/workspace/research_notes/etea-syllabus-sources-20261116/report.md`
§3.1–§3.14. "Row" = the numbered topic row in that section. Rows NOT
listed under a subject were not covered by NEW notes (existing notes
and/or the 500-MCQ banks may cover them; the gaps are stated honestly
in §8).

| Map | Subject | New notes by topic-map row |
|---|---|---|
| §3.1 | Islamiyat (12) | Row 3 Aqa'id: isl-tawhid, isl-risalat, isl-angels-books. Row 4 Ibadat: isl-salah, isl-zakat, isl-sawm, isl-taharat. Row 5 Seerat: isl-farewell-sermon, isl-misaq-madinah. Row 6 Khulafa/companions: isl-ashra-mubashra. Row 7 Islamic civilisation: isl-muslim-science. Row 8 Ethics/rights: isl-rights. |
| §3.2 | Tajweed (11) | Row 2 Sifaat/Raa: taj-raa-rules. Row 5 Madd: taj-madd-lazim. Row 6 Ghunnah: taj-ghunnah, taj-mushaddad. Row 7 Waqf/Ibtida: taj-waqf-types, taj-ibtida. Row 8 Hifz/Quranic facts: taj-fatiha, taj-ayat-kursi, taj-first-last-revelation, taj-qunoot-durood, taj-juz-para. |
| §3.3 | Arabic (10) | Row 4 Verbs: arb-madi, arb-mudari, arb-amr-nahy. Row 5 Sarf: arb-ism-fail-maful, arb-masdar. Row 6 Pronouns/prepositions/interrogatives/numbers: arb-attached-pronouns, arb-huruf-jarr, arb-relative-pronouns, arb-interrogatives, arb-numbers. |
| §3.4 | Urdu (14) | Row 1 Ism: urd-ism-marfa, urd-ism-nakra. Row 2 Fi'l: urd-fail-kinds, urd-maroof-majhool. Row 3 Harf: urd-harf-jarr-atf, urd-ne-ko. Row 4 Jumla/Tarkeeb: urd-jumla-kinds, urd-tarkeeb. Row 5 Jins/Adad: urd-jins-rules, urd-adad-rules. Row 8 Ilm-e-Bayan: urd-ilm-bayan. Row 9 Adab: urd-adabi-asnaf. Row 10 Talafuz/affixes: urd-talafuz, urd-sabqay-lahqay. |
| §3.5 | English (12) | Row 1 Parts of speech: eng-parts-speech, eng-nouns, eng-pronouns, eng-adj-adv, eng-conjunctions. Row 7 Homophones/OWS: eng-homophones, eng-ows. Row 8 Nouns: eng-nouns (also). Row 10 Gerunds/participles: eng-gerunds. Row 11 Clauses: eng-clauses, eng-conjunctions (also). Row 12 Idioms/spelling: eng-idioms-phrasal, eng-spelling. Row 13 Comprehension: eng-comprehension. |
| §3.6 | Maths (13) | Row 1 Number systems: mat-number-systems, mat-squares-cubes. Row 2 Percentages/profit: mat-profit-loss. Row 3 Algebra: mat-factorization, mat-linear-eq, mat-quadratic-eq. Row 4 Geometry: mat-angles-triangles, mat-pythagoras, mat-area-volume. Row 5 Trigonometry: mat-trig-ratios. Row 6 Coordinate geometry: mat-coordinate. Row 7 Sets/functions: mat-sets-functions. Row 8 Statistics/probability: mat-stats-probability. |
| §3.7 | General Science (12) | Row 1 Human body: sci-heart, sci-nervous, sci-digestive. Row 2 Cell: sci-cell. Row 3 Ecology: sci-ecosystems. Row 4 Chemistry: sci-acids-bases, sci-reactions. Row 5 Force/pressure: sci-force-pressure. Row 6 Electricity/light: sci-electricity, sci-light. Row 7 Measurement: sci-si-units. Row 9 Microbes/health: sci-microbes-vaccines. |
| §3.8 | Pak Studies (13) | Row 1 Ideology: pak-two-nation, pak-allahabad. Row 2 Movement 1857–1947: pak-simla-league, pak-lucknow-khilafat, pak-fourteen-points, pak-lahore-resolution, pak-june-plan. Row 3 Early problems: pak-objectives-resolution. Row 4 Constitutions: pak-constitutions-56-62. Row 5 History/wars: pak-wars. Row 7 Economy/CPEC: pak-agri-industry, pak-cpec. Row 9 Foreign policy: pak-foreign-policy. |
| §3.9 | Social Studies (17) | Row 1 Geography skills: ss-lat-long, ss-time-zones, ss-maps-globes, ss-continents-oceans. Row 2 Physical geography: ss-landforms, ss-climate-weather. Row 3 Civics: ss-citizenship, ss-human-rights. Row 4 History: ss-indus. Row 5 Economics: ss-resources-wants, ss-money-banking. Row 7 Culture/heritage: ss-languages-culture, ss-unesco. Row 8 Government: ss-levels-govt, ss-elections, ss-judiciary. Row 9 World organizations: ss-asean-eu. |
| §3.10 | GK (14) | Row 1 Pakistan facts: gk-passes-lakes. Row 2 World geography: gk-peaks, gk-rivers-world, gk-landmarks. Row 3 History/personalities/Nobel: gk-nobel, gk-scientists. Row 5 Science/tech GK: gk-inventions, gk-space-firsts. Row 6 Sports: gk-olympics, gk-trophies. Row 8 Everyday GK: gk-currencies, gk-books-authors, gk-intl-days. Row 9 Islamic GK: gk-hijri-calendar. |
| §3.11 | Pedagogy (10) | Row 2 Child development: ped-motivation, ped-intelligence, ped-individual-differences. Row 3 Teaching methods: ped-teaching-methods, ped-microteaching-inquiry. Row 4 Classroom management: ped-classroom-mgmt. Row 6 Curriculum: ped-curriculum. Row 7 Measurement: ped-validity-reliability. Row 8 Inclusive education: ped-inclusive. Row 10 Guidance/ethics: ped-guidance-ethics. |
| §3.12 | IT/Computer (7) | Row 2 Number systems: it-number-systems. Row 3 Memory: it-memory-units. Row 6 Networks: it-networks. Row 7 Programming/HTML: it-algorithms, it-html. Row 8 Databases: it-databases. Row 10 Emerging tech: it-ai-emerging. |
| §3.13 | Drawing (3) | Row 2 Principles of design: drw-principles-design. Row 5 Painting: drw-painting-media. Row 6 Sculpture/printmaking: drw-sculpture-printmaking. |
| §3.14 | PE (2) | Row 4 Training methods: pe-training-methods. Row 9 Tournaments: pe-tournaments. |

## 3. Sources + provenance

Lawful routes + concept extraction only (standing owner-final rule).
Every new note carries one of the 13 registry source labels verbatim
(suite-pinned in `test-phase4-library.mjs` §4), naming the lawful
source the note was concept-extracted from; no PDF was downloaded or
hosted; no textbook passage or question was copied. The labels:

- Islamiyat: standard Islamic studies curriculum topics (Quran, Hadith,
  Seerat and Fiqh basics). Tajweed: standard Tajweed rules (Makharij,
  Sifaat, Noon and Meem rules, Madd and Waqf). Arabic: standard Arabic
  grammar scope (Nahw and Sarf). Urdu: standard Urdu grammar scope
  (Qawaid-o-Insha). English: standard English grammar scope. Maths:
  standard school mathematics topics (Classes 5–10). General Science:
  standard general science topics (Classes 4–8). Pak Studies: standard
  Pakistan Studies topics (KPTBB Class 10 chapter structure — chapter
  structure only, per the syllabus research report §2.4; no KPTBB
  e-book exists, was downloaded, or is linked). Social Studies:
  standard social studies topics (Classes 4–8). GK: standard general
  knowledge scope. Pedagogy: standard educational psychology and
  pedagogy scope. IT/Computer: DCTE Computer Science Curriculum
  (VI–VIII, 2025) — the official DCTE document. Drawing: standard art
  education topics. PE: DCTE Health and Physical Education Curriculum
  (I–XII, 2015) — the official DCTE document.
- Every new note also carries a `syllabusClause` naming the Pattern B
  (ESED-453) section it serves (e.g. "Pattern B (ESED-453) — Islamiyat
  section (30)"), following the existing 56 concept-extracted notes'
  convention. The standing "Expected pattern — ETEA has not published
  the official 2026 syllabus" label is unchanged wherever it appears;
  no note claims ETEA tests its topic.

## 4. Coordinator merge findings

- **Slice validation:** all 25 slices validated mechanically before
  merging (JSON parses; exact 10 keys; all 6 text fields non-empty;
  bodies 50–100 words; conceptIds unique globally and matching the
  brief registry; source/clause verbatim per subject; no
  `[Auto-Translated]` markers; no Latin honorific abbreviations in
  `_roman`; digit multisets identical across the three versions of
  each note; titles unique and non-duplicating vs the 151 existing
  titles; cross-slice Jaccard title scan at 0.55 — zero pairs flagged;
  Urdu field-pattern check; Arabic zero-script check). One fix
  applied: `gk-peaks` (S12a) rendered "K2" as کے ٹو in the Urdu body,
  dropping the digit — changed to Latin "K2" in the Urdu body only
  (consistent with the S11a worker's K2 handling; slice source kept in
  sync). After the fix: 150/150 clean, 0 failures.
- **Per-field audit:** a second audit mirroring the Stage 5 suite
  invariants (per-field digit multisets, Maths operator counts,
  Arabic-run verbatim, the suite honorific regex, label leaks, gloss
  markers) passed 150/150 with 0 failures. The audit initially
  misfired on Urdu notes (their `_roman` is a transliteration by
  design); the audit was corrected to match the 5C rule, not the data.
- **Trilingual spot-check:** 5 notes read in full across slices
  (Islamiyat, Urdu, Arabic, Maths, Pedagogy) — all faithful; the Urdu
  verbatim pattern and Arabic transliteration conventions hold.
- **Merge:** notes appended per subject in slice order;
  `src/data/content.json` kept its compact `JSON.stringify` format
  with no trailing newline (verified before and after); the existing
  151 notes are byte-identical afterwards (per-subject prefix
  comparison + SHA-256 prefix hashes now pinned in the new suite);
  the only other change in the file is `counts.notes` 151 → 301.
- **/tmp tmpfs full (environment, not code):** the first library-suite
  run compiled `data.js` to 0 bytes because /tmp was at 100% from
  stale `*-data` harness dirs left by prior phases. Cleared (all
  regenerable); the suite then passed. The battery loop clears
  `/tmp/*-data` between suites.
- **Battery-loop stdin bug (harness, not code):** the first full
  battery run lost its last suite (`test:phase4organize`) because a
  command inside the `while read` loop consumed stdin. Re-ran with
  stdin redirected; all 66 suites ran.
- **Rescopes (all documented, none weakened):** see §5. Each rescope
  keeps the original assertion on the original subject and bounds the
  slice to the batch it was written for — the same pattern Phase 4B2
  itself used for the PE slice.
- **No worker errors:** all 26 children completed; no re-dispatch was
  needed. The S14a worker self-corrected a conceptId typo before
  validating (reported in its handoff; final file clean).

## 5. Counts + ripple (7040 unchanged)

- MCQs 7040, flashcards 70, tracks 19 (12 visible), mocks 28 (24
  visible) — all unchanged. Notes 151 → 301; concept-extracted notes
  56 → 206. `src/lib/i18n.tsx` `quickLibraryDesc`: "151 notes with
  recall-first prompts" → "301 notes with recall-first prompts" (the
  recall-first claim describes the library UI's hidden-body reveal,
  which applies to all notes — not the Stage 5F/5G data lead-in).
- Mechanical ripple `151` → `301` in 31 files (14 Phase 1 suites,
  phase4b1/b2, stage5a–g, step2b, step2fixes, step3a, step3b-audit1/2,
  trilanguage, i18n.tsx) and `56` → `206` in 3 files (phase4b1,
  phase4b2, provenance), plus per-subject note pins in stage5a–g
  (Islamiyat 14→26, Tajweed 24→35, Arabic 13→23, Urdu 6→20, English
  8→20, Maths 7→20, GK 6→20, Science 8→20, Pak Studies 7→20, Social
  Studies 4→21, Pedagogy 13→23, IT 17→24, Drawing/PE 24→29).
- Ledger rows rippled: 4B1 ctit IT 17→24 notes, pet PE 24→29, DM
  24→29; 4B2 dm Drawing 24→29, qari combined 38→61 (35 Tajweed + 26
  Islamiyat). Ledger coverage distribution unchanged.
- Rescopes (original assertion kept, subject bounded to its batch):
  5G + 5F recall-first lead-in checks → original 24 / 17 notes
  (`slice(0, 24)` / `slice(0, 17)`); 4B1 IT slice → `slice(6, 17)`;
  4B2 Drawing/Tajweed slices → `slice(14, 24)` (3 sites incl. the
  Qari-text Hadith scan); stage4b-audio Tajweed total 24→35 and
  text-only 11→22 with 11 new named text-only checks (Phase 4 added
  no audio mappings); lazy-banks content.json parsed-diff gained a
  Phase 4 revert (per-subject tails + `counts.notes`) and the SW
  version pin v2→v3.
- New-suite scoping notes (pre-existing data, not rewritten): the
  library suite's zero-Arabic-script check covers the 10 NEW Arabic
  notes only (3 original Arabic notes legitimately carry Arabic terms
  in English fields, covered by 5C's verbatim rule), and its
  honorific check covers the 150 NEW notes only (2 original Islamiyat
  notes carry grandfathered "(SAW)" in `_roman` — flagged in §8, left
  byte-identical). The original 151 notes are locked by SHA-256
  prefix hashes, so these grandfathered items cannot silently change.

## 6. Tests + build + smoke

Two new suites: `test-phase4-library.mjs` (124 checks: counts,
original-151 prefix hashes, conceptId/source/clause registry, dedupe,
trilingual completeness, Stage 5 invariants incl. the Hadith-regex pin,
resolver, compact format) and `test-phase4-organize.mjs` (18 checks:
mock-data completeness, resolver pins, list-page wiring, SW v3 pin).
Full battery: **4077 checks / 66 suites (PASS-line count), 0
failures** (baseline Phase 3: 3872/64; +142 new-suite checks, +11 new
stage4b named checks, remainder PASS-line counting scope across the
re-run battery). Battery findings resolved at merge: the stage4b-audio
and lazy-banks rescopes (§5) and the ledger/count pins they exposed;
the /tmp tmpfs-full and battery-loop stdin harness issues (§4).
`npm run build` PASS (20/20 routes), `npx tsc --noEmit` clean, strict
`tsc --noUnusedLocals --noUnusedParameters` clean (dead-import proof
holds on the final tree), `bank-manifest.ts` byte-identical after
regeneration (sha256 verified).

Local prod server (`next start`, fresh port): 17 routes HTTP 200 (14
static + `/mock/tt-B` + `/tracks/tt` + `/robots.txt`); home HTML
carries 7040 + "301 notes"; served JS chunks contain new-note titles
in all three languages (English "Madd Lazim", Urdu مد لازم, Roman
"Ghunnah — Naak Ki Aawaz Aur Is Ki Miqdar", Urdu مثلثیاتی نسبتیں),
the `[Auto-Translated]` badge literal, and mock Urdu list titles
(زمونگ کور); `/sw.js` serves `CACHE_VERSION = "etea-prep-v3"` (200);
zero server errors; server stopped and the port verified closed.
Live click-through (library language switching with badge, /mock list
in Urdu mode after reload/update banner, tutor) is the parent's pass
after deploy.

## 7. Files changed (this batch) — 40 expected in the push

- Data + strings + SW (4): `src/data/content.json` (150 notes appended
  + `counts.notes` 301), `src/lib/i18n.tsx` (`quickLibraryDesc`
  151→301), `public/sw.js` (CACHE_VERSION v3), `package.json` (2 new
  `test:*` scripts).
- New suites (2): `scripts/test-phase4-library.mjs` (124 checks),
  `scripts/test-phase4-organize.mjs` (18 checks).
- Rippled/rescoped suites (31): 14 Phase 1 suites, `test-phase4b1.mjs`,
  `test-phase4b2.mjs`, `test-provenance.mjs`, `test-stage5a.mjs` …
  `test-stage5g.mjs`, `test-step2b.mjs`, `test-step2fixes.mjs`,
  `test-step3a.mjs`, `test-step3b-audit1.mjs`,
  `test-step3b-audit2.mjs`, `test-trilanguage.mjs`,
  `test-stage4b-audio.mjs`, `test-lazy-banks.mjs`.
- Docs (2): this report + CHANGELOG.md entry.
- NOT changed: any bank file, `bank-manifest.ts` (byte-identical after
  regeneration, sha256-verified), `src/lib/data.ts`,
  `src/lib/tracking.ts`, any page/component, `quran-examples.json`,
  `drawing_pe.json` (dead, untouched), `tsconfig.tsbuildinfo` (build
  artifact — never pushed).

## 8. Deliberately left out + flags for the owner

**Deliberately left out (standing constraints / awaiting owner):**
past-paper labelling decision (owner has NOT answered — banks stay as
they are; no silent relabelling); Islamiyat mixed-explanation cleanup
(33 ISL + 45 PAK + PPT-001, owner decision pending); per-subject
practice resume (design only); Stage 4C pronunciation "Speak & Check";
COMP_B.ct inconsistency (disclosed in ct-B note, unresolved);
SST-ETEA mock 40Q non-subject part; 9 cross-bank overlapping facts;
OpenRouter 429 persistence. No file deletions: `Nav.tsx`,
`content.json` bySubject, `track.mock`, `drawing_pe.json`,
`explanationUrdu` all remain — deletion requires a deletion-capable
route (the GitHub web UI or a git checkout with `git rm` + push), NOT
`push_files`; the organize worker confirmed `Nav.tsx` is retired and
unimported, and `test-i18n` still audits its link keys, so deletion
must also update that audit. The 4 deferred Facebook items, the
Section 144 / petrol / fiscal-deal decisions, and all Pakhtunkhwa
Insider work are untouched by this batch (separate project).

**Coverage gaps (no NEW notes; existing notes/banks may cover some):**
Islamiyat rows 1–2 (Quran detail, Hadith/Sahah Sitta); Tajweed rows 1,
3, 4 (Makharij detail, Noon/Tanween, Meem — the existing 24 Tajweed
notes cover Makharij/Sifaat); Arabic rows 1–3, 7–8 (Kalimah, I'rab,
sentences, vocabulary, translation); Urdu rows 6–7 (Lughat,
Muhavare); English rows 2–4, 6, 9 (tenses, voice, narration,
synonyms/antonyms, agreement); Maths rows 9–10 (applied arithmetic,
logic); Science rows 8, 10 (Earth/space, everyday tech); Pak Studies
rows 6, 8 (land/climate, population/culture); Social Studies row 6
(demography/census); GK rows 4, 7 (international organizations,
current affairs — deliberately avoided: current affairs must be
refreshed per test cycle); Pedagogy rows 1, 5, 9 (learning theories,
assessment, philosophy); IT rows 1, 4, 5, 9, 11 (fundamentals, OS,
MS Office, security, troubleshooting); Drawing rows 1, 3, 4, 7, 8, 9;
PE rows 1–3, 5–8.

**Worker flags — uncertain facts/terminology (worker uncertainties,
NOT owner-verified; the owner checks religious content himself):**
- S01 Islamiyat: Zakat nisab figures (7.5 tola gold / 52.5 tola silver)
  hedged as "commonly measured"; Salah fard-only rakat counts
  (2/4/4/3/4 = 17); Sawm exemptions kept general; Zakat's 8 categories
  paraphrased.
- S02 Islamiyat: Taharat school-neutral; Misaq-e-Madinah "first written
  constitution" hedged as "often described as"; Jabir ibn Hayyan
  attribution is curriculum-standard, authorship debated by
  historians; Farewell Sermon/rights paraphrase only.
- S03 Tajweed: Waqf Tam/Kafi distinction stated generally; Raa
  exceptions kept general (7 heavy letters unnamed); Madd Lazim
  subdivisions unnamed (Muthaqqal/Mukhaffaf not named).
- S04 Tajweed: last revealed verse genuinely disputed — the note names
  Al-Baqarah 281 as the widely reported position and states scholars
  differ; Ayat-ul-Kursi "greatest verse" hedged as "widely described
  as"; Dua-e-Qunoot placement kept general (no rakah); total Quran
  verse count deliberately omitted (counts differ by tradition).
- S05a Arabic: Mudari' prefix mapping simplified ("Generally"); Amr
  formation regular triliteral only; attached-pronoun `-na` subject
  use omitted; feminine plural forms not covered; `_ur` fields keep
  Latin transliteration for verb forms (katabat vs katabta
  distinguishability).
- S05b Arabic: feminine plural relative pronoun `allati`/`allawati`,
  `alla'i` omitted; numbers nominative `ithnani` only, masculine
  ordinals only; Masdar-after-verbs line is a pedagogical
  simplification; `_ur` Arabic terms in Urdu-script spelling (ی/ہ),
  strict Arabic orthography unverified.
- S06a Urdu: Ism-e-Nakra sub-classification varies by book (no fixed
  count asserted); "ہم رتبہ" vs جملہ معطوف terminology; نے/کو
  لازم/متعدی rule; topical overlap with the existing "حروف اور جملے کی
  اقسام" note (distinct titles/bodies). NOTE: the research report's
  §3.4 row 1 lists "Musawwaf" from the PCTB chapter listing — new
  content follows the corrected term Ism-e-Mausool per the standing
  rule; the suite bans "Musawwaf" in all note fields.
- S06b Urdu: talafuz ز/ذ/ض/ظ makhraj framing is the standard
  Arabic-origin distinction (everyday difference is spelling); شعرا
  spelling without hamza; Roman letter names a transliteration choice;
  Jins الف/ی patterns stated as tendencies with counter-examples.
- S07a English: eng-gerunds exactly 100 words; past-participle "-ed"
  and adverb-position rules hedged with "often"; pronoun agreement
  states number/gender only (person omitted).
- S07b English: homophone/homonym distinction simplified school form;
  doubling rule omits stressed-final-syllable condition.
- S08a Maths: squares/cubes note gives verified spot values, not full
  1–20/1–10 lists. S08b: mode rendered کثیر الوقوع (some books use
  طریقہ); Pythagoras Roman title keeps Latin spelling, Urdu uses
  فیثاغورث.
- S09a Science: reflex note omits brain notification; heart note lists
  4 ABO groups without Rh. S09b: reflection law stated without "from
  the normal"; parallel-circuit "full voltage" is ideal school
  statement; fungi rendered پھپھوندی in one note vs فنجائی in another
  (intentional, owner may want consistency).
- S10a Pak Studies: Simla Deputation year-only + Aga Khan role
  general; Lahore Resolution "seconded by Chaudhry Khaliquzzaman and
  others" (multiple seconders); Iqbal did not use the word "Pakistan"
  in the Allahabad Address; Fourteen Points main points only. S10b: no
  CPEC figures, no agri/industry statistics, no exact day for fall of
  Dhaka/Tashkent; 1956 parity stated without claiming One Unit; CPEC
  rendered سی پیک in Urdu fields.
- S11a Social Studies: 5 oceans incl. Southern Ocean (older books
  list 4); "Australia" as smallest continent (some use Oceania); Urdu
  technical terms (مدار السرطان/مدار الجدی, ocean names, "کمپاس روز")
  await owner verification. S11b: Great Bath purpose hedged
  "probably"; local government described generically; citizenship
  acquisition kept general. S11c: UNESCO inscription years omitted; EU
  HQ simplified to Brussels (institutions also in Strasbourg/
  Luxembourg).
- S12a GK: Tirich Mir 7,708 m kept + flagged; Everest 8,849 m "about"
  (older surveys 8,848 m); Nile ~6,650 km "generally counted" longest
  (Amazon debate); Big Ben common wording (strictly the bell; tower
  renamed Elizabeth Tower 2012); Gutenberg "around 1440"; steam
  engine year omitted; Manchar "one of the largest". S12b: Olympic
  rings "inhabited continents" is the conventional exam
  interpretation (Coubertin's own explanation differed); Hijri
  month-name spelling variants; partial overlap with the existing
  "Sports Bodies and the Olympic Games" note (distinct title/focus);
  Roman body drops ICC/FIFA/FIH initials and uses "622 Esvi" (zero
  Latin abbreviations in `_roman`).
- S13a Pedagogy: Gardner list = 8 forms with deliberately NO count
  claim (7 original + naturalistic; 9th existential proposed, not
  universal); Sternberg triarchic confident; IQ average 100 standard.
  S13b: validity صداقت / reliability قابلِ اعتماد/اعتمادیت /
  objectivity معروضیت (variants exist: درستی/جواز, ثبات); null
  curriculum rendered معدوم نصاب (least certain translation).
- S14a IT: memory note uses 1 KB = 1024 bytes (standard school/ETEA
  convention; strict SI is 1000); all conversions hand-verified
  (25 = 11001₂, 1010₂ = 10, 27 = 33₈, 255 = FF₁₆, A5₁₆ = 165);
  "Number Systems —" title prefix shared with the S08a Maths note
  (different subject/topic, distinct bodies — Jaccard scan clean).
- S14b Drawing/PE: Urdu uses تخفیفی/اضافی (subtractive/additive),
  آہنگ (rhythm), transliterations for glazing/impasto/Fartlek/bye;
  minor overlap with the existing Composition note (balance sentence
  only).
- **Merge flags:** 2 ORIGINAL Islamiyat notes carry grandfathered
  "(SAW)" in `_roman` fields ("Seerat: Key Dates of the Prophet's Life
  (SAW)", "Ghazwat — The Major Battles") — pre-existing, locked
  byte-identical, NOT rewritten; owner to decide. 3 ORIGINAL Arabic
  notes carry Arabic script in English fields (covered by 5C's
  verbatim rule). The `gk-peaks` K2 fix (کے ٹو → Latin "K2" in the
  Urdu body) is the only coordinator content edit; slice source kept
  in sync.
- **Stale-line memory/doc hygiene (parent's discretion):** the
  standing "stale home line" memory claim and
  `VERIFY-phase1-maths.md:129` are outdated — the line is gone from
  `src/` (§1B.1).
- **/mock list re-check (one reload):** on the device/browser that
  showed English titles, do a full reload (or tap Refresh on the
  update banner after the Phase 4 deploy, which installs the v3
  worker), switch to Urdu, open /mock, and confirm translated titles
  + `[Auto-Translated]` badges. If titles are STILL English after a
  verified fresh load, re-open the investigation — that would
  contradict the pinned code path.
