// Step 3b-audit Batch 1 tests (F21 + F14/F18 + F10 + stale counts).
// Plain node, no dependencies.
// §1–§2 exercise the REAL tracking.ts (Node type-stripping, same
// pattern as test-step2fixes.mjs) + TZ-pinned child processes proving
// day boundaries follow LOCAL time. §3 exercises the REAL
// healthCache.ts (injected clock, no network). §4–§5 are source
// assertions over the health route + attribution wiring, plus the
// REAL providerDisplayName. §6 asserts the F21 badge CSS. §7 asserts
// the dashboard subtitles derive from VISIBLE_COUNTS (real compiled
// data.ts, tsc harness like test-step3a.mjs).
// Run: node scripts/test-step3b-audit1.mjs  (exit 0 = all pass)
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

// Storage stub, installed BEFORE any lib module is loaded.
const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  get length() {
    return store.size;
  },
};

const tracking = await import("../src/lib/tracking.ts");
const healthCacheMod = await import("../src/lib/healthCache.ts");
const tutorHealth = await import("../src/lib/tutorHealth.ts");

// ------------------------------------------------- §1 F10: local days
const noon = (y, m, d) => new Date(y, m - 1, d, 12, 0, 0);
check(
  "localDayKey uses local getters",
  tracking.localDayKey(noon(2026, 11, 14)) === "2026-11-14" &&
    tracking.localDayKey(new Date(2026, 0, 5, 9, 30, 0)) === "2026-01-05",
);
check(
  "dayKey equals localDayKey of the parsed instant (never a UTC slice)",
  ["2026-11-13T20:00:00.000Z", "2026-11-13T01:00:00.000Z", "2026-01-01T00:00:00.000Z"].every(
    (iso) => tracking.dayKey(iso) === tracking.localDayKey(new Date(iso)),
  ),
);
check("dayKey: unparseable input falls back to the old slice", tracking.dayKey("not-a-date") === "not-a-date");
check("dayKey: empty input returns empty", tracking.dayKey("") === "");

// countStreakDays: literal day-key sets + local-noon "today" (noon is
// unambiguous in every timezone, so these hold under any TZ).
const streak = (days, today) => tracking.countStreakDays(new Set(days), today);
check("streak: 3 consecutive days ending today", streak(["2026-11-12", "2026-11-13", "2026-11-14"], noon(2026, 11, 14)) === 3);
check("streak: no attempt today -> counts back from yesterday", streak(["2026-11-12", "2026-11-13"], noon(2026, 11, 14)) === 2);
check("streak: gap yesterday breaks the run", streak(["2026-11-14", "2026-11-12"], noon(2026, 11, 14)) === 1);
check("streak: empty set -> 0", streak([], noon(2026, 11, 14)) === 0);
check("streak: only today -> 1", streak(["2026-11-14"], noon(2026, 11, 14)) === 1);
check("streak: only yesterday -> 1", streak(["2026-11-13"], noon(2026, 11, 14)) === 1);
check("streak: only 2 days ago -> 0", streak(["2026-11-12"], noon(2026, 11, 14)) === 0);
check(
  "streak: future days do not extend the run",
  streak(["2026-11-14", "2026-11-15", "2026-11-16"], noon(2026, 11, 14)) === 1,
);

// computeStats integration: attempts at local noon on 3 consecutive
// local days (stored as ISO instants) must yield streak 3 in ANY TZ,
// because dayKey re-derives the LOCAL day from each instant.
const mkAttempt = (d, i) => ({
  id: `t${i}`,
  kind: "quiz",
  title: "t",
  total: 1,
  correct: 1,
  seconds: 60,
  date: noon(2026, 11, d).toISOString(),
});
const stats3 = tracking.computeStats([mkAttempt(12, 1), mkAttempt(13, 2), mkAttempt(14, 3)]);
// "Today" inside computeStats is the real now, so pin the expectation
// relatively: the 3 attempts sit on 3 consecutive local days, and the
// daily buckets must be exactly those 3 local days.
check(
  "computeStats: daily buckets are the 3 local days",
  stats3.daily.map((d) => d.date).join(",") === "2026-11-12,2026-11-13,2026-11-14",
  stats3.daily.map((d) => d.date).join(","),
);
const todayNoon = noon(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
const recent = [0, 1, 2].map((back, i) => {
  const d = new Date(todayNoon.getTime() - back * 86400000);
  return { id: `r${i}`, kind: "quiz", title: "t", total: 1, correct: 1, seconds: 60, date: d.toISOString() };
});
check("computeStats: 3 recent local days -> streak 3", tracking.computeStats(recent).streakDays === 3);

// --------------------------------------- §2 F10: TZ-pinned children
// 20:00 UTC on the 13th is 01:00 local on the 14th in Asia/Karachi
// but still the 13th in UTC. The boundary streak case: an attempt at
// 18:00Z (23:00 PKT, 12th) and one at 20:00Z (01:00 PKT, 13th) are
// TWO local days in Karachi but ONE UTC day.
const tzProbe = (tz) =>
  execSync(
    `node -e "import('${join(ROOT, "src/lib/tracking.ts")}').then((m) => { const a='2026-11-12T18:00:00.000Z', b='2026-11-12T20:00:00.000Z'; const s=m.countStreakDays(new Set([m.dayKey(a), m.dayKey(b)]), new Date('2026-11-13T01:00:00.000Z')); console.log([m.dayKey('2026-11-13T20:00:00.000Z'), m.dayKey(a), m.dayKey(b), s].join(',')); })"`,
    { cwd: ROOT, env: { ...process.env, TZ: tz }, encoding: "utf8" },
  ).trim();
const khi = tzProbe("Asia/Karachi");
const utc = tzProbe("UTC");
check("TZ: Karachi dayKey(20:00Z 13th) is the 14th", khi.split(",")[0] === "2026-11-14", khi);
check("TZ: UTC dayKey(20:00Z 13th) is the 13th", utc.split(",")[0] === "2026-11-13", utc);
check("TZ: Karachi and UTC day keys differ (TZ actually moves the day)", khi !== utc, `${khi} vs ${utc}`);
check("TZ: Karachi boundary attempts span 2 local days", khi.split(",").slice(1, 3).join(",") === "2026-11-12,2026-11-13", khi);
check("TZ: UTC boundary attempts collapse to 1 UTC day", utc.split(",").slice(1, 3).join(",") === "2026-11-12,2026-11-12", utc);
check("TZ: Karachi streak is 2, UTC streak is 1 (boundary follows local time)", khi.split(",")[3] === "2" && utc.split(",")[3] === "1", `${khi} vs ${utc}`);

// --------------------------------- §3 F14/F18: probe cache behaviour
const { createProbeCache } = healthCacheMod;
let now = 1000000;
const clock = () => now;
{
  const cache = createProbeCache(300000, clock);
  let probes = 0;
  const probe = async () => {
    probes += 1;
    return { n: probes };
  };
  check("cache: peek is null when empty", cache.peek() === null);
  const first = await cache.load(probe);
  check("cache: first load probes (cached:false)", first.cached === false && first.value.n === 1 && probes === 1);
  const second = await cache.load(probe);
  check("cache: second load within TTL serves cache (no re-probe)", second.cached === true && probes === 1 && second.value.n === 1);
  check("cache: peek returns the fresh entry", cache.peek() !== null && cache.peek().value.n === 1);
  now += 299999;
  const third = await cache.load(probe);
  check("cache: 1ms before TTL expiry still serves cache", third.cached === true && probes === 1);
  now += 1; // exactly at TTL
  check("cache: peek is null at exactly TTL", cache.peek() === null);
  const fourth = await cache.load(probe);
  check("cache: at TTL expiry a fresh probe runs", fourth.cached === false && probes === 2 && fourth.value.n === 2);
}
{
  const cache = createProbeCache(300000, clock);
  let probes = 0;
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  const probe = async () => {
    probes += 1;
    await gate;
    return "shared";
  };
  const [a, b, c] = await Promise.all([cache.load(probe), cache.load(probe), cache.load(probe)].map((p) => {
    release();
    return p;
  }));
  check("cache: 3 concurrent loads share ONE probe", probes === 1, `probes=${probes}`);
  check("cache: concurrent loads all get the probed value", a.value === "shared" && b.value === "shared" && c.value === "shared");
  check("cache: concurrent loads report cached:false (fresh probe)", a.cached === false && b.cached === false && c.cached === false);
}
{
  const cache = createProbeCache(300000, clock);
  let probes = 0;
  const failing = async () => {
    probes += 1;
    throw new Error("probe down");
  };
  let threw = false;
  try {
    await cache.load(failing);
  } catch {
    threw = true;
  }
  check("cache: failed probe rejects (no silent swallow)", threw === true);
  check("cache: failed probe leaves nothing cached", cache.peek() === null);
  const ok = await cache.load(async () => {
    probes += 1;
    return "recovered";
  });
  check("cache: next load retries after failure", ok.value === "recovered" && probes === 2);
  const again = await cache.load(async () => {
    probes += 1;
    return "never";
  });
  check("cache: recovered entry is served from cache", again.cached === true && again.value === "recovered" && probes === 2);
}

// --------------------------- §4 F14/F18: health route wiring (source)
const healthRoute = read("src/app/api/tutor/health/route.ts");
check("route: uses the probe cache", /createProbeCache/.test(healthRoute));
check("route: TTL is 5 minutes", /HEALTH_TTL_MS = 5 \* 60 \* 1000/.test(healthRoute));
check("route: Cache-Control private, max-age=300", /Cache-Control.*private, max-age=300/.test(healthRoute));
check("route: response carries a cached flag", /cached,/.test(healthRoute) || /cached:/.test(healthRoute));
check("route: cache hits never report a cold start", /coldStart: cached \? false/.test(healthRoute));
check("route: same-origin guard still runs", /isSameOriginRequest\(req\.headers, "GET"\)/.test(healthRoute));
check("route: rate limit still runs", /rateLimitOk\(clientIpFromHeaders/.test(healthRoute));
check("route: no probe call outside the cache loader", (healthRoute.match(/probeProviders\(\)/g) || []).length === 1);
check("client: TutorHealthData carries the cached flag", /cached\?: boolean/.test(read("src/lib/tutorHealth.ts")));
check(
  "client/server TTLs match (5 min both sides)",
  /HEALTH_CACHE_TTL_MS = 5 \* 60 \* 1000/.test(read("src/lib/tutorHealth.ts")),
);

// ------------------------------ §5 F14/F18: attribution consistency
check("attribution: gemini -> Gemini", tutorHealth.providerDisplayName("gemini") === "Gemini");
check("attribution: groq -> Groq", tutorHealth.providerDisplayName("groq") === "Groq");
check("attribution: openrouter -> OpenRouter (free model)", tutorHealth.providerDisplayName("openrouter") === "OpenRouter (free model)");
for (const bad of [undefined, null, "", "GEMINI", "open-router", 123, {}, []]) {
  check(`attribution: ${JSON.stringify(bad)} -> null (never misattributed)`, tutorHealth.providerDisplayName(bad) === null);
}
const tutorPage = read("src/app/tutor/page.tsx");
check("attribution: tutor page uses providerDisplayName", /providerDisplayName\(j\.provider\)/.test(tutorPage));
check("attribution: tutor page omits the via-line when the name is null", /providerName\s*\n\s*\? `\$\{j\.answer\}/.test(tutorPage));
check(
  "attribution: old default-to-OpenRouter ternary is gone",
  !/j\.provider === "gemini" \? "Gemini" : j\.provider === "groq" \? "Groq" : "OpenRouter/.test(tutorPage),
);
const aiSrc = read("src/lib/ai.ts");
check(
  "attribution: generateTutorAnswer returns the answering provider per branch",
  /return \{ text, provider: "gemini" \}/.test(aiSrc) &&
    /return \{ text, provider: "groq" \}/.test(aiSrc) &&
    /return \{ text, provider: "openrouter" \}/.test(aiSrc),
);

// ------------------------------------------------- §6 F21: badge CSS
const css = read("src/app/globals.css");
const sbadgeBlock = /\.sbadge \{[^}]*\}/.exec(css)?.[0] ?? "";
check("F21: .sbadge rule exists", sbadgeBlock.length > 0);
check("F21: .sbadge wraps (white-space: normal)", /white-space:\s*normal/.test(sbadgeBlock), sbadgeBlock);
check("F21: .sbadge has max-width: 100%", /max-width:\s*100%/.test(sbadgeBlock));
check("F21: .sbadge has min-width: 0", /min-width:\s*0/.test(sbadgeBlock));
check("F21: .sbadge has no nowrap", !/white-space:\s*nowrap/.test(sbadgeBlock));
check("F21: badge icon still never shrinks", /\.sbadge svg \{ flex-shrink: 0; \}/.test(css));
const nowrapRules = [...css.matchAll(/([^{]+)\{[^}]*white-space:\s*nowrap[^}]*\}/g)].map((m) => m[1].trim().split("\n").pop().trim());
check(
  "F21: the only nowrap left in globals.css is the skip link",
  nowrapRules.length === 1 && nowrapRules[0] === ".shell-skip-link",
  nowrapRules.join(" | "),
);
const content = readJson("src/data/content.json");
const confStrings = [
  ...Object.values(content.patterns || {}).map((p) => p.confidence),
  ...(content.tracks || []).map((t) => t.conf),
].filter(Boolean);
const longest = Math.max(...confStrings.map((s) => s.length));
check("F21: longest verbatim confidence string exceeds 100 chars (wrap matters)", longest > 100, `longest=${longest}`);
check(
  "F21: pattern B confidence is the 869px case (137 chars, CONFIRMED...UNVERIFIED)",
  (content.patterns.B.confidence || "").length === 137 &&
    content.patterns.B.confidence.startsWith("CONFIRMED") &&
    content.patterns.B.confidence.includes("UNVERIFIED"),
);
check(
  "F21: all semantic badges render through .sbadge (one fix covers every page)",
  /className=\{`sbadge sbadge-\$\{tone\}`\}/.test(read("src/components/StatusBadges.tsx")),
);
let uiBadgeUsed = false;
for (const f of ["src/app/page.tsx", "src/app/tracks/page.tsx", "src/app/tracks/[id]/page.tsx", "src/app/mock/page.tsx", "src/app/mock/[id]/page.tsx", "src/app/vacancies/page.tsx"]) {
  if (/components\/ui\/badge/.test(read(f))) uiBadgeUsed = true;
}
check("F21: nowrap shadcn Badge is unused on badge pages", uiBadgeUsed === false);

// --------------------------- §7 stale counts derive from VISIBLE_COUNTS
const i18n = read("src/lib/i18n.tsx");
// Entry spans (bounded at the entry's closing brace — the {mocks} /
// {tracks} placeholders contain braces, so [^}]* cannot span them).
const spanOf = (key) => new RegExp(`${key}: \\{([\\s\\S]*?)\\n  \\},`).exec(i18n)?.[1] ?? "";
const langVal = (span, lang) => new RegExp(`${lang}: "([^"]*)"`).exec(span)?.[1] ?? "";
for (const lang of ["en", "roman", "ur"]) {
  const entry = langVal(spanOf("quickMocksDesc"), lang);
  check(`counts: quickMocksDesc ${lang} uses {mocks}`, entry.includes("{mocks}"), entry);
  check(`counts: quickMocksDesc ${lang} has no hardcoded 20`, !/\b20\b/.test(entry), entry);
  const tEntry = langVal(spanOf("quickTracksDesc"), lang);
  check(`counts: quickTracksDesc ${lang} uses {tracks}`, tEntry.includes("{tracks}"), tEntry);
  check(`counts: quickTracksDesc ${lang} has no hardcoded 19`, !/\b19\b/.test(tEntry), tEntry);
}
const home = read("src/app/page.tsx");
check("counts: mocks card derives from VISIBLE_COUNTS.mocks", /descParams: \{ mocks: VISIBLE_COUNTS\.mocks \}/.test(home));
check("counts: tracks card derives from VISIBLE_COUNTS.tracks", /descParams: \{ tracks: VISIBLE_COUNTS\.tracks \}/.test(home));
check("counts: cards render tf() when params exist", /q\.descParams \? tf\(q\.descKey, q\.descParams\) : t\(q\.descKey\)/.test(home));
check("counts: no '20 timed mocks' literal remains in src", !/20 timed mocks/.test(read("src/lib/i18n.tsx")) && !/20 timed mocks/.test(home));
check("counts: no '19 post tracks' literal remains in src", !/19 post tracks/.test(read("src/lib/i18n.tsx")) && !/19 post tracks/.test(home));

// Real VISIBLE_COUNTS via the tsc harness (same approach as test-step3a).
const OUT = "/tmp/step3b-audit1-data";
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
  tscDiag.slice(0, 400),
);
check("tsc harness: emitted lib/data.js", fs.existsSync(join(OUT, "lib/data.js")));
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
check("counts: VISIBLE_COUNTS.tracks is 12", data.VISIBLE_COUNTS.tracks === 12, String(data.VISIBLE_COUNTS.tracks));
check("counts: VISIBLE_COUNTS.mocks is 16", data.VISIBLE_COUNTS.mocks === 16, String(data.VISIBLE_COUNTS.mocks));
check("counts: bank counts as of Phase 4B1 (763/151/70)", data.COUNTS.total === 763 && data.COUNTS.notes === 151 && data.COUNTS.cards === 70);

// ------------------------------------------------------------ summary
if (failures > 0) {
  console.log(`\n${failures} Step 3b-audit1 test(s) FAILED.`);
  process.exit(1);
}
console.log("\nAll Step 3b-audit1 tests passed.");
