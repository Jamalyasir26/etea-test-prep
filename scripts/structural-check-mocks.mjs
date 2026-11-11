// Structural check for the verification queue (Stage 1 P0.2, mock-first).
// Checks every item in ZamungKor Mock 1 + Mock 2 (200 items) for:
//   HARD (status "problem"): not exactly 4 options, an empty option,
//     duplicate options, correctIndex out of range, empty/short
//     explanation, empty question text, duplicate question text in the set.
//   SOFT (status "needs-review"): the explanation does not mention the
//     correct option's text — the owner must confirm the explanation
//     really supports the stored answer (this is the PED-009 pattern:
//     stored answer contradicting its own explanation).
//   Otherwise status "pass".
// Nothing here marks an item "verified": items that pass stay "draft"
// until the OWNER verifies them on the /review dashboard. Religious
// content is verified by the owner, never by this script.
// Writes src/data/structural-checks.json (consumed by /review) and prints
// a summary. Exit 0 when no hard problems exist, exit 1 when any do.
// Run: node scripts/structural-check-mocks.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const content = JSON.parse(readFileSync(join(ROOT, "src/data/content.json"), "utf8"));

const BANKS = [
  "arabic", "drawing", "english", "gk", "islamiyat", "it", "maths",
  "pakstudies", "pastpapers", "pastpapers_reworded", "pe", "pedagogy",
  "science", "socialstudies", "tajweed", "urdu",
];
const BY_ID = {};
for (const b of BANKS) {
  const items = JSON.parse(readFileSync(join(ROOT, `src/data/banks/${b}.json`), "utf8"));
  for (const q of items) BY_ID[q.id] = q;
}

function norm(s) {
  return String(s ?? "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim().replace(/\s+/g, " ");
}

const SCOPE = ["zam1", "zam2"];
const ids = [];
for (const m of SCOPE) ids.push(...content.zamFixed[m]);
console.log(`Scope: ${SCOPE.join(" + ")} = ${ids.length} items`);

// Duplicate question text within the set (normalised).
const seenQuestions = new Map();
const duplicateIds = new Set();
for (const id of ids) {
  const q = BY_ID[id];
  if (!q) continue;
  const nq = norm(q.question);
  if (seenQuestions.has(nq)) {
    duplicateIds.add(id);
    duplicateIds.add(seenQuestions.get(nq));
  } else {
    seenQuestions.set(nq, id);
  }
}

const results = {};
let pass = 0, needsReview = 0, problem = 0;
const problems = [];

for (const id of ids) {
  const q = BY_ID[id];
  const issues = [];
  let hard = false;
  if (!q) {
    results[id] = { status: "problem", issues: ["id not found in any bank"] };
    problem++;
    problems.push(id);
    continue;
  }
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    issues.push(`options: expected 4, found ${Array.isArray(q.options) ? q.options.length : "not an array"}`);
    hard = true;
  } else {
    const opts = q.options.map((o) => norm(o));
    if (opts.some((o) => o.length === 0)) {
      issues.push("options: an empty option");
      hard = true;
    }
    if (new Set(opts).size !== opts.length) {
      issues.push("options: duplicate options");
      hard = true;
    }
  }
  if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) {
    issues.push(`correctIndex out of range: ${JSON.stringify(q.correctIndex)}`);
    hard = true;
  }
  if (typeof q.explanation !== "string" || norm(q.explanation).length < 20) {
    issues.push("explanation: missing or shorter than 20 characters");
    hard = true;
  }
  if (typeof q.question !== "string" || norm(q.question).length === 0) {
    issues.push("question: empty text");
    hard = true;
  }
  if (duplicateIds.has(id)) {
    issues.push("question: duplicate question text in this mock set");
    hard = true;
  }
  if (!q.subject || !q.topic) {
    issues.push("subject/topic: missing");
    hard = true;
  }
  // Soft check: does the explanation mention the correct option's text?
  // (PED-009 pattern — stored answer contradicting its explanation.)
  // Tolerant by design: it flags only when the explanation names neither
  // the answer's words nor its numbers. Rule-style explanations ("the
  // passive is 'is + past participle'") and transliteration variants
  // still get flagged — the owner eyeballs those on the dashboard.
  if (!hard && Array.isArray(q.options) && Number.isInteger(q.correctIndex)) {
    const correct = norm(q.options[q.correctIndex]);
    const expl = norm(q.explanation);
    const digits = correct.match(/\d+/g) ?? [];
    const digitsOk = digits.length === 0 || digits.every((d) => expl.includes(d));
    const words = correct.split(" ").filter((w) => w.length > 2);
    const hits = words.filter((w) => expl.includes(w)).length;
    const wordsOk = words.length === 0 || hits >= Math.ceil((words.length * 2) / 3);
    const mentioned = digitsOk && wordsOk;
    if (!mentioned) {
      issues.push("explanation does not mention the correct answer text — owner to confirm it matches");
    }
  }
  const status = hard ? "problem" : issues.length > 0 ? "needs-review" : "pass";
  results[id] = { status, issues };
  if (status === "pass") pass++;
  else if (status === "needs-review") needsReview++;
  else {
    problem++;
    problems.push(id);
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  scope: SCOPE,
  counts: { total: ids.length, pass, needsReview, problem },
  items: results,
};
writeFileSync(join(ROOT, "src/data/structural-checks.json"), JSON.stringify(out, null, 2) + "\n", "utf8");

console.log(`\nStructural check — ZamungKor Mock 1 + Mock 2 (${ids.length} items):`);
console.log(`  pass:          ${pass}`);
console.log(`  needs-review:  ${needsReview} (soft: explanation does not name the correct answer)`);
console.log(`  problem:       ${problem} (hard structural failure)`);
if (problems.length > 0) {
  console.log("\nPROBLEM items (need a fix before the owner verifies them):");
  for (const id of problems) {
    console.log(`  ${id} [${BY_ID[id]?.subject ?? "?"}]: ${results[id].issues.join("; ")}`);
  }
}
const soft = Object.entries(results).filter(([, r]) => r.status === "needs-review");
if (soft.length > 0) {
  console.log("\nNEEDS-REVIEW items (explanation does not mention the correct answer):");
  for (const [id, r] of soft) {
    console.log(`  ${id} [${BY_ID[id]?.subject ?? "?"}]: ${r.issues.join("; ")}`);
  }
}
console.log(`\nWrote src/data/structural-checks.json`);
if (problem > 0) {
  console.log("RESULT: FAIL — hard structural problems found (exit 1).");
  process.exit(1);
}
console.log("RESULT: OK — no hard structural problems (exit 0).");
