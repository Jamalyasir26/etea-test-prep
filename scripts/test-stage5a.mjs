// Stage 5A tests — translation infrastructure + Islamiyat pilot batch
// (105 MCQs + 14 notes, Urdu script + Roman Urdu). Exercises the REAL
// data.ts (compiled to CommonJS in /tmp with tsc, same approach as
// test-trilanguage.mjs). Locks: counts unchanged; flat _ur/_roman
// fields are all-or-none per language per item (whole items only);
// options arrays match English length/order slots; Roman-marked
// explanations copied verbatim to _roman; no other bank/subject
// touched; item-level fallback (never a half-translated mix); the
// [Auto-Translated] badge renders with translated content only; the
// /review page and quran-examples.json are untouched by Stage 5.
// Run: node scripts/test-stage5a.mjs  (exit 0 = all pass)
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
const OUT = "/tmp/stage5a-data";
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
check("5A tsc harness: no unexpected type errors", tscErrors.every((l) => l.includes("TS5097")), tscDiag.slice(0, 300));
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const { QUESTIONS, BY_SUBJECT, NOTES, VISIBLE_COUNTS, resolveQuestionView, resolveNoteView, displayExplanation } = data;

// --------------------------------- §2 counts unchanged
check("5A bank total 763 MCQs", QUESTIONS.length === 763, `got ${QUESTIONS.length}`);
const notesTotal = Object.values(NOTES).flat().length;
check("5A notes total 151", notesTotal === 151, `got ${notesTotal}`);
check(
  "5A VISIBLE_COUNTS 763/151/70, 12 tracks / 16 mocks",
  VISIBLE_COUNTS.total === 763 &&
    VISIBLE_COUNTS.notes === 151 &&
    VISIBLE_COUNTS.cards === 70 &&
    VISIBLE_COUNTS.tracks === 12 &&
    VISIBLE_COUNTS.mocks === 16,
  JSON.stringify(VISIBLE_COUNTS),
);
check("5A islamiyat bank still 105 items", BY_SUBJECT.islamiyat.length === 105, `got ${BY_SUBJECT.islamiyat.length}`);
check("5A islamiyat notes still 14", NOTES.Islamiyat.length === 14, `got ${NOTES.Islamiyat.length}`);

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
for (const q of BY_SUBJECT.islamiyat) {
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
check("5A islamiyat MCQs: no unexpected keys added", mcqBadKeys.length === 0, mcqBadKeys.slice(0, 5).join(", "));
check(
  "5A islamiyat MCQs: translation triples all-or-none + valid per language",
  mcqBadShape.length === 0,
  mcqBadShape.slice(0, 5).join(", "),
);
check(
  "5A islamiyat MCQs: ur set == roman set (both languages together)",
  mcqUrSet.length === mcqRomanSet.length && mcqUrSet.every((id) => mcqRomanSet.includes(id)),
  `ur=${mcqUrSet.length} roman=${mcqRomanSet.length}`,
);
check("5A islamiyat MCQs: at least one item translated", mcqUrSet.length > 0, `translated=${mcqUrSet.length}`);
console.log(`INFO  5A islamiyat MCQs translated: ${mcqUrSet.length}/105`);

// --------------------------------- §4 Roman-marked explanations copied verbatim
let romanNotVerbatim = [];
for (const q of BY_SUBJECT.islamiyat) {
  if (q.explanationLang === "roman" && q.explanation_roman !== undefined && q.explanation_roman !== q.explanation) {
    romanNotVerbatim.push(q.id);
  }
}
check(
  "5A Roman-marked explanations: _roman is a verbatim copy of `explanation`",
  romanNotVerbatim.length === 0,
  romanNotVerbatim.slice(0, 5).join(", "),
);
// Dead field untouched: explanationUrdu still present (null) on every item.
check(
  "5A explanationUrdu dead field untouched (still present on every item)",
  BY_SUBJECT.islamiyat.every((q) => "explanationUrdu" in q),
);

// --------------------------------- §5 no other bank touched
// Stage 5B: tajweed.json is translated too — the scope guard allows
// both pilot banks (islamiyat + tajweed) and no others.
const bankDir = join(ROOT, "src/data/banks");
let otherBankTouched = [];
for (const f of fs.readdirSync(bankDir)) {
  if (f === "islamiyat.json" || f === "tajweed.json") continue;
  const items = JSON.parse(fs.readFileSync(join(bankDir, f), "utf8"));
  for (const q of items) {
    if (MCQ_TR_KEYS.some((k) => k in q)) otherBankTouched.push(`${f}:${q.id}`);
  }
}
check("5A no other bank file carries _ur/_roman fields", otherBankTouched.length === 0, otherBankTouched.slice(0, 5).join(", "));

// --------------------------------- §6 notes: completeness + scope
const NOTE_TR_KEYS = ["title_ur", "title_roman", "body_ur", "body_roman"];
const NOTE_ORIG_KEYS = new Set(["title", "body", "source", "conceptId", "syllabusClause", "sourceKind", "ur", "roman"]);
let noteBadShape = [];
let noteBadKeys = [];
let noteTranslated = [];
for (const n of NOTES.Islamiyat) {
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
check("5A islamiyat notes: no unexpected keys added", noteBadKeys.length === 0, noteBadKeys.slice(0, 3).join(", "));
check("5A islamiyat notes: translation fields all-4-or-none + valid", noteBadShape.length === 0, noteBadShape.slice(0, 3).join(", "));
check("5A islamiyat notes: at least one note translated", noteTranslated.length > 0, `translated=${noteTranslated.length}`);
console.log(`INFO  5A islamiyat notes translated: ${noteTranslated.length}/14`);
let otherNoteTouched = [];
for (const [subject, notes] of Object.entries(NOTES)) {
  if (subject === "Islamiyat" || subject === "Tajweed") continue;
  for (const n of notes) {
    if (NOTE_TR_KEYS.some((k) => k in n)) otherNoteTouched.push(`${subject}:${n.title}`);
  }
}
check("5A no other subject's notes carry _ur/_roman fields", otherNoteTouched.length === 0, otherNoteTouched.slice(0, 3).join(", "));

// --------------------------------- §7 resolver: real translated + untranslated items
const translatedQ = BY_SUBJECT.islamiyat.find((q) => q.question_ur !== undefined);
const untranslatedQ = QUESTIONS.find((q) => q.subjectKey !== "islamiyat");
if (translatedQ) {
  const rUr = resolveQuestionView(translatedQ, "ur");
  check("5A resolver: translated item in ur returns translated view", rUr.translated === true && rUr.view.question === translatedQ.question_ur);
  check("5A resolver: translated view options are the _ur array", JSON.stringify(rUr.view.options) === JSON.stringify(translatedQ.options_ur));
  check("5A resolver: translated view explanation is explanation_ur", rUr.view.explanation === translatedQ.explanation_ur);
  const rRoman = resolveQuestionView(translatedQ, "roman");
  check("5A resolver: translated item in roman returns roman view", rRoman.translated === true && rRoman.view.question === translatedQ.question_roman);
  check(
    "5A resolver: view preserves id/correctIndex/reviewStatus/source",
    rUr.view.id === translatedQ.id &&
      rUr.view.correctIndex === translatedQ.correctIndex &&
      rUr.view.reviewStatus === translatedQ.reviewStatus &&
      rUr.view.source === translatedQ.source,
  );
  const explUr = displayExplanation(rUr.view, "ur");
  check("5A resolver: displayExplanation on resolved view returns translated text", explUr.text === translatedQ.explanation_ur && explUr.pendingEnglish === false);
}
check("5A resolver: untranslated item in ur falls back to identity", resolveQuestionView(untranslatedQ, "ur").view === untranslatedQ && resolveQuestionView(untranslatedQ, "ur").translated === false);
check("5A resolver: untranslated item in roman falls back to identity", resolveQuestionView(untranslatedQ, "roman").view === untranslatedQ && resolveQuestionView(untranslatedQ, "roman").translated === false);
check("5A resolver: en mode is identity for every item", QUESTIONS.every((q) => resolveQuestionView(q, "en").view === q && resolveQuestionView(q, "en").translated === false));

// Synthetic partial items: never a half-translated mix.
const base = {
  id: "SYN-001", post: [], subject: "Islamiyat", subjectKey: "islamiyat", topic: "t",
  question: "English?", options: ["a", "b", "c", "d"], correctIndex: 1,
  explanation: "English why.", explanationUrdu: null, difficulty: "easy",
  pastPaperRef: null, verified: false, source: "s",
};
const partial = { ...base, question_ur: "اردو؟" };
check("5A resolver: partial (question only) falls back wholly", resolveQuestionView(partial, "ur").view === partial && resolveQuestionView(partial, "ur").translated === false);
const shortOpts = { ...base, question_ur: "اردو؟", options_ur: ["a", "b"], explanation_ur: "کیوں۔" };
check("5A resolver: short options array falls back wholly", resolveQuestionView(shortOpts, "ur").translated === false);
const emptyField = { ...base, question_ur: "اردو؟", options_ur: ["a", "b", "c", "d"], explanation_ur: "   " };
check("5A resolver: blank explanation falls back wholly", resolveQuestionView(emptyField, "ur").translated === false);
const fullSyn = { ...base, question_ur: "اردو؟", options_ur: ["الف", "ب", "ج", "د"], explanation_ur: "کیوں۔" };
const rSyn = resolveQuestionView(fullSyn, "ur");
check("5A resolver: complete synthetic item resolves", rSyn.translated === true && rSyn.view.question === "اردو؟" && rSyn.view.options[0] === "الف");
check("5A resolver: synthetic view is a copy, input untouched", fullSyn.question === "English?" && rSyn.view !== fullSyn);

// Notes resolver.
const translatedN = NOTES.Islamiyat.find((n) => n.title_ur !== undefined);
const untranslatedN = NOTES.English[0];
if (translatedN) {
  const rn = resolveNoteView(translatedN, "ur");
  check("5A note resolver: translated note in ur returns translated text", rn.translated === true && rn.title === translatedN.title_ur && rn.body === translatedN.body_ur);
  const rnR = resolveNoteView(translatedN, "roman");
  check("5A note resolver: translated note in roman returns roman text", rnR.translated === true && rnR.title === translatedN.title_roman);
}
check("5A note resolver: untranslated note falls back to English", (() => { const r = resolveNoteView(untranslatedN, "ur"); return r.translated === false && r.title === untranslatedN.title && r.body === untranslatedN.body; })());
check("5A note resolver: en mode returns English", (() => { const r = resolveNoteView(translatedN ?? untranslatedN, "en"); return r.translated === false; })());
check("5A note resolver: partial note (title only) falls back wholly", resolveNoteView({ title: "T", body: "B", title_ur: "عنوان" }, "ur").translated === false);

// --------------------------------- §8 rendering wiring (source-level)
const qr = read("src/components/QuizRunner.tsx");
check("5A QuizRunner: prepared resolves via resolveQuestionView", qr.includes("resolveQuestionView(q, lang)"));
check("5A QuizRunner: prepared depends on lang", /questions, startTs, lang/.test(qr));
check("5A QuizRunner: [Auto-Translated] badge in question card", qr.includes("q.translated") && qr.includes("[Auto-Translated]"));
check("5A QuizRunner: [Auto-Translated] badge in review table", qr.includes("p.translated"));
check("5A QuizRunner: badge literal isolated LTR", (qr.match(/<span\s+dir="ltr"\s+className="badge grey"\s+title=\{t\("autoTranslatedBadgeAria"\)\}/g) ?? []).length === 2);
check("5A QuizRunner: badge uses the i18n accessible label", qr.includes('t("autoTranslatedBadgeAria")'));
const library = read("src/app/library/page.tsx");
check("5A Library: renders via resolveNoteView", library.includes("resolveNoteView(n, lang)"));
check("5A Library: [Auto-Translated] badge on translated notes", library.includes("shown.translated") && library.includes("[Auto-Translated]"));
check("5A Library: English-source-text badge kept for untranslated notes", library.includes('!shown.translated') && library.includes('t("englishSourceText")'));
check("5A Library: badge literal isolated LTR", library.includes('<span\n                  dir="ltr"') || library.includes('dir="ltr"'));
const i18n = read("src/lib/i18n.tsx");
check("5A i18n: autoTranslatedBadgeAria key present (en+roman+ur)", /autoTranslatedBadgeAria: \{[^}]*en:[^}]*roman:[^}]*ur:/s.test(i18n));

// --------------------------------- §9 scope guards: /review + quran data untouched
const review = read("src/app/review/page.tsx");
check("5A /review untouched: no badge, no resolver", !review.includes("[Auto-Translated]") && !review.includes("resolveQuestionView"));
const quranExamples = read("src/data/quran-examples.json");
check("5A quran-examples.json untouched: no translation keys", !/_ur|_roman/.test(quranExamples));
const contentJson = readJson("src/data/content.json");
check("5A content.json counts unchanged", contentJson.counts.total === 763 && contentJson.counts.notes === 151 && contentJson.counts.cards === 70);

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll Stage 5A checks passed.");
