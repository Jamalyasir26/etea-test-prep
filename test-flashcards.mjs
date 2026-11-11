// Flashcard queue regression test — plain node, no dependencies.
// Imports the real pure functions from src/lib/tracking.ts (Node 23.6+
// strips types on .ts imports; tracking.ts has no runtime imports and
// touches localStorage only inside functions, so importing it is safe).
// Proves the Phase 1 audit bug is fixed: 4 new cards are each shown
// exactly once, in order, under grades Again/Hard/Good/Easy — grading
// never re-sorts the live queue and never double-advances. "Again" appends
// the card to the END of the session (same-session relearning) instead of
// jumping the queue.
// Run: node scripts/test-flashcards.mjs  (exit 0 = all pass)
import {
  buildSessionQueue,
  flashcardId,
  gradeButtonLabel,
  gradeCard,
  migrateFlashState,
  nextDue,
} from "../src/lib/tracking.ts";

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const TODAY = "2026-11-11";
const cards = [1, 2, 3, 4].map((n) => ({
  front: `Card ${n} front`,
  back: `Card ${n} back`,
  category: "Pedagogy",
}));
const ids = cards.map((c) => flashcardId(c.front, c.back));
const withIds = cards.map((c, i) => ({ ...c, id: ids[i] }));

// Stable ids: same content -> same id; different content -> different id.
check("stable id is deterministic", flashcardId("a", "b") === flashcardId("a", "b"));
check("stable id differs per card", new Set(ids).size === 4, `ids: ${ids.join(", ")}`);
check("stable id has fc- prefix", ids.every((id) => id.startsWith("fc-")));

// Legacy index-key migration: card-0 maps onto the first card's stable id.
const legacy = { "card-0": { grade: "good", due: "2026-11-14", interval: 3, reps: 1 } };
const mig = migrateFlashState(legacy, cards);
check("legacy card-0 migrates to stable id", mig.state[ids[0]]?.due === "2026-11-14");
check("legacy migration reports migrated=true", mig.migrated === true);

// Due-only default: a future-due card is NOT in the live queue.
const stateWithFuture = { [ids[1]]: { grade: "good", due: "2026-11-20", interval: 3, reps: 1 } };
const dueOnly = buildSessionQueue(withIds, stateWithFuture, TODAY);
check("future-due card excluded by default", !dueOnly.includes(ids[1]) && dueOnly.length === 3);
const cram = buildSessionQueue(withIds, stateWithFuture, TODAY, { cram: true });
check("cram mode appends future-due cards at the end", cram.length === 4 && cram[3] === ids[1]);

// --- Core regression: 4 new cards, grades Again/Hard/Good/Easy ---
const queue0 = buildSessionQueue(withIds, {}, TODAY);
check("session queue holds all 4 new cards in order", JSON.stringify(queue0) === JSON.stringify(ids));

const grades = ["again", "hard", "good", "easy"];
let queue = queue0;
let pos = 0;
const firstPassShown = [];
for (const g of grades) {
  const before = [...queue];
  firstPassShown.push(queue[pos]);
  const res = gradeCard(queue, pos, g);
  // No re-sort: the queue prefix is unchanged by grading.
  check(
    `grade "${g}" does not re-sort the queue`,
    res.queue.slice(0, before.length).every((id, i) => id === before[i]),
  );
  // No double-advance: the next card is exactly the immediate successor.
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
  '"again" re-queues the card at the END of the session',
  queue.length === 5 && queue[4] === ids[0],
  `queue: ${JSON.stringify(queue)}`,
);
check("relearning tail is shown after the first pass, not mid-queue", queue[pos] === ids[0]);
// Finish the relearning tail: grading it again ends the session.
const tail = gradeCard(queue, pos, "good");
check("session ends after the relearning tail", tail.nextIndex === queue.length && tail.queue.length === 5);

// Out-of-range grading is a no-op (never crashes the session).
const oob = gradeCard(queue, 99, "good");
check("out-of-range grade is a no-op", oob.nextIndex === 99 && oob.queue.length === 5);

// Scheduling + honest labels.
check('"again" is due today (0 days), not +1 day', nextDue("again", 0, new Date(`${TODAY}T00:00:00Z`)).due === TODAY);
check('"again" interval is 0', nextDue("again", 5).interval === 0);
check('"hard" is 2 days', nextDue("hard", 0).interval === 2);
check('"good" from new is 3 days', nextDue("good", 0).interval === 3);
check('"good" ladder reaches 7 then 14', nextDue("good", 3).interval === 7 && nextDue("good", 7).interval === 14);
check('"easy" ladder is 7/14/30', nextDue("easy", 0).interval === 7 && nextDue("easy", 7).interval === 14 && nextDue("easy", 14).interval === 30);
check(
  "grade buttons show the resulting interval",
  gradeButtonLabel("again", 0) === "Again — review again this session" &&
    gradeButtonLabel("hard", 0) === "Hard — 2 days" &&
    gradeButtonLabel("good", 0) === "Good — 3 days" &&
    gradeButtonLabel("easy", 0) === "Easy — 7 days",
);
check(
  'no "SM-2" wording in grade labels',
  ["again", "hard", "good", "easy"].every((g) => !gradeButtonLabel(g, 0).includes("SM-2")),
);

if (failures > 0) {
  console.log(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll flashcard queue checks passed.");
