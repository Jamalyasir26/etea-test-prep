# Stage 1 P2 — Verification Report (2026-11-12, local only, NOT deployed)

Stage 1 P2: provenance / concept IDs, backup versioning, B06 homepage +
tutor wording alignment (live health indicator), B07 React #418
hydration investigation + route-bound telemetry, API privacy
disclosure, font delivery (Noto Nastaliq Urdu headings / Noto Sans
Arabic body via next/font).

Backup (flat, diff-verified identical before work started):
`~/workspace/etea-prep-next-backup-pre-p2/`. No deploy, no GitHub /
Vercel / env change. No Stage 2 (FSRS) or Stage 3 (shadcn / Framer /
Recharts / redesign) work. Additive-first throughout: no renames, no
breaking changes to data shapes or stored keys, no question / answer /
explanation text rewritten.

## Verification summary

- `npm run build` PASS (Next.js 16.4.6, 22 routes: 16 static + 6
  dynamic — same table as Tier 3 plus no route changes).
- `npx tsc --noEmit` clean with `strict: true`.
- **537 checks, 0 failures** across 15 suites: qa 52/52, scoring 39/39,
  reviews 37/37, retrieval 28/28, fallback-chain 24/24, timeouts 43/43,
  storage 36/36, tutor-lang 30/30, api-guard 60/60, tier4 46/46,
  flashcards 29/29, provenance 33/33 (new), backup-versioning 33/33
  (new), telemetry 28/28 (new), fonts 19/19 (new).
- Local prod server (`next start`): all 14 pages HTTP 200; home counts,
  badges, fonts, health-indicator loading state, telemetry section and
  privacy disclosures verified in served HTML (details per item below).
  Server stopped afterwards; no stray processes.

## 1. Provenance / concept IDs

### What changed (file:line)

- `src/lib/data.ts:53-55,64,73-75` — `Question` and `Note` gain
  optional `conceptId?`, `syllabusClause?`, `sourceKind?`; new
  `SourceKind = "official" | "concept-extracted" | "proxy" | "partial"`.
- `src/lib/data.ts:243` — `provenanceBadge()` helper: null when no
  sourceKind (no badge); per-kind label + plain-language detail +
  tone. "concept-extracted" names its source; degrades gracefully if a
  source name were ever missing (never invents one).
- `src/components/ProvenanceBadge.tsx` (new) — pure presentational
  badge; renders null without a sourceKind; safe for SSR (no hooks).
- `src/app/library/page.tsx` — badge under each note title.
- `src/components/QuizRunner.tsx` — badge beside the subject badge on
  every question (covers practice + mocks).
- `src/app/review/page.tsx` — badge on every review card.
- Data (migration script `/tmp/apply-provenance.mjs`, kept out of the
  repo; mapping table below): 7 bank JSONs + `src/data/content.json`.
  Bank diffs are purely additive (new keys appended per object; the
  only other changed lines are `reviewedAt` lines gaining a trailing
  comma). Formats preserved: banks `JSON.stringify(arr, null, 1)` +
  newline; content.json compact single line (both round-trips verified
  byte-identical before editing).

### Provenance assignments (honest subset only)

- **55 P0.3 MCQs** (TAJ-031..050, ARB-061..080, ISL-091..105):
  `sourceKind: "concept-extracted"`, conceptId, syllabusClause. Every
  one already carried `source: "Original content — concept-extracted
  from <name>"`; the script refused to label any item lacking it.
- **15 P0.3 notes** (Ikhfa, Idgham, Qalqalah, Madd Types, Iqlab, Common
  Tajweed Mistakes; Al-Fa'il, Al-Maf'ul Bihi, Al-Mubtada'/Khabar, Sarf,
  I'rab; Wahi, Hadith, Seerat, Fiqh): same three fields.
- **15 owner-reviewed MCQs**: `sourceKind: "proxy"` (they practise the
  concept; none is from an official paper), conceptId, syllabusClause —
  except PAK-008, which has NO clause: Pak Studies maps ambiguously
  between the Social Studies and GK sections, so none is claimed.
- **Everything else (575 MCQs, 95 notes)**: no provenance fields, no
  badge. **Zero items are marked "official"** — nothing in the bank
  comes from an official paper, so claiming it would be false.
- **syllabusClause values** map the item to a section of the named
  pattern document for study organisation only, e.g. `Pattern B
  (ESED-453) — Islamiyat section (30)`, `… — Qari: Tajweed/Hifz +
  Islamiyat section (30 combined)`, `… — Arabic section (30)`,
  `… — English section (20)`, `… — Urdu section (10)`,
  `… — Mathematics section (10)`. This is NOT a claim that any specific
  advert (in particular ZamungKor, which has no published syllabus)
  uses that pattern; the site-wide pattern banner already says so.
- **conceptId grouping** (same concept ⇒ same id; verified by test):
  `english-passive-voice` ×4, `english-indirect-speech` ×4,
  `tajweed-qalqalah-letters` ×3 MCQs + note, `arabic-raf-signs` ×3,
  `arabic-nasb-signs` ×2, `tajweed-idgham-letters` ×2 MCQs + note,
  `islamiyat-quran-surah-count` shared by ISL-001 + ISL-091,
  `tajweed-ikhfa-haqiqi` shared by TAJ-031 + Ikhfa note, and more (full
  mapping in the migration script). No conceptId spans two subjects.

### Before / after

- Before: only the `source` string existed (and only on P0.3 items);
  no per-item provenance in the UI; no way to group same-concept items.
- After: badges render first-class in library / practice / mocks /
  review; conceptIds group same-concept items; clause mapping is
  explicit and honestly scoped.

### Tests — `node scripts/test-provenance.mjs`: 33/33 PASS

Backward compat (legacy items load, null badge); every
official/concept-extracted item carries a source name; zero "official"
items; all 55 + 15 + 15 carry full provenance; PAK-008 has no clause;
no conceptId spans subjects; known groups share ids; slugs are
lowercase; badge wording per kind; badge wired into all three surfaces.

### Live verification (after deploy)

Open /library (Tajweed subject): the Ikhfa note shows a teal
"Concept-extracted" badge. Open a practice quiz containing a P0.3 item
or /review: badges show ("Concept-extracted" / "Practice proxy").
Hover: the tooltip names the source and the pattern section.

## 2. Backup versioning

### What changed (file:line)

- `src/lib/tracking.ts:916,918` — `BACKUP_VERSION = 5`,
  `SUPPORTED_BACKUP_VERSIONS = [4, 5]`.
- `src/lib/tracking.ts:926` — `migrateBackupPayload()`: pure, never
  mutates input; v5 passes through unchanged; older versions gain the
  v5-only fields (`reviews: {}`, `annotations: {notes: {},
  includeInTutor: false}`) as empty defaults.
- `src/lib/tracking.ts` (validateBackupPayload, above
  importProgress) — shape check returning an error string or null:
  app marker + numeric version + attempts list; versions newer than
  BACKUP_VERSION rejected with the "newer than this build" message.
  Rejection happens BEFORE any stored data is read for writing.
- `src/lib/tracking.ts:837` — `exportProgress()` stamps BACKUP_VERSION
  (was a literal 5; same value).
- `importProgress()` — now validate → migrate → merge; the merge body
  is UNCHANGED (it sees exactly one shape). The v5 shape, stored keys,
  and merge semantics (attempt dedup, live-session protection, etc.)
  are untouched. Versions older than 4 take the same lenient path they
  always did (missing fields default to empty) via the v4 migration.

### Version policy (documented in code + here)

Exports are stamped with BACKUP_VERSION. Imports accept
SUPPORTED_BACKUP_VERSIONS, migrate them to the current shape, then
merge. Newer versions are rejected (they may contain fields this build
cannot interpret). Bump BACKUP_VERSION only with a matching migration.

### Tests — `node scripts/test-backup-versioning.mjs`: 33/33 PASS

Constants; v4→v5 migration + input immutability; v5 identity; v3
lenient path; validation (v6, wrong marker, missing attempts,
non-numeric version, null, array); v6/corrupt/wrong-marker rejection
leaves stored data byte-identical (snapshot before/after); v4 + v5
end-to-end restore; export→import round trip. One test bug found and
fixed during the run (wrong storage key in the test itself — the kept
attempt used `etea_attempts_next_v1` instead of the real
`etea_attempts_next`); the code was correct.

### Live verification (after deploy)

On /analysis: Export downloads a v5 file; re-importing it restores
with no error. (Same behaviour as before — this item formalises it;
no user-visible change except the code-level guarantee.)

## 3. B06 — wording alignment + live health indicator (+ privacy disclosure)

### What changed (file:line)

- `src/components/TutorHealth.tsx` (new) — fetches
  GET /api/tutor/health ONCE on mount (no polling: each probe is a
  real tiny provider call counting against quota), 28 s timeout,
  manual Refresh button. States: loading / loaded (per-provider
  status + model + latency + errorClass, cold-start note) / failed
  (plain reason, never crashes the page). Defensive parsing: any
  unexpected shape becomes the failed state. Renders the same
  "checking" state on server and first client render (no hydration
  risk). `variant="full"` (tutor page) / `variant="summary"` (home).
- `src/app/page.tsx:126-135` — stale alert replaced: "AI Tutor — live,
  answered via fallback … the primary Gemini key status is
  unverified" → accurate wording + `<TutorHealth variant="summary" />`.
- `src/app/tutor/page.tsx:168` — the old key-presence status box (GET
  /api/tutor + "Keys configured — live responsiveness not
  health-checked") is replaced by `<TutorHealth variant="full" />`;
  the old fetch + `status` state are deleted. The intro's historical
  claim ("On-device study assistant is gone") → present-tense "This is
  the live tutor."
- Privacy disclosure (Stage 1 P2 scope): `src/app/tutor/page.tsx:172`
  (before the chat form) and `src/app/plan/page.tsx:82` (before the AI
  plan form) — "your question goes to Gemini, Groq or OpenRouter …
  Don't share sensitive personal data." The GET /api/tutor endpoint
  itself is unchanged (still a valid key-presence diagnostic).
- Grep-verified: no remaining user-facing "not yet tested", "key
  status is unverified", "not health-checked", "is gone", "Stage 0" or
  "answered via fallback" wording in src/app or src/components (only
  code comments documenting what was replaced).

### Before / after

- Before: home carried Stage 0-era claims; the tutor page showed key
  presence only and admitted responsiveness was "not health-checked".
- After: both pages show the LIVE per-provider status from the health
  endpoint; no historical claims anywhere.

### Live verification (after deploy)

Home shows a one-line live status ("Groq responding; Gemini (quota),
OpenRouter (quota) not responding" — whatever is true at check time).
/tutor shows the full per-provider list with models + latencies, and
the privacy line above the chat input. /plan shows the privacy line
above "Generate AI plan". With live keys, Refresh re-checks on demand.

## 4. B07 — React #418 hydration investigation + telemetry

### Finding: root cause PROVEN (deterministic, affected every visitor)

No audit file describes #418; the investigation searched the codebase
for the classic causes (timezone-dependent rendering, localStorage
reads during render, random/time seeds during render). Two real causes
were found, both on prerendered (○ static) pages:

1. **Timezone-dependent timestamp (deterministic).** Old
   `src/app/review/page.tsx:231` rendered
   `new Date(at).toLocaleString()` during SSR for the 15 bank-verified
   items. The build server renders in UTC; the browser renders in the
   visitor's timezone — different text for the same instant, i.e. a
   React text-content hydration mismatch (#425, in the #418 family).
   Proof: the same stored instant `2026-11-11T22:23:00Z` renders as
   `11/11/2026, 10:23:00 PM` under `TZ=UTC` and `11/12/2026, 3:23:00 AM`
   under `TZ=Asia/Karachi` (both run locally). The old code is still
   visible at backup `src/app/review/page.tsx:231`.
2. **localStorage reads in state initializers (latent).** `review`,
   `mock` list and `library` pages initialised state from
   `loadReviews()` / `loadAnnotations()` / `loadAnnotationOptIn()`,
   which return empty/false during SSR but the stored values on the
   client — so any stored decision/annotation changed the counts,
   statuses, textarea values or checkbox state between server and
   first client render.

Ruled out (with evidence): `practice` and `mock/[id]` use
`Date.now()` seeds, but both sit behind Suspense + `useSearchParams`,
so their content is client-rendered — the built `practice.html`
contains zero quiz content (verified). Flashcards loads state in an
effect; its `today` is a UTC ISO date (stable); `sessionStart` is
never rendered. Home / plan / analysis / tutor already load in
effects. `LangProvider` defaults en/light and applies stored values in
an effect (hydration-safe pattern, unchanged).

### Fixes (small, safe, same pattern)

- `src/app/review/page.tsx:83-94,250-256` — reviews load in
  `useEffect` (initial state `{}`); the attribution timestamp renders
  ONLY after mount (before mount, only "· by owner" shows — identical
  on server and client). Local-time display is preserved.
- `src/app/mock/page.tsx:19-24` — reviews load in `useEffect`.
- `src/app/library/page.tsx:21-30` — annotations + opt-in load in
  `useEffect`.
- Verified in the new build: `review.html` / RSC payloads contain no
  rendered timestamp strings; `toLocaleString` appears only behind
  `mounted`; no `useState(load*)` initializer remains in any
  prerendered page. The backup-copy rebuild attempt (to show the old
  SSR HTML directly) failed on a symlinked node_modules resolution
  error in /tmp — the TZ proof + source reading above stands on its
  own and is the evidence recorded here.

### Telemetry (kept in place for real occurrences)

- `src/lib/telemetry.ts` (new) — `recordTelemetry` / `loadTelemetry` /
  `clearTelemetry`, key `etea_telemetry_next_v1`, newest-first, capped
  at 50, messages truncated to 300 chars, never throws, SSR-safe.
  `looksLikeHydrationError()` matches "hydrat*" and Minified React
  errors #418/#419/#423/#425. Nothing leaves the device.
- `src/components/TelemetryListener.tsx` (new) — mounted once in
  `src/app/layout.tsx`; listens for window `error` +
  `unhandledrejection`, and wraps `console.error` ONCE (guard flag,
  always calls through to the original) because React reports
  hydration failures via console.error, not window.onerror. Renders
  nothing.
- `src/app/issues/page.tsx` — "Client errors (this device only)"
  section: time (UTC), route, type, message + Clear button.

### Tests — `node scripts/test-telemetry.mjs`: 28/28 PASS

Detection (incl. #418/#419/#425, negatives); record/load round trip;
route default; newest-first + 50-cap; 300-char truncation; malformed
stored data tolerated; clear; never throws when storage throws;
no-ops without window; listener mounted in layout; section on /issues;
console.error wrap guarded.

### Live verification (after deploy)

Open /review in a PKT-timezone browser: no console hydration error;
the "by owner" attribution gains its local-time timestamp just after
load. Open /issues: the "Client errors" section shows "No client
errors recorded." (If a hydration error ever recurs in a real browser,
it will appear there with its route.)

## 5. Font delivery

### What changed (file:line)

- `src/app/layout.tsx:2,17-28,41` — `next/font/google`:
  `Noto_Nastaliq_Urdu` (arabic subset, weights 400/600/700) and
  `Noto_Sans_Arabic` (arabic + latin subsets, weights 400/500/600/700),
  `display: "swap"`, CSS variables `--font-nastaliq` /
  `--font-sans-arabic` applied to `<html>`. Fonts are downloaded at
  BUILD time and served from `/_next/static` — no runtime Google Fonts
  request, as the CSP allows `font-src 'self' data:` only. No `<link>`
  font tags anywhere.
- `src/app/globals.css:35,46,49` — body uses
  `var(--font-sans-arabic)` with the literal name + system stack as
  fallbacks; headings use `var(--font-nastaliq)` falling through to
  Sans Arabic + system (Nastaliq has no Latin glyphs); Urdu-mode
  headings get `line-height: 2` for Nastaliq's tall ascenders.

### Build-time fetch

`npm run build` SUCCEEDED locally — the sandbox reached Google Fonts
and the fonts were fetched and emitted (5 woff2 files under
`.next/static/media`). No font-fetch blocker occurred, so no fallback
was needed and none was added.

### Tests — `node scripts/test-fonts.mjs`: 19/19 PASS

next/font/google wiring, both fonts + variables + swap + subsets,
CSS variable usage + fallbacks, Urdu line-height rule, zero Google
Fonts URLs in src/, no font `<link>` tags, built output emits woff2
files, built CSS references local files only and defines the variables.

### Served-output verification (local prod server)

31 `@font-face` rules in the served CSS; Noto Nastaliq Urdu + Noto Sans
Arabic faces present; `h1,h2,h3` rule uses `var(--font-nastaliq)`;
zero `fonts.g` URLs in served HTML/CSS; woff2 files served from
`/_next/static/media/`. Visual Nastaliq rendering was NOT checked
(no screenshot capability here) — that is a post-deploy browser/owner
check: Urdu headings should render in Nastaliq script.

## Files changed (31 for deploy)

Changed (21): `package.json`, `src/app/globals.css`,
`src/app/issues/page.tsx`, `src/app/layout.tsx`,
`src/app/library/page.tsx`, `src/app/mock/page.tsx`,
`src/app/page.tsx`, `src/app/plan/page.tsx`, `src/app/review/page.tsx`,
`src/app/tutor/page.tsx`, `src/components/QuizRunner.tsx`,
`src/data/banks/{arabic,english,islamiyat,maths,pakstudies,tajweed,urdu}.json`,
`src/data/content.json`, `src/lib/data.ts`, `src/lib/tracking.ts`.
New (8): `src/components/ProvenanceBadge.tsx`,
`src/components/TelemetryListener.tsx`, `src/components/TutorHealth.tsx`,
`src/lib/telemetry.ts`, `scripts/test-provenance.mjs`,
`scripts/test-backup-versioning.mjs`, `scripts/test-telemetry.mjs`,
`scripts/test-fonts.mjs`.
Plus this report + the CHANGELOG.md P2 section.
No API routes, no lib/ai.ts, no model choices touched. No key material
anywhere. `tsconfig.tsbuildinfo` / `node_modules` / `.next` must not be
uploaded (as ever).

## Honest limits

- No live provider calls locally (no keys): the TutorHealth loaded
  state (per-provider list) was verified only in its loading/failed
  states locally; the loaded state needs the post-deploy live check.
  The health endpoint itself returned an honest `overall: "down"` with
  no keys and did not crash.
- No real-browser render: Nastaliq visual appearance, the mount-gated
  timestamp pop-in, and the hamburger/360px behaviour (Tier 4, still
  awaiting the owner's phone check) need a real browser.
- The B07 fix removes the proven + latent mismatch causes found by
  code search; the telemetry exists precisely because a hydration
  error can only be observed in a real browser — an empty telemetry
  list after deploy is the confirmation, not a proof in advance.
- The backup-copy rebuild (for a before/after SSR HTML comparison)
  failed on a /tmp symlink issue; the B07 proof rests on the TZ
  demonstration + source reading, both recorded above.
