// Preparation tracking — localStorage-first (single user, single device).
// Every dashboard number is computed from real stored attempts only.
// Empty state = "no attempts yet". Never invented sample data.
// Export/import (JSON file) so progress is never trapped in one browser.
//
// Phase 2 notes:
// - Flashcard scheduling is a "simple spaced-review schedule" (fixed
//   interval ladder, no easiness factor). It is NOT SM-2; no copy in this
//   file calls it SM-2-style.
// - Flashcard attempts (kind "flash") are self-ratings, NOT objective MCQ
//   results: computeStats excludes them from MCQ accuracy/totals and
//   reports them separately (flashAttempts / flashReviewed / flashRecalled).
// - No API keys exist client-side. The export contains only local progress
//   (attempts, plan, flashcards, issues, preferences, sessions) — never
//   credentials. Verified by grep: no key/token/secret values in src/.
"use client";

export type Attempt = {
  id: string;
  kind: "quiz" | "mock" | "flash";
  subject?: string; // subject label, e.g. "Islamiyat"
  mockId?: string;
  trackId?: string;
  title: string;
  total: number;
  correct: number;
  seconds: number;
  date: string; // ISO timestamp
  perSubject?: Record<string, [number, number]>; // [correct, total]
  // Stage 1 P0.1 (additive, optional): exam score under the scoring
  // config that was in force for this attempt. `correct` stays the
  // first-pass raw count; examScore is the separate exam number.
  examScore?: number;
  examTotal?: number;
  scoringPolicy?: string; // e.g. "unknown" | "unverified-assumption" | "official"
  // Phase 2 (additive, optional): per-item records. `correct` is always the
  // FIRST-PASS score; retries never change it (see QuizRunner).
  itemRecords?: ItemRecord[];
  retryCount?: number; // corrected retries; not counted in the score
};

/** One answered question inside an attempt. firstAnswer/finalAnswer are the
 *  displayed option texts (null when unanswered). `correct` is first-pass
 *  correctness. keyVersion identifies the answer key the result was scored
 *  against; bump KEY_VERSION when the bank's answer key changes. */
export type ItemRecord = {
  questionId: string;
  question: string;
  topic: string;
  firstAnswer: string | null;
  finalAnswer: string | null;
  correctAnswer: string;
  correct: boolean;
  mode: "practice" | "mock";
  source: string;
  keyVersion: string;
  answeredAt: string | null; // ISO timestamp of the first response
  responseMs?: number; // ms from the question being shown to first response
};

/** Answer-key version for item records. No per-question version exists in
 *  the bank, so records are stamped with the app/content version instead. */
export const KEY_VERSION = "v3";

export type FlashState = {
  [cardId: string]: { grade: "again" | "hard" | "good" | "easy"; due: string; interval: number; reps: number };
};

const ATTEMPTS_KEY = "etea_attempts_next";
const PLAN_KEY = "etea_plan_next";
const FLASH_KEY = "etea_flash_next";
const DAY_KEY = "etea_last_day_next";
const ISSUES_KEY = "etea_issues_v2";
const ISSUES_LEGACY_KEY = "etea_issues_next";
const SESSION_KEY = "etea_session_next_v2";
const LANG_KEY = "etea_lang_next";
const THEME_KEY = "etea_theme_next";
// Stage 1 P0.2 — owner review decisions (one record per question id).
const REVIEWS_KEY = "etea_reviews_next_v1";
// Stage 1 P0.3 — owner annotations on notes (key: "<subject>||<title>").
const ANNOTATIONS_KEY = "etea_annotations_next_v1";
const ANNOTATIONS_OPTIN_KEY = "etea_annotations_tutor_optin_v1";
// Stage 1 P1 Tier 2 — quarantine store for unreadable saved data. When a
// stored value fails JSON.parse, the raw text is preserved here VERBATIM
// (never edited, never deleted) so it can be downloaded and inspected.
const QUARANTINE_KEY = "etea_quarantine_next_v1";

/** Stage 1 P0.2 — review-status vocabulary (Phase 2, D2). "draft" is the
 *  bank default (unreviewed). Only "owner-reviewed" and "approved" count
 *  as trusted (see isTrusted in src/lib/data.ts). The owner is the only
 *  reviewer: religious content is verified by the owner, never by the AI. */
export type ReviewStatus =
  | "draft"
  | "needs-review"
  | "disputed"
  | "owner-reviewed"
  | "approved";

export const REVIEW_STATUSES: ReviewStatus[] = [
  "draft",
  "needs-review",
  "disputed",
  "owner-reviewed",
  "approved",
];

export function isReviewStatus(v: unknown): v is ReviewStatus {
  return (
    v === "draft" ||
    v === "needs-review" ||
    v === "disputed" ||
    v === "owner-reviewed" ||
    v === "approved"
  );
}

export type ReviewRecord = {
  reviewStatus: ReviewStatus;
  reviewedBy: string; // "owner" — the owner is the only reviewer
  reviewedAt: string; // ISO timestamp
};

function asReviewRecord(raw: unknown): ReviewRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isReviewStatus(r.reviewStatus)) return null;
  if (typeof r.reviewedBy !== "string" || !r.reviewedBy) return null;
  if (typeof r.reviewedAt !== "string" || !r.reviewedAt) return null;
  return { reviewStatus: r.reviewStatus, reviewedBy: r.reviewedBy, reviewedAt: r.reviewedAt };
}

/** Load all owner review decisions (question id -> record). */
export function loadReviews(): Record<string, ReviewRecord> {
  if (typeof window === "undefined") return {};
  const raw = safeParse<Record<string, unknown>>(REVIEWS_KEY, {});
  const out: Record<string, ReviewRecord> = {};
  for (const [qid, rec] of Object.entries(raw)) {
    const clean = asReviewRecord(rec);
    if (clean) out[qid] = clean;
  }
  return out;
}

export function saveReviews(reviews: Record<string, ReviewRecord>) {
  if (typeof window === "undefined") return;
  safeWrite(REVIEWS_KEY, JSON.stringify(reviews));
}

/** Record one owner review decision. Returns the updated map. */
export function setReview(
  qid: string,
  reviewStatus: ReviewStatus,
  reviewedBy = "owner",
): Record<string, ReviewRecord> {
  const all = loadReviews();
  all[qid] = { reviewStatus, reviewedBy, reviewedAt: new Date().toISOString() };
  saveReviews(all);
  return all;
}

export function getReview(qid: string): ReviewRecord | null {
  return loadReviews()[qid] ?? null;
}

// ---- owner annotations on notes (Stage 1 P0.3) ----
// Private text the owner writes on a note. Stored locally only. It is
// NEVER sent to the AI tutor unless the owner explicitly enables the
// opt-in below (default OFF).

export function loadAnnotations(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const raw = safeParse<Record<string, unknown>>(ANNOTATIONS_KEY, {});
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") out[k] = v;
  return out;
}

export function saveAnnotation(noteKey: string, text: string) {
  if (typeof window === "undefined") return;
  const all = loadAnnotations();
  if (text.trim()) all[noteKey] = text;
  else delete all[noteKey];
  safeWrite(ANNOTATIONS_KEY, JSON.stringify(all));
}

/** Opt-in: include my annotations in tutor requests. Default false (off). */
export function loadAnnotationOptIn(): boolean {
  if (typeof window === "undefined") return false;
  return safeRead(ANNOTATIONS_OPTIN_KEY) === "1";
}

export function setAnnotationOptIn(on: boolean) {
  if (typeof window === "undefined") return;
  safeWrite(ANNOTATIONS_OPTIN_KEY, on ? "1" : "0");
}

// ---------------------------------------------------------------------------
// Stage 1 P1 Tier 2 — storage corruption safety.
// Two guarantees:
// 1. Malformed stored JSON NEVER deletes the user's data. The raw text is
//    QUARANTINED (verbatim, with the original key + timestamp) under
//    QUARANTINE_KEY, the loader returns its safe default, and a warning
//    is recorded for the Analysis page. The quarantined text is
//    downloadable (exportQuarantine) so nothing is ever lost silently.
//    The original key's value is left untouched — the next load sees the
//    same corrupt text, so quarantine records are deduplicated by
//    (key, raw) and never pile up.
// 2. Storage exceptions (QuotaExceededError, SecurityError, any other
//    DOMException) on reads/writes are CAUGHT, recorded as warnings,
//    and never crash the page or silently drop a write. safeWrite
//    returns false on failure so callers can react; the warning list
//    (getStorageWarnings) is the user-visible surface on Analysis.
// ---------------------------------------------------------------------------

export type QuarantineRecord = {
  key: string; // the original storage key whose value failed to parse
  raw: string; // the raw stored text, preserved VERBATIM — never edited
  at: string; // ISO timestamp of the quarantine
};

export type StorageWarning = {
  type: "quarantine" | "write-failed" | "read-failed";
  key: string;
  at: string; // ISO timestamp
  detail: string; // error name only — never the stored content
};

// In-memory warnings for this page load (the quarantine store itself is
// persistent; these are the transient conditions worth showing).
const storageWarnings: StorageWarning[] = [];

function recordWarning(w: StorageWarning) {
  // Deduplicate by (type, key, detail) per page load: loaders run many
  // times and the same corrupt key would otherwise flood the warning
  // list — but a DIFFERENT failure on the same key (e.g.
  // QuotaExceededError, then SecurityError) still surfaces, because the
  // detail is part of the dedup key.
  if (storageWarnings.some((x) => x.type === w.type && x.key === w.key && x.detail === w.detail)) return;
  storageWarnings.push(w);
  if (typeof console !== "undefined") {
    console.warn(`[storage] ${w.type} on ${w.key}: ${w.detail}`);
  }
}

/** Warnings recorded this page load (quarantines + failed reads/writes). */
export function getStorageWarnings(): StorageWarning[] {
  return [...storageWarnings];
}

export function clearStorageWarnings() {
  storageWarnings.length = 0;
}

function errorName(e: unknown): string {
  return e instanceof Error ? e.name || e.message : String(e);
}

/** localStorage read that never throws: a SecurityError (blocked
 *  storage) returns null and records a warning instead of crashing. */
export function safeRead(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    recordWarning({ type: "read-failed", key, at: new Date().toISOString(), detail: errorName(e) });
    return null;
  }
}

/** localStorage write that never throws: QuotaExceededError /
 *  SecurityError (or any DOMException) is caught, recorded as a
 *  warning, and reported via the false return — never a crash, never
 *  a silently dropped write. */
export function safeWrite(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    recordWarning({ type: "write-failed", key, at: new Date().toISOString(), detail: errorName(e) });
    return false;
  }
}

/** localStorage remove that never throws (same guarantee as safeWrite). */
export function safeRemove(key: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch (e) {
    recordWarning({ type: "write-failed", key, at: new Date().toISOString(), detail: errorName(e) });
  }
}

function isQuarantineRecord(v: unknown): v is QuarantineRecord {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return typeof r.key === "string" && typeof r.raw === "string" && typeof r.at === "string";
}

/** Read the quarantine store WITHOUT safeParse: quarantining a corrupt
 *  quarantine store would recurse. If the store itself is corrupt JSON,
 *  its raw text is preserved as a record of its own — nothing is lost. */
function loadQuarantineRaw(): QuarantineRecord[] {
  const raw = safeRead(QUARANTINE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isQuarantineRecord);
  } catch {
    return [{ key: QUARANTINE_KEY, raw, at: new Date().toISOString() }];
  }
}

function quarantine(key: string, raw: string) {
  const list = loadQuarantineRaw();
  // Deduplicate: the same corrupt value is quarantined ONCE. Loaders run
  // on every page load and the original key is left untouched, so
  // without this the quarantine would grow on every load.
  if (!list.some((r) => r.key === key && r.raw === raw)) {
    list.push({ key, raw, at: new Date().toISOString() });
    // Direct write (not safeWrite): a failed quarantine write must not
    // overwrite the warning below with a second, misleading one — the
    // quarantine warning fires either way.
    try {
      localStorage.setItem(QUARANTINE_KEY, JSON.stringify(list));
    } catch {
      // The warning below still fires; the raw text is still in its
      // original key (never deleted), so it can be recovered by hand.
    }
  }
  recordWarning({
    type: "quarantine",
    key,
    at: new Date().toISOString(),
    detail: "stored value failed to parse — raw text quarantined, nothing deleted",
  });
}

/** All quarantined raw values (newest last). Empty when nothing ever
 *  failed to parse. */
export function loadQuarantine(): QuarantineRecord[] {
  if (typeof window === "undefined") return [];
  return loadQuarantineRaw();
}

/** Downloadable JSON of the quarantined raw values, so corrupt stored
 *  data can be inspected or recovered by hand. Deliberately separate
 *  from exportProgress: the v5 backup shape is unchanged. */
export function exportQuarantine(): string {
  return JSON.stringify(
    {
      app: "etea-prep-next",
      kind: "quarantine",
      exportedAt: new Date().toISOString(),
      records: loadQuarantine(),
    },
    null,
    2,
  );
}

/** Clear the quarantine store. Only ever called from an explicit user
 *  action on the Analysis page ("dismiss and clear") — never silently. */
export function clearQuarantine() {
  safeRemove(QUARANTINE_KEY);
}

/** Parse a stored value. On malformed JSON the raw text is QUARANTINED
 *  (verbatim, deduplicated) and the fallback is returned — the original
 *  key is NEVER cleared, so the data survives for manual recovery. */
function safeParse<T>(key: string, fallback: T): T {
  const raw = safeRead(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    quarantine(key, raw);
    return fallback;
  }
}

export function loadAttempts(): Attempt[] {
  if (typeof window === "undefined") return [];
  return safeParse<Attempt[]>(ATTEMPTS_KEY, []);
}

export function recordAttempt(a: Omit<Attempt, "id" | "date"> & { date?: string }): Attempt {
  const rec: Attempt = {
    ...a,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: a.date ?? new Date().toISOString(),
  };
  const all = loadAttempts();
  all.push(rec);
  safeWrite(ATTEMPTS_KEY, JSON.stringify(all));
  safeWrite(DAY_KEY, new Date().toISOString().slice(0, 10));
  return rec;
}

export function clearAttempts() {
  safeRemove(ATTEMPTS_KEY);
}

// ---- study plan checkboxes ----
export function loadPlanState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, boolean>>(PLAN_KEY, {});
}
export function savePlanState(s: Record<string, boolean>) {
  safeWrite(PLAN_KEY, JSON.stringify(s));
}

// ---- flashcards: stable IDs + frozen session queue (pure logic) ----

/** Stable flashcard id: 'fc-' + a small FNV-1a hash of front + '|' + back.
 *  Never use the array index as the id (order/content edits would silently
 *  reassign stored scheduling state to a different card). */
export function flashcardId(front: string, back: string): string {
  let h = 2166136261;
  const s = `${front}|${back}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fc-${(h >>> 0).toString(36)}`;
}

/** One-time migration of pre-Phase-2 flash state, whose keys were
 *  `card-<array index>`, onto stable ids. `cards` is the current card list
 *  in its stored order, so `card-N` maps to cards[N]. On a collision the
 *  entry with the later due date wins (the more recently scheduled one).
 *  Returns the migrated state and whether anything moved. */
export function migrateFlashState(
  state: FlashState,
  cards: { front: string; back: string }[],
): { state: FlashState; migrated: boolean } {
  let migrated = false;
  const out: FlashState = {};
  for (const [key, entry] of Object.entries(state)) {
    let id = key;
    const m = /^card-(\d+)$/.exec(key);
    if (m) {
      const card = cards[Number(m[1])];
      if (!card) continue; // index no longer exists; drop the stale entry
      id = flashcardId(card.front, card.back);
      migrated = true;
    }
    const prev = out[id];
    if (!prev || entry.due > prev.due) out[id] = entry;
  }
  return { state: out, migrated };
}

export type FlashGrade = "again" | "hard" | "good" | "easy";

/** Build the frozen due queue for one flashcard session. Computed ONCE at
 *  session start from the stored state; grading never re-sorts or rebuilds
 *  it (see gradeCard). Due-only by default: cards whose stored due date is
 *  today or earlier, plus never-seen cards. Future-due cards are excluded
 *  unless opts.cram is true (explicit user choice only). Order is the card
 *  list order — due cards first, in list order. */
export function buildSessionQueue(
  cards: { id: string; category: string }[],
  state: FlashState,
  today: string, // YYYY-MM-DD
  opts?: { category?: string; cram?: boolean },
): string[] {
  const list = cards.filter(
    (c) => !opts?.category || opts.category === "All" || c.category === opts.category,
  );
  const due = list.filter((c) => !state[c.id] || state[c.id].due <= today).map((c) => c.id);
  if (opts?.cram) {
    const future = list.filter((c) => state[c.id] && state[c.id].due > today).map((c) => c.id);
    return [...due, ...future];
  }
  return due;
}

export type GradeResult = {
  queue: string[]; // the (possibly extended) frozen queue — never re-sorted
  nextIndex: number; // index of the next card to show: always index + 1
  requeued: boolean; // true only for "again"
};

/** Grade one card in a frozen session queue. Pure: grading never re-sorts
 *  the live queue and never double-advances (nextIndex is always index+1).
 *  "again" = same-session relearning: the card is appended to the END of
 *  the current session queue, so it is shown once more after every other
 *  due card — it is not merely given a +1-day due date. Any other grade
 *  leaves the queue untouched. */
export function gradeCard(queue: string[], index: number, grade: FlashGrade): GradeResult {
  if (index < 0 || index >= queue.length) {
    return { queue: [...queue], nextIndex: index, requeued: false };
  }
  if (grade === "again") {
    return { queue: [...queue, queue[index]], nextIndex: index + 1, requeued: true };
  }
  return { queue: [...queue], nextIndex: index + 1, requeued: false };
}

/** Honest label for a grade button, showing the resulting interval.
 *  "again" has no day interval: the card comes back later this session and
 *  stays due today (see nextDue).
 *  Localization Pass 1 — optional `lang`: "ur" renders the Urdu label;
 *  "roman"/omitted keeps the English label (the i18n fallback rule). */
export function gradeButtonLabel(
  grade: FlashGrade,
  interval: number,
  lang: "en" | "roman" | "ur" = "en",
): string {
  const ur = lang === "ur";
  switch (grade) {
    case "again":
      return ur ? "دوبارہ — اسی سیشن میں دوبارہ جائزہ" : "Again — review again this session";
    case "hard":
      return ur ? "مشکل — 2 دن" : "Hard — 2 days";
    case "good": {
      const d = interval < 3 ? 3 : interval < 7 ? 7 : 14;
      return ur ? `اچھا — ${d} دن` : `Good — ${d} days`;
    }
    case "easy": {
      const d = interval < 7 ? 7 : interval < 14 ? 14 : 30;
      return ur ? `آسان — ${d} دن` : `Easy — ${d} days`;
    }
  }
}

// ---- flashcards: stored scheduling state ----
export function loadFlashState(): FlashState {
  if (typeof window === "undefined") return {};
  return safeParse<FlashState>(FLASH_KEY, {});
}
export function saveFlashState(s: FlashState) {
  safeWrite(FLASH_KEY, JSON.stringify(s));
}

/** Simple spaced-review schedule (plain JS, fixed ladder — NOT SM-2):
 *  Again = due today (0 days) + same-session relearning; Hard = 2d;
 *  Good = 3d → 7d → 14d; Easy = 7d → 14d → 30d.
 *  `now` is injectable for tests; defaults to the current date. */
export function nextDue(
  grade: FlashGrade,
  interval: number,
  now?: Date,
): { due: string; interval: number } {
  const days =
    grade === "again"
      ? 0
      : grade === "hard"
        ? 2
        : grade === "good"
          ? interval < 3
            ? 3
            : interval < 7
              ? 7
              : 14
          : interval < 7
            ? 7
            : interval < 14
              ? 14
              : 30;
  const d = now ? new Date(now) : new Date();
  d.setDate(d.getDate() + days);
  return { due: d.toISOString().slice(0, 10), interval: days };
}

// ---- "Report an issue" — honest private inbox (never sent anywhere) ----

export type IssueReason = "wrong-answer" | "wrong-explanation" | "typo" | "outdated" | "other";

export const ISSUE_REASONS: { value: IssueReason; label: string }[] = [
  { value: "wrong-answer", label: "Wrong answer" },
  { value: "wrong-explanation", label: "Wrong explanation" },
  { value: "typo", label: "Typo" },
  { value: "outdated", label: "Outdated" },
  { value: "other", label: "Other" },
];

export type IssueReport = {
  id: string;
  qid: string;
  date: string; // ISO timestamp
  subject: string | null;
  reason: IssueReason | null;
  proposedCorrection: string | null;
  source: string | null;
};

function isIssueReason(v: unknown): v is IssueReason {
  return (
    v === "wrong-answer" || v === "wrong-explanation" || v === "typo" || v === "outdated" || v === "other"
  );
}

function asIssueReport(raw: unknown): IssueReport | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.qid !== "string" || !r.qid) return null;
  if (typeof r.date !== "string" || !r.date) return null;
  return {
    id: typeof r.id === "string" && r.id ? r.id : `issue-${r.date}-${r.qid}`,
    qid: r.qid,
    date: r.date,
    subject: typeof r.subject === "string" ? r.subject : null,
    reason: isIssueReason(r.reason) ? r.reason : null,
    proposedCorrection: typeof r.proposedCorrection === "string" ? r.proposedCorrection : null,
    source: typeof r.source === "string" ? r.source : null,
  };
}

/** Load all issue reports. On first load, legacy `etea_issues_next` entries
 *  ({qid, date} only) are imported into the new `etea_issues_v2` key with
 *  the missing fields set to null; the legacy key is left untouched. */
export function loadIssues(): IssueReport[] {
  if (typeof window === "undefined") return [];
  const raw = safeRead(ISSUES_KEY);
  if (raw !== null) return safeParse<unknown[]>(ISSUES_KEY, []).map(asIssueReport).filter((x): x is IssueReport => x !== null);
  // First load: migrate the legacy key.
  const legacy = safeParse<unknown[]>(ISSUES_LEGACY_KEY, []);
  const migrated = legacy.map(asIssueReport).filter((x): x is IssueReport => x !== null);
  safeWrite(ISSUES_KEY, JSON.stringify(migrated));
  return migrated;
}

export function reportIssueDetailed(input: {
  qid: string;
  subject?: string;
  reason?: IssueReason | null;
  proposedCorrection?: string;
  source?: string;
}): IssueReport {
  const rec: IssueReport = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    qid: input.qid,
    date: new Date().toISOString(),
    subject: input.subject ?? null,
    reason: input.reason ?? null,
    proposedCorrection: input.proposedCorrection?.trim() ? input.proposedCorrection.trim() : null,
    source: input.source?.trim() ? input.source.trim() : null,
  };
  const all = loadIssues();
  all.push(rec);
  safeWrite(ISSUES_KEY, JSON.stringify(all));
  return rec;
}

export function deleteIssue(id: string) {
  safeWrite(ISSUES_KEY, JSON.stringify(loadIssues().filter((i) => i.id !== id)));
}

export function clearIssues() {
  safeRemove(ISSUES_KEY);
}

// ---- in-progress quiz / mock sessions (versioned, resumable) ----

export type QuizSession = {
  version: 2;
  scope: string; // e.g. "mock:zam1:trusted" or "practice:islamiyat:0"
  mode: "practice" | "mock";
  title: string;
  questionIds: string[]; // question order for this run (frozen at start)
  questionSeed: string; // seed the parent used to pick/order the questions
  optionSeed: number; // QuizRunner startTs: seeds per-question option order
  answers: Record<string, number>; // qid -> displayed option index (final)
  firstPass: Record<string, number>; // qid -> first-chosen displayed option index (immutable)
  retries: { qid: string; answer: number; at: string }[]; // corrected re-picks; never overwrite firstPass
  answeredAt: Record<string, string>; // qid -> ISO timestamp of first response
  responseMs: Record<string, number>; // qid -> ms from question shown to first response
  idx: number;
  startedAt: number; // ms epoch
  deadlineTs: number | null; // absolute end (mock only); countdown = deadlineTs - now
  minutes: number;
  submitted: boolean; // persisted: finish() is a no-op once this is true
  trustedOnly: boolean;
};

export function loadSessions(): Record<string, QuizSession> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, QuizSession>>(SESSION_KEY, {});
}

/** A session is live when it exists, is not submitted, and its absolute
 *  deadline (if any) has not passed. Expired/submitted sessions are not
 *  resumed; callers should clear them and start fresh. */
export function loadSession(scope: string): QuizSession | null {
  const s = loadSessions()[scope];
  if (!s || s.version !== 2 || typeof s.scope !== "string") return null;
  if (s.submitted) return null;
  if (s.deadlineTs !== null && s.deadlineTs !== undefined && s.deadlineTs <= Date.now()) return null;
  return s;
}

/** Raw read (including submitted/expired sessions) for idempotency checks. */
export function loadSessionRaw(scope: string): QuizSession | null {
  const s = loadSessions()[scope];
  if (!s || s.version !== 2) return null;
  return s;
}

export function saveSession(s: QuizSession) {
  if (typeof window === "undefined") return;
  const all = loadSessions();
  all[s.scope] = s;
  safeWrite(SESSION_KEY, JSON.stringify(all));
}

export function clearSession(scope: string) {
  if (typeof window === "undefined") return;
  const all = loadSessions();
  delete all[scope];
  safeWrite(SESSION_KEY, JSON.stringify(all));
}

export function clearAllSessions() {
  if (typeof window === "undefined") return;
  safeRemove(SESSION_KEY);
}

// ---- live stats, computed only from real attempts ----
// MCQ accuracy counts quiz + mock attempts ONLY. Flashcard attempts are
// self-ratings (kind "flash") and are reported separately below; mixing
// them into MCQ accuracy overstated it. Streak counts any study day
// (MCQ or flashcards).
export type Stats = {
  totalAttempts: number; // all kinds, including flashcards
  totalQuestions: number; // MCQ only (quiz + mock)
  totalCorrect: number; // MCQ only, first-pass scores
  accuracy: number; // MCQ only, 0..100 (0 when no MCQ attempts)
  totalMinutes: number;
  streakDays: number;
  perSubject: Record<string, { correct: number; total: number; attempts: number; accuracy: number }>;
  perTrack: Record<string, { correct: number; total: number; attempts: number; accuracy: number }>;
  mockHistory: Attempt[];
  daily: { date: string; correct: number; total: number; attempts: number }[];
  weakest: { subject: string; accuracy: number; total: number }[];
  strongest: { subject: string; accuracy: number; total: number }[];
  hasData: boolean;
  flashAttempts: number;
  flashReviewed: number;
  flashRecalled: number;
};

export function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export function computeStats(attempts: Attempt[]): Stats {
  const mcq = attempts.filter((a) => a.kind === "quiz" || a.kind === "mock");
  const flash = attempts.filter((a) => a.kind === "flash");
  const hasData = attempts.length > 0;
  const totalQuestions = mcq.reduce((s, a) => s + a.total, 0);
  const totalCorrect = mcq.reduce((s, a) => s + a.correct, 0);
  const totalMinutes = Math.round(attempts.reduce((s, a) => s + a.seconds, 0) / 60);
  const perSubject: Stats["perSubject"] = {};
  const perTrack: Stats["perTrack"] = {};
  const dailyMap: Record<string, { correct: number; total: number; attempts: number }> = {};
  for (const a of mcq) {
    const dk = dayKey(a.date);
    const d = dailyMap[dk] ?? { correct: 0, total: 0, attempts: 0 };
    d.correct += a.correct;
    d.total += a.total;
    d.attempts += 1;
    dailyMap[dk] = d;
    const subs = a.perSubject ?? (a.subject ? { [a.subject]: [a.correct, a.total] as [number, number] } : {});
    for (const [subj, [c, t]] of Object.entries(subs)) {
      const e = perSubject[subj] ?? { correct: 0, total: 0, attempts: 0, accuracy: 0 };
      e.correct += c;
      e.total += t;
      e.attempts += 1;
      perSubject[subj] = e;
    }
    if (a.trackId) {
      const e = perTrack[a.trackId] ?? { correct: 0, total: 0, attempts: 0, accuracy: 0 };
      e.correct += a.correct;
      e.total += a.total;
      e.attempts += 1;
      perTrack[a.trackId] = e;
    }
  }
  for (const e of Object.values(perSubject)) e.accuracy = e.total ? (e.correct / e.total) * 100 : 0;
  for (const e of Object.values(perTrack)) e.accuracy = e.total ? (e.correct / e.total) * 100 : 0;
  const daily = Object.entries(dailyMap)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
  // streak: consecutive days ending today (or yesterday if no attempt today yet).
  // Any study counts — MCQ or flashcard sessions.
  const daySet = new Set(attempts.map((a) => dayKey(a.date)));
  let streakDays = 0;
  const cursor = new Date();
  if (!daySet.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const subjList = Object.entries(perSubject)
    .map(([subject, v]) => ({ subject, accuracy: v.accuracy, total: v.total }))
    .filter((x) => x.total >= 5)
    .sort((a, b) => a.accuracy - b.accuracy);
  return {
    totalAttempts: attempts.length,
    totalQuestions,
    totalCorrect,
    accuracy: totalQuestions ? (totalCorrect / totalQuestions) * 100 : 0,
    totalMinutes,
    streakDays,
    perSubject,
    perTrack,
    mockHistory: attempts.filter((a) => a.kind === "mock").sort((a, b) => b.date.localeCompare(a.date)),
    daily,
    weakest: subjList.slice(0, 5),
    strongest: [...subjList].reverse().slice(0, 5),
    hasData,
    flashAttempts: flash.length,
    flashReviewed: flash.reduce((s, a) => s + a.total, 0),
    flashRecalled: flash.reduce((s, a) => s + a.correct, 0),
  };
}

// ---- export / import (full backup) ----
// Exported file contents: attempts, plan, flashcards, issues, preferences
// (language/theme), in-progress sessions, last study day. No API keys:
// there are no client-side keys in this app (tutor keys live server-side
// in Vercel env vars); nothing credential-like is read or written here.
export type Preferences = { language: string | null; theme: string | null };

export function loadPreferences(): Preferences {
  if (typeof window === "undefined") return { language: null, theme: null };
  return {
    language: safeRead(LANG_KEY),
    theme: safeRead(THEME_KEY),
  };
}

export function exportProgress(): string {
  const payload = {
    app: "etea-prep-next",
    // Stage 1 P0.2 — version 5 adds `reviews` (owner review decisions)
    // and `annotations` (owner note annotations + tutor opt-in). Version 4
    // files (no reviews/annotations) still restore: importProgress treats
    // the missing fields as empty.
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    attempts: loadAttempts(),
    plan: loadPlanState(),
    flashcards: loadFlashState(),
    issues: loadIssues(),
    preferences: loadPreferences(),
    sessions: loadSessions(),
    reviews: loadReviews(),
    annotations: { notes: loadAnnotations(), includeInTutor: loadAnnotationOptIn() },
    lastDay: typeof window === "undefined" ? null : safeRead(DAY_KEY),
  };
  return JSON.stringify(payload, null, 2);
}

function isValidAttempt(a: unknown): a is Attempt {
  if (!a || typeof a !== "object") return false;
  const r = a as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    !!r.id &&
    (r.kind === "quiz" || r.kind === "mock" || r.kind === "flash") &&
    typeof r.title === "string" &&
    typeof r.total === "number" &&
    r.total >= 0 &&
    typeof r.correct === "number" &&
    r.correct >= 0 &&
    typeof r.seconds === "number" &&
    r.seconds >= 0 &&
    typeof r.date === "string"
  );
}

function isValidSession(s: unknown): s is QuizSession {
  if (!s || typeof s !== "object") return false;
  const r = s as Record<string, unknown>;
  return (
    r.version === 2 &&
    typeof r.scope === "string" &&
    !!r.scope &&
    Array.isArray(r.questionIds) &&
    typeof r.startedAt === "number" &&
    typeof r.answers === "object" &&
    r.answers !== null &&
    typeof r.firstPass === "object" &&
    r.firstPass !== null
  );
}

export type ImportResult = {
  ok: boolean;
  error?: string;
  imported?: number; // new attempts merged in
  counts?: {
    attempts: number;
    attemptsSkipped: number;
    planKeys: number;
    flashcardKeys: number;
    issues: number;
    issuesSkipped: number;
    sessions: number;
    sessionsSkipped: number;
    preferencesApplied: boolean;
    reviews: number;
    reviewsSkipped: number;
    annotations: number;
  };
};

// ---- backup versioning (Stage 1 P2) ----
// Version policy: exports are stamped with BACKUP_VERSION. Imports accept
// SUPPORTED_BACKUP_VERSIONS and migrate them to the current shape with
// migrateBackupPayload() BEFORE any merge runs; anything newer is
// rejected (it may contain fields this build cannot interpret), and
// anything failing the shape check is rejected without touching stored
// data. Versions older than 4 (pre-v4 exports) take the same lenient
// path they always did — missing fields default to empty — via the
// v4 migration; the merge code below guards every optional field.
/** Current backup format version. Bump only with a matching migration. */
export const BACKUP_VERSION = 5;
/** Backup versions this build restores (each has an explicit migration). */
export const SUPPORTED_BACKUP_VERSIONS = [4, 5] as const;

/** Migrate a parsed backup payload to the current (v5) shape. Pure: it
 *  never mutates its input. v5 payloads pass through unchanged; older
 *  payloads gain the v5-only fields (`reviews`, `annotations`) as empty
 *  defaults so the merge below sees one shape. Callers must validate the
 *  payload (app marker, numeric version, attempts list) and reject
 *  versions newer than BACKUP_VERSION before calling this. */
export function migrateBackupPayload(
  p: Record<string, unknown>,
): Record<string, unknown> {
  if (typeof p.version === "number" && p.version >= BACKUP_VERSION) return p;
  return {
    ...p,
    version: BACKUP_VERSION,
    reviews: p.reviews ?? {},
    annotations: p.annotations ?? { notes: {}, includeInTutor: false },
  };
}

/** Shape-check a parsed backup payload. Returns an error message, or
 *  null when the payload may proceed to migration + merge. Rejection
 *  happens BEFORE any stored data is read for writing, so a rejected
 *  file can never partially restore. */
export function validateBackupPayload(p: unknown): string | null {
  if (!p || typeof p !== "object") return "Not a valid ETEA Prep export file (needs the app marker, a version number and an attempts list).";
  const r = p as Record<string, unknown>;
  if (r.app !== "etea-prep-next" || typeof r.version !== "number" || !Array.isArray(r.attempts)) {
    return "Not a valid ETEA Prep export file (needs the app marker, a version number and an attempts list).";
  }
  if (r.version > BACKUP_VERSION) {
    return `This backup is version ${r.version}, newer than this build (v${BACKUP_VERSION}). Please update the app before restoring it.`;
  }
  return null;
}

/** Import a backup file. Merge behaviour (unchanged from v3, now documented):
 *  attempts are merged, deduplicated by id; plan/flashcards are shallow-
 *  merged (imported keys overwrite); issues are merged, deduplicated by id;
 *  sessions are imported only for scopes with no live session already
 *  stored (a live in-progress session is never overwritten by an import);
 *  preferences overwrite the stored language/theme when valid.
 *  Stage 1 P0.2 (v5): `reviews` are merged with imported records winning
 *  per question id (a restore restores the owner's decisions); `annotations`
 *  are merged the same way, and the tutor opt-in flag is restored when
 *  present. Version 4 files (no reviews/annotations) restore exactly as
 *  before. Version 6+ files are rejected (newer than this build).
 *  Stage 1 P1 Tier 2 (v5, unchanged): the current export version stays
 *  5; v4 files restore exactly as before (missing reviews/annotations
 *  treated as empty) and v6+ files are still rejected as newer than
 *  this build. All import writes go through safeWrite, so a quota or
 *  security failure during an import is caught and warned, never a
 *  crash. The quarantine store is deliberately NOT part of the backup
 *  payload — exportQuarantine() downloads it separately.
 *  Validation: valid JSON, app marker "etea-prep-next", numeric version,
 *  per-record shape checks (invalid records are skipped and counted).
 *  Unknown future fields are ignored. */
export function importProgress(json: string): ImportResult {
  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    // Stage 1 P2 — validate, then migrate to the v5 shape, then merge.
    // The merge below is unchanged: it sees exactly one shape.
    const invalid = validateBackupPayload(raw);
    if (invalid) return { ok: false, error: invalid };
    const p = migrateBackupPayload(raw);
    const counts: NonNullable<ImportResult["counts"]> = {
      attempts: 0,
      attemptsSkipped: 0,
      planKeys: 0,
      flashcardKeys: 0,
      issues: 0,
      issuesSkipped: 0,
      sessions: 0,
      sessionsSkipped: 0,
      preferencesApplied: false,
      reviews: 0,
      reviewsSkipped: 0,
      annotations: 0,
    };
    const existing = loadAttempts();
    const seen = new Set(existing.map((a) => a.id));
    const fresh: Attempt[] = [];
    for (const a of p.attempts as unknown[]) {
      if (isValidAttempt(a)) {
        if (!seen.has(a.id)) {
          fresh.push(a);
          seen.add(a.id);
        }
      } else {
        counts.attemptsSkipped += 1;
      }
    }
    safeWrite(ATTEMPTS_KEY, JSON.stringify([...existing, ...fresh]));
    counts.attempts = fresh.length;
    if (p.plan && typeof p.plan === "object") {
      const plan = p.plan as Record<string, unknown>;
      const clean: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(plan)) if (typeof v === "boolean") clean[k] = v;
      counts.planKeys = Object.keys(clean).length;
      savePlanState({ ...loadPlanState(), ...clean });
    }
    if (p.flashcards && typeof p.flashcards === "object") {
      const fc = p.flashcards as Record<string, unknown>;
      const clean: FlashState = {};
      for (const [k, v] of Object.entries(fc)) {
        if (v && typeof v === "object") {
          const e = v as Record<string, unknown>;
          if (
            (e.grade === "again" || e.grade === "hard" || e.grade === "good" || e.grade === "easy") &&
            typeof e.due === "string" &&
            typeof e.interval === "number" &&
            typeof e.reps === "number"
          ) {
            clean[k] = { grade: e.grade, due: e.due, interval: e.interval, reps: e.reps };
          }
        }
      }
      counts.flashcardKeys = Object.keys(clean).length;
      saveFlashState({ ...loadFlashState(), ...clean });
    }
    if (Array.isArray(p.issues)) {
      const known = new Set(loadIssues().map((i) => i.id));
      const freshIssues: IssueReport[] = [];
      for (const raw of p.issues as unknown[]) {
        const issue = asIssueReport(raw);
        if (issue) {
          if (!known.has(issue.id)) {
            freshIssues.push(issue);
            known.add(issue.id);
          }
        } else {
          counts.issuesSkipped += 1;
        }
      }
      if (freshIssues.length) {
        safeWrite(ISSUES_KEY, JSON.stringify([...loadIssues(), ...freshIssues]));
      }
      counts.issues = freshIssues.length;
    }
    if (p.sessions && typeof p.sessions === "object") {
      const stored = loadSessions();
      let added = 0;
      for (const [scope, s] of Object.entries(p.sessions as Record<string, unknown>)) {
        if (!isValidSession(s)) {
          counts.sessionsSkipped += 1;
          continue;
        }
        const live = stored[scope];
        const liveNow =
          live && !live.submitted && (live.deadlineTs === null || live.deadlineTs === undefined || live.deadlineTs > Date.now());
        if (liveNow) {
          counts.sessionsSkipped += 1; // never overwrite a live session
          continue;
        }
        stored[scope] = s;
        added += 1;
      }
      safeWrite(SESSION_KEY, JSON.stringify(stored));
      counts.sessions = added;
    }
    if (p.preferences && typeof p.preferences === "object") {
      const pref = p.preferences as Record<string, unknown>;
      let applied = false;
      if (pref.language === "en" || pref.language === "roman" || pref.language === "ur") {
        safeWrite(LANG_KEY, pref.language);
        applied = true;
      }
      if (pref.theme === "light" || pref.theme === "dark") {
        safeWrite(THEME_KEY, pref.theme);
        applied = true;
      }
      counts.preferencesApplied = applied;
    }
    // Stage 1 P0.2 (v5) — owner review decisions. Imported records win
    // per question id; invalid records are skipped and counted. A v4 file
    // has no `reviews` field and restores exactly as before.
    if (p.reviews && typeof p.reviews === "object") {
      const merged = loadReviews();
      for (const [qid, raw] of Object.entries(p.reviews as Record<string, unknown>)) {
        const clean = asReviewRecord(raw);
        if (clean) {
          merged[qid] = clean;
          counts.reviews += 1;
        } else {
          counts.reviewsSkipped += 1;
        }
      }
      saveReviews(merged);
    }
    // Stage 1 P0.3 (v5) — owner note annotations + tutor opt-in.
    if (p.annotations && typeof p.annotations === "object") {
      const ann = p.annotations as Record<string, unknown>;
      if (ann.notes && typeof ann.notes === "object") {
        const merged = loadAnnotations();
        for (const [k, v] of Object.entries(ann.notes as Record<string, unknown>)) {
          if (typeof v === "string" && v.trim()) {
            merged[k] = v;
            counts.annotations += 1;
          }
        }
        safeWrite(ANNOTATIONS_KEY, JSON.stringify(merged));
      }
      if (typeof ann.includeInTutor === "boolean") {
        setAnnotationOptIn(ann.includeInTutor);
      }
    }
    return { ok: true, imported: fresh.length, counts };
  } catch {
    return { ok: false, error: "Could not read that file (invalid JSON)." };
  }
}

export function download(filename: string, text: string, mime = "application/json") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
