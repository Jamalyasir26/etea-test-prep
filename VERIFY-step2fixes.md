# VERIFY — Step 2 fix batch (3 live-verification defects)

Local only, 2026-11-13. No push, deploy, GitHub, Vercel, or env action.
Backup: `~/workspace/etea-prep-next-backup-pre-step2fixes/` (empty diff
confirmed before work started). Base: post-Step-2 tree (GitHub HEAD
4556046).

## §1 — Baseline (before changes)

- `npm run build`: PASS ("Compiled successfully").
- `npx tsc --noEmit`: clean (exit 0).
- All 24 suites: **1607 checks, 0 failures** (23 test files + QA 52).

## §2 — Defect 1: practice resume on the bare URL

### Diagnosis (verified in source before fixing)

`src/app/practice/page.tsx` (old lines 53–58) restored the stored round
and seed ONLY when `initial && BY_SUBJECT[initial] && initial ===
stored.subjectKey` — i.e. only with a `?subject=` param naming the
stored subject. On the bare URL (`initial === ""`) the subject DID
restore (`stored.subjectKey`) but round reset to 0 and seed became a
fresh `Date.now()`, so the shuffled set never matched the stored
session and `checkSessionCompatibility` (`src/lib/tracking.ts:981`)
always reported a mismatch (question-ids first, then seed).

### Fix

- `src/lib/practice.ts` (new): `PRACTICE_STATE_KEY`,
  `PracticeState`, `loadPracticeState` moved verbatim out of the page,
  plus the pure `resolvePracticeInitial(param, stored, isValidSubject,
  freshSeed)` (line 42). The stored round AND seed restore whenever
  the run's subject IS the stored subject — bare URL, param naming
  the stored subject, or invalid param (long-standing fallback to the
  stored subject). A param naming a DIFFERENT valid subject starts
  fresh (round 0, fresh seed): per-scope sessions are the intended
  design; the old session stays stored and resumable from Home, and
  NO incompatibility prompt is added on subject change.
- `src/app/practice/page.tsx:9,31–37`: initial state resolves through
  the one pure function. Manual subject change (fresh set) and "New
  set" (round bump + fresh seed) unchanged.

### Before / after

- Before: bare `/practice` reload → fresh seed → "Your previous
  session does not match this set" on every reload.
- After: bare `/practice` reload → same subject/round/seed → same
  20-question set → stored session compatible → Resume offered.

## §3 — Defect 2: flashcard next-due calendar date

### Diagnosis (verified in source before fixing)

`formatLocalDueDate` (`src/lib/fsrs.ts:399`) was wired ONLY into the
current card's state line, and only for Review/New states — Learning /
Relearning cards showed a bare relative interval, and the graded
card's newly scheduled next review was never shown anywhere (the page
advanced immediately; grade buttons show intervals only).

### Fix

- `src/app/flashcards/page.tsx:100`: `lastGraded` state
  (`{ dueAt, intervalMs }`, captured at grade time so the interval
  does not shrink as the clock moves).
- `src/app/flashcards/page.tsx:170,176`: `grade()` captures
  `updated.dueAt` + the scheduled interval. `reviewFsrsCard` still
  receives the same `now` it got before (previously an inline
  `new Date()`); no scheduler behavior change.
- `src/app/flashcards/page.tsx:128`: `startSession` clears
  `lastGraded` (new session / category / cram).
- `src/app/flashcards/page.tsx:273–280`: renders
  `tf("flashGradedNextReview", { date: lri(formatLocalDueDate(...)),
  interval: lri(formatFsrsInterval(...)) })` outside the card/done
  conditional, so it stays visible on the finished screen too.
- `src/app/flashcards/page.tsx` state line: Learning/Relearning cards
  now show `"<interval> · <local date>"`; Review cards keep the
  date-only display. Grade-button intervals unchanged.
- `src/lib/i18n.tsx:563`: new key `flashGradedNextReview` —
  en "Last card graded — next review {date} ({interval})",
  roman "Pichla card grade ho gaya — agla review {date} ({interval})",
  ur "پچھلا کارڈ درجہ بند ہو گیا — اگلا جائزہ {date} ({interval})".

### Before / after

- Before: after grading, only the next card + interval-only buttons;
  no calendar date for the graded card.
- After: e.g. "Last card graded — next review 18 Nov 2026 (4.8d)".

## §4 — Defect 3: analysis heatmap spacing

### Diagnosis (verified in source before fixing)

`src/app/analysis/page.tsx:429,447` used a literal JSX space between
the `%` span and the `weakOver` text:
`<span ...>...</span> {tf("weakOver", ...)}`. A tsc compile of the
identical pattern emits the `" "` child, so the literal space SHOULD
survive — but the live check rendered "0%over 60 questions". The fix
makes the space unconditional rather than relying on JSX whitespace
rules.

### Fix

Both lines (weakest list + provisional list) now use an explicit
`{" "}`: `<span dir="ltr">{Math.round(w.accuracy)}%</span>{" "}{tf(...)}`.
The provisional weak-area threshold is UNTOUCHED (`v.total < 5`,
1–4 questions; the section simply did not trigger in the check
browser's data).

## §5 — Verification

- `npm run build`: PASS. `npx tsc --noEmit`: clean.
- All 25 suites: **1672 checks, 0 failures** (baseline 1607 → +65
  from new `scripts/test-step2fixes.mjs`; no existing assertion
  changed).
- New suite coverage (65 checks):
  - §1 — real `practice.ts`: load fallbacks (missing/malformed/
    wrong-typed/SSR), resolver cases (bare URL, matching param,
    different subject, invalid param, purity).
  - §2 — full chain with REAL compiled `data.ts` + REAL
    `checkSessionCompatibility`: same subject+round+seed → identical
    20 ids; bare-URL reload → session compatible; fresh-seed set →
    incompatible; subject change → old session still stored/loadable,
    new scope empty, scope-mismatch reason; swapped id → "questions",
    changed seed → "seed", changed revision → "revision". Counts
    asserted: 645 · 110 · 70 · 19 · 20.
  - §3 — real `fsrs.ts`: local-format options pinned; unparseable
    input verbatim; TZ-pinned child processes prove local-timezone
    rendering (Asia/Karachi → 14th, UTC → 13th, for 20:00Z on the
    13th); real scheduler graded-card flow (future ISO dueAt, date +
    interval render, Again = 1m step).
  - §4–§5 — source patterns: page wiring, flashcards render/clear,
    i18n key en+roman+ur with both slots, exactly 2 explicit-space
    weakOver lines + 0 bare-space lines, provisional threshold intact.
- Local prod server (port 3127, stopped after): 13 routes HTTP 200
  (`/`, `/practice`, `/flashcards`, `/analysis`, `/library`, `/mock`,
  `/plan`, `/review`, `/issues`, `/tracks`, `/tutor`, `/vacancies`,
  `/api/tutor/health`). Built chunks contain the practice-state key
  and the new graded-review string. Zero Nastaliq in `src/`.
- NOT verified here (needs a real browser post-deploy — the fixed
  renders are all post-hydration): bare-URL Resume offer on a
  hydrated page; the graded-card date line after a real grade; the
  heatmap space in rendered text; hydrated Urdu "0 / 63" regression
  (untouched code path, but re-confirm live).

## §6 — Files changed (vs backup-pre-step2fixes)

Changed (6): `CHANGELOG.md`, `package.json` (+`test:step2fixes`
script), `src/app/analysis/page.tsx`, `src/app/flashcards/page.tsx`,
`src/app/practice/page.tsx`, `src/lib/i18n.tsx` (+1 key).
New (3): `src/lib/practice.ts`, `scripts/test-step2fixes.mjs`,
`VERIFY-step2fixes.md` (this file).
Deleted (0). No content/bank data, scheduler, scoring, plan, review,
or tutor-logic changes.
