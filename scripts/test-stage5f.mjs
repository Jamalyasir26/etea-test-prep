// Stage 5F tests — IT (60 MCQs) + PE (46 MCQs) + IT/Computer notes (17),
// Urdu script + Roman Urdu, on the Stage 5A infrastructure.
// Exercises the REAL data.ts (compiled to CommonJS in /tmp with tsc, same
// approach as test-stage5a/b/c/d/e.mjs). Locks: counts unchanged; flat
// _ur/_roman fields are all-or-none per language per item (whole items
// only); options arrays match English length/order slots; the
// explanationEn inspection result — IT explanations are pure Roman Urdu
// originals (explanation_roman verbatim, all 30) and the 5 PE gloss items
// carry "Roman Urdu: <gloss>" (explanation_roman = verbatim gloss);
// digits preserved per pattern; no Latin honorific abbreviations; no bank
// or subject other than the thirteen translated banks / twelve translated
// note subjects touched; item-level fallback on real 5F items. The
// pre-existing `sourceNote` key on 10 PE items is allowed (present in the
// pre-Stage-5 backup, not added by 5F). No schema/rendering/badge changes.
// Run: node scripts/test-stage5f.mjs  (exit 0 = all pass)
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(join(ROOT, p), "utf8");
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

// --------------------------------- §1 real data.ts (tsc harness)
const OUT = "/tmp/stage5f-data";
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
check("5F tsc harness: no unexpected type errors", tscErrors.every((l) => l.includes("TS5097")), tscDiag.slice(0, 300));
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const { QUESTIONS, BY_SUBJECT, NOTES, VISIBLE_COUNTS, resolveQuestionView, resolveNoteView } = data;

// --------------------------------- §2 counts unchanged
check("5F bank total 763 MCQs", QUESTIONS.length === 763, `got ${QUESTIONS.length}`);
const notesTotal = Object.values(NOTES).flat().length;
check("5F notes total 151", notesTotal === 151, `got ${notesTotal}`);
check(
  "5F VISIBLE_COUNTS 763/151/70, 12 tracks / 16 mocks",
  VISIBLE_COUNTS.total === 763 &&
    VISIBLE_COUNTS.notes === 151 &&
    VISIBLE_COUNTS.cards === 70 &&
    VISIBLE_COUNTS.tracks === 12 &&
    VISIBLE_COUNTS.mocks === 16,
  JSON.stringify(VISIBLE_COUNTS),
);
check("5F it bank still 60 items", BY_SUBJECT.it.length === 60, `got ${BY_SUBJECT.it.length}`);
check("5F pe bank still 46 items", BY_SUBJECT.pe.length === 46, `got ${BY_SUBJECT.pe.length}`);
check("5F IT/Computer notes still 17", NOTES["IT/Computer"].length === 17, `got ${NOTES["IT/Computer"].length}`);

// --------------------------------- §3 MCQ field completeness (all-or-none per language)
const MCQ_TR_KEYS = ["question_ur", "question_roman", "options_ur", "options_roman", "explanation_ur", "explanation_roman"];
const MCQ_ORIG_KEYS = new Set([
  "id", "post", "subject", "subjectKey", "topic", "question", "options", "correctIndex",
  "explanation", "explanationEn", "explanationLang", "explanationUrdu", "difficulty",
  "pastPaperRef", "verified", "source", "reviewStatus", "reviewedBy", "reviewedAt",
  "conceptId", "syllabusClause", "sourceKind", "ur", "roman",
  // Pre-existing provenance key on 10 PE items (PE-001–PE-010) — present in
  // the pre-Stage-5 backup, not added by 5F (same allowance as 5E).
  "sourceNote",
]);
function tripleComplete(q, lang) {
  const tq = q[`question_${lang}`];
  const to = q[`options_${lang}`];
  const te = q[`explanation_${lang}`];
  const present = [tq !== undefined, to !== undefined, te !== undefined];
  const allPresent = present.every(Boolean);
  const nonePresent = present.every((p) => !p);
  const valid =
    allPresent &&
    typeof tq === "string" &&
    tq.trim().length > 0 &&
    Array.isArray(to) &&
    to.length === q.options.length &&
    to.every((s) => typeof s === "string" && s.trim().length > 0) &&
    typeof te === "string" &&
    te.trim().length > 0;
  return { allPresent, nonePresent, valid };
}
for (const [bankKey, label, expected] of [["it", "it", 60], ["pe", "pe", 46]]) {
  let badShape = [];
  let badKeys = [];
  let urSet = [];
  let romanSet = [];
  for (const q of BY_SUBJECT[bankKey]) {
    for (const k of Object.keys(q)) {
      if (!MCQ_ORIG_KEYS.has(k) && !MCQ_TR_KEYS.includes(k)) badKeys.push(`${q.id}:${k}`);
    }
    const ur = tripleComplete(q, "ur");
    const roman = tripleComplete(q, "roman");
    if (!((ur.nonePresent || ur.valid) && (roman.nonePresent || roman.valid))) {
      badShape.push(q.id);
    }
    if (ur.valid) urSet.push(q.id);
    if (roman.valid) romanSet.push(q.id);
  }
  check(`5F ${label} MCQs: no unexpected keys added`, badKeys.length === 0, badKeys.slice(0, 5).join(", "));
  check(
    `5F ${label} MCQs: translation triples all-or-none + valid per language`,
    badShape.length === 0,
    badShape.slice(0, 5).join(", "),
  );
  check(
    `5F ${label} MCQs: ur set == roman set (both languages together)`,
    urSet.length === romanSet.length && urSet.every((id) => romanSet.includes(id)),
    `ur=${urSet.length} roman=${romanSet.length}`,
  );
  check(`5F ${label} MCQs: all ${expected} translated`, urSet.length === expected, `translated=${urSet.length}`);
  console.log(`INFO  5F ${label} MCQs translated: ${urSet.length}/${expected}`);
}
check(
  "5F sourceNote preserved byte-identical on PE-001–PE-010",
  BY_SUBJECT.pe.filter((q) => q.sourceNote).length === 10 &&
    BY_SUBJECT.pe.filter((q) => q.sourceNote).every((q) => q.sourceNote === "AI-drafted; unreviewed"),
);

// --------------------------------- §4 explanationEn inspection result
const scopeQs = [...BY_SUBJECT.it, ...BY_SUBJECT.pe];
const GLOSS_IDS = new Set(["DRW-011", "DRW-012", "DRW-016", "DRW-019", "PE-001"]);
check(
  "5F no Roman-marked items in the 2 in-scope banks",
  scopeQs.every((q) => q.explanationLang !== "roman"),
  scopeQs.filter((q) => q.explanationLang === "roman").map((q) => q.id).join(", "),
);
check(
  "5F it: exactly the first 30 items (ITC-001–ITC-030) carry explanationEn",
  BY_SUBJECT.it.filter((q) => q.explanationEn).length === 30 &&
    BY_SUBJECT.it.filter((q) => q.explanationEn).every((q, i) => q.id === `ITC-${String(i + 1).padStart(3, "0")}`),
);
check(
  "5F it: stored explanations are pure Roman originals (do not start with explanationEn, no 'Roman Urdu:' label)",
  BY_SUBJECT.it.filter((q) => q.explanationEn).every((q) => !q.explanation.startsWith(q.explanationEn) && !/Roman Urdu:/.test(q.explanation)),
);
check(
  "5F it: explanation_roman is a verbatim copy of `explanation` (all 30)",
  BY_SUBJECT.it.filter((q) => q.explanationEn).every((q) => q.explanation_roman === q.explanation),
  BY_SUBJECT.it.filter((q) => q.explanationEn && q.explanation_roman !== q.explanation).map((q) => q.id).join(", "),
);
check(
  "5F pe: exactly the 5 gloss items carry explanationEn",
  BY_SUBJECT.pe.filter((q) => q.explanationEn).length === 5 &&
    BY_SUBJECT.pe.filter((q) => q.explanationEn).every((q) => GLOSS_IDS.has(q.id)),
);
check(
  "5F pe: gloss items are English sentence + 'Roman Urdu: <gloss>' (all start with explanationEn)",
  BY_SUBJECT.pe.filter((q) => q.explanationEn).every((q) => q.explanation.startsWith(q.explanationEn) && /Roman Urdu:/.test(q.explanation)),
);
check(
  "5F pe: explanation_roman is the verbatim gloss content (label + English sentence dropped, all 5)",
  BY_SUBJECT.pe.filter((q) => q.explanationEn).every((q) => q.explanation_roman === q.explanation.split("Roman Urdu: ")[1]),
  BY_SUBJECT.pe.filter((q) => q.explanationEn && q.explanation_roman !== q.explanation.split("Roman Urdu: ")[1]).map((q) => q.id).join(", "),
);
check(
  "5F items without explanationEn (30 IT + 41 PE) have plain English explanations translated to both",
  scopeQs.filter((q) => !q.explanationEn).length === 71 &&
    scopeQs.filter((q) => !q.explanationEn).every((q) => q.explanation_ur && q.explanation_roman),
);
let labelLeak = [];
for (const q of scopeQs) {
  for (const k of MCQ_TR_KEYS) {
    const v = Array.isArray(q[k]) ? q[k].join(" ") : q[k];
    if (typeof v === "string" && /Roman Urdu:/.test(v)) labelLeak.push(`${q.id}:${k}`);
  }
}
for (const n of NOTES["IT/Computer"]) {
  for (const k of ["title_ur", "title_roman", "body_ur", "body_roman"]) {
    if (typeof n[k] === "string" && /Roman Urdu:/.test(n[k])) labelLeak.push(`IT/Computer:${n.title}:${k}`);
  }
}
check("5F no 'Roman Urdu:' label leaked into any 5F translation field", labelLeak.length === 0, labelLeak.slice(0, 3).join(", "));
check(
  "5F explanationUrdu dead field untouched (still present on every in-scope item)",
  scopeQs.every((q) => "explanationUrdu" in q),
);

// --------------------------------- §5 digits preserved (per explanation pattern)
function digitRuns(s) { return (s.match(/[0-9]+/g) || []).sort(); }
function sameMultiset(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
let digitBad = [];
for (const q of scopeQs) {
  for (const [src, dst] of [["question", "question_ur"], ["question", "question_roman"]]) {
    if (!sameMultiset(digitRuns(q[src]), digitRuns(q[dst]))) digitBad.push(`${q.id}:${dst}`);
  }
  q.options.forEach((opt, i) => {
    for (const k of ["options_ur", "options_roman"]) {
      if (!sameMultiset(digitRuns(opt), digitRuns(q[k][i]))) digitBad.push(`${q.id}:${k}[${i}]`);
    }
  });
}
// IT explanationEn items: _roman is verbatim; _ur keeps the Roman original's digits.
for (const q of BY_SUBJECT.it.filter((x) => x.explanationEn)) {
  if (!sameMultiset(digitRuns(q.explanation), digitRuns(q.explanation_ur))) digitBad.push(`${q.id}:explanation_ur`);
}
// PE gloss items: _roman is the verbatim gloss; _ur keeps the gloss's digits.
for (const q of BY_SUBJECT.pe.filter((x) => x.explanationEn)) {
  const gloss = q.explanation.split("Roman Urdu: ")[1];
  if (!sameMultiset(digitRuns(gloss), digitRuns(q.explanation_ur))) digitBad.push(`${q.id}:explanation_ur`);
}
// Plain English explanations: digits equal in both languages.
for (const q of scopeQs.filter((x) => !x.explanationEn)) {
  for (const dst of ["explanation_ur", "explanation_roman"]) {
    if (!sameMultiset(digitRuns(q.explanation), digitRuns(q[dst]))) digitBad.push(`${q.id}:${dst}`);
  }
}
check("5F digit runs preserved in every translated MCQ field (per explanation pattern)", digitBad.length === 0, digitBad.slice(0, 5).join(", "));

// --------------------------------- §6 honorifics + Arabic verbatim (general audit)
const AR_RUN = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-ﹿ]+/g;
const HONOR_ABBR = /\(S\.?A\.?W\.?\)|\(P\.?B\.?U\.?H\.?\)|\(R\.?A\.?\)|\(A\.?S\.?\)/i;
function arabicRuns(s) { return (s.match(AR_RUN) || []).filter((r) => r.trim().length > 0); }
let arabicBad = [];
let honorBad = [];
function auditField(src, tr, where) {
  for (const run of arabicRuns(src)) {
    if (!tr.includes(run)) arabicBad.push(`${where}: ${JSON.stringify(run)}`);
  }
  if (HONOR_ABBR.test(tr)) honorBad.push(where);
}
for (const q of scopeQs) {
  for (const lang of ["ur", "roman"]) {
    auditField(q.question, q[`question_${lang}`], `${q.id} question_${lang}`);
    q.options.forEach((opt, i) => auditField(opt, q[`options_${lang}`][i], `${q.id} options_${lang}[${i}]`));
    auditField(q.explanation, q[`explanation_${lang}`], `${q.id} explanation_${lang}`);
  }
}
for (const n of NOTES["IT/Computer"]) {
  for (const lang of ["ur", "roman"]) {
    auditField(n.title, n[`title_${lang}`], `IT/Computer note "${n.title}" title_${lang}`);
    auditField(n.body, n[`body_${lang}`], `IT/Computer note "${n.title}" body_${lang}`);
  }
}
check("5F Arabic script copied verbatim into both languages (none expected in scope)", arabicBad.length === 0, arabicBad.slice(0, 3).join(" | "));
check("5F no Latin honorific abbreviations in any 5F translation", honorBad.length === 0, honorBad.slice(0, 3).join(", "));

// --------------------------------- §7 no other bank/subject touched
const bankDir = join(ROOT, "src/data/banks");
const TRANSLATED_BANKS = new Set(["islamiyat.json", "tajweed.json", "arabic.json", "urdu.json", "english.json", "maths.json", "gk.json", "science.json", "pakstudies.json", "socialstudies.json", "pedagogy.json", "it.json", "pe.json", "drawing.json", "pastpapers.json", "pastpapers_reworded.json"]);
let otherBankTouched = [];
for (const f of fs.readdirSync(bankDir)) {
  if (TRANSLATED_BANKS.has(f)) continue;
  const items = JSON.parse(fs.readFileSync(join(bankDir, f), "utf8"));
  for (const q of items) {
    if (MCQ_TR_KEYS.some((k) => k in q)) otherBankTouched.push(`${f}:${q.id}`);
  }
}
check("5F no bank other than the 16 translated banks carries _ur/_roman fields", otherBankTouched.length === 0, otherBankTouched.slice(0, 5).join(", "));
check("5F drawing_pe.json (dead, unregistered) untouched: no translation fields", (() => {
  const items = JSON.parse(fs.readFileSync(join(bankDir, "drawing_pe.json"), "utf8"));
  return items.every((q) => !MCQ_TR_KEYS.some((k) => k in q));
})());

// --------------------------------- §8 notes: completeness + scope + digits + gloss handling
const NOTE_TR_KEYS = ["title_ur", "title_roman", "body_ur", "body_roman"];
const NOTE_ORIG_KEYS = new Set(["title", "body", "source", "conceptId", "syllabusClause", "sourceKind", "ur", "roman"]);
{
  let noteBadShape = [];
  let noteBadKeys = [];
  let noteTranslated = [];
  for (const n of NOTES["IT/Computer"]) {
    for (const k of Object.keys(n)) {
      if (!NOTE_ORIG_KEYS.has(k) && !NOTE_TR_KEYS.includes(k)) noteBadKeys.push(`${n.title}:${k}`);
    }
    const present = NOTE_TR_KEYS.filter((k) => n[k] !== undefined);
    const valid =
      present.length === 4 &&
      NOTE_TR_KEYS.every((k) => typeof n[k] === "string" && n[k].trim().length > 0);
    if (!(present.length === 0 || valid)) noteBadShape.push(n.title);
    if (valid) noteTranslated.push(n.title);
  }
  check("5F IT/Computer notes: no unexpected keys added", noteBadKeys.length === 0, noteBadKeys.slice(0, 3).join(", "));
  check("5F IT/Computer notes: translation fields all-4-or-none + valid", noteBadShape.length === 0, noteBadShape.slice(0, 3).join(", "));
  check("5F IT/Computer notes: all 17 translated", noteTranslated.length === 17, `translated=${noteTranslated.length}`);
  console.log(`INFO  5F IT/Computer notes translated: ${noteTranslated.length}/17`);
}
const TRANSLATED_NOTE_SUBJECTS = new Set(["Islamiyat", "Tajweed", "Arabic", "Urdu", "English", "Maths", "GK", "General Science", "Pak Studies", "Social Studies", "Pedagogy", "IT/Computer", "Drawing/PE"]);
let otherNoteTouched = [];
for (const [subject, notes] of Object.entries(NOTES)) {
  if (TRANSLATED_NOTE_SUBJECTS.has(subject)) continue;
  for (const n of notes) {
    if (NOTE_TR_KEYS.some((k) => k in n)) otherNoteTouched.push(`${subject}:${n.title}`);
  }
}
check("5F no subject other than the 13 translated subjects carries note _ur/_roman fields", otherNoteTouched.length === 0, otherNoteTouched.slice(0, 3).join(", "));
let noteDigitBad = [];
for (const n of NOTES["IT/Computer"]) {
  for (const [src, dst] of [["title", "title_ur"], ["title", "title_roman"], ["body", "body_ur"], ["body", "body_roman"]]) {
    if (!sameMultiset(digitRuns(n[src]), digitRuns(n[dst]))) noteDigitBad.push(`IT/Computer:${n.title}:${dst}`);
  }
}
check("5F digit runs unchanged in every translated note field", noteDigitBad.length === 0, noteDigitBad.slice(0, 3).join(", "));
// Gloss rule on all 13 notes carrying a "Roman Urdu:" gloss sentence: label
// dropped, gloss kept verbatim in _roman, translated in _ur.
const glossNotes = NOTES["IT/Computer"].filter((n) => /Roman Urdu:/.test(n.body));
check("5F exactly 13 IT/Computer notes carry a 'Roman Urdu:' gloss sentence", glossNotes.length === 13, `got ${glossNotes.length}`);
let glossBad = [];
for (const n of glossNotes) {
  const gloss = n.body.match(/Roman Urdu:\s*(.*?)\.\s*Recall first:/)[1].trim();
  if (!n.body_roman.includes(gloss)) glossBad.push(n.title);
}
check("5F all 13 note glosses verbatim in body_roman", glossBad.length === 0, glossBad.slice(0, 3).join(", "));
const wordNote = NOTES["IT/Computer"].find((n) => n.title === "MS Word — Word Processing");
check(
  "5F MS Word note: gloss verbatim in body_roman, translated in body_ur, label dropped",
  wordNote.body_roman.includes("Word se dastavezat likhi jati hain — letter, darkhwast, mazmoon.") &&
    wordNote.body_ur.includes("Word سے دستاویزات لکھی جاتی ہیں — خط، درخواست، مضمون۔"),
);
const binNote = NOTES["IT/Computer"].find((n) => n.title === "Binary — How Computers Count");
check(
  "5F Binary note: gloss verbatim in body_roman, translated in body_ur, label dropped",
  binNote.body_roman.includes("computer sirf 0 aur 1 samajhta hai; 8 bit se 1 byte banta hai.") &&
    binNote.body_ur.includes("کمپیوٹر صرف 0 اور 1 سمجھتا ہے؛ 8 bit سے 1 byte بنتا ہے۔"),
);
check(
  "5F Recall-first lead-in kept in body_roman ('Recall first:') and body_ur ('پہلے یاد کریں:') on all 17 notes",
  NOTES["IT/Computer"].every((n) => n.body_roman.includes("Recall first:") && n.body_ur.includes("پہلے یاد کریں:")),
);

// --------------------------------- §9 resolver on real 5F items + notes
for (const [bankKey, label] of [["it", "IT"], ["pe", "PE"]]) {
  const tq = BY_SUBJECT[bankKey].find((q) => q.question_ur !== undefined);
  if (tq) {
    const rUr = resolveQuestionView(tq, "ur");
    check(`5F resolver: translated ${label} item in ur returns translated view`, rUr.translated === true && rUr.view.question === tq.question_ur);
    const rRoman = resolveQuestionView(tq, "roman");
    check(`5F resolver: translated ${label} item in roman returns roman view`, rRoman.translated === true && rRoman.view.question === tq.question_roman);
    check(
      `5F resolver: ${label} view preserves id/correctIndex/reviewStatus/source`,
      rUr.view.id === tq.id &&
        rUr.view.correctIndex === tq.correctIndex &&
        rUr.view.reviewStatus === tq.reviewStatus &&
        rUr.view.source === tq.source,
    );
  }
}
{
  const tn = NOTES["IT/Computer"].find((n) => n.title_ur !== undefined);
  if (tn) {
    const rn = resolveNoteView(tn, "ur");
    check("5F note resolver: translated IT/Computer note in ur returns translated text", rn.translated === true && rn.title === tn.title_ur && rn.body === tn.body_ur);
    const rnR = resolveNoteView(tn, "roman");
    check("5F note resolver: translated IT/Computer note in roman returns roman text", rnR.translated === true && rnR.title === tn.title_roman && rnR.body === tn.body_roman);
  }
}
check("5F quran-examples.json untouched: no translation keys", !/_ur|_roman/.test(read("src/data/quran-examples.json")));
const contentJson = readJson("src/data/content.json");
check("5F content.json counts unchanged", contentJson.counts.total === 763 && contentJson.counts.notes === 151 && contentJson.counts.cards === 70);

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll Stage 5F checks passed.");
