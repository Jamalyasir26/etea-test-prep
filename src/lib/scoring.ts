// Stage 1 P0.1 — configurable exam scoring (negative marking).
// Pure functions only (no imports, no localStorage) so they can be unit
// tested with plain node: node scripts/test-scoring.mjs
//
// TRUTH RULES (do not weaken them):
// - ETEA has published NO negative-marking policy for these projects, so
//   the DEFAULT is zero penalty and it is labelled "policy unknown"
//   wherever a score is shown.
// - 0.25 negative marking for KPPSC is UNVERIFIED — it is never presented
//   as fact; any config that uses it carries policyStatus
//   "unverified-assumption" and says so in its label.
// - Raw accuracy and exam score are ALWAYS two separate numbers: raw
//   accuracy = correct / total; exam score = correct*correctMarks -
//   wrong*wrongPenalty (floored at 0 unless the config allows negative).

export type ScoringPolicyStatus = "unknown" | "unverified-assumption" | "official";

export type ScoringConfig = {
  correctMarks: number; // marks per correct answer (> 0)
  wrongPenalty: number; // marks deducted per wrong answer (>= 0)
  unansweredMarks?: number; // marks per unanswered question (default 0)
  allowNegative?: boolean; // default false — exam score floors at 0
  policyStatus: ScoringPolicyStatus;
  policyNote: string; // shown wherever the score is shown
};

/** Default for every ETEA mock: zero penalty, policy unknown. */
export const DEFAULT_SCORING: ScoringConfig = {
  correctMarks: 1,
  wrongPenalty: 0,
  policyStatus: "unknown",
  policyNote:
    "ETEA has published no negative-marking policy for these projects — scored with zero penalty (policy unknown).",
};

/** KPPSC 0.25 penalty — UNVERIFIED assumption, never stated as fact. */
export const KPPSC_UNVERIFIED_SCORING: ScoringConfig = {
  correctMarks: 1,
  wrongPenalty: 0.25,
  policyStatus: "unverified-assumption",
  policyNote:
    "0.25 marks deducted per wrong answer — an unverified assumption: no official KPPSC source confirms negative marking for this test.",
};

/** A config is usable only when its numbers are sane; otherwise the
 *  caller must fall back to DEFAULT_SCORING (never crash, never invent). */
export function isValidScoringConfig(c: unknown): c is ScoringConfig {
  if (!c || typeof c !== "object") return false;
  const r = c as Record<string, unknown>;
  return (
    typeof r.correctMarks === "number" &&
    r.correctMarks > 0 &&
    typeof r.wrongPenalty === "number" &&
    r.wrongPenalty >= 0 &&
    (r.unansweredMarks === undefined || (typeof r.unansweredMarks === "number" && r.unansweredMarks <= 0)) &&
    (r.allowNegative === undefined || typeof r.allowNegative === "boolean") &&
    (r.policyStatus === "unknown" || r.policyStatus === "unverified-assumption" || r.policyStatus === "official") &&
    typeof r.policyNote === "string" &&
    r.policyNote.length > 0
  );
}

export type ScoreInput = {
  correct: number;
  wrong: number;
  unanswered: number;
  total: number;
};

export type ScoreResult = ScoreInput & {
  rawAccuracy: number; // 0..100 — correct / total, penalty-free
  examScore: number; // correct*correctMarks - wrong*wrongPenalty (+ unanswered marks), floored at 0 unless allowNegative
  examTotal: number; // total * correctMarks
  floored: boolean; // true when the raw exam score went below 0 and was floored
  config: ScoringConfig;
};

/** Raw accuracy and exam score, computed separately from the same counts. */
export function computeExamScore(config: ScoringConfig, input: ScoreInput): ScoreResult {
  const cfg = isValidScoringConfig(config) ? config : DEFAULT_SCORING;
  const { correct, wrong, unanswered, total } = input;
  const rawAccuracy = total > 0 ? (correct / total) * 100 : 0;
  const unansweredMarks = cfg.unansweredMarks ?? 0;
  const rawExam = correct * cfg.correctMarks - wrong * cfg.wrongPenalty + unanswered * unansweredMarks;
  const allowNegative = cfg.allowNegative === true;
  const floored = rawExam < 0 && !allowNegative;
  const examScore = floored ? 0 : rawExam;
  return {
    correct,
    wrong,
    unanswered,
    total,
    rawAccuracy,
    examScore,
    examTotal: total * cfg.correctMarks,
    floored,
    config: cfg,
  };
}

/** One-line label for a config, shown next to every score. */
export function scoringLabel(config: ScoringConfig): string {
  const cfg = isValidScoringConfig(config) ? config : DEFAULT_SCORING;
  const penalty =
    cfg.wrongPenalty === 0 ? "no penalty" : `−${cfg.wrongPenalty} per wrong answer`;
  const policy =
    cfg.policyStatus === "unknown"
      ? "policy unknown"
      : cfg.policyStatus === "unverified-assumption"
        ? "unverified assumption"
        : "official policy";
  return `${cfg.correctMarks} mark${cfg.correctMarks === 1 ? "" : "s"} per correct answer · ${penalty} (${policy})`;
}

export type ScoringSource = "default" | "mock" | "override-zero" | "override-penalty";

/**
 * Resolve the scoring config for one run. Precedence:
 *   1. an explicit per-run override from the mock page ("zero" / "0.25")
 *   2. the mock's own config from content.json
 *   3. DEFAULT_SCORING (zero penalty, policy unknown)
 * An unknown override value is ignored (never trusted blindly).
 */
export function resolveScoring(
  mockScoring: ScoringConfig | null | undefined,
  override: string | null | undefined,
): { config: ScoringConfig; source: ScoringSource } {
  if (override === "zero") return { config: DEFAULT_SCORING, source: "override-zero" };
  if (override === "0.25") return { config: KPPSC_UNVERIFIED_SCORING, source: "override-penalty" };
  if (mockScoring && isValidScoringConfig(mockScoring)) return { config: mockScoring, source: "mock" };
  return { config: DEFAULT_SCORING, source: "default" };
}
