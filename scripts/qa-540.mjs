// qa-540.mjs — structural + consistency-heuristic QA for the ETEA Prep banks.
// NOTE: the filename is historical — it dates from when the bank held 540
// items. The active total is now 763 (Phase 4B2 added 62: 30 Drawing + 32 Tajweed); the name is kept so existing
// references (`npm run qa`, QA-540.md, VERIFY-phase2.md) keep working.
// Plain node, no dependencies. Run: npm run qa  (node scripts/qa-540.mjs)
// Exit code 0 = all checks pass; 1 = any check fails.
//
// SCOPE: this is STRUCTURAL + consistency-heuristic QA only. It checks counts,
// option shape, ID uniqueness, near-duplicate stems, the PED-009 regression and
// mock-composition consistency. It does NOT declare the bank subject-matter
// verified — full subject verification of all 763 items is out of scope.
//
// Bank layout note: drawing_pe.json is LEGACY — kept on disk, superseded by
// drawing.json (DRW-001..DRW-010 + DRW-021..DRW-060) + pe.json (DRW-011..020 + PE-001..PE-036).
// It is still parsed and structurally checked, and asserted to equal the
// ORIGINAL 20 split items (DRW-001..DRW-020), but it is EXCLUDED from the
// active totals.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BANKS_DIR = join(ROOT, "src/data/banks");
const CONTENT_PATH = join(ROOT, "src/data/content.json");

// Expected ACTIVE per-bank counts (drawing_pe.json excluded — legacy).
const EXPECTED = {
  arabic: 80, drawing: 50, pe: 46, english: 45, gk: 30, islamiyat: 105,
  it: 60, maths: 45, pakstudies: 45, pastpapers: 20, pastpapers_reworded: 20,
  pedagogy: 30, science: 30, socialstudies: 30, tajweed: 82, urdu: 45,
};
const EXPECTED_TOTAL = Object.values(EXPECTED).reduce((a, b) => a + b, 0); // 763
const LEGACY_FILE = "drawing_pe.json";

const results = []; // { name, pass, detail }
function check(name, pass, detail = "") {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function normStem(q) {
  // Unicode-aware: keep letters/digits from any script (Urdu/Arabic questions
  // must not collapse to an empty stem).
  return q.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

// ---------- load banks ----------
const bankFiles = readdirSync(BANKS_DIR).filter((f) => f.endsWith(".json")).sort();
const banks = {}; // key (filename without .json) -> items
for (const f of bankFiles) {
  const items = loadJson(join(BANKS_DIR, f));
  if (!Array.isArray(items)) {
    check(`bank ${f} is a JSON array`, false, `top level is ${typeof items}`);
    continue;
  }
  banks[f.replace(/\.json$/, "")] = items;
}

// ---------- 1. counts ----------
for (const [key, expected] of Object.entries(EXPECTED)) {
  const got = banks[key] ? banks[key].length : 0;
  check(`count ${key}.json`, got === expected, `expected ${expected}, got ${got}`);
}
const legacyCount = banks.drawing_pe ? banks.drawing_pe.length : 0;
check("legacy drawing_pe.json still on disk (20 items)", legacyCount === 20, `got ${legacyCount}`);
const activeTotal = Object.entries(banks)
  .filter(([k]) => k !== "drawing_pe")
  .reduce((sum, [, items]) => sum + items.length, 0);
check("active total items", activeTotal === EXPECTED_TOTAL, `expected ${EXPECTED_TOTAL}, got ${activeTotal}`);
const onDiskTotal = Object.values(banks).reduce((s, items) => s + items.length, 0);
console.log(`INFO  on-disk total incl. legacy drawing_pe.json: ${onDiskTotal}`);

// ---------- 2. per-item shape (all files incl. legacy) ----------
// Stage 1 P0.1 (2026-11-12): the owner personally reviewed + approved 15
// items — ISL-001 on the /review dashboard (2026-11-11T22:01:56Z) and the
// 14 structural-check flags in chat (~03:23 PKT 2026-11-12). Those 15 are
// stored owner-reviewed at BANK level (visible on every device); every
// other item stays draft. Vocabulary: draft / needs-review / disputed /
// owner-reviewed / approved — there is no bare "verified" status.
const OWNER_REVIEWED_15 = {
  "ISL-001": "2026-11-11T22:01:56Z",
  "ENG-005": "2026-11-11T22:23:00Z", "ENG-006": "2026-11-11T22:23:00Z",
  "ENG-008": "2026-11-11T22:23:00Z", "ENG-012": "2026-11-11T22:23:00Z",
  "ENG-013": "2026-11-11T22:23:00Z", "ENG-019": "2026-11-11T22:23:00Z",
  "ENG-020": "2026-11-11T22:23:00Z", "ENG-025": "2026-11-11T22:23:00Z",
  "ENG-026": "2026-11-11T22:23:00Z", "ISL-029": "2026-11-11T22:23:00Z",
  "ISL-055": "2026-11-11T22:23:00Z", "MAT-022": "2026-11-11T22:23:00Z",
  "PAK-008": "2026-11-11T22:23:00Z", "URD-001": "2026-11-11T22:23:00Z",
};
let shapeBad = [];
let reviewBad = [];
for (const [key, items] of Object.entries(banks)) {
  for (const it of items) {
    const opts = it.options;
    const okOpts = Array.isArray(opts) && opts.length === 4 &&
      new Set(opts.map((o) => String(o).trim())).size === 4;
    const okCi = Number.isInteger(it.correctIndex) && it.correctIndex >= 0 && it.correctIndex <= 3;
    const okQ = typeof it.question === "string" && it.question.trim().length > 0;
    const okExpl = typeof it.explanation === "string" && it.explanation.trim().length > 0;
    if (!okOpts || !okCi || !okQ || !okExpl) {
      shapeBad.push(`${it.id || "?"} (${key}): opts4distinct=${okOpts} correctIndex=${okCi} question=${okQ} explanation=${okExpl}`);
    }
    const expectedAt = OWNER_REVIEWED_15[it.id];
    if (expectedAt !== undefined) {
      if (it.reviewStatus !== "owner-reviewed" || it.reviewedBy !== "owner" || it.reviewedAt !== expectedAt) {
        reviewBad.push(`${it.id || "?"} (${key}): expected owner-reviewed by owner @ ${expectedAt}, got ${it.reviewStatus} / ${it.reviewedBy} / ${it.reviewedAt}`);
      }
    } else if (it.reviewStatus !== "draft" || !("reviewedBy" in it) || !("reviewedAt" in it)) {
      reviewBad.push(`${it.id || "?"} (${key})`);
    }
  }
}
check("every item: 4 distinct options, correctIndex 0–3, non-empty question + explanation", shapeBad.length === 0,
  shapeBad.length ? `${shapeBad.length} bad: ${shapeBad.slice(0, 5).join(" | ")}` : `${onDiskTotal} items checked`);
check("review status: exactly the 15 owner-approved items are owner-reviewed (by owner, with timestamps); all others draft", reviewBad.length === 0,
  reviewBad.length ? `${reviewBad.length} bad: ${reviewBad.slice(0, 5).join(" | ")}` : `${onDiskTotal} items checked, 15 owner-reviewed`);

// ---------- 3. unique IDs (active banks; legacy ids intentionally overlap the split) ----------
{
  const seen = new Map();
  const dupes = [];
  for (const [key, items] of Object.entries(banks)) {
    if (key === "drawing_pe") continue;
    for (const it of items) {
      if (seen.has(it.id)) dupes.push(`${it.id} in ${seen.get(it.id)} and ${key}`);
      else seen.set(it.id, key);
    }
  }
  check("unique IDs across active banks", dupes.length === 0, dupes.length ? dupes.slice(0, 5).join(" | ") : `${seen.size} unique IDs`);
}

// ---------- 4. near-duplicate stems (first 12 words, active banks) ----------
{
  const groups = new Map();
  for (const [key, items] of Object.entries(banks)) {
    if (key === "drawing_pe") continue; // legacy duplicates the split files by design
    for (const it of items) {
      const stem = normStem(it.question).split(" ").slice(0, 12).join(" ");
      if (!groups.has(stem)) groups.set(stem, []);
      groups.get(stem).push(`${it.id} (${key})`);
    }
  }
  const dupGroups = [...groups.entries()].filter(([, ids]) => ids.length > 1);
  check("no duplicate question stems (shared first 12 words)", dupGroups.length === 0,
    dupGroups.length
      ? `${dupGroups.length} group(s): ` + dupGroups.slice(0, 10).map(([s, ids]) => `"${s}" -> ${ids.join(", ")}`).join(" ; ")
      : "none found");
}

// ---------- 5. PED-009 regression ----------
{
  const ped = banks.pedagogy || [];
  const item = ped.find((x) => x.id === "PED-009");
  const ok = !!item && item.correctIndex === 1 && item.options[1] === "Egocentrism" &&
    typeof item.explanation === "string" && item.explanation.includes("Egocentrism");
  check("PED-009 regression (correctIndex=1, options[1]=Egocentrism, explanation mentions Egocentrism)", ok,
    item ? `correctIndex=${item.correctIndex}, options[1]=${JSON.stringify(item.options[1])}` : "PED-009 not found");
}

// ---------- 6. DM/PET split integrity ----------
{
  const drawing = banks.drawing || [];
  const pe = banks.pe || [];
  const legacy = banks.drawing_pe || [];
  const drawingIds = drawing.map((x) => x.id);
  const peIds = pe.map((x) => x.id);
  check("drawing.json = DRW-001..DRW-010 + DRW-021..DRW-060", JSON.stringify(drawingIds) === JSON.stringify([...Array.from({ length: 10 }, (_, i) => `DRW-${String(i + 1).padStart(3, "0")}`), ...Array.from({ length: 40 }, (_, i) => `DRW-${String(i + 21).padStart(3, "0")}`)]),
    `got ${drawingIds.join(",")}`);
  check("pe.json = DRW-011..DRW-020 + PE-001..PE-036", JSON.stringify(peIds) === JSON.stringify([...Array.from({ length: 10 }, (_, i) => `DRW-${String(i + 11).padStart(3, "0")}`), ...Array.from({ length: 36 }, (_, i) => `PE-${String(i + 1).padStart(3, "0")}`)]),
    `got ${peIds.join(",")}`);
  const legacyIds = legacy.map((x) => x.id);
  const originalIds = [...drawingIds.slice(0, 10), ...peIds.slice(0, 10)];
  check("legacy drawing_pe.json IDs = original DRW-001..DRW-020", JSON.stringify(legacyIds) === JSON.stringify(originalIds),
    `legacy ${legacyIds.length}, original ${originalIds.length}`);
  // Step 3b-audit2 (F02) — the legacy file predates the additive
  // explanationEn/explanationLang fields and is never loaded; the
  // comparison ignores them (as it already ignores review fields) so
  // the original content still has to match exactly.
  // Stage 5F — the split banks now also carry additive Stage 5
  // translation fields (_ur/_roman); the legacy file predates those too,
  // so the comparison ignores them as well. Same intent: original
  // content must still match exactly.
  const strip = (items) => items.map(({ reviewStatus, reviewedBy, reviewedAt, explanationEn, explanationLang, question_ur, question_roman, options_ur, options_roman, explanation_ur, explanation_roman, ...rest }) => rest);
  // Legacy holds only the ORIGINAL 20 items (DRW-001..020); the 20 items
  // added in the post-verification fix (DRW-021..030, PE-001..PE-010) are
  // in the split banks only, so the legacy file is compared against the
  // first 10 drawing + first 10 pe items, not the full union.
  const legacyContentMatches = JSON.stringify(strip(legacy)) === JSON.stringify([...strip(drawing.slice(0, 10)), ...strip(pe.slice(0, 10))]);
  check("legacy drawing_pe.json content = original 20 split items (ignoring review fields)", legacyContentMatches);
  // Post-verification fix (2026-11-11): 10 new drawing + 10 new PE items.
  // (Phase 4B1 appended PE-011..PE-036 and Phase 4B2 appended DRW-031..DRW-060
  // after them, so the post-fix slices are bounded to indices 10..19 — the
  // original 20 post-fix items.)
  const newItems = [...drawing.slice(10, 20), ...pe.slice(10, 20)];
  const newOk = newItems.length === 20 &&
    newItems.every((x) => x.sourceNote === "AI-drafted; unreviewed" && x.reviewStatus === "draft" && x.verified === false && x.source === "ai-generated");
  check("20 post-fix items (DRW-021..030, PE-001..PE-010): AI-drafted, draft, unverified", newOk,
    `got ${newItems.length} items: ${newItems.map((x) => x.id).join(",")}`);
  const newDrawingOk = drawing.slice(10).every((x) => x.subject === "Drawing" && x.subjectKey === "drawing");
  const newPeOk = pe.slice(10, 20).every((x) => x.subject === "Physical Education" && x.subjectKey === "pe");
  check("new items carry split labels (drawing / pe, not drawing_pe)", newDrawingOk && newPeOk);
  // new SS bank
  const ss = banks.socialstudies || [];
  const ssOk = ss.length === 30 && ss.every((x) => x.id.startsWith("SS-") && x.sourceNote === "AI-drafted from ETEA 453 Social Studies block; unreviewed" && x.reviewStatus === "draft" && x.verified === false);
  check("socialstudies.json: 30 items, SS-### ids, sourceNote + draft + unverified", ssOk, `got ${ss.length} items`);
}

// ---------- 7. GK rework regression (no generic world-capitals items) ----------
{
  const gk = banks.gk || [];
  const generic = /capital of (france|the united kingdom|the united states|china|japan|germany|italy|spain|russia|canada|australia|india|turkey|egypt)/i;
  const bad = gk.filter((x) => generic.test(x.question));
  const topics = [...new Set(gk.map((x) => x.topic))];
  check("gk.json reworked: no generic world-capitals items", bad.length === 0,
    bad.length ? bad.map((x) => x.id).join(", ") : `30 items, topics: ${topics.join("; ")}`);
  check("gk.json keeps GKN-001..GKN-030 ids", JSON.stringify(gk.map((x) => x.id)) === JSON.stringify(Array.from({ length: 30 }, (_, i) => `GKN-${String(i + 1).padStart(3, "0")}`)));
}

// ---------- 8. content.json composition tests ----------
const content = loadJson(CONTENT_PATH);
{
  const compB = content.compB || {};
  const mocks = Object.fromEntries((content.mocks || []).map((m) => [m.id, m]));

  // DM mock: drawing only, zero PE items; PET mock: PE only, zero drawing items.
  const dmComp = mocks["dm-B"]?.comp || {};
  const petComp = mocks["pet-B"]?.comp || {};
  check("dm-B comp uses drawing:20, no pe/drawing_pe", dmComp.drawing === 20 && !("pe" in dmComp) && !("drawing_pe" in dmComp),
    JSON.stringify(dmComp));
  check("pet-B comp uses pe:20, no drawing/drawing_pe", petComp.pe === 20 && !("drawing" in petComp) && !("drawing_pe" in petComp),
    JSON.stringify(petComp));
  check("compB.dm uses drawing:20", compB.dm?.drawing === 20 && !("drawing_pe" in (compB.dm || {})), JSON.stringify(compB.dm || {}));
  check("compB.pet uses pe:20", compB.pet?.pe === 20 && !("drawing_pe" in (compB.pet || {})), JSON.stringify(compB.pet || {}));

  // SS slots draw from the socialstudies bank: every Version B (453) slot that the
  // tracks label "Social Studies"/"SocSt" must use the socialstudies key, and the
  // bank must hold at least the slot size (10).
  const ssBank = banks.socialstudies || [];
  const ssSlots = [["compB", "tt"], ["compB", "at"], ["compB", "qari"], ["compB", "pst"], ["compB", "ctit"], ["compB", "swse"]];
  let ssSlotBad = [];
  for (const [, track] of ssSlots) {
    const comp = compB[track] || {};
    if (!("socialstudies" in comp) || "pakstudies" in comp) ssSlotBad.push(`compB.${track}`);
  }
  for (const mid of ["tt-B", "at-B", "pst-B", "ctit-B", "qari-B", "swse"]) {
    const comp = mocks[mid]?.comp || {};
    if (!("socialstudies" in comp) || "pakstudies" in comp) ssSlotBad.push(`mock ${mid}`);
  }
  check("Social Studies slots (compB + Version B mocks) use socialstudies, not pakstudies", ssSlotBad.length === 0,
    ssSlotBad.length ? ssSlotBad.join(", ") : `socialstudies bank holds ${ssBank.length} items (>= 10 per slot)`);
  check("socialstudies bank covers every SS slot size", ssSlots.every(([, t]) => (compB[t]?.socialstudies || 0) <= ssBank.length) &&
    ["tt-B", "at-B", "pst-B", "ctit-B", "qari-B", "swse"].every((mid) => (mocks[mid]?.comp?.socialstudies || 0) <= ssBank.length),
    `bank ${ssBank.length} items; each slot needs 10`);

  // Slots explicitly labelled "Pak Studies" must KEEP pakstudies (ZamungKor proxy,
  // Merged-Districts mocks, sst-etea, junior-clerk, computer-operator, police, forest).
  const keepPak = ["tt-MD", "at-MD", "qari-MD", "sst-etea", "jc", "co", "pc", "forest"];
  const keepBad = keepPak.filter((mid) => {
    const comp = mocks[mid]?.comp || {};
    return "socialstudies" in comp;
  });
  check("Pak Studies-labelled mocks keep pakstudies (no socialstudies)", keepBad.length === 0,
    keepBad.length ? keepBad.join(", ") : `${keepPak.length} mocks checked`);
  const zamKept = ["zam1", "zam2", "zam3"].every((mid) => {
    const ids = (content.zamFixed || {})[mid] || [];
    return ids.some((id) => id.startsWith("PAK-"));
  });
  check("ZamungKor fixed mocks still draw on PAK-### (Pak Studies) items", zamKept);

  // Stage 1 P0.1: trusted-only count for ZamungKor Mock 1 + Mock 2 must be
  // exactly the 15 owner-reviewed items (bank-level status; no localStorage
  // overrides involved here — this is the raw bank count Trusted Mode fills
  // from on a fresh device).
  const byId = {};
  for (const items of Object.values(banks)) for (const it of items) byId[it.id] = it;
  const zam12Trusted = ["zam1", "zam2"].flatMap((mid) => (content.zamFixed || {})[mid] || [])
    .filter((id) => byId[id] && (byId[id].reviewStatus === "owner-reviewed" || byId[id].reviewStatus === "approved"));
  check("trusted-only count for ZamungKor Mock 1 + Mock 2 is 15 (owner-reviewed at bank level)", zam12Trusted.length === 15,
    `${zam12Trusted.length} trusted: ${zam12Trusted.slice().sort().join(", ")}`);

  // Every comp key used by any mock / compB / compMD / compA must resolve to a bank
  // (or be the legacy drawing_pe key, which no active comp should use any more).
  const bankKeys = new Set(Object.keys(banks));
  const usedKeys = new Set();
  for (const comp of [compB, content.compMD || {}, content.compA || {}]) {
    for (const c of Object.values(comp)) for (const k of Object.keys(c)) usedKeys.add(k);
  }
  for (const m of content.mocks || []) for (const k of Object.keys(m.comp || {})) usedKeys.add(k);
  const unresolvable = [...usedKeys].filter((k) => !bankKeys.has(k));
  check("every comp key resolves to a bank file on disk", unresolvable.length === 0,
    unresolvable.length ? unresolvable.join(", ") : `${usedKeys.size} keys: ${[...usedKeys].sort().join(", ")}`);
  const legacyUsed = [...usedKeys].filter((k) => k === "drawing_pe");
  check("no active comp still references legacy drawing_pe", legacyUsed.length === 0);

  // content.json counts agree with the banks.
  const counts = content.counts || {};
  check("content.json counts.total = 763 (active)", counts.total === EXPECTED_TOTAL, `got ${counts.total}`);
  const bySubjectSum = (counts.bySubject || []).reduce((s, [, n]) => s + n, 0);
  check("content.json counts.bySubject sums to 763", bySubjectSum === EXPECTED_TOTAL, `got ${bySubjectSum}`);
  const bySubject = content.bySubject || {};
  const indexBad = [];
  for (const [key, expected] of Object.entries(EXPECTED)) {
    const ids = bySubject[key];
    if (!ids || ids.length !== expected) indexBad.push(`${key}: index ${ids ? ids.length : 0} vs bank ${expected}`);
  }
  check("content.json bySubject index lengths match bank counts", indexBad.length === 0,
    indexBad.length ? indexBad.join("; ") : "all 16 active banks indexed");

  // Copy checks: corrigendum link, softened B confidence, practice-timer notes, Qari heuristic note.
  const links = content.links || [];
  check("ZamungKor 891 corrigendum link present in links",
    links.some(([label, url]) => url === "https://etea.online/advertisement/corrigendum/891_zamungkor_2026_corrigendum.jpg" && /corrigendum/i.test(label)),
    `${links.length} links`);
  check("patterns.B.confidence no longer claims a confirmed 2025-paper match",
    !/matches 2025 TT\/AT papers/.test(content.patterns?.B?.confidence || "") &&
    /UNVERIFIED/.test(content.patterns?.B?.confidence || ""),
    JSON.stringify(content.patterns?.B?.confidence || ""));
  const hundredMin = (content.mocks || []).filter((m) => m.minutes === 100);
  const timerBad = hundredMin.filter((m) => !/practice timer/i.test(m.note || ""));
  check("every 100-min mock note labels the timer a practice timer", timerBad.length === 0,
    timerBad.length ? timerBad.map((m) => m.id).join(", ") : `${hundredMin.length} mocks checked`);
  const qariNote = mocks["qari-B"]?.note || "";
  check("qari-B note documents the 20+10 split as an app heuristic",
    /app heuristic/i.test(qariNote) && /combined/i.test(qariNote) && !/make the combined 30 block\./.test(qariNote),
    qariNote.slice(0, 120) + "…");
}

// ---------- 9. built mock lengths (provisional) ----------
// Replicates buildMockQuestions from src/lib/data.ts (same mulberry32 /
// hashSeed / per-subject sample-without-replacement) against the live banks.
// Added in the post-verification DM/PET fix: the comp-text checks in §8
// cannot catch a bank too small for its slot, so the built length is
// asserted directly — every mock must build exactly its advertised total,
// with no duplicate question inside a mock.
{
  const mulberry32 = (seed) => {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const hashSeed = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  const shuffled = (arr, rand) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const buildMock = (mock) => {
    if (mock.fixed && content.zamFixed[mock.fixed]) {
      return content.zamFixed[mock.fixed].map((id) => {
        for (const items of Object.values(banks)) {
          const q = items.find((x) => x.id === id);
          if (q) return q;
        }
        return null;
      }).filter(Boolean);
    }
    const rand = mulberry32(hashSeed(mock.id));
    const out = [];
    for (const [key, count] of Object.entries(mock.comp || {})) {
      const pool = key === "drawing_pe"
        ? [...(banks.drawing || []), ...(banks.pe || [])]
        : (banks[key] || []);
      out.push(...shuffled(pool, rand).slice(0, count));
    }
    return shuffled(out, rand);
  };
  const short = [];
  const dupes = [];
  for (const m of content.mocks || []) {
    const qs = buildMock(m);
    if (qs.length !== m.total) short.push(`${m.id}: built ${qs.length} vs total ${m.total}`);
    if (new Set(qs.map((q) => q.id)).size !== qs.length) dupes.push(m.id);
  }
  check("every mock builds its advertised total (provisional, no duplicates)", short.length === 0 && dupes.length === 0,
    short.length ? short.join("; ") : `${(content.mocks || []).length} mocks checked${dupes.length ? `; dupes in ${dupes.join(",")}` : ""}`);
  const dmQs = buildMock(content.mocks.find((m) => m.id === "dm-B"));
  const petQs = buildMock(content.mocks.find((m) => m.id === "pet-B"));
  const dmOk = dmQs.length === 100 && dmQs.filter((q) => q.subjectKey === "drawing").length === 20 &&
    dmQs.filter((q) => q.subjectKey === "pe").length === 0;
  const petOk = petQs.length === 100 && petQs.filter((q) => q.subjectKey === "pe").length === 20 &&
    petQs.filter((q) => q.subjectKey === "drawing").length === 0;
  check("dm-B builds 100 (20 drawing, 0 PE); pet-B builds 100 (20 PE, 0 drawing)", dmOk && petOk,
    `dm-B ${dmQs.length}Q, pet-B ${petQs.length}Q`);
}

// ---------- summary ----------
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}${f.detail ? " — " + f.detail : ""}`);
}
process.exit(failed.length ? 1 : 0);
