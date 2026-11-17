// Phase 2 mocks tests — all 28 mock definitions carry flat
// _ur/_roman translations of title + note; selection behaviour is
// UNTOUCHED (variant codes, comps, fixed ID lists, minutes, totals,
// seeds). Visibility is unchanged (24 visible / 4 hidden). Plain
// node, no dependencies. Run: node scripts/test-phase2-mocks.mjs
// (exit 0 = all pass). Locks:
//  - 28 mocks, title_ur/title_roman/note_ur/note_roman present +
//    non-empty on every def (visible AND hidden — one structure);
//  - digit preservation: the multiset of digit-groups in each
//    translated title/note equals the English one (counts, minutes,
//    pattern numbers can never drift in translation);
//  - selection shape intact: every dynamic mock's comp sums to its
//    total; every fixed mock references an existing zamFixed list;
//    the 3 fixed lists stay disjoint (re-asserted here, owned by
//    test-step3a); visible set is exactly the 24 known ids;
//  - resolveMockView item-level fallback + never-mutates;
//  - page wiring: list/detail/track pages render the resolved view
//    with the badge only when translated; variant stays verbatim;
//  - script/honorific audits.
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
const ARABIC = /[\u0600-\u06FF]/;
const digitGroups = (s) => (s.match(/\d+(?:\.\d+)?/g) || []).sort().join(",");

// ---- §1 completeness ----
check("mocks: 28 defs", mocks.length === 28, `got ${mocks.length}`);
check(
  "mocks: title/note translations present + non-empty on every def",
  mocks.every(
    (m) =>
      ["title_ur", "title_roman", "note_ur", "note_roman"].every(
        (k) => typeof m[k] === "string" && m[k].trim().length > 0,
      ),
  ),
  mocks
    .filter((m) => !["title_ur", "title_roman", "note_ur", "note_roman"].every((k) => typeof m[k] === "string" && m[k].trim().length > 0))
    .map((m) => m.id)
    .join(","),
);
check(
  "mocks: digit-groups preserved in translated titles",
  mocks.every((m) => digitGroups(m.title_ur) === digitGroups(m.title) && digitGroups(m.title_roman) === digitGroups(m.title)),
  mocks
    .filter((m) => !(digitGroups(m.title_ur) === digitGroups(m.title) && digitGroups(m.title_roman) === digitGroups(m.title)))
    .map((m) => m.id)
    .join(","),
);
check(
  "mocks: digit-groups preserved in translated notes",
  mocks.every((m) => digitGroups(m.note_ur) === digitGroups(m.note) && digitGroups(m.note_roman) === digitGroups(m.note)),
  mocks
    .filter((m) => !(digitGroups(m.note_ur) === digitGroups(m.note) && digitGroups(m.note_roman) === digitGroups(m.note)))
    .map((m) => `${m.id}: en[${digitGroups(m.note)}] ur[${digitGroups(m.note_ur)}] ro[${digitGroups(m.note_roman)}]`)
    .join("; "),
);

// ---- §2 selection shape intact ----
check(
  "mocks: every dynamic mock comp sums to its total",
  mocks
    .filter((m) => !m.fixed)
    .every((m) => m.comp && Object.values(m.comp).reduce((a, b) => a + b, 0) === m.total),
  mocks
    .filter((m) => !m.fixed && !(m.comp && Object.values(m.comp).reduce((a, b) => a + b, 0) === m.total))
    .map((m) => m.id)
    .join(","),
);
check(
  "mocks: every fixed mock references an existing 100-ID zamFixed list",
  mocks
    .filter((m) => m.fixed)
    .every((m) => Array.isArray(content.zamFixed[m.fixed]) && content.zamFixed[m.fixed].length === 100),
);
const fixedLists = mocks.filter((m) => m.fixed).map((m) => content.zamFixed[m.fixed]);
const allFixedIds = fixedLists.flat();
check(
  "mocks: the 3 fixed lists stay disjoint (300 unique ids)",
  new Set(allFixedIds).size === 300,
  `got ${new Set(allFixedIds).size}`,
);
const EXPECTED_VARIANTS = {
  zam1: "proxy", zam2: "proxy", zam3: "proxy",
  "tt-B": "B", "tt-MD": "MD", "at-B": "B", "at-MD": "MD", "pst-B": "B",
  "pst-A": "A", "ct-B": "B",
  "ctit-B": "B", "ctit-A": "A", "dm-B": "B", "dm-2": "B", "pet-B": "B", "pet-2": "B",
  "qari-B": "B", "qari-MD": "MD",
  swse: "435", "swse-2": "435", "sst-kppsc": "KPPSC-5th", "sst-kppsc-2": "KPPSC-5th",
  "sst-etea": "ETEA-2020", "sst-etea-2": "ETEA-2020",
  jc: "RTPS-2026", co: "DC-Kohat-2026", pc: "PC-2020-21", forest: "DFO-2026",
};
check(
  "mocks: variant codes pinned per id (codes never translated)",
  mocks.every((m) => m.variant === EXPECTED_VARIANTS[m.id]),
  mocks
    .filter((m) => m.variant !== EXPECTED_VARIANTS[m.id])
    .map((m) => `${m.id}:${m.variant}`)
    .join(","),
);

// ---- §3 real data.ts (compiled — same harness as test-step2b) ----
const OUT = "/tmp/phase2-mock-data";
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
  "mocks: visible set is exactly the 24 known ids",
  JSON.stringify(data.VISIBLE_MOCKS.map((m) => m.id).sort()) === JSON.stringify([...VISIBLE_IDS].sort()),
  data.VISIBLE_MOCKS.map((m) => m.id).join(","),
);

// ---- §4 resolver ----
const sample = mocks.find((m) => m.id === "tt-B");
check(
  "resolveMockView en: English fields, translated=false",
  (() => {
    const v = data.resolveMockView(sample, "en");
    return !v.translated && v.title === sample.title && v.note === sample.note;
  })(),
);
check(
  "resolveMockView ur/roman: translated fields, translated=true (all 28)",
  mocks.every((m) => {
    const u = data.resolveMockView(m, "ur");
    const r = data.resolveMockView(m, "roman");
    return (
      u.translated && u.title === m.title_ur && u.note === m.note_ur &&
      r.translated && r.title === m.title_roman && r.note === m.note_roman
    );
  }),
);
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
  !data.resolveMockView({ ...sample, title_roman: "" }, "roman").translated,
);
const before = JSON.stringify(sample);
data.resolveMockView(sample, "ur");
check("resolveMockView never mutates the def", JSON.stringify(sample) === before);

// ---- §5 page wiring (source patterns) ----
const listPage = fs.readFileSync(join(ROOT, "src/app/mock/page.tsx"), "utf8");
const runPage = fs.readFileSync(join(ROOT, "src/app/mock/[id]/page.tsx"), "utf8");
const trackPage = fs.readFileSync(join(ROOT, "src/app/tracks/[id]/page.tsx"), "utf8");
for (const [name, src] of [["mock list", listPage], ["mock runner", runPage], ["track detail", trackPage]]) {
  check(`${name}: renders the resolved mock view`, src.includes("resolveMockView("));
}
check(
  "mock list: badge only when translated",
  listPage.includes("view.translated") && listPage.includes("[Auto-Translated]"),
);
check(
  "track detail: badge only when translated",
  trackPage.includes("view.translated") && trackPage.includes("[Auto-Translated]"),
);
check(
  "mock runner: variant stays verbatim as patternLabel",
  runPage.includes("patternLabel={mock.variant}"),
);
check(
  "mock list: no remaining verbatim m.title/m.note renders",
  !listPage.includes("{m.title}") && !listPage.includes("{m.note}"),
);
check(
  "track detail: no remaining verbatim m.title/m.note renders",
  !trackPage.includes("{m.title}") && !trackPage.includes("{m.note}"),
);

// ---- §6 script / honorific audits ----
check(
  "mocks: no [Auto-Translated] marker inside data fields",
  mocks.every((m) => ["title_ur", "title_roman", "note_ur", "note_roman"].every((k) => !m[k].includes("[Auto-Translated]"))),
);
check(
  "mocks: zero Latin honorific abbreviations in _roman fields",
  mocks.every((m) => !/\(SAW\)|\(RA\)|\(AS\)|\(PBUH\)/.test(m.title_roman + " " + m.note_roman)),
);
check(
  "mocks: no Arabic script in _roman fields",
  mocks.every((m) => !ARABIC.test(m.title_roman) && !ARABIC.test(m.note_roman)),
);
check(
  "mocks: every _ur title/note carries Urdu script",
  mocks.every((m) => ARABIC.test(m.title_ur) && ARABIC.test(m.note_ur)),
  mocks
    .filter((m) => !(ARABIC.test(m.title_ur) && ARABIC.test(m.note_ur)))
    .map((m) => m.id)
    .join(","),
);

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll Phase 2 mock checks passed.");
