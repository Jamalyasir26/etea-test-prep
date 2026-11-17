// Phase 1 IT tests — bank grown 60 -> 500 MCQs (ITC-061..ITC-500),
// each trilingual at creation (English + Urdu script + Roman Urdu).
// Plain node, no dependencies. Run: node scripts/test-phase1-it.mjs
// (exit 0 = all pass). Locks:
//  - 500 items, ID sequence complete, file order == ID order;
//  - existing 60 untouched (IDs, sources, and the first 30's
//    explanationEn pattern pinned; byte-identity is locked by
//    test-lazy-banks.mjs);
//  - new items: exact 23-key schema, all-6-fields completeness, fixed
//    fields (draft/unverified, reviewedBy/reviewedAt null), honest
//    concept-extracted source labels, NO explanationEn/explanationLang /
//    sourceNote (the standard convention — the original 60's patterns
//    are pinned by test-stage5f.mjs rescoped to the original 60);
//  - dedupe: normalized question text unique across all 500, and the
//    qa-540 first-12-words stem rule holds across all active banks;
//  - one correct answer + explanation present in all 3 languages;
//  - correctIndex distribution on NEW items only (the existing 60 are
//    never touched);
//  - honorific audit (zero Latin abbreviations) + script audits (no
//    Urdu/Arabic script in English or _roman fields; _ur question +
//    explanation carry Urdu script; Urdu yeh/kaf codepoints; repeated
//    script forms byte-identical) + digit preservation + F02 guard
//    (English explanations carry <2 Roman-Urdu detector hits) +
//    technical-token option convention (shortcuts/extensions/tags/
//    addresses/acronym-lists byte-identical across languages; _ur
//    options otherwise follow the established IT convention — technical
//    terms stay Latin, ITC-031..060 precedent, so NO Urdu-script
//    requirement on _ur options) + numeric distinctness + banned-symbol
//    audit + nastaliq audit;
//  - topic coverage matches the §3.12 map (report.md) fill plan, with the
//    existing 60 classified by content via the embedded ID map;
//  - manifest counts match the bank; no other bank touched; fixed
//    ZamungKor mock ID lists still resolve and stay disjoint.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BANKS_DIR = join(ROOT, "src/data/banks");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

let failures = 0;
function check(name, cond, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
}

const AR = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const AR_RUN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;
const ARABIC_YEH_KAF = /[\u064A\u0643]/;
const ABBR = /\(S\.?A\.?W\.?\)|\(P\.?B\.?U\.?H\.?\)|\(R\.?A\.?\)|\(A\.?S\.?\)/i;
const NON_ASCII_SYM = /[√π°²³×÷≤≥•]/;
const KEYS = ["id", "question_ur", "question_roman", "options_ur", "options_roman", "explanation_ur", "explanation_roman", "post", "subject", "subjectKey", "topic", "question", "options", "correctIndex", "explanation", "explanationUrdu", "difficulty", "pastPaperRef", "verified", "source", "reviewStatus", "reviewedBy", "reviewedAt"];
const FORBIDDEN = ["explanationLang", "explanationEn", "conceptId", "syllabusClause", "sourceKind", "sourceNote"];
const POSTS = ["ctit", "junior-clerk", "computer-operator", "lhv"];
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const digs = (s) => (s.match(/[0-9]/g) || []).sort().join(",");
const runs = (s) => (s.match(AR_RUN) || []).filter((r) => r.trim().length > 0);
// F02 detector: same strict function-word list as test-step3b-audit2.mjs.
const RU = new Set("ki ka ke hai hain ho hun hum se mein ko nahi hota hoti hote jata jati gaya gayi tha thi thay yeh woh aur bhi jo aik ek diya kiya raha rahi rahe jab kyun kaise kahan lekin magar phir sirf bohat zyada liye bina kehte kaha kehlata kehlati sakta sakti chahiye wala wali walay hoga hogi honge karein karna hona jana ana karke hokar rehta rehti rehte ne hua hui hue thin aayi aaye nazil paida bani bana mukammal pehle pehli dusre dusri aakhri".split(" "));
const ruHits = (s) => s.toLowerCase().replace(/[^a-z\s']/g, " ").split(/\s+/).filter((w) => RU.has(w)).length;
// Numeric option parsing: strip units, parse integer/decimal/fraction/mixed + optional %.
function parseNumeric(opt) {
  let s_pct = false;
  let s = opt.trim().replace(/^Rs\.\s*/i, "");
  if (s.endsWith("%")) { s_pct = true; s = s.slice(0, -1).trim(); }
  s = s.replace(/\s*(sq cm|cubic cm|cm|km|kg|litres|litre|years|year|hours|hour|minutes|minute|seconds|second|days|day|weeks|week|months|month|degrees|degree|g|m)$/i, "").trim();
  let v = null;
  let m = s.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (m) { const w = Number(m[1]), n = Number(m[2]), d = Number(m[3]); if (d !== 0) v = (w < 0 ? w - n / d : w + n / d); }
  else if ((m = s.match(/^(-?\d+)\/(\d+)$/))) { if (Number(m[2]) !== 0) v = Number(m[1]) / Number(m[2]); }
  else if (/^-?\d+(\.\d+)?$/.test(s)) v = Number(s);
  if (v === null) return null;
  return s_pct ? v / 100 : v;
}
function isNumericOption(opt) { return parseNumeric(opt) !== null; }
// Verbatim convention for this bank (brief rule): options made of digits
// and symbols ONLY stay byte-identical in both languages, as do
// formula-like options (letters/digits/parens only, at least one digit,
// no spaces) and technical-token options (shortcuts, extensions, tags,
// addresses/paths, code tokens, acronym/number lists). Descriptive word
// options follow the established IT convention (technical terms stay
// Latin in _ur, ITC-031..060 precedent) and carry NO script requirement.
const PURE_EXPR = /^[\d\s\/\.\+\-=\%\(\)xX\:\^\u2212,]+$/;
const FORMULA = /^(?=.*\d)[A-Za-z0-9()]+$/;
function isTechVerbatim(opt) {
  const t = opt.trim();
  if (PURE_EXPR.test(t) || FORMULA.test(t)) return true;
  const nospace = t.replace(/\s+/g, "");
  if (/[+.<>\/\\@#:;=\-_()\[\]{}]/.test(nospace) && /^[A-Za-z0-9+.<>\/\\@#:;=\-_()\[\]{}%]+$/.test(nospace)) return true;
  if (/^([A-Z]{1,6}|\d+)(,\s*([A-Z]{1,6}|\d+))*$/.test(t)) return true;
  return false;
}

const bank = JSON.parse(read("src/data/banks/it.json"));
const existing = bank.slice(0, 60);
const news = bank.slice(60);

// ---------- §1 shape + ID sequence ----------
check("Phase1 it bank is 500 items", bank.length === 500, `got ${bank.length}`);
const expectIds = Array.from({ length: 500 }, (_, i) => "ITC-" + String(i + 1).padStart(3, "0"));
check("Phase1 IDs are exactly ITC-001..ITC-500 in file order",
  JSON.stringify(bank.map((q) => q.id)) === JSON.stringify(expectIds));
check("Phase1 existing 60 keep their IDs in place",
  JSON.stringify(existing.map((q) => q.id)) === JSON.stringify(expectIds.slice(0, 60)));
check("Phase1 new items are ITC-061..ITC-500",
  news.length === 440 && news[0].id === "ITC-061" && news[439].id === "ITC-500");
check("Phase1 existing 60 keep sources + first-30 explanationEn pattern",
  existing.slice(0, 30).every((q) => q.source === "ai-generated" && q.explanationEn) &&
  existing.slice(30, 60).every((q) => q.source === "Original content — concept-extracted from Standard Computer Fundamentals Curriculum" && !q.explanationEn),
  existing.filter((q, i) => (i < 30 ? q.source !== "ai-generated" || !q.explanationEn : q.source !== "Original content — concept-extracted from Standard Computer Fundamentals Curriculum" || q.explanationEn)).map((q) => q.id).slice(0, 5).join(", "));

// ---------- §2 new-item schema + fixed fields + completeness ----------
let bad = [];
for (const q of news) {
  if (JSON.stringify(Object.keys(q)) !== JSON.stringify(KEYS)) bad.push(q.id + ":keys");
  for (const k of FORBIDDEN) if (k in q) bad.push(q.id + ":forbidden:" + k);
  if (JSON.stringify(q.post) !== JSON.stringify(POSTS)) bad.push(q.id + ":post");
  if (q.subject !== "IT" || q.subjectKey !== "it") bad.push(q.id + ":subject");
  if (q.difficulty !== "medium" || q.pastPaperRef !== null || q.explanationUrdu !== null) bad.push(q.id + ":fixed");
  if (q.verified !== false || q.reviewStatus !== "draft") bad.push(q.id + ":status");
  if (q.reviewedBy !== null || q.reviewedAt !== null) bad.push(q.id + ":reviewed");
  if (!q.source.startsWith("Original — concept-extracted from ")) bad.push(q.id + ":source");
  for (const f of ["question", "question_ur", "question_roman", "explanation", "explanation_ur", "explanation_roman"])
    if (typeof q[f] !== "string" || q[f].trim() === "") bad.push(q.id + ":empty:" + f);
  for (const f of ["options", "options_ur", "options_roman"]) {
    if (!Array.isArray(q[f]) || q[f].length !== 4 || q[f].some((o) => typeof o !== "string" || o.trim() === "")) bad.push(q.id + ":opts:" + f);
    else if (new Set(q[f].map((o) => o.trim().toLowerCase())).size !== 4) bad.push(q.id + ":dup-opts:" + f);
  }
  if (!(q.correctIndex >= 0 && q.correctIndex <= 3 && Number.isInteger(q.correctIndex))) bad.push(q.id + ":ci");
}
check("Phase1 new items: exact 23-key schema, fixed fields, all-6-fields, 4 distinct options",
  bad.length === 0, bad.slice(0, 8).join(", "));

// ---------- §3 dedupe ----------
{
  const seen = new Map();
  const dups = [];
  for (const q of bank) {
    const n = norm(q.question);
    if (seen.has(n)) dups.push(`${seen.get(n)}/${q.id}`);
    else seen.set(n, q.id);
  }
  check("Phase1 no duplicate normalized question text across all 500", dups.length === 0, dups.slice(0, 5).join(", "));
}
{
  // qa-540 stem rule, all active banks: shared first 12 words.
  const groups = new Map();
  for (const f of readdirSync(BANKS_DIR).filter((x) => x.endsWith(".json")).sort()) {
    const key = f.replace(/\.json$/, "");
    if (key === "drawing_pe") continue;
    for (const it of JSON.parse(read(`src/data/banks/${f}`))) {
      const stem = norm(it.question).split(" ").slice(0, 12).join(" ");
      if (!groups.has(stem)) groups.set(stem, []);
      groups.get(stem).push(it.id);
    }
  }
  const dupGroups = [...groups.entries()].filter(([, ids]) => ids.length > 1);
  check("Phase1 qa-540 stem rule holds across all active banks", dupGroups.length === 0,
    dupGroups.slice(0, 3).map(([s, ids]) => `"${s}" -> ${ids.join(",")}`).join(" ; "));
}

// ---------- §4 correctIndex distribution (new items only) ----------
{
  const dist = [0, 1, 2, 3].map((i) => news.filter((q) => q.correctIndex === i).length);
  const pct = dist.map((n) => n / news.length);
  check("Phase1 new-item correctIndex distribution: each position 20–30%",
    pct.every((p) => p >= 0.2 && p <= 0.3), `dist ${dist.join("/")} (${pct.map((p) => (p * 100).toFixed(1)).join("/")}%)`);
}

// ---------- §5 honorific / script / digit / F02 / technical-token audits (new items) ----------
{
  const abbr = news.filter((q) => ABBR.test(JSON.stringify(q))).map((q) => q.id);
  check("Phase1 new items: zero Latin honorific abbreviations", abbr.length === 0, abbr.slice(0, 5).join(", "));
  const symBad = news.filter((q) => NON_ASCII_SYM.test(JSON.stringify(q))).map((q) => q.id);
  check("Phase1 new items: no banned non-ASCII symbols (√ π ° ² ³ × ÷ ≤ ≥ •)", symBad.length === 0, symBad.slice(0, 5).join(", "));
  const nastaliqBad = news.filter((q) => /nastaliq/i.test(JSON.stringify(q))).map((q) => q.id);
  check("Phase1 new items: no 'nastaliq' string (test-fonts rule)", nastaliqBad.length === 0, nastaliqBad.slice(0, 5).join(", "));
  const enScript = [];
  for (const q of news) for (const f of [q.question, ...q.options, q.explanation]) if (AR.test(f)) enScript.push(q.id);
  check("Phase1 new items: EN fields contain no Urdu/Arabic script", enScript.length === 0, [...new Set(enScript)].slice(0, 5).join(", "));
  const romanScript = [];
  for (const q of news) for (const f of [q.question_roman, ...q.options_roman, q.explanation_roman]) if (AR.test(f)) romanScript.push(q.id);
  check("Phase1 new items: _roman fields contain no Urdu/Arabic script", romanScript.length === 0, [...new Set(romanScript)].slice(0, 5).join(", "));
  const urNoScript = news.filter((q) => !AR.test(q.question_ur) || !AR.test(q.explanation_ur)).map((q) => q.id);
  check("Phase1 new items: _ur question + explanation carry Urdu script", urNoScript.length === 0, urNoScript.slice(0, 5).join(", "));
  const yehKaf = [];
  for (const q of news) for (const f of [q.question_ur, ...q.options_ur, q.explanation_ur]) if (ARABIC_YEH_KAF.test(f)) yehKaf.push(q.id);
  check("Phase1 new items: _ur fields use Urdu yeh/kaf (no Arabic U+064A/U+0643)", yehKaf.length === 0, [...new Set(yehKaf)].slice(0, 5).join(", "));
  const formBad = [];
  for (const q of news) {
    const byNorm = new Map();
    for (const f of [q.question_ur, ...q.options_ur, q.explanation_ur]) {
      for (const r of runs(f)) {
        const n = r.normalize("NFKC");
        if (byNorm.has(n) && byNorm.get(n) !== r) formBad.push(q.id);
        else byNorm.set(n, r);
      }
    }
  }
  check("Phase1 new items: repeated Urdu script forms byte-identical within each item", formBad.length === 0, [...new Set(formBad)].slice(0, 5).join(", "));
  const digBad = [];
  for (const q of news) {
    if (digs(q.question) !== digs(q.question_ur) || digs(q.question) !== digs(q.question_roman)) digBad.push(q.id + ":q");
    q.options.forEach((o, j) => { if (digs(o) !== digs(q.options_ur[j]) || digs(o) !== digs(q.options_roman[j])) digBad.push(q.id + ":opt" + j); });
    if (digs(q.explanation) !== digs(q.explanation_ur) || digs(q.explanation) !== digs(q.explanation_roman)) digBad.push(q.id + ":expl");
  }
  check("Phase1 new items: digits preserved across all 3 languages", digBad.length === 0, digBad.slice(0, 5).join(", "));
  const guardBad = news.filter((q) => ruHits(q.explanation) >= 2).map((q) => `${q.id}(${ruHits(q.explanation)})`);
  check("Phase1 new items: F02 guard — English explanations have <2 Roman-Urdu detector hits", guardBad.length === 0, guardBad.slice(0, 5).join(", "));
  const techBad = [];
  for (const q of news) {
    q.options.forEach((o, j) => {
      if (isTechVerbatim(o)) {
        if (q.options_ur[j] !== o) techBad.push(q.id + ":ur-opt" + j);
        if (q.options_roman[j] !== o) techBad.push(q.id + ":roman-opt" + j);
      }
    });
  }
  check("Phase1 new items: technical-token options byte-identical across languages (shortcuts/extensions/tags/addresses/lists)", techBad.length === 0, techBad.slice(0, 5).join(", "));
  const numDup = [];
  for (const q of news) {
    const vals = q.options.map(parseNumeric);
    if (vals.every((v) => v !== null)) {
      const seen = new Set();
      vals.forEach((v, j) => { const k = v.toFixed(9); if (seen.has(k)) numDup.push(q.id + ":opt" + j); seen.add(k); });
    }
  }
  check("Phase1 new items: all-numeric option sets are numerically distinct", numDup.length === 0, numDup.slice(0, 5).join(", "));
  // Standard convention: translations are real translations, never
  // verbatim copies of the English explanation.
  const verbatim = news.filter((q) => q.explanation_roman === q.explanation || q.explanation_ur === q.explanation).map((q) => q.id);
  check("Phase1 new items: explanations are translated, not verbatim copies", verbatim.length === 0, verbatim.slice(0, 5).join(", "));
}

// ---------- §6 topic coverage vs the §3.12 map ----------
// Existing 60 classified by content (stored topic labels are "IT" for
// ITC-001..030 and the Phase 4 labels for ITC-031..060):
// Fundamentals 001 (CPU brain), 004 (input device), 005 (mouse),
// 006 (output device), 036 (inkjet), 037 (laser), 038 (scanner),
// 039 (monitor/VDU), 040 (USB); NumberSystems 008 (bits in byte);
// MemoryStorage 002 (RAM), 003 (ROM), 007 (hard disk), 009 (KB),
// 010 (largest unit), 041 (SSD), 042 (CD laser), 043 (unit order),
// 044 (MB in GB); OS 021 (OS example), 031 (OS job), 032 (GUI),
// 033 (Recycle Bin), 034 (system software), 035 (Word = application);
// MSOffice 011/012/013 (extensions), 014-020 (shortcuts), 022/023/024
// (Excel SUM/= /cell), 025 (slide), 045/046/047 (Word shortcuts),
// 048 (Save As), 049/050/051/052 (Excel), 053 (F5); Networks 026 (WWW),
// 027 (browser), 028 (@), 029 (search engine), 054 (URL), 055 (HTTPS),
// 056 (CC), 057 (downloading); Security 030 (antivirus), 058 (password),
// 059 (phishing), 060 (backup). Programming, Databases, Emerging,
// Troubleshooting: none of the original 60.
const EXISTING_MAP = {};
for (const i of [1, 4, 5, 6, 36, 37, 38, 39, 40]) EXISTING_MAP["ITC-" + String(i).padStart(3, "0")] = "Fundamentals";
EXISTING_MAP["ITC-008"] = "NumberSystems";
for (const i of [2, 3, 7, 9, 10, 41, 42, 43, 44]) EXISTING_MAP["ITC-" + String(i).padStart(3, "0")] = "MemoryStorage";
for (const i of [21, 31, 32, 33, 34, 35]) EXISTING_MAP["ITC-" + String(i).padStart(3, "0")] = "OS";
for (const i of [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25, 45, 46, 47, 48, 49, 50, 51, 52, 53]) EXISTING_MAP["ITC-" + String(i).padStart(3, "0")] = "MSOffice";
for (const i of [26, 27, 28, 29, 54, 55, 56, 57]) EXISTING_MAP["ITC-" + String(i).padStart(3, "0")] = "Networks";
for (const i of [30, 58, 59, 60]) EXISTING_MAP["ITC-" + String(i).padStart(3, "0")] = "Security";
{
  const unclassified = existing.filter((q) => !(q.id in EXISTING_MAP)).map((q) => q.id);
  const extra = Object.keys(EXISTING_MAP).filter((id) => !existing.some((q) => q.id === id));
  check("Phase1 existing-60 classification covers every existing ID exactly once",
    unclassified.length === 0 && extra.length === 0 && Object.keys(EXISTING_MAP).length === 60,
    `unclassified=${unclassified.join(",")} extra=${extra.join(",")}`);
  const exCounts = {};
  for (const t of Object.values(EXISTING_MAP)) exCounts[t] = (exCounts[t] || 0) + 1;
  check("Phase1 existing counts: Fundamentals 9 / NumberSystems 1 / MemoryStorage 9 / OS 6 / MSOffice 23 / Networks 8 / Security 4 / rest 0",
    exCounts.Fundamentals === 9 && exCounts.NumberSystems === 1 && exCounts.MemoryStorage === 9 && exCounts.OS === 6 &&
    exCounts.MSOffice === 23 && exCounts.Networks === 8 && exCounts.Security === 4 && Object.keys(exCounts).length === 7,
    JSON.stringify(exCounts));
}
const LABEL_TO_MAP = {
  "IT — Computer Fundamentals": "Fundamentals",
  "IT — Number Systems & Data Representation": "NumberSystems",
  "IT — Memory & Storage": "MemoryStorage",
  "IT — Operating Systems & Software": "OS",
  "IT — MS Office & Productivity": "MSOffice",
  "IT — Networks & Internet": "Networks",
  "IT — Programming & Computational Thinking": "Programming",
  "IT — Databases & Data Handling": "Databases",
  "IT — Security & Digital Citizenship": "Security",
  "IT — Emerging Technologies & Digital Logic": "Emerging",
  "IT — Troubleshooting & Applications": "Troubleshooting",
};
{
  const newCounts = {};
  const stray = [];
  for (const q of news) {
    const m = LABEL_TO_MAP[q.topic];
    if (!m) { stray.push(q.id + ":" + q.topic); continue; }
    newCounts[m] = (newCounts[m] || 0) + 1;
  }
  check("Phase1 new items use exactly the 11 map-topic labels", stray.length === 0, stray.slice(0, 5).join(", "));
  const FILL = { Fundamentals: 61, NumberSystems: 39, MemoryStorage: 26, OS: 44, MSOffice: 57, Networks: 42, Programming: 50, Databases: 30, Security: 36, Emerging: 35, Troubleshooting: 20 };
  check("Phase1 new counts match the fill plan (61/39/26/44/57/42/50/30/36/35/20)",
    Object.entries(FILL).every(([t, n]) => newCounts[t] === n), JSON.stringify(newCounts));
  const MAP_TOTAL = { Fundamentals: 70, NumberSystems: 40, MemoryStorage: 35, OS: 50, MSOffice: 80, Networks: 50, Programming: 50, Databases: 30, Security: 40, Emerging: 35, Troubleshooting: 20 };
  const exCounts = {};
  for (const t of Object.values(EXISTING_MAP)) exCounts[t] = (exCounts[t] || 0) + 1;
  const totals = {};
  for (const t of Object.keys(MAP_TOTAL)) totals[t] = (exCounts[t] || 0) + (newCounts[t] || 0);
  check("Phase1 map totals match §3.12 allocations (70/40/35/50/80/50/50/30/40/35/20 = 500)",
    Object.entries(MAP_TOTAL).every(([t, n]) => totals[t] === n) && Object.values(totals).reduce((a, b) => a + b, 0) === 500,
    JSON.stringify(totals));
}

// ---------- §7 manifest counts match the bank ----------
{
  const man = read("src/lib/bank-manifest.ts");
  const countsBlock = man.slice(man.indexOf("BANK_COUNTS"), man.indexOf("};", man.indexOf("BANK_COUNTS")));
  const counts = {};
  for (const [, k, v] of countsBlock.matchAll(/"([a-z_]+)":\s*(\d+)/g)) counts[k] = Number(v);
  const sum = Object.values(counts).reduce((a, b) => a + b, 0);
  check("Phase1 manifest BANK_COUNTS: it 500, 16 banks, total 7040",
    counts.it === 500 && Object.keys(counts).length === 16 && sum === 7040,
    `it=${counts.it} sum=${sum}`);
  const trustedBlock = man.slice(man.indexOf("BANK_TRUSTED"), man.indexOf("};", man.indexOf("BANK_TRUSTED")));
  const trusted = {};
  for (const [, k, v] of trustedBlock.matchAll(/"([a-z_]+)":\s*(\d+)/g)) trusted[k] = Number(v);
  check("Phase1 manifest BANK_TRUSTED it still 0 (no verified items; new items all draft)",
    trusted.it === 0, `got ${trusted.it}`);
  const idBlock = man.slice(man.indexOf("ID_BANK"));
  const missing = expectIds.filter((id) => !idBlock.includes(`"${id}": "it"`));
  check("Phase1 manifest ID_BANK maps all ITC-001..ITC-500 to it", missing.length === 0, missing.slice(0, 5).join(", "));
  const idCount = (idBlock.match(/": "/g) || []).length;
  check("Phase1 manifest ID_BANK holds 7040 ids", idCount === 7040, `got ${idCount}`);
}

// ---------- §8 no-other-bank scope + content.json counts ----------
{
  const EXPECTED_OTHER = { arabic: 500, drawing: 500, pe: 500, english: 500, gk: 500, islamiyat: 500, maths: 500, pakstudies: 500, pastpapers: 20, pastpapers_reworded: 20, pedagogy: 500, science: 500, socialstudies: 500, tajweed: 500, urdu: 500 };
  const badBanks = [];
  for (const [k, n] of Object.entries(EXPECTED_OTHER)) {
    const len = JSON.parse(read(`src/data/banks/${k}.json`)).length;
    if (len !== n) badBanks.push(`${k}=${len}`);
  }
  check("Phase1 no other bank changed size (15 banks at expected counts)", badBanks.length === 0, badBanks.join(", "));
  const content = JSON.parse(read("src/data/content.json"));
  const bySubj = Object.fromEntries(content.counts.bySubject);
  const otherRowsOk = Object.entries(EXPECTED_OTHER).every(([k, n]) => {
    const label = { arabic: "Arabic", drawing: "Drawing", pe: "Physical Education", english: "English", gk: "GK", islamiyat: "Islamiyat", maths: "Maths", pakstudies: "Pak Studies", pastpapers: "Past-Paper Topics", pastpapers_reworded: "Past-Paper Topics (Reworded)", pedagogy: "Pedagogy", science: "General Science", socialstudies: "Social Studies", tajweed: "Tajweed", urdu: "Urdu" }[k];
    return bySubj[label] === n;
  });
  check("Phase1 content.json counts: total 7040, IT 500, other rows unchanged, 301/70/19/28",
    content.counts.total === 7040 && bySubj["IT"] === 500 && otherRowsOk &&
    content.counts.notes === 301 && content.counts.cards === 70 && content.counts.tracks === 19 && content.counts.mocks === 28,
    `total=${content.counts.total} it=${bySubj["IT"]}`);
}

// ---------- §9 fixed ZamungKor mock ID lists resolve + stay disjoint ----------
{
  const content = JSON.parse(read("src/data/content.json"));
  const allIds = new Set();
  for (const f of readdirSync(BANKS_DIR).filter((x) => x.endsWith(".json")).sort()) {
    if (f === "drawing_pe.json") continue;
    for (const it of JSON.parse(read(`src/data/banks/${f}`))) allIds.add(it.id);
  }
  const lists = Object.entries(content.zamFixed || {});
  const unresolved = [];
  const seenIn = new Map();
  const overlap = [];
  for (const [name, ids] of lists) {
    for (const id of ids) {
      if (!allIds.has(id)) unresolved.push(`${name}:${id}`);
      if (seenIn.has(id)) overlap.push(`${id} in ${seenIn.get(id)} + ${name}`);
      else seenIn.set(id, name);
    }
  }
  check("Phase1 fixed ZamungKor mock lists: all ids resolve, lists disjoint",
    lists.length === 3 && unresolved.length === 0 && overlap.length === 0,
    `lists=${lists.length} unresolved=${unresolved.slice(0, 3).join(",")} overlap=${overlap.slice(0, 3).join(",")}`);
  console.log(`INFO  Phase1 zamFixed lists: ${lists.map(([n, ids]) => `${n}=${ids.length}`).join(" ")}`);
}

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll Phase 1 IT checks passed.");
