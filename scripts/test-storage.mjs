// Storage corruption safety tests (Stage 1 P1 Tier 2) — plain node, no
// dependencies. Imports the real functions from src/lib/tracking.ts
// (Node 23.6+ strips types on .ts imports; tracking.ts touches
// localStorage only inside functions, so a small in-memory localStorage
// + window stub is enough — same pattern as scripts/test-reviews.mjs).
// The stub can be made to throw QuotaExceededError / SecurityError on
// demand, so the failure paths are exercised for real.
// Covers: malformed JSON is quarantined verbatim (never deleted,
// deduplicated), defaults are returned, warnings surface; writes that
// throw are caught + reported with page state intact; export stays v5;
// v4/v5 imports restore; v6+ is rejected; a corrupt quarantine store
// preserves its own raw text.
// Run: node scripts/test-storage.mjs  (exit 0 = all pass)

// --- controllable browser stub (must exist before the import runs) ---
const store = new Map();
const stub = {
  throwOnWrite: null, // Error to throw from setItem, or null
  throwOnRead: null, // Error to throw from getItem, or null
};
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => {
    if (stub.throwOnRead) throw stub.throwOnRead;
    return store.has(k) ? store.get(k) : null;
  },
  setItem: (k, v) => {
    if (stub.throwOnWrite) throw stub.throwOnWrite;
    store.set(k, String(v));
  },
  removeItem: (k) => {
    store.delete(k);
  },
};
// Silence the [storage] console.warn lines the code emits honestly.
const realWarn = console.warn;
console.warn = () => {};

const {
  loadAttempts,
  recordAttempt,
  loadPlanState,
  savePlanState,
  loadQuarantine,
  exportQuarantine,
  clearQuarantine,
  getStorageWarnings,
  clearStorageWarnings,
  safeWrite,
  exportProgress,
  importProgress,
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
function reset() {
  store.clear();
  clearStorageWarnings();
}
const quotaError = () => {
  const e = new Error("Quota exceeded");
  e.name = "QuotaExceededError";
  return e;
};
const securityError = () => {
  const e = new Error("Access denied");
  e.name = "SecurityError";
  return e;
};

// --- Malformed JSON: quarantined verbatim, never deleted, default returned ---
reset();
store.set("etea_attempts_next", "{corrupt-json!!!");
const attempts = loadAttempts();
check("Malformed attempts JSON -> safe default [] returned", Array.isArray(attempts) && attempts.length === 0);
check("Malformed value NOT deleted from its key", store.get("etea_attempts_next") === "{corrupt-json!!!");
const q1 = loadQuarantine();
check("Malformed value quarantined (1 record)", q1.length === 1, JSON.stringify(q1));
check("Quarantine record keeps the original key", q1[0]?.key === "etea_attempts_next");
check("Quarantine record preserves the raw text VERBATIM", q1[0]?.raw === "{corrupt-json!!!");
check("Quarantine record carries a timestamp", typeof q1[0]?.at === "string" && q1[0].at.length > 0);
const w1 = getStorageWarnings();
check("Quarantine warning surfaces for the key", w1.some((w) => w.type === "quarantine" && w.key === "etea_attempts_next"), JSON.stringify(w1));

// Reloading the same corrupt value must NOT pile up quarantine records.
loadAttempts();
loadAttempts();
check("Re-reading the same corrupt value does not duplicate the quarantine", loadQuarantine().length === 1);
check("Warning list deduplicated per key per page load", getStorageWarnings().filter((w) => w.type === "quarantine").length === 1);

// A second corrupt key quarantines separately; the first record is untouched.
store.set("etea_plan_next", "[broken");
loadPlanState();
const q2 = loadQuarantine();
check("Second corrupt key quarantined separately", q2.length === 2, JSON.stringify(q2));
check("First quarantine record untouched by the second", q2[0]?.key === "etea_attempts_next" && q2[0]?.raw === "{corrupt-json!!!");

// --- Quarantined data is exportable, and clearable only by explicit action ---
const qExport = JSON.parse(exportQuarantine());
check("Quarantine export carries the app marker", qExport.app === "etea-prep-next");
check("Quarantine export contains both raw texts verbatim", qExport.records?.some((r) => r.raw === "{corrupt-json!!!") && qExport.records?.some((r) => r.raw === "[broken"));
clearQuarantine();
check("clearQuarantine empties the store", loadQuarantine().length === 0);
check("clearQuarantine does NOT touch the original corrupt key", store.get("etea_attempts_next") === "{corrupt-json!!!");

// --- Writes that throw: caught, reported, page state intact ---
reset();
store.set("etea_attempts_next", JSON.stringify([{ id: "a1", kind: "mock", title: "M1", total: 10, correct: 5, seconds: 60, date: "2026-11-12T00:00:00.000Z" }]));
stub.throwOnWrite = quotaError();
let threw = false;
let rec = null;
try {
  rec = recordAttempt({ kind: "mock", title: "M2", total: 10, correct: 6, seconds: 60 });
} catch {
  threw = true;
}
check("recordAttempt does NOT throw when the write hits QuotaExceededError", !threw);
check("QuotaExceededError write failure surfaces as a warning", getStorageWarnings().some((w) => w.type === "write-failed" && w.detail === "QuotaExceededError"), JSON.stringify(getStorageWarnings()));
check("Previously stored attempts intact after the failed write", JSON.parse(store.get("etea_attempts_next")).length === 1);
check("safeWrite returns false on failure", safeWrite("etea_plan_next", "{}") === false);
stub.throwOnWrite = securityError();
check("SecurityError on savePlanState is caught, not thrown", (() => { try { savePlanState({ a: true }); return true; } catch { return false; } })());
check("SecurityError write failure surfaces with its name", getStorageWarnings().some((w) => w.type === "write-failed" && w.detail === "SecurityError"));
stub.throwOnWrite = null;
check("safeWrite returns true once storage works again", safeWrite("etea_plan_next", "{}") === true);

// --- Reads that throw: caught, default returned, warning recorded ---
stub.throwOnRead = securityError();
let readThrew = false;
let readResult = null;
try {
  readResult = loadAttempts();
} catch {
  readThrew = true;
}
check("loadAttempts does NOT throw when the read hits SecurityError", !readThrew);
check("Failed read returns the safe default", Array.isArray(readResult) && readResult.length === 0);
check("Failed read surfaces as a read-failed warning", getStorageWarnings().some((w) => w.type === "read-failed" && w.detail === "SecurityError"));
stub.throwOnRead = null;

// --- Export version stays v5; v4/v5 restore; v6+ rejected ---
reset();
const exported = JSON.parse(exportProgress());
check("Export version is still 5", exported.version === 5, String(exported.version));
check("Export payload does not carry the quarantine store", !("quarantine" in exported));
const v4 = {
  app: "etea-prep-next",
  version: 4,
  exportedAt: "2026-11-11T00:00:00.000Z",
  attempts: [{ id: "v4a", kind: "quiz", title: "Q1", total: 20, correct: 12, seconds: 300, date: "2026-11-11T00:00:00.000Z" }],
  plan: { "d1": true },
  flashcards: {},
  issues: [],
  preferences: { language: "ur", theme: "dark" },
  sessions: {},
};
const r4 = importProgress(JSON.stringify(v4));
check("v4 file imports OK", r4.ok === true, r4.error ?? "");
check("v4 attempts restored", loadAttempts().some((a) => a.id === "v4a"));
check("v4 plan restored", loadPlanState()["d1"] === true);
const v5 = {
  ...v4,
  version: 5,
  attempts: [{ id: "v5a", kind: "quiz", title: "Q2", total: 20, correct: 15, seconds: 300, date: "2026-11-12T00:00:00.000Z" }],
  reviews: { "ISL-001": { reviewStatus: "owner-reviewed", reviewedBy: "owner", reviewedAt: "2026-11-11T22:01:56Z" } },
  annotations: { notes: { "Islamiyat||Ikhfa": "owner note" }, includeInTutor: false },
};
const r5 = importProgress(JSON.stringify(v5));
check("v5 file imports OK", r5.ok === true, r5.error ?? "");
check("v5 attempts merged with v4 (no duplicates, no loss)", loadAttempts().length === 2, String(loadAttempts().length));
const r6 = importProgress(JSON.stringify({ ...v5, version: 6 }));
check("v6 file rejected as newer than this build", r6.ok === false && /version 6/i.test(r6.error ?? ""), r6.error ?? "");
check("Rejected v6 import changed nothing", loadAttempts().length === 2);

// --- A corrupt quarantine store preserves its own raw text ---
reset();
store.set("etea_quarantine_next_v1", "@@not-json@@");
const qCorrupt = loadQuarantine();
check("Corrupt quarantine store returns its raw text as a record (no crash)", qCorrupt.length === 1 && qCorrupt[0].raw === "@@not-json@@", JSON.stringify(qCorrupt));
store.set("etea_flash_next", "{also-bad");
const { loadFlashState } = await import("../src/lib/tracking.ts");
loadFlashState();
const qAfter = loadQuarantine();
check("New quarantine appends without losing the corrupt store's text", qAfter.some((r) => r.raw === "@@not-json@@") && qAfter.some((r) => r.key === "etea_flash_next" && r.raw === "{also-bad"), JSON.stringify(qAfter));

console.warn = realWarn;
console.log(failures === 0 ? "\nAll storage safety tests passed." : `\n${failures} test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
