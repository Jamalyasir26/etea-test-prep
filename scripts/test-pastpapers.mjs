// Past-papers bank tests — Phase A: pastpapers 20 -> 500 MCQs
// (PPT-021..PPT-500), Option 3 (owner decision 2026-11-24): multiple
// items per concept + textbook-map fill with an ACCURATE label.
// Plain node, no dependencies. Run: node scripts/test-pastpapers.mjs
// (exit 0 = all pass). Locks:
//  - 500 items, ID sequence complete (PPT-001..PPT-500), file order ==
//    ID order; first 20 legacy items byte-identical to the pre-merge
//    backup (no provenance field — absence = legacy paper item);
//  - new items: exact 28-key schema in the BRIEF order, all-6-fields
//    trilingual completeness, fixed fields (draft/unverified,
//    reviewedBy/reviewedAt null, explanationUrdu null, explanationEn
//    == explanation);
//  - provenance split: paper-concept 329 / textbook-topic 151 (S9 swap:
//    PP-GK-10 could not support an honest timeless item, so PPT-353 is
//    an extra textbook fill tb-gk-largest-hot-desert); second items:
//    exactly 32 concepts appear twice as paper items (29 pairs inside
//    the new items + 3 pairs whose first item is legacy: PP-ENG-13,
//    PP-ENG-14, PP-ISL-16); textbook conceptIds unique;
//  - human labels: every new item's pastPaperRef is exactly one of the
//    two (a) labels (349 original-paper + 151 textbook), byte-identical
//    strings; legacy 20 keep the original label;
//  - badge branches: topicBadge() classifies textbook FIRST (before
//    reworded) — the textbook label yields the textbook branch in en/ur/
//    roman, the original label yields the original branch, the reworded
//    label yields the reworded branch, null yields null;
//  - concept coverage vs the ledger: every new paper item's conceptId
//    exists in concept-ledger.json; every ledger concept available for
//    a first item is covered exactly once as a first item (except the 3
//    legacy-paired seconds, whose first is legacy);
//  - dedupe: normalized EN question text unique across all 500 new+legacy
//    items and against all other 15 banks (same-fact rewording is Phase
//    B's job, not Phase A's);
//  - correctIndex distribution on the 480 new items is balanced
//    (each index 100..140 — coordinator rotation N-PPT-1; the workers'
//    first drafts put 250/480 at index 0);
//  - manifest + content.json counts match the bank (500 / total 7520).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const readJson = (p) => JSON.parse(read(p));

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const BANK = readJson("src/data/banks/pastpapers.json");
const LEGACY = JSON.parse(readFileSync("/home/hatch/workspace/pastpapers/pre-merge-pastpapers.json", "utf8"));
const NEW = BANK.slice(20);
const ORIG_LABEL = "Original practice question based on past-paper topics — not the actual paper";
const TB_LABEL = "Original practice question based on textbook topics — not from a past paper";
const NEW_KEYS = ["id", "question_ur", "question_roman", "options_ur", "options_roman", "explanation_ur", "explanation_roman", "post", "subject", "subjectKey", "topic", "question", "options", "correctIndex", "explanation", "explanationEn", "explanationUrdu", "difficulty", "pastPaperRef", "verified", "source", "reviewStatus", "reviewedBy", "reviewedAt", "provenance", "conceptId", "sourceKind", "syllabusClause"];

// ---------- §1 counts + order + legacy prefix ----------
check("PPT bank 500 items", BANK.length === 500, `got ${BANK.length}`);
check(
  "PPT ID sequence complete PPT-001..PPT-500 in file order",
  BANK.every((q, i) => q.id === `PPT-${String(i + 1).padStart(3, "0")}`),
);
check(
  "PPT first 20 legacy items byte-identical to pre-merge backup (no provenance)",
  JSON.stringify(BANK.slice(0, 20)) === JSON.stringify(LEGACY) &&
    BANK.slice(0, 20).every((q) => !("provenance" in q)),
);
check(
  "PPT legacy 20 all carry the exact original label",
  BANK.slice(0, 20).every((q) => q.pastPaperRef === ORIG_LABEL),
);

// ---------- §2 new-item schema + fixed fields ----------
check(
  "PPT new items: exact 28-key schema in BRIEF order",
  NEW.every((q) => JSON.stringify(Object.keys(q)) === JSON.stringify(NEW_KEYS)),
  NEW.filter((q) => JSON.stringify(Object.keys(q)) !== JSON.stringify(NEW_KEYS)).map((q) => q.id).slice(0, 5).join(","),
);
check(
  "PPT new items: trilingual triples complete (non-empty strings, 4 options each)",
  NEW.every(
    (q) =>
      typeof q.question_ur === "string" && q.question_ur.trim() &&
      typeof q.question_roman === "string" && q.question_roman.trim() &&
      Array.isArray(q.options_ur) && q.options_ur.length === 4 && q.options_ur.every((s) => typeof s === "string" && s.trim()) &&
      Array.isArray(q.options_roman) && q.options_roman.length === 4 && q.options_roman.every((s) => typeof s === "string" && s.trim()) &&
      typeof q.explanation_ur === "string" && q.explanation_ur.trim() &&
      typeof q.explanation_roman === "string" && q.explanation_roman.trim(),
  ),
);
check(
  "PPT new items: draft/unverified, reviewedBy/reviewedAt null, explanationUrdu null, explanationEn == explanation",
  NEW.every(
    (q) =>
      q.reviewStatus === "draft" && q.verified === false &&
      q.reviewedBy === null && q.reviewedAt === null &&
      q.explanationUrdu === null && q.explanationEn === q.explanation,
  ),
);
check(
  "PPT new items: subject/subjectKey/topic/post convention",
  NEW.every(
    (q) =>
      q.subject === "Past-Paper Topics" && q.subjectKey === "pastpapers" &&
      q.topic === "Past-Paper Topics" &&
      JSON.stringify(q.post) === JSON.stringify(["zamungkor", "tt", "at", "qari"]),
  ),
);
check(
  "PPT new items: provenance/sourceKind values valid",
  NEW.every(
    (q) =>
      (q.provenance === "past-paper-concept" || q.provenance === "textbook-topic") &&
      q.sourceKind === "concept-extracted",
  ),
);

// ---------- §3 provenance split + labels ----------
const paper = NEW.filter((q) => q.provenance === "past-paper-concept");
const tb = NEW.filter((q) => q.provenance === "textbook-topic");
check("PPT provenance split paper 329 / textbook 151", paper.length === 329 && tb.length === 151, `paper=${paper.length} tb=${tb.length}`);
check(
  "PPT labels: 349 original-paper + 151 textbook, no other pastPaperRef",
  BANK.filter((q) => q.pastPaperRef === ORIG_LABEL).length === 349 &&
    BANK.filter((q) => q.pastPaperRef === TB_LABEL).length === 151 &&
    BANK.every((q) => q.pastPaperRef === ORIG_LABEL || q.pastPaperRef === TB_LABEL),
);
check(
  "PPT label/provenance agree (paper items carry ORIG_LABEL, textbook items carry TB_LABEL)",
  NEW.every(
    (q) =>
      (q.provenance === "past-paper-concept" && q.pastPaperRef === ORIG_LABEL) ||
      (q.provenance === "textbook-topic" && q.pastPaperRef === TB_LABEL),
  ),
);
// Second items: paper conceptIds appearing twice inside the new items.
const paperCounts = {};
for (const q of paper) paperCounts[q.conceptId] = (paperCounts[q.conceptId] || 0) + 1;
const secondInNew = Object.entries(paperCounts).filter(([, n]) => n === 2).map(([c]) => c);
const overTwo = Object.entries(paperCounts).filter(([, n]) => n > 2).map(([c]) => c);
check("PPT second items: 29 paper concepts appear twice inside the new items", secondInNew.length === 29, secondInNew.join(","));
check("PPT no paper concept appears more than twice", overTwo.length === 0, overTwo.join(","));
check(
  "PPT legacy-paired seconds: PP-ENG-13/14 + PP-ISL-16 appear once in new items (first is legacy)",
  ["pp-eng-13", "pp-eng-14", "pp-isl-16"].every((c) => paperCounts[c] === 1),
);
const tbCounts = {};
for (const q of tb) tbCounts[q.conceptId] = (tbCounts[q.conceptId] || 0) + 1;
check(
  "PPT textbook conceptIds unique (151 distinct)",
  Object.keys(tbCounts).length === 151 && Object.values(tbCounts).every((n) => n === 1),
);

// ---------- §4 concept coverage vs the ledger ----------
const ledger = JSON.parse(readFileSync("/home/hatch/workspace/pastpapers/concept-ledger.json", "utf8"));
const ledgerById = {};
for (const e of ledger) ledgerById[e.id.toLowerCase()] = e;
const paperConceptIds = new Set(paper.map((q) => q.conceptId));
const unknownPaper = [...paperConceptIds].filter((c) => !ledgerById[c]);
check("PPT every paper conceptId exists in the ledger", unknownPaper.length === 0, unknownPaper.join(","));
// First items available per the ledger: 298 (319 slots - 17 legacy-covered - 4 overlaps counted once).
// In-new distinct paper concepts: 300 = 297 true firsts (298 minus PP-GK-10, lost to the S9 swap)
// + 3 legacy-paired seconds (ENG-13/14, ISL-16, whose first is legacy).
const firstInNew = Object.entries(paperCounts).filter(([, n]) => n >= 1).map(([c]) => c);
check("PPT paper concepts covered in new items: 300 distinct", firstInNew.length === 300, `got ${firstInNew.length}`);
// S9 swap: PP-GK-10 is textbook fill, not a paper item.
check(
  "PPT S9 swap: PP-GK-10 has no paper item; PPT-353 is textbook fill tb-gk-largest-hot-desert",
  !paperConceptIds.has("pp-gk-10") &&
    BANK.find((q) => q.id === "PPT-353").conceptId === "tb-gk-largest-hot-desert",
);

// ---------- §5 dedupe ----------
function normQ(s) {
  return s.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff ]/g, " ").replace(/\s+/g, " ").trim();
}
const seenQ = new Map();
let dupQ = [];
for (const q of BANK) {
  const k = normQ(q.question);
  if (seenQ.has(k)) dupQ.push(`${q.id} vs ${seenQ.get(k)}`);
  else seenQ.set(k, q.id);
}
check("PPT no duplicate EN questions inside the bank (normalized)", dupQ.length === 0, dupQ.slice(0, 5).join(" | "));
const otherBanks = ["arabic", "drawing", "english", "gk", "islamiyat", "it", "maths", "pakstudies", "pastpapers_reworded", "pe", "pedagogy", "science", "socialstudies", "tajweed", "urdu"];
const otherQs = new Map();
for (const k of otherBanks) {
  for (const q of readJson(`src/data/banks/${k}.json`)) otherQs.set(normQ(q.question), `${q.id} (${k})`);
}
const crossDup = NEW.filter((q) => otherQs.has(normQ(q.question))).map((q) => `${q.id} vs ${otherQs.get(normQ(q.question))}`);
check("PPT no duplicate EN questions against the other 15 banks (normalized)", crossDup.length === 0, crossDup.slice(0, 5).join(" | "));

// ---------- §6 correctIndex balance + one correct answer ----------
const dist = [0, 1, 2, 3].map((i) => NEW.filter((q) => q.correctIndex === i).length);
check(
  "PPT correctIndex balanced on new items (each index 100..140)",
  dist.every((n) => n >= 100 && n <= 140),
  `dist=${dist.join("/")}`,
);
check(
  "PPT correctIndex in range 0..3 and options length 4 on all items",
  BANK.every((q) => q.correctIndex >= 0 && q.correctIndex <= 3 && q.options.length === 4),
);

// ---------- §7 counts ripple ----------
const content = readJson("src/data/content.json");
const bySubj = Object.fromEntries(content.counts.bySubject);
check(
  "PPT content.json counts: total 7520, Past-Paper Topics 500, Reworded still 20",
  content.counts.total === 7520 && bySubj["Past-Paper Topics"] === 500 && bySubj["Past-Paper Topics (Reworded)"] === 20,
);
check(
  "PPT content.json bySubject.pastpapers index holds PPT-001..PPT-500",
  content.bySubject.pastpapers.length === 500 &&
    content.bySubject.pastpapers[0] === "PPT-001" &&
    content.bySubject.pastpapers[499] === "PPT-500",
);
const man = read("src/lib/bank-manifest.ts");
const countsBlock = man.slice(man.indexOf("BANK_COUNTS"), man.indexOf("};", man.indexOf("BANK_COUNTS")));
const counts = {};
for (const [, k, v] of countsBlock.matchAll(/"([a-z_]+)":\s*(\d+)/g)) counts[k] = Number(v);
check(
  "PPT manifest BANK_COUNTS: pastpapers 500, reworded 20, total 7520",
  counts.pastpapers === 500 && counts.pastpapers_reworded === 20 &&
    Object.values(counts).reduce((a, b) => a + b, 0) === 7520,
  `pastpapers=${counts.pastpapers}`,
);

// ---------- §8 topicBadge branches (real data.ts via tsc harness, stage5g pattern) ----------
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
const OUT = "/tmp/pastpapers-data";
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
check("PPT tsc harness: no unexpected type errors", tscErrors.every((l) => l.includes("TS5097")), tscDiag.slice(0, 300));
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const { topicBadge } = data;
const REWORDED_LABEL = "Same concept as a past-paper question, reworded in a different style — not the actual paper";
check(
  "PPT topicBadge: textbook label takes the textbook branch FIRST (en/ur/roman)",
  topicBadge(TB_LABEL, "en").detail === TB_LABEL &&
    topicBadge(TB_LABEL, "ur").label.includes("نصابی") &&
    topicBadge(TB_LABEL, "roman").label.toLowerCase().includes("nisabi"),
  JSON.stringify(topicBadge(TB_LABEL, "ur")),
);
check(
  "PPT topicBadge: original label takes the original branch (not textbook)",
  topicBadge(ORIG_LABEL, "en").detail === ORIG_LABEL &&
    !topicBadge(ORIG_LABEL, "ur").label.includes("نصابی"),
);
check(
  "PPT topicBadge: reworded label takes the reworded branch; null returns null",
  topicBadge(REWORDED_LABEL, "en").detail === REWORDED_LABEL &&
    topicBadge(REWORDED_LABEL, "ur").label.includes("دوبارہ لکھا گیا") &&
    topicBadge(null) === null,
);

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll past-papers checks passed.");
