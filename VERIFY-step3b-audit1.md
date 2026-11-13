# VERIFY — Step 3b-audit Batch 1 (F21 + F14/F18 + F10 + stale counts)

Batch 1 of 2. Base: GitHub HEAD 646d325 (Step 3a deployed). Backup
`~/workspace/etea-prep-next-backup-pre-step3b-audit/` already existed
and the tree was verified byte-identical to it (empty diff) before
any change; the backup was NOT recreated. No push/deploy/GitHub/
Vercel/env action taken.

Baseline (before changes): build PASS, tsc clean, 2038 checks /
26 suites, 0 failures. Final: build PASS, tsc clean, **2130 checks
/ 27 suites, 0 failures** (+92, new `test-step3b-audit1`).

## 1. F21 — 360px pattern badge overflow (FIXED)

Root cause (verified in source before fixing): the home pattern
selector renders the pattern's `confidence` string VERBATIM inside
`TrackConfidenceBadge` → `.sbadge`, which had `white-space: nowrap`.
Pattern B's string is 137 chars ("CONFIRMED (official-hosted ETEA
PDF 453). The match to 2025 TT/AT papers is UNVERIFIED — no cited
evidence; do not treat it as confirmed.") → ~869px wide, forcing
horizontal overflow at 360px.

Fix (`src/app/globals.css`, `.sbadge` rule): `white-space: normal`,
`max-width: 100%`, `min-width: 0`, `overflow-wrap: break-word`,
`text-align: start`. The verbatim string is kept (deliberate: the
confidence wording stays exact); it now wraps onto its own lines.
The badge icon keeps `flex-shrink: 0`. One fix covers EVERY page:
all semantic badges (`StatusBadge`, `ReviewStatusBadge`,
`TopicBadge`, `TrackConfidenceBadge`, `ProvenanceBadge`) render
through the same `.sbadge` class — tracks, mock, vacancies, home,
QuizRunner. Audit of the same pattern elsewhere: the only other
`white-space: nowrap` in `globals.css` is the skip link (must stay);
the shadcn `Badge` (also nowrap) is imported nowhere on badge pages.

Evidence story (360px): the wrapping rules are asserted at
source/CSS level in the new suite AND proven in the production
build — the minified served CSS contains
`.sbadge{white-space:normal;overflow-wrap:break-word;...;min-width:0;max-width:100%;...}`.
The live browser cannot resize, so the owner's 360px phone check
remains the final arbiter for the rendered badge (see §5).

## 2. F14/F18 — health check cache + attribution (FIXED)

Server cache: new `src/lib/healthCache.ts` — `createProbeCache`
(TTL + in-flight sharing + failed probes never poison the cache;
clock-injectable for tests). `src/app/api/tutor/health/route.ts`
now serves probes through a 5-minute cache (per instance) and sets
`Cache-Control: private, max-age=300, must-revalidate`. The
same-origin guard + rate limit still run on every request (the
handler always executes — only the probe is skipped). Cache hits
return `cached: true`, `coldStart: false`, and the ORIGINAL
`checkedAt`. Client coherence: the Step 2b client cache is also
5 minutes (`HEALTH_CACHE_TTL_MS`), so a manual Refresh inside the
window returns the cached probe with its age shown honestly;
`TutorHealthData` gained the optional `cached` field.

Proven live on the local prod server (no keys configured locally,
so zero provider quota was spent): hit 1 →
`cached:false, coldStart:true, checkedAt 16:49:24.915Z`; hit 2 →
`cached:true, coldStart:false`, IDENTICAL checkedAt, `Cache-Control`
header present on both.

Attribution: `generateTutorAnswer` in `src/lib/ai.ts` already
returns the provider that ACTUALLY answered (one return per branch;
fallback attribution is test-proven in `test-fallback-chain.mjs`).
The live contradiction (footer "via Gemini" vs panel showing Gemini
on quota error) is a timing artifact: the panel shows the last probe
(up to 5 minutes old; per-minute quota errors are transient) while
the footer is per-answer truth at answer time — the two CAN
legitimately differ across time. The one real defect was client-side:
the tutor page defaulted ANY unknown `provider` value to "OpenRouter
(free model)". Fixed: new `providerDisplayName()` in
`src/lib/tutorHealth.ts` returns null for unknown/missing values and
`src/app/tutor/page.tsx` omits the via-line instead of
misattributing. The footer now never names a provider the API did
not report.

## 3. F10 — timezone: local days for streaks (FIXED)

Root cause: `dayKey()` sliced the UTC date off ISO timestamps and
the streak cursor mixed local stepping (`setDate`) with UTC
comparison (`toISOString().slice(0, 10)`). Day boundaries were UTC
midnight, not the user's local midnight.

Fix (`src/lib/tracking.ts`): new `localDayKey(date)` (local
getters, same pattern as `forecastDue`); `dayKey(iso)` now parses
the instant and returns its LOCAL day (unparseable input keeps the
old slice fallback, never crashes); the streak loop is extracted
as pure `countStreakDays(daySet, today)` using local keys only;
`DAY_KEY` ("last study day", export payload) is now written as a
local day key. `src/app/analysis/page.tsx`: the "last 7/30 days"
filter cutoff + comparison now use `localDayKey`/`dayKey` (same
helper family — "last 7 days" means the user's local days).

TZ-pinned proof (child processes, same pattern as the Step 2 fixes
suite): `dayKey("2026-11-13T20:00:00.000Z")` is 2026-11-14 in
Asia/Karachi and 2026-11-13 in UTC; the boundary streak case
(18:00Z + 20:00Z attempts, "today" 01:00Z) yields streak 2 in
Karachi, 1 in UTC — the boundary follows local time.

Audited and LEFT (documented, not defects): `src/lib/ai.ts`
rate-limit day key stays UTC (server-side quota window, not a user
day boundary); export/issue filenames keep UTC dates (cosmetic
filenames, not day logic); per-row date displays (`a.date.slice`)
in Analysis/Issues tables still show UTC dates — display-only,
out of this batch's scope; changing them is a separate future
display decision, not part of the audit's F10 streak requirement.

## 4. Stale dashboard counts (FIXED)

Root cause: `quickMocksDesc` / `quickTracksDesc` in
`src/lib/i18n.tsx` hardcoded "20 timed mocks" / "19 post tracks"
(en + roman + ur) while Step 3a hid 7 tracks / 4 mocks. Fix: both
keys are now parameterized (`{mocks}` / `{tracks}` in all three
languages) and `src/app/page.tsx` renders them via `tf()` with
`descParams` from `VISIBLE_COUNTS` (16 / 12). Served home HTML
confirms "16 timed mocks / practice tests", "12 post tracks with
patterns", headline "12 teaching post tracks · 16 mocks", and zero
occurrences of the stale literals. (The "110 notes" / "70 cards"
subtitles are still true values and were left as-is.)

## 5. For the parent's live verification (post-deploy, browser only)

1. 360px phone check (OWNER — browser cannot resize): home pattern
   badge wraps within the screen, no horizontal scroll; check the
   same badge on /tracks and a mock detail page.
2. `/api/tutor/health` twice within 5 minutes: second response has
   `cached: true` and the same `checkedAt`; `Cache-Control: private,
   max-age=300` present.
3. Tutor: ask a question; the via-line names the provider the API
   reported (or is absent if unreported — never a guessed name).
4. Streak: study activity near local midnight lands on the correct
   local day (needs real usage across a PKT midnight; TZ-pinned
   tests prove the logic, live behaviour follows the same code).
5. Home dashboard cards read "16 timed mocks" / "12 post tracks"
   in en + ur; /review still 15/200.

## 6. Files changed (vs backup-pre-step3b-audit)

Changed (10): `package.json` (new `test:step3b-audit1` script),
`src/app/globals.css`, `src/app/page.tsx`,
`src/app/analysis/page.tsx`, `src/app/tutor/page.tsx`,
`src/app/api/tutor/health/route.ts`, `src/lib/tracking.ts`,
`src/lib/i18n.tsx`, `src/lib/tutorHealth.ts`, `CHANGELOG.md`.
New (3): `src/lib/healthCache.ts`,
`scripts/test-step3b-audit1.mjs`, this report. Deleted: 0.
No content/bank/scheduler/scoring/plan/review changes. No new i18n
keys (2 keys re-parameterized). Zero Nastaliq (grep-verified).

## 7. Verification summary

- `npm run build` PASS (30.1s). `npx tsc --noEmit` clean (strict).
- All 27 suites green: **2130 checks, 0 failures** (baseline 2038
  + new suite 92: F10 real-module + TZ-pinned children, healthCache
  TTL/dedup/failure, route + attribution source assertions,
  badge CSS, counts derivation).
- Local prod server (port 3131, stopped after): all 14 routes
  HTTP 200; served HTML confirms new subtitles + counts + review
  heading; built CSS confirms the wrap rules; health double-hit
  confirms the server cache (see §2).
- NOT verified here (needs post-deploy browser/phone): §5 items 1–4.
