// Stage 4B (Quran audio) tests: the owner-approved ayah mapping +
// CDN audio wiring + player controls + service-worker exclusion.
// Plain node, no dependencies; source-level + data assertions (the
// repo's suites cannot mount React or run a browser — actual audio
// playback is verified on the live browser check; see
// VERIFY-stage4b-audio.md §6 for what could NOT be verified locally).
// Run: node scripts/test-stage4b-audio.mjs (exit 0 = all pass)
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(join(ROOT, p));

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// --------------------------------- §1 data file: shape + counts
check("4B data file exists", exists("src/data/quran-examples.json"));
const data = JSON.parse(read("src/data/quran-examples.json"));
const verses = data.verses;
const examples = data.examples;
const noteAudio = data.noteAudio;
check("4B verses: exactly 18 unique", Object.keys(verses).length === 18, String(Object.keys(verses).length));
check("4B examples: exactly 21 approved", Object.keys(examples).length === 21, String(Object.keys(examples).length));
check("4B note mapping: exactly 13 titles", Object.keys(noteAudio).length === 13, String(Object.keys(noteAudio).length));
const slots = Object.values(noteAudio).flat();
check("4B note mapping: 26 example slots", slots.length === 26, String(slots.length));
check(
  "4B every example id is used by at least one note",
  Object.keys(examples).every((id) => slots.includes(id)),
);
check(
  "4B every slot id exists in examples",
  slots.every((id) => examples[id] !== undefined),
);

let versesWellFormed = true;
let globalsUnique = true;
const seenGlobals = new Set();
for (const [key, v] of Object.entries(verses)) {
  const [s, a] = key.split(":").map(Number);
  if (v.surah !== s || v.ayah !== a) versesWellFormed = false;
  if (typeof v.surahName !== "string" || !v.surahName) versesWellFormed = false;
  if (typeof v.surahNameArabic !== "string" || !v.surahNameArabic) versesWellFormed = false;
  if (typeof v.text !== "string" || !v.text.trim()) versesWellFormed = false;
  if (!Number.isInteger(v.globalAyah) || v.globalAyah < 1 || v.globalAyah > 6236) versesWellFormed = false;
  if (seenGlobals.has(v.globalAyah)) globalsUnique = false;
  seenGlobals.add(v.globalAyah);
  // No raw isolate/control characters (test-rtl forbids them in src/).
  if (/[\u2066\u2069\u0080-\u009F]/.test(v.text)) versesWellFormed = false;
}
check("4B verses well-formed (key/surah/ayah/names/text/global)", versesWellFormed);
check("4B globalAyah unique per verse", globalsUnique);
const ordered = Object.values(verses).sort((x, y) => x.surah - y.surah || x.ayah - y.ayah);
check(
  "4B globalAyah increases in Quran order",
  ordered.every((v, i) => i === 0 || v.globalAyah > ordered[i - 1].globalAyah),
);

let examplesWellFormed = true;
for (const [id, e] of Object.entries(examples)) {
  if (typeof e.ruleLabel !== "string" || !e.ruleLabel) examplesWellFormed = false;
  if (!verses[e.verseKey]) examplesWellFormed = false;
  if (e.demoWord !== null) {
    // Demo words must appear verbatim (NFC) in the mushaf text.
    const norm = (t) => t.normalize("NFC");
    if (typeof e.demoWord !== "string" || !norm(verses[e.verseKey].text).includes(norm(e.demoWord))) {
      examplesWellFormed = false;
    }
  }
}
check("4B examples well-formed (label/verse/demo-word verbatim)", examplesWellFormed);
check(
  "4B exactly 2 demo words are null (assimilated mushaf spellings)",
  Object.values(examples).filter((e) => e.demoWord === null).length === 2,
);
check(
  "4B demo-word nulls are #3 and #21 only",
  Object.entries(examples).filter(([, e]) => e.demoWord === null).map(([id]) => id).join(",") === "3,21",
);

// --------------------------------- §2 stored text == API-verified snapshot
check("4B API snapshot exists", exists("scripts/quran-api-verified-2026-11-14.json"));
const snap = JSON.parse(read("scripts/quran-api-verified-2026-11-14.json"));
check("4B snapshot has 18 verses", Object.keys(snap.verses).length === 18);
check("4B snapshot records its source + timestamp", Boolean(snap.source && snap.verifiedAtUtc));
let textsEqual = true;
let textsNfcEqual = true;
for (const key of Object.keys(snap.verses)) {
  if (!verses[key] || verses[key].text !== snap.verses[key]) textsEqual = false;
  if (!verses[key] || verses[key].text.normalize("NFC") !== snap.verses[key].normalize("NFC")) {
    textsNfcEqual = false;
  }
}
check("4B stored ayah text equals the API-verified snapshot (exact)", textsEqual);
check("4B stored ayah text equals the API-verified snapshot (NFC)", textsNfcEqual);

// --------------------------------- §3 mapping titles exist exactly once
const content = JSON.parse(read("src/data/content.json"));
const tajweedTitles = content.notes["Tajweed"].map((n) => n.title);
check("4B Tajweed notes: 24 total", tajweedTitles.length === 24, String(tajweedTitles.length));
let titlesExact = true;
for (const title of Object.keys(noteAudio)) {
  if (tajweedTitles.filter((t) => t === title).length !== 1) titlesExact = false;
}
check("4B every mapped title exists exactly once in Tajweed notes", titlesExact);
const unmapped = tajweedTitles.filter((t) => !(t in noteAudio));
check("4B exactly 11 Tajweed notes stay text-only", unmapped.length === 11, unmapped.join(" | "));
for (const t of [
  "Makharij — The Places of Articulation",
  "Sifaat — The Qualities of Letters",
  "Hifz Method — Sabq, Sabqi and Amukhta",
  "Revision Cycles — Keeping What You Memorised",
  "Listening, a Teacher and One Mushaf — Hifz Supports",
]) {
  check(`4B text-only (no audio): ${t}`, unmapped.includes(t));
}
// No note body was edited for audio: bodies contain no audio markers.
const allBodies = Object.values(content.notes).flat().map((n) => `${n.title} ${n.body}`).join("\n");
check("4B no audio markers inside note bodies", !/everyayah|islamic\.network|Play Audio/i.test(allBodies));

// --------------------------------- §4 URL builders + patterns
const lib = read("src/lib/quranAudio.ts");
check("4B lib: everyayah primary template", lib.includes("https://everyayah.com/data/Alafasy_128kbps/"));
check("4B lib: islamic.network fallback template", lib.includes("https://cdn.islamic.network/quran/audio/128/ar.alafasy/"));
check("4B lib: 3-digit zero padding", lib.includes('padStart(3, "0")'));
check("4B lib: getNoteAudio lookup exists", lib.includes("export function getNoteAudio"));
check("4B lib: audioUrls returns primary + fallback", lib.includes("primary: everyayahUrl") && lib.includes("fallback: islamicNetworkUrl"));
const pad = (n) => String(n).padStart(3, "0");
let urlsWellFormed = true;
for (const v of Object.values(verses)) {
  const primary = `https://everyayah.com/data/Alafasy_128kbps/${pad(v.surah)}${pad(v.ayah)}.mp3`;
  const fallback = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${v.globalAyah}.mp3`;
  if (!/^https:\/\/everyayah\.com\/data\/Alafasy_128kbps\/\d{6}\.mp3$/.test(primary)) urlsWellFormed = false;
  if (!/^https:\/\/cdn\.islamic\.network\/quran\/audio\/128\/ar\.alafasy\/\d+\.mp3$/.test(fallback)) urlsWellFormed = false;
}
check("4B all 18 URL pairs well-formed", urlsWellFormed);

// --------------------------------- §5 service worker never caches audio
const sw = read("public/sw.js");
check("4B SW: no everyayah URL", !sw.includes("everyayah"));
check("4B SW: no islamic.network URL", !sw.includes("islamic.network"));
check("4B SW: no mp3/audio references", !/\.mp3|audio/i.test(sw));
check("4B SW: cross-origin requests pass through uncached", sw.includes("url.origin !== self.location.origin"));
const precache = sw.slice(sw.indexOf("PRECACHE_URLS"), sw.indexOf("];", sw.indexOf("PRECACHE_URLS")));
check("4B SW: precache list is same-origin paths only", !/https?:\/\//.test(precache));

// --------------------------------- §6 player wiring (source-level)
const provider = read("src/components/QuranAudioProvider.tsx");
check("4B provider: single HTMLAudioElement", provider.includes("new Audio()"));
check("4B provider: preload none (no fetch before Play)", provider.includes('preload = "none"'));
check("4B provider: speed is 0.5x/1x only", provider.includes("0.5 | 1") && provider.includes("playbackRate"));
check("4B provider: loop toggle drives audio.loop", provider.includes(".loop = "));
check("4B provider: error tries the fallback once", provider.includes("triedFallbackRef") && provider.includes(".fallback"));
check("4B provider: close clears the source", provider.includes('removeAttribute("src")'));
check("4B provider: error state exists", provider.includes('"error"'));
check("4B provider: playExample + toggle + setSpeed + toggleLoop + close", ["playExample", "toggle", "setSpeed", "toggleLoop", "close"].every((fn) => provider.includes(fn)));

const player = read("src/components/StickyPlayer.tsx");
check("4B sticky player: fixed bar + spacer", player.includes("quran-player") && player.includes("quran-player-spacer"));
check("4B sticky player: renders nothing without a track", player.includes("if (!track) return null"));
check("4B sticky player: Play/Pause + speed + repeat + close wired", player.includes("toggle") && player.includes("setSpeed") && player.includes("toggleLoop") && player.includes("close"));
check("4B sticky player: repeat uses aria-pressed", player.includes("aria-pressed"));
check("4B sticky player: speed text isolated LTR", player.includes('<span dir="ltr">'));
check("4B sticky player: error shows unavailable + retry", player.includes("quranAudioUnavailable") && player.includes("quranRetry"));

const examplesCmp = read("src/components/NoteAudioExamples.tsx");
check("4B note block: keyed by exact title via getNoteAudio", examplesCmp.includes("getNoteAudio(title)"));
check("4B note block: renders nothing when unmapped", examplesCmp.includes("if (examples.length === 0) return null"));
check("4B note block: ayah text RTL + lang=ar", examplesCmp.includes('dir="rtl" lang="ar"'));
check("4B note block: offline disables buttons", examplesCmp.includes("disabled={offline}") && examplesCmp.includes("usePwa"));
check("4B note block: needs-internet note when offline", examplesCmp.includes("quranAudioNeedsInternet"));
check("4B note block: one Play button per example", examplesCmp.includes("examples.map"));

const shell = read("src/components/AppShell.tsx");
check("4B shell: QuranAudioProvider wraps the shell", shell.includes("<QuranAudioProvider>"));
check("4B shell: StickyPlayer rendered", shell.includes("<StickyPlayer />"));
const library = read("src/app/library/page.tsx");
check("4B library: NoteAudioExamples with original title", library.includes("<NoteAudioExamples title={n.title} />"));

const css = read("src/app/globals.css");
check("4B css: player fixed at bottom, full inline width", css.includes(".quran-player") && css.includes("position: fixed") && css.includes("bottom: 0"));
check("4B css: player above content (z-index 40)", /\.quran-player \{[^}]*z-index: 40/s.test(css));
check("4B css: spacer height covers the bar", /\.quran-player-spacer \{[^}]*height: 72px/s.test(css));
check("4B css: label truncates (no wrap at 360px)", /\.quran-player-label \{[^}]*white-space: nowrap/s.test(css));
check("4B css: player buttons never shrink", /\.quran-player button \{[^}]*flex-shrink: 0/s.test(css));
check("4B css: safe-area inset for the home indicator", css.includes("env(safe-area-inset-bottom)"));
check("4B css: ayah text sized for vocalized script", /\.quran-ayah \{[^}]*font-size: 1\.3rem/s.test(css));
check("4B css: repeat-on state styled", css.includes(".quran-repeat-on"));

// --------------------------------- §7 i18n keys present (en + ur enforced globally by test-i18n)
const i18n = read("src/lib/i18n.tsx");
for (const key of [
  "quranListenHeading", "quranListenIntro", "quranPlayAudio", "quranPlay", "quranPause",
  "quranRetry", "quranRepeat", "quranClosePlayer", "quranPlayerLabel", "quranSpeedToggle",
  "quranAyahRef", "quranDemoWord", "quranAudioNeedsInternet", "quranAudioUnavailable",
]) {
  check(`4B i18n key present: ${key}`, i18n.includes(`${key}: {`));
}

// --------------------------------- §8 no bank/data contamination
const bankDir = join(ROOT, "src/data/banks");
let banksClean = true;
for (const f of fs.readdirSync(bankDir)) {
  const src = fs.readFileSync(join(bankDir, f), "utf8");
  if (/everyayah|islamic\.network|quran-examples/.test(src)) banksClean = false;
}
check("4B no audio references inside bank files", banksClean);
check("4B data.ts untouched by audio (no quran import)", !read("src/lib/data.ts").includes("quran"));

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll Stage 4B audio checks passed.");
