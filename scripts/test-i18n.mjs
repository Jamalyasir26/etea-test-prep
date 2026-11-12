// i18n coverage tests (Localization Pass 1) — plain node, no dependencies.
// 1. Every STRINGS key has a non-empty en AND ur translation (roman is
//    optional — it falls back to en; see the fallback rule below).
// 2. Placeholder sets: ur/roman placeholders must be a subset of en's
//    (so tf() can never render a raw {name} in a translated string).
// 3. Every t("…")/tf("…") literal key used in src/ exists in STRINGS,
//    plus the dynamic key lists (Nav LINKS, home QUICK, review filter
//    maps, issue-reason maps).
// 4. Fallback rule is implemented: current language → en → key itself.
// 5. Denylist: the old hardcoded English UI strings must not reappear
//    in the audited pages/components (comments stripped; documented
//    exceptions — proper names, acronyms, IDs, scoring policy notes,
//    CORRECTIONS/PATTERN_BANNER, format examples — are not listed).
// 6. Localized labels: localizedScoringLabel (Urdu + roman fallback),
//    gradeButtonLabel (Urdu + English default), provenanceBadge Urdu
//    variant (via tsc-compiled data.ts, same approach as
//    test-provenance.mjs).
// Run: node scripts/test-i18n.mjs  (exit 0 = all pass)
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---------- Parse the STRINGS object (string/comment-aware scan) ----------
const i18nSrc = fs.readFileSync(join(ROOT, "src/lib/i18n.tsx"), "utf8");

function extractStringsObject(src) {
  const start = src.indexOf("const STRINGS");
  const open = src.indexOf("{", start);
  let i = open;
  let depth = 0;
  let inStr = null;
  let esc = false;
  while (i < src.length) {
    const ch = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === inStr) inStr = null;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
    } else if (ch === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i);
      i = nl === -1 ? src.length : nl;
      continue;
    } else if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end === -1 ? src.length : end + 2;
      continue;
    } else if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
    i += 1;
  }
  throw new Error("STRINGS object not closed");
}

function parseEntries(objText) {
  const entries = {};
  const starts = [...objText.matchAll(/^  ([A-Za-z0-9_]+): \{/gm)];
  for (let i = 0; i < starts.length; i++) {
    const span = objText.slice(
      starts[i].index,
      i + 1 < starts.length ? starts[i + 1].index : objText.length,
    );
    const entry = {};
    for (const lang of ["en", "roman", "ur"]) {
      const vm = new RegExp(`${lang}: "((?:\\\\.|[^"\\\\])*)"`).exec(span);
      if (vm) entry[lang] = vm[1];
    }
    entries[starts[i][1]] = entry;
  }
  return entries;
}

const STRINGS = parseEntries(extractStringsObject(i18nSrc));
const keys = Object.keys(STRINGS);
console.log(`STRINGS keys: ${keys.length}`);
check("STRINGS has a substantial key set", keys.length >= 250, `got ${keys.length}`);

const missingUr = keys.filter((k) => !STRINGS[k].ur);
check("every key has a ur translation", missingUr.length === 0, missingUr.join(", "));
const missingEn = keys.filter((k) => !STRINGS[k].en);
check("every key has an en translation", missingEn.length === 0, missingEn.join(", "));
const emptyRoman = keys.filter((k) => "roman" in STRINGS[k] && !STRINGS[k].roman);
check("roman translations, where present, are non-empty", emptyRoman.length === 0, emptyRoman.join(", "));

function placeholders(s) {
  return new Set([...(s ?? "").matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
}
const placeholderViolations = [];
for (const k of keys) {
  const enSet = placeholders(STRINGS[k].en);
  for (const lang of ["roman", "ur"]) {
    if (!STRINGS[k][lang]) continue;
    for (const p of placeholders(STRINGS[k][lang])) {
      if (!enSet.has(p)) placeholderViolations.push(`${k}.${lang} has {${p}} not in en`);
    }
  }
}
check("ur/roman placeholders are subsets of en placeholders", placeholderViolations.length === 0, placeholderViolations.join("; "));

// ---------- Every used key exists ----------
function walkSrc(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkSrc(p, out);
    else if (/\.(tsx?|css)$/.test(e.name)) out.push(p);
  }
  return out;
}
const used = new Set();
const usedIn = {};
for (const f of walkSrc(join(ROOT, "src"))) {
  if (f.endsWith("src/lib/i18n.tsx")) continue;
  const src = fs.readFileSync(f, "utf8");
  const rel = f.slice(ROOT.length + 1);
  for (const m of src.matchAll(/(?:\bt|\btf)\("([A-Za-z0-9_]+)"/g)) {
    used.add(m[1]);
    (usedIn[m[1]] ??= []).push(rel);
  }
  // Dynamic key lists: Nav LINKS, home QUICK, review filter maps.
  for (const m of src.matchAll(/(?:key|descKey|labelKey): "([A-Za-z0-9_]+)"/g)) {
    used.add(m[1]);
    (usedIn[m[1]] ??= []).push(rel);
  }
  // Display maps: issue-reason / status / structural display keys.
  for (const m of src.matchAll(/: "(issueReason[A-Za-z0-9_]+|status[A-Za-z0-9_]+|structural[A-Za-z0-9_]+)"/g)) {
    used.add(m[1]);
    (usedIn[m[1]] ??= []).push(rel);
  }
}
const unknown = [...used].filter((k) => !(k in STRINGS));
check("every t()/tf() + dynamic key used in src/ exists in STRINGS", unknown.length === 0, unknown.map((k) => `${k} (${usedIn[k].join(", ")})`).join("; "));
console.log(`Used keys referenced from src/: ${used.size}`);

// ---------- Fallback rule implemented ----------
check(
  "t() falls back lang -> en -> key",
  i18nSrc.includes("STRINGS[key]?.[lang] ?? STRINGS[key]?.en ?? key"),
);
check(
  "tf() uses the same fallback + replaceVars",
  i18nSrc.includes("replaceVars(STRINGS[key]?.[lang] ?? STRINGS[key]?.en ?? key, vars)"),
);
check("replaceVars never leaves a raw {name} (missing -> empty)", /v === undefined \? "" : String\(v\)/.test(i18nSrc));

// ---------- Denylist: no re-hardcoded English UI strings ----------
// Comments stripped with a string-aware scanner (URLs contain "//").
function stripComments(src) {
  let out = "";
  let i = 0;
  let inStr = null;
  let esc = false;
  while (i < src.length) {
    const ch = src[i];
    if (inStr) {
      out += ch;
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === inStr) inStr = null;
      i += 1;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      out += ch;
      i += 1;
    } else if (ch === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i);
      i = nl === -1 ? src.length : nl;
    } else if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end === -1 ? src.length : end + 2;
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

const DENYLIST = {
  "src/app/tutor/page.tsx": ["AI Tutor — Ustad", "Answer language", "Thinking…", "Explain a question", "Ask a question"],
  "src/app/page.tsx": ["Pattern selector — pick the version", "Plan tasks done", "Full analysis →", "AI Tutor — live."],
  "src/app/library/page.tsx": ["Library — Notes", "Recall first — tap to reveal", "Hide again", "Save annotation"],
  "src/app/practice/page.tsx": ["Practice — Topic Quizzes", "New set (shuffle again)"],
  "src/app/mock/page.tsx": ["Mock Tests", "Provisional (all questions)", "Trusted (reviewed only)"],
  "src/app/mock/[id]/page.tsx": ["Mock not found", "Back to all mocks"],
  "src/app/plan/page.tsx": ["Sample timetable — adjust to your schedule.", "Generate AI plan"],
  "src/app/flashcards/page.tsx": ["Cram mode (also show future-due cards)", "Session finished", "Review again", "No cards due today"],
  "src/app/analysis/page.tsx": ["Per-subject accuracy", "Weak-area heatmap", "Mock history", "Delete all attempts", "No mocks taken yet."],
  "src/app/review/page.tsx": ["Review Queue — Verification Dashboard", "You are the verifier.", "Show 25 more", "Reset to draft"],
  "src/app/issues/page.tsx": ["Issues — private correction inbox", "Export JSON", "Delete all", "Client errors (this device only)"],
  "src/app/vacancies/page.tsx": ["Vacancy Tracker", "Manually curated — check"],
  "src/app/tracks/page.tsx": ["Post Tracks"],
  "src/app/tracks/[id]/page.tsx": ["Track not found", "Mocks for this track", "No mock yet"],
  "src/app/topics/page.tsx": ["Practice from Past-Paper Topics"],
  "src/app/links/page.tsx": ["Official Links"],
  "src/components/Nav.tsx": ['aria-label="Language"', 'aria-label="Toggle dark mode"'],
  "src/components/QuizRunner.tsx": ["Report an issue", "Provisional — not verified", "Raw accuracy vs exam score", "First-pass score so far"],
  "src/components/TutorHealth.tsx": ["Live AI status", "Checking…", ">Refresh<"],
};
for (const [rel, lits] of Object.entries(DENYLIST)) {
  const stripped = stripComments(fs.readFileSync(join(ROOT, rel), "utf8"));
  const found = lits.filter((lit) => stripped.includes(lit));
  check(`no hardcoded UI strings reappear in ${rel}`, found.length === 0, found.join(" | "));
}

// ---------- Localized labels: scoring + grades ----------
const { localizedScoringLabel, DEFAULT_SCORING } = await import("../src/lib/scoring.ts");
const { gradeButtonLabel } = await import("../src/lib/tracking.ts");

const enLabel = localizedScoringLabel(DEFAULT_SCORING, "en");
check("scoring label (en) unchanged", enLabel === "1 mark per correct answer · no penalty (policy unknown)", enLabel);
const urLabel = localizedScoringLabel(DEFAULT_SCORING, "ur");
check(
  "scoring label (ur) translated",
  urLabel.includes("نمبر فی درست جواب") && urLabel.includes("کوئی کٹوتی نہیں") && urLabel.includes("پالیسی نامعلوم"),
  urLabel,
);
check("scoring label (roman) falls back to English", localizedScoringLabel(DEFAULT_SCORING, "roman") === enLabel);
const penaltyLabel = localizedScoringLabel({ ...DEFAULT_SCORING, wrongPenalty: 0.25, policyStatus: "unverified-assumption" }, "ur");
check(
  "scoring label (ur) with penalty",
  penaltyLabel.includes("ہر غلط جواب پر 0.25 کٹوتی") && penaltyLabel.includes("غیر مصدقہ مفروضہ"),
  penaltyLabel,
);

check("grade label default (no lang) stays English", gradeButtonLabel("again", 0) === "Again — review again this session");
check(
  "grade labels (ur) translated",
  gradeButtonLabel("again", 0, "ur").includes("دوبارہ") &&
    gradeButtonLabel("hard", 0, "ur").includes("مشکل") &&
    gradeButtonLabel("good", 3, "ur").includes("اچھا") &&
    gradeButtonLabel("easy", 7, "ur").includes("آسان"),
);
check("grade labels (roman) fall back to English", gradeButtonLabel("good", 3, "roman") === gradeButtonLabel("good", 3, "en"));

// ---------- Provenance badge Urdu variant (compiled data.ts) ----------
const OUT = "/tmp/loc1-i18n";
execSync(
  `npx tsc src/lib/data.ts --outDir ${OUT} --module commonjs --target es2020 --resolveJsonModule --esModuleInterop --skipLibCheck --moduleResolution node`,
  { cwd: ROOT, stdio: "ignore" },
);
const require = createRequire(import.meta.url);
const { QUESTIONS, provenanceBadge } = require(join(OUT, "lib/data.js"));
const conceptItem = QUESTIONS.find((q) => q.sourceKind === "concept-extracted");
check("concept-extracted item exists for the Urdu badge check", !!conceptItem);
const urBadge = provenanceBadge(conceptItem, "ur");
const srcName = (conceptItem.source ?? "").replace(/^Original content — concept-extracted from\s*/, "").trim();
check(
  "provenance badge (ur) uses the Urdu label + keeps the source name",
  urBadge !== null && urBadge.label === "تصور سے اخذ شدہ" && urBadge.detail.includes(srcName),
  JSON.stringify(urBadge),
);
const enBadge = provenanceBadge(conceptItem, "en");
check(
  "provenance badge (en) unchanged",
  enBadge !== null && enBadge.label === "Concept-extracted" && enBadge.detail.includes(srcName),
  JSON.stringify(enBadge),
);
const legacyItem = QUESTIONS.find((q) => !q.sourceKind);
check("legacy item gets no badge in ur either", provenanceBadge(legacyItem, "ur") === null);
const clauseItem = { ...conceptItem, syllabusClause: "TT Islamiyat 30" };
const clauseBadge = provenanceBadge(clauseItem, "ur");
check(
  "provenance badge (ur) clause prefix translated",
  clauseBadge !== null && clauseBadge.detail.includes("نصاب حوالہ:") && clauseBadge.detail.includes("TT Islamiyat 30"),
  JSON.stringify(clauseBadge),
);

console.log(failures === 0 ? `\nAll i18n tests passed.` : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
