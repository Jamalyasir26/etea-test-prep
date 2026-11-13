// Step 3a tests — teaching-only visibility + vacancy coverage ledger +
// SST split. Plain node, no dependencies.
// §1–§3 exercise the REAL data.ts + ledger.ts (compiled to CommonJS in
// /tmp with tsc, same approach as test-step2b.mjs §2). Ledger counts
// are re-derived INDEPENDENTLY from the raw JSON files with a
// separately written subject mapping, so a wiring error in the module
// cannot hide. §4–§5 are source-pattern assertions over the pages and
// i18n strings.
// Run: node scripts/test-step3a.mjs  (exit 0 = all pass)
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(join(ROOT, p), "utf8");
const readJson = (p) => JSON.parse(read(p));

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---------------------------------------------------------------- harness
const OUT = "/tmp/step3a-data";
execSync("rm -rf " + OUT, { stdio: "ignore" });
let tscDiag = "";
try {
  execSync(
    `npx tsc src/lib/data.ts src/lib/ledger.ts --outDir ${OUT} --module commonjs --target es2020 --resolveJsonModule --esModuleInterop --skipLibCheck --moduleResolution node`,
    { cwd: ROOT, stdio: "pipe" },
  );
} catch (e) {
  tscDiag = String(e.stderr ?? e.stdout ?? e.message ?? "");
}
const tscErrors = tscDiag.split("\n").filter((l) => l.includes("error TS"));
check(
  "tsc harness: no unexpected type errors (TS5097 extension import only)",
  tscErrors.every((l) => l.includes("TS5097")),
  tscDiag.slice(0, 400),
);
for (const f of ["lib/data.js", "lib/ledger.js"]) {
  check(`tsc harness: emitted ${f}`, fs.existsSync(join(OUT, f)));
}
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const ledger = require(join(OUT, "lib/ledger.js"));

// ------------------------------------------------- §1 visibility (real data)
const EXPECTED_VISIBLE_TRACKS = [
  "zamungkor",
  "tt",
  "at",
  "pst",
  "ct",
  "ctit",
  "dm",
  "pet",
  "qari",
  "swse",
  "sst-etea",
  "sst-kppsc",
];
const EXPECTED_HIDDEN_TRACKS = [
  "lecturer",
  "junior-clerk",
  "computer-operator",
  "police",
  "forest",
  "lhv",
  "rescue",
];
const EXPECTED_HIDDEN_MOCKS = ["jc", "co", "pc", "forest"];

check("full data intact: 19 tracks", data.TRACKS.length === 19, `got ${data.TRACKS.length}`);
check("full data intact: 20 mocks", data.MOCKS.length === 20, `got ${data.MOCKS.length}`);
check("full data intact: 5 vacancies", data.VACANCIES.length === 5, `got ${data.VACANCIES.length}`);
check(
  "teaching list: exactly the 12 named ids",
  JSON.stringify([...data.TEACHING_TRACK_IDS].sort()) ===
    JSON.stringify([...EXPECTED_VISIBLE_TRACKS].sort()),
  JSON.stringify(data.TEACHING_TRACK_IDS),
);
check(
  "visible tracks: 12, in data order",
  JSON.stringify(data.VISIBLE_TRACKS.map((t) => t.id)) === JSON.stringify(EXPECTED_VISIBLE_TRACKS),
  JSON.stringify(data.VISIBLE_TRACKS.map((t) => t.id)),
);
for (const id of EXPECTED_HIDDEN_TRACKS) {
  check(
    `hidden track ${id}: absent from VISIBLE_TRACKS, present in TRACKS`,
    !data.VISIBLE_TRACKS.some((t) => t.id === id) && data.TRACKS.some((t) => t.id === id),
  );
}
check(
  "visible + hidden tracks partition all 19",
  data.VISIBLE_TRACKS.length + EXPECTED_HIDDEN_TRACKS.length === 19 &&
    EXPECTED_HIDDEN_TRACKS.every((id) => data.TRACKS.some((t) => t.id === id)),
);
check("visible mocks: 16", data.VISIBLE_MOCKS.length === 16, `got ${data.VISIBLE_MOCKS.length}`);
for (const id of EXPECTED_HIDDEN_MOCKS) {
  check(
    `hidden mock ${id}: absent from VISIBLE_MOCKS, present in MOCKS`,
    !data.VISIBLE_MOCKS.some((m) => m.id === id) && data.MOCKS.some((m) => m.id === id),
  );
}
check(
  "every visible mock belongs to a visible track",
  data.VISIBLE_MOCKS.every((m) => data.isTrackVisible(m.track)),
);
check(
  "every hidden mock belongs to a hidden track",
  data.MOCKS.filter((m) => !data.VISIBLE_MOCKS.some((v) => v.id === m.id)).every(
    (m) => !data.isTrackVisible(m.track),
  ),
);
check(
  "isTrackVisible: true for all 12, false for hidden + unknown",
  EXPECTED_VISIBLE_TRACKS.every((id) => data.isTrackVisible(id)) &&
    EXPECTED_HIDDEN_TRACKS.every((id) => !data.isTrackVisible(id)) &&
    data.isTrackVisible("no-such-track") === false,
);
check(
  "visible vacancies: 4",
  data.VISIBLE_VACANCIES.length === 4,
  `got ${data.VISIBLE_VACANCIES.length}`,
);
check(
  "hidden vacancy: Rescue row absent from visible, present in full",
  !data.VISIBLE_VACANCIES.some((v) => v.post.startsWith("Rescue 1122")) &&
    data.VACANCIES.some((v) => v.post.startsWith("Rescue 1122")),
);
check(
  "visible vacancy posts are the 4 teaching rows",
  JSON.stringify(data.VISIBLE_VACANCIES.map((v) => v.post.split(" — ")[0])) ===
    JSON.stringify(["ESED teaching", "ZamungKor 2026", "KPPSC SST", "Social Welfare"]),
  JSON.stringify(data.VISIBLE_VACANCIES.map((v) => v.post)),
);
check(
  "VISIBLE_COUNTS: 12 tracks / 16 mocks, bank counts unchanged",
  data.VISIBLE_COUNTS.tracks === 12 &&
    data.VISIBLE_COUNTS.mocks === 16 &&
    data.VISIBLE_COUNTS.total === 645 &&
    data.VISIBLE_COUNTS.notes === 110 &&
    data.VISIBLE_COUNTS.cards === 70,
  JSON.stringify(data.VISIBLE_COUNTS),
);
check(
  "COUNTS keeps full-bank figures (19 / 20)",
  data.COUNTS.tracks === 19 && data.COUNTS.mocks === 20,
);

// ------------------------------------------------------- §2 SST split (real)
const sstE = data.TRACKS.find((t) => t.id === "sst-etea");
const sstK = data.TRACKS.find((t) => t.id === "sst-kppsc");
check("sst: both tracks visible", data.isTrackVisible("sst-etea") && data.isTrackVisible("sst-kppsc"));
check("sst: distinct names", sstE.name !== sstK.name);
check("sst: distinct patterns", sstE.pattern !== sstK.pattern);
check("sst-etea pattern says 100 MCQs", sstE.pattern.includes("100 MCQs"));
check("sst-kppsc pattern says 45 MCQs", sstK.pattern.includes("45 MCQs"));
const mockE = data.MOCKS.find((m) => m.id === "sst-etea");
const mockK = data.MOCKS.find((m) => m.id === "sst-kppsc");
check(
  "sst mocks: distinct tracks, totals 40 vs 45, distinct variants",
  mockE.track === "sst-etea" &&
    mockK.track === "sst-kppsc" &&
    mockE.total === 40 &&
    mockK.total === 45 &&
    mockE.variant === "ETEA-2020" &&
    mockK.variant === "KPPSC-5th",
  `${mockE.track}/${mockE.total}/${mockE.variant} vs ${mockK.track}/${mockK.total}/${mockK.variant}`,
);
check(
  "sst mocks: different compositions",
  JSON.stringify(mockE.comp) !== JSON.stringify(mockK.comp),
);
check(
  "sst-kppsc scoring: 0.25 penalty labelled unverified-assumption",
  mockK.scoring?.wrongPenalty === 0.25 &&
    mockK.scoring?.policyStatus === "unverified-assumption" &&
    (mockK.scoring?.policyNote ?? "").toLowerCase().includes("unverified"),
  JSON.stringify(mockK.scoring),
);
check(
  "sst-etea mock carries no scoring config (policy unknown)",
  mockE.scoring === undefined,
);
check(
  "visible mocks: 15 of 16 scoring-unknown, only sst-kppsc has a config",
  data.VISIBLE_MOCKS.filter((m) => !m.scoring).length === 15 &&
    data.VISIBLE_MOCKS.filter((m) => m.scoring).map((m) => m.id).join() === "sst-kppsc",
);

// ------------------------------------------------- §3 ledger (real module)
// Independent re-derivation from the raw JSON files.
const content = readJson("src/data/content.json");
const BANK_FILES = [
  "arabic",
  "drawing",
  "english",
  "gk",
  "islamiyat",
  "it",
  "maths",
  "pakstudies",
  "pastpapers",
  "pastpapers_reworded",
  "pe",
  "pedagogy",
  "science",
  "socialstudies",
  "tajweed",
  "urdu",
];
const bankSize = {};
const bankById = {};
for (const f of BANK_FILES) {
  const items = readJson(`src/data/banks/${f}.json`);
  bankSize[f] = items.length;
  for (const q of items) bankById[q.id] = q;
}
const noteCount = {};
for (const [subject, list] of Object.entries(content.notes)) noteCount[subject] = list.length;
const cardCount = {};
for (const c of content.flashcards) cardCount[c.category] = (cardCount[c.category] ?? 0) + 1;

// Independent subject mapping (written from the data layout, not from
// the module's catalog): label -> banks / note subjects / categories.
const TEST_MAP = {
  Islamiyat: { banks: ["islamiyat"], notes: ["Islamiyat"], cards: [] },
  English: { banks: ["english"], notes: ["English"], cards: [] },
  Urdu: { banks: ["urdu"], notes: ["Urdu"], cards: [] },
  "Pak Studies": { banks: ["pakstudies"], notes: ["Pak Studies"], cards: [] },
  Maths: { banks: ["maths"], notes: ["Maths"], cards: [] },
  Pedagogy: { banks: ["pedagogy"], notes: ["Pedagogy"], cards: ["Pedagogy"] },
  Tajweed: { banks: ["tajweed"], notes: ["Tajweed"], cards: ["Tajweed"] },
  Arabic: { banks: ["arabic"], notes: ["Arabic"], cards: ["Arabic"] },
  "General Science": { banks: ["science"], notes: ["General Science"], cards: ["General Science"] },
  "IT / Computer": { banks: ["it"], notes: ["IT/Computer"], cards: ["IT/Computer"] },
  GK: { banks: ["gk"], notes: ["GK"], cards: ["GK"] },
  "Social Studies": { banks: ["socialstudies"], notes: ["Social Studies"], cards: [] },
  Drawing: { banks: ["drawing"], notes: ["Drawing/PE"], cards: [] },
  "Physical Education": { banks: ["pe"], notes: ["Drawing/PE"], cards: [] },
  "Tajweed/Hifz + Islamiyat (combined block)": {
    banks: ["tajweed", "islamiyat"],
    notes: ["Tajweed", "Islamiyat"],
    cards: ["Tajweed"],
  },
  "Subject portion (Maths / Physics / Bio / Chem / IT)": { banks: [], notes: [], cards: [] },
  "GK (Pak Studies + Islamiat)": { banks: ["gk"], notes: ["GK"], cards: ["GK"] },
};

// Expected official weightages (report's table) — label + weight, in
// ledger order. Locks the table against drift or invention.
const EXPECTED_WEIGHTAGE = {
  tt: [
    ["Islamiyat", "30 Q"],
    ["English", "20 Q"],
    ["Urdu", "10 Q"],
    ["Social Studies", "10 Q"],
    ["Pedagogy", "10 Q"],
    ["Maths", "10 Q"],
    ["GK", "10 Q"],
  ],
  at: [
    ["Arabic", "30 Q"],
    ["English", "20 Q"],
    ["Urdu", "10 Q"],
    ["Social Studies", "10 Q"],
    ["Pedagogy", "10 Q"],
    ["Maths", "10 Q"],
    ["GK", "10 Q"],
  ],
  pst: [
    ["English", "25 Q"],
    ["Maths", "25 Q"],
    ["General Science", "20 Q"],
    ["Social Studies", "10 Q"],
    ["Pedagogy", "10 Q"],
    ["GK", "10 Q"],
  ],
  ct: [
    ["English", "25 Q"],
    ["Maths", "25 Q"],
    ["General Science", "20 Q"],
    ["Social Studies", "10 Q"],
    ["Pedagogy", "10 Q"],
    ["GK", "10 Q"],
  ],
  ctit: [
    ["IT / Computer", "25 Q"],
    ["English", "25 Q"],
    ["Maths", "20 Q"],
    ["Social Studies", "10 Q"],
    ["Pedagogy", "10 Q"],
    ["GK", "10 Q"],
  ],
  dm: [
    ["Drawing", "20 Q"],
    ["English", "20 Q"],
    ["Maths", "20 Q"],
    ["General Science", "20 Q"],
    ["GK", "10 Q"],
    ["Pedagogy", "10 Q"],
  ],
  pet: [
    ["Physical Education", "20 Q"],
    ["English", "20 Q"],
    ["Maths", "20 Q"],
    ["General Science", "20 Q"],
    ["GK", "10 Q"],
    ["Pedagogy", "10 Q"],
  ],
  qari: [
    ["Tajweed/Hifz + Islamiyat (combined block)", "30 Q"],
    ["English", "20 Q"],
    ["Urdu", "10 Q"],
    ["Maths", "10 Q"],
    ["Social Studies", "10 Q"],
    ["Pedagogy", "10 Q"],
    ["GK", "10 Q"],
  ],
  swse: [
    ["Islamiyat", "30 Q"],
    ["Pedagogy", "30 Q"],
    ["Urdu", "20 Q"],
    ["Social Studies", "10 Q"],
    ["Maths", "10 Q"],
  ],
  "sst-etea": [
    ["Subject portion (Maths / Physics / Bio / Chem / IT)", "60 Q"],
    ["Pedagogy", "10 Q"],
    ["English", "20 Q"],
    ["Islamiyat", "5 Q"],
    ["Pak Studies", "5 Q"],
  ],
  "sst-kppsc": [
    ["Subject portion (Maths / Physics / Bio / Chem / IT)", "60%"],
    ["Pedagogy", "5%"],
    ["English", "15%"],
    ["Urdu", "10%"],
    ["GK (Pak Studies + Islamiat)", "10%"],
  ],
  zamungkor: [
    ["Islamiyat", "30 Q"],
    ["English", "15 Q"],
    ["Urdu", "15 Q"],
    ["Pak Studies", "15 Q"],
    ["Maths", "15 Q"],
    ["Pedagogy", "10 Q"],
  ],
};

const rows = ledger.buildLedger();
check("ledger: 12 rows", rows.length === 12, `got ${rows.length}`);
check(
  "ledger: one row per visible track, in track order",
  JSON.stringify(rows.map((r) => r.trackId)) === JSON.stringify(EXPECTED_VISIBLE_TRACKS),
  JSON.stringify(rows.map((r) => r.trackId)),
);
check(
  "ledger defs cover exactly the visible tracks",
  JSON.stringify(ledger.ledgerDefIds().map((d) => d.trackId).sort()) ===
    JSON.stringify([...EXPECTED_VISIBLE_TRACKS].sort()),
);
check(
  "ledger: no row for a hidden track",
  rows.every((r) => data.isTrackVisible(r.trackId)),
);

for (const row of rows) {
  const p = `ledger ${row.trackId}`;
  check(`${p}: name/bps/source non-empty`, Boolean(row.trackName && row.bps && row.sourceLabel));
  check(`${p}: last verified 11 Nov 2026`, row.lastVerified === "11 Nov 2026", row.lastVerified);
  check(
    `${p}: admin labels non-empty`,
    Boolean(row.totalLabel && row.timeLabel && row.languageLabel && row.negativeMarkingLabel),
  );
  check(`${p}: missing + next action non-empty`, Boolean(row.missing && row.nextAction));
  check(
    `${p}: source URL is an official domain or null`,
    row.sourceUrl === null ||
      row.sourceUrl.startsWith("https://etea.online/") ||
      row.sourceUrl.startsWith("https://www.kppsc.gov.pk/"),
    String(row.sourceUrl),
  );
  // Weightage table matches the expected official table exactly.
  const expected = EXPECTED_WEIGHTAGE[row.trackId];
  check(
    `${p}: weightage matches the official table`,
    JSON.stringify(row.subjects.map((s) => [s.label, s.weightLabel])) === JSON.stringify(expected),
    JSON.stringify(row.subjects.map((s) => [s.label, s.weightLabel])),
  );
  // Weights sum to the paper total (100 Q, or 100% for KPPSC).
  const nums = row.subjects.map((s) => parseInt(s.weightLabel, 10));
  check(`${p}: weights sum to 100`, nums.reduce((a, b) => a + b, 0) === 100, nums.join("+"));
  // Counts re-derived independently from the raw files.
  for (const s of row.subjects) {
    const m = TEST_MAP[s.label];
    check(`${p}: subject "${s.label}" has a test mapping`, Boolean(m));
    if (!m) continue;
    const expNotes = m.notes.reduce((a, k) => a + (noteCount[k] ?? 0), 0);
    const expMcqs = m.banks.reduce((a, k) => a + (bankSize[k] ?? 0), 0);
    const expCards = m.cards.reduce((a, k) => a + (cardCount[k] ?? 0), 0);
    check(
      `${p}: "${s.label}" counts = real bank counts`,
      s.notes === expNotes && s.mcqs === expMcqs && s.cards === expCards,
      `got ${s.notes}/${s.mcqs}/${s.cards}, expected ${expNotes}/${expMcqs}/${expCards}`,
    );
  }
  // Bank-review totals: no double counting across subject rows.
  const sumMcqs = row.subjects.reduce((a, s) => a + s.mcqs, 0);
  check(`${p}: totalMcqs equals sum of subject rows`, row.totalMcqs === sumMcqs, `${row.totalMcqs} vs ${sumMcqs}`);
  check(`${p}: trustedInBank within total`, row.trustedInBank >= 0 && row.trustedInBank <= row.totalMcqs);
}

const byId = Object.fromEntries(rows.map((r) => [r.trackId, r]));
const coverageCounts = {};
for (const r of rows) coverageCounts[r.coverage] = (coverageCounts[r.coverage] ?? 0) + 1;
check(
  "ledger coverage distribution: 8 exact / 1 proxy / 3 partial / 0 unknown",
  coverageCounts.exact === 8 &&
    coverageCounts.proxy === 1 &&
    coverageCounts.partial === 3 &&
    (coverageCounts.unknown ?? 0) === 0,
  JSON.stringify(coverageCounts),
);
check(
  "ledger exact rows are the 8 ESED posts",
  JSON.stringify(rows.filter((r) => r.coverage === "exact").map((r) => r.trackId)) ===
    JSON.stringify(["tt", "at", "pst", "ct", "ctit", "dm", "pet", "qari"]),
);
check(
  "ledger proxy row is ZamungKor only",
  JSON.stringify(rows.filter((r) => r.coverage === "proxy").map((r) => r.trackId)) ===
    JSON.stringify(["zamungkor"]),
);
check(
  "ledger partial rows are swse + both SST",
  JSON.stringify(rows.filter((r) => r.coverage === "partial").map((r) => r.trackId)) ===
    JSON.stringify(["swse", "sst-etea", "sst-kppsc"]),
);
const sourceCounts = {};
for (const r of rows) sourceCounts[r.sourceState] = (sourceCounts[r.sourceState] ?? 0) + 1;
check(
  "ledger source states: 10 confirmed / 1 provisional / 1 unavailable",
  sourceCounts.confirmed === 10 && sourceCounts.provisional === 1 && sourceCounts.unavailable === 1,
  JSON.stringify(sourceCounts),
);
check(
  "swse: provisional pattern, partial coverage, provisional source",
  byId.swse.coverage === "partial" &&
    byId.swse.sourceState === "provisional" &&
    (byId.swse.patternNote ?? "").includes("PROVISIONAL"),
);
check(
  "swse: not merged with TT or ZamungKor (own row, own source, own pattern)",
  byId.swse.sourceLabel.includes("435") &&
    byId.swse.sourceLabel !== byId.tt.sourceLabel &&
    byId.swse.totalLabel !== byId.zamungkor.totalLabel,
);
check(
  "zamungkor: proxy, unavailable source, unknown total, NOT VERIFIED note",
  byId.zamungkor.coverage === "proxy" &&
    byId.zamungkor.sourceState === "unavailable" &&
    byId.zamungkor.totalLabel.includes("Unknown") &&
    (byId.zamungkor.patternNote ?? "").includes("NOT VERIFIED") &&
    (byId.zamungkor.patternNote ?? "").includes("Not Available"),
);
check(
  "sst-etea: partial, subject row is all zero",
  byId["sst-etea"].coverage === "partial" &&
    byId["sst-etea"].subjects[0].notes === 0 &&
    byId["sst-etea"].subjects[0].mcqs === 0 &&
    byId["sst-etea"].subjects[0].cards === 0,
);
check(
  "sst-kppsc: partial, subject row is all zero, negative marking UNVERIFIED",
  byId["sst-kppsc"].coverage === "partial" &&
    byId["sst-kppsc"].subjects[0].mcqs === 0 &&
    byId["sst-kppsc"].negativeMarkingLabel.includes("UNVERIFIED"),
);
check(
  "sst rows: distinct totals (100 vs 45) and distinct sources",
  byId["sst-etea"].totalLabel === "100 MCQs" &&
    byId["sst-kppsc"].totalLabel === "45 MCQs" &&
    byId["sst-etea"].sourceLabel !== byId["sst-kppsc"].sourceLabel,
);
check(
  "ct: shared pst-B mock flagged shared, no own mock",
  byId.ct.mocks.length === 1 &&
    byId.ct.mocks[0].id === "pst-B" &&
    byId.ct.mocks[0].shared === true,
  JSON.stringify(byId.ct.mocks),
);
check(
  "every other row has >= 1 own (non-shared) mock",
  rows
    .filter((r) => r.trackId !== "ct")
    .every((r) => r.mocks.some((m) => m.shared === false)),
);
check(
  "qari combined block: counts sum Tajweed + Islamiyat banks/notes",
  byId.qari.subjects[0].mcqs === bankSize.tajweed + bankSize.islamiyat &&
    byId.qari.subjects[0].notes === noteCount.Tajweed + noteCount.Islamiyat,
  JSON.stringify(byId.qari.subjects[0]),
);
// ZamungKor proxy weightage = the actual fixed-mock distributions.
for (const key of ["zam1", "zam2", "zam3"]) {
  const dist = {};
  for (const id of content.zamFixed[key]) {
    const q = bankById[id];
    const k = q ? q.subjectKey : "MISSING";
    dist[k] = (dist[k] ?? 0) + 1;
  }
  check(
    `zamungkor proxy: ${key} distribution matches the ledger weightage`,
    dist.islamiyat === 30 &&
      dist.english === 15 &&
      dist.urdu === 15 &&
      dist.pakstudies === 15 &&
      dist.maths === 15 &&
      dist.pedagogy === 10,
    JSON.stringify(dist),
  );
}
// coverageFor unit tests — every branch.
const fullRows = [{ label: "X", notes: 1, mcqs: 1, cards: 0 }];
check(
  "coverageFor: unpublished -> proxy",
  ledger.coverageFor("unpublished", fullRows, 1).coverage === "proxy",
);
check(
  "coverageFor: provisional -> partial",
  ledger.coverageFor("provisional", fullRows, 1).coverage === "partial",
);
check(
  "coverageFor: confirmed + full + mock -> exact",
  ledger.coverageFor("confirmed", fullRows, 1).coverage === "exact",
);
const emptyRows = [{ label: "Subject portion", notes: 0, mcqs: 0, cards: 0 }];
const partialRes = ledger.coverageFor("confirmed", emptyRows, 1);
check(
  "coverageFor: confirmed + empty subject -> partial naming the subject",
  partialRes.coverage === "partial" && partialRes.reason.includes("Subject portion"),
  partialRes.reason,
);
check(
  "coverageFor: confirmed + no mock -> partial",
  ledger.coverageFor("confirmed", fullRows, 0).coverage === "partial",
);
check(
  "coverageFor: confirmed + no rows -> unknown",
  ledger.coverageFor("confirmed", [], 0).coverage === "unknown",
);
check("ledgerRowFor: unknown id -> null", ledger.ledgerRowFor("no-such-track") === null);
check("ledgerRowFor: hidden track -> null", ledger.ledgerRowFor("police") === null);

// ------------------------------------------------- §4 page source patterns
const tracksList = read("src/app/tracks/page.tsx");
const trackDetail = read("src/app/tracks/[id]/page.tsx");
const mockList = read("src/app/mock/page.tsx");
const mockDetail = read("src/app/mock/[id]/page.tsx");
const vacancies = read("src/app/vacancies/page.tsx");
const home = read("src/app/page.tsx");
const reviewPage = read("src/app/review/page.tsx");
const analysisPage = read("src/app/analysis/page.tsx");
const dataSrc = read("src/lib/data.ts");

check(
  "data.ts: single source of truth (TEACHING_TRACK_IDS + VISIBLE_* defined once)",
  dataSrc.includes("TEACHING_TRACK_IDS") &&
    dataSrc.includes("VISIBLE_TRACKS") &&
    dataSrc.includes("VISIBLE_MOCKS") &&
    dataSrc.includes("VISIBLE_VACANCIES") &&
    dataSrc.includes("VISIBLE_COUNTS"),
);
check(
  "tracks list: renders VISIBLE_TRACKS + VISIBLE_MOCKS only",
  tracksList.includes("VISIBLE_TRACKS.map") &&
    tracksList.includes("VISIBLE_MOCKS.filter") &&
    !/\bTRACKS\.map/.test(tracksList) &&
    !/\bMOCKS\.filter/.test(tracksList),
);
check(
  "tracks list: scope note + ledger link",
  tracksList.includes('t("teachingOnlyNote")') && tracksList.includes("/vacancies#ledger"),
);
check(
  "track detail: VISIBLE_TRACKS.find + VISIBLE_MOCKS.filter",
  trackDetail.includes("VISIBLE_TRACKS.find") && trackDetail.includes("VISIBLE_MOCKS.filter"),
);
check(
  "mock list: renders VISIBLE_MOCKS + scope note",
  mockList.includes("VISIBLE_MOCKS.map") &&
    mockList.includes('t("teachingOnlyNote")') &&
    !/\bMOCKS\.map/.test(mockList),
);
check("mock detail: VISIBLE_MOCKS.find", mockDetail.includes("VISIBLE_MOCKS.find"));
check(
  "vacancies: VISIBLE_VACANCIES + ledger section + scope note",
  vacancies.includes("VISIBLE_VACANCIES.map") &&
    vacancies.includes("buildLedger()") &&
    vacancies.includes('id="ledger"') &&
    vacancies.includes('t("ledgerHeading")') &&
    vacancies.includes('t("teachingOnlyNote")'),
);
check(
  "vacancies: coverage + source badges rendered",
  vacancies.includes("CoverageBadge") && vacancies.includes("SourceBadge"),
);
check(
  "home: visible counts + hidden-mock resume guard + scope note",
  home.includes("VISIBLE_COUNTS.tracks") &&
    home.includes("VISIBLE_COUNTS.mocks") &&
    home.includes("VISIBLE_MOCKS.some") &&
    home.includes('t("teachingOnlyNote")'),
);
check(
  "home: full COUNTS tracks/mocks no longer drive the intro",
  !home.includes("tracks: COUNTS.tracks") && !home.includes("mocks: COUNTS.mocks"),
);
check(
  "review: mock filters reference visible mocks only",
  ["zam1", "zam2", "zam3", "tt-B", "qari-B", "at-B"].every((id) =>
    reviewPage.includes(`"${id}"`),
  ) && !["\"jc\"", "\"co\"", "\"pc\"", "\"forest\""].some((s) => reviewPage.includes(s)),
);
check(
  "analysis: TRACKS used only as a name lookup, never listed",
  analysisPage.includes("TRACKS.find") && !analysisPage.includes("TRACKS.map"),
);

// ------------------------------------------------------------- §5 i18n keys
const i18nSrc = read("src/lib/i18n.tsx");
const NEW_KEYS = [
  "teachingOnlyNote",
  "tracksLedgerLink",
  "ledgerHeading",
  "ledgerIntro",
  "ledgerSourceLabel",
  "ledgerLastVerified",
  "ledgerTotalLabel",
  "ledgerTimeLabel",
  "ledgerLanguageLabel",
  "ledgerNegativeLabel",
  "ledgerAvailableLabel",
  "ledgerSubjectCounts",
  "ledgerMocksLabel",
  "ledgerSharedMock",
  "ledgerNoMock",
  "ledgerBankReview",
  "ledgerMissingLabel",
  "ledgerNextLabel",
  "ledgerViewTrack",
  "ledgerCoverageExact",
  "ledgerCoverageExactDetail",
  "ledgerCoverageProxy",
  "ledgerCoverageProxyDetail",
  "ledgerCoveragePartial",
  "ledgerCoveragePartialDetail",
  "ledgerCoverageUnknown",
  "ledgerCoverageUnknownDetail",
  "ledgerSourceConfirmed",
  "ledgerSourceConfirmedDetail",
  "ledgerSourceProvisional",
  "ledgerSourceProvisionalDetail",
  "ledgerSourceUnavailable",
  "ledgerSourceUnavailableDetail",
];
for (const key of NEW_KEYS) {
  const at = i18nSrc.indexOf(`  ${key}: {`);
  const block = at === -1 ? "" : i18nSrc.slice(at, at + 900);
  check(
    `i18n: key ${key} exists with non-empty en + ur`,
    at !== -1 && /en: "[^"]+"/.test(block) && /ur: "[^"]+"/.test(block),
  );
}
check(
  "i18n: homeIntro names the teaching scope",
  i18nSrc.includes("teaching post tracks") && i18nSrc.includes("تدریسی پوسٹ ٹریکس"),
);

// ------------------------------------------------------------------ summary
if (failures > 0) {
  console.log(`\n${failures} Step 3a test(s) FAILED.`);
  process.exit(1);
}
console.log("\nAll Step 3a tests passed.");
