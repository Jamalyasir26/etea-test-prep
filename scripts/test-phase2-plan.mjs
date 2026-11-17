// Phase 2 plan tests — all 21 day labels + 63 task texts carry flat
// _ur/_roman translations as EXTRA tuple elements; the completion-id
// rule is PINNED: planTaskId() hashes the ENGLISH day label + minutes
// + English text only, so every stored completion survives
// translation byte-for-byte. The pre-translation id list is the
// committed fixture scripts/fixtures/phase2-id-snapshot.json. Any
// English rewording, reorder, or id-input change fails here. The
// link matcher and the subject-day lookup keep matching ENGLISH text
// in every display language. Plain node, no dependencies. Run:
// node scripts/test-phase2-plan.mjs (exit 0 = all pass). Locks:
//  - 21 days / 63 tasks; every day [label, tasks, label_ur,
//    label_roman] and every task [mins, text, text_ur, text_roman],
//    all translation fields present + non-empty;
//  - planTaskId over the CURRENT English fields equals the fixture
//    ids in order; allPlanTaskIds() + countPlanDone() agree;
//  - positional -> stable migration still maps onto the fixture ids;
//  - planTaskLink resolves all 63 tasks from English text (same
//    guarantee as before) and planDayForSubject matches an
//    independent English-text scan;
//  - resolvePlanDayLabel / resolvePlanTaskText fallback behaviour;
//  - page wiring: ids + links derive from English fields, display
//    text resolves (source-pattern checks);
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
const plan21 = content.plan21;
const snapshot = readJson("scripts/fixtures/phase2-id-snapshot.json");
const ARABIC = /[\u0600-\u06FF]/;

// ---- §1 shape + completeness ----
check("plan: 21 days", plan21.length === 21, `got ${plan21.length}`);
const taskCount = plan21.reduce((n, d) => n + d[1].length, 0);
check("plan: 63 tasks", taskCount === 63, `got ${taskCount}`);
check(
  "plan: every day carries label_ur + label_roman (tuple indices 2/3)",
  plan21.every(
    (d) => typeof d[2] === "string" && d[2].trim().length > 0 && typeof d[3] === "string" && d[3].trim().length > 0,
  ),
);
check(
  "plan: every task carries text_ur + text_roman (tuple indices 2/3)",
  plan21.every((d) => d[1].every((t) => typeof t[2] === "string" && t[2].trim().length > 0 && typeof t[3] === "string" && t[3].trim().length > 0)),
);
check(
  "plan: day labels keep the 'Day N' numbering in English (id input)",
  plan21.every((d, i) => d[0].startsWith(`Day ${i + 1} `)),
);
check(
  "plan: translated day labels keep the numbering (دن N / Din N)",
  plan21.every((d, i) => d[2].startsWith(`دن ${i + 1} `) && d[3].startsWith(`Din ${i + 1} `)),
  plan21
    .map((d, i) => ({ d, i }))
    .filter(({ d, i }) => !(d[2].startsWith(`دن ${i + 1} `) && d[3].startsWith(`Din ${i + 1} `)))
    .slice(0, 3)
    .map(({ d }) => `${d[2]} / ${d[3]}`)
    .join("; "),
);

// ---- §2 real plan.ts (compiled — same harness as test-step2b) ----
const OUT = "/tmp/phase2-plan-data";
execSync("rm -rf " + OUT, { stdio: "ignore" });
let tscDiag = "";
try {
  execSync(
    `npx tsc src/lib/data.ts src/lib/plan.ts --outDir ${OUT} --module commonjs --target es2020 --resolveJsonModule --esModuleInterop --skipLibCheck --moduleResolution node`,
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
for (const f of ["lib/data.js", "lib/plan.js"]) {
  check(`tsc harness: emitted ${f}`, fs.existsSync(join(OUT, f)));
}
const trackingJs = join(OUT, "lib/tracking.js");
if (fs.existsSync(trackingJs)) {
  fs.writeFileSync(trackingJs, fs.readFileSync(trackingJs, "utf8").replace('require("./fsrs.ts")', 'require("./fsrs")'));
}
execSync(`ln -sfn ${join(ROOT, "node_modules")} ${join(OUT, "node_modules")}`, { stdio: "ignore" });
const require = createRequire(import.meta.url);
const plan = require(join(OUT, "lib/plan.js"));

// ---- §3 id stability (the completion-survival guarantee) ----
const liveIds = [];
for (const [day, tasks] of plan21) {
  for (const [mins, text] of tasks) liveIds.push(plan.planTaskId(day, mins, text));
}
check("plan: 63 unique ids", new Set(liveIds).size === 63);
check(
  "plan: ids match the pre-translation fixture in order (stored completions survive)",
  JSON.stringify(liveIds) === JSON.stringify(snapshot.planTaskIds),
  liveIds
    .map((id, i) => (id === snapshot.planTaskIds[i] ? null : `#${i}: ${id} != ${snapshot.planTaskIds[i]}`))
    .filter(Boolean)
    .slice(0, 3)
    .join("; "),
);
check("plan: allPlanTaskIds() equals the fixture", JSON.stringify(plan.allPlanTaskIds()) === JSON.stringify(snapshot.planTaskIds));
const fixtureState = Object.fromEntries(snapshot.planTaskIds.map((id, i) => [id, i % 2 === 0]));
check(
  "plan: countPlanDone counts fixture-keyed completions",
  plan.countPlanDone(fixtureState) === 32,
  `got ${plan.countPlanDone(fixtureState)}`,
);
// Positional migration still lands on the fixture ids.
const migrated = plan.migratePlanState({ "d0-t0": true, "d20-t2": true, "d99-t9": true });
check(
  "plan: positional keys migrate onto fixture stable ids; unknown positions preserved",
  migrated.migrated === true &&
    migrated.state[snapshot.planTaskIds[0]] === true &&
    migrated.state[snapshot.planTaskIds[62]] === true &&
    migrated.state["d99-t9"] === true,
);

// ---- §4 link matcher + subject-day lookup (English text, every language) ----
check(
  "plan: planTaskLink resolves all 63 tasks from English text",
  plan21.every((d) => d[1].every((t) => plan.planTaskLink(t[1]) !== null)),
  plan21
    .flatMap((d) => d[1])
    .filter((t) => plan.planTaskLink(t[1]) === null)
    .slice(0, 3)
    .map((t) => t[1])
    .join("; "),
);
check(
  "plan: link kinds stay within the known set",
  plan21.every((d) =>
    d[1].every((t) => ["library", "practice", "flashcards", "mock", "analysis"].includes(plan.planTaskLink(t[1]).kind)),
  ),
);
// Independent reimplementation of planDayForSubject over English text.
function expectedDayFor(subjectName) {
  const needle = subjectName.toLowerCase();
  for (let di = 0; di < plan21.length; di++) {
    for (const [, text] of plan21[di][1]) {
      if (text.toLowerCase().includes(needle)) return di + 1;
    }
  }
  return null;
}
for (const subject of ["Islamiyat", "Pedagogy", "Tajweed", "Maths", "English", "NoSuchSubject"]) {
  check(
    `plan: planDayForSubject(${subject}) matches the English-text scan`,
    plan.planDayForSubject(subject) === expectedDayFor(subject),
    `got ${plan.planDayForSubject(subject)}, expected ${expectedDayFor(subject)}`,
  );
}

// ---- §5 resolvers ----
const day0 = plan21[0];
check(
  "resolvePlanDayLabel en: English, translated=false",
  (() => {
    const v = plan.resolvePlanDayLabel(day0, "en");
    return !v.translated && v.label === day0[0];
  })(),
);
check(
  "resolvePlanDayLabel ur/roman: translated labels, translated=true (all 21)",
  plan21.every((d) => {
    const u = plan.resolvePlanDayLabel(d, "ur");
    const r = plan.resolvePlanDayLabel(d, "roman");
    return u.translated && u.label === d[2] && r.translated && r.label === d[3];
  }),
);
check(
  "resolvePlanDayLabel fallback: missing translation -> English",
  plan.resolvePlanDayLabel([day0[0], day0[1]], "ur").label === day0[0] &&
    !plan.resolvePlanDayLabel([day0[0], day0[1]], "ur").translated,
);
const task0 = day0[1][0];
check(
  "resolvePlanTaskText en/ur/roman on all 63 tasks",
  plan21.every((d) =>
    d[1].every((t) => {
      const e = plan.resolvePlanTaskText(t, "en");
      const u = plan.resolvePlanTaskText(t, "ur");
      const r = plan.resolvePlanTaskText(t, "roman");
      return !e.translated && e.text === t[1] && u.translated && u.text === t[2] && r.translated && r.text === t[3];
    }),
  ),
);
check(
  "resolvePlanTaskText fallback: 2-element tuple -> English",
  plan.resolvePlanTaskText([task0[0], task0[1]], "roman").text === task0[1] &&
    !plan.resolvePlanTaskText([task0[0], task0[1]], "roman").translated,
);

// ---- §6 page wiring (source patterns) ----
const page = fs.readFileSync(join(ROOT, "src/app/plan/page.tsx"), "utf8");
check(
  "plan page: ids + links derive from English fields",
  page.includes("planTaskId(day, mins, text)") && page.includes("planTaskLink(text)"),
);
check(
  "plan page: display text resolves, badge only when translated",
  page.includes("resolvePlanTaskText(task, lang)") &&
    page.includes("resolvePlanDayLabel(dayEntry, lang)") &&
    page.includes("dayView.translated") &&
    page.includes("[Auto-Translated]"),
);

// ---- §7 script / honorific audits ----
const allUr = plan21.flatMap((d) => [d[2], ...d[1].map((t) => t[2])]);
const allRoman = plan21.flatMap((d) => [d[3], ...d[1].map((t) => t[3])]);
check(
  "plan: no [Auto-Translated] marker inside data fields",
  [...allUr, ...allRoman].every((s) => !s.includes("[Auto-Translated]")),
);
check(
  "plan: zero Latin honorific abbreviations in _roman fields",
  allRoman.every((s) => !/\(SAW\)|\(RA\)|\(AS\)|\(PBUH\)/.test(s)),
);
check(
  "plan: no Arabic script in _roman fields",
  allRoman.every((s) => !ARABIC.test(s)),
);
check(
  "plan: every _ur label/text carries Urdu script",
  allUr.every((s) => ARABIC.test(s)),
  allUr.filter((s) => !ARABIC.test(s)).slice(0, 3).join("; "),
);

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll Phase 2 plan checks passed.");
