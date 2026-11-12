// Backup versioning tests (Stage 1 P2) — plain node, no dependencies.
// Imports the real functions from src/lib/tracking.ts (Node strips types
// on .ts imports; tracking.ts touches localStorage only inside functions,
// so a small in-memory localStorage + window stub is enough — same
// pattern as scripts/test-storage.mjs).
// Covers: BACKUP_VERSION / SUPPORTED_BACKUP_VERSIONS constants; v4 ->
// v5 migration (defaults added, input unmutated); v5 identity; v6+
// rejection with a clear message AND stored data untouched; corrupt /
// wrong-marker / missing-attempts rejection without touching stored
// data; v4 and v5 files restore end to end.
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
  validateBackupPayload,
  exportProgress,
  importProgress,
  loadAttempts,
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
check("BACKUP_VERSION is 5", BACKUP_VERSION === 5);
check(
  "SUPPORTED_BACKUP_VERSIONS is [4, 5]",
  JSON.stringify([...SUPPORTED_BACKUP_VERSIONS]) === "[4,5]",
);
check("exportProgress stamps BACKUP_VERSION", JSON.parse(exportProgress()).version === BACKUP_VERSION);

// 2. Migration: v4 -> v5 shape, input unmutated.
const v4 = { app: "etea-prep-next", version: 4, attempts: [] };
const migrated = migrateBackupPayload(v4);
check("v4 migrates to version 5", migrated.version === 5);
check("v4 migration adds empty reviews", JSON.stringify(migrated.reviews) === "{}");
check(
  "v4 migration adds empty annotations",
  JSON.stringify(migrated.annotations) === JSON.stringify({ notes: {}, includeInTutor: false }),
);
check("v4 migration does not mutate its input", v4.version === 4 && !("reviews" in v4));
check("v4 migration keeps other fields", migrated.app === "etea-prep-next" && Array.isArray(migrated.attempts));

// 3. Migration: v5 identity, v3 lenient path.
const v5 = { app: "etea-prep-next", version: 5, attempts: [], reviews: { a: 1 } };
check("v5 passes through unchanged", migrateBackupPayload(v5) === v5);
const v3 = { app: "etea-prep-next", version: 3, attempts: [] };
check("v3 migrates with defaults", migrateBackupPayload(v3).version === 5 && JSON.stringify(migrateBackupPayload(v3).reviews) === "{}");

// 4. Validation.
check("valid v5 passes validation", validateBackupPayload(v5) === null);
check("valid v4 passes validation", validateBackupPayload(v4) === null);
check("v6 fails validation with a clear message", (validateBackupPayload({ ...v5, version: 6 }) ?? "").includes("newer than this build"));
check("wrong app marker fails validation", validateBackupPayload({ ...v5, app: "other" }) !== null);
check("missing attempts fails validation", validateBackupPayload({ app: "etea-prep-next", version: 5 }) !== null);
check("non-numeric version fails validation", validateBackupPayload({ ...v5, version: "5" }) !== null);
check("null fails validation", validateBackupPayload(null) !== null);
check("array fails validation", validateBackupPayload([]) !== null);

// 5. Rejection never touches stored data.
store.clear();
store.set("etea_attempts_next", JSON.stringify([attempt("keep-me")]));
const before = snapshot();
const r6 = importProgress(JSON.stringify({ app: "etea-prep-next", version: 6, attempts: [attempt("x")] }));
check("v6 import rejected", r6.ok === false && (r6.error ?? "").includes("newer than this build"));
check("v6 rejection leaves stored data untouched", snapshot() === before);
const rCorrupt = importProgress("{not json");
check("corrupt JSON rejected", rCorrupt.ok === false);
check("corrupt rejection leaves stored data untouched", snapshot() === before);
const rMarker = importProgress(JSON.stringify({ app: "nope", version: 5, attempts: [] }));
check("wrong-marker import rejected", rMarker.ok === false);
check("wrong-marker rejection leaves stored data untouched", snapshot() === before);
check("kept attempt still loads", loadAttempts().some((a) => a.id === "keep-me"));

// 6. End-to-end restore: v4 file (no reviews/annotations) and v5 file.
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
  }),
);
check("v5 file restores ok", rV5.ok === true, rV5.error ?? "");
check("v5 attempt merged", loadAttempts().some((a) => a.id === "v5-one"));
check("v5 review merged", rV5.counts?.reviews === 1);
check("v5 annotation merged", rV5.counts?.annotations === 1);

// 7. Export -> import round trip (self-consistency).
store.clear();
const exported = exportProgress();
const rRound = importProgress(exported);
check("export/import round trip ok", rRound.ok === true, rRound.error ?? "");

console.warn = realWarn;
console.log(failures === 0 ? `\nAll backup versioning tests passed.` : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
