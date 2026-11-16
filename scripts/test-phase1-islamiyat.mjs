// Phase 1 Islamiyat tests — bank grown 105 -> 500 MCQs (ISL-106..ISL-500),
// each trilingual at creation (English + Urdu script + Roman Urdu).
// Plain node, no dependencies. Run: node scripts/test-phase1-islamiyat.mjs
// (exit 0 = all pass). Locks:
//  - 500 items, ID sequence complete, file order == ID order;
//  - new items: exact 23-key schema, all-6-fields completeness, fixed
//    fields (draft/unverified, reviewedBy/reviewedAt null), honest
//    concept-extracted source labels;
//  - dedupe: normalized question text unique across all 500, and the
//    qa-540 first-12-words stem rule holds across all active banks;
//  - one correct answer + explanation present in all 3 languages;
//  - correctIndex distribution on NEW items only (the existing 105 are
//    skewed 19/46/36/4 and are never touched);
//  - honorific audit (zero Latin abbreviations) + Arabic-script audit
//    (zero Arabic script in English/Roman fields) + digit preservation;
//  - topic coverage matches the §3.1 map (report.md) fill plan, with the
//    existing 105 classified by content via the embedded ID map;
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
const ABBR = /\(S\.?A\.?W\.?\)|\(P\.?B\.?U\.?H\.?\)|\(R\.?A\.?\)|\(A\.?S\.?\)/i;
const KEYS = ["id", "question_ur", "question_roman", "options_ur", "options_roman", "explanation_ur", "explanation_roman", "post", "subject", "subjectKey", "topic", "question", "options", "correctIndex", "explanation", "explanationUrdu", "difficulty", "pastPaperRef", "verified", "source", "reviewStatus", "reviewedBy", "reviewedAt"];
const FORBIDDEN = ["explanationLang", "explanationEn", "conceptId", "syllabusClause", "sourceKind"];
const POSTS = ["zamungkor", "tt", "qari", "swse-theology", "police", "forest"];
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const digs = (s) => (s.match(/[0-9]/g) || []).sort().join(",");

const bank = JSON.parse(read("src/data/banks/islamiyat.json"));
const existing = bank.slice(0, 105);
const news = bank.slice(105);

// ---------- §1 shape + ID sequence ----------
check("Phase1 islamiyat bank is 500 items", bank.length === 500, `got ${bank.length}`);
const expectIds = Array.from({ length: 500 }, (_, i) => "ISL-" + String(i + 1).padStart(3, "0"));
check("Phase1 IDs are exactly ISL-001..ISL-500 in file order",
  JSON.stringify(bank.map((q) => q.id)) === JSON.stringify(expectIds));
check("Phase1 existing 105 keep their IDs in place",
  JSON.stringify(existing.map((q) => q.id)) === JSON.stringify(expectIds.slice(0, 105)));
check("Phase1 new items are ISL-106..ISL-500",
  news.length === 395 && news[0].id === "ISL-106" && news[394].id === "ISL-500");

// ---------- §2 new-item schema + fixed fields + completeness ----------
let bad = [];
for (const q of news) {
  if (JSON.stringify(Object.keys(q)) !== JSON.stringify(KEYS)) bad.push(q.id + ":keys");
  for (const k of FORBIDDEN) if (k in q) bad.push(q.id + ":forbidden:" + k);
  if (JSON.stringify(q.post) !== JSON.stringify(POSTS)) bad.push(q.id + ":post");
  if (q.subject !== "Islamiyat" || q.subjectKey !== "islamiyat") bad.push(q.id + ":subject");
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

// ---------- §5 honorific / Arabic-script / digit audits (new items) ----------
{
  const abbr = news.filter((q) => ABBR.test(JSON.stringify(q))).map((q) => q.id);
  check("Phase1 new items: zero Latin honorific abbreviations", abbr.length === 0, abbr.slice(0, 5).join(", "));
  const arLatin = news.filter((q) => AR.test(q.question + q.question_roman + q.options.join("") + q.options_roman.join("") + q.explanation + q.explanation_roman)).map((q) => q.id);
  check("Phase1 new items: zero Arabic script in English/Roman fields", arLatin.length === 0, arLatin.slice(0, 5).join(", "));
  const urNoScript = news.filter((q) => !AR.test(q.question_ur) || !AR.test(q.explanation_ur)).map((q) => q.id);
  check("Phase1 new items: _ur question + explanation carry Urdu/Arabic script", urNoScript.length === 0, urNoScript.slice(0, 5).join(", "));
  const digBad = [];
  for (const q of news) {
    if (digs(q.question) !== digs(q.question_ur) || digs(q.question) !== digs(q.question_roman)) digBad.push(q.id + ":q");
    q.options.forEach((o, j) => { if (digs(o) !== digs(q.options_ur[j]) || digs(o) !== digs(q.options_roman[j])) digBad.push(q.id + ":opt" + j); });
    if (digs(q.explanation) !== digs(q.explanation_ur) || digs(q.explanation) !== digs(q.explanation_roman)) digBad.push(q.id + ":expl");
  }
  check("Phase1 new items: digits preserved across all 3 languages", digBad.length === 0, digBad.slice(0, 5).join(", "));
}

// ---------- §6 topic coverage vs the §3.1 map ----------
// Existing 105 classified by content (all carry topic "Islamiyat"):
// Quran 001–030 + 091–095 (35); Hadith 031–045 + 089–090 + 096–098 +
// 102–105 (24); Seerat 046–075 + 099–101 (33); Khulafa 076–082 (7);
// Ibadat 083–088 (6); Aqa'id / History / Ethics 0.
const EXISTING_MAP = {};
for (let i = 1; i <= 30; i++) EXISTING_MAP["ISL-" + String(i).padStart(3, "0")] = "Quran";
for (let i = 91; i <= 95; i++) EXISTING_MAP["ISL-" + String(i).padStart(3, "0")] = "Quran";
for (let i = 31; i <= 45; i++) EXISTING_MAP["ISL-" + String(i).padStart(3, "0")] = "Hadith";
for (const i of [89, 90, 96, 97, 98, 102, 103, 104, 105]) EXISTING_MAP["ISL-" + String(i).padStart(3, "0")] = "Hadith";
for (let i = 46; i <= 75; i++) EXISTING_MAP["ISL-" + String(i).padStart(3, "0")] = "Seerat";
for (let i = 99; i <= 101; i++) EXISTING_MAP["ISL-" + String(i).padStart(3, "0")] = "Seerat";
for (let i = 76; i <= 82; i++) EXISTING_MAP["ISL-" + String(i).padStart(3, "0")] = "Khulafa";
for (let i = 83; i <= 88; i++) EXISTING_MAP["ISL-" + String(i).padStart(3, "0")] = "Ibadat";
{
  const unclassified = existing.filter((q) => !(q.id in EXISTING_MAP)).map((q) => q.id);
  const extra = Object.keys(EXISTING_MAP).filter((id) => !existing.some((q) => q.id === id));
  check("Phase1 existing-105 classification covers every existing ID exactly once",
    unclassified.length === 0 && extra.length === 0 && Object.keys(EXISTING_MAP).length === 105,
    `unclassified=${unclassified.join(",")} extra=${extra.join(",")}`);
  const exCounts = {};
  for (const t of Object.values(EXISTING_MAP)) exCounts[t] = (exCounts[t] || 0) + 1;
  check("Phase1 existing counts: Quran 35 / Hadith 24 / Seerat 33 / Khulafa 7 / Ibadat 6 / rest 0",
    exCounts.Quran === 35 && exCounts.Hadith === 24 && exCounts.Seerat === 33 && exCounts.Khulafa === 7 &&
    exCounts.Ibadat === 6 && !exCounts.Aqaid && !exCounts.History && !exCounts.Ethics,
    JSON.stringify(exCounts));
}
const LABEL_TO_MAP = {
  "Islamiyat — Quran": "Quran",
  "Islamiyat — Hadith & Sunnah": "Hadith",
  "Islamiyat — Aqa'id": "Aqaid",
  "Islamiyat — Ibadat": "Ibadat",
  "Islamiyat — Seerat": "Seerat",
  "Islamiyat — Khulafa & Companions": "Khulafa",
  "Islamiyat — Islamic History": "History",
  "Islamiyat — Ethics & Society": "Ethics",
};
{
  const newCounts = {};
  const stray = [];
  for (const q of news) {
    const m = LABEL_TO_MAP[q.topic];
    if (!m) { stray.push(q.id + ":" + q.topic); continue; }
    newCounts[m] = (newCounts[m] || 0) + 1;
  }
  check("Phase1 new items use exactly the 8 map-topic labels", stray.length === 0, stray.slice(0, 5).join(", "));
  const FILL = { Quran: 55, Hadith: 36, Aqaid: 60, Ibadat: 74, Seerat: 57, Khulafa: 43, History: 40, Ethics: 30 };
  check("Phase1 new counts match the fill plan (55/36/60/74/57/43/40/30)",
    Object.entries(FILL).every(([t, n]) => newCounts[t] === n), JSON.stringify(newCounts));
  const MAP_TOTAL = { Quran: 90, Hadith: 60, Aqaid: 60, Ibadat: 80, Seerat: 90, Khulafa: 50, History: 40, Ethics: 30 };
  const exCounts = {};
  for (const t of Object.values(EXISTING_MAP)) exCounts[t] = (exCounts[t] || 0) + 1;
  const totals = {};
  for (const t of Object.keys(MAP_TOTAL)) totals[t] = (exCounts[t] || 0) + (newCounts[t] || 0);
  check("Phase1 map totals match §3.1 allocations (90/60/60/80/90/50/40/30 = 500)",
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
  check("Phase1 manifest BANK_COUNTS: islamiyat 500, 16 banks, total 1158",
    counts.islamiyat === 500 && Object.keys(counts).length === 16 && sum === 1158,
    `islamiyat=${counts.islamiyat} sum=${sum}`);
  const trustedBlock = man.slice(man.indexOf("BANK_TRUSTED"), man.indexOf("};", man.indexOf("BANK_TRUSTED")));
  const trusted = {};
  for (const [, k, v] of trustedBlock.matchAll(/"([a-z_]+)":\s*(\d+)/g)) trusted[k] = Number(v);
  check("Phase1 manifest BANK_TRUSTED islamiyat still 3 (new items all draft)",
    trusted.islamiyat === 3, `got ${trusted.islamiyat}`);
  const idBlock = man.slice(man.indexOf("ID_BANK"));
  const missing = expectIds.filter((id) => !idBlock.includes(`"${id}": "islamiyat"`));
  check("Phase1 manifest ID_BANK maps all ISL-001..ISL-500 to islamiyat", missing.length === 0, missing.slice(0, 5).join(", "));
  const idCount = (idBlock.match(/": "/g) || []).length;
  check("Phase1 manifest ID_BANK holds 1158 ids", idCount === 1158, `got ${idCount}`);
}

// ---------- §8 no-other-bank scope + content.json counts ----------
{
  const EXPECTED_OTHER = { arabic: 80, drawing: 50, pe: 46, english: 45, gk: 30, it: 60, maths: 45, pakstudies: 45, pastpapers: 20, pastpapers_reworded: 20, pedagogy: 30, science: 30, socialstudies: 30, tajweed: 82, urdu: 45 };
  const badBanks = [];
  for (const [k, n] of Object.entries(EXPECTED_OTHER)) {
    const len = JSON.parse(read(`src/data/banks/${k}.json`)).length;
    if (len !== n) badBanks.push(`${k}=${len}`);
  }
  check("Phase1 no other bank changed size (15 banks at pre-Phase-1 counts)", badBanks.length === 0, badBanks.join(", "));
  const content = JSON.parse(read("src/data/content.json"));
  const bySubj = Object.fromEntries(content.counts.bySubject);
  const otherRowsOk = Object.entries(EXPECTED_OTHER).every(([k, n]) => {
    const label = { arabic: "Arabic", drawing: "Drawing", pe: "Physical Education", english: "English", gk: "GK", it: "IT", maths: "Maths", pakstudies: "Pak Studies", pastpapers: "Past-Paper Topics", pastpapers_reworded: "Past-Paper Topics (Reworded)", pedagogy: "Pedagogy", science: "General Science", socialstudies: "Social Studies", tajweed: "Tajweed", urdu: "Urdu" }[k];
    return bySubj[label] === n;
  });
  check("Phase1 content.json counts: total 1158, Islamiyat 500, other rows unchanged, 151/70/19/20",
    content.counts.total === 1158 && bySubj.Islamiyat === 500 && otherRowsOk &&
    content.counts.notes === 151 && content.counts.cards === 70 && content.counts.tracks === 19 && content.counts.mocks === 20,
    `total=${content.counts.total} islamiyat=${bySubj.Islamiyat}`);
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
console.log("\nAll Phase 1 Islamiyat checks passed.");
