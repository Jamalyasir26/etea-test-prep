// Phase 1 Arabic tests — bank grown 80 -> 500 MCQs (ARB-081..ARB-500),
// each trilingual at creation (English + Urdu script + Roman Urdu).
// Plain node, no dependencies. Run: node scripts/test-phase1-arabic.mjs
// (exit 0 = all pass). Locks:
//  - 500 items, ID sequence complete, file order == ID order;
//  - new items: exact 23-key schema, all-6-fields completeness, fixed
//    fields (draft/unverified, reviewedBy/reviewedAt null), honest
//    concept-extracted source labels;
//  - dedupe: normalized question text unique across all 500, and the
//    qa-540 first-12-words stem rule holds across all active banks;
//  - one correct answer + explanation present in all 3 languages;
//  - correctIndex distribution on NEW items only (the existing 80 are
//    never touched);
//  - honorific audit (zero Latin abbreviations) + Arabic-verbatim audit
//    (every Arabic run in an English field appears byte-identical in the
//    _ur and _roman versions of the SAME field, per the Stage 5B rule;
//    no new Arabic runs in _roman fields) + digit preservation +
//    no Hadith numbers/citations/narration words;
//  - topic coverage matches the §3.3 map (report.md) fill plan, with the
//    existing 80 classified by content via the embedded ID map;
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
const ABBR = /\(S\.?A\.?W\.?\)|\(P\.?B\.?U\.?H\.?\)|\(R\.?A\.?\)|\(A\.?S\.?\)/i;
const HADITH_PAT = /hadith\s*\d|sahih|bukhari|muslim\s*\d|surah\s+\d+:\d+|ayah\s+\d+|verse\s+\d+:\d+|narrat/i;
const KEYS = ["id", "question_ur", "question_roman", "options_ur", "options_roman", "explanation_ur", "explanation_roman", "post", "subject", "subjectKey", "topic", "question", "options", "correctIndex", "explanation", "explanationUrdu", "difficulty", "pastPaperRef", "verified", "source", "reviewStatus", "reviewedBy", "reviewedAt"];
const FORBIDDEN = ["explanationLang", "explanationEn", "conceptId", "syllabusClause", "sourceKind"];
const POSTS = ["at"];
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const digs = (s) => (s.match(/[0-9]/g) || []).sort().join(",");
const runs = (s) => (s.match(AR_RUN) || []).filter((r) => r.trim().length > 0);

const bank = JSON.parse(read("src/data/banks/arabic.json"));
const existing = bank.slice(0, 80);
const news = bank.slice(80);

// ---------- §1 shape + ID sequence ----------
check("Phase1 arabic bank is 500 items", bank.length === 500, `got ${bank.length}`);
const expectIds = Array.from({ length: 500 }, (_, i) => "ARB-" + String(i + 1).padStart(3, "0"));
check("Phase1 IDs are exactly ARB-001..ARB-500 in file order",
  JSON.stringify(bank.map((q) => q.id)) === JSON.stringify(expectIds));
check("Phase1 existing 80 keep their IDs in place",
  JSON.stringify(existing.map((q) => q.id)) === JSON.stringify(expectIds.slice(0, 80)));
check("Phase1 new items are ARB-081..ARB-500",
  news.length === 420 && news[0].id === "ARB-081" && news[419].id === "ARB-500");

// ---------- §2 new-item schema + fixed fields + completeness ----------
let bad = [];
for (const q of news) {
  if (JSON.stringify(Object.keys(q)) !== JSON.stringify(KEYS)) bad.push(q.id + ":keys");
  for (const k of FORBIDDEN) if (k in q) bad.push(q.id + ":forbidden:" + k);
  if (JSON.stringify(q.post) !== JSON.stringify(POSTS)) bad.push(q.id + ":post");
  if (q.subject !== "Arabic" || q.subjectKey !== "arabic") bad.push(q.id + ":subject");
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

// ---------- §5 honorific / Arabic-verbatim / digit / Hadith-pattern audits (new items) ----------
{
  const abbr = news.filter((q) => ABBR.test(JSON.stringify(q))).map((q) => q.id);
  check("Phase1 new items: zero Latin honorific abbreviations", abbr.length === 0, abbr.slice(0, 5).join(", "));
  const arBad = [];
  for (const q of news) {
    const pairs = [[q.question, q.question_ur, q.question_roman, "q"], [q.explanation, q.explanation_ur, q.explanation_roman, "e"]];
    q.options.forEach((o, j) => pairs.push([o, q.options_ur[j], q.options_roman[j], "o" + j]));
    for (const [src, ur, roman, tag] of pairs) {
      for (const r of runs(src)) {
        if (!ur.includes(r)) arBad.push(q.id + ":ur-missing[" + tag + "]");
        if (!roman.includes(r)) arBad.push(q.id + ":roman-missing[" + tag + "]");
      }
      for (const r of runs(roman)) if (!src.includes(r)) arBad.push(q.id + ":roman-extra[" + tag + "]");
    }
  }
  check("Phase1 new items: Arabic runs verbatim into _ur + _roman per field, none new in _roman",
    arBad.length === 0, arBad.slice(0, 5).join(", "));
  const urNoScript = news.filter((q) => !AR.test(q.question_ur) || !AR.test(q.explanation_ur)).map((q) => q.id);
  check("Phase1 new items: _ur question + explanation carry Urdu/Arabic script", urNoScript.length === 0, urNoScript.slice(0, 5).join(", "));
  const digBad = [];
  for (const q of news) {
    if (digs(q.question) !== digs(q.question_ur) || digs(q.question) !== digs(q.question_roman)) digBad.push(q.id + ":q");
    q.options.forEach((o, j) => { if (digs(o) !== digs(q.options_ur[j]) || digs(o) !== digs(q.options_roman[j])) digBad.push(q.id + ":opt" + j); });
    if (digs(q.explanation) !== digs(q.explanation_ur) || digs(q.explanation) !== digs(q.explanation_roman)) digBad.push(q.id + ":expl");
  }
  check("Phase1 new items: digits preserved across all 3 languages", digBad.length === 0, digBad.slice(0, 5).join(", "));
  const hadithBad = news.filter((q) => HADITH_PAT.test(q.question + " " + q.options.join(" ") + " " + q.explanation)).map((q) => q.id);
  check("Phase1 new items: no Hadith numbers/citations/narration words", hadithBad.length === 0, hadithBad.slice(0, 5).join(", "));
}

// ---------- §6 topic coverage vs the §3.3 map ----------
// Existing 80 classified by content:
// Kalimah 003–005 (Ism/Fi'l/Harf) + 030 (Al- definiteness, an Ism property) (4);
// Irab 001 + 080 (Nahw definitions) + 006–008 (case vowel signs) + 031
// (Tanween) + 061–063 + 065–067 (Fa'il/Maf'ul case signs) + 077/078
// (Raf'/Jarr signs) (14); Sentences 009–018 (nominal/verbal basics) + 064/068
// (role identification in sentences) + 069–072 (nominal-sentence parts) (16);
// Verbs 019–024 (Madi/Mudari'/Amr) + 074/075 (kataba/uktub forms) (8);
// Sarf 002 + 079 (Sarf definitions) + 025–029 (singular/dual/plural/feminine
// word forms) + 051–056 (root families) + 073 (root-letter count) + 076
// (Wazn) (15); PronounsParticles 032–050 (pronouns, demonstratives,
// prepositions, interrogatives) (19); Vocabulary 057/058 (Bayt/Shams) (2);
// IslamicContext 059/060 (Badr/Uhud) (2).
const EXISTING_MAP = {};
for (const i of [3, 4, 5, 30]) EXISTING_MAP["ARB-" + String(i).padStart(3, "0")] = "Kalimah";
for (const i of [1, 6, 7, 8, 31, 61, 62, 63, 65, 66, 67, 77, 78, 80]) EXISTING_MAP["ARB-" + String(i).padStart(3, "0")] = "Irab";
for (let i = 9; i <= 18; i++) EXISTING_MAP["ARB-" + String(i).padStart(3, "0")] = "Sentences";
for (const i of [64, 68, 69, 70, 71, 72]) EXISTING_MAP["ARB-" + String(i).padStart(3, "0")] = "Sentences";
for (let i = 19; i <= 24; i++) EXISTING_MAP["ARB-" + String(i).padStart(3, "0")] = "Verbs";
EXISTING_MAP["ARB-074"] = "Verbs";
EXISTING_MAP["ARB-075"] = "Verbs";
for (const i of [2, 25, 26, 27, 28, 29, 51, 52, 53, 54, 55, 56, 73, 76, 79]) EXISTING_MAP["ARB-" + String(i).padStart(3, "0")] = "Sarf";
for (let i = 32; i <= 50; i++) EXISTING_MAP["ARB-" + String(i).padStart(3, "0")] = "PronounsParticles";
EXISTING_MAP["ARB-057"] = "Vocabulary";
EXISTING_MAP["ARB-058"] = "Vocabulary";
EXISTING_MAP["ARB-059"] = "IslamicContext";
EXISTING_MAP["ARB-060"] = "IslamicContext";
{
  const unclassified = existing.filter((q) => !(q.id in EXISTING_MAP)).map((q) => q.id);
  const extra = Object.keys(EXISTING_MAP).filter((id) => !existing.some((q) => q.id === id));
  check("Phase1 existing-80 classification covers every existing ID exactly once",
    unclassified.length === 0 && extra.length === 0 && Object.keys(EXISTING_MAP).length === 80,
    `unclassified=${unclassified.join(",")} extra=${extra.join(",")}`);
  const exCounts = {};
  for (const t of Object.values(EXISTING_MAP)) exCounts[t] = (exCounts[t] || 0) + 1;
  check("Phase1 existing counts: Kalimah 4 / Irab 14 / Sentences 16 / Verbs 8 / Sarf 15 / PronounsParticles 19 / Vocabulary 2 / IslamicContext 2",
    exCounts.Kalimah === 4 && exCounts.Irab === 14 && exCounts.Sentences === 16 && exCounts.Verbs === 8 &&
    exCounts.Sarf === 15 && exCounts.PronounsParticles === 19 && exCounts.Vocabulary === 2 && exCounts.IslamicContext === 2,
    JSON.stringify(exCounts));
}
const LABEL_TO_MAP = {
  "Arabic — Kalimah": "Kalimah",
  "Arabic — I'rab": "Irab",
  "Arabic — Sentences": "Sentences",
  "Arabic — Verbs": "Verbs",
  "Arabic — Sarf": "Sarf",
  "Arabic — Pronouns & Particles": "PronounsParticles",
  "Arabic — Vocabulary": "Vocabulary",
  "Arabic — Islamic Context & Translation": "IslamicContext",
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
  const FILL = { Kalimah: 56, Irab: 56, Sentences: 54, Verbs: 72, Sarf: 45, PronounsParticles: 41, Vocabulary: 58, IslamicContext: 38 };
  check("Phase1 new counts match the fill plan (56/56/54/72/45/41/58/38)",
    Object.entries(FILL).every(([t, n]) => newCounts[t] === n), JSON.stringify(newCounts));
  const MAP_TOTAL = { Kalimah: 60, Irab: 70, Sentences: 70, Verbs: 80, Sarf: 60, PronounsParticles: 60, Vocabulary: 60, IslamicContext: 40 };
  const exCounts = {};
  for (const t of Object.values(EXISTING_MAP)) exCounts[t] = (exCounts[t] || 0) + 1;
  const totals = {};
  for (const t of Object.keys(MAP_TOTAL)) totals[t] = (exCounts[t] || 0) + (newCounts[t] || 0);
  check("Phase1 map totals match §3.3 allocations (60/70/70/80/60/60/60/40 = 500)",
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
  check("Phase1 manifest BANK_COUNTS: arabic 500, 16 banks, total 3816",
    counts.arabic === 500 && Object.keys(counts).length === 16 && sum === 3816,
    `arabic=${counts.arabic} sum=${sum}`);
  const trustedBlock = man.slice(man.indexOf("BANK_TRUSTED"), man.indexOf("};", man.indexOf("BANK_TRUSTED")));
  const trusted = {};
  for (const [, k, v] of trustedBlock.matchAll(/"([a-z_]+)":\s*(\d+)/g)) trusted[k] = Number(v);
  check("Phase1 manifest BANK_TRUSTED arabic still 0 (new items all draft)",
    trusted.arabic === 0, `got ${trusted.arabic}`);
  const idBlock = man.slice(man.indexOf("ID_BANK"));
  const missing = expectIds.filter((id) => !idBlock.includes(`"${id}": "arabic"`));
  check("Phase1 manifest ID_BANK maps all ARB-001..ARB-500 to arabic", missing.length === 0, missing.slice(0, 5).join(", "));
  const idCount = (idBlock.match(/": "/g) || []).length;
  check("Phase1 manifest ID_BANK holds 3816 ids", idCount === 3816, `got ${idCount}`);
}

// ---------- §8 no-other-bank scope + content.json counts ----------
{
  const EXPECTED_OTHER = { drawing: 50, pe: 46, english: 500, gk: 30, islamiyat: 500, it: 60, maths: 500, pakstudies: 500, pastpapers: 20, pastpapers_reworded: 20, pedagogy: 30, science: 30, socialstudies: 30, tajweed: 500, urdu: 500 };
  const badBanks = [];
  for (const [k, n] of Object.entries(EXPECTED_OTHER)) {
    const len = JSON.parse(read(`src/data/banks/${k}.json`)).length;
    if (len !== n) badBanks.push(`${k}=${len}`);
  }
  check("Phase1 no other bank changed size (15 banks at expected counts)", badBanks.length === 0, badBanks.join(", "));
  const content = JSON.parse(read("src/data/content.json"));
  const bySubj = Object.fromEntries(content.counts.bySubject);
  const otherRowsOk = Object.entries(EXPECTED_OTHER).every(([k, n]) => {
    const label = { drawing: "Drawing", pe: "Physical Education", english: "English", gk: "GK", islamiyat: "Islamiyat", it: "IT", maths: "Maths", pakstudies: "Pak Studies", pastpapers: "Past-Paper Topics", pastpapers_reworded: "Past-Paper Topics (Reworded)", pedagogy: "Pedagogy", science: "General Science", socialstudies: "Social Studies", tajweed: "Tajweed", urdu: "Urdu" }[k];
    return bySubj[label] === n;
  });
  check("Phase1 content.json counts: total 3816, Arabic 500, other rows unchanged, 151/70/19/20",
    content.counts.total === 3816 && bySubj.Arabic === 500 && otherRowsOk &&
    content.counts.notes === 151 && content.counts.cards === 70 && content.counts.tracks === 19 && content.counts.mocks === 20,
    `total=${content.counts.total} arabic=${bySubj.Arabic}`);
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
console.log("\nAll Phase 1 Arabic checks passed.");
