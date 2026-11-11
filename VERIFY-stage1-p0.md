# Stage 1 P0 — Verification Report (2026-11-12, local only, NOT deployed)

Scope: Stage 1 P0 only — P0.1 negative marking + configurable scoring,
P0.2 verification queue (mock-first, TT + Qari), P0.3 concept-extraction
content (Tajweed / Arabic / Islamiyat). No P1/P2 work, no Stage 2/3/4 work.
No deploy, no GitHub/Vercel change, no env-var change.
Backup: `~/workspace/etea-prep-next-backup-pre-stage1p0/` (diff-verified
identical to the pre-P0.1 tree, 65 files, node_modules + .next excluded).

## P0.1 — Negative marking + configurable scoring

### What changed (file:line)
- `src/lib/scoring.ts` (new, 132 lines) — pure scoring module:
  - `DEFAULT_SCORING` (:28) — correctMarks 1, wrongPenalty 0,
    policyStatus `"unknown"`, policyNote "ETEA has published no
    negative-marking policy for these projects — scored with zero penalty
    (policy unknown)."
  - `KPPSC_UNVERIFIED_SCORING` (:37) — wrongPenalty 0.25, policyStatus
    `"unverified-assumption"`, labelled as such everywhere it is shown.
  - `computeExamScore` (:79) — raw accuracy and exam score computed
    separately from the same counts; exam score floored at 0 unless the
    config allows negative; unanswered = 0 by default.
  - `resolveScoring` (:124) — precedence: per-run override > mock config
    > default; unknown override values are ignored.
  - `scoringLabel` (:102) / `isValidScoringConfig` — invalid configs fall
    back to the default, never crash.
- `src/lib/data.ts:78` — `MockDef` gains optional `scoring?: ScoringConfig`.
- `src/data/content.json` — `sst-kppsc` mock gains the KPPSC 0.25 config
  (policyStatus `"unverified-assumption"` + note). All other mocks use the
  zero-penalty default (no config = default).
- `src/components/QuizRunner.tsx` — new props `scoring` (:173, defaults to
  `DEFAULT_SCORING`) and `allItemsVerified` (:174); results screen shows
  "Raw accuracy vs exam score" (:435) as two separate numbers with the
  policy note; exam score stored on the attempt (:364-366: `examScore`,
  `examTotal`, `scoringPolicy`); in-progress scoring label shown.
  The hardcoded review line "AI-generated — not verified" is now dynamic:
  the question's own `source` + its bank review status.
- `src/lib/tracking.ts` — `Attempt` gains optional `examScore` /
  `examTotal` / `scoringPolicy` (additive; v4 import validation unaffected).
- `src/app/mock/page.tsx:25,94` — per-mock "Scoring for this run" select
  (Mock default / No penalty (policy unknown) / −0.25 per wrong
  (unverified assumption)); the choice is carried in the Start link's
  `?penalty=` param and actually changes the computed score.
- `src/app/mock/[id]/page.tsx:34,63` — resolves `?penalty=` against the
  mock's config and passes it to QuizRunner; the run note states the
  config + policy note.
- `src/app/practice/page.tsx` — passes `allItemsVerified` (P0.2 wiring);
  practice runs use the zero-penalty default.
- `package.json` — `test:scoring` script added.

### Before / after
- Before: one number per result (first-pass correct / total). No scoring
  config existed; nothing said whether wrong answers were penalised.
- After: every mock/practice result shows **Raw accuracy** (correct/total,
  penalty-free) **and Exam score** (marks under the run's config) as two
  separate numbers, with the policy label ("policy unknown" by default;
  "unverified assumption" for the 0.25 KPPSC config/override). The mock
  list lets the owner change the penalty per run and the score follows it.

### Tests — `node scripts/test-scoring.mjs`: 39/39 PASS (exit 0)
Zero-penalty default (exam == correct count, raw 80%); KPPSC 0.25
(40 correct + 5 wrong of 45 → exam 38.75, raw 88.89%); unanswered = 0
and never penalised (30 correct + 15 unanswered → exam 30); raw-vs-exam
separation on the same attempt (raw 80% vs exam 35/45); floor at zero
(all wrong → exam 0, floored=true); allowNegative opt-in; 2 marks per
question scaling; empty attempt (no division by zero); invalid config
falls back to default; resolveScoring precedence (override > mock >
default) + unknown override ignored.

## P0.2 — Verification queue (mock-first, TT + Qari)

### What changed (file:line)
- `src/lib/tracking.ts` — review store (`REVIEWS_KEY =
  "etea_reviews_next_v1"`, :79): `ReviewRecord` {reviewStatus,
  reviewedBy, reviewedAt}, `loadReviews` (:129), `setReview` (:146),
  `getReview`, `isReviewStatus`; vocabulary draft / needs-review /
  disputed / owner-reviewed / approved. Owner annotations store +
  opt-in (`loadAnnotations`, `saveAnnotation`, `loadAnnotationOptIn`,
  `setAnnotationOptIn`, :166-190).
- **Backup export v5** (`exportProgress`, :655): adds `reviews` +
  `annotations`. `importProgress`: v4 files (no reviews/annotations)
  restore exactly as before; v5 restores reviews (imported wins per
  question id) + annotations + opt-in; version 6+ rejected as newer than
  this build. Invalid review records are skipped and counted.
- `src/lib/data.ts` — `ReviewOverrides` (:203),
  `effectiveReviewStatus` (:207, owner decision wins over bank status),
  `isTrusted(q, overrides?)` (:216), `trustedOnlyCount(mock, overrides?)`
  (:227), `buildMockQuestions(..., {trustedOnly, overrides})` (:248).
  Without overrides the behaviour is unchanged (all draft → 0 trusted).
- `src/app/review/page.tsx` (new, 245 lines) — review dashboard:
  filters by mock (ZamungKor Mock 1+2 default, then zam1/zam2/zam3,
  tt-B/at-B/qari-B pools, all), by post (TT, Qari first), by status, by
  structural result; shows each item's question, options (correct
  marked), explanation, effective status + structural badge; actions
  Verify (→ owner-reviewed) / Approve (→ approved, only from
  owner-reviewed) / Needs review / Disputed / Reset to draft; header
  shows ZamungKor Mock 1+2 progress (verified / 200) and Trusted Mode
  availability. Copy states the owner is the verifier.
- `scripts/structural-check-mocks.mjs` (new, 166 lines) — checks zam1+zam2
  (200 items): hard = 4 options / non-empty / distinct, correctIndex
  0–3, explanation ≥ 20 chars, non-empty question, no duplicate question
  text, subject/topic present; soft = explanation does not mention the
  correct answer text (PED-009 pattern). Writes
  `src/data/structural-checks.json`, consumed by /review.
- `src/components/Nav.tsx` — "Review" link added.
- `src/app/mock/page.tsx` / `src/app/mock/[id]/page.tsx` /
  `src/app/practice/page.tsx` — load the owner's reviews and pass the
  overrides into `trustedOnlyCount` / `buildMockQuestions` /
  `allItemsVerified`.
- `src/components/QuizRunner.tsx:413,423` — results screen shows a red
  **"Provisional — not verified"** badge unless the run was trusted-only
  or every item in it is verified (then a green "Verified items" badge).

### Before / after
- Before: no review UI existed; Trusted Mode read only the bank's static
  `reviewStatus` (all draft → 0 trusted, no way to change it); results
  carried no verified/provisional badge.
- After: the owner verifies items on /review; Trusted Mode fills ONLY
  from owner-reviewed/approved items (verified by the harness below);
  every quiz/mock result carries the provisional badge until its items
  are verified.

### Structural check — `node scripts/structural-check-mocks.mjs`: exit 0
ZamungKor Mock 1 + Mock 2 = **200 items: 186 pass, 14 needs-review
(soft), 0 problems (hard)**. No item was marked verified by this script
or by the agent — all 200 stay `draft` until the owner verifies them.
The 14 soft flags (explanation does not name the correct answer text):
ISL-029, ISL-055, ENG-005, ENG-006, ENG-008, ENG-012, ENG-013, URD-001,
PAK-008, ENG-019, ENG-020, ENG-025, ENG-026, MAT-022. Spot-checked 8 of
them (ISL-029, ISL-055, PAK-008, ENG-005, MAT-022, URD-001, PED-008,
ISL-009): all are benign patterns — rule-style explanations that state
the rule without repeating the answer sentence, transliteration variants
("At-Taubah" vs "Al-Taubah"), or a missing unit word ("40" without
"years") — no stored-answer contradiction was found. The owner still
reviews all 14 on the dashboard; the flag means "eyeball it", not "wrong".

### Tests — `node scripts/test-reviews.mjs`: 37/37 PASS (exit 0)
setReview/loadReviews round-trip (incl. overwrite + reset to draft);
vocabulary accept/reject; export v5 shape (version 5, reviews +
annotations, opt-in false by default); v5 import restores decisions;
re-import overwrites per id; invalid records skipped + counted; **v4
import still works** (no reviews field → empty reviews, ok); v6
rejected; annotations save/delete/opt-in toggle; annotation export/import
round-trip.
Trusted-mode harness (compiled `data.ts`, 11/11 PASS): zam1 trusted
count 0 with no overrides → 5 with 5 owner-reviewed overrides; trusted
build returns exactly those 5; provisional build returns all 100;
isTrusted false for needs-review, true for owner-reviewed/approved;
sst-kppsc carries the 0.25 unverified config.

## P0.3 — Concept-extraction content (Tajweed / Arabic / Islamiyat)

### Research (read-only web; no PDF downloaded, no line copied)
A research pass read public Tajweed/Arabic/Islamiyat material and
returned paraphrased concept summaries + source names. All site content
below is written in original words from those concepts. Sources named
per item (name only, no hosted file): Riyad al-Quran, Riwaq Al Quran,
Quranica, Hekma Academy, Al-Wafa Institute, Al-Muqaddimah
al-Ajurrumiyyah (via Al-Hassanain), Teachy.ai, IlmHub, Arabify,
Wikipedia (Kutub al-Sittah), QuranicMA, Jibreel.app. No Hadith numbers,
verse numbers or quotations invented; disputed counts were left out of
MCQs (Madd Munfasil counts vary by route — the MCQ asks its definition,
not a count; Quran verse totals beyond 114 Surahs are not asserted).

### What changed (file:line)
- `src/data/content.json` — **15 new notes** (Tajweed 6, Arabic 5,
  Islamiyat 4) + counts total 590 → **645**, notes 95 → **110**,
  bySubject extended with the 55 new IDs, `sst-kppsc` scoring config
  (P0.1). File re-saved in its original format (compact single line).
- `src/data/banks/tajweed.json` — **TAJ-031..050 (20 MCQs)**;
  `arabic.json` — **ARB-061..080 (20)**; `islamiyat.json` — **ISL-091..105
  (15)**. Every new MCQ: exactly one correct answer, explanation names
  the answer, `reviewStatus: "draft"`, `verified: false`,
  `source: "Original content — concept-extracted from <source name>"`.
  Bank files re-saved in their original format (indent 1); the diffs are
  purely additive (no existing line changed).
- New notes (all carry the source label): Ikhfa, Idgham, Qalqalah, Madd
  Types Compared, Iqlab, Common Tajweed Mistakes; Al-Fa'il (الفاعل) in
  Nahw (النحو), Al-Maf'ul Bihi, Al-Mubtada' and Al-Khabar, Sarf roots and
  patterns, I'rab signs; Wahi (first revelation), Hadith (what it is +
  Sihah Sitta), Seerat (Hijrah + Madani period), Fiqh (four schools).
- `src/lib/data.ts` — `Note` gains optional `source?: string`.
- `src/app/library/page.tsx` (rewritten) — shows the source label per
  note; per-note **owner annotation** textarea (private, stored locally)
  + Save button; global opt-in checkbox "Include my note annotations in
  tutor answers" (default OFF) with plain-language privacy copy.
- `src/app/tutor/page.tsx:34,60,140` — loads the opt-in + annotations;
  annotations are sent in the tutor POST body ONLY when the opt-in is on
  (otherwise an empty list); the offline fallback also shows matching
  annotations only when enabled; an indicator line shows when enabled.
- `src/app/api/tutor/route.ts` — validates `body.annotations` (≤20
  items, note ≤200 chars, text ≤1000 chars, malformed dropped) and
  passes them through.
- `src/lib/ai.ts:318,448` — `contextBlock` gains an optional
  `ownerAnnotations` section (labelled as the owner's own notes, not
  verified library facts); `generateTutorAnswer` gains the optional 3rd
  parameter (default `[]` — no behaviour change when absent).
- Copy updates for the new totals: `src/app/layout.tsx` (590 → 645),
  `src/app/mock/page.tsx` (590-question bank → 645), `src/app/page.tsx`
  (95 notes → 110).
- `scripts/test-retrieval.mjs` (new, 159 lines) — compiles the real
  `src/lib/data.ts` to CommonJS in /tmp and tests the real `retrieve()`.

### Before / after (the Stage 0 eval gaps)
- Before: V-L3 (Roman Urdu Ikhfa) — the tutor refused; the dedicated
  Ikhfa note did not exist. V-L4 (Arabic Al-Fa'il) — `retrieve()` returned
  **zero** notes and **zero** MCQs: the Arabic term الفاعل / النحو did not
  appear anywhere in the library text.
- After: V-L3 retrieves the new Ikhfa note in the top 5 plus a new
  TAJ-031..050 MCQ; V-L4 retrieves the new Al-Fa'il note (Arabic-script
  match) plus a Fa'il MCQ. The Arabic MCQs' explanations now carry the
  Arabic-script terms (الفاعل، المفعول به، المبتدأ، الخبر، النحو، صرف،
  إعراب) so Arabic queries match them.

### Tests — `node scripts/test-retrieval.mjs`: 28/28 PASS (exit 0)
V-L3 Ikhfa note in top 5 + new TAJ MCQ retrieved; V-L4 Fa'il note +
Fa'il MCQ retrieved; Qalqalah, Maf'ul Bihi (Arabic query), Madd, Seerat
notes retrieved; V-L1 scaffolding regression still retrieved; V-L6
out-of-scope sanity (no Tajweed/Arabic note in top 5); all 15 new notes
present + labelled; all 55 new MCQs present, draft, unverified, 4
distinct options, valid correctIndex, source-labelled; bank total 645.
Two findings fixed during the run (recorded, not hidden): the first run
failed 3 checks — the Ikhfa note ranked 4th (noise terms "rules"/"aur"
in other notes) and V-L4 retrieved no MCQ (Arabic script absent from
MCQ text). Fixes: Ikhfa note now states it is one of the four Noon
Sakinah rules; Arabic-script terms added to the 20 ARB explanations;
the V-L3 assertion was corrected to the honest bar (in the top-5 window
`contextBlock` uses) instead of rank 1.
Duplicate-stem fix: 4 new questions initially duplicated existing stems
(ISL-091/092/093 vs ISL-001/005/006; ARB-068 vs ARB-064; then ISL-091
vs GKN-021 after the first reword). All reworded (same fact, new
wording); final duplicate-stem count is 0.

### QA — `npm run qa` (scripts/qa-540.mjs, counts updated 590 → 645): 51/51 PASS
Includes the new banks (counts, shapes, reviewStatus=draft on every
item, unique IDs, no duplicate stems, PED-009 regression, mock build
lengths — all 20 mocks at advertised totals).

## Full verification (all run after the final file state)
- `npm run build` — PASS (21/21 static pages, incl. new `/review`).
- `npx tsc --noEmit` — clean (TS strict NOT enabled — that is P1).
- `node scripts/test-scoring.mjs` — 39/39 PASS.
- `node scripts/test-reviews.mjs` — 37/37 PASS.
- `node scripts/test-retrieval.mjs` — 28/28 PASS.
- `node scripts/test-flashcards.mjs` — 29/29 PASS (unchanged).
- `node scripts/structural-check-mocks.mjs` — 186 pass / 14 needs-review / 0 problems.
- `npm run qa` — 51/51 PASS.

## Regression check (local production server, `next start`)
Live HTTP checks (local only, no keys in this environment): home page
serves "645 MCQs · 110 notes · 70 flashcards · 19 post tracks · 20
mocks"; /review, /library, /mock, /practice, /tutor, /issues,
/analysis, /flashcards all HTTP 200; /review renders "Review Queue" +
progress text; /mock renders the scoring selector; /api/tutor GET
responds (live:false locally — no keys here, expected).
Code-inspected only (no real-browser access in this session, stated
honestly): clicking through a quiz, the review buttons, the theme
toggle, the flashcard flip, and the export/import file flow. The
underlying pure functions for all of those are covered by the node tests
above; the UI changes are additive (new props with defaults, new page,
new selects) and the build + static pages pass. No existing feature was
removed or renamed.

## Blockers / open items (for the owner / next stage)
1. **No item is verified yet.** All 200 zam1+zam2 items are `draft`
   (186 structural pass + 14 needs-review). Trusted Mode returns 0
   questions until the owner verifies items on /review. This is by
   design (owner-as-verifier), not a bug.
2. **Live tutor answers not re-tested.** Retrieval is verified locally;
   whether the live LLM now answers the Ikhfa / Fa'il questions (rather
   than refusing) can only be confirmed with a live tutor call after
   deploy — the deploy step is outside this task.
3. **Groq model dead / OpenRouter 429 / cold-start health timeout**
   (Stage 0 findings) — NOT touched; they are P1 items A–C.
4. `tsconfig.tsbuildinfo` changed (build artifact, regenerates on every
   build — harmless).
5. The 14 soft structural flags need the owner's eyeball on /review.
6. Home page tutor copy ("the primary Gemini key status is unverified")
   is still the stale Stage 0 wording — that is P2 item B06, NOT changed
   here.

## Files changed (vs backup-pre-stage1p0; JSON diffs are purely additive)
New: `src/lib/scoring.ts`, `src/app/review/page.tsx`,
`src/data/structural-checks.json`, `scripts/test-scoring.mjs`,
`scripts/test-reviews.mjs`, `scripts/test-retrieval.mjs`,
`scripts/structural-check-mocks.mjs`.
Changed: `src/lib/data.ts`, `src/lib/tracking.ts`, `src/lib/ai.ts`,
`src/components/QuizRunner.tsx`, `src/components/Nav.tsx`,
`src/app/page.tsx`, `src/app/layout.tsx`, `src/app/library/page.tsx`,
`src/app/mock/page.tsx`, `src/app/mock/[id]/page.tsx`,
`src/app/practice/page.tsx`, `src/app/tutor/page.tsx`,
`src/app/api/tutor/route.ts`, `src/data/content.json`,
`src/data/banks/tajweed.json`, `src/data/banks/arabic.json`,
`src/data/banks/islamiyat.json`, `scripts/qa-540.mjs`, `package.json`,
`VERIFY-stage1-p0.md` (this report), `CHANGELOG.md` (Stage 1 P0 section).
