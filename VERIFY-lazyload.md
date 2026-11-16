# VERIFY — Lazy per-bank loading + 2 bug fixes + Roman i18n completion

Batch: 2026-11-16. GitHub HEAD before this batch: `3af455b`. **No push,
deploy, GitHub, Vercel, or env change was made** — the parent handles
push/deploy/live verification. Sync-base backup
`~/workspace/etea-prep-next-backup-pre-lazyload/` was left untouched
(content + `tracking.ts` + `sw.js` byte-compare against it passes;
see §5).

Baseline (re-run at batch start): build PASS, `tsc --noEmit` clean,
**2981 checks / 40 suites, 0 failures**.
Final: build PASS, `tsc --noEmit` clean, **3023 checks / 41 suites,
0 failures** (+40 new lazy-banks checks, +2 new Stage 4A checks).

Evidence base: `~/workspace/etea-bundle-decision.md` (bundle
measurement + lazy-loading recommendation) and
`~/workspace/etea-full-localization-audit.md` (138 missing Roman keys,
bugs 5a/5b). The lazy-8k prototype at
`~/workspace/.bundle-prototypes/lazy-8k/` was adapted, not blind-copied
(its `content.json` counts were NOT copied; the review `mockPool` was
deliberately improved to preserve display order — see §1).

## 1. Workstream 1 — Lazy per-bank loading

Question banks now load via dynamic `import()`, one hashed chunk per
bank, only when the subject is opened/practiced. `content.json`
(notes, tracks, mocks, patterns) stays statically imported. The
`data.ts` resolver API is unchanged for callers
(`resolveQuestionView` / `resolveNoteView` / `localizeQuestion` /
`localizeNote` / `displayExplanation` / badge helpers: same
signatures, same behavior — they take already-loaded objects).

### New files

- `scripts/generate-bank-manifest.mjs` (78 lines) — deterministic
  manifest generator. Explicit 16-bank list (dead `drawing_pe.json`
  excluded); throws on duplicate/missing ids; writes
  `src/lib/bank-manifest.ts` by default, or the `argv[2]` path (used
  by the test suite for byte-diff regeneration checks).
- `src/lib/bank-manifest.ts` (809 lines, generated, checked in) —
  `BANK_COUNTS` (arabic 80, drawing 50, english 45, gk 30, islamiyat
  105, it 60, maths 45, pakstudies 45, pastpapers 20,
  pastpapers_reworded 20, pe 46, pedagogy 30, science 30,
  socialstudies 30, tajweed 82, urdu 45; total 763),
  `BANK_TRUSTED` (from stored `reviewStatus`), `ID_BANK` (763
  entries). `drawing_pe` appears only in the header comment.
- `src/lib/banks.ts` (136 lines) — `BANK_KEYS` in the OLD `BANKS`
  declaration order (`:30`, so `loadAllQuestions()` order == the old
  `QUESTIONS` order); `LOADERS` map of dynamic imports (`:52`);
  promise cache with **failure eviction** (a rejected load deletes
  its cache entry, so Retry re-attempts the network instead of
  re-serving the rejection); `loadBank` (`:81`, unknown keys → `[]`,
  never throws), `loadBanks` (`:98`), `loadAllQuestions` (`:111`),
  `findQuestionById` (`:119`) / `findQuestionsByIds` (`:128`) via
  `ID_BANK`, loading ONLY the needed banks. Type-only import of
  `Question` from `./data` (no runtime cycle).

### Changed files

- `src/lib/data.ts` — removed the 16 static bank imports + `BANKS` +
  `QUESTIONS` / `BY_ID` / `BY_SUBJECT`; re-exports the loader API
  from `./banks` (`:175`). Now async: `pendingEnglishExplanations`
  (`:419`), `trustedOnlyCount` (`:796`), `buildMockQuestions`
  (`:818`), `mockLabels` (`:893`), `retrieve` (`:1019`).
  `mockAvailableCount` (`:854`) stays sync via `BANK_COUNTS` (fixed
  mocks return the `ZAM_FIXED` length — every zamFixed id exists,
  pinned by test). Added `mockLabelsSync` (`:906`): exact
  coverage/availability with `trusted: 0`, the first-paint fallback
  while async trusted counts load. Two stale `BY_SUBJECT` doc
  comments reworded. Sampling semantics unchanged (fixed ZamungKor
  id lists; dynamic seeded `mulberry32`, no replacement, `trustedOnly`
  never backfills); sampling awaits the needed banks.
- `src/lib/ledger.ts` — `countFor` (`:580`) + trusted scan use the
  manifest (`:51`); same stored-status predicate, no overrides —
  behavior-identical.
- `src/lib/i18n.tsx` (`:177`, `:182`) — new keys `bankLoadFailed` +
  `bankLoadFailedOffline` in all 3 languages (reused existing
  `loading` + `retryButton`).
- `src/app/practice/page.tsx` — subjects from `BANK_KEYS`, counts
  from `BANK_COUNTS`, validity via `BANK_KEYS` inclusion; `loadBank`
  effect with `bank` / `bankError` (`"offline"` | `"error"` via
  `navigator.onLine`) / `retryNonce` (`:54-55`); failure alert +
  retry button (`:119-121`); loading state; QuizRunner gated on the
  `bank === null` branch (`:126`), never mounted with a null bank.
- `src/app/topics/page.tsx` (rewritten) — loads both past-paper
  banks with loading/error/retry states (`:19-20`, `:45-51`); stable
  `sessionScope` values (see §2). **Decision:** the `subject` props
  stay the hardcoded English labels ("Past-Paper Topics",
  "Past-Paper Topics (Reworded)") — already language-independent,
  they feed the session fingerprint + attempt records; the audit's
  "bank-key subject" suggestion was deliberately NOT followed (would
  change attempt labels/display for no benefit).
- `src/app/review/page.tsx` — `mockPool(mockId, questions, byId)`
  (`:55`); dynamic-mock pool built ORDER-PRESERVING (comp-key order
  + file order + dedupe by id — a deliberate improvement over the
  prototype's filter approach, which changed display order);
  `loadAllQuestions` effect with loading/error/retry gate (`:129-130`)
  placed after all hooks; `byId` memo; `zamProgress` + flags use
  `byId.get`. Pool-order equivalence vs the old per-bank
  concatenation is pinned by test for all dynamic mocks.
- `src/app/mock/page.tsx` — async `labelsById` effect (`Promise.all`
  of `mockLabels(m, overrides)` — overrides preserved, so a Verify
  on /review still updates labels immediately; catch keeps the sync
  fallback); render uses `labelsById[m.id] ?? mockLabelsSync(m)`.
- `src/app/mock/[id]/page.tsx` — async loading effect (`Promise.all`
  of `buildMockQuestions` + `trustedOnlyCount`, `bankError` /
  `retryNonce`); trusted note uses `questions?.length ?? 0` and the
  loaded `trustedCount`; `allocation` uses `questions ?? []`;
  loading/error early returns after the `allocation` useMemo (hooks
  order preserved; the existing `if (!mock)` return still precedes
  it). `overrides` intentionally excluded from effect deps, as before.
- `src/app/tutor/page.tsx` — `offlineResult` + `runOfflineSearch`
  async; `await retrieve(...)` at all 3 call sites.
- `src/app/api/explain/route.ts` — `BY_ID` replaced with
  `await findQuestionById(...)` from `@/lib/banks`.
- `src/app/api/tutor/route.ts` — `await retrieve(message, 3, 3)`.
- `src/lib/ai.ts` — `contextBlock` async; awaited at prompt
  construction in `generateTutorAnswer`.
- `package.json` — `"prebuild": "node
  scripts/generate-bank-manifest.mjs"` (`:32`, so Vercel regenerates
  the manifest at build time) + `"test:lazybanks"` (`:75`).
  Verified: `prebuild` regeneration is byte-identical to the
  checked-in manifest (sha256 `5104e810…` before and after build).
- `scripts/test-stage4a-pwa.mjs` §4 — updated to the lazy
  architecture (was pinning static bank imports in `data.ts`): banks
  must be dynamically imported by `banks.ts`; `data.ts` must import
  no bank JSON; `drawing_pe` never imported; no `fetch(` in the data
  layer; `bankLoadFailedOffline` key exists. The PWA offline story
  is now honest: a bank opened once online works offline (SW
  cache-first covers `/_next/static/`); a bank never opened online
  fails gracefully offline. "Download all for offline" remains a
  follow-up (see §6).

### Requirements check

- (a) Zero question data in initial chunks — PROVEN by
  `test-lazy-banks` §b: 16 distinct bank chunks (one per bank,
  question-text probes), none in any route's first-load set. The
  id→bank manifest legitimately lives in shared chunks (ids only,
  no question text) — probes are question text, never ids.
- (b) Loading + failure states — all four bank-loading surfaces
  (practice, topics, review, mock runner) have loading + failure +
  retry UI; offline vs generic failure distinguished via
  `navigator.onLine`; never a blank page or crash. Pinned by test
  (source markers) + route smoke (§5).
- (c) Service worker UNCHANGED — `public/sw.js` byte-identical to
  the pre-lazyload backup; its cache-first rule
  (`url.pathname.startsWith("/_next/static/")`) covers lazy chunks,
  asserted in test. **CACHE_VERSION bump v1→v2 is still recommended
  to evict the old monolithic chunk — a decision for the parent /
  owner, since this batch was constrained to leave the SW unchanged.**
- (d) NO localStorage schema changes, no migration — `tracking.ts`
  byte-identical to backup; all stored state keeps working.
- (e) Mocks keep working — `mockAvailableCount` == old fs
  computation == built questions for all 20 mocks (provisional +
  trusted), pinned by test; fixed 100-ID lists resolve via
  `ID_BANK` + `findQuestionsByIds`.
- (f) "Download all for offline" OUT of scope — noted as a follow-up
  in §6.
- No bank/note content changes — all 17 bank files + `content.json`
  + `quran-examples.json` byte-identical to backup.

## 2. Workstream 2 — Two proven bug fixes

- (a) Home weak-area drill links (`src/app/page.tsx:178-186,445`) —
  the drill link now uses `drillHref(w.subject)`, which maps the
  display label through `subjectKeyForLabel` (same pattern as
  `/analysis`) and validates the result against `BANK_KEYS`. An
  unmapped or non-bank key links to `/practice` with no subject
  (honest fallback, never a guessed subject). The guard matters:
  the legacy "Drawing/PE" label maps to `drawing_pe`, which is not
  a practicable bank — without the guard, a drill for it would emit
  a param the practice page rejects and silently drill the stored
  subject (the original bug). No question carries the "Drawing/PE"
  label today (drawing items are "Drawing", PE items are "Physical
  Education"), so the guard is currently unreachable — pinned by
  test anyway. `resumeAction` (`parts[1]`, already a bank key) was
  verified correct and left untouched. NOTE: `/analysis` uses the
  same `subjectKeyForLabel` pattern WITHOUT the `BANK_KEYS` guard —
  same latent edge, same unreachability; left untouched (out of
  this batch's scope), flagged here for a future pass.
- (b) `/topics` session scopes (`src/app/topics/page.tsx:90,98`) —
  both QuizRunners now carry explicit stable scopes
  (`topics:pastpapers`, `topics:reworded`), so sessions persist
  across language switches instead of vanishing when the translated
  title changed the scope. QuizRunner's `sessionScope ?? quiz:title`
  derivation (`src/components/QuizRunner.tsx:275`) is unchanged and
  pinned by test. **Migration note:** old `/topics` sessions stored
  under `quiz:<translated title>` scopes are orphaned by this fix —
  stored but unreachable; no stale answers are ever applied (the
  session fingerprint would reject them anyway).

Regression tests: `test-lazy-banks` §h (source + behavioral — every
real stats label maps to a valid bank key; the old buggy param
`?subject=Islamiyat` is rejected; both topics runners carry stable
literal scopes).

## 3. Workstream 3 — Roman i18n completion

All **138 missing Roman keys** from audit Appendix A now have Roman
Urdu values in `src/lib/i18n.tsx` (verified: the translated key set
equals the missing set exactly; every Roman placeholder set is a
subset of its English set). **667 keys, 0 missing in ANY language**
(en + roman + ur). No existing English/Urdu value was changed.
Conventions: proper names / technical terms kept (ETEA, Gemini,
Groq, OpenRouter, FSRS-7, RAG, localStorage, JSON, API, PDF, MCQ,
ZamungKor); quoted English labels kept verbatim where the Urdu
version keeps them (`"AI-generated — not verified"`, the two
past-paper topic labels); `countsLine` keeps its `{sneeds}`
placeholder (regression anchor: Roman render includes "14").

- `scripts/test-i18n.mjs` — strengthened: the check is now "every
  key has a non-empty roman translation" (was: non-empty where
  present). Header-rule comments updated in both `i18n.tsx` and
  `test-i18n.mjs` (Roman was "optional, falls back to English";
  now complete; the `t()`/`tf()` fallback remains only as a safety
  net). `StrEntry` keeps `roman?`/`ur?` optional (fallback logic
  must stay robust); completeness is pinned by the test.
- `scripts/test-step3a.mjs` — the §5 i18n check sliced a fixed
  900-char window, which the new `roman:` lines overflow for long
  blocks (`ledgerIntro` failed); now slices to the block close.
  Check intent unchanged.

## 4. Test-suite updates (lazy-loading fallout)

`QUESTIONS` / `BY_ID` / `BY_SUBJECT` no longer exist in `data.ts`,
and `retrieve` / `buildMockQuestions` / `mockLabels` /
`trustedOnlyCount` / `pendingEnglishExplanations` are async. Suites
were updated in two patterns (no check intent changed):

- Pattern A (fs-based maps, canonical bank order == old static
  order): test-fallback-chain, test-phase4b1, test-phase4b2,
  test-provenance, test-trilanguage, test-step2fixes, test-i18n,
  test-stage5a–g, test-step3b-audit2, test-retrieval, test-step2b.
- Pattern B (await the async functions): test-retrieval (8
  `retrieve` calls), test-step2b (mock loop + synthetics; builds
  hoisted to avoid duplicate sampling), test-step3b-audit2,
  test-phase4b1/b2, test-phase4a (string check now expects
  `export async function pendingEnglishExplanations`).
- No change needed: structural-check-mocks (already fs-based),
  test-step2a (`mockLabels(m, overrides)` substring still present —
  the mock list effect preserves `overrides`), qa-540 (comment-only
  mention).

The tsc harness path was verified empirically before updating
suites: `tsc` emits the bank JSONs for dynamic imports, compiled
`loadBank` preserves file order, and all async functions work from
compiled CJS output. Also verified: every question's `subjectKey`
names its bank file (0 mismatches across 763 items) — the input the
review `mockPool` grouping relies on.

### New suite: `scripts/test-lazy-banks.mjs` (391 lines, 40 checks)

(a) no static bank import in `src/`; (b) build-output chunk split
+ zero question data in first-load sets (requires `npm run build`;
fails clearly without `.next`); (c) manifest byte-equals
regeneration; (d) load order == file order, `loadAllQuestions` ==
old order, unknown key → `[]`; (e) availability three-way equality
(all 20 mocks, provisional + trusted); (f) `mockPool` order == old
concatenation; (g) SW unchanged + rule covers lazy chunks; (h) both
bug regressions (source + behavioral); (i) zamFixed resolution via
`ID_BANK`; (j) `drawing_pe` excluded; plus content/schema
byte-compare vs backup and loading/failure UI markers. Probe
construction note: Turbopack inlines bank JSON as single-quoted JS
strings escaping apostrophes (`Bloom\'s`), so probes use
apostrophe-free ASCII runs — ids are never probes (the manifest
legitimately contains all ids).

## 5. Verification

- `npm run build`: PASS (112s wall; `prebuild` regeneration
  byte-identical). `npx tsc --noEmit`: clean.
- All suites: **3023 checks / 41 suites, 0 failures** (baseline
  2981/40). Per-suite PASS counts recorded in the batch run; the
  two suites that initially failed after the change (test-step3a
  window overflow, test-stage4a-pwa static-import pins) were fixed
  as described in §3/§1 and re-run green (366 and 102 checks).
- Local prod server (`next start`): all 14 routes HTTP 200
  (`/`, `/analysis`, `/flashcards`, `/issues`, `/library`, `/links`,
  `/mock`, `/plan`, `/practice`, `/review`, `/topics`, `/tracks`,
  `/tutor`, `/vacancies`) + `/mock/tt-B`, `/tracks/tt`,
  `/robots.txt` also 200. Practice spot-check: SSR HTML contains
  zero question text (0 `Qalqalah` hits — data loads client-side);
  the islamiyat bank chunk serves HTTP 200 (120,980 bytes,
  question data present). Visual click-through is the parent's live
  pass (no headless browser here). Note: one smoke attempt hit a
  stale port collision (EADDRINUSE on 3101, 404 from an unrelated
  server) — re-run on a free port confirmed the chunk serves
  correctly; not a defect.
- Measured chunk sizes (per-route first-load JS from the build
  manifests, same method as the decision report §5.3; before =
  decision-report baseline for `/practice`, after = this build —
  Turbopack emits one shared 6-file first-load set for every route):

  | Route | Before (raw / gzip / brotli) | After (raw / gzip / brotli) |
  |---|---|---|
  | `/practice` | 2,373,015 / 599,987 / 488,617 | 555,784 / 171,156 / 147,589 |
  | `/` (home) | — (not measured before) | 555,784 / 171,156 / 147,589 |

  First-load reduction on `/practice`: **−77% raw, −71% gzip**.
  Per-bank lazy chunks (raw / gzip): arabic 86,227 / 14,543;
  drawing 72,860 / 15,591; english 55,424 / 7,461; gk 32,847 /
  5,901; islamiyat 120,980 / 17,884; it 74,683 / 13,517; maths
  44,086 / 7,579; pakstudies 56,302 / 8,339; pastpapers 25,704 /
  5,872; pastpapers_reworded 26,783 / 6,047; pe 58,519 / 12,018;
  pedagogy 45,454 / 10,052; science 37,089 / 7,580; socialstudies
  35,372 / 6,807; tajweed 112,455 / 20,432; urdu 45,944 / 5,996.
  All-chunks total: 2,994,355 raw / 796,554 gzip (53 files).

## 6. Follow-ups / open items for the parent

1. **CACHE_VERSION bump v1→v2** (SW) — recommended to evict the old
   monolithic chunk from existing installs; needs a parent/owner
   decision (SW was constrained unchanged in this batch).
2. **"Download all for offline"** — out of scope here; the honest
   offline narrowing (subjects never opened online are unavailable
   offline, with a clear message) is in place.
3. **`/analysis` drillHref** shares the `Drawing/PE` → `drawing_pe`
   latent edge without the `BANK_KEYS` guard (unreachable today).
4. **Old `/topics` sessions** under translated-title scopes are
   orphaned (stored, unreachable, never applied) — no action
   needed; noted for completeness.
5. **Load-failure cache eviction** in `banks.ts` (retry re-attempts
   the network) is implemented but has no automated test — it
   needs a fault-injection harness; the retry UI path is covered
   by source markers + the parent's live pass.
6. Mixed-explanation cleanup (33 Islamiyat + 45 Pak Studies +
   PPT-001), per-subject resume, and the past-paper labelling
   decision remain owner-pending as before — untouched by this batch.
7. No new dependencies were added. No tutor/PWA/audio behavior
   changes. No dead-code removal. No schema migrations.

## 7. Files changed (this batch)

New: `src/lib/banks.ts`, `src/lib/bank-manifest.ts`,
`scripts/generate-bank-manifest.mjs`, `scripts/test-lazy-banks.mjs`,
`VERIFY-lazyload.md` (this file).
Changed: `src/lib/data.ts`, `src/lib/ledger.ts`, `src/lib/i18n.tsx`,
`src/lib/ai.ts`, `src/app/page.tsx`, `src/app/practice/page.tsx`,
`src/app/topics/page.tsx`, `src/app/review/page.tsx`,
`src/app/mock/page.tsx`, `src/app/mock/[id]/page.tsx`,
`src/app/tutor/page.tsx`, `src/app/api/explain/route.ts`,
`src/app/api/tutor/route.ts`, `package.json`,
`scripts/test-i18n.mjs`, `scripts/test-step3a.mjs`,
`scripts/test-stage4a-pwa.mjs`, `scripts/test-retrieval.mjs`,
`scripts/test-step2b.mjs`, `scripts/test-step3b-audit2.mjs`,
`scripts/test-phase4a.mjs`, `scripts/test-phase4b1.mjs`,
`scripts/test-phase4b2.mjs`, `scripts/test-provenance.mjs`,
`scripts/test-trilanguage.mjs`, `scripts/test-step2fixes.mjs`,
`scripts/test-fallback-chain.mjs`, `scripts/test-stage5a.mjs`,
`scripts/test-stage5b.mjs`, `scripts/test-stage5c.mjs`,
`scripts/test-stage5d.mjs`, `scripts/test-stage5e.mjs`,
`scripts/test-stage5f.mjs`, `scripts/test-stage5g.mjs`.
Untouched (verified byte-identical to backup): all bank/note/audio
data, `src/lib/tracking.ts`, `public/sw.js`.
