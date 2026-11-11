# ETEA Prep Library v3 (Next.js) — Verification Report

**Date:** 2026-11-11
**Folder:** `~/workspace/etea-prep-next/` (NEW — v1 `~/workspace/etea-prep/` and v2
`~/workspace/etea-prep-v2/` untouched, kept as backups)
**NOT deployed. No GitHub/Vercel/Pakhtunkhwa Insider changes made.**

## What was built

Next.js 15.5.29 (App Router) + React 19.3.1, TypeScript 5.9.3.
Pinned SDKs: `@google/generative-ai` 0.24.1 (model `gemini-2.0-flash`),
`groq-sdk` 0.32.0 (model `llama-3.3-70b-versatile`).

Routes (18, from `next build` output): `/` (dashboard), `/library`,
`/practice`, `/mock`, `/mock/[id]`, `/flashcards`, `/tutor`, `/plan`,
`/analysis`, `/tracks`, `/tracks/[id]`, `/topics`, `/vacancies`, `/links`,
plus API routes `/api/tutor`, `/api/explain`, `/api/plan` (all dynamic,
server-rendered on demand).

### Step 1 — content migration (verbatim from v2)

Source: `~/workspace/etea-prep-v2/banks_norm/*.json` (copied to
`src/data/banks/`) + all other v2 data extracted from `build.py` into
`src/data/content.json` (notes, flashcards, tracks, mocks, patterns,
compositions, 21-day plan, vacancies, official links).

| Content | Count | Check |
|---|---|---|
| Total distinct MCQs | **540** (unique ids: 540) | ✅ verified in code + data |
| Islamiyat / English / Urdu / Pak Studies / Maths / Pedagogy | 90 / 45 / 45 / 45 / 45 / 30 | ✅ v1's 300 retained |
| Tajweed | 30 | ✅ |
| Arabic / General Science / IT / Drawing-PE / GK | 60 / 30 / 30 / 20 / 30 | ✅ |
| Past-paper topics — original / reworded | 20 / 20 | ✅ |
| Notes | 95 | ✅ |
| Flashcards | 70 | ✅ |
| Post tracks | 19 | ✅ |
| Mocks / practice tests | 20 | ✅ |
| Bad MCQs (≠4 options, duplicate options, bad answer index) | 0 | ✅ |

Mock engine tested against the actual shipped code (`src/lib/data.ts`
compiled with tsc and executed): **all 20 mocks OK** — correct total,
0 duplicate ids within a mock, per-subject counts match the composition.
ZamungKor mocks 1–3 pairwise overlap: **0, 0, 0**. RAG retrieval sanity:
"scaffolding pedagogy" → notes "Scaffolding and the Zone of Proximal
Development" + Vygotsky note, MCQs PED-025 / PPT-020 / PPR-020.

Carried over unchanged: corrections banner (ZamungKor NO BPS/NO syllabus,
TT BPS-15, SST ETEA 100 vs KPPSC 45), pattern selector (B primary / MD NOT
VERIFIED / A archive), banner "ETEA sets paper composition per project.
Always verify against your specific advertisement / roll number slip.",
language switch EN/Roman Urdu/اردو RTL + dark mode (persisted), "Practice
from Past-Paper Topics" labels, vacancy tracker (manually curated, no
invented dates), official links (link out only), "Report an issue" button on
every MCQ, shared-bank notice on every track mock.

### Step 2 — live AI Tutor (server-side only)

- `POST /api/tutor` — chat; `POST /api/explain` — explain one MCQ by id;
  `POST /api/plan` — 3/6/12-week plan from the 21-day base plan + the user's
  own weak subjects. `GET /api/tutor` — provider status booleans only.
- RAG: keyword-overlap retrieval over local notes + MCQs (top 5 + top 5);
  system prompt forbids inventing Hadith numbers/references/dates/quotes,
  syllabi, BPS, deadlines; outside-library questions get "not in this
  library" instead of an invented answer; answers in the selected language.
- Gemini primary (`gemini-2.0-flash`); on Gemini failure AND `GROQ_API_KEY`
  set, automatic Groq retry (`llama-3.3-70b-versatile`); if both fail, a
  clear error — never a fake answer.
- Rate limiting (in-memory, per IP): **100/day + 10/minute**, friendly
  "limit reached" messages. Note: in-memory state is per server instance;
  on Vercel serverless this is approximate, not a hard global cap — fine for
  a single user.
- AI-generated questions (if any) are labelled "AI-generated — not verified"
  and kept out of mocks (same rule as v2).

### Step 3 — tracking + live Analysis

- Every quiz/mock/flashcard attempt is recorded in localStorage
  (`etea_attempts_next`); plan checkboxes (`etea_plan_next`); SM-2 flashcard
  state (`etea_flash_next`).
- `/analysis` computes live from real attempts only: per-subject and
  per-track accuracy, attempts, time spent, day streak, last-14-days trend,
  mock history, weak-area heatmap (red <50%, yellow 50–69%, green ≥70%) with
  one-tap drills, due-flashcard counts. Empty states say "no attempts yet".
  **No sample data anywhere.**
- Export/import progress as JSON (`/analysis` buttons) so progress is never
  trapped in one browser; delete-all with confirm.

## Verification performed

1. **`npm run build` — PASS** (twice; second after adding rate limiting to
   `/api/explain` and `/api/plan`). 18 routes, no type errors, no lint errors.
2. **Production server smoke test** (`next start`, port 3100):
   - All 11 pages return HTTP 200: `/`, `/mock`, `/library`, `/practice`,
     `/flashcards`, `/analysis`, `/plan`, `/topics`, `/tracks`, `/vacancies`,
     `/links`, `/tutor`.
   - Home HTML contains the ZamungKor correction and "540".
   - `/mock/zam1` renders "ZamungKor Mock 1" / "Question 1 of 100".
3. **No-key server** (no env vars): `GET /api/tutor` →
   `{"live":false,"gemini":false,"groq":false,...}`; `POST /api/tutor` and
   `POST /api/plan` → clean HTTP 503 JSON: "Live AI is not configured yet —
   no API key is set on the server…" No crash, no stack trace.
4. **Placeholder-key server** (`GEMINI_API_KEY=INVALID_PLACEHOLDER_KEY_FOR_TESTING`):
   `POST /api/tutor`, `/api/explain`, `/api/plan` → clean HTTP 502 JSON:
   "The saved Gemini API key was rejected by Google (invalid key). Please
   check the key in Google AI Studio and update GEMINI_API_KEY in Vercel…"
   No crash, no key material in any response.
5. **Rate limiting**: 13 rapid tutor POSTs in one minute → first 10
   processed (502, invalid key), then HTTP 429 "Too many requests…" —
   10/minute limit confirmed working.
6. **Client-bundle key check**: `grep -r` over `.next/static/` for
   `GEMINI_API_KEY`, `GROQ_API_KEY`, `AIzaSy`, the placeholder string, and
   `groq-sdk`/`llama-3.3` → **0 hits**. Env var names appear only in
   `.next/server/app/api/*/route.js` (server-side, as required). The
   placeholder string appears nowhere in `.next/`.

## Key-handling notes (important for the parent)

- **No real key was used or tested.** The saved Vercel `GEMINI_API_KEY`
  value has an unusual format (per the parent's earlier note) and is
  UNVERIFIED. The code handles a rejected key gracefully (see test 4), but
  a successful live Gemini call has NOT been demonstrated. The parent must
  verify after deploy with one real tutor question.
- **No key value exists anywhere in this folder.** `.env.example` contains
  empty placeholders only. No `.env.local` was created. The placeholder
  used in tests (`INVALID_PLACEHOLDER_KEY_FOR_TESTING`) was passed only as
  a process env var and appears in no file.
- Groq fallback is code-complete but **untested live** (no `GROQ_API_KEY`
  supplied). It activates automatically when the env var appears.
- The tutor page has an offline fallback: if live AI errors, it shows
  keyword search results from the local library instead of failing blank.

## What the parent must verify after deploy

1. Deploy this folder to the Vercel project `etea-test-prep` (Next.js preset).
   A **new deployment is needed** for the existing `GEMINI_API_KEY` env var
   to take effect in the new build.
2. Open the live site and ask the tutor one real question — confirm a live
   Gemini answer (not the invalid-key error). If the invalid-key error
   appears, the saved key value is wrong and must be replaced with the real
   `AIza…` key from AI Studio (Propertank026 account, "ETEA Prep Tutor").
3. Click through: a quiz, a mock timer, flashcards grading, language switch,
   dark mode, plan checkboxes, Analysis after one quiz (numbers must appear),
   export/import on Analysis. (Server-side rendering was verified here, not
   a real-browser click-through.)
4. Confirm `GET /api/tutor` on the live site reports `gemini: true`.

## Known limits

- No real-browser render test on this VM (same limit as v2) — see item 3 above.
- In-memory rate limiting is per-instance on serverless (approximate).
- SST subject portion (60 Q), Lecturer subject, LHV diploma portion still
  have no question bank — stated on their track pages (as in v2).
- Track mocks share the practice bank (stated on every mock, as in v2).
- `node_modules/` (371 MB) and `.next/` (103 MB) are in this folder for the
  parent's local testing; they are git-ignored and not needed for deploy.

---

## OpenRouter fallback (v3.1) — 2026-11-11

**Change:** OpenRouter added as the THIRD fallback for the live AI Tutor, after Gemini (primary) and Groq (fallback 1). All three API routes (`/api/tutor`, `/api/explain`, `/api/plan`) share one provider helper (`src/lib/ai.ts` → `generateTutorAnswer`), so the change is DRY — no route logic was duplicated. The fallback chain tries each configured provider in order and returns the first success; if all fail, the final error is the FIRST provider's error (the most actionable one, usually the Gemini key). The same RAG-grounded system prompt and messages are sent to every provider; the existing rules still apply (no invented Hadith numbers/references/dates/quotes, no invented syllabi/BPS/deadlines, answers in the selected language, AI content labelled "AI-generated — not verified", never in mocks).

**Free model used:** `google/gemma-4-26b-a4b-it:free` (constant `OPENROUTER_MODEL` in `src/lib/ai.ts`). Chosen because:
- Verified live against `https://openrouter.ai/api/v1/models` on 2026-11-11 (466 models listed, 16 free): pricing `prompt: "0", completion: "0"` and endpoint `/api/v1/chat/completions` supported.
- The previously common free ids are NO LONGER free on the live list (`meta-llama/llama-3.3-70b-instruct:free` and `deepseek/deepseek-chat-v3-0324:free` are absent), so they were NOT used.
- It is a Google Gemma instruction-tuned model (26B, 262k context) — good at short, grounded, exam-style answers. The `:free` suffix means the call can never incur a charge, so the key's $50 spending limit is never touched by tutor calls. OpenRouter 401 → clear "invalid key" message; 402 → clear payment/credit message (should not occur with a free model).

**Other changes:**
- `GET /api/tutor` now also reports `openrouter: boolean`; `live` is true if ANY of the three keys is set. No key value is ever exposed in any response.
- Tutor page (`/tutor`) shows all three providers in its status line and labels answers "via … OpenRouter (free model)" when that provider answers. Home page card and README updated to mention the third fallback. `.env.example` gained an empty `OPENROUTER_API_KEY=` placeholder (no real key anywhere).

**Build:** `npm run build` PASS (twice — once after the initial change, once after a small error-message refinement). 18 routes, no type errors, no lint errors.

**Smoke tests (placeholder keys only — no real keys used):**
1. **No-key server** (port 3101): `GET /api/tutor` → `{"live":false,"gemini":false,"groq":false,"openrouter":false,…}`. POSTs to `/api/tutor`, `/api/explain`, `/api/plan` → clean HTTP 503, no crash.
2. **All-placeholder server** (port 3102, `GEMINI_API_KEY` / `GROQ_API_KEY` / `OPENROUTER_API_KEY` all invalid placeholders): `GET /api/tutor` → `live:true` with all three booleans true. POSTs to all three routes → clean HTTP 502 with the Gemini invalid-key message (first provider's error, as designed) — chain tried all three, failed all, no crash.
3. **OpenRouter-only placeholder server** (port 3103, only `OPENROUTER_API_KEY` set, invalid): `GET /api/tutor` → `live:true, gemini:false, groq:false, openrouter:true`. POST `/api/tutor` → clean HTTP 502 with the OpenRouter invalid-key message — this proves `callOpenRouter` is actually reached when it is the only configured provider.
4. **Leak checks:** 0 placeholder strings in any API response; `grep -r` over `.next/static/` for `GEMINI_API_KEY` / `GROQ_API_KEY` / `OPENROUTER_API_KEY` / `AIzaSy` / placeholder values → 0 hits. Env var NAMES appear only in `.next/server/app/api/*/route.js` (server-side, as required). A strict regex scan of project source/docs for real key-value patterns (`AIzaSy…`, `sk-or-v1-…`, `gsk_…` with 20+ chars) → no matches (the word `AIzaSy` appears only as documentation text in this file, listing what was grepped for). No `.env.local` was created. All three test servers were stopped afterwards (ports 3101–3103 confirmed down).

**What remains untested live (for the parent, after deploy):**
- No REAL key was used or tested — a successful live answer from any provider has NOT been demonstrated. After deploy, ask the tutor one real question and confirm a live answer; check `GET /api/tutor` reports the expected booleans.
- The saved Vercel `GEMINI_API_KEY` value has an unusual format (per the parent's earlier note) and is UNVERIFIED — if the tutor reports the Gemini invalid-key error live, replace it with the real `AIza…` key from AI Studio (Propertank026, "ETEA Prep Tutor").
- `GROQ_API_KEY` and `OPENROUTER_API_KEY` are set in Vercel Production (per the parent); their live validity is likewise untested until a real tutor call falls through to them (or the primary key is removed).
- Real-browser click-through of the tutor page's new status line was not done on this VM (server-side rendering only, as in v3).
