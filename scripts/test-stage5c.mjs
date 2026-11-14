// Stage 5C tests — Arabic (80 MCQs + 13 notes) + Urdu (45 MCQs + 6
// notes), Urdu script + Roman Urdu, on the Stage 5A infrastructure.
// Exercises the REAL data.ts (compiled to CommonJS in /tmp with tsc,
// same approach as test-stage5a/b.mjs). Locks: counts unchanged;
// flat _ur/_roman fields are all-or-none per language per item (whole
// items only); options arrays match English length/order slots; ALL
// Roman-marked explanations (60 Arabic + 45 Urdu) copied verbatim to
// _roman; Arabic script copied verbatim into both languages (MCQs +
// Arabic notes); Urdu notes are already Urdu script so _ur is verbatim
// and _roman is pure-Latin transliteration; no Latin honorific
// abbreviations; no bank/subject other than
// Islamiyat+Tajweed+Arabic+Urdu touched; item-level fallback on real
// Arabic/Urdu items. No schema/rendering/badge changes in this batch.
// Run: node scripts/test-stage5c.mjs  (exit 0 = all pass)
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
const OUT = "/tmp/stage5c-data";
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
check("5C tsc harness: no unexpected type errors", tscErrors.every((l) => l.includes("TS5097")), tscDiag.slice(0, 300));
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const { QUESTIONS, BY_SUBJECT, NOTES, VISIBLE_COUNTS, resolveQuestionView, resolveNoteView } = data;

// --------------------------------- §2 counts unchanged
check("5C bank total 763 MCQs", QUESTIONS.length === 763, `got ${QUESTIONS.length}`);
const notesTotal = Object.values(NOTES).flat().length;
check("5C notes total 151", notesTotal === 151, `got ${notesTotal}`);
check(
  "5C VISIBLE_COUNTS 763/151/70, 12 tracks / 16 mocks",
  VISIBLE_COUNTS.total === 763 &&
    VISIBLE_COUNTS.notes === 151 &&
    VISIBLE_COUNTS.cards === 70 &&
    VISIBLE_COUNTS.tracks === 12 &&
    VISIBLE_COUNTS.mocks === 16,
  JSON.stringify(VISIBLE_COUNTS),
);
check("5C arabic bank still 80 items", BY_SUBJECT.arabic.length === 80, `got ${BY_SUBJECT.arabic.length}`);
check("5C urdu bank still 45 items", BY_SUBJECT.urdu.length === 45, `got ${BY_SUBJECT.urdu.length}`);
check("5C Arabic notes still 13", NOTES.Arabic.length === 13, `got ${NOTES.Arabic.length}`);
check("5C Urdu notes still 6", NOTES.Urdu.length === 6, `got ${NOTES.Urdu.length}`);

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
for (const [bankKey, label, expected] of [["arabic", "arabic", 80], ["urdu", "urdu", 45]]) {
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
  check(`5C ${label} MCQs: no unexpected keys added`, badKeys.length === 0, badKeys.slice(0, 5).join(", "));
  check(
    `5C ${label} MCQs: translation triples all-or-none + valid per language`,
    badShape.length === 0,
    badShape.slice(0, 5).join(", "),
  );
  check(
    `5C ${label} MCQs: ur set == roman set (both languages together)`,
    urSet.length === romanSet.length && urSet.every((id) => romanSet.includes(id)),
    `ur=${urSet.length} roman=${romanSet.length}`,
  );
  check(`5C ${label} MCQs: all ${expected} translated`, urSet.length === expected, `translated=${urSet.length}`);
  console.log(`INFO  5C ${label} MCQs translated: ${urSet.length}/${expected}`);
}

// --------------------------------- §4 Roman-marked explanations copied verbatim (all 105)
const romanMarked = [...BY_SUBJECT.arabic, ...BY_SUBJECT.urdu].filter((q) => q.explanationLang === "roman");
check("5C Roman-marked count: 60 Arabic + 45 Urdu", romanMarked.length === 105 &&
  BY_SUBJECT.arabic.filter((q) => q.explanationLang === "roman").length === 60 &&
  BY_SUBJECT.urdu.filter((q) => q.explanationLang === "roman").length === 45,
  `got ${romanMarked.length}`);
const nonVerbatim = romanMarked.filter((q) => q.explanation_roman !== q.explanation);
check("5C every Roman-marked explanation_roman is a verbatim copy of `explanation`", nonVerbatim.length === 0, nonVerbatim.slice(0, 3).map((q) => q.id).join(", "));
check(
  "5C explanationUrdu dead field untouched (still present on every item)",
  [...BY_SUBJECT.arabic, ...BY_SUBJECT.urdu].every((q) => "explanationUrdu" in q),
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
for (const q of [...BY_SUBJECT.arabic, ...BY_SUBJECT.urdu]) {
  for (const lang of ["ur", "roman"]) {
    if (q[`question_${lang}`] === undefined) continue;
    auditField(q.question, q[`question_${lang}`], `${q.id} question_${lang}`);
    q.options.forEach((opt, i) => auditField(opt, q[`options_${lang}`][i], `${q.id} options_${lang}[${i}]`));
    auditField(q.explanation, q[`explanation_${lang}`], `${q.id} explanation_${lang}`);
  }
}
for (const n of NOTES.Arabic) {
  for (const lang of ["ur", "roman"]) {
    if (n[`title_${lang}`] === undefined) continue;
    auditField(n.title, n[`title_${lang}`], `Arabic note "${n.title}" title_${lang}`);
    auditField(n.body, n[`body_${lang}`], `Arabic note "${n.title}" body_${lang}`);
  }
}
check("5C Arabic script copied verbatim into both languages (MCQs + Arabic notes)", arabicBad.length === 0, arabicBad.slice(0, 3).join(" | "));
check("5C no Latin honorific abbreviations in translations", honorBad.length === 0, honorBad.slice(0, 3).join(", "));
// Urdu notes are already Urdu script: _ur verbatim, _roman pure Latin.
let urduNoteBad = [];
for (const n of NOTES.Urdu) {
  if (n.title_ur !== n.title) urduNoteBad.push(`title_ur not verbatim: "${n.title}"`);
  if (n.body_ur !== n.body) urduNoteBad.push(`body_ur not verbatim: "${n.title}"`);
  if (arabicRuns(n.title_roman ?? "").length > 0) urduNoteBad.push(`title_roman has script: "${n.title}"`);
  if (arabicRuns(n.body_roman ?? "").length > 0) urduNoteBad.push(`body_roman has script: "${n.title}"`);
  if (HONOR_ABBR.test(n.title_roman ?? "") || HONOR_ABBR.test(n.body_roman ?? "")) urduNoteBad.push(`honorific abbr: "${n.title}"`);
}
check("5C Urdu notes: _ur verbatim + _roman pure-Latin transliteration", urduNoteBad.length === 0, urduNoteBad.slice(0, 3).join(" | "));

// --------------------------------- §6 no other bank/subject touched
const bankDir = join(ROOT, "src/data/banks");
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
check("5C no bank other than islamiyat/tajweed/arabic/urdu/english/maths/gk carries _ur/_roman fields", otherBankTouched.length === 0, otherBankTouched.slice(0, 5).join(", "));

// --------------------------------- §7 notes: completeness + scope
const NOTE_TR_KEYS = ["title_ur", "title_roman", "body_ur", "body_roman"];
const NOTE_ORIG_KEYS = new Set(["title", "body", "source", "conceptId", "syllabusClause", "sourceKind", "ur", "roman"]);
for (const [subject, expected] of [["Arabic", 13], ["Urdu", 6]]) {
  let noteBadShape = [];
  let noteBadKeys = [];
  let noteTranslated = [];
  for (const n of NOTES[subject]) {
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
  check(`5C ${subject} notes: no unexpected keys added`, noteBadKeys.length === 0, noteBadKeys.slice(0, 3).join(", "));
  check(`5C ${subject} notes: translation fields all-4-or-none + valid`, noteBadShape.length === 0, noteBadShape.slice(0, 3).join(", "));
  check(`5C ${subject} notes: all ${expected} translated`, noteTranslated.length === expected, `translated=${noteTranslated.length}`);
  console.log(`INFO  5C ${subject} notes translated: ${noteTranslated.length}/${expected}`);
}
// Stage 5D: English + Maths + GK notes are translated too.
const TRANSLATED_NOTE_SUBJECTS = new Set(["Islamiyat", "Tajweed", "Arabic", "Urdu", "English", "Maths", "GK", "General Science", "Pak Studies", "Social Studies", "Pedagogy", "IT/Computer", "Drawing/PE"]);
let otherNoteTouched = [];
for (const [subject, notes] of Object.entries(NOTES)) {
  if (TRANSLATED_NOTE_SUBJECTS.has(subject)) continue;
  for (const n of notes) {
    if (NOTE_TR_KEYS.some((k) => k in n)) otherNoteTouched.push(`${subject}:${n.title}`);
  }
}
check("5C no subject other than Islamiyat/Tajweed/Arabic/Urdu/English/Maths/GK carries note _ur/_roman fields", otherNoteTouched.length === 0, otherNoteTouched.slice(0, 3).join(", "));

// --------------------------------- §8 resolver on real Arabic/Urdu items
const translatedAr = BY_SUBJECT.arabic.find((q) => q.question_ur !== undefined);
if (translatedAr) {
  const rUr = resolveQuestionView(translatedAr, "ur");
  check("5C resolver: translated Arabic item in ur returns translated view", rUr.translated === true && rUr.view.question === translatedAr.question_ur);
  check("5C resolver: translated view options are the _ur array", JSON.stringify(rUr.view.options) === JSON.stringify(translatedAr.options_ur));
  const rRoman = resolveQuestionView(translatedAr, "roman");
  check("5C resolver: translated Arabic item in roman returns roman view", rRoman.translated === true && rRoman.view.question === translatedAr.question_roman);
  check(
    "5C resolver: view preserves id/correctIndex/reviewStatus/source",
    rUr.view.id === translatedAr.id &&
      rUr.view.correctIndex === translatedAr.correctIndex &&
      rUr.view.reviewStatus === translatedAr.reviewStatus &&
      rUr.view.source === translatedAr.source,
  );
}
const translatedUr = BY_SUBJECT.urdu.find((q) => q.question_ur !== undefined);
if (translatedUr) {
  const rUr = resolveQuestionView(translatedUr, "ur");
  check("5C resolver: translated Urdu item in ur returns translated view", rUr.translated === true && rUr.view.question === translatedUr.question_ur);
  const rRoman = resolveQuestionView(translatedUr, "roman");
  check("5C resolver: translated Urdu item in roman returns roman view", rRoman.translated === true && rRoman.view.question === translatedUr.question_roman);
}
const translatedArN = NOTES.Arabic.find((n) => n.title_ur !== undefined);
if (translatedArN) {
  const rn = resolveNoteView(translatedArN, "ur");
  check("5C note resolver: translated Arabic note in ur returns translated text", rn.translated === true && rn.title === translatedArN.title_ur && rn.body === translatedArN.body_ur);
}
const translatedUrN = NOTES.Urdu.find((n) => n.title_ur !== undefined);
if (translatedUrN) {
  const rn = resolveNoteView(translatedUrN, "ur");
  check("5C note resolver: Urdu note in ur returns verbatim source text", rn.translated === true && rn.title === translatedUrN.title && rn.body === translatedUrN.body);
  const rnR = resolveNoteView(translatedUrN, "roman");
  check("5C note resolver: Urdu note in roman returns transliteration", rnR.translated === true && rnR.title === translatedUrN.title_roman && rnR.body === translatedUrN.body_roman);
}
check("5C quran-examples.json untouched: no translation keys", !/_ur|_roman/.test(read("src/data/quran-examples.json")));
const contentJson = readJson("src/data/content.json");
check("5C content.json counts unchanged", contentJson.counts.total === 763 && contentJson.counts.notes === 151 && contentJson.counts.cards === 70);

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll Stage 5C checks passed.");
