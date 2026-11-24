# VERIFY — UI/UX Program 2: mobile view + colour combinations (2026-11-24, local; NOT deployed)

Owner order (2026-11-24 ~21:07 PKT): "UI UX par phir se focus karo aor khas tor par mobile view ko improve karo aor behtarin colors combination use karo" — focus on UI/UX again, especially improve the mobile view, and use the best colour combinations. Owner to be told only when complete. No push/deploy (parent handles).

Standing rules honored throughout: no content/count/translation/reviewStatus/localStorage-schema changes; no new user-facing strings (existing i18n keys only); no behaviour changes except the listed items; the 2 English warning banners untouched (factual-precision exception); no file deletions; every change suite-pinned; if a change broke a suite, the change (or a documented deliberate pin update) fixed it — no suite weakened.

Working files (not pushed): `~/workspace/uiux2/` (BRIEF.md, UIUX2-AUDIT.md, W2-REPORT.md, W3-REPORT.md, W4-COLOUR-REPORT.md).

## §1 Mobile audit (W1, read-only)

`~/workspace/uiux2/UIUX2-AUDIT.md` (~56KB): static analysis of every route at 360px + 390px + 430px (no rendered browser available — every live-only item marked VERIFY LIVE). **51 findings: P0 0, P1 7, P2 44 (M01–M51)**, each with severity, file:line, affected width(s), concrete fix, (a)/(b)/(c) classification, plus a route × width table and prioritised fix list. No route overflows horizontally at any width (328/358/398px content widths); longest option 172 chars (PE-290) wraps cleanly; Mock list, Tutor, Issues have zero new findings.

**U1 re-check:** SW1–SW13 all verified present, with two follow-ups fixed in this batch: the mock-mode inline style defeated SW2's dark-mode picked-border fix (M03), and SW3's `dir="auto"` was missed at two home sites (M01). All U1 §13 queue items re-verified still open; all 11 §12 owner proposals confirmed unimplemented (including `Nav.tsx` still shipped).

**Brief-nit corrections (audit §4):** (1) "Fresh tab renders Roman while selector shows English" is NOT reproducible from code — initial state is `"en"` (`i18n.tsx:1764`), stored language applies only post-mount, so a fresh tab renders English first, then flips; selector and content read the same `lang` state and cannot disagree. Needs live reproduction (bfcache/restore candidate) — VERIFY LIVE. (2) "0/63کام مکمل" implies a missing space, but the source contains an explicit `{" "}` (`plan/page.tsx:146-148`); any gap loss on-device is a bidi rendering effect, not missing source text. (3) Confirmed with exact evidence: back-nav hides the feedback panel (`goTo` sets `revealed=false` — unchanged, see §8); photosynthesis arrows confirmed at flashcard 53 `back_ur` (6 distinct arrow strings in `content.json`, 0 in banks — owner decision, not fixed); /analysis ISO dates still present (standing Phase 2 exception); flashcard Roman instruction line keeps English grade names at `flashIntro.roman` (`i18n.tsx:683-685`) while the buttons are correctly localised (Dobara/Mushkil/Achha/Asan — owner decision, not fixed).

## §2 Colour palette (W4, `globals.css` only)

Full report: `~/workspace/uiux2/W4-COLOUR-REPORT.md` — before/after table with hex + ratios, full measured contrast table (all text + non-text pairs, both themes), deliberately-unchanged list with reasons, exact line numbers.

**5 measured AA failures fixed (WCAG formula, not eyeballed):**

| # | Pair | Before | After | Rule |
|---|---|---|---|---|
| 1 | Dark accent foreground on amber (shadcn ghost/outline buttons, sidebar nav hover, badge outline) | 1.81:1 (`#e8efef` on `#f5a10b`) | **7.28:1** — new theme-invariant token `--on-amber: #1b272b` (both themes); `--color-accent-foreground` maps to it instead of theme-dependent `--ink`. Light rendering pixel-identical. | 4.5:1 text |
| 2 | Light chart-2 | `#f5a10b`, 2.10:1 vs card | **`#b45309`, 5.02:1 vs card** (U1 F3.3 / §12 proposal #1 value — it genuinely failed non-text contrast, so the fix is in scope with before/after documented). Dark keeps `#f5a10b` (7.41). Brand `--amber` unchanged. | 3:1 non-text |
| 3 | Light `--border` | `#a9b8b9`, 2.05:1 vs card | **`#7a8b8c`, 3.56:1 vs card / 3.43:1 vs paper**; dark `#587276` already passes, unchanged. Now actually wired: legacy form controls, `.opt` borders, shadcn `--color-input` use `--border`; `--line` stays the decorative hairline, `--color-border` stays on it. | 3:1 non-text |
| 4 | Light alert border | `var(--amber)`, 2.10:1 vs card | **`#b45309`, 5.02:1 vs card** (4.67 vs tint); dark keeps brand amber via a new override placed before `.alert.red/.green` (7.41). | 3:1 non-text |
| 5 | Dark `.opt:hover` border | 1.84:1 | **9.14:1** — new `[data-theme="dark"] .opt:hover { border-color: #7fd4d8; }`, following the existing `.opt.picked` pattern. | 3:1 non-text |

**Also:** `--yellow` aligned to `--status-warning-text` in both themes (`#7a4b00` / `#ffd166`) — unused token, zero render change, removes the duplicate warning yellow. New info pair `--status-info-bg/text` (light `#dbeafe`/`#1e40af` 7.15, dark `#172554`/`#bfdbfe` 10.34) + `.sbadge-info` rule; no component renders it yet. **All brand tokens byte-identical** (suite-pinned brand guard, 18 checks).

**M09:** mobile `.container` `padding-bottom: 120px` → `48px` at ≤640px (footer is its only `.container` user, verified by grep; the 72px spacer now covers the player; was ~192px stacked gap). Desktop padding unchanged.
**M30:** new `[dir="rtl"] h1, h2, h3 { line-height: 1.5; }`; base 1.3 rule byte-identical, so LTR rendering is unchanged.

**Chart bars (W3 follow-up to W4's flag):** W4's token change did NOT fix the rendered bars — both charts hardcoded `fill="#F5A10B"` and the questions bar at 35% opacity was ≈1.30:1. W3 made both bars theme-aware (`#b45309` light / `#f5a10b` dark, matching W4's `--chart-2` token) and raised questions-bar opacity 0.35 → **0.8**. Measured (WCAG): due bar 5.02:1 light / 7.41:1 dark; questions bar effective 3.54:1 light / 5.21:1 dark — all pass 3:1 (before: 2.10 / 1.30 / 2.04). 0.8 is the lowest round opacity passing both themes (0.7 fails light at 2.95:1).

## §3 Mobile + polish fixes (W2 quiz/mock, W3 shell/content)

Full reports: `~/workspace/uiux2/W2-REPORT.md`, `~/workspace/uiux2/W3-REPORT.md` (per-fix before/after file:line).

**W2 (QuizRunner, mock/[id], mock list, practice):**
- **M03 (P1)** — deleted the mock picked-option inline style (`borderColor: "var(--teal)"`); `.opt.picked` + dark `#7fd4d8` override now apply in mock mode (was 1.84:1 dark).
- **M19 (P2)** — `setNow(fresh)` in `beginFresh()`, `setNow(Date.now())` in `beginResume()` (+ the same one line in `restart()`, same deadline mechanism — flagged as a trivial extension beyond the audit's named functions, revertible); timer opens at 100:00, never 100:01. `secondsLeft` still derives from the same `now` state; 1s tick unchanged.
- **M04 (P1)** — `mock/[id]` renders `noQuestions` + existing `backToMocks` link when `questions.length === 0`.
- **M27 (P2)** — success path renders `backToMocks` above `QuizRunner` (props byte-identical); link now in all 4 branches.
- **M25** — practice timed-toggle label row `minHeight: 44` (audit M29 is the library opt-in; the practice toggle is audit M25).
- **M26 (P2)** — revise-empty state gets a next-action button reusing `practiceModeStandard`, switching mode to standard. Existing strings only.
- **M24** — IssueForm checkbox label `minHeight: 44`.
- §1.3 re-check: the only (a) items for W2's files were M03/M19, both done. M06/M18/M20/M21/M22/M23 explicitly not done.

**W3 (home, review, library, flashcards, analysis, plan, tutor, issues, topics, tracks, vacancies, AppShell, Sidebar, ShellTopbar, StickyPlayer):**
- **M01 (P1)** — both `cardsDueNew` spans `dir="ltr"` → `dir="auto"` (`page.tsx:243,407`).
- **M02 (P1)** — brand text hidden below 400px, icon kept (`ShellTopbar.tsx:45`); **M11** — brand links `tw:min-h-11` (topbar + sidebar).
- **M14/M15** — correction-compact button in its own `<p>`; Start Here actions in a wrapping flex row.
- **M05 (P1)** — review filters generated from `VISIBLE_MOCKS` (24 mocks + zam1+zam2 pool + "all"); 7 old labels kept verbatim, other 17 use resolved mock titles — no new strings.
- **M32/M33/M34/M37** — flashcards: composition numbers LTR-isolated; faces `text-align: start` (inline, since globals.css is W4's); flip mirrors in RTL (−180° in Urdu); none-due state gets a cram action (existing `cramLabel`).
- **M28** — library no-match gets a clear-search action (reuses `searchAllSubjects` — no "clear search" key exists; wording choice flagged).
- **M45/M46** — plan fraction+label in one `dir="auto"` span; task rows 44px hit areas.
- **M38/M39/M41/M42/M44** — analysis pass: chart tables in `.table-scroll` regions; forecast empty state; last-14 span auto/56px; item-table columns max-width 320; history rows keyboard-accessible + 44px.
- **M10** — chart summaries 44px (inline); **M13** — StickyPlayer loading state (existing `loading` key + disabled toggle); **M08** — spacer `calc(72px + env(safe-area-inset-bottom))`, no `viewport-fit=cover` added.
- **Chart fills** — see §2 (theme-aware bars + opacity 0.8).

**Not done (with reasons):** M16 (TutorHealth summary retry — `TutorHealth.tsx` outside W3's files); M13 NoteAudioExamples half (component outside W3's files); M29 library checkbox row (a (b) item not in the W3 assignment). M17/M30/M47/M50 and all other listed OUT items untouched. M30 was done by W4 (globals.css).

## §4 Deliberate assertion updates (adjudicated by coordinator, none weakened)

4 existing suites failed after the merge + UI work. Each failure was inspected; every one traces to a deliberate UI/UX2 change. Updates keep each check's original intent and strength on the unchanged parts:

1. **`test-phase3-timed.mjs`** — "(b) mock picked style still mock-only" asserted `mode === "mock" && isPicked` (the M03 inline style). Replaced with a pin asserting the unified style: no mock-only inline style remains AND `cls += " picked"` + the "in both modes" comment are present. The guard's intent (no over-replacement) is preserved in its new form.
2. **`test-step3a.mjs`** — "review: mock filters reference visible mocks only" asserted literal mock ids in the review page. M05 generates filters from `VISIBLE_MOCKS`, so literals no longer appear. Pin now asserts generation from `VISIBLE_MOCKS` + `"zam1+zam2"` pool, and that no hidden-mock literal (`"jc"`, `"co"`, `"pc"`, `"forest"` — 0 occurrences in the file) appears.
3. **`test-tier4.mjs`** — B05 reduced-motion branch regex matched the button without a `style` attribute. M33 added `style={{ textAlign: "start" }}`. Regex now allows that optional attribute; native button + type + flip handler + aria-pressed still asserted.
4. **`test-stage3.mjs:347` + `:240`** (W3) — chart-fill literal pin updated to the theme-aware fills; flip-direction pin updated for M34. **`test-uiux.mjs:176`** (W3) — M02/M11 brand pin. **`test-rtl.mjs:112`** (W3) — M42 cells. **`test-uiux.mjs` SW4 pin** (W4) — alert border `#b45309` + dark-override check. **`test-contrast.mjs`** (W4) — one deliberate pin update: light `--border` `#a9b8b9` → `#7a8b8c`; plus the brand guard and all changed-pair ratios.

**W2 mid-edit note:** W2 reported a build/tsc failure in `page.tsx`/`plan/page.tsx` observed while W3 was still editing those files (TS1005/TS1382, TS2657). W3 fixed the syntax errors in its own pass; the coordinator's final build + tsc are clean (§5).

## §5 Checks

- **Full battery: 4738 checks / 69 suites, ALL GREEN** (half 1: 1791/0; half 2a: 1071/0; half 2b: 1824/0; qa-540: 52/52. Baseline 4581/68 + new `test-uiux2.mjs` 70 + contrast/uiux growth + adjudicated pins = 4738 exactly). Run in halves/chunks with `/tmp` `*-data` cleanup between chunks (512M tmpfs). The 3 post-merge failures (§4 items 1–3) were found by the coordinator's battery run and fixed as documented above; both affected chunks were re-run green.
- **New suite:** `scripts/test-uiux2.mjs` (70 checks: W2 21 + W3 49, incl. negative assertions — inline style gone, timer initial value, back link present; fail-proof verified by temp-revert: exactly 3 failures for M03+M19, restored byte-identically). Wired in `package.json` (`test:uiux2`).
- **`npm run build`: PASS** (20/20 routes). **`npx tsc --noEmit`: clean.**
- **Production smoke** (fresh `next start` port 3112, stopped by killing the next-server child PID 13145, port verified free): 11 routes HTTP 200 (`/`, `/practice`, `/mock`, `/review`, `/library`, `/flashcards`, `/analysis`, `/plan`, `/tutor`, `/issues`, `/topics`); home HTML carries "8000 MCQs · 301 notes · 70 flashcards · 12 teaching post tracks · 24 mocks"; built CSS contains `padding-bottom:48px`, RTL `line-height:1.5`, `#7a8b8c`, `#b45309`, `--on-amber`; zero server errors. Limit: HTTP/CSS-level only — rendered-DOM checks at 360px and the VERIFY LIVE items (§8) are the parent's pass after deploy.
- **Diff vs remote HEAD `a5a384d1`** (fresh read-only clone): 25 files — 20 worker files (package.json, globals.css, 9 pages, 5 components, 5 suites + new test-uiux2.mjs) + 3 coordinator suite adjudications (test-phase3-timed, test-step3a, test-tier4) + this report + CHANGELOG. No data/content/bank/manifest change — counts stay 8000/301/70/24 everywhere.

## §6 Files changed (25)

Source (14): `src/app/globals.css`, `src/app/page.tsx`, `src/app/practice/page.tsx`, `src/app/mock/[id]/page.tsx`, `src/app/review/page.tsx`, `src/app/library/page.tsx`, `src/app/flashcards/page.tsx`, `src/app/analysis/page.tsx`, `src/app/plan/page.tsx`, `src/components/QuizRunner.tsx`, `src/components/AnalysisCharts.tsx`, `src/components/ShellTopbar.tsx`, `src/components/Sidebar.tsx`, `src/components/StickyPlayer.tsx`. Suites (7 modified + 1 new): new `scripts/test-uiux2.mjs`; modified `test-contrast`, `test-uiux`, `test-rtl`, `test-stage3`, `test-phase3-timed`, `test-step3a`, `test-tier4` — plus `package.json` (`test:uiux2`), this report, and the CHANGELOG entry. Total 25 files. (`src/app/mock/page.tsx` was W2-owned but needed no change — byte-identical, not in the push set.)

## §7 Counts

Unchanged everywhere: 8000 MCQs, 301 notes, 70 flashcards, 12 tracks, 24 mocks. UI/UX2 is styling + layout + navigation only.

## §8 Flags / verify-live items for the parent's live pass

- **VERIFY LIVE (phone, 360px):** M02 topbar @360 offline; M09 footer clearance @360; M30 wrapped-Urdu-heading relief; M32 stat-line number placement in Urdu mode; M45 "0/63کام مکمل" gap (source has the space — check the render); M34 RTL flip direction feel; M08 notch overlap; M19 timer opens at 100:00 (not 100:01); M40 Recharts X-axis crowding @360 (14 points in 296px — no fix in this batch, needs a phone render to judge).
- **Not fixed in this batch:** M16 TutorHealth summary retry + M13 NoteAudioExamples loading half (components outside the assigned file sets); M29 library checkbox row; M06 live-score suppression, M07 chart amber as a brand decision (token fixed on contrast grounds only — see §2), M21 results next actions, M23 review filter/collapse, M31 Roman `flashIntro` wording, M36 photosynthesis arrows, M43 ISO dates, M48/M49 topics layout, M51 vacancy ledger navigation, M35 flashcard progress + flip hint, M12 pre-hydration lang/dir/theme, M20 sticky timer, M22 Next hint (new string — forbidden by the brief). All 11 U1 §12 owner proposals remain unimplemented.
- **Dark `--border` passes at only 3.03:1 vs card** — kept per minimal-change rule (W4); if dark borders are ever touched, raise to `#6b8a8e` (4.20:1, measured).
- **Library clear-search wording:** M28 reuses `searchAllSubjects` as the action label (no "clear search" key exists) — the owner may find the wording odd; a dedicated key would be a new string.
- **W2's `restart()` timer line** is a trivial extension beyond the audit's named functions (same deadline mechanism) — revertible by deleting one line.
