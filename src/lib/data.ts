// ETEA Prep Library v3 — data layer.
// All content migrated verbatim from v2 (~/workspace/etea-prep-v2):
// 590 MCQs (banks_norm), 95 notes, 70 flashcards, 19 tracks, 20 mocks,
// pattern selector, 21-day plan, vacancies, official links.
// Nothing here is invented: patterns, BPS and dates are exactly as in v2.
import content from "../data/content.json";
import type { ScoringConfig } from "./scoring";

import arabic from "../data/banks/arabic.json";
import drawing from "../data/banks/drawing.json";
import english from "../data/banks/english.json";
import gk from "../data/banks/gk.json";
import islamiyat from "../data/banks/islamiyat.json";
import it from "../data/banks/it.json";
import maths from "../data/banks/maths.json";
import pakstudies from "../data/banks/pakstudies.json";
import pastpapers from "../data/banks/pastpapers.json";
import pastpapersReworded from "../data/banks/pastpapers_reworded.json";
import pe from "../data/banks/pe.json";
import pedagogy from "../data/banks/pedagogy.json";
import science from "../data/banks/science.json";
import socialstudies from "../data/banks/socialstudies.json";
import tajweed from "../data/banks/tajweed.json";
import urdu from "../data/banks/urdu.json";

export type Question = {
  id: string;
  post: string[];
  subject: string;
  subjectKey: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  explanationUrdu: string | null;
  // Step 3b-audit2 (F02) — faithful English explanation. Present ONLY
  // where the bank's `explanation` is Roman Urdu and an English version
  // exists: hand-translated for Science/IT, or the verbatim English
  // sentence already in the bank for bilingual items. Absent =
  // `explanation` is already English, or no English version exists yet
  // (see explanationLang). Translations preserve the original's facts
  // exactly; answers/options are never touched.
  explanationEn?: string;
  // Step 3b-audit2 (F02) — marks a NON-English `explanation` with no
  // English version yet (religious/language content: Islamiyat,
  // Tajweed, Arabic, Urdu). Absent = English (or explanationEn
  // present). In English mode the UI shows the honest "pending owner
  // review" label for these instead of presenting Roman Urdu as
  // English; the items are queued on /review for the owner.
  explanationLang?: "roman";
  difficulty: string;
  pastPaperRef: string | null;
  verified: boolean;
  source: string;
  // Phase 2 review labels (additive). Absent reviewStatus means "draft"
  // (unreviewed). Only "owner-reviewed" / "approved" count as trusted.
  reviewStatus?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  // Stage 1 P2 — provenance (additive, optional). Absent = no provenance
  // claimed and no badge renders. conceptId groups items testing the SAME
  // concept (e.g. all passive-voice items share one id); syllabusClause
  // maps the item to a section of a named pattern document for study
  // organisation — it is NOT a claim that any specific advert uses that
  // pattern (ZamungKor has no published syllabus). sourceKind is never
  // "official" unless the item genuinely comes from an official source.
  conceptId?: string;
  syllabusClause?: string;
  sourceKind?: SourceKind;
  // Localization Pass 1 — tri-language content scaffold (see
  // LOCALIZATION-PLAN.md). Optional translations of this item's text.
  // Absent = English only (today's behaviour, unchanged). No item
  // carries a translation yet; translations arrive in later phases and
  // religious-content translations go through the owner review queue.
  ur?: QuestionTranslation;
  roman?: QuestionTranslation;
};

/** Localization Pass 1 — one item's translated text. Every field is
 *  optional and falls back to English independently (see
 *  localizeQuestion/localizeNote). `options` is used ONLY when it has
 *  exactly the same length as the English options — a partial options
 *  translation would silently drop choices, so it falls back wholesale. */
export type QuestionTranslation = {
  question?: string;
  options?: string[];
  explanation?: string;
};

export type NoteTranslation = {
  title?: string;
  body?: string;
};

/** Stage 1 P2 — where an item's content comes from. "official": from an
 *  official ETEA/official source (none in the bank today — nothing here
 *  is an official paper). "concept-extracted": original words written
 *  from a named source (must carry `source`). "proxy": practises the
 *  concept but is not from an official paper. "partial": covers only
 *  part of a topic. */
export type SourceKind = "official" | "concept-extracted" | "proxy" | "partial";

export type Note = {
  title: string;
  body: string;
  // Stage 1 P0.3 — provenance label, e.g. "Original content —
  // concept-extracted from <source name>". Absent on pre-P0.3 notes.
  source?: string;
  // Stage 1 P2 — same provenance fields as Question (see above).
  conceptId?: string;
  syllabusClause?: string;
  sourceKind?: SourceKind;
  // Localization Pass 1 — tri-language content scaffold (see above and
  // LOCALIZATION-PLAN.md). Absent = English only.
  ur?: NoteTranslation;
  roman?: NoteTranslation;
};
export type Flashcard = { front: string; back: string; category: string };
export type Track = {
  id: string;
  name: string;
  bps: string;
  elig: string;
  pattern: string;
  conf: string;
  mock: string | null;
};
export type MockDef = {
  id: string;
  title: string;
  track: string;
  variant: string;
  minutes: number;
  fixed?: string;
  total: number;
  comp?: Record<string, number>;
  note: string;
  // Stage 1 P0.1 — per-mock scoring config (optional). Absent = the
  // zero-penalty default (policy unknown). Only sst-kppsc carries a
  // config today (0.25 penalty, labelled "unverified assumption").
  scoring?: ScoringConfig;
};
export type Vacancy = {
  post: string;
  bps: string;
  vac: string;
  last: string;
  elig: string;
  src: string;
};

const BANKS: Record<string, Question[]> = {
  arabic: arabic as Question[],
  drawing: drawing as Question[],
  english: english as Question[],
  gk: gk as Question[],
  islamiyat: islamiyat as Question[],
  it: it as Question[],
  maths: maths as Question[],
  pakstudies: pakstudies as Question[],
  pastpapers: pastpapers as Question[],
  pastpapers_reworded: pastpapersReworded as Question[],
  pe: pe as Question[],
  pedagogy: pedagogy as Question[],
  science: science as Question[],
  socialstudies: socialstudies as Question[],
  tajweed: tajweed as Question[],
  urdu: urdu as Question[],
};
// NOTE: drawing_pe.json stays on disk but is deliberately NOT registered:
// its 20 items are split into the separate drawing.json and pe.json banks.

export const QUESTIONS: Question[] = Object.values(BANKS).flat();
export const BY_ID: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q]),
);
export const BY_SUBJECT: Record<string, Question[]> = BANKS;

// content.json (notes, flashcards, tracks, mocks, patterns, plan, vacancies, links)
export const NOTES: Record<string, Note[]> = content.notes as Record<string, Note[]>;
export const FLASHCARDS: Flashcard[] = content.flashcards as Flashcard[];
export const TRACKS: Track[] = content.tracks as Track[];
export const MOCKS: MockDef[] = content.mocks as MockDef[];
export const PATTERNS: Record<string, { name: string; source: string; confidence: string }> =
  content.patterns as Record<string, { name: string; source: string; confidence: string }>;
export const COMP_B: Record<string, Record<string, number>> = content.compB as Record<
  string,
  Record<string, number>
>;
export const COMP_MD: Record<string, Record<string, number>> = content.compMD as Record<
  string,
  Record<string, number>
>;
export const COMP_A: Record<string, Record<string, number>> = content.compA as Record<
  string,
  Record<string, number>
>;
export const PLAN21: [string, [number, string][]][] = content.plan21 as [
  string,
  [number, string][],
][];
export const VACANCIES: Vacancy[] = content.vacancies as Vacancy[];
export const OFFICIAL_LINKS: [string, string, string][] = content.links as [
  string,
  string,
  string,
][];
export const ZAM_FIXED: Record<string, string[]> = content.zamFixed as Record<string, string[]>;
export const SUBJECT_LABELS: Record<string, string> = content.subjectLabels as Record<
  string,
  string
>;
export const COUNTS = content.counts as {
  total: number;
  bySubject: [string, number][];
  notes: number;
  cards: number;
  tracks: number;
  mocks: number;
};

// ---------- Step 3a — teaching-only visibility ----------

/** Step 3a — the teaching-only scope (owner order: HIDE non-teaching
 *  content, never delete it). TEACHING_TRACK_IDS is the ONE source of
 *  truth: every browse surface (tracks list/detail, mock list/detail,
 *  vacancies, home counts, coverage ledger) reads VISIBLE_TRACKS /
 *  VISIBLE_MOCKS / VISIBLE_VACANCIES, which are filtered from the FULL
 *  data. The full TRACKS / MOCKS / VACANCIES arrays stay intact in
 *  content.json and in this module: hidden data remains in the repo
 *  files, in exports/backups, and in data-level helpers
 *  (buildMockQuestions, trustedOnlyCount, mockLabels). Re-showing a
 *  track is a one-line change: add its id to this list.
 *
 *  Classification (verified against the actual track data — see
 *  VERIFY-step3a.md for the full table):
 *  - Visible (12): the owner's named teaching set.
 *  - Hidden (7): junior-clerk, computer-operator, police, forest, lhv,
 *    rescue (non-teaching) + lecturer. Lecturer is a teaching post by
 *    nature (KPPSC BPS-17) but is NOT in the owner's named teaching
 *    set, has no mock and no subject bank ("No mock yet — subject bank
 *    not built"), so it is hidden with the rest; add "lecturer" here
 *    to show it again. */
export const TEACHING_TRACK_IDS: readonly string[] = [
  "zamungkor",
  "tt",
  "at",
  "pst",
  "ct",
  "ctit",
  "dm",
  "pet",
  "qari",
  "swse",
  "sst-etea",
  "sst-kppsc",
];

/** Is this track id in the visible teaching set? Unknown ids are NOT
 *  visible: a track added to content.json later stays hidden until it
 *  is deliberately added to TEACHING_TRACK_IDS. */
export function isTrackVisible(trackId: string): boolean {
  return TEACHING_TRACK_IDS.includes(trackId);
}

/** Tracks the user can browse. Full data: TRACKS (unchanged). */
export const VISIBLE_TRACKS: Track[] = TRACKS.filter((t) => isTrackVisible(t.id));

/** Mocks the user can browse: a mock is visible iff its track is.
 *  Full data: MOCKS (unchanged). */
export const VISIBLE_MOCKS: MockDef[] = MOCKS.filter((m) => isTrackVisible(m.track));

/** Vacancy rows have no track id, so the hidden row is matched by its
 *  exact stored `post` string (copied verbatim from content.json).
 *  Only the Rescue 1122 row is non-teaching; the other four rows are
 *  teaching vacancies and stay visible. */
export const HIDDEN_VACANCY_POSTS: ReadonlySet<string> = new Set([
  "Rescue 1122 KP — EMT, Fire Rescuer, Driver",
]);

/** Vacancy rows the user can browse. Full data: VACANCIES (unchanged). */
export const VISIBLE_VACANCIES: Vacancy[] = VACANCIES.filter(
  (v) => !HIDDEN_VACANCY_POSTS.has(v.post),
);

/** Home-page counts with the visible teaching scope. The bank counts
 *  (total/notes/cards) are subject-based and unchanged; only the
 *  track/mock counts drop to the visible set. COUNTS itself keeps the
 *  full-bank figures (19 tracks / 20 mocks) for data-level use. */
export const VISIBLE_COUNTS = {
  ...COUNTS,
  tracks: VISIBLE_TRACKS.length,
  mocks: VISIBLE_MOCKS.length,
};

export const PATTERN_BANNER =
  "ETEA sets paper composition per project. Always verify against your specific advertisement / roll number slip.";

export const CORRECTIONS = [
  "ZamungKor 2026 (Project 891, last date 20 Nov 2026): NO BPS, NO published syllabus — 30 posts, 16 titles, 1-year contract on fixed pay. Never call it BPS-16/BPS-12.",
  "ESED Theology Teacher (TT) is BPS-15. BPS-16 Religious/Theology Teacher is a separate Social Welfare post (Jan 2025).",
  "SST is two exams: ETEA 100 MCQs vs KPPSC 45 MCQs — never merge them.",
];

// Step 2a — version of the correction notice. The home page stores the
// acknowledged version in localStorage; bump this number whenever a
// CORRECTIONS line or the PATTERN_BANNER changes, so the full notice
// shows again on the next visit. The notice is never removed —
// acknowledgement only compacts it, with a reopen control.
export const CORRECTIONS_VERSION = 1;

// ---------- deterministic shuffle (stable per seed) ----------
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffled<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Stage 1 P0.2 — owner review decisions held in localStorage
 *  (question id -> reviewStatus string). The bank JSONs are static
 *  content; the owner's decisions live in `etea_reviews_next_v1` and are
 *  passed in as overrides wherever trust is computed. When no overrides
 *  are passed, the bank's own reviewStatus is used (all "draft" today). */
export type ReviewOverrides = Record<string, string>;

/** Effective review status of a question: the owner's local decision
 *  wins over the bank's stored status. */
export function effectiveReviewStatus(q: Question, overrides?: ReviewOverrides): string {
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, q.id)) {
    return overrides[q.id];
  }
  return q.reviewStatus ?? "draft";
}

/** Localization Pass 1 — content language for localizeQuestion /
 *  localizeNote / provenanceBadge. Mirrors the UI Lang type without
 *  importing the client i18n module (this file must stay importable
 *  from plain node tests). */
export type ContentLang = "en" | "roman" | "ur";

// Unicode bidi isolates for plain-text strings (badge tooltips): wrap a
// Latin-script run so its punctuation cannot jump in RTL context. Same
// characters as lri() in i18n.tsx, defined locally to keep this module
// dependency-free.
const LRI = "\u2066";
const PDI = "\u2069";

/** Return the item with its text in `lang`, falling back to English
 *  per field. With no translation present (every item today) the
 *  returned object is field-identical to the input. Never mutates. */
export function localizeQuestion(q: Question, lang: ContentLang): Question {
  if (lang === "en") return q;
  const tr = lang === "ur" ? q.ur : q.roman;
  if (!tr) return q;
  const options =
    tr.options && tr.options.length === q.options.length ? tr.options : q.options;
  return {
    ...q,
    question: tr.question ?? q.question,
    options,
    explanation: tr.explanation ?? q.explanation,
  };
}

/** Step 3b-audit2 (F02) — the explanation to DISPLAY for one item in
 *  `lang`, with whether an English version is still pending. English
 *  mode shows the faithful English text whenever one exists
 *  (explanationEn), and NEVER presents a Roman Urdu explanation as
 *  English: untranslated Roman Urdu text is returned with
 *  pendingEnglish=true so the UI labels it honestly. Roman/Urdu modes
 *  keep today's behaviour (the bank's `explanation` verbatim, plus any
 *  tri-language translation override). Pure; never mutates. */
export type ExplanationDisplay = { text: string; pendingEnglish: boolean };
export function displayExplanation(q: Question, lang: ContentLang): ExplanationDisplay {
  const localized = localizeQuestion(q, lang);
  if (lang !== "en") return { text: localized.explanation, pendingEnglish: false };
  if (q.explanationEn) return { text: q.explanationEn, pendingEnglish: false };
  if (q.explanationLang === "roman") return { text: q.explanation, pendingEnglish: true };
  return { text: q.explanation, pendingEnglish: false };
}

/** Step 3b-audit2 (F02) — items whose English explanation is pending
 *  owner review (explanationLang === "roman"), sorted by id.
 *  Phase 4A: the /review queue UI that rendered this list was removed
 *  (owner decision — personal use, no manual verification needed); the
 *  helper is retained for the test suites' F02 accounting. The pending
 *  labels on explanations are unaffected. Religious-content
 *  translations are the owner's decision, never auto-generated. */
export function pendingEnglishExplanations(): Question[] {
  return QUESTIONS.filter((q) => q.explanationLang === "roman").sort((a, b) =>
    a.id.localeCompare(b.id),
  );
}

/** Same fallback rule for notes. The proof-of-concept render path is
 *  the library: it renders localizeNote(note, lang) while keying
 *  annotations by the original (English) title, so stored data is
 *  unaffected by the display language. */
export function localizeNote(note: Note, lang: ContentLang): Note {
  if (lang === "en") return note;
  const tr = lang === "ur" ? note.ur : note.roman;
  if (!tr) return note;
  return { ...note, title: tr.title ?? note.title, body: tr.body ?? note.body };
}

/** Does this item carry ANY translation content for `lang`? Used for
 *  translation-coverage reporting (see LOCALIZATION-PLAN.md). */
export function hasTranslation(item: Question | Note, lang: "roman" | "ur"): boolean {
  const tr = item[lang];
  if (!tr) return false;
  return Object.values(tr).some((v) =>
    Array.isArray(v) ? v.some((s) => s.trim().length > 0) : typeof v === "string" && v.trim().length > 0,
  );
}

/** Stage 1 P2 — provenance badge for one item. Returns null when the
 *  item carries no sourceKind (no provenance claimed, no badge). The
 *  label is the badge text; detail is the plain-language explanation
 *  shown as the badge's title/tooltip and next to it where space allows.
 *  "concept-extracted" always names its source (the data guarantees a
 *  non-empty `source`; if one were missing, the label degrades to the
 *  generic wording rather than inventing a source name).
 *  Localization Pass 1 — optional `lang`: "ur" renders Urdu
 *  label/detail (source names and clauses stay English, wrapped in
 *  bidi isolates); "roman"/omitted keeps English (fallback rule). */
export function provenanceBadge(
  item: {
    source?: string | null;
    sourceKind?: SourceKind;
    syllabusClause?: string;
  },
  lang: ContentLang = "en",
): { label: string; detail: string; tone: "teal" | "green" | "grey" } | null {
  const kind = item.sourceKind;
  if (!kind) return null;
  if (lang === "ur") return provenanceBadgeUr(item);
  const clause = item.syllabusClause ? ` Maps to: ${item.syllabusClause}.` : "";
  switch (kind) {
    case "official":
      return {
        label: "Official source",
        detail: `From an official source.${clause}`,
        tone: "green",
      };
    case "concept-extracted": {
      const src = (item.source ?? "").replace(/^Original content — concept-extracted from\s*/, "").trim();
      return {
        label: "Concept-extracted",
        detail: src
          ? `Original content in our own words — concepts extracted from ${src}, not copied.${clause}`
          : `Original content in our own words — concepts extracted from a named source, not copied.${clause}`,
        tone: "teal",
      };
    }
    case "proxy":
      return {
        label: "Practice proxy",
        detail: `Practises this concept; not from an official paper.${clause}`,
        tone: "grey",
      };
    case "partial":
      return {
        label: "Partial coverage",
        detail: `Covers only part of this topic.${clause}`,
        tone: "grey",
      };
  }
}

function provenanceBadgeUr(item: {
  source?: string | null;
  sourceKind?: SourceKind;
  syllabusClause?: string;
}): { label: string; detail: string; tone: "teal" | "green" | "grey" } | null {
  const kind = item.sourceKind;
  if (!kind) return null;
  const clause = item.syllabusClause
    ? ` نصاب حوالہ: ${LRI}${item.syllabusClause}${PDI}۔`
    : "";
  switch (kind) {
    case "official":
      return { label: "سرکاری ماخذ", detail: `سرکاری ماخذ سے۔${clause}`, tone: "green" };
    case "concept-extracted": {
      const src = (item.source ?? "").replace(/^Original content — concept-extracted from\s*/, "").trim();
      return {
        label: "تصور سے اخذ شدہ",
        detail: src
          ? `اپنے الفاظ میں اصل مواد — ${LRI}${src}${PDI} سے تصورات اخذ کیے گئے، نقل نہیں۔${clause}`
          : `اپنے الفاظ میں اصل مواد — نام والے ماخذ سے تصورات اخذ کیے گئے، نقل نہیں۔${clause}`,
        tone: "teal",
      };
    }
    case "proxy":
      return {
        label: "مشقی متبادل",
        detail: `اس تصور کی مشق کرواتا ہے؛ سرکاری پرچے سے نہیں۔${clause}`,
        tone: "grey",
      };
    case "partial":
      return {
        label: "جزوی احاطہ",
        detail: `اس موضوع کے صرف ایک حصے کا احاطہ کرتا ہے۔${clause}`,
        tone: "grey",
      };
  }
}

/** Step 2a — semantic badge tones. One tone per MEANING; tones never
 *  merge distinct meanings. "official" (success green) is ONLY for
 *  genuine official-source confirmation; "reviewed" (teal-tinted
 *  neutral) is local owner review, never certification. */
export type BadgeTone =
  | "draft"
  | "reviewed"
  | "proxy"
  | "partial"
  | "unknown"
  | "official"
  | "topic"
  | "extracted"
  | "error";

export type BadgeInfo = { label: string; detail: string; tone: BadgeTone };

/** Step 2a — review-status badge for one item. ALWAYS returns a badge
 *  (unlike provenanceBadge): every item has a review status, and
 *  "Draft" is the honest default for unreviewed material. Unknown
 *  status strings map to "Unknown", never to a trusted-looking tone.
 *  "roman"/omitted keeps English (same fallback rule as
 *  provenanceBadge); "ur" renders Urdu label/detail. */
export function reviewStatusBadge(status: string | undefined | null, lang: ContentLang = "en"): BadgeInfo {
  const s = (status ?? "").trim();
  if (lang === "ur") {
    switch (s) {
      case "owner-reviewed":
        return {
          label: "مالک سے جائزہ شدہ",
          detail: "مالک نے اس آلے پر خود اس کا جائزہ لیا — ذاتی جائزہ، سرکاری تصدیق نہیں۔",
          tone: "reviewed",
        };
      case "approved":
        return {
          label: "منظور شدہ",
          detail: "مالک نے اس آلے پر اسے منظور کیا — ذاتی جائزہ، سرکاری تصدیق نہیں۔",
          tone: "reviewed",
        };
      case "needs-review":
        return {
          label: "جائزہ درکار",
          detail: "مالک نے اسے دوبارہ دیکھنے کے لیے نشان زد کیا ہے۔",
          tone: "partial",
        };
      case "disputed":
        return {
          label: "متنازع",
          detail: "مالک اس کے جواب یا الفاظ سے اختلاف رکھتا ہے۔",
          tone: "error",
        };
      case "draft":
      case "":
        return {
          label: "مسودہ",
          detail: "غیر جائزہ شدہ مشقی مواد — مالک نے ابھی اسے نہیں دیکھا۔",
          tone: "draft",
        };
      default:
        return { label: "نامعلوم", detail: "جائزے کی حیثیت پہچانی نہیں گئی۔", tone: "unknown" };
    }
  }
  switch (s) {
    case "owner-reviewed":
      return {
        label: "Owner-reviewed",
        detail: "Reviewed by the owner on this device — personal review, not official certification.",
        tone: "reviewed",
      };
    case "approved":
      return {
        label: "Approved",
        detail: "Approved by the owner on this device — personal review, not official certification.",
        tone: "reviewed",
      };
    case "needs-review":
      return {
        label: "Needs review",
        detail: "Flagged by the owner as needing another look.",
        tone: "partial",
      };
    case "disputed":
      return {
        label: "Disputed",
        detail: "The owner disputes this item's answer or wording.",
        tone: "error",
      };
    case "draft":
    case "":
      return {
        label: "Draft",
        detail: "Unreviewed practice material — the owner has not checked this item yet.",
        tone: "draft",
      };
    default:
      return { label: "Unknown", detail: "Review status is not recognised.", tone: "unknown" };
  }
}

/** Step 2a — topic-inspired badge for the 40 past-paper-topic items.
 *  Returns null when the item carries no pastPaperRef. The English
 *  detail is the stored ref string itself (the standing disclosure,
 *  verbatim); the Urdu detail is the matching Urdu disclosure. The
 *  label always says "Topic-inspired" first, so the item can never be
 *  mistaken for an actual past paper. */
export function topicBadge(pastPaperRef: string | null | undefined, lang: ContentLang = "en"): BadgeInfo | null {
  if (!pastPaperRef) return null;
  const reworded = pastPaperRef.includes("reworded");
  if (lang === "ur") {
    return reworded
      ? {
          label: "موضوع سے متاثر · دوبارہ لکھا گیا",
          detail: "پاسٹ پیپر کے سوال کا وہی تصور، مختلف انداز میں دوبارہ لکھا گیا — اصل پرچہ نہیں۔",
          tone: "topic",
        }
      : {
          label: "موضوع سے متاثر · اصل",
          detail: "پاسٹ پیپر کے موضوعات پر مبنی اصل مشقی سوال — اصل پرچہ نہیں۔",
          tone: "topic",
        };
  }
  return {
    label: reworded ? "Topic-inspired · Reworded" : "Topic-inspired · Original",
    detail: pastPaperRef,
    tone: "topic",
  };
}

/** Step 2a — track confidence badge. The LABEL is the track's stored
 *  `conf` string, verbatim, in every language (it is a factual claim,
 *  like the CORRECTIONS lines). Only the TONE and the DETAIL are
 *  derived, from the string's own words: "JOB-SITE", or a claim that
 *  STARTS with "NOT VERIFIED" (nothing in it is confirmed), means no
 *  official source backs it (Unknown); "NOT VERIFIED" later in the
 *  string means part is confirmed and part is not (Partial, e.g. the
 *  Qari track: pattern confirmed, qualification not); anything else
 *  names a specific official source (Source Confirmed). Distinct
 *  meanings are never merged into one green badge. The home pattern
 *  selector reuses this function for its confidence strings. */
export function trackConfidenceBadge(conf: string, lang: ContentLang = "en"): BadgeInfo {
  const unknown = conf.includes("JOB-SITE") || conf.startsWith("NOT VERIFIED");
  const partial = !unknown && conf.includes("NOT VERIFIED");
  if (lang === "ur") {
    if (unknown)
      return {
        label: conf,
        detail: "کسی سرکاری ماخذ سے تصدیق نہیں ہوئی — اسے سرکاری نہ سمجھیں۔",
        tone: "unknown",
      };
    if (partial)
      return {
        label: conf,
        detail: "اس دعوے کا کچھ حصہ سرکاری ماخذ سے تصدیق شدہ ہے، کچھ حصہ نہیں۔",
        tone: "partial",
      };
    return {
      label: conf,
      detail: "ماخذ کی تصدیق ایک نام والے سرکاری دستاویز سے ہوئی۔",
      tone: "official",
    };
  }
  if (unknown)
    return {
      label: conf,
      detail: "Not verified against any official source — do not treat as official.",
      tone: "unknown",
    };
  if (partial)
    return {
      label: conf,
      detail: "Part of this claim is confirmed against an official source; part is not verified.",
      tone: "partial",
    };
  return {
    label: conf,
    detail: "Confirmed against a named official source.",
    tone: "official",
  };
}

/** Stage 1 P1 Tier 1 — review attribution for the /review dashboard.
 *  Who verified this item, and when? The owner's live decision (a
 *  localStorage record) wins; otherwise fall back to the bank JSON's own
 *  reviewedBy/reviewedAt (the 15 owner-verified items are stored there
 *  since the P1T0 deploy). Before this helper, /review read ONLY the
 *  localStorage map, so bank-verified items rendered "· unreviewed" even
 *  though their status, counts and Trusted Mode were correct. Returns
 *  nulls when neither source has an attribution (draft / unreviewed). */
export function reviewAttribution(
  q: Question,
  override?: { reviewedBy?: string | null; reviewedAt?: string | null } | null,
): { by: string | null; at: string | null } {
  const by = override?.reviewedBy ?? q.reviewedBy ?? null;
  const at = override?.reviewedAt ?? q.reviewedAt ?? null;
  return { by: by || null, at: at || null };
}

/** Phase 2 trusted gating. Trusted = owner-reviewed or approved.
 *  A missing reviewStatus counts as NOT trusted (draft / unreviewed). */
export function isTrusted(q: Question, overrides?: ReviewOverrides): boolean {
  const s = effectiveReviewStatus(q, overrides);
  return s === "owner-reviewed" || s === "approved";
}

/** How many questions of a mock's composition are trusted (reviewed).
 *  Fixed mocks: trusted items among the stored id list. Dynamic mocks:
 *  per subject, min(requested count, trusted items in that bank).
 *  Legacy comp key "drawing_pe" is no longer used by any live comp
 *  (DM/PET comps in content.json use "drawing" / "pe"); the alias is kept
 *  only as a safety net and draws from the split drawing + pe banks. */
export function trustedOnlyCount(mock: MockDef, overrides?: ReviewOverrides): number {
  if (mock.fixed && ZAM_FIXED[mock.fixed]) {
    return ZAM_FIXED[mock.fixed].map((id) => BY_ID[id]).filter((q) => q && isTrusted(q, overrides)).length;
  }
  let n = 0;
  for (const [subjectKey, count] of Object.entries(mock.comp ?? {})) {
    const pool =
      subjectKey === "drawing_pe"
        ? [...(BY_SUBJECT.drawing ?? []), ...(BY_SUBJECT.pe ?? [])]
        : (BY_SUBJECT[subjectKey] ?? []);
    n += Math.min(count, pool.filter((q) => isTrusted(q, overrides)).length);
  }
  return n;
}

/** Build the question list for a mock. Fixed ZamungKor mocks use the stored
 *  disjoint id lists; dynamic mocks sample without replacement per subject
 *  composition from the shared bank (no duplicates within a mock).
 *  With opts.trustedOnly, only trusted (reviewed) items are used and the
 *  shortfall is NEVER filled with unreviewed items — the mock returns
 *  fewer questions instead. */
export function buildMockQuestions(
  mock: MockDef,
  seedSuffix = "",
  opts?: { trustedOnly?: boolean; overrides?: ReviewOverrides },
): Question[] {
  const trustedOnly = opts?.trustedOnly === true;
  const overrides = opts?.overrides;
  if (mock.fixed && ZAM_FIXED[mock.fixed]) {
    const qs = ZAM_FIXED[mock.fixed].map((id) => BY_ID[id]).filter(Boolean);
    return trustedOnly ? qs.filter((q) => isTrusted(q, overrides)) : qs;
  }
  const rand = mulberry32(hashSeed(mock.id + seedSuffix));
  const out: Question[] = [];
  const comp = mock.comp ?? {};
  for (const [subjectKey, count] of Object.entries(comp)) {
    // Legacy comp key "drawing_pe" (no live comp uses it any more; kept as
    // a safety net) draws from the split drawing + pe banks, not the
    // unregistered old file.
    const bank =
      subjectKey === "drawing_pe"
        ? [...(BY_SUBJECT.drawing ?? []), ...(BY_SUBJECT.pe ?? [])]
        : (BY_SUBJECT[subjectKey] ?? []);
    const pool = trustedOnly ? bank.filter((q) => isTrusted(q, overrides)) : bank;
    const picked = shuffled(pool, rand).slice(0, count);
    out.push(...picked);
  }
  return shuffled(out, rand);
}

// ---------- Step 2b — mock availability + labels (real counts only) ----------

/** How many questions a mock can actually build in provisional mode:
 *  fixed mocks use their stored id list; dynamic mocks sample without
 *  replacement per subject, so each subject contributes
 *  min(requested, bank size). buildMockQuestions() always returns
 *  exactly this many — the number is computed, never guessed. */
export function mockAvailableCount(mock: MockDef): number {
  if (mock.fixed && ZAM_FIXED[mock.fixed]) {
    return ZAM_FIXED[mock.fixed].map((id) => BY_ID[id]).filter(Boolean).length;
  }
  let n = 0;
  for (const [subjectKey, count] of Object.entries(mock.comp ?? {})) {
    const bank =
      subjectKey === "drawing_pe"
        ? [...(BY_SUBJECT.drawing ?? []), ...(BY_SUBJECT.pe ?? [])]
        : (BY_SUBJECT[subjectKey] ?? []);
    n += Math.min(count, bank.length);
  }
  return n;
}

export type MockCoverage = "full" | "partial" | "proxy";

export type MockLabels = {
  /** Availability label: "proxy" when the mock's variant is a proxy
   *  pattern, else "full" when every question is available, else
   *  "partial". Never merges ETEA and KPPSC patterns: the variant is
   *  the mock's own stored string, shown verbatim by the caller. */
  coverage: MockCoverage;
  /** Questions actually available (provisional mode). */
  available: number;
  /** Owner-reviewed questions available (trusted mode). */
  trusted: number;
  /** True when the mock carries no own scoring config (policy unknown). */
  scoringUnknown: boolean;
};

/** Step 2b — every label the mock list shows, derived from the real
 *  bank + the owner's local review decisions. The caller maps
 *  `coverage` to the Full / Partial / Proxy badge, shows a "Reviewed
 *  subset" badge when 0 < trusted < total, and a "Scoring policy
 *  unknown" badge when scoringUnknown. */
export function mockLabels(mock: MockDef, overrides?: ReviewOverrides): MockLabels {
  const available = mockAvailableCount(mock);
  const trusted = trustedOnlyCount(mock, overrides);
  return {
    coverage: mock.variant === "proxy" ? "proxy" : available >= mock.total ? "full" : "partial",
    available,
    trusted,
    scoringUnknown: !mock.scoring,
  };
}

// ---------- Step 2b — cross-section subject mappings ----------

/** NOTES subject key -> BY_SUBJECT bank key, for Library "related
 *  practice drill" links. "Drawing/PE" has NO bank key (its items live
 *  in the split drawing/pe banks) and is deliberately absent: the
 *  caller omits the drill link rather than pointing at half the
 *  subject. */
export const NOTE_BANK_KEY: Record<string, string> = {
  Islamiyat: "islamiyat",
  English: "english",
  Urdu: "urdu",
  "Pak Studies": "pakstudies",
  Maths: "maths",
  Pedagogy: "pedagogy",
  Tajweed: "tajweed",
  Arabic: "arabic",
  "General Science": "science",
  "IT/Computer": "it",
  GK: "gk",
  "Social Studies": "socialstudies",
};

/** Bank key for a Library subject, or null when no exact bank exists. */
export function noteBankKey(subject: string): string | null {
  return NOTE_BANK_KEY[subject] ?? null;
}

/** Library scope (?subject= value) for a question's subject label, for
 *  the QuizRunner reveal "source note" link. Most labels ARE Library
 *  subjects and pass through. The exceptions are mapped explicitly:
 *  Drawing / Physical Education share the "Drawing/PE" notes, and IT
 *  questions map to the "IT/Computer" notes. Labels naming no notes
 *  at all (the past-paper topic banks, which span subjects) map to
 *  "all" so the topic query searches every subject instead of landing
 *  on an unrelated one. Never returns an invalid scope. */
export function libraryScopeForSubjectLabel(label: string): string {
  if (NOTES[label]) return label;
  if (label === "Drawing" || label === "Physical Education") return "Drawing/PE";
  if (label === "IT") return "IT/Computer";
  return "all";
}

/** BY_SUBJECT bank key for a subject DISPLAY label (e.g. "Islamiyat"
 *  -> "islamiyat", "Past-Paper Topics" -> "pastpapers"). Inverts
 *  SUBJECT_LABELS. Used by the Analysis drill links: per-subject stats
 *  are keyed by label, but /practice expects a bank key — passing the
 *  label silently fell back to the stored subject (pre-2b behaviour).
 *  Null when the label names no bank. */
export function subjectKeyForLabel(label: string): string | null {
  for (const [key, value] of Object.entries(SUBJECT_LABELS)) {
    if (value === label) return key;
  }
  return null;
}

/** Flashcard category matching a Library subject, or null. Only
 *  subjects that ARE flashcard categories get a deep link
 *  (/flashcards?category=…); the rest link to the plain flashcards
 *  page. Computed from the real card bank, never hardcoded. */
export function flashcardCategoryForNote(subject: string): string | null {
  return FLASHCARDS.some((c) => c.category === subject) ? subject : null;
}

/** Shuffle the 4 options of one question, keeping the correct answer tracked. */
export function shuffleOptions(q: Question, rand: () => number) {
  const order = shuffled([0, 1, 2, 3], rand);
  return {
    question: q,
    options: order.map((i) => q.options[i]),
    correctIndex: order.indexOf(q.correctIndex),
  };
}

// ---------- RAG retrieval (keyword overlap over local library only) ----------
const STOP = new Set(
  "what is are the of in on for to and or a an how many which who when where did does do was were is it its this that with by from as at be been has have had not no yes if then than so such".split(
    " ",
  ),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function score(text: string, terms: string[]): number {
  const hay = text.toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (hay.includes(t)) s += t.length > 5 ? 2 : 1;
  }
  return s;
}

// Step 2b — retrieve() attaches the Library subject to each returned
// note (it knows which NOTES bucket the note came from). The return
// type says so explicitly: callers building citation deep links read
// `subject` off the returned notes.
export type RetrievedNote = Note & { subject: string };

export function retrieve(
  query: string,
  topNotes = 5,
  topQuestions = 5,
): { notes: RetrievedNote[]; questions: Question[] } {
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0) return { notes: [] as RetrievedNote[], questions: [] as Question[] };
  const noteScores: { note: Note; subject: string; s: number }[] = [];
  for (const [subject, list] of Object.entries(NOTES)) {
    for (const note of list) {
      const s = score(`${note.title} ${note.body}`, terms);
      if (s > 0) noteScores.push({ note, subject, s });
    }
  }
  noteScores.sort((a, b) => b.s - a.s);
  const qScores: { q: Question; s: number }[] = [];
  for (const q of QUESTIONS) {
    const s = score(`${q.question} ${q.explanation} ${q.subject} ${q.topic}`, terms);
    if (s > 0) qScores.push({ q, s });
  }
  qScores.sort((a, b) => b.s - a.s);
  return {
    notes: noteScores.slice(0, topNotes).map((x) => ({ ...x.note, subject: x.subject })),
    questions: qScores.slice(0, topQuestions).map((x) => x.q),
  };
}
