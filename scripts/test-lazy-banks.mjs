// Lazy per-bank loading tests (Nov 2026) — plain node, no dependencies.
// Covers the lazy-load batch's invariants:
//  (a) No static src/data/banks/*.json import remains in client code
//      (banks load only through dynamic import() in src/lib/banks.ts).
//  (b) The production build emits exactly one chunk per bank, and ZERO
//      question text in the initial (first-load) chunks. REQUIRES a
//      production build: run `npm run build` first; the suite fails
//      clearly when .next is absent.
//  (c) The checked-in bank manifest equals a fresh regeneration.
//  (d) Loaded bank order == bank file order; loadAllQuestions order ==
//      the old static QUESTIONS order.
//  (e) mockAvailableCount (manifest-based) == the old fs-based
//      computation, and == what buildMockQuestions actually builds
//      (sampling waits for the needed banks).
//  (f) The review page's mockPool order == the old per-bank
//      concatenation order (comp-key order + file order + dedupe).
//  (g) The service worker is UNCHANGED and its cache-first rule covers
//      lazy chunk URLs under /_next/static/chunks/.
//  (h) Bug regressions: home drill links pass the bank key (not the
//      display label); /topics QuizRunners carry stable sessionScope.
//  (i) Every zamFixed id resolves via the manifest id->bank map.
//  (j) The dead drawing_pe bank is not in the manifest.
//  Plus: bank/note/audio content, tracking.ts and sw.js are
//  byte-identical to the pre-lazyload backup except the Phase 1
//  files (islamiyat.json + tajweed.json + arabic.json + english.json +
//  urdu.json + maths.json + pakstudies.json + pedagogy.json +
//  science.json + socialstudies.json + gk.json + it.json + pe.json +
//  content.json, whose delta is pinned exactly), and every
//  loading/failure UI marker is present.
// Run: npm run build && node scripts/test-lazy-banks.mjs (exit 0 = all pass)
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BACKUP = join(ROOT, "..", "etea-prep-next-backup-pre-lazyload");
const BANK_KEYS = ["arabic", "drawing", "english", "gk", "islamiyat", "it", "maths", "pakstudies", "pastpapers", "pastpapers_reworded", "pe", "pedagogy", "science", "socialstudies", "tajweed", "urdu"];

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
function info(msg) {
  console.log(`INFO  ${msg}`);
}
const sha = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const readBank = (k) => JSON.parse(fs.readFileSync(join(ROOT, "src/data/banks", `${k}.json`), "utf8"));
const BY_SUBJECT = Object.fromEntries(BANK_KEYS.map((k) => [k, readBank(k)]));
const QUESTIONS = BANK_KEYS.flatMap((k) => BY_SUBJECT[k]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// ---------- (a) no static bank import in client code ----------
const srcFiles = walk(join(ROOT, "src")).filter((p) => /\.(ts|tsx)$/.test(p));
const staticBankImports = [];
for (const p of srcFiles) {
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    if (/^\s*import\s/.test(line) && /data\/banks\//.test(line)) staticBankImports.push(`${relative(ROOT, p)}: ${line.trim()}`);
    if (/require\(["'][^"']*data\/banks\//.test(line)) staticBankImports.push(`${relative(ROOT, p)}: ${line.trim()}`);
  }
}
check("no static src/data/banks/*.json import in src/", staticBankImports.length === 0, staticBankImports.join("; "));
const banksSrc = fs.readFileSync(join(ROOT, "src/lib/banks.ts"), "utf8");
check(
  "banks.ts loads banks only via dynamic import()",
  BANK_KEYS.every((k) => banksSrc.includes(`import("../data/banks/${k}.json")`)),
  "LOADERS map must list all 16 banks as dynamic imports",
);
check("content.json stays statically imported (notes are not lazy)", fs.readFileSync(join(ROOT, "src/lib/data.ts"), "utf8").includes('from "../data/content.json"'));

// ---------- (c) manifest equals regeneration ----------
const tmpManifest = "/tmp/lazybanks-manifest-regen.ts";
execSync(`node scripts/generate-bank-manifest.mjs ${tmpManifest}`, { cwd: ROOT, stdio: "pipe" });
check(
  "checked-in bank-manifest.ts equals a fresh regeneration (byte-identical)",
  fs.readFileSync(tmpManifest, "utf8") === fs.readFileSync(join(ROOT, "src/lib/bank-manifest.ts"), "utf8"),
);

// ---------- (j) drawing_pe not in the manifest ----------
const manifestSrc = fs.readFileSync(join(ROOT, "src/lib/bank-manifest.ts"), "utf8");
const manifestNoComments = manifestSrc.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
check("dead drawing_pe bank is not in the manifest (code, comments excluded)", !manifestNoComments.includes("drawing_pe"));

// ---------- (g) service worker unchanged + covers lazy chunks ----------
const swSrc = fs.readFileSync(join(ROOT, "public/sw.js"), "utf8");
check(
  "SW cache-first rule matches any /_next/static/ URL (lazy chunks included)",
  swSrc.includes('url.pathname.startsWith("/_next/static/")') && swSrc.includes("caches.match(request)"),
);
if (fs.existsSync(join(BACKUP, "public/sw.js"))) {
  // SW caching logic unchanged: the ONLY allowed difference vs the backup is
  // the CACHE_VERSION bump (v1 -> v2 at lazy-load, v2 -> v3 in Phase 4 to
  // evict the stale v2 caches behind the /mock list observation).
  // Compare with the version line normalized.
  const norm = (s) => s.replace(/const CACHE_VERSION = "etea-prep-v\d+";/, 'const CACHE_VERSION = "X";');
  check(
    "public/sw.js identical to the pre-lazyload backup except the CACHE_VERSION bump (SW logic unchanged)",
    norm(fs.readFileSync(join(ROOT, "public/sw.js"), "utf8")) === norm(fs.readFileSync(join(BACKUP, "public/sw.js"), "utf8")),
  );
  check('SW CACHE_VERSION bumped to "etea-prep-v3" (Phase 4)', swSrc.includes('const CACHE_VERSION = "etea-prep-v3";'));
} else {
  info("pre-lazyload backup not found — SW byte-compare skipped");
}

// ---------- Content + storage schema unchanged vs backup ----------
// Phase 1 exception (documented, narrow): islamiyat.json, tajweed.json,
// arabic.json, english.json, urdu.json, maths.json, pakstudies.json, pedagogy.json, science.json, socialstudies.json, gk.json, it.json, pe.json, drawing.json + content.json changed ONLY by the Phase 1 growth
// batches (395 + 418 + 420 + 455 + 455 + 455 + 455 + 470 + 470 + 470 + 470 + 440 + 454 + 450 appended items, counts + bySubject indexes).
// Phase 2 exception (documented, narrow): tracking.ts changed ONLY inside
// gradeButtonLabel (Roman grade names) and content.json gained ONLY the
// _ur/_roman translation fields on flashcards, plan tuples, and mock
// defs.
// Phase 3 exception (documented, narrow): tracking.ts gained ONLY a
// one-line comment change on the deadlineTs field ("(mock only)" ->
// "(timed runs: mock + timed practice)", W3 timed mode; no code change),
// and content.json gained ONLY the 8 new mock defs + counts.mocks 20 -> 28.
// Phase 4 exception (documented, narrow): content.json gained ONLY the
// 150 appended notes (per-subject tails beyond the backup lengths) +
// counts.notes 151 -> 301; public/sw.js gained ONLY the CACHE_VERSION
// bump v2 -> v3. Everything else stays byte-identical, and the changed files must
// match the backup exactly outside the Phase 1 + Phase 2 + Phase 3 + Phase 4 deltas
// (byte-prefix for the banks, parsed-diff for content.json, function-strip
// for tracking.ts).
if (fs.existsSync(BACKUP)) {
  const contentPaths = [
    ...BANK_KEYS.map((k) => `src/data/banks/${k}.json`),
    "src/data/banks/drawing_pe.json",
    "src/data/content.json",
    "src/data/quran-examples.json",
  ];
  const PHASE1_CHANGED = new Set(["src/data/banks/islamiyat.json", "src/data/banks/tajweed.json", "src/data/banks/arabic.json", "src/data/banks/english.json", "src/data/banks/urdu.json", "src/data/banks/maths.json", "src/data/banks/pakstudies.json", "src/data/banks/pedagogy.json", "src/data/banks/science.json", "src/data/banks/socialstudies.json", "src/data/banks/gk.json", "src/data/banks/it.json", "src/data/banks/pe.json", "src/data/banks/drawing.json", "src/data/content.json"]);
  const changed = contentPaths.filter((p) => !PHASE1_CHANGED.has(p) && sha(join(ROOT, p)) !== sha(join(BACKUP, p)));
  check("bank/note/audio content byte-identical to backup except the fifteen Phase 1 files", changed.length === 0, changed.join(", "));
  // Phase 2 tracking.ts: the ONLY permitted delta is gradeButtonLabel
  // (its JSDoc + body). Strip that one function from both files; the
  // remainders must be byte-identical, and the Roman names must exist
  // only in the current file.
  const stripGradeButtonLabel = (src) => {
    const fnStart = src.indexOf("export function gradeButtonLabel");
    const commentStart = src.lastIndexOf("/**", fnStart);
    let i = src.indexOf("{", fnStart);
    let depth = 0;
    for (; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    return src.slice(0, commentStart) + "/* STRIPPED gradeButtonLabel */" + src.slice(i + 1);
  };
  const backupTracking = fs.readFileSync(join(BACKUP, "src/lib/tracking.ts"), "utf8");
  const curTracking = fs.readFileSync(join(ROOT, "src/lib/tracking.ts"), "utf8");
  // Phase 3 exception (documented, narrow): normalize the ONE deadlineTs
  // comment line (W3 timed mode, comment only) before comparing, and pin
  // the exact old/new texts so the exception cannot hide a code change.
  const normDeadlineComment = (s) => s.replace(/\/\/ absolute end \([^)]*\); countdown = deadlineTs - now/, "// absolute end (X); countdown = deadlineTs - now");
  check(
    "Phase 2 + Phase 3 tracking.ts: identical to backup outside gradeButtonLabel + the deadlineTs comment, Roman names only in current",
    normDeadlineComment(stripGradeButtonLabel(curTracking)) === normDeadlineComment(stripGradeButtonLabel(backupTracking)) &&
      curTracking.includes("// absolute end (timed runs: mock + timed practice); countdown = deadlineTs - now") &&
      backupTracking.includes("// absolute end (mock only); countdown = deadlineTs - now") &&
      ["Dobara", "Mushkil", "Achha", "Asan"].every((n) => curTracking.includes(`"${n}"`)) &&
      ["Dobara", "Mushkil", "Achha", "Asan"].every((n) => !backupTracking.includes(`"${n}"`)),
  );
  const backupBankRaw = fs.readFileSync(join(BACKUP, "src/data/banks/islamiyat.json"), "utf8");
  const curBankRaw = fs.readFileSync(join(ROOT, "src/data/banks/islamiyat.json"), "utf8");
  const backupPrefix = backupBankRaw.slice(0, -3); // strip trailing "\n]\n"
  const backupBank = JSON.parse(backupBankRaw);
  const curBank = JSON.parse(curBankRaw);
  // U1: islamiyat _ur fields were rewritten idiomatically in all 500 items,
  // so the byte-prefix assertion no longer applies. The non-_ur fields of
  // the 105 backup items must still match exactly; append pins stay.
  const stripUrFields = (q) => { const c = { ...q }; delete c.question_ur; delete c.options_ur; delete c.explanation_ur; return c; };
  check("Phase 1 islamiyat.json (U1 _ur rewrite): non-_ur fields of 105 backup items untouched + 395 appended",
    backupBank.length === 105 && curBank.length === 500 &&
    JSON.stringify(curBank.slice(0, 105).map(stripUrFields)) === JSON.stringify(backupBank.map(stripUrFields)) &&
    curBank[105].id === "ISL-106" && curBank[499].id === "ISL-500");
  const backupTajRaw = fs.readFileSync(join(BACKUP, "src/data/banks/tajweed.json"), "utf8");
  const curTajRaw = fs.readFileSync(join(ROOT, "src/data/banks/tajweed.json"), "utf8");
  const backupTaj = JSON.parse(backupTajRaw);
  const curTaj = JSON.parse(curTajRaw);
  // U2-Tajweed: tajweed _ur fields were rewritten idiomatically in 364 of
  // 500 items (778 of 3000 fields), so the byte-prefix assertion no longer
  // applies. The non-_ur fields of the 82 backup items must still match
  // exactly (verified field-by-field, same pattern as the U1 islamiyat
  // adjudication above); append pins stay.
  check("Phase 1 tajweed.json (U2 _ur rewrite): non-_ur fields of 82 backup items untouched + 418 appended",
    backupTaj.length === 82 && curTaj.length === 500 &&
    JSON.stringify(curTaj.slice(0, 82).map(stripUrFields)) === JSON.stringify(backupTaj.map(stripUrFields)) &&
    curTaj[82].id === "TAJ-083" && curTaj[499].id === "TAJ-500");
  const backupArbRaw = fs.readFileSync(join(BACKUP, "src/data/banks/arabic.json"), "utf8");
  const curArbRaw = fs.readFileSync(join(ROOT, "src/data/banks/arabic.json"), "utf8");
  const backupArb = JSON.parse(backupArbRaw);
  const curArb = JSON.parse(curArbRaw);
  // U2-Arabic: arabic _ur fields were rewritten idiomatically in 284 of
  // 500 items (406 of 3000 fields), so the byte-prefix assertion no longer
  // applies. The non-_ur fields of the 80 backup items must still match
  // exactly (verified field-by-field, same pattern as the U1 islamiyat
  // and U2 tajweed adjudications above); append pins stay.
  check("Phase 1 arabic.json (U2 _ur rewrite): non-_ur fields of 80 backup items untouched + 420 appended",
    backupArb.length === 80 && curArb.length === 500 &&
    JSON.stringify(curArb.slice(0, 80).map(stripUrFields)) === JSON.stringify(backupArb.map(stripUrFields)) &&
    curArb[80].id === "ARB-081" && curArb[499].id === "ARB-500");
  const backupEngRaw = fs.readFileSync(join(BACKUP, "src/data/banks/english.json"), "utf8");
  const curEngRaw = fs.readFileSync(join(ROOT, "src/data/banks/english.json"), "utf8");
  const backupEng = JSON.parse(backupEngRaw);
  const curEng = JSON.parse(curEngRaw);
  // U2-English: english _ur fields were rewritten idiomatically in 245 of
  // 500 items (315 of 3000 fields), so the byte-prefix assertion no longer
  // applies. The non-_ur fields of the 45 backup items must still match
  // exactly (verified field-by-field, same pattern as the U1 islamiyat
  // and U2 tajweed/arabic/urdu adjudications above); append pins stay.
  check("Phase 1 english.json (U2 _ur rewrite): non-_ur fields of 45 backup items untouched + 455 appended",
    backupEng.length === 45 && curEng.length === 500 &&
    JSON.stringify(curEng.slice(0, 45).map(stripUrFields)) === JSON.stringify(backupEng.map(stripUrFields)) &&
    curEng[45].id === "ENG-046" && curEng[499].id === "ENG-500");
  const backupUrdRaw = fs.readFileSync(join(BACKUP, "src/data/banks/urdu.json"), "utf8");
  const curUrdRaw = fs.readFileSync(join(ROOT, "src/data/banks/urdu.json"), "utf8");
  const backupUrd = JSON.parse(backupUrdRaw);
  const curUrd = JSON.parse(curUrdRaw);
  // U2-Urdu: urdu _ur fields were rewritten idiomatically in 92 of
  // 500 items (118 of 3000 fields), so the byte-prefix assertion no longer
  // applies. The non-_ur fields of the 45 backup items must still match
  // exactly (verified field-by-field, same pattern as the U1 islamiyat
  // and U2 tajweed/arabic adjudications above); append pins stay.
  check("Phase 1 urdu.json (U2 _ur rewrite): non-_ur fields of 45 backup items untouched + 455 appended",
    backupUrd.length === 45 && curUrd.length === 500 &&
    JSON.stringify(curUrd.slice(0, 45).map(stripUrFields)) === JSON.stringify(backupUrd.map(stripUrFields)) &&
    curUrd[45].id === "URD-046" && curUrd[499].id === "URD-500");
  const backupMatRaw = fs.readFileSync(join(BACKUP, "src/data/banks/maths.json"), "utf8");
  const curMatRaw = fs.readFileSync(join(ROOT, "src/data/banks/maths.json"), "utf8");
  const backupMat = JSON.parse(backupMatRaw);
  const curMat = JSON.parse(curMatRaw);
  // U2-Maths: maths _ur fields were rewritten idiomatically in 275 of
  // 500 items (691 of 3000 field-values), so the byte-prefix assertion
  // no longer applies. The non-_ur fields of the 45 backup items must
  // still match exactly (verified field-by-field, same pattern as the
  // U1 islamiyat and U2 tajweed/arabic/urdu/english adjudications
  // above); append pins stay.
  check("Phase 1 maths.json (U2 _ur rewrite): non-_ur fields of 45 backup items untouched + 455 appended",
    backupMat.length === 45 && curMat.length === 500 &&
    JSON.stringify(curMat.slice(0, 45).map(stripUrFields)) === JSON.stringify(backupMat.map(stripUrFields)) &&
    curMat[45].id === "MAT-046" && curMat[499].id === "MAT-500");
  const backupPakRaw = fs.readFileSync(join(BACKUP, "src/data/banks/pakstudies.json"), "utf8");
  const curPakRaw = fs.readFileSync(join(ROOT, "src/data/banks/pakstudies.json"), "utf8");
  const backupPak = JSON.parse(backupPakRaw);
  const curPak = JSON.parse(curPakRaw);
  // U2-PakStudies: pakstudies _ur fields were rewritten idiomatically
  // in 91 of 500 items (118 of 3000 field-values), so the byte-prefix
  // assertion no longer applies. The non-_ur fields of the 45 backup
  // items must still match exactly (verified field-by-field, same
  // pattern as the U1 islamiyat and U2 tajweed/arabic/urdu/english/
  // maths adjudications above); append pins stay.
  check("Phase 1 pakstudies.json (U2 _ur rewrite): non-_ur fields of 45 backup items untouched + 455 appended",
    backupPak.length === 45 && curPak.length === 500 &&
    JSON.stringify(curPak.slice(0, 45).map(stripUrFields)) === JSON.stringify(backupPak.map(stripUrFields)) &&
    curPak[45].id === "PAK-046" && curPak[499].id === "PAK-500");
  const backupPedRaw = fs.readFileSync(join(BACKUP, "src/data/banks/pedagogy.json"), "utf8");
  const curPedRaw = fs.readFileSync(join(ROOT, "src/data/banks/pedagogy.json"), "utf8");
  const backupPedPrefix = backupPedRaw.slice(0, -2); // strip trailing "\n]" — pedagogy.json has NO trailing newline (unlike the other Phase 1 banks)
  const backupPed = JSON.parse(backupPedRaw);
  const curPed = JSON.parse(curPedRaw);
  check("Phase 1 pedagogy.json: backup bytes are an exact prefix (30 items untouched) + 470 appended",
    curPedRaw.startsWith(backupPedPrefix + ",") && backupPed.length === 30 && curPed.length === 500 &&
    JSON.stringify(curPed.slice(0, 30)) === JSON.stringify(backupPed) &&
    curPed[30].id === "PED-031" && curPed[499].id === "PED-500");
  const backupSciRaw = fs.readFileSync(join(BACKUP, "src/data/banks/science.json"), "utf8");
  const curSciRaw = fs.readFileSync(join(ROOT, "src/data/banks/science.json"), "utf8");
  const backupSciPrefix = backupSciRaw.slice(0, -2); // strip trailing "\n]" — science.json has NO trailing newline (like pedagogy.json)
  const backupSci = JSON.parse(backupSciRaw);
  const curSci = JSON.parse(curSciRaw);
  check("Phase 1 science.json: backup bytes are an exact prefix (30 items untouched) + 470 appended",
    curSciRaw.startsWith(backupSciPrefix + ",") && backupSci.length === 30 && curSci.length === 500 &&
    JSON.stringify(curSci.slice(0, 30)) === JSON.stringify(backupSci) &&
    curSci[30].id === "SCI-031" && curSci[499].id === "SCI-500");
  const backupSsRaw = fs.readFileSync(join(BACKUP, "src/data/banks/socialstudies.json"), "utf8");
  const curSsRaw = fs.readFileSync(join(ROOT, "src/data/banks/socialstudies.json"), "utf8");
  const backupSsPrefix = backupSsRaw.slice(0, -2); // strip trailing "\n]" — socialstudies.json has NO trailing newline (like pedagogy.json/science.json)
  const backupSs = JSON.parse(backupSsRaw);
  const curSs = JSON.parse(curSsRaw);
  check("Phase 1 socialstudies.json: backup bytes are an exact prefix (30 items untouched) + 470 appended",
    curSsRaw.startsWith(backupSsPrefix + ",") && backupSs.length === 30 && curSs.length === 500 &&
    JSON.stringify(curSs.slice(0, 30)) === JSON.stringify(backupSs) &&
    curSs[30].id === "SS-031" && curSs[499].id === "SS-500");
  const backupGkRaw = fs.readFileSync(join(BACKUP, "src/data/banks/gk.json"), "utf8");
  const curGkRaw = fs.readFileSync(join(ROOT, "src/data/banks/gk.json"), "utf8");
  const backupGkPrefix = backupGkRaw.slice(0, -2); // strip trailing "\n]" — gk.json has NO trailing newline (like pedagogy.json/science.json/socialstudies.json)
  const backupGk = JSON.parse(backupGkRaw);
  const curGk = JSON.parse(curGkRaw);
  check("Phase 1 gk.json: backup bytes are an exact prefix (30 items untouched) + 470 appended",
    curGkRaw.startsWith(backupGkPrefix + ",") && backupGk.length === 30 && curGk.length === 500 &&
    JSON.stringify(curGk.slice(0, 30)) === JSON.stringify(backupGk) &&
    curGk[30].id === "GKN-031" && curGk[499].id === "GKN-500");
  const backupItRaw = fs.readFileSync(join(BACKUP, "src/data/banks/it.json"), "utf8");
  const curItRaw = fs.readFileSync(join(ROOT, "src/data/banks/it.json"), "utf8");
  const backupItPrefix = backupItRaw.slice(0, -2); // strip trailing "\n]" — it.json has NO trailing newline (like pedagogy.json/science.json/socialstudies.json/gk.json)
  const backupIt = JSON.parse(backupItRaw);
  const curIt = JSON.parse(curItRaw);
  check("Phase 1 it.json: backup bytes are an exact prefix (60 items untouched) + 440 appended",
    curItRaw.startsWith(backupItPrefix + ",") && backupIt.length === 60 && curIt.length === 500 &&
    JSON.stringify(curIt.slice(0, 60)) === JSON.stringify(backupIt) &&
    curIt[60].id === "ITC-061" && curIt[499].id === "ITC-500");
  const backupPeRaw = fs.readFileSync(join(BACKUP, "src/data/banks/pe.json"), "utf8");
  const curPeRaw = fs.readFileSync(join(ROOT, "src/data/banks/pe.json"), "utf8");
  const backupPePrefix = backupPeRaw.slice(0, -3); // strip trailing "\n]\n"
  const backupPe = JSON.parse(backupPeRaw);
  const curPe = JSON.parse(curPeRaw);
  check("Phase 1 pe.json: backup bytes are an exact prefix (46 items untouched) + 454 appended",
    curPeRaw.startsWith(backupPePrefix + ",") && backupPe.length === 46 && curPe.length === 500 &&
    JSON.stringify(curPe.slice(0, 46)) === JSON.stringify(backupPe) &&
    curPe[46].id === "PE-037" && curPe[499].id === "PE-490");
  const backupDrwRaw = fs.readFileSync(join(BACKUP, "src/data/banks/drawing.json"), "utf8");
  const curDrwRaw = fs.readFileSync(join(ROOT, "src/data/banks/drawing.json"), "utf8");
  const backupDrwPrefix = backupDrwRaw.slice(0, -3); // strip trailing "\n]\n"
  const backupDrw = JSON.parse(backupDrwRaw);
  const curDrw = JSON.parse(curDrwRaw);
  check("Phase 1 drawing.json: backup bytes are an exact prefix (50 items untouched) + 450 appended",
    curDrwRaw.startsWith(backupDrwPrefix + ",") && backupDrw.length === 50 && curDrw.length === 500 &&
    JSON.stringify(curDrw.slice(0, 50)) === JSON.stringify(backupDrw) &&
    curDrw[50].id === "DRW-061" && curDrw[499].id === "DRW-510");
  const backupContent = JSON.parse(fs.readFileSync(join(BACKUP, "src/data/content.json"), "utf8"));
  const curContent = JSON.parse(fs.readFileSync(join(ROOT, "src/data/content.json"), "utf8"));
  const reverted = JSON.parse(JSON.stringify(curContent));
  // Phase 3 revert (documented, narrow): drop ONLY the 8 new mock defs
  // and reset counts.mocks to the backup value before comparing. The
  // original 20 defs must match the backup exactly after the Phase 2
  // translation-field strip below.
  const PHASE3_NEW_MOCK_IDS = ["pst-A", "ct-B", "ctit-A", "dm-2", "pet-2", "swse-2", "sst-kppsc-2", "sst-etea-2"];
  reverted.mocks = reverted.mocks.filter((m) => !PHASE3_NEW_MOCK_IDS.includes(m.id));
  reverted.counts.mocks = backupContent.counts.mocks;
  const curOnlyMockIds = curContent.mocks.map((m) => m.id).filter((id) => !backupContent.mocks.some((b) => b.id === id));
  // Phase 4 revert (documented, narrow): drop ONLY the 150 appended
  // notes (each subject's tail beyond the backup length) and reset
  // counts.notes to the backup value before comparing. The original
  // 151 notes must match the backup exactly.
  const PHASE4_NEW_PER_SUBJECT = {"Drawing/PE": 5, "General Science": 12, Arabic: 10, Pedagogy: 10, "Pak Studies": 13, Islamiyat: 12, Maths: 13, GK: 14, Urdu: 14, Tajweed: 11, "IT/Computer": 7, English: 12, "Social Studies": 17};
  for (const subject of Object.keys(PHASE4_NEW_PER_SUBJECT)) {
    reverted.notes[subject] = reverted.notes[subject].slice(0, backupContent.notes[subject].length);
  }
  // U1 revert (documented, narrow): restore ONLY the _ur fields of the
  // pre-existing notes from the backup — U1 rewrote them idiomatically.
  // The remaining fields must match the backup exactly.
  for (const subject of Object.keys(reverted.notes)) {
    reverted.notes[subject].forEach((n, i) => {
      n.title_ur = backupContent.notes[subject][i].title_ur;
      n.body_ur = backupContent.notes[subject][i].body_ur;
    });
  }
  reverted.counts.notes = backupContent.counts.notes;
  reverted.counts.total = backupContent.counts.total;
  reverted.counts.bySubject.find((r) => r[0] === "Islamiyat")[1] =
    backupContent.counts.bySubject.find((r) => r[0] === "Islamiyat")[1];
  reverted.counts.bySubject.find((r) => r[0] === "Tajweed")[1] =
    backupContent.counts.bySubject.find((r) => r[0] === "Tajweed")[1];
  reverted.counts.bySubject.find((r) => r[0] === "Arabic")[1] =
    backupContent.counts.bySubject.find((r) => r[0] === "Arabic")[1];
  reverted.counts.bySubject.find((r) => r[0] === "English")[1] =
    backupContent.counts.bySubject.find((r) => r[0] === "English")[1];
  reverted.counts.bySubject.find((r) => r[0] === "Urdu")[1] =
    backupContent.counts.bySubject.find((r) => r[0] === "Urdu")[1];
  reverted.counts.bySubject.find((r) => r[0] === "Maths")[1] =
    backupContent.counts.bySubject.find((r) => r[0] === "Maths")[1];
  reverted.counts.bySubject.find((r) => r[0] === "Pak Studies")[1] =
    backupContent.counts.bySubject.find((r) => r[0] === "Pak Studies")[1];
  reverted.counts.bySubject.find((r) => r[0] === "Pedagogy")[1] =
    backupContent.counts.bySubject.find((r) => r[0] === "Pedagogy")[1];
  reverted.counts.bySubject.find((r) => r[0] === "General Science")[1] =
    backupContent.counts.bySubject.find((r) => r[0] === "General Science")[1];
  reverted.counts.bySubject.find((r) => r[0] === "Social Studies")[1] =
    backupContent.counts.bySubject.find((r) => r[0] === "Social Studies")[1];
  reverted.counts.bySubject.find((r) => r[0] === "GK")[1] =
    backupContent.counts.bySubject.find((r) => r[0] === "GK")[1];
  reverted.counts.bySubject.find((r) => r[0] === "IT")[1] =
    backupContent.counts.bySubject.find((r) => r[0] === "IT")[1];
  reverted.counts.bySubject.find((r) => r[0] === "Physical Education")[1] =
    backupContent.counts.bySubject.find((r) => r[0] === "Physical Education")[1];
  reverted.counts.bySubject.find((r) => r[0] === "Drawing")[1] =
    backupContent.counts.bySubject.find((r) => r[0] === "Drawing")[1];
  reverted.bySubject.islamiyat = backupContent.bySubject.islamiyat;
  reverted.bySubject.tajweed = backupContent.bySubject.tajweed;
  reverted.bySubject.arabic = backupContent.bySubject.arabic;
  reverted.bySubject.english = backupContent.bySubject.english;
  reverted.bySubject.urdu = backupContent.bySubject.urdu;
  reverted.bySubject.maths = backupContent.bySubject.maths;
  reverted.bySubject.pakstudies = backupContent.bySubject.pakstudies;
  reverted.bySubject.pedagogy = backupContent.bySubject.pedagogy;
  reverted.bySubject.science = backupContent.bySubject.science;
  reverted.bySubject.socialstudies = backupContent.bySubject.socialstudies;
  reverted.bySubject.gk = backupContent.bySubject.gk;
  reverted.bySubject.it = backupContent.bySubject.it;
  reverted.bySubject.pe = backupContent.bySubject.pe;
  reverted.bySubject.drawing = backupContent.bySubject.drawing;
  // Phase 2 revert (documented, narrow): strip ONLY the _ur/_roman
  // translation fields added to flashcards, plan tuples, and mock defs.
  // The remaining English fields must match the backup exactly.
  for (const c of reverted.flashcards) {
    delete c.front_ur;
    delete c.front_roman;
    delete c.back_ur;
    delete c.back_roman;
    delete c.category_ur;
    delete c.category_roman;
  }
  for (const d of reverted.plan21) {
    for (const t of d[1]) t.length = 2;
    d.length = 2;
  }
  for (const m of reverted.mocks) {
    delete m.title_ur;
    delete m.title_roman;
    delete m.note_ur;
    delete m.note_roman;
  }
  check("Phase 1 + Phase 2 + Phase 3 + Phase 4 + U1 content.json: only counts + bySubject.islamiyat/tajweed/arabic/english/urdu/maths/pakstudies/pedagogy/science/socialstudies/gk/it/pe/drawing indexes + Phase 2 translation fields + the 8 Phase 3 mock defs + the 150 Phase 4 notes + U1 _ur rewrites differ from backup",
    JSON.stringify(reverted) === JSON.stringify(backupContent) &&
    curContent.counts.mocks === 28 && curContent.mocks.length === 28 && JSON.stringify(curOnlyMockIds) === JSON.stringify(PHASE3_NEW_MOCK_IDS) &&
    curContent.counts.notes === 301 &&
    Object.entries(PHASE4_NEW_PER_SUBJECT).every(([s, a]) => curContent.notes[s].length === backupContent.notes[s].length + a) &&
    curContent.counts.total === 7040 && curContent.bySubject.islamiyat.length === 500 && curContent.bySubject.tajweed.length === 500 && curContent.bySubject.arabic.length === 500 && curContent.bySubject.english.length === 500 && curContent.bySubject.urdu.length === 500 && curContent.bySubject.maths.length === 500 && curContent.bySubject.pakstudies.length === 500 && curContent.bySubject.pedagogy.length === 500 && curContent.bySubject.science.length === 500 && curContent.bySubject.socialstudies.length === 500 && curContent.bySubject.gk.length === 500 && curContent.bySubject.it.length === 500 && curContent.bySubject.pe.length === 500 && curContent.bySubject.drawing.length === 500);
} else {
  info("pre-lazyload backup not found — content byte-compare skipped");
}

// ---------- Loading / failure UI markers ----------
const practiceSrc = fs.readFileSync(join(ROOT, "src/app/practice/page.tsx"), "utf8");
const topicsSrc = fs.readFileSync(join(ROOT, "src/app/topics/page.tsx"), "utf8");
const reviewSrc = fs.readFileSync(join(ROOT, "src/app/review/page.tsx"), "utf8");
const mockRunSrc = fs.readFileSync(join(ROOT, "src/app/mock/[id]/page.tsx"), "utf8");
for (const [name, src] of [["practice", practiceSrc], ["topics", topicsSrc], ["review", reviewSrc], ["mock runner", mockRunSrc]]) {
  check(
    `${name} page has loading + failure + retry states for bank loading`,
    src.includes('t("loading")') && src.includes("bankLoadFailed") && src.includes('t("retryButton")') && src.includes("retryNonce"),
  );
}
check("practice page never mounts QuizRunner with a null bank (bank === null branch renders loading instead)", practiceSrc.includes("bank === null") && practiceSrc.includes("<QuizRunner"));
check(
  "new i18n keys bankLoadFailed/bankLoadFailedOffline exist in all 3 languages",
  ["bankLoadFailed", "bankLoadFailedOffline"].every((k) => {
    const i18n = fs.readFileSync(join(ROOT, "src/lib/i18n.tsx"), "utf8");
    const start = i18n.indexOf(`  ${k}:`);
    const end = i18n.indexOf("\n  },", start);
    const block = i18n.slice(start, end);
    return block.includes("en:") && block.includes("roman:") && block.includes("ur:");
  }),
);

// ---------- (h) bug regressions: source level ----------
const homeSrc = fs.readFileSync(join(ROOT, "src/app/page.tsx"), "utf8");
check("home drill links use drillHref (bank key), not the display label", homeSrc.includes("drillHref(w.subject)") && !homeSrc.includes("?subject=${encodeURIComponent(w.subject)}"));
check("home drillHref falls back to /practice for unmapped/non-bank labels (never a guessed subject)", homeSrc.includes('(BANK_KEYS as readonly string[]).includes(key)') && homeSrc.includes('return "/practice"'));
check("home resumeAction still uses the stored bank key untouched", homeSrc.includes("parts[1]"));
const runnerCount = (topicsSrc.match(/<QuizRunner/g) || []).length;
const scopeCount = (topicsSrc.match(/sessionScope="topics:/g) || []).length;
check(
  "/topics: every QuizRunner carries a stable sessionScope",
  runnerCount === 2 && scopeCount === 2 && topicsSrc.includes('sessionScope="topics:pastpapers"') && topicsSrc.includes('sessionScope="topics:reworded"'),
  `${runnerCount} runners, ${scopeCount} stable scopes`,
);
const quizRunnerSrc = fs.readFileSync(join(ROOT, "src/components/QuizRunner.tsx"), "utf8");
check("QuizRunner scope honours sessionScope over the translated title", quizRunnerSrc.includes("sessionScope ??") || quizRunnerSrc.includes("sessionScope??"));

// ---------- tsc harness: compiled real data.ts + banks.ts ----------
const OUT = "/tmp/lazybanks-data";
execSync(
  `npx tsc src/lib/data.ts --outDir ${OUT} --module commonjs --target es2020 --resolveJsonModule --esModuleInterop --skipLibCheck --moduleResolution node`,
  { cwd: ROOT, stdio: "ignore" },
);
execSync(`ln -sfn ${join(ROOT, "node_modules")} ${join(OUT, "node_modules")}`, { stdio: "ignore" });
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const banks = require(join(OUT, "lib/banks.js"));

// ---------- (d) load order == file order ----------
let orderOk = true;
const orderBad = [];
for (const k of BANK_KEYS) {
  const loaded = await data.loadBank(k);
  const fileIds = BY_SUBJECT[k].map((q) => q.id);
  if (JSON.stringify(loaded.map((q) => q.id)) !== JSON.stringify(fileIds)) {
    orderOk = false;
    orderBad.push(k);
  }
}
check("loadBank order == bank file order for all 16 banks", orderOk, orderBad.join(", "));
const allLoaded = await data.loadAllQuestions();
check(
  "loadAllQuestions order == old static QUESTIONS order (bank order + file order)",
  JSON.stringify(allLoaded.map((q) => q.id)) === JSON.stringify(QUESTIONS.map((q) => q.id)),
);
check("loadAllQuestions total is 7040", allLoaded.length === 7040, `got ${allLoaded.length}`);
check("loadBank of an unknown key returns [] (never throws)", JSON.stringify(await data.loadBank("no_such_bank")) === "[]");
check(
  "BANK_COUNTS matches the bank files exactly",
  BANK_KEYS.every((k) => data.BANK_COUNTS[k] === BY_SUBJECT[k].length) && Object.keys(data.BANK_COUNTS).length === 16,
);
check(
  "every question's subjectKey names its bank (mockPool grouping input)",
  QUESTIONS.every((q, i) => q.subjectKey === BANK_KEYS.find((k) => BY_SUBJECT[k].includes(q))),
);
check(
  "ID_BANK maps every id to its bank",
  QUESTIONS.every((q) => banks.ID_BANK[q.id] === q.subjectKey) && Object.keys(banks.ID_BANK).length === 7040,
);

// ---------- (e) availability: manifest == old computation == built ----------
function oldAvailable(mock) {
  if (mock.fixed && data.ZAM_FIXED[mock.fixed]) return data.ZAM_FIXED[mock.fixed].length;
  let n = 0;
  for (const [k, count] of Object.entries(mock.comp ?? {})) {
    const size = k === "drawing_pe" ? BY_SUBJECT.drawing.length + BY_SUBJECT.pe.length : (BY_SUBJECT[k]?.length ?? 0);
    n += Math.min(count, size);
  }
  return n;
}
let availOk = true;
const availBad = [];
for (const m of data.MOCKS) {
  const built = await data.buildMockQuestions(m, "lazybanks-seed");
  const trustedBuilt = await data.buildMockQuestions(m, "lazybanks-seed", { trustedOnly: true });
  const labels = await data.mockLabels(m);
  if (data.mockAvailableCount(m) !== oldAvailable(m) || built.length !== data.mockAvailableCount(m) || labels.available !== built.length || labels.trusted !== trustedBuilt.length) {
    availOk = false;
    availBad.push(m.id);
  }
}
check("mockAvailableCount == old fs computation == built questions (all 28 mocks, incl. trusted)", availOk, availBad.join(", "));
check(
  "mockLabelsSync matches async labels on coverage/availability (trusted: 0 first-paint fallback)",
  data.MOCKS.every((m) => {
    const s = data.mockLabelsSync(m);
    return s.available === data.mockAvailableCount(m) && s.trusted === 0 && s.scoringUnknown === !m.scoring;
  }),
);

// ---------- (f) mockPool order == old per-bank concatenation ----------
function oldPool(mock) {
  const seen = new Set();
  const out = [];
  for (const k of Object.keys(mock.comp ?? {})) {
    const bank = k === "drawing_pe" ? [...BY_SUBJECT.drawing, ...BY_SUBJECT.pe] : (BY_SUBJECT[k] ?? []);
    for (const q of bank) if (!seen.has(q.id)) { seen.add(q.id); out.push(q); }
  }
  return out;
}
function newPool(mock, all) {
  // Mirrors the review page's mockPool: group the loaded questions by
  // subjectKey (load order = file order), then comp-key order + dedupe.
  // (No live comp uses the legacy drawing_pe key — data.ts:793.)
  const bySubject = new Map();
  for (const q of all) {
    const list = bySubject.get(q.subjectKey);
    if (list) list.push(q);
    else bySubject.set(q.subjectKey, [q]);
  }
  const seen = new Set();
  const out = [];
  for (const k of Object.keys(mock.comp ?? {})) {
    for (const q of bySubject.get(k) ?? []) if (!seen.has(q.id)) { seen.add(q.id); out.push(q); }
  }
  return out;
}
let poolOk = true;
const poolBad = [];
for (const m of data.MOCKS) {
  if (!m.comp) continue;
  if (JSON.stringify(oldPool(m).map((q) => q.id)) !== JSON.stringify(newPool(m, allLoaded).map((q) => q.id))) {
    poolOk = false;
    poolBad.push(m.id);
  }
}
check("review mockPool order == old per-bank concatenation (all dynamic mocks)", poolOk, poolBad.join(", "));

// ---------- (h) bug regressions: behavioral ----------
const validSubject = (param) => BANK_KEYS.includes(param);
let drillOk = true;
const drillBad = [];
// Drill inputs are the per-subject stats labels, which come from
// question.subject — iterate THOSE, not SUBJECT_LABELS (which also
// carries the notes-only "Drawing/PE" label mapping to the legacy
// drawing_pe key; no question carries it).
for (const label of [...new Set(QUESTIONS.map((q) => q.subject))]) {
  const mapped = data.subjectKeyForLabel(label);
  if (mapped === null || !validSubject(mapped)) {
    drillOk = false;
    drillBad.push(`${label} -> ${mapped}`);
  }
  // The OLD bug: the label itself failed the practice page's validity
  // predicate, so the stored subject was drilled instead.
  if (validSubject(label)) drillBad.push(`${label} unexpectedly valid as a param`);
}
check("subjectKeyForLabel maps every stats label to its valid bank key (drill opens the intended subject)", drillOk, drillBad.join("; "));
check("legacy Drawing/PE label is guarded: it maps to non-bank drawing_pe, so drillHref falls back to /practice", data.subjectKeyForLabel("Drawing/PE") === "drawing_pe" && !validSubject("drawing_pe") && !QUESTIONS.some((q) => q.subject === "Drawing/PE"));
check("old buggy param rejected: 'Islamiyat' is not a valid ?subject=", !validSubject("Islamiyat") && data.subjectKeyForLabel("Islamiyat") === "islamiyat");

// ---------- (i) every zamFixed id resolves via the manifest ----------
let zamOk = true;
const zamBad = [];
for (const [name, ids] of Object.entries(data.ZAM_FIXED)) {
  const resolved = await data.findQuestionsByIds(ids);
  if (resolved.length !== ids.length || resolved.some((q) => !q) || !ids.every((id) => banks.ID_BANK[id])) {
    zamOk = false;
    zamBad.push(name);
  }
}
check("every zamFixed id resolves via ID_BANK + findQuestionsByIds", zamOk, zamBad.join(", "));
check("findQuestionById returns undefined for unknown ids", (await data.findQuestionById("NOPE-999")) === undefined);
check("banks.ts BANK_KEYS order == canonical bank order", JSON.stringify(banks.BANK_KEYS) === JSON.stringify(BANK_KEYS));

// ---------- (b) build-output chunk split (requires `npm run build`) ----------
// Next 16 (Turbopack) writes one build-manifest.json per route under
// .next/server/app/<route>/page/ — there is no single app manifest.
// The first-load set is the union over all route manifests of
// rootMainFiles + polyfillFiles + bootstrap otherChunks.
const routeManifests = fs.existsSync(join(ROOT, ".next/server/app"))
  ? walk(join(ROOT, ".next/server/app")).filter((p) => p.endsWith("build-manifest.json"))
  : [];
check("production build output exists (.next) — run `npm run build` first", fs.existsSync(join(ROOT, ".next/build-manifest.json")) && routeManifests.length > 0, `${routeManifests.length} route manifests`);
if (routeManifests.length > 0) {
  const chunksDir = join(ROOT, ".next/static/chunks");
  const chunkFiles = walk(chunksDir).filter((p) => p.endsWith(".js"));
  // Probes: a 40-char ASCII run from a real question string per bank.
  // (Ids are NOT probes: the id->bank manifest legitimately lives in
  // the shared chunks. Question TEXT must not.)
  const probes = {};
  for (const k of BANK_KEYS) {
    let probe = null;
    for (const q of BY_SUBJECT[k]) {
      // ASCII letters/spaces/basic punctuation only: Turbopack inlines
      // bank JSON as single-quoted JS strings, escaping apostrophes
      // (Bloom\'s), so a probe containing ' would never match verbatim.
      const m = /[A-Za-z][A-Za-z ,.:;()\-]{39}/.exec(q.question);
      if (m) { probe = m[0]; break; }
    }
    if (!probe) throw new Error(`no ASCII probe found in bank ${k}`);
    probes[k] = probe;
  }
  const probeValues = Object.values(probes);
  check("one distinct question-text probe per bank", new Set(probeValues).size === 16);
  const chunkTexts = new Map(chunkFiles.map((p) => [p, fs.readFileSync(p, "utf8")]));
  const bankChunks = {};
  let splitOk = true;
  const splitBad = [];
  for (const [k, probe] of Object.entries(probes)) {
    const hits = chunkFiles.filter((p) => chunkTexts.get(p).includes(probe));
    if (hits.length !== 1) {
      splitOk = false;
      splitBad.push(`${k}: in ${hits.length} chunks`);
    } else {
      bankChunks[k] = hits[0];
    }
  }
  check("each bank's question text appears in exactly one chunk", splitOk, splitBad.join("; "));
  const distinctBankChunks = new Set(Object.values(bankChunks));
  check("the 16 bank chunks are distinct (one chunk per bank)", distinctBankChunks.size === 16, `got ${distinctBankChunks.size}`);
  // First-load sets from the per-route build manifests.
  const firstLoad = new Set();
  const toAbs = (f) => join(ROOT, ".next", f);
  for (const mp of routeManifests) {
    const m = JSON.parse(fs.readFileSync(mp, "utf8"));
    for (const f of m.rootMainFiles ?? []) firstLoad.add(toAbs(f));
    for (const f of m.polyfillFiles ?? []) firstLoad.add(toAbs(f));
    for (const files of Object.values(m.pages ?? {})) for (const f of files) firstLoad.add(toAbs(f));
    for (const params of Object.values(m.pagesChunkGroupBootstrapParams ?? {})) {
      for (const f of params.otherChunks ?? []) firstLoad.add(toAbs(f));
    }
  }
  const leaked = [...distinctBankChunks].filter((c) => firstLoad.has(c));
  check("zero question data in initial chunks: no bank chunk is in any route's first-load set", leaked.length === 0, leaked.map((p) => relative(ROOT, p)).join(", "));
  // Size table (for the report). Home first-load = the / route's own
  // manifest: rootMainFiles + bootstrap otherChunks + polyfill.
  const homeManifest = JSON.parse(fs.readFileSync(join(ROOT, ".next/server/app/page/build-manifest.json"), "utf8"));
  const homeFiles = [...new Set([
    ...(homeManifest.rootMainFiles ?? []),
    ...(homeManifest.polyfillFiles ?? []),
    ...((homeManifest.pagesChunkGroupBootstrapParams ?? {})["/page"]?.otherChunks ?? []),
  ])].map(toAbs);
  const sumSizes = (files) => files.reduce((s, p) => s + (fs.existsSync(p) ? fs.statSync(p).size : 0), 0);
  const sumGzip = (files) => files.reduce((s, p) => s + (fs.existsSync(p) ? zlib.gzipSync(fs.readFileSync(p)).length : 0), 0);
  info(`first-load / : ${sumSizes(homeFiles)} bytes raw / ${sumGzip(homeFiles)} bytes gzip over ${homeFiles.length} files`);
  for (const k of BANK_KEYS) {
    const p = bankChunks[k];
    if (!p) continue;
    const raw = fs.statSync(p).size;
    info(`bank chunk ${k}: ${raw} bytes raw / ${zlib.gzipSync(fs.readFileSync(p)).length} bytes gzip (${relative(ROOT, p)})`);
  }
}

if (failures > 0) {
  console.log(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll lazy-bank checks passed.");
