// Phase 1 Tajweed tests — bank grown 82 -> 500 MCQs (TAJ-083..TAJ-500),
// each trilingual at creation (English + Urdu script + Roman Urdu).
// Plain node, no dependencies. Run: node scripts/test-phase1-tajweed.mjs
// (exit 0 = all pass). Locks:
//  - 500 items, ID sequence complete, file order == ID order;
//  - new items: exact 23-key schema, all-6-fields completeness, fixed
//    fields (draft/unverified, reviewedBy/reviewedAt null), honest
//    concept-extracted source labels;
//  - dedupe: normalized question text unique across all 500, and the
//    qa-540 first-12-words stem rule holds across all active banks;
//  - one correct answer + explanation present in all 3 languages;
//  - correctIndex distribution on NEW items only (the existing 82 are
//    skewed 12/49/19/2 and are never touched);
//  - honorific audit (zero Latin abbreviations) + Arabic-verbatim audit
//    (every Arabic run in an English field appears byte-identical in the
//    _ur and _roman versions of the SAME field, per the Stage 5B rule;
//    no new Arabic runs in _roman fields) + digit preservation +
//    no Hadith numbers/citations/narration words;
//  - topic coverage matches the §3.2 map (report.md) fill plan, with the
//    existing 82 classified by content via the embedded ID map;
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
const POSTS = ["zamungkor-qari", "qari"];
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const digs = (s) => (s.match(/[0-9]/g) || []).sort().join(",");
const runs = (s) => (s.match(AR_RUN) || []).filter((r) => r.trim().length > 0);

const bank = JSON.parse(read("src/data/banks/tajweed.json"));
const existing = bank.slice(0, 82);
const news = bank.slice(82);

// ---------- §1 shape + ID sequence ----------
check("Phase1 tajweed bank is 500 items", bank.length === 500, `got ${bank.length}`);
const expectIds = Array.from({ length: 500 }, (_, i) => "TAJ-" + String(i + 1).padStart(3, "0"));
check("Phase1 IDs are exactly TAJ-001..TAJ-500 in file order",
  JSON.stringify(bank.map((q) => q.id)) === JSON.stringify(expectIds));
check("Phase1 existing 82 keep their IDs in place",
  JSON.stringify(existing.map((q) => q.id)) === JSON.stringify(expectIds.slice(0, 82)));
check("Phase1 new items are TAJ-083..TAJ-500",
  news.length === 418 && news[0].id === "TAJ-083" && news[417].id === "TAJ-500");

// ---------- §2 new-item schema + fixed fields + completeness ----------
let bad = [];
for (const q of news) {
  if (JSON.stringify(Object.keys(q)) !== JSON.stringify(KEYS)) bad.push(q.id + ":keys");
  for (const k of FORBIDDEN) if (k in q) bad.push(q.id + ":forbidden:" + k);
  if (JSON.stringify(q.post) !== JSON.stringify(POSTS)) bad.push(q.id + ":post");
  if (q.subject !== "Tajweed" || q.subjectKey !== "tajweed") bad.push(q.id + ":subject");
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

// ---------- §6 topic coverage vs the §3.2 map ----------
// Existing 82 classified by content:
// Makharij 001–007 + 029 (8; 029 is the general Tajweed definition,
// counted under the opening topic); Sifaat 025 + 039–042 + 051–060 (15;
// incl. Qalqalah, Tafkheem, Raa, Laam); Noon 008–015 + 031/032/034–037/
// 047/048 (16); Meem 016–019 + 033/038/049/050 (8); Madd 020–024 +
// 043–046 + 064–066 (12); Ghunnah/SunMoon 026 + 061/062 (3);
// Waqf 027/028 + 063 (Hamzatul Wasl, via Ibtida) + 067–070 (7);
// Hifz 030 (Juz count) + 071–082 (13).
const EXISTING_MAP = {};
for (let i = 1; i <= 7; i++) EXISTING_MAP["TAJ-" + String(i).padStart(3, "0")] = "Makharij";
EXISTING_MAP["TAJ-029"] = "Makharij";
EXISTING_MAP["TAJ-025"] = "Sifaat";
for (let i = 39; i <= 42; i++) EXISTING_MAP["TAJ-" + String(i).padStart(3, "0")] = "Sifaat";
for (let i = 51; i <= 60; i++) EXISTING_MAP["TAJ-" + String(i).padStart(3, "0")] = "Sifaat";
for (let i = 8; i <= 15; i++) EXISTING_MAP["TAJ-" + String(i).padStart(3, "0")] = "Noon";
for (const i of [31, 32, 34, 35, 36, 37, 47, 48]) EXISTING_MAP["TAJ-" + String(i).padStart(3, "0")] = "Noon";
for (let i = 16; i <= 19; i++) EXISTING_MAP["TAJ-" + String(i).padStart(3, "0")] = "Meem";
for (const i of [33, 38, 49, 50]) EXISTING_MAP["TAJ-" + String(i).padStart(3, "0")] = "Meem";
for (let i = 20; i <= 24; i++) EXISTING_MAP["TAJ-" + String(i).padStart(3, "0")] = "Madd";
for (let i = 43; i <= 46; i++) EXISTING_MAP["TAJ-" + String(i).padStart(3, "0")] = "Madd";
for (let i = 64; i <= 66; i++) EXISTING_MAP["TAJ-" + String(i).padStart(3, "0")] = "Madd";
EXISTING_MAP["TAJ-026"] = "GhunnahSunMoon";
EXISTING_MAP["TAJ-061"] = "GhunnahSunMoon";
EXISTING_MAP["TAJ-062"] = "GhunnahSunMoon";
EXISTING_MAP["TAJ-027"] = "Waqf";
EXISTING_MAP["TAJ-028"] = "Waqf";
EXISTING_MAP["TAJ-063"] = "Waqf";
for (let i = 67; i <= 70; i++) EXISTING_MAP["TAJ-" + String(i).padStart(3, "0")] = "Waqf";
EXISTING_MAP["TAJ-030"] = "Hifz";
for (let i = 71; i <= 82; i++) EXISTING_MAP["TAJ-" + String(i).padStart(3, "0")] = "Hifz";
{
  const unclassified = existing.filter((q) => !(q.id in EXISTING_MAP)).map((q) => q.id);
  const extra = Object.keys(EXISTING_MAP).filter((id) => !existing.some((q) => q.id === id));
  check("Phase1 existing-82 classification covers every existing ID exactly once",
    unclassified.length === 0 && extra.length === 0 && Object.keys(EXISTING_MAP).length === 82,
    `unclassified=${unclassified.join(",")} extra=${extra.join(",")}`);
  const exCounts = {};
  for (const t of Object.values(EXISTING_MAP)) exCounts[t] = (exCounts[t] || 0) + 1;
  check("Phase1 existing counts: Makharij 8 / Sifaat 15 / Noon 16 / Meem 8 / Madd 12 / GhunnahSunMoon 3 / Waqf 7 / Hifz 13",
    exCounts.Makharij === 8 && exCounts.Sifaat === 15 && exCounts.Noon === 16 && exCounts.Meem === 8 &&
    exCounts.Madd === 12 && exCounts.GhunnahSunMoon === 3 && exCounts.Waqf === 7 && exCounts.Hifz === 13,
    JSON.stringify(exCounts));
}
const LABEL_TO_MAP = {
  "Tajweed — Makharij": "Makharij",
  "Tajweed — Sifaat": "Sifaat",
  "Tajweed — Noon Sakinah": "Noon",
  "Tajweed — Meem Sakinah": "Meem",
  "Tajweed — Madd": "Madd",
  "Tajweed — Ghunnah & Sun/Moon Letters": "GhunnahSunMoon",
  "Tajweed — Waqf": "Waqf",
  "Hifz — Quranic Facts": "Hifz",
  "Hifz — Method": "Hifz",
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
  const FILL = { Makharij: 82, Sifaat: 55, Noon: 74, Meem: 42, Madd: 58, GhunnahSunMoon: 37, Waqf: 33, Hifz: 37 };
  check("Phase1 new counts match the fill plan (82/55/74/42/58/37/33/37)",
    Object.entries(FILL).every(([t, n]) => newCounts[t] === n), JSON.stringify(newCounts));
  const MAP_TOTAL = { Makharij: 90, Sifaat: 70, Noon: 90, Meem: 50, Madd: 70, GhunnahSunMoon: 40, Waqf: 40, Hifz: 50 };
  const exCounts = {};
  for (const t of Object.values(EXISTING_MAP)) exCounts[t] = (exCounts[t] || 0) + 1;
  const totals = {};
  for (const t of Object.keys(MAP_TOTAL)) totals[t] = (exCounts[t] || 0) + (newCounts[t] || 0);
  check("Phase1 map totals match §3.2 allocations (90/70/90/50/70/40/40/50 = 500)",
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
  check("Phase1 manifest BANK_COUNTS: tajweed 500, 16 banks, total 6136",
    counts.tajweed === 500 && Object.keys(counts).length === 16 && sum === 6136,
    `tajweed=${counts.tajweed} sum=${sum}`);
  const trustedBlock = man.slice(man.indexOf("BANK_TRUSTED"), man.indexOf("};", man.indexOf("BANK_TRUSTED")));
  const trusted = {};
  for (const [, k, v] of trustedBlock.matchAll(/"([a-z_]+)":\s*(\d+)/g)) trusted[k] = Number(v);
  check("Phase1 manifest BANK_TRUSTED tajweed still 0 (new items all draft)",
    trusted.tajweed === 0, `got ${trusted.tajweed}`);
  const idBlock = man.slice(man.indexOf("ID_BANK"));
  const missing = expectIds.filter((id) => !idBlock.includes(`"${id}": "tajweed"`));
  check("Phase1 manifest ID_BANK maps all TAJ-001..TAJ-500 to tajweed", missing.length === 0, missing.slice(0, 5).join(", "));
  const idCount = (idBlock.match(/": "/g) || []).length;
  check("Phase1 manifest ID_BANK holds 6136 ids", idCount === 6136, `got ${idCount}`);
}

// ---------- §8 no-other-bank scope + content.json counts ----------
{
  const EXPECTED_OTHER = { arabic: 500, drawing: 50, pe: 46, english: 500, gk: 500, islamiyat: 500, it: 500, maths: 500, pakstudies: 500, pastpapers: 20, pastpapers_reworded: 20, pedagogy: 500, science: 500, socialstudies: 500, urdu: 500 };
  const badBanks = [];
  for (const [k, n] of Object.entries(EXPECTED_OTHER)) {
    const len = JSON.parse(read(`src/data/banks/${k}.json`)).length;
    if (len !== n) badBanks.push(`${k}=${len}`);
  }
  check("Phase1 no other bank changed size (15 banks at expected counts)", badBanks.length === 0, badBanks.join(", "));
  const content = JSON.parse(read("src/data/content.json"));
  const bySubj = Object.fromEntries(content.counts.bySubject);
  const otherRowsOk = Object.entries(EXPECTED_OTHER).every(([k, n]) => {
    const label = { arabic: "Arabic", drawing: "Drawing", pe: "Physical Education", english: "English", gk: "GK", islamiyat: "Islamiyat", it: "IT", maths: "Maths", pakstudies: "Pak Studies", pastpapers: "Past-Paper Topics", pastpapers_reworded: "Past-Paper Topics (Reworded)", pedagogy: "Pedagogy", science: "General Science", socialstudies: "Social Studies", urdu: "Urdu" }[k];
    return bySubj[label] === n;
  });
  check("Phase1 content.json counts: total 6136, Tajweed 500, other rows unchanged, 151/70/19/20",
    content.counts.total === 6136 && bySubj.Tajweed === 500 && otherRowsOk &&
    content.counts.notes === 151 && content.counts.cards === 70 && content.counts.tracks === 19 && content.counts.mocks === 20,
    `total=${content.counts.total} tajweed=${bySubj.Tajweed}`);
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
console.log("\nAll Phase 1 Tajweed checks passed.");
