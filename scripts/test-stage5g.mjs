// Stage 5G tests — Drawing (50 MCQs) + Past Papers (20 MCQs) +
// Past Papers Reworded (20 MCQs) + Drawing/PE notes (24), Urdu script +
// Roman Urdu, on the Stage 5A infrastructure. FINAL Stage 5 batch.
// Exercises the REAL data.ts (compiled to CommonJS in /tmp with tsc, same
// approach as test-stage5a/b/c/d/e/f.mjs). Locks: counts unchanged; flat
// _ur/_roman fields are all-or-none per language per item (whole items
// only); options arrays match English length/order slots; the
// explanationEn inspection result — the 8 drawing gloss items carry
// "Roman Urdu: <gloss>" (explanation_roman = verbatim gloss) and PPT-001
// is the ONLY mixed explanation in scope (explanation_roman = verbatim
// copy of the whole mixed field, flagged in VERIFY-stage5g.md); digits
// preserved per pattern; Arabic script copied verbatim (with the 5C
// Urdu-dominant exception for the 6 fully Urdu-script past-paper
// questions); the 5B honorific convention incl. the feminine form for
// Hazrat Khadija; the past-paper disclosure labels stay byte-identical so
// topicBadge keeps classifying original vs reworded; and the FINAL
// completeness check — every registered bank (16) and every note subject
// (13) fully translated, drawing_pe.json (dead, unregistered) untouched.
// The pre-existing `sourceNote` key on 10 drawing items is allowed
// (present in the pre-Stage-5 backup, not added by 5G). No
// schema/rendering/badge changes.
// Run: node scripts/test-stage5g.mjs  (exit 0 = all pass)
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
const OUT = "/tmp/stage5g-data";
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
check("5G tsc harness: no unexpected type errors", tscErrors.every((l) => l.includes("TS5097")), tscDiag.slice(0, 300));
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const { QUESTIONS, BY_SUBJECT, NOTES, VISIBLE_COUNTS, resolveQuestionView, resolveNoteView, topicBadge } = data;

// --------------------------------- §2 counts unchanged
check("5G bank total 763 MCQs", QUESTIONS.length === 763, `got ${QUESTIONS.length}`);
const notesTotal = Object.values(NOTES).flat().length;
check("5G notes total 151", notesTotal === 151, `got ${notesTotal}`);
check(
  "5G VISIBLE_COUNTS 763/151/70, 12 tracks / 16 mocks",
  VISIBLE_COUNTS.total === 763 &&
    VISIBLE_COUNTS.notes === 151 &&
    VISIBLE_COUNTS.cards === 70 &&
    VISIBLE_COUNTS.tracks === 12 &&
    VISIBLE_COUNTS.mocks === 16,
  JSON.stringify(VISIBLE_COUNTS),
);
check("5G drawing bank still 50 items", BY_SUBJECT.drawing.length === 50, `got ${BY_SUBJECT.drawing.length}`);
check("5G pastpapers bank still 20 items", BY_SUBJECT.pastpapers.length === 20, `got ${BY_SUBJECT.pastpapers.length}`);
check("5G pastpapers_reworded bank still 20 items", BY_SUBJECT.pastpapers_reworded.length === 20, `got ${BY_SUBJECT.pastpapers_reworded.length}`);
check("5G Drawing/PE notes still 24", NOTES["Drawing/PE"].length === 24, `got ${NOTES["Drawing/PE"].length}`);

// --------------------------------- §3 MCQ field completeness (all-or-none per language)
const MCQ_TR_KEYS = ["question_ur", "question_roman", "options_ur", "options_roman", "explanation_ur", "explanation_roman"];
const MCQ_ORIG_KEYS = new Set([
  "id", "post", "subject", "subjectKey", "topic", "question", "options", "correctIndex",
  "explanation", "explanationEn", "explanationLang", "explanationUrdu", "difficulty",
  "pastPaperRef", "verified", "source", "reviewStatus", "reviewedBy", "reviewedAt",
  "conceptId", "syllabusClause", "sourceKind", "ur", "roman",
  // Pre-existing provenance key on 10 drawing items (DRW-021–DRW-030) —
  // present in the pre-Stage-5 backup, not added by 5G (same allowance
  // as 5E/5F).
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
for (const [bankKey, label, expected] of [["drawing", "drawing", 50], ["pastpapers", "pastpapers", 20], ["pastpapers_reworded", "pastpapers_reworded", 20]]) {
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
  check(`5G ${label} MCQs: no unexpected keys added`, badKeys.length === 0, badKeys.slice(0, 5).join(", "));
  check(
    `5G ${label} MCQs: translation triples all-or-none + valid per language`,
    badShape.length === 0,
    badShape.slice(0, 5).join(", "),
  );
  check(
    `5G ${label} MCQs: ur set == roman set (both languages together)`,
    urSet.length === romanSet.length && urSet.every((id) => romanSet.includes(id)),
    `ur=${urSet.length} roman=${romanSet.length}`,
  );
  check(`5G ${label} MCQs: all ${expected} translated`, urSet.length === expected, `translated=${urSet.length}`);
  console.log(`INFO  5G ${label} MCQs translated: ${urSet.length}/${expected}`);
}
check(
  "5G sourceNote preserved byte-identical on DRW-021–DRW-030",
  BY_SUBJECT.drawing.filter((q) => q.sourceNote).length === 10 &&
    BY_SUBJECT.drawing.filter((q) => q.sourceNote).every((q) => q.sourceNote === "AI-drafted; unreviewed"),
);

// --------------------------------- §4 explanationEn inspection result
const scopeQs = [...BY_SUBJECT.drawing, ...BY_SUBJECT.pastpapers, ...BY_SUBJECT.pastpapers_reworded];
const GLOSS_IDS = new Set(["DRW-001", "DRW-002", "DRW-003", "DRW-004", "DRW-005", "DRW-021", "DRW-024", "DRW-025"]);
check(
  "5G no Roman-marked items in the 3 in-scope banks",
  scopeQs.every((q) => q.explanationLang !== "roman"),
  scopeQs.filter((q) => q.explanationLang === "roman").map((q) => q.id).join(", "),
);
check(
  "5G drawing: exactly the 8 gloss items carry explanationEn",
  BY_SUBJECT.drawing.filter((q) => q.explanationEn).length === 8 &&
    BY_SUBJECT.drawing.filter((q) => q.explanationEn).every((q) => GLOSS_IDS.has(q.id)),
);
check(
  "5G drawing: gloss items are English sentence + 'Roman Urdu: <gloss>' (all start with explanationEn)",
  BY_SUBJECT.drawing.filter((q) => q.explanationEn).every((q) => q.explanation.startsWith(q.explanationEn) && /Roman Urdu:/.test(q.explanation)),
);
check(
  "5G drawing: explanation_roman is the verbatim gloss content (label + English sentence dropped, all 8)",
  BY_SUBJECT.drawing.filter((q) => q.explanationEn).every((q) => q.explanation_roman === q.explanation.split("Roman Urdu: ")[1]),
  BY_SUBJECT.drawing.filter((q) => q.explanationEn && q.explanation_roman !== q.explanation.split("Roman Urdu: ")[1]).map((q) => q.id).join(", "),
);
check(
  "5G pastpapers: exactly PPT-001 carries explanationEn",
  BY_SUBJECT.pastpapers.filter((q) => q.explanationEn).length === 1 &&
    BY_SUBJECT.pastpapers.filter((q) => q.explanationEn)[0].id === "PPT-001",
);
check(
  "5G pastpapers_reworded: no explanationEn items (plain English explanations translated to both)",
  BY_SUBJECT.pastpapers_reworded.every((q) => !q.explanationEn),
);
const ppt001 = BY_SUBJECT.pastpapers.find((q) => q.id === "PPT-001");
check(
  "5G PPT-001: stored explanation is MIXED (starts with explanationEn, longer, no 'Roman Urdu:' label)",
  ppt001.explanation.startsWith(ppt001.explanationEn) &&
    ppt001.explanation.length > ppt001.explanationEn.length &&
    !/Roman Urdu:/.test(ppt001.explanation),
);
check(
  "5G PPT-001: explanation_roman is a verbatim copy of the WHOLE mixed field (flagged in VERIFY-stage5g.md)",
  ppt001.explanation_roman === ppt001.explanation,
);
check(
  "5G PPT-001: explanation_ur is one clean rendering (uses ﷺ, no Latin abbreviation, no English sentence)",
  ppt001.explanation_ur.includes("ﷺ") &&
    !/\(S\.?A\.?W\.?\)/i.test(ppt001.explanation_ur) &&
    !ppt001.explanation_ur.includes("The name Muhammad is mentioned"),
);
check(
  "5G items without explanationEn (42 drawing + 19 pastpapers + 20 reworded) have plain English explanations translated to both",
  scopeQs.filter((q) => !q.explanationEn).length === 81 &&
    scopeQs.filter((q) => !q.explanationEn).every((q) => q.explanation_ur && q.explanation_roman),
);
let labelLeak = [];
for (const q of scopeQs) {
  for (const k of MCQ_TR_KEYS) {
    const v = Array.isArray(q[k]) ? q[k].join(" ") : q[k];
    if (typeof v === "string" && /Roman Urdu:/.test(v)) labelLeak.push(`${q.id}:${k}`);
  }
}
for (const n of NOTES["Drawing/PE"]) {
  for (const k of ["title_ur", "title_roman", "body_ur", "body_roman"]) {
    if (typeof n[k] === "string" && /Roman Urdu:/.test(n[k])) labelLeak.push(`Drawing/PE:${n.title}:${k}`);
  }
}
check("5G no 'Roman Urdu:' label leaked into any 5G translation field", labelLeak.length === 0, labelLeak.slice(0, 3).join(", "));
check(
  "5G explanationUrdu dead field untouched (still present on every in-scope item)",
  scopeQs.every((q) => "explanationUrdu" in q),
);

// --------------------------------- §5 digits preserved (per explanation pattern)
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
// Drawing gloss items: _roman is the verbatim gloss; _ur keeps the gloss's digits.
for (const q of BY_SUBJECT.drawing.filter((x) => x.explanationEn)) {
  const gloss = q.explanation.split("Roman Urdu: ")[1];
  if (!sameMultiset(digitRuns(gloss), digitRuns(q.explanation_ur))) digitBad.push(`${q.id}:explanation_ur`);
}
// PPT-001 mixed: _ur digits between the explanationEn digits and the full
// mixed field's digits (PAK-style sub/super invariant from 5E).
{
  const ur = digitRuns(ppt001.explanation_ur);
  if (!isSubMultiset(ur, digitRuns(ppt001.explanation)) || !isSubMultiset(digitRuns(ppt001.explanationEn), ur))
    digitBad.push("PPT-001:explanation_ur");
}
// Plain English explanations: digits equal in both languages.
for (const q of scopeQs.filter((x) => !x.explanationEn)) {
  for (const dst of ["explanation_ur", "explanation_roman"]) {
    if (!sameMultiset(digitRuns(q.explanation), digitRuns(q[dst]))) digitBad.push(`${q.id}:${dst}`);
  }
}
check("5G digit runs preserved in every translated MCQ field (per explanation pattern)", digitBad.length === 0, digitBad.slice(0, 5).join(", "));

// --------------------------------- §6 honorifics + Arabic verbatim
const AR_RUN = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-ﹿ]+/g;
const HONOR_ABBR = /\(S\.?A\.?W\.?\)|\(P\.?B\.?U\.?H\.?\)|\(R\.?A\.?\)|\(A\.?S\.?\)/i;
function arabicRuns(s) { return (s.match(AR_RUN) || []).filter((r) => r.trim().length > 0); }
function arabicChars(s) { return (String(s).match(/[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-ﹿ]/g) || []).length; }
function latinChars(s) { return (String(s).match(/[A-Za-z]/g) || []).length; }
function urduDominant(s) { return arabicChars(s) > latinChars(s) && arabicChars(s) > 0; }
let arabicBad = [];
let honorBad = [];
for (const q of scopeQs) {
  // Question: Urdu-dominant source (the 6 fully Urdu-script past-paper
  // questions) -> _ur verbatim, _roman pure Latin (5C Urdu-notes
  // exception); otherwise every Arabic run must appear in both languages.
  if (urduDominant(q.question)) {
    if (q.question_ur !== q.question) arabicBad.push(`${q.id}: question_ur not verbatim`);
    if (arabicRuns(q.question_roman).length > 0) arabicBad.push(`${q.id}: question_roman not pure Latin`);
  } else {
    for (const run of arabicRuns(q.question)) {
      if (!q.question_ur.includes(run)) arabicBad.push(`${q.id} question_ur: ${JSON.stringify(run)}`);
      if (!q.question_roman.includes(run)) arabicBad.push(`${q.id} question_roman: ${JSON.stringify(run)}`);
    }
  }
  // Options: an Urdu-script option -> _ur verbatim, _roman carries the
  // verbatim word (transliteration + word in parentheses, 5C pattern).
  q.options.forEach((opt, i) => {
    for (const run of arabicRuns(opt)) {
      if (q.options_ur[i] !== opt) arabicBad.push(`${q.id}: options_ur[${i}] not verbatim`);
      if (!q.options_roman[i].includes(run)) arabicBad.push(`${q.id} options_roman[${i}]: ${JSON.stringify(run)}`);
    }
  });
  // Explanations: every Arabic run in the source explanation must appear
  // in both translations (explanations are English-framed in 5G scope).
  for (const run of arabicRuns(q.explanation)) {
    if (!q.explanation_ur.includes(run)) arabicBad.push(`${q.id} explanation_ur: ${JSON.stringify(run)}`);
    if (!q.explanation_roman.includes(run)) arabicBad.push(`${q.id} explanation_roman: ${JSON.stringify(run)}`);
  }
  // Honorifics: zero Latin abbreviations in translator-written fields.
  // The ONE exemption is PPT-001 explanation_roman — a verbatim copy of
  // the mixed source field, whose "(SAW)" is source data, not
  // translator-introduced (flagged in VERIFY-stage5g.md).
  for (const k of MCQ_TR_KEYS) {
    const v = Array.isArray(q[k]) ? q[k].join(" ") : q[k];
    if (typeof v === "string" && HONOR_ABBR.test(v) && !(q.id === "PPT-001" && k === "explanation_roman"))
      honorBad.push(`${q.id}:${k}`);
  }
}
for (const n of NOTES["Drawing/PE"]) {
  for (const lang of ["ur", "roman"]) {
    for (const run of arabicRuns(n.title)) {
      if (!n[`title_${lang}`].includes(run)) arabicBad.push(`Drawing/PE note "${n.title}" title_${lang}: ${JSON.stringify(run)}`);
    }
    for (const run of arabicRuns(n.body)) {
      if (!n[`body_${lang}`].includes(run)) arabicBad.push(`Drawing/PE note "${n.title}" body_${lang}: ${JSON.stringify(run)}`);
    }
    for (const k of ["title_ur", "title_roman", "body_ur", "body_roman"]) {
      if (typeof n[k] === "string" && HONOR_ABBR.test(n[k])) honorBad.push(`Drawing/PE note "${n.title}":${k}`);
    }
  }
}
check("5G Arabic script copied verbatim per the Urdu-dominant/options rules", arabicBad.length === 0, arabicBad.slice(0, 3).join(" | "));
check(
  "5G no Latin honorific abbreviations in any 5G translation (except the documented PPT-001 verbatim field)",
  honorBad.length === 0,
  honorBad.slice(0, 3).join(", "),
);
check(
  "5G PPT-001 verbatim exemption is exactly the source field: explanation_roman contains the source '(SAW)' and nothing else was added",
  ppt001.explanation_roman === ppt001.explanation && /\(SAW\)/.test(ppt001.explanation_roman),
);
// 5B honorific convention on the items whose source carries (SAW)/(RA).
function honorificForms(q) {
  const src = q.question + " " + q.options.join(" ") + " " + q.explanation;
  const joinedUr = [q.question_ur, ...q.options_ur, q.explanation_ur].join(" ");
  const joinedRoman = [q.question_roman, ...q.options_roman, q.explanation_roman].join(" ");
  const out = {};
  if (/\(S\.?A\.?W\.?\)/i.test(src)) {
    out.sawUr = joinedUr.includes("ﷺ");
    out.sawRoman = /Sallallahu Alaihi Wasallam/.test(joinedRoman);
  }
  if (/\(R\.?A\.?\)/i.test(src)) {
    out.raUr = joinedUr.includes("رضی اللہ عنہ");
    out.raRoman = /Raziallahu Anhu/.test(joinedRoman);
  }
  return out;
}
for (const id of ["PPT-003", "PPT-005", "PPR-003", "PPR-005"]) {
  const q = scopeQs.find((x) => x.id === id);
  const f = honorificForms(q);
  check(`5G ${id}: honorifics use the 5B convention forms in both languages`, Object.values(f).every(Boolean), JSON.stringify(f));
}
check(
  "5G PPT-001 question: '(peace be upon him)' rendered as ﷺ / 'Sallallahu Alaihi Wasallam'",
  ppt001.question_ur.includes("ﷺ") && /Sallallahu Alaihi Wasallam/.test(ppt001.question_roman),
);
check(
  "5G PPR-001 question: '(peace be upon him)' rendered as ﷺ / 'Sallallahu Alaihi Wasallam', explanation adds no honorific",
  BY_SUBJECT.pastpapers_reworded.find((q) => q.id === "PPR-001").question_ur.includes("ﷺ") &&
    /Sallallahu Alaihi Wasallam/.test(BY_SUBJECT.pastpapers_reworded.find((q) => q.id === "PPR-001").question_roman) &&
    !BY_SUBJECT.pastpapers_reworded.find((q) => q.id === "PPR-001").explanation_ur.includes("ﷺ"),
);
// Feminine honorific for Hazrat Khadija (the only female companion in
// scope): عنہا / Anha on her option, masculine عنہ / Anhu on male options.
for (const [bankKey, id] of [["pastpapers", "PPT-005"], ["pastpapers_reworded", "PPR-005"]]) {
  const q = BY_SUBJECT[bankKey].find((x) => x.id === id);
  const khIdx = q.options.findIndex((o) => /Khadija/.test(o));
  const maleIdx = q.options.map((o, i) => (/Khadija/.test(o) ? -1 : i)).filter((i) => i >= 0);
  check(
    `5G ${id}: Khadija option uses the feminine form عنہا / Anha`,
    q.options_ur[khIdx].includes("رضی اللہ عنہا") && /Raziallahu Anha/.test(q.options_roman[khIdx]),
  );
  check(
    `5G ${id}: male companion options use the masculine form عنہ / Anhu`,
    maleIdx.every((i) => q.options_ur[i].includes("رضی اللہ عنہ") && !q.options_ur[i].includes("رضی اللہ عنہا") && /Raziallahu Anhu/.test(q.options_roman[i])),
  );
}
// The 6 fully Urdu-script questions, enumerated.
const URDU_Q_IDS = ["PPT-011", "PPT-012", "PPT-013", "PPR-011", "PPR-012", "PPR-013"];
check(
  "5G exactly the 6 past-paper questions are Urdu-dominant",
  scopeQs.filter((q) => urduDominant(q.question)).map((q) => q.id).sort().join(",") === [...URDU_Q_IDS].sort().join(","),
  scopeQs.filter((q) => urduDominant(q.question)).map((q) => q.id).join(","),
);
check(
  "5G Urdu-dominant questions: question_ur verbatim + question_roman pure Latin (all 6)",
  URDU_Q_IDS.every((id) => {
    const q = scopeQs.find((x) => x.id === id);
    return q.question_ur === q.question && arabicRuns(q.question_roman).length === 0;
  }),
);
check(
  "5G Urdu-script options: options_ur verbatim + verbatim word carried in options_roman (all 6 items)",
  URDU_Q_IDS.every((id) => {
    const q = scopeQs.find((x) => x.id === id);
    return q.options.every((opt, i) => q.options_ur[i] === opt && arabicRuns(opt).every((run) => q.options_roman[i].includes(run)));
  }),
);

// --------------------------------- §7 scope: every registered bank translated (FINAL)
const bankDir = join(ROOT, "src/data/banks");
const REGISTERED_BANKS = ["islamiyat.json", "tajweed.json", "arabic.json", "urdu.json", "english.json", "maths.json", "gk.json", "science.json", "pakstudies.json", "socialstudies.json", "pedagogy.json", "it.json", "pe.json", "drawing.json", "pastpapers.json", "pastpapers_reworded.json"];
let untranslatedBankItems = [];
for (const f of REGISTERED_BANKS) {
  const items = JSON.parse(fs.readFileSync(join(bankDir, f), "utf8"));
  for (const q of items) {
    if (!MCQ_TR_KEYS.every((k) => k in q)) untranslatedBankItems.push(`${f}:${q.id}`);
  }
}
check("5G FINAL: all 16 registered banks fully translated (every item, both languages)", untranslatedBankItems.length === 0, untranslatedBankItems.slice(0, 5).join(", "));
check("5G drawing_pe.json (dead, unregistered) untouched: no translation fields", (() => {
  const items = JSON.parse(fs.readFileSync(join(bankDir, "drawing_pe.json"), "utf8"));
  return items.every((q) => !MCQ_TR_KEYS.some((k) => k in q));
})());
check(
  "5G no unexpected bank files in src/data/banks",
  fs.readdirSync(bankDir).filter((f) => f.endsWith(".json")).sort().join(",") === [...REGISTERED_BANKS, "drawing_pe.json"].sort().join(","),
);

// --------------------------------- §8 notes: completeness + scope + digits + gloss handling
const NOTE_TR_KEYS = ["title_ur", "title_roman", "body_ur", "body_roman"];
const NOTE_ORIG_KEYS = new Set(["title", "body", "source", "conceptId", "syllabusClause", "sourceKind", "ur", "roman"]);
{
  let noteBadShape = [];
  let noteBadKeys = [];
  let noteTranslated = [];
  for (const n of NOTES["Drawing/PE"]) {
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
  check("5G Drawing/PE notes: no unexpected keys added", noteBadKeys.length === 0, noteBadKeys.slice(0, 3).join(", "));
  check("5G Drawing/PE notes: translation fields all-4-or-none + valid", noteBadShape.length === 0, noteBadShape.slice(0, 3).join(", "));
  check("5G Drawing/PE notes: all 24 translated", noteTranslated.length === 24, `translated=${noteTranslated.length}`);
  console.log(`INFO  5G Drawing/PE notes translated: ${noteTranslated.length}/24`);
}
let untranslatedNotes = [];
for (const [subject, notes] of Object.entries(NOTES)) {
  for (const n of notes) {
    if (!NOTE_TR_KEYS.every((k) => k in n)) untranslatedNotes.push(`${subject}:${n.title}`);
  }
}
check("5G FINAL: all 13 note subjects fully translated (every note, both languages)", untranslatedNotes.length === 0, untranslatedNotes.slice(0, 3).join(", "));
let noteDigitBad = [];
for (const n of NOTES["Drawing/PE"]) {
  for (const [src, dst] of [["title", "title_ur"], ["title", "title_roman"], ["body", "body_ur"], ["body", "body_roman"]]) {
    if (!sameMultiset(digitRuns(n[src]), digitRuns(n[dst]))) noteDigitBad.push(`Drawing/PE:${n.title}:${dst}`);
  }
}
check("5G digit runs unchanged in every translated note field", noteDigitBad.length === 0, noteDigitBad.slice(0, 3).join(", "));
// Gloss rule on all 22 notes carrying a "Roman Urdu:" gloss sentence: label
// dropped, gloss kept verbatim in _roman, translated in _ur.
const glossNotes = NOTES["Drawing/PE"].filter((n) => /Roman Urdu:/.test(n.body));
check("5G exactly 22 Drawing/PE notes carry a 'Roman Urdu:' gloss sentence", glossNotes.length === 22, `got ${glossNotes.length}`);
let glossBad = [];
for (const n of glossNotes) {
  const gloss = n.body.match(/Roman Urdu:\s*(.*?)\.\s*Recall first:/)[1].trim();
  if (!n.body_roman.includes(gloss)) glossBad.push(n.title);
}
check("5G all 22 note glosses verbatim in body_roman", glossBad.length === 0, glossBad.slice(0, 3).join(", "));
const basicsNote = NOTES["Drawing/PE"].find((n) => n.title === "Drawing Basics — The Elements of Art");
check(
  "5G Drawing Basics note: gloss verbatim in body_roman, translated in body_ur, label dropped",
  basicsNote.body_roman.includes("drawing ke bunyadi ajzaa — lakeer, shakal, rang, banawat aur jagah.") &&
    basicsNote.body_ur.includes("ڈرائنگ کے بنیادی اجزا"),
);
const hockeyNote = NOTES["Drawing/PE"].find((n) => n.title === "Hockey — The Basics");
check(
  "5G Hockey note: gloss verbatim in body_roman, translated in body_ur, label dropped",
  hockeyNote.body_roman.includes("hockey mein 11 khilari, 60 minute ka match aur 4 quarter hote hain.") &&
    hockeyNote.body_ur.includes("11 کھلاڑی"),
);
check(
  "5G Recall-first lead-in kept in body_roman ('Recall first:') and body_ur ('پہلے یاد کریں:') on all 24 notes",
  NOTES["Drawing/PE"].every((n) => n.body_roman.includes("Recall first:") && n.body_ur.includes("پہلے یاد کریں:")),
);

// --------------------------------- §9 resolver on real 5G items + notes
for (const [bankKey, label] of [["drawing", "Drawing"], ["pastpapers", "Past Papers"], ["pastpapers_reworded", "Past Papers Reworded"]]) {
  const tq = BY_SUBJECT[bankKey].find((q) => q.question_ur !== undefined);
  if (tq) {
    const rUr = resolveQuestionView(tq, "ur");
    check(`5G resolver: translated ${label} item in ur returns translated view`, rUr.translated === true && rUr.view.question === tq.question_ur);
    const rRoman = resolveQuestionView(tq, "roman");
    check(`5G resolver: translated ${label} item in roman returns roman view`, rRoman.translated === true && rRoman.view.question === tq.question_roman);
    check(
      `5G resolver: ${label} view preserves id/correctIndex/reviewStatus/source/pastPaperRef`,
      rUr.view.id === tq.id &&
        rUr.view.correctIndex === tq.correctIndex &&
        rUr.view.reviewStatus === tq.reviewStatus &&
        rUr.view.source === tq.source &&
        rUr.view.pastPaperRef === tq.pastPaperRef,
    );
  }
}
{
  const tn = NOTES["Drawing/PE"].find((n) => n.title_ur !== undefined);
  if (tn) {
    const rn = resolveNoteView(tn, "ur");
    check("5G note resolver: translated Drawing/PE note in ur returns translated text", rn.translated === true && rn.title === tn.title_ur && rn.body === tn.body_ur);
    const rnR = resolveNoteView(tn, "roman");
    check("5G note resolver: translated Drawing/PE note in roman returns roman text", rnR.translated === true && rnR.title === tn.title_roman && rnR.body === tn.body_roman);
  }
}
check("5G quran-examples.json untouched: no translation keys", !/_ur|_roman/.test(read("src/data/quran-examples.json")));
const contentJson = readJson("src/data/content.json");
check("5G content.json counts unchanged", contentJson.counts.total === 763 && contentJson.counts.notes === 151 && contentJson.counts.cards === 70);

// --------------------------------- §10 past-paper disclosure labels (FINAL)
// The disclosure lives in `pastPaperRef`, rendered by the existing
// topicBadge() (data.ts) — English detail verbatim in en/roman modes, the
// hardcoded Urdu disclosure in ur mode. No schema/rendering change: the
// labels must stay byte-identical so the badge's `includes("reworded")`
// classification keeps working, and the translated fields must not copy
// the label text (the badge owns it).
const ORIG_LABEL = "Original practice question based on past-paper topics — not the actual paper";
const REWORDED_LABEL = "Same concept as a past-paper question, reworded in a different style — not the actual paper";
check(
  "5G pastPaperRef: all 20 pastpapers items carry the exact original label",
  BY_SUBJECT.pastpapers.every((q) => q.pastPaperRef === ORIG_LABEL),
);
check(
  "5G pastPaperRef: all 20 reworded items carry the exact reworded label",
  BY_SUBJECT.pastpapers_reworded.every((q) => q.pastPaperRef === REWORDED_LABEL),
);
check(
  "5G pastPaperRef: all drawing items carry null (no disclosure)",
  BY_SUBJECT.drawing.every((q) => q.pastPaperRef === null),
);
check(
  "5G topicBadge: ur mode returns the Urdu disclosure ('اصل پرچہ نہیں') for both label kinds",
  topicBadge(ORIG_LABEL, "ur").detail.includes("اصل پرچہ نہیں") &&
    topicBadge(REWORDED_LABEL, "ur").detail.includes("اصل پرچہ نہیں") &&
    topicBadge(ORIG_LABEL, "ur").label.includes("موضوع سے متاثر") &&
    topicBadge(REWORDED_LABEL, "ur").label.includes("دوبارہ لکھا گیا"),
);
check(
  "5G topicBadge: en mode detail is the stored label verbatim; null ref returns null",
  topicBadge(ORIG_LABEL, "en").detail === ORIG_LABEL &&
    topicBadge(REWORDED_LABEL, "en").detail === REWORDED_LABEL &&
    topicBadge(null) === null,
);
check(
  "5G no 5G translation field copies the disclosure label text",
  scopeQs.every((q) =>
    MCQ_TR_KEYS.every((k) => {
      const v = Array.isArray(q[k]) ? q[k].join(" ") : q[k];
      return !/not the actual paper|اصل پرچہ/.test(v);
    }),
  ),
);
// Whole-bank final completeness, independent of the per-bank loops above.
check(
  "5G FINAL: all 763 questions carry complete translation triples in both languages",
  QUESTIONS.every((q) => tripleComplete(q, "ur").valid && tripleComplete(q, "roman").valid),
  `untranslated=${QUESTIONS.filter((q) => !(tripleComplete(q, "ur").valid && tripleComplete(q, "roman").valid)).map((q) => q.id).slice(0, 5).join(",")}`,
);
check(
  "5G FINAL: all 151 notes carry all 4 translation fields",
  Object.values(NOTES).flat().every((n) => NOTE_TR_KEYS.every((k) => typeof n[k] === "string" && n[k].trim().length > 0)),
);

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll Stage 5G checks passed.");
