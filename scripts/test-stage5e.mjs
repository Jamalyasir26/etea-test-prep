// Stage 5E tests — Science (30 MCQs + 8 notes) + Pak Studies (45 MCQs +
// 7 notes) + Social Studies (30 MCQs + 4 notes) + Pedagogy (30 MCQs +
// 13 notes), Urdu script + Roman Urdu, on the Stage 5A infrastructure.
// Exercises the REAL data.ts (compiled to CommonJS in /tmp with tsc, same
// approach as test-stage5a/b/c/d.mjs). Locks: counts unchanged; flat
// _ur/_roman fields are all-or-none per language per item (whole items
// only); options arrays match English length/order slots; the
// explanationEn inspection result — science explanations are pure Roman
// Urdu originals (explanation_roman verbatim, all 30) and pakstudies
// explanations are MIXED English+Roman fields (explanation_roman verbatim,
// all 45, flagged in VERIFY-stage5e.md); PAK explanation_ur digit invariant
// (sub-multiset of the full mixed field, super-multiset of explanationEn);
// no Latin honorific abbreviations; no bank/subject other than the eleven
// translated ones touched; item-level fallback on real 5E items. No
// schema/rendering/badge changes in this batch.
// Run: node scripts/test-stage5e.mjs  (exit 0 = all pass)
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
const OUT = "/tmp/stage5e-data";
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
check("5E tsc harness: no unexpected type errors", tscErrors.every((l) => l.includes("TS5097")), tscDiag.slice(0, 300));
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const { QUESTIONS, BY_SUBJECT, NOTES, VISIBLE_COUNTS, resolveQuestionView, resolveNoteView } = data;

// --------------------------------- §2 counts unchanged
check("5E bank total 763 MCQs", QUESTIONS.length === 763, `got ${QUESTIONS.length}`);
const notesTotal = Object.values(NOTES).flat().length;
check("5E notes total 151", notesTotal === 151, `got ${notesTotal}`);
check(
  "5E VISIBLE_COUNTS 763/151/70, 12 tracks / 16 mocks",
  VISIBLE_COUNTS.total === 763 &&
    VISIBLE_COUNTS.notes === 151 &&
    VISIBLE_COUNTS.cards === 70 &&
    VISIBLE_COUNTS.tracks === 12 &&
    VISIBLE_COUNTS.mocks === 16,
  JSON.stringify(VISIBLE_COUNTS),
);
check("5E science bank still 30 items", BY_SUBJECT.science.length === 30, `got ${BY_SUBJECT.science.length}`);
check("5E pakstudies bank still 45 items", BY_SUBJECT.pakstudies.length === 45, `got ${BY_SUBJECT.pakstudies.length}`);
check("5E socialstudies bank still 30 items", BY_SUBJECT.socialstudies.length === 30, `got ${BY_SUBJECT.socialstudies.length}`);
check("5E pedagogy bank still 30 items", BY_SUBJECT.pedagogy.length === 30, `got ${BY_SUBJECT.pedagogy.length}`);
check("5E General Science notes still 8", NOTES["General Science"].length === 8, `got ${NOTES["General Science"].length}`);
check("5E Pak Studies notes still 7", NOTES["Pak Studies"].length === 7, `got ${NOTES["Pak Studies"].length}`);
check("5E Social Studies notes still 4", NOTES["Social Studies"].length === 4, `got ${NOTES["Social Studies"].length}`);
check("5E Pedagogy notes still 13", NOTES.Pedagogy.length === 13, `got ${NOTES.Pedagogy.length}`);

// --------------------------------- §3 MCQ field completeness (all-or-none per language)
const MCQ_TR_KEYS = ["question_ur", "question_roman", "options_ur", "options_roman", "explanation_ur", "explanation_roman"];
const MCQ_ORIG_KEYS = new Set([
  "id", "post", "subject", "subjectKey", "topic", "question", "options", "correctIndex",
  "explanation", "explanationEn", "explanationLang", "explanationUrdu", "difficulty",
  "pastPaperRef", "verified", "source", "reviewStatus", "reviewedBy", "reviewedAt",
  "conceptId", "syllabusClause", "sourceKind", "ur", "roman",
  // Pre-existing provenance key on all 30 socialstudies items (also on
  // drawing/pe) — present in the pre-Stage-5 backup, not added by 5E.
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
for (const [bankKey, label, expected] of [["science", "science", 30], ["pakstudies", "pakstudies", 45], ["socialstudies", "socialstudies", 30], ["pedagogy", "pedagogy", 30]]) {
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
  check(`5E ${label} MCQs: no unexpected keys added`, badKeys.length === 0, badKeys.slice(0, 5).join(", "));
  check(
    `5E ${label} MCQs: translation triples all-or-none + valid per language`,
    badShape.length === 0,
    badShape.slice(0, 5).join(", "),
  );
  check(
    `5E ${label} MCQs: ur set == roman set (both languages together)`,
    urSet.length === romanSet.length && urSet.every((id) => romanSet.includes(id)),
    `ur=${urSet.length} roman=${romanSet.length}`,
  );
  check(`5E ${label} MCQs: all ${expected} translated`, urSet.length === expected, `translated=${urSet.length}`);
  console.log(`INFO  5E ${label} MCQs translated: ${urSet.length}/${expected}`);
}

// --------------------------------- §4 explanationEn inspection result
const scopeQs = [...BY_SUBJECT.science, ...BY_SUBJECT.pakstudies, ...BY_SUBJECT.socialstudies, ...BY_SUBJECT.pedagogy];
check(
  "5E no Roman-marked items in the 4 in-scope banks",
  scopeQs.every((q) => q.explanationLang !== "roman"),
  scopeQs.filter((q) => q.explanationLang === "roman").map((q) => q.id).join(", "),
);
check(
  "5E science: all 30 carry explanationEn",
  BY_SUBJECT.science.every((q) => q.explanationEn) && BY_SUBJECT.science.length === 30,
);
check(
  "5E science: stored explanations are pure Roman originals (do not start with explanationEn, no 'Roman Urdu:' label)",
  BY_SUBJECT.science.every((q) => !q.explanation.startsWith(q.explanationEn) && !/Roman Urdu:/.test(q.explanation)),
);
check(
  "5E science: explanation_roman is a verbatim copy of `explanation` (all 30)",
  BY_SUBJECT.science.every((q) => q.explanation_roman === q.explanation),
  BY_SUBJECT.science.filter((q) => q.explanation_roman !== q.explanation).map((q) => q.id).join(", "),
);
check(
  "5E pakstudies: all 45 carry explanationEn",
  BY_SUBJECT.pakstudies.every((q) => q.explanationEn) && BY_SUBJECT.pakstudies.length === 45,
);
check(
  "5E pakstudies: stored explanations are MIXED (all start with the English explanationEn sentence)",
  BY_SUBJECT.pakstudies.every((q) => q.explanation.startsWith(q.explanationEn) && q.explanation.length > q.explanationEn.length),
);
check(
  "5E pakstudies: explanation_roman is a verbatim copy of the whole mixed `explanation` (all 45, flagged in VERIFY-stage5e.md)",
  BY_SUBJECT.pakstudies.every((q) => q.explanation_roman === q.explanation),
  BY_SUBJECT.pakstudies.filter((q) => q.explanation_roman !== q.explanation).map((q) => q.id).join(", "),
);
check(
  "5E socialstudies + pedagogy: no explanationEn items (plain English explanations translated to both)",
  [...BY_SUBJECT.socialstudies, ...BY_SUBJECT.pedagogy].every((q) => !q.explanationEn),
);
let labelLeak = [];
for (const q of scopeQs) {
  for (const k of MCQ_TR_KEYS) {
    const v = Array.isArray(q[k]) ? q[k].join(" ") : q[k];
    if (typeof v === "string" && /Roman Urdu:/.test(v)) labelLeak.push(`${q.id}:${k}`);
  }
}
for (const subject of ["General Science", "Pak Studies", "Social Studies", "Pedagogy"]) {
  for (const n of NOTES[subject]) {
    for (const k of ["title_ur", "title_roman", "body_ur", "body_roman"]) {
      if (typeof n[k] === "string" && /Roman Urdu:/.test(n[k])) labelLeak.push(`${subject}:${n.title}:${k}`);
    }
  }
}
check("5E no 'Roman Urdu:' label leaked into any 5E translation field", labelLeak.length === 0, labelLeak.slice(0, 3).join(", "));
check(
  "5E explanationUrdu dead field untouched (still present on every in-scope item)",
  scopeQs.every((q) => "explanationUrdu" in q),
);

// --------------------------------- §5 digits preserved (PAK _ur uses the sub/super invariant)
function digitRuns(s) { return (s.match(/[0-9]+/g) || []).sort(); }
function sameMultiset(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function isSubMultiset(a, b) {
  const rest = [...b];
  return a.every((d) => {
    const i = rest.indexOf(d);
    if (i < 0) return false;
    rest.splice(i, 1);
    return true;
  });
}
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
// Science: _roman is verbatim (digits trivially equal); _ur must keep the
// Roman original's digits.
for (const q of BY_SUBJECT.science) {
  if (!sameMultiset(digitRuns(q.explanation), digitRuns(q.explanation_ur))) digitBad.push(`${q.id}:explanation_ur`);
}
// Pak Studies: _roman is verbatim; _ur digits must lie between the
// explanationEn digits and the full mixed field's digits (PAK-024/029
// combine facts from both source sentences).
for (const q of BY_SUBJECT.pakstudies) {
  const ur = digitRuns(q.explanation_ur);
  if (!isSubMultiset(ur, digitRuns(q.explanation)) || !isSubMultiset(digitRuns(q.explanationEn), ur))
    digitBad.push(`${q.id}:explanation_ur`);
}
// Social Studies + Pedagogy: plain English explanations, digits equal in both.
for (const q of [...BY_SUBJECT.socialstudies, ...BY_SUBJECT.pedagogy]) {
  for (const dst of ["explanation_ur", "explanation_roman"]) {
    if (!sameMultiset(digitRuns(q.explanation), digitRuns(q[dst]))) digitBad.push(`${q.id}:${dst}`);
  }
}
check("5E digit runs preserved in every translated MCQ field (PAK _ur: sub/super invariant)", digitBad.length === 0, digitBad.slice(0, 5).join(", "));

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
for (const subject of ["General Science", "Pak Studies", "Social Studies", "Pedagogy"]) {
  for (const n of NOTES[subject]) {
    for (const lang of ["ur", "roman"]) {
      auditField(n.title, n[`title_${lang}`], `${subject} note "${n.title}" title_${lang}`);
      auditField(n.body, n[`body_${lang}`], `${subject} note "${n.title}" body_${lang}`);
    }
  }
}
check("5E Arabic script copied verbatim into both languages (none expected in scope)", arabicBad.length === 0, arabicBad.slice(0, 3).join(" | "));
check("5E no Latin honorific abbreviations in any 5E translation", honorBad.length === 0, honorBad.slice(0, 3).join(", "));

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
check("5E no bank other than the 16 translated banks carries _ur/_roman fields", otherBankTouched.length === 0, otherBankTouched.slice(0, 5).join(", "));
check("5E drawing_pe.json (dead, unregistered) untouched: no translation fields", (() => {
  const items = JSON.parse(fs.readFileSync(join(bankDir, "drawing_pe.json"), "utf8"));
  return items.every((q) => !MCQ_TR_KEYS.some((k) => k in q));
})());

// --------------------------------- §8 notes: completeness + scope + digits + gloss handling
const NOTE_TR_KEYS = ["title_ur", "title_roman", "body_ur", "body_roman"];
const NOTE_ORIG_KEYS = new Set(["title", "body", "source", "conceptId", "syllabusClause", "sourceKind", "ur", "roman"]);
for (const [subject, expected] of [["General Science", 8], ["Pak Studies", 7], ["Social Studies", 4], ["Pedagogy", 13]]) {
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
  check(`5E ${subject} notes: no unexpected keys added`, noteBadKeys.length === 0, noteBadKeys.slice(0, 3).join(", "));
  check(`5E ${subject} notes: translation fields all-4-or-none + valid`, noteBadShape.length === 0, noteBadShape.slice(0, 3).join(", "));
  check(`5E ${subject} notes: all ${expected} translated`, noteTranslated.length === expected, `translated=${noteTranslated.length}`);
  console.log(`INFO  5E ${subject} notes translated: ${noteTranslated.length}/${expected}`);
}
const TRANSLATED_NOTE_SUBJECTS = new Set(["Islamiyat", "Tajweed", "Arabic", "Urdu", "English", "Maths", "GK", "General Science", "Pak Studies", "Social Studies", "Pedagogy", "IT/Computer", "Drawing/PE"]);
let otherNoteTouched = [];
for (const [subject, notes] of Object.entries(NOTES)) {
  if (TRANSLATED_NOTE_SUBJECTS.has(subject)) continue;
  for (const n of notes) {
    if (NOTE_TR_KEYS.some((k) => k in n)) otherNoteTouched.push(`${subject}:${n.title}`);
  }
}
check("5E no subject other than the 13 translated subjects carries note _ur/_roman fields", otherNoteTouched.length === 0, otherNoteTouched.slice(0, 3).join(", "));
let noteDigitBad = [];
for (const subject of ["General Science", "Pak Studies", "Social Studies", "Pedagogy"]) {
  for (const n of NOTES[subject]) {
    for (const [src, dst] of [["title", "title_ur"], ["title", "title_roman"], ["body", "body_ur"], ["body", "body_roman"]]) {
      if (!sameMultiset(digitRuns(n[src]), digitRuns(n[dst]))) noteDigitBad.push(`${subject}:${n.title}:${dst}`);
    }
  }
}
check("5E digit runs unchanged in every translated note field", noteDigitBad.length === 0, noteDigitBad.slice(0, 3).join(", "));
// Gloss rule on the 2 notes carrying a "Roman Urdu:" gloss sentence: label
// dropped, gloss kept verbatim in _roman, translated in _ur.
const vitNote = NOTES["General Science"].find((n) => n.title === "Vitamins and Deficiency Diseases");
check(
  "5E Vitamins note: gloss content verbatim in body_roman, translated in body_ur, label dropped",
  vitNote.body_roman.includes("vitamin ki kami se kaunsi bimari hoti hai — yehi sawal aata hai") &&
    vitNote.body_ur.includes("وٹامن کی کمی سے کون سی بیماری ہوتی ہے — یہی سوال آتا ہے"),
);
const bruNote = NOTES.Pedagogy.find((n) => n.title.startsWith("Bruner"));
check(
  "5E Bruner note: gloss content verbatim in body_roman, translated in body_ur, label dropped",
  bruNote.body_roman.includes("aik hi mauzu baar baar, har dafa gehra — yehi spiral curriculum hai") &&
    bruNote.body_ur.includes("ایک ہی موضوع بار بار، ہر دفعہ گہرا — یہی حلزونی نصاب ہے"),
);
// K2 stays "K2" (Latin) in both Geography note _ur bodies — the mountain
// name is not transliterated (digit rule + consistency with PAK-037).
check(
  "5E Geography notes: K2 kept as 'K2' in body_ur (both notes)",
  NOTES["Pak Studies"].find((n) => n.title === "Geography of Pakistan").body_ur.includes("K2") &&
    NOTES["Social Studies"].find((n) => n.title.startsWith("Geography of Pakistan")).body_ur.includes("K2"),
);

// --------------------------------- §9 resolver on real 5E items + notes
for (const [bankKey, label] of [["science", "Science"], ["pakstudies", "Pak Studies"], ["socialstudies", "Social Studies"], ["pedagogy", "Pedagogy"]]) {
  const tq = BY_SUBJECT[bankKey].find((q) => q.question_ur !== undefined);
  if (tq) {
    const rUr = resolveQuestionView(tq, "ur");
    check(`5E resolver: translated ${label} item in ur returns translated view`, rUr.translated === true && rUr.view.question === tq.question_ur);
    const rRoman = resolveQuestionView(tq, "roman");
    check(`5E resolver: translated ${label} item in roman returns roman view`, rRoman.translated === true && rRoman.view.question === tq.question_roman);
    check(
      `5E resolver: ${label} view preserves id/correctIndex/reviewStatus/source`,
      rUr.view.id === tq.id &&
        rUr.view.correctIndex === tq.correctIndex &&
        rUr.view.reviewStatus === tq.reviewStatus &&
        rUr.view.source === tq.source,
    );
  }
}
for (const subject of ["General Science", "Pak Studies", "Social Studies", "Pedagogy"]) {
  const tn = NOTES[subject].find((n) => n.title_ur !== undefined);
  if (tn) {
    const rn = resolveNoteView(tn, "ur");
    check(`5E note resolver: translated ${subject} note in ur returns translated text`, rn.translated === true && rn.title === tn.title_ur && rn.body === tn.body_ur);
    const rnR = resolveNoteView(tn, "roman");
    check(`5E note resolver: translated ${subject} note in roman returns roman text`, rnR.translated === true && rnR.title === tn.title_roman && rnR.body === tn.body_roman);
  }
}
check("5E quran-examples.json untouched: no translation keys", !/_ur|_roman/.test(read("src/data/quran-examples.json")));
const contentJson = readJson("src/data/content.json");
check("5E content.json counts unchanged", contentJson.counts.total === 763 && contentJson.counts.notes === 151 && contentJson.counts.cards === 70);

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll Stage 5E checks passed.");
