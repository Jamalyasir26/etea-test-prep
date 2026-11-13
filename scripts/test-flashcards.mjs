// Flashcard queue suite (Stage 2: FSRS) — plain node, no dependencies.
// Imports the real pure functions from src/lib/tracking.ts and
// src/lib/fsrs.ts (Node 23.6+ strips types on .ts imports) and the REAL
// ts-fsrs scheduler for the grading simulation. Proves: the session
// queue is built once (due cards earliest-first, then new cards), grading
// never re-sorts it and advances exactly one step, Learning/Relearning
// cards append to the END of the session (same-session relearning),
// Review cards do not, future-due cards stay out unless cram mode is on,
// and grade buttons show FSRS-computed intervals.
// Run: node scripts/test-flashcards.mjs  (exit 0 = all pass)
//
// REWORK NOTES (Stage 2) — every changed/deleted assertion from the old
// 29-check frozen-queue suite, and why:
// - DELETED: all 6 `nextDue` checks ("again" due today, "hard" 2 days,
//   "good" 3/7/14 ladder, "easy" 7/14/30 ladder). The fixed interval
//   ladder is INTENTIONALLY replaced by FSRS: intervals are computed by
//   the scheduler from stability/difficulty. Coverage moves to
//   test-fsrs.mjs (real transitions + due behavior) and to the
//   preview/grade-label checks below (buttons show computed intervals).
// - DELETED: the 2 old-signature `gradeButtonLabel(g, prevInterval)`
//   checks ("Again — review again this session", "Hard — 2 days"...).
//   The function now takes a pre-formatted FSRS interval label:
//   gradeButtonLabel(grade, intervalLabel, lang). Replaced by the
//   new-signature checks below (label embeds the given interval; Urdu
//   translations; no "SM-2").
// - CHANGED: the 2 `migrateFlashState` checks. The old function migrated
//   legacy `card-N` keys into the OLD shape; it is replaced by
//   convertFlashStateToFsrs, which migrates into the FSRS shape (due
//   preserved as an ISO datetime, counts reported). The `card-0` mapping
//   check below uses the new function; full migration coverage (counts,
//   idempotency, backup) lives in test-fsrs.mjs.
// - CHANGED: `buildSessionQueue(queue, state, todayString)` ->
//   `buildReviewQueue(cards, state, now: Date, opts)`. Same contract
//   (due-only default, cram appends future-due at the end), but due is
//   now a datetime, due cards sort earliest-first, and new cards follow
//   in bank order. The future-due/cram checks below use the new API.
// - CHANGED: `gradeCard(queue, pos, grade)` -> `advanceReviewQueue(queue,
//   pos, reviewedState)`. Advancement now depends on the POST-review
//   FSRS state, not the grade: Learning (1) and Relearning (3) append,
//   Review (2) does not. The 4-card simulation below drives it with REAL
//   scheduler results, so "hard" on a new card ALSO re-queues (Hard
//   leaves a new card in Learning) — the old suite's "only Again
//   re-queues" expectation was a fixed-ladder artifact, not a rule.
// - KEPT UNCHANGED: stable-id checks, no-re-sort / +1-advance /
//   end-of-session / out-of-range no-op checks (same invariants, new
//   function names).

import {
  advanceReviewQueue,
  buildReviewQueue,
  convertFlashStateToFsrs,
  countDueFlashcards,
  flashcardId,
  forecastDue,
  gradeButtonLabel,
  saveFlashState,
} from "../src/lib/tracking.ts";
import {
  formatFsrsInterval,
  freshFsrsCard,
  initFsrsScheduler,
  previewFsrsGrades,
  reviewFsrsCard,
} from "../src/lib/fsrs.ts";

const scheduler = await initFsrsScheduler();

// In-memory browser stub for countDueFlashcards (it reads stored state
// through loadFlashState). tracking.ts touches localStorage only inside
// functions, so installing the stub here — before any call — is enough.
const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  get length() {
    return store.size;
  },
  key: (i) => [...store.keys()][i] ?? null,
};

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const NOW = new Date("2026-11-12T09:00:00.000Z");
const cards = [1, 2, 3, 4].map((n) => ({
  front: `Card ${n} front`,
  back: `Card ${n} back`,
  category: n <= 2 ? "Pedagogy" : "Arabic",
}));
const ids = cards.map((c) => flashcardId(c.front, c.back));
const withIds = cards.map((c, i) => ({ ...c, id: ids[i] }));

// Stable ids: same content -> same id; different content -> different id.
check("stable id is deterministic", flashcardId("a", "b") === flashcardId("a", "b"));
check("stable id differs per card", new Set(ids).size === 4, `ids: ${ids.join(", ")}`);
check("stable id has fc- prefix", ids.every((id) => id.startsWith("fc-")));

// Legacy index-key migration: card-0 maps onto the first card's stable id,
// due preserved as an ISO datetime, counts reported.
const legacy = { "card-0": { grade: "good", due: "2026-11-14", interval: 3, reps: 1 } };
const mig = convertFlashStateToFsrs(legacy, cards, NOW);
check("legacy card-0 migrates to stable id", mig.state[ids[0]]?.dueAt === "2026-11-14T00:00:00.000Z", mig.state[ids[0]]?.dueAt);
check("legacy migration reports migrated=1", mig.counts.migrated === 1, JSON.stringify(mig.counts));

// --- Queue ordering: due earliest-first, then new cards, future-due out ---
function fsrsDue(dueAt, state = 2) {
  return { ...freshFsrsCard(NOW), dueAt, state };
}
const stateMixed = {
  [ids[1]]: fsrsDue("2026-11-20T00:00:00.000Z"), // future-due
  [ids[3]]: fsrsDue("2026-11-10T00:00:00.000Z"), // due, earliest
  [ids[0]]: fsrsDue("2026-11-12T08:00:00.000Z"), // due, later
  // ids[2]: no entry -> new card
};
const q = buildReviewQueue(withIds, stateMixed, NOW);
check("due cards come first, earliest dueAt first", q[0] === ids[3] && q[1] === ids[0], JSON.stringify(q));
check("new cards follow due cards in bank order", q[2] === ids[2], JSON.stringify(q));
check("future-due card excluded by default", !q.includes(ids[1]) && q.length === 3, JSON.stringify(q));
const cramQ = buildReviewQueue(withIds, stateMixed, NOW, { cram: true });
check("cram mode appends future-due cards at the end", cramQ.length === 4 && cramQ[3] === ids[1], JSON.stringify(cramQ));
const catQ = buildReviewQueue(withIds, stateMixed, NOW, { category: "Arabic" });
check("category filter restricts the queue", JSON.stringify(catQ) === JSON.stringify([ids[3], ids[2]]), JSON.stringify(catQ));
check("all-new bank has no cap: every new card is queued", buildReviewQueue(withIds, {}, NOW).length === 4);
check("due exactly now counts as due", buildReviewQueue(withIds, { [ids[0]]: fsrsDue(NOW.toISOString()) }, NOW).includes(ids[0]));
check("countDueFlashcards counts due + new (empty store -> all new)", countDueFlashcards(cards, NOW) === 4);
saveFlashState(Object.fromEntries(ids.map((id) => [id, fsrsDue("2026-12-01T00:00:00.000Z")])));
check("countDueFlashcards is 0 when every card is future-due", countDueFlashcards(cards, NOW) === 0);
store.clear();

// --- Core regression: 4 new cards, real FSRS grades Again/Hard/Good/Easy ---
const queue0 = buildReviewQueue(withIds, {}, NOW);
check("session queue holds all 4 new cards in order", JSON.stringify(queue0) === JSON.stringify(ids));

const grades = ["again", "hard", "good", "easy"];
let queue = queue0;
let pos = 0;
let state = {};
const firstPassShown = [];
for (const g of grades) {
  const before = [...queue];
  const id = queue[pos];
  firstPassShown.push(id);
  // Real scheduler result drives the advance, exactly like the page.
  const updated = reviewFsrsCard(scheduler, state[id] ?? null, g, NOW);
  state = { ...state, [id]: updated };
  const res = advanceReviewQueue(queue, pos, updated.state);
  check(
    `grade "${g}" does not re-sort the queue`,
    res.queue.slice(0, before.length).every((x, i) => x === before[i]),
  );
  check(`grade "${g}" advances exactly one step`, res.nextIndex === pos + 1, `nextIndex=${res.nextIndex}, pos=${pos}`);
  queue = res.queue;
  pos = res.nextIndex;
}
check(
  "first pass shows each of the 4 cards exactly once, in order",
  JSON.stringify(firstPassShown) === JSON.stringify(ids),
  `shown: ${JSON.stringify(firstPassShown)}`,
);
check(
  "Learning cards (Again + Hard on new cards) re-queue at the END",
  queue.length === 6 && queue[4] === ids[0] && queue[5] === ids[1],
  `queue: ${JSON.stringify(queue)}`,
);
check("relearning tail is shown after the first pass, not mid-queue", queue[pos] === ids[0]);
// Finish the tail: Easy graduates a Learning card to Review (no re-append).
const tailNow = new Date(NOW.getTime() + 60_000);
for (let t = 0; t < 2; t++) {
  const id = queue[pos];
  const updated = reviewFsrsCard(scheduler, state[id] ?? null, "easy", tailNow);
  check(`tail card graduates to Review on Easy (state ${updated.state})`, updated.state === 2, `state=${updated.state}`);
  const res = advanceReviewQueue(queue, pos, updated.state);
  queue = res.queue;
  pos = res.nextIndex;
}
check("session ends after the relearning tail", pos === queue.length && queue.length === 6, `pos=${pos}, len=${queue.length}`);

// advanceReviewQueue rules, driven directly by post-review state.
const base = ["a", "b", "c"];
const advReview = advanceReviewQueue(base, 0, 2);
check("Review state (2) does not append", JSON.stringify(advReview.queue) === JSON.stringify(base) && advReview.nextIndex === 1 && advReview.requeued === false);
const advLearning = advanceReviewQueue(base, 0, 1);
check("Learning state (1) appends to the end", JSON.stringify(advLearning.queue) === JSON.stringify(["a", "b", "c", "a"]) && advLearning.requeued === true);
const advRelearning = advanceReviewQueue(base, 1, 3);
check("Relearning state (3) appends to the end", JSON.stringify(advRelearning.queue) === JSON.stringify(["a", "b", "c", "b"]) && advRelearning.requeued === true);
check("New state (0) does not append", advanceReviewQueue(base, 0, 0).queue.length === 3);

// Out-of-range advance is a no-op (never crashes the session).
const oob = advanceReviewQueue(queue, 99, 2);
check("out-of-range advance is a no-op", oob.nextIndex === 99 && oob.queue.length === 6);

// --- Grade buttons show FSRS-computed intervals ---
const previews = previewFsrsGrades(scheduler, null, NOW);
const againLabel = formatFsrsInterval(previews.find((p) => p.grade === "again").dueAt - NOW, "en");
const easyLabel = formatFsrsInterval(previews.find((p) => p.grade === "easy").dueAt - NOW, "en");
check("preview Again interval for a new card is 1m", againLabel === "1m", againLabel);
check(
  "grade buttons embed the computed interval",
  gradeButtonLabel("again", againLabel, "en") === "Again — 1m" &&
    gradeButtonLabel("easy", easyLabel, "en") === `Easy — ${easyLabel}`,
  `${gradeButtonLabel("again", againLabel, "en")} / ${gradeButtonLabel("easy", easyLabel, "en")}`,
);
check(
  "grade buttons translate the grade name (ur)",
  gradeButtonLabel("again", "1m", "ur").startsWith("دوبارہ") && gradeButtonLabel("good", "3d", "ur").startsWith("اچھا"),
  gradeButtonLabel("again", "1m", "ur"),
);
check(
  "grade buttons fall back to English for roman",
  gradeButtonLabel("hard", "2d", "roman") === "Hard — 2d",
  gradeButtonLabel("hard", "2d", "roman"),
);
check(
  'no "SM-2" wording in grade labels',
  ["again", "hard", "good", "easy"].every((g) => !gradeButtonLabel(g, "1d", "en").includes("SM-2")),
);

// ---- forecastDue (Stage 3 part 2 — due-forecast chart data) ----
// Fixture "now" is a fixed LOCAL noon (timezone-proof: noon stays on
// the same calendar day in every zone). Cards: A due in 2 days, B
// overdue, C new (no state), D due in 10 days (beyond the 7-day
// window). State entries carry only dueAt — forecastDue reads nothing
// else from them.
const FC_NOW = new Date(2026, 10, 13, 12, 0, 0); // 13 Nov 2026, noon local
const isoAtNoon = (y, m, d) => new Date(y, m, d, 12, 0, 0).toISOString();
const fcCards = [
  { front: "A?", back: "A!", category: "Test" },
  { front: "B?", back: "B!", category: "Test" },
  { front: "C?", back: "C!", category: "Test" },
  { front: "D?", back: "D!", category: "Test" },
];
const fcState = {
  [flashcardId("A?", "A!")]: { dueAt: isoAtNoon(2026, 10, 15) },
  [flashcardId("B?", "B!")]: { dueAt: isoAtNoon(2026, 10, 10) },
  [flashcardId("D?", "D!")]: { dueAt: isoAtNoon(2026, 10, 23) },
};
const fc = forecastDue(fcCards, fcState, FC_NOW, 7);
check("forecastDue returns 7 days", fc.length === 7, JSON.stringify(fc));
check(
  "forecastDue day labels start today (local)",
  fc[0].date === "2026-11-13" && fc[0].label === "11-13" && fc[6].date === "2026-11-19",
  JSON.stringify(fc.map((d) => d.date)),
);
check(
  "forecastDue: overdue + new cards count toward today",
  fc[0].due === 2, // B (overdue) + C (new)
  JSON.stringify(fc[0]),
);
check("forecastDue: card due in 2 days lands on day 2", fc[2].due === 1, JSON.stringify(fc[2]));
check(
  "forecastDue: no cards on the other days",
  fc[1].due === 0 && fc[3].due === 0 && fc[4].due === 0 && fc[5].due === 0 && fc[6].due === 0,
  JSON.stringify(fc),
);
check(
  "forecastDue: card beyond the window is not counted (total = 3, not 4)",
  fc.reduce((s, d) => s + d.due, 0) === 3,
  JSON.stringify(fc.map((d) => d.due)),
);
const fcEmpty = forecastDue([], {}, FC_NOW, 7);
check(
  "forecastDue: empty bank returns 7 zero-count days (never invents data)",
  fcEmpty.length === 7 && fcEmpty.every((d) => d.due === 0),
  JSON.stringify(fcEmpty),
);

if (failures > 0) {
  console.log(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll flashcard queue checks passed.");
