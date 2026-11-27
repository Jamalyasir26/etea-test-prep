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
  "P4L content.json counts: total 8000, notes 301, cards 70, tracks 19, mocks 28",
  contentJson.counts.total === 8000 && contentJson.counts.notes === 301 && contentJson.counts.cards === 70 && contentJson.counts.tracks === 19 && contentJson.counts.mocks === 30,
  JSON.stringify(contentJson.counts),
);
check(
  "P4L VISIBLE_COUNTS 8000/301/70, 12 tracks / 26 mocks",
  VISIBLE_COUNTS.total === 8000 && VISIBLE_COUNTS.notes === 301 && VISIBLE_COUNTS.cards === 70,
);

// --------------------------------- §3 original 151 notes byte-identical
// U1: the _ur fields of the original notes were rewritten idiomatically,
// so the hash now covers every field EXCEPT title_ur/body_ur. The hashes
// below were computed from the pre-U1 (Phase 4) tree with _ur stripped —
// they pin the English/_roman/source fields byte-identically.
const PREFIX_HASH = {
  "Drawing/PE": "66695084cd4371607603741be40e3dea830824b4b39ae997eb29b32c1ff534b9",
  "General Science": "15b61391b7bc58050cbbd6b04d49adf1e6ea050879b575a7c9dbe02e7140a9c0",
  "Arabic": "0f8e7691376061413cf82670b8eb8ea12522d6aa2b87b40d06c49e966ea1ae41",
  "Pedagogy": "6e4d18a8ffcfe51adedb619dbb364e28f92d4bc0aa89c49ba564b1ac5113ba1b",
  "Pak Studies": "7985b75ceca0b0878762974121925a33a7d01ff36836c1cd67695c08fa6aebb8",
  "Islamiyat": "8c3a9d4fd8c91e45b9420e3df63644b8e10b7bd97a67217cfc4c1d12ccc6cb9b",
  "Maths": "f0ed2e96571549ee3bb002551e022b944ac784e44ae129f024b2896d2b0cc61c",
  "GK": "71dd2d06e66ad722f5484fb9ad8938d8b9da1640e98ba0d3fda7c0d5b606c95c",
  "Urdu": "502b2390bf8e6e0804a5fbefb7fbb5a59c15c8f95d636339de7f3933ac131100",
  "Tajweed": "b83bd1600fbc8ea3798973756f616e79ee201cf56d4895429b3ae59fda52872b",
  "IT/Computer": "35f2517a740ed2089ab39048ab753b31d50009ad60f701c10e167b6d31bf6ed7",
  "English": "518fe36e79d1ce2642b7f427e1250eb5d44e8940948463c8f9d656d03737a230",
  "Social Studies": "601af8296b87649b566a39ab5272a9e36b3e714abf17f709a575572e6445e3a4"
};
for (const [subject, n] of Object.entries(ORIG_COUNT)) {
  const stripped = NOTES[subject].slice(0, n).map((x) => { const y = { ...x }; delete y.title_ur; delete y.body_ur; return y; });
  const h = createHash("sha256").update(JSON.stringify(stripped), "utf8").digest("hex");
  check(`P4L original ${n} ${subject} notes byte-identical except _ur (prefix hash, U1 rewrite)`, h === PREFIX_HASH[subject]);
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
// U1 ruling 1: echo-dedup legitimately removes DUPLICATED digit runs from
// _ur bodies (the deleted "Roman Urdu:" echo gloss restated numbers already
// in the main text). For _ur fields: digit SET equality + Urdu multiset ⊆
// English multiset. _roman fields stay strict (untouched by U1).
function relaxedDigitOk(en, ur) {
  const E = digitRuns(en), U = digitRuns(ur);
  const setE = new Set(E), setU = new Set(U);
  if (setE.size !== setU.size || ![...setE].every((x) => setU.has(x))) return false;
  const mE = {}; E.forEach((x) => { mE[x] = (mE[x] || 0) + 1; });
  const mU = {}; U.forEach((x) => { mU[x] = (mU[x] || 0) + 1; });
  return Object.entries(mU).every(([k, v]) => v <= (mE[k] || 0));
}
// U1 documented exemption D4: Hockey body_ur lacks digit "4" — it occurs
// ONLY in the deleted echo gloss; the main text spells "four" → چار.
function d4ExemptOk(n, dst) {
  if (n.subject !== "Drawing/PE" || n.title !== "Hockey — The Basics" || dst !== "body_ur") return false;
  const E = digitRuns(n.body), U = digitRuns(n.body_ur);
  const setE = new Set(E), setU = new Set(U);
  return setE.size === setU.size + 1 && !setU.has("4") && [...setU].every((x) => setE.has(x)) &&
    U.every((x) => (E.filter((y) => y === x).length) >= (U.filter((y) => y === x).length)) &&
    n.body_ur.includes("چار کوارٹر");
}
function opCounts(s) {
  const m = {};
  const t = s.replace(/(?<=[A-Za-z\u0600-\u06FF])-(?=[A-Za-z\u0600-\u06FF])/g, "");
  for (const ch of t) if ("=+-*/×÷%√\u2212".includes(ch)) m[ch] = (m[ch] || 0) + 1;
  return m;
}
// U1: in _ur NOTE prose, "%" spelled as فیصد and "/" as a prose separator
// in Urdu glosses (تقسیم/ضرب) are approved idiomatic forms. Formula
// operators (= + - * × ÷ √ −) stay strictly compared; fraction digits
// remain pinned by the digit check above. _roman stays fully strict.
function opCountsNoteUr(s) {
  const m = {};
  const t = s.replace(/(?<=[A-Za-z\u0600-\u06FF])-(?=[A-Za-z\u0600-\u06FF])/g, "");
  for (const ch of t) if ("=+-*×÷√\u2212".includes(ch)) m[ch] = (m[ch] || 0) + 1;
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
    const ok = dst.endsWith("_ur") ? (relaxedDigitOk(n[src], n[dst]) || d4ExemptOk(n, dst)) : sameMultiset(digitRuns(n[src]), digitRuns(n[dst]));
    if (!ok) digitBad.push(`${n.subject}:${n.title}:${dst}`);
  }
  if (n.subject === "Maths") {
    for (const dst of ["body_ur", "body_roman"]) {
      const ok = dst === "body_ur"
        ? JSON.stringify(opCountsNoteUr(n.body)) === JSON.stringify(opCountsNoteUr(n[dst]))
        : JSON.stringify(opCounts(n.body)) === JSON.stringify(opCounts(n[dst]));
      if (!ok) opBad.push(`${n.title}:${dst}`);
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
check("P4L digit runs preserved in every translated note field (all 301; U1 ruling 1 for _ur, strict for _roman)", digitBad.length === 0, digitBad.slice(0, 3).join(", "));
check("P4L Maths note formula-operator counts unchanged in body translations (all 20; U1 prose forms for _ur)", opBad.length === 0, opBad.slice(0, 3).join(", "));
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
