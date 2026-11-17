// Phase 3 mocks tests — the 8 new mock definitions frozen in
// ~/workspace/phase3/BRIEF.md. Plain node, no dependencies.
// Run: node scripts/test-phase3-mocks.mjs (exit 0 = all pass). Locks:
//  - the 8 new defs exist at the BRIEF-specified positions, with the
//    exact English titles/notes, tracks, variants, minutes, totals;
//  - comps verbatim: ct-B == COMP_B.ct, pst-A == COMP_A.pst,
//    ctit-A == COMP_A.ctit, dm-2/pet-2/swse-2/sst-etea-2 == their
//    mirror mocks, sst-kppsc-2 comp + scoring == sst-kppsc's;
//  - every comp sums to its total; the standing "Expected pattern"
//    label opens every ETEA-pattern new note verbatim (and is absent
//    from the KPPSC note, whose scoring note already states the
//    unverified assumption);
//  - trilingual fields present + non-empty on all 8, with
//    digit-group preservation (same method as test-phase2-mocks);
//  - the 3 fixed ZamungKor lists stay 3 x 100, pairwise disjoint,
//    every id existing in the banks (re-asserted here);
//  - visible set is exactly the 24 known ids; every visible track
//    has >= 1 mock; every visible mock is FULL at current bank
//    sizes (mockAvailableCount from the BANK_COUNTS manifest,
//    cross-checked against an independent recomputation from the
//    bank files);
//  - dynamic sampling differs by mock id (dm-B vs dm-2, same seed)
//    and is deterministic for the same mock + seed.
// The real data.ts is exercised through the same tsc harness as
// test-phase2-mocks §3: node type-stripping cannot import data.ts
// (its extensionless JSON import needs an import attribute), so the
// compiled-CommonJS harness is the working pattern here, as in
// test-lazy-banks.mjs.
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(fs.readFileSync(join(ROOT, p), "utf8"));

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const content = readJson("src/data/content.json");
const mocks = content.mocks;
const byId = Object.fromEntries(mocks.map((m) => [m.id, m]));
const ARABIC = /[\u0600-\u06FF]/;
const digitGroups = (s) => (s.match(/\d+(?:\.\d+)?/g) || []).sort().join(",");
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const NEW_IDS = ["pst-A", "ct-B", "ctit-A", "dm-2", "pet-2", "swse-2", "sst-kppsc-2", "sst-etea-2"];
const EXPECTED = {
  "pst-A": { track: "pst", variant: "A", minutes: 100, total: 100, title: "PST Mock — Version A (2020)" },
  "ct-B": { track: "ct", variant: "B", minutes: 100, total: 100, title: "CT Mock — Version B (453)" },
  "ctit-A": { track: "ctit", variant: "A", minutes: 100, total: 100, title: "CT-IT Mock — Version A (2020)" },
  "dm-2": { track: "dm", variant: "B", minutes: 100, total: 100, title: "DM Mock 2 — Version B (453)" },
  "pet-2": { track: "pet", variant: "B", minutes: 100, total: 100, title: "PET Mock 2 — Version B (453)" },
  "swse-2": { track: "swse", variant: "435", minutes: 100, total: 100, title: "Social Welfare Theology Teacher Mock 2 (BPS-16)" },
  "sst-kppsc-2": { track: "sst-kppsc", variant: "KPPSC-5th", minutes: 60, total: 45, title: "SST (KPPSC) Mock 2 — 45 MCQs" },
  "sst-etea-2": { track: "sst-etea", variant: "ETEA-2020", minutes: 60, total: 40, title: "SST (ETEA) — non-subject portion practice 2" },
};
const EXPECTED_NOTES = {
  "pst-A":
    "Expected pattern — ETEA has not published the official 2026 syllabus. Follows Version A (ETEA 2020 PDF, archive — older, may still appear in some projects). Practice mock — shares the practice bank. The 100-minute timer is a practice timer, not an official ETEA time.",
  "ct-B":
    "Expected pattern — ETEA has not published the official 2026 syllabus. Follows Version B (ETEA PDF 453) using the stored CT composition (Pak Studies 10). Note: the track pattern text and the coverage ledger list Social Studies 10 instead — a pre-existing inconsistency, flagged, not resolved here. Practice mock — shares the practice bank. The 100-minute timer is a practice timer, not an official ETEA time.",
  "ctit-A":
    "Expected pattern — ETEA has not published the official 2026 syllabus. Follows Version A (ETEA 2020 PDF, archive — older, may still appear in some projects). Practice mock — shares the practice bank. The 100-minute timer is a practice timer, not an official ETEA time.",
  "dm-2":
    "Expected pattern — ETEA has not published the official 2026 syllabus. Second set following Version B (ETEA PDF 453) — same composition as DM Mock 1, a different seeded sample; questions may repeat across the two DM mocks. Practice mock — shares the practice bank. The 100-minute timer is a practice timer, not an official ETEA time.",
  "pet-2":
    "Expected pattern — ETEA has not published the official 2026 syllabus. Second set following Version B (ETEA PDF 453) — same composition as PET Mock 1, a different seeded sample; questions may repeat across the two PET mocks. Practice mock — shares the practice bank. The 100-minute timer is a practice timer, not an official ETEA time.",
  "swse-2":
    "Expected pattern — ETEA has not published the official 2026 syllabus. Second set following ETEA PDF 435 (Jan 2025) — same composition as the first Social Welfare mock, a different seeded sample; questions may repeat across the two mocks. A different post from ESED TT BPS-15. Practice mock — shares the practice bank. The 100-minute timer is a practice timer, not an official ETEA time.",
  "sst-kppsc-2":
    "Second set with the same composition and scoring as SST (KPPSC) Mock 1. KPPSC 45 MCQs, 60 minutes (1-hour slot per KPPSC schedule). Subject portion (60%) uses General Science/Maths/Islamiyat as a PROXY — no subject-specific bank yet. Scoring: 1 mark per correct answer, 0.25 deducted per wrong answer (unverified assumption — no official KPPSC source confirms negative marking).",
  "sst-etea-2":
    "Expected pattern — ETEA has not published the official 2026 syllabus. Second set covering only the non-subject part (40 of 100 Q). The 60-Q subject portion needs your subject (Maths/Bio/Chem/IT) — use the Library + Practice sections.",
};
const STANDING_LABEL = "Expected pattern — ETEA has not published the official 2026 syllabus.";
const STANDING_UR = "یہ متوقع پیٹرن ہے، کیونکہ ETEA نے 2026 کا سرکاری نصاب شائع نہیں کیا۔"; // U1 idiomatic rendering (was: متوقع پیٹرن — ETEA نے 2026 کا سرکاری نصاب شائع نہیں کیا ہے۔)
const STANDING_RO = "Expected pattern — ETEA ne 2026 ka official syllabus publish nahi kiya hai.";

// ---- §1 the 8 new defs: existence, shape, frozen English text ----
check("phase3: 28 defs, counts.mocks is 28", mocks.length === 28 && content.counts.mocks === 28, `defs=${mocks.length} counts=${content.counts.mocks}`);
check(
  "phase3: mock order is exactly the BRIEF order (8 insertions at the frozen positions)",
  eq(mocks.map((m) => m.id), [
    "zam1", "zam2", "zam3", "tt-B", "tt-MD", "at-B", "at-MD", "pst-B", "pst-A", "ct-B",
    "ctit-B", "ctit-A", "dm-B", "dm-2", "pet-B", "pet-2", "qari-B", "qari-MD",
    "swse", "swse-2", "sst-kppsc", "sst-kppsc-2", "sst-etea", "sst-etea-2",
    "jc", "co", "pc", "forest",
  ]),
  mocks.map((m) => m.id).join(","),
);
for (const id of NEW_IDS) {
  const m = byId[id];
  const e = EXPECTED[id];
  check(
    `phase3 ${id}: exists with track/variant/minutes/total/title`,
    Boolean(m) && m.track === e.track && m.variant === e.variant && m.minutes === e.minutes && m.total === e.total && m.title === e.title,
    m ? `${m.track}/${m.variant}/${m.minutes}/${m.total} ${JSON.stringify(m.title)}` : "missing",
  );
  check(`phase3 ${id}: English note is the frozen BRIEF text`, m?.note === EXPECTED_NOTES[id]);
  check(
    `phase3 ${id}: dynamic mock (no fixed list), comp sums to its total`,
    Boolean(m) && !m.fixed && m.comp && Object.values(m.comp).reduce((a, b) => a + b, 0) === m.total,
    m ? JSON.stringify(m.comp) : "missing",
  );
}
check(
  "phase3: every dynamic mock comp sums to its total (all 25)",
  mocks.filter((m) => !m.fixed).every((m) => m.comp && Object.values(m.comp).reduce((a, b) => a + b, 0) === m.total),
  mocks.filter((m) => !m.fixed && !(m.comp && Object.values(m.comp).reduce((a, b) => a + b, 0) === m.total)).map((m) => m.id).join(","),
);

// ---- §2 comps + scoring verbatim ----
check("phase3 ct-B comp deep-equals COMP_B.ct", eq(byId["ct-B"]?.comp, content.compB.ct), JSON.stringify(byId["ct-B"]?.comp));
check("phase3 pst-A comp deep-equals COMP_A.pst", eq(byId["pst-A"]?.comp, content.compA.pst), JSON.stringify(byId["pst-A"]?.comp));
check("phase3 ctit-A comp deep-equals COMP_A.ctit", eq(byId["ctit-A"]?.comp, content.compA.ctit), JSON.stringify(byId["ctit-A"]?.comp));
check("phase3 dm-2 comp deep-equals dm-B comp", eq(byId["dm-2"]?.comp, byId["dm-B"]?.comp));
check("phase3 pet-2 comp deep-equals pet-B comp", eq(byId["pet-2"]?.comp, byId["pet-B"]?.comp));
check("phase3 swse-2 comp deep-equals swse comp", eq(byId["swse-2"]?.comp, byId.swse?.comp));
check("phase3 sst-etea-2 comp deep-equals sst-etea comp", eq(byId["sst-etea-2"]?.comp, byId["sst-etea"]?.comp));
check("phase3 sst-kppsc-2 comp deep-equals sst-kppsc comp", eq(byId["sst-kppsc-2"]?.comp, byId["sst-kppsc"]?.comp));
check("phase3 sst-kppsc-2 scoring deep-equals sst-kppsc scoring", eq(byId["sst-kppsc-2"]?.scoring, byId["sst-kppsc"]?.scoring), JSON.stringify(byId["sst-kppsc-2"]?.scoring));
check(
  "phase3: only sst-kppsc + sst-kppsc-2 carry a scoring config",
  eq(mocks.filter((m) => m.scoring).map((m) => m.id), ["sst-kppsc", "sst-kppsc-2"]),
  mocks.filter((m) => m.scoring).map((m) => m.id).join(","),
);

// ---- §3 standing label ----
const ETEA_NEW = ["pst-A", "ct-B", "ctit-A", "dm-2", "pet-2", "swse-2", "sst-etea-2"];
check(
  "phase3: all 7 ETEA-pattern new notes open with the standing label verbatim",
  ETEA_NEW.every((id) => byId[id].note.startsWith(STANDING_LABEL)),
  ETEA_NEW.filter((id) => !byId[id].note.startsWith(STANDING_LABEL)).join(","),
);
check(
  "phase3: sst-kppsc-2 note does NOT carry the standing label (KPPSC exam)",
  !byId["sst-kppsc-2"].note.includes("Expected pattern"),
);
check(
  "phase3: standing-label translations open the translated notes verbatim",
  ETEA_NEW.every((id) => byId[id].note_ur.startsWith(STANDING_UR) && byId[id].note_roman.startsWith(STANDING_RO)),
  ETEA_NEW.filter((id) => !(byId[id].note_ur.startsWith(STANDING_UR) && byId[id].note_roman.startsWith(STANDING_RO))).join(","),
);

// ---- §4 trilingual fields + digit preservation (all 8) ----
check(
  "phase3: title/note translations present + non-empty on all 8 new defs",
  NEW_IDS.every((id) =>
    ["title_ur", "title_roman", "note_ur", "note_roman"].every((k) => typeof byId[id]?.[k] === "string" && byId[id][k].trim().length > 0),
  ),
  NEW_IDS.filter((id) => !["title_ur", "title_roman", "note_ur", "note_roman"].every((k) => typeof byId[id]?.[k] === "string" && byId[id][k].trim().length > 0)).join(","),
);
check(
  "phase3: digit-groups preserved in translated titles (all 8)",
  NEW_IDS.every((id) => digitGroups(byId[id].title_ur) === digitGroups(byId[id].title) && digitGroups(byId[id].title_roman) === digitGroups(byId[id].title)),
  NEW_IDS.filter((id) => !(digitGroups(byId[id].title_ur) === digitGroups(byId[id].title) && digitGroups(byId[id].title_roman) === digitGroups(byId[id].title))).join(","),
);
check(
  "phase3: digit-groups preserved in translated notes (all 8)",
  NEW_IDS.every((id) => digitGroups(byId[id].note_ur) === digitGroups(byId[id].note) && digitGroups(byId[id].note_roman) === digitGroups(byId[id].note)),
  NEW_IDS.filter((id) => !(digitGroups(byId[id].note_ur) === digitGroups(byId[id].note) && digitGroups(byId[id].note_roman) === digitGroups(byId[id].note)))
    .map((id) => `${id}: en[${digitGroups(byId[id].note)}] ur[${digitGroups(byId[id].note_ur)}] ro[${digitGroups(byId[id].note_roman)}]`)
    .join("; "),
);
check(
  "phase3: no [Auto-Translated] marker inside the new data fields",
  NEW_IDS.every((id) => ["title_ur", "title_roman", "note_ur", "note_roman"].every((k) => !byId[id][k].includes("[Auto-Translated]"))),
);
check(
  "phase3: zero Latin honorific abbreviations in the new _roman fields",
  NEW_IDS.every((id) => !/\(SAW\)|\(RA\)|\(AS\)|\(PBUH\)/.test(byId[id].title_roman + " " + byId[id].note_roman)),
);
check(
  "phase3: no Arabic script in the new _roman fields",
  NEW_IDS.every((id) => !ARABIC.test(byId[id].title_roman) && !ARABIC.test(byId[id].note_roman)),
);
check(
  "phase3: every new _ur title/note carries Urdu script",
  NEW_IDS.every((id) => ARABIC.test(byId[id].title_ur) && ARABIC.test(byId[id].note_ur)),
);

// ---- §5 zamFixed lists unchanged + disjoint + resolvable ----
const BANK_KEYS = ["arabic", "drawing", "english", "gk", "islamiyat", "it", "maths", "pakstudies", "pastpapers", "pastpapers_reworded", "pe", "pedagogy", "science", "socialstudies", "tajweed", "urdu"];
const bankSizes = {};
const bankIds = new Set();
for (const k of BANK_KEYS) {
  const items = readJson(`src/data/banks/${k}.json`);
  bankSizes[k] = items.length;
  for (const q of items) bankIds.add(q.id);
}
check(
  "phase3: zamFixed is exactly 3 lists x 100",
  eq(Object.keys(content.zamFixed).sort(), ["zam1", "zam2", "zam3"]) &&
    ["zam1", "zam2", "zam3"].every((k) => content.zamFixed[k].length === 100),
  Object.entries(content.zamFixed).map(([k, v]) => `${k}:${v.length}`).join(", "),
);
const zamAll = ["zam1", "zam2", "zam3"].flatMap((k) => content.zamFixed[k]);
check(
  "phase3: the 3 fixed lists are pairwise disjoint (300 unique ids)",
  new Set(zamAll).size === 300 &&
    new Set(content.zamFixed.zam1).size === 100 &&
    new Set(content.zamFixed.zam2).size === 100 &&
    new Set(content.zamFixed.zam3).size === 100,
  `unique=${new Set(zamAll).size}`,
);
check(
  "phase3: every zamFixed id exists in the banks",
  zamAll.every((id) => bankIds.has(id)),
  zamAll.filter((id) => !bankIds.has(id)).slice(0, 5).join(","),
);
check(
  "phase3: every fixed mock references an existing 100-ID zamFixed list",
  mocks.filter((m) => m.fixed).every((m) => Array.isArray(content.zamFixed[m.fixed]) && content.zamFixed[m.fixed].length === 100),
);

// ---- §6 real data.ts (tsc harness — same as test-phase2-mocks §3) ----
const OUT = "/tmp/phase3-mock-data";
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
check("tsc harness: emitted lib/data.js", fs.existsSync(join(OUT, "lib/data.js")));
const trackingJs = join(OUT, "lib/tracking.js");
if (fs.existsSync(trackingJs)) {
  fs.writeFileSync(trackingJs, fs.readFileSync(trackingJs, "utf8").replace('require("./fsrs.ts")', 'require("./fsrs")'));
}
execSync(`ln -sfn ${join(ROOT, "node_modules")} ${join(OUT, "node_modules")}`, { stdio: "ignore" });
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));

const VISIBLE_IDS = [
  "zam1", "zam2", "zam3", "tt-B", "tt-MD", "at-B", "at-MD", "pst-B", "pst-A", "ct-B",
  "ctit-B", "ctit-A", "dm-B", "dm-2", "pet-B", "pet-2", "qari-B", "qari-MD",
  "swse", "swse-2", "sst-kppsc", "sst-kppsc-2", "sst-etea", "sst-etea-2",
];
check(
  "phase3: visible set is exactly the 24 known ids",
  eq(data.VISIBLE_MOCKS.map((m) => m.id).sort(), [...VISIBLE_IDS].sort()),
  data.VISIBLE_MOCKS.map((m) => m.id).join(","),
);
check(
  "phase3: every visible track has >= 1 visible mock",
  data.VISIBLE_TRACKS.every((t) => data.VISIBLE_MOCKS.some((m) => m.track === t.id)),
  data.VISIBLE_TRACKS.filter((t) => !data.VISIBLE_MOCKS.some((m) => m.track === t.id)).map((t) => t.id).join(","),
);
check(
  "phase3: VISIBLE_COUNTS.mocks is 24, COUNTS.mocks is 28",
  data.VISIBLE_COUNTS.mocks === 24 && data.COUNTS.mocks === 28,
  JSON.stringify({ visible: data.VISIBLE_COUNTS.mocks, full: data.COUNTS.mocks }),
);
check(
  "phase3: BANK_COUNTS (manifest) matches the bank files",
  BANK_KEYS.every((k) => data.BANK_COUNTS[k] === bankSizes[k]) && Object.keys(data.BANK_COUNTS).length === 16,
);

// ---- §7 FULL at current bank sizes (manifest + independent recompute) ----
function independentAvailable(mock) {
  if (mock.fixed && content.zamFixed[mock.fixed]) return content.zamFixed[mock.fixed].length;
  let n = 0;
  for (const [k, count] of Object.entries(mock.comp ?? {})) {
    const size = k === "drawing_pe" ? bankSizes.drawing + bankSizes.pe : (bankSizes[k] ?? 0);
    n += Math.min(count, size);
  }
  return n;
}
const visibleMocks = data.VISIBLE_MOCKS;
check(
  "phase3: mockAvailableCount == independent bank-file recomputation (all 24 visible)",
  visibleMocks.every((m) => data.mockAvailableCount(m) === independentAvailable(m)),
  visibleMocks.filter((m) => data.mockAvailableCount(m) !== independentAvailable(m)).map((m) => m.id).join(","),
);
check(
  "phase3: every visible mock is FULL (available == total) at current bank sizes",
  visibleMocks.every((m) => data.mockAvailableCount(m) === m.total),
  visibleMocks.filter((m) => data.mockAvailableCount(m) !== m.total).map((m) => `${m.id}:${data.mockAvailableCount(m)}/${m.total}`).join(", "),
);
check(
  "phase3: mockLabelsSync coverage is full/proxy (never partial) for all 24 visible",
  visibleMocks.every((m) => {
    const s = data.mockLabelsSync(m);
    return s.coverage === (m.variant === "proxy" ? "proxy" : "full") && s.available === m.total;
  }),
  visibleMocks.filter((m) => data.mockLabelsSync(m).coverage === "partial").map((m) => m.id).join(","),
);

// ---- §8 built lengths + sampling differs by id, deterministic per id ----
const builtBad = [];
for (const id of NEW_IDS) {
  const built = await data.buildMockQuestions(byId[id], "phase3-seed");
  if (built.length !== byId[id].total || new Set(built.map((q) => q.id)).size !== built.length) {
    builtBad.push(`${id}: built ${built.length}/${byId[id].total}`);
  }
}
check("phase3: all 8 new mocks build exactly their total, no duplicates", builtBad.length === 0, builtBad.join("; "));

const dmB = await data.buildMockQuestions(byId["dm-B"], "phase3-seed");
const dm2 = await data.buildMockQuestions(byId["dm-2"], "phase3-seed");
const dmB2 = await data.buildMockQuestions(byId["dm-B"], "phase3-seed");
const sortedIds = (qs) => qs.map((q) => q.id).sort();
check(
  "phase3: dm-B vs dm-2 with the same seedSuffix produce different id sets (sampling differs by id)",
  JSON.stringify(sortedIds(dmB)) !== JSON.stringify(sortedIds(dm2)),
  `shared=${sortedIds(dmB).filter((id) => new Set(sortedIds(dm2)).has(id)).length}/100`,
);
check(
  "phase3: same mock + same seedSuffix is deterministic (identical order)",
  eq(dmB.map((q) => q.id), dmB2.map((q) => q.id)),
);
const petB = await data.buildMockQuestions(byId["pet-B"], "phase3-seed");
const pet2 = await data.buildMockQuestions(byId["pet-2"], "phase3-seed");
check(
  "phase3: pet-B vs pet-2 with the same seedSuffix produce different id sets",
  JSON.stringify(sortedIds(petB)) !== JSON.stringify(sortedIds(pet2)),
);

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll Phase 3 mock checks passed.");
