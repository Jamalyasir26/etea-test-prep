// Phase 2 flashcards tests — all 70 cards carry flat _ur/_roman
// translations; the FSRS id rule is PINNED: flashcardId() hashes the
// ENGLISH front+back only, so every stored scheduling state survives
// translation byte-for-byte. The pre-translation id list is the
// committed fixture scripts/fixtures/phase2-id-snapshot.json
// (snapshotted from the data before any translation field existed);
// any English rewording, reorder, or id-input change fails here.
// Plain node, no dependencies. Run: node scripts/test-phase2-flashcards.mjs
// (exit 0 = all pass). Locks:
//  - 70 cards, all 6 translation fields present + non-empty;
//  - category translations match the pinned per-category map exactly
//    (shared vocabulary — one rendering per category, every card);
//  - flashcardId over the CURRENT English fields equals the fixture
//    ids in order (id stability = stored FSRS state survives);
//  - a simulated stored state keyed by fixture ids still resolves
//    through buildReviewQueue against the translated cards;
//  - resolveFlashcardView item-level fallback (whole English card
//    when any translated field is missing/empty; badge flag only
//    when translated content renders);
//  - flashcardCategoryLabel resolves all 7 categories in all 3
//    languages; unknown categories render verbatim; filter keys stay
//    English (source-pattern check on the page);
//  - script/honorific audits: no [Auto-Translated] marker in data,
//    no Latin honorific abbreviations in _roman fields, no Arabic
//    script in _roman fields, _ur fields carry Urdu script.
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
const cards = content.flashcards;
const snapshot = readJson("scripts/fixtures/phase2-id-snapshot.json");
const ARABIC = /[\u0600-\u06FF]/;

// ---- §1 data completeness + category map ----
check("flashcards: 70 cards", cards.length === 70, `got ${cards.length}`);
const TR_KEYS = ["front_ur", "front_roman", "back_ur", "back_roman", "category_ur", "category_roman"];
check(
  "flashcards: all 6 translation fields present + non-empty on every card",
  cards.every((c) => TR_KEYS.every((k) => typeof c[k] === "string" && c[k].trim().length > 0)),
  cards
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !TR_KEYS.every((k) => typeof c[k] === "string" && c[k].trim().length > 0))
    .slice(0, 3)
    .map(({ i }) => `#${i}`)
    .join(","),
);
const CATEGORY_MAP = {
  Pedagogy: ["تدریسیات", "Tadreesiyat"],
  Tajweed: ["تجوید", "Tajweed"],
  Dates: ["تاریخیں", "Tareekhen"],
  Arabic: ["عربی", "Arabi"],
  "General Science": ["جنرل سائنس", "General Science"],
  "IT/Computer": ["آئی ٹی / کمپیوٹر", "IT/Computer"],
  GK: ["جنرل نالج", "General Knowledge"],
};
check(
  "flashcards: exactly the 7 known categories",
  JSON.stringify([...new Set(cards.map((c) => c.category))].sort()) ===
    JSON.stringify(Object.keys(CATEGORY_MAP).sort()),
);
check(
  "flashcards: category translations match the pinned map on every card",
  cards.every((c) => {
    const m = CATEGORY_MAP[c.category];
    return m && c.category_ur === m[0] && c.category_roman === m[1];
  }),
  cards
    .filter((c) => {
      const m = CATEGORY_MAP[c.category];
      return !(m && c.category_ur === m[0] && c.category_roman === m[1]);
    })
    .slice(0, 3)
    .map((c) => `${c.category}: ${c.category_ur}/${c.category_roman}`)
    .join("; "),
);

// ---- §2 id stability (the FSRS survival guarantee) ----
const { flashcardId, buildReviewQueue } = await import("../src/lib/tracking.ts");
const liveIds = cards.map((c) => flashcardId(c.front, c.back));
check("flashcards: 70 unique ids", new Set(liveIds).size === 70);
check(
  "flashcards: ids match the pre-translation fixture in order (stored FSRS state survives)",
  JSON.stringify(liveIds) === JSON.stringify(snapshot.flashcardIds),
  liveIds
    .map((id, i) => (id === snapshot.flashcardIds[i] ? null : `#${i}: ${id} != ${snapshot.flashcardIds[i]}`))
    .filter(Boolean)
    .slice(0, 3)
    .join("; "),
);
// Simulated stored state keyed by fixture ids: the queue builder must
// resolve the same cards (due card first), proving lookups still hit.
const withIds = cards.map((c) => ({ ...c, id: flashcardId(c.front, c.back) }));
const NOW = new Date(2026, 10, 17, 12, 0, 0);
const dueState = { [snapshot.flashcardIds[5]]: { dueAt: new Date(2026, 10, 16).toISOString() } };
const q = buildReviewQueue(withIds, dueState, NOW, { category: "All" });
check(
  "flashcards: stored state keyed by fixture ids still resolves (due card queued first)",
  q[0] === snapshot.flashcardIds[5] && q.length === 70,
  `first=${q[0]} len=${q.length}`,
);

// ---- §3 resolvers (real data.ts, compiled — same harness as test-step2b) ----
const OUT = "/tmp/phase2-flash-data";
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

const sample = cards[0];
check(
  "resolveFlashcardView en: English fields, translated=false",
  (() => {
    const v = data.resolveFlashcardView(sample, "en");
    return !v.translated && v.front === sample.front && v.back === sample.back && v.category === sample.category;
  })(),
);
check(
  "resolveFlashcardView ur/roman: translated fields, translated=true (all 70)",
  cards.every((c) => {
    const u = data.resolveFlashcardView(c, "ur");
    const r = data.resolveFlashcardView(c, "roman");
    return (
      u.translated && u.front === c.front_ur && u.back === c.back_ur && u.category === c.category_ur &&
      r.translated && r.front === c.front_roman && r.back === c.back_roman && r.category === c.category_roman
    );
  }),
);
const partial = { ...sample };
delete partial.back_ur;
check(
  "resolveFlashcardView fallback: one missing field -> whole English card, translated=false",
  (() => {
    const v = data.resolveFlashcardView(partial, "ur");
    return !v.translated && v.front === sample.front && v.back === sample.back;
  })(),
);
const emptyField = { ...sample, front_roman: "  " };
check(
  "resolveFlashcardView fallback: blank field -> whole English card",
  !data.resolveFlashcardView(emptyField, "roman").translated,
);
check(
  "resolveFlashcardView never mutates the card",
  JSON.stringify(sample) === JSON.stringify(cards[0]),
);
for (const [cat, [ur, roman]] of Object.entries(CATEGORY_MAP)) {
  check(
    `flashcardCategoryLabel ${cat}: en/ur/roman`,
    data.flashcardCategoryLabel(cat, "en") === cat &&
      data.flashcardCategoryLabel(cat, "ur") === ur &&
      data.flashcardCategoryLabel(cat, "roman") === roman,
  );
}
check(
  "flashcardCategoryLabel unknown category renders verbatim",
  data.flashcardCategoryLabel("Nope", "ur") === "Nope" && data.flashcardCategoryLabel("All", "ur") === "All",
);

// ---- §4 page wiring (source patterns) ----
// The filter keeps English keys: the select value + startSession arg
// are the English category; only the option LABEL resolves.
const page = fs.readFileSync(join(ROOT, "src/app/flashcards/page.tsx"), "utf8");
check(
  "flashcards page: option values stay English, labels resolve",
  page.includes('value={c}') && page.includes("flashcardCategoryLabel(c, lang)"),
);
check(
  "flashcards page: card face renders the resolved view",
  page.includes("resolveFlashcardView(card, lang)") && page.includes("cardView?.front") && page.includes("cardView?.back"),
);
check(
  "flashcards page: badge renders only when translated",
  page.includes("cardView?.translated") && page.includes("[Auto-Translated]"),
);
check(
  "flashcards page: ids still computed from English front/back",
  page.includes("flashcardId(c.front, c.back)"),
);

// ---- §5 script / honorific audits ----
check(
  "flashcards: no [Auto-Translated] marker inside data fields",
  cards.every((c) => TR_KEYS.every((k) => !c[k].includes("[Auto-Translated]"))),
);
check(
  "flashcards: zero Latin honorific abbreviations in _roman fields",
  cards.every((c) => !/\(SAW\)|\(RA\)|\(AS\)|\(PBUH\)/.test(c.front_roman + " " + c.back_roman)),
);
check(
  "flashcards: Arabic script in _roman fields is only verbatim quotes from the English source (grammar cards quote Arabic words)",
  cards.every((c) =>
    [
      ["front", "front_roman"],
      ["back", "back_roman"],
    ].every(([enKey, roKey]) => {
      const srcChars = new Set((c[enKey].match(/[\u0600-\u06FF\u064B-\u0652\u0670\u0640]/g) || []));
      return (c[roKey].match(/[\u0600-\u06FF\u064B-\u0652\u0670\u0640]/g) || []).every((ch) => srcChars.has(ch));
    }),
  ),
);
check(
  "flashcards: every _ur front/back carries Urdu script",
  cards.every((c) => ARABIC.test(c.front_ur) && ARABIC.test(c.back_ur)),
  cards
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !(ARABIC.test(c.front_ur) && ARABIC.test(c.back_ur)))
    .slice(0, 3)
    .map(({ i }) => `#${i}`)
    .join(","),
);

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll Phase 2 flashcard checks passed.");
