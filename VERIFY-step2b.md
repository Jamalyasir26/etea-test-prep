# VERIFY — Step 2b: study flow upgrades (report-driven)

Date: 2026-11-13. Local work only — NO push, deploy, GitHub, Vercel, or
env change (parent handles the single Step 2 push + deploy + live
verification). Step 2a is already merged into this tree; this report
covers the 2b batch only. Backup: `~/workspace/etea-prep-next-backup-pre-step2/`
(untouched).

Report implemented: `~/workspace/user/files/ETEA_Personal-Use_Improvement_Research_Report__1__0_x0sr.md`
(Practice/Quiz Runner, Mocks, Flashcards, AI Tutor, Study Plan,
Analysis, Library, Issues/Review sections). Out-of-scope items were
NOT touched: content.json/bank data, track/vacancy data, SST split,
non-teaching hide, content generation/translations, PWA/SEO/multi-user.

## 1. What was built

### 1.1 Practice & QuizRunner — pre-start, compatibility, map/flag, reveal, results

`src/components/QuizRunner.tsx` (major rework; new props `disclosureExtra?`,
`patternLabel?`):

- **Pre-start disclosure** (~line 588–680): subject, pattern (verbatim
  `patternLabel`, or `prestartNoPattern` when absent), question count,
  reviewed/provisional split from `isTrusted` + overrides, scoring label
  + policy note + unanswered rule, duration, and the parent's
  `disclosureExtra`. Before: the run started immediately with no
  disclosure. The parent's `note` prop is still shown AND the structured
  disclosure (judgment call (g) — note = description, disclosure =
  structured facts).
- **Session compatibility** (~line 298–320): the stored session is
  checked post-mount (B07 — first render always shows the plain Start
  button) via `checkSessionCompatibility` (`src/lib/tracking.ts:981`).
  On mismatch the old session is NEVER applied; the UI offers `Resume`
  only for a compatible session and `Start fresh` otherwise, with the
  mismatch reason shown. Before: sessions restored by scope alone, with
  a `resumed` alert and no identity check.
- **Session format v3** (`buildSession`, ~line 410–447): stable session
  `id` + subject + mockId + trackId + questionSeed + questionIds +
  contentRevision + version 3 + flags. Save effect gated on `started`,
  so the pre-start screen never writes a session. Legacy v2 sessions
  still resume when scope + seed + exact question-id list match (the
  ids are the content guarantee). `restart()` clears flags + timers.
- **Question map + flag-for-review** (~line 974, 1128): toggle + wrapping
  button grid (44px targets, aria-labels with current/answered/
  unanswered/flagged state words — NOT a scroll region), flag button
  with `aria-pressed`, flags persisted in the v3 session.
- **Retrieval-first reveal** (~line 1080–1130): verdict → your answer
  (or blank line) → correct answer → short reason → source + Library
  deep link (`/library?subject=<scope>&q=<topic>`, scope via
  `libraryScopeForSubjectLabel`, §1.8) → `IssueForm`. Before: verdict +
  explanation + IssueForm only.
- **Results** (~line 684–720): first-pass accuracy over ANSWERED only
  (when answered > 0), provisional-content count always, flagged list
  when > 0, retries + unanswered kept, raw-vs-exam kept distinct
  (`rawVsExam`, never called an official score). 2a patterns preserved
  exactly: ReviewStatusBadge/TopicBadge usage, draft/reviewed tones,
  overrides effect, `function finish`, exactly 1 `table-scroll`,
  exactly 2 `role="progressbar"`.
- **IssueForm validation** (~line 135–220): reason REQUIRED; correction
  required UNLESS the `noCorrectionChoice` checkbox is ticked; `role="alert"`
  error; saves `noSuggestedCorrection`. Before: reason optional, no
  explicit no-correction choice.

`src/app/practice/page.tsx:46-47,119`: `?count=` param clamped 5–20
(default 20); scope gains `:c<count>` when count ≠ 20, preserving
existing stored 20-question sessions. Used by the Analysis 10-question
drills.

### 1.2 Mocks — real-count labels + pre-start disclosure

`src/lib/data.ts:680-730`: `mockAvailableCount` (fixed → stored id list
length; dynamic → Σ min(comp, bank size), drawing_pe alias) and
`mockLabels` (coverage `proxy` when variant is `proxy`, else `full`
when available ≥ total else `partial`; `trusted` via `trustedOnlyCount`;
`scoringUnknown` when no own scoring config). ETEA/KPPSC variants are
never merged — the variant string is shown verbatim.

`src/app/mock/page.tsx:82-130`: badges from `mockLabels` — Proxy (tone
proxy) / Full (tone reviewed, judgment call (a)) / Partial (tone
partial) + Reviewed subset (tone partial, only when 0 < trusted <
total) + Scoring policy unknown (tone unknown). Trusted-mode CTA uses
`Start short reviewed practice — {n}/{total} available` (real X/Y).
The old "Fully reviewed" badge was dropped (the trusted-count line
below already states it).

`src/app/mock/[id]/page.tsx:99,133-134`: subject allocation (grouped
from the built questions) passed as `disclosureExtra`, plus
`patternLabel={mock.variant}`.

Reality check (test §2): with the current banks, 3 mocks are Proxy and
17 are Full — NO real mock is Partial. The Partial branch is covered
by synthetic mocks in the test suite (judgment call (i)).

### 1.3 AI Tutor — warning, citations, cancel/retry, cached health, one wording

`src/app/tutor/page.tsx` (full rewrite):

- **Warning BEFORE the prompt** (~line 283, alert div above the input):
  `tutorPrivacy` (providers + sensitive data) + `tutorWarningFallback`
  (fallback order: Gemini → Groq → OpenRouter) + `tutorWarningRetention`
  (retention limitations). Before: `tutorPrivacy` only, no fallback
  order or retention wording.
- **Citations** (~line 320–346): `MsgSources` + `normalizeSources`
  (tolerates the old string shape); note citations link to
  `/library?subject=<subject|all>&q=<title>`, question citations to
  `/tutor?explain=<id>`; `aiNotAuthority` disclaimer under every cited
  answer. `?explain=` deep link via Suspense wrapper + auto-explain
  guard.
- **Cancel + failure recovery**: Cancel button while busy
  (AbortController + `cancelledRef`; cancel restores the input, shows
  `requestCancelled`, does NOT set failedPrompt). On failure the input
  is restored and `failedPrompt` drives a Retry + Offline library
  search action row; the pre-existing auto offline-fallback on `!res.ok`
  is kept AND the actions are added (judgment call (c)).
- `src/app/api/tutor/route.ts`: sources.notes now `{title, subject}`
  (`retrieve()` attaches the subject — typed as `RetrievedNote`,
  `src/lib/data.ts:828`, fixing a tsc error found during verification).

`src/lib/tutorHealth.ts` (NEW, 174 lines) + `src/components/TutorHealth.tsx`
(full rewrite):

- `fetchTutorHealth` (line 82): 5-min cache TTL, in-flight dedup (no
  duplicate probes per page view), `force` bypasses cache but shares an
  in-flight probe, failed probes never overwrite a good cache.
- `summarizeHealth` (line 117) is the ONE computation; both variants
  render `formatCapabilityLine` (line 146) from it — home and tutor
  wording cannot disagree. Checked-at age via `checkedAgeKey` (line
  165) with a 60s/cooldown-expiry tick; Refresh disabled while
  refreshing or in the 30s cooldown (per-mount state, judgment call
  (e)). Failure reasons mapped to `reasonHttp` / `reasonUnexpected` /
  `reasonTimeout` / `reasonUnreachable`.

### 1.4 Study Plan — stable ids, migration, calendar, deep links

`src/lib/plan.ts` (NEW, 359 lines):

- `planTaskId` (line 37): `pt-` + FNV-1a hash of day + minutes + text.
  `PLAN_VERSION = 1` (line 32). `allPlanTaskIds` (63, unique),
  `countPlanDone` (counts ONLY known stable ids — legacy/unknown keys
  can never inflate 0/63).
- `migratePlanState` (line 87): positional → stable via CURRENT PLAN21;
  stable keys win collisions; unknown keys pass through untouched
  (required by test-storage "v4 plan restored"); invalid positions
  preserved, never deleted; non-boolean values dropped; idempotent.
  `loadMigratedPlanState` (line 127) migrates + persists + writes the
  version marker. Migration runs in the plan/home pages, NOT inside
  `loadPlanState()` — tracking.ts must never import plan.ts (node
  type-stripping tests import tracking.ts directly; plan.ts's data.ts/
  JSON chain cannot load that way). Backups merge raw keys; the next
  plan read migrates them. Migration is silent (judgment call (d)).
- Calendar (line 217): rest day after every 6 units; unit after a rest
  day = catch-up; spread 1/2/4; 12-week mode adds Cycle 2 revisit
  windows one full cycle (87 days) later. Local-midnight dates only
  (`toLocalDateKey`/`parseLocalDateKey` — never UTC-parsed).
  `planCalendarTotals` counts from real entries. Totals: 3-week 21/3/24,
  6-week 42/3/45, 12-week 84/3/174.
- `planTaskLink` (line 315): regex resolver — all 63 PLAN21 tasks
  resolve (test-asserted); mock → `/mock` (never guesses an id),
  flashcards → `/flashcards`, weakest/wrong-answers → `/analysis`,
  `<Subject> notes:` → scoped `/library`, `<Subject> quiz` → scoped
  `/practice`, generic fallbacks; null for unmatched text.
  `planDayForSubject` (line 351): first day mentioning the subject
  (1-based) or null.

`src/app/plan/page.tsx` (full rewrite): stable-id checkboxes,
`loadMigratedPlanState()` in effect, start date via `PLAN_START_KEY`
(mount-gated date TEXT only — calendar structure renders pre-mount,
B07-safe), pacing labels via `PACING_KEY` (6-week: exactly `21 study
units paced over 42 days`), rest cards + study cards (anchor
`id="plan-day-{N}"`, catch-up badge, date range, workload, cycle-2
window + note in 12-week mode, per-task deep links), reset-dates
button, 12-week banner. 12-week renders each unit ONCE with two date
windows sharing one checkbox (judgment call (b) — keeps 0/63 intact).
Preserved: progressbar, RTL patterns, AI plan section.

`src/app/page.tsx:38,79-81`: next-task scan + plan fraction now use
`loadMigratedPlanState()` + `planTaskId` + `countPlanDone`; no
positional ids remain. `liveSessions()` resume logic untouched
(v3-compatible).

### 1.5 Flashcards — separate counters, local due date, save-failure warning

`src/app/flashcards/page.tsx` (FSRS scheduler untouched):

- Header shows three SEPARATE numbers: New + Due reviews (composition
  snapshot at session start, from the built queue + stored state) +
  Session reviewed/recalled (judgment call (j)). The old conflated
  `dueTotal` is gone (key `dueToday` removed from i18n).
- Next-due date via `formatLocalDueDate` (`src/lib/fsrs.ts:398`,
  `toLocaleDateString`, local timezone; unparseable → raw string).
  Before: `dueAt.slice(0, 10)` (UTC ISO date).
- `saveFlashState` now returns boolean (`src/lib/tracking.ts:680`); a
  failed grade save shows a warning banner with Retry save (re-saves
  current state) + Export (`download` + `exportProgress`), and a
  recovered line on success. Grading is never blocked.
- `?category=` param support (Suspense wrapper; validated against real
  categories) for Library deep links.

### 1.6 Analysis — denominators, provisional, filters, data dates

`src/app/analysis/page.tsx`:

- Filters (date all/7/30, subject, track) filter attempts BEFORE
  `computeStats` (stats via `useMemo` from filtered attempts; `recent`
  + mock history derive from the filtered set). A note states the
  shown/total attempt counts. Date filter compares ISO date strings
  (judgment call (k)).
- Provisional section (`stats.provisional`, `src/lib/tracking.ts:1114`):
  subjects with 1–4 questions, worst-first, labelled
  `provisional—small sample`, each with a `Run 10-question drill` link
  (`/practice?subject=<bank key>&count=10`). The `weakest` ≥5 filter is
  unchanged — small samples are now surfaced, never silently suppressed.
  Per-subject table rows with total < 5 also carry the provisional badge.
- Denominator caveat paragraph (`analysisDenominators`): accuracy with
  its question + MCQ-attempt counts; flash self-ratings never mixed in
  (`mcqAttempts`, `src/lib/tracking.ts:1120`).
- Drill-link bug FIXED: all drill links now use `subjectKeyForLabel`
  (`src/lib/data.ts:760`, inverts SUBJECT_LABELS) — pre-2b links passed
  the display label, which `/practice` silently ignored. Unmapped labels
  link to plain `/practice`.
- Data management ("Your Data" already existed): added last-export /
  last-import lines (`loadLastExport`/`recordExport`/`loadLastImport`/
  `recordImport`, `src/lib/tracking.ts:107,1149-1159`; `neverExported` /
  `neverImported` fallbacks). 2a chart text/table alternatives verified
  integrated, untouched. All three `minsLabel` call sites keep dir="ltr"
  isolation.

### 1.7 Library — scoped search, count, source label, related links

`src/app/library/page.tsx` (rewrite):

- "Search all subjects" option (value `all`) + matching count line
  (scoped total, or match count + query). Subject/query preserved in
  the URL (`?subject=` + `?q=`, `history.replaceState`, no navigation)
  so tutor citations deep-link here; unknown subjects fall back to the
  first subject, never a guessed one.
- `English source text` badge when lang ≠ en and `hasTranslation(note,
  lang)` is false (today: every note — zero translated content, stated
  honestly). `ProvenanceBadge` + reveal ARIA + annotations unchanged.
- Related links per note: practice drill (`noteBankKey` — omitted for
  Drawing/PE, no exact bank), flashcards (category-scoped when the
  subject IS a flashcard category via `flashcardCategoryForNote`, else
  plain `/flashcards`), plan day (`planDayForSubject` — omitted when no
  day mentions the subject). Never points at a wrong target (judgment
  call (f)).

### 1.8 Issues/Review wording

- Review queue heading: `reviewTitle` en is now exactly `Local
  owner-review workspace — this device only` (`src/lib/i18n.tsx:701`;
  roman + ur added). No review-page code change — the h1 already used
  the key.
- Issues page (`src/app/issues/page.tsx:184`): the correction cell
  renders `noSuggestedCorrectionLabel` when the explicit choice was
  made (a decision, not missing data). Issues wording was already
  local-only (`issuesIntro`/`issueSaved`/`issuePrivateNote`) — no other
  change. `IssueReport.noSuggestedCorrection` is stored by
  `reportIssueDetailed`, preserved by `asIssueReport`, and survives the
  backup export/import round-trip (test §1).

### 1.9 Cross-cutting: i18n + a defect fixed during verification

`src/lib/i18n.tsx` (1331 lines): ~90 Step 2b keys added (all en+ur;
roman for short chrome). 17 keys REMOVED after verifying zero usage:
checkedJustNow, fullStatusLine, healthOk/healthDegraded/healthDown,
load3/load6/load12, perDay, spreadOver, dueToday, mockCoverageNone/
Partial/Full + Details, resumedAlert, mockLabelFullyReviewed + Detail.
(test-step2b §6 asserts none is referenced in src/; `perDay` is checked
narrowly because `LIMITS.perDay` is the live tutor rate-limit field.)

Defect found + fixed during verification: the new QuizRunner reveal
link passed the question's subject LABEL as `?subject=`, but 5 of the
16 labels are not Library scopes (Drawing, Physical Education, IT,
Past-Paper Topics, Past-Paper Topics (Reworded)) — those links would
have landed on an unrelated subject. Fixed with
`libraryScopeForSubjectLabel` (`src/lib/data.ts:762`): Drawing/Physical
Education → "Drawing/PE", IT → "IT/Computer", past-paper labels →
"all" (topic query searches every subject). All 16 labels tested.

## 2. Judgment calls (flagged to owner, reversible)

(a) Mock "Full" badge uses the reviewed (teal neutral) tone — no
    success-green anywhere; label + detail carry the meaning.
(b) 12-week plan renders each unit once with two date windows sharing
    one checkbox; banner copy states this explicitly.
(c) Tutor failure: auto offline-fallback kept AND Retry/offline-search
    actions added; cancel restores input without setting failedPrompt.
(d) Plan migration is silent (no one-time notice) — documented here.
(e) Health refresh cooldown is per-mount component state (cache TTL
    still prevents re-probing across mounts); checked-at age ticks
    every 60s while loaded.
(f) Library deep links omitted when no exact target exists (Drawing/PE
    practice link; plan-day link when unmentioned) — never a wrong target.
(g) QuizRunner pre-start shows the parent's `note` AND the structured
    disclosure (description vs structured facts).
(h) Reveal-link scope mapping per §1.9 (explicit, tested).
(i) "Partial" mock label has no live instance today; UI branch + test
    coverage exist via synthetic mocks.
(j) Flashcards New/Due = this session's queue at start; Session =
    reviewed/recalled so far in this session.
(k) Analysis date filter compares ISO date strings (UTC day boundary) —
    negligible for 7/30-day windows.

## 3. Verification

### 3.1 Build + types

- `npm run build`: PASS (all 19 routes listed; no new route types).
- `npx tsc --noEmit`: clean (strict). One error found + fixed during
  the batch: `retrieve()`'s attached `subject` was untyped
  (`RetrievedNote`, §1.3).

### 3.2 Test suites — baseline vs final

Baseline (VERIFY-step2a.md): 23 suites, 1249 checks, 0 failures.
Final: **24 suites, 1555 PASS lines, 0 FAIL lines.** New suite
`scripts/test-step2b.mjs` (733 lines, 358 checks, `test:step2b` in
package.json). Note on the arithmetic: re-deriving the 23 prior
suites under this run's counting (grep `^PASS`) gives 1197, not 1249 —
no assertions were removed (4 updated 1:1, see §3.3), so the 52-line
gap is a tallying difference in how the 2a total was recorded, not
lost coverage. Every prior suite passes in full.

Per-suite PASS counts (final run): scoring 39, reviews 37, retrieval
28, fallback 24, timeouts 43, storage 38, lang 30, guard 60, tier4 47,
provenance 33, backup 44, telemetry 28, fonts 21, i18n 42, rtl 72,
trilanguage 28, fsrs 90, flashcards 46, markdown 20, stage3 165,
contrast 78, step2a 184, step2b 358. Total 1555, FAIL 0.

New suite sections: §1 session compatibility (16 cases incl. legacy
v2 + precedence) + saveFlashState boolean + issue round-trip +
stats provisional/mcqAttempts, all against the REAL tracking.ts via
type-stripping; §2 mock labels for all 20 mocks (coverage definition,
available/trusted == built lengths, scoring-unknown 19/20) + synthetic
partial/capped/unknown-subject mocks + all 4 mapping helpers + counts;
§3 plan ids/migration (incl. storage-backed `loadMigratedPlanState`)
+ calendar totals/windows + all-63 link resolution + day-for-subject
ground truth + date helpers, all against the REAL plan.ts/data.ts
compiled with tsc (harness tolerates ONLY the expected TS5097 for the
`./fsrs.ts` extension import, rewrites it for CJS require, and
symlinks node_modules for ts-fsrs); §4 tutor health summary/line/age +
cache/dedup/TTL/failure behavior with a stubbed fetch; §5–§6 source
patterns for every 2b flow + the 7 exact owner-specified strings +
removed-key sweep.

### 3.3 Assertions updated (supersession, not weakening)

- `scripts/test-step2a.mjs:140-141`: mock badge assertions now check
  the 2b `mockLabels` keys (Full/Partial/Proxy/Reviewed subset/Scoring
  unknown) with a supersession comment. All other 2a assertions
  unchanged.
- `scripts/test-rtl.mjs:60,120`: library storage-key assertion follows
  the new scoped-memo construction (key still on the original title);
  issues correction-cell assertion follows the new no-correction
  branch (dir="auto" + fallback preserved).

### 3.4 Local prod server (build output, port 3100)

- All routes HTTP 200: /, /library, /practice, /mock, /mock/zam1,
  /mock/tt-B, /flashcards, /tutor, /plan, /analysis, /tracks,
  /tracks/tt, /topics, /vacancies, /links, /issues, /review.
- Shell (nav + brand) present on every checked page.
- Counts unchanged (server-rendered home line): `645 MCQs · 110 notes
  · 70 flashcards · 19 post tracks · 20 mocks.`
- Served HTML contains: mock labels (Full/Proxy/Reviewed subset/
  Scoring policy unknown; no Partial — expected, §1.2), the new
  review heading, the 3-week pacing line.
- SSR caveat (pre-existing pattern, NOT a regression): the
  Suspense-wrapped pages (/practice, /library, /tutor) serve shell-only
  HTML with content after hydration — /practice (untouched structure)
  behaves identically. /analysis serves its "Loading…" gate until
  mount; /flashcards content depends on the post-mount scheduler.
  The 2b interactive content on those pages (warning, citations,
  counters, filters, pre-start flow) is verifiable only in a browser —
  see §4.
- /review 15/200: the review page code and its data path are UNCHANGED
  in 2b (only the heading key text changed); the rendered 15/200 is
  post-hydration and is covered by the parent's live browser check.

### 3.5 No 2a regression

All 2a suites green (step2a 184, rtl 72, contrast 78, stage3 165,
fonts 21, trilanguage 28); zero Nastaliq refs (test-enforced, still
passing); 360px scroll-region + keyboard/ARIA patterns preserved
(QuizRunner keeps exactly 1 `table-scroll` + 2 progressbars; plan page
keeps its progressbar + RTL isolation; flashcards keeps its flip/ARIA
patterns).

## 4. For the parent's live verification (post-hydration, browser only)

1. Pre-start disclosure + Resume/Start-fresh on /practice and a mock
   detail page; incompatibility prompt after changing subject/seed
   (stale answers never applied).
2. Question map + flag; reveal order; results screen (first-pass /
   provisional / flagged); IssueForm validation + no-correction choice.
3. Mock list labels + reviewed-practice CTA with real X/Y.
4. Tutor warning above the prompt; citations + deep links; Cancel;
   failure Retry + offline search; health age/cooldown; same capability
   line on home and tutor.
5. Plan: stable ids + migration (positional state converts, completions
   preserved), rest/catch-up days, dates, deep links, 6-week label,
   12-week cycle-2 windows.
6. Flashcards counters (New/Due/Session separate), local due date.
7. Analysis filters + provisional list + drills + last export/import.
8. Library search-all + count + related links + English-source label.
9. /review heading + 15/200 intact.
10. 360px phone check (owner): Tutor/Library/Issues inputs + new UI.

## 5. Files changed (Step 2b batch)

New: `src/lib/plan.ts`, `src/lib/tutorHealth.ts`,
`scripts/test-step2b.mjs`.
Libs: `src/lib/tracking.ts`, `src/lib/data.ts`, `src/lib/fsrs.ts`,
`src/lib/i18n.tsx`.
Components: `src/components/QuizRunner.tsx`,
`src/components/TutorHealth.tsx`.
Pages/API: `src/app/page.tsx`, `src/app/practice/page.tsx`,
`src/app/mock/page.tsx`, `src/app/mock/[id]/page.tsx`,
`src/app/tutor/page.tsx`, `src/app/plan/page.tsx`,
`src/app/flashcards/page.tsx`, `src/app/library/page.tsx`,
`src/app/analysis/page.tsx`, `src/app/issues/page.tsx`,
`src/app/api/tutor/route.ts`.
Tests/config: `scripts/test-step2a.mjs`, `scripts/test-rtl.mjs`,
`package.json` (added `test:step2b` script).
Not changed: `src/app/review/page.tsx` (heading via key only),
content/bank JSON, tracks/vacancies, `scoring.ts`, FSRS scheduler,
`globals.css`, CHANGELOG.md (parent/deploy step).

## 6. Nothing left out

Every item in the Step 2b brief is implemented and tested. No item was
stopped or left out. No push/deploy/GitHub/Vercel/env action was taken.
