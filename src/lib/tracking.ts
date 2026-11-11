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

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadAttempts(): Attempt[] {
  if (typeof window === "undefined") return [];
  return safeParse<Attempt[]>(localStorage.getItem(ATTEMPTS_KEY), []);
}

export function recordAttempt(a: Omit<Attempt, "id" | "date"> & { date?: string }): Attempt {
  const rec: Attempt = {
    ...a,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: a.date ?? new Date().toISOString(),
  };
  const all = loadAttempts();
  all.push(rec);
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
  localStorage.setItem(DAY_KEY, new Date().toISOString().slice(0, 10));
  return rec;
}

export function clearAttempts() {
  localStorage.removeItem(ATTEMPTS_KEY);
}

// ---- study plan checkboxes ----
export function loadPlanState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, boolean>>(localStorage.getItem(PLAN_KEY), {});
}
export function savePlanState(s: Record<string, boolean>) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(s));
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
 *  stays due today (see nextDue). */
export function gradeButtonLabel(grade: FlashGrade, interval: number): string {
  switch (grade) {
    case "again":
      return "Again — review again this session";
    case "hard":
      return "Hard — 2 days";
    case "good": {
      const d = interval < 3 ? 3 : interval < 7 ? 7 : 14;
      return `Good — ${d} days`;
    }
    case "easy": {
      const d = interval < 7 ? 7 : interval < 14 ? 14 : 30;
      return `Easy — ${d} days`;
    }
  }
}

// ---- flashcards: stored scheduling state ----
export function loadFlashState(): FlashState {
  if (typeof window === "undefined") return {};
  return safeParse<FlashState>(localStorage.getItem(FLASH_KEY), {});
}
export function saveFlashState(s: FlashState) {
  localStorage.setItem(FLASH_KEY, JSON.stringify(s));
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
  const raw = localStorage.getItem(ISSUES_KEY);
  if (raw !== null) return safeParse<unknown[]>(raw, []).map(asIssueReport).filter((x): x is IssueReport => x !== null);
  // First load: migrate the legacy key.
  const legacy = safeParse<unknown[]>(localStorage.getItem(ISSUES_LEGACY_KEY), []);
  const migrated = legacy.map(asIssueReport).filter((x): x is IssueReport => x !== null);
  localStorage.setItem(ISSUES_KEY, JSON.stringify(migrated));
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
  localStorage.setItem(ISSUES_KEY, JSON.stringify(all));
  return rec;
}

export function deleteIssue(id: string) {
  localStorage.setItem(ISSUES_KEY, JSON.stringify(loadIssues().filter((i) => i.id !== id)));
}

export function clearIssues() {
  localStorage.removeItem(ISSUES_KEY);
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
  return safeParse<Record<string, QuizSession>>(localStorage.getItem(SESSION_KEY), {});
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
  localStorage.setItem(SESSION_KEY, JSON.stringify(all));
}

export function clearSession(scope: string) {
  if (typeof window === "undefined") return;
  const all = loadSessions();
  delete all[scope];
  localStorage.setItem(SESSION_KEY, JSON.stringify(all));
}

export function clearAllSessions() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
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
    language: localStorage.getItem(LANG_KEY),
    theme: localStorage.getItem(THEME_KEY),
  };
}

export function exportProgress(): string {
  const payload = {
    app: "etea-prep-next",
    version: 4,
    exportedAt: new Date().toISOString(),
    attempts: loadAttempts(),
    plan: loadPlanState(),
    flashcards: loadFlashState(),
    issues: loadIssues(),
    preferences: loadPreferences(),
    sessions: loadSessions(),
    lastDay: typeof window === "undefined" ? null : localStorage.getItem(DAY_KEY),
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
  };
};

/** Import a backup file. Merge behaviour (unchanged from v3, now documented):
 *  attempts are merged, deduplicated by id; plan/flashcards are shallow-
 *  merged (imported keys overwrite); issues are merged, deduplicated by id;
 *  sessions are imported only for scopes with no live session already
 *  stored (a live in-progress session is never overwritten by an import);
 *  preferences overwrite the stored language/theme when valid.
 *  Validation: valid JSON, app marker "etea-prep-next", numeric version,
 *  per-record shape checks (invalid records are skipped and counted).
 *  Unknown future fields are ignored. */
export function importProgress(json: string): ImportResult {
  try {
    const p = JSON.parse(json) as Record<string, unknown>;
    if (!p || p.app !== "etea-prep-next" || typeof p.version !== "number" || !Array.isArray(p.attempts)) {
      return { ok: false, error: "Not a valid ETEA Prep export file (needs the app marker, a version number and an attempts list)." };
    }
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
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify([...existing, ...fresh]));
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
        localStorage.setItem(ISSUES_KEY, JSON.stringify([...loadIssues(), ...freshIssues]));
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
      localStorage.setItem(SESSION_KEY, JSON.stringify(stored));
      counts.sessions = added;
    }
    if (p.preferences && typeof p.preferences === "object") {
      const pref = p.preferences as Record<string, unknown>;
      let applied = false;
      if (pref.language === "en" || pref.language === "roman" || pref.language === "ur") {
        localStorage.setItem(LANG_KEY, pref.language);
        applied = true;
      }
      if (pref.theme === "light" || pref.theme === "dark") {
        localStorage.setItem(THEME_KEY, pref.theme);
        applied = true;
      }
      counts.preferencesApplied = applied;
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
