// Step 2b study-flow tests — plain node, no dependencies.
// §1 exercises the REAL session-compatibility / flash-save / issue /
// stats helpers from src/lib/tracking.ts via Node type-stripping with
// a localStorage stub (same pattern as test-step2a.mjs §8). §2–§3
// exercise the REAL data.ts + plan.ts (compiled to CommonJS in /tmp
// with tsc, same approach as test-step2a.mjs §1, plus a node_modules
// symlink so the ts-fsrs import resolves and a rewrite of tracking's
// `./fsrs.ts` extension import, which CJS require cannot load). §4
// exercises the REAL tutorHealth.ts via type-stripping with a stubbed
// fetch. §5–§6 are source-pattern assertions over the components,
// pages, and i18n strings.
// Run: node scripts/test-step2b.mjs  (exit 0 = all pass)
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

// Storage stub, installed BEFORE any lib module is loaded: both the
// type-stripped imports and the compiled CJS modules read the same
// globals at call time.
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

// ---------------------------------------------------------------- §1
// Session compatibility (real tracking.ts).
const tracking = await import("../src/lib/tracking.ts");
const { checkSessionCompatibility } = tracking;

const V3 = {
  version: 3,
  scope: "mock:tt-B:provisional",
  questionIds: ["Q1", "Q2", "Q3"],
  questionSeed: "seed-1",
  subject: "Islamiyat",
  mockId: "tt-B",
  trackId: "tt",
  contentRevision: "rev-1",
};
const FP = {
  scope: V3.scope,
  subject: "Islamiyat",
  mockId: "tt-B",
  trackId: "tt",
  questionSeed: "seed-1",
  questionIds: ["Q1", "Q2", "Q3"],
  contentRevision: "rev-1",
};
const compat = (stored, fp = FP) => checkSessionCompatibility(stored, fp);

check("compat: v3 exact match resumes", compat({ ...V3 }).compatible === true);
check("compat: v3 seed mismatch -> seed", compat({ ...V3, questionSeed: "other" }).reason === "seed");
check(
  "compat: v3 reordered ids -> questions",
  compat({ ...V3, questionIds: ["Q1", "Q3", "Q2"] }).reason === "questions",
);
check(
  "compat: v3 shorter id list -> questions",
  compat({ ...V3, questionIds: ["Q1", "Q2"] }).reason === "questions",
);
check("compat: v3 revision mismatch -> revision", compat({ ...V3, contentRevision: "rev-2" }).reason === "revision");
check("compat: v3 subject mismatch -> subject", compat({ ...V3, subject: "English" }).reason === "subject");
check(
  "compat: v3 missing stored subject -> subject",
  compat({ ...V3, subject: undefined }).reason === "subject",
);
check("compat: v3 mockId mismatch -> mock", compat({ ...V3, mockId: "at-B" }).reason === "mock");
check("compat: v3 trackId mismatch -> mock", compat({ ...V3, trackId: "at" }).reason === "mock");
check("compat: v3 scope mismatch -> scope", compat({ ...V3, scope: "mock:at-B:provisional" }).reason === "scope");
check("compat: version 1 -> version", compat({ ...V3, version: 1 }).reason === "version");
check("compat: version 4 -> version", compat({ ...V3, version: 4 }).reason === "version");
check(
  "compat: questions beats seed when both wrong",
  compat({ ...V3, questionIds: ["X"], questionSeed: "other" }).reason === "questions",
);
const V2 = { version: 2, scope: V3.scope, questionIds: ["Q1", "Q2", "Q3"], questionSeed: "seed-1" };
check("compat: legacy v2 exact match resumes", compat(V2).compatible === true);
check("compat: legacy v2 changed ids -> questions", compat({ ...V2, questionIds: ["Q1", "Q2"] }).reason === "questions");
check("compat: legacy v2 seed mismatch -> seed", compat({ ...V2, questionSeed: "other" }).reason === "seed");
check(
  "compat: legacy v2 ignores subject (ids are the guarantee)",
  compat(V2, { ...FP, subject: "English" }).compatible === true,
);
check("compat: incompatible results carry no stale answers (flag only)", compat({ ...V3, questionSeed: "x" }).compatible === false);

// saveFlashState returns the write result (flashcards page warns on false).
store.clear();
check("saveFlashState: success returns true", tracking.saveFlashState({}) === true);
check(
  "saveFlashState: round-trips through loadFlashState",
  (() => {
    tracking.saveFlashState({ abc: { state: 2, due: "2026-11-14T00:00:00.000Z" } });
    return tracking.loadFlashState().abc?.state === 2;
  })(),
);
const realSetItem = globalThis.localStorage.setItem;
globalThis.localStorage.setItem = () => {
  throw new Error("QuotaExceededError");
};
check("saveFlashState: throwing storage returns false (never throws)", tracking.saveFlashState({}) === false);
globalThis.localStorage.setItem = realSetItem;

// Issue reports: the explicit "no suggested correction" choice survives
// storage AND the backup export/import round-trip.
store.delete("etea_issues_v2");
// Step 3b-audit2 (F07) — reportIssueDetailed returns {rec, saved}; the
// record itself is unchanged, only the return shape reports the write.
const noCorr = tracking.reportIssueDetailed({ qid: "ISL-001", reason: "wrong-answer", noSuggestedCorrection: true }).rec;
check("issue: noSuggestedCorrection stored", tracking.loadIssues().find((i) => i.id === noCorr.id)?.noSuggestedCorrection === true);
check(
  "issue: noSuggestedCorrection report has no correction text",
  tracking.loadIssues().find((i) => i.id === noCorr.id)?.proposedCorrection === null,
);
const withCorr = tracking.reportIssueDetailed({ qid: "ISL-002", reason: "typo", proposedCorrection: "fix it" }).rec;
const withCorrLoaded = tracking.loadIssues().find((i) => i.id === withCorr.id);
check(
  "issue: correction report keeps text, no flag",
  withCorrLoaded?.proposedCorrection === "fix it" && withCorrLoaded?.noSuggestedCorrection === undefined,
);
const exported = tracking.exportProgress();
store.delete("etea_issues_v2");
check("issue: backup round-trip ok", tracking.importProgress(exported).ok === true);
check(
  "issue: noSuggestedCorrection survives backup round-trip",
  tracking.loadIssues().find((i) => i.id === noCorr.id)?.noSuggestedCorrection === true,
);

// Stats: provisional small samples + mcqAttempts.
const attempts = [
  { id: "a1", kind: "quiz", subject: "Islamiyat", title: "Q", total: 3, correct: 1, seconds: 60, date: "2026-11-13T10:00:00.000Z", perSubject: { Islamiyat: [1, 3] } },
  { id: "a2", kind: "mock", subject: "Mixed", title: "M", total: 7, correct: 5, seconds: 120, date: "2026-11-13T11:00:00.000Z", perSubject: { English: [4, 5], Islamiyat: [1, 2] } },
  { id: "a3", kind: "quiz", subject: "Urdu", title: "Q", total: 2, correct: 0, seconds: 30, date: "2026-11-13T12:00:00.000Z", perSubject: { Urdu: [0, 2] } },
  { id: "a4", kind: "flash", subject: "Islamiyat", title: "F", total: 5, correct: 4, seconds: 60, date: "2026-11-13T13:00:00.000Z" },
];
const stats = tracking.computeStats(attempts);
check("stats: mcqAttempts counts quiz+mock only", stats.mcqAttempts === 3, `got ${stats.mcqAttempts}`);
check("stats: totalQuestions excludes flash self-ratings", stats.totalQuestions === 12, `got ${stats.totalQuestions}`);
check(
  "stats: provisional lists the 2-question subject",
  stats.provisional.some((p) => p.subject === "Urdu" && p.total === 2 && p.accuracy === 0),
  JSON.stringify(stats.provisional),
);
check(
  "stats: provisional excludes the 5-question subjects",
  stats.provisional.every((p) => p.total >= 1 && p.total < 5),
);
check("stats: weakest excludes small samples (still >=5)", stats.weakest.every((w) => w.total >= 5));
check(
  "stats: weakest still surfaces the 5-question subjects",
  stats.weakest.some((w) => w.subject === "Islamiyat") && stats.weakest.some((w) => w.subject === "English"),
);
check("stats: provisional sorted worst-first", stats.provisional[0]?.accuracy <= (stats.provisional[1]?.accuracy ?? 100));
const emptyStats = tracking.computeStats([]);
check("stats: empty attempts -> empty provisional, 0 mcqAttempts", emptyStats.provisional.length === 0 && emptyStats.mcqAttempts === 0);

// ---------------------------------------------------------------- §2
// Mock labels + cross-section mappings (real data.ts, compiled).
const OUT = "/tmp/step2b-data";
execSync("rm -rf " + OUT, { stdio: "ignore" });
// tracking.ts imports "./fsrs.ts" with an explicit extension (required
// for Node type-stripping); tsc reports TS5097 and exits non-zero but
// STILL emits. The harness tolerates ONLY that error: any other tsc
// error fails the suite, and missing output files fail it too.
let tscDiag = "";
try {
  execSync(
    `npx tsc src/lib/data.ts src/lib/plan.ts --outDir ${OUT} --module commonjs --target es2020 --resolveJsonModule --esModuleInterop --skipLibCheck --moduleResolution node`,
    { cwd: ROOT, stdio: "pipe" },
  );
} catch (e) {
  tscDiag = String(e.stderr ?? e.stdout ?? e.message ?? "");
}
const tscErrors = tscDiag.split("\n").filter((l) => l.includes("error TS"));
check(
  "tsc harness: no unexpected type errors (TS5097 extension import only)",
  tscErrors.every((l) => l.includes("TS5097")),
  tscDiag.slice(0, 400),
);
for (const f of ["lib/data.js", "lib/plan.js", "lib/tracking.js", "lib/fsrs.js"]) {
  check(`tsc harness: emitted ${f}`, fs.existsSync(join(OUT, f)));
}
// tracking.ts imports "./fsrs.ts" (extension required for Node
// type-stripping); CJS require cannot load it — rewrite the emitted
// require to the extensionless module. Test-harness shim only.
const trackingJs = join(OUT, "lib/tracking.js");
fs.writeFileSync(trackingJs, fs.readFileSync(trackingJs, "utf8").replace('require("./fsrs.ts")', 'require("./fsrs")'));
// The compiled tree lives in /tmp, so ts-fsrs would not resolve —
// symlink the project's node_modules into it.
execSync(`ln -sfn ${join(ROOT, "node_modules")} ${join(OUT, "node_modules")}`, { stdio: "ignore" });
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const plan = require(join(OUT, "lib/plan.js"));

// Counts as of Phase 4B1 (Step 2b itself added none; 4B1 added 56 MCQs + 21 notes).
check("counts: 763 MCQs", data.QUESTIONS.length === 763, `got ${data.QUESTIONS.length}`);
check(
  "counts: 151 notes",
  Object.values(data.NOTES).reduce((s, l) => s + l.length, 0) === 151,
);
check("counts: 70 flashcards", data.FLASHCARDS.length === 70, `got ${data.FLASHCARDS.length}`);
check("counts: 19 tracks", data.TRACKS.length === 19, `got ${data.TRACKS.length}`);
check("counts: 20 mocks", data.MOCKS.length === 20, `got ${data.MOCKS.length}`);

// Every real mock: labels derive from real counts, and the available /
// trusted counts equal what buildMockQuestions actually builds.
let coverageKinds = new Set();
let scoringUnknownCount = 0;
for (const m of data.MOCKS) {
  const labels = data.mockLabels(m);
  coverageKinds.add(labels.coverage);
  if (labels.scoringUnknown) scoringUnknownCount++;
  check(
    `mock ${m.id}: coverage is proxy iff variant is proxy`,
    (labels.coverage === "proxy") === (m.variant === "proxy"),
    `${m.variant} -> ${labels.coverage}`,
  );
  if (m.variant !== "proxy") {
    check(
      `mock ${m.id}: full iff available >= total`,
      (labels.coverage === "full") === (labels.available >= m.total),
      `avail ${labels.available}/${m.total} -> ${labels.coverage}`,
    );
  }
  check(
    `mock ${m.id}: available equals built questions`,
    labels.available === data.buildMockQuestions(m, "probe-seed").length,
    `avail ${labels.available} vs built ${data.buildMockQuestions(m, "probe-seed").length}`,
  );
  check(
    `mock ${m.id}: trusted equals trusted-built questions`,
    labels.trusted === data.buildMockQuestions(m, "probe-seed", { trustedOnly: true }).length,
  );
  check(`mock ${m.id}: trusted <= available`, labels.trusted <= labels.available);
  check(`mock ${m.id}: scoringUnknown iff no own config`, labels.scoringUnknown === !m.scoring);
}
check("mock labels: proxy + full both occur in real data", coverageKinds.has("proxy") && coverageKinds.has("full"));
check(
  "mock labels: 19/20 scoring-unknown, only sst-kppsc has a config",
  scoringUnknownCount === 19 && data.mockLabels(data.MOCKS.find((m) => m.id === "sst-kppsc")).scoringUnknown === false,
  `unknown=${scoringUnknownCount}`,
);
// The "partial" branch is unreachable with the current banks (every
// non-proxy mock is full), so it is covered with synthetic mocks.
const syntheticPartial = {
  id: "synth-partial", title: "Synthetic", track: "tt", variant: "B", minutes: 100, total: 100,
  comp: { islamiyat: 50 }, note: "",
};
check(
  "mock labels: under-subscribed comp -> partial",
  data.mockLabels(syntheticPartial).coverage === "partial" &&
    data.mockLabels(syntheticPartial).available === 50,
  JSON.stringify(data.mockLabels(syntheticPartial)),
);
const syntheticCapped = {
  id: "synth-capped", title: "Synthetic", track: "tt", variant: "B", minutes: 100, total: 100,
  comp: { islamiyat: 9999 }, note: "",
};
check(
  "mock labels: over-subscribed comp caps at the bank size (never invented)",
  data.mockAvailableCount(syntheticCapped) === data.BY_SUBJECT.islamiyat.length,
  `avail=${data.mockAvailableCount(syntheticCapped)} bank=${data.BY_SUBJECT.islamiyat.length}`,
);
const syntheticUnknownSubject = {
  id: "synth-unknown", title: "Synthetic", track: "tt", variant: "B", minutes: 100, total: 10,
  comp: { no_such_bank: 10 }, note: "",
};
check(
  "mock labels: unknown subject key contributes 0 (never invented)",
  data.mockAvailableCount(syntheticUnknownSubject) === 0,
);
check(
  "mock labels: ETEA/KPPSC variants stay distinct strings (never merged)",
  data.MOCKS.find((m) => m.id === "sst-etea").variant === "ETEA-2020" &&
    data.MOCKS.find((m) => m.id === "sst-kppsc").variant === "KPPSC-5th",
);

// Cross-section mappings.
for (const [key, label] of Object.entries(data.SUBJECT_LABELS)) {
  check(`subjectKeyForLabel round-trips ${label}`, data.subjectKeyForLabel(label) === key);
}
check("subjectKeyForLabel: unknown label -> null", data.subjectKeyForLabel("Bogus") === null);
check("noteBankKey: Islamiyat -> islamiyat", data.noteBankKey("Islamiyat") === "islamiyat");
check("noteBankKey: Drawing/PE has NO bank key (link omitted, never guessed)", data.noteBankKey("Drawing/PE") === null);
check("noteBankKey: unknown -> null", data.noteBankKey("Bogus") === null);
check("flashcardCategoryForNote: Pedagogy is a category", data.flashcardCategoryForNote("Pedagogy") === "Pedagogy");
check("flashcardCategoryForNote: Islamiyat is not", data.flashcardCategoryForNote("Islamiyat") === null);
check("flashcardCategoryForNote: Maths is not", data.flashcardCategoryForNote("Maths") === null);
for (const c of [...new Set(data.FLASHCARDS.map((f) => f.category))]) {
  check(`flashcardCategoryForNote: category ${c} maps to itself`, data.flashcardCategoryForNote(c) === c);
}
const distinctLabels = [...new Set(data.QUESTIONS.map((q) => q.subject))];
check(
  "libraryScope: every question label maps to a NOTES key or 'all'",
  distinctLabels.every((l) => {
    const s = data.libraryScopeForSubjectLabel(l);
    return s === "all" || Boolean(data.NOTES[s]);
  }),
  distinctLabels.join(", "),
);
check("libraryScope: Drawing -> Drawing/PE", data.libraryScopeForSubjectLabel("Drawing") === "Drawing/PE");
check("libraryScope: Physical Education -> Drawing/PE", data.libraryScopeForSubjectLabel("Physical Education") === "Drawing/PE");
check("libraryScope: IT -> IT/Computer", data.libraryScopeForSubjectLabel("IT") === "IT/Computer");
check("libraryScope: Past-Paper Topics -> all", data.libraryScopeForSubjectLabel("Past-Paper Topics") === "all");
check("libraryScope: Past-Paper Topics (Reworded) -> all", data.libraryScopeForSubjectLabel("Past-Paper Topics (Reworded)") === "all");
check("libraryScope: Islamiyat passes through", data.libraryScopeForSubjectLabel("Islamiyat") === "Islamiyat");

// ---------------------------------------------------------------- §3
// Plan: stable ids, migration, calendar, deep links (real plan.ts).
const ids = plan.allPlanTaskIds();
check("plan ids: 63 tasks", ids.length === 63, `got ${ids.length}`);
check("plan ids: all unique", new Set(ids).size === 63);
check("plan ids: all pt- prefixed", ids.every((id) => /^pt-[0-9a-z]+$/.test(id)));
check(
  "plan ids: deterministic",
  plan.planTaskId("Day 1", 20, "x") === plan.planTaskId("Day 1", 20, "x"),
);
check(
  "plan ids: differ by text",
  plan.planTaskId("Day 1", 20, "x") !== plan.planTaskId("Day 1", 20, "y"),
);
check(
  "plan ids: differ by minutes",
  plan.planTaskId("Day 1", 20, "x") !== plan.planTaskId("Day 1", 30, "x"),
);
check(
  "plan ids: differ by day (same text, different day = different task)",
  plan.planTaskId("Day 1", 20, "x") !== plan.planTaskId("Day 2", 20, "x"),
);
check("plan ids: positional format kept for migration only", plan.positionalPlanId(0, 0) === "d0-t0" && plan.positionalPlanId(20, 2) === "d20-t2");

// Migration.
const PLAN21 = data.PLAN21;
const stableOf = (di, ti) => plan.planTaskId(PLAN21[di][0], PLAN21[di][1][ti][0], PLAN21[di][1][ti][1]);
const mig1 = plan.migratePlanState({ "d0-t0": true, "d0-t1": false, "d20-t2": true });
check("migration: positional keys map to stable ids", mig1.state[stableOf(0, 0)] === true && mig1.state[stableOf(0, 1)] === false && mig1.state[stableOf(20, 2)] === true);
check("migration: positional keys removed after mapping", !("d0-t0" in mig1.state) && !("d20-t2" in mig1.state));
check("migration: migrated flag true", mig1.migrated === true);
const mig2 = plan.migratePlanState({ [stableOf(0, 0)]: false, "d0-t0": true });
check("migration: stable key wins collisions (uncheck not resurrected)", mig2.state[stableOf(0, 0)] === false);
const mig3 = plan.migratePlanState({ d1: true, "weird-key": true });
check("migration: unknown keys pass through untouched", mig3.state.d1 === true && mig3.state["weird-key"] === true && mig3.migrated === false);
const mig4 = plan.migratePlanState({ "d99-t0": true, "d0-t99": true });
check("migration: invalid positions preserved, never deleted", mig4.state["d99-t0"] === true && mig4.state["d0-t99"] === true && mig4.migrated === false);
const mig5 = plan.migratePlanState({ "d0-t0": "yes", [stableOf(0, 1)]: true });
check("migration: non-boolean values dropped", !("d0-t0" in mig5.state) && mig5.state[stableOf(0, 1)] === true);
const mig6 = plan.migratePlanState(mig1.state);
check("migration: idempotent", JSON.stringify(mig6.state) === JSON.stringify(mig1.state) && mig6.migrated === false);
check(
  "countPlanDone: counts only known stable ids",
  plan.countPlanDone({ [stableOf(0, 0)]: true, d1: true, bogus: true, [stableOf(0, 1)]: false }) === 1,
);

// loadMigratedPlanState: persists the migration + version marker.
store.clear();
store.set("etea_plan_next", JSON.stringify({ "d0-t0": true, d1: true }));
const loaded1 = plan.loadMigratedPlanState();
check("loadMigrated: migrated flag true on first read", loaded1.migrated === true);
check("loadMigrated: state has the stable id + passthrough key", loaded1.state[stableOf(0, 0)] === true && loaded1.state.d1 === true);
check(
  "loadMigrated: migrated map persisted to storage",
  JSON.parse(store.get("etea_plan_next"))[stableOf(0, 0)] === true,
);
check("loadMigrated: version marker written", store.get("etea_plan_version_next") === String(plan.PLAN_VERSION));
const loaded2 = plan.loadMigratedPlanState();
check("loadMigrated: second read is a no-op", loaded2.migrated === false);

// Calendar.
const start = new Date(2026, 10, 13); // 13 Nov 2026, local midnight
const dayDiff = (a, b) => Math.round((b.getTime() - a.getTime()) / 86400000);
const cal1 = plan.buildPlanCalendar(start, 1);
check("calendar 3-week: 21 study + 3 rest = 24 entries", cal1.length === 24 && cal1.filter((e) => e.kind === "study").length === 21 && cal1.filter((e) => e.kind === "rest").length === 3);
check(
  "calendar 3-week: rest days after units 6/12/18",
  cal1[6].kind === "rest" && cal1[13].kind === "rest" && cal1[20].kind === "rest",
);
check(
  "calendar 3-week: catch-up exactly on units 6/12/18",
  cal1.filter((e) => e.kind === "study" && e.catchUp).map((e) => e.unitIndex).join(",") === "6,12,18",
);
check(
  "calendar 3-week: dates consecutive from the start date",
  cal1.every((e, i) => dayDiff(start, e.startDate) === i) && cal1.every((e) => e.startDate.getTime() === e.endDate.getTime()),
);
check(
  "calendar 3-week: no cycle-2 windows",
  cal1.every((e) => e.kind === "rest" || (e.cycle2Start === null && e.cycle2End === null)),
);
const totals1 = plan.planCalendarTotals(cal1);
check("calendar 3-week: totals 21/3/24", totals1.studyDays === 21 && totals1.restDays === 3 && totals1.totalDays === 24, JSON.stringify(totals1));
const cal2 = plan.buildPlanCalendar(start, 2);
const totals2 = plan.planCalendarTotals(cal2);
check("calendar 6-week: totals 42/3/45", totals2.studyDays === 42 && totals2.restDays === 3 && totals2.totalDays === 45, JSON.stringify(totals2));
check(
  "calendar 6-week: each unit spans 2 days",
  cal2.filter((e) => e.kind === "study").every((e) => dayDiff(e.startDate, e.endDate) === 1),
);
const cal4 = plan.buildPlanCalendar(start, 4);
const totals4 = plan.planCalendarTotals(cal4);
check("calendar 12-week: totals 84/3/174 (both cycles)", totals4.studyDays === 84 && totals4.restDays === 3 && totals4.totalDays === 174, JSON.stringify(totals4));
check(
  "calendar 12-week: cycle-2 window is one full cycle (87 days) later",
  cal4
    .filter((e) => e.kind === "study")
    .every((e) => dayDiff(e.startDate, e.cycle2Start) === 87 && dayDiff(e.endDate, e.cycle2End) === 87),
);
check(
  "calendar 12-week: cycle-2 windows preserve unit spans",
  cal4.filter((e) => e.kind === "study").every((e) => dayDiff(e.cycle2Start, e.cycle2End) === 3),
);

// Task deep links: every one of the 63 tasks resolves.
let unresolved = [];
for (const [, tasks] of PLAN21) {
  for (const [, text] of tasks) {
    const link = plan.planTaskLink(text);
    if (!link || !link.href.startsWith("/")) unresolved.push(text);
  }
}
check("plan links: all 63 tasks resolve to a same-site href", unresolved.length === 0, unresolved.join(" | "));
check("plan links: mock task -> /mock", plan.planTaskLink("Mock Test 1 — 100 MCQs, 100 minutes (timed)")?.href === "/mock");
check("plan links: flashcards task -> /flashcards", plan.planTaskLink("Flashcards — important dates")?.href === "/flashcards");
check(
  "plan links: subject notes -> scoped library",
  plan.planTaskLink("Islamiyat notes: Quran — Surahs, Parahs, Makki / Madni")?.href === "/library?subject=Islamiyat",
);
check(
  "plan links: subject quiz -> scoped practice",
  plan.planTaskLink("Islamiyat quiz — 20 questions")?.href === "/practice?subject=islamiyat",
);
check("plan links: weakest-topic task -> /analysis", plan.planTaskLink("Quiz your weakest topic from Week 1")?.href === "/analysis");
check(
  "plan links: wrong-answers review -> /analysis",
  plan.planTaskLink("Review all wrong answers of Mock 1 with explanations")?.href === "/analysis",
);
check(
  "plan links: generic notes task -> /library",
  plan.planTaskLink("Skim all notes once more + read the expected pattern")?.href === "/library",
);
check("plan links: mixed quiz -> /practice", plan.planTaskLink("Mixed quiz — Islamiyat + Pedagogy")?.href === "/practice");
check("plan links: gibberish -> null (never invent a target)", plan.planTaskLink("zzz unrelated gibberish") === null);

// Plan day for a Library subject.
check("planDayForSubject: Islamiyat -> day 1", plan.planDayForSubject("Islamiyat") === 1);
check("planDayForSubject: Pedagogy -> day 1", plan.planDayForSubject("Pedagogy") === 1);
check("planDayForSubject: English -> day 8", plan.planDayForSubject("English") === 8);
check("planDayForSubject: Maths -> day 8", plan.planDayForSubject("Maths") === 8);
check("planDayForSubject: Pak Studies -> day 10", plan.planDayForSubject("Pak Studies") === 10);
check("planDayForSubject: Urdu -> day 12", plan.planDayForSubject("Urdu") === 12);
check("planDayForSubject: Tajweed -> day 15", plan.planDayForSubject("Tajweed") === 15);
check("planDayForSubject: Arabic -> null (no day mentions it)", plan.planDayForSubject("Arabic") === null);
check("planDayForSubject: GK -> null", plan.planDayForSubject("GK") === null);
check("planDayForSubject: General Science -> null", plan.planDayForSubject("General Science") === null);
check("planDayForSubject: IT/Computer -> null", plan.planDayForSubject("IT/Computer") === null);
check("planDayForSubject: Social Studies -> null", plan.planDayForSubject("Social Studies") === null);
check("planDayForSubject: Drawing/PE -> null", plan.planDayForSubject("Drawing/PE") === null);

// Date helpers: local dates, never UTC-shifted.
check(
  "date keys: round-trip preserves the local calendar day",
  (() => {
    const d = new Date(2026, 10, 13, 15, 30);
    const back = plan.parseLocalDateKey(plan.toLocalDateKey(d));
    return back?.getFullYear() === 2026 && back?.getMonth() === 10 && back?.getDate() === 13;
  })(),
);
check(
  "date keys: malformed keys -> null",
  plan.parseLocalDateKey("not-a-date") === null &&
    plan.parseLocalDateKey("13/11/2026") === null &&
    plan.parseLocalDateKey("") === null,
);
check("date keys: toLocalDateKey format", plan.toLocalDateKey(new Date(2026, 0, 5)) === "2026-01-05");
check(
  "plan range: same day renders a single date (no dash)",
  !plan.formatPlanRange(new Date(2026, 10, 13), new Date(2026, 10, 13), 2026).includes("–"),
);
check(
  "plan range: multi-day renders a range",
  plan.formatPlanRange(new Date(2026, 10, 13), new Date(2026, 10, 15), 2026).includes("–"),
);
check(
  "plan day: year shown only when it differs from the reference year",
  !plan.formatPlanDay(new Date(2026, 10, 13), 2026).includes("2026") &&
    plan.formatPlanDay(new Date(2027, 0, 5), 2026).includes("2027"),
);

// ---------------------------------------------------------------- §4
// Tutor health: summary, capability line, age, cache/dedup (real
// tutorHealth.ts, stubbed fetch).
const health = await import("../src/lib/tutorHealth.ts");
const { summarizeHealth, formatCapabilityLine, checkedAgeKey, fetchTutorHealth, __resetHealthCacheForTests } = health;

const allOk = { overall: "ok", providers: { gemini: { status: "ok" }, groq: { status: "ok" }, openrouter: { status: "ok" } } };
const mixed = {
  overall: "degraded",
  providers: { gemini: { status: "error", errorClass: "timeout" }, groq: { status: "ok" }, openrouter: { status: "error", errorClass: "rate_limited" } },
};
const allDown = { overall: "down", providers: { gemini: { status: "error" }, groq: { status: "error" } } };
const sAll = summarizeHealth(allOk);
check("health summary: all ok", sAll.overall === "ok" && sAll.okCount === 3 && sAll.total === 3 && sAll.downNames.length === 0);
const sMixed = summarizeHealth(mixed);
check(
  "health summary: mixed -> degraded, 1 ok, error classes on down names",
  sMixed.overall === "degraded" && sMixed.okCount === 1 && sMixed.okNames.join() === "Groq" &&
    sMixed.downNames.includes("Gemini (timeout)") && sMixed.downNames.includes("OpenRouter (rate_limited)"),
  JSON.stringify(sMixed),
);
check("health summary: none ok -> down", summarizeHealth(allDown).overall === "down" && summarizeHealth(allDown).okCount === 0);
check(
  "health summary: overall field honoured over recomputation",
  summarizeHealth({ overall: "degraded", providers: { gemini: { status: "ok" } } }).overall === "degraded",
);
check(
  "health summary: unknown provider key keeps its raw name",
  summarizeHealth({ providers: { mystery: { status: "ok" } } }).okNames.join() === "mystery",
);
check("health summary: no providers -> down, total 0", summarizeHealth({}).overall === "down" && summarizeHealth({}).total === 0);
check("health summary: coldStart flag passes through", summarizeHealth({ ...allOk, coldStart: true }).coldStart === true);

const stubT = (key) => `[${key}]`;
const stubTf = (key, vars) => `${key}:${JSON.stringify(vars)}`;
const stubLri = (s) => `<${s}>`;
check(
  "capability line: no provider -> noProvider wording",
  formatCapabilityLine(summarizeHealth(allDown), stubT, stubTf, stubLri).includes("[noProvider]"),
);
const mixedLine = formatCapabilityLine(sMixed, stubT, stubTf, stubLri);
check(
  "capability line: mixed names responders + non-responders",
  mixedLine.includes("summaryResponding") && mixedLine.includes("summaryNotResponding") &&
    mixedLine.includes("Groq") && mixedLine.includes("Gemini"),
  mixedLine,
);
const okLine = formatCapabilityLine(sAll, stubT, stubTf, stubLri);
check(
  "capability line: all ok has no not-responding clause",
  okLine.includes("summaryResponding") && !okLine.includes("summaryNotResponding"),
  okLine,
);
check(
  "capability line: same summary -> same line (one wording everywhere)",
  formatCapabilityLine(sMixed, stubT, stubTf, stubLri) === mixedLine,
);

check("checked age: 0s -> now", checkedAgeKey(1000, 1000).key === "checkedAgeNow");
check("checked age: 59s -> now", checkedAgeKey(1000, 1000 + 59000).key === "checkedAgeNow");
check("checked age: 60s -> 1 min", (() => { const r = checkedAgeKey(1000, 1000 + 60000); return r.key === "checkedAgeMin" && r.vars.n === 1; })());
check("checked age: 59 min -> 59 min", (() => { const r = checkedAgeKey(1000, 1000 + 59 * 60000); return r.key === "checkedAgeMin" && r.vars.n === 59; })());
check("checked age: 60 min -> old", checkedAgeKey(1000, 1000 + 60 * 60000).key === "checkedAgeOld");
check("checked age: future probe -> now (never negative)", checkedAgeKey(2000, 1000).key === "checkedAgeNow");
check("health constants: 5-min TTL, 30-s refresh cooldown", health.HEALTH_CACHE_TTL_MS === 300000 && health.HEALTH_REFRESH_COOLDOWN_MS === 30000);

// Cache + dedup with a counting fetch stub.
const realFetch = globalThis.fetch;
const realDateNow = Date.now;
let fetchCalls = 0;
let fetchShouldFail = false;
globalThis.fetch = async () => {
  fetchCalls++;
  if (fetchShouldFail) throw new Error("network down");
  return { ok: true, json: async () => allOk };
};
__resetHealthCacheForTests();
fetchCalls = 0;
const [r1, r2] = await Promise.all([fetchTutorHealth(), fetchTutorHealth()]);
check("health cache: simultaneous calls share ONE probe", fetchCalls === 1, `calls=${fetchCalls}`);
check("health cache: simultaneous calls both fresh (not cached)", r1.fromCache === false && r2.fromCache === false);
const r3 = await fetchTutorHealth();
check("health cache: sequential call reuses the cache", fetchCalls === 1 && r3.fromCache === true);
const r4 = await fetchTutorHealth({ force: true });
check("health cache: force bypasses the cache", fetchCalls === 2 && r4.fromCache === false);
fetchShouldFail = true;
let threw = false;
try {
  await fetchTutorHealth({ force: true });
} catch {
  threw = true;
}
check("health cache: failed probe throws", threw === true);
const r5 = await fetchTutorHealth();
check("health cache: failed probe never overwrites a good cache", r5.fromCache === true && r5.data.overall === "ok");
fetchShouldFail = false;
__resetHealthCacheForTests();
fetchShouldFail = true;
let threwCold = false;
try {
  await fetchTutorHealth();
} catch {
  threwCold = true;
}
check("health cache: cold failure throws with no cache to serve", threwCold === true);
fetchShouldFail = false;
fetchCalls = 0;
await fetchTutorHealth();
check("health cache: retry after cold failure probes again", fetchCalls === 1);
// TTL expiry: move time forward past the 5-minute window.
let fakeNow = realDateNow();
Date.now = () => fakeNow;
__resetHealthCacheForTests();
fetchCalls = 0;
await fetchTutorHealth();
fakeNow += 6 * 60 * 1000;
await fetchTutorHealth();
check("health cache: stale cache (past TTL) re-probes", fetchCalls === 2, `calls=${fetchCalls}`);
Date.now = realDateNow;
globalThis.fetch = realFetch;

// ---------------------------------------------------------------- §5
// Source patterns: the 2b flows exist in the components/pages.
const qr = read("src/components/QuizRunner.tsx");
check("qr: pre-start disclosure fields", qr.includes('t("prestartHeading")') && qr.includes('t("prestartSubjectLabel")') && qr.includes('t("prestartPatternLabel")') && qr.includes('tf("prestartQuestions"') && qr.includes('tf("prestartReviewed"') && qr.includes('tf("prestartProvisional"') && qr.includes('tf("prestartUnanswered"') && qr.includes('t("prestartDurationLabel")'));
check("qr: Resume + Start fresh options", qr.includes('t("resumeButton")') && qr.includes('t("startFreshButton")'));
check("qr: stored sessions pass the compatibility check", qr.includes("checkSessionCompatibility(stored, {"));
check("qr: question map + flag UI", qr.includes('t("questionMapToggle")') && qr.includes('t("questionMapLabel")') && qr.includes('t("questionMapFlagged")') && qr.includes('t("flagButton")') && qr.includes('t("flaggedButton")') && qr.includes("aria-pressed={!!flags["));
check(
  "qr: retrieval-first reveal order (your answer -> correct -> reason -> source)",
  qr.indexOf("yourAnswerLine") < qr.indexOf("correctAnswerLine") &&
    qr.indexOf("correctAnswerLine") < qr.indexOf("revealReasonLabel") &&
    qr.indexOf("revealReasonLabel") < qr.indexOf("sourceNoteLink"),
);
check("qr: reveal source link uses the scoped library helper", qr.includes("libraryScopeForSubjectLabel(q.question.subject)"));
check("qr: issue form validates reason + correction-or-explicit-choice", qr.includes('t("noCorrectionChoice")') && qr.includes('if (reason === "" || (!noCorrection && correction.trim() === ""))') && qr.includes("noSuggestedCorrection: noCorrection"));
check("qr: results show first-pass accuracy + provisional count + flags separately", qr.includes('tf("firstPassAccuracyLine"') && qr.includes('tf("provisionalContentLine"') && qr.includes('tf("flaggedResultsLine"') && qr.includes('t("rawVsExam")'));

const tutorPage = read("src/app/tutor/page.tsx");
check(
  "tutor: third-party warning renders BEFORE the prompt input",
  tutorPage.indexOf('t("tutorWarningFallback")') !== -1 &&
    tutorPage.indexOf('t("tutorWarningFallback")') < tutorPage.indexOf("<input"),
);
check("tutor: warning covers fallback order + retention", tutorPage.includes('t("tutorWarningFallback")') && tutorPage.includes('t("tutorWarningRetention")') && tutorPage.includes('t("tutorPrivacy")'));
check("tutor: Cancel during loading", tutorPage.includes("cancelRequest") && tutorPage.includes('t("cancel")') && tutorPage.includes("AbortController"));
check("tutor: failure keeps the prompt with Retry + offline search", tutorPage.includes("failedPrompt") && tutorPage.includes('t("retryButton")') && tutorPage.includes('t("offlineSearchButton")'));
check("tutor: citations carry note titles + question ids + deep links", tutorPage.includes("normalizeSources") && tutorPage.includes("/library?subject=") && tutorPage.includes("/tutor?explain=") && tutorPage.includes('t("aiNotAuthority")'));
check("tutor: ?explain= deep link handled", tutorPage.includes('search.get("explain")') || tutorPage.includes('params.get("explain")'));

const tutorHealthSrc = read("src/components/TutorHealth.tsx");
check("tutor health UI: cached probe + one capability line + age + cooldown", tutorHealthSrc.includes("fetchTutorHealth") && tutorHealthSrc.includes("formatCapabilityLine(summary") && tutorHealthSrc.includes("checkedAgeKey(") && tutorHealthSrc.includes("HEALTH_REFRESH_COOLDOWN_MS"));
check("tutor health UI: both variants exist (summary + full)", tutorHealthSrc.includes('variant === "summary"'));
check("home: capability wording comes from the same TutorHealth component", read("src/app/page.tsx").includes("<TutorHealth"));

const flashPage = read("src/app/flashcards/page.tsx");
check("flashcards: New / Due reviews / Session shown separately", flashPage.includes('t("flashNewLabel")') && flashPage.includes('t("flashDueReviewsLabel")') && flashPage.includes('t("flashSessionReviewed")'));
check("flashcards: composition snapshotted at session start", flashPage.includes("setComposition({ fresh, due:"));
check("flashcards: next-due in the local timezone", flashPage.includes("formatLocalDueDate(cardState.dueAt)"));
check("flashcards: failed-save warning with retry + export", flashPage.includes('t("flashSaveFailed")') && flashPage.includes('t("flashRetrySave")') && flashPage.includes('t("flashSaveRecovered")') && flashPage.includes("setSaveFailed(!saved)"));
check("flashcards: ?category= deep link", flashPage.includes('search.get("category")'));
check("flashcards: old conflated dueTotal is gone", !flashPage.includes("dueTotal") && !flashPage.includes('t("dueToday")'));

const analysis = read("src/app/analysis/page.tsx");
check("analysis: date/subject/track filters + shown-count note", analysis.includes('t("filtersHeading")') && analysis.includes('t("filterDate7")') && analysis.includes('t("filterDate30")') && analysis.includes('t("filterTrackLabel")') && analysis.includes('tf("filteredNote"'));
check("analysis: provisional section with drill action", analysis.includes('t("provisionalHeading")') && analysis.includes('t("provisionalIntro")') && analysis.includes('t("run10Drill")') && analysis.includes("stats.provisional"));
check("analysis: denominator caveat paragraph", analysis.includes('tf("analysisDenominators"'));
check("analysis: last export/import dates in the data panel", analysis.includes('tf("lastExportLine"') && analysis.includes('t("neverExported")') && analysis.includes('tf("lastImportLine"') && analysis.includes('t("neverImported")') && analysis.includes("recordExport()") && analysis.includes("recordImport()"));
check("analysis: drill links use bank keys (no raw-label links left)", analysis.includes("drillHref(") && !analysis.includes("encodeURIComponent(s)") && !analysis.includes("encodeURIComponent(w.subject)"));

const library = read("src/app/library/page.tsx");
check("library: Search all subjects option", library.includes('t("searchAllSubjects")') && library.includes('value={ALL_SUBJECTS}'));
check("library: matching count line", library.includes('tf("libraryMatchCount"') && library.includes('tf("libraryMatchCountQuery"'));
// Stage 5A — the label is now driven by resolveNoteView's item-level
// `translated` flag (flat _ur/_roman fields) instead of the Pass-1
// nested-scaffold hasTranslation(); the rendered behaviour is
// unchanged: English source text is labelled in Urdu/Roman mode.
check("library: English source text label where translation is missing", library.includes('t("englishSourceText")') && library.includes("!shown.translated"));
check("library: related practice/flashcard/plan links", library.includes('t("relatedLabel")') && library.includes('t("relatedPractice")') && library.includes('t("relatedFlashcards")') && library.includes('t("relatedPlan")') && library.includes("noteBankKey(e.subject)") && library.includes("flashcardCategoryForNote(e.subject)") && library.includes("planDayForSubject(e.subject)"));
check("library: subject + query preserved in the URL", library.includes('params.get("subject")') && library.includes('params.get("q")') && library.includes("history.replaceState"));

const planPage = read("src/app/plan/page.tsx");
check("plan page: stable ids + migration + calendar + deep links", planPage.includes("loadMigratedPlanState()") && planPage.includes("planTaskId(") && planPage.includes("buildPlanCalendar(") && planPage.includes("planTaskLink("));
check("plan page: 6-week pacing key wired", planPage.includes("PACING_KEY") && planPage.includes('"planPacing6"'));
check("plan page: rest + catch-up days rendered", planPage.includes('t("planRestDay")') && planPage.includes('t("planCatchUpNote")'));
check("plan page: day anchors for Library links", planPage.includes("id={`plan-day-${entry.unitIndex + 1}`}"));

const home = read("src/app/page.tsx");
check("home: plan scan uses stable ids + migrated state", home.includes("loadMigratedPlanState()") && home.includes("planTaskId(") && home.includes("countPlanDone("));
check("home: no positional plan ids left", !home.includes("d${di}-t${ti}"));

const issuesPage = read("src/app/issues/page.tsx");
check("issues: explicit no-correction choice rendered", issuesPage.includes('t("noSuggestedCorrectionLabel")'));
check("review: heading comes from the reviewTitle key", read("src/app/review/page.tsx").includes('t("reviewTitle")'));

// ---------------------------------------------------------------- §6
// Exact owner-specified strings (en) + removed keys stay removed.
const i18n = read("src/lib/i18n.tsx");
check("i18n: reviewTitle exact text", i18n.includes('en: "Local owner-review workspace — this device only"'));
check("i18n: 6-week pacing exact text", i18n.includes('en: "21 study units paced over 42 days"'));
check("i18n: reviewed-practice CTA exact template", i18n.includes('en: "Start short reviewed practice — {n}/{total} available"'));
check("i18n: provisional label exact text", i18n.includes('en: "provisional—small sample"'));
check("i18n: 10-question drill exact text", i18n.includes('en: "Run 10-question drill"'));
check("i18n: search-all exact text", i18n.includes('en: "Search all subjects"'));
check("i18n: English source text exact text", i18n.includes('en: "English source text"'));
const removedKeys = ["checkedJustNow", "fullStatusLine", "healthOk", "healthDegraded", "healthDown", "load3", "load6", "load12", "spreadOver", "dueToday", "mockCoverageNone", "mockCoveragePartial", "mockCoverageFull", "resumedAlert", "mockLabelFullyReviewed"];
function srcFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...srcFiles(p));
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}
const allSrc = srcFiles(join(ROOT, "src")).map((p) => fs.readFileSync(p, "utf8")).join("\n");
for (const k of removedKeys) {
  check(`i18n: removed key ${k} is referenced nowhere in src/`, !allSrc.includes(k));
}
// perDay needs a narrower check: LIMITS.perDay is the live tutor
// rate-limit field in ai.ts — only the i18n key usage must be gone.
check('i18n: removed key perDay is never used as an i18n key', !allSrc.includes('t("perDay")') && !allSrc.includes("perDay: {"));

// ---------------------------------------------------------------- done
if (failures === 0) {
  console.log("\nAll Step 2b tests passed.");
} else {
  console.log(`\n${failures} FAILURE(S)`);
  process.exit(1);
}
