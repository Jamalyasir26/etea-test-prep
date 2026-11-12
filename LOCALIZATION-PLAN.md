# Localization Plan — Tri-language content (English + Urdu + Roman Urdu)

Status: PLAN + SCAFFOLD (Localization Pass 1, 2026-11-12). The schema and
the rendering helpers exist; ZERO translated content exists today, so
behaviour is provably unchanged. Translation itself is phased work —
see §5 for the honest scale.

## 1. What Pass 1 already did (UI, not content)

- Every user-facing UI string (headings, descriptions, buttons,
  placeholders, labels, nav, footer, health indicator, privacy
  disclosures) goes through `src/lib/i18n.tsx` with `en` + `ur`
  translations; `roman` where it exists, else the fallback rule (§3).
- RTL isolation for English content rendered inside RTL flow
  (`dir="ltr"` / `dir="auto"` / `lri()` — see VERIFY-localization-pass1.md).
- Fonts: ONLY Noto Sans Arabic (the earlier Nastaliq decision was
  CANCELLED by the owner on 2026-11-12).

Content — notes, MCQs, flashcards, track patterns, vacancy rows, mock
notes, subject labels — is still English-only. This plan covers
translating it, in phases, without ever breaking the bank.

## 2. Schema (implemented, additive-only)

On `Question` (`src/lib/data.ts`):

```ts
interface QuestionTranslation {
  question?: string;
  options?: string[]; // used ONLY when length === English options length
  explanation?: string;
}
interface Question {
  // ... existing fields, unchanged ...
  ur?: QuestionTranslation;
  roman?: QuestionTranslation;
}
```

On `Note`:

```ts
interface NoteTranslation {
  title?: string;
  body?: string;
}
interface Note {
  // ... existing fields, unchanged ...
  ur?: NoteTranslation;
  roman?: NoteTranslation;
}
```

Rules:

- The fields are OPTIONAL and additive. Existing bank JSON files need
  no migration; items without translations behave exactly as before.
- Translations NEVER change `id`, `subject`, `topic`, `correctIndex`,
  `source`, `reviewStatus`, `post`, `conceptId`, `syllabusClause` or
  `sourceKind`. The correct answer is identified by index, so a
  translated `options` array MUST keep the same order — the option at
  `correctIndex` in English must be the translation of that same option.
- `options` is all-or-nothing: if the translated array's length does
  not exactly match the English array, the WHOLE array falls back to
  English (never a mixed array — a mixed array could silently move the
  correct answer).
- Flashcards, tracks, vacancies and mock notes have NO translation
  fields yet. They get the same pattern (optional `ur`/`roman` objects
  + a localizing helper) in the phase that translates them (§5). Do not
  invent a second pattern.

## 3. Rendering helpers + fallback rules (implemented)

`src/lib/data.ts` (dependency-free, so plain node tests can use it):

- `localizeQuestion(q, lang)` / `localizeNote(note, lang)` — return the
  item with its text in `lang`, falling back to English PER FIELD.
  With no translation present (every item today) the returned object
  is field-identical to the input. `lang === "en"` returns the input
  unchanged. Never mutates.
- `hasTranslation(item, lang)` — true when the item carries ANY
  non-blank translated content for `lang`. Used for coverage reporting
  (how many of 645 / 110 are translated), never for gating content.
- `ContentLang = "en" | "roman" | "ur"` — mirrors the UI `Lang` type
  without importing the client i18n module.

Fallback rule (same rule as the UI strings in `i18n.tsx`):

1. Selected language's field, if present and non-blank.
2. English field.
3. Never a raw key, never an empty string, never a mixed-language
   options array.

Proof-of-concept render path (Pass 1): the library renders
`localizeNote(note, lang)` for title/body. Storage keys and annotation
lookups stay on the ORIGINAL English title, so stored annotations are
unaffected by the display language. QuizRunner and flashcard wiring is
a later phase (§5) — it must preserve session/attempt storage keys,
which are built from English ids and titles.

## 4. Translation workflow (binding)

1. **Religious content first-class, owner-verified.** Translations of
   Islamiyat / Tajweed / Arabic / Fiqh material go through the owner
   review queue (`/review`) like any other content change — they are
   NEVER auto-approved, and the agent never marks a translation
   verified. A translated item keeps its existing `reviewStatus` until
   the owner re-verifies the translation; a new translation on a
   verified item should be flagged for re-review (the English text was
   verified, the translation was not).
2. **No machine translation dumped into the bank.** Draft translations
   may be machine-assisted, but every translated item is human-reviewed
   before it ships, and religious items only by the owner. The owner
   is an Urdu/Arabic scholar — awkward machine-Urdu is a defect, not
   a draft.
3. **Exactly one correct answer, preserved.** A translation must not
   change which option is correct, must not add a second defensible
   answer, and must not change the tested fact. The QA suite
   (`scripts/qa-540.mjs`, extended per phase) must assert, for every
   translated item: options length matches, `correctIndex` in range,
   no duplicate options, explanation present.
4. **No invented references.** Never invent Hadith numbers, Quran
   references, dates or quotes in a translation. If the English source
   cites a reference, the translation carries the same reference
   verbatim; if it cites none, the translation adds none.
5. **Source labels stay truthful.** A translated concept-extracted
   item keeps its provenance (`source`, `sourceKind`, `conceptId`).
   Translation does not change provenance and does not make an item
   "official".
6. **Small batches, verified live.** Translate in subject-sized
   batches (see §5), each deployed and spot-checked by the owner
   before the next batch starts. No 645-item big bang.

## 5. Phasing (TT/Qari core first) + honest scale

Scale, stated plainly: **645 MCQs + 110 notes**, each needing a
careful Urdu translation (and Roman Urdu where the owner wants it).
A single MCQ translation (question + 4 options + explanation) is
roughly 60–120 words of careful Urdu; a note is 40–150 words. At a
realistic careful pace this is many tens of hours of translation +
owner review — phased over weeks, not one batch. The phases below are
ordered by the owner's active targets (ZamungKor TT + Qari/Imam
Masjid first, per the Stage 1 C2 decision).

| Phase | Content | Size | Wiring needed |
|---|---|---|---|
| L1 | Islamiyat notes (TT/Qari core) | ~35 notes | Library (done — PoC) |
| L2 | Islamiyat MCQs (TT/Qari core) | ~105 MCQs | QuizRunner wiring |
| L3 | Tajweed notes + MCQs (Qari core) | ~15 notes, ~50 MCQs | QuizRunner wiring |
| L4 | Arabic notes + MCQs (AT + TT) | ~20 notes, ~80 MCQs | QuizRunner wiring |
| L5 | English/Urdu/Pak Studies/Maths/Pedagogy/GK/SocSt notes + MCQs | rest | QuizRunner wiring |
| L6 | Flashcards (70 cards) | 70 cards | Flashcard schema + wiring |
| L7 | Track patterns, vacancy rows, mock notes, subject labels | ~40 strings | Schema + wiring per surface |
| L8 | Roman Urdu pass over L1–L5 content | same items | None (fields exist) |

Each phase: translate → QA suite extended → owner review queue →
deploy → owner spot-check on his phone (RTL + font rendering) → next
phase. Roman Urdu (L8) is deliberately last: Urdu first, because the
owner reads Urdu natively and Roman Urdu is a convenience layer.

## 6. QA rules for translated content (per phase)

- `scripts/qa-540.mjs` (or a new `test-translations.mjs` once the
  first real translations land) asserts for every translated item:
  options length matches English; `correctIndex` unchanged and in
  range; no duplicate options within the translated array; question /
  explanation non-empty; no `ur` field containing only whitespace.
- `hasTranslation()` coverage counts are reported per phase (e.g.
  "Islamiyat: 105/105 ur, 0/105 roman") — in the phase report, not as
  a UI gate.
- A translated item that fails any QA check ships as English (the
  helper falls back) — never as a broken translation.
- RTL spot-checks after each deploy: punctuation placement on
  translated questions/options/explanations in Urdu mode, on a real
  phone (the browser environment cannot emulate the owner's device).

## 7. What is deliberately NOT translated

- Proper names and acronyms: ETEA, KPPSC, BISE, PDMA, Gemini, Groq,
  OpenRouter, ZamungKor (transliterated where a Urdu rendering
  already exists in UI strings, e.g. زمونگ کور in filter labels).
- IDs and codes: question ids (ISL-001), model names, storage keys,
  URLs, dates in ISO form.
- Scoring policy notes and the CORRECTIONS / PATTERN_BANNER factual
  statements: these stay English for precision and are LTR-isolated
  (see VERIFY-localization-pass1.md §2). If the owner later wants
  them translated, that is a separate decision — the factual wording
  must not drift in translation.
- Format examples: "e.g. ISL-001" placeholders.
