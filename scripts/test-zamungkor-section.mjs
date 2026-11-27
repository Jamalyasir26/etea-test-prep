// ZamungKor current-preparation section tests (W2 design, 27 Nov 2026).
// Pins the separate /zamungkor section: the new route + nav entry, the
// 12 new i18n keys, the zam4/zam5 defs + fixed lists (official 891
// compositions), the owner's-decision wording in the new notes, the
// untouched old zam1/2/3 defs + lists (sha-pinned against the W3 data
// report), counts 30/8000, the unchanged /review inputs (zam1+zam2 =
// 200 IDs, 15 reviewed), and the ledger zamungkor row (confirmed, 891
// PNG source). Plain node, no dependencies; the ledger row is exercised
// through the REAL ledger.ts via the same tsc harness as test-step3a.
// Run: node scripts/test-zamungkor-section.mjs (exit 0 = all pass).
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(join(ROOT, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
const sha = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");

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
const byId = Object.fromEntries(content.mocks.map((m) => [m.id, m]));
const ZAM_PNG_URL =
  "https://etea.online/advertisement/course_content/891_7f36d7dbbeb4261f575eea5659ff5f4f.png";

// ------------------------------------------------- §1 section route + nav
check(
  "zamungkor section: route file src/app/zamungkor/page.tsx exists",
  fs.existsSync(join(ROOT, "src/app/zamungkor/page.tsx")),
);
const sectionSrc = fs.existsSync(join(ROOT, "src/app/zamungkor/page.tsx"))
  ? read("src/app/zamungkor/page.tsx")
  : "";
check(
  "zamungkor section: page renders both halves (Current + Previous headings)",
  sectionSrc.includes("zamSectionCurrentHeading") &&
    sectionSrc.includes("zamSectionPreviousHeading") &&
    sectionSrc.includes("zamSectionCurrentNote") &&
    sectionSrc.includes("zamSectionPreviousNote"),
);
check(
  "zamungkor section: Current half filters zam4/zam5, Previous half zam1/zam2/zam3 (in order)",
  sectionSrc.includes('["zam4", "zam5"]') && sectionSrc.includes('["zam1", "zam2", "zam3"]'),
);
const sidebar = read("src/components/Sidebar.tsx");
check(
  "zamungkor nav: Sidebar entry /zamungkor (key zamungkor, ScrollText, study group) directly after /mock",
  sidebar.includes("ScrollText") &&
    sidebar.includes('href: "/zamungkor"') &&
    sidebar.includes('key: "zamungkor"') &&
    sidebar.indexOf('href: "/mock"') !== -1 &&
    sidebar.indexOf('href: "/zamungkor"') > sidebar.indexOf('href: "/mock"'),
);
const trackPage = read("src/app/tracks/[id]/page.tsx");
check(
  "zamungkor track page: conditional link to /zamungkor for tr.id === \"zamungkor\" only",
  trackPage.includes('tr.id === "zamungkor"') && trackPage.includes('"/zamungkor"'),
);

// ------------------------------------------------- §2 the 12 new i18n keys
const i18nSrc = read("src/lib/i18n.tsx");
const SECTION_KEYS = [
  "zamungkor",
  "zamSectionTitle",
  "zamSectionIntro",
  "zamSectionCurrentHeading",
  "zamSectionCurrentBadge",
  "zamSectionCurrentNote",
  "zamSectionPreviousHeading",
  "zamSectionPreviousBadge",
  "zamSectionPreviousNote",
  "zamSectionSyllabusLink",
  "zamSectionViewLedger",
  "zamSectionOpenLink",
];
for (const key of SECTION_KEYS) {
  const at = i18nSrc.indexOf(`  ${key}: {`);
  const end = at === -1 ? -1 : i18nSrc.indexOf("},", at);
  const block = at === -1 || end === -1 ? "" : i18nSrc.slice(at, end);
  const val = (lang) => {
    const m = block.match(new RegExp(`${lang}: "([^"]+)"`));
    return m ? m[1].trim() : "";
  };
  check(
    `i18n: key ${key} exists with non-empty en + roman + ur`,
    at !== -1 && val("en").length > 0 && val("roman").length > 0 && val("ur").length > 0,
    at === -1 ? "missing" : `en=${JSON.stringify(val("en").slice(0, 40))}`,
  );
}

// ------------------------------------------------- §3 zam4 / zam5 defs + lists
for (const [id, title] of [["zam4", "ZamungKor Theology Mock — Project 891"], ["zam5", "ZamungKor Qari Mock — Project 891"]]) {
  const m = byId[id];
  check(
    `zamungkor ${id}: def exists (track zamungkor, variant 891, 45 min, total 60, fixed ${id})`,
    Boolean(m) &&
      m.track === "zamungkor" &&
      m.variant === "891" &&
      m.minutes === 45 &&
      m.total === 60 &&
      m.fixed === id &&
      m.title === title,
    m ? `${m.track}/${m.variant}/${m.minutes}/${m.total} ${JSON.stringify(m.title)}` : "missing",
  );
  check(
    `zamungkor ${id}: note labels the timer as the owner's decision + names the 891 source (all 3 languages)`,
    Boolean(m) &&
      /owner's decision/i.test(m.note ?? "") &&
      /891/.test(m.note ?? "") &&
      /malik ka faisla/i.test(m.note_roman ?? "") &&
      /مالک کا فیصلہ/.test(m.note_ur ?? ""),
    (m?.note ?? "").slice(0, 100),
  );
}
const BANK_KEYS = ["arabic", "drawing", "english", "gk", "islamiyat", "it", "maths", "pakstudies", "pastpapers", "pastpapers_reworded", "pe", "pedagogy", "science", "socialstudies", "tajweed", "urdu"];
const bankById = {};
for (const k of BANK_KEYS) {
  for (const q of readJson(`src/data/banks/${k}.json`)) bankById[q.id] = q;
}
const dist = (key) => {
  const d = {};
  for (const id of content.zamFixed[key] ?? []) {
    const q = bankById[id];
    const sk = q ? q.subjectKey : "MISSING";
    d[sk] = (d[sk] ?? 0) + 1;
  }
  return d;
};
check(
  "zamungkor zam4: 60-ID list, Theology composition (ISL 20, PED 15, SCI 10, SS 10, PAK 5)",
  content.zamFixed.zam4?.length === 60 &&
    (() => {
      const d = dist("zam4");
      return d.islamiyat === 20 && d.pedagogy === 15 && d.science === 10 && d.socialstudies === 10 && d.pakstudies === 5;
    })(),
  JSON.stringify(dist("zam4")),
);
check(
  "zamungkor zam5: 60-ID list, Qari composition (TAJ 12, ISL 6, MAT 12, PED 12, SS 12, URD 6)",
  content.zamFixed.zam5?.length === 60 &&
    (() => {
      const d = dist("zam5");
      return d.tajweed === 12 && d.islamiyat === 6 && d.maths === 12 && d.pedagogy === 12 && d.socialstudies === 12 && d.urdu === 6;
    })(),
  JSON.stringify(dist("zam5")),
);
check(
  "zamungkor zam5: Tajweed share includes >= 1 Hifz item (TAJ-464, Hifz — Quranic Facts)",
  (content.zamFixed.zam5 ?? [])
    .filter((id) => id.startsWith("TAJ-"))
    .some((id) => (bankById[id]?.topic ?? "").startsWith("Hifz")),
  (content.zamFixed.zam5 ?? []).filter((id) => id.startsWith("TAJ-")).join(","),
);
check(
  "zamungkor: all 5 zam lists pairwise disjoint (420 unique ids)",
  ["zam1", "zam2", "zam3", "zam4", "zam5"].flatMap((k) => content.zamFixed[k] ?? []).length === 420 &&
    new Set(["zam1", "zam2", "zam3", "zam4", "zam5"].flatMap((k) => content.zamFixed[k] ?? [])).size === 420,
);

// ------------------------------------------------- §4 old defs + lists untouched
// SHA-256 pins from the W3 data report (JSON.stringify of each object).
const OLD_HASHES = {
  "zamFixed.zam1": "bf83336e2c5311ed58763b3585b530605e32bf3ef26941eb49f21137590049fb",
  "zamFixed.zam2": "ecea4149701edf12d0335073a0509fe53570cdcc211aa042308839ed5c96f57d",
  "zamFixed.zam3": "9bbe2842555e7ac3206be946add66695dc649647a3be5d5d575c5c7a27b93c40",
  "mock.zam1": "66d36214dbbb32a2ccb308cb0d8743932cea3b5b81fd4268b60ca75b80255c2a",
  "mock.zam2": "7087bbb8dd27455b48983c39e6976a255873bc48d98069dbe51f6b97567c8cd1",
  "mock.zam3": "7072447524c5faee43d63887fd82a3c9b789767ec389245d45c968fd24d4d591",
};
check(
  "zamungkor old half: zam1/2/3 defs + lists byte-identical to the W3 report hashes",
  sha(content.zamFixed.zam1) === OLD_HASHES["zamFixed.zam1"] &&
    sha(content.zamFixed.zam2) === OLD_HASHES["zamFixed.zam2"] &&
    sha(content.zamFixed.zam3) === OLD_HASHES["zamFixed.zam3"] &&
    sha(byId.zam1) === OLD_HASHES["mock.zam1"] &&
    sha(byId.zam2) === OLD_HASHES["mock.zam2"] &&
    sha(byId.zam3) === OLD_HASHES["mock.zam3"],
  ["zam1", "zam2", "zam3"].map((k) => `${k}:${sha(content.zamFixed[k]).slice(0, 8)}/${sha(byId[k]).slice(0, 8)}`).join(" "),
);
check(
  "zamungkor old half: zam1/2/3 still proxy, 100 min, total 100, 100-ID lists",
  ["zam1", "zam2", "zam3"].every(
    (id) => byId[id]?.variant === "proxy" && byId[id]?.minutes === 100 && byId[id]?.total === 100 && content.zamFixed[id]?.length === 100,
  ),
);

// ------------------------------------------------- §5 counts + /review inputs
check(
  "zamungkor counts: mocks 30, total 8000 (no bank edited)",
  content.counts.mocks === 30 && content.counts.total === 8000,
  JSON.stringify({ mocks: content.counts.mocks, total: content.counts.total }),
);
const zam12 = [...(content.zamFixed.zam1 ?? []), ...(content.zamFixed.zam2 ?? [])];
const zam12Trusted = zam12.filter(
  (id) => bankById[id] && (bankById[id].reviewStatus === "owner-reviewed" || bankById[id].reviewStatus === "approved"),
);
check(
  "zamungkor /review inputs unchanged: zam1+zam2 still 200 IDs, 15 reviewed",
  zam12.length === 200 && zam12Trusted.length === 15,
  `${zam12.length} ids, ${zam12Trusted.length} trusted`,
);
check(
  "zamungkor new mocks start with 0 trusted items (no reviewed item reused)",
  [...(content.zamFixed.zam4 ?? []), ...(content.zamFixed.zam5 ?? [])].filter(
    (id) => bankById[id] && (bankById[id].reviewStatus === "owner-reviewed" || bankById[id].reviewStatus === "approved"),
  ).length === 0,
);

// ------------------------------------------------- §6 ledger row (real module)
const OUT = "/tmp/zamungkor-section-data";
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
  tscDiag.slice(0, 300),
);
const require = createRequire(import.meta.url);
const ledger = require(join(OUT, "lib/ledger.js"));
const row = ledger.ledgerRowFor("zamungkor");
check(
  "zamungkor ledger: pattern confirmed, coverage exact, source confirmed (891 PNG)",
  Boolean(row) &&
    ledger.ledgerDefIds().find((d) => d.trackId === "zamungkor")?.pattern === "confirmed" &&
    row.coverage === "exact" &&
    row.sourceState === "confirmed" &&
    row.sourceUrl === ZAM_PNG_URL,
  JSON.stringify(row ? { coverage: row.coverage, sourceState: row.sourceState, sourceUrl: row.sourceUrl } : null),
);
check(
  "zamungkor ledger: last verified 27 Nov 2026, 5 mocks, deduped totalMcqs 4000",
  Boolean(row) &&
    row.lastVerified === "27 Nov 2026" &&
    row.mocks.length === 5 &&
    row.totalMcqs === 4000,
  JSON.stringify(row ? { lastVerified: row.lastVerified, mocks: row.mocks.map((m) => m.id), totalMcqs: row.totalMcqs } : null),
);

// ------------------------------------------------------------------ summary
if (failures > 0) {
  console.log(`\n${failures} ZamungKor section test(s) FAILED.`);
  process.exit(1);
}
console.log("\nAll ZamungKor section checks passed.");
