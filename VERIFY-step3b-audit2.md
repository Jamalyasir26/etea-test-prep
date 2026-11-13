# VERIFY — Step 3b-Audit Batch 2 (F07/F08/F09 + F02 + F12)

Date: 2026-11-13. GitHub HEAD: 646d325 (Step 3a). No push/deploy made by
this batch — the parent handles the single push, deploy, and live browser
verification. The backup `~/workspace/etea-prep-next-backup-pre-step3b-audit/`
was NOT touched and was NOT recreated. Batch 1 (F21/F14/F18/F10/stale
counts) was already in this tree and verified; nothing in its areas was
reworked.

## Result

- `npx tsc --noEmit`: clean (strict).
- `npm run build`: PASS (compiled; route table printed, no errors).
- All suites: **2257 checks / 28 suites, 0 failures** (baseline 2130/27;
  +127 from the new `test-step3b-audit2.mjs`).
- Local prod server: all 16 routes HTTP 200; home shows
  "645 MCQs · 110 notes · 70 flashcards · 12 teaching post tracks · 16 mocks"
  with derived dashboard counts; `/review` renders the pending-English
  queue server-side. (The 15/200 review count and the flags section are
  client state loaded after mount, so curl cannot see them; the suites
  cover them and the parent's live browser check is the final word.)

## 1. F07/F08/F09 — data safety

### Before

- `recordAttempt` returned the attempt and swallowed write failures:
  a full localStorage lost a test result silently.
- Save paths returned nothing; callers could not tell success from
  failure. Flashcards already had inline save-failure handling (Step 2b);
  nothing else did.
- Two open tabs could overwrite each other's stored data with no
  detection: every write was a blind read-modify-write.
- `recordWarning` only appended to an in-memory list; nothing woke the
  UI until the next render that happened to read it.

### After

- `src/lib/tracking.ts:462` — `atomicUpdateJSON(key, fallback, updater,
  maxAttempts=3)`: compare-and-swap. Re-reads the raw value before
  writing; if another tab changed it, re-runs the updater from the fresh
  value (up to 3 attempts); on exhausted retries records a
  `write-conflict` warning (`:493`) and abandons the write WITHOUT
  overwriting. Corrupt JSON is quarantined verbatim (the Tier 2
  guarantee is extended, not replaced). Updaters must be pure: ids and
  timestamps are generated OUTSIDE the updater so retries never
  duplicate a record.
- `src/lib/tracking.ts:506` — `MANAGED_STORAGE_KEYS` (9 keys: attempts,
  plan, flash, sessions, reviews, issues, annotations, day, flags) and
  `isManagedStorageKey` (`:520`; `null` = `storage.clear()` counts).
  Preference keys (lang/theme/sidebar) are deliberately excluded.
- `src/lib/tracking.ts:536` — `recordAttempt` returns
  `{attempt, saved}`; the record is built once outside the updater.
  `savePlanState` (`:558`), `saveReviews` (`:173`),
  `saveAnnotation` (`:213`), `saveSession` (`:1137`),
  `clearSession` (`:1148`), `deleteIssue` (`:985`) return booleans;
  `reportIssueDetailed` (`:962`) returns `{rec, saved}`. `setReview`
  keeps its old signature (returns the map) but writes atomically; a
  failed write surfaces via the shell banner (below).
- `src/lib/tracking.ts` — `recordWarning` now also dispatches a
  best-effort `CustomEvent("etea-storage-warning")` (try/catch) so the
  shell banner wakes immediately.
- `src/components/AppShell.tsx:51` — two global banners inside `<main>`:
  a storage-failure banner (`role=alert`, Download-backup button reusing
  `t("export")`, Dismiss) and an other-tab banner (Reload page button,
  Dismiss). The `storage` listener (`:63`) fires only in OTHER tabs, so
  the warning appears exactly where the stale state is. Dismiss hides
  until the next event.
- `src/components/QuizRunner.tsx:591` — `retryAttemptSave()` re-records
  the pending attempt (safe: the first write never landed); the results
  screen (`:774`) shows `attemptSaveFailed` + Retry + Download-result
  (JSON) when the save fails, and `attemptSaveRecovered` on recovery.
  The answers stay on screen either way.
- `src/components/QuizRunner.tsx` — `IssueForm` keeps the form (and the
  user's text) open with `issueSaveFailed` when the report write fails,
  instead of showing a false "saved" message.

### Scope decision (documented, reversible)

Plan/flashcard saves return booleans + the banner; their internal
updaters were NOT refactored into atomic updaters, because the plan
migration and FSRS state logic carry regression risk and the banner
already surfaces failures. Multi-tab protection for those two keys is
the cross-tab warning, not CAS. If the owner wants CAS there too, it is
a separate, small change.

### Bug found by the new tests (fixed in this batch)

`saveFlag`/`removeFlag` filtered the RAW stored array without
validation, so malformed flag entries (null/junk) crashed the write
with a TypeError. Both updaters now validate via `asDurableFlag` and
drop malformed entries (`src/lib/tracking.ts:1202,1214`). Regression
checks added to the new suite.

## 2. F02 — language mix

### Correction to the audit finding

`explanationUrdu` is NEVER rendered anywhere in `src/` (only declared
in the Question type; verified by grep). The real bug: the `explanation`
field itself contains Roman Urdu, and QuizRunner renders questions in
English always (it never calls `localizeQuestion`). The finding's field
name was wrong; the underlying issue was real. The fix targets the
`explanation` field. `explanationUrdu` (null everywhere sampled) was
left untouched.

### Audit method

Strict Roman-Urdu function-word detector (≥2 hits) + an Arabic-script
fraction rule (>0.3 → Urdu-script), with manual verification of every
edge case. Decisive finding: NO explanation is majority Urdu-script
(max script fraction 0.44, URD-034) — every non-English explanation is
Roman Urdu, so a single marker value and a single label suffice. The
word "tab" was removed from the detector (false-positive on "Alt+Tab"
in ITC-020). False negatives found and fixed by hand: ARB-024, bilingual
Islamiyat items with 0–1 hits, the entire Pak Studies bank, and
ENG-003/028/042 ("Roman Urdu:" suffixes).

### Audit counts (645 total = 325 already English + 124 translated + 196 pending)

| Bank | Total | English | Translated | Pending |
|---|---|---|---|---|
| arabic | 80 | 20 | 0 | 60 |
| drawing | 20 | 12 | 8 | 0 |
| english | 45 | 40 | 5 | 0 |
| gk | 30 | 30 | 0 | 0 |
| islamiyat | 105 | 15 | 0 | 90 |
| it | 30 | 0 | 30 | 0 |
| maths | 45 | 45 | 0 | 0 |
| pakstudies | 45 | 0 | 45 | 0 |
| pastpapers | 20 | 19 | 1 | 0 |
| pastpapers_reworded | 20 | 20 | 0 | 0 |
| pe | 20 | 15 | 5 | 0 |
| pedagogy | 30 | 30 | 0 | 0 |
| science | 30 | 0 | 30 | 0 |
| socialstudies | 30 | 30 | 0 | 0 |
| tajweed | 50 | 49 | 0 | 1 |
| urdu | 45 | 0 | 0 | 45 |

### What was translated vs labelled

- Translated — 124 `explanationEn` added (additive fields only; the
  original `explanation` is untouched everywhere):
  - science 30 + it 30: genuine hand-authored faithful translations;
    facts preserved exactly, no new facts, no invented references.
  - pakstudies 45: the verbatim first English sentence of bilingual
    items (extraction, not new wording).
  - drawing 8 + pe 5 + english 5 (ENG-001/003/007/028/042): the verbatim
    English part before the "Roman Urdu:" suffix.
  - pastpapers 1 (PPT-001): the verbatim English sentence. PPT-001 is a
    Quranic-content item, but the English sentence already existed in
    the bank, so this is extraction only — no new religious wording was
    written. Flagged here with reasoning, per the religious-content
    rules.
- Labelled, NOT auto-translated — 196 `explanationLang: "roman"`:
  islamiyat 90 (ISL-001..090; ISL-091..105 are English-only
  concept-extracted items), arabic 60 (59 detector + ARB-024 manual
  override; ARB-061..080 verified genuinely English), tajweed 1
  (TAJ-029), urdu 45 (all). These show the Roman Urdu text with the
  honest label "Roman Urdu explanation — English version pending owner
  review" in English mode, and are queued on /review.
- Patch mechanics: line-insertion surgery immediately after each item's
  `"explanation":` line (bank files do not all roundtrip with 1-space
  JSON indent). Result vs the pre-patch snapshot: **320 insertions, 0
  removals, 0 modifications**; JSON parses; deep-equal except added
  keys. Untouched banks: gk, maths, pedagogy, socialstudies,
  pastpapers_reworded. Answers/options untouched everywhere (suite
  asserts exactly one valid correct answer on all 645 items).

### Display rule

- `src/lib/data.ts:44,51` — Question gains `explanationEn?: string`
  and `explanationLang?: "roman"`.
- `src/lib/data.ts:398` — `displayExplanation(q, lang)`:
  non-English modes return the localized explanation (pending=false,
  today's behavior unchanged); English mode returns `explanationEn`
  when present (pending=false), else the original with pending=true
  when marked roman, else the original with pending=false.
- `src/lib/data.ts:410` — `pendingEnglishExplanations()`: marked items,
  sorted by id.
- Render sites: QuizRunner results review (`:928`) and reveal
  (`:379,1203`), review-page cards (`src/app/review/page.tsx:358`) —
  all show the `explanationPendingLabel` badge when pending.
- `src/app/review/page.tsx:286` — F02 queue section: count + first 10 +
  Show-more (+25), each row id/subject/topic/explanation preview +
  pending label. Static bank data, no mount gate.
- Detector exception: ISL-080 ("Chauthe Khalifa Hazrat Ali (RA) the.")
  is correctly marked but has no detectable function-word signal; it is
  an explicit, documented exception in the suite, not a detector change.

## 3. F12 — durable flags

### Before

Flags lived only in QuizRunner session state; submitting (or reloading)
deleted them with the session.

### After

- `src/lib/tracking.ts:115` — `FLAGS_KEY = "etea_flags_next_v1"`.
- `src/lib/tracking.ts:1191` — `loadFlags()` (newest first: flaggedAt
  desc, then qid asc; malformed entries skipped); `saveFlag(qid,
  source, title)` (`:1202`, dedupes by qid, refreshes timestamp);
  `removeFlag(qid)` (`:1214`); `clearFlags()` (`:1222`, explicit user
  action on /review only).
- One durable store covers BOTH mock and practice flags; a `source`
  field (`"mock" | "practice"`) distinguishes them. Session flags are
  unchanged and are mirrored into the durable store on every toggle
  (`src/components/QuizRunner.tsx:603` `toggleFlag`, wired at `:1238`).
- `src/app/review/page.tsx:241` — "Flagged questions" section:
  mount-gated `loadFlags()` (B07 rule: no storage reads or
  `toLocaleString()` in first render), listing qid/subject/topic/
  question preview/source/title/flagged date, with per-flag Remove and
  Clear-all. Removal is re-flaggable, so no confirm dialog.
- Flags are NOT part of backup export v6 (no version bump): device-local
  durable state, listed on /review. Documented decision.

## i18n

21 new keys in `src/lib/i18n.tsx` (all en+ur; roman where natural,
matching the convention that long strings may omit roman), starting at
`:1348`: `explanationPendingLabel`, `pendingEnglishHeading`,
`pendingEnglishIntro`, `pendingEnglishShowMore`, `flagsHeading`,
`flagsIntro`, `flagsEmpty`, `flagsRemove`, `flagsClearAll`,
`flagsFromMock`, `flagsFromPractice`, `flagsFlaggedOn`,
`storageSaveFailed`, `storageOtherTab`, `storageReload`,
`storageDismiss`, `attemptSaveFailed`, `attemptRetrySave`,
`attemptDownloadResult`, `attemptSaveRecovered`, `issueSaveFailed`.

## Tests

New: `scripts/test-step3b-audit2.mjs` (127 checks; `test:step3b-audit2`
in `package.json:61`). §1–§5 exercise the REAL tracking.ts with a
scriptable localStorage stub (quota path, CAS retry, persistent
collision, corrupt-JSON quarantine, managed-key detection, save-path
booleans, flags lifecycle incl. flag → submit → reload). §6 exercises
the REAL data.ts via the tsc harness (F02 counts, per-bank table, the
no-unlabelled-Roman-Urdu guard, display matrix, answer integrity).
§7 asserts UI wiring + Batch 1 regression (F21 CSS, health cache,
VISIBLE_COUNTS, i18n keys).

Existing suites updated (behavior-preserving; the old assertions
encoded pre-fix render expressions / return shapes):

- `scripts/test-rtl.mjs` — the dir=auto isolation checks now match the
  `displayExplanation` render expressions (`currentExpl`, `expl.text`);
  the review check now asserts BOTH the card form and the queue form.
  Isolation itself is unchanged.
- `scripts/test-step2b.mjs` — two `reportIssueDetailed` call sites now
  read `.rec` (the F07 `{rec, saved}` return shape). The stored-record
  assertions are identical. (The pre-work note "no test uses it" was
  wrong; this suite does.)
- `scripts/qa-540.mjs` — the legacy `drawing_pe.json` comparison now
  also ignores the additive `explanationEn`/`explanationLang` fields.
  The legacy file is a frozen snapshot, deliberately NOT registered in
  data.ts (`src/lib/data.ts:171`), and predates the F02 fields; the
  original content must still match exactly.

First full run caught all three of these (plus the saveFlag malformed
bug above); final run is fully green: 2257/28, 0 failures.

## Files changed (Batch 2 only)

- `src/lib/data.ts` — Question fields + `displayExplanation` +
  `pendingEnglishExplanations`.
- `src/lib/tracking.ts` — CAS, managed keys, save-result reporting,
  warning event, flags store.
- `src/lib/i18n.tsx` — 21 new keys.
- `src/components/AppShell.tsx` — storage-failure + other-tab banners.
- `src/components/QuizRunner.tsx` — attempt save-failure UX, issue-form
  failure UX, `toggleFlag` mirroring, explanation renders.
- `src/app/review/page.tsx` — flags section, pending-English queue,
  explanation render.
- `src/data/banks/{science,it,pakstudies,pastpapers,drawing,pe,english,islamiyat,arabic,tajweed,urdu}.json` — 320 additive insertions only.
- `package.json` — `test:step3b-audit2` script.
- `scripts/test-step3b-audit2.mjs` (new), `scripts/test-rtl.mjs`,
  `scripts/test-step2b.mjs`, `scripts/qa-540.mjs` (updated).
- This report: `VERIFY-step3b-audit2.md` (new).

Note: the push-manifest diff against the backup also includes Batch 1
files (unchanged by this batch).

## Not done / open

- Per-subject practice resume (owner decision pending) — unchanged.
- True CAS for plan/flashcard updaters — see scope decision above.
- Live browser verification (flags flow, quota banner, 360px) is the
  parent's step after deploy; the local prod check covered routes,
  counts, and SSR rendering only.
