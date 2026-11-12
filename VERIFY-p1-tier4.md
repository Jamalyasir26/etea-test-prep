# Stage 1 P1 Tier 4 — Verification Report (2026-11-12, local only, NOT deployed)

Scope: Tier 4 only — UI/accessibility fixes B01–B05. Small targeted
fixes to the existing hand-rolled CSS and components. NO P2 work, NO
Stage 3 work (no shadcn/ui, no Framer Motion, no Recharts, no redesign).
No deploy, no GitHub/Vercel change, no env-var change.
Backup: `~/workspace/etea-prep-next-backup-pre-p1t4/` (flat, diff-verified
identical to the pre-Tier-4 tree, 83 files, node_modules + .next excluded).

Bug sources: the browser audit findings (B01–B05) as listed in the
owner's Tier 4 authorization. The audit reports in this repo
(AUDIT-PHASE1.md / AUDIT-V2.md) do not carry B01–B05 labels; the fix
descriptions below are the owner's Tier 4 list, verified against the
code as it stood before the fixes.

## B01 — Tutor input/buttons overflow at 360px + vacancy table

### What changed (file:line)
- `src/app/tutor/page.tsx:220` — ask-row input `style={{ flex: 1 }}` →
  `style={{ flex: 1, minWidth: 0 }}`.
- `src/app/tutor/page.tsx:253` — "Explain one MCQ" input gains
  `style={{ flex: 1, minWidth: 0 }}` (it had no width style at all).
- `src/app/tutor/page.tsx:257` — explain output `<p>` gains
  `overflowWrap: "break-word"`.
- `src/app/globals.css:74` — `.card` gains `overflow-wrap: break-word`
  (long unbroken strings, e.g. URLs pasted into annotations/issues).
- `src/app/globals.css:127` — `.msg` gains `overflow-wrap: break-word`
  (long URLs in tutor answers).
- `src/app/globals.css:78` — new `.table-scroll` class
  (`overflow-x: auto`, touch scrolling).
- `src/app/vacancies/page.tsx:16` — the 6-column table is wrapped in
  `<div className="table-scroll" role="region" aria-label="Vacancy table"
  tabIndex={0}>` (keyboard-focusable scroll region).
- `src/app/mock/page.tsx:57` — mock mode button row gains
  `flexWrap: "wrap"` (same overflow class: the two long mode buttons
  overflowed at 360px without wrapping).

### Before / after
- Before: flex items refuse to shrink below their content width, so the
  tutor input + Ask button ran off-screen at 360px; the vacancy table
  overflowed the viewport; long URLs in tutor answers pushed the
  message bubble out.
- After: both tutor inputs shrink (min-width: 0) so their buttons stay
  on-screen; the vacancy table scrolls horizontally inside its region
  instead of overflowing the page; long URLs wrap in messages, cards
  and the explain output. Desktop layout is unchanged.

### Tests / inspection
- `scripts/test-tier4.mjs` B01 checks (9): both tutor inputs carry
  minWidth: 0; `.msg`/`.card` wrap; `.table-scroll` exists and wraps
  the vacancy table with region semantics; mock mode row wraps; no CSS
  width/min-width above 360px; no inline numeric width above 328px.
- Local prod server: /tutor HTML contains `min-width:0`; /vacancies
  HTML contains the `table-scroll` wrapper; all 14 pages HTTP 200.
- Honest limit: no real 360px render exists in this environment — the
  360px layout must be confirmed by a post-deploy browser check
  (see "Live verification" below).

## B02 — 299px sticky mobile header → hamburger menu

### What changed (file:line)
- `src/components/Nav.tsx:30-42` — `menuOpen` state + Escape-key
  listener (closes the menu and returns focus to the toggle button).
- `src/components/Nav.tsx:50-60` — native `<button type="button"
  className="nav-toggle">` with `aria-expanded`, `aria-controls=
  "main-nav"`, `aria-label="Navigation menu"`, toggling ☰/✕.
- `src/components/Nav.tsx:62-66` — `<nav id="main-nav">` with class
  `nav open` when open; `onClick` closes the menu on any link click;
  the brand link also closes it.
- `src/app/globals.css:55` — `.nav-toggle { display: none; }` (desktop).
- `src/app/globals.css:155-166` — inside `@media (max-width: 640px)`:
  toggle shown (44px touch target, white outline on the teal bar);
  `.nav` hidden until `.open`, then a full-width vertical list on its
  own row; open links get 44px min-height.
- `src/app/globals.css:144-146` — `:focus-visible` outlines (teal on
  light, light teal on dark, white inside the topbar) so the toggle
  and every other control show keyboard focus. Mouse users see no
  change.

### Before / after
- Before: 14 nav links wrapped into ~299px of sticky header on mobile,
  leaving almost no room for content.
- After: on ≤640px viewports the header shows brand + toggle + controls
  only; the links appear as a vertical list only while the menu is
  open. Desktop layout, link set (all 14 links), language selector and
  theme toggle are unchanged. The toggle is `display: none` on desktop
  (not focusable, no stray tab stop); the hidden nav's links are not
  focusable while closed.

### Tests / inspection
- `scripts/test-tier4.mjs` B02 checks (10): real button with
  type/aria-expanded/aria-controls; nav id + .open class; close on
  link click; close on Escape + focus return; CSS hide/show rules;
  all 14 links present; language/theme controls untouched;
  focus-visible styles present.
- Served HTML (local prod server): home page contains the `nav-toggle`
  button and `id="main-nav"`; the production JS bundle contains the
  toggle with all ARIA attributes.
- Honest limit: the collapsed/expanded behaviour at 360px and the
  Escape/Tab flow need a post-deploy real-browser check.

## B03 — RTL counter reversal ("0/63" → "63/0")

### What changed (file:line)
Every rendered count/fraction is now isolated with an explicit
`dir="ltr"` span (or `<bdi>`-equivalent isolation via the span). Sites:
- `src/app/plan/page.tsx:70` — `{doneCount}/{totalTasks}` (the
  reported "0/63" bug).
- `src/components/QuizRunner.tsx:424` — results score
  `firstPassCount / total (pct%)`; `:447` — raw accuracy; `:456` —
  exam score `examScore / examTotal marks`; `:609` — `Question
  {idx+1} of {total}`; `:614` — timer `{mm}:{ss}`.
- `src/app/mock/page.tsx:89` — `{trusted} of {m.total}` (template
  string restructured to JSX for the span).
- `src/app/mock/[id]/page.tsx:66,70` — trusted-only note counts
  (`{questions.length} of {mock.total}`,
  `{trustedOnlyCount(...)} reviewed`).
- `src/components/QuizRunner.tsx:29,60-63` — `note` prop widened from
  `string` to `ReactNode` so the caller can pass the isolated spans;
  rendered verbatim at the existing alert site. Only mock/[id] passes
  a note; practice/topics pass none.
- `src/app/review/page.tsx:148` — `{verified} / {total}` progress;
  `:201` — `Showing {shown} of {filtered}`; `:257` — `Show 25 more
  ({left} left)` parenthetical.
- `src/app/flashcards/page.tsx:150` — session `{correct}/{total}`;
  `:163` — `Recalled {correct} of {total}`; `:182` — `Card {pos+1} of
  {queue.length}`.
- `src/app/analysis/page.tsx:175,191` — stat-card fractions;
  `:266` — daily `{correct}/{total} ({attempts} attempts)`; `:298` —
  mock-history score; `:335` — attempt score; `:358` — attempt-detail
  `First-pass score {correct}/{total}` (template string restructured
  to JSX; rendered text identical).
- Inspected and deliberately NOT changed: single numbers with units
  (`645 MCQs`, `95 min`, `3 attempts`), dates (`2026-11-11`), bare
  percentages (`95%`) and all-Latin sentences — single LTR runs that
  cannot reorder; aria-label strings (not rendered visually).

### Before / after
- Before: in Urdu (RTL) mode the document direction is `rtl`
  (i18n.tsx sets `document.documentElement.dir`), and fractions
  rendered reversed ("63/0").
- After: every fraction/count renders in logical order in both LTR
  and RTL, because each is an explicit LTR island. LTR rendering is
  byte-identical in appearance.

### Tests / inspection
- `scripts/test-tier4.mjs` B03 checks (8): per-file `dir="ltr"`
  presence/counts at every site above; a sweep that strips comments,
  aria-labels and all `dir="ltr"` spans from every `.tsx` under
  `src/app` + `src/components` and fails if any bare `{a}/{b}`
  fraction remains — 0 remain.
- Served HTML (local prod server): /plan, /review and /mock all
  contain `dir="ltr"` spans in the prerendered markup.

## B04 — Dark green badge contrast 2.22:1

### What changed (file:line)
- `src/app/globals.css:104-105` — dark-mode overrides only:
  `[data-theme="dark"] .badge.green { color: #06231a; }` and
  `[data-theme="dark"] .badge.red { color: #3d0a06; }`, on the same
  bright backgrounds (`--green #4cc38a`, `--red #ff8a80`).

### Contrast audit — ALL badge variants, both themes (WCAG ratio)
| Theme | Badge | Background | Text | Ratio | Verdict |
|---|---|---|---|---|---|
| Light | default (amber) | #F5A10B | #1B272B | 7.28:1 | pass |
| Light | teal | #09555E | #FFFFFF | 8.49:1 | pass |
| Light | red | #B3261E | #FFFFFF | 6.54:1 | pass |
| Light | green | #1E7D46 | #FFFFFF | 5.15:1 | pass |
| Light | grey | #E3E8E7 | #333344 | 9.99:1 | pass |
| Dark | default (amber) | #F5A10B | #1B272B | 7.28:1 | pass |
| Dark | teal | #09555E | #FFFFFF | 8.49:1 | pass |
| Dark | red | #FF8A80 | #3D0A06 | 7.39:1 | **fixed** (was 2.28:1 white) |
| Dark | green | #4CC38A | #06231A | 7.51:1 | **fixed** (was 2.22:1 white) |
| Dark | grey | #2C3F42 | #CFE0E0 | 8.11:1 | pass |

The dark-mode red badge (2.28:1) was a second failure found by the
same audit and fixed the same way; it is listed here, not hidden.
Light-mode pairs already passed and are untouched. The `--green` /
`--red` variables themselves are unchanged (they feed alert borders
and heat dots, which are non-text and out of scope).

### Before / after
- Before: dark-mode green badge white-on-#4cc38a = 2.22:1
  (illegible); dark-mode red badge 2.28:1.
- After: dark foregrounds on the same bright backgrounds, 7.51:1 and
  7.39:1 — both above 4.5:1 for normal text.

### Tests / inspection
- `scripts/test-tier4.mjs` B04 checks (12): the WCAG ratio is
  recomputed in the test for all 10 pairs and asserted ≥ 4.5:1; the
  old 2.22:1 pair is asserted as the documented bug; the override
  rules with the exact fixed hex values are asserted present in
  globals.css.
- Built CSS (local prod build) contains both overrides.

## B05 — Flashcard keyboard fix

### What changed (file:line)
- `src/app/flashcards/page.tsx:197` — the card surface `<div
  className="card flashcard" onClick role="button" tabIndex={0}>`
  (which had NO key handler — Enter/Space did nothing) is now a
  native `<button type="button" className="card flashcard"
  onClick={flip}>`. No aria-label: the card text itself is the
  button's accessible name, so screen readers hear the question /
  answer (an aria-label would have hidden it).
- `src/app/globals.css:139` — `.flashcard` gains `color: var(--ink);
  width: 100%` — required because the global `button` rule sets white
  text, which would be invisible on the card background (the card
  background/border already win by specificity).
- Focus visibility comes from the `:focus-visible` rules added for
  B02 (globals.css:144-146).

### Before / after
- Before: the card surface was focusable (tabIndex) and clickable,
  but Enter/Space did nothing — keyboard users could only use the
  separate Flip button.
- After: the card flips on Enter/Space when focused (native button
  behaviour), with a visible focus outline. The native "Flip card"
  button is preserved untouched, as are the grade buttons and the
  frozen-queue session logic (no tracking.ts change).

### Tests / inspection
- `scripts/test-tier4.mjs` B05 checks (6): native button with
  type + flip handler; no `role="button"`/`tabIndex` hack left; Flip
  card button preserved; no aria-label hiding the card text;
  `.flashcard` ink colour present; grade buttons untouched.
- Production JS bundle contains
  `jsx("button",{type:"button",className:"card flashcard",onClick…})`.
  The card is client-rendered after load, so it is absent from the
  SSR HTML by design (same as before); the source + bundle checks
  above are the evidence.
- Honest limit: the Enter/Space flip and visible focus need a
  post-deploy real-browser keyboard check.

## Full verification (all run after the final file state)
- `npm run build` — PASS (full route table present: 22 routes
  including /_not-found; the "20/20" static-generation counter is
  Next's worker count, not the route count — the table matches Tier 3).
- `npx tsc --noEmit` — clean WITH `strict: true` (unchanged).
- Suites: scoring 39/39, reviews 37/37, retrieval 28/28,
  fallback-chain 24/24, timeouts 43/43, storage 36/36, tutor-lang
  30/30, api-guard 60/60, flashcards 29/29, tier4 46/46 (new),
  qa 52/52. **Total 424 checks, 0 failures.**
- `package.json` — only addition is the `test:tier4` script.

## Regression check (local production server, `next start`)
All 14 pages HTTP 200: /, /library, /practice, /mock, /flashcards,
/tutor, /plan, /analysis, /tracks, /topics, /vacancies, /links,
/issues, /review. Home shows 645 MCQs; nav contains the toggle +
`id="main-nav"`; /tutor HTML contains `min-width:0`; /vacancies
contains the `table-scroll` wrapper; /plan, /review, /mock contain
`dir="ltr"` spans; built CSS contains the nav-toggle, focus-visible,
dark-badge and table-scroll rules. No data files, lib files or API
routes were touched (diff: 12 files changed + 1 new test script).
Code-inspected, unchanged behaviour: library search, theme toggle,
navigation links, Trusted Mode gate, scoring, /review actions, Flip
button, tutor language selector (en/roman/ur/ar), export/import.

## Live verification after deploy (post-deploy browser checks)
1. 360px render (real browser): /tutor ask + explain rows fit with
   both buttons visible; /vacancies table scrolls horizontally
   without page overflow; /mock mode buttons stack; header is short
   with the hamburger visible; opening the menu shows all 14 links
   vertically; no horizontal page scroll anywhere.
2. Hamburger: click opens/closes; link click closes; Escape closes
   and returns focus to the toggle; Tab reaches the toggle and the
   open menu's links; focus outline visible on the toggle.
3. RTL (Urdu) mode: plan "0/63" reads 0/63 (not 63/0); quiz results
   scores, review progress, analysis fractions and mock counts all
   read in logical order.
4. Dark mode: green/red badges readable (dark text on bright badge).
5. Keyboard: Tab to a flashcard, Enter/Space flips it, focus outline
   visible; the Flip card button still works with mouse and keyboard.

## Files changed (vs backup-pre-p1t4)
Changed: `src/app/globals.css`, `src/components/Nav.tsx`,
`src/app/tutor/page.tsx`, `src/app/vacancies/page.tsx`,
`src/app/mock/page.tsx`, `src/app/mock/[id]/page.tsx`,
`src/components/QuizRunner.tsx`, `src/app/plan/page.tsx`,
`src/app/flashcards/page.tsx`, `src/app/analysis/page.tsx`,
`src/app/review/page.tsx`, `package.json` (test script only).
New: `scripts/test-tier4.mjs`, `VERIFY-p1-tier4.md` (this report).
CHANGELOG.md: Tier 4 section appended.
