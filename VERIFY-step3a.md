# VERIFY — Step 3a: Teaching-only structure + Vacancy Coverage Ledger + SST split

Local only, 2026-11-13. NO push, deploy, GitHub, Vercel, or env change.
Backup: `~/workspace/etea-prep-next-backup-pre-step3/` (empty diff confirmed
before work started). Baseline re-run before changes: build PASS, tsc clean,
25 suites / 1672 checks green.

## §1 — What changed (11 files: 9 modified + 2 new)

| File | Change |
|---|---|
| `src/lib/data.ts` | Step 3a visibility block (lines 211–279): `TEACHING_TRACK_IDS` (the ONE source of truth), `isTrackVisible`, `VISIBLE_TRACKS`, `VISIBLE_MOCKS`, `HIDDEN_VACANCY_POSTS`, `VISIBLE_VACANCIES`, `VISIBLE_COUNTS`. Full `TRACKS`/`MOCKS`/`VACANCIES`/`COUNTS` untouched. |
| `src/lib/ledger.ts` | NEW (pure, node-testable): subject catalog, 12 per-post ledger defs, `coverageFor`, `ledgerRowFor`, `buildLedger`, `ledgerDefIds`. |
| `src/lib/i18n.tsx` | 33 new keys (en + ur each; roman on short labels) + `homeIntro` now says "teaching post tracks". Keys 588 → 621. |
| `src/app/tracks/page.tsx` | Renders `VISIBLE_TRACKS`/`VISIBLE_MOCKS`; scope note + ledger link. |
| `src/app/tracks/[id]/page.tsx` | Resolves via `VISIBLE_TRACKS.find`/`VISIBLE_MOCKS.filter`; hidden ids hit the existing not-found screen. |
| `src/app/mock/page.tsx` | Renders `VISIBLE_MOCKS`; scope note. |
| `src/app/mock/[id]/page.tsx` | Resolves via `VISIBLE_MOCKS.find`; hidden ids hit the existing not-found screen. |
| `src/app/vacancies/page.tsx` | Renders `VISIBLE_VACANCIES` + the 12-row Coverage Ledger (`#ledger`) with coverage + source badges. |
| `src/app/page.tsx` | Home intro uses `VISIBLE_COUNTS`; Resume offers no link into a hidden mock (line 136); scope note. |
| `package.json` | `test:step3a` script. |
| `scripts/test-step3a.mjs` | NEW — 366 checks (§5). |

`src/data/content.json` and all bank JSONs are UNTOUCHED: hidden data stays in
the repo files, in exports/backups, and in data-level helpers
(`buildMockQuestions`, `trustedOnlyCount`, `mockLabels` still operate on the
full data). No notes/MCQs/flashcards/translations added or changed. No
tutor/scheduler/scoring change.

## §2 — Track classification table (verified against the actual data)

Every track's `name`/`bps`/`elig`/`pattern`/`conf`/`mock` fields were read
from `content.json` before classifying. "Mocks" = mocks whose `track` field
equals the track id.

| # | Track id | Name (as stored) | Class | Reason (from the data) | Mocks |
|---|---|---|---|---|---|
| 1 | `zamungkor` | ZamungKor 2026 — Theology + Qari | VISIBLE (teaching) | Owner's named set; Project 891, NO BPS, NO published syllabus; Theology + Qari | 3 (zam1–3, proxy) |
| 2 | `tt` | ESED Theology Teacher (TT) | VISIBLE (teaching) | Owner's named set; BPS-15; PDF 453 | 2 (tt-B, tt-MD) |
| 3 | `at` | ESED Arabic Teacher (AT) | VISIBLE (teaching) | Owner's named set; BPS-15; PDF 453 | 2 (at-B, at-MD) |
| 4 | `pst` | Primary School Teacher (PST) | VISIBLE (teaching) | Owner's named set; BPS-12; PDF 453 | 1 (pst-B, also serves CT) |
| 5 | `ct` | Certified Teacher (CT) | VISIBLE (teaching) | Owner's named set; BPS-15; PDF 453, same weightage as PST | 0 own; 1 shared (pst-B) |
| 6 | `ctit` | Certified Teacher — IT (CT-IT) | VISIBLE (teaching) | Owner's named set; BPS-12; PDF 453 | 1 (ctit-B) |
| 7 | `dm` | Drawing Master (DM) | VISIBLE (teaching) | Owner's named set; BPS-15; PDF 453 | 1 (dm-B) |
| 8 | `pet` | Physical Education Teacher (PET) | VISIBLE (teaching) | Owner's named set; BPS-15; PDF 453 | 1 (pet-B) |
| 9 | `qari` | ESED Qari / Qaria | VISIBLE (teaching) | Owner's named set; BPS-12; PDF 453 | 2 (qari-B, qari-MD) |
| 10 | `swse` | Social Welfare Religious / Theology Teacher | VISIBLE (teaching, PROVISIONAL) | Owner's named set; BPS-16; PDF 435 breakdown provisional per the report; never merged with TT/ZamungKor | 1 (swse) |
| 11 | `sst-etea` | SST — ETEA screening | VISIBLE (teaching) | Owner's named set; BPS-16; ETEA 100 MCQs, 2020 PDF | 1 (sst-etea, 40 Q non-subject part) |
| 12 | `sst-kppsc` | SST — KPPSC | VISIBLE (teaching) | Owner's named set; BPS-16; KPPSC 45 MCQs, 5th Schedule | 1 (sst-kppsc, 45 Q) |
| 13 | `lecturer` | Lecturer — KPPSC | HIDDEN — judgment call (a) | Teaching post BY NATURE (KPPSC BPS-17, 45 MCQs) but NOT in the owner's named teaching set; no mock, no subject bank ("No mock yet — subject bank not built"). Hidden per the brief's closed 12-track list; re-show by adding `"lecturer"` to `TEACHING_TRACK_IDS`. | 0 |
| 14 | `junior-clerk` | Junior Clerk | HIDDEN (non-teaching) | Clerical post; typing/practical components; per-project patterns | 1 (jc) |
| 15 | `computer-operator` | Computer Operator | HIDDEN (non-teaching) | IT operations post, not a teaching post | 1 (co) |
| 16 | `police` | Police Constable | HIDDEN (non-teaching) | Police post; subjective + physical components | 1 (pc) |
| 17 | `forest` | Forest Guard | HIDDEN (non-teaching) | Forest post | 1 (forest) |
| 18 | `lhv` | Lady Health Visitor / Medical Technician | HIDDEN (non-teaching) | Health/diploma post; diploma-related 50% | 0 |
| 19 | `rescue` | Rescue 1122 — EMT / Fire Rescuer / Driver | HIDDEN (non-teaching) | Emergency-services post; job-site-only scope; driving/skill/physical | 0 |

Vacancy rows: 5 → 4 visible. Hidden: "Rescue 1122 KP — EMT, Fire Rescuer,
Driver" (matched by exact stored `post` string). Visible: ESED teaching,
ZamungKor 2026, KPPSC SST, Social Welfare.

Mocks: 20 → 16 visible. Hidden: `jc`, `co`, `pc`, `forest`. LHV, Rescue and
Lecturer have no mocks, so no mock is orphaned by the hide.

## §3 — Before / after counts

| Count | Before | After | Note |
|---|---|---|---|
| Visible tracks | 19 | **12** | Teaching set only (§2) |
| Visible mocks | 20 | **16** | 4 non-teaching hidden |
| Visible vacancy rows | 5 | **4** | Rescue row hidden |
| MCQs | 645 | **645** | Subject-based; unchanged |
| Notes | 110 | **110** | Unchanged |
| Flashcards | 70 | **70** | Unchanged |
| /review verified | 15/200 | **15/200** | Data path untouched (post-hydration; browser check) |
| Full data in files | 19/20/5 | **19/20/5** | `content.json` untouched; `COUNTS` keeps full figures |

Home intro now reads "12 teaching post tracks · 16 mocks" with the
teaching-only scope note directly under it. The ledger intro states the
scope of "Exact" explicitly.

## §4 — Ledger design (src/lib/ledger.ts)

- **Placement:** on the Vacancies page (`#ledger`), one card per teaching
  post, linked from the Tracks page. No new nav item (the 14-link sidebar
  invariant is untouched).
- **Sources:** weightages ONLY from the report's official table — ETEA PDF
  453 (8 ESED posts), ETEA 2020 PDF (SST-ETEA), ETEA PDF 435 (SWSE,
  provisional), KPPSC 5th Schedule (SST-KPPSC). Last verified 11 Nov 2026
  on every row (the research-pass date). ZamungKor: NO published syllabus;
  its row shows the proxy pattern the fixed mocks actually use, verified
  against the `ZAM_FIXED` id lists (30/15/15/15/15/10 in all three mocks),
  labelled NOT VERIFIED.
- **Admin fields:** time / language / negative marking are "Unknown"
  everywhere no official source states them. SST-KPPSC time is the "1-hour
  slot (KPPSC ability-test schedules) — confirm on your roll-number slip"
  wording; its negative marking is "−0.25 claimed by prep guides only —
  UNVERIFIED". Marks: 100 MCQs (ESED/SST-ETEA), 45 MCQs (SST-KPPSC),
  "100 (percentages sum to 100)" (SWSE), Unknown (ZamungKor). KPPSC
  weightages are shown as percentages — no question counts invented from
  percentages of 45.
- **Counts:** per-subject notes/MCQs/cards computed from the real banks at
  module load. The SST subject portion maps to NO bank and shows 0/0/0.
  The Qari combined block sums Tajweed + Islamiyat. Drawing/PE share the
  "Drawing/PE" notes (explicit in the catalog). Each row also shows
  bank-level owner-reviewed counts ("Owner-reviewed in bank: X of Y",
  labelled as bank data).
- **Coverage rule** (mechanical, `coverageFor`): unpublished → Proxy;
  provisional → Partial; confirmed + every subject ≥1 note AND ≥1 MCQ +
  ≥1 mock → Exact; confirmed + any zero-material subject or no mock →
  Partial; no weightage → Unknown. Result: **8 Exact** (tt, at, pst, ct,
  ctit, dm, pet, qari), **1 Proxy** (zamungkor), **3 Partial** (swse,
  sst-etea, sst-kppsc), **0 Unknown**.
- **Badges:** coverage uses the Step 2a system — Exact = teal-tinted
  reviewed neutral (never success green), Proxy = proxy, Partial =
  partial, Unknown = unknown. "Source Confirmed" (official green) appears
  ONLY on the 10 rows whose pattern source is a named official document;
  SWSE gets "Provisional", ZamungKor gets "Official scope unavailable".
  The coverage reason is visible text, not tooltip-only.
- **CT shared mock:** CT has no mock under its own track id; the ledger
  shows pst-B flagged "(shared)". The track-detail page still shows "No
  mock yet" for CT (pre-existing behaviour — see §7).

## §5 — Verification

- `npm run build` PASS; `npx tsc --noEmit` clean (strict).
- **26 suites, 2038 checks, 0 failures** (baseline 1672 → +366,
  `test-step3a`). The new suite exercises the REAL compiled `data.ts` +
  `ledger.ts`: visibility partition (12/7 tracks, 16/4 mocks, 4/1
  vacancies, unknown ids hidden); SST split (distinct tracks/patterns/
  mocks/totals/variants, KPPSC scoring `unverified-assumption`); ledger
  (12 rows in track order; weightage table locked against the report's
  table; weights sum to 100; every subject count re-derived independently
  from the raw JSON files with a separately written mapping; ZAM_FIXED
  distributions match the proxy weightage; coverage/source-state
  distributions; CT shared mock; `coverageFor` branch unit tests);
  page source patterns (all browse surfaces use `VISIBLE_*`; review
  filters reference visible mocks only; analysis uses `TRACKS` only as a
  name lookup); all 33 new i18n keys present with non-empty en + ur.
- Local prod server (port 3103, stopped after): all 14 static routes HTTP
  200 + 5 dynamic routes 200. Served HTML confirms: 12 track names
  present / 7 hidden names absent on /tracks; 16 mocks present / 4 hidden
  absent on /mock; 4 vacancy rows + ledger heading + all 3 source badges
  + "11 Nov 2026" + "UNVERIFIED" on /vacancies; home "12 teaching post
  tracks · 16 mocks" + scope note + 645 intact; /tracks/police,
  /tracks/lecturer → "Track not found"; /mock/jc → "Mock not found"; 12
  "View track" links; CT "(shared)" marker renders (React comment nodes
  split the literal in raw HTML — visible text verified in context).

## §6 — Judgment calls (all reversible, flagged for the owner)

(a) **Lecturer hidden.** A teaching post by nature, but absent from the
    owner's named teaching set, with no mock and no subject bank. Hidden
    per the brief's closed list. Re-show: add `"lecturer"` to
    `TEACHING_TRACK_IDS` (`src/lib/data.ts` line 230) — one line. The
    owner tracks Lecturer per his own brief, so this needs his explicit
    confirmation either way.
(b) **"Exact" = presence, not depth.** A row is Exact when every blueprint
    subject has ≥1 note and ≥1 MCQ plus a mock. DM (4 shared notes, 20
    MCQs) and CT-IT (6 notes, 30 MCQs) are Exact by this rule; the ledger
    intro + per-subject counts + "Missing" lines carry the depth caveat
    honestly. A stricter depth rule would be a judgment call, not a fact.
(c) **Ledger on the Vacancies page**, not a new nav item — keeps the
    14-link sidebar invariant; discoverable via Vacancies + the Tracks
    page link.
(d) **Analysis + Review left on full data.** Analysis uses `TRACKS.find`
    only to NAME the user's own stored attempts (history labelling, not
    browsing); Review's mock filters were already teaching-only and its
    `MOCKS.find` is a data lookup for question pools. Both are asserted
    in the new suite. Changing them would orphan the user's own history
    labels for no browse-surface gain.
(e) **Hidden detail routes return HTTP 200 with the not-found screen** —
    the pre-existing pattern for unknown ids (client components). No
    behaviour change for genuinely unknown ids.

## §7 — Pre-existing inconsistencies found (NOT fixed in 3a)

1. **COMP_B.ct disagrees with the report.** `COMP_B.ct` in `content.json`
   lists Pak Studies 10 where the report's official CT row (and the CT
   track's own pattern string, and the pst-B mock comp) list Social
   Studies 10. The ledger follows the report and notes the discrepancy
   on the CT row. Fixing `COMP_B` is a pattern-data change needing an
   owner decision — flagged, not silently "fixed".
2. **CT track detail shows "No mock yet".** The detail page filters mocks
   by `track === id`; pst-B's track is "pst", so CT's page shows no mock
   even though the mock is titled "PST / CT Mock" and the track's (unused)
   `mock` field points at "pst". The ledger surfaces the shared mock
   explicitly. Unifying the detail page is a small follow-up, out of 3a
   scope.
3. **SST-ETEA mock is 40 Q, not 100 Q.** The non-subject portion only;
   the 60-Q subject portion has no bank. Already labelled on the mock and
   now on the ledger row. Not a defect — recorded so Step 3b scoping sees
   it.

## §8 — Caveats for live verification (browser check)

- Hydrated Urdu mode: ledger cards, badges, per-subject count lines, and
  the scope notes in RTL; "0 / 63" regression (unchanged code path, but
  re-confirm).
- /review 15/200 intact (post-hydration; data path untouched).
- Direct navigation to a hidden track/mock shows the not-found screen
  (verified in served HTML; confirm visually).
- The ledger's 12 cards at 360px (no wide tables by design; per-subject
  lines wrap).
- Home Resume: a stored session for a hidden mock no longer offers a
  Resume link (guard at `src/app/page.tsx` line 136) — confirm no Resume
  card appears for such a session; stored sessions themselves are
  untouched and the data remains resumable if the track is re-shown.

## §9 — Files changed (diff vs backup-pre-step3)

Modified (9): `package.json`, `src/app/mock/[id]/page.tsx`,
`src/app/mock/page.tsx`, `src/app/page.tsx`, `src/app/tracks/[id]/page.tsx`,
`src/app/tracks/page.tsx`, `src/app/vacancies/page.tsx`, `src/lib/data.ts`,
`src/lib/i18n.tsx`. New (2): `src/lib/ledger.ts`,
`scripts/test-step3a.mjs`. Plus this report + the CHANGELOG entry.
Deleted: none. `content.json`/banks: untouched.
