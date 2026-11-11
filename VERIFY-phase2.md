# Phase 2 — Final Verification (ETEA Prep, Next.js)

Date: 2026-11-11 (late evening PKT). Verifier: independent final check of the three Phase 2 workers' output.
Scope: `~/workspace/etea-prep-next/` only. **No deploy, no GitHub/Vercel change, no touch to `~/workspace/etea-prep/`, `~/workspace/etea-prep-v2/`, or `~/workspace/etea-prep-next-backup-pre-phase2/`.**
Local directory is not a git checkout (`git status` → "not a git repository"), so no diff review was possible; verification is by file content, build, tests, node harnesses and a production smoke test.

## 0. The one permitted content edit (by this verifier)

`src/app/page.tsx:14` — "70 cards, SM-2 spaced repetition" → **"70 cards, simple spaced-review schedule"**, to match the flashcards page wording. That is the only content edit made by this verifier. Verified live: the production smoke-test home page contains "simple spaced-review schedule" and zero occurrences of "SM-2 spaced repetition". Remaining "SM-2" mentions in `src/` are negations only ("not SM-2", "NOT SM-2") in `src/app/flashcards/page.tsx:116-117` and `src/lib/tracking.ts` comments — honest disclaimers, not claims.

## 1. Build + tests (all run by this verifier, exact results)

| Command | Result |
|---|---|
| `npm run build` | **PASS, exit 0.** Next.js 15.5.29, "Compiled successfully in 7.1s", 20/20 static pages generated. Routes include `/`, `/mock`, `/mock/[id]`, `/flashcards`, `/issues`, `/analysis`, `/practice`, `/plan`, `/tutor`, `/robots.txt`. |
| `node scripts/qa-540.mjs` | **PASS, 51/51, exit 0** (re-run after the post-verification DM/PET fix, §8; original pre-fix run 47/47). Last line: "51/51 checks passed." Active total 590 items; every item has `reviewStatus=draft` + reviewed fields; PED-009 regression passes; DM/PET comps use `drawing:20` / `pe:20`; SS slots use `socialstudies`; new §9 built-length checks pass (every mock builds its advertised total; dm-B 100 with 20 drawing / 0 PE, pet-B 100 with 20 PE / 0 drawing). |
| `node scripts/test-flashcards.mjs` | **PASS, 29/29, exit 0.** 29 PASS lines counted (the script prints no numeric total; it prints "All flashcard queue checks passed."). Includes the 4-new-card first-pass-once-in-order check, Again re-queue at end, Again due today (0 days). |
| `npx tsc --noEmit` | **PASS, clean, exit 0** (no output). |

## 2. Acceptance checks

Harnesses: `/tmp/verify-phase2/checks.cjs` (40 checks: 40 passed, 5 failed — see (c)/(d) below; the 5 failures were investigated, 3 were harness bugs, 2 are a real defect) and `/tmp/verify-phase2/checks2.cjs` (9/9 passed, corrected ID-based checks). Both harnesses run the **real compiled code**: `src/lib/data.ts` + `src/lib/tracking.ts` transpiled with `tsc` to CommonJS in `/tmp/verify-phase2/ts/`, executed under a `localStorage` shim. (Harness files live in `/tmp` — ephemeral; the evidence below is the record.)

### (a) PED-009 correct answer/explanation — PASS
- `BY_ID["PED-009"]`: `correctIndex=1`, `options[1]="Egocentrism"`, explanation mentions Egocentrism, stored answer is not "Abstract reasoning".
- Shuffle remapping: `shuffleOptions` over **500 seeds** always places "Egocentrism" at the returned `correctIndex` and preserves the option multiset; also verified correct for **all 570 items** (1 seed each) — the pre-fix total at the time of that run; the bank is now 590 after the §8 fix (the 20 added items are covered by QA-540 §9 / the post-fix harness, not by this seed sweep).

### (b) Every bank record structurally validated — PASS
- QA-540 51/51 (see §1): 610 items on disk incl. legacy `drawing_pe.json` checked for 4 distinct options, `correctIndex` 0–3, non-empty question + explanation; 590 unique active IDs; no duplicate stems (shared first 12 words).

### (c) Trusted mocks contain only reviewed items — PASS
- `trustedOnlyCount(mock) = 0` for **all 20 mocks** (nothing is reviewed yet).
- `buildMockQuestions(mock, seed, {trustedOnly:true})` returns **0 items for all 20 mocks** — the shortfall is never filled from unreviewed items (code: `pool = trustedOnly ? bank.filter(isTrusted) : bank`, then `slice(0, count)`; no fallback).
- Provisional builds return full totals for **all 20 mocks** (the dm-B/pet-B shortfall in (d) is fixed — see §8).
- `isTrusted` is false for `reviewStatus:"draft"` and for a missing `reviewStatus`; true only for `"owner-reviewed"` / `"approved"`.
- UI (code-inspected + smoke-tested 200): mock list defaults to Provisional, shows per-mock reviewed counts, Trusted button disabled at zero with "No reviewed questions yet — provisional practice only."; `/mock/[id]?mode=trusted` shows the shortfall note honestly.

### (d) DM/PET split + Social Studies slots — PASS (fixed post-verification — see §8)
- **Zero cross-contamination confirmed by item ID**: DM mock draws DRW-001,002,003,004,005,006,007,008,009,010 (drawing only, no DRW-011..020); PET mock draws DRW-011..020 (PE only, no DRW-001..010). SS slots: all 6 mocks with a `socialstudies` slot draw exactly the requested count (10 each) from the real 30-item `socialstudies` bank (SS-001..SS-030). The `drawing_pe` compatibility alias draws 10 drawing-ID + 10 PE-ID items when invoked (safety path only — no live comp uses it).
- **PASS (fixed 2026-11-11) — DM/PET mocks now build 100 of 100 questions.** The defect found in verification was: `content.json` comps ask `drawing:20` (dm-B) and `pe:20` (pet-B), but each split bank held only **10** items, and `buildMockQuestions` samples without replacement, so the mocks silently built 90 while advertising "100 Q". Fix (owner's chosen option — add items): 10 drawing items added (DRW-021..DRW-030) and 10 PE items added (PE-001..PE-010), all AI-drafted, draft, unverified. Evidence: `node scripts/qa-540.mjs` **51/51 PASS** incl. new §9 built-length checks — "every mock builds its advertised total (provisional, no duplicates): 20 mocks checked" and "dm-B builds 100 (20 drawing, 0 PE); pet-B builds 100 (20 PE, 0 drawing)"; an independent node harness replicating `buildMockQuestions` against the live banks confirmed dm-B = 100 (drawing 20, PE 0, 0 dupes) and pet-B = 100 (PE 20, drawing 0, 0 dupes), and all 20 mocks build their advertised totals.
- Related data-hygiene gap — **fixed with the counts**: items in `drawing.json`/`pe.json` now carry the split labels (`subject: "Drawing"` / `subjectKey: "drawing"`; `subject: "Physical Education"` / `subjectKey: "pe"`) instead of the legacy `drawing_pe` / `Drawing/PE`; the stale `src/lib/data.ts` comments claiming `drawing_pe` is "still used by the DM/PET mock comps in content.json" are corrected (no live comp references `drawing_pe`; the alias stays only as a safety net).

### (e) 4-new-card flashcard test — PASS
- `test-flashcards.mjs` 29/29, including "session queue holds all 4 new cards in order", "first pass shows each of the 4 cards exactly once, in order", "again re-queues the card at the END of the session", "relearning tail is shown after the first pass, not mid-queue".

### (f) First-pass answer unchanged after refresh/Back/reveal — PARTIAL (storage layer runtime-tested; React wiring code-inspected only)
- Harness (real `tracking.ts`): a session with `firstPass: {"PED-009": 0}` survives save→load unchanged; persisting a second (changed) answer + a retry entry leaves `firstPass` at 0 and grows `retries` to 2.
- Code inspection of `QuizRunner.choose()`: `firstPass[qid]` is set only when `=== undefined`; any later pick appends to `retries` and never overwrites `firstPass`; score/per-subject tables read `firstPass` only; practice mode blocks re-pick while revealed (must go Back first). The option order is seeded from `startTs`, which is restored from the session, so a reload reuses the same displayed option order.
- **Not runtime-tested**: actual clicks (Back → re-pick → refresh) in a real browser. No browser was available to this verifier.

### (g) Timer survives reload/background/sleep, absolute deadline — PARTIAL (storage layer runtime-tested; React ticking code-inspected only)
- Harness: `deadlineTs` is stored as an absolute ms epoch and is byte-identical after a simulated reload; remaining time derives from `deadlineTs - Date.now()` (5,700 s remaining in the test session); an expired session (`deadlineTs` in the past) is **not** resumed by `loadSession`; a practice session with `deadlineTs: null` still resumes.
- Code inspection: `QuizRunner` sets `deadlineTs = startTs + minutes*60*1000` once (restored from session on reload), ticks with `setInterval(() => setNow(Date.now()), 1000)`, and auto-submits when `secondsLeft === 0`. A reload/background/sleep cannot reset it because nothing recomputes the deadline from a fresh start time.
- **Not runtime-tested**: an actual reload mid-mock in a browser, or a real sleep/background interval.

### (h) Timeout/manual submit create exactly one attempt — PARTIAL (storage layer runtime-tested; double-click race code-inspected only)
- Harness: a session with `submitted: true` is not resumed as live (`loadSession` → null) but is still visible via `loadSessionRaw` (the re-check `finish()` performs); one `recordAttempt` call records exactly one attempt.
- Code inspection: `finish()` guards with an in-memory `submittedRef` **and** the persisted `submitted` flag, then calls `recordAttempt` once and saves the session with `submitted: true`; the timeout path calls the same `finish()` via `finishRef`.
- **Not runtime-tested**: two near-simultaneous submit clicks / timeout firing at the same instant as a manual submit in a real browser. The two-layer guard makes a duplicate very unlikely, but the race was not exercised live.

### (i) Backup/restore round-trip — PASS (end to end, real code)
- Seeded state: 3 attempts (quiz with a full `itemRecords` entry + `retryCount: 0`, mock, flash), plan 3 keys, flash state 3 keys, 2 issues (one with reason/proposed correction/source), preferences `roman`/`dark`, 2 sessions (1 live, 1 submitted), `lastDay` set. `exportProgress()` produced a v4 export with all sections and **no key-shaped values** in it.
- Wiped the entire shim store, `importProgress(exported)` → `ok: true`, counts `{attempts: 3, planKeys: 3, flashcardKeys: 3, issues: 2, sessions: 2, preferencesApplied: true}`. After import: attempts 3/3, plan 3/3, flashcards 3/3, issues 2/2, sessions 2/2, preferences `roman`/`dark`. The quiz attempt's `itemRecords` (questionId ISL-001, first/final/correct answers, keyVersion v3) and the PED-009 issue detail (reason `wrong-answer`, correction "Egocentrism", source "ETEA PDF 453") survive intact. Re-import is idempotent (no duplicate attempts/issues). Corrupt JSON and a wrong-app-marker file are both rejected (`ok: false`).

### (j) No secrets in browser/export/logs — PASS
- `grep -rInE "AIza…|gsk_…|sk-or-v1-…|AQ.Ab8…"` over `src/` and `.next/static/` (built client output): **no matches**. Same patterns over `.next/server/app/`: no matches.
- Env names (`GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`) appear only in `src/lib/ai.ts` via `process.env`, imported only by the server-side API routes (`/api/tutor`, `/api/explain`, `/api/plan`). No `NEXT_PUBLIC` variables anywhere. `.env.example` contains placeholders only ("NEVER commit a real key"). The v4 export in (i) contains no key-shaped values.

### (k) Production server smoke test — PASS
- `next start` on port 3101 (local only, killed afterwards; port confirmed closed). HTTP statuses: `/` 200, `/mock` 200, `/flashcards` 200, `/tutor` 200, `/analysis` 200, `/issues` 200, `/plan` 200, `/robots.txt` 200.
- `robots.txt` body is exactly `User-Agent: *` + `Disallow: /`. `X-Robots-Tag: noindex` header present on `/` and `/mock` (set for `/:path*` in `next.config.mjs`); layout metadata has `robots: { index: false }`; footer states noindex/robots is NOT access control.
- Home page served the new flashcard wording; mock page served the "provisional practice" copy.

### (l) New banks actually wired — PASS
- Built data module: `QUESTIONS` total **590**; registry has `drawing` (20), `pe` (20), `socialstudies` (30); no `drawing_pe` bank registered (file stays on disk, unregistered). GK bank: 30 items, topics only "GK — Pakistan Studies" / "GK — Islamiat" (syllabus-mapped, no world-capitals items). Mock compositions resolve to real banks; SS slots draw from the real bank (see (d)).

## 3. Copy/label spot-checks (code + smoke test)
- Footer: "mocks are provisional practice built from those unreviewed items. Trusted mode uses reviewed items only." — present (`src/app/layout.tsx`).
- Tutor status line: "Keys configured — live responsiveness not health-checked." (`src/app/tutor/page.tsx:104`); home: "AI Tutor — live, answered via fallback… the primary Gemini key status is unverified." (`src/app/page.tsx:126`) — accurate as written (see §4).
- Flashcards page: "simple spaced-review schedule", due-only default + opt-in cram, intervals on grade buttons — present; practice page persists subject/round/seed in `etea_practice_state_next` and restores the same set on reload (code-inspected); analysis page has clickable attempts with per-item tables + a separate flash stat card (code-inspected); Issues page exists with a Nav link (smoke-tested 200).

## 4. Gemini key correction (carried into this report; supersedes the old suspicion)
- The saved Vercel `GEMINI_API_KEY` has **changed** since the v3 deploy. The real Propertank026 "ETEA Prep Tutor" key was retrieved from Google AI Studio and saved to Vercel (Vercel confirmed "Updated Environment Variable successfully").
- **Format correction:** the key starts with `AQ.Ab8…`, NOT `AIza…`. Per Google's own AI Studio docs this IS the current format (since 28 May 2026 all new AI Studio keys are auth keys), so the earlier "probably invalid because not `AIza…`" suspicion was **wrong**; the earlier live Gemini failure may have had another cause.
- The new key takes effect **only on the next deployment** (none triggered yet). **A live tutor re-test is still pending after the next deploy.** The labels worker's home copy ("primary Gemini key status is unverified") remains accurate as written.

## 5. Remaining gaps (in priority order)
1. ~~**DM/PET mocks are 90 questions, advertised as 100** — the one real defect found (§2d). Needs an owner decision before any deploy is presented as complete.~~ **FIXED 2026-11-11 (see §8): DM/PET mocks now build 100/100; QA 51/51.**
2. ~~**Drawing/PE items still labelled `subjectKey: "drawing_pe"` / `subject: "Drawing/PE"`**; stale `drawing_pe` comments in `data.ts`. Fix with gap 1.~~ **FIXED 2026-11-11 with gap 1 (see §8).**
3. ~~**Home metadata description still says "540 MCQs"** (`src/app/layout.tsx`, `description` field) while the bank is now 570. Stale copy the labels worker did not cover.~~ **FIXED 2026-11-11: metadata now says 590 MCQs; home body (via `COUNTS.total`) and mock-list copy also updated to 590 (see §8).**
4. No real-browser runtime test of QuizRunner interactions (first-pass through Back/re-pick/refresh clicks; timer across an actual reload/sleep; double-submit race); practice-page reload restore and analysis/issues click-throughs are code-inspected + HTTP-200 only.
5. Tutor live re-test pending after next deploy (new Gemini key not yet live — §4). Groq fallback path also not yet live-tested.
6. ~~QA-540's "47/47" does not cover built mock lengths — consider adding a built-length check (every mock's `buildMockQuestions` length == `total`, except trusted mode) so gap 1 cannot recur silently.~~ **FIXED 2026-11-11: `qa-540.mjs` §9 now asserts built lengths for all 20 mocks (provisional) plus the dm-B/pet-B composition (see §8).**

## 6. What is NOT verified (explicit)
- Anything in a real browser (clicks, reloads, sleep, double-submit race, phone rendering of captions, visual layout of cards/pages).
- Any deploy, GitHub state, or Vercel state (not touched; local dir is not a git checkout).
- The live tutor against the new Gemini key (pending next deploy — §4).
- The 8 Phase 1 articles' factual claims (out of scope, unaudited as before).
- Whether the DM/PET 90/100 shortfall existed before Phase 2 (not investigated; the split is Phase 2 work, the comp totals predate it).
- Performance, accessibility, or mobile UX beyond the checks above.

## 7. Verdict
**Phase 2 is verified, and the one real defect found (DM/PET mocks building 90/100) is now fixed — see §8.** Everything else checked passes: build, both test suites, typecheck, PED-009 + shuffle, trusted gating with honest shortfall, SS wiring, flashcard queue, first-pass/timer/submit persistence at the storage layer, full backup round-trip, no secrets, production smoke test, and noindex boundary. No deploy has been done; the fix is local only.

## 8. Post-verification fix (2026-11-11) — DM/PET 90/100 defect fixed

Defect (§2d, found in verification): DM/PET mocks built 90 of 100 questions —
comps ask `drawing:20` / `pe:20` but each split bank held only 10 items, and
`buildMockQuestions` samples without replacement. Fix applied 2026-11-11 (the
owner's chosen option from §2d — add items, not lower the totals). No deploy,
no GitHub/Vercel change.

- **New items:** `drawing.json` +10 drawing-only items DRW-021..DRW-030
  (cool colours, complementary colours, horizon line, tints, shades, still
  life, portrait, landscape, texture, proportion); `pe.json` +10 PE/sports-only
  items PE-001..PE-010 (basketball, volleyball, badminton, 100 m sprint,
  flexibility, cooling down, kabaddi, shot put, heart rate, sportsmanship).
  All 20 AI-drafted, `verified: false`, `reviewStatus: "draft"`,
  `sourceNote: "AI-drafted; unreviewed"`, 4 distinct options, exactly one
  correct answer, short explanation. Not presented as verified.
- **Labels:** existing DRW-001..010 → `subject: "Drawing"`,
  `subjectKey: "drawing"`; DRW-011..020 → `subject: "Physical Education"`,
  `subjectKey: "pe"` (IDs and question/option/explanation content unchanged).
  Legacy `drawing_pe.json` got the same label corrections and still holds
  only the original 20 items. `src/lib/data.ts` stale comments corrected
  (no live comp uses `drawing_pe`; the alias stays only as a safety net).
- **Counts:** active total 570 → **590** (`content.json` `counts.total`,
  `counts.bySubject` Drawing 10 → 20, Physical Education 10 → 20,
  `bySubject` indexes extended with the 20 new IDs). Live copy updated
  540 → 590: home metadata description (`src/app/layout.tsx`), mock-list
  "590-question bank" (`src/app/mock/page.tsx`); home body reads
  `COUNTS.total` (590). The "Rs. 540" figure in `maths.json` is a money
  amount in a question, not a count, and was correctly left untouched.
- **QA script:** `scripts/qa-540.mjs` expected counts 570 → 590, ID checks
  updated, legacy check now compares against the original 20 items, two new
  checks for the added items, and a new §9 built-length check (every mock
  builds its advertised total; dm-B/pet-B composition). Filename kept
  (historical; noted in its header).
- **Test results after the fix (exact):** `node scripts/qa-540.mjs` —
  **51/51 checks passed, exit 0**; `node scripts/test-flashcards.mjs` —
  **29/29, "All flashcard queue checks passed."**; `npx tsc --noEmit` —
  **clean, exit 0**; `npm run build` — **PASS, exit 0, "Compiled
  successfully in 3.8s", 20/20 static pages**. Independent node harness
  replicating `buildMockQuestions` against the live banks: **dm-B builds 100
  (drawing 20, PE 0, 0 dupes); pet-B builds 100 (PE 20, drawing 0, 0
  dupes); all 20 mocks build their advertised totals**. `next start` smoke
  test (port 3101, killed afterwards): home page HTTP 200 serving
  "590 MCQs"; mock page serving "590-question bank".
- **§2(d) acceptance row is now PASS** with the evidence above. Remaining
  open items from §5 are now only 4 (no real-browser QuizRunner test) and 5
  (tutor live re-test pending after next deploy).
