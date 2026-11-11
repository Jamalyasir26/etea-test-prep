# ETEA Prep Library — Next.js (v3)

Personal-use preparation site for KP government job tests (ETEA / KPPSC).
Single user (the owner). Everything for preparation in one place.

Live now (static v2): https://etea-test-prep.vercel.app/
This folder is the Next.js rebuild. **Not deployed yet** — deployment is done
by the parent after review.

## What is inside

- **All v2 content, migrated verbatim** (source: `~/workspace/etea-prep-v2/`):
  540 MCQs, 95 notes, 70 flashcards, 19 post tracks, 20 mocks/practice tests,
  pattern selector (Version B ETEA 453 primary, Merged-Districts NOT VERIFIED,
  Version A 2020 archive), corrections front and centre (ZamungKor NO BPS /
  NO syllabus, TT BPS-15, SST ETEA 100 vs KPPSC 45), language switch
  (English / Roman Urdu / اردو RTL) + dark mode (persisted), "Practice from
  Past-Paper Topics" (20 original + 20 reworded — no past-paper docs/PDFs/
  verbatim questions), vacancy tracker (manually curated), official links.
- **Live AI Tutor** (`/tutor`): Gemini primary, Groq fallback, OpenRouter fallback (free model only), server-side only.
  - `POST /api/tutor` — chat, grounded in the local library (RAG)
  - `POST /api/explain` — explain one MCQ by id
  - `POST /api/plan` — 3/6/12-week study plan from the base plan + weak areas
  - `GET /api/tutor` — provider status (booleans only, no key material)
- **Preparation tracking + live Analysis** (`/analysis`): every quiz/mock/
  flashcard attempt is stored in localStorage; the dashboard computes
  per-subject and per-track accuracy, attempts, time spent, day streak,
  7/30-day trend, mock history, weak-area heatmap with one-tap drills, due
  flashcards (SM-2-style). All numbers come from real attempts — empty states
  say "no attempts yet". Export/import progress as JSON so it is never trapped.

## Accuracy rules (kept from v2)

No invented Hadith numbers/references/dates/quotes. Exactly one correct answer
per MCQ. Track mocks state they share the practice bank. AI-generated content
is labelled "AI-generated — not verified" and never enters mocks.

## Run locally

```bash
npm install
npm run build
npm start          # production server on http://localhost:3000
```

Copy `.env.example` to `.env.local` for local AI testing. On Vercel,
`GEMINI_API_KEY` is already set (Production). `GROQ_API_KEY` is optional —
when set, Groq is used automatically as fallback if Gemini fails.
`OPENROUTER_API_KEY` is optional — when set, OpenRouter (free model
`google/gemma-4-26b-a4b-it:free`, $0 prompt/completion) is used automatically
as the third fallback if Gemini and Groq both fail.

## Keys

Keys live only in `process.env` on the server. They are never logged, never
returned by any API, and never bundled into client JavaScript (verified by
grepping `.next/static` — see VERIFY-next.md). The saved `GEMINI_API_KEY`
value in Vercel is unverified and has an unusual format; the app handles an
invalid key with a clear on-screen message instead of crashing.

## Deploy

Vercel project `etea-test-prep` (team "Pakhtunkhwa Insider"). Import this
folder as a Next.js project (framework preset Next.js, no build command
override, no extra env vars needed beyond the existing `GEMINI_API_KEY`).
