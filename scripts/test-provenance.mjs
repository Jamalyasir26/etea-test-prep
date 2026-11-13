// Provenance / concept-ID tests (Stage 1 P2) — plain node, no
// dependencies. Compiles the real src/lib/data.ts to CommonJS in /tmp
// with tsc (same approach as scripts/test-retrieval.mjs) and tests the
// real provenanceBadge() plus the real bank data.
// Covers: backward compat (items without the new fields load and get no
// badge); every "official"/"concept-extracted" item carries a source
// name; no item is marked "official" (nothing here is an official
// paper); conceptIds group only same-subject items (no two different
// concepts share one id); the 55 P0.3 MCQs + 15 notes + 15 reviewed
// items all carry full provenance; the badge component is wired into
// library, QuizRunner (practice/mocks) and review.
// Run: node scripts/test-provenance.mjs  (exit 0 = all pass)
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/stage1p2-provenance";
execSync(
  `npx tsc src/lib/data.ts --outDir ${OUT} --module commonjs --target es2020 --resolveJsonModule --esModuleInterop --skipLibCheck --moduleResolution node`,
  { cwd: ROOT, stdio: "ignore" },
);
const require = createRequire(import.meta.url);
const { QUESTIONS, NOTES, BY_ID, provenanceBadge } = require(join(OUT, "lib/data.js"));

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const P03_MCQ = [
  ...Array.from({ length: 20 }, (_, i) => `TAJ-${String(31 + i).padStart(3, "0")}`),
  ...Array.from({ length: 20 }, (_, i) => `ARB-${String(61 + i).padStart(3, "0")}`),
  ...Array.from({ length: 15 }, (_, i) => `ISL-${String(91 + i).padStart(3, "0")}`),
];
const REVIEWED15 = [
  "ISL-001", "ISL-029", "ISL-055", "ENG-005", "ENG-006", "ENG-008", "ENG-012",
  "ENG-013", "URD-001", "PAK-008", "ENG-019", "ENG-020", "ENG-025", "ENG-026", "MAT-022",
];

// 1. Backward compat: the bank loads at full size and items without the
// new fields get no badge (null) instead of crashing.
check("bank loads: 763 MCQs", QUESTIONS.length === 763, `got ${QUESTIONS.length}`);
const legacy = QUESTIONS.find((q) => !q.sourceKind);
check("legacy items exist without sourceKind", !!legacy);
check("legacy item gets no badge", provenanceBadge(legacy) === null);
check("empty object gets no badge", provenanceBadge({}) === null);
check("unknown-shaped item gets no badge", provenanceBadge({ sourceKind: undefined, source: "x" }) === null);

// 2. Every official/concept-extracted item carries a source name.
const sourced = QUESTIONS.filter((q) => q.sourceKind === "official" || q.sourceKind === "concept-extracted");
check(
  "every official/concept-extracted MCQ has a non-empty source",
  sourced.every((q) => typeof q.source === "string" && q.source.trim().length > 0),
);
const notes = Object.values(NOTES).flat();
const sourcedNotes = notes.filter((n) => n.sourceKind === "official" || n.sourceKind === "concept-extracted");
check(
  "every official/concept-extracted note has a non-empty source",
  sourcedNotes.every((n) => typeof n.source === "string" && n.source.trim().length > 0),
);

// 3. Nothing is marked "official" — no item here comes from an official
// paper, so claiming it would be false.
check("zero MCQs marked official", QUESTIONS.filter((q) => q.sourceKind === "official").length === 0);
check("zero notes marked official", notes.filter((n) => n.sourceKind === "official").length === 0);

// 4. The 55 P0.3 MCQs: all concept-extracted, all with conceptId +
// syllabusClause + the concept-extraction source label.
check(
  "all 55 P0.3 MCQs present",
  P03_MCQ.every((id) => !!BY_ID[id]),
  P03_MCQ.filter((id) => !BY_ID[id]).join(","),
);
check(
  "all 55 P0.3 MCQs are concept-extracted with conceptId + clause",
  P03_MCQ.every((id) => {
    const q = BY_ID[id];
    return q.sourceKind === "concept-extracted" && !!q.conceptId && !!q.syllabusClause;
  }),
);
check(
  "all 55 P0.3 MCQs carry the concept-extraction source label",
  P03_MCQ.every((id) => BY_ID[id].source.startsWith("Original content — concept-extracted from ")),
);

// 5. The 15 P0.3 notes: all concept-extracted with conceptId + clause.
check("56 concept-extracted notes", sourcedNotes.length === 56, `got ${sourcedNotes.length}`);
check(
  "all 15 notes have conceptId + clause",
  sourcedNotes.every((n) => !!n.conceptId && !!n.syllabusClause),
);

// 6. The 15 owner-reviewed items: proxy provenance with conceptId;
// PAK-008 honestly has NO syllabus clause (ambiguous section).
check(
  "all 15 reviewed items are proxy with conceptId",
  REVIEWED15.every((id) => {
    const q = BY_ID[id];
    return q && q.sourceKind === "proxy" && !!q.conceptId;
  }),
);
check("PAK-008 has no syllabus clause (ambiguous section)", !BY_ID["PAK-008"].syllabusClause);
check(
  "other 14 reviewed items have a syllabus clause",
  REVIEWED15.filter((id) => id !== "PAK-008").every((id) => !!BY_ID[id].syllabusClause),
);

// 7. conceptId grouping: items sharing a conceptId are always in the
// same subject bank (no two different concepts share one id), and the
// known same-concept groups actually share.
const byConcept = new Map();
for (const q of QUESTIONS) {
  if (!q.conceptId) continue;
  if (!byConcept.has(q.conceptId)) byConcept.set(q.conceptId, []);
  byConcept.get(q.conceptId).push(q);
}
let crossSubject = [];
for (const [cid, qs] of byConcept) {
  if (new Set(qs.map((q) => q.subjectKey)).size > 1) crossSubject.push(cid);
}
check("no conceptId spans two subjects", crossSubject.length === 0, crossSubject.join(","));
check(
  "passive-voice group shares one id (4 items)",
  (byConcept.get("english-passive-voice") ?? []).length === 4,
);
check(
  "indirect-speech group shares one id (4 items)",
  (byConcept.get("english-indirect-speech") ?? []).length === 4,
);
check(
  "qalqalah-letters group shares one id (3 MCQs)",
  (byConcept.get("tajweed-qalqalah-letters") ?? []).length === 3,
);
check(
  "surah-count shared by ISL-001 + ISL-091",
  BY_ID["ISL-001"].conceptId === "islamiyat-quran-surah-count" &&
    BY_ID["ISL-091"].conceptId === "islamiyat-quran-surah-count",
);
check(
  "conceptIds are lowercase slugs",
  [...byConcept.keys()].every((c) => /^[a-z0-9-]+$/.test(c)),
);
// Notes sharing a conceptId with MCQs: same subject family.
const noteConceptSubjects = new Map();
for (const [subject, list] of Object.entries(NOTES)) {
  for (const n of list) if (n.conceptId) noteConceptSubjects.set(n.conceptId, subject);
}
let noteMismatch = [];
for (const [cid, subject] of noteConceptSubjects) {
  const qs = byConcept.get(cid) ?? [];
  for (const q of qs) {
    const fam = { Tajweed: "tajweed", Arabic: "arabic", Islamiyat: "islamiyat" }[subject];
    if (fam && q.subjectKey !== fam) noteMismatch.push(cid);
  }
}
check("shared note/MCQ conceptIds stay in one subject family", noteMismatch.length === 0, noteMismatch.join(","));

// 8. Badge content: labels + detail wording per kind.
check(
  "concept-extracted badge names the source",
  (() => {
    const b = provenanceBadge(BY_ID["TAJ-031"]);
    return b && b.label === "Concept-extracted" && b.detail.includes("Riyad al-Quran") && b.detail.includes("not copied");
  })(),
);
check(
  "proxy badge says not from an official paper",
  (() => {
    const b = provenanceBadge(BY_ID["ENG-005"]);
    return b && b.label === "Practice proxy" && b.detail.includes("not from an official paper");
  })(),
);
check(
  "badge degrades gracefully without a source name",
  (() => {
    const b = provenanceBadge({ sourceKind: "concept-extracted", source: "" });
    return b && b.label === "Concept-extracted" && !b.detail.includes("from ,");
  })(),
);
check(
  "partial badge wording",
  (() => {
    const b = provenanceBadge({ sourceKind: "partial" });
    return b && b.label === "Partial coverage" && b.detail.includes("only part of this topic");
  })(),
);
check(
  "syllabus clause appears in badge detail",
  (() => {
    const b = provenanceBadge(BY_ID["TAJ-031"]);
    return b && b.detail.includes("Pattern B (ESED-453)");
  })(),
);

// 9. Wiring: the badge component is imported + rendered in library,
// QuizRunner (practice + mocks) and review.
for (const [file, label] of [
  ["src/app/library/page.tsx", "library"],
  ["src/components/QuizRunner.tsx", "QuizRunner"],
  ["src/app/review/page.tsx", "review"],
]) {
  const src = fs.readFileSync(join(ROOT, file), "utf8");
  check(
    `ProvenanceBadge wired into ${label}`,
    src.includes("ProvenanceBadge") && src.includes("<ProvenanceBadge"),
  );
}
check(
  "badge component renders null without sourceKind",
  // Step 2a — the guard is now explicit (no badge OR no sourceKind);
  // the behaviour (null when nothing is claimed) is unchanged.
  fs.readFileSync(join(ROOT, "src/components/ProvenanceBadge.tsx"), "utf8").includes("if (!badge || !sourceKind) return null"),
);

console.log(failures === 0 ? `\nAll provenance tests passed.` : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
