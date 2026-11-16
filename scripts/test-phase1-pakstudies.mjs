// Phase 1 Pak Studies tests — bank grown 45 -> 500 MCQs (PAK-046..PAK-500),
// each trilingual at creation (English + Urdu script + Roman Urdu).
// Plain node, no dependencies. Run: node scripts/test-phase1-pakstudies.mjs
// (exit 0 = all pass). Locks:
//  - 500 items, ID sequence complete, file order == ID order;
//  - new items: exact 23-key schema, all-6-fields completeness, fixed
//    fields (draft/unverified, reviewedBy/reviewedAt null), honest
//    concept-extracted source labels, NO explanationEn/explanationLang
//    (the standard convention — unlike the original 45, whose mixed
//    explanations + explanationEn are documented in VERIFY-stage5e.md and
//    pinned by test-stage5e.mjs scoped to the first 45);
//  - dedupe: normalized question text unique across all 500, and the
//    qa-540 first-12-words stem rule holds across all active banks;
//  - one correct answer + explanation present in all 3 languages;
//  - correctIndex distribution on NEW items only (the existing 45 are
//    never touched);
//  - honorific audit (zero Latin abbreviations) + script audits (no
//    Urdu/Arabic script in English or _roman fields; _ur question +
//    explanation carry Urdu script; Urdu yeh/kaf codepoints; repeated
//    script forms byte-identical) + digit preservation + F02 guard
//    (English explanations carry <2 Roman-Urdu detector hits) +
//    numeric-option convention (numeric options byte-identical across
//    languages, word options translated in _ur, bare acronyms exempt) +
//    numeric distinctness + banned-symbol audit;
//  - topic coverage matches the §3.8 map (report.md) fill plan, with the
//    existing 45 classified by content via the embedded ID map;
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
const FORBIDDEN = ["explanationLang", "explanationEn", "conceptId", "syllabusClause", "sourceKind"];
const POSTS = ["zamungkor", "tt", "at", "pst", "ct", "ctit", "dm", "pet", "qari", "sst-etea", "sst-kppsc", "junior-clerk", "computer-operator", "police", "forest"];
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
// and symbols ONLY (incl. commas in figures like 40,000 and ratios like
// 5:7) stay byte-identical in both languages. Number+word options such as
// "6 years" are WORD options: the word is translated in _ur, digits
// preserved. parseNumeric (unit-stripping) is used only for the numeric
// distinctness check below, NOT for the verbatim decision.
const PURE_EXPR = /^[\d\s\/\.\+\-=\%\(\)xX\:\^\u2212,]+$/;
function isVerbatimOption(opt) { return PURE_EXPR.test(opt.trim()); }
const BARE_ACRONYM = /^[A-Z]{2,6}$/;

const bank = JSON.parse(read("src/data/banks/pakstudies.json"));
const existing = bank.slice(0, 45);
const news = bank.slice(45);

// ---------- §1 shape + ID sequence ----------
check("Phase1 pakstudies bank is 500 items", bank.length === 500, `got ${bank.length}`);
const expectIds = Array.from({ length: 500 }, (_, i) => "PAK-" + String(i + 1).padStart(3, "0"));
check("Phase1 IDs are exactly PAK-001..PAK-500 in file order",
  JSON.stringify(bank.map((q) => q.id)) === JSON.stringify(expectIds));
check("Phase1 existing 45 keep their IDs in place",
  JSON.stringify(existing.map((q) => q.id)) === JSON.stringify(expectIds.slice(0, 45)));
check("Phase1 new items are PAK-046..PAK-500",
  news.length === 455 && news[0].id === "PAK-046" && news[454].id === "PAK-500");

// ---------- §2 new-item schema + fixed fields + completeness ----------
let bad = [];
for (const q of news) {
  if (JSON.stringify(Object.keys(q)) !== JSON.stringify(KEYS)) bad.push(q.id + ":keys");
  for (const k of FORBIDDEN) if (k in q) bad.push(q.id + ":forbidden:" + k);
  if (JSON.stringify(q.post) !== JSON.stringify(POSTS)) bad.push(q.id + ":post");
  if (q.subject !== "Pak Studies" || q.subjectKey !== "pakstudies") bad.push(q.id + ":subject");
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

// ---------- §5 honorific / script / digit / F02 / numeric-option audits (new items) ----------
{
  const abbr = news.filter((q) => ABBR.test(JSON.stringify(q))).map((q) => q.id);
  check("Phase1 new items: zero Latin honorific abbreviations", abbr.length === 0, abbr.slice(0, 5).join(", "));
  const symBad = news.filter((q) => NON_ASCII_SYM.test(JSON.stringify(q))).map((q) => q.id);
  check("Phase1 new items: no banned non-ASCII symbols (√ π ° ² ³ × ÷ ≤ ≥ •)", symBad.length === 0, symBad.slice(0, 5).join(", "));
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
  const urOptBad = [];
  for (const q of news) {
    q.options.forEach((o, j) => {
      if (isVerbatimOption(o)) {
        if (q.options_ur[j] !== o) urOptBad.push(q.id + ":ur-opt" + j);
        if (q.options_roman[j] !== o) urOptBad.push(q.id + ":roman-opt" + j);
      } else if (!AR.test(q.options_ur[j]) && !BARE_ACRONYM.test(o.trim())) {
        urOptBad.push(q.id + ":ur-opt" + j + "-word");
      }
    });
  }
  check("Phase1 new items: numeric options byte-identical across languages; word options translated in _ur (bare acronyms exempt)", urOptBad.length === 0, urOptBad.slice(0, 5).join(", "));
  const numDup = [];
  for (const q of news) {
    const vals = q.options.map(parseNumeric);
    if (vals.every((v) => v !== null)) {
      const seen = new Set();
      vals.forEach((v, j) => { const k = v.toFixed(9); if (seen.has(k)) numDup.push(q.id + ":opt" + j); seen.add(k); });
    }
  }
  check("Phase1 new items: all-numeric option sets are numerically distinct", numDup.length === 0, numDup.slice(0, 5).join(", "));
  // Standard convention (unlike the original 45): translations are real
  // translations, never verbatim copies of the English explanation.
  const verbatim = news.filter((q) => q.explanation_roman === q.explanation || q.explanation_ur === q.explanation).map((q) => q.id);
  check("Phase1 new items: explanations are translated, not verbatim copies", verbatim.length === 0, verbatim.slice(0, 5).join(", "));
}

// ---------- §6 topic coverage vs the §3.8 map ----------
// Existing 45 classified by content (all 45 carry topic "Pak Studies"):
// Ideology 003; Movement 001/002/004/005/006/012/013/014/015/016;
// Establishment 007/010; Constitutional 017–026; History 008/009/011/027–032;
// Land 033/034/035/036/037/042; Population 038/039/040/041/044/045; World 043.
const EXISTING_MAP = {};
for (const i of [3]) EXISTING_MAP["PAK-" + String(i).padStart(3, "0")] = "Ideology";
for (const i of [1, 2, 4, 5, 6, 12, 13, 14, 15, 16]) EXISTING_MAP["PAK-" + String(i).padStart(3, "0")] = "Movement";
for (const i of [7, 10]) EXISTING_MAP["PAK-" + String(i).padStart(3, "0")] = "Establishment";
for (const i of [17, 18, 19, 20, 21, 22, 23, 24, 25, 26]) EXISTING_MAP["PAK-" + String(i).padStart(3, "0")] = "Constitutional";
for (const i of [8, 9, 11, 27, 28, 29, 30, 31, 32]) EXISTING_MAP["PAK-" + String(i).padStart(3, "0")] = "History";
for (const i of [33, 34, 35, 36, 37, 42]) EXISTING_MAP["PAK-" + String(i).padStart(3, "0")] = "Land";
for (const i of [38, 39, 40, 41, 44, 45]) EXISTING_MAP["PAK-" + String(i).padStart(3, "0")] = "Population";
for (const i of [43]) EXISTING_MAP["PAK-" + String(i).padStart(3, "0")] = "World";
{
  const unclassified = existing.filter((q) => !(q.id in EXISTING_MAP)).map((q) => q.id);
  const extra = Object.keys(EXISTING_MAP).filter((id) => !existing.some((q) => q.id === id));
  check("Phase1 existing-45 classification covers every existing ID exactly once",
    unclassified.length === 0 && extra.length === 0 && Object.keys(EXISTING_MAP).length === 45,
    `unclassified=${unclassified.join(",")} extra=${extra.join(",")}`);
  const exCounts = {};
  for (const t of Object.values(EXISTING_MAP)) exCounts[t] = (exCounts[t] || 0) + 1;
  check("Phase1 existing counts: Ideology 1 / Movement 10 / Establishment 2 / Constitutional 10 / History 9 / Land 6 / Economy 0 / Population 6 / World 1",
    exCounts.Ideology === 1 && exCounts.Movement === 10 && exCounts.Establishment === 2 && exCounts.Constitutional === 10 &&
    exCounts.History === 9 && exCounts.Land === 6 && (exCounts.Economy || 0) === 0 && exCounts.Population === 6 && exCounts.World === 1,
    JSON.stringify(exCounts));
}
const LABEL_TO_MAP = {
  "Pak Studies — Ideological Basis": "Ideology",
  "Pak Studies — Pakistan Movement": "Movement",
  "Pak Studies — Establishment & Early Problems": "Establishment",
  "Pak Studies — Constitutional Development": "Constitutional",
  "Pak Studies — History Since 1947": "History",
  "Pak Studies — Land, Climate & Topography": "Land",
  "Pak Studies — Economic Development": "Economy",
  "Pak Studies — Population, Society & Culture": "Population",
  "Pak Studies — Pakistan & World Affairs": "World",
};
{
  const newCounts = {};
  const stray = [];
  for (const q of news) {
    const m = LABEL_TO_MAP[q.topic];
    if (!m) { stray.push(q.id + ":" + q.topic); continue; }
    newCounts[m] = (newCounts[m] || 0) + 1;
  }
  check("Phase1 new items use exactly the 9 map-topic labels", stray.length === 0, stray.slice(0, 5).join(", "));
  const FILL = { Ideology: 49, Movement: 80, Establishment: 38, Constitutional: 50, History: 51, Land: 44, Economy: 50, Population: 44, World: 49 };
  check("Phase1 new counts match the fill plan (49/80/38/50/51/44/50/44/49)",
    Object.entries(FILL).every(([t, n]) => newCounts[t] === n), JSON.stringify(newCounts));
  const MAP_TOTAL = { Ideology: 50, Movement: 90, Establishment: 40, Constitutional: 60, History: 60, Land: 50, Economy: 50, Population: 50, World: 50 };
  const exCounts = {};
  for (const t of Object.values(EXISTING_MAP)) exCounts[t] = (exCounts[t] || 0) + 1;
  const totals = {};
  for (const t of Object.keys(MAP_TOTAL)) totals[t] = (exCounts[t] || 0) + (newCounts[t] || 0);
  check("Phase1 map totals match §3.8 allocations (50/90/40/60/60/50/50/50/50 = 500)",
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
  check("Phase1 manifest BANK_COUNTS: pakstudies 500, 16 banks, total 4286",
    counts.pakstudies === 500 && Object.keys(counts).length === 16 && sum === 4286,
    `pakstudies=${counts.pakstudies} sum=${sum}`);
  const trustedBlock = man.slice(man.indexOf("BANK_TRUSTED"), man.indexOf("};", man.indexOf("BANK_TRUSTED")));
  const trusted = {};
  for (const [, k, v] of trustedBlock.matchAll(/"([a-z_]+)":\s*(\d+)/g)) trusted[k] = Number(v);
  check("Phase1 manifest BANK_TRUSTED pakstudies still 1 (new items all draft)",
    trusted.pakstudies === 1, `got ${trusted.pakstudies}`);
  const idBlock = man.slice(man.indexOf("ID_BANK"));
  const missing = expectIds.filter((id) => !idBlock.includes(`"${id}": "pakstudies"`));
  check("Phase1 manifest ID_BANK maps all PAK-001..PAK-500 to pakstudies", missing.length === 0, missing.slice(0, 5).join(", "));
  const idCount = (idBlock.match(/": "/g) || []).length;
  check("Phase1 manifest ID_BANK holds 4286 ids", idCount === 4286, `got ${idCount}`);
}

// ---------- §8 no-other-bank scope + content.json counts ----------
{
  const EXPECTED_OTHER = { arabic: 500, drawing: 50, pe: 46, english: 500, gk: 30, islamiyat: 500, it: 60, maths: 500, pastpapers: 20, pastpapers_reworded: 20, pedagogy: 500, science: 30, socialstudies: 30, tajweed: 500, urdu: 500 };
  const badBanks = [];
  for (const [k, n] of Object.entries(EXPECTED_OTHER)) {
    const len = JSON.parse(read(`src/data/banks/${k}.json`)).length;
    if (len !== n) badBanks.push(`${k}=${len}`);
  }
  check("Phase1 no other bank changed size (15 banks at expected counts)", badBanks.length === 0, badBanks.join(", "));
  const content = JSON.parse(read("src/data/content.json"));
  const bySubj = Object.fromEntries(content.counts.bySubject);
  const otherRowsOk = Object.entries(EXPECTED_OTHER).every(([k, n]) => {
    const label = { arabic: "Arabic", drawing: "Drawing", pe: "Physical Education", english: "English", gk: "GK", islamiyat: "Islamiyat", it: "IT", maths: "Maths", pastpapers: "Past-Paper Topics", pastpapers_reworded: "Past-Paper Topics (Reworded)", pedagogy: "Pedagogy", science: "General Science", socialstudies: "Social Studies", tajweed: "Tajweed", urdu: "Urdu" }[k];
    return bySubj[label] === n;
  });
  check("Phase1 content.json counts: total 4286, Pak Studies 500, other rows unchanged, 151/70/19/20",
    content.counts.total === 4286 && bySubj["Pak Studies"] === 500 && otherRowsOk &&
    content.counts.notes === 151 && content.counts.cards === 70 && content.counts.tracks === 19 && content.counts.mocks === 20,
    `total=${content.counts.total} pakstudies=${bySubj["Pak Studies"]}`);
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
console.log("\nAll Phase 1 Pak Studies checks passed.");
