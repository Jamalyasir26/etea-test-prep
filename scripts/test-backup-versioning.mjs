// Backup versioning tests (Stage 1 P2, updated Stage 2) — plain node,
// no dependencies. Imports the real functions from src/lib/tracking.ts
// (Node strips types on .ts imports; tracking.ts touches localStorage
// only inside functions, so a small in-memory localStorage + window
// stub is enough — same pattern as scripts/test-storage.mjs).
// Covers: BACKUP_VERSION / SUPPORTED_BACKUP_VERSIONS constants; the
// v4 -> v5 -> v6 migration chain (defaults added, flash entries
// converted to the FSRS shape with due dates preserved, input
// unmutated); v6 identity; v7+ rejection with a clear message AND
// stored data untouched; corrupt / wrong-marker / missing-attempts
// rejection without touching stored data; v4, v5 and v6 files restore
// end to end.
// Run: node scripts/test-backup-versioning.mjs  (exit 0 = all pass)

// --- browser stub (must exist before the import runs) ---
const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    store.set(k, String(v));
  },
  removeItem: (k) => {
    store.delete(k);
  },
};
const realWarn = console.warn;
console.warn = () => {};

const {
  BACKUP_VERSION,
  SUPPORTED_BACKUP_VERSIONS,
  migrateBackupPayload,
  migrateV4ToV5,
  migrateV5ToV6,
  validateBackupPayload,
  exportProgress,
  importProgress,
  loadAttempts,
  loadFlashState,
} = await import("../src/lib/tracking.ts");

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
function snapshot() {
  return JSON.stringify([...store.entries()].sort());
}
function attempt(id) {
  return { id, kind: "quiz", title: "T", total: 20, correct: 10, seconds: 60, date: "2026-11-12" };
}

// 1. Constants.
check("BACKUP_VERSION is 6", BACKUP_VERSION === 6);
check(
  "SUPPORTED_BACKUP_VERSIONS is [4, 5, 6]",
  JSON.stringify([...SUPPORTED_BACKUP_VERSIONS]) === "[4,5,6]",
);
check("exportProgress stamps BACKUP_VERSION", JSON.parse(exportProgress()).version === BACKUP_VERSION);

// 2. Migration chain: v4 -> v5 -> v6, input unmutated; flash entries
// convert to the FSRS shape with due dates preserved.
const v4 = { app: "etea-prep-next", version: 4, attempts: [] };
const migrated = migrateBackupPayload(v4);
check("v4 migrates to version 6 (chained)", migrated.version === 6);
check("v4 migration adds empty reviews", JSON.stringify(migrated.reviews) === "{}");
check(
  "v4 migration adds empty annotations",
  JSON.stringify(migrated.annotations) === JSON.stringify({ notes: {}, includeInTutor: false }),
);
check("v4 migration does not mutate its input", v4.version === 4 && !("reviews" in v4));
check("v4 migration keeps other fields", migrated.app === "etea-prep-next" && Array.isArray(migrated.attempts));
check("migrateV4ToV5 alone lands on version 5", migrateV4ToV5(v4).version === 5);
const v5legacy = {
  app: "etea-prep-next",
  version: 5,
  attempts: [],
  flashcards: { "fc-x": { grade: "good", due: "2026-11-10", interval: 3, reps: 2 } },
};
const v6from5 = migrateV5ToV6(v5legacy);
check("migrateV5ToV6 lands on version 6", v6from5.version === 6);
check(
  "v5->v6 converts legacy flash entry, due preserved exactly",
  v6from5.flashcards["fc-x"].dueAt === "2026-11-10T00:00:00.000Z" && v6from5.flashcards["fc-x"].state === 2 && v6from5.flashcards["fc-x"].reps === 2,
  JSON.stringify(v6from5.flashcards["fc-x"]),
);
check("v5->v6 does not mutate its input", v5legacy.flashcards["fc-x"].due === "2026-11-10" && !("dueAt" in v5legacy.flashcards["fc-x"]));
check("v5 legacy flash migrates through the chain too", migrateBackupPayload(v5legacy).flashcards["fc-x"].dueAt === "2026-11-10T00:00:00.000Z");

// 3. Migration: v6 identity, v5 -> v6, v3 lenient path.
const v6 = { app: "etea-prep-next", version: 6, attempts: [], reviews: { a: 1 } };
check("v6 passes through unchanged", migrateBackupPayload(v6) === v6);
const v5 = { app: "etea-prep-next", version: 5, attempts: [], reviews: { a: 1 } };
check("v5 migrates to version 6", migrateBackupPayload(v5).version === 6);
check("v5 migration keeps reviews", JSON.stringify(migrateBackupPayload(v5).reviews) === JSON.stringify({ a: 1 }));
const v3 = { app: "etea-prep-next", version: 3, attempts: [] };
check("v3 migrates with defaults", migrateBackupPayload(v3).version === 6 && JSON.stringify(migrateBackupPayload(v3).reviews) === "{}");

// 4. Validation.
check("valid v6 passes validation", validateBackupPayload(v6) === null);
check("valid v5 passes validation", validateBackupPayload(v5) === null);
check("valid v4 passes validation", validateBackupPayload(v4) === null);
check("v7 fails validation with a clear message", (validateBackupPayload({ ...v6, version: 7 }) ?? "").includes("newer than this build"));
check("wrong app marker fails validation", validateBackupPayload({ ...v5, app: "other" }) !== null);
check("missing attempts fails validation", validateBackupPayload({ app: "etea-prep-next", version: 5 }) !== null);
check("non-numeric version fails validation", validateBackupPayload({ ...v5, version: "5" }) !== null);
check("null fails validation", validateBackupPayload(null) !== null);
check("array fails validation", validateBackupPayload([]) !== null);

// 5. Rejection never touches stored data.
store.clear();
store.set("etea_attempts_next", JSON.stringify([attempt("keep-me")]));
const before = snapshot();
const r7 = importProgress(JSON.stringify({ app: "etea-prep-next", version: 7, attempts: [attempt("x")] }));
check("v7 import rejected", r7.ok === false && (r7.error ?? "").includes("newer than this build"));
check("v7 rejection leaves stored data untouched", snapshot() === before);
const rCorrupt = importProgress("{not json");
check("corrupt JSON rejected", rCorrupt.ok === false);
check("corrupt rejection leaves stored data untouched", snapshot() === before);
const rMarker = importProgress(JSON.stringify({ app: "nope", version: 5, attempts: [] }));
check("wrong-marker import rejected", rMarker.ok === false);
check("wrong-marker rejection leaves stored data untouched", snapshot() === before);
check("kept attempt still loads", loadAttempts().some((a) => a.id === "keep-me"));

// 6. End-to-end restore: v4 file (no reviews/annotations), v5 file
// (legacy flash entries migrate to FSRS), and v6 file.
store.clear();
const rV4 = importProgress(JSON.stringify({ app: "etea-prep-next", version: 4, attempts: [attempt("v4-one")], plan: { "d0-t0": true } }));
check("v4 file restores ok", rV4.ok === true, rV4.error ?? "");
check("v4 attempt merged", loadAttempts().some((a) => a.id === "v4-one"));
check("v4 restore counts zero reviews", rV4.counts?.reviews === 0);
store.clear();
const rV5 = importProgress(
  JSON.stringify({
    app: "etea-prep-next",
    version: 5,
    attempts: [attempt("v5-one")],
    reviews: { "ISL-001": { reviewStatus: "owner-reviewed", reviewedBy: "owner", reviewedAt: "2026-11-11T22:01:56Z" } },
    annotations: { notes: { "k": "note" }, includeInTutor: false },
    flashcards: { "fc-legacy": { grade: "hard", due: "2026-11-09", interval: 2, reps: 1 } },
  }),
);
check("v5 file restores ok", rV5.ok === true, rV5.error ?? "");
check("v5 attempt merged", loadAttempts().some((a) => a.id === "v5-one"));
check("v5 review merged", rV5.counts?.reviews === 1);
check("v5 annotation merged", rV5.counts?.annotations === 1);
const restoredFlash = loadFlashState()["fc-legacy"];
check(
  "v5 legacy flash entry restores as FSRS state, due preserved",
  restoredFlash?.dueAt === "2026-11-09T00:00:00.000Z" && restoredFlash?.state === 2 && restoredFlash?.reps === 1,
  JSON.stringify(restoredFlash),
);
store.clear();
const rV6 = importProgress(
  JSON.stringify({
    app: "etea-prep-next",
    version: 6,
    attempts: [attempt("v6-one")],
    flashcards: {},
  }),
);
check("v6 file restores ok", rV6.ok === true, rV6.error ?? "");
check("v6 attempt merged", loadAttempts().some((a) => a.id === "v6-one"));

// 7. Export -> import round trip (self-consistency).
store.clear();
const exported = exportProgress();
const rRound = importProgress(exported);
check("export/import round trip ok", rRound.ok === true, rRound.error ?? "");

console.warn = realWarn;
console.log(failures === 0 ? `\nAll backup versioning tests passed.` : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
