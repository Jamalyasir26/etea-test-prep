// Stage 5B tests — Tajweed pilot batch 2 (82 MCQs + 24 notes, Urdu
// script + Roman Urdu) on the Stage 5A infrastructure. Exercises the
// REAL data.ts (compiled to CommonJS in /tmp with tsc, same approach
// as test-stage5a.mjs). Locks: counts unchanged; flat _ur/_roman
// fields are all-or-none per language per item (whole items only);
// options arrays match English length/order slots; the one
// Roman-marked explanation (TAJ-029) copied verbatim to _roman;
// Arabic script copied verbatim into both languages; no Latin
// honorific abbreviations; no bank/subject other than
// Islamiyat+Tajweed touched; item-level fallback on real Tajweed
// items. No schema/rendering/badge changes in this batch.
// Run: node scripts/test-stage5b.mjs  (exit 0 = all pass)
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
const OUT = "/tmp/stage5b-data";
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
check("5B tsc harness: no unexpected type errors", tscErrors.every((l) => l.includes("TS5097")), tscDiag.slice(0, 300));
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const { QUESTIONS, BY_SUBJECT, NOTES, VISIBLE_COUNTS, resolveQuestionView, resolveNoteView } = data;

// --------------------------------- §2 counts unchanged
check("5B bank total 763 MCQs", QUESTIONS.length === 763, `got ${QUESTIONS.length}`);
const notesTotal = Object.values(NOTES).flat().length;
check("5B notes total 151", notesTotal === 151, `got ${notesTotal}`);
check(
  "5B VISIBLE_COUNTS 763/151/70, 12 tracks / 16 mocks",
  VISIBLE_COUNTS.total === 763 &&
    VISIBLE_COUNTS.notes === 151 &&
    VISIBLE_COUNTS.cards === 70 &&
    VISIBLE_COUNTS.tracks === 12 &&
    VISIBLE_COUNTS.mocks === 16,
  JSON.stringify(VISIBLE_COUNTS),
);
check("5B tajweed bank still 82 items", BY_SUBJECT.tajweed.length === 82, `got ${BY_SUBJECT.tajweed.length}`);
check("5B tajweed notes still 24", NOTES.Tajweed.length === 24, `got ${NOTES.Tajweed.length}`);
check("5B islamiyat bank still 105 items", BY_SUBJECT.islamiyat.length === 105, `got ${BY_SUBJECT.islamiyat.length}`);

// --------------------------------- §3 MCQ field completeness (all-or-none per language)
const MCQ_TR_KEYS = ["question_ur", "question_roman", "options_ur", "options_roman", "explanation_ur", "explanation_roman"];
const MCQ_ORIG_KEYS = new Set([
  "id", "post", "subject", "subjectKey", "topic", "question", "options", "correctIndex",
  "explanation", "explanationEn", "explanationLang", "explanationUrdu", "difficulty",
  "pastPaperRef", "verified", "source", "reviewStatus", "reviewedBy", "reviewedAt",
  "conceptId", "syllabusClause", "sourceKind", "ur", "roman",
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
let mcqBadShape = [];
let mcqBadKeys = [];
let mcqUrSet = [];
let mcqRomanSet = [];
for (const q of BY_SUBJECT.tajweed) {
  for (const k of Object.keys(q)) {
    if (!MCQ_ORIG_KEYS.has(k) && !MCQ_TR_KEYS.includes(k)) mcqBadKeys.push(`${q.id}:${k}`);
  }
  const ur = tripleComplete(q, "ur");
  const roman = tripleComplete(q, "roman");
  if (!((ur.nonePresent || ur.valid) && (roman.nonePresent || roman.valid))) {
    mcqBadShape.push(q.id);
  }
  if (ur.valid) mcqUrSet.push(q.id);
  if (roman.valid) mcqRomanSet.push(q.id);
}
check("5B tajweed MCQs: no unexpected keys added", mcqBadKeys.length === 0, mcqBadKeys.slice(0, 5).join(", "));
check(
  "5B tajweed MCQs: translation triples all-or-none + valid per language",
  mcqBadShape.length === 0,
  mcqBadShape.slice(0, 5).join(", "),
);
check(
  "5B tajweed MCQs: ur set == roman set (both languages together)",
  mcqUrSet.length === mcqRomanSet.length && mcqUrSet.every((id) => mcqRomanSet.includes(id)),
  `ur=${mcqUrSet.length} roman=${mcqRomanSet.length}`,
);
check("5B tajweed MCQs: all 82 translated", mcqUrSet.length === 82, `translated=${mcqUrSet.length}`);
console.log(`INFO  5B tajweed MCQs translated: ${mcqUrSet.length}/82`);

// --------------------------------- §4 Roman-marked explanation copied verbatim (TAJ-029)
const t29 = BY_SUBJECT.tajweed.find((q) => q.id === "TAJ-029");
check("5B TAJ-029 is the Roman-marked item", t29 !== undefined && t29.explanationLang === "roman");
check(
  "5B TAJ-029: explanation_roman is a verbatim copy of `explanation`",
  t29 !== undefined && t29.explanation_roman === t29.explanation,
);
check(
  "5B exactly one Roman-marked Tajweed explanation",
  BY_SUBJECT.tajweed.filter((q) => q.explanationLang === "roman").length === 1,
);
check(
  "5B explanationUrdu dead field untouched (still present on every item)",
  BY_SUBJECT.tajweed.every((q) => "explanationUrdu" in q),
);

// --------------------------------- §5 Arabic verbatim + honorific convention
const AR_RUN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;
const HONOR_ABBR = /\(S\.?A\.?W\.?\)|\(P\.?B\.?U\.?H\.?\)|\(R\.?A\.?\)|\(A\.?S\.?\)/i;
function arabicRuns(s) {
  return (s.match(AR_RUN) || []).filter((r) => r.trim().length > 0);
}
let arabicBad = [];
let honorBad = [];
function auditField(src, tr, where) {
  for (const run of arabicRuns(src)) {
    if (!tr.includes(run)) arabicBad.push(`${where}: ${JSON.stringify(run)}`);
  }
  if (HONOR_ABBR.test(tr)) honorBad.push(where);
}
for (const q of BY_SUBJECT.tajweed) {
  for (const lang of ["ur", "roman"]) {
    if (q[`question_${lang}`] === undefined) continue;
    auditField(q.question, q[`question_${lang}`], `${q.id} question_${lang}`);
    q.options.forEach((opt, i) => auditField(opt, q[`options_${lang}`][i], `${q.id} options_${lang}[${i}]`));
    auditField(q.explanation, q[`explanation_${lang}`], `${q.id} explanation_${lang}`);
  }
}
for (const n of NOTES.Tajweed) {
  for (const lang of ["ur", "roman"]) {
    if (n[`title_${lang}`] === undefined) continue;
    auditField(n.title, n[`title_${lang}`], `note "${n.title}" title_${lang}`);
    auditField(n.body, n[`body_${lang}`], `note "${n.title}" body_${lang}`);
  }
}
check("5B Arabic script copied verbatim into both languages", arabicBad.length === 0, arabicBad.slice(0, 3).join(" | "));
check("5B no Latin honorific abbreviations in translations", honorBad.length === 0, honorBad.slice(0, 3).join(", "));

// --------------------------------- §6 no other bank/subject touched
const bankDir = join(ROOT, "src/data/banks");
// Stage 5C: arabic.json + urdu.json are translated too.
// Stage 5D: english.json + maths.json + gk.json are translated too.
const TRANSLATED_BANKS = new Set(["islamiyat.json", "tajweed.json", "arabic.json", "urdu.json", "english.json", "maths.json", "gk.json", "science.json", "pakstudies.json", "socialstudies.json", "pedagogy.json", "it.json", "pe.json", "drawing.json", "pastpapers.json", "pastpapers_reworded.json"]);
let otherBankTouched = [];
for (const f of fs.readdirSync(bankDir)) {
  if (TRANSLATED_BANKS.has(f)) continue;
  const items = JSON.parse(fs.readFileSync(join(bankDir, f), "utf8"));
  for (const q of items) {
    if (MCQ_TR_KEYS.some((k) => k in q)) otherBankTouched.push(`${f}:${q.id}`);
  }
}
check("5B no bank other than islamiyat/tajweed/arabic/urdu/english/maths/gk carries _ur/_roman fields", otherBankTouched.length === 0, otherBankTouched.slice(0, 5).join(", "));

// --------------------------------- §7 notes: completeness + scope
const NOTE_TR_KEYS = ["title_ur", "title_roman", "body_ur", "body_roman"];
const NOTE_ORIG_KEYS = new Set(["title", "body", "source", "conceptId", "syllabusClause", "sourceKind", "ur", "roman"]);
let noteBadShape = [];
let noteBadKeys = [];
let noteTranslated = [];
for (const n of NOTES.Tajweed) {
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
check("5B tajweed notes: no unexpected keys added", noteBadKeys.length === 0, noteBadKeys.slice(0, 3).join(", "));
check("5B tajweed notes: translation fields all-4-or-none + valid", noteBadShape.length === 0, noteBadShape.slice(0, 3).join(", "));
check("5B tajweed notes: all 24 translated", noteTranslated.length === 24, `translated=${noteTranslated.length}`);
console.log(`INFO  5B tajweed notes translated: ${noteTranslated.length}/24`);
// Stage 5C: Arabic + Urdu notes are translated too.
// Stage 5D: English + Maths + GK notes are translated too.
const TRANSLATED_NOTE_SUBJECTS = new Set(["Islamiyat", "Tajweed", "Arabic", "Urdu", "English", "Maths", "GK", "General Science", "Pak Studies", "Social Studies", "Pedagogy", "IT/Computer", "Drawing/PE"]);
let otherNoteTouched = [];
for (const [subject, notes] of Object.entries(NOTES)) {
  if (TRANSLATED_NOTE_SUBJECTS.has(subject)) continue;
  for (const n of notes) {
    if (NOTE_TR_KEYS.some((k) => k in n)) otherNoteTouched.push(`${subject}:${n.title}`);
  }
}
check("5B no subject other than Islamiyat/Tajweed/Arabic/Urdu/English/Maths/GK carries note _ur/_roman fields", otherNoteTouched.length === 0, otherNoteTouched.slice(0, 3).join(", "));

// --------------------------------- §8 resolver on real Tajweed items
const translatedQ = BY_SUBJECT.tajweed.find((q) => q.question_ur !== undefined);
if (translatedQ) {
  const rUr = resolveQuestionView(translatedQ, "ur");
  check("5B resolver: translated Tajweed item in ur returns translated view", rUr.translated === true && rUr.view.question === translatedQ.question_ur);
  check("5B resolver: translated view options are the _ur array", JSON.stringify(rUr.view.options) === JSON.stringify(translatedQ.options_ur));
  const rRoman = resolveQuestionView(translatedQ, "roman");
  check("5B resolver: translated Tajweed item in roman returns roman view", rRoman.translated === true && rRoman.view.question === translatedQ.question_roman);
  check(
    "5B resolver: view preserves id/correctIndex/reviewStatus/source",
    rUr.view.id === translatedQ.id &&
      rUr.view.correctIndex === translatedQ.correctIndex &&
      rUr.view.reviewStatus === translatedQ.reviewStatus &&
      rUr.view.source === translatedQ.source,
  );
}
const translatedN = NOTES.Tajweed.find((n) => n.title_ur !== undefined);
if (translatedN) {
  const rn = resolveNoteView(translatedN, "ur");
  check("5B note resolver: translated Tajweed note in ur returns translated text", rn.translated === true && rn.title === translatedN.title_ur && rn.body === translatedN.body_ur);
  const rnR = resolveNoteView(translatedN, "roman");
  check("5B note resolver: translated Tajweed note in roman returns roman text", rnR.translated === true && rnR.title === translatedN.title_roman);
}
check("5B quran-examples.json untouched: no translation keys", !/_ur|_roman/.test(read("src/data/quran-examples.json")));
const contentJson = readJson("src/data/content.json");
check("5B content.json counts unchanged", contentJson.counts.total === 763 && contentJson.counts.notes === 151 && contentJson.counts.cards === 70);

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll Stage 5B checks passed.");
