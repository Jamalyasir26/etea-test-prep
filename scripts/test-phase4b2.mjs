// Phase 4B2 tests — DM (Drawing) + Qari (Tajweed + Hifz) content batch via
// concept extraction: 30 Drawing MCQs (DRW-031..060) + 10 notes, 32 Tajweed
// MCQs (TAJ-051..082: 20 Tajweed + 12 Hifz) + 10 notes (7 Tajweed + 3 Hifz).
// Exercises the REAL data.ts + ledger.ts (compiled to CommonJS in /tmp with
// tsc, same approach as test-phase4b1.mjs). Locks: new-item structural QA,
// provenance labels, draft status, F02 counts unchanged (124 EN / 196
// markers / 196 pending), the RU guard on new text, religious-content
// safety (no Hadith numbers/citations, Arabic script only Waqf glyphs),
// ledger recompute from the real banks, DM/Qari prose count-free with the
// Phase 4B2 note, mock builds from the grown pools, and the /review scope
// (zam1+zam2 fixed 200, 15 trusted) untouched.
// Run: node scripts/test-phase4b2.mjs  (exit 0 = all pass)
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
const OUT = "/tmp/phase4b2-data";
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
check("4B2 tsc harness: no unexpected type errors", tscErrors.every((l) => l.includes("TS5097")), tscDiag.slice(0, 300));
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const ledger = require(join(OUT, "lib/ledger.js"));
const { QUESTIONS, BY_SUBJECT, BY_ID, NOTES, FLASHCARDS, MOCKS, ZAM_FIXED, VISIBLE_COUNTS } = data;
const { pendingEnglishExplanations, buildMockQuestions } = data;

// --- totals ---
check("4B2 bank total 763 MCQs", QUESTIONS.length === 763, `got ${QUESTIONS.length}`);
const notesTotal = Object.values(NOTES).reduce((n, arr) => n + arr.length, 0);
check("4B2 notes total 151", notesTotal === 151, `got ${notesTotal}`);
check("4B2 flashcards still 70 (none added)", FLASHCARDS.length === 70, `got ${FLASHCARDS.length}`);
check("4B2 VISIBLE_COUNTS 763/151/70, 12 tracks / 16 mocks",
  VISIBLE_COUNTS.total === 763 && VISIBLE_COUNTS.notes === 151 && VISIBLE_COUNTS.cards === 70 &&
  VISIBLE_COUNTS.tracks === 12 && VISIBLE_COUNTS.mocks === 16, JSON.stringify(VISIBLE_COUNTS));
check("4B2 Drawing bank 50 items", BY_SUBJECT.drawing.length === 50, `got ${BY_SUBJECT.drawing.length}`);
check("4B2 Tajweed bank 82 items", BY_SUBJECT.tajweed.length === 82, `got ${BY_SUBJECT.tajweed.length}`);
check("4B2 Drawing/PE notes 24 (shared bucket)", NOTES["Drawing/PE"].length === 24, `got ${NOTES["Drawing/PE"].length}`);
check("4B2 Tajweed notes 24", NOTES["Tajweed"].length === 24, `got ${NOTES["Tajweed"].length}`);

// --- new items present, in order, appended after the old items ---
const DRAW_NEW = Array.from({ length: 30 }, (_, i) => `DRW-${String(i + 31).padStart(3, "0")}`);
const TAJ_NEW = Array.from({ length: 32 }, (_, i) => `TAJ-${String(i + 51).padStart(3, "0")}`);
check("4B2 DRW-031..060 appended after DRW-030, in order",
  JSON.stringify(BY_SUBJECT.drawing.slice(20).map((q) => q.id)) === JSON.stringify(DRAW_NEW));
check("4B2 TAJ-051..082 appended after TAJ-050, in order",
  JSON.stringify(BY_SUBJECT.tajweed.slice(50).map((q) => q.id)) === JSON.stringify(TAJ_NEW));
const NEW_QS = [...DRAW_NEW, ...TAJ_NEW].map((id) => BY_ID[id]);
check("4B2 all 62 new items resolve via BY_ID", NEW_QS.every(Boolean));

// --- new-item structural QA ---
check("4B2 new MCQs: 4 distinct options, valid correctIndex, non-empty explanation",
  NEW_QS.every((q) => q.options.length === 4 && new Set(q.options).size === 4 &&
    q.correctIndex >= 0 && q.correctIndex <= 3 && q.question.length > 0 && q.explanation.length > 0));
check("4B2 new MCQs: draft, unverified, null review fields",
  NEW_QS.every((q) => q.reviewStatus === "draft" && q.verified === false &&
    q.reviewedBy === null && q.reviewedAt === null && q.pastPaperRef === null && q.explanationUrdu === null));
check("4B2 new MCQs: no explanationEn/explanationLang/sourceNote keys (F02 guards untouched)",
  NEW_QS.every((q) => !("explanationEn" in q) && !("explanationLang" in q) && !("sourceNote" in q)));
check("4B2 new MCQs: concept-extracted provenance + clause + distinct conceptId",
  NEW_QS.every((q) => q.sourceKind === "concept-extracted" &&
    q.source.startsWith("Original content — concept-extracted from ") && !!q.conceptId && !!q.syllabusClause) &&
  new Set(NEW_QS.map((q) => q.conceptId)).size === 62);
check("4B2 Drawing items: post dm/pet, subject Drawing, Drawing source label",
  DRAW_NEW.every((id) => {
    const q = BY_ID[id];
    return JSON.stringify(q.post) === JSON.stringify(["dm", "pet"]) && q.subject === "Drawing" &&
      q.subjectKey === "drawing" && q.source === "Original content — concept-extracted from Standard Drawing Fundamentals Curriculum" &&
      q.syllabusClause === "Pattern B (ESED-453) — DM: Drawing section (20)";
  }));
check("4B2 Tajweed items: post zamungkor-qari/qari, subject Tajweed, Tajweed source label",
  TAJ_NEW.every((id) => {
    const q = BY_ID[id];
    return JSON.stringify(q.post) === JSON.stringify(["zamungkor-qari", "qari"]) && q.subject === "Tajweed" &&
      q.subjectKey === "tajweed" && q.source === "Original content — concept-extracted from Standard Tajweed and Hifz Curriculum" &&
      q.syllabusClause === "Pattern B (ESED-453) — Qari: Tajweed/Hifz + Islamiyat block (30)";
  }));
check("4B2 Hifz items are TAJ-071..082 with Hifz topics",
  TAJ_NEW.slice(20).every((id) => BY_ID[id].topic.startsWith("Hifz — ")) &&
  TAJ_NEW.slice(0, 20).every((id) => BY_ID[id].topic.startsWith("Tajweed — ")));

// --- RU guard (exact detector from test-step3b-audit2 / test-phase4b1) ---
const RU = new Set("ki ka ke hai hain ho hun hum se mein ko nahi hota hoti hote jata jati gaya gayi tha thi thay yeh woh aur bhi jo aik ek diya kiya raha rahi rahe jab kyun kaise kahan lekin magar phir sirf bohat zyada liye bina kehte kaha kehlata kehlati sakta sakti chahiye wala wali walay hoga hogi honge karein karna hona jana ana karke hokar rehta rehti rehte ne hua hui hue thin aayi aaye nazil paida bani bana mukammal pehle pehli dusre dusri aakhri".split(" "));
const tokens = (s) => s.toLowerCase().replace(/[^a-z\s']/g, " ").split(/\s+/);
const ruHits = [];
for (const q of NEW_QS) {
  for (const field of [q.question, ...q.options, q.explanation]) {
    const hits = tokens(field).filter((t) => RU.has(t));
    if (hits.length) ruHits.push(`${q.id}: ${hits.join(",")}`);
  }
}
check("4B2 RU guard: 0 hits on new questions/options/explanations", ruHits.length === 0, ruHits.join(" | "));

// --- F02 guards unchanged ---
check("4B2 explanationEn count still 124", QUESTIONS.filter((q) => q.explanationEn).length === 124);
check("4B2 roman-marker count still 196", QUESTIONS.filter((q) => q.explanationLang === "roman").length === 196);
check("4B2 pending English explanations still 196", pendingEnglishExplanations().length === 196);

// --- religious-content safety on new Qari text ---
const qariText = JSON.stringify(TAJ_NEW.map((id) => BY_ID[id])) +
  JSON.stringify(NOTES["Tajweed"].slice(14));
check("4B2 no Hadith numbers/citations/narrations in new Qari text",
  !(/hadith\s*\d/i.test(qariText) || /sahih/i.test(qariText) || /bukhari/i.test(qariText) ||
    /muslim\s*\d/i.test(qariText) || /surah\s+\d+:\d+/i.test(qariText) || /ayah\s+\d+/i.test(qariText) ||
    /verse\s+\d+:\d+/i.test(qariText) || /narrat/i.test(qariText)));
const arabicRuns = qariText.match(/[\u0600-\u06FF]+/g) || [];
const allowedGlyphs = new Set(["ج", "لا", "صلى", "قلى", "س", "م"]);
check("4B2 Arabic script in new Qari text only Waqf sign glyphs",
  arabicRuns.every((r) => allowedGlyphs.has(r)), [...new Set(arabicRuns)].join(","));

// --- new notes ---
const DRAW_NOTE_TITLES = [
  "Line, Shape and Form — The Building Blocks",
  "Value and Shading — Light, Shadow and Tone",
  "Perspective — One Point, Two Points and Eye Level",
  "The Colour Wheel — Analogous, Neutral and Monochrome",
  "Geometric Construction — Compass, Bisectors and Angles",
  "Drawing Tools and Materials — Pencils, Erasers and Boards",
  "Composition — Foreground, Balance and Focus",
  "Drawing from Observation — Sighting, Grids and Negative Space",
  "The Human Figure — Proportion in Heads",
  "Shading Techniques — Hatching, Stippling and Blending",
];
const TAJ_NOTE_TITLES = [
  "Sifaat in Detail — Hams, Jahr, Shiddah and Rakhawah",
  "Heavy and Light — Tafkheem, Tarqeeq, Raa and Laam",
  "Sun and Moon Letters — Laam Qamariyyah and Shamsiyyah",
  "Hamzatul Wasl and Hamzatul Qat'",
  "More Madd Types — Leen, Iwaz, Silah and Far'i",
  "Waqf Signs in the Mushaf — Ja, La, Sali, Qali and Saktah",
  "Idgham Families — Same, Near and Close Letters",
  "Hifz Method — Sabq, Sabqi and Amukhta",
  "Revision Cycles — Keeping What You Memorised",
  "Listening, a Teacher and One Mushaf — Hifz Supports",
];
const drawNotes = NOTES["Drawing/PE"].slice(14);
const tajNotes = NOTES["Tajweed"].slice(14);
check("4B2 10 new Drawing notes, appended in order", JSON.stringify(drawNotes.map((n) => n.title)) === JSON.stringify(DRAW_NOTE_TITLES));
check("4B2 10 new Tajweed/Hifz notes, appended in order", JSON.stringify(tajNotes.map((n) => n.title)) === JSON.stringify(TAJ_NOTE_TITLES));
check("4B2 new notes: provenance + conceptId + clause + house style",
  [...drawNotes, ...tajNotes].every((n) => n.sourceKind === "concept-extracted" &&
    n.source.startsWith("Original content — concept-extracted from ") && !!n.conceptId && !!n.syllabusClause &&
    n.body.includes("Roman Urdu:") && n.body.includes("Recall first:")));
check("4B2 new note conceptIds distinct + no collision with new MCQ conceptIds",
  new Set([...drawNotes, ...tajNotes].map((n) => n.conceptId)).size === 20 &&
  [...drawNotes, ...tajNotes].every((n) => !NEW_QS.some((q) => q.conceptId === n.conceptId)));
check("4B2 concept-extracted notes total 56 (15 + 21 + 20)",
  Object.values(NOTES).flat().filter((n) => n.sourceKind === "concept-extracted").length === 56);
check("4B2 3 Hifz notes among the new Tajweed notes",
  tajNotes.slice(7).every((n) => n.conceptId.startsWith("hifz-note-")));

// --- mocks draw from the grown pools ---
const dmB = MOCKS.find((m) => m.id === "dm-B");
const qariB = MOCKS.find((m) => m.id === "qari-B");
const qariMD = MOCKS.find((m) => m.id === "qari-MD");
const dmQs = buildMockQuestions(dmB);
const qariQs = buildMockQuestions(qariB);
const qariMdQs = buildMockQuestions(qariMD);
check("4B2 dm-B builds 100 with 20 drawing from the 50-item pool",
  dmQs.length === 100 && dmQs.filter((q) => q.subjectKey === "drawing").length === 20);
check("4B2 qari-B builds 100 with 20 tajweed from the 82-item pool",
  qariQs.length === 100 && qariQs.filter((q) => q.subjectKey === "tajweed").length === 20);
check("4B2 qari-MD builds 100 with 30 tajweed from the 82-item pool",
  qariMdQs.length === 100 && qariMdQs.filter((q) => q.subjectKey === "tajweed").length === 30);
check("4B2 built mocks have no duplicate questions",
  new Set(dmQs.map((q) => q.id)).size === 100 && new Set(qariQs.map((q) => q.id)).size === 100 &&
  new Set(qariMdQs.map((q) => q.id)).size === 100);

// --- /review scope untouched ---
const zam12 = [...(ZAM_FIXED.zam1 || []), ...(ZAM_FIXED.zam2 || [])];
check("4B2 zam1+zam2 fixed scope still 200", zam12.length === 200, `got ${zam12.length}`);
check("4B2 no new item in the zam1+zam2 fixed lists",
  zam12.every((id) => !DRAW_NEW.includes(id) && !TAJ_NEW.includes(id)));
check("4B2 trusted count in zam1+zam2 still 15",
  zam12.filter((id) => BY_ID[id] && (BY_ID[id].reviewStatus === "owner-reviewed" || BY_ID[id].reviewStatus === "approved")).length === 15);

// --- ledger recompute from the real banks ---
const dmRow = ledger.ledgerRowFor("dm");
const qariRow = ledger.ledgerRowFor("qari");
const drawRow = dmRow.subjects.find((s) => s.label === "Drawing");
const qariBlock = qariRow.subjects.find((s) => s.label === "Tajweed/Hifz + Islamiyat (combined block)");
check("4B2 ledger dm Drawing row: 50 MCQs / 24 notes / 0 cards (recomputed)",
  drawRow.mcqs === 50 && drawRow.notes === 24 && drawRow.cards === 0, JSON.stringify(drawRow));
check("4B2 ledger qari combined row: 187 MCQs / 38 notes / 12 cards (recomputed)",
  qariBlock.mcqs === 187 && qariBlock.notes === 38 && qariBlock.cards === 12, JSON.stringify(qariBlock));
check("4B2 ledger dm + qari coverage still exact", dmRow.coverage === "exact" && qariRow.coverage === "exact");
check("4B2 ledger DM/Qari prose: count-free, Phase 4B2 noted, stale lines gone",
  dmRow.missing.includes("Phase 4B2") && !/\d+ (MCQs|notes)/.test(dmRow.missing) &&
  !dmRow.missing.includes("4 notes shared") &&
  qariRow.missing.includes("Phase 4B2") && !/\d+ (MCQs|notes)/.test(qariRow.missing) &&
  !qariRow.missing.includes("no memorisation material") &&
  qariRow.missing.includes("Qualification ambiguous"));
check("4B2 ledger still 12 rows", ledger.buildLedger().length === 12);

// --------------------------------- §2 scope guards (source)
const ledgerSrc = read("src/lib/ledger.ts");
check("4B2 only dm + qari rows mention Phase 4B2",
  (ledgerSrc.match(/Phase 4B2/g) || []).length === 2);
check("4B2 Phase 4B1 mentions still 2 (ctit + pet rows)",
  (ledgerSrc.match(/Phase 4B1/g) || []).length === 2);
const contentJson = JSON.parse(read("src/data/content.json"));
check("4B2 content.json counts: total 763, Drawing 50, Tajweed 82, notes 151, cards 70",
  contentJson.counts.total === 763 && contentJson.counts.notes === 151 && contentJson.counts.cards === 70 &&
  contentJson.counts.bySubject.find((r) => r[0] === "Drawing")[1] === 50 &&
  contentJson.counts.bySubject.find((r) => r[0] === "Tajweed")[1] === 82);
check("4B2 content.json bySubject index matches banks (drawing 50 / tajweed 82)",
  contentJson.bySubject.drawing.length === 50 && contentJson.bySubject.tajweed.length === 82 &&
  contentJson.bySubject.drawing[49] === "DRW-060" && contentJson.bySubject.tajweed[81] === "TAJ-082");
check("4B2 meta description + i18n counts updated (763 / 151)",
  read("src/app/layout.tsx").includes("763 MCQs") &&
  read("src/lib/i18n.tsx").includes("151 notes") &&
  read("src/lib/i18n.tsx").includes("763-question bank"));

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll Phase 4B2 tests passed.");
