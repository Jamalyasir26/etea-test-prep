# VERIFY — Phase 4A (queue removal + Home stats skeleton)

Owner orders (2026-11-13 ~22:44 PKT): (1) remove the 196-item
translation-verification queue from /review — personal use, he
understands Roman Urdu and English, no manual verification needed;
(2) optional "Loading..." skeleton while Home data loads (UX polish
after the stats-anomaly discussion — calculations confirmed correct).

Backup: `~/workspace/etea-prep-next-backup-pre-phase4/` (rsync copy,
empty diff confirmed before work; tar was unusable — ownership
errors). Baseline (before changes): build PASS, tsc clean, **2257
checks / 28 suites, 0 failures**. No push/deploy/GitHub/Vercel/env
action taken; the parent handles the single push after all Phase 4
batches.

## 1. Queue removal

### Before
`src/app/review/page.tsx` rendered a "English explanations pending
owner review" card (Step 3b-audit2 F02): count + first 10 rows
(id/subject/topic/explanation preview + pending label) + Show-more
(+25), backed by `pendingEnglishExplanations()` and `pendingVisible`
paging state, with i18n keys `pendingEnglishHeading` /
`pendingEnglishIntro` / `pendingEnglishShowMore`.

### After
- `src/app/review/page.tsx` — queue card block deleted; `pendingVisible`
  state deleted; `pendingEnglish`/`pendingShown` memo deleted;
  `pendingEnglishExplanations` import deleted. Everything else on the
  page untouched: 15/200 progress, filters, structural checks, durable
  flags list, review cards.
- `src/lib/i18n.tsx` — the 3 queue-only keys deleted.
- KEPT (verified by suite): the pending labels on explanations
  (`explanationPendingLabel` in QuizRunner reveal + review cards), the
  `explanationEn`/`explanationLang` bank data (byte-untouched — see
  §3), `displayExplanation()`, and `pendingEnglishExplanations()` in
  `src/lib/data.ts`, retained for the test suites' F02 accounting with
  a one-line comment noting the Phase 4A removal.

## 2. Home stats skeleton

### Before
The Command Center grid rendered only once `stats` loaded
(`{stats && (...)}`): before mount the section was blank space, and
the owner asked for a "Loading..." indicator while data loads.

### After
- `src/app/page.tsx` — the grid is now a ternary on loaded `stats`:
  the `!stats` branch renders `<div aria-busy="true">` with a
  `role="status"` line (`t("statsLoading")`) and the same 6-card
  `.grid` shape filled with shadcn `Skeleton` bars (3 per card,
  `aria-hidden="true"`). The real computed values replace the skeleton
  after mount; the skeleton branch contains NO computed values (suite
  asserts no `stats.`/`planDone`/`dueCards`/`buckets` in it). The
  Start Here card keeps its existing `stats &&` gate (no
  wrong-variant flash). No computed value, layout, or RTL rendering
  changed; skeleton bars are direction-neutral.
- `src/lib/i18n.tsx` — new key `statsLoading`: en "Loading...", roman
  "Loading...", ur "لوڈ ہو رہا ہے...".

## 3. Verification

- `npm run build` PASS (29.6s). `npx tsc --noEmit` clean (strict).
- Suites: all 29 green — **2283 checks, 0 failures** (baseline 2257 →
  +28 new `test-phase4a.mjs`, −2 net in `test-step3b-audit2.mjs`,
  `test-rtl.mjs` updated 1:1).
- Test updates for the queue removal (every one):
  1. `scripts/test-step3b-audit2.mjs` — the "review page lists the
     pending-English queue" check became two checks (queue section
     ABSENT + review cards still show the pending label); the 3 queue
     keys dropped from the required-i18n-keys loop; the two
     `pendingEnglishExplanations()` count checks renamed (helper
     retained, UI gone). Net 127 → 125 checks.
  2. `scripts/test-rtl.mjs` — the queue's raw-explanation `dir=auto`
     span no longer exists, so the "review: question/options/
     explanation dir=auto" check now asserts the three remaining card
     patterns (question, options, `expl.text`); count unchanged (72).
- Diff vs backup: 8 changed (`CHANGELOG.md`, `package.json`,
  `src/app/page.tsx`, `src/app/review/page.tsx`, `src/lib/data.ts`,
  `src/lib/i18n.tsx`, `scripts/test-step3b-audit2.mjs`,
  `scripts/test-rtl.mjs`) + 2 new
  (`scripts/test-phase4a.mjs`, this report), 0 deleted. No bank file
  changed (suite re-parses all banks: 645 questions, 124
  `explanationEn`, 196 roman markers — identical to the F02 audit).
  Zero Nastaliq in `src/`.
- Local prod server (port 3141, stopped after): all 15 routes HTTP
  200 (14 pages + `/api/tutor/health`). Home SSR HTML: 19
  `data-slot="skeleton"` slots (18 new + 1 pre-existing sidebar
  skeleton), 1 `aria-busy`, 1 `role="status"` with "Loading...", and
  the headline "645 MCQs · 110 notes · 70 flashcards · 12 teaching
  post tracks · 16 mocks". /review SSR HTML: 0 occurrences of
  `pendingEnglish`, review heading present, pending-label text
  present. (The flags list is mount-gated, so it correctly renders
  nothing in SSR — unchanged behavior.)

## 4. For the parent's live verification (post-hydration, browser only)

1. /review shows NO "English explanations pending owner review"
   section; 15/200, filters, and the flags list all still work; a
   pending label still shows on a Roman-Urdu explanation card.
2. Home shows the "Loading..." skeleton only until stats load, then
   the real 6 stat cards; Urdu mode renders the skeleton + Urdu
   loading text with no layout breakage.
3. No regression in counts, Start Here card, or nav.

## 5. Files changed

Changed: `CHANGELOG.md`, `package.json`,
`src/app/page.tsx`, `src/app/review/page.tsx`, `src/lib/data.ts`,
`src/lib/i18n.tsx`, `scripts/test-step3b-audit2.mjs`,
`scripts/test-rtl.mjs`. New: `scripts/test-phase4a.mjs`,
`VERIFY-phase4a.md`. Nothing left out; both brief items are
implemented and tested.
