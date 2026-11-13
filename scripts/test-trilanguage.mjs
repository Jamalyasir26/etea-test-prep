// Tri-language scaffold tests (Localization Pass 1) — plain node, no
// dependencies. Compiles the real src/lib/data.ts to CommonJS in /tmp
// with tsc (same approach as scripts/test-provenance.mjs) and tests
// localizeQuestion / localizeNote / hasTranslation:
// - absent translation -> identity (same object back, behaviour
//   provably unchanged today: ZERO translated content in the bank);
// - lang "en" -> identity even when a translation exists;
// - per-field fallback: a partially translated item falls back to
//   English field by field;
// - options fall back as a WHOLE array unless the translated array
//   length exactly matches the English options (no mixed arrays);
// - ur/roman select their own fields; helpers never mutate the input.
// Run: node scripts/test-trilanguage.mjs  (exit 0 = all pass)
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/loc1-trilanguage";
execSync(
  `npx tsc src/lib/data.ts --outDir ${OUT} --module commonjs --target es2020 --resolveJsonModule --esModuleInterop --skipLibCheck --moduleResolution node`,
  { cwd: ROOT, stdio: "ignore" },
);
const require = createRequire(import.meta.url);
const { QUESTIONS, NOTES, localizeQuestion, localizeNote, hasTranslation } = require(join(OUT, "lib/data.js"));

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---------- Zero translated content today (behaviour unchanged) ----------
check("bank loads: 763 MCQs", QUESTIONS.length === 763, `got ${QUESTIONS.length}`);
const translatedMcqs = QUESTIONS.filter((q) => q.ur || q.roman);
check("zero MCQs carry a ur/roman translation today", translatedMcqs.length === 0, translatedMcqs.slice(0, 3).map((q) => q.id).join(", "));
const allNotes = Object.values(NOTES).flat();
check("notes load: 151 notes", allNotes.length === 151, `got ${allNotes.length}`);
const translatedNotes = allNotes.filter((n) => n.ur || n.roman);
check("zero notes carry a ur/roman translation today", translatedNotes.length === 0);
check(
  "hasTranslation is false for every bank item",
  QUESTIONS.every((q) => !hasTranslation(q, "ur") && !hasTranslation(q, "roman")) &&
    allNotes.every((n) => !hasTranslation(n, "ur") && !hasTranslation(n, "roman")),
);

// ---------- localizeQuestion ----------
const q = {
  id: "TST-001",
  subject: "Islamiyat",
  topic: "Test",
  question: "English question?",
  options: ["A", "B", "C", "D"],
  correctIndex: 1,
  explanation: "English explanation.",
  source: "Test source",
  reviewStatus: "draft",
  post: ["tt"],
};
check("absent translation -> identity (ur)", localizeQuestion(q, "ur") === q);
check("absent translation -> identity (roman)", localizeQuestion(q, "roman") === q);

const qFull = {
  ...q,
  ur: { question: "اردو سوال؟", options: ["الف", "ب", "ج", "د"], explanation: "اردو وضاحت۔" },
  roman: { question: "Roman sawal?", options: ["A-roman", "B-roman", "C-roman", "D-roman"], explanation: "Roman wazahat." },
};
check("lang en -> identity even with translations present", localizeQuestion(qFull, "en") === qFull);
const qUr = localizeQuestion(qFull, "ur");
check("ur selects the Urdu fields", qUr.question === "اردو سوال؟" && qUr.options[0] === "الف" && qUr.explanation === "اردو وضاحت۔");
check("ur keeps non-text fields intact", qUr.id === "TST-001" && qUr.correctIndex === 1 && qUr.subject === "Islamiyat");
const qRoman = localizeQuestion(qFull, "roman");
check("roman selects the Roman fields", qRoman.question === "Roman sawal?" && qRoman.options[3] === "D-roman");

const qPartial = { ...q, ur: { question: "صرف سوال؟" } };
const qPartialUr = localizeQuestion(qPartial, "ur");
check(
  "per-field fallback: untranslated fields stay English",
  qPartialUr.question === "صرف سوال؟" && qPartialUr.options === q.options && qPartialUr.explanation === "English explanation.",
);
const qShortOpts = { ...q, ur: { question: "سوال؟", options: ["صرف ایک"], explanation: "وضاحت۔" } };
check(
  "options length mismatch -> whole English array kept",
  localizeQuestion(qShortOpts, "ur").options === q.options,
);
const qLongOpts = { ...q, ur: { options: ["1", "2", "3", "4", "5"] } };
check(
  "options length mismatch (longer) -> whole English array kept",
  localizeQuestion(qLongOpts, "ur").options === q.options,
);
const qEmpty = { ...q, ur: {} };
check("empty translation object -> fields fall back to English", localizeQuestion(qEmpty, "ur").question === "English question?");
check("helpers never mutate the input", q.question === "English question?" && q.options[0] === "A" && !("ur" in q));

// ---------- localizeNote ----------
const n = { title: "English title", body: "English body.", source: "Test source", subject: "Islamiyat" };
check("note absent translation -> identity (ur)", localizeNote(n, "ur") === n);
const nFull = { ...n, ur: { title: "اردو عنوان", body: "اردو متن۔" }, roman: { title: "Roman unwan", body: "Roman matn." } };
check("note lang en -> identity", localizeNote(nFull, "en") === nFull);
check("note ur selects Urdu fields", localizeNote(nFull, "ur").title === "اردو عنوان" && localizeNote(nFull, "ur").body === "اردو متن۔");
check("note roman selects Roman fields", localizeNote(nFull, "roman").title === "Roman unwan");
const nPartial = { ...n, ur: { title: "صرف عنوان" } };
const nPartialUr = localizeNote(nPartial, "ur");
check("note per-field fallback", nPartialUr.title === "صرف عنوان" && nPartialUr.body === "English body.");
check("note helper never mutates", n.title === "English title");

// ---------- hasTranslation ----------
check("hasTranslation: full translation -> true", hasTranslation(qFull, "ur") && hasTranslation(qFull, "roman"));
check("hasTranslation: partial translation -> true", hasTranslation(qPartial, "ur"));
check("hasTranslation: absent -> false", !hasTranslation(q, "ur") && !hasTranslation(n, "roman"));
check("hasTranslation: empty object -> false", !hasTranslation(qEmpty, "ur"));
check("hasTranslation: whitespace-only -> false", !hasTranslation({ ...q, ur: { question: "   " } }, "ur"));
check("hasTranslation: empty options array -> false", !hasTranslation({ ...q, ur: { options: [] } }, "ur"));

console.log(failures === 0 ? `\nAll tri-language tests passed.` : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
