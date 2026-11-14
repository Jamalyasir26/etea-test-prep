// Stage 5D tests — English (45 MCQs + 8 notes) + Maths (45 MCQs + 7 notes)
// + GK (30 MCQs + 6 notes), Urdu script + Roman Urdu, on the Stage 5A
// infrastructure. Exercises the REAL data.ts (compiled to CommonJS in /tmp
// with tsc, same approach as test-stage5a/b/c.mjs). Locks: counts
// unchanged; flat _ur/_roman fields are all-or-none per language per item
// (whole items only); options arrays match English length/order slots;
// English-bank options are verbatim English in both languages and quoted
// English spans stay verbatim; Maths digits/formulas/operators unchanged
// (word-internal hyphens excluded); the 5 explanationEn gloss items keep
// their gloss content with the "Roman Urdu:" label dropped; no Latin
// honorific abbreviations (GKN-028 uses رضی اللہ عنہ / "Raziallahu Anhu");
// no bank/subject other than the seven translated ones touched;
// item-level fallback on real English/Maths/GK items. No
// schema/rendering/badge changes in this batch.
// Run: node scripts/test-stage5d.mjs  (exit 0 = all pass)
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
const OUT = "/tmp/stage5d-data";
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
check("5D tsc harness: no unexpected type errors", tscErrors.every((l) => l.includes("TS5097")), tscDiag.slice(0, 300));
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const { QUESTIONS, BY_SUBJECT, NOTES, VISIBLE_COUNTS, resolveQuestionView, resolveNoteView } = data;

// --------------------------------- §2 counts unchanged
check("5D bank total 763 MCQs", QUESTIONS.length === 763, `got ${QUESTIONS.length}`);
const notesTotal = Object.values(NOTES).flat().length;
check("5D notes total 151", notesTotal === 151, `got ${notesTotal}`);
check(
  "5D VISIBLE_COUNTS 763/151/70, 12 tracks / 16 mocks",
  VISIBLE_COUNTS.total === 763 &&
    VISIBLE_COUNTS.notes === 151 &&
    VISIBLE_COUNTS.cards === 70 &&
    VISIBLE_COUNTS.tracks === 12 &&
    VISIBLE_COUNTS.mocks === 16,
  JSON.stringify(VISIBLE_COUNTS),
);
check("5D english bank still 45 items", BY_SUBJECT.english.length === 45, `got ${BY_SUBJECT.english.length}`);
check("5D maths bank still 45 items", BY_SUBJECT.maths.length === 45, `got ${BY_SUBJECT.maths.length}`);
check("5D gk bank still 30 items", BY_SUBJECT.gk.length === 30, `got ${BY_SUBJECT.gk.length}`);
check("5D English notes still 8", NOTES.English.length === 8, `got ${NOTES.English.length}`);
check("5D Maths notes still 7", NOTES.Maths.length === 7, `got ${NOTES.Maths.length}`);
check("5D GK notes still 6", NOTES.GK.length === 6, `got ${NOTES.GK.length}`);

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
for (const [bankKey, label, expected] of [["english", "english", 45], ["maths", "maths", 45], ["gk", "gk", 30]]) {
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
  check(`5D ${label} MCQs: no unexpected keys added`, badKeys.length === 0, badKeys.slice(0, 5).join(", "));
  check(
    `5D ${label} MCQs: translation triples all-or-none + valid per language`,
    badShape.length === 0,
    badShape.slice(0, 5).join(", "),
  );
  check(
    `5D ${label} MCQs: ur set == roman set (both languages together)`,
    urSet.length === romanSet.length && urSet.every((id) => romanSet.includes(id)),
    `ur=${urSet.length} roman=${romanSet.length}`,
  );
  check(`5D ${label} MCQs: all ${expected} translated`, urSet.length === expected, `translated=${urSet.length}`);
  console.log(`INFO  5D ${label} MCQs translated: ${urSet.length}/${expected}`);
}

// --------------------------------- §4 explanationEn inspection + gloss rule (5 English items)
const scopeQs = [...BY_SUBJECT.english, ...BY_SUBJECT.maths, ...BY_SUBJECT.gk];
check(
  "5D no Roman-marked items in english/maths/gk banks",
  scopeQs.every((q) => q.explanationLang !== "roman"),
  scopeQs.filter((q) => q.explanationLang === "roman").map((q) => q.id).join(", "),
);
const withEn = BY_SUBJECT.english.filter((q) => q.explanationEn);
check(
  "5D exactly 5 english items carry explanationEn (ENG-001/003/007/028/042)",
  withEn.length === 5 &&
    ["ENG-001", "ENG-003", "ENG-007", "ENG-028", "ENG-042"].every((id) => withEn.some((q) => q.id === id)),
  withEn.map((q) => q.id).join(", "),
);
check(
  "5D the 5 explanationEn originals are English + 'Roman Urdu:' gloss (not purely Roman)",
  withEn.every((q) => q.explanationEn && q.explanation.startsWith(q.explanationEn) && /Roman Urdu:/.test(q.explanation)),
);
const GLOSS_CONTENT = {
  "ENG-001": ["kisi cheez mein acha hone", "کسی چیز میں اچھا ہونے"],
  "ENG-003": ["bahadur", "بہادر"],
  "ENG-007": ["kisi par inhisar karne", "کسی پر انحصار کرنے"],
  "ENG-028": ["sakhi", "سخی"],
  "ENG-042": ["tameezdaar", "تمیزدار"],
};
let glossBad = [];
for (const [id, [romanBit, urBit]] of Object.entries(GLOSS_CONTENT)) {
  const q = BY_SUBJECT.english.find((x) => x.id === id);
  // Roman comparison is case-insensitive: a gloss kept verbatim may be
  // sentence-capitalised in translation (ENG-028 "Sakhi." vs source "sakhi.").
  if (!q.explanation_roman.toLowerCase().includes(romanBit.toLowerCase())) glossBad.push(`${id} _roman missing gloss content`);
  if (!q.explanation_ur.includes(urBit)) glossBad.push(`${id} _ur missing gloss content`);
}
check("5D gloss content kept in both languages for the 5 explanationEn items", glossBad.length === 0, glossBad.join(" | "));
let labelLeak = [];
for (const q of scopeQs) {
  for (const k of MCQ_TR_KEYS) {
    const v = Array.isArray(q[k]) ? q[k].join(" ") : q[k];
    if (typeof v === "string" && /Roman Urdu:/.test(v)) labelLeak.push(`${q.id}:${k}`);
  }
}
for (const subject of ["English", "Maths", "GK"]) {
  for (const n of NOTES[subject]) {
    for (const k of ["title_ur", "title_roman", "body_ur", "body_roman"]) {
      if (typeof n[k] === "string" && /Roman Urdu:/.test(n[k])) labelLeak.push(`${subject}:${n.title}:${k}`);
    }
  }
}
check("5D no 'Roman Urdu:' label leaked into any 5D translation field", labelLeak.length === 0, labelLeak.slice(0, 3).join(", "));
check(
  "5D explanationUrdu dead field untouched (still present on every in-scope item)",
  scopeQs.every((q) => "explanationUrdu" in q),
);

// --------------------------------- §5 digits + formulas preserved (all 3 banks; operators: Maths)
function digitRuns(s) { return (s.match(/[0-9]+/g) || []).sort(); }
function sameMultiset(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function opCounts(s) {
  const m = {};
  const t = s.replace(/(?<=[A-Za-z\u0600-\u06FF])-(?=[A-Za-z\u0600-\u06FF])/g, "");
  for (const ch of t) if ("=+-*/×÷%√\u2212".includes(ch)) m[ch] = (m[ch] || 0) + 1;
  return m;
}
let digitBad = [];
let opBad = [];
for (const q of scopeQs) {
  for (const [src, dst] of [["question", "question_ur"], ["question", "question_roman"], ["explanation", "explanation_ur"], ["explanation", "explanation_roman"]]) {
    if (!sameMultiset(digitRuns(q[src]), digitRuns(q[dst]))) digitBad.push(`${q.id}:${dst}`);
  }
  q.options.forEach((opt, i) => {
    for (const k of ["options_ur", "options_roman"]) {
      if (!sameMultiset(digitRuns(opt), digitRuns(q[k][i]))) digitBad.push(`${q.id}:${k}[${i}]`);
    }
  });
}
for (const q of BY_SUBJECT.maths) {
  for (const [src, dst] of [["question", "question_ur"], ["question", "question_roman"], ["explanation", "explanation_ur"], ["explanation", "explanation_roman"]]) {
    if (JSON.stringify(opCounts(q[src])) !== JSON.stringify(opCounts(q[dst]))) opBad.push(`${q.id}:${dst}`);
  }
  q.options.forEach((opt, i) => {
    for (const k of ["options_ur", "options_roman"]) {
      if (JSON.stringify(opCounts(opt)) !== JSON.stringify(opCounts(q[k][i]))) opBad.push(`${q.id}:${k}[${i}]`);
    }
  });
}
check("5D digit runs unchanged in every translated MCQ field (all 3 banks)", digitBad.length === 0, digitBad.slice(0, 5).join(", "));
check("5D Maths operator counts unchanged in every translated field (word hyphens excluded)", opBad.length === 0, opBad.slice(0, 5).join(", "));
// Pure numeric/expression Maths options stay verbatim in both languages.
const PURE_EXPR = /^[\d\s\/\.\+\-=\%\(\)xX\:\^\u2212]+$/;
let pureBad = [];
let pureCount = 0;
for (const q of BY_SUBJECT.maths) {
  q.options.forEach((opt, i) => {
    if (!PURE_EXPR.test(opt)) return;
    pureCount++;
    if (q.options_ur[i] !== opt || q.options_roman[i] !== opt) pureBad.push(`${q.id}[${i}]`);
  });
}
check(`5D Maths pure-number/expression options verbatim in both languages (${pureCount} options)`, pureBad.length === 0, pureBad.slice(0, 5).join(", "));

// --------------------------------- §6 English bank: options + quoted spans verbatim
let engOptBad = [];
for (const q of BY_SUBJECT.english) {
  if (JSON.stringify(q.options_ur) !== JSON.stringify(q.options)) engOptBad.push(`${q.id}:options_ur`);
  if (JSON.stringify(q.options_roman) !== JSON.stringify(q.options)) engOptBad.push(`${q.id}:options_roman`);
}
check("5D English-bank options are verbatim English in both languages (all 45)", engOptBad.length === 0, engOptBad.slice(0, 5).join(", "));
function quotedSpans(s) {
  const spans = [];
  for (const m of s.matchAll(/"([^"]+)"/g)) spans.push(`"${m[1]}"`);
  for (const m of s.matchAll(/(?:^|[\s\(])'([^']+)'/g)) spans.push(`'${m[1]}'`);
  return spans;
}
let quoteBad = [];
for (const q of BY_SUBJECT.english) {
  for (const src of [q.question, q.explanation]) {
    for (const span of quotedSpans(src)) {
      const dsts = src === q.question ? [q.question_ur, q.question_roman] : [q.explanation_ur, q.explanation_roman];
      dsts.forEach((d, i) => {
        // Case-insensitive: a quoted word may be sentence-capitalised in
        // the source but mid-sentence (lowercase) in translation
        // (ENG-013 'Will' → 'will'); the word itself must be present.
        if (!d.toLowerCase().includes(span.toLowerCase())) quoteBad.push(`${q.id}:${i === 0 ? "ur" : "roman"} missing ${span}`);
      });
    }
  }
}
check("5D English-bank quoted spans stay verbatim in both languages", quoteBad.length === 0, quoteBad.slice(0, 3).join(" | "));

// --------------------------------- §7 honorifics + Arabic verbatim (general audit)
const AR_RUN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;
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
for (const subject of ["English", "Maths", "GK"]) {
  for (const n of NOTES[subject]) {
    for (const lang of ["ur", "roman"]) {
      auditField(n.title, n[`title_${lang}`], `${subject} note "${n.title}" title_${lang}`);
      auditField(n.body, n[`body_${lang}`], `${subject} note "${n.title}" body_${lang}`);
    }
  }
}
check("5D Arabic script copied verbatim into both languages (none expected in scope)", arabicBad.length === 0, arabicBad.slice(0, 3).join(" | "));
check("5D no Latin honorific abbreviations in any 5D translation", honorBad.length === 0, honorBad.slice(0, 3).join(", "));
const g28 = BY_SUBJECT.gk.find((q) => q.id === "GKN-028");
check(
  "5D GKN-028: _ur options/explanation use رضی اللہ عنہ",
  g28.options_ur.every((o) => o.includes("رضی اللہ عنہ")) && g28.explanation_ur.includes("رضی اللہ عنہ"),
);
check(
  "5D GKN-028: _roman options/explanation spell out 'Raziallahu Anhu'",
  g28.options_roman.every((o) => o.includes("Raziallahu Anhu")) && g28.explanation_roman.includes("Raziallahu Anhu"),
);

// --------------------------------- §8 no other bank/subject touched
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
check("5D no bank other than the 16 translated banks carries _ur/_roman fields", otherBankTouched.length === 0, otherBankTouched.slice(0, 5).join(", "));
check("5D drawing_pe.json (dead, unregistered) untouched: no translation fields", (() => {
  const items = JSON.parse(fs.readFileSync(join(bankDir, "drawing_pe.json"), "utf8"));
  return items.every((q) => !MCQ_TR_KEYS.some((k) => k in q));
})());

// --------------------------------- §9 notes: completeness + scope + Maths formula preservation
const NOTE_TR_KEYS = ["title_ur", "title_roman", "body_ur", "body_roman"];
const NOTE_ORIG_KEYS = new Set(["title", "body", "source", "conceptId", "syllabusClause", "sourceKind", "ur", "roman"]);
for (const [subject, expected] of [["English", 8], ["Maths", 7], ["GK", 6]]) {
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
  check(`5D ${subject} notes: no unexpected keys added`, noteBadKeys.length === 0, noteBadKeys.slice(0, 3).join(", "));
  check(`5D ${subject} notes: translation fields all-4-or-none + valid`, noteBadShape.length === 0, noteBadShape.slice(0, 3).join(", "));
  check(`5D ${subject} notes: all ${expected} translated`, noteTranslated.length === expected, `translated=${noteTranslated.length}`);
  console.log(`INFO  5D ${subject} notes translated: ${noteTranslated.length}/${expected}`);
}
const TRANSLATED_NOTE_SUBJECTS = new Set(["Islamiyat", "Tajweed", "Arabic", "Urdu", "English", "Maths", "GK", "General Science", "Pak Studies", "Social Studies", "Pedagogy", "IT/Computer", "Drawing/PE"]);
let otherNoteTouched = [];
for (const [subject, notes] of Object.entries(NOTES)) {
  if (TRANSLATED_NOTE_SUBJECTS.has(subject)) continue;
  for (const n of notes) {
    if (NOTE_TR_KEYS.some((k) => k in n)) otherNoteTouched.push(`${subject}:${n.title}`);
  }
}
check("5D no subject other than the 13 translated subjects carries note _ur/_roman fields", otherNoteTouched.length === 0, otherNoteTouched.slice(0, 3).join(", "));
let noteDigitBad = [];
let noteOpBad = [];
for (const subject of ["English", "Maths", "GK"]) {
  for (const n of NOTES[subject]) {
    for (const [src, dst] of [["title", "title_ur"], ["title", "title_roman"], ["body", "body_ur"], ["body", "body_roman"]]) {
      if (!sameMultiset(digitRuns(n[src]), digitRuns(n[dst]))) noteDigitBad.push(`${subject}:${n.title}:${dst}`);
    }
    if (subject === "Maths") {
      for (const dst of ["body_ur", "body_roman"]) {
        if (JSON.stringify(opCounts(n.body)) !== JSON.stringify(opCounts(n[dst]))) noteOpBad.push(`${subject}:${n.title}:${dst}`);
      }
    }
  }
}
check("5D digit runs unchanged in every translated note field", noteDigitBad.length === 0, noteDigitBad.slice(0, 3).join(", "));
check("5D Maths note operator counts unchanged in body translations", noteOpBad.length === 0, noteOpBad.slice(0, 3).join(", "));

// --------------------------------- §10 resolver on real 5D items + notes
for (const [bankKey, label] of [["english", "English"], ["maths", "Maths"], ["gk", "GK"]]) {
  const tq = BY_SUBJECT[bankKey].find((q) => q.question_ur !== undefined);
  if (tq) {
    const rUr = resolveQuestionView(tq, "ur");
    check(`5D resolver: translated ${label} item in ur returns translated view`, rUr.translated === true && rUr.view.question === tq.question_ur);
    const rRoman = resolveQuestionView(tq, "roman");
    check(`5D resolver: translated ${label} item in roman returns roman view`, rRoman.translated === true && rRoman.view.question === tq.question_roman);
    check(
      `5D resolver: ${label} view preserves id/correctIndex/reviewStatus/source`,
      rUr.view.id === tq.id &&
        rUr.view.correctIndex === tq.correctIndex &&
        rUr.view.reviewStatus === tq.reviewStatus &&
        rUr.view.source === tq.source,
    );
  }
}
for (const subject of ["English", "Maths", "GK"]) {
  const tn = NOTES[subject].find((n) => n.title_ur !== undefined);
  if (tn) {
    const rn = resolveNoteView(tn, "ur");
    check(`5D note resolver: translated ${subject} note in ur returns translated text`, rn.translated === true && rn.title === tn.title_ur && rn.body === tn.body_ur);
    const rnR = resolveNoteView(tn, "roman");
    check(`5D note resolver: translated ${subject} note in roman returns roman text`, rnR.translated === true && rnR.title === tn.title_roman && rnR.body === tn.body_roman);
  }
}
check("5D quran-examples.json untouched: no translation keys", !/_ur|_roman/.test(read("src/data/quran-examples.json")));
const contentJson = readJson("src/data/content.json");
check("5D content.json counts unchanged", contentJson.counts.total === 763 && contentJson.counts.notes === 151 && contentJson.counts.cards === 70);

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll Stage 5D checks passed.");
