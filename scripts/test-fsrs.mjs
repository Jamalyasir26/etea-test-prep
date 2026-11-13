// FSRS suite (Stage 2) — exercises the REAL ts-fsrs 6.0.0 scheduler:
// grade transitions, same-day learning steps, preview determinism,
// review() purity, the Date-deserialization requirement, the seed-drift
// guard, interval formatting, and migration counts from fixtures.
// Run: node scripts/test-fsrs.mjs

// localStorage stub BEFORE importing tracking.ts (same pattern as
// test-storage.mjs). The stub is a plain Map-backed object.
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

const fsrs = await import("../src/lib/fsrs.ts");
const tracking = await import("../src/lib/tracking.ts");

let failures = 0;
function check(name, ok, extra = "") {
  if (ok) console.log("PASS ", name);
  else {
    failures++;
    console.log("FAIL ", name, extra);
  }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const DAY = 86_400_000;
const NOW = new Date("2026-11-12T09:00:00.000Z");

const scheduler = await fsrs.initFsrsScheduler();
check("scheduler initializes", scheduler != null && typeof scheduler.review === "function");
check("FSRS label is FSRS-7", fsrs.FSRS_LABEL === "FSRS-7", fsrs.FSRS_LABEL);
check("library version label is ts-fsrs 6.0.0", fsrs.FSRS_LIBRARY_VERSION === "ts-fsrs 6.0.0", fsrs.FSRS_LIBRARY_VERSION);
check("initFsrsScheduler caches the instance", (await fsrs.initFsrsScheduler()) === scheduler);

// --- Seed-drift guard: the literal seed defaults must match a real newCard() ---
const real = scheduler.newCard({ now: NOW });
const seed = fsrs.freshFsrsCard(NOW);
for (const field of ["stability", "stabilityFast", "difficulty", "learningStep", "reps", "lapses", "scheduledDays"]) {
  check(`seed ${field} matches newCard()`, seed[field] === real[field], `${seed[field]} vs ${real[field]}`);
}
check("seed state matches newCard() (New=0)", seed.state === real.state && seed.state === 0);
check('seed scheduleStatus matches newCard() ("new")', seed.scheduleStatus === real.scheduleStatus && seed.scheduleStatus === "new");
check("seed lastReviewAt is null like newCard()", seed.lastReviewAt === null && real.lastReviewAt === null);

// --- Fresh-card transitions (one grade each, same fixed now) ---
const again = fsrs.reviewFsrsCard(scheduler, null, "again", NOW);
const hard = fsrs.reviewFsrsCard(scheduler, null, "hard", NOW);
const good = fsrs.reviewFsrsCard(scheduler, null, "good", NOW);
const easy = fsrs.reviewFsrsCard(scheduler, null, "easy", NOW);
check("Again: Learning (1)", again.state === 1, String(again.state));
check("Again: learningStep 0", again.learningStep === 0);
check("Again: due in ~1m (first learning step)", Math.abs(new Date(again.dueAt) - NOW - 60_000) < 1000, again.dueAt);
check("Hard: Learning (1)", hard.state === 1, String(hard.state));
check("Hard: due between 1m and 1d", new Date(hard.dueAt) - NOW > 60_000 && new Date(hard.dueAt) - NOW < DAY, hard.dueAt);
check("Good: Review (2)", good.state === 2, String(good.state));
check("Good: due between 1d and 10d", new Date(good.dueAt) - NOW > DAY && new Date(good.dueAt) - NOW < 10 * DAY, good.dueAt);
check("Easy: Review (2)", easy.state === 2, String(easy.state));
check("Easy: due after Good", new Date(easy.dueAt) > new Date(good.dueAt));
check("Difficulty: Again > Good > Easy", again.difficulty > good.difficulty && good.difficulty > easy.difficulty, `${again.difficulty}/${good.difficulty}/${easy.difficulty}`);
check("Stability: Easy > Good > Again", easy.stability > good.stability && good.stability > again.stability, `${easy.stability}/${good.stability}/${again.stability}`);
check("All four grades: reps 1", [again, hard, good, easy].every((c) => c.reps === 1));
check("All four grades: lastReviewAt = review time", [again, hard, good, easy].every((c) => c.lastReviewAt === NOW.toISOString()));
check("All four grades: lapses 0", [again, hard, good, easy].every((c) => c.lapses === 0));
check("All four grades: serialize round-trips through the guard", [again, hard, good, easy].every((c) => fsrs.isFsrsCardState(c)));

// --- Same-day learning steps: Again -> Good -> Good graduates ---
const t1 = new Date(NOW.getTime() + 60_000); // due after Again
const step1 = fsrs.reviewFsrsCard(scheduler, again, "good", t1);
check("Good at step 0: still Learning", step1.state === 1, String(step1.state));
check("Good at step 0: learningStep 1", step1.learningStep === 1);
const step1Wait = new Date(step1.dueAt) - t1;
check("Good at step 0: next due 10m..60m (10m step is a floor, FSRS-7 computes from stability)", step1Wait >= 10 * 60_000 && step1Wait <= 60 * 60_000, `${Math.round(step1Wait / 60000)}m`);
const t2 = new Date(step1.dueAt);
const graduated = fsrs.reviewFsrsCard(scheduler, step1, "good", t2);
check("Good at step 1: graduates to Review", graduated.state === 2, String(graduated.state));
check("Graduation: scheduledDays 1", graduated.scheduledDays === 1, String(graduated.scheduledDays));
check("Graduation: due ~1d after review", Math.abs(new Date(graduated.dueAt) - t2 - DAY) < 3600_000, graduated.dueAt);

// --- Lapse: Review + Again -> Relearning, lapses 1, due +10m ---
const t3 = new Date(good.dueAt);
const lapsed = fsrs.reviewFsrsCard(scheduler, good, "again", t3);
check("Review+Again: Relearning (3)", lapsed.state === 3, String(lapsed.state));
check("Review+Again: lapses 1", lapsed.lapses === 1);
check("Review+Again: due in ~10m (relearning step)", Math.abs(new Date(lapsed.dueAt) - t3 - 600_000) < 1000, lapsed.dueAt);
check("Review+Again: stability drops", lapsed.stability < good.stability, `${lapsed.stability} vs ${good.stability}`);

// --- Preview determinism: preview intervals == review outcomes (fuzz off) ---
for (const grade of ["again", "hard", "good", "easy"]) {
  const preview = fsrs.previewFsrsGrades(scheduler, null, NOW).find((p) => p.grade === grade);
  const applied = fsrs.reviewFsrsCard(scheduler, null, grade, NOW);
  check(`preview(${grade}) dueAt == review(${grade}) dueAt`, preview.dueAt.getTime() === new Date(applied.dueAt).getTime(), `${preview.dueAt.toISOString()} vs ${applied.dueAt}`);
  check(`preview(${grade}) state == review(${grade}) state`, preview.state === applied.state);
}
const previews = fsrs.previewFsrsGrades(scheduler, null, NOW);
check("preview returns 4 grades in Again/Hard/Good/Easy order", eq(previews.map((p) => p.grade), ["again", "hard", "good", "easy"]));
const previewsAgain = fsrs.previewFsrsGrades(scheduler, null, NOW);
check("preview is deterministic (same now, same result)", eq(previews.map((p) => p.dueAt.getTime()), previewsAgain.map((p) => p.dueAt.getTime())));

// --- review() purity: the input stored card is never mutated ---
const inputCard = fsrs.reviewFsrsCard(scheduler, null, "good", NOW);
const before = JSON.stringify(inputCard);
fsrs.reviewFsrsCard(scheduler, inputCard, "again", new Date(inputCard.dueAt));
check("reviewFsrsCard does not mutate its input", JSON.stringify(inputCard) === before);

// --- Deserialization requirement: review() rejects string dates ---
let stringDateRejected = false;
try {
  const plain = { ...scheduler.newCard({ now: NOW }), dueAt: NOW.toISOString(), lastReviewAt: null };
  scheduler.review({ card: plain, grade: 3, now: NOW });
} catch (e) {
  stringDateRejected = /valid Date/i.test(String(e?.message ?? e));
}
check("scheduler.review() rejects string dueAt (deserialization is mandatory)", stringDateRejected);
check("deserializeFsrsCard rejects a stored card with a bad dueAt", fsrs.deserializeFsrsCard({ ...good, dueAt: "not-a-date" }) === null);
check("deserializeFsrsCard returns Dates, not strings", (() => {
  const d = fsrs.deserializeFsrsCard(good);
  return d !== null && d.dueAt instanceof Date && d.lastReviewAt instanceof Date;
})());
check("deserializeFsrsCard rejects non-objects", fsrs.deserializeFsrsCard(null) === null && fsrs.deserializeFsrsCard(42) === null);

// --- Interval formatting ---
const fmt = fsrs.formatFsrsInterval;
check("fmt 0 -> 1m", fmt(0, "en") === "1m", fmt(0, "en"));
check("fmt 59s -> 1m", fmt(59_000, "en") === "1m");
check("fmt 90s -> 2m", fmt(90_000, "en") === "2m", fmt(90_000, "en"));
check("fmt 10m -> 10m", fmt(600_000, "en") === "10m");
check("fmt 1h -> 1h", fmt(3_600_000, "en") === "1h");
check("fmt 14.3h -> 14h", fmt(51_480_000, "en") === "14h", fmt(51_480_000, "en"));
check("fmt 1d -> 1d", fmt(DAY, "en") === "1d");
check("fmt 4.78d -> 4.8d", fmt(4.78 * DAY, "en") === "4.8d", fmt(4.78 * DAY, "en"));
check("fmt 10d -> 10d", fmt(10 * DAY, "en") === "10d");
check("fmt 45d -> 1.5mo", fmt(45 * DAY, "en") === "1.5mo", fmt(45 * DAY, "en"));
check("fmt 400d -> 1.1y", fmt(400 * DAY, "en") === "1.1y", fmt(400 * DAY, "en"));
check("fmt negative -> 1m", fmt(-5000, "en") === "1m");
check("fmt ur 10m", fmt(600_000, "ur") === "10 منٹ", fmt(600_000, "ur"));
check("fmt ur 1d", fmt(DAY, "ur") === "1 دن", fmt(DAY, "ur"));
check("fmt roman = en units", fmt(600_000, "roman") === "10m");

// --- Migration counts from fixtures (convertFlashStateToFsrs) ---
const cards = [
  { front: "Q1", back: "A1", category: "Islamiyat" },
  { front: "Q2", back: "A2", category: "Islamiyat" },
  { front: "Q3", back: "A3", category: "Arabic" },
  { front: "Q4", back: "A4", category: "Arabic" },
];
const id1 = tracking.flashcardId("Q1", "A1");
const id2 = tracking.flashcardId("Q2", "A2");
const id3 = tracking.flashcardId("Q3", "A3");
const keptCard = fsrs.reviewFsrsCard(scheduler, null, "good", NOW);
const raw = {
  [id1]: { grade: "good", due: "2026-11-10", interval: 3, reps: 2 },
  "card-1": { grade: "hard", due: "2026-11-12", interval: 2, reps: 1 },
  [id3]: { grade: "good" }, // malformed: no usable due -> reset
  [tracking.flashcardId("Q4", "A4")]: keptCard, // already FSRS-shaped -> kept
};
const converted = tracking.convertFlashStateToFsrs(raw, cards, NOW);
check("migration counts {migrated 2, reset 1, kept 1}", eq(converted.counts, { migrated: 2, reset: 1, kept: 1 }), JSON.stringify(converted.counts));
check("migrated card keeps due EXACTLY (midnight UTC)", converted.state[id1].dueAt === "2026-11-10T00:00:00.000Z", converted.state[id1].dueAt);
check("legacy card-1 key maps to bank index 1", converted.state[id2].dueAt === "2026-11-12T00:00:00.000Z");
check("migrated card keeps reps", converted.state[id1].reps === 2);
check("migrated card keeps old interval as scheduledDays", converted.state[id1].scheduledDays === 3);
check("migrated card restarts stability/difficulty", converted.state[id1].stability === 0 && converted.state[id1].difficulty === 0);
check("migrated card lastReviewAt is null (old shape never stored it)", converted.state[id1].lastReviewAt === null);
check("migrated card state is Review", converted.state[id1].state === 2);
check("reset card is a fresh card due now", converted.state[id3].state === 0 && converted.state[id3].reps === 0 && Math.abs(new Date(converted.state[id3].dueAt) - NOW) < 1000);
check("kept card passes through verbatim", eq(converted.state[tracking.flashcardId("Q4", "A4")], keptCard));
const reconverted = tracking.convertFlashStateToFsrs(converted.state, cards, NOW);
check("migration is idempotent (counts all kept)", eq(reconverted.counts, { migrated: 0, reset: 0, kept: 4 }), JSON.stringify(reconverted.counts));
check("migration is idempotent (state unchanged)", eq(reconverted.state, converted.state));
check("empty raw state -> empty state, zero counts", eq(tracking.convertFlashStateToFsrs({}, cards, NOW).counts, { migrated: 0, reset: 0, kept: 0 }));
check("non-object raw -> empty state, zero counts", tracking.convertFlashStateToFsrs(null, cards, NOW).state != null && eq(tracking.convertFlashStateToFsrs(null, cards, NOW).counts, { migrated: 0, reset: 0, kept: 0 }));

// --- runFlashMigration: verbatim backup, once, never overwritten ---
store.clear();
const rawText = JSON.stringify(raw);
store.set("etea_flash_next", rawText);
const run1 = tracking.runFlashMigration(cards, NOW);
check("runFlashMigration returns counts", run1.info !== null && run1.info.migrated === 2 && run1.info.reset === 1 && run1.info.kept === 1, JSON.stringify(run1.info));
check("backup key holds the raw text VERBATIM", store.get("etea_flashcards_v5_backup") === rawText);
check("stored state is the converted state", eq(JSON.parse(store.get("etea_flash_next")), run1.state));
check("backupFailed false on success", run1.info.backupFailed === false);
const run2 = tracking.runFlashMigration(cards, NOW);
check("second run: backup NOT overwritten", store.get("etea_flashcards_v5_backup") === rawText);
check("second run: no migration info (nothing changed -> no banner)", run2.info === null);
check("second run: state unchanged", eq(run2.state, run1.state));

console.log(failures === 0 ? "\nALL FSRS CHECKS PASSED" : `\n${failures} FSRS CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
