// Phase 1 Urdu tests — bank grown 45 -> 500 MCQs (URD-046..URD-500),
// each trilingual at creation (English + Urdu script + Roman Urdu).
// Plain node, no dependencies. Run: node scripts/test-phase1-urdu.mjs
// (exit 0 = all pass). Locks:
//  - 500 items, ID sequence complete, file order == ID order;
//  - new items: exact 23-key schema, all-6-fields completeness, fixed
//    fields (draft/unverified, reviewedBy/reviewedAt null), honest
//    concept-extracted source labels;
//  - dedupe: normalized question text unique across all 500, and the
//    qa-540 first-12-words stem rule holds across all active banks;
//  - one correct answer + explanation present in all 3 languages;
//  - correctIndex distribution on NEW items only (the existing 45 are
//    never touched);
//  - honorific audit (zero Latin abbreviations) + script audits (no
//    Urdu/Arabic script in English or _roman fields; _ur question +
//    explanation + every option carry Urdu script; Urdu yeh/kaf
//    codepoints; repeated script forms byte-identical) + digit
//    preservation + F02 guard (English explanations carry <2 Roman-Urdu
//    detector hits) + synonym/antonym target-word uniqueness across all
//    500 + banned-target exclusion;
//  - topic coverage matches the §3.4 map (report.md) fill plan, with the
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
const KEYS = ["id", "question_ur", "question_roman", "options_ur", "options_roman", "explanation_ur", "explanation_roman", "post", "subject", "subjectKey", "topic", "question", "options", "correctIndex", "explanation", "explanationUrdu", "difficulty", "pastPaperRef", "verified", "source", "reviewStatus", "reviewedBy", "reviewedAt"];
const FORBIDDEN = ["explanationLang", "explanationEn", "conceptId", "syllabusClause", "sourceKind"];
const POSTS = ["zamungkor", "tt", "at", "qari", "sst-kppsc", "police", "forest"];
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const digs = (s) => (s.match(/[0-9]/g) || []).sort().join(",");
const runs = (s) => (s.match(AR_RUN) || []).filter((r) => r.trim().length > 0);
// F02 detector: same strict function-word list as test-step3b-audit2.mjs.
const RU = new Set("ki ka ke hai hain ho hun hum se mein ko nahi hota hoti hote jata jati gaya gayi tha thi thay yeh woh aur bhi jo aik ek diya kiya raha rahi rahe jab kyun kaise kahan lekin magar phir sirf bohat zyada liye bina kehte kaha kehlata kehlati sakta sakti chahiye wala wali walay hoga hogi honge karein karna hona jana ana karke hokar rehta rehti rehte ne hua hui hue thin aayi aaye nazil paida bani bana mukammal pehle pehli dusre dusri aakhri".split(" "));
const ruHits = (s) => s.toLowerCase().replace(/[^a-z\s']/g, " ").split(/\s+/).filter((w) => RU.has(w)).length;
const targetOf = (q) => {
  const m = q.question.match(/synonym of\s+['"]([^'"]+)['"]/i) || q.question.match(/antonym of\s+['"]([^'"]+)['"]/i);
  return m ? m[1].trim().toLowerCase() : null;
};
const BANNED_TARGETS = new Set(["dost", "khushi", "roshni", "sach", "muhabbat", "bahadur", "shuru", "aasan", "ilm", "ameer", "naya", "garam", "kamyabi", "aman", "zindagi", "din"]);

const bank = JSON.parse(read("src/data/banks/urdu.json"));
const existing = bank.slice(0, 45);
const news = bank.slice(45);

// ---------- §1 shape + ID sequence ----------
check("Phase1 urdu bank is 500 items", bank.length === 500, `got ${bank.length}`);
const expectIds = Array.from({ length: 500 }, (_, i) => "URD-" + String(i + 1).padStart(3, "0"));
check("Phase1 IDs are exactly URD-001..URD-500 in file order",
  JSON.stringify(bank.map((q) => q.id)) === JSON.stringify(expectIds));
check("Phase1 existing 45 keep their IDs in place",
  JSON.stringify(existing.map((q) => q.id)) === JSON.stringify(expectIds.slice(0, 45)));
check("Phase1 new items are URD-046..URD-500",
  news.length === 455 && news[0].id === "URD-046" && news[454].id === "URD-500");

// ---------- §2 new-item schema + fixed fields + completeness ----------
let bad = [];
for (const q of news) {
  if (JSON.stringify(Object.keys(q)) !== JSON.stringify(KEYS)) bad.push(q.id + ":keys");
  for (const k of FORBIDDEN) if (k in q) bad.push(q.id + ":forbidden:" + k);
  if (JSON.stringify(q.post) !== JSON.stringify(POSTS)) bad.push(q.id + ":post");
  if (q.subject !== "Urdu" || q.subjectKey !== "urdu") bad.push(q.id + ":subject");
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

// ---------- §5 honorific / script / digit / F02 / vocab-target audits (new items) ----------
{
  const abbr = news.filter((q) => ABBR.test(JSON.stringify(q))).map((q) => q.id);
  check("Phase1 new items: zero Latin honorific abbreviations", abbr.length === 0, abbr.slice(0, 5).join(", "));
  const enScript = [];
  for (const q of news) for (const f of [q.question, ...q.options, q.explanation]) if (AR.test(f)) enScript.push(q.id);
  check("Phase1 new items: EN fields contain no Urdu/Arabic script", enScript.length === 0, [...new Set(enScript)].slice(0, 5).join(", "));
  const romanScript = [];
  for (const q of news) for (const f of [q.question_roman, ...q.options_roman, q.explanation_roman]) if (AR.test(f)) romanScript.push(q.id);
  check("Phase1 new items: _roman fields contain no Urdu/Arabic script", romanScript.length === 0, [...new Set(romanScript)].slice(0, 5).join(", "));
  const urNoScript = news.filter((q) => !AR.test(q.question_ur) || !AR.test(q.explanation_ur) || q.options_ur.some((o) => !AR.test(o))).map((q) => q.id);
  check("Phase1 new items: _ur question + explanation + every option carry Urdu script", urNoScript.length === 0, urNoScript.slice(0, 5).join(", "));
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
}
{
  // Uniqueness is scoped to the NEW items: the existing 45 deliberately pair a
  // synonym item and an antonym item on the SAME target word (e.g. URD-001/002
  // both target 'dost'), so a bank-wide uniqueness assertion would fail on
  // pre-existing data. New-vs-existing collisions are covered by the banned-targets
  // check below (the 16 existing target words are forbidden to new items).
  const tSeen = new Map();
  const tDups = [];
  for (const q of news) {
    const t = targetOf(q);
    if (!t) continue;
    if (tSeen.has(t)) tDups.push(`${t}: ${tSeen.get(t)}/${q.id}`);
    else tSeen.set(t, q.id);
  }
  check("Phase1 new synonym/antonym target words unique across the 455 new items", tDups.length === 0, tDups.slice(0, 5).join(", "));
  const banned = news.filter((q) => { const t = targetOf(q); return t && BANNED_TARGETS.has(t); }).map((q) => q.id);
  check("Phase1 new synonym/antonym targets exclude the 16 words asked by the existing 45", banned.length === 0, banned.slice(0, 5).join(", "));
}

// ---------- §6 topic coverage vs the §3.4 map ----------
// Existing 45 classified by content:
// Lughat 001–025 + 044/045 (27 synonyms/antonyms); Ism 026/028/029/042/043
// (5); Fi'l 027/039/040/041 (4); Harf 030 (1); JinsAdad 031–038 (8).
const EXISTING_MAP = {};
for (let i = 1; i <= 25; i++) EXISTING_MAP["URD-" + String(i).padStart(3, "0")] = "Lughat";
for (const i of [44, 45]) EXISTING_MAP["URD-" + String(i).padStart(3, "0")] = "Lughat";
for (const i of [26, 28, 29, 42, 43]) EXISTING_MAP["URD-" + String(i).padStart(3, "0")] = "Ism";
for (const i of [27, 39, 40, 41]) EXISTING_MAP["URD-" + String(i).padStart(3, "0")] = "Fil";
EXISTING_MAP["URD-030"] = "Harf";
for (let i = 31; i <= 38; i++) EXISTING_MAP["URD-" + String(i).padStart(3, "0")] = "JinsAdad";
{
  const unclassified = existing.filter((q) => !(q.id in EXISTING_MAP)).map((q) => q.id);
  const extra = Object.keys(EXISTING_MAP).filter((id) => !existing.some((q) => q.id === id));
  check("Phase1 existing-45 classification covers every existing ID exactly once",
    unclassified.length === 0 && extra.length === 0 && Object.keys(EXISTING_MAP).length === 45,
    `unclassified=${unclassified.join(",")} extra=${extra.join(",")}`);
  const exCounts = {};
  for (const t of Object.values(EXISTING_MAP)) exCounts[t] = (exCounts[t] || 0) + 1;
  check("Phase1 existing counts: Lughat 27 / Ism 5 / Fil 4 / Harf 1 / JinsAdad 8",
    exCounts.Lughat === 27 && exCounts.Ism === 5 && exCounts.Fil === 4 && exCounts.Harf === 1 && exCounts.JinsAdad === 8,
    JSON.stringify(exCounts));
}
const LABEL_TO_MAP = {
  "Urdu — Ism & Kinds": "Ism",
  "Urdu — Fi'l & Kinds": "Fil",
  "Urdu — Harf & Kinds": "Harf",
  "Urdu — Jumla & Tarkeeb": "Jumla",
  "Urdu — Jins & Adad": "JinsAdad",
  "Urdu — Lughat": "Lughat",
  "Urdu — Muhavare & Zarb-ul-Amsal": "Muhavare",
  "Urdu — Ilm-e-Bayan & Badee": "Bayan",
  "Urdu — Urdu Adab": "Adab",
  "Urdu — Talafuz, Sabqay & Huroof": "Talafuz",
};
{
  const newCounts = {};
  const stray = [];
  for (const q of news) {
    const m = LABEL_TO_MAP[q.topic];
    if (!m) { stray.push(q.id + ":" + q.topic); continue; }
    newCounts[m] = (newCounts[m] || 0) + 1;
  }
  check("Phase1 new items use exactly the 10 map-topic labels", stray.length === 0, stray.slice(0, 5).join(", "));
  const FILL = { Ism: 75, Fil: 66, Harf: 39, Jumla: 50, JinsAdad: 42, Lughat: 23, Muhavare: 60, Bayan: 30, Adab: 40, Talafuz: 30 };
  check("Phase1 new counts match the fill plan (75/66/39/50/42/23/60/30/40/30)",
    Object.entries(FILL).every(([t, n]) => newCounts[t] === n), JSON.stringify(newCounts));
  const MAP_TOTAL = { Ism: 80, Fil: 70, Harf: 40, Jumla: 50, JinsAdad: 50, Lughat: 50, Muhavare: 60, Bayan: 30, Adab: 40, Talafuz: 30 };
  const exCounts = {};
  for (const t of Object.values(EXISTING_MAP)) exCounts[t] = (exCounts[t] || 0) + 1;
  const totals = {};
  for (const t of Object.keys(MAP_TOTAL)) totals[t] = (exCounts[t] || 0) + (newCounts[t] || 0);
  check("Phase1 map totals match §3.4 allocations (80/70/40/50/50/50/60/30/40/30 = 500)",
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
  check("Phase1 manifest BANK_COUNTS: urdu 500, 16 banks, total 4286",
    counts.urdu === 500 && Object.keys(counts).length === 16 && sum === 4286,
    `urdu=${counts.urdu} sum=${sum}`);
  const trustedBlock = man.slice(man.indexOf("BANK_TRUSTED"), man.indexOf("};", man.indexOf("BANK_TRUSTED")));
  const trusted = {};
  for (const [, k, v] of trustedBlock.matchAll(/"([a-z_]+)":\s*(\d+)/g)) trusted[k] = Number(v);
  check("Phase1 manifest BANK_TRUSTED urdu still 1 (new items all draft)",
    trusted.urdu === 1, `got ${trusted.urdu}`);
  const idBlock = man.slice(man.indexOf("ID_BANK"));
  const missing = expectIds.filter((id) => !idBlock.includes(`"${id}": "urdu"`));
  check("Phase1 manifest ID_BANK maps all URD-001..URD-500 to urdu", missing.length === 0, missing.slice(0, 5).join(", "));
  const idCount = (idBlock.match(/": "/g) || []).length;
  check("Phase1 manifest ID_BANK holds 4286 ids", idCount === 4286, `got ${idCount}`);
}

// ---------- §8 no-other-bank scope + content.json counts ----------
{
  const EXPECTED_OTHER = { arabic: 500, drawing: 50, pe: 46, english: 500, gk: 30, islamiyat: 500, it: 60, maths: 500, pakstudies: 500, pastpapers: 20, pastpapers_reworded: 20, pedagogy: 500, science: 30, socialstudies: 30, tajweed: 500 };
  const badBanks = [];
  for (const [k, n] of Object.entries(EXPECTED_OTHER)) {
    const len = JSON.parse(read(`src/data/banks/${k}.json`)).length;
    if (len !== n) badBanks.push(`${k}=${len}`);
  }
  check("Phase1 no other bank changed size (15 banks at expected counts)", badBanks.length === 0, badBanks.join(", "));
  const content = JSON.parse(read("src/data/content.json"));
  const bySubj = Object.fromEntries(content.counts.bySubject);
  const otherRowsOk = Object.entries(EXPECTED_OTHER).every(([k, n]) => {
    const label = { arabic: "Arabic", drawing: "Drawing", pe: "Physical Education", english: "English", gk: "GK", islamiyat: "Islamiyat", it: "IT", maths: "Maths", pakstudies: "Pak Studies", pastpapers: "Past-Paper Topics", pastpapers_reworded: "Past-Paper Topics (Reworded)", pedagogy: "Pedagogy", science: "General Science", socialstudies: "Social Studies", tajweed: "Tajweed" }[k];
    return bySubj[label] === n;
  });
  check("Phase1 content.json counts: total 4286, Urdu 500, other rows unchanged, 151/70/19/20",
    content.counts.total === 4286 && bySubj.Urdu === 500 && otherRowsOk &&
    content.counts.notes === 151 && content.counts.cards === 70 && content.counts.tracks === 19 && content.counts.mocks === 20,
    `total=${content.counts.total} urdu=${bySubj.Urdu}`);
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
console.log("\nAll Phase 1 Urdu checks passed.");
