// Phase 3 practice-advance tests — plain node, no dependencies.
// Covers the frozen API in src/lib/practice-advance.ts:
// computeTopicStats / buildReviseQueue / buildAdaptiveSet.
// Fixture attempts are built by hand in this file (no localStorage,
// no bank reads). Question stubs carry only { id, topic } — the only
// fields buildAdaptiveSet reads — plus nothing else.
//
// HOW THE REAL MODULE IS LOADED (read before "simplifying" this):
// practice-advance.ts value-imports hashSeed/mulberry32 from ./data,
// and data.ts cannot be imported by plain node type-stripping: its
// `import content from "../data/content.json"` needs an import
// attribute ("Module ... needs an import attribute of type: json",
// verified 2026-11-17), and its extensionless ./banks import is not
// resolvable by node ESM either. So — like scripts/test-retrieval.mjs
// and scripts/test-api-guard.mjs — this suite compiles the REAL
// practice-advance.ts to CommonJS in /tmp with tsc and requires the
// COMPILED real functions, never a copy. The compiled data.js from
// the same emit supplies the real shuffled()/hashSeed()/mulberry32()
// for the no-history fallback comparison.
//   One gotcha: the compile exits 2 with the PRE-EXISTING error
//   TS5097 from src/lib/tracking.ts's `from "./fsrs.ts"` import
//   (that spelling needs allowImportingTsExtensions, which forbids
//   emit). tsc still emits usable output, so the suite runs tsc via
//   spawnSync, tolerates the exit code, and then asserts (a) the
//   emitted artifact exists and loads, and (b) TS5097 from
//   tracking.ts is the ONLY tsc diagnostic — a type error in
//   practice-advance.ts itself still fails the suite. Full type
//   checking remains `npx tsc --noEmit` in the battery.
// Run: node scripts/test-phase3-practice.mjs (exit 0 = all pass)

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/phase3-practice";

let failures = 0;
let passes = 0;
function check(name, cond, detail = "") {
  if (cond) {
    passes += 1;
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const show = (v) => JSON.stringify(v);

// ---- compile the real module (see header) ----
fs.rmSync(OUT, { recursive: true, force: true });
const tsc = spawnSync(
  "npx",
  [
    "tsc",
    "src/lib/practice-advance.ts",
    "--outDir",
    OUT,
    "--module",
    "commonjs",
    "--target",
    "es2020",
    "--resolveJsonModule",
    "--esModuleInterop",
    "--skipLibCheck",
    "--moduleResolution",
    "node",
  ],
  { cwd: ROOT, encoding: "utf8" },
);
const tscOutput = `${tsc.stdout || ""}${tsc.stderr || ""}`;
const tscErrors = tscOutput.split("\n").filter((l) => /error TS\d+/.test(l));
const onlyKnownError = tscErrors.every((l) =>
  /tracking\.ts\(\d+,\d+\): error TS5097/.test(l),
);
check(
  "practice-advance: tsc emit has no diagnostics except known tracking.ts TS5097",
  onlyKnownError,
  tscErrors.join(" | "),
);
const emitted = join(OUT, "lib", "practice-advance.js");
if (!onlyKnownError || !fs.existsSync(emitted)) {
  // Never require a possibly truncated emit: fail cleanly instead.
  console.log(`FAIL  practice-advance: tsc emit unusable (see diagnostics above)`);
  console.log(tscOutput);
  process.exit(1);
}
const require = createRequire(import.meta.url);
let compiled;
try {
  compiled = {
    pa: require(emitted),
    data: require(join(OUT, "lib", "data.js")),
  };
} catch (e) {
  console.log(`FAIL  practice-advance: compiled module failed to load — ${e.message}`);
  process.exit(1);
}
const { computeTopicStats, buildReviseQueue, buildAdaptiveSet } = compiled.pa;
const { shuffled, mulberry32, hashSeed } = compiled.data;

// ---- §0 source pins: frozen import/purity contract ----
const src = fs.readFileSync(join(ROOT, "src/lib/practice-advance.ts"), "utf8");
check("practice-advance: exports all three functions", [computeTopicStats, buildReviseQueue, buildAdaptiveSet].every((f) => typeof f === "function"));
check("practice-advance: no \"use client\" directive line", !/^\s*["']use client["']\s*;?\s*$/m.test(src));
check("practice-advance: no localStorage/sessionStorage use", !src.includes("localStorage.") && !src.includes("localStorage[") && !src.includes("sessionStorage.") && !src.includes("sessionStorage["));
check("practice-advance: no JSX", !src.includes("<div") && !src.includes("React"));
check(
  "practice-advance: type-only imports from ./tracking and ./data",
  src.includes('import type { Attempt, ItemRecord } from "./tracking";') &&
    src.includes('import type { Question } from "./data";'),
);
const valueImports = src.split("\n").filter((l) => /^\s*import\s+(?!type\b)/.test(l));
check(
  "practice-advance: only value import is hashSeed/mulberry32 from ./data",
  valueImports.length === 1 && valueImports[0].includes("hashSeed") && valueImports[0].includes("mulberry32") && valueImports[0].includes('./data"'),
  show(valueImports),
);

// ---- fixture builders ----
const rec = (questionId, topic, correct, answeredAt, extra = {}) => ({
  questionId,
  question: "Q?",
  topic,
  firstAnswer: correct ? "A" : null,
  finalAnswer: correct ? "A" : null,
  correctAnswer: "A",
  correct,
  mode: "practice",
  source: "bank",
  keyVersion: "v3",
  answeredAt,
  ...extra,
});
const att = (id, kind, date, itemRecords, extra = {}) => ({
  id,
  kind,
  title: "t",
  total: itemRecords ? itemRecords.length : 0,
  correct: itemRecords ? itemRecords.filter((r) => r.correct).length : 0,
  seconds: 60,
  date,
  ...(itemRecords === undefined ? {} : { itemRecords }),
  ...extra,
});
const q = (id, topic) => ({ id, topic });
const ids = (arr) => arr.map((x) => x.id);
const qids = (arr) => arr.map((e) => e.questionId);

// ---- §1 computeTopicStats ----
const A1 = att("a1", "quiz", "2026-11-10T10:00:00.000Z", [
  rec("Q1", "Algebra", true, "2026-11-10T10:01:00.000Z"),
  rec("Q2", "Algebra", false, "2026-11-10T10:02:00.000Z"),
  rec("Q3", "Geometry", true, "2026-11-10T10:03:00.000Z"),
]);
const A2 = att("a2", "mock", "2026-11-11T11:00:00.000Z", [
  rec("Q1", "Algebra", false, "2026-11-11T11:01:00.000Z"),
  rec("Q4", "Geometry", false, "2026-11-11T11:02:00.000Z"),
  rec("Q5", "", true, "2026-11-11T11:03:00.000Z"),
  rec("Q6", "   ", false, "2026-11-11T11:04:00.000Z"),
]);
const A3flash = att("a3", "flash", "2026-11-12T09:00:00.000Z", [
  rec("Q7", "Algebra", true, "2026-11-12T09:01:00.000Z"),
]);
const A4noRecords = att("a4", "quiz", "2026-11-12T09:00:00.000Z", undefined, { total: 5, correct: 5 });
const A5 = att("a5", "quiz", "2026-11-13T09:00:00.000Z", [
  rec("Q8", "Algebra", true, null),
  rec("Q9", "Calculus", false, null),
]);
const mainStats = computeTopicStats([A1, A2, A3flash, A4noRecords, A5]);
check("topicStats: 3 topics from main fixture", mainStats.length === 3, show(mainStats));
check(
  "topicStats: sort accuracy ASC, total DESC, topic ASC",
  eq(mainStats.map((s) => s.topic), ["Calculus", "Algebra", "Geometry"]),
  show(mainStats.map((s) => s.topic)),
);
check(
  "topicStats: Calculus exact (0/1, acc 0, 1 attempt, lastAnsweredAt null)",
  eq(mainStats[0], { topic: "Calculus", correct: 0, total: 1, accuracy: 0, attempts: 1, lastAnsweredAt: null }),
  show(mainStats[0]),
);
check(
  "topicStats: Algebra exact (2/4, acc 50, 3 attempts, max answeredAt)",
  eq(mainStats[1], { topic: "Algebra", correct: 2, total: 4, accuracy: 50, attempts: 3, lastAnsweredAt: "2026-11-11T11:01:00.000Z" }),
  show(mainStats[1]),
);
check(
  "topicStats: Geometry exact (1/2, acc 50, 2 attempts, max answeredAt)",
  eq(mainStats[2], { topic: "Geometry", correct: 1, total: 2, accuracy: 50, attempts: 2, lastAnsweredAt: "2026-11-11T11:02:00.000Z" }),
  show(mainStats[2]),
);
check(
  "topicStats: no empty/blank topic emitted",
  mainStats.every((s) => s.topic.trim().length > 0),
);
check("topicStats: flash attempts excluded even with itemRecords", eq(computeTopicStats([A3flash]), []));
check("topicStats: attempts without itemRecords contribute nothing", eq(computeTopicStats([A4noRecords]), []));
check("topicStats: empty input -> []", eq(computeTopicStats([]), []));
check(
  "topicStats: all-blank-topic records -> []",
  eq(computeTopicStats([att("b", "quiz", "2026-11-10T10:00:00.000Z", [rec("Q1", "", true, null), rec("Q2", " ", false, null)])]), []),
);
check(
  "topicStats: equal accuracy+total sorts topic ASC",
  eq(
    computeTopicStats([
      att("t1", "quiz", "2026-11-10T10:00:00.000Z", [rec("Q1", "Beta", true, null), rec("Q2", "Beta", false, null)]),
      att("t2", "quiz", "2026-11-10T10:00:00.000Z", [rec("Q3", "Alpha", true, null), rec("Q4", "Alpha", false, null)]),
    ]).map((s) => s.topic),
    ["Alpha", "Beta"],
  ),
);
check(
  "topicStats: accuracy ASC beats total (10% over 10 beats 100% over 2)",
  eq(
    computeTopicStats([
      att("t3", "quiz", "2026-11-10T10:00:00.000Z", [
        ...Array.from({ length: 9 }, (_, i) => rec(`W${i}`, "Weak", false, null)),
        rec("W9", "Weak", true, null),
        rec("S1", "Strong", true, null),
        rec("S2", "Strong", true, null),
      ]),
    ]).map((s) => s.topic),
    ["Weak", "Strong"],
  ),
);
check(
  "topicStats: attempts counts attempts, not records (2 records, 1 attempt)",
  eq(computeTopicStats([att("t4", "quiz", "2026-11-10T10:00:00.000Z", [rec("Q1", "Solo", true, null), rec("Q2", "Solo", false, null)])]), [
    { topic: "Solo", correct: 1, total: 2, accuracy: 50, attempts: 1, lastAnsweredAt: null },
  ]),
);
{
  const input = [A1, A2, A3flash, A4noRecords, A5];
  const before = show(input);
  const once = computeTopicStats(input);
  const twice = computeTopicStats(input);
  check("topicStats: deterministic (same input twice -> identical)", eq(once, twice));
  check("topicStats: input not mutated", show(input) === before);
}

// ---- §2 buildReviseQueue ----
const B1 = att("b1", "quiz", "2026-11-10T09:00:00.000Z", [
  rec("Q1", "Algebra", false, "2026-11-10T09:01:00.000Z"),
  rec("Q2", "Geometry", true, "2026-11-10T09:02:00.000Z"),
  rec("Q3", "Algebra", false, "2026-11-10T09:03:00.000Z"),
]);
const B2 = att("b2", "mock", "2026-11-11T09:00:00.000Z", [
  rec("Q1", "Algebra", true, "2026-11-11T09:01:00.000Z"),
  rec("Q3", "Algebra", false, "2026-11-11T09:02:00.000Z"),
  rec("Q4", "Science", false, "2026-11-11T09:03:00.000Z", { firstAnswer: null, finalAnswer: null }),
]);
const B3 = att("b3", "quiz", "2026-11-09T09:00:00.000Z", [
  rec("Q2", "Geometry", false, "2026-11-09T09:01:00.000Z"),
]);
const B4 = att("b4", "quiz", "2026-11-11T09:00:00.000Z", [
  rec("Q4", "Science", true, "2026-11-11T09:04:00.000Z"),
]);
const B5flash = att("b5", "flash", "2026-11-12T09:00:00.000Z", [
  rec("Q5", "Algebra", false, "2026-11-12T09:01:00.000Z"),
]);
const B6noRecords = att("b6", "quiz", "2026-11-12T09:00:00.000Z", undefined);
const mainQueue = buildReviseQueue([B1, B2, B3, B4, B5flash, B6noRecords]);
check("revise: main fixture yields only Q3", eq(qids(mainQueue), ["Q3"]), show(mainQueue));
check(
  "revise: Q3 exact (wrongCount 2, lastWrongAt latest wrong attempt, max answeredAt)",
  eq(mainQueue[0], {
    questionId: "Q3",
    topic: "Algebra",
    wrongCount: 2,
    lastWrongAt: "2026-11-11T09:00:00.000Z",
    lastAnsweredAt: "2026-11-11T09:02:00.000Z",
  }),
  show(mainQueue[0]),
);
check("revise: clearing rule — wrong then correct removes Q1", !mainQueue.some((e) => e.questionId === "Q1"));
check("revise: date order, not input order — earliest wrong Q2 stays cleared by later correct", !mainQueue.some((e) => e.questionId === "Q2"));
check("revise: same-date tie broken by input order — later B4 correct clears Q4", !mainQueue.some((e) => e.questionId === "Q4"));
check("revise: flash attempts excluded", !mainQueue.some((e) => e.questionId === "Q5"));
check("revise: attempts without itemRecords contribute nothing", eq(buildReviseQueue([B6noRecords]), []));
check("revise: empty input -> []", eq(buildReviseQueue([]), []));
check(
  "revise: correct then wrong re-enters the queue",
  eq(
    buildReviseQueue([
      att("c1", "quiz", "2026-11-10T09:00:00.000Z", [rec("Q9", "Algebra", true, "2026-11-10T09:01:00.000Z")]),
      att("c2", "quiz", "2026-11-11T09:00:00.000Z", [rec("Q9", "Algebra", false, "2026-11-11T09:01:00.000Z")]),
    ]),
    [{ questionId: "Q9", topic: "Algebra", wrongCount: 1, lastWrongAt: "2026-11-11T09:00:00.000Z", lastAnsweredAt: "2026-11-11T09:01:00.000Z" }],
  ),
);
check(
  "revise: unanswered records (correct === false) DO enter the queue",
  eq(
    buildReviseQueue([
      att("d1", "quiz", "2026-11-10T09:00:00.000Z", [rec("Q7", "Science", false, "2026-11-10T09:01:00.000Z", { firstAnswer: null, finalAnswer: null })]),
    ]).map((e) => e.questionId),
    ["Q7"],
  ),
);
{
  const ordered = buildReviseQueue([
    att("e1", "quiz", "2026-11-10T09:00:00.000Z", [rec("QA", "T", false, null), rec("QB", "T", false, null)]),
    att("e2", "quiz", "2026-11-12T09:00:00.000Z", [rec("QB", "T", false, null), rec("QC", "T", false, null)]),
    att("e3", "quiz", "2026-11-11T09:00:00.000Z", [rec("QD", "T", false, null)]),
  ]);
  check(
    "revise: order lastWrongAt DESC, questionId ASC on ties",
    eq(qids(ordered), ["QB", "QC", "QD", "QA"]),
    show(qids(ordered)),
  );
  check(
    "revise: QB wrongCount counts all wrong records (2)",
    ordered[0].wrongCount === 2 && ordered[0].lastWrongAt === "2026-11-12T09:00:00.000Z",
    show(ordered[0]),
  );
}
check(
  "revise: lastWrongAt is the latest WRONG record's attempt date (wrong/correct/wrong)",
  eq(
    buildReviseQueue([
      att("f1", "quiz", "2026-11-10T09:00:00.000Z", [rec("QZ", "T", false, null)]),
      att("f2", "quiz", "2026-11-11T09:00:00.000Z", [rec("QZ", "T", true, null)]),
      att("f3", "quiz", "2026-11-12T09:00:00.000Z", [rec("QZ", "T", false, null)]),
    ]),
    [{ questionId: "QZ", topic: "T", wrongCount: 2, lastWrongAt: "2026-11-12T09:00:00.000Z", lastAnsweredAt: null }],
  ),
);
check(
  "revise: record array order decides within one attempt (wrong-then-correct clears, correct-then-wrong enters)",
  eq(
    qids(
      buildReviseQueue([
        att("g1", "quiz", "2026-11-10T09:00:00.000Z", [
          rec("QW", "T", false, null),
          rec("QW", "T", true, null),
          rec("QV", "T", true, null),
          rec("QV", "T", false, null),
        ]),
      ]),
    ),
    ["QV"],
  ),
);
check(
  "revise: lastAnsweredAt null when all records null",
  eq(
    buildReviseQueue([att("h1", "quiz", "2026-11-10T09:00:00.000Z", [rec("QY", "T", false, null)])]),
    [{ questionId: "QY", topic: "T", wrongCount: 1, lastWrongAt: "2026-11-10T09:00:00.000Z", lastAnsweredAt: null }],
  ),
);
check(
  "revise: lastAnsweredAt is the MAX across records, not the latest record's",
  buildReviseQueue([
    att("h2", "quiz", "2026-11-10T09:00:00.000Z", [rec("QY", "T", false, "2026-11-10T10:00:00.000Z")]),
    att("h3", "quiz", "2026-11-11T09:00:00.000Z", [rec("QY", "T", false, "2026-11-11T09:00:00.000Z")]),
  ])[0].lastAnsweredAt === "2026-11-11T09:00:00.000Z",
);
check(
  "revise: entry topic comes from the latest (deciding) record",
  buildReviseQueue([
    att("i1", "quiz", "2026-11-10T09:00:00.000Z", [rec("QX", "Old", false, null)]),
    att("i2", "quiz", "2026-11-11T09:00:00.000Z", [rec("QX", "New", false, null)]),
  ])[0].topic === "New",
);
check(
  "revise: blank-topic wrong records still enter (queue is keyed by questionId)",
  eq(
    qids(buildReviseQueue([att("j1", "quiz", "2026-11-10T09:00:00.000Z", [rec("QZ", "", false, null)])])),
    ["QZ"],
  ),
);
{
  const input = [B1, B2, B3, B4, B5flash, B6noRecords];
  const before = show(input.map((a) => a.id));
  const once = buildReviseQueue(input);
  const twice = buildReviseQueue(input);
  check("revise: deterministic (same input twice -> identical)", eq(once, twice));
  check("revise: input order not mutated", show(input.map((a) => a.id)) === before);
}

// ---- §3 buildAdaptiveSet ----
const bank20 = Array.from({ length: 20 }, (_, i) => q(`q${i}`, "T"));
{
  let ok = true;
  let detail = "";
  for (const seed of ["s1", "adaptive-seed", "xyz"]) {
    for (const count of [0, 1, 5, 20, 99]) {
      const got = ids(buildAdaptiveSet({ bank: bank20, topicStats: [], count, seed }));
      const want = ids(shuffled(bank20, mulberry32(hashSeed(seed))).slice(0, count));
      if (!eq(got, want)) {
        ok = false;
        detail = `seed=${seed} count=${count} got=${got} want=${want}`;
        break;
      }
    }
    if (!ok) break;
  }
  check("adaptive: empty topicStats equals uniform shuffled() with same RNG (3 seeds x 5 counts)", ok, detail);
}
const statsWS = [
  { topic: "Weak", correct: 0, total: 10, accuracy: 0, attempts: 2, lastAnsweredAt: null },
  { topic: "Strong", correct: 10, total: 10, accuracy: 100, attempts: 2, lastAnsweredAt: null },
];
const bankWS = [
  ...Array.from({ length: 10 }, (_, i) => q(`W${i}`, "Weak")),
  ...Array.from({ length: 10 }, (_, i) => q(`S${i}`, "Strong")),
];
{
  const once = buildAdaptiveSet({ bank: bankWS, topicStats: statsWS, count: 10, seed: "det-seed" });
  const twice = buildAdaptiveSet({ bank: bankWS, topicStats: statsWS, count: 10, seed: "det-seed" });
  check("adaptive: deterministic (same inputs twice -> identical id order)", eq(ids(once), ids(twice)));
}
check(
  "adaptive: weak topic first pick on fixed seed probe-1 (2-question bank)",
  ids(buildAdaptiveSet({ bank: [q("W1", "Weak"), q("S1", "Strong")], topicStats: statsWS, count: 1, seed: "probe-1" }))[0] === "W1",
);
check(
  "adaptive: same seed probe-1 WITHOUT history picks Strong first (weighting flips the pick)",
  ids(shuffled([q("W1", "Weak"), q("S1", "Strong")], mulberry32(hashSeed("probe-1"))).slice(0, 1))[0] === "S1",
);
{
  const order = ids(buildAdaptiveSet({ bank: bankWS, topicStats: statsWS, count: 20, seed: "share-2" }));
  const head5weak = order.slice(0, 5).filter((x) => x.startsWith("W")).length;
  const head10weak = order.slice(0, 10).filter((x) => x.startsWith("W")).length;
  check(
    "adaptive: weak over-representation on fixed seed share-2 (first pick weak, head-5 all weak, head-10 9 weak)",
    order[0] === "W1" && head5weak === 5 && head10weak === 9,
    `order=${order.join(",")}`,
  );
}
check(
  "adaptive: no repeats within a set (20 picks from 20)",
  (() => {
    const got = ids(buildAdaptiveSet({ bank: bankWS, topicStats: statsWS, count: 20, seed: "norep" }));
    return got.length === 20 && new Set(got).size === 20;
  })(),
);
check(
  "adaptive: count clamp — count > bank returns the whole bank (no-history path)",
  eq(ids(buildAdaptiveSet({ bank: bank20, topicStats: [], count: 99, seed: "clamp" })).sort(), ids(bank20).sort()),
);
check(
  "adaptive: count clamp — count > bank returns the whole bank (weighted path)",
  (() => {
    const got = ids(buildAdaptiveSet({ bank: bankWS, topicStats: statsWS, count: 99, seed: "clamp" }));
    return got.length === 20 && new Set(got).size === 20;
  })(),
);
check("adaptive: count clamp — count 0 -> []", eq(buildAdaptiveSet({ bank: bankWS, topicStats: statsWS, count: 0, seed: "clamp" }), []));
check("adaptive: count clamp — negative count -> []", eq(buildAdaptiveSet({ bank: bankWS, topicStats: statsWS, count: -3, seed: "clamp" }), []));
check(
  "adaptive: unseen topic (absent from stats) still appears in a tiny bank",
  (() => {
    const got = ids(
      buildAdaptiveSet({
        bank: [q("W1", "Weak"), q("U1", "Unseen"), q("U2", "Unseen")],
        topicStats: [statsWS[0]],
        count: 3,
        seed: "unseen",
      }),
    );
    return got.length === 3 && got.includes("U1") && got.includes("U2") && got.includes("W1");
  })(),
);
check(
  "adaptive: small-sample topic (total < 3) weighs 1, same as a 100% topic",
  eq(
    ids(buildAdaptiveSet({ bank: [q("a", "T"), q("b", "T"), q("c", "U")], topicStats: [{ topic: "T", correct: 0, total: 2, accuracy: 0, attempts: 1, lastAnsweredAt: null }], count: 3, seed: "eq" })),
    ids(buildAdaptiveSet({ bank: [q("a", "T"), q("b", "T"), q("c", "U")], topicStats: [{ topic: "T", correct: 10, total: 10, accuracy: 100, attempts: 1, lastAnsweredAt: null }], count: 3, seed: "eq" })),
  ),
);
check(
  "adaptive: total == 3 gets the weak weight (same output as total 10 at 0%)",
  eq(
    ids(buildAdaptiveSet({ bank: [q("a", "T"), q("b", "T"), q("c", "U")], topicStats: [{ topic: "T", correct: 0, total: 3, accuracy: 0, attempts: 1, lastAnsweredAt: null }], count: 3, seed: "eq" })),
    ids(buildAdaptiveSet({ bank: [q("a", "T"), q("b", "T"), q("c", "U")], topicStats: [{ topic: "T", correct: 0, total: 10, accuracy: 0, attempts: 1, lastAnsweredAt: null }], count: 3, seed: "eq" })),
  ),
);
check(
  "adaptive: total == 3 (weighted) differs from total == 2 (weight 1) on fixed seed t3-0",
  !eq(
    ids(buildAdaptiveSet({ bank: [q("a", "T"), q("b", "T"), q("c", "U")], topicStats: [{ topic: "T", correct: 0, total: 3, accuracy: 0, attempts: 1, lastAnsweredAt: null }], count: 3, seed: "t3-0" })),
    ids(buildAdaptiveSet({ bank: [q("a", "T"), q("b", "T"), q("c", "U")], topicStats: [{ topic: "T", correct: 0, total: 2, accuracy: 0, attempts: 1, lastAnsweredAt: null }], count: 3, seed: "t3-0" })),
  ),
);
check(
  "adaptive: 50% topic (weight 2) differs from both weight-1 and weight-3 on fixed seed w2-16",
  (() => {
    const bank4 = [q("a", "T"), q("b", "T"), q("c", "U"), q("e", "U")];
    const w2 = ids(buildAdaptiveSet({ bank: bank4, topicStats: [{ topic: "T", correct: 5, total: 10, accuracy: 50, attempts: 1, lastAnsweredAt: null }], count: 4, seed: "w2-16" }));
    const w1 = ids(buildAdaptiveSet({ bank: bank4, topicStats: [{ topic: "T", correct: 10, total: 10, accuracy: 100, attempts: 1, lastAnsweredAt: null }], count: 4, seed: "w2-16" }));
    const w3 = ids(buildAdaptiveSet({ bank: bank4, topicStats: [{ topic: "T", correct: 0, total: 10, accuracy: 0, attempts: 1, lastAnsweredAt: null }], count: 4, seed: "w2-16" }));
    return !eq(w2, w1) && !eq(w2, w3);
  })(),
);
check(
  "adaptive: same seed + changed stats -> different set (history sensitivity, seed sens-0)",
  !eq(
    ids(buildAdaptiveSet({ bank: bankWS, topicStats: statsWS, count: 10, seed: "sens-0" })),
    ids(
      buildAdaptiveSet({
        bank: bankWS,
        topicStats: [
          { topic: "Weak", correct: 10, total: 10, accuracy: 100, attempts: 2, lastAnsweredAt: null },
          { topic: "Strong", correct: 0, total: 10, accuracy: 0, attempts: 2, lastAnsweredAt: null },
        ],
        count: 10,
        seed: "sens-0",
      }),
    ),
  ),
);
check("adaptive: empty bank -> [] (with and without stats)", eq(buildAdaptiveSet({ bank: [], topicStats: statsWS, count: 5, seed: "e" }), []) && eq(buildAdaptiveSet({ bank: [], topicStats: [], count: 5, seed: "e" }), []));
check(
  "adaptive: stats for topics absent from the bank are ignored, no crash",
  (() => {
    const got = ids(buildAdaptiveSet({ bank: [q("a", "T")], topicStats: [{ topic: "Ghost", correct: 0, total: 9, accuracy: 0, attempts: 1, lastAnsweredAt: null }], count: 1, seed: "ghost" }));
    return eq(got, ["a"]);
  })(),
);
{
  const bankCopy = [q("a", "T"), q("b", "U"), q("c", "T")];
  const statsCopy = [{ topic: "T", correct: 0, total: 5, accuracy: 0, attempts: 1, lastAnsweredAt: null }];
  const bankBefore = show(ids(bankCopy));
  const statsBefore = show(statsCopy);
  buildAdaptiveSet({ bank: bankCopy, topicStats: statsCopy, count: 2, seed: "mut" });
  buildAdaptiveSet({ bank: bankCopy, topicStats: [], count: 2, seed: "mut" });
  check("adaptive: bank and topicStats not mutated", show(ids(bankCopy)) === bankBefore && show(statsCopy) === statsBefore);
  const picked = buildAdaptiveSet({ bank: bankCopy, topicStats: statsCopy, count: 3, seed: "mut" });
  check("adaptive: returns the same question object references (draw order only)", picked.every((p) => bankCopy.includes(p)));
}

if (failures > 0) {
  console.log(`\n${failures} FAILURES (${passes} passed)`);
  process.exit(1);
}
console.log(`\nAll Phase 3 practice checks passed (${passes} checks).`);
