// Step 3b-audit Batch 2 tests (F07/F08/F09 data safety + F02 language
// mix + F12 durable flags). Plain node, no dependencies.
// §1–§5 exercise the REAL tracking.ts (Node type-stripping + a
// scriptable localStorage stub, same pattern as test-storage.mjs):
// quota failures surface, compare-and-swap retries never overwrite a
// concurrent tab's write, persistent collisions abandon safely, and
// flags survive session clears. §6 exercises the REAL data.ts
// (compiled to CommonJS in /tmp with tsc, same approach as
// test-step3a.mjs): F02 counts, the display rule, and answer
// integrity. §7 asserts the UI wiring + Batch 1 regression by source.
// Run: node scripts/test-step3b-audit2.mjs  (exit 0 = all pass)
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(join(ROOT, p), "utf8");

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// --- controllable browser stub (must exist before the import runs) ---
const store = new Map();
const stub = {
  throwOnWrite: null, // Error to throw from setItem, or null
  throwOnRead: null,
  getScript: null, // array of values getItem returns in order, or null
  setCalls: 0,
};
const dispatched = [];
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => {
    if (stub.throwOnRead) throw stub.throwOnRead;
    if (stub.getScript && stub.getScript.length) return stub.getScript.shift();
    return store.has(k) ? store.get(k) : null;
  },
  setItem: (k, v) => {
    stub.setCalls += 1;
    if (stub.throwOnWrite) throw stub.throwOnWrite;
    store.set(k, String(v));
  },
  removeItem: (k) => {
    store.delete(k);
  },
};
globalThis.dispatchEvent = (e) => {
  dispatched.push(e.type);
  return true;
};
const realWarn = console.warn;
console.warn = () => {};

const {
  recordAttempt,
  loadAttempts,
  atomicUpdateJSON,
  isManagedStorageKey,
  MANAGED_STORAGE_KEYS,
  getStorageWarnings,
  clearStorageWarnings,
  saveSession,
  clearSession,
  loadSessions,
  savePlanState,
  saveReviews,
  setReview,
  loadReviews,
  saveAnnotation,
  loadAnnotations,
  reportIssueDetailed,
  deleteIssue,
  loadIssues,
  loadQuarantine,
  saveFlag,
  removeFlag,
  clearFlags,
  loadFlags,
} = await import("../src/lib/tracking.ts");

function reset() {
  store.clear();
  stub.throwOnWrite = null;
  stub.throwOnRead = null;
  stub.getScript = null;
  stub.setCalls = 0;
  dispatched.length = 0;
  clearStorageWarnings();
}
const quotaError = () => {
  const e = new Error("Quota exceeded");
  e.name = "QuotaExceededError";
  return e;
};

// ----------------------------------------------- §1 F07: quota surfaces
reset();
let r1 = recordAttempt({ kind: "mock", title: "M1", total: 10, correct: 6, seconds: 60 });
check("F07 recordAttempt returns {attempt, saved}", r1 && typeof r1.attempt.id === "string" && r1.saved === true);
check("F07 recordAttempt stores the attempt", loadAttempts().length === 1 && loadAttempts()[0].id === r1.attempt.id);
stub.throwOnWrite = quotaError();
let threw = false;
let r2 = null;
try {
  r2 = recordAttempt({ kind: "mock", title: "M2", total: 10, correct: 7, seconds: 60 });
} catch {
  threw = true;
}
check("F07 recordAttempt does NOT throw on QuotaExceededError", !threw);
check("F07 recordAttempt reports saved:false on quota", r2 !== null && r2.saved === false);
check("F07 quota failure surfaces as a write-failed warning", getStorageWarnings().some((w) => w.type === "write-failed" && w.detail === "QuotaExceededError"));
check("F07 previously stored attempts intact after failed write", loadAttempts().length === 1);
check("F07 warning dispatches the shell-banner event", dispatched.includes("etea-storage-warning"));
stub.throwOnWrite = null;

// --------------------------------------- §2 F08: compare-and-swap updates
reset();
store.set("etea_attempts_next", JSON.stringify([{ id: "a1" }]));
const v2 = JSON.stringify([{ id: "a1" }, { id: "tabB" }]);
stub.getScript = [JSON.stringify([{ id: "a1" }]), v2, v2, v2];
const cas = atomicUpdateJSON("etea_attempts_next", [], (all) => [...all, { id: "mine" }]);
check("F08 CAS retry succeeds after a concurrent change", cas.ok === true && cas.conflict === false);
const finalCas = JSON.parse(store.get("etea_attempts_next"));
check("F08 CAS keeps the other tab's record (no overwrite)", finalCas.some((x) => x.id === "tabB") && finalCas.some((x) => x.id === "mine") && finalCas.length === 3);
stub.getScript = null;

reset();
store.set("etea_attempts_next", JSON.stringify([{ id: "a1" }]));
let n = 0;
const origGet = globalThis.localStorage.getItem;
globalThis.localStorage.getItem = () => JSON.stringify([{ id: "tabB-" + n++ }]);
const casConflict = atomicUpdateJSON("etea_attempts_next", [], (all) => [...all, { id: "mine" }]);
globalThis.localStorage.getItem = origGet;
check("F08 persistent collision abandons with conflict:true", casConflict.ok === false && casConflict.conflict === true);
check("F08 persistent collision records a write-conflict warning", getStorageWarnings().some((w) => w.type === "write-conflict"));
check("F08 persistent collision writes nothing", JSON.parse(store.get("etea_attempts_next")).length === 1);

reset();
store.set("etea_attempts_next", "{corrupt-json!!!");
const casCorrupt = atomicUpdateJSON("etea_attempts_next", [], (all) => [...all, { id: "fresh" }]);
check("F08 corrupt stored JSON falls back and still writes", casCorrupt.ok === true);
check("F08 corrupt stored JSON is quarantined verbatim", loadQuarantine().some((rec) => rec.raw === "{corrupt-json!!!"));
check("F08 corrupt key replaced by the fresh value", JSON.parse(store.get("etea_attempts_next")).length === 1);

// ------------------------------------------- §3 F09: cross-tab detection
check("F09 attempts key is managed", isManagedStorageKey("etea_attempts_next"));
check("F09 plan key is managed", isManagedStorageKey("etea_plan_next"));
check("F09 flash key is managed", isManagedStorageKey("etea_flash_next"));
check("F09 session key is managed", isManagedStorageKey("etea_session_next_v2"));
check("F09 reviews key is managed", isManagedStorageKey("etea_reviews_next_v1"));
check("F09 issues key is managed", isManagedStorageKey("etea_issues_v2"));
check("F09 flags key is managed", isManagedStorageKey("etea_flags_next_v1"));
check("F09 language key is NOT managed (preference, not data)", !isManagedStorageKey("etea_lang_next"));
check("F09 theme key is NOT managed", !isManagedStorageKey("etea_theme_next"));
check("F09 null key (storage.clear) counts as managed", isManagedStorageKey(null));
check("F09 unknown key is NOT managed", !isManagedStorageKey("some-other-key"));
check("F09 MANAGED_STORAGE_KEYS has 9 entries", MANAGED_STORAGE_KEYS.length === 9);

// --------------------------------- §4 save paths report their result
reset();
const sess = { version: 3, scope: "mock:zam1", mode: "mock", title: "T", questionIds: ["ISL-001"], questionSeed: "s", optionSeed: 1, answers: {}, firstPass: {}, retries: [], answeredAt: {}, responseMs: {}, idx: 0, startedAt: 1, deadlineTs: null, minutes: 0, submitted: false, trustedOnly: false };
check("F07 saveSession returns true on success", saveSession(sess) === true);
check("F07 saveSession stores the session", loadSessions()["mock:zam1"]?.title === "T");
check("F07 clearSession returns true on success", clearSession("mock:zam1") === true);
check("F07 clearSession removes the session", loadSessions()["mock:zam1"] === undefined);
stub.throwOnWrite = quotaError();
check("F07 saveSession returns false on quota", saveSession(sess) === false);
check("F07 savePlanState returns false on quota", savePlanState({ a: true }) === false);
check("F07 saveReviews returns false on quota", saveReviews({}) === false);
check("F07 saveAnnotation returns false on quota", saveAnnotation("k", "v") === false);
const issueRes = reportIssueDetailed({ qid: "ISL-001", reason: "typo", proposedCorrection: "x" });
check("F07 reportIssueDetailed reports saved:false on quota", issueRes.saved === false && typeof issueRes.rec.id === "string");
check("F07 deleteIssue returns false on quota", deleteIssue("nope") === false);
stub.throwOnWrite = null;
check("F07 setReview stores the decision", (() => { setReview("TAJ-001", "owner-reviewed"); return loadReviews()["TAJ-001"]?.reviewStatus === "owner-reviewed"; })());
check("F07 saveAnnotation round-trips", (() => { saveAnnotation("s||t", "note"); return loadAnnotations()["s||t"] === "note"; })());
check("F07 reportIssueDetailed stores on success", (() => { const r = reportIssueDetailed({ qid: "ISL-002", reason: "other", proposedCorrection: "y" }); return r.saved === true && loadIssues().some((i) => i.id === r.rec.id); })());

// ---------------------------------------------- §5 F12: durable flags
reset();
check("F12 saveFlag returns true", saveFlag("ISL-001", "mock", "ZamungKor Mock 1") === true);
let flags = loadFlags();
check("F12 loadFlags returns the flag with source+title", flags.length === 1 && flags[0].qid === "ISL-001" && flags[0].source === "mock" && flags[0].title === "ZamungKor Mock 1" && typeof flags[0].flaggedAt === "string");
saveFlag("ISL-001", "mock", "ZamungKor Mock 1");
check("F12 re-flagging does not duplicate", loadFlags().length === 1);
saveFlag("SCI-001", "practice", "General Science");
check("F12 practice flags share the durable store", loadFlags().length === 2 && loadFlags().some((f) => f.qid === "SCI-001" && f.source === "practice"));
// Flag -> submit (session cleared) -> reload: the flag must survive.
saveSession(sess);
clearSession("mock:zam1");
check("F12 flag survives session clear (submit)", loadFlags().some((f) => f.qid === "ISL-001"));
check("F12 session clear does not touch the flags key", store.has("etea_flags_next_v1"));
check("F12 flags re-read from storage on every load (reload-safe)", loadFlags().length === 2);
check("F12 removeFlag removes one flag", (() => { removeFlag("SCI-001"); return loadFlags().length === 1 && loadFlags()[0].qid === "ISL-001"; })());
clearFlags();
check("F12 clearFlags empties the store", loadFlags().length === 0);
store.set("etea_flags_next_v1", JSON.stringify([{ qid: "ISL-003", flaggedAt: "2026-11-13T00:00:00.000Z", source: "mock", title: "T" }, { qid: "", flaggedAt: "x", source: "bogus", title: "T" }, null, "junk"]));
check("F12 malformed flag entries are skipped", loadFlags().length === 1 && loadFlags()[0].qid === "ISL-003");
check("F12 saveFlag survives malformed stored entries (drops them, no throw)", (() => { const ok = saveFlag("ISL-004", "mock", "T"); const f = loadFlags(); return ok && f.length === 2 && f.every((x) => typeof x.qid === "string" && x.qid.length > 0); })());
check("F12 removeFlag survives malformed stored entries", (() => { store.set("etea_flags_next_v1", JSON.stringify([null, { qid: "ISL-005", flaggedAt: "2026-11-13T00:00:00.000Z", source: "practice", title: "T" }])); const ok = removeFlag("ISL-005"); return ok && loadFlags().length === 0; })());
stub.throwOnWrite = quotaError();
check("F12 saveFlag returns false on quota", saveFlag("ISL-004", "mock", "T") === false);
stub.throwOnWrite = null;

// --------------------------------- §6 F02: real data (tsc harness)
const OUT = "/tmp/step3b-audit2-data";
execSync("rm -rf " + OUT, { stdio: "ignore" });
let tscDiag = "";
try {
  execSync(
    `npx tsc src/lib/data.ts --outDir ${OUT} --module commonjs --target es2020 --resolveJsonModule --esModuleInterop --skipLibCheck --moduleResolution node`,
    { cwd: ROOT, stdio: "pipe" },
  );
} catch (e) {
  tscDiag = String(e.stderr ?? e.stdout ?? e.message ?? "");
}
const tscErrors = tscDiag.split("\n").filter((l) => l.includes("error TS"));
check("F02 tsc harness: no unexpected type errors", tscErrors.every((l) => l.includes("TS5097")), tscDiag.slice(0, 300));
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const { QUESTIONS, NOTES, FLASHCARDS, VISIBLE_TRACKS, VISIBLE_MOCKS } = data;
const { displayExplanation, pendingEnglishExplanations } = data;

check("F02 bank still 763 MCQs", QUESTIONS.length === 763);
const notesTotal = Object.values(NOTES).reduce((n, arr) => n + arr.length, 0);
check("F02 notes still 151", notesTotal === 151);
check("F02 flashcards still 70", FLASHCARDS.length === 70);
check("F02 visible tracks still 12", VISIBLE_TRACKS.length === 12);
check("F02 visible mocks still 16", VISIBLE_MOCKS.length === 16);

const withEn = QUESTIONS.filter((q) => typeof q.explanationEn === "string" && q.explanationEn.length > 0);
const marked = QUESTIONS.filter((q) => q.explanationLang === "roman");
check("F02 exactly 124 items carry explanationEn", withEn.length === 124, String(withEn.length));
check("F02 exactly 196 items carry the roman marker", marked.length === 196, String(marked.length));
check("F02 no item has BOTH explanationEn and the marker", QUESTIONS.every((q) => !(q.explanationEn && q.explanationLang)));
const enByBank = {};
for (const q of withEn) enByBank[q.subjectKey] = (enByBank[q.subjectKey] || 0) + 1;
check("F02 EN by bank: science 30", enByBank.science === 30);
check("F02 EN by bank: it 30", enByBank.it === 30);
check("F02 EN by bank: pakstudies 45", enByBank.pakstudies === 45);
check("F02 EN by bank: drawing 8", enByBank.drawing === 8);
check("F02 EN by bank: pe 5", enByBank.pe === 5);
check("F02 EN by bank: english 5", enByBank.english === 5);
check("F02 EN by bank: pastpapers 1", enByBank.pastpapers === 1);
const mkByBank = {};
for (const q of marked) mkByBank[q.subjectKey] = (mkByBank[q.subjectKey] || 0) + 1;
check("F02 markers by bank: islamiyat 90", mkByBank.islamiyat === 90);
check("F02 markers by bank: arabic 60", mkByBank.arabic === 60);
check("F02 markers by bank: tajweed 1", mkByBank.tajweed === 1);
check("F02 markers by bank: urdu 45", mkByBank.urdu === 45);

// The regression guard: no English-mode display may show unlabelled
// Roman Urdu. Detector = strict function-word list (same audit rule;
// "tab" excluded: the Alt+Tab keyboard key is not Roman Urdu).
const RU = new Set("ki ka ke hai hain ho hun hum se mein ko nahi hota hoti hote jata jati gaya gayi tha thi thay yeh woh aur bhi jo aik ek diya kiya raha rahi rahe jab kyun kaise kahan lekin magar phir sirf bohat zyada liye bina kehte kaha kehlata kehlati sakta sakti chahiye wala wali walay hoga hogi honge karein karna hona jana ana karke hokar rehta rehti rehte ne hua hui hue thin aayi aaye nazil paida bani bana mukammal pehle pehli dusre dusri aakhri".split(" "));
const ruHits = (s) => s.toLowerCase().replace(/[^a-z\s']/g, " ").split(/\s+/).filter((w) => RU.has(w)).length;
let guardFails = [];
for (const q of QUESTIONS) {
  const d = displayExplanation(q, "en");
  if (!d.pendingEnglish && ruHits(d.text) >= 2) guardFails.push(q.id);
}
check("F02 no unlabelled Roman Urdu in English mode (guard)", guardFails.length === 0, guardFails.slice(0, 8).join(","));
check("F02 every explanationEn is RU-free", withEn.every((q) => ruHits(q.explanationEn) === 0));
// ISL-080 is the one manually-verified exception: its second sentence
// ("Chauthe Khalifa Hazrat Ali (RA) the.") is Roman Urdu, but neither
// word is a detector function word, so it has no detectable signal.
const RU_SIGNAL_EXCEPTIONS = new Set(["ISL-080"]);
check(
  "F02 every marked explanation contains Roman Urdu signal",
  marked.every((q) => RU_SIGNAL_EXCEPTIONS.has(q.id) || ruHits(q.explanation) >= 1 || q.explanation.includes("Roman Urdu:") || /[\u0600-\u06FF]/.test(q.explanation)),
);

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
check("F02 SCI-001 shows English in en mode", displayExplanation(byId["SCI-001"], "en").text.startsWith("A deficiency of Vitamin C") && !displayExplanation(byId["SCI-001"], "en").pendingEnglish);
check("F02 SCI-001 keeps Roman Urdu in roman mode", displayExplanation(byId["SCI-001"], "roman").text.includes("ki kami se") && !displayExplanation(byId["SCI-001"], "roman").pendingEnglish);
check("F02 ITC-020 shows English (Alt+Tab kept)", displayExplanation(byId["ITC-020"], "en").text.includes("Alt+Tab"));
check("F02 PAK-044 shows the verbatim English sentence", displayExplanation(byId["PAK-044"], "en").text === "The national anthem was written by Hafeez Jalandhari.");
check("F02 ENG-042 shows English, suffix dropped", displayExplanation(byId["ENG-042"], "en").text === "'Polite' means showing good manners, like 'courteous'.");
check("F02 PPT-001 shows the verbatim English sentence", displayExplanation(byId["PPT-001"], "en").text === "The name Muhammad is mentioned 4 times in the Holy Quran.");
check("F02 ISL-001 is pending in en mode, original text kept", (() => { const d = displayExplanation(byId["ISL-001"], "en"); return d.pendingEnglish && d.text === byId["ISL-001"].explanation; })());
check("F02 ISL-001 is NOT pending in roman mode", !displayExplanation(byId["ISL-001"], "roman").pendingEnglish);
check("F02 ARB-024 (short text) is marked pending", displayExplanation(byId["ARB-024"], "en").pendingEnglish === true);
check("F02 URD-001 is marked pending", displayExplanation(byId["URD-001"], "en").pendingEnglish === true);
check("F02 TAJ-029 is marked pending", displayExplanation(byId["TAJ-029"], "en").pendingEnglish === true);
check("F02 TAJ-028 (English + Arabic letter) is NOT pending", !displayExplanation(byId["TAJ-028"], "en").pendingEnglish);
check("F02 ISL-091 (English) is NOT pending", !displayExplanation(byId["ISL-091"], "en").pendingEnglish);
check("F02 plain English item shows original, not pending", displayExplanation(byId["GKN-001"] ?? QUESTIONS.find((q) => q.subjectKey === "gk"), "en").pendingEnglish === false);
// Phase 4A: the /review queue UI is gone (owner decision), but the
// helper still lists the 196 marked items for F02 accounting — the
// pending labels on explanations are unchanged.
const pending = pendingEnglishExplanations();
check("F02 pendingEnglishExplanations still lists 196 marked items", pending.length === 196);
check("F02 pending list sorted by id", pending.every((q, i) => i === 0 || pending[i - 1].id <= q.id));
check("F02 exactly one correct answer preserved on translated items", withEn.every((q) => q.options.length >= 2 && q.correctIndex >= 0 && q.correctIndex < q.options.length));
check("F02 answers/options untouched: all items still valid", QUESTIONS.every((q) => q.options.length >= 2 && q.correctIndex >= 0 && q.correctIndex < q.options.length && typeof q.question === "string" && q.question.length > 0));

// --------------------------------- §7 wiring + Batch 1 regression
const qr = read("src/components/QuizRunner.tsx");
check("F12 QuizRunner toggleFlag mirrors to the durable store", qr.includes("saveFlag(qid, mode, title)") && qr.includes("removeFlag(qid)"));
check("F07 QuizRunner shows retry/download on failed attempt save", qr.includes("attemptSaveFailed") && qr.includes("retryAttemptSave") && qr.includes("attemptDownloadResult"));
check("F07 IssueForm keeps the form open on failed save", qr.includes("issueSaveFailed"));
check("F02 QuizRunner renders displayExplanation + pending label", qr.includes("displayExplanation(p.question, lang)") && qr.includes("currentExpl") && qr.includes("explanationPendingLabel"));
const review = read("src/app/review/page.tsx");
check("F12 review page lists durable flags", review.includes("loadFlags()") && review.includes("flagsHeading") && review.includes("flagsRemove") && review.includes("flagsClearAll"));
// Phase 4A — the queue section is REMOVED (owner decision: personal
// use, no manual verification needed); the pending labels stay.
check("F02 review page has NO pending-English queue section", !review.includes("pendingEnglishHeading") && !review.includes("pendingEnglishIntro") && !review.includes("pendingEnglishShowMore") && !review.includes("pendingVisible") && !review.includes("pendingEnglishExplanations()"));
check("F02 review cards still show the pending label", review.includes("explanationPendingLabel"));
check("F02 review page renders displayExplanation", review.includes("displayExplanation(q, lang)"));
const shell = read("src/components/AppShell.tsx");
check("F07 AppShell shows the storage-failure banner", shell.includes("etea-storage-warning") && shell.includes("storageSaveFailed"));
check("F09 AppShell warns on other-tab storage events", shell.includes('addEventListener("storage"') && shell.includes("isManagedStorageKey") && shell.includes("storageOtherTab"));
const css = read("src/app/globals.css");
check("Batch1 F21 badge wrap rules still present", css.includes("white-space: normal; max-width: 100%; min-width: 0;"));
const healthRoute = read("src/app/api/tutor/health/route.ts");
check("Batch1 health cache still wired", healthRoute.includes("createProbeCache") && healthRoute.includes("cached"));
const home = read("src/app/page.tsx");
check("Batch1 dashboard counts still derived from VISIBLE_COUNTS", home.includes("VISIBLE_COUNTS"));
const i18n = read("src/lib/i18n.tsx");
for (const k of ["explanationPendingLabel", "flagsHeading", "flagsIntro", "flagsEmpty", "flagsRemove", "flagsClearAll", "flagsFromMock", "flagsFromPractice", "flagsFlaggedOn", "storageSaveFailed", "storageOtherTab", "storageReload", "storageDismiss", "attemptSaveFailed", "attemptRetrySave", "attemptDownloadResult", "attemptSaveRecovered", "issueSaveFailed"]) {
  check(`i18n key present: ${k}`, i18n.includes(`${k}:`));
}

console.warn = realWarn;
if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
} else {
  console.log("\nAll Step 3b-audit2 tests passed.");
}
