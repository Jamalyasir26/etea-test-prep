// Scoring tests — plain node, no dependencies.
// Imports the real pure functions from src/lib/scoring.ts (Node 23.6+
// strips types on .ts imports; scoring.ts has no runtime imports).
// Covers: zero-penalty default, a penalty config, unanswered handling,
// raw-vs-exam separation, floor at zero, and resolveScoring precedence.
// Run: node scripts/test-scoring.mjs  (exit 0 = all pass)
import {
  computeExamScore,
  DEFAULT_SCORING,
  KPPSC_UNVERIFIED_SCORING,
  resolveScoring,
  scoringLabel,
  isValidScoringConfig,
} from "../src/lib/scoring.ts";

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
function approx(a, b) {
  return Math.abs(a - b) < 1e-9;
}

// --- Default: zero penalty, policy unknown ---
check("default config is zero penalty", DEFAULT_SCORING.wrongPenalty === 0);
check("default config is labelled policy unknown", DEFAULT_SCORING.policyStatus === "unknown");
check(
  "default label says policy unknown",
  scoringLabel(DEFAULT_SCORING).includes("policy unknown"),
);
check(
  "default label says no penalty",
  scoringLabel(DEFAULT_SCORING).includes("no penalty"),
);

// Zero-penalty scoring: exam score == raw correct count.
const zero = computeExamScore(DEFAULT_SCORING, { correct: 80, wrong: 10, unanswered: 10, total: 100 });
check("zero penalty: exam score equals correct count", zero.examScore === 80);
check("zero penalty: exam total equals question count", zero.examTotal === 100);
check("zero penalty: raw accuracy 80%", approx(zero.rawAccuracy, 80));
check("zero penalty: not floored", zero.floored === false);

// --- Penalty config (KPPSC unverified 0.25) ---
check(
  "KPPSC config is labelled unverified assumption",
  KPPSC_UNVERIFIED_SCORING.policyStatus === "unverified-assumption",
);
check(
  "KPPSC label says unverified assumption",
  scoringLabel(KPPSC_UNVERIFIED_SCORING).includes("unverified assumption"),
);
check(
  "KPPSC label shows the penalty",
  scoringLabel(KPPSC_UNVERIFIED_SCORING).includes("0.25"),
);

// 45-question KPPSC mock: 40 correct, 5 wrong, 0 unanswered.
const kppsc = computeExamScore(KPPSC_UNVERIFIED_SCORING, { correct: 40, wrong: 5, unanswered: 0, total: 45 });
check("penalty: 40 correct - 5 x 0.25 = 38.75", approx(kppsc.examScore, 38.75), `got ${kppsc.examScore}`);
check("penalty: exam total 45", kppsc.examTotal === 45);
check("penalty: raw accuracy 88.89%", approx(kppsc.rawAccuracy, (40 / 45) * 100));

// --- Unanswered handling: unanswered scores 0, is never penalised ---
const unans = computeExamScore(KPPSC_UNVERIFIED_SCORING, { correct: 30, wrong: 0, unanswered: 15, total: 45 });
check("unanswered: 30 correct, 15 unanswered -> exam 30", unans.examScore === 30);
check("unanswered: raw accuracy 66.67%", approx(unans.rawAccuracy, (30 / 45) * 100));
check("unanswered: unanswered count recorded", unans.unanswered === 15);

// Unanswered under the default config is also 0.
const unansZero = computeExamScore(DEFAULT_SCORING, { correct: 70, wrong: 0, unanswered: 30, total: 100 });
check("unanswered (default): exam 70, raw 70%", unansZero.examScore === 70 && approx(unansZero.rawAccuracy, 70));

// --- Raw vs exam separation: same attempt, two different numbers ---
const mixed = computeExamScore(KPPSC_UNVERIFIED_SCORING, { correct: 36, wrong: 4, unanswered: 5, total: 45 });
check("separation: raw accuracy is 80%", approx(mixed.rawAccuracy, 80));
check("separation: exam score is 35 of 45", approx(mixed.examScore, 35), `got ${mixed.examScore}`);
check("separation: raw and exam differ", mixed.rawAccuracy !== (mixed.examScore / mixed.examTotal) * 100);

// --- Floor at zero: all wrong with a penalty never goes negative ---
const allWrong = computeExamScore(KPPSC_UNVERIFIED_SCORING, { correct: 0, wrong: 45, unanswered: 0, total: 45 });
check("floor: all wrong -> exam 0, not negative", allWrong.examScore === 0);
check("floor: floored flag is true", allWrong.floored === true);
check("floor: raw accuracy still 0%", allWrong.rawAccuracy === 0);

// A config that allows negative scores honours it (opt-in only).
const allowNeg = computeExamScore(
  { ...KPPSC_UNVERIFIED_SCORING, allowNegative: true },
  { correct: 0, wrong: 4, unanswered: 0, total: 4 },
);
check("allowNegative: -1 is kept when allowed", approx(allowNeg.examScore, -1));
check("allowNegative: floored flag is false", allowNeg.floored === false);

// --- Higher marks per question scale the exam total ---
const twoMarks = computeExamScore(
  { ...DEFAULT_SCORING, correctMarks: 2 },
  { correct: 40, wrong: 10, unanswered: 0, total: 50 },
);
check("2 marks per question: exam 80 of 100", twoMarks.examScore === 80 && twoMarks.examTotal === 100);
check("2 marks per question: raw accuracy still 80%", approx(twoMarks.rawAccuracy, 80));

// --- Empty attempt: no division by zero ---
const empty = computeExamScore(DEFAULT_SCORING, { correct: 0, wrong: 0, unanswered: 0, total: 0 });
check("empty: raw accuracy 0, exam 0 of 0", empty.rawAccuracy === 0 && empty.examScore === 0 && empty.examTotal === 0);

// --- Invalid config falls back to the default (never crashes) ---
const bad = computeExamScore({ correctMarks: 0, wrongPenalty: -1, policyStatus: "official", policyNote: "" }, { correct: 5, wrong: 5, unanswered: 0, total: 10 });
check("invalid config falls back to default", bad.config === DEFAULT_SCORING && bad.examScore === 5);
check("isValidScoringConfig rejects a bad config", isValidScoringConfig({ correctMarks: 0, wrongPenalty: 0, policyStatus: "unknown", policyNote: "x" }) === false);
check("isValidScoringConfig accepts the default", isValidScoringConfig(DEFAULT_SCORING) === true);

// --- resolveScoring precedence: override > mock > default ---
const mockCfg = { ...KPPSC_UNVERIFIED_SCORING };
check(
  "resolve: no override, no mock -> default",
  resolveScoring(undefined, undefined).config === DEFAULT_SCORING,
);
check(
  "resolve: mock config wins over default",
  resolveScoring(mockCfg, undefined).source === "mock" &&
    resolveScoring(mockCfg, undefined).config === mockCfg,
);
check(
  "resolve: override 'zero' beats a penalty mock config",
  resolveScoring(mockCfg, "zero").config === DEFAULT_SCORING &&
    resolveScoring(mockCfg, "zero").source === "override-zero",
);
check(
  "resolve: override '0.25' beats a zero mock config",
  resolveScoring(DEFAULT_SCORING, "0.25").config === KPPSC_UNVERIFIED_SCORING &&
    resolveScoring(DEFAULT_SCORING, "0.25").source === "override-penalty",
);
check(
  "resolve: unknown override is ignored, mock config kept",
  resolveScoring(mockCfg, "bogus").source === "mock",
);
check(
  "resolve: unknown override with no mock -> default",
  resolveScoring(undefined, "bogus").config === DEFAULT_SCORING,
);
check(
  "resolve: invalid mock config falls back to default",
  resolveScoring({ correctMarks: -2, wrongPenalty: 0, policyStatus: "unknown", policyNote: "x" }, undefined).config === DEFAULT_SCORING,
);

console.log(failures === 0 ? "\nAll scoring tests passed." : `\n${failures} scoring test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
