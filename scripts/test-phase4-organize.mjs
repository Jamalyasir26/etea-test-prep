// Phase 4 organize regression tests — the /mock LIST translation
// investigation. The Phase 3 live check reported that in Urdu mode the
// /mock LIST titles/notes stayed English (no badge) while question
// content inside a mock WAS translated; the Phase 2 live check HAD
// seen translated list titles. This suite pins the code path so the
// question "is the resolver/rendering broken?" stays answered by a
// test, not by re-arguing it: with the CURRENT bundle, every visible
// mock resolves to a translated title+note in ur and roman, and to
// untranslated English in en. (Verdict, with the full evidence chain:
// ~/workspace/phase4/organize/ORGANIZE-REPORT.md §B — stale
// service-worker cache, no code bug; this suite pins the code side.)
// Plain node, no dependencies. Run: node scripts/test-phase4-organize.mjs
// (exit 0 = all pass). Locks:
//  - all 30 mock defs carry non-empty title_ur/title_roman/note_ur/
//    note_roman (the completeness premise the resolver relies on);
//  - VISIBLE_MOCKS is exactly the 26 known ids;
//  - resolveMockView returns translated=true with non-empty Urdu/Roman
//    title+note (equal to the stored _ur/_roman fields) for ALL 26
//    visible mocks in BOTH ur and roman;
//  - the English view returns translated=false with the English
//    title/note for ALL 26 visible mocks;
//  - the resolver never mutates a def, and a def with a missing/blank
//    field falls back to the WHOLE English metadata (never a mix);
//  - list-page wiring: titles render from resolveMockView(m, lang) at
//    render time (no snapshot), the badge shows only when translated,
//    and no verbatim m.title/m.note render remains; the runner page
//    uses the same resolver for its header;
//  - CACHE_VERSION is etea-prep-v3: the Phase 4 bump that evicts the
//    stale v2 caches behind the observed split (see §6).
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

// ---- §1 data completeness (the resolver's premise) ----
check("mocks: 30 defs", mocks.length === 30, `got ${mocks.length}`);
const TRANSLATION_KEYS = ["title_ur", "title_roman", "note_ur", "note_roman"];
check(
  "mocks: title/note translations present + non-empty on every def",
  mocks.every((m) =>
    TRANSLATION_KEYS.every((k) => typeof m[k] === "string" && m[k].trim().length > 0),
  ),
  mocks
    .filter(
      (m) =>
        !TRANSLATION_KEYS.every((k) => typeof m[k] === "string" && m[k].trim().length > 0),
    )
    .map((m) => m.id)
    .join(","),
);

// ---- §2 real data.ts (compiled — same harness as test-phase2-mocks) ----
const OUT = "/tmp/phase4-organize-data";
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
  "zam1", "zam2", "zam3", "zam4", "zam5", "tt-B", "tt-MD", "at-B", "at-MD", "pst-B", "pst-A", "ct-B",
  "ctit-B", "ctit-A", "dm-B", "dm-2", "pet-B", "pet-2", "qari-B", "qari-MD",
  "swse", "swse-2", "sst-kppsc", "sst-kppsc-2", "sst-etea", "sst-etea-2",
];
check(
  "mocks: visible set is exactly the 26 known ids",
  JSON.stringify(data.VISIBLE_MOCKS.map((m) => m.id).sort()) === JSON.stringify([...VISIBLE_IDS].sort()),
  data.VISIBLE_MOCKS.map((m) => m.id).join(","),
);
const visible = data.VISIBLE_MOCKS;
const byId = Object.fromEntries(mocks.map((m) => [m.id, m]));

// ---- §3 the core pin: translated in ur + roman, plain in en ----
check(
  "resolveMockView ur: translated=true, non-empty Urdu title+note, equal to stored fields (all 26 visible)",
  visible.every((m) => {
    const v = data.resolveMockView(m, "ur");
    const stored = byId[m.id];
    return (
      v.translated === true &&
      typeof v.title === "string" && v.title.trim().length > 0 && v.title === stored.title_ur &&
      typeof v.note === "string" && v.note.trim().length > 0 && v.note === stored.note_ur
    );
  }),
  visible
    .filter((m) => {
      const v = data.resolveMockView(m, "ur");
      const stored = byId[m.id];
      return !(v.translated === true && v.title === stored.title_ur && v.note === stored.note_ur);
    })
    .map((m) => m.id)
    .join(","),
);
check(
  "resolveMockView roman: translated=true, non-empty Roman title+note, equal to stored fields (all 26 visible)",
  visible.every((m) => {
    const v = data.resolveMockView(m, "roman");
    const stored = byId[m.id];
    return (
      v.translated === true &&
      typeof v.title === "string" && v.title.trim().length > 0 && v.title === stored.title_roman &&
      typeof v.note === "string" && v.note.trim().length > 0 && v.note === stored.note_roman
    );
  }),
  visible
    .filter((m) => {
      const v = data.resolveMockView(m, "roman");
      const stored = byId[m.id];
      return !(v.translated === true && v.title === stored.title_roman && v.note === stored.note_roman);
    })
    .map((m) => m.id)
    .join(","),
);
check(
  "resolveMockView en: translated=false, English title+note (all 26 visible)",
  visible.every((m) => {
    const v = data.resolveMockView(m, "en");
    return v.translated === false && v.title === m.title && v.note === m.note;
  }),
  visible
    .filter((m) => {
      const v = data.resolveMockView(m, "en");
      return !(v.translated === false && v.title === m.title && v.note === m.note);
    })
    .map((m) => m.id)
    .join(","),
);

// ---- §4 purity + fallback ----
const snapshots = new Map(visible.map((m) => [m.id, JSON.stringify(m)]));
for (const m of visible) {
  data.resolveMockView(m, "ur");
  data.resolveMockView(m, "roman");
  data.resolveMockView(m, "en");
}
check(
  "resolveMockView never mutates any visible def",
  visible.every((m) => JSON.stringify(m) === snapshots.get(m.id)),
  visible
    .filter((m) => JSON.stringify(m) !== snapshots.get(m.id))
    .map((m) => m.id)
    .join(","),
);
const sample = byId["tt-B"];
check(
  "resolveMockView fallback: one missing field -> whole English metadata",
  (() => {
    const partial = { ...sample };
    delete partial.note_ur;
    const v = data.resolveMockView(partial, "ur");
    return !v.translated && v.title === sample.title && v.note === sample.note;
  })(),
);
check(
  "resolveMockView fallback: blank field -> whole English metadata",
  !data.resolveMockView({ ...sample, title_roman: "   " }, "roman").translated,
);

// ---- §5 list-page wiring (source patterns) ----
const listPage = fs.readFileSync(join(ROOT, "src/app/mock/page.tsx"), "utf8");
const runPage = fs.readFileSync(join(ROOT, "src/app/mock/[id]/page.tsx"), "utf8");
check(
  "mock list: titles resolve at render time from the live lang",
  listPage.includes("const view = resolveMockView(m, lang);"),
);
check(
  "mock list: badge only when translated",
  listPage.includes("view.translated") && listPage.includes("[Auto-Translated]"),
);
check(
  "mock list: renders the resolved view title/note, not the raw def",
  listPage.includes("{view.title}") && listPage.includes("{view.note}"),
);
check(
  "mock list: no remaining verbatim m.title/m.note renders",
  !listPage.includes("{m.title}") && !listPage.includes("{m.note}"),
);
check(
  "mock list: no memo/snapshot of the resolved view",
  !listPage.includes("useMemo(") && !listPage.includes("useRef("),
);
check(
  "mock runner: header uses the same resolver (same lang, same def)",
  runPage.includes("resolveMockView(mock, lang)"),
);

// ---- §6 service-worker cache version (the stale-cache remediation) ----
// The /mock list observation was a stale v2 cache: sw.js bytes never
// changed in Phase 2/3 and CACHE_VERSION stayed v2, so old caches
// survived activation. Phase 4 bumps the version to v3: the byte
// change makes browsers install the new worker (update banner), and
// activation evicts the v2 cache. Pinned exactly so a future deploy
// must consciously bump again instead of silently reusing v3.
const sw = fs.readFileSync(join(ROOT, "public/sw.js"), "utf8");
check(
  "SW CACHE_VERSION is etea-prep-v3 (Phase 4 bump evicts stale v2 caches)",
  sw.includes('const CACHE_VERSION = "etea-prep-v3";'),
);

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll Phase 4 organize checks passed.");
