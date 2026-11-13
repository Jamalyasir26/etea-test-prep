// Review + export v5 tests — plain node, no dependencies.
// Imports the real functions from src/lib/tracking.ts (Node 23.6+ strips
// types on .ts imports). tracking.ts touches localStorage only inside
// functions, so a small in-memory localStorage + window stub is enough.
// Covers: setReview/loadReviews round-trip, export v5 shape, v4 restore
// (no reviews field), v5 restore, future-version rejection, invalid
// review records skipped, annotation storage + opt-in default off.
// Run: node scripts/test-reviews.mjs  (exit 0 = all pass)

// --- minimal browser stub (must exist before the import runs) ---
const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const {
  exportProgress,
  importProgress,
  loadReviews,
  setReview,
  getReview,
  isReviewStatus,
  loadAnnotations,
  saveAnnotation,
  loadAnnotationOptIn,
  setAnnotationOptIn,
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

// --- review decisions ---
check("loadReviews starts empty", Object.keys(loadReviews()).length === 0);
setReview("TAJ-001", "owner-reviewed");
setReview("ISL-009", "needs-review");
setReview("ENG-005", "disputed");
const r = loadReviews();
check("setReview stores owner-reviewed", r["TAJ-001"]?.reviewStatus === "owner-reviewed");
check("setReview records reviewedBy owner", r["TAJ-001"]?.reviewedBy === "owner");
check("setReview records reviewedAt", typeof r["TAJ-001"]?.reviewedAt === "string");
check("needs-review stored", r["ISL-009"]?.reviewStatus === "needs-review");
check("disputed stored", r["ENG-005"]?.reviewStatus === "disputed");
check("getReview returns a record", getReview("TAJ-001")?.reviewStatus === "owner-reviewed");
check("getReview returns null for unknown", getReview("NOPE-999") === null);
check("isReviewStatus accepts the vocabulary", ["draft", "needs-review", "disputed", "owner-reviewed", "approved"].every(isReviewStatus));
check("isReviewStatus rejects garbage", isReviewStatus("verified") === false && isReviewStatus("banana") === false);

// Overwriting a decision replaces it (latest owner decision wins).
setReview("TAJ-001", "approved");
check("re-review overwrites to approved", loadReviews()["TAJ-001"]?.reviewStatus === "approved");
setReview("TAJ-001", "draft");
check("reset to draft works", loadReviews()["TAJ-001"]?.reviewStatus === "draft");

// --- export v5 ---
const exported = JSON.parse(exportProgress());
check("export version is 6", exported.version === 6);
check("export carries reviews", exported.reviews?.["ISL-009"]?.reviewStatus === "needs-review");
check("export carries annotations block", typeof exported.annotations === "object");
check("export annotations default includeInTutor false", exported.annotations.includeInTutor === false);

// --- v5 restore: clear, import, decisions come back ---
store.clear();
const imp5 = importProgress(JSON.stringify(exported));
check("v5 import ok", imp5.ok === true, imp5.error ?? "");
check("v5 import counts reviews", imp5.counts?.reviews === 3, JSON.stringify(imp5.counts));
check("v5 import restores needs-review", loadReviews()["ISL-009"]?.reviewStatus === "needs-review");
check("v5 import restores disputed", loadReviews()["ENG-005"]?.reviewStatus === "disputed");

// Imported reviews win per question id on re-import.
const edited = JSON.parse(JSON.stringify(exported));
edited.reviews["ISL-009"] = { reviewStatus: "owner-reviewed", reviewedBy: "owner", reviewedAt: "2026-11-12T00:00:00.000Z" };
const imp5b = importProgress(JSON.stringify(edited));
check("re-import overwrites per id", imp5b.ok === true && loadReviews()["ISL-009"]?.reviewStatus === "owner-reviewed");

// Invalid review records are skipped and counted, not fatal.
const bad = JSON.parse(JSON.stringify(exported));
bad.reviews["BAD-001"] = { reviewStatus: "verified", reviewedBy: "owner", reviewedAt: "2026-11-12T00:00:00.000Z" };
bad.reviews["BAD-002"] = { reviewStatus: "owner-reviewed" };
const impBad = importProgress(JSON.stringify(bad));
check("invalid review records skipped", impBad.ok === true && impBad.counts?.reviewsSkipped === 2, JSON.stringify(impBad.counts));
check("invalid records not stored", loadReviews()["BAD-001"] === undefined && loadReviews()["BAD-002"] === undefined);

// --- v4 restore: a v4 file (no reviews/annotations) still works ---
store.clear();
const v4 = { app: "etea-prep-next", version: 4, exportedAt: "2026-11-11T00:00:00.000Z", attempts: [], plan: {}, flashcards: {}, issues: [], preferences: { language: "en", theme: "dark" }, sessions: {}, lastDay: null };
const imp4 = importProgress(JSON.stringify(v4));
check("v4 import ok (no reviews field)", imp4.ok === true, imp4.error ?? "");
check("v4 import leaves reviews empty", Object.keys(loadReviews()).length === 0);
check("v4 import counts zero reviews", imp4.counts?.reviews === 0);

// --- future version rejected ---
const v7 = { ...v4, version: 7 };
const imp7 = importProgress(JSON.stringify(v7));
check("v7 import rejected", imp7.ok === false && /newer/.test(imp7.error ?? ""), imp7.error ?? "");

// --- annotations: private, opt-in off by default ---
check("annotation opt-in defaults off", loadAnnotationOptIn() === false);
saveAnnotation("Tajweed||Ikhfa — Hiding the Noon Sound", "Owner note: stress the 15 letters.");
check("annotation saved", loadAnnotations()["Tajweed||Ikhfa — Hiding the Noon Sound"] === "Owner note: stress the 15 letters.");
saveAnnotation("Tajweed||Ikhfa — Hiding the Noon Sound", "   ");
check("empty annotation deletes the key", loadAnnotations()["Tajweed||Ikhfa — Hiding the Noon Sound"] === undefined);
setAnnotationOptIn(true);
check("opt-in can be enabled", loadAnnotationOptIn() === true);
setAnnotationOptIn(false);
check("opt-in can be disabled again", loadAnnotationOptIn() === false);

// Annotations survive an export/import round-trip.
saveAnnotation("Arabic||Al-Fa'il — الفاعل", "Check the dual sign with the owner.");
setAnnotationOptIn(true);
const exp2 = JSON.parse(exportProgress());
check("export carries the annotation", exp2.annotations.notes["Arabic||Al-Fa'il — الفاعل"] === "Check the dual sign with the owner.");
check("export carries opt-in true", exp2.annotations.includeInTutor === true);
store.clear();
const impAnn = importProgress(JSON.stringify(exp2));
check("annotation import ok", impAnn.ok === true && impAnn.counts?.annotations === 1, JSON.stringify(impAnn.counts));
check("annotation restored", loadAnnotations()["Arabic||Al-Fa'il — الفاعل"] === "Check the dual sign with the owner.");
check("opt-in restored", loadAnnotationOptIn() === true);

console.log(failures === 0 ? "\nAll review/export tests passed." : `\n${failures} review/export test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
