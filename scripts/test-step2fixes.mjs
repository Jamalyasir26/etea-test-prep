// Step 2 fix-batch tests — plain node, no dependencies.
// §1 exercises the REAL practice-state helpers from src/lib/practice.ts
// via Node type-stripping with a localStorage stub (same pattern as
// test-step2b.mjs §1). §2 exercises the REAL data.ts (compiled to
// CommonJS in /tmp, same approach as test-step2b.mjs §2) + the REAL
// checkSessionCompatibility from tracking.ts for the full bare-URL
// resume chain. §3 exercises the REAL fsrs.ts date helpers via
// type-stripping, including a TZ-pinned child process proving the
// local-timezone rendering. §4–§5 are source-pattern assertions over
// the pages and i18n strings.
// Run: node scripts/test-step2fixes.mjs  (exit 0 = all pass)
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

// Storage stub, installed BEFORE any lib module is loaded.
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
// Practice-state helpers (real src/lib/practice.ts).
const practice = await import("../src/lib/practice.ts");
const { loadPracticeState, resolvePracticeInitial, PRACTICE_STATE_KEY } = practice;
const isValid = (k) => ["islamiyat", "english", "urdu"].includes(k);
const STORED = { subjectKey: "islamiyat", round: 2, seed: 12345 };

store.clear();
const fresh = loadPracticeState("islamiyat");
check("practice load: no stored state -> fallback subject, round 0", fresh.subjectKey === "islamiyat" && fresh.round === 0);
check("practice load: no stored state -> numeric seed", typeof fresh.seed === "number" && fresh.seed > 0);
store.set(PRACTICE_STATE_KEY, JSON.stringify(STORED));
check("practice load: stored state restored verbatim", JSON.stringify(loadPracticeState("english")) === JSON.stringify(STORED));
store.set(PRACTICE_STATE_KEY, "{not json");
const malformed = loadPracticeState("urdu");
check("practice load: malformed JSON -> fresh fallback state", malformed.subjectKey === "urdu" && malformed.round === 0);
store.set(PRACTICE_STATE_KEY, JSON.stringify({ subjectKey: 7, round: "2", seed: "x" }));
const wrongTypes = loadPracticeState("urdu");
check("practice load: wrong-typed fields -> fresh fallback state", wrongTypes.subjectKey === "urdu" && wrongTypes.round === 0);
store.set(PRACTICE_STATE_KEY, JSON.stringify(STORED));
const savedWindow = globalThis.window;
delete globalThis.window;
check(
  "practice load: SSR (no window) -> fallback without touching storage",
  loadPracticeState("english").subjectKey === "english",
);
globalThis.window = savedWindow;

const FRESH_SEED = 999999;
check(
  "resolve: bare URL restores stored round + seed",
  JSON.stringify(resolvePracticeInitial("", STORED, isValid, FRESH_SEED)) === JSON.stringify(STORED),
);
check(
  "resolve: param naming the stored subject restores",
  JSON.stringify(resolvePracticeInitial("islamiyat", STORED, isValid, FRESH_SEED)) === JSON.stringify(STORED),
);
check(
  "resolve: bare URL restores round 0 + stored seed (first set)",
  JSON.stringify(resolvePracticeInitial("", { subjectKey: "islamiyat", round: 0, seed: 777 }, isValid, FRESH_SEED)) ===
    JSON.stringify({ subjectKey: "islamiyat", round: 0, seed: 777 }),
);
check(
  "resolve: different valid subject starts fresh (round 0, fresh seed)",
  JSON.stringify(resolvePracticeInitial("english", STORED, isValid, FRESH_SEED)) ===
    JSON.stringify({ subjectKey: "english", round: 0, seed: FRESH_SEED }),
);
check(
  "resolve: invalid param falls back to stored subject + restores",
  JSON.stringify(resolvePracticeInitial("nope", STORED, isValid, FRESH_SEED)) === JSON.stringify(STORED),
);
const storeBefore = JSON.stringify([...store.entries()]);
resolvePracticeInitial("", STORED, isValid, FRESH_SEED);
resolvePracticeInitial("english", STORED, isValid, FRESH_SEED);
check("resolve: pure — touches no storage", JSON.stringify([...store.entries()]) === storeBefore);

// ---------------------------------------------------------------- §2
// Full bare-URL resume chain: real data.ts + real tracking.ts.
const OUT = "/tmp/step2fixes-data";
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
check(
  "tsc harness: no unexpected type errors (TS5097 extension import only)",
  tscErrors.every((l) => l.includes("TS5097")),
  tscDiag.slice(0, 400),
);
check("tsc harness: emitted lib/data.js", fs.existsSync(join(OUT, "lib/data.js")));
const trackingJs = join(OUT, "lib/tracking.js");
if (fs.existsSync(trackingJs)) {
  fs.writeFileSync(trackingJs, fs.readFileSync(trackingJs, "utf8").replace('require("./fsrs.ts")', 'require("./fsrs")'));
}
execSync(`ln -sfn ${join(ROOT, "node_modules")} ${join(OUT, "node_modules")}`, { stdio: "ignore" });
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const tracking = await import("../src/lib/tracking.ts");

check("counts: 645 MCQs", data.QUESTIONS.length === 645, `got ${data.QUESTIONS.length}`);
check("counts: 110 notes", Object.values(data.NOTES).reduce((s, l) => s + l.length, 0) === 110);
check("counts: 70 flashcards", data.FLASHCARDS.length === 70, `got ${data.FLASHCARDS.length}`);
check("counts: 19 tracks", data.TRACKS.length === 19, `got ${data.TRACKS.length}`);
check("counts: 20 mocks", data.MOCKS.length === 20, `got ${data.MOCKS.length}`);

// The page's exact set construction: shuffled bank slice, seeded by
// subject-round-seed.
const buildSet = (subjectKey, round, seed) => {
  const bank = data.BY_SUBJECT[subjectKey] ?? [];
  const rand = data.mulberry32(data.hashSeed(`${subjectKey}-${round}-${seed}`));
  return data.shuffled(bank, rand).slice(0, 20);
};
const SET_SEED = 424242;
const setA = buildSet("islamiyat", 0, SET_SEED);
const setA2 = buildSet("islamiyat", 0, SET_SEED);
check("shuffle: same subject+round+seed -> identical 20 ids", setA.length === 20 && setA.every((q, i) => q.id === setA2[i].id));
const setFreshSeed = buildSet("islamiyat", 0, Date.now());
check(
  "shuffle: fresh seed -> different set (the old bare-URL bug)",
  setFreshSeed.some((q, i) => q.id !== setA[i].id),
);
const setRound1 = buildSet("islamiyat", 1, SET_SEED);
check("shuffle: bumped round -> different set", setRound1.some((q, i) => q.id !== setA[i].id));

// Stored v3 session for the run, as QuizRunner saves it.
const SCOPE = "practice:islamiyat:0";
const storedSession = {
  version: 3,
  scope: SCOPE,
  mode: "practice",
  title: "Quiz",
  questionIds: setA.map((q) => q.id),
  questionSeed: String(SET_SEED),
  optionSeed: 1,
  answers: {},
  firstPass: {},
  retries: [],
  answeredAt: {},
  responseMs: {},
  idx: 0,
  startedAt: Date.now(),
  deadlineTs: null,
  minutes: 0,
  submitted: false,
  trustedOnly: false,
  id: `${SCOPE}:1`,
  subject: "Islamiyat",
  contentRevision: tracking.KEY_VERSION,
};
store.clear();
tracking.saveSession(storedSession);

// Bare-URL reload: resolve restores round+seed -> fingerprint matches.
const resolved = resolvePracticeInitial("", { subjectKey: "islamiyat", round: 0, seed: SET_SEED }, (k) => Boolean(data.BY_SUBJECT[k]), Date.now());
const reloaded = buildSet(resolved.subjectKey, resolved.round, resolved.seed);
check(
  "resume: bare-URL reload rebuilds the identical set",
  reloaded.every((q, i) => q.id === setA[i].id),
);
const fp = {
  scope: SCOPE,
  subject: "Islamiyat",
  questionSeed: String(resolved.seed),
  questionIds: reloaded.map((q) => q.id),
  contentRevision: tracking.KEY_VERSION,
};
check(
  "resume: bare-URL reload session is compatible (no mismatch guard)",
  tracking.checkSessionCompatibility(tracking.loadSession(SCOPE), fp).compatible === true,
);
// The old behavior (fresh seed on bare URL) would NOT have resumed.
const staleFp = { ...fp, questionSeed: String(Date.now()), questionIds: setFreshSeed.map((q) => q.id) };
check(
  "resume: fresh-seed set is incompatible (guard still works)",
  tracking.checkSessionCompatibility(storedSession, staleFp).compatible === false,
);
// Subject change: old session stays stored, nothing stale applied.
const changed = resolvePracticeInitial("english", { subjectKey: "islamiyat", round: 0, seed: SET_SEED }, (k) => Boolean(data.BY_SUBJECT[k]), 555);
check("subject change: fresh round/seed for the new subject", changed.round === 0 && changed.seed === 555);
check("subject change: old session still stored + loadable", tracking.loadSession(SCOPE) !== null);
check("subject change: new scope has no session", tracking.loadSession("practice:english:0") === null);
check(
  "subject change: old session incompatible with the new scope",
  tracking.checkSessionCompatibility(storedSession, { ...fp, scope: "practice:english:0", subject: "English" }).reason === "scope",
);
// Genuinely changed sets still trip the guard.
check(
  "guard: one swapped question id -> questions",
  tracking.checkSessionCompatibility(storedSession, {
    ...fp,
    questionIds: [...fp.questionIds.slice(0, 19), "OTHER-ID"],
  }).reason === "questions",
);
check(
  "guard: same ids, different seed -> seed",
  tracking.checkSessionCompatibility(storedSession, { ...fp, questionSeed: "other" }).reason === "seed",
);
check(
  "guard: changed content revision -> revision",
  tracking.checkSessionCompatibility(storedSession, { ...fp, contentRevision: "v999" }).reason === "revision",
);

// ---------------------------------------------------------------- §3
// FSRS date helpers (real src/lib/fsrs.ts).
const fsrs = await import("../src/lib/fsrs.ts");
const ISO = "2026-11-14T10:00:00.000Z";
check(
  "due date: local formatting with year/month-short/day",
  fsrs.formatLocalDueDate(ISO) === new Date(ISO).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
);
check("due date: unparseable input returns verbatim", fsrs.formatLocalDueDate("not-a-date") === "not-a-date");
check("due date: empty input returns verbatim", fsrs.formatLocalDueDate("") === "");
// TZ-pinned child processes: 20:00 UTC on the 13th is 01:00 local on
// the 14th in Asia/Karachi, but still the 13th in UTC. A UTC-slice
// implementation would render the 13th in both.
const tzProbe = (tz) =>
  execSync(
    `node -e "import('${join(ROOT, "src/lib/fsrs.ts")}').then((m) => console.log(m.formatLocalDueDate('2026-11-13T20:00:00.000Z')))"`,
    { cwd: ROOT, env: { ...process.env, TZ: tz }, encoding: "utf8" },
  ).trim();
const khi = tzProbe("Asia/Karachi");
const utc = tzProbe("UTC");
check("due date: Asia/Karachi renders the LOCAL date (14th)", /14/.test(khi) && !/13/.test(khi) && /2026/.test(khi), khi);
check("due date: UTC renders the 13th (TZ actually moves the date)", /13/.test(utc) && !/14/.test(utc), utc);
check("due date: Karachi and UTC renderings differ", khi !== utc, `${khi} vs ${utc}`);

// The graded-card flow: review() output feeds formatLocalDueDate +
// formatFsrsInterval exactly as the flashcards page renders them.
const scheduler = await fsrs.initFsrsScheduler();
const now = new Date();
const graded = fsrs.reviewFsrsCard(scheduler, null, "good", now);
const gradedMs = new Date(graded.dueAt).getTime() - now.getTime();
check("graded flow: review returns a future ISO dueAt", !Number.isNaN(new Date(graded.dueAt).getTime()) && gradedMs > 0);
check(
  "graded flow: local date renders and differs from the raw ISO",
  fsrs.formatLocalDueDate(graded.dueAt).length > 0 && fsrs.formatLocalDueDate(graded.dueAt) !== graded.dueAt,
);
check("graded flow: interval label renders", fsrs.formatFsrsInterval(gradedMs, "en").length > 0);
check(
  "graded flow: again-grade interval is the 1m learning step",
  fsrs.formatFsrsInterval(new Date(fsrs.reviewFsrsCard(scheduler, null, "again", now).dueAt).getTime() - now.getTime(), "en") === "1m",
);

// ---------------------------------------------------------------- §4
// Source patterns: practice page wiring.
const practicePage = read("src/app/practice/page.tsx");
check("page: imports the resolver + loader from @/lib/practice", practicePage.includes('from "@/lib/practice"') && practicePage.includes("resolvePracticeInitial") && practicePage.includes("loadPracticeState"));
check("page: no local loadPracticeState copy remains", !practicePage.includes("function loadPracticeState"));
check("page: initial state resolves through the pure function", practicePage.includes("resolvePracticeInitial(initial, stored"));
check("page: old bare-URL condition is gone", !practicePage.includes("initial === stored.subjectKey ? stored.round"));
check("page: still persists subject/round/seed on change", practicePage.includes("PRACTICE_STATE_KEY, JSON.stringify({ subjectKey, round, seed })"));
check("page: manual subject change still starts a fresh set", practicePage.includes("setSubjectKey(e.target.value)") && practicePage.includes("setRound(0)"));
check("page: New set still bumps round + fresh seed", practicePage.includes("setRound((r) => r + 1)"));

// ---------------------------------------------------------------- §5
// Source patterns: flashcards next-due date + i18n + analysis spacing.
const flashPage = read("src/app/flashcards/page.tsx");
check("flash: lastGraded state exists", flashPage.includes("const [lastGraded, setLastGraded]"));
check("flash: grade() captures dueAt + interval at grade time", flashPage.includes("setLastGraded({ dueAt: updated.dueAt, intervalMs:"));
check("flash: startSession clears lastGraded", flashPage.includes("setLastGraded(null)"));
check("flash: renders the graded card's local date", flashPage.includes("formatLocalDueDate(lastGraded.dueAt)"));
check("flash: renders the graded card's interval alongside", flashPage.includes("formatFsrsInterval(lastGraded.intervalMs, lang)"));
check("flash: renders via the flashGradedNextReview key", flashPage.includes('tf("flashGradedNextReview"'));
check(
  "flash: learning/relearning state line shows date alongside interval",
  flashPage.includes("formatFsrsInterval(new Date(cardState.dueAt).getTime() - Date.now(), lang)} · ${formatLocalDueDate(cardState.dueAt)}"),
);
check("flash: review-state line still shows the local date", flashPage.includes(": formatLocalDueDate(cardState.dueAt)"));
check("flash: grade buttons keep their relative intervals", flashPage.includes('intervalLabel("again")') && flashPage.includes('intervalLabel("easy")'));

const i18n = read("src/lib/i18n.tsx");
const keyBlock = i18n.slice(i18n.indexOf("flashGradedNextReview"), i18n.indexOf("flashGradedNextReview") + 400);
check("i18n: flashGradedNextReview has en + roman + ur", keyBlock.includes("en:") && keyBlock.includes("roman:") && keyBlock.includes("ur:"));
check("i18n: flashGradedNextReview has {date} + {interval} slots", keyBlock.includes("{date}") && keyBlock.includes("{interval}"));
check("i18n: flashGradedNextReview ur text present", /اگلا جائزہ/.test(keyBlock));

const analysis = read("src/app/analysis/page.tsx");
const explicitSpaces = (analysis.match(/<\/span>\{" "\}\{tf\("weakOver"/g) ?? []).length;
const bareSpaces = (analysis.match(/<\/span> \{tf\("weakOver"/g) ?? []).length;
check("analysis: both weak-area lines use an explicit space", explicitSpaces === 2, `got ${explicitSpaces}`);
check("analysis: no bare-space weakOver line remains", bareSpaces === 0, `got ${bareSpaces}`);
check("analysis: provisional threshold untouched (total < 5)", analysis.includes("v.total < 5"));
check("analysis: provisional section still keyed to 1–4 questions", analysis.includes("provisionalHeading") && analysis.includes("run10Drill"));

console.log(failures === 0 ? "\nAll Step 2 fix tests passed." : `\n${failures} Step 2 fix test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
