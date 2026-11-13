// Step 2b — study plan: stable task IDs, plan version, migration,
// calendar (dates + rest/catch-up days), and task deep links.
//
// Pure functions only (no localStorage) so they can be unit tested
// with plain node: node scripts/test-step2b.mjs
//
// WHY STABLE IDS: pre-2b completions were keyed by POSITION
// (`d{dayIndex}-t{taskIndex}`). Any reorder or rewording of PLAN21
// would silently move a completion to a different task. Stable ids
// are content-addressed (day heading + minutes + task text), so a
// reorder never mis-attaches a completion and a reworded task gets a
// new id (the old completion stops matching that task instead of
// attaching to the wrong one). migratePlanState() converts stored
// positional keys to stable ids, preserving completions; unknown keys
// are passed through untouched (never delete user data silently — the
// storage-safety rule; see test-storage.mjs, "v4 plan restored").
//
// NOTE: this module imports tracking.ts (for loadMigratedPlanState),
// but tracking.ts must NEVER import this module: tracking.ts is
// imported directly by plain-node tests via type-stripping, and this
// module's data.ts chain (JSON imports) cannot load that way. The
// migration therefore runs in the plan/home pages, not inside
// loadPlanState(); backups merge raw keys and the next plan read
// migrates them.
import { PLAN21 } from "./data";
import { loadPlanState, safeWrite, savePlanState } from "./tracking";

/** Plan content version. Bump when PLAN21 changes shape (reorder,
// reword, add/remove tasks) so stored completions are re-mapped
// instead of mis-attached. Stored under PLAN_VERSION_KEY (tracking.ts)
// once a migration has run. */
export const PLAN_VERSION = 1;

/** Stable task id: 'pt-' + a small FNV-1a hash of day + minutes +
 *  text. Same hashing approach as flashcardId in tracking.ts. Never
 *  use the array index as the id. */
export function planTaskId(day: string, mins: number, text: string): string {
  const s = `${day}|${mins}|${text}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `pt-${(h >>> 0).toString(36)}`;
}

/** Positional id (pre-2b format): `d{dayIndex}-t{taskIndex}`. Kept as
 *  the migration source format only — new code never writes it. */
export function positionalPlanId(dayIndex: number, taskIndex: number): string {
  return `d${dayIndex}-t${taskIndex}`;
}

/** All 63 stable ids in PLAN21 order. */
export function allPlanTaskIds(): string[] {
  const ids: string[] = [];
  for (const [day, tasks] of PLAN21) {
    for (const [mins, text] of tasks) ids.push(planTaskId(day, mins, text));
  }
  return ids;
}

/** How many of the 63 plan tasks are done. Counts ONLY known stable
 *  ids, so legacy/unknown stored keys can never inflate the "0 / 63"
 *  fraction. */
export function countPlanDone(state: Record<string, boolean>): number {
  let n = 0;
  for (const id of allPlanTaskIds()) if (state[id]) n++;
  return n;
}

export type PlanMigration = {
  state: Record<string, boolean>;
  /** True when at least one positional key was mapped (the caller
   *  should persist the migrated map + PLAN_VERSION). */
  migrated: boolean;
};

const POSITIONAL = /^d(\d+)-t(\d+)$/;

/** Migrate a stored plan state map to stable ids. Positional keys map
 *  to the stable id of the task at that position in the CURRENT
 *  PLAN21; stable keys pass through; unknown keys pass through
 *  untouched. On a collision between a positional key and an existing
 *  stable key for the same task, the STABLE key wins (it is the newer
 *  format — a post-migration uncheck must not be resurrected by an
 *  older positional entry). Pure: the caller decides when to persist. */
export function migratePlanState(raw: Record<string, boolean>): PlanMigration {
  const out: Record<string, boolean> = {};
  let migrated = false;
  // First pass: stable + unknown keys (newer format wins collisions).
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== "boolean") continue;
    if (!POSITIONAL.test(k)) out[k] = v;
  }
  // Second pass: positional keys map onto tasks that have no stable
  // entry yet.
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== "boolean") continue;
    const m = POSITIONAL.exec(k);
    if (!m) continue;
    const day = PLAN21[Number(m[1])];
    const task = day?.[1]?.[Number(m[2])];
    if (!task) {
      // Position no longer exists: preserve the key, never delete.
      if (!(k in out)) out[k] = v;
      continue;
    }
    migrated = true;
    const id = planTaskId(day[0], task[0], task[1]);
    if (!(id in out)) out[id] = v;
  }
  return { state: out, migrated };
}

/** Storage key for the plan version marker, written once a migration
 *  has run (see PLAN_VERSION). Read-only signal for debugging; the
 *  migration itself is idempotent and needs no marker to be safe. */
export const PLAN_VERSION_KEY = "etea_plan_version_next";

/** Load the stored plan state with positional→stable migration
 *  applied. When a migration ran, the migrated map is persisted
 *  immediately (with the version marker) so later readers — including
 *  the backup export — see stable ids. The plan page and the home
 *  page both read through this helper; raw loadPlanState() stays
 *  available for the backup export/import path, which merges raw keys
 *  and lets the next plan read migrate them. */
export function loadMigratedPlanState(): { state: Record<string, boolean>; migrated: boolean } {
  const { state, migrated } = migratePlanState(loadPlanState());
  if (migrated) {
    savePlanState(state);
    safeWrite(PLAN_VERSION_KEY, String(PLAN_VERSION));
  }
  return { state, migrated };
}

/** Storage key for the plan start date (local yyyy-mm-dd), set on
 *  first plan visit and used to compute the calendar dates. */
export const PLAN_START_KEY = "etea_plan_start_next";

/** Format a Date as a LOCAL yyyy-mm-dd key (no UTC conversion:
 *  Date.parse("2026-11-13") is UTC midnight, which is the previous
 *  evening in Pakistan). */
export function toLocalDateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Parse a local yyyy-mm-dd key back to a local-midnight Date, or
 *  null when the key is malformed. */
export function parseLocalDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format one calendar date for display (local timezone, browser
 *  locale). The year is shown only when it differs from the plan
 *  start year, so ranges crossing New Year stay unambiguous without
 *  repeating the year on every line. */
export function formatPlanDay(d: Date, refYear: number): string {
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === refYear
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" };
  return d.toLocaleDateString(undefined, opts);
}

/** Format an inclusive date range: a single date when start == end,
 *  else "start – end". */
export function formatPlanRange(start: Date, end: Date, refYear: number): string {
  if (start.getTime() === end.getTime()) return formatPlanDay(start, refYear);
  return `${formatPlanDay(start, refYear)} – ${formatPlanDay(end, refYear)}`;
}

// ---------- calendar: dates, rest days, catch-up days, cycles ----------

export type PlanCalendarEntry =
  | {
      kind: "study";
      /** 0-based index into PLAN21. */
      unitIndex: number;
      dayLabel: string;
      /** Local calendar dates (midnight local time). Inclusive. */
      startDate: Date;
      endDate: Date;
      /** The unit right after a rest day: redo anything missed. */
      catchUp: boolean;
      /** 12-week mode only: the Cycle 2 revisit window for this unit
       *  (same unit, second cycle, unseen/mixed practice). Null in
       *  3/6-week modes. */
      cycle2Start: Date | null;
      cycle2End: Date | null;
    }
  | { kind: "rest"; startDate: Date; endDate: Date };

function atMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/** Build the plan calendar: the 21 study units placed on consecutive
 *  calendar days from `start` (each unit spans `spread` days), with a
 *  rest day after every 6 units and the unit after each rest day
 *  marked as a catch-up day. In 12-week mode (`spread` 4) each unit
 *  also carries its Cycle 2 revisit window: the same unit revisited
 *  one full cycle later (the cycle-1 calendar length) with
 *  unseen-items/mixed-practice emphasis — the two cycles share one
 *  checkbox per task (see the 12-week banner copy on the plan page),
 *  so the 63-task count stays intact. Dates are LOCAL calendar dates;
 *  the caller formats them. Pure: same inputs → same calendar. */
export function buildPlanCalendar(start: Date, spread: 1 | 2 | 4): PlanCalendarEntry[] {
  const entries: PlanCalendarEntry[] = [];
  let cursor = atMidnight(start);
  const unitWindows: { start: Date; end: Date }[] = [];
  for (let i = 0; i < PLAN21.length; i++) {
    if (i > 0 && i % 6 === 0) {
      entries.push({ kind: "rest", startDate: cursor, endDate: cursor });
      cursor = addDays(cursor, 1);
    }
    const unitStart = cursor;
    const unitEnd = addDays(cursor, spread - 1);
    unitWindows.push({ start: unitStart, end: unitEnd });
    entries.push({
      kind: "study",
      unitIndex: i,
      dayLabel: PLAN21[i][0],
      startDate: unitStart,
      endDate: unitEnd,
      catchUp: i > 0 && i % 6 === 0,
      cycle2Start: null,
      cycle2End: null,
    });
    cursor = addDays(cursor, spread);
  }
  if (spread === 4) {
    // Cycle 2 = the same 21-unit calendar, one full cycle later. The
    // cycle length is the span from the first unit's start to the day
    // after the last unit's end (study days + rest days).
    const cycleLengthDays = Math.round((cursor.getTime() - unitWindows[0].start.getTime()) / 86400000);
    for (const e of entries) {
      if (e.kind !== "study") continue;
      e.cycle2Start = addDays(e.startDate, cycleLengthDays);
      e.cycle2End = addDays(e.endDate, cycleLengthDays);
    }
  }
  return entries;
}

/** Calendar totals from a built calendar: study days, rest days, and
 *  the total calendar span (all counted from real entries, never
 *  hardcoded). In 12-week mode the span covers BOTH cycles. */
export function planCalendarTotals(calendar: PlanCalendarEntry[]): {
  studyDays: number;
  restDays: number;
  totalDays: number;
} {
  let studyDays = 0;
  let restDays = 0;
  for (const e of calendar) {
    const span = Math.round((e.endDate.getTime() - e.startDate.getTime()) / 86400000) + 1;
    if (e.kind === "study") studyDays += span;
    else restDays += span;
  }
  const studyEntries = calendar.filter((e) => e.kind === "study");
  const last = studyEntries[studyEntries.length - 1];
  const totalDays =
    last && last.kind === "study" && last.cycle2End
      ? Math.round((last.cycle2End.getTime() - calendar[0].startDate.getTime()) / 86400000) + 1
      : studyDays + restDays;
  return { studyDays, restDays, totalDays };
}

// ---------- task deep links ----------

export type PlanTaskLinkKind = "library" | "practice" | "flashcards" | "mock" | "analysis";

export type PlanTaskLink = { href: string; kind: PlanTaskLinkKind };

// NOTES keys as they appear at the start of plan task text
// ("Islamiyat notes: …", "Pak Studies notes: …").
const NOTE_SUBJECT_WORDS = [
  "Islamiyat",
  "Pedagogy",
  "English",
  "Maths",
  "Pak Studies",
  "Urdu",
  "Tajweed",
  "Arabic",
  "General Science",
];

// BY_SUBJECT bank keys for the "<subject> quiz" task texts.
const QUIZ_SUBJECT_KEYS: Record<string, string> = {
  Islamiyat: "islamiyat",
  Pedagogy: "pedagogy",
  English: "english",
  Maths: "maths",
  "Pak Studies": "pakstudies",
  Urdu: "urdu",
  Tajweed: "tajweed",
};

/** Deep link for one plan task, from its (English) task text. Every
 *  one of the 63 PLAN21 tasks resolves — see test-step2b.mjs. Returns
 *  null only for text matching no known pattern (never invent a
 *  target); the caller then shows no link. Specific rules run before
 *  generic ones so subject-scoped links win over plain section links. */
export function planTaskLink(text: string): PlanTaskLink | null {
  // Mock days: the mock list (the plan's "Mock Test N" is generic —
  // it does not name a specific mock id, so link to the list, never
  // guess an id).
  if (/^Mock Test \d/.test(text)) return { href: "/mock", kind: "mock" };
  // Flashcards tasks.
  if (/^Flashcards/.test(text)) return { href: "/flashcards", kind: "flashcards" };
  // Weakest-topic / wrong-answer review: the Analysis page, where weak
  // areas and per-item attempt detail live.
  if (/weakest/i.test(text) || /^Review all wrong answers/.test(text)) {
    return { href: "/analysis", kind: "analysis" };
  }
  // "<Subject> notes: …" → that subject's Library notes.
  for (const word of NOTE_SUBJECT_WORDS) {
    if (text.startsWith(`${word} notes:`)) {
      return { href: `/library?subject=${encodeURIComponent(word)}`, kind: "library" };
    }
  }
  // "<Subject> quiz …" → that subject's practice drill.
  for (const [word, key] of Object.entries(QUIZ_SUBJECT_KEYS)) {
    if (text.startsWith(`${word} quiz`)) {
      return { href: `/practice?subject=${encodeURIComponent(key)}`, kind: "practice" };
    }
  }
  // Generic fallbacks, in order.
  if (/Mixed quiz/i.test(text)) return { href: "/practice", kind: "practice" };
  if (/notes/i.test(text)) return { href: "/library", kind: "library" };
  if (/quiz/i.test(text)) return { href: "/practice", kind: "practice" };
  if (/revise/i.test(text)) return { href: "/library", kind: "library" };
  return null;
}

/** First PLAN21 day (1-based) whose task text mentions `subjectName`
 *  (case-insensitive substring). Used for the Library's "related plan
 *  day" links. Null when no day mentions the subject — the caller
 *  omits the link rather than pointing at a wrong day. */
export function planDayForSubject(subjectName: string): number | null {
  const needle = subjectName.toLowerCase();
  for (let di = 0; di < PLAN21.length; di++) {
    for (const [, text] of PLAN21[di][1]) {
      if (text.toLowerCase().includes(needle)) return di + 1;
    }
  }
  return null;
}
