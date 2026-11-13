// Phase 4B1 tests — CT-IT (IT / Computer Basics) + PET (Physical Education)
// content batch via concept extraction: 30 IT MCQs (ITC-031..060) + 11 notes,
// 26 PE MCQs (PE-011..036) + 10 notes. Exercises the REAL data.ts +
// ledger.ts (compiled to CommonJS in /tmp with tsc, same approach as
// test-step3a.mjs). Locks: new-item structural QA, provenance labels,
// draft status, F02 counts unchanged (124 EN / 196 markers), the RU
// guard on new explanations, ledger recompute from the real banks, and
// the /review scope (zam1+zam2 fixed 200, 15 trusted) untouched.
// Run: node scripts/test-phase4b1.mjs  (exit 0 = all pass)
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

// --------------------------------- §1 real data + ledger (tsc harness)
const OUT = "/tmp/phase4b1-data";
execSync("rm -rf " + OUT, { stdio: "ignore" });
let tscDiag = "";
try {
  execSync(
    `npx tsc src/lib/data.ts src/lib/ledger.ts --outDir ${OUT} --module commonjs --target es2020 --resolveJsonModule --esModuleInterop --skipLibCheck --moduleResolution node`,
    { cwd: ROOT, stdio: "pipe" },
  );
} catch (e) {
  tscDiag = String(e.stderr ?? e.stdout ?? e.message ?? "");
}
const tscErrors = tscDiag.split("\n").filter((l) => l.includes("error TS"));
check("4B1 tsc harness: no unexpected type errors", tscErrors.every((l) => l.includes("TS5097")), tscDiag.slice(0, 300));
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const ledger = require(join(OUT, "lib/ledger.js"));
const { QUESTIONS, BY_SUBJECT, BY_ID, NOTES, FLASHCARDS, MOCKS, ZAM_FIXED, VISIBLE_COUNTS } = data;
const { displayExplanation, pendingEnglishExplanations, buildMockQuestions } = data;

// --- totals ---
check("4B1 bank total 763 MCQs", QUESTIONS.length === 763, `got ${QUESTIONS.length}`);
const notesTotal = Object.values(NOTES).reduce((n, arr) => n + arr.length, 0);
check("4B1 notes total 151", notesTotal === 151, `got ${notesTotal}`);
check("4B1 flashcards still 70", FLASHCARDS.length === 70, `got ${FLASHCARDS.length}`);
check("4B1 VISIBLE_COUNTS 763/151/70, 12 tracks / 16 mocks",
  VISIBLE_COUNTS.total === 763 && VISIBLE_COUNTS.notes === 151 && VISIBLE_COUNTS.cards === 70 &&
  VISIBLE_COUNTS.tracks === 12 && VISIBLE_COUNTS.mocks === 16, JSON.stringify(VISIBLE_COUNTS));
check("4B1 IT bank 60 items", BY_SUBJECT.it.length === 60, `got ${BY_SUBJECT.it.length}`);
check("4B1 PE bank 46 items", BY_SUBJECT.pe.length === 46, `got ${BY_SUBJECT.pe.length}`);
check("4B1 IT/Computer notes 17", NOTES["IT/Computer"].length === 17, `got ${NOTES["IT/Computer"].length}`);
check("4B1 Drawing/PE notes 24 (shared bucket, +10 Drawing in Phase 4B2)", NOTES["Drawing/PE"].length === 24, `got ${NOTES["Drawing/PE"].length}`);

// --- new items present, in order, appended after the old items ---
const IT_NEW = Array.from({ length: 30 }, (_, i) => `ITC-${String(i + 31).padStart(3, "0")}`);
const PE_NEW = Array.from({ length: 26 }, (_, i) => `PE-${String(i + 11).padStart(3, "0")}`);
check("4B1 IT ids ITC-001..060 in order",
  JSON.stringify(BY_SUBJECT.it.map((q) => q.id)) === JSON.stringify(Array.from({ length: 60 }, (_, i) => `ITC-${String(i + 1).padStart(3, "0")}`)));
check("4B1 PE ids DRW-011..020 + PE-001..036 in order",
  JSON.stringify(BY_SUBJECT.pe.map((q) => q.id)) === JSON.stringify([...Array.from({ length: 10 }, (_, i) => `DRW-${String(i + 11).padStart(3, "0")}`), ...Array.from({ length: 36 }, (_, i) => `PE-${String(i + 1).padStart(3, "0")}`)]));
const NEW = [...IT_NEW, ...PE_NEW].map((id) => BY_ID[id]);
check("4B1 all 56 new items load", NEW.every(Boolean) && NEW.length === 56);

// --- structural QA on new items (same bar as the bank) ---
check("4B1 new items: 4 distinct options, correctIndex 0–3, non-empty question + explanation",
  NEW.every((q) => q.options.length === 4 && new Set(q.options.map((o) => String(o).trim())).size === 4 &&
    Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 3 &&
    q.question.trim().length > 0 && q.explanation.trim().length > 0));
check("4B1 new items: draft, unverified, null review fields",
  NEW.every((q) => q.reviewStatus === "draft" && q.verified === false && q.reviewedBy === null && q.reviewedAt === null && q.pastPaperRef === null));
check("4B1 new items: concept-extracted provenance + conceptId + clause",
  NEW.every((q) => q.sourceKind === "concept-extracted" && typeof q.source === "string" &&
    q.source.startsWith("Original content — concept-extracted from ") && !!q.conceptId && !!q.syllabusClause));
check("4B1 IT items carry the IT source label + clause",
  IT_NEW.every((id) => BY_ID[id].source === "Original content — concept-extracted from Standard Computer Fundamentals Curriculum" &&
    BY_ID[id].syllabusClause === "Pattern B (ESED-453) — CT-IT: IT/CS section (25)"));
check("4B1 PE items carry the PE source label + clause",
  PE_NEW.every((id) => BY_ID[id].source === "Original content — concept-extracted from Standard Physical Education Curriculum" &&
    BY_ID[id].syllabusClause === "Pattern B (ESED-453) — PET: Physical Education section (20)"));
check("4B1 new items: no explanationEn / explanationLang keys",
  NEW.every((q) => !("explanationEn" in q) && !("explanationLang" in q)));
check("4B1 new items: subject labels + post wiring",
  IT_NEW.every((id) => BY_ID[id].subject === "IT" && BY_ID[id].subjectKey === "it" && BY_ID[id].post.includes("ctit")) &&
  PE_NEW.every((id) => BY_ID[id].subject === "Physical Education" && BY_ID[id].subjectKey === "pe" && BY_ID[id].post.includes("pet")));
check("4B1 new items: no duplicate conceptIds within the batch",
  new Set(NEW.map((q) => q.conceptId)).size === 56);
check("4B1 zero items marked official anywhere",
  QUESTIONS.every((q) => q.sourceKind !== "official"));

// --- F02 guards unchanged ---
check("4B1 explanationEn count still 124", QUESTIONS.filter((q) => q.explanationEn).length === 124);
check("4B1 roman-marker count still 196", QUESTIONS.filter((q) => q.explanationLang === "roman").length === 196);
check("4B1 pendingEnglishExplanations still 196", pendingEnglishExplanations().length === 196);
// Exact RU detector (same set + tokeniser as test-step3b-audit2.mjs).
const RU = new Set("ki ka ke hai hain ho hun hum se mein ko nahi hota hoti hote jata jati gaya gayi tha thi thay yeh woh aur bhi jo aik ek diya kiya raha rahi rahe jab kyun kaise kahan lekin magar phir sirf bohat zyada liye bina kehte kaha kehlata kehlati sakta sakti chahiye wala wali walay hoga hogi honge karein karna hona jana ana karke hokar rehta rehti rehte ne hua hui hue thin aayi aaye nazil paida bani bana mukammal pehle pehli dusre dusri aakhri".split(" "));
const ruHits = (s) => s.toLowerCase().replace(/[^a-z\s']/g, " ").split(/\s+/).filter((w) => RU.has(w)).length;
check("4B1 RU guard: 0 hits on all 56 new explanations", NEW.every((q) => ruHits(q.explanation) === 0));
check("4B1 new items NOT pending in English mode, original text shown",
  NEW.every((q) => { const d = displayExplanation(q, "en"); return !d.pendingEnglish && d.text === q.explanation; }));

// --- new notes ---
const IT_NOTE_TITLES = [
  "Operating Systems — What the OS Does",
  "System Software vs Application Software",
  "Storage Devices — HDD, SSD, USB and Optical Discs",
  "Computer Hardware — Printers, Scanners and Ports",
  "Files and Folders — Organising Your Work",
  "MS Word — Formatting and Editing",
  "MS Excel — Functions and Cell Addresses",
  "MS PowerPoint — Building a Slideshow",
  "Internet and Email — URLs, Browsers and Messages",
  "Staying Safe on a Computer",
  "Binary — How Computers Count",
];
const PE_NOTE_TITLES = [
  "Hockey — The Basics",
  "Racket Games — Tennis, Badminton and Table Tennis",
  "Volleyball and Basketball — Court Measurements",
  "Cricket — Overs, Wickets and Formats",
  "Football — Key Rules",
  "Athletics — Track and Field Events",
  "The Body in Sport — Bones, Muscles and Heart",
  "Food for Sport — Energy and Repair",
  "First Aid on the Field — RICE and Prevention",
  "Sports Bodies and the Olympic Games",
];
const itNotes = NOTES["IT/Computer"].slice(6);
// Phase 4B2 appended 10 Drawing notes after the 10 PE notes (indices 14..23),
// so the PE slice is bounded to indices 4..13.
const peNotes = NOTES["Drawing/PE"].slice(4, 14);
check("4B1 11 new IT notes, appended in order", JSON.stringify(itNotes.map((n) => n.title)) === JSON.stringify(IT_NOTE_TITLES));
check("4B1 10 new PE notes, appended in order", JSON.stringify(peNotes.map((n) => n.title)) === JSON.stringify(PE_NOTE_TITLES));
const NEW_NOTES = [...itNotes, ...peNotes];
check("4B1 new notes: provenance + conceptId + clause + house style",
  NEW_NOTES.every((n) => n.sourceKind === "concept-extracted" && n.source.startsWith("Original content — concept-extracted from ") &&
    !!n.conceptId && !!n.syllabusClause && n.body.includes("Roman Urdu:") && n.body.includes("Recall first:")));
check("4B1 concept-extracted notes total 56 (15 + 21 + 20 in Phase 4B2)",
  Object.values(NOTES).flat().filter((n) => n.sourceKind === "concept-extracted").length === 56);

// --- mocks draw from the grown pools ---
const ctitB = MOCKS.find((m) => m.id === "ctit-B");
const petB = MOCKS.find((m) => m.id === "pet-B");
const ctitQs = buildMockQuestions(ctitB);
const petQs = buildMockQuestions(petB);
check("4B1 ctit-B builds 100 with 25 IT from the 60-item pool",
  ctitQs.length === 100 && ctitQs.filter((q) => q.subjectKey === "it").length === 25);
check("4B1 pet-B builds 100 with 20 PE from the 46-item pool",
  petQs.length === 100 && petQs.filter((q) => q.subjectKey === "pe").length === 20);
check("4B1 built mocks have no duplicate questions",
  new Set(ctitQs.map((q) => q.id)).size === 100 && new Set(petQs.map((q) => q.id)).size === 100);

// --- /review scope untouched ---
const zam12 = [...(ZAM_FIXED.zam1 || []), ...(ZAM_FIXED.zam2 || [])];
check("4B1 zam1+zam2 fixed scope still 200", zam12.length === 200, `got ${zam12.length}`);
check("4B1 no new item in the zam1+zam2 fixed lists", zam12.every((id) => !IT_NEW.includes(id) && !PE_NEW.includes(id)));
check("4B1 trusted count in zam1+zam2 still 15",
  zam12.filter((id) => BY_ID[id] && (BY_ID[id].reviewStatus === "owner-reviewed" || BY_ID[id].reviewStatus === "approved")).length === 15);

// --- ledger recompute from the real banks ---
const ctitRow = ledger.ledgerRowFor("ctit");
const petRow = ledger.ledgerRowFor("pet");
const dmRow = ledger.ledgerRowFor("dm");
const itRow = ctitRow.subjects.find((s) => s.label === "IT / Computer");
const peRow = petRow.subjects.find((s) => s.label === "Physical Education");
check("4B1 ledger ctit IT row: 60 MCQs / 17 notes / 6 cards (recomputed)",
  itRow.mcqs === 60 && itRow.notes === 17 && itRow.cards === 6, JSON.stringify(itRow));
check("4B1 ledger pet PE row: 46 MCQs / 24 notes / 0 cards (recomputed)",
  peRow.mcqs === 46 && peRow.notes === 24 && peRow.cards === 0, JSON.stringify(peRow));
check("4B1 ledger ctit + pet coverage still exact", ctitRow.coverage === "exact" && petRow.coverage === "exact");
check("4B1 ledger ctit/pet prose: count-free, Phase 4B1 noted",
  ctitRow.missing.includes("Phase 4B1") && !/30 MCQs/.test(ctitRow.missing) &&
  petRow.missing.includes("Phase 4B1") && !/20 MCQs/.test(petRow.missing));
check("4B1 ledger DM row follows the shared Drawing/PE bucket (24 notes)",
  dmRow.subjects.find((s) => s.label === "Drawing").notes === 24,
  "DM prose updated in Phase 4B2 — see VERIFY-phase4b2.md");
check("4B1 ledger still 12 rows", ledger.buildLedger().length === 12);

// --------------------------------- §2 scope guards (source)
const ledgerSrc = read("src/lib/ledger.ts");
check("4B1 only ctit + pet rows mention Phase 4B1",
  (ledgerSrc.match(/Phase 4B1/g) || []).length === 2);
check("4B1 DM + Qari rows untouched by this batch", (() => {
  const blocks = ledgerSrc.split(/trackId: "/).slice(1);
  const blockFor = (id) => blocks.find((b) => b.startsWith(`"${id}"`)) || "";
  return !blockFor("dm").includes("Phase 4B1") && !blockFor("qari").includes("Phase 4B1");
})());
const contentJson = JSON.parse(read("src/data/content.json"));
check("4B1 content.json counts: total 763, IT 60, PE 46, notes 151, cards 70",
  contentJson.counts.total === 763 && contentJson.counts.notes === 151 && contentJson.counts.cards === 70 &&
  contentJson.counts.bySubject.find((r) => r[0] === "IT")[1] === 60 &&
  contentJson.counts.bySubject.find((r) => r[0] === "Physical Education")[1] === 46);
check("4B1 content.json bySubject index matches banks (it 60 / pe 46)",
  contentJson.bySubject.it.length === 60 && contentJson.bySubject.pe.length === 46 &&
  contentJson.bySubject.it[59] === "ITC-060" && contentJson.bySubject.pe[45] === "PE-036");

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
} else {
  console.log("\nAll Phase 4B1 tests passed.");
}
