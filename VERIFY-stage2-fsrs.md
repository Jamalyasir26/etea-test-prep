# Stage 2 — FSRS spaced repetition: verification report (local, 2026-11-12; NOT deployed)

Local build only. No deploy, no GitHub/Vercel touch, no env-var change, no
Stage 3 work. Backup: `~/workspace/etea-prep-next-backup-pre-stage2/`
(flat, verified — no nested `etea-prep-next` directory inside).

## 1. Library version landed: ts-fsrs 6.0.0 (FSRS-7) — no fallback needed

- `package.json`: `"ts-fsrs": "6.0.0"` (exact pin), lockfile updated by
  `npm install ts-fsrs@6.0.0 --save-exact`.
- Why v6: local Node is v24.22.1 and v6 requires Node >= 24
  (`engines` in the installed package); Vercel runs Node 26.x, so
  production satisfies it too. The install and all tests ran clean on
  v6, so the authorized v5.4.2 (FSRS-6) fallback was NOT needed.
- `package.json` `engines` bumped `>=22` → `>=24` (permitted by the
  task; documents the real requirement). UI label is honestly "FSRS-7"
  (`src/lib/fsrs.ts:36` `FSRS_LABEL`, `src/lib/i18n.tsx:527-530`).
- Verified library facts (probed from the installed package, not
  memory): `DefaultScheduler()` is async and uses FSRS-7 by default;
  `Rating` Again=1/Hard=2/Good=3/Easy=4; `State` New=0/Learning=1/
  Review=2/Relearning=3; default learning steps 1m/10m, relearning
  10m; `enableFuzz: false` by default in v6 (previews are
  deterministic and equal applied intervals); `review()` is pure and
  REJECTS string dates ("Expected valid Date fields" — hence mandatory
  deserialization). The v6 card shape is `stability, stabilityFast,
  difficulty, state, scheduleStatus, dueAt, lastReviewAt, cardId, reps,
  lapses, scheduledDays, learningStep` — the stored shape follows v6
  exactly (`src/lib/fsrs.ts:82-96`).
- Typing note: the v6 `.d.mts` declares the card type twice with
  unrelated identities (TS2719) and `newCard()`'s declared return omits
  `stabilityFast` although the runtime object carries it. The review/
  preview wrappers call the scheduler through narrowly-typed aliases
  cast via `unknown` in exactly one place
  (`src/lib/fsrs.ts:296-306`, `318-335`, `336-352`), with the runtime
  behavior verified by `scripts/test-fsrs.mjs` against the real
  scheduler. The shape guard (`src/lib/fsrs.ts:110-132`) is what
  guarantees stored cards carry every field.
- Scheduler config: defaults kept (steps 1m/10m, fuzz off). The UI
  always shows the COMPUTED interval, never the configured step: FSRS-7
  computes the step-1 Good interval from stability (~27.5m observed),
  so the 10m step is a floor/parameter, not a promise.

## 2. State migration (browser, on load)

### Before
Per-card state was `{grade, due, interval, reps}` with `due` a UTC date
string (`YYYY-MM-DD`), scheduled by a fixed interval ladder
(Again 0d / Hard 2d / Good 3→7→14d / Easy 7→14→30d).

### After
Stored state is the FSRS shape (`SerializedFsrsCard`,
`src/lib/fsrs.ts:82-96`; `FlashState` at `src/lib/tracking.ts:78`).
Migration is pure + idempotent (`convertFlashStateToFsrs`,
`src/lib/tracking.ts:474-529`) and runs through `runFlashMigration`
(`src/lib/tracking.ts:531-578`):

- BEFORE any state change, the pre-migration raw text is preserved
  VERBATIM under `etea_flashcards_v5_backup`
  (`src/lib/tracking.ts:88`), written ONCE and never overwritten. If
  the backup write fails, the converted state is returned for
  in-memory use but NOT saved, and the next load retries
  (`backupFailed` surfaces in the UI).
- Due dates preserved EXACTLY: old `due` → new `dueAt` =
  `${due}T00:00:00.000Z` (midnight UTC), so `dueAt <= now` holds
  exactly when the old UTC-date comparison held.
- Intervals SOFT RESET: stability/difficulty restart at fresh
  defaults (seed literals guarded by a drift test against a real
  `newCard()`); `reps` preserved; `scheduledDays` = old interval
  (approximate, per AUDIT-V2.md §4b); `lastReviewAt` = null (honest —
  the old shape never stored it); migrated cards enter `Review` state.
- Legacy `card-N` index keys map onto stable ids (collision: later due
  key wins — the pre-Phase-2 precedent). Mixed old+new stored states
  are handled by per-entry shape detection everywhere. Non-object
  input is treated as empty state (a crash on `null` input was caught
  by test-fsrs and fixed at `src/lib/tracking.ts:480-484`).
- Counts: `{migrated, reset, kept}` — reset = stored entries with no
  usable state → fresh card. Bank cards with NO stored entry are
  simply new (not counted as reset). A one-time dismissible banner
  shows the counts (`src/app/flashcards/page.tsx:157-168`, strings at
  `src/lib/i18n.tsx:564-571`).

### Migration counts from fixtures
- `scripts/test-fsrs.mjs` fixture (4 entries: hash-key legacy,
  `card-1` legacy, malformed no-due entry, FSRS-shaped entry):
  `{migrated: 2, reset: 1, kept: 1}`; second run reports all kept and
  the state is byte-identical (idempotent); the backup key holds the
  raw text verbatim and is not overwritten on re-run.
- `scripts/test-backup-versioning.mjs` fixture: one v5 legacy flash
  entry restores as FSRS state with due preserved
  (`2026-11-09T00:00:00.000Z`, state Review, reps 1).

## 3. Scheduler rework

### Before
Frozen day-queue: `buildSessionQueue(cards, state, todayString)`,
`gradeCard(queue, pos, grade)`, `nextDue(grade, prevInterval)` with
the fixed ladder. Only "Again" re-queued in-session.

### After
- Queue: `buildReviewQueue(cards, state, now: Date, opts?)`
  (`src/lib/tracking.ts:580-622`). Order: (1) due cards first,
  earliest `dueAt` first (bank order breaks ties); (2) new cards (no
  stored state) in bank order, NO daily cap; cram appends future-due
  cards last, earliest first. Category filter preserved.
- Advance: `advanceReviewQueue(queue, index, reviewedState)`
  (`src/lib/tracking.ts:624-643`). Driven by the POST-review FSRS
  state: Learning (1) / Relearning (3) append to the end of the
  session (same-session relearning); Review (2) / New (0) do not.
  Never re-sorts; advances exactly one step; out-of-range is a no-op.
  Consequence of real FSRS semantics: Hard on a new card ALSO
  re-queues (Hard leaves a new card in Learning) — the old "only
  Again re-queues" expectation was a fixed-ladder artifact.
- Page: `src/app/flashcards/page.tsx` rewritten (278 lines). The
  scheduler is awaited once in `useEffect` (cancelled-flag on
  unmount) and grading is gated on its readiness (lines 90-108).
  `grade()` (lines 124-151) applies `reviewFsrsCard`, saves state,
  and advances via `advanceReviewQueue`. Session counting and
  `recordAttempt` unchanged. Grade-button previews are computed at
  render via `previewFsrsGrades` + `formatFsrsInterval` (lines
  112-122) — real scheduler values, never hardcoded.
- B05 PRESERVED: the card surface is a native `<button>` (Enter/Space
  flip, visible focus outline), card text is the accessible name, and
  the separate native "Flip card" button is untouched (lines 233-250,
  comment preserved). B03 `dir="ltr"` counter spans preserved.
- Removed functions: `migrateFlashState`, `buildSessionQueue`,
  `gradeCard`, `nextDue` — zero references remain in `src/` or
  `scripts/` except the rework documentation comments in
  `scripts/test-flashcards.mjs`.

## 4. Labeling + dashboard

- "Simple ladder" / "simple spaced" wording: ZERO occurrences in
  `src/` (grep-verified). Remaining "fixed-ladder" mentions are
  deliberate comments naming the legacy format accurately.
- `src/lib/i18n.tsx`: `flashTitle` (line 527) and `flashIntro` (line
  532) rewritten for FSRS-7; `quickFlashDesc` (line 161) updated;
  `sessionFinishedBody` (line 546) rewritten; `lastGrade` REMOVED;
  new keys `stateNew/stateLearning/stateReview/stateRelearning`
  (555-558), `fsrsStateLine` (559), `flashMigratedNotice` (564),
  `flashMigrationBackupFailed` (568), `cardsDueLabel` (572). Every new
  key has en+ur; placeholders are subsets (enforced by test-i18n).
- Dashboard: home page (`src/app/page.tsx:32,40,105-106`) shows a
  "Cards due today" stat card (link to `/flashcards`, same styling as
  the other stat cards) using `countDueFlashcards`
  (`src/lib/tracking.ts:684-692`) — due-now + new queue length,
  computed in-memory only (the home page NEVER writes/migrates), 0
  when none due.

## 5. Export v5 → v6 migration

- `BACKUP_VERSION = 6`, `SUPPORTED_BACKUP_VERSIONS = [4, 5, 6]`
  (`src/lib/tracking.ts:1050-1052`). Explicit chained functions:
  `migrateV4ToV5` (1056), `migrateV5ToV6` (1084, converts flash
  entries via `convertBackupFlashcards`, due preserved),
  `migrateBackupPayload` (1099; v6 passes through unchanged, v5 takes
  v5→v6, older chains v4→v5→v6, v3-and-older lenient path kept).
- v7+ rejected with "newer than this build"; corrupt/unknown-shape
  exports rejected WITHOUT touching stored data (validate → migrate →
  merge pattern preserved; merge accepts FSRS-shaped flash entries
  only, others skipped + counted).
- `src/app/review/page.tsx`: one comment updated ("v5 backup export"
  → "v6 backup export").

## 6. Tiny fix: tutor chat markdown (bold only, XSS-safe)

- NEW `src/lib/boldText.ts` (53 lines): `parseBoldSegments` splits
  text on `**...**` pairs into literal/bold segments. Pairing rules:
  non-blank content only; unmatched `**` stays literal; `****` and
  `** **` stay literal; single `*` never special; `***` is NOT
  italic. NO other markdown (no links/images/raw HTML).
- NEW `src/components/BoldText.tsx` (17 lines): renders segments as
  `<strong>`/`<span>` React text nodes — React escapes them, so markup
  can only ever show as literal text. NO `dangerouslySetInnerHTML`
  anywhere in `src/` except comments stating it must never be used.
- Applied at the three places AI prose renders: tutor chat bubbles
  (`src/app/tutor/page.tsx:205`; the greeting sentinel stays plain),
  explain output (`src/app/tutor/page.tsx:268`), AI plan output
  (`src/app/plan/page.tsx:95`).

## 7. Cross-module import fix (needed for the node suites)

`src/lib/tracking.ts` imports `./fsrs.ts` (explicit `.ts` extension)
because Node ESM type-stripping cannot resolve extensionless relative
imports (verified: `ERR_MODULE_NOT_FOUND` before the fix). This
required `"allowImportingTsExtensions": true` in `tsconfig.json`
(allowed: `noEmit` is true). The Next production build passes with
this configuration, and all node suites import `tracking.ts`
directly as before.

## 8. Tests

### New suites
- `scripts/test-fsrs.mjs` (90 checks): real-scheduler transitions
  (Again→Learning +1m, Hard→Learning, Good/Easy→Review with
  difficulty/stability ordering), same-day steps (Again→Good→Good
  graduates with scheduledDays 1; step-1 Good waits 10–60m),
  lapse (Review+Again→Relearning, lapses 1, +10m), preview
  determinism (preview dueAt/state == review outcome for all 4
  grades), review() purity, string-date rejection, seed-drift guard
  vs real `newCard()`, interval formatting (en/ur/roman), migration
  counts + idempotency + verbatim backup from fixtures.
- `scripts/test-markdown.mjs` (20 checks): pairing rules incl. all
  edge cases, `<script>`/link syntax stay literal, structural checks
  (no `dangerouslySetInnerHTML`/`innerHTML` in BoldText code).
- `scripts/test-flashcards.mjs` REWRITTEN (39 checks, was 29). Every
  changed/deleted assertion is documented in the file header:
  6 `nextDue` checks DELETED (ladder replaced by FSRS; coverage in
  test-fsrs + preview checks), 2 old-signature `gradeButtonLabel`
  checks DELETED (new signature), 2 `migrateFlashState` checks
  CHANGED to `convertFlashStateToFsrs`, queue/grade functions
  CHANGED to `buildReviewQueue`/`advanceReviewQueue` driven by real
  scheduler results; stable-id, no-re-sort, +1-advance,
  end-of-session and out-of-range checks KEPT. New: due ordering,
  category filter, no-cap new cards, due-now boundary,
  `countDueFlashcards`, state-driven advance rules, grade-button
  interval labels (en/ur/roman).

### Updated suites (v6 fallout + new signature)
- `scripts/test-backup-versioning.mjs`: v6 constants, chained
  migration, v7 rejection, v5 legacy-flash E2E restore, v6 restore.
- `scripts/test-i18n.mjs`: 3 `gradeButtonLabel` assertions updated to
  the new signature (default English, Urdu translations, roman
  fallback).
- `scripts/test-storage.mjs`, `scripts/test-reviews.mjs`: export
  version 5→6, rejection v6→v7.
- `scripts/test-rtl.mjs`: last-grade check replaced by the FSRS
  state-line `lri()` check.

### Results (all suites, 2026-11-12)
`npx tsc --noEmit` clean (strict: true). `npm run build` PASS (20
routes). Node suites, 0 failures: scoring 39, reviews 37, retrieval
28, fallback 24, timeouts 43, storage 38, tutor-lang 30, api-guard
60, tier4 46, provenance 33, backup 44, telemetry 28, fonts 21,
i18n 40, rtl 59, trilanguage 28, fsrs 90, flashcards 39, markdown
20, qa 52/52. Total 799 checks (was 666 pre-Stage-2; the count grew
by the new/reworked suites and the v6 additions).

### Local prod-server regression
`next start` on port 3100: all 14 page routes HTTP 200
(`/`, `/flashcards`, `/library`, `/mock`, `/practice`, `/review`,
`/tutor`, `/plan`, `/analysis`, `/issues`, `/topics`, `/tracks`,
`/vacancies`, `/links`). Home HTML contains the 645/110/70/19/20
counts. Flashcards HTML contains the FSRS-7 title and no
"simple spaced" wording. Security headers present (CSP, nosniff,
DENY — config untouched). ts-fsrs code present in the client
bundle; no API-key names in client chunks. Health endpoint responds
honestly ("down" locally — no keys on this machine, expected). The
`dangerouslySetInnerHTML` strings in two built chunks are Next.js's
own error-page theme CSS, not app code. Server stopped afterwards.

### NOT verified locally (needs a real browser after deploy)
- Grade → next card flow, interval labels on buttons, Learning-card
  re-queue within a session, migration banner on a device with old
  stored state, dashboard due-count number, hamburger/theme/tutor
  interaction, 360px layout. These are browser behaviors; curl cannot
  exercise client-side state. See §9.

## 9. How it will be verified live after deploy

1. Open `/flashcards` on the owner's phone with the OLD stored state
   present: the migration banner appears once with the true counts;
   dismiss it; reload — banner gone; `etea_flashcards_v5_backup` in
   localStorage holds the old state verbatim.
2. Flip a card (tap + keyboard Enter/Space on desktop): all four
   grade buttons show an interval (Again ~1m on a new card).
3. Grade Again: the card returns at the END of the session;
   grade Good/Easy: it does not return this session.
4. Home dashboard shows the due count; it reads 0 when nothing is due.
5. Urdu mode: FSRS title/intro/state line render in Urdu; the due
   value does not flip the sentence order.
6. Tutor: an answer containing `**bold**` renders bold; no literal
   `**` markers remain.
7. Export → import round trip: file is version 6; an old v5 export
   still imports (flash entries migrate, dues kept).

## 10. Scope compliance

- 70-card bank only; no new cards; no card text changed; no content
  translation; no religious-content verification by the agent.
- No scraping/hosting; no key material anywhere; no env changes.
- No Stage 3 work (no shadcn/Tailwind/Framer/Recharts/redesign).
- `VERIFY-p1-p2.md` NOT re-added (already in the repo).
- Nothing deployed, nothing committed.
