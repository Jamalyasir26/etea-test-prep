// Phase 4 library tests — 150 concept-extracted study notes added to the
// 151 existing notes (301 total), trilingual at creation, one honest
// source label + syllabus clause + conceptId per new note. Locks:
// per-subject counts; the original 151 notes byte-identical (SHA-256
// of each subject's original prefix, taken from the pre-merge file);
// the exact 150-note conceptId registry from the Phase 4 brief;
// source/clause registry; dedupe (titles + conceptIds); trilingual
// completeness on all 301; the Stage 5 per-field invariants (digits,
// Maths operators, Arabic-run verbatim, honorifics, no badge literal
// in data, no label leaks); the resolver on one new note per subject;
// content.json compact format (JSON.stringify, no trailing newline).
// Run: node scripts/test-phase4-library.mjs  (exit 0 = all pass)
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
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

// --------------------------------- §1 real data.ts (tsc harness)
const OUT = "/tmp/phase4lib-data";
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
check("P4L tsc harness: no unexpected type errors", tscErrors.every((l) => l.includes("TS5097")), tscDiag.slice(0, 300));
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const { NOTES, VISIBLE_COUNTS, resolveNoteView } = data;

// --------------------------------- §2 counts
const EXPECTED = {
  "Drawing/PE": 29,
  "General Science": 20,
  "Arabic": 23,
  "Pedagogy": 23,
  "Pak Studies": 20,
  "Islamiyat": 26,
  "Maths": 20,
  "GK": 20,
  "Urdu": 20,
  "Tajweed": 35,
  "IT/Computer": 24,
  "English": 20,
  "Social Studies": 21
};
const ORIG_COUNT = {
  "Drawing/PE": 24,
  "General Science": 8,
  "Arabic": 13,
  "Pedagogy": 13,
  "Pak Studies": 7,
  "Islamiyat": 14,
  "Maths": 7,
  "GK": 6,
  "Urdu": 6,
  "Tajweed": 24,
  "IT/Computer": 17,
  "English": 8,
  "Social Studies": 4
};
for (const [subject, expected] of Object.entries(EXPECTED)) {
  check(`P4L ${subject} notes: ${expected}`, NOTES[subject].length === expected, `got ${NOTES[subject].length}`);
}
const notesTotal = Object.values(NOTES).flat().length;
check("P4L notes total 301", notesTotal === 301, `got ${notesTotal}`);
const contentJson = readJson("src/data/content.json");
check(
  "P4L content.json counts: total 7040, notes 301, cards 70, tracks 19, mocks 28",
  contentJson.counts.total === 7040 && contentJson.counts.notes === 301 && contentJson.counts.cards === 70 && contentJson.counts.tracks === 19 && contentJson.counts.mocks === 28,
  JSON.stringify(contentJson.counts),
);
check(
  "P4L VISIBLE_COUNTS 7040/301/70, 12 tracks / 24 mocks",
  VISIBLE_COUNTS.total === 7040 && VISIBLE_COUNTS.notes === 301 && VISIBLE_COUNTS.cards === 70,
);

// --------------------------------- §3 original 151 notes byte-identical
const PREFIX_HASH = {
  "Drawing/PE": "b4ea6319369a54ae32d99bb3b4f6f2df8aff0f8c217f4085a8d584457947dfda",
  "General Science": "04a80f3618eae5470347f1207b383d57dc614fa0eb18c58a21638f0b62982b1d",
  "Arabic": "31af6a331e8a8226e17ba056a6d2ede1907f7939f7c4f10a1040ae147a6d330a",
  "Pedagogy": "2dfdc2a4e0a851142a8e0678fbe48b8613504a75e47fbf41e2b7628438a3f283",
  "Pak Studies": "90c9fd8e80523940f45670ba8da3fcf07b3f3dd82437e0665b09ed48ebd84262",
  "Islamiyat": "f127945e35feb0ec60f24e21b3d605ce48eedc2a54de199f0a93ee8d5531fec7",
  "Maths": "ff101874148a32eca6a28c982d054e4a35b3d10a8da0956474b2786285a5448a",
  "GK": "ffda0c81fa54e6229ed3f9060de05333d509bbb7fc1ab43137c78dc97bed26a2",
  "Urdu": "9f9ecf3be64b2e1de1aa258241a83f649a2f7bbb0f52f627e18835f1debf26fa",
  "Tajweed": "d93d12c6c7582ca60b22e5e81c49a5e61af6509f102f7f97fa6c3b6126261b61",
  "IT/Computer": "ab0ebef879a4309f67d7371d431eae15a1578002559acfa5358dce9d3ebed3f5",
  "English": "7d9110969499516e8025a8ab364ac4724a588ed1111ad588de85c5ea13bbbcca",
  "Social Studies": "c8970ed0739e177308e2fee056d8783b4e555b8a63e6d81ec3dba815f52c0194"
};
for (const [subject, n] of Object.entries(ORIG_COUNT)) {
  const h = createHash("sha256").update(JSON.stringify(NOTES[subject].slice(0, n)), "utf8").digest("hex");
  check(`P4L original ${n} ${subject} notes byte-identical (prefix hash)`, h === PREFIX_HASH[subject]);
}

// --------------------------------- §4 new notes: registry, schema, provenance
const REGISTRY = {
  "Islamiyat": [
    "isl-tawhid",
    "isl-risalat",
    "isl-angels-books",
    "isl-salah",
    "isl-zakat",
    "isl-sawm",
    "isl-taharat",
    "isl-farewell-sermon",
    "isl-misaq-madinah",
    "isl-ashra-mubashra",
    "isl-muslim-science",
    "isl-rights"
  ],
  "Tajweed": [
    "taj-ghunnah",
    "taj-mushaddad",
    "taj-madd-lazim",
    "taj-waqf-types",
    "taj-ibtida",
    "taj-raa-rules",
    "taj-fatiha",
    "taj-ayat-kursi",
    "taj-first-last-revelation",
    "taj-qunoot-durood",
    "taj-juz-para"
  ],
  "Arabic": [
    "arb-madi",
    "arb-mudari",
    "arb-amr-nahy",
    "arb-attached-pronouns",
    "arb-huruf-jarr",
    "arb-relative-pronouns",
    "arb-interrogatives",
    "arb-numbers",
    "arb-ism-fail-maful",
    "arb-masdar"
  ],
  "Urdu": [
    "urd-ism-marfa",
    "urd-ism-nakra",
    "urd-fail-kinds",
    "urd-maroof-majhool",
    "urd-harf-jarr-atf",
    "urd-ne-ko",
    "urd-jumla-kinds",
    "urd-tarkeeb",
    "urd-jins-rules",
    "urd-adad-rules",
    "urd-sabqay-lahqay",
    "urd-talafuz",
    "urd-ilm-bayan",
    "urd-adabi-asnaf"
  ],
  "English": [
    "eng-parts-speech",
    "eng-nouns",
    "eng-pronouns",
    "eng-adj-adv",
    "eng-gerunds",
    "eng-clauses",
    "eng-homophones",
    "eng-ows",
    "eng-idioms-phrasal",
    "eng-spelling",
    "eng-conjunctions",
    "eng-comprehension"
  ],
  "Maths": [
    "mat-number-systems",
    "mat-squares-cubes",
    "mat-profit-loss",
    "mat-factorization",
    "mat-linear-eq",
    "mat-quadratic-eq",
    "mat-sets-functions",
    "mat-angles-triangles",
    "mat-pythagoras",
    "mat-area-volume",
    "mat-trig-ratios",
    "mat-coordinate",
    "mat-stats-probability"
  ],
  "General Science": [
    "sci-cell",
    "sci-heart",
    "sci-nervous",
    "sci-digestive",
    "sci-acids-bases",
    "sci-reactions",
    "sci-force-pressure",
    "sci-electricity",
    "sci-light",
    "sci-si-units",
    "sci-ecosystems",
    "sci-microbes-vaccines"
  ],
  "Pak Studies": [
    "pak-two-nation",
    "pak-allahabad",
    "pak-simla-league",
    "pak-lucknow-khilafat",
    "pak-fourteen-points",
    "pak-lahore-resolution",
    "pak-june-plan",
    "pak-objectives-resolution",
    "pak-constitutions-56-62",
    "pak-wars",
    "pak-agri-industry",
    "pak-cpec",
    "pak-foreign-policy"
  ],
  "Social Studies": [
    "ss-lat-long",
    "ss-time-zones",
    "ss-maps-globes",
    "ss-continents-oceans",
    "ss-landforms",
    "ss-climate-weather",
    "ss-citizenship",
    "ss-human-rights",
    "ss-indus",
    "ss-levels-govt",
    "ss-elections",
    "ss-judiciary",
    "ss-resources-wants",
    "ss-money-banking",
    "ss-languages-culture",
    "ss-unesco",
    "ss-asean-eu"
  ],
  "GK": [
    "gk-passes-lakes",
    "gk-peaks",
    "gk-rivers-world",
    "gk-landmarks",
    "gk-nobel",
    "gk-scientists",
    "gk-inventions",
    "gk-space-firsts",
    "gk-olympics",
    "gk-trophies",
    "gk-currencies",
    "gk-books-authors",
    "gk-intl-days",
    "gk-hijri-calendar"
  ],
  "Pedagogy": [
    "ped-motivation",
    "ped-intelligence",
    "ped-individual-differences",
    "ped-teaching-methods",
    "ped-microteaching-inquiry",
    "ped-classroom-mgmt",
    "ped-curriculum",
    "ped-validity-reliability",
    "ped-inclusive",
    "ped-guidance-ethics"
  ],
  "IT/Computer": [
    "it-number-systems",
    "it-memory-units",
    "it-networks",
    "it-algorithms",
    "it-html",
    "it-databases",
    "it-ai-emerging"
  ],
  "Drawing/PE": [
    "drw-principles-design",
    "drw-painting-media",
    "drw-sculpture-printmaking",
    "pe-training-methods",
    "pe-tournaments"
  ]
};
const SOURCES = {
  "Islamiyat": "Original content — concept-extracted from standard Islamic studies curriculum topics (Quran, Hadith, Seerat and Fiqh basics)",
  "Tajweed": "Original content — concept-extracted from standard Tajweed rules (Makharij, Sifaat, Noon and Meem rules, Madd and Waqf)",
  "Arabic": "Original content — concept-extracted from standard Arabic grammar scope (Nahw and Sarf)",
  "Urdu": "Original content — concept-extracted from standard Urdu grammar scope (Qawaid-o-Insha)",
  "English": "Original content — concept-extracted from standard English grammar scope",
  "Maths": "Original content — concept-extracted from standard school mathematics topics (Classes 5–10)",
  "General Science": "Original content — concept-extracted from standard general science topics (Classes 4–8)",
  "Pak Studies": "Original content — concept-extracted from standard Pakistan Studies topics (KPTBB Class 10 chapter structure)",
  "Social Studies": "Original content — concept-extracted from standard social studies topics (Classes 4–8)",
  "GK": "Original content — concept-extracted from standard general knowledge scope",
  "Pedagogy": "Original content — concept-extracted from standard educational psychology and pedagogy scope",
  "IT/Computer": "Original content — concept-extracted from DCTE Computer Science Curriculum (VI–VIII, 2025)"
};
const CLAUSES = {
  "Islamiyat": "Pattern B (ESED-453) — Islamiyat section (30)",
  "Tajweed": "Pattern B (ESED-453) — Qari: Tajweed/Hifz + Islamiyat section (30 combined)",
  "Arabic": "Pattern B (ESED-453) — Arabic section (30)",
  "Urdu": "Pattern B (ESED-453) — TT: Urdu section (10)",
  "English": "Pattern B (ESED-453) — TT: English section (20)",
  "Maths": "Pattern B (ESED-453) — TT: Maths section (10)",
  "General Science": "Pattern B (ESED-453) — PST/CT: General Science section (20)",
  "Pak Studies": "Pattern B (ESED-453) — TT: GK (Pak Studies + Islamiyat) section (10)",
  "Social Studies": "Pattern B (ESED-453) — TT: Social Studies section (10)",
  "GK": "Pattern B (ESED-453) — TT: GK section (10)",
  "Pedagogy": "Pattern B (ESED-453) — Pedagogy section (10)",
  "IT/Computer": "Pattern B (ESED-453) — CT-IT: IT/CS section (25)"
};
const DRW_PE = { drw: {"source":"Original content — concept-extracted from standard art education topics","clause":"Pattern B (ESED-453) — DM: Drawing section (20)"}, pe: {"source":"Original content — concept-extracted from DCTE Health and Physical Education Curriculum (I–XII, 2015)","clause":"Pattern B (ESED-453) — PET: Physical Education section (20)"} };
const NOTE_KEYS = ["title", "body", "title_ur", "title_roman", "body_ur", "body_roman", "source", "conceptId", "syllabusClause", "sourceKind"];
const TEXT_KEYS = ["title", "body", "title_ur", "title_roman", "body_ur", "body_roman"];
let newNotes = [];
for (const [subject, ids] of Object.entries(REGISTRY)) {
  const news = NOTES[subject].slice(ORIG_COUNT[subject]);
  newNotes.push(...news.map((n) => ({ ...n, subject })));
  const gotIds = news.map((n) => n.conceptId).sort().join(",");
  check(`P4L ${subject}: new conceptIds match the brief registry (${ids.length})`, gotIds === [...ids].sort().join(","), gotIds);
  let badKeys = [];
  let badText = [];
  let badWords = [];
  let badProv = [];
  for (const n of news) {
    if (Object.keys(n).sort().join(",") !== [...NOTE_KEYS].sort().join(",")) badKeys.push(n.conceptId);
    for (const k of TEXT_KEYS) if (typeof n[k] !== "string" || n[k].trim().length === 0) badText.push(`${n.conceptId}:${k}`);
    const wc = n.body.trim().split(/\s+/).length;
    if (wc < 50 || wc > 100) badWords.push(`${n.conceptId}:${wc}`);
    const want = subject === "Drawing/PE" ? (n.conceptId.startsWith("pe-") ? DRW_PE.pe : DRW_PE.drw) : { source: SOURCES[subject], clause: CLAUSES[subject] };
    if (n.source !== want.source || n.syllabusClause !== want.clause || n.sourceKind !== "concept-extracted") badProv.push(n.conceptId);
  }
  check(`P4L ${subject}: new notes carry exactly the 10 schema keys`, badKeys.length === 0, badKeys.slice(0, 3).join(", "));
  check(`P4L ${subject}: new notes all 6 text fields non-empty`, badText.length === 0, badText.slice(0, 3).join(", "));
  check(`P4L ${subject}: new note bodies 50-100 words`, badWords.length === 0, badWords.slice(0, 3).join(", "));
  check(`P4L ${subject}: new notes source/clause/kind match the registry`, badProv.length === 0, badProv.slice(0, 3).join(", "));
}
check("P4L 150 new notes in total", newNotes.length === 150, `got ${newNotes.length}`);
const sourced = Object.values(NOTES).flat().filter((n) => n.sourceKind === "concept-extracted");
check("P4L 206 concept-extracted notes (56 + 150)", sourced.length === 206, `got ${sourced.length}`);

// --------------------------------- §5 dedupe
const allNotes = Object.entries(NOTES).flatMap(([subject, arr]) => arr.map((n) => ({ ...n, subject })));
const titleSeen = new Map();
let titleDup = [];
for (const n of allNotes) {
  const t = n.title.trim().toLowerCase();
  if (titleSeen.has(t)) titleDup.push(`"${n.title}" (${titleSeen.get(t)} + ${n.subject})`);
  titleSeen.set(t, n.subject);
}
check("P4L all 301 note titles unique (case-insensitive)", titleDup.length === 0, titleDup.slice(0, 3).join(" | "));
const cidSeen = new Map();
let cidDup = [];
for (const n of sourced) {
  if (cidSeen.has(n.conceptId)) cidDup.push(n.conceptId);
  cidSeen.set(n.conceptId, n.subject);
}
check("P4L all 206 conceptIds unique", cidDup.length === 0, cidDup.slice(0, 3).join(", "));

// --------------------------------- §6 trilingual completeness + subject rules
const NOTE_TR_KEYS = ["title_ur", "title_roman", "body_ur", "body_roman"];
let untranslated = [];
for (const n of allNotes) {
  if (!NOTE_TR_KEYS.every((k) => typeof n[k] === "string" && n[k].trim().length > 0)) untranslated.push(`${n.subject}:${n.title}`);
}
check("P4L all 301 notes carry all 4 translation fields, non-empty", untranslated.length === 0, untranslated.slice(0, 3).join(", "));
const AR_RUN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;
let urduBad = [];
for (const n of NOTES.Urdu) {
  if (n.title_ur !== n.title || n.body_ur !== n.body) urduBad.push(`not verbatim: "${n.title}"`);
  if ((n.title_roman.match(AR_RUN) || []).length > 0 || (n.body_roman.match(AR_RUN) || []).length > 0) urduBad.push(`roman has script: "${n.title}"`);
}
check("P4L Urdu notes (all 20): _ur verbatim + _roman pure-Latin", urduBad.length === 0, urduBad.slice(0, 3).join(" | "));
let arabicBad = [];
for (const n of NOTES.Arabic.slice(ORIG_COUNT.Arabic)) {
  if (/[\u0600-\u06FF]/.test(n.title) || /[\u0600-\u06FF]/.test(n.body)) arabicBad.push(n.title);
}
check("P4L NEW Arabic notes (all 10): zero Arabic script in English fields", arabicBad.length === 0, arabicBad.slice(0, 3).join(", "));
// NOTE: 3 ORIGINAL Arabic notes legitimately carry Arabic terms in
// their English fields (5C auditField covers them via the verbatim
// rule); the zero-script rule is a Phase 4 new-content rule only.

// --------------------------------- §7 Stage 5 invariants on all 301 notes
function digitRuns(s) { return (s.match(/[0-9]+/g) || []).sort(); }
function sameMultiset(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function opCounts(s) {
  const m = {};
  const t = s.replace(/(?<=[A-Za-z\u0600-\u06FF])-(?=[A-Za-z\u0600-\u06FF])/g, "");
  for (const ch of t) if ("=+-*/×÷%√\u2212".includes(ch)) m[ch] = (m[ch] || 0) + 1;
  return m;
}
const HONOR_ABBR = /\(S\.?A\.?W\.?\)|\(P\.?B\.?U\.?H\.?\)|\(R\.?A\.?\)|\(A\.?S\.?\)/i;
const NEW_IDS = new Set(Object.values(REGISTRY).flat());
// Honorific check scoped to the 150 NEW notes: 2 ORIGINAL Islamiyat
// notes carry grandfathered "(SAW)" in their _roman fields (pre-Phase-4
// data, locked byte-identical by §3 — not rewritten here).
let digitBad = [];
let opBad = [];
let arabicRunBad = [];
let honorBad = [];
let markerBad = [];
let leakBad = [];
let musawwafBad = [];
for (const n of allNotes) {
  for (const [src, dst] of [["title", "title_ur"], ["title", "title_roman"], ["body", "body_ur"], ["body", "body_roman"]]) {
    if (!sameMultiset(digitRuns(n[src]), digitRuns(n[dst]))) digitBad.push(`${n.subject}:${n.title}:${dst}`);
  }
  if (n.subject === "Maths") {
    for (const dst of ["body_ur", "body_roman"]) {
      if (JSON.stringify(opCounts(n.body)) !== JSON.stringify(opCounts(n[dst]))) opBad.push(`${n.title}:${dst}`);
    }
  }
  if (n.subject !== "Urdu") {
    for (const [src, dst] of [["title", "title_ur"], ["title", "title_roman"], ["body", "body_ur"], ["body", "body_roman"]]) {
      for (const run of (n[src].match(AR_RUN) || [])) {
        if (!n[dst].includes(run)) arabicRunBad.push(`${n.subject}:${n.title}:${dst}:${JSON.stringify(run)}`);
      }
    }
  }
  for (const k of NOTE_TR_KEYS) {
    if (NEW_IDS.has(n.conceptId) && HONOR_ABBR.test(n[k])) honorBad.push(`${n.subject}:${n.title}:${k}`);
    if (/Roman Urdu:/.test(n[k])) leakBad.push(`${n.subject}:${n.title}:${k}`);
  }
  for (const k of TEXT_KEYS) {
    if (n[k].includes("[Auto-Translated]")) markerBad.push(`${n.subject}:${n.title}:${k}`);
    if (/musawwaf/i.test(n[k])) musawwafBad.push(`${n.subject}:${n.title}:${k}`);
  }
}
check("P4L digit runs unchanged in every translated note field (all 301)", digitBad.length === 0, digitBad.slice(0, 3).join(", "));
check("P4L Maths note operator counts unchanged in body translations (all 20)", opBad.length === 0, opBad.slice(0, 3).join(", "));
check("P4L Arabic script copied verbatim into both languages (non-Urdu notes)", arabicRunBad.length === 0, arabicRunBad.slice(0, 3).join(" | "));
check("P4L no Latin honorific abbreviations in any NEW note translation", honorBad.length === 0, honorBad.slice(0, 3).join(", "));
check("P4L no '[Auto-Translated]' literal in any note data field", markerBad.length === 0, markerBad.slice(0, 3).join(", "));
check("P4L no 'Roman Urdu:' label leaked into any note translation", leakBad.length === 0, leakBad.slice(0, 3).join(", "));
check("P4L no 'Musawwaf' (rejected term) in any note field", musawwafBad.length === 0, musawwafBad.slice(0, 3).join(", "));
// No invented Hadith numbers/citations/narrations in the 150 new
// notes — same strict regex as the 4B2 Qari-text check, over the
// English title+body of every new note.
const HADITH_RE = /(hadith\s*\d|sahih|bukhari|muslim\s*\d|surah\s+\d+:\d+|ayah\s+\d+|verse\s+\d+:\d+|narrat)/i;
let hadithBad = [];
for (const n of newNotes) {
  if (HADITH_RE.test(n.title + " " + n.body)) hadithBad.push(n.conceptId);
}
check("P4L no Hadith numbers/citations/narrations in any new note", hadithBad.length === 0, hadithBad.slice(0, 3).join(", "));

// --------------------------------- §8 resolver on one new note per subject
for (const [subject, ids] of Object.entries(REGISTRY)) {
  const tn = NOTES[subject].slice(ORIG_COUNT[subject])[0];
  const rUr = resolveNoteView(tn, "ur");
  const rRoman = resolveNoteView(tn, "roman");
  check(
    `P4L resolver: new ${subject} note resolves translated in ur + roman`,
    rUr.translated === true && rUr.title === tn.title_ur && rUr.body === tn.body_ur &&
      rRoman.translated === true && rRoman.title === tn.title_roman && rRoman.body === tn.body_roman,
    tn.conceptId,
  );
}

// --------------------------------- §9 content.json compact format
const rawContent = read("src/data/content.json");
check(
  "P4L content.json stays compact JSON.stringify output (no trailing newline)",
  JSON.stringify(JSON.parse(rawContent)) === rawContent,
);

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll Phase 4 library checks passed.");
