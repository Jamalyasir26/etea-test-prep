// FSRS spaced repetition (Stage 2) — thin wrapper around ts-fsrs 6.0.0
// (FSRS-7, the DefaultScheduler preset). This module owns:
//   - the scheduler instance (async creation, cached — DefaultScheduler()
//     returns a Promise; its review/preview/newCard methods are sync),
//   - the JSON-safe stored card shape (SerializedFsrsCard) + conversion
//     to/from the live ts-fsrs card (Date fields — review() rejects
//     string dates, so deserialization is mandatory, never optional),
//   - seeding of migrated cards from the old fixed-ladder state,
//   - interval formatting for grade-button previews.
//
// Honest parameters (ts-fsrs 6.0.0 defaults, unchanged): FSRS-7 weights,
// desired retention 0.9, learning steps 1m/10m, relearning steps 10m,
// graduating interval 1 day, maximum interval 36500 days, fuzz OFF by
// default in v6 (so the interval shown on a grade button is exactly the
// interval the review applies — previews are deterministic, not sampled).
// NOTE: the configured steps are floors/parameters, not promises: FSRS-7
// computes each interval from stability/difficulty, so a Good from
// learning step 1 can land past the 10m step (observed ~27m). The UI
// always shows the COMPUTED interval, never the configured step.
//
// Card field names follow ts-fsrs v6 exactly (dueAt, lastReviewAt,
// stabilityFast, scheduleStatus, learningStep, cardId) — these differ
// from the v5 names (due, last_review) quoted in AUDIT-V2.md §4b. The
// stored shape is the v6 shape; nothing here uses v5 field names.
//
// This module has no React imports and no localStorage access, so the
// node test suites can import it directly. It must never top-level
// await: scheduler creation is lazy (initFsrsScheduler) so importing
// this file stays synchronous and side-effect free.
import { DefaultScheduler, Rating, State, type DefaultSchedulerCard } from "ts-fsrs";

/** The scheduler instance type (FSRS-7 preset). Creation is async. */
export type FsrsScheduler = Awaited<ReturnType<typeof DefaultScheduler>>;

/** Honest UI label for the scheduler actually installed. */
export const FSRS_LABEL = "FSRS-7";
export const FSRS_LIBRARY_VERSION = "ts-fsrs 6.0.0";

/** Grades as the UI spells them (stable across the old ladder + FSRS). */
export type FlashGrade = "again" | "hard" | "good" | "easy";

export const GRADE_RATING: Record<FlashGrade, 1 | 2 | 3 | 4> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const RATING_GRADE: Record<number, FlashGrade> = {
  [Rating.Again]: "again",
  [Rating.Hard]: "hard",
  [Rating.Good]: "good",
  [Rating.Easy]: "easy",
};

export function ratingToGrade(rating: number): FlashGrade | null {
  return RATING_GRADE[rating] ?? null;
}

// ---------------------------------------------------------------------------
// Scheduler instance (lazy, cached). DefaultScheduler() is async but
// resolves in a few ms (local computation, no I/O); creation is cached
// so the whole app shares one instance.
// ---------------------------------------------------------------------------

let schedulerPromise: Promise<FsrsScheduler> | null = null;

/** Create (once) and return the shared FSRS-7 scheduler. */
export function initFsrsScheduler(): Promise<FsrsScheduler> {
  if (!schedulerPromise) schedulerPromise = DefaultScheduler();
  return schedulerPromise;
}

// ---------------------------------------------------------------------------
// Stored card shape — JSON-safe. This is what lives in localStorage
// (etea_flash_next) and in v6 backup exports. It mirrors the ts-fsrs v6
// card field-for-field, with Date fields as ISO strings.
// ---------------------------------------------------------------------------

export type FsrsScheduleStatus = "new" | "learning" | "review" | "relearning";

export type SerializedFsrsCard = {
  dueAt: string; // ISO datetime — the exact moment the card becomes due
  stability: number;
  stabilityFast: number;
  difficulty: number;
  state: number; // State enum: 0 New, 1 Learning, 2 Review, 3 Relearning
  scheduleStatus: FsrsScheduleStatus;
  lastReviewAt: string | null; // ISO datetime, null when never reviewed
  cardId: string; // scheduler-assigned uuid (opaque; never the bank id)
  reps: number;
  lapses: number;
  scheduledDays: number; // fractional days of the last scheduled interval
  learningStep: number;
};

const SCHEDULE_STATUSES: FsrsScheduleStatus[] = ["new", "learning", "review", "relearning"];

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isIsoDateString(v: unknown): v is string {
  return typeof v === "string" && v !== "" && !Number.isNaN(Date.parse(v));
}

/** Strict shape guard for a stored FSRS card. Anything failing this is
 *  NOT treated as FSRS state (the migration treats it as unusable old
 *  state and seeds a fresh card; the import merge skips and counts it). */
export function isFsrsCardState(v: unknown): v is SerializedFsrsCard {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return (
    isIsoDateString(c.dueAt) &&
    isFiniteNumber(c.stability) &&
    isFiniteNumber(c.stabilityFast) &&
    isFiniteNumber(c.difficulty) &&
    isFiniteNumber(c.state) &&
    Number.isInteger(c.state) &&
    (c.state as number) >= 0 &&
    (c.state as number) <= 3 &&
    typeof c.scheduleStatus === "string" &&
    (SCHEDULE_STATUSES as string[]).includes(c.scheduleStatus) &&
    (c.lastReviewAt === null || isIsoDateString(c.lastReviewAt)) &&
    typeof c.cardId === "string" &&
    c.cardId !== "" &&
    isFiniteNumber(c.reps) &&
    isFiniteNumber(c.lapses) &&
    isFiniteNumber(c.scheduledDays) &&
    isFiniteNumber(c.learningStep)
  );
}

/** Serialize a live scheduler card for storage. Dates become ISO strings. */
export function serializeFsrsCard(card: DefaultSchedulerCard): SerializedFsrsCard {
  return {
    dueAt: card.dueAt instanceof Date ? card.dueAt.toISOString() : new Date(card.dueAt).toISOString(),
    stability: card.stability,
    stabilityFast: card.stabilityFast,
    difficulty: card.difficulty,
    state: card.state as number,
    scheduleStatus: card.scheduleStatus as FsrsScheduleStatus,
    lastReviewAt:
      card.lastReviewAt == null
        ? null
        : card.lastReviewAt instanceof Date
          ? card.lastReviewAt.toISOString()
          : new Date(card.lastReviewAt).toISOString(),
    // The library types cardId as string | number; storage keeps the
    // string form (newCard() always generates a uuid string).
    cardId: String(card.cardId),
    reps: card.reps,
    lapses: card.lapses,
    scheduledDays: card.scheduledDays,
    learningStep: card.learningStep,
  };
}

/** Deserialize a stored card for the scheduler. Converts ISO strings
 *  back to Date objects — review()/preview() reject string dates
 *  ("Expected valid Date fields"), so this step is mandatory. Returns
 *  null when the stored value fails the shape guard. */
export function deserializeFsrsCard(stored: unknown): DefaultSchedulerCard | null {
  if (!isFsrsCardState(stored)) return null;
  return {
    dueAt: new Date(stored.dueAt),
    stability: stored.stability,
    stabilityFast: stored.stabilityFast,
    difficulty: stored.difficulty,
    state: stored.state as State,
    scheduleStatus: stored.scheduleStatus,
    lastReviewAt: stored.lastReviewAt === null ? null : new Date(stored.lastReviewAt),
    cardId: stored.cardId,
    reps: stored.reps,
    lapses: stored.lapses,
    scheduledDays: stored.scheduledDays,
    learningStep: stored.learningStep,
  } as DefaultSchedulerCard;
}

// ---------------------------------------------------------------------------
// Seeding — fresh cards and migrated cards. The seed defaults below are
// literal values matching ts-fsrs 6.0.0 newCard() output (stability 0,
// stabilityFast 0, difficulty 0, learningStep 0); test-fsrs.mjs guards
// them against drift by comparing with a real newCard(). Literals (not
// scheduler calls) keep the migration + backup paths synchronous and
// pure, so they never depend on scheduler init order.
// ---------------------------------------------------------------------------

function newCardId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `fsrs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function scheduleStatusForState(state: number): FsrsScheduleStatus {
  switch (state) {
    case State.Learning:
      return "learning";
    case State.Review:
      return "review";
    case State.Relearning:
      return "relearning";
    default:
      return "new";
  }
}

/** True when a reviewed card stays in the session for same-day
 *  relearning: Learning and Relearning cards come back at the end of
 *  the current pass (their FSRS step elapses in minutes), while Review
 *  cards are done until their scheduled day. */
export function isLearningOrRelearning(state: number): boolean {
  return state === State.Learning || state === State.Relearning;
}

/** A fresh FSRS card (never reviewed): New state, due now. */
export function freshFsrsCard(now: Date): SerializedFsrsCard {
  return {
    dueAt: now.toISOString(),
    stability: 0,
    stabilityFast: 0,
    difficulty: 0,
    state: State.New,
    scheduleStatus: "new",
    lastReviewAt: null,
    cardId: newCardId(),
    reps: 0,
    lapses: 0,
    scheduledDays: 0,
    learningStep: 0,
  };
}

/** Old fixed-ladder entry shape (pre-Stage-2 FlashState values). */
export type LegacyFlashEntry = {
  grade: FlashGrade;
  due: string; // YYYY-MM-DD (UTC date, as the old code computed `today`)
  interval: number; // days
  reps: number;
};

export function isLegacyFlashEntry(v: unknown): v is LegacyFlashEntry {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return (
    (e.grade === "again" || e.grade === "hard" || e.grade === "good" || e.grade === "easy") &&
    typeof e.due === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.due) &&
    !Number.isNaN(Date.parse(`${e.due}T00:00:00Z`)) &&
    isFiniteNumber(e.interval) &&
    isFiniteNumber(e.reps)
  );
}

/** Seed an FSRS card from a usable legacy entry (the soft reset).
 *  DUE DATE PRESERVED EXACTLY: the old due is a UTC date, so the new
 *  dueAt is midnight UTC at the start of that date — dueAt <= now holds
 *  exactly when the old `due <= today` (UTC date) held. reps is
 *  preserved; scheduledDays takes the old interval (approximate, per
 *  AUDIT-V2.md §4b); stability/difficulty restart at fresh defaults;
 *  lastReviewAt is null (the old shape never stored it — null is the
 *  honest value, not a reconstruction). State is Review: the card was
 *  already in rotation. */
export function seedFsrsCardFromLegacy(entry: LegacyFlashEntry): SerializedFsrsCard {
  return {
    dueAt: `${entry.due}T00:00:00.000Z`,
    stability: 0,
    stabilityFast: 0,
    difficulty: 0,
    state: State.Review,
    scheduleStatus: "review",
    lastReviewAt: null,
    cardId: newCardId(),
    reps: Math.max(0, Math.floor(entry.reps)),
    lapses: 0,
    scheduledDays: Math.max(0, entry.interval),
    learningStep: 0,
  };
}

// ---------------------------------------------------------------------------
// Review + preview (thin sync wrappers — the caller awaits
// initFsrsScheduler() once and passes the instance in).
// ---------------------------------------------------------------------------

/** The card shape scheduler.review()/preview() accept. The library's
 *  bundled .d.mts declares the card types twice (two chunks with
 *  unrelated identities — TS2719) and newCard()'s declared return omits
 *  stabilityFast even though the runtime object carries it, so the
 *  declared method signatures cannot be called with the declared card
 *  types at all. The wrappers below therefore call the scheduler
 *  through narrowly-typed aliases (cast via unknown, in exactly this
 *  one place). The real guarantees are runtime: the shape guard in
 *  deserializeFsrsCard for stored cards, and scripts/test-fsrs.mjs
 *  exercising the real scheduler for every transition. */
type SchedulerReview = (input: {
  card: unknown;
  grade: 1 | 2 | 3 | 4;
  now: Date;
}) => { card: DefaultSchedulerCard };
type SchedulerPreview = (input: { card: unknown; now: Date }) => Iterable<{
  grade: 1 | 2 | 3 | 4;
  card: DefaultSchedulerCard;
}>;

export type FsrsPreview = {
  grade: FlashGrade;
  dueAt: Date;
  state: number;
  scheduledDays: number;
};

/** Apply one grade to a stored card (or a fresh card when null) and
 *  return the updated STORED card. Pure w.r.t. its inputs: review()
 *  never mutates the card it is given (verified in test-fsrs.mjs). */
export function reviewFsrsCard(
  scheduler: FsrsScheduler,
  stored: SerializedFsrsCard | null,
  grade: FlashGrade,
  now: Date,
): SerializedFsrsCard {
  const card =
    stored === null ? scheduler.newCard({ now }) : (deserializeFsrsCard(stored) ?? scheduler.newCard({ now }));
  const review = scheduler.review as unknown as SchedulerReview;
  const { card: next } = review({ card, grade: GRADE_RATING[grade], now });
  return serializeFsrsCard(next);
}

/** Preview all four grades for a stored card (or a fresh card when
 *  null). Returns one entry per grade, in Again/Hard/Good/Easy order.
 *  Uses scheduler.preview() — the single call the library provides for
 *  exactly this. Because fuzz is off, these intervals are exactly the
 *  intervals review() will apply. */
export function previewFsrsGrades(
  scheduler: FsrsScheduler,
  stored: SerializedFsrsCard | null,
  now: Date,
): FsrsPreview[] {
  const card =
    stored === null ? scheduler.newCard({ now }) : (deserializeFsrsCard(stored) ?? scheduler.newCard({ now }));
  const preview = scheduler.preview as unknown as SchedulerPreview;
  const out: FsrsPreview[] = [];
  for (const item of preview({ card, now })) {
    const grade = ratingToGrade(item.grade);
    if (!grade) continue;
    out.push({
      grade,
      dueAt: new Date(item.card.dueAt),
      state: item.card.state,
      scheduledDays: item.card.scheduledDays,
    });
  }
  // preview() yields Again/Hard/Good/Easy; sort defensively so callers
  // can always rely on the order.
  const order: FlashGrade[] = ["again", "hard", "good", "easy"];
  out.sort((a, b) => order.indexOf(a.grade) - order.indexOf(b.grade));
  return out;
}

// ---------------------------------------------------------------------------
// Interval formatting for grade-button previews. The input is the
// duration from now to the computed dueAt (ms, >= 0). Rules: under 90s
// shows 1m (the smallest FSRS step); under 1h shows minutes; under 1 day
// shows hours; under 30 days shows days (one decimal under 10 days when
// fractional, matching Anki-style "4.8d"); under 365 days shows months
// (days/30, one decimal); otherwise years (days/365, one decimal).
// `lang` picks the unit words; "roman" uses the English units (the i18n
// fallback rule — short chrome in Roman Urdu keeps English units).
// ---------------------------------------------------------------------------

export function formatFsrsInterval(ms: number, lang: "en" | "roman" | "ur" = "en"): string {
  const safe = Math.max(0, ms);
  const minutes = safe / 60000;
  const ur = lang === "ur";
  const unit = (en: string, u: string) => (ur ? u : en);
  if (minutes < 1.5) return `1${unit("m", " منٹ")}`;
  if (minutes < 60) return `${Math.round(minutes)}${unit("m", " منٹ")}`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}${unit("h", " گھنٹے")}`;
  const days = hours / 24;
  if (days < 30) {
    const d = days < 10 && days % 1 !== 0 ? Math.round(days * 10) / 10 : Math.round(days);
    return `${d}${unit("d", " دن")}`;
  }
  const months = days / 30;
  if (months < 12) return `${Math.round(months * 10) / 10}${unit("mo", " ماہ")}`;
  const years = days / 365;
  return `${Math.round(years * 10) / 10}${unit("y", " سال")}`;
}

/** Step 2b — an FSRS due datetime as a LOCAL calendar date. The stored
 *  dueAt is an ISO (UTC) string; slicing its first 10 characters showed
 *  the UTC date, which can be a day ahead of the owner's local date.
 *  toLocaleDateString() formats in the browser's local timezone. An
 *  unparseable value falls back to the raw string, never crashes. */
export function formatLocalDueDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
