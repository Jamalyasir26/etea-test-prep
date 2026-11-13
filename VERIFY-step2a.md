# VERIFY — Step 2a: UI shell upgrades (report-driven)

**Scope:** the 7 UI-shell items from the owner-supplied report
(`~/workspace/user/files/ETEA_Personal-Use_Improvement_Research_Report__1__0_x0sr.md`,
P1 mobile/accessibility + semantic color system + Home/navigation sections),
implemented locally in `~/workspace/etea-prep-next/` on top of the merged +
deployed Stage 3 tree (commit e44e720). **No push, deploy, GitHub, Vercel,
or env change was made** — the parent handles the push (approval card),
deploy, and live browser verification.

**Backup:** `~/workspace/etea-prep-next-backup-pre-step2/` (excluding
`node_modules`, `.next`, `tsconfig.tsbuildinfo`), diff verified empty before
any change. Final diff vs backup: **24 modified + 4 new files** (list in §9).
No bank/content data changed; no files deleted (push_files-compatible).

**Reconciliation (already-fixed work NOT rebuilt):** the "0/63" RTL defect
(regression-tested, §6), Tier 4 badge contrast (verified by computation +
token-normalized, §2), the mobile drawer (hardened, §4), the flashcard
keyboard surface (smoke-tested, §7). The tutor's B01 `min-width: 0` input
rows were verified present and left untouched.

## 1. Semantic status badges

**New label functions — `src/lib/data.ts`:**

- `reviewStatusBadge(status, lang)` (:222) — every item gets a badge;
  Draft is the honest default; unknown strings map to Unknown, never to a
  trusted-looking tone. Owner-reviewed/Approved use tone `reviewed` with
  the detail "personal review, not official certification" — never the
  success green.
- `topicBadge(pastPaperRef, lang)` (:436) — null without a ref; label
  always leads with "Topic-inspired"; English detail is the stored ref
  string verbatim (the standing disclosure); Urdu detail is the matching
  Urdu disclosure.
- `trackConfidenceBadge(conf, lang)` (:518) — label is the stored `conf`
  string verbatim in every language; tone derived from the string's own
  words: `JOB-SITE` or starting with `NOT VERIFIED` → Unknown; `NOT
  VERIFIED` later in the string (Qari: pattern confirmed, qualification
  not) → Partial; otherwise → Source Confirmed. The home pattern
  selector reuses this function (MD variant → Unknown, B/A → Official).
- `CORRECTIONS_VERSION = 1` (:552) — bump when a CORRECTIONS line or the
  banner changes; the home notice re-shows in full.

**Renderer — `src/components/StatusBadges.tsx` (new):** `StatusBadge`
(text + lucide icon + `title` + `aria-label` with the full detail, so the
explanation is never hover-only), `ReviewStatusBadge`, `TopicBadge`,
`TrackConfidenceBadge` (label isolated LTR). 9 tones, one icon each;
proxy (dashed border) and unknown (dotted border) differ from their
families by border style as well as text/icon — hue is never the only
signal.

**Application sites (before → after):**

| Site | Before | After |
|---|---|---|
| Library | `.badge` provenance, hue + short label | Upgraded `ProvenanceBadge` (same API, semantic renderer) — automatic |
| QuizRunner question header | Plain "Original"/"Reworded" badge | `ReviewStatusBadge` (effective status: bank + this device's /review decisions, loaded after mount per the B07 rule) + `TopicBadge` + `ProvenanceBadge` |
| QuizRunner results screen | Red "Provisional" / **green** "Verified" | Semantic badges: provisional → draft tone, verified → **reviewed** tone (never success green). `showProvisionalBadge` logic untouched |
| Mock cards | No coverage signal | Coverage badge from the real trusted count (0 → Draft, some → Partial, all → reviewed) + "Scoring policy unknown" badge when the mock has no own config (19/20). Start flow + scoring untouched |
| Tracks list + detail | Green/red merge on the conf string | `TrackConfidenceBadge`, same verbatim text. Served HTML: 17 official + 1 partial (Qari) + 1 unknown (Rescue) |
| Home pattern selector | Green/red badge | `TrackConfidenceBadge` (MD → Unknown) |

`/review` was deliberately NOT touched (review workflows are out of scope
for 2a); it renders `ProvenanceBadge`, so it gets the new renderer
automatically with no workflow change.

## 2. Semantic color tokens + computed contrast

**`src/app/globals.css` (:311):** a Step 2a token section appended AFTER the
legacy block (which stays contiguous and verbatim). Tokens alias the brand
variables where values match (`--surface-page: var(--paper)` etc.); values
that differ from legacy variables (`--border #A9B8B9`, dark
`--surface-card #172326`, dark `--text-secondary #B5C5C7`) are exactly the
report's values and are used by NEW styles only — legacy components keep
rendering from `--line`/`--card`/`--muted` unchanged. New: `.sbadge-*`
classes (:~380), `.shell-nav-active` (selected surface + 2px logical
border, :404), `select { max-width: 100% }`, and a flex-input
`min-width: 0` guard.

**Focus decision (documented, computed):** the report suggests purple
(`#7C3AED`, 5.49:1 light). The existing teal was KEPT and tokenized as
`--focus-ring` (`:focus-visible` rule, :289; B02 test updated): teal
computes **8.19:1** (light) and **10.45:1** (dark) — HIGHER than purple
in both themes, brand-consistent, zero visual churn. The contrast suite
asserts this ordering, so the decision is test-enforced, not just noted.

**Contrast verification — `scripts/test-contrast.mjs` (new, 78 checks):**
parses the ACTUAL token values from the CSS, resolves `var()` aliases,
computes WCAG ratios at full precision, and asserts thresholds without
rounding. Results: **every one of the report's 20 claimed ratios
reproduces within ±0.1** (most exactly 0.00); all text pairs ≥ 4.5:1;
reviewed pairs 7.80:1 (light) / 10.33:1 (dark); neutral pairs 9.99:1 /
8.11:1; focus ≥ 3:1 and beats purple in both themes; disabled pairs
reproduce 4.24:1 / 3.58:1 and clear 3:1 (WCAG exempts inactive elements —
documented in the suite); the old 2.22:1 badge value is reproduced AND
asserted to still fail 4.5:1 (proving the test can fail), while the
current dark success pair passes at 9.29:1.

## 3. Home "Start Here" card + metric denominators + correction notice

**`src/app/page.tsx`:** the Start Here card (:170) is the first card after
the intro (before the stats grid). It renders only once stats load, so it
never flashes the wrong variant.

- **Fresh learner** (no stored activity): Start topic practice / Choose
  mock / Build study plan.
- **Returning learner** (any real stored activity: attempts, flashcard
  reviews, plan progress, or a live session): Resume/Continue + Review due
  cards + Continue plan — all from real state, never fabricated.
- **Resume honesty:** mock scopes resume deterministically (the mock
  detail page reads the live session for that exact scope) and are
  labelled "Resume: {title}". Practice scopes link to the subject page,
  which resumes only when its stored subject/round still matches, so the
  label says "Continue practice: {subject}" — never "Resume". Any other
  scope falls back to starting topic practice (no guessing).
- **Next task:** a read-only scan of stored plan state in PLAN21 order
  (positional `d{di}-t{ti}` ids read, never changed); "Study plan
  complete" when all 63 are done.
- **Metric denominators:** attempts card shows MCQ + flashcard split;
  accuracy shows the first-pass sample (`{correct} of {total}`) or "No
  answers yet"; streak states its rule ("Consecutive days with any
  study"); time states its scope ("Across all attempts"); due-cards card
  shows the New/Due split. The empty state (no attempts) now has an
  immediate "Start topic practice" action, not just zeros.
- **Correction notice, versioned:** full on first visit (matches the
  server HTML, B07-safe), compact + reopen control once version 1 is
  acknowledged (`etea_corrections_ack_v1` stores the version; a bump
  re-shows the full notice). The notice is NEVER removed: the compact
  form keeps the heading, the pattern banner, and a "Show full notice"
  control; reopening shows the full text without clearing the
  acknowledgement. The plan bar is now `role="progressbar"` with numeric
  values; the time card's duration is isolated LTR.

**New tracking helpers — `src/lib/tracking.ts` (additive, read-only):**
`liveSessions()` (:896, same liveness rules as `loadSession`, most recent
first) and `countFlashcardBuckets()` (:700, the New/Due split behind
`countDueFlashcards`, same in-memory-migration read; `fresh + due ===
countDueFlashcards`, future-due cards in neither bucket). Both covered by
real-function tests with stubbed storage (§8 of test-step2a).

## 4. Navigation groups + drawer hardening

**`src/components/Sidebar.tsx`:** the 14 links now carry a `group` field;
Home stays top-level; groups Study / Progress / Exam Resources / Quality
render as labelled groups (`role="group"` + `aria-labelledby`, headings
hidden in the collapsed rail, empty groups hidden when filtering). **The
report's group list omits Tutor** — Tutor is placed in Study (a study
tool, grouped with the other study surfaces); this placement is
documented in the code and asserted in tests. The filter label is
unchanged ("Filter navigation"). Active route uses `.shell-nav-active`
(selected surface + 2px logical border + `aria-current`) instead of the
old `bg-primary/10` tint. Drawer hardening: **focus trap** (Tab cycles
inside the drawer), 44px minimum touch targets on links (`tw:min-h-11`),
44px close button, and `motion-reduce:transition-none` (instant under
reduced motion). Escape + focus-return preserved.

**`src/components/ShellTopbar.tsx`:** hamburger bumped to 44px
(`tw:size-11`).

**`src/components/AppShell.tsx`:** the main + Footer region is
`inert={mobileOpen}` while the drawer is open. The Topbar is deliberately
OUTSIDE the inert region: Escape closes the drawer and returns focus to
the hamburger in the same tick, and focusing an inert element is a no-op
(the trap keeps Tab inside the drawer, so the Topbar controls are
unreachable by keyboard while it is open).

## 5. 360px overflow (report P1.1)

- **Library** (`src/app/library/page.tsx`): search input `flex: 1` +
  `min-width: 0`; save row wraps.
- **Issues** (`src/app/issues/page.tsx`): filter input `flex: 1` +
  `min-width: 0`.
- **Tutor**: B01 `min-width: 0` verified present on both input rows —
  NOT rebuilt.
- **Home pattern select:** fits its card via the global
  `select { max-width: 100% }` rule.
- **Scroll regions** (all `role="region"`, `tabIndex={0}`, labelled,
  with the visible "This table scrolls horizontally on narrow screens."
  caption): vacancies (caption added to the existing region), issues (2:
  issues + telemetry), analysis (4: per-subject, mock history, all
  attempts, 10-column item records), QuizRunner results (1: per-subject).
- **Never `body { overflow-x: hidden }`:** asserted absent from the whole
  stylesheet; `.table-scroll` keeps `overflow-x: auto`.
- **Long URLs:** the links page renders names only (no raw URLs) —
  unchanged; no new raw-URL rendering was added anywhere.
- Real 360px verification remains the owner's phone check after deploy
  (see §8).

## 6. RTL suite

- **All 8 `minsLabel` renders isolated** (`dir="ltr"`): home time card,
  plan task labels, QuizRunner results line, analysis (time stat,
  mock-history, attempt detail), mock cards, track detail cards. Each
  site is asserted in test-rtl with a tight 120-char window.
- **Percentages isolated:** analysis per-subject accuracy cell, chart
  data-table accuracy cells. BPS values, dates, URLs, and English
  subject names were already isolated and remain so (existing test-rtl
  checks still pass).
- **Icons:** `scaleX(-1)` appears exactly once in the stylesheet, on the
  collapse chevron only (`.shell-flip-rtl`) — meaning icons (check /
  warning / error) are never flipped. Asserted.
- **"0 / 63" regression:** the home plan fraction stays an isolated
  span; asserted in test-rtl AND test-step2a. (Live proof needs the
  browser — the stat renders post-hydration, per the Stage 3 merge
  correction; curl cannot prove it.)
- English fallback labelling of English source text was NOT done: that
  is content-translation scope, explicitly out of scope for 2a.

## 7. Keyboard / ARIA

- **Library reveal:** one button with `aria-expanded` + `aria-controls`
  (stable sanitized id `note-body-{index}-{key}`); the body is always
  rendered and hidden with the `hidden` attribute (was a conditional
  render with two different buttons). Served HTML confirms:
  `aria-expanded="false"`, matching `aria-controls`/`id`, `hidden`.
- **Progress indicators:** home plan bar, plan page bar, and both
  QuizRunner bars are now `role="progressbar"` with `aria-valuenow/min/
  max` + labels. The analysis daily bars are decorative with the
  adjacent fraction + attempts text as the alternative
  (`aria-hidden="true"` on the bar).
- **Chart alternatives:** both Recharts charts carry `role="img"` +
  `aria-label`, with a `<details>` data table holding the SAME data
  (forecast: date + due; trend: date + accuracy + questions). Home has
  no Recharts charts (only the plan bar, now a progressbar) — nothing
  to add there.
- **Flashcard keyboard smoke test:** native `<button>` in both branches
  (plain + motion.button), `aria-pressed` on both, native Flip fallback
  kept, no `role="button"`/`tabIndex` hack. The surface itself was NOT
  rebuilt.

## 8. Verification

**Build + types:** `npm run build` PASS (20/20 static pages, 12.9s
compile, no errors) + `npx tsc --noEmit` clean (strict).

**Suites — 23 green, 1249 checks, 0 failures** (baseline 974 → +275):

| Suite | Checks | Change |
|---|---|---|
| qa, scoring, reviews, retrieval, fallback, timeouts, storage, lang, guard, tier4, provenance, backup, telemetry, fonts, i18n, trilanguage, fsrs, flashcards, markdown, stage3 | 52/39/37/28/24/43/38/30/60/47/33/44/28/21/42/28/90/46/20/165 | unchanged counts, all green |
| test-rtl | 72 | +13 (duration isolation ×8, percentages ×2, chevron rule, 0/63 regression, library ARIA) |
| test-contrast (NEW) | 78 | token parsing + computed ratios + claims + 2.22:1 regression |
| test-step2a (NEW) | 184 | badge functions (real data.ts), components, tokens, nav, home, overflow, ARIA, tracking helpers (real tracking.ts) |

**Test updates for intended behavior changes (4 assertions, all
documented in-code):** test-tier4 B02 (focus rule now `var(--focus-ring)`),
test-provenance (null guard now `!badge || !sourceKind`), test-rtl library
body + home confidence badge (new markup / new component).

**i18n:** 46 new keys (445 → 491; the merge report's "438" was stale —
both files were counted directly), every key with en + ur (roman added
for short chrome labels). test-i18n green, including the §7 tf() call-site
scanner over the 6 new tf() call sites. Noto Sans Arabic only (test-fonts
green, 21/21).

**Local prod server (port 3100, stopped after):** all 16 routes HTTP 200
(including `/mock/tt-B` and `/mock/zam1`; 0 server errors). Shell
(`#app-sidebar` + skip link) on every checked page. Served HTML confirms:
nav group headings (Study/Progress/Exam Resources/Quality); counts
unchanged ("645 MCQs · 110 notes · 70 flashcards · 19 post tracks ·
20 mocks."); correction notice in full form with the Acknowledge button;
library reveal ARIA; track badges 17 official / 1 partial / 1 unknown;
mock badges (1 draft + 19 partial coverage, 19 scoring-unknown — the
partial counts come from the 15 bank-verified items spread across mocks);
vacancies scroll caption; /review "200 items — 185 draft · 0 needs review
· 0 disputed · 15" (15/200 intact; the "14 needs review" figure needs
stored local decisions, i.e. a browser, as before).

**NOT verifiable by curl (honest, needs the browser post-deploy — same
gaps as Stage 3, pre-existing SSR behavior, not 2a regressions):** the
Start Here card + stats (render after mount); the chart SVGs + data
tables (the analysis page SSRs a loading state first); QuizRunner
progressbars/badges (practice + mock detail are Suspense-gated and render
after hydration); the drawer trap/inert behavior; 44px targets and 360px
overflow on a real phone; Urdu-mode "0 / 63" on the hydrated page. All
are covered at source level by the suites above; the parent's live
verification + the owner's phone check close them.

## 9. Files changed (28)

**Modified (24):** `CHANGELOG.md`, `package.json` (2 new test scripts),
`scripts/test-provenance.mjs`, `scripts/test-rtl.mjs`,
`scripts/test-tier4.mjs`, `src/app/globals.css`,
`src/app/analysis/page.tsx`, `src/app/issues/page.tsx`,
`src/app/library/page.tsx`, `src/app/mock/page.tsx`, `src/app/page.tsx`,
`src/app/plan/page.tsx`, `src/app/tracks/[id]/page.tsx`,
`src/app/tracks/page.tsx`, `src/app/vacancies/page.tsx`,
`src/components/AnalysisCharts.tsx`, `src/components/AppShell.tsx`,
`src/components/ProvenanceBadge.tsx`, `src/components/QuizRunner.tsx`,
`src/components/ShellTopbar.tsx`, `src/components/Sidebar.tsx`,
`src/lib/data.ts`, `src/lib/i18n.tsx`, `src/lib/tracking.ts`.

**New (4):** `VERIFY-step2a.md`, `src/components/StatusBadges.tsx`,
`scripts/test-contrast.mjs`, `scripts/test-step2a.mjs`.

**Untouched, as required:** all bank/content data, tutor logic/prompts,
flashcard scheduler, plan structure/task IDs, analysis computations,
issues/review workflows, QuizRunner session/scoring logic, mock start
flow, content translations. No item was left out of the 2a scope; nothing
was stopped midway.
