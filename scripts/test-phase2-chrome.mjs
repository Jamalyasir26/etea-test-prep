// Phase 2 chrome tests — every remaining English surface in
// Urdu/Roman mode: badge-helper Roman variants, count fragments,
// the retries plural hack, language-aware dates, and API error
// codes. Plain node, no dependencies. Run:
// node scripts/test-phase2-chrome.mjs (exit 0 = all pass). Locks:
//  - provenanceBadge / reviewStatusBadge / topicBadge /
//    trackConfidenceBadge: Roman branches return Roman Urdu
//    labels/details with the SAME tones as en/ur; source names and
//    the `conf` string stay verbatim in every language;
//  - localizedScoringLabel + gradeButtonLabel + formatFsrsInterval:
//    Roman variants pinned;
//  - format.ts: explicit Intl locales (ur-PK month names in Urdu;
//    Latin digits in English/Roman), local-date parsing, garbage
//    fallback;
//  - fragments: no `} of {` / `} Q` literals remain in render files;
//    ofCount/questionsShort keys exist with matching placeholders;
//    no `{plural}` hack remains; singular/plural retry keys exist;
//  - API codes: every `code:` in the 4 routes is in API_ERROR_KEYS;
//    both clients render through apiErrorText; the `error` string is
//    still present for backward compatibility;
//  - Roman sweep residual: exactly the 35 documented keep-list keys
//    still have roman === en (borrowings/codes/names whose Urdu
//    counterparts are themselves transliterations);
//  - date call sites: no toLocaleString() in src; toLocaleDateString
//    with an undefined locale only at the two documented en-default
//    paths (fsrs.ts, plan.ts).
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

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
const read = (p) => fs.readFileSync(join(ROOT, p), "utf8");

// ---- §1 real helpers (compiled data.ts + type-stripped modules) ----
const OUT = "/tmp/phase2-chrome-data";
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
check(
  "tsc harness: no unexpected type errors (TS5097 extension import only)",
  tscErrors.every((l) => l.includes("TS5097")),
  tscDiag.slice(0, 300),
);
const trackingJs = join(OUT, "lib/tracking.js");
if (fs.existsSync(trackingJs)) {
  fs.writeFileSync(trackingJs, fs.readFileSync(trackingJs, "utf8").replace('require("./fsrs.ts")', 'require("./fsrs")'));
}
execSync(`ln -sfn ${join(ROOT, "node_modules")} ${join(OUT, "node_modules")}`, { stdio: "ignore" });
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const scoring = await import("../src/lib/scoring.ts");
const tracking = await import("../src/lib/tracking.ts");
const fsrs = await import("../src/lib/fsrs.ts");
const format = await import("../src/lib/format.ts");

// ---- §2 badge helpers: Roman branches ----
const conceptItem = {
  source: "Original content — concept-extracted from Standard Test Source",
  sourceKind: "concept-extracted",
  syllabusClause: "Clause 1.2",
};
const pbEn = data.provenanceBadge(conceptItem, "en");
const pbRo = data.provenanceBadge(conceptItem, "roman");
const pbUr = data.provenanceBadge(conceptItem, "ur");
check("provenanceBadge roman: label is Roman Urdu", pbRo.label === "Tasawwur se akhaz shuda", pbRo.label);
check("provenanceBadge roman: tone matches en/ur", pbRo.tone === pbEn.tone && pbRo.tone === pbUr.tone);
check(
  "provenanceBadge roman: source name + clause stay verbatim",
  pbRo.detail.includes("Standard Test Source") && pbRo.detail.includes("Clause 1.2"),
  pbRo.detail,
);
for (const kind of ["official", "proxy", "partial"]) {
  const item = { source: "X", sourceKind: kind };
  const en = data.provenanceBadge(item, "en");
  const ro = data.provenanceBadge(item, "roman");
  check(
    `provenanceBadge roman: ${kind} label differs from en, tone matches`,
    ro && ro.label !== en.label && ro.tone === en.tone,
    ro?.label,
  );
}
check("provenanceBadge roman: no kind returns null", data.provenanceBadge({ sourceKind: "official" }, "roman") !== null);
check("provenanceBadge roman: legacy item still gets no badge", data.provenanceBadge({}, "roman") === null);

const STATUSES = ["owner-reviewed", "approved", "needs-review", "disputed", "draft", ""];
const ROMAN_STATUS_LABELS = {
  "owner-reviewed": "Malik se jaiza shuda",
  approved: "Manzoor shuda",
  "needs-review": "Jaiza darkar",
  disputed: "Mutanaza",
  draft: "Masooda",
  "": "Masooda",
};
for (const s of STATUSES) {
  const en = data.reviewStatusBadge(s, "en");
  const ro = data.reviewStatusBadge(s, "roman");
  check(
    `reviewStatusBadge roman: '${s || "(empty)"}' label pinned, tone matches en`,
    ro.label === ROMAN_STATUS_LABELS[s] && ro.tone === en.tone,
    `${ro.label} / ${ro.tone}`,
  );
}
check(
  "reviewStatusBadge roman: unknown status maps to Namaloom/unknown, never a trusted tone",
  data.reviewStatusBadge("bogus", "roman").label === "Namaloom" &&
    data.reviewStatusBadge("bogus", "roman").tone === "unknown",
);

const ORIG_LABEL = "Original practice question based on past-paper topics — not the actual paper";
const REWORDED_LABEL = "Same concept as a past-paper question, reworded in a different style — not the actual paper";
check(
  "topicBadge roman: original disclosure is Roman Urdu, tone topic",
  data.topicBadge(ORIG_LABEL, "roman").detail.includes("asal parcha nahi") &&
    data.topicBadge(ORIG_LABEL, "roman").label.includes("Mauzu se mutasir") &&
    data.topicBadge(ORIG_LABEL, "roman").tone === "topic",
  data.topicBadge(ORIG_LABEL, "roman").detail,
);
check(
  "topicBadge roman: reworded label names the rewording",
  data.topicBadge(REWORDED_LABEL, "roman").label.includes("Dobara likha gaya"),
);
check("topicBadge roman: null ref returns null", data.topicBadge(null, "roman") === null);

for (const [conf, tone] of [
  ["JOB-SITE claim", "unknown"],
  ["Confirmed pattern, NOT VERIFIED qualification", "partial"],
  ["ETEA PDF 453", "official"],
]) {
  const ro = data.trackConfidenceBadge(conf, "roman");
  check(
    `trackConfidenceBadge roman: label stays verbatim, tone ${tone}`,
    ro.label === conf && ro.tone === tone,
    `${ro.label} / ${ro.tone}`,
  );
}
check(
  "trackConfidenceBadge roman: detail is Roman Urdu",
  data.trackConfidenceBadge("ETEA PDF 453", "roman").detail.includes("tasdeeq"),
);

// ---- §3 scoring / grades / intervals ----
check(
  "localizedScoringLabel roman: zero-penalty default pinned",
  scoring.localizedScoringLabel(scoring.DEFAULT_SCORING, "roman") ===
    "1 number fi durust jawab · koi katoti nahi (policy namaloom)",
  scoring.localizedScoringLabel(scoring.DEFAULT_SCORING, "roman"),
);
check(
  "localizedScoringLabel roman: penalty config pinned",
  scoring
    .localizedScoringLabel({ ...scoring.DEFAULT_SCORING, wrongPenalty: 0.25, policyStatus: "unverified-assumption" }, "roman")
    .includes("har ghalat jawab par 0.25 katoti") &&
    scoring
      .localizedScoringLabel({ ...scoring.DEFAULT_SCORING, wrongPenalty: 0.25, policyStatus: "unverified-assumption" }, "roman")
      .includes("ghair musaddiqa mafrooza"),
);
const ROMAN_GRADES = { again: "Dobara", hard: "Mushkil", good: "Achha", easy: "Asan" };
for (const [g, name] of Object.entries(ROMAN_GRADES)) {
  check(
    `gradeButtonLabel roman: ${g} -> ${name}`,
    tracking.gradeButtonLabel(g, "3 din", "roman") === `${name} — 3 din`,
    tracking.gradeButtonLabel(g, "3 din", "roman"),
  );
}
const DAY = 86_400_000;
check("formatFsrsInterval roman: 10m", fsrs.formatFsrsInterval(600_000, "roman") === "10 minute");
check("formatFsrsInterval roman: 1h", fsrs.formatFsrsInterval(3_600_000, "roman") === "1 ghante");
check("formatFsrsInterval roman: 1d", fsrs.formatFsrsInterval(DAY, "roman") === "1 din");
check("formatFsrsInterval roman: 45d", fsrs.formatFsrsInterval(45 * DAY, "roman") === "1.5 mah");
check("formatFsrsInterval roman: 400d", fsrs.formatFsrsInterval(400 * DAY, "roman") === "1.1 saal");
check(
  "formatLocalDueDate: ur renders an Urdu month name, en keeps the old shape",
  /[\u0600-\u06FF]/.test(fsrs.formatLocalDueDate("2026-11-17T12:00:00.000Z", "ur")) &&
    fsrs.formatLocalDueDate("2026-11-17T12:00:00.000Z", "en").includes("Nov"),
  `${fsrs.formatLocalDueDate("2026-11-17T12:00:00.000Z", "ur")} / ${fsrs.formatLocalDueDate("2026-11-17T12:00:00.000Z", "en")}`,
);
check("formatLocalDueDate: garbage falls back to the raw string", fsrs.formatLocalDueDate("not-a-date", "ur") === "not-a-date");

// ---- §4 format.ts ----
check("format: locales pinned", format.appDateLocale("en") === "en-US" && format.appDateLocale("roman") === "en-US" && format.appDateLocale("ur") === "ur-PK");
const sampleDate = new Date(2026, 10, 17, 12, 0, 0);
check(
  "format: ur date carries an Urdu month name; en/roman carry Nov",
  /[\u0600-\u06FF]/.test(format.formatAppDate(sampleDate, "ur")) &&
    format.formatAppDate(sampleDate, "en").includes("Nov") &&
    format.formatAppDate(sampleDate, "roman").includes("Nov"),
  `${format.formatAppDate(sampleDate, "ur")} / ${format.formatAppDate(sampleDate, "roman")}`,
);
check(
  "format: bare yyyy-mm-dd key parses as a LOCAL date (never the previous day)",
  (() => {
    const d = format.parseLocalDateKey("2026-11-13");
    return d && d.getFullYear() === 2026 && d.getMonth() === 10 && d.getDate() === 13;
  })(),
);
check("format: malformed keys return null", format.parseLocalDateKey("2026-13-40") === null && format.parseLocalDateKey("hello") === null);
check(
  "format: formatStoredDate renders a bare key in Urdu mode",
  /[\u0600-\u06FF]/.test(format.formatStoredDate("2026-11-17", "ur")),
);
check(
  "format: formatStoredDate falls back to the raw slice for garbage",
  format.formatStoredDate("garbage-value", "en") === "garbage-va",
);
check(
  "format: formatAppDateTime differs by locale (ur carries Urdu script)",
  /[\u0600-\u06FF]/.test(format.formatAppDateTime(sampleDate, "ur")),
);

// ---- §5 i18n keys: fragments, retries, api errors ----
// Minimal STRINGS parser (same approach as test-i18n.mjs): entries are
// `key: { en: "...", roman: "...", ur: "..." }`, possibly multiline.
const i18nSrc = read("src/lib/i18n.tsx");
function parseStrings(src) {
  const start = src.indexOf("const STRINGS");
  // Bound the scan to the STRINGS object literal: entries end with
  // "}," while the object itself ends with a bare "};" line.
  const end = src.indexOf("\n};", start);
  const region = end === -1 ? src.slice(start) : src.slice(start, end);
  const entries = {};
  let i = 0;
  while (true) {
    const km = region.slice(i).match(/^  ([A-Za-z0-9_]+): \{/m);
    if (!km) break;
    const keyStart = i + km.index;
    const key = km[1];
    let j = keyStart + km[0].length;
    let depth = 1;
    let body = "";
    while (j < region.length && depth > 0) {
      const ch = region[j];
      if (ch === '"') {
        body += ch;
        j++;
        while (j < region.length) {
          body += region[j];
          if (region[j] === "\\") { body += region[j + 1] || ""; j += 2; continue; }
          if (region[j] === '"') { j++; break; }
          j++;
        }
        continue;
      }
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      if (depth > 0) body += ch;
      j++;
    }
    const get = (k) => {
      const m = body.match(new RegExp(k + ':\\s*"((?:[^"\\\\]|\\\\.)*)"'));
      return m ? JSON.parse(`"${m[1]}"`) : null;
    };
    const entry = { en: get("en"), roman: get("roman"), ur: get("ur") };
    // Skip non-entry matches (e.g. function parameters shaped like an
    // object literal): a real entry has all three language strings.
    if (entry.en !== null && entry.roman !== null && entry.ur !== null) entries[key] = entry;
    i = j;
  }
  return entries;
}
const STRINGS = parseStrings(i18nSrc);
const placeholders = (s) => new Set([...(s.match(/\{[A-Za-z0-9_]+\}/g) || [])]);
check("chrome: ofCount key exists with {a}/{b} in all 3 languages", ["en", "roman", "ur"].every((l) => {
  const p = placeholders(STRINGS.ofCount?.[l] ?? "");
  return p.has("{a}") && p.has("{b}");
}));
check("chrome: ofCount wordings pinned", STRINGS.ofCount.en === "{a} of {b}" && STRINGS.ofCount.roman === "{b} mein se {a}" && STRINGS.ofCount.ur === "{b} میں سے {a}");
check("chrome: questionsShort key exists with {n} in all 3 languages", ["en", "roman", "ur"].every((l) => placeholders(STRINGS.questionsShort?.[l] ?? "").has("{n}")));
check("chrome: questionsShort wordings pinned", STRINGS.questionsShort.en === "{n} Q" && STRINGS.questionsShort.roman === "{n} sawalat" && STRINGS.questionsShort.ur === "{n} سوالات");
check("chrome: no {plural} hack remains in STRINGS", !i18nSrc.includes("{plural}"));
check(
  "chrome: singular/plural retry keys exist, no plural var",
  Boolean(STRINGS.retriesCountedOne && STRINGS.retriesNotCountedOne) &&
    placeholders(STRINGS.retriesCounted.en).has("{n}") &&
    !JSON.stringify(STRINGS.retriesCounted).includes("plural"),
);
for (const k of [
  "apiErrSameOrigin", "apiErrEmptyQuestion", "apiErrQuestionTooLong", "apiErrRateDaily",
  "apiErrRateMinute", "apiErrQuestionNotFound", "apiErrExplainFailed", "apiErrPlanFailed", "apiErrTutorFailed",
]) {
  check(
    `chrome: ${k} exists in all 3 languages`,
    ["en", "roman", "ur"].every((l) => typeof STRINGS[k]?.[l] === "string" && STRINGS[k][l].trim().length > 0),
  );
}

// ---- §6 Roman sweep residual: exactly the documented keep-list ----
const KEEP_LIST = [
  "cardLabel", "citationNoteLabel", "filterTrackLabel", "filtersHeading", "flagsFromMock",
  "flashcards", "home", "issueReasonTypo", "ledgerMocksLabel", "ledgerSubjectCounts",
  "library", "libraryTitle", "mockFilterATB", "mockFilterLabel", "mockFilterQariB",
  "mockFilterTTB", "mockFilterZam1", "mockFilterZam2", "mockFilterZam3", "mockModeGroup",
  "mockWord", "mocks", "mocksCount", "modeWord", "offlineMcqLabel", "offlineNoteLabel",
  "passWord", "patternHeading", "prestartPatternLabel", "pwaOfflineBadge", "quranPlayerLabel",
  "scoringDefaultOption", "sessionLabel", "structuralPass", "tracks",
];
const residual = Object.entries(STRINGS)
  .filter(([, v]) => v.roman === v.en)
  .map(([k]) => k)
  .sort();
check(
  "chrome: roman===en residual is exactly the 35-key documented keep-list",
  JSON.stringify(residual) === JSON.stringify([...KEEP_LIST].sort()),
  `extra: ${residual.filter((k) => !KEEP_LIST.includes(k)).join(",")} | missing: ${KEEP_LIST.filter((k) => !residual.includes(k)).join(",")}`,
);

// ---- §7 fragment + date call-site greps ----
function walk(dir, ext) {
  const out = [];
  for (const e of fs.readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, ext));
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out;
}
const renderFiles = [...walk("src/app", ".tsx"), ...walk("src/components", ".tsx")];
const stripComments = (s) => s.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
let ofLiterals = [];
let qLiterals = [];
for (const f of renderFiles) {
  const code = stripComments(read(f));
  if (/\}\s+of\s+\{/.test(code)) ofLiterals.push(f);
  if (/\{\w[\w.()]*\}\s+Q\b/.test(code) || /\(\{[^}]*\}\s+Q\)/.test(code)) qLiterals.push(f);
}
check("chrome: no hardcoded '} of {' counter literals in render files", ofLiterals.length === 0, ofLiterals.join(","));
check("chrome: no hardcoded '} Q' literals in render files", qLiterals.length === 0, qLiterals.join(","));
const libFiles = [...walk("src/lib", ".ts"), ...walk("src/app", ".tsx")];
const localeStringSites = libFiles.filter((f) => stripComments(read(f)).includes(".toLocaleString()"));
check("chrome: no .toLocaleString() call sites remain", localeStringSites.length === 0, localeStringSites.join(","));
const undefLocaleSites = libFiles.filter((f) => stripComments(read(f)).includes("toLocaleDateString(undefined"));
check(
  "chrome: toLocaleDateString(undefined) only at the two documented en-default paths",
  JSON.stringify(undefLocaleSites.sort()) === JSON.stringify(["src/lib/fsrs.ts", "src/lib/plan.ts"].sort()),
  undefLocaleSites.join(","),
);

// ---- §8 API error codes ----
const routeFiles = [
  "src/app/api/tutor/route.ts",
  "src/app/api/explain/route.ts",
  "src/app/api/plan/route.ts",
  "src/app/api/tutor/health/route.ts",
];
const routeCodes = new Set();
for (const f of routeFiles) {
  const src = read(f);
  for (const m of src.matchAll(/code:\s*"([a-z_]+)"/g)) routeCodes.add(m[1]);
  if (src.includes("code: rl.code")) {
    routeCodes.add("rate_daily");
    routeCodes.add("rate_minute");
  }
  check(`${f}: every error response still carries the error string`, !/NextResponse\.json\(\{\s*code:/.test(src));
}
// API_ERROR_KEYS parsed from i18n.tsx source.
const mapBody = i18nSrc.slice(i18nSrc.indexOf("API_ERROR_KEYS"));
const mappedCodes = new Set([...mapBody.matchAll(/^\s{2}([a-z_]+):\s*"apiErr[A-Za-z]+"/gm)].map((m) => m[1]));
check(
  "chrome: every route error code has an API_ERROR_KEYS entry",
  [...routeCodes].every((c) => mappedCodes.has(c)),
  [...routeCodes].filter((c) => !mappedCodes.has(c)).join(","),
);
check(
  "chrome: rateLimitOk returns codes (ai.ts)",
  read("src/lib/ai.ts").includes('code: "rate_daily"') && read("src/lib/ai.ts").includes('code: "rate_minute"'),
);
check(
  "chrome: tutor page renders API errors through apiErrorText",
  read("src/app/tutor/page.tsx").includes('apiErrorText(j, t, "liveUnavailable")') &&
    read("src/app/tutor/page.tsx").includes('apiErrorText(j, t, "explainError")'),
);
check(
  "chrome: plan page renders API errors through apiErrorText",
  read("src/app/plan/page.tsx").includes('apiErrorText(j, t, "planError")'),
);
check(
  "chrome: no client still renders a raw j.error for these routes",
  !read("src/app/tutor/page.tsx").includes("j.error ??") && !read("src/app/plan/page.tsx").includes("j.error ??"),
);

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll Phase 2 chrome checks passed.");
