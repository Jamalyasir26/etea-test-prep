# VERIFY — Stage 3 part 2 (motion, 3D flip, Recharts, Command Center, full shell migration, 2 live-defect fixes)

Date: 2026-11-13 (local only). Folder: `~/workspace/etea-prep-next-stage3/`.
Status: **COMPLETE locally. NOT deployed, NOT merged.** Merge + deploy only
on the owner's word. Trigger: the Stage 2 bundle PASSED live verification
(commit 568207b, deployment B8yLxhYmwB7YifaVSDkeVZzuwk4S), so Stage 3
proceeds per the owner's pre-authorization.

## 1. Isolation (owner's STRICT RULE 1)

- All work in `~/workspace/etea-prep-next-stage3/` only.
  `~/workspace/etea-prep-next/` was treated as READ-ONLY: no command in
  this batch wrote there (no npm install, no build, no edits). Verified
  twice: `diff -rq` vs `~/workspace/etea-prep-next-backup-pre-stage2/`
  is still **exactly the 23 Stage 2 files**, and the main folder's
  newest file is still 2026-11-12 07:22 UTC (Stage 2 work).
- `scripts/test-stage3.mjs` §14 re-asserts the isolation continuously
  (now also `src/components/motion.tsx` + `src/components/AnalysisCharts.tsx`
  absent from the main folder).
- No GitHub/Vercel/env changes. No deploy. No content/data/bank/API changes.

## 2. Baseline (before any change, stage3 folder)

- `npm run build` PASS (21 routes).
- `npx tsc --noEmit` clean (strict).
- All 21 suites green: qa 52/52 + 20 test scripts = **928 checks,
  0 failures** (the foundation batch's final number, re-verified before
  starting).

## 3. The two live defects — root causes + fixes

### 3.1 Defect (a): home "Plan tasks done" showed "63 / 0" in Urdu mode

- Root cause: the home stat rendered `{planDone} / 63` inside a bare
  `<b>` with NO direction isolation (`src/app/page.tsx:94-96`, pre-fix).
  In Urdu (RTL) mode the Unicode bidi algorithm reordered the neutral
  " / " run, displaying the fraction reversed. Every other fraction on
  the page was already isolated (`dir="ltr"`) — this was the ONLY
  un-isolated one (verified by grepping all `{x} / {y}` renders in
  `src/`; QuizRunner's three fractions and the review page's progress
  fraction are already isolated).
- Fix: `<span dir="ltr">{planDone} / 63</span>` inside the plan stat
  card (`src/app/page.tsx`, Command Center rework). Same B03 pattern as
  the rest of the page.
- Proof: served home HTML contains `<span dir="ltr">0 / 63</span>`
  (local prod server, §7).

### 3.2 Defect (b): /review filter middle count blank ("186 pass · needs review · 0 problem.")

- Root cause: a CASE mismatch, not a data bug. The `countsLine`
  template uses the placeholder `{sneeds}` (all lowercase, both en and
  ur — `src/lib/i18n.tsx:735-736`), but the call site passed the var
  key `sNeeds` (camelCase — `src/app/review/page.tsx:194`, pre-fix).
  `replaceVars()` (`src/lib/i18n.tsx:1013-1018`) is case-sensitive:
  `vars["sneeds"]` was `undefined` → replaced with `""`. The count
  (14 on the ZamungKor Mock 1+2 pool) was computed correctly the whole
  time; only the rendering dropped it. It affected ALL languages (the
  English template has the same placeholder), not just Urdu.
- Fix: call-site key renamed to `sneeds` (`src/app/review/page.tsx`).
  The comment explaining the root cause sits ABOVE the `tf()` call, not
  inside the object literal — a comment inside the literal broke the
  first draft of the call-site scanner (its text contains `{sneeds}`).
- Regression test: `scripts/test-i18n.mjs` §7 (new) parses EVERY
  `tf("KEY", {...})` call site in `src/` (47 sites) and requires the
  passed var keys to cover every placeholder in the en template,
  case-sensitively. Shorthand properties (`{ weeks }`) count; string /
  comment / template-literal `${...}` handling is implemented in the
  scanners (`findObjectEnd` + `stripLiterals`). A dry run of the scanner
  BEFORE the fix found exactly this one violation (the three plan-page
  "missing" hits were shorthand false positives of the crude first
  draft — fixed in the final scanner). Plus a countsLine render
  simulation with the live values (200/185/0/0/15/186/14/0) in all three
  languages: no `{` remains and "14" appears.
- Proof: served review HTML contains
  "Structural check: 186 pass · 14 needs review · 0 problem."
  (local prod server, §7).

## 4. What was built

### 4.1 Motion (`src/components/motion.tsx`, new)

- `PageFade`: route entrance — 0.25s fade + 6px rise, re-run per
  navigation (`key={pathname}` in AppShell). Entrance-only by design:
  NO AnimatePresence exit, so navigation is never delayed waiting for
  an exit animation.
- `FadeIn`: same entrance with an optional stagger `delay` (home
  Command Center: stats 0–0.25s, quick actions 0–0.28s).
- Reduced-motion rule enforced in exactly one place: `useReducedMotion()`
  → plain `<div>` / fragment, NO animation. The flashcards page also
  branches on it (see §4.2). No animation anywhere bypasses this file.

### 4.2 3D flashcard flip (`src/app/flashcards/page.tsx` + `src/app/globals.css`)

- The card surface is a `<motion.button>` rotating `rotateY: 0 → 180`
  (0.45s, easeInOut). Both faces share one grid cell, so the card
  height is the taller face; the back face is pre-rotated 180° and
  `backface-visibility: hidden`; the hidden face is `aria-hidden`, so a
  screen reader hears only the visible side; `aria-pressed` reports the
  flip state.
- B05 preserved: native `<button>` semantics (Enter/Space flip for
  free, visible `:focus-visible` outline), the separate native "Flip
  card" button, grade buttons and session/queue logic untouched
  (`test-tier4` B05 updated to the two-branch form: plain button for
  reduced motion + motion.button for the flip).
- Reduced motion: the plain instant-swap native button (same as Stage 2).
- CSS (legacy layer, placed AFTER `.flashcard` on purpose so
  `display: grid` wins over `.flashcard`'s `display: flex` at equal
  specificity): `.flip-scene { perspective: 1200px }`,
  `.flip-inner { display: grid; transform-style: preserve-3d }`,
  `.flip-face { grid-area: 1 / 1; backface-visibility: hidden }`,
  `.flip-back { transform: rotateY(180deg) }`.

### 4.3 Recharts charts (`src/components/AnalysisCharts.tsx`, new; `src/app/analysis/page.tsx`)

- `DueForecastChart`: BarChart from `forecastDue()` — the stored FSRS
  flash state bucketed into the next 7 local calendar days (new +
  already-due cards on day 0; beyond-window cards not counted).
- `AccuracyTrendChart`: ComposedChart — amber bars = questions/day,
  teal line = accuracy % — from `computeStats().daily` (MCQ attempts
  only, first-pass scores; same source as the tables below). Only days
  with attempts are plotted (last 14). With no attempts at all it
  renders `chartNoData` honestly instead of an empty chart.
- Data honesty: no invented data anywhere. The due chart always has 7
  real buckets (possibly all zero — that IS the data). The accuracy
  chart's empty state is text, not a fabricated line.
- Theming: series colours chosen to read on BOTH themes (amber #F5A10B,
  teal #14b8a6, neutral grid/ticks #94a3b8); tooltip uses
  `var(--card)` / `var(--line)` / `var(--ink)` via inline style (var()
  works in inline styles, unlike SVG presentation attributes); chart
  wrappers are `dir="ltr"` so Recharts never mirrors in RTL mode.
- Wiring: analysis page loads the stored flash state read-only in
  `refresh()` (`loadFlashState()`); charts render after the stat grid.

### 4.4 `forecastDue` (`src/lib/tracking.ts`)

- Pure function (takes state, never reads storage):
  `forecastDue(cards, state, now, days = 7)` → 7 ×
  `{ date: "YYYY-MM-DD", label: "MM-DD", due: n }`. Day boundaries are
  LOCAL calendar dates. Tested in `test-flashcards.mjs` (7 checks):
  overdue + new → day 0; due-in-2-days → day 2; beyond-window excluded
  (total 3, not 4); empty bank → 7 zero-count days.

### 4.5 Command Center (`src/app/page.tsx`)

- Same 6 live stats (same data, same values), now shadcn Cards with
  staggered `FadeIn`. Plan card adds a progress bar (`planDone / 63`,
  `role="img"` + aria-label). Quick actions are icon Cards (lucide,
  same 8 links/descriptions). Home counts still come from `COUNTS` via
  `homeIntro` (645 MCQs · 110 notes · 70 flashcards · 19 tracks ·
  20 mocks). Pattern selector, corrections alert, weakest areas, tutor
  health unchanged.

### 4.6 Full shell migration (`src/components/AppShell.tsx`)

- The pathname switch is REMOVED: Sidebar + Topbar + `#shell-main` +
  Footer now wrap EVERY page; children are wrapped in
  `<PageFade key={pathname}>`.
- `src/components/Nav.tsx` is RETIRED but kept in the tree (deleting it
  is a merge-time decision; `test-i18n` still audits its link keys).
- No page needed content changes — the shell is a wrapper; all pages
  keep their full functionality, i18n, RTL isolation and theme
  behaviour (verified: all 15 routes HTTP 200 with the shell, §7).

### 4.7 i18n — 7 new keys, system intact

`src/lib/i18n.tsx`: `planProgressLabel`, `chartDueForecast`,
`chartAccuracyTrend`, `chartNoData`, `chartDueWord`, `chartAccuracyWord`,
`chartQuestionsWord` — all en + roman + ur. Key count: 431 → 438.
`t()` / `tf()` implementations untouched. `test-i18n`, `test-rtl`,
`test-trilanguage` all still pass.

### 4.8 Dark mode + typography polish

- `--muted` keeps its TEXT colours (#5a6b70 light / #9fb3b5 dark);
  the surface mapping uses the separate `--muted-surface` (#efece2 /
  #223236) — the foundation-batch collision is still avoided
  (test-enforced in `test-stage3` §17).
- Charts use theme-safe colours (§4.3); shell/charts use semantic
  tokens (`bg-muted`, `bg-primary`, `text-muted-foreground`), so one
  `[data-theme="dark"]` block drives both systems.
- Noto Sans Arabic ONLY: zero cancelled-font refs in `src/`
  (test-enforced, `test-fonts` + `test-stage3` §6/§17).

## 5. Dependencies (installed versions, observed 2026-11-13)

No new installs. `motion` 14.12.0 and `recharts` 3.10.1 were already
installed in the foundation batch (de-risk only) and are now SHIPPED:
`motion/react` is imported by `src/components/motion.tsx` +
`src/app/flashcards/page.tsx`; `recharts` is imported ONLY by
`src/components/AnalysisCharts.tsx` (enforced by the suite). No peer
conflicts, no pins needed.

## 6. Verification

### 6.1 Build + types
- `npm run build` PASS (21 routes).
- `npx tsc --noEmit` clean (strict).

### 6.2 Suites — 974 checks, 0 failures (baseline 928 → final 974)
All 21 suites green (qa + 20 test:*). Per-suite PASS counts:

| Suite | Checks |
|---|---|
| qa | 52/52 |
| test:scoring | 39 |
| test:reviews | 37 |
| test:retrieval | 28 |
| test:fallback | 24 |
| test:timeouts | 43 |
| test:storage | 38 |
| test:lang | 30 |
| test:guard | 60 |
| test:tier4 | 47 |
| test:provenance | 33 |
| test:backup | 44 |
| test:telemetry | 28 |
| test:fonts | 21 |
| test:i18n | 42 |
| test:rtl | 59 |
| test:trilanguage | 28 |
| test:fsrs | 90 |
| test:flashcards | 46 |
| test:markdown | 20 |
| test:stage3 | 165 |
| **Total** | **974** |

Delta vs baseline (+46): i18n +2 (§7 call-site coverage + countsLine
render), flashcards +7 (forecastDue), tier4 +1 (B05 two-branch form),
stage3 +36 (part-2 sections).

Three test bugs found by running the suites (all fixed IN THE TESTS,
not the source): `test-stage3` §17 redeclared `css` (renamed to
`cssSrc`); the foundation §9/§12 checks asserted the OLD reality
(pathname switch, no shipped motion/recharts) and were rewritten for
part 2; `test-tier4` B05's exact-string regex did not match the new
two-button markup (updated to the two branch forms, including the
`aria-pressed` attribute).

### 6.3 Local prod server (`next start`, port 3101, stopped after)
- HTTP 200: all 15 routes (`/`, `/library`, `/practice`, `/mock`,
  `/mock/1`, `/flashcards`, `/tutor`, `/plan`, `/analysis`, `/tracks`,
  `/tracks/1`, `/topics`, `/vacancies`, `/links`, `/issues`, `/review`).
- Shell on EVERY page: `id="app-sidebar"` present on all 15;
  `class="topbar"` (legacy Nav) present on NONE.
- Defect (a): home HTML contains `<span dir="ltr">0 / 63</span>`.
- Defect (b): review HTML contains
  "Structural check: 186 pass · 14 needs review · 0 problem."
- Home: progress bar (`tw:bg-primary`) + 10 `tw:text-brand-teal`
  icon occurrences (sidebar brand + 8 quick-action icons + 1).
- NOT checkable from served HTML (both pages SSR a loading state
  first; content appears after hydration): the 3D flip markup and the
  chart SVGs/titles. See §8 — real-browser checks post-deploy.
- No key material anywhere in the folder (only `.env.example`,
  inherited template).

## 7. Before / after

| Area | Before (foundation) | After (part 2, stage3 folder only) |
|---|---|---|
| Shell coverage | Home only; 13 pages legacy Nav | All pages in the shell; Nav retired (kept) |
| Animations | None shipped (de-risk only) | PageFade + FadeIn, reduced-motion safe |
| Flashcards | Instant-swap button | Real 3D flip (motion), reduced-motion fallback |
| Analysis | Tables + CSS bars only | + Due-forecast BarChart + accuracy ComposedChart |
| Home dashboard | Plain stat cards + link list | Command Center: shadcn Cards, plan progress bar, icon quick actions |
| Defect (a) | "63 / 0" in Urdu mode | "0 / 63", dir-isolated (proven in served HTML) |
| Defect (b) | countsLine middle count blank | "14 needs review" renders (proven in served HTML) |
| i18n keys | 431 | 438 (+7) |
| Test suites | 21 suites / 928 checks | 21 suites / 974 checks |
| Fonts | Noto Sans Arabic only | Unchanged (zero cancelled-font refs) |
| Content / bank / API | — | Unchanged |

## 8. What remains for the next Stage 3 batch (after this batch merges + deploys)

1. **Merge** this folder into main (owner go-ahead required) + single-commit
   deploy via the GitHub connector; live-verify (including the two defect
   fixes on the live site, in Urdu mode).
2. **Browser checks** (cannot be done by a subagent; parent/owner
   post-deploy): 3D flip animation + keyboard flip on device; chart SVGs
   rendering with real data (due forecast + accuracy trend); sidebar at
   360px; collapse/expand rail; Escape + focus return; theme/language
   switching; RTL drawer direction on device; due-card count vs. the
   flashcards page.
3. **Optional:** delete retired `src/components/Nav.tsx` at merge time;
   `@radix-ui/react-slot` + `asChild` if a later primitive needs it.
4. Known non-blockers carried forward: the mobile drawer filter is hidden
   when the persisted state is collapsed AND the drawer is closed (by
   design — content follows `effectiveCollapsed`); the `tw:bg-background/80`
   color-mix fallback relies on modern browsers (graceful: the plain
   `var(--paper)` fallback rule is emitted first).

## 9. Files changed (stage3 folder only)

NEW: `src/components/motion.tsx`, `src/components/AnalysisCharts.tsx`,
`VERIFY-stage3-part2.md` (this file).
MODIFIED: `src/app/page.tsx`, `src/app/flashcards/page.tsx`,
`src/app/analysis/page.tsx`, `src/app/review/page.tsx`,
`src/app/globals.css`, `src/components/AppShell.tsx`,
`src/lib/i18n.tsx`, `src/lib/tracking.ts`, `CHANGELOG.md`,
`scripts/test-i18n.mjs`, `scripts/test-flashcards.mjs`,
`scripts/test-stage3.mjs`, `scripts/test-tier4.mjs`.
TOUCHED NOWHERE ELSE. Nothing in `~/workspace/etea-prep-next/` was modified.
