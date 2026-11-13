// Preparation tracking — localStorage-first (single user, single device).
// Every dashboard number is computed from real stored attempts only.
// Empty state = "no attempts yet". Never invented sample data.
// Export/import (JSON file) so progress is never trapped in one browser.
//
// Stage 2 notes:
// - Flashcard scheduling is FSRS-7 (ts-fsrs 6.0.0, adaptive intervals
//   from per-card stability/difficulty; see src/lib/fsrs.ts). It
//   replaced the pre-Stage-2 fixed interval ladder; stored state is the
//   ts-fsrs v6 card shape, migrated from the old shape with due dates
//   preserved (see runFlashMigration below).
// - Flashcard attempts (kind "flash") are self-ratings, NOT objective MCQ
//   results: computeStats excludes them from MCQ accuracy/totals and
//   reports them separately (flashAttempts / flashReviewed / flashRecalled).
// - No API keys exist client-side. The export contains only local progress
//   (attempts, plan, flashcards, issues, preferences, sessions) — never
//   credentials. Verified by grep: no key/token/secret values in src/.
"use client";

import {
  freshFsrsCard,
  isFsrsCardState,
  isLearningOrRelearning,
  isLegacyFlashEntry,
  seedFsrsCardFromLegacy,
  type SerializedFsrsCard,
} from "./fsrs.ts";

export type { FlashGrade, SerializedFsrsCard } from "./fsrs.ts";

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
  [cardId: string]: SerializedFsrsCard;
};

const ATTEMPTS_KEY = "etea_attempts_next";
const PLAN_KEY = "etea_plan_next";
const FLASH_KEY = "etea_flash_next";
// Stage 2 — verbatim backup of the pre-FSRS flash state. Written ONCE,
// before the first migration save, and never overwritten: the original
// fixed-ladder state survives even if the migration is re-run.
const FLASH_V5_BACKUP_KEY = "etea_flashcards_v5_backup";
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
// Step 2b — last backup export/import timestamps (ISO), shown in the
// Analysis data-management panel so the owner can see how stale the
// last backup is. Not part of the backup payload itself.
const LAST_EXPORT_KEY = "etea_last_export_next";
const LAST_IMPORT_KEY = "etea_last_import_next";
// Step 3b-audit2 (F12) — durable flagged questions. Written when the
// user flags a question in a quiz/mock run; survives submit, session
// clear and reload. Deliberately NOT part of the versioned backup
// export (v6): flags are lightweight pointers, re-flaggable, and
// adding them would need a backup version bump + migration. They are
// device-local durable state, listed on /review.
const FLAGS_KEY = "etea_flags_next_v1";

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

export function saveReviews(reviews: Record<string, ReviewRecord>): boolean {
  if (typeof window === "undefined") return false;
  return safeWrite(REVIEWS_KEY, JSON.stringify(reviews));
}

/** Record one owner review decision. Returns the updated map (same
 *  shape as before; callers keep working). Step 3b-audit2 (F07/F08):
 *  the write is a compare-and-swap update, and a failed write is
 *  recorded as a warning (surfaced by the shell banner) instead of
 *  failing silently — the returned map is the in-memory decision, so
 *  the UI stays responsive and the banner tells the user to retry. */
export function setReview(
  qid: string,
  reviewStatus: ReviewStatus,
  reviewedBy = "owner",
): Record<string, ReviewRecord> {
  const record: ReviewRecord = { reviewStatus, reviewedBy, reviewedAt: new Date().toISOString() };
  const current = loadReviews();
  const next = { ...current, [qid]: record };
  atomicUpdateJSON<Record<string, unknown>>(REVIEWS_KEY, {}, (raw) => ({ ...raw, [qid]: record }));
  return next;
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

export function saveAnnotation(noteKey: string, text: string): boolean {
  if (typeof window === "undefined") return false;
  const trimmed = text.trim();
  // Step 3b-audit2 (F08): compare-and-swap update — another tab's
  // annotation on a different note is never overwritten.
  return atomicUpdateJSON<Record<string, unknown>>(ANNOTATIONS_KEY, {}, (raw) => {
    const next = { ...raw };
    if (trimmed) next[noteKey] = text;
    else delete next[noteKey];
    return next;
  }).ok;
}

/** Opt-in: include my annotations in tutor requests. Default false (off). */
export function loadAnnotationOptIn(): boolean {
  if (typeof window === "undefined") return false;
  return safeRead(ANNOTATIONS_OPTIN_KEY) === "1";
}

export function setAnnotationOptIn(on: boolean): boolean {
  if (typeof window === "undefined") return false;
  return safeWrite(ANNOTATIONS_OPTIN_KEY, on ? "1" : "0");
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
  // Step 3b-audit2 (F08/F09) — "write-conflict": a compare-and-swap
  // update was abandoned after retries because another tab kept
  // changing the same key; no data was overwritten.
  type: "quarantine" | "write-failed" | "read-failed" | "write-conflict";
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
  // Step 3b-audit2 (F07) — wake the shell banner the moment a save
  // fails, so the user sees the error on the page they are on instead
  // of only on /analysis. Best-effort: never throws.
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    try {
      window.dispatchEvent(new CustomEvent("etea-storage-warning"));
    } catch {
      // Non-DOM test stubs: the warning list is still the record.
    }
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
 *  from exportProgress: the backup shape is unchanged. */
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

// ---------------------------------------------------------------------------
// Step 3b-audit2 (F08/F09) — multi-tab safety: compare-and-swap updates
// + cross-tab change detection.
//
// localStorage gives no transactions: two tabs doing read-modify-write
// on the same key can silently overwrite each other (last write wins,
// the other tab's change is lost). Two defences:
// 1. atomicUpdateJSON: re-reads the raw value immediately before
//    writing; if it changed since the first read, the update is
//    re-applied to the FRESH value (up to 3 attempts) instead of
//    overwriting the other tab's write. If every attempt collides, the
//    write is abandoned and a "write-conflict" warning is recorded —
//    nothing is overwritten, and the shell banner tells the user.
//    Updaters must be pure functions of the current value (they run
//    again on retry); ids/timestamps are generated OUTSIDE the updater
//    by callers so a retry never duplicates a record.
// 2. isManagedStorageKey + the AppShell `storage` listener: the
//    platform fires `storage` events only in OTHER tabs, so any event
//    for a managed key means another tab changed the user's data — the
//    shell shows a reload warning instead of letting this tab
//    silently overwrite it.
// ---------------------------------------------------------------------------

export type AtomicUpdateResult = { ok: boolean; conflict: boolean };

export function atomicUpdateJSON<T>(
  key: string,
  fallback: T,
  updater: (current: T) => T,
  maxAttempts = 3,
): AtomicUpdateResult {
  if (typeof window === "undefined") return { ok: false, conflict: false };
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const before = safeRead(key);
    let current: T;
    if (!before) {
      current = fallback;
    } else {
      try {
        current = JSON.parse(before) as T;
      } catch {
        // Same guarantee as safeParse: corrupt text is quarantined
        // verbatim and the fallback is used; the write below replaces
        // the corrupt value exactly as today's save paths do.
        quarantine(key, before);
        current = fallback;
      }
    }
    const next = updater(current);
    // Another tab wrote between our read and this write: retry from
    // the fresh value instead of overwriting its change.
    if (safeRead(key) !== before) continue;
    if (!safeWrite(key, JSON.stringify(next))) return { ok: false, conflict: false };
    return { ok: true, conflict: false };
  }
  recordWarning({
    type: "write-conflict",
    key,
    at: new Date().toISOString(),
    detail: "concurrent modification — write abandoned after retries, no data overwritten",
  });
  return { ok: false, conflict: true };
}

/** Storage keys that hold user study data. A `storage` event for one
 *  of these means ANOTHER tab changed the user's data (the platform
 *  never fires the event in the writing tab). Preference keys
 *  (language/theme/sidebar) are deliberately excluded: another tab
 *  changing the theme is not a data-overwrite risk. */
export const MANAGED_STORAGE_KEYS: readonly string[] = [
  ATTEMPTS_KEY,
  PLAN_KEY,
  FLASH_KEY,
  SESSION_KEY,
  REVIEWS_KEY,
  ISSUES_KEY,
  ANNOTATIONS_KEY,
  DAY_KEY,
  FLAGS_KEY,
];

/** True when a `storage` event key means another tab changed study
 *  data (null key = storage.clear(), which also counts). Pure. */
export function isManagedStorageKey(key: string | null): boolean {
  if (key === null) return true;
  return (MANAGED_STORAGE_KEYS as readonly string[]).includes(key);
}

export function loadAttempts(): Attempt[] {
  if (typeof window === "undefined") return [];
  return safeParse<Attempt[]>(ATTEMPTS_KEY, []);
}

/** Step 3b-audit2 (F07) — recordAttempt reports whether the attempt
 *  was actually stored. `saved: false` means localStorage refused the
 *  write (quota/full/blocked): the caller MUST show the user an error
 *  with retry/export instead of acting as if the result were saved.
 *  The record itself is built once, outside the compare-and-swap
 *  updater, so a multi-tab retry never duplicates it. */
export type RecordAttemptResult = { attempt: Attempt; saved: boolean };

export function recordAttempt(a: Omit<Attempt, "id" | "date"> & { date?: string }): RecordAttemptResult {
  const rec: Attempt = {
    ...a,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: a.date ?? new Date().toISOString(),
  };
  const res = atomicUpdateJSON<Attempt[]>(ATTEMPTS_KEY, [], (all) => [...all, rec]);
  safeWrite(DAY_KEY, localDayKey(new Date()));
  return { attempt: rec, saved: res.ok };
}

export function clearAttempts() {
  safeRemove(ATTEMPTS_KEY);
}

// ---- study plan checkboxes ----
export function loadPlanState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, boolean>>(PLAN_KEY, {});
}
export function savePlanState(s: Record<string, boolean>): boolean {
  // Step 3b-audit2 (F07): returns the safeWrite result so callers can
  // react; failures also surface via the shell storage banner.
  if (typeof window === "undefined") return false;
  return safeWrite(PLAN_KEY, JSON.stringify(s));
}

// ---- flashcards: stable IDs + FSRS scheduling (pure logic) ----

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

export type FlashMigrationCounts = {
  /** Old-shape entries converted with their due date preserved. */
  migrated: number;
  /** Stored entries with no usable state, replaced by a fresh FSRS card. */
  reset: number;
  /** Entries already in FSRS shape, passed through untouched. */
  kept: number;
};

function dueKeyOf(entry: unknown): string {
  if (!entry || typeof entry !== "object") return "";
  const e = entry as Record<string, unknown>;
  if (typeof e.due === "string") return e.due;
  if (typeof e.dueAt === "string") return e.dueAt;
  return "";
}

/** Pure conversion of a stored flash-state object to FSRS shape. Never
 *  touches storage; safe to run on every load (idempotent: FSRS-shaped
 *  entries pass through, so a second run reports changed=false).
 *  Steps: (1) legacy `card-<array index>` keys map onto stable ids
 *  (the pre-Phase-2 migration precedent — `card-N` maps to cards[N];
 *  on a collision the entry with the later due key wins); (2) each
 *  entry converts by shape — FSRS-shaped kept, legacy-shaped seeded
 *  with its due date preserved (see seedFsrsCardFromLegacy), anything
 *  else replaced by a fresh card and counted as reset. `now` is
 *  injectable for tests; fresh seeds are due at `now`. */
export function convertFlashStateToFsrs(
  raw: Record<string, unknown>,
  cards: { front: string; back: string }[],
  now: Date,
): { state: FlashState; counts: FlashMigrationCounts; changed: boolean } {
  const mapped: Record<string, unknown> = {};
  // Non-object input (null, a string, an array) carries no entries at
  // all — treat as empty state rather than crashing (a corrupt backup
  // file can reach here through convertBackupFlashcards).
  const entries: [string, unknown][] =
    raw !== null && typeof raw === "object" && !Array.isArray(raw) ? Object.entries(raw) : [];
  for (const [key, entry] of entries) {
    let id = key;
    const m = /^card-(\d+)$/.exec(key);
    if (m) {
      const card = cards[Number(m[1])];
      if (!card) continue; // index no longer exists; drop the stale entry
      id = flashcardId(card.front, card.back);
    }
    const prev = mapped[id];
    if (prev === undefined || dueKeyOf(entry) > dueKeyOf(prev)) mapped[id] = entry;
  }
  const state: FlashState = {};
  const counts: FlashMigrationCounts = { migrated: 0, reset: 0, kept: 0 };
  for (const [id, entry] of Object.entries(mapped)) {
    if (isFsrsCardState(entry)) {
      state[id] = entry;
      counts.kept += 1;
    } else if (isLegacyFlashEntry(entry)) {
      state[id] = seedFsrsCardFromLegacy(entry);
      counts.migrated += 1;
    } else {
      state[id] = freshFsrsCard(now);
      counts.reset += 1;
    }
  }
  return { state, counts, changed: counts.migrated > 0 || counts.reset > 0 };
}

export type FlashMigrationInfo = FlashMigrationCounts & {
  /** True when the verbatim v5 backup was written by this run. */
  backupWritten: boolean;
  /** True when the backup write failed: the converted state was NOT
   *  saved (the old text stays in place) and the next load retries. */
  backupFailed: boolean;
  at: string; // ISO timestamp of this migration run
};

/** Run the one-time FSRS migration against stored flash state.
 *  Safety (Tier 2 pattern): the pre-migration raw text is preserved
 *  VERBATIM under FLASH_V5_BACKUP_KEY before any state change, and the
 *  backup is written only when absent — never overwritten. If the
 *  backup write fails, the converted state is returned for in-memory
 *  use but NOT saved, so the next load retries the backup. When the
 *  stored state is already FSRS-shaped, nothing is written and info is
 *  null (idempotent). Corrupt stored JSON takes the normal quarantine
 *  path (via loadFlashState) and yields an empty state. */
export function runFlashMigration(
  cards: { front: string; back: string }[],
  now: Date = new Date(),
): { state: FlashState; info: FlashMigrationInfo | null } {
  if (typeof window === "undefined") return { state: {}, info: null };
  const rawText = safeRead(FLASH_KEY);
  if (!rawText) return { state: {}, info: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as unknown;
  } catch {
    loadFlashState(); // quarantine the corrupt text, keep the old path
    return { state: {}, info: null };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { state: {}, info: null };
  }
  const { state, counts, changed } = convertFlashStateToFsrs(
    parsed as Record<string, unknown>,
    cards,
    now,
  );
  if (!changed) return { state, info: null };
  let backupWritten = false;
  let backupFailed = false;
  if (safeRead(FLASH_V5_BACKUP_KEY) === null) {
    backupWritten = safeWrite(FLASH_V5_BACKUP_KEY, rawText);
    backupFailed = !backupWritten;
  }
  const info: FlashMigrationInfo = {
    ...counts,
    backupWritten,
    backupFailed,
    at: now.toISOString(),
  };
  if (backupFailed) return { state, info }; // old text stays; retry next load
  saveFlashState(state);
  return { state, info };
}

/** Build the FSRS review queue for one flashcard session. Due-based
 *  ordering, stated explicitly: (1) due cards first — stored cards
 *  whose dueAt is now or earlier, earliest due first (bank order breaks
 *  ties); (2) new cards — ids with no stored state, in bank order, with
 *  NO daily cap (70-card bank, single user). Future-due cards are
 *  excluded unless opts.cram is true (explicit user choice only), in
 *  which case they append at the end, earliest due first. The queue is
 *  computed at session start; grading appends learning/relearning cards
 *  via advanceReviewQueue but never re-sorts the live queue. */
export function buildReviewQueue(
  cards: { id: string; category: string }[],
  state: FlashState,
  now: Date,
  opts?: { category?: string; cram?: boolean },
): string[] {
  const list = cards.filter(
    (c) => !opts?.category || opts.category === "All" || c.category === opts.category,
  );
  const due: { id: string; dueAt: string }[] = [];
  const fresh: string[] = [];
  const future: { id: string; dueAt: string }[] = [];
  for (const c of list) {
    const entry = state[c.id];
    if (!entry) {
      fresh.push(c.id);
    } else if (new Date(entry.dueAt).getTime() <= now.getTime()) {
      due.push({ id: c.id, dueAt: entry.dueAt });
    } else {
      future.push({ id: c.id, dueAt: entry.dueAt });
    }
  }
  // Stable sort: earliest due first; bank order breaks ties.
  due.sort((a, b) => (a.dueAt < b.dueAt ? -1 : a.dueAt > b.dueAt ? 1 : 0));
  future.sort((a, b) => (a.dueAt < b.dueAt ? -1 : a.dueAt > b.dueAt ? 1 : 0));
  const queue = [...due.map((d) => d.id), ...fresh];
  if (opts?.cram) queue.push(...future.map((f) => f.id));
  return queue;
}

export type AdvanceResult = {
  queue: string[]; // the (possibly extended) queue — never re-sorted
  nextIndex: number; // index of the next card to show: always index + 1
  requeued: boolean; // true only when the card stays in this session
};

/** Advance the session queue after one FSRS review. Pure: grading never
 *  re-sorts the live queue and never double-advances (nextIndex is
 *  always index+1). A card that lands in Learning or Relearning state
 *  is appended to the END of the current session queue (same-day
 *  relearning — its FSRS step elapses in minutes, so it comes back
 *  after every other due card); a card that lands in Review state is
 *  done until its scheduled day. `reviewedState` is the FSRS State enum
 *  value of the card AFTER the review. */
export function advanceReviewQueue(
  queue: string[],
  index: number,
  reviewedState: number,
): AdvanceResult {
  if (index < 0 || index >= queue.length) {
    return { queue: [...queue], nextIndex: index, requeued: false };
  }
  if (isLearningOrRelearning(reviewedState)) {
    return { queue: [...queue, queue[index]], nextIndex: index + 1, requeued: true };
  }
  return { queue: [...queue], nextIndex: index + 1, requeued: false };
}

/** Honest label for a grade button: the grade name plus the FSRS-computed
 *  interval for THIS card (pre-formatted by formatFsrsInterval, e.g.
 *  "10m" / "3d"). The interval is computed, never hardcoded.
 *  Localization Pass 1 — optional `lang`: "ur" renders the Urdu grade
 *  name; "roman"/omitted keeps the English grade name (the i18n
 *  fallback rule). The interval label itself is already lang-formatted
 *  by the caller. */
export function gradeButtonLabel(
  grade: "again" | "hard" | "good" | "easy",
  intervalLabel: string,
  lang: "en" | "roman" | "ur" = "en",
): string {
  const ur = lang === "ur";
  const name =
    grade === "again"
      ? ur
        ? "دوبارہ"
        : "Again"
      : grade === "hard"
        ? ur
          ? "مشکل"
          : "Hard"
        : grade === "good"
          ? ur
            ? "اچھا"
            : "Good"
          : ur
            ? "آسان"
            : "Easy";
  return `${name} — ${intervalLabel}`;
}

// ---- flashcards: stored scheduling state ----
export function loadFlashState(): FlashState {
  if (typeof window === "undefined") return {};
  return safeParse<FlashState>(FLASH_KEY, {});
}
export function saveFlashState(s: FlashState): boolean {
  // Step 2b — returns the safeWrite result so the flashcards page can
  // warn (with retry/export) when a grade fails to save. Callers that
  // ignore the return value are unaffected.
  return safeWrite(FLASH_KEY, JSON.stringify(s));
}

/** Count cards waiting for review right now (home dashboard): the
 *  due-now + new queue length, computed from stored state with the
 *  migration applied IN MEMORY ONLY — this never writes, so the home
 *  page cannot trigger or disturb the migration. Returns 0 when
 *  nothing is due and no card is new. */
export function countDueFlashcards(
  cards: { front: string; back: string; category: string }[],
  now: Date = new Date(),
): number {
  const withIds = cards.map((c) => ({ ...c, id: flashcardId(c.front, c.back) }));
  const raw = loadFlashState() as unknown as Record<string, unknown>;
  const { state } = convertFlashStateToFsrs(raw, cards, now);
  return buildReviewQueue(withIds, state, now).length;
}

/** Step 2a — the New/Due split behind countDueFlashcards, for the home
 *  "Start here" card. Same read-only, in-memory-migration read as
 *  countDueFlashcards, and the same classification as
 *  buildReviewQueue (no category filter: home covers all categories).
 *  fresh + due === countDueFlashcards(cards, now) for the same inputs;
 *  cards due in the future are in neither bucket. */
export function countFlashcardBuckets(
  cards: { front: string; back: string; category: string }[],
  now: Date = new Date(),
): { fresh: number; due: number } {
  const raw = loadFlashState() as unknown as Record<string, unknown>;
  const { state } = convertFlashStateToFsrs(raw, cards, now);
  let fresh = 0;
  let due = 0;
  for (const c of cards) {
    const entry = state[flashcardId(c.front, c.back)];
    if (!entry) fresh++;
    else if (new Date(entry.dueAt).getTime() <= now.getTime()) due++;
  }
  return { fresh, due };
}

export type DueForecastDay = { date: string; label: string; due: number };

/** Stage 3 part 2 — due forecast for the next `days` calendar days,
 *  for the Recharts bar chart on /analysis. Pure (takes state, never
 *  reads storage): new cards (no stored state) and cards already due
 *  count toward day 0 (today); a card due on a later calendar day
 *  counts toward that day; cards due beyond the window are not
 *  counted. Day boundaries are LOCAL calendar dates (same "today" the
 *  rest of the app uses). `date` is YYYY-MM-DD, `label` is MM-DD for
 *  the chart axis. Never invents data: with no cards it returns
 *  `days` zero-count days. */
export function forecastDue(
  cards: { front: string; back: string; category: string }[],
  state: FlashState,
  now: Date = new Date(),
  days = 7,
): DueForecastDay[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out: DueForecastDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startOfToday.getTime() + i * 86400000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    out.push({ date: `${yyyy}-${mm}-${dd}`, label: `${mm}-${dd}`, due: 0 });
  }
  const withIds = cards.map((c) => ({ ...c, id: flashcardId(c.front, c.back) }));
  for (const c of withIds) {
    const entry = state[c.id];
    let day = 0; // new cards and already-due cards: today.
    if (entry) {
      const dueDate = new Date(entry.dueAt);
      if (!Number.isNaN(dueDate.getTime()) && dueDate.getTime() > now.getTime()) {
        const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        day = Math.round((dueDay.getTime() - startOfToday.getTime()) / 86400000);
      }
    }
    if (day >= 0 && day < days) out[day].due++;
  }
  return out;
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
  /** Step 2b — the reporter explicitly chose "no suggested
   *  correction" (the issue is a flag, not a fix). Absent on older
   *  reports, which never offered the choice. */
  noSuggestedCorrection?: boolean;
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
    noSuggestedCorrection: r.noSuggestedCorrection === true ? true : undefined,
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

/** Step 3b-audit2 (F07) — reportIssueDetailed reports whether the
 *  report was actually stored, so the form can show a retry state
 *  instead of a false "saved" message when storage is full. */
export type ReportIssueResult = { rec: IssueReport; saved: boolean };

export function reportIssueDetailed(input: {
  qid: string;
  subject?: string;
  reason?: IssueReason | null;
  proposedCorrection?: string;
  source?: string;
  /** Step 2b — the reporter explicitly chose "no suggested correction". */
  noSuggestedCorrection?: boolean;
}): ReportIssueResult {
  const rec: IssueReport = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    qid: input.qid,
    date: new Date().toISOString(),
    subject: input.subject ?? null,
    reason: input.reason ?? null,
    proposedCorrection: input.proposedCorrection?.trim() ? input.proposedCorrection.trim() : null,
    source: input.source?.trim() ? input.source.trim() : null,
    noSuggestedCorrection: input.noSuggestedCorrection === true ? true : undefined,
  };
  const res = atomicUpdateJSON<IssueReport[]>(ISSUES_KEY, [], (all) => [...all, rec]);
  return { rec, saved: res.ok };
}

export function deleteIssue(id: string): boolean {
  if (typeof window === "undefined") return false;
  return atomicUpdateJSON<IssueReport[]>(ISSUES_KEY, [], (all) => all.filter((i) => i.id !== id)).ok;
}

export function clearIssues() {
  safeRemove(ISSUES_KEY);
}

// ---- in-progress quiz / mock sessions (versioned, resumable) ----
// Step 2b — SESSION VERSION 3: a session now carries a stable id, the
// subject/mock identity, and the content revision (KEY_VERSION), so a
// stored session can be CHECKED against the current run before any
// answer is applied. Version 2 sessions (no identity/revision fields)
// stay readable: they are compatible only on an exact scope + seed +
// question-ids match, which is the content guarantee for legacy runs.
export type QuizSession = {
  version: 2 | 3;
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
  // --- version 3 fields (absent on legacy version 2 sessions) ---
  /** Stable id for this run: scope + start time. Stable across every
   *  save of the same run, unique per start. */
  id?: string;
  /** Subject label (practice) — part of the compatibility fingerprint. */
  subject?: string;
  /** Mock/track identity (mock mode) — part of the fingerprint. */
  mockId?: string;
  trackId?: string;
  /** Content revision (KEY_VERSION) the questions were built from. */
  contentRevision?: string;
  /** Flagged-for-review questions (qid -> true). */
  flags?: Record<string, boolean>;
};

/** Session versions this build reads. Version 1 never existed (the
 *  key name carries v2 from the start); unknown versions are never
 *  resumed. */
export function isSessionVersion(v: unknown): v is 2 | 3 {
  return v === 2 || v === 3;
}

export function loadSessions(): Record<string, QuizSession> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, QuizSession>>(SESSION_KEY, {});
}

/** A session is live when it exists, is not submitted, and its absolute
 *  deadline (if any) has not passed. Expired/submitted sessions are not
 *  resumed; callers should clear them and start fresh. */
export function loadSession(scope: string): QuizSession | null {
  const s = loadSessions()[scope];
  if (!s || !isSessionVersion(s.version) || typeof s.scope !== "string") return null;
  if (s.submitted) return null;
  if (s.deadlineTs !== null && s.deadlineTs !== undefined && s.deadlineTs <= Date.now()) return null;
  return s;
}

/** Raw read (including submitted/expired sessions) for idempotency checks. */
export function loadSessionRaw(scope: string): QuizSession | null {
  const s = loadSessions()[scope];
  if (!s || !isSessionVersion(s.version)) return null;
  return s;
}

/** Step 2a — every LIVE session (same liveness rules as loadSession:
 *  version 2 or 3, string scope, not submitted, deadline not passed), most
 *  recently started first. Read-only: the home "Start here" card uses
 *  it to offer a genuine Resume action; it never writes or clears. */
export function liveSessions(): QuizSession[] {
  const now = Date.now();
  return Object.values(loadSessions())
    .filter(
      (s) =>
        s &&
        isSessionVersion(s.version) &&
        typeof s.scope === "string" &&
        !s.submitted &&
        (s.deadlineTs === null || s.deadlineTs === undefined || s.deadlineTs > now),
    )
    .sort((a, b) => b.startedAt - a.startedAt);
}

/** Step 2b — the fingerprint a run is checked against before a stored
 *  session is resumed. Built by QuizRunner from its props + the
 *  questions it was given; nothing here is guessed. */
export type SessionFingerprint = {
  scope: string;
  subject?: string;
  mockId?: string;
  trackId?: string;
  questionSeed: string;
  questionIds: string[];
  contentRevision: string;
};

export type IncompatibilityReason =
  | "version"
  | "scope"
  | "subject"
  | "mock"
  | "seed"
  | "questions"
  | "revision";

/** Step 2b — is this stored session safe to resume for THIS run?
 *  NEVER silently apply stale answers to the wrong set: every field
 *  of the fingerprint must match. Legacy version 2 sessions carry no
 *  identity/revision fields, so they match on scope + seed + the exact
 *  question-id list only — the ids themselves are the content
 *  guarantee (a changed bank produces a different id list). Returns
 *  the first mismatch reason so the UI can say WHY the old session
 *  was not applied. Pure: no storage access. */
export function checkSessionCompatibility(
  stored: QuizSession,
  current: SessionFingerprint,
): { compatible: boolean; reason?: IncompatibilityReason } {
  if (!isSessionVersion(stored.version)) return { compatible: false, reason: "version" };
  if (stored.scope !== current.scope) return { compatible: false, reason: "scope" };
  if (
    stored.questionIds.length !== current.questionIds.length ||
    stored.questionIds.some((id, i) => id !== current.questionIds[i])
  ) {
    return { compatible: false, reason: "questions" };
  }
  if (stored.questionSeed !== current.questionSeed) return { compatible: false, reason: "seed" };
  if (stored.version === 3) {
    if ((stored.subject ?? "") !== (current.subject ?? ""))
      return { compatible: false, reason: "subject" };
    if ((stored.mockId ?? "") !== (current.mockId ?? "") || (stored.trackId ?? "") !== (current.trackId ?? ""))
      return { compatible: false, reason: "mock" };
    if (stored.contentRevision !== current.contentRevision)
      return { compatible: false, reason: "revision" };
  }
  return { compatible: true };
}

export function saveSession(s: QuizSession): boolean {
  // Step 3b-audit2 (F07/F08): compare-and-swap map upsert — another
  // tab's live session for a different scope is never overwritten —
  // and the result is reported (the shell banner surfaces failures).
  if (typeof window === "undefined") return false;
  return atomicUpdateJSON<Record<string, QuizSession>>(SESSION_KEY, {}, (all) => ({
    ...all,
    [s.scope]: s,
  })).ok;
}

export function clearSession(scope: string): boolean {
  if (typeof window === "undefined") return false;
  return atomicUpdateJSON<Record<string, QuizSession>>(SESSION_KEY, {}, (all) => {
    const next = { ...all };
    delete next[scope];
    return next;
  }).ok;
}

export function clearAllSessions() {
  if (typeof window === "undefined") return;
  safeRemove(SESSION_KEY);
}

// ---- durable flagged questions (Step 3b-audit2, F12) ----
// Flags set during a quiz/mock run used to live ONLY in the run's
// session: submitting (or clearing) the session deleted them. These
// functions keep a separate, durable store: a flag survives submit,
// session clear and reload, and is listed on /review until the owner
// removes it. Session flags (QuizRunner state) are unchanged — the
// durable store is written alongside them on every toggle, so the
// two can never silently disagree about a flag the user just set.
// Practice and mock flags share this store; `source` says which run
// flagged the question, and `title` is the run's display title.
export type DurableFlag = {
  qid: string;
  flaggedAt: string; // ISO timestamp of the most recent flagging
  source: "mock" | "practice";
  title: string; // run title at flag time (mock title / subject label)
};

function asDurableFlag(v: unknown): DurableFlag | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  if (typeof r.qid !== "string" || !r.qid) return null;
  if (typeof r.flaggedAt !== "string" || !r.flaggedAt) return null;
  if (r.source !== "mock" && r.source !== "practice") return null;
  if (typeof r.title !== "string") return null;
  return { qid: r.qid, flaggedAt: r.flaggedAt, source: r.source, title: r.title };
}

/** All durable flags, newest first. Malformed stored entries are
 *  skipped (the quarantine path handles corrupt JSON as everywhere). */
export function loadFlags(): DurableFlag[] {
  if (typeof window === "undefined") return [];
  return safeParse<unknown[]>(FLAGS_KEY, [])
    .map(asDurableFlag)
    .filter((f): f is DurableFlag => f !== null)
    .sort((a, b) => (a.flaggedAt < b.flaggedAt ? 1 : a.flaggedAt > b.flaggedAt ? -1 : a.qid.localeCompare(b.qid)));
}

/** Flag a question durably (re-flagging refreshes the timestamp).
 *  Returns whether the write succeeded. Malformed stored entries are
 *  dropped by the updater, never allowed to crash the write. */
export function saveFlag(qid: string, source: "mock" | "practice", title: string): boolean {
  if (typeof window === "undefined") return false;
  const rec: DurableFlag = { qid, flaggedAt: new Date().toISOString(), source, title };
  return atomicUpdateJSON<unknown[]>(FLAGS_KEY, [], (raw) => [
    ...raw.map(asDurableFlag).filter((f): f is DurableFlag => f !== null && f.qid !== qid),
    rec,
  ]).ok;
}

/** Remove one durable flag. Returns whether the write succeeded.
 *  Malformed stored entries are dropped by the updater, never allowed
 *  to crash the write. */
export function removeFlag(qid: string): boolean {
  if (typeof window === "undefined") return false;
  return atomicUpdateJSON<unknown[]>(FLAGS_KEY, [], (raw) =>
    raw.map(asDurableFlag).filter((f): f is DurableFlag => f !== null && f.qid !== qid),
  ).ok;
}

/** Remove all durable flags (explicit user action on /review only). */
export function clearFlags() {
  safeRemove(FLAGS_KEY);
}

// ---- live stats, computed only from real attempts ----
// MCQ accuracy counts quiz + mock attempts ONLY. Flashcard attempts are
// self-ratings (kind "flash") and are reported separately below; mixing
// them into MCQ accuracy overstated it. Streak counts any study day
// (MCQ or flashcards).
export type Stats = {
  totalAttempts: number; // all kinds, including flashcards
  /** Step 2b — MCQ attempts only (quiz + mock), the denominator behind
   *  the accuracy headline. */
  mcqAttempts: number;
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
  /** Step 2b — subjects with 1–4 answered questions: too small a
   *  sample for the weakest list, shown as provisional instead of
   *  suppressed silently. Sorted worst-first, like `weakest`. */
  provisional: { subject: string; accuracy: number; total: number }[];
  hasData: boolean;
  flashAttempts: number;
  flashReviewed: number;
  flashRecalled: number;
};

/** Step 3b-audit F10 — local-timezone day key (YYYY-MM-DD). Day
 *  boundaries are the USER's local days (PKT for the owner), never
 *  UTC: an attempt at 01:00 PKT belongs to the new local day even
 *  though its ISO timestamp still says the previous UTC day. Uses
 *  the local getters, like forecastDue(). */
export function localDayKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function dayKey(iso: string) {
  const d = new Date(iso);
  // Unparseable input keeps the old slice behaviour (never crash on
  // corrupt stored data); every valid ISO timestamp keys LOCAL.
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : localDayKey(d);
}

/** Step 3b-audit F10 — consecutive local days ending today (or
 *  yesterday if no attempt today yet). Pure over the day-key set so
 *  TZ-pinned tests can pin "today"; computeStats passes new Date(). */
export function countStreakDays(daySet: Set<string>, today: Date): number {
  let streakDays = 0;
  const cursor = new Date(today.getTime());
  if (!daySet.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (daySet.has(localDayKey(cursor))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streakDays;
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
  // Any study counts — MCQ or flashcard sessions. Day keys are LOCAL
  // (F10): the cursor steps local days and compares local keys, never
  // UTC slices.
  const daySet = new Set(attempts.map((a) => dayKey(a.date)));
  const streakDays = countStreakDays(daySet, new Date());
  const subjList = Object.entries(perSubject)
    .map(([subject, v]) => ({ subject, accuracy: v.accuracy, total: v.total }))
    .filter((x) => x.total >= 5)
    .sort((a, b) => a.accuracy - b.accuracy);
  // Step 2b — small samples (1–4 questions) are surfaced as
  // provisional, never suppressed: the Analysis page labels them and
  // offers a 10-question drill for each.
  const provisionalList = Object.entries(perSubject)
    .map(([subject, v]) => ({ subject, accuracy: v.accuracy, total: v.total }))
    .filter((x) => x.total >= 1 && x.total < 5)
    .sort((a, b) => a.accuracy - b.accuracy);
  return {
    totalAttempts: attempts.length,
    mcqAttempts: mcq.length,
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
    provisional: provisionalList,
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

/** Step 2b — last backup export/import timestamps (ISO strings, null
 *  when never). Recorded by the Analysis page's export/import actions,
 *  displayed in the data-management panel. */
export function loadLastExport(): string | null {
  return safeRead(LAST_EXPORT_KEY);
}
export function recordExport() {
  safeWrite(LAST_EXPORT_KEY, new Date().toISOString());
}
export function loadLastImport(): string | null {
  return safeRead(LAST_IMPORT_KEY);
}
export function recordImport() {
  safeWrite(LAST_IMPORT_KEY, new Date().toISOString());
}
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
    // the missing fields as empty. Stage 2 — version 6 stores `flashcards`
    // in FSRS shape (see migrateBackupPayload for the v4/v5 path).
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
    isSessionVersion(r.version) &&
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
// chained v4->v5->v6 migration; the merge code below guards every
// optional field.
/** Current backup format version. Bump only with a matching migration. */
export const BACKUP_VERSION = 6;
/** Backup versions this build restores (each has an explicit migration). */
export const SUPPORTED_BACKUP_VERSIONS = [4, 5, 6] as const;

/** v4 -> v5: add the v5-only fields (`reviews`, `annotations`) as empty
 *  defaults so later stages see one shape. Pure: never mutates input. */
export function migrateV4ToV5(p: Record<string, unknown>): Record<string, unknown> {
  return {
    ...p,
    version: 5,
    reviews: p.reviews ?? {},
    annotations: p.annotations ?? { notes: {}, includeInTutor: false },
  };
}

/** Convert a backup payload's `flashcards` map to the v6 (FSRS) shape.
 *  FSRS-shaped entries pass through; legacy fixed-ladder entries seed
 *  FSRS cards with their due date preserved (see
 *  seedFsrsCardFromLegacy); anything else passes through untouched so
 *  the merge's shape validation skips and counts it. Pure. */
function convertBackupFlashcards(p: Record<string, unknown>): Record<string, unknown> {
  const fc = p.flashcards;
  if (!fc || typeof fc !== "object" || Array.isArray(fc)) return p.flashcards as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fc as Record<string, unknown>)) {
    if (isFsrsCardState(v)) out[k] = v;
    else if (isLegacyFlashEntry(v)) out[k] = seedFsrsCardFromLegacy(v);
    else out[k] = v;
  }
  return out;
}

/** v5 -> v6: convert stored flash state from the fixed-ladder shape to
 *  the FSRS shape (due dates preserved). Pure: never mutates input. */
export function migrateV5ToV6(p: Record<string, unknown>): Record<string, unknown> {
  return {
    ...p,
    version: 6,
    flashcards: convertBackupFlashcards(p),
  };
}

/** Migrate a parsed backup payload to the current (v6) shape. Pure: it
 *  never mutates its input. v6 payloads pass through unchanged; v5
 *  payloads take v5->v6; older payloads chain v4->v5->v6 (the v3-and-
 *  older lenient path keeps working: missing fields default to empty).
 *  Callers must validate the payload (app marker, numeric version,
 *  attempts list) and reject versions newer than BACKUP_VERSION before
 *  calling this. */
export function migrateBackupPayload(p: Record<string, unknown>): Record<string, unknown> {
  if (typeof p.version === "number" && p.version >= BACKUP_VERSION) return p;
  if (p.version === 5) return migrateV5ToV6(p);
  return migrateV5ToV6(migrateV4ToV5(p));
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
 *  before. Version 7+ files are rejected (newer than this build).
 *  Stage 2 (v6): `flashcards` are stored in FSRS shape; v4/v5 files have
 *  their fixed-ladder flash entries converted (due dates preserved) by
 *  migrateBackupPayload before the merge, and the merge below accepts
 *  only FSRS-shaped entries (anything else is skipped and counted).
 *  Stage 1 P1 Tier 2 (unchanged): all import writes go through safeWrite, so a quota or
 *  security failure during an import is caught and warned, never a
 *  crash. The quarantine store is deliberately NOT part of the backup
 *  payload — exportQuarantine() downloads it separately.
 *  Validation: valid JSON, app marker "etea-prep-next", numeric version,
 *  per-record shape checks (invalid records are skipped and counted).
 *  Unknown future fields are ignored. */
export function importProgress(json: string): ImportResult {
  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    // Stage 2 — validate, then migrate to the v6 shape, then merge.
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
        // Stage 2: the merge accepts FSRS-shaped entries only — v4/v5
        // legacy entries were already converted by migrateBackupPayload,
        // so anything failing the guard here is unusable and skipped.
        if (isFsrsCardState(v)) clean[k] = v;
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
