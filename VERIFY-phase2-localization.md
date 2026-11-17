# VERIFY — Phase 2 (full localization): flashcards + plan + mocks metadata + remaining English chrome

Owner's order: when Urdu is chosen, EVERY surface shows Urdu; when Roman is
chosen, EVERY surface shows Roman. This batch localizes the three data
surfaces that had no translation mechanism (flashcards, the 21-day plan,
mock metadata), the remaining English chrome (badge helpers, count
fragments, dates, API error strings), and the 229 Roman chrome values that
were byte-identical to English. Question/note content is unchanged (7040
MCQs); no bank file changed; no review status, verification, or selection
behaviour changed.

## 1. What was localized

### A. Flashcards (70 cards)
- Every card gained 6 flat fields: `front_ur`, `front_roman`, `back_ur`,
  `back_roman`, `category_ur`, `category_roman` (420 new fields).
- New resolver `resolveFlashcardView(card, lang)` in `src/lib/data.ts`:
  all three fields present or the whole card renders English (item-level
  fallback, standing rule). `flashcardCategoryLabel(category, lang)`
  resolves the filter label from the first card carrying the category.
- The flashcards page renders the resolved view with the literal
  `[Auto-Translated]` badge only when translated content renders. Filter
  keys and `?category=` values stay English; attempt titles keep the
  English category (stored data). FSRS due dates render via
  `formatLocalDueDate(..., lang)`.
- Category map (pinned by suite, exact on all 70 cards): Pedagogy →
  تدریسیات / Tadreesiyat; Tajweed → تجوید / Tajweed; Dates → تاریخیں /
  Tareekhen; Arabic → عربی / Arabi; General Science → جنرل سائنس /
  General Science; IT/Computer → آئی ٹی / کمپیوٹر / IT/Computer; GK →
  جنرل نالج / General Knowledge.

### B. Plan (21 days, 63 tasks)
- Day tuples extended to `[label, tasks, label_ur, label_roman]`; task
  tuples to `[mins, text, text_ur, text_roman]` (84 new translation
  fields). Types `PlanTask` / `PlanDay` added in `src/lib/data.ts`;
  `PLAN21` cast to the new shape.
- New resolvers `resolvePlanDayLabel` / `resolvePlanTaskText` in
  `src/lib/plan.ts` (same item-level fallback). The plan page renders
  resolved labels/text with the badge next to the day heading when
  translated. Day labels keep numbering in all languages (`دن N` / `Din N`).
- `planTaskLink` / `planDayForSubject` keep matching ENGLISH text in every
  display language (ids + links derive from the English fields).

### C. Mocks metadata (all 20 defs: 16 visible + 4 hidden, one structure)
- Every def gained `title_ur`, `title_roman`, `note_ur`, `note_roman`
  (80 new fields). New resolver `resolveMockView` (title + note both
  present or whole English). List, runner, and track-detail pages render
  the resolved view; the badge shows on list/track pages when translated.
- Selection behaviour UNTOUCHED: variant codes, comps, fixed ID lists,
  minutes, totals, seeds. The 3 fixed ZamungKor lists stay disjoint
  (300 unique ids). Visibility unchanged (16 visible / 4 hidden).
- The mock runner title has NO badge: `QuizRunner`'s `title: string` prop
  feeds session/flag/attempt titles, and threading a badge through it is
  invasive. The title itself IS translated (resolved view). Noted for a
  future pass if the owner wants the badge there too.

### D. Remaining English chrome
- **Roman sweep**: 194 of the 229 roman-identical-to-English STRINGS values
  replaced with genuine Roman Urdu prose (placeholders preserved exactly);
  35 kept as documented borrowings/codes/names whose Urdu counterparts are
  themselves transliterations (keep-list pinned by suite). STRINGS grew
  667 → 680 keys with 13 new keys: `ofCount`, `questionsShort`,
  `retriesCountedOne`, `retriesNotCountedOne`, and 9 `apiErr*` keys.
  Zero missing keys in both languages (existing i18n suite).
- **Badge helpers** gained Roman branches: `provenanceBadge`,
  `reviewStatusBadge`, `topicBadge`, `trackConfidenceBadge` (data.ts),
  `localizedScoringLabel` (scoring.ts), `gradeButtonLabel` (tracking.ts:
  Dobara/Mushkil/Achha/Asan), `formatFsrsInterval` (fsrs.ts: minute/ghante/
  din/mah/saal). Tones match en/ur in every case; source names, clauses,
  and the `conf` string stay verbatim.
- **Count fragments**: the 8 hardcoded sites now render through `ofCount`
  / `questionsShort` (QuizRunner counter + aria-label, flashcards fraction,
  review counter, mock list, mock runner, tracks detail, home). The
  `"y"`/`"ies"` plural hack is gone; singular/plural retry keys render
  through `retriesCountedOne` / `retriesNotCountedOne`.
- **Dates**: new dependency-free `src/lib/format.ts` — `appDateLocale`
  (ur → `ur-PK`, en/roman → `en-US`), `formatAppDate`,
  `formatAppDateTime`, `formatStoredDate`, `parseDisplayDate`,
  `parseLocalDateKey` (bare `yyyy-mm-dd` parsed as LOCAL midnight, never
  UTC; overflow keys rejected by round-trip validation). All date call
  sites in analysis/review/issues/plan/fsrs render in the app language.
  Localized date cells use `dir="auto"` (resolves LTR for Latin content,
  RTL for Urdu); Latin codes/IDs stay `dir="ltr"`.
- **API errors**: all 4 routes return `{error, code}` (the `error` string
  kept for compatibility); `rateLimitOk` returns `code`
  (`rate_daily`/`rate_minute`). `API_ERROR_KEYS` + `apiErrorText` in
  i18n.tsx map 9 codes to localized messages; the tutor page (tutor +
  explain calls) and plan page (AI plan call) render through it. Provider
  diagnostics (AiError) stay English — a documented exception (see §8).

## 2. Id-pinning design (the completion-survival guarantee)

`flashcardId(front, back)` (tracking.ts, FNV-1a of `front|back`) and
`planTaskId(day, mins, text)` (plan.ts, FNV-1a of `day|mins|text`) hash
ENGLISH source fields ONLY. Translations were added as EXTRA fields /
tuple positions; no English field was reworded, reordered, or removed, so
every stored FSRS state and plan completion keeps resolving to the same id.

Evidence:
- Id snapshots taken BEFORE any data change (70 flashcard + 63 plan ids,
  all unique) and committed as `scripts/fixtures/phase2-id-snapshot.json`.
- After the merge, ids recomputed from the merged data MATCH the snapshot
  exactly, in order (asserted by the new suites on every run).
- `buildReviewQueue` survival simulation: a seeded state keyed by fixture
  ids still queues the due card first; `countPlanDone` over a
  fixture-keyed state returns the expected count; positional
  (`d0-t0`-style) migration still lands on fixture ids.
- Any future English rewording, reorder, or id-input change fails
  `test-phase2-flashcards.mjs` / `test-phase2-plan.mjs` loudly.

## 3. Translation conventions compliance

- Flat `_ur`/`_roman` fields; item-level fallback; badge rendered by the
  UI, NEVER in data (no `[Auto-Translated]` marker inside any data field —
  suite-audited).
- Honorific convention: Arabic forms (ﷺ / رضی اللہ عنہ) in Urdu script,
  spelled-out forms ("Sallallahu Alaihi Wasallam" / "Raziallahu Anhu") in
  Roman; zero Latin abbreviations (`(SAW)`/`(RA)`/`(AS)`/`(PBUH)`) in any
  `_roman` field — suite-audited. FC 35 spot-checked: English "(SAW)" →
  ﷺ / spelled-out form.
- Arabic script in source fields copied VERBATIM, never retyped: 7 Arabic
  grammar flashcards quote Arabic words in their `_roman` fields; every
  Arabic character there already exists in the corresponding English
  field (subset invariant, suite-audited). Plan + mocks `_roman` fields
  contain zero Arabic script.
- No review-queue changes; no `reviewStatus`/`verified`/`correctIndex`
  change anywhere (no question/note field touched).
- Digit preservation: the multiset of digit-groups in every translated
  mock title/note equals the English one (counts, minutes, pattern numbers
  cannot drift) — suite-audited.
- Noto Nastaliq: none (existing font suite still green).

## 4. Coordinator merge findings

- 8 slice workers (F1/F2 flashcards, P1/P2 plan, M1 mocks, R1/R2/R3 Roman
  sweep). All slices validated file-based: 229/229 Roman-sweep coverage,
  placeholders preserved, category map exact, no markers. Slice sources in
  `~/workspace/phase2-localization/slices/` (NOT part of the repo push).
- Coordinator fixes (5 Roman day labels, mirrored to Urdu labels, written
  back to slice files): Day 12 "Din 12 — Faisad + Urdu qawaid", Day 13
  "Din 13 — Algebra + Urdu zakheera alfaaz", Day 14 "Din 14 — Hafte 2 ki
  dohraai", Day 17 "Din 17 — Mukammal dohraai", Day 21 "Din 21 — Aakhri
  dohraai".
- Merge written as compact `JSON.stringify` with NO trailing newline (the
  file's existing format; verified `JSON.stringify(JSON.parse(raw)) ===
  raw` before merging). New size 568,349 bytes. All English fields
  untouched; all other top-level keys byte-identical (verified at merge
  time; the lazy-banks suite re-asserts this against the pre-lazyload
  backup with the documented Phase 2 revert).
- Post-report fix (worker handoff review): the Roman `vacAlertA` value
  ("Manually curated — check karein") read redundantly next to `vacAlertB`
  ("dekhain.") in the vacancies alert sentence. Fixed to "Dasti tor par
  murattab — taaza tareen ke liye", mirroring the Urdu; i18n + chrome
  suites re-run green. No file-count change (i18n.tsx already listed).
- Terminology choices from the workers, flagged honestly in §8.

## 5. Counts + ripple (7040 unchanged)

- Home total stays 7040; all 14 subjects stay at 500. No bank file
  changed; `bank-manifest.ts` byte-identical after the build (regeneration
  is deterministic; verified by comparison).
- `src/data/content.json` changed ONLY by the added translation fields
  (flashcards/plan/mocks) — asserted by the lazy-banks parsed-diff check
  with the Phase 2 revert.
- No count pins changed anywhere. STRINGS key count 667 → 680 (13 new
  keys, all present in all 3 languages).

## 6. Tests + build

- Baseline (before any change): `npm run build` PASS, `npx tsc --noEmit`
  clean, **3468 checks / 55 suites** green (counted by PASS lines; all
  suite files exit 0).
- New suites (163 checks): `test-phase2-flashcards.mjs` (30),
  `test-phase2-plan.mjs` (33), `test-phase2-mocks.mjs` (28),
  `test-phase2-chrome.mjs` (72). Wired in package.json.
- First-run failures of the new suites (all fixed, none weakened):
  (1) fsrs.ts imported `./format` extensionless, which Node
  type-stripping cannot resolve — fixed by inlining the locale choice
  in `formatLocalDueDate` (comment points at format.ts as canonical);
  plan.ts keeps the extensionless import (tsc-compiled only).
  (2) The flashcards "no Arabic script in _roman" check failed on 7
  grammar cards quoting Arabic verbatim — the DATA was correct; the
  check was refined to the subset invariant.
  (3) The chrome suite's STRINGS parser matched the `apiErrorText`
  `body:` parameter — parser bounded to the STRINGS literal.
  (4) `parseLocalDateKey("2026-13-40")` rolled over instead of returning
  null — a REAL production-code bug, fixed with round-trip validation
  in format.ts.
- Full-battery failures (12 checks across 6 suites, all fixed — see §7
  for the deliberate assertion updates): the pinned source patterns in
  test-step2b, test-step2fixes, test-rtl, and test-tier4 referenced the
  pre-Phase 2 call shapes/expressions; test-i18n's tf() parser had a
  latent brace-imbalance bug (template-literal `${` emitted no `{`,
  exposed by the new `, lang` argument); test-lazy-banks' backup
  comparisons needed the documented Phase 2 exceptions. One genuine
  production improvement came out of it: localized date cells moved
  from `dir="ltr"` to `dir="auto"` (analysis ×2, review, issues).
- Final: `npm run build` **PASS**, `npx tsc --noEmit` **clean**, ALL
  suites green — **3635 checks / 59 suites** (baseline 3468/55; +163 new
  suite checks +3 fsrs Roman checks +1 lazy-banks tracking check; the
  rtl/i18n/tier4/step2b/step2fixes updates changed assertions, not
  counts). Zero failures.
- Local prod server (`next start`, fresh build, port 3100): all 14 routes
  (`/`, `/practice`, `/topics`, `/review`, `/mock`, `/flashcards`,
  `/library`, `/plan`, `/analysis`, `/tracks`, `/tutor`, `/vacancies`,
  `/issues`, `/links`) + `/mock/tt-B` + `/tracks/tt` + `/robots.txt` all
  HTTP 200. Home HTML carries 7040. Translation evidence in the served
  build: flashcard Urdu text, mock Urdu title, plan Urdu day label, Roman
  `ofCount` wording ("mein se"), Roman grade name "Dobara", and the
  `ur-PK` locale all present in served JS chunks (one chunk re-fetched
  over HTTP: 200). The app language is client-side state, so live
  click-through in Urdu/Roman mode is the parent's pass after deploy.
  Server stopped afterwards; port verified closed, no leftover process.

## 7. Files changed (this batch)

New (7):
1. `src/lib/format.ts` — date helper (dependency-free).
2. `scripts/fixtures/phase2-id-snapshot.json` — pre-translation id fixture.
3. `scripts/test-phase2-flashcards.mjs` — new, 30 checks.
4. `scripts/test-phase2-plan.mjs` — new, 33 checks.
5. `scripts/test-phase2-mocks.mjs` — new, 28 checks.
6. `scripts/test-phase2-chrome.mjs` — new, 72 checks.
7. `VERIFY-phase2-localization.md` — this report.

Library + API (11):
8. `src/lib/data.ts` — type extensions, resolvers, Roman badge branches.
9. `src/lib/scoring.ts` — Roman scoring label.
10. `src/lib/tracking.ts` — Roman grade names (only change vs backup).
11. `src/lib/fsrs.ts` — Roman interval units, `formatLocalDueDate` lang.
12. `src/lib/plan.ts` — date lang params, plan resolvers.
13. `src/lib/ai.ts` — `rateLimitOk` returns `code`.
14. `src/lib/i18n.tsx` — 13 new keys, 194 Roman values, API error map.
15. `src/app/api/tutor/route.ts` — `code` fields.
16. `src/app/api/explain/route.ts` — `code` fields.
17. `src/app/api/plan/route.ts` — `code` fields.
18. `src/app/api/tutor/health/route.ts` — `code` fields.

Pages + components (11):
19. `src/app/flashcards/page.tsx` — resolved view, badge, lang-aware dates.
20. `src/app/plan/page.tsx` — resolved labels/text, badge, apiErrorText.
21. `src/app/mock/page.tsx` — resolved view, badge, ofCount/questionsShort.
22. `src/app/mock/[id]/page.tsx` — resolved view.
23. `src/app/tracks/[id]/page.tsx` — resolved view, badge.
24. `src/app/review/page.tsx` — ofCount, localized timestamps.
25. `src/app/analysis/page.tsx` — singular retry key, localized dates.
26. `src/app/issues/page.tsx` — localized dates.
27. `src/app/page.tsx` — questionsShort.
28. `src/app/tutor/page.tsx` — apiErrorText for tutor/explain calls.
29. `src/components/QuizRunner.tsx` — ofCount counter + aria-label, singular retry key.

Data + config (2):
30. `src/data/content.json` — translation fields only (568,349 bytes).
31. `package.json` — 4 new `test:phase2*` scripts.

Existing suites — deliberate assertion updates, NOT weakenings (10):
32. `scripts/test-flashcards.mjs` — Roman grade names.
33. `scripts/test-fsrs.mjs` — Roman units + 3 new checks.
34. `scripts/test-stage5g.mjs` — comment only (no roman assertion existed).
35. `scripts/test-step2a.mjs` — reviewStatusBadge Roman.
36. `scripts/test-i18n.mjs` — scoring/grade Roman pins + stripLiterals
    brace-balance fix (harness bug, strengthens the tf() check).
37. `scripts/test-step2b.mjs` — `formatLocalDueDate(..., lang)` pattern.
38. `scripts/test-step2fixes.mjs` — 3 `formatLocalDueDate(..., lang)` patterns.
39. `scripts/test-rtl.mjs` — 9 patterns: resolved-view expressions +
    localized-date `dir="auto"` cells.
40. `scripts/test-tier4.mjs` — 2 B03 patterns: ofCount + lri() isolation.
41. `scripts/test-lazy-banks.mjs` — Phase 2 exceptions: tracking.ts
    function-strip compare + content.json translation-field revert.

Docs (1):
42. `CHANGELOG.md` — Phase 2 entry appended.

Total: 42 files. `src/lib/bank-manifest.ts` NOT changed (banks untouched;
regeneration verified byte-identical). Slice sources (NOT part of the repo
push): `~/workspace/phase2-localization/` — `BRIEF.md`, `COORD-LOG.md`,
`id-snapshot.json`, `roman-sweep.json`, `all-strings.json`, `slices/`.

## 8. Deliberately left unlocalized + flags for the owner

Deliberate exceptions (all by design, not oversights):
- **L6 Quran labels** — OWNER DECISION pending; untouched, per the task.
- **Question/note `source` VALUES stay English** (factual provenance;
  consistent with `provenanceBadgeUr` wrapping source names in bidi
  isolates). The badge LABELS around them are localized in all 3 languages.
- **CORRECTIONS / PATTERN_BANNER / policyNote** — factual precision text,
  stays English (isolated LTR).
- **Track/ledger/vacancy/links/pattern metadata + topic vocabulary (239
  topics) + search/retrieval/explain grounding** — later phases; the
  audit scoped them out of Phase 2.
- **Layout metadata / manifest** — static English (browser tab / PWA
  manifest, not page content).
- **`placeholder="e.g. ISL-001"`** — a format example, not prose.
- **fmtMs SI units, export filenames (ISO)** — locale-independent.
- **AiError provider diagnostics** — English (provider error text, shown
  only on failure paths; the user-facing message above it is localized).
- **Dead code/data untouched**: Nav.tsx, content.json bySubject, track.mock,
  drawing_pe.json, explanationUrdu — deletion needs a separate
  deletion-capable route.
- **Mock runner title has no `[Auto-Translated]` badge** (see §1C).

Terminology choices to confirm (translations are literal; the owner
checks while reading — no review queue):
- Plan: "age" in "algebra + age / word problems" read as age problems;
  "Mock Test" transliterated موک ٹیسٹ (not فرضی امتحان); "pattern" = exam
  pattern; "Makharij — 5 general / 17 detailed"; قواعد used for both
  grammar and rules.
- Mocks: forest note "Pak Study 10" is verbatim from the English source
  (faithful to a source quirk, not a translation error). The COMP_B.ct
  Pak Studies 10 vs Social Studies 10 inconsistency is pre-existing and
  untouched.
- Roman sweep: 35 values kept identical to English (borrowings/codes/
  names — e.g. "Mock", "Pattern", "Pass", "Card", "Quran audio player").
  The keep-list is pinned by suite; the owner may ask for any of them to
  be translated instead.
- Flashcards: Arabic grammar cards quote Arabic words verbatim in Roman
  fields (subject matter, not untranslated prose).
- Roman grade names (Dobara/Mushkil/Achha/Asan) and interval units
  (minute/ghante/din/mah/saal) mirror the Urdu meanings; the owner may
  prefer different Roman spellings.
