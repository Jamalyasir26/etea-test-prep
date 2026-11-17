// Phase 1 PE tests — bank grown 46 -> 500 MCQs (PE-037..PE-490),
// each trilingual at creation (English + Urdu script + Roman Urdu).
// Plain node, no dependencies. Run: node scripts/test-phase1-pe.mjs
// (exit 0 = all pass). Locks:
//  - 500 items, ID sequence complete (DRW-011..020 + PE-001..PE-490),
//    file order == ID order;
//  - existing 46 untouched (IDs, sources, the sourceNote key on
//    PE-001..010, the concept keys on PE-011..036, and the 5 gloss
//    items' explanationEn pattern pinned; byte-identity is locked by
//    test-lazy-banks.mjs);
//  - new items: exact 23-key schema, all-6-fields completeness, fixed
//    fields (draft/unverified, reviewedBy/reviewedAt null), honest
//    concept-extracted source label, NO explanationEn/explanationLang /
//    sourceNote / concept keys (the standard convention — the original
//    46's patterns are pinned by test-stage5f.mjs rescoped count-only
//    to the original 46);
//  - dedupe: normalized question text unique across all 500, and the
//    qa-540 first-12-words stem rule holds across all active banks;
//  - one correct answer + explanation present in all 3 languages;
//  - correctIndex distribution on NEW items only (the existing 46 are
//    never touched);
//  - honorific audit (zero Latin abbreviations) + script audits (no
//    Urdu/Arabic script in English or _roman fields; _ur question +
//    explanation carry Urdu script; Urdu yeh/kaf codepoints; repeated
//    script forms byte-identical) + digit preservation + F02 guard
//    (English explanations carry <2 Roman-Urdu detector hits) +
//    verbatim-option convention (pure expressions and acronym/number
//    lists byte-identical across languages; _ur options otherwise
//    follow the established PE convention — unit words translated,
//    PE-011..036 precedent, so NO Urdu-script requirement on _ur
//    options) + numeric distinctness + banned-symbol audit + nastaliq
//    audit;
//  - topic coverage matches the §3.14 map (report.md) fill plan, with
//    the existing 46 classified by content via the embedded ID map;
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
const POSTS = ["dm", "pet"];
const SOURCE = "Original — concept-extracted from Standard Physical Education References";
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const digs = (s) => (s.match(/[0-9]/g) || []).sort().join(",");
const runs = (s) => (s.match(AR_RUN) || []).filter((r) => r.trim().length > 0);
// F02 detector: same strict function-word list as test-step3b-audit2.mjs.
const RU = new Set("ki ka ke hai hain ho hun hum se mein ko nahi hota hoti hote jata jati gaya gayi tha thi thay yeh woh aur bhi jo aik ek diya kiya raha rahi rahe jab kyun kaise kahan lekin magar phir sirf bohat zyada liye bina kehte kaha kehlata kehlati sakta sakti chahiye wala wali walay hoga hogi honge karein karna hona jana ana karke hokar rehta rehti rehte ne hua hui hue thin aayi aaye nazil paida bani bana mukammal pehle pehli dusre dusri aakhri".split(" "));
const ruHits = (s) => s.toLowerCase().replace(/[^a-z\s']/g, " ").split(/\s+/).filter((w) => RU.has(w)).length;
// Numeric option parsing: strip units (longest phrases first), parse
// integer/decimal/fraction/mixed + optional %. PE unit list extends the
// IT list with PE measurement units (metres/feet/yards/inches, kg/g,
// beats per minute, players/points/overs/runs, feathers).
function parseNumeric(opt) {
  let s_pct = false;
  let s = opt.trim().replace(/^Rs\.\s*/i, "");
  if (s.endsWith("%")) { s_pct = true; s = s.slice(0, -1).trim(); }
  s = s.replace(/\s*(beats per minute|litres per minute|per minute|centimetres|centimetre|millimetres|millimetre|metres|metre|inches|inch|feet|foot|yards|yard|seconds|second|minutes|minute|hours|hour|days|day|weeks|week|months|month|years|year|degrees|degree|players|points|overs|runs|feathers|litres|litre|grams|gram|cm|mm|km|kg|g|m)$/i, "").trim();
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
// acronym/number lists. Word options (including measurements with unit
// words, e.g. "18 x 9 metres") are translated normally, following the
// established PE convention (unit words translated, PE-011..036
// precedent). No formula / nospace-symbol rule: it misfires on PE word
// options such as "60-100 beats per minute".
const PURE_EXPR = /^[\d\s\/\.\+\-=\%\(\)xX\:\^\u2212,]+$/;
function isTechVerbatim(opt) {
  const t = opt.trim();
  if (PURE_EXPR.test(t)) return true;
  if (/^([A-Z]{1,6}|\d+)(,\s*([A-Z]{1,6}|\d+))*$/.test(t)) return true;
  return false;
}

const bank = JSON.parse(read("src/data/banks/pe.json"));
const existing = bank.slice(0, 46);
const news = bank.slice(46);

// ---------- §1 shape + ID sequence ----------
check("Phase1 pe bank is 500 items", bank.length === 500, `got ${bank.length}`);
const expectIds = [...Array.from({ length: 10 }, (_, i) => "DRW-" + String(i + 11).padStart(3, "0")), ...Array.from({ length: 490 }, (_, i) => "PE-" + String(i + 1).padStart(3, "0"))];
check("Phase1 IDs are exactly DRW-011..020 + PE-001..PE-490 in file order",
  JSON.stringify(bank.map((q) => q.id)) === JSON.stringify(expectIds));
check("Phase1 existing 46 keep their IDs in place",
  JSON.stringify(existing.map((q) => q.id)) === JSON.stringify(expectIds.slice(0, 46)));
check("Phase1 new items are PE-037..PE-490",
  news.length === 454 && news[0].id === "PE-037" && news[453].id === "PE-490");
const GLOSS_IDS = new Set(["DRW-011", "DRW-012", "DRW-016", "DRW-019", "PE-001"]);
check("Phase1 existing 46 keep sources + sourceNote + concept keys + 5-gloss explanationEn pattern",
  existing.slice(0, 20).every((q) => q.source === "ai-generated") &&
  existing.slice(10, 20).every((q) => q.sourceNote === "AI-drafted; unreviewed") &&
  existing.slice(0, 10).every((q) => !("sourceNote" in q)) &&
  existing.slice(20).every((q) => q.source === "Original content — concept-extracted from Standard Physical Education Curriculum" && q.conceptId && q.syllabusClause && q.sourceKind && !("sourceNote" in q)) &&
  existing.filter((q) => q.explanationEn).length === 5 &&
  existing.filter((q) => q.explanationEn).every((q) => GLOSS_IDS.has(q.id)),
  existing.filter((q, i) => (i < 20 ? q.source !== "ai-generated" : q.source !== "Original content — concept-extracted from Standard Physical Education Curriculum")).map((q) => q.id).slice(0, 5).join(", "));

// ---------- §2 new-item schema + fixed fields + completeness ----------
let bad = [];
for (const q of news) {
  if (JSON.stringify(Object.keys(q)) !== JSON.stringify(KEYS)) bad.push(q.id + ":keys");
  for (const k of FORBIDDEN) if (k in q) bad.push(q.id + ":forbidden:" + k);
  if (JSON.stringify(q.post) !== JSON.stringify(POSTS)) bad.push(q.id + ":post");
  if (q.subject !== "Physical Education" || q.subjectKey !== "pe") bad.push(q.id + ":subject");
  if (q.difficulty !== "medium" || q.pastPaperRef !== null || q.explanationUrdu !== null) bad.push(q.id + ":fixed");
  if (q.verified !== false || q.reviewStatus !== "draft") bad.push(q.id + ":status");
  if (q.reviewedBy !== null || q.reviewedAt !== null) bad.push(q.id + ":reviewed");
  if (q.source !== SOURCE) bad.push(q.id + ":source");
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

// ---------- §5 honorific / script / digit / F02 / verbatim audits (new items) ----------
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
  check("Phase1 new items: verbatim options byte-identical across languages (pure expressions + acronym/number lists)", techBad.length === 0, techBad.slice(0, 5).join(", "));
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

// ---------- §6 topic coverage vs the §3.14 map ----------
// Existing 46 classified by content (stored topic labels are
// "Drawing/PE" for DRW-011..020 and the Phase 4 labels for PE-001..036):
// ConceptHistory 1 (DRW-016 Olympics frequency); Anatomy 7 (DRW-019
// bones, PE-009 heart rate, PE-030 resting HR, PE-031 pulse, PE-032
// femur, PE-033 stapes, PE-034 gluteus maximus); Fitness 4 (DRW-020
// aerobic example, PE-005 sit-and-reach, PE-035 carbs, PE-036 protein);
// Training 2 (DRW-018 warm-up, PE-006 cool-down); Psychology 1 (PE-010
// sportsmanship); Rules 17 (DRW-012 6 balls, DRW-014 90-min football,
// PE-003 birdie, PE-004 100 m sprint, PE-008 shot put, PE-011 hockey
// 60 min, PE-012 astroturf, PE-013 tennis points, PE-014 doubles,
// PE-015 table tennis 11, PE-016 badminton 21, PE-020 ODI 50, PE-021
// T20 20, PE-023 goalkeeper, PE-024 red card, PE-027 javelin, PE-028
// discus); Measurements 14 (DRW-011 cricket 11, DRW-013 football 11,
// DRW-015 hockey 11, DRW-017 marathon, PE-001 basketball 5, PE-002
// volleyball 6, PE-007 kabaddi 7, PE-017 net 2.43 m, PE-018 hoop 10
// feet, PE-019 3 stumps, PE-022 penalty 12 yards, PE-025 400 m lap,
// PE-026 4 relay runners, PE-029 take-off board). HealthFirstAid and
// Tournaments: none of the original 46.
const EXISTING_MAP = {};
EXISTING_MAP["DRW-016"] = "ConceptHistory";
for (const id of ["DRW-019", "PE-009", "PE-030", "PE-031", "PE-032", "PE-033", "PE-034"]) EXISTING_MAP[id] = "Anatomy";
for (const id of ["DRW-020", "PE-005", "PE-035", "PE-036"]) EXISTING_MAP[id] = "Fitness";
for (const id of ["DRW-018", "PE-006"]) EXISTING_MAP[id] = "Training";
EXISTING_MAP["PE-010"] = "Psychology";
for (const id of ["DRW-012", "DRW-014", "PE-003", "PE-004", "PE-008", "PE-011", "PE-012", "PE-013", "PE-014", "PE-015", "PE-016", "PE-020", "PE-021", "PE-023", "PE-024", "PE-027", "PE-028"]) EXISTING_MAP[id] = "Rules";
for (const id of ["DRW-011", "DRW-013", "DRW-015", "DRW-017", "PE-001", "PE-002", "PE-007", "PE-017", "PE-018", "PE-019", "PE-022", "PE-025", "PE-026", "PE-029"]) EXISTING_MAP[id] = "Measurements";
{
  const unclassified = existing.filter((q) => !(q.id in EXISTING_MAP)).map((q) => q.id);
  const extra = Object.keys(EXISTING_MAP).filter((id) => !existing.some((q) => q.id === id));
  check("Phase1 existing-46 classification covers every existing ID exactly once",
    unclassified.length === 0 && extra.length === 0 && Object.keys(EXISTING_MAP).length === 46,
    `unclassified=${unclassified.join(",")} extra=${extra.join(",")}`);
  const exCounts = {};
  for (const t of Object.values(EXISTING_MAP)) exCounts[t] = (exCounts[t] || 0) + 1;
  check("Phase1 existing counts: ConceptHistory 1 / Anatomy 7 / Fitness 4 / Training 2 / Psychology 1 / Rules 17 / Measurements 14 / rest 0",
    exCounts.ConceptHistory === 1 && exCounts.Anatomy === 7 && exCounts.Fitness === 4 && exCounts.Training === 2 &&
    exCounts.Psychology === 1 && exCounts.Rules === 17 && exCounts.Measurements === 14 && Object.keys(exCounts).length === 7,
    JSON.stringify(exCounts));
}
const LABEL_TO_MAP = {
  "PE — Concept & History": "ConceptHistory",
  "PE — Anatomy & Physiology": "Anatomy",
  "PE — Fitness & Wellness": "Fitness",
  "PE — Training Methods": "Training",
  "PE — Sports Psychology & Sociology": "Psychology",
  "PE — Games & Sports Rules": "Rules",
  "PE — Playfield Measurements & Equipment": "Measurements",
  "PE — Health, First Aid & Safety": "HealthFirstAid",
  "PE — Tournaments, Awards & Personalities": "Tournaments",
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
  const FILL = { ConceptHistory: 49, Anatomy: 63, Fitness: 56, Training: 48, Psychology: 34, Rules: 63, Measurements: 36, HealthFirstAid: 50, Tournaments: 55 };
  check("Phase1 new counts match the fill plan (49/63/56/48/34/63/36/50/55)",
    Object.entries(FILL).every(([t, n]) => newCounts[t] === n), JSON.stringify(newCounts));
  const MAP_TOTAL = { ConceptHistory: 50, Anatomy: 70, Fitness: 60, Training: 50, Psychology: 35, Rules: 80, Measurements: 50, HealthFirstAid: 50, Tournaments: 55 };
  const exCounts = {};
  for (const t of Object.values(EXISTING_MAP)) exCounts[t] = (exCounts[t] || 0) + 1;
  const totals = {};
  for (const t of Object.keys(MAP_TOTAL)) totals[t] = (exCounts[t] || 0) + (newCounts[t] || 0);
  check("Phase1 map totals match §3.14 allocations (50/70/60/50/35/80/50/50/55 = 500)",
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
  check("Phase1 manifest BANK_COUNTS: pe 500, 16 banks, total 7040",
    counts.pe === 500 && Object.keys(counts).length === 16 && sum === 7040,
    `pe=${counts.pe} sum=${sum}`);
  const trustedBlock = man.slice(man.indexOf("BANK_TRUSTED"), man.indexOf("};", man.indexOf("BANK_TRUSTED")));
  const trusted = {};
  for (const [, k, v] of trustedBlock.matchAll(/"([a-z_]+)":\s*(\d+)/g)) trusted[k] = Number(v);
  check("Phase1 manifest BANK_TRUSTED pe still 0 (no verified items; new items all draft)",
    trusted.pe === 0, `got ${trusted.pe}`);
  const idBlock = man.slice(man.indexOf("ID_BANK"));
  const missing = expectIds.filter((id) => !idBlock.includes(`"${id}": "pe"`));
  check("Phase1 manifest ID_BANK maps all DRW-011..020 + PE-001..PE-490 to pe", missing.length === 0, missing.slice(0, 5).join(", "));
  const idCount = (idBlock.match(/": "/g) || []).length;
  check("Phase1 manifest ID_BANK holds 7040 ids", idCount === 7040, `got ${idCount}`);
}

// ---------- §8 no-other-bank scope + content.json counts ----------
{
  const EXPECTED_OTHER = { arabic: 500, drawing: 500, english: 500, gk: 500, islamiyat: 500, it: 500, maths: 500, pakstudies: 500, pastpapers: 20, pastpapers_reworded: 20, pedagogy: 500, science: 500, socialstudies: 500, tajweed: 500, urdu: 500 };
  const badBanks = [];
  for (const [k, n] of Object.entries(EXPECTED_OTHER)) {
    const len = JSON.parse(read(`src/data/banks/${k}.json`)).length;
    if (len !== n) badBanks.push(`${k}=${len}`);
  }
  check("Phase1 no other bank changed size (15 banks at expected counts)", badBanks.length === 0, badBanks.join(", "));
  const content = JSON.parse(read("src/data/content.json"));
  const bySubj = Object.fromEntries(content.counts.bySubject);
  const otherRowsOk = Object.entries(EXPECTED_OTHER).every(([k, n]) => {
    const label = { arabic: "Arabic", drawing: "Drawing", english: "English", gk: "GK", islamiyat: "Islamiyat", it: "IT", maths: "Maths", pakstudies: "Pak Studies", pastpapers: "Past-Paper Topics", pastpapers_reworded: "Past-Paper Topics (Reworded)", pedagogy: "Pedagogy", science: "General Science", socialstudies: "Social Studies", tajweed: "Tajweed", urdu: "Urdu" }[k];
    return bySubj[label] === n;
  });
  check("Phase1 content.json counts: total 7040, Physical Education 500, other rows unchanged, 151/70/19/20",
    content.counts.total === 7040 && bySubj["Physical Education"] === 500 && otherRowsOk &&
    content.counts.notes === 151 && content.counts.cards === 70 && content.counts.tracks === 19 && content.counts.mocks === 20,
    `total=${content.counts.total} pe=${bySubj["Physical Education"]}`);
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
console.log("\nAll Phase 1 PE checks passed.");
