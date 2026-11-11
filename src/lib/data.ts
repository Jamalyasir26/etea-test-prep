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
  difficulty: string;
  pastPaperRef: string | null;
  verified: boolean;
  source: string;
  // Phase 2 review labels (additive). Absent reviewStatus means "draft"
  // (unreviewed). Only "owner-reviewed" / "approved" count as trusted.
  reviewStatus?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
};

export type Note = {
  title: string;
  body: string;
  // Stage 1 P0.3 — provenance label, e.g. "Original content —
  // concept-extracted from <source name>". Absent on pre-P0.3 notes.
  source?: string;
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

export const PATTERN_BANNER =
  "ETEA sets paper composition per project. Always verify against your specific advertisement / roll number slip.";

export const CORRECTIONS = [
  "ZamungKor 2026 (Project 891, last date 20 Nov 2026): NO BPS, NO published syllabus — 30 posts, 16 titles, 1-year contract on fixed pay. Never call it BPS-16/BPS-12.",
  "ESED Theology Teacher (TT) is BPS-15. BPS-16 Religious/Theology Teacher is a separate Social Welfare post (Jan 2025).",
  "SST is two exams: ETEA 100 MCQs vs KPPSC 45 MCQs — never merge them.",
];

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

export function retrieve(query: string, topNotes = 5, topQuestions = 5) {
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0) return { notes: [] as Note[], questions: [] as Question[] };
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
