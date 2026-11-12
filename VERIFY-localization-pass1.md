# Verification — Localization Pass 1 (local only, NOT deployed)

Date: 2026-11-12. Backup: `~/workspace/etea-prep-next-backup-pre-loc1/`
(flat, verified identical before work started). LOCAL WORK ONLY — no
deploy, no GitHub/Vercel change, no env-var change. The P2 deploy
(commit 9f29935, live since 2026-11-12 ~11:28 PKT) includes the (now
cancelled) Nastaliq font; this pass removes it in the NEXT deploy.

Owner decisions implemented (2026-11-12 ~11:10 PKT, from the owner's
own mobile testing): (1) fonts — ONLY Noto Sans Arabic, Nastaliq
CANCELLED; (2) RTL punctuation bug — English text inside RTL flow
isolated; (3) Urdu UI translation — every UI string via `i18n.tsx`;
(4) tri-language content structure — plan + scaffold only, ZERO
translated content.

## 1. Fonts — Sans Arabic only (Nastaliq removed)

| File:line | Before | After | Check |
|---|---|---|---|
| `src/app/layout.tsx:21` | `Noto_Nastaliq_Urdu` + `Noto_Sans_Arabic` configured | Only `Noto_Sans_Arabic` (arabic+latin, 400/500/600/700, `display: swap`, `--font-sans-arabic`) | test-fonts 21/21 |
| `src/app/globals.css:45` | Headings used `--font-nastaliq` | Headings use `var(--font-sans-arabic)` | test-fonts |
| `src/app/globals.css` | Urdu `line-height: 2` rule (Nastaliq-specific) | DROPPED — it existed for Nastaliq's tall glyphs; Sans Arabic reads comfortably at the default heading line-height (1.3) | test-fonts asserts the rule is gone |
| `src/` (all) | Nastaliq references in layout/css | ZERO Nastaliq references in `src/` (grep, case-insensitive, exit 1) | test-fonts walks `src/` |

Live verification after deploy: open the site in Urdu mode on the
owner's phone — headings, body and UI all render in Noto Sans Arabic;
no external font requests (DevTools Network: only `/_next/static`
font files). Served CSS was verified locally: 21,818 bytes, 0
Nastaliq refs, 3 `--font-sans-arabic` refs, 27 `@font-face` rules all
`font-family: Noto Sans Arabic`, 40 local woff2 refs, 0 gstatic refs;
a preloaded woff2 returned HTTP 200.

## 2. RTL punctuation bug — isolation sweep

Principle (documented in code): identifiers/counts/codes/model names/
dates/URLs → `dir="ltr"`; free-form content that may be mixed-script
(question text, options, explanations, note titles/bodies, flashcard
content, mock notes, chat messages, AI-plan output) → `dir="auto"`
(the browser picks direction from the first strong character, correct
for both English-first and Urdu-script content); plain-text
constructed messages/tooltips → Unicode LRI/PDI via `lri()`.

Fixed sites (59 static checks in `scripts/test-rtl.mjs`, all passing):

- Tutor (`src/app/tutor/page.tsx`): chat bubbles + thinking bubble +
  explain output `dir="auto"`; drill-button subject `dir="ltr"`;
  offline-fallback content lines and the via-line provider wrapped in
  `lri()`.
- QuizRunner (`src/components/QuizRunner.tsx`): question/options/
  explanation/pastPaperRef/source `dir="auto"`; "Qn." prefix, option
  letters, subject badge `dir="ltr"`; scoring policy note `dir="ltr"`;
  changed-answer option texts `dir="auto"`.
- Library: note title/body/source `dir="auto"`; annotation aria-label
  title wrapped in `lri()`.
- Home: brand, correction items, PATTERN_BANNER, weak-area subjects,
  confidence badge `dir="ltr"`; pattern name `dir="auto"`.
- Mock list/runner, plan (day headings, task text, AI plan), flashcards
  (card content, category, last-grade values), analysis (title cells
  `dir="auto"`, date/kind/mode/key/time cells `dir="ltr"`, status
  message `dir="auto"`), review (id/attribution `dir="ltr"`, content
  `dir="auto"`), issues (ids/dates `dir="ltr"`, free text `dir="auto"`),
  vacancies, tracks, topics, links, Nav brand, TutorHealth
  provider/model/latency.
- `lri()` (`src/lib/i18n.tsx:994`) and the `data.ts` LRI/PDI consts
  (`src/lib/data.ts:273-274`) use explicit `"\u2066"` / `"\u2069"`
  escapes. Guarded by test: NO raw isolate/control characters
  (U+2066/U+2069/U+0080–U+009F) anywhere in `src/` — this is the
  byte trap learned twice (typed "isolates" were U+0085 NEL, not
  U+2066). Always use explicit escapes for invisible Unicode.

HONEST LIMIT: visual confirmation needs a real browser post-deploy.
The owner should check, in Urdu mode on his phone: the review page
attribution line, a quiz question + options, a library note, and the
tutor chat — punctuation must sit at the correct end in each.

## 3. Urdu UI translation (UI strings only)

`src/lib/i18n.tsx:30` — STRINGS expanded to 423 keys (test-enforced:
every key has non-empty `en` + `ur`; `roman` optional). New `tf(key,
vars)` (`:1028`) replaces `{name}` tokens; missing values become `""`
(never a raw `{name}` in the UI). Fallback rule (implemented at
`t`/`tf`, tested): current language → English → key itself. Roman
Urdu has translations for short UI chrome; long explanatory
paragraphs have no `roman` entry and fall back to English until a
later pass. Urdu is complete for every key.

Translated surfaces (all pages + components): tutor (complete —
greeting via the `__GREETING__` sentinel rendered through
`t("tutorGreeting")` at `src/app/tutor/page.tsx:202`, so it always
matches the current language instead of freezing the first-render
language), home, nav, footer (new `src/components/Footer.tsx`),
library, practice, mock list + runner, plan, flashcards, analysis,
review, issues, vacancies, tracks, topics, links, QuizRunner
(IssueForm + results + review + counters), TutorHealth,
ProvenanceBadge (`src/components/ProvenanceBadge.tsx:9`, now a client
component using `useLang()`).

Supporting label localizations:

- `localizedScoringLabel(config, lang)` (`src/lib/scoring.ts:111`) —
  Urdu scoring label; `policyNote` stays English (factual precision
  statement) and is rendered LTR-isolated. Roman falls back to English.
- `gradeButtonLabel(grade, interval, lang)` (`src/lib/tracking.ts:508`)
  — Urdu grade labels; default (no lang) keeps the English strings so
  existing tests/behaviour are unchanged.
- `provenanceBadge(item, lang)` (`src/lib/data.ts:324`) + Urdu variant
  — Urdu labels ("سرکاری ماخذ" / "تصور سے اخذ شدہ" / …); source names
  and syllabus clauses stay English, wrapped in LRI/PDI.

Server→client conversions (safe: client components still prerender;
first render is English on server and client, then the stored
language applies after mount — same pattern as existing client
pages; no new hydration risk): vacancies, tracks, tracks/[id]
(`useParams()` replaces the async `params` prop), links.

Deliberate English exceptions (documented in the `i18n.tsx` header
comment): proper names (ETEA/KPPSC/Gemini/Groq/OpenRouter), ids/codes,
scoring policy notes, CORRECTIONS + PATTERN_BANNER factual statements,
format examples ("e.g. ISL-001"), quick-ask SENT questions on the
tutor page (labels translated; the tutor answers in the selected
answer language regardless).

Denylist test: `scripts/test-i18n.mjs` flags 60+ old hardcoded English
UI literals across 19 files (comments stripped) — all absent.

## 4. Tri-language content structure — scaffold only

- Schema: optional `ur` / `roman` fields on Question
  (`QuestionTranslation`: question/options/explanation) and Note
  (`NoteTranslation`: title/body) — additive only, no data-file
  content changes. `options` is used ONLY when its length exactly
  matches the English options, else the whole array falls back.
- Helpers (`src/lib/data.ts:279-312`): `localizeQuestion` /
  `localizeNote` (per-field fallback, never mutate, identity when
  lang=en or no translation) + `hasTranslation` (coverage reporting).
- ONE proof-of-concept render path: library note rendering uses
  `localizeNote(n, lang)`; storage keys/annotations stay on the
  original English title. QuizRunner/flashcard wiring is a later phase.
- ZERO translated content initially: test asserts no MCQ/note carries
  `ur`/`roman` and `hasTranslation` is false for every bank item —
  behaviour provably unchanged today. NO machine translation of the
  645 MCQs / 110 notes.
- Plan: `LOCALIZATION-PLAN.md` — schema, fallback rules, translation
  workflow (religious-content translations through the owner review
  queue, never auto-approved), phasing by subject/post (TT/Qari core
  first), honest scale, QA rules (exactly one correct answer,
  options order preserved, no invented Hadith numbers).

## 5. Verification (local)

- `npm run build` PASS — 20 pages; `/tracks/[id]` is now dynamic (ƒ)
  like `/mock/[id]`, expected with `useParams()`. `npx tsc --noEmit`
  clean with `strict: true`.
- All 18 node suites, 666 checks, 0 failures: qa 52/52, flashcards
  29/29, scoring 39/39, reviews 37/37, retrieval 28/28, fallback-chain
  24/24, timeouts 43/43, storage 36/36, tutor-lang 30/30, api-guard
  60/60, tier4 46/46 (4 assertions updated for translated literals,
  intent preserved), provenance 33/33, backup-versioning 33/33,
  telemetry 28/28 (1 assertion updated for the translated heading),
  fonts 21/21 (rewritten Sans-Arabic-only), i18n 40/40 (new), rtl
  59/59 (new), trilanguage 28/28 (new).
- Local prod server: all 16 routes HTTP 200; home shows 645 MCQs;
  `/review` shows the translated progress line; `/api/tutor/health`
  returns honest "down" with no keys (keys live only in Vercel).
- Regression guard: no feature logic changed — library, practice,
  mocks, Trusted Mode, scoring, /review, flashcards, tutor language
  selector, theme toggle, hamburger nav, RTL counters, export/import,
  health indicator, provenance badges, telemetry all untouched in
  behaviour (code-inspected + suites green). Changed vs the P2 tree:
  37 diff entries (30 modified files incl. CHANGELOG.md, plus 6 new:
  Footer.tsx, 3 test scripts, LOCALIZATION-PLAN.md, this report).
  No bank JSON changed.
- Grep: zero Nastaliq references in `src/`; served CSS/HTML has no
  Nastaliq font (see §1).

## 6. How it will be verified live after deploy

1. Deploy (browser upload, lib-first, read-back — the standing deploy
   skill). The live P2 deploy includes Nastaliq; this deploy
   removes it.
2. Urdu mode on the owner's phone: tutor page fully Urdu (headings,
   Ask button, placeholders, answer-language label); nav/footer Urdu;
   all pages' chrome Urdu; content still English (expected — Pass 1).
3. RTL punctuation: review attribution line, quiz options, library
   notes, tutor chat — punctuation at the correct end.
4. Fonts: Sans Arabic everywhere (headings/body/UI); no Nastaliq;
   works offline after first load (self-hosted woff2).
5. Regression: 645 MCQs on home, /review 15/200 verified, Trusted
   Mode counts, flashcards flip + grades, tutor answers, health
   indicator loaded state, telemetry empty on /issues.
6. Roman Urdu mode: short chrome in Roman Urdu, long paragraphs in
   English (documented fallback) — no raw keys anywhere.
