// U1 idiomatic Urdu + UI/UX: glossary consistency, digit preservation,
// placeholder preservation, no-literal-marker audit, and the C2 flag-8
// punctuation pins. Scoped to the REWRITTEN surfaces only: chrome
// (700 STRINGS keys), notes/flashcards/plan/mocks (content.json _ur),
// the Islamiyat pilot bank (500 items, U1), the Tajweed bank
// (500 items, U2 subject 1), the Arabic bank (500 items, U2
// subject 2), the Urdu bank (500 items, U2 subject 3), the
// English bank (500 items, U2 subject 4), the Maths bank
// (500 items, U2 subject 5) and the Pak Studies bank
// (500 items, U2 subject 6).
// The other 7 banks keep their pre-U1 _ur
// wording until U2 and are NOT covered here (except the
// whole-tree mojibake scan in §5).
// Run: node scripts/test-idiomatic-urdu.mjs  (exit 0 = all pass)
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---------- STRINGS parser (same approach as test-i18n.mjs) ----------
const i18nSrc = fs.readFileSync(join(ROOT, "src/lib/i18n.tsx"), "utf8");
function extractStringsObject(src) {
  const start = src.indexOf("const STRINGS");
  const open = src.indexOf("{", start);
  let i = open;
  let depth = 0;
  let inStr = null;
  let esc = false;
  while (i < src.length) {
    const ch = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === inStr) inStr = null;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
    } else if (ch === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i);
      i = nl === -1 ? src.length : nl;
      continue;
    } else if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end === -1 ? src.length : end + 2;
      continue;
    } else if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
    i += 1;
  }
  throw new Error("STRINGS object not closed");
}
function parseEntries(objText) {
  const entries = {};
  const starts = [...objText.matchAll(/^  ([A-Za-z0-9_]+): \{/gm)];
  for (let i = 0; i < starts.length; i++) {
    const span = objText.slice(
      starts[i].index,
      i + 1 < starts.length ? starts[i + 1].index : objText.length,
    );
    const entry = {};
    for (const lang of ["en", "roman", "ur"]) {
      const vm = new RegExp(`${lang}: "((?:\\\\.|[^"\\\\])*)"`).exec(span);
      if (vm) entry[lang] = vm[1];
    }
    entries[starts[i][1]] = entry;
  }
  return entries;
}
const STRINGS = parseEntries(extractStringsObject(i18nSrc));
const keys = Object.keys(STRINGS);

// ---------- helpers ----------
const TOK_SPLIT = /[\s،۔؛؟!?:;,.()\[\]"'«»—–\-/\\]+/;
function tokens(s) {
  return (s ?? "").split(TOK_SPLIT).filter(Boolean);
}
function bannedHits(pairs, banned) {
  const hits = [];
  for (const [loc, val] of pairs) {
    const toks = tokens(val);
    for (const b of banned) if (toks.includes(b)) hits.push(`${loc}:${b}`);
  }
  return hits;
}
function digitRuns(s) {
  return (s ?? "").match(/[0-9]+/g) || [];
}
function sameMultiset(a, b) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}
// U1 ruling 1: echo-dedup legitimately removes DUPLICATED digit runs from
// _ur bodies/explanations. Digit SET equality + Urdu multiset ⊆ English.
function relaxedDigitOk(en, ur) {
  const E = digitRuns(en), U = digitRuns(ur);
  const setE = new Set(E), setU = new Set(U);
  if (setE.size !== setU.size || ![...setE].every((x) => setU.has(x))) return false;
  const mE = {}; E.forEach((x) => { mE[x] = (mE[x] || 0) + 1; });
  const mU = {}; U.forEach((x) => { mU[x] = (mU[x] || 0) + 1; });
  return Object.entries(mU).every(([k, v]) => v <= (mE[k] || 0));
}
function placeholders(s) {
  return [...(s ?? "").matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

// ---------- §1 chrome ----------
// U1 rewrote all 700 ur values; key count is pinned by test-i18n/test-phase2.
check("U1 chrome: 700 STRINGS keys", keys.length === 700, `got ${keys.length}`);
const phBad = keys.filter((k) => JSON.stringify(placeholders(STRINGS[k].en)) !== JSON.stringify(placeholders(STRINGS[k].ur)));
check("U1 chrome: placeholder multisets identical en vs ur (all 700 keys)", phBad.length === 0, phBad.slice(0, 5).join(", "));
const chromePairs = keys.map((k) => [`chrome:${k}`, STRINGS[k].ur]);
// Word-boundary-aware: tokens, never substrings — معاشیات must NOT trip
// the اشیا ban (guard pinned below with live معاشیات occurrences).
const CHROME_BANNED = ["پیڈاگوجی", "پریکٹس", "اسکور", "موکس", "اشیا", "اشیاء", "سورۃ", "تم"];
const chromeBanned = bannedHits(chromePairs, CHROME_BANNED);
check("U1 chrome: no banned glossary terms in any ur value (token-aware)", chromeBanned.length === 0, chromeBanned.slice(0, 5).join(", "));
const chromeKyun = keys.filter((k) => (STRINGS[k].ur ?? "").includes("کیوں:"));
check("U1 chrome: no 'کیوں:' explanation label in any ur value (وضاحت instead)", chromeKyun.length === 0, chromeKyun.join(", "));
const chromeMarker = keys.filter((k) => (STRINGS[k].ur ?? "").includes("[Auto-Translated]"));
check("U1 chrome: no '[Auto-Translated]' literal in any ur value", chromeMarker.length === 0, chromeMarker.join(", "));
const HONOR_ABBR = /\(S\.?A\.?W\.?\)|\(P\.?B\.?U\.?H\.?\)|\(R\.?A\.?\)|\(A\.?S\.?\)/i;
const chromeHonor = keys.filter((k) => HONOR_ABBR.test(STRINGS[k].ur ?? ""));
check("U1 chrome: no Latin honorific abbreviations in any ur value", chromeHonor.length === 0, chromeHonor.join(", "));
const chromeMojibake = keys.filter((k) => (STRINGS[k].ur ?? "").includes("�"));
check("U1 chrome: no U+FFFD in any ur value", chromeMojibake.length === 0, chromeMojibake.join(", "));
// Glossary gap (documented): no pinned term for "default" — ڈیفالٹ is kept
// in exactly these 2 keys and must not spread silently.
const defaultKeys = keys.filter((k) => tokens(STRINGS[k].ur).includes("ڈیفالٹ"));
check("U1 chrome: ڈیفالٹ kept only in scoringDefaultOption + overrideSuffix (glossary gap)",
  JSON.stringify(defaultKeys.sort()) === JSON.stringify(["overrideSuffix", "scoringDefaultOption"]), defaultKeys.join(", "));
// Glossary positive pins: FSRS review = دہرائی (never جائزہ/واجب for due).
check("U1 chrome: stateReview ur is دہرائی", STRINGS.stateReview?.ur === "دہرائی");
check("U1 chrome: flashDueReviewsLabel ur is دہرائی کے لیے تیار", STRINGS.flashDueReviewsLabel?.ur === "دہرائی کے لیے تیار");
check("U1 chrome: flashGradedNextReview ur uses اگلی دہرائی", (STRINGS.flashGradedNextReview?.ur ?? "").includes("اگلی دہرائی"));
check("U1 chrome: explainButton ur is وضاحت کریں", STRINGS.explainButton?.ur === "وضاحت کریں");
check("U1 chrome: homeIntro ur names تدریسی عہدوں کے ٹریک", (STRINGS.homeIntro?.ur ?? "").includes("تدریسی عہدوں کے ٹریک"));
const dhiChrome = keys.filter((k) => /ذی الحجہ|ذی القعدہ/.test(STRINGS[k].ur ?? ""));
check("U1 chrome: no ذی الحجہ / ذی القعدہ forms in any ur value", dhiChrome.length === 0, dhiChrome.join(", "));

// ---------- §2 content.json _ur fields ----------
const content = JSON.parse(fs.readFileSync(join(ROOT, "src/data/content.json"), "utf8"));
const contentPairs = [];
for (const [subject, notes] of Object.entries(content.notes)) {
  for (const n of notes) {
    contentPairs.push([`note:${subject}:${n.title}:title_ur`, n.title_ur]);
    contentPairs.push([`note:${subject}:${n.title}:body_ur`, n.body_ur]);
  }
}
for (const f of content.flashcards) {
  contentPairs.push([`flashcard:${f.id}:front_ur`, f.front_ur]);
  contentPairs.push([`flashcard:${f.id}:back_ur`, f.back_ur]);
  contentPairs.push([`flashcard:${f.id}:category_ur`, f.category_ur]);
}
for (const d of content.plan21) {
  // Day shape: [dayLabel, tasks, dayLabel_ur, dayLabel_roman];
  // task shape: [minutes, text, text_ur, text_roman].
  contentPairs.push([`plan:${d[0]}:dayLabel_ur`, d[2]]);
  for (const t of d[1]) {
    contentPairs.push([`plan:${d[0]}:${t[1]}:text_ur`, t[2]]);
  }
}
for (const m of content.mocks) {
  contentPairs.push([`mock:${m.id}:title_ur`, m.title_ur]);
  contentPairs.push([`mock:${m.id}:note_ur`, m.note_ur]);
}
// تم is NOT banned here: Arabic/Urdu grammar notes legitimately discuss
// the pronoun (chrome + Islamiyat pin it separately).
const CONTENT_BANNED = ["پیڈاگوجی", "پریکٹس", "اسکور", "موکس", "اشیا", "اشیاء", "سورۃ"];
const contentBanned = bannedHits(contentPairs, CONTENT_BANNED);
check("U1 content: no banned glossary terms in any _ur field (token-aware)", contentBanned.length === 0, contentBanned.slice(0, 5).join(", "));
const contentMarker = contentPairs.filter(([, v]) => (v ?? "").includes("[Auto-Translated]"));
check("U1 content: no '[Auto-Translated]' literal in any _ur field", contentMarker.length === 0, contentMarker.slice(0, 3).map(([l]) => l).join(", "));
const contentMojibake = contentPairs.filter(([, v]) => (v ?? "").includes("�"));
check("U1 content: no U+FFFD in any _ur field", contentMojibake.length === 0, contentMojibake.slice(0, 3).map(([l]) => l).join(", "));
// Digit preservation: titles strict; bodies ruling 1 + D4 exemption.
let contentDigitBad = [];
for (const [subject, notes] of Object.entries(content.notes)) {
  for (const n of notes) {
    if (!sameMultiset(digitRuns(n.title), digitRuns(n.title_ur))) contentDigitBad.push(`${subject}:${n.title}:title_ur`);
    const d4 = subject === "Drawing/PE" && n.title === "Hockey — The Basics" &&
      new Set(digitRuns(n.body)).size === new Set(digitRuns(n.body_ur)).size + 1 &&
      !digitRuns(n.body_ur).includes("4") && n.body_ur.includes("چار کوارٹر");
    if (!relaxedDigitOk(n.body, n.body_ur) && !d4) contentDigitBad.push(`${subject}:${n.title}:body_ur`);
  }
}
for (const f of content.flashcards) {
  if (!sameMultiset(digitRuns(f.front), digitRuns(f.front_ur))) contentDigitBad.push(`flashcard:${f.id}:front_ur`);
  if (!sameMultiset(digitRuns(f.back), digitRuns(f.back_ur))) contentDigitBad.push(`flashcard:${f.id}:back_ur`);
}
for (const d of content.plan21) {
  if (!sameMultiset(digitRuns(d[0]), digitRuns(d[2]))) contentDigitBad.push(`plan:${d[0]}:dayLabel_ur`);
  for (const t of d[1]) {
    if (!sameMultiset(digitRuns(t[1]), digitRuns(t[2]))) contentDigitBad.push(`plan:${d[0]}:${t[1]}:text_ur`);
  }
}
for (const m of content.mocks) {
  if (!sameMultiset(digitRuns(m.title), digitRuns(m.title_ur))) contentDigitBad.push(`mock:${m.id}:title_ur`);
  if (!sameMultiset(digitRuns(m.note), digitRuns(m.note_ur))) contentDigitBad.push(`mock:${m.id}:note_ur`);
}
check("U1 content: digit preservation (titles/small surfaces strict, bodies ruling 1 + D4)", contentDigitBad.length === 0, contentDigitBad.slice(0, 5).join(", "));
// Dhul-Hijjah/Qadah pins, rewritten surfaces only.
const contentUrText = contentPairs.map(([, v]) => v ?? "").join("\n");
check("U1 content: ذوالحجہ present, ذی الحجہ absent", contentUrText.includes("ذوالحجہ") && !contentUrText.includes("ذی الحجہ"));
check("U1 content: ذوالقعدہ present, ذی القعدہ absent", contentUrText.includes("ذوالقعدہ") && !contentUrText.includes("ذی القعدہ"));

// ---------- §3 Islamiyat pilot bank ----------
const isl = JSON.parse(fs.readFileSync(join(ROOT, "src/data/banks/islamiyat.json"), "utf8"));
check("U1 islamiyat: 500 items", isl.length === 500, `got ${isl.length}`);
const islPairs = [];
for (const q of isl) {
  islPairs.push([`${q.id}:question_ur`, q.question_ur]);
  q.options_ur.forEach((o, i) => islPairs.push([`${q.id}:options_ur[${i}]`, o]));
  islPairs.push([`${q.id}:explanation_ur`, q.explanation_ur]);
}
const islBanned = bannedHits(islPairs, [...CONTENT_BANNED, "تم"]);
check("U1 islamiyat: no banned glossary terms in any _ur field (token-aware)", islBanned.length === 0, islBanned.slice(0, 5).join(", "));
const islMarker = islPairs.filter(([, v]) => (v ?? "").includes("[Auto-Translated]"));
check("U1 islamiyat: no '[Auto-Translated]' literal in any _ur field", islMarker.length === 0, islMarker.slice(0, 3).map(([l]) => l).join(", "));
const islMojibake = islPairs.filter(([, v]) => (v ?? "").includes("�"));
check("U1 islamiyat: no U+FFFD in any _ur field", islMojibake.length === 0, islMojibake.slice(0, 3).map(([l]) => l).join(", "));
let islDigitBad = [];
for (const q of isl) {
  if (!sameMultiset(digitRuns(q.question), digitRuns(q.question_ur))) islDigitBad.push(`${q.id}:question_ur`);
  q.options.forEach((o, i) => {
    if (!sameMultiset(digitRuns(o), digitRuns(q.options_ur[i]))) islDigitBad.push(`${q.id}:options_ur[${i}]`);
  });
  if (!relaxedDigitOk(q.explanation, q.explanation_ur)) islDigitBad.push(`${q.id}:explanation_ur`);
}
check("U1 islamiyat: digit preservation (questions/options strict, explanations ruling 1)", islDigitBad.length === 0, islDigitBad.slice(0, 5).join(", "));
// Arabic-script runs in English fields copied verbatim into _ur (runs ≥ 2 chars).
const AR_RUN = /[\u0600-\u06FF]{2,}/g;
let islArabicBad = [];
for (const q of isl) {
  for (const [src, dst] of [["question", "question_ur"], ["explanation", "explanation_ur"]]) {
    for (const run of (q[src].match(AR_RUN) || [])) {
      if (!q[dst].includes(run)) islArabicBad.push(`${q.id}:${dst}:${JSON.stringify(run)}`);
    }
  }
  q.options.forEach((o, i) => {
    for (const run of (o.match(AR_RUN) || [])) {
      if (!q.options_ur[i].includes(run)) islArabicBad.push(`${q.id}:options_ur[${i}]:${JSON.stringify(run)}`);
    }
  });
}
check("U1 islamiyat: Arabic-script runs copied verbatim into _ur fields", islArabicBad.length === 0, islArabicBad.slice(0, 5).join(" | "));
const islUrText = islPairs.map(([, v]) => v ?? "").join("\n");
check("U1 islamiyat: ذوالحجہ present, ذی الحجہ absent", islUrText.includes("ذوالحجہ") && !islUrText.includes("ذی الحجہ"));
check("U1 islamiyat: ذوالقعدہ present, ذی القعدہ absent", islUrText.includes("ذوالقعدہ") && !islUrText.includes("ذی القعدہ"));
// Boundary-awareness guard: معاشیات occurs live and must NOT trip the اشیا ban.
check("U1 islamiyat: معاشیات occurs (proves the اشیا check is token-aware, not substring)",
  islUrText.includes("معاشیات") && !islPairs.some(([, v]) => tokens(v).includes("اشیا")));

// ---------- §3B Tajweed bank (U2 subject 1) ----------
// U2 rewrote the Tajweed _ur fields (778 of 3000 changed). Digit rule is
// STRICT on every field — questions, options AND explanations: the bank
// was strict-clean before the rewrite and test-phase1-tajweed.mjs
// enforces strict digit preservation on new items, so U1 ruling 1 does
// not apply here. No Dhul-Hijjah/Qadah forms occur in this bank, so no
// Dhul pins (unlike §2/§3). بے is NOT banned: بے قاعدہ / بے احتیاط /
// بے ترتیب are legitimate prefix uses (TAJ-080/320/461); the letter-name
// بے in TAJ-416 was normalized to با. شد is banned as a standalone token
// only (شدہ / شدّت are distinct correct tokens and must survive).
const taj = JSON.parse(fs.readFileSync(join(ROOT, "src/data/banks/tajweed.json"), "utf8"));
check("U2 tajweed: 500 items", taj.length === 500, `got ${taj.length}`);
const tajIdsOk = taj.every((q, i) => q.id === `TAJ-${String(i + 1).padStart(3, "0")}`);
check("U2 tajweed: IDs TAJ-001..TAJ-500 in order", tajIdsOk);
const tajPairs = [];
for (const q of taj) {
  tajPairs.push([`${q.id}:question_ur`, q.question_ur]);
  q.options_ur.forEach((o, i) => tajPairs.push([`${q.id}:options_ur[${i}]`, o]));
  tajPairs.push([`${q.id}:explanation_ur`, q.explanation_ur]);
}
const TAJ_BANNED = [...CONTENT_BANNED, "تم", "گنتی", "مدِّ", "واو", "راء", "رے", "ثے", "طوئے", "ظوئے", "فے", "حے", "خے", "یے", "حمزہ", "شد", "صیلہ", "استعلا", "رخوت", "طبعی", "شدّہ", "غنّہ"];
const tajBanned = bannedHits(tajPairs, TAJ_BANNED);
check("U2 tajweed: no banned glossary/variant terms in any _ur field (token-aware)", tajBanned.length === 0, tajBanned.slice(0, 5).join(", "));
const tajPhrases = tajPairs.filter(([, v]) => (v ?? "").includes("درج ذیل") || (v ?? "").includes("مد والا حرف") || (v ?? "").includes("مد والے حرف"));
check("U2 tajweed: no 'درج ذیل' / 'مد والا حرف' / 'مد والے حرف' phrases", tajPhrases.length === 0, tajPhrases.slice(0, 3).map(([l]) => l).join(", "));
const tajEmdash = tajPairs.filter(([, v]) => (v ?? "").includes("—"));
check("U2 tajweed: no em-dash in any _ur field", tajEmdash.length === 0, tajEmdash.slice(0, 3).map(([l]) => l).join(", "));
const tajMarker = tajPairs.filter(([, v]) => (v ?? "").includes("[Auto-Translated]"));
check("U2 tajweed: no '[Auto-Translated]' literal in any _ur field", tajMarker.length === 0, tajMarker.slice(0, 3).map(([l]) => l).join(", "));
const tajMojibake = tajPairs.filter(([, v]) => (v ?? "").includes("�"));
check("U2 tajweed: no U+FFFD in any _ur field", tajMojibake.length === 0, tajMojibake.slice(0, 3).map(([l]) => l).join(", "));
let tajDigitBad = [];
for (const q of taj) {
  if (!sameMultiset(digitRuns(q.question), digitRuns(q.question_ur))) tajDigitBad.push(`${q.id}:question_ur`);
  q.options.forEach((o, i) => {
    if (!sameMultiset(digitRuns(o), digitRuns(q.options_ur[i]))) tajDigitBad.push(`${q.id}:options_ur[${i}]`);
  });
  if (!sameMultiset(digitRuns(q.explanation), digitRuns(q.explanation_ur))) tajDigitBad.push(`${q.id}:explanation_ur`);
}
check("U2 tajweed: digit preservation STRICT on all fields (questions/options/explanations)", tajDigitBad.length === 0, tajDigitBad.slice(0, 5).join(", "));
let tajArabicBad = [];
for (const q of taj) {
  for (const [src, dst] of [["question", "question_ur"], ["explanation", "explanation_ur"]]) {
    for (const run of (q[src].match(AR_RUN) || [])) {
      if (!q[dst].includes(run)) tajArabicBad.push(`${q.id}:${dst}:${JSON.stringify(run)}`);
    }
  }
  q.options.forEach((o, i) => {
    for (const run of (o.match(AR_RUN) || [])) {
      if (!q.options_ur[i].includes(run)) tajArabicBad.push(`${q.id}:options_ur[${i}]:${JSON.stringify(run)}`);
    }
  });
}
check("U2 tajweed: Arabic-script runs copied verbatim into _ur fields", tajArabicBad.length === 0, tajArabicBad.slice(0, 5).join(" | "));
const tajUrText = tajPairs.map(([, v]) => v ?? "").join("\n");
check("U2 tajweed: حرکات present (duration counts, never گنتی)", tajUrText.includes("حرکات"));
check("U2 tajweed: غنہ / اظہار / ادغام / اخفا / اقلاب present", ["غنہ", "اظہار", "ادغام", "اخفا", "اقلاب"].every((t) => tajUrText.includes(t)));
check("U2 tajweed: قرآن پاک present, مد طبیعی present, مخرج present", tajUrText.includes("قرآن پاک") && tajUrText.includes("مد طبیعی") && tajUrText.includes("مخرج"));
check("U2 tajweed: مندرجہ ذیل present, شمسی حروف + قمری حروف present", tajUrText.includes("مندرجہ ذیل") && tajUrText.includes("شمسی حروف") && tajUrText.includes("قمری حروف"));
let bareQuran = [];
for (const [loc, v] of tajPairs) {
  const tk = tokens(v);
  tk.forEach((t, i) => { if (t === "قرآن" && tk[i + 1] !== "پاک") bareQuran.push(loc); });
}
check("U2 tajweed: bare قرآن never occurs — always قرآن پاک", bareQuran.length === 0, bareQuran.slice(0, 5).join(", "));
const tajLatin = tajPairs.filter(([, v]) => /[A-Za-z]/.test(v ?? ""));
check("U2 tajweed: only Latin letters are the approved (linking) gloss in TAJ-081:question_ur",
  tajLatin.length === 1 && tajLatin[0][0] === "TAJ-081:question_ur" && tajLatin[0][1].includes("(linking)"),
  tajLatin.map(([l]) => l).join(", "));
const tajHonor = tajPairs.filter(([, v]) => HONOR_ABBR.test(v ?? ""));
check("U2 tajweed: no Latin honorific abbreviations in any _ur field", tajHonor.length === 0, tajHonor.slice(0, 3).map(([l]) => l).join(", "));

// ---------- §3C Arabic bank (U2 subject 2) ----------
// U2 rewrote the Arabic _ur fields (406 of 3000 changed). Digit rule is
// STRICT on every field: the bank was strict-clean before the rewrite
// (0 mismatches; only 10 digit-carrying fields) and
// test-phase1-arabic.mjs enforces strict digit preservation on new
// items, so U1 ruling 1 does not apply here. Latin rule: every Latin
// run in _ur mirrors the same field's English (transliterated Arabic
// forms are the tested material); Latin echo-glosses were dropped.
// تم is NOT banned: 34 subject-matter uses (Arabic pronoun "you",
// greetings). بے is NOT banned: بے نام / بے جان / بے حد prefix uses.
// مبتدأ is deliberately NOT normalized to مبتدا (uniform cluster in
// ARB-068..072, incl. المبتدأ forms; verbatim rule). حرف علت is
// deliberately left without izafat (uniform 12× class, a letter type,
// distinct from the حرفِ X particle construction).
const arb = JSON.parse(fs.readFileSync(join(ROOT, "src/data/banks/arabic.json"), "utf8"));
check("U2 arabic: 500 items", arb.length === 500, `got ${arb.length}`);
const arbIdsOk = arb.every((q, i) => q.id === `ARB-${String(i + 1).padStart(3, "0")}`);
check("U2 arabic: IDs ARB-001..ARB-500 in order", arbIdsOk);
const arbPairs = [];
for (const q of arb) {
  arbPairs.push([`${q.id}:question_ur`, q.question_ur]);
  q.options_ur.forEach((o, i) => arbPairs.push([`${q.id}:options_ur[${i}]`, o]));
  arbPairs.push([`${q.id}:explanation_ur`, q.explanation_ur]);
}
const ARB_BANNED = [...CONTENT_BANNED, "گرامر", "گرامری", "جڑ", "جڑوں", "جڑی", "جڑیں", "مونث", "مادوں", "شکل", "شکلیں", "شکلوں", "یاء", "چنیں", "مبتداء"];
const arbBanned = bannedHits(arbPairs, ARB_BANNED);
check("U2 arabic: no banned glossary/variant terms in any _ur field (token-aware)", arbBanned.length === 0, arbBanned.slice(0, 5).join(", "));
const ARB_PHRASES = ["درج ذیل", "قرآن مجید", "صرف (صرف)", "(اسمی جملہ)", "(فعلی جملہ)", "(روٹ)", "(the)", "(definite)", "(indefinite)", "(feminine)", "(preposition)", "(a / an)", "(case)", "کون سی ضمیر", "حرف جر", "حالت کا اختتام", "حالت کے اختتام"];
const arbPhrases = arbPairs.filter(([, v]) => ARB_PHRASES.some((p) => (v ?? "").includes(p)));
check("U2 arabic: no banned phrases (echo glosses, درج ذیل, un-izafat حرف جر, حالت اختتام)", arbPhrases.length === 0, arbPhrases.slice(0, 3).map(([l]) => l).join(", "));
const arbEmdash = arbPairs.filter(([, v]) => (v ?? "").includes("—"));
check("U2 arabic: no em-dash in any _ur field", arbEmdash.length === 0, arbEmdash.slice(0, 3).map(([l]) => l).join(", "));
const arbMarker = arbPairs.filter(([, v]) => (v ?? "").includes("[Auto-Translated]"));
check("U2 arabic: no '[Auto-Translated]' literal in any _ur field", arbMarker.length === 0, arbMarker.slice(0, 3).map(([l]) => l).join(", "));
const arbMojibake = arbPairs.filter(([, v]) => (v ?? "").includes("�"));
check("U2 arabic: no U+FFFD in any _ur field", arbMojibake.length === 0, arbMojibake.slice(0, 3).map(([l]) => l).join(", "));
let arbDigitBad = [];
for (const q of arb) {
  if (!sameMultiset(digitRuns(q.question), digitRuns(q.question_ur))) arbDigitBad.push(`${q.id}:question_ur`);
  q.options.forEach((o, i) => {
    if (!sameMultiset(digitRuns(o), digitRuns(q.options_ur[i]))) arbDigitBad.push(`${q.id}:options_ur[${i}]`);
  });
  if (!sameMultiset(digitRuns(q.explanation), digitRuns(q.explanation_ur))) arbDigitBad.push(`${q.id}:explanation_ur`);
}
check("U2 arabic: digit preservation STRICT on all fields (questions/options/explanations)", arbDigitBad.length === 0, arbDigitBad.slice(0, 5).join(", "));
let arbArabicBad = [];
for (const q of arb) {
  for (const [src, dst] of [["question", "question_ur"], ["explanation", "explanation_ur"]]) {
    for (const run of (q[src].match(AR_RUN) || [])) {
      if (!q[dst].includes(run)) arbArabicBad.push(`${q.id}:${dst}:${JSON.stringify(run)}`);
    }
  }
  q.options.forEach((o, i) => {
    for (const run of (o.match(AR_RUN) || [])) {
      if (!q.options_ur[i].includes(run)) arbArabicBad.push(`${q.id}:options_ur[${i}]:${JSON.stringify(run)}`);
    }
  });
}
check("U2 arabic: Arabic-script runs copied verbatim into _ur fields", arbArabicBad.length === 0, arbArabicBad.slice(0, 5).join(" | "));
const arbUrText = arbPairs.map(([, v]) => v ?? "").join("\n");
check("U2 arabic: مادہ + مادے + قواعد + نحوی present", ["مادہ", "مادے", "قواعد", "نحوی"].every((t) => arbUrText.includes(t)));
check("U2 arabic: حرفِ جر + مبتدا + تثنیہ + مؤنث + معرفہ + نکرہ present", ["حرفِ جر", "مبتدا", "تثنیہ", "مؤنث", "معرفہ", "نکرہ"].every((t) => arbUrText.includes(t)));
check("U2 arabic: مندرجہ ذیل + قرآن پاک present", arbUrText.includes("مندرجہ ذیل") && arbUrText.includes("قرآن پاک"));
let arbBareQuran = [];
for (const [loc, v] of arbPairs) {
  const tk = tokens(v);
  tk.forEach((t, i) => { if (t === "قرآن" && tk[i + 1] !== "پاک") arbBareQuran.push(loc); });
}
check("U2 arabic: bare قرآن only in the ARB-445/449 word-family listings",
  arbBareQuran.length === 3 && arbBareQuran.includes("ARB-445:options_ur[2]") && arbBareQuran.includes("ARB-449:options_ur[3]") && arbBareQuran.includes("ARB-449:explanation_ur"),
  arbBareQuran.join(", "));
const ARB_LAT = /[A-Za-z][A-Za-z0-9.'\-]*/g;
let arbLatinBad = [];
for (const q of arb) {
  const fields = [[q.question, q.question_ur, "question_ur"], [q.explanation, q.explanation_ur, "explanation_ur"]];
  q.options.forEach((o, i) => fields.push([o, q.options_ur[i], `options_ur[${i}]`]));
  for (const [en, ur, fname] of fields) {
    for (const run of (ur.match(ARB_LAT) || [])) {
      if (!en.includes(run)) arbLatinBad.push(`${q.id}:${fname}:${JSON.stringify(run)}`);
    }
  }
}
check("U2 arabic: every Latin run in _ur mirrors the same field's English (no new Latin)", arbLatinBad.length === 0, arbLatinBad.slice(0, 5).join(" | "));
const arbHonor = arbPairs.filter(([, v]) => HONOR_ABBR.test(v ?? ""));
check("U2 arabic: no Latin honorific abbreviations in any _ur field", arbHonor.length === 0, arbHonor.slice(0, 3).map(([l]) => l).join(", "));
const arbEnglishWord = arbPairs.filter(([, v]) => (v ?? "").includes("انگریزی"));
check("U2 arabic: no انگریزی in any _ur field (T7/T8 medium-artifact decision)", arbEnglishWord.length === 0, arbEnglishWord.slice(0, 3).map(([l]) => l).join(", "));
const arbMubtadaHamza = arbPairs.filter(([, v]) => (v ?? "").includes("مبتدأ"));
check("U2 arabic: مبتدأ occurs only in the ARB-068..072 cluster (11×, deliberate)",
  arbMubtadaHamza.length === 8 && arbMubtadaHamza.every(([l]) => /^ARB-0(68|69|70|71|72):/.test(l)) &&
  arbUrText.match(/مبتدأ/g).length === 11,
  arbMubtadaHamza.map(([l]) => l).join(", "));
const harfIllat = (arbUrText.match(/حرف علت/g) || []).length;
const harfIllatIzafat = (arbUrText.match(/حرفِ علت/g) || []).length;
check("U2 arabic: حرف علت uniform class (12×) left without izafat", harfIllat === 12 && harfIllatIzafat === 0, `حرف علت ${harfIllat}, حرفِ علت ${harfIllatIzafat}`);

// ---------- §3D Urdu bank (U2 subject 3) ----------
// U2 rewrote the Urdu _ur fields (118 of 3000 changed; 92/500 items).
// Digit rule is STRICT on every field: the bank has ZERO digit-carrying
// fields, so strict multiset equality holds vacuously and any digit
// introduced fails. Latin rule is ZERO: the only 14 Latin-letter fields
// were parenthetical English echo-glosses in URD-026..043 explanations
// and were all dropped. مونث→مؤنث is a deliberate spelling correction
// (51×, uniform): the EN fields of URD-035..038 contain the misspelled
// run مونث, so the verbatim check below accepts مؤنث in _ur for that
// run only (adjudicated; _roman keeps مونث verbatim, untouched).
// Quoted material (idioms, proverbs, example sentences, poet names,
// tested word forms) stays byte-identical — coordinator-verified with
// 0 quote warnings, not suite-pinned. تم is NOT banned: 1 subject-matter
// use (URD-066 option, the pronoun). بے is NOT banned: 13 prefix uses.
// حرف جار is the established Urdu-grammar term (distinct from Arabic
// حرفِ جر) and is kept exactly; مسواف in any spelling is banned.
const urd = JSON.parse(fs.readFileSync(join(ROOT, "src/data/banks/urdu.json"), "utf8"));
check("U2 urdu: 500 items", urd.length === 500, `got ${urd.length}`);
const urdIdsOk = urd.every((q, i) => q.id === `URD-${String(i + 1).padStart(3, "0")}`);
check("U2 urdu: IDs URD-001..URD-500 in order", urdIdsOk);
const urdPairs = [];
for (const q of urd) {
  urdPairs.push([`${q.id}:question_ur`, q.question_ur]);
  q.options_ur.forEach((o, i) => urdPairs.push([`${q.id}:options_ur[${i}]`, o]));
  urdPairs.push([`${q.id}:explanation_ur`, q.explanation_ur]);
}
const URD_BANNED = [...CONTENT_BANNED, "گرامر", "گرامری", "مونث", "مسواف", "موسوف", "معسوف", "چنیں"];
const urdBanned = bannedHits(urdPairs, URD_BANNED);
check("U2 urdu: no banned glossary/variant terms in any _ur field (token-aware)", urdBanned.length === 0, urdBanned.slice(0, 5).join(", "));
const URD_PHRASES = ["درج ذیل", "قرآن مجید", "(noun)", "(verb)", "(pronoun)", "(adjective)", "(singular)", "(masculine)", "(feminine)", "(past tense)", "(future tense)", "(present tense)", "(proper noun)", "(common noun)", "کون سی ضمیر"];
const urdPhrases = urdPairs.filter(([, v]) => URD_PHRASES.some((p) => (v ?? "").includes(p)));
check("U2 urdu: no banned phrases (echo glosses, درج ذیل)", urdPhrases.length === 0, urdPhrases.slice(0, 3).map(([l]) => l).join(", "));
const urdEmdash = urdPairs.filter(([, v]) => (v ?? "").includes("—"));
check("U2 urdu: no em-dash in any _ur field", urdEmdash.length === 0, urdEmdash.slice(0, 3).map(([l]) => l).join(", "));
const urdMarker = urdPairs.filter(([, v]) => (v ?? "").includes("[Auto-Translated]"));
check("U2 urdu: no '[Auto-Translated]' literal in any _ur field", urdMarker.length === 0, urdMarker.slice(0, 3).map(([l]) => l).join(", "));
const urdMojibake = urdPairs.filter(([, v]) => (v ?? "").includes("�"));
check("U2 urdu: no U+FFFD in any _ur field", urdMojibake.length === 0, urdMojibake.slice(0, 3).map(([l]) => l).join(", "));
let urdDigitBad = [];
for (const q of urd) {
  if (!sameMultiset(digitRuns(q.question), digitRuns(q.question_ur))) urdDigitBad.push(`${q.id}:question_ur`);
  q.options.forEach((o, i) => {
    if (!sameMultiset(digitRuns(o), digitRuns(q.options_ur[i]))) urdDigitBad.push(`${q.id}:options_ur[${i}]`);
  });
  if (!sameMultiset(digitRuns(q.explanation), digitRuns(q.explanation_ur))) urdDigitBad.push(`${q.id}:explanation_ur`);
}
check("U2 urdu: digit preservation STRICT on all fields (questions/options/explanations)", urdDigitBad.length === 0, urdDigitBad.slice(0, 5).join(", "));
let urdScriptBad = [];
for (const q of urd) {
  for (const [src, dst] of [["question", "question_ur"], ["explanation", "explanation_ur"]]) {
    for (const run of (q[src].match(AR_RUN) || [])) {
      if (run === "مونث") { if (!q[dst].includes("مؤنث")) urdScriptBad.push(`${q.id}:${dst}:مونث-unsatisfied`); continue; }
      if (!q[dst].includes(run)) urdScriptBad.push(`${q.id}:${dst}:${JSON.stringify(run)}`);
    }
  }
  q.options.forEach((o, i) => {
    for (const run of (o.match(AR_RUN) || [])) {
      if (run === "مونث") { if (!q.options_ur[i].includes("مؤنث")) urdScriptBad.push(`${q.id}:options_ur[${i}]:مونث-unsatisfied`); continue; }
      if (!q.options_ur[i].includes(run)) urdScriptBad.push(`${q.id}:options_ur[${i}]:${JSON.stringify(run)}`);
    }
  });
}
check("U2 urdu: script runs copied verbatim into _ur fields (مونث→مؤنث exemption)", urdScriptBad.length === 0, urdScriptBad.slice(0, 5).join(" | "));
const urdUrText = urdPairs.map(([, v]) => v ?? "").join("\n");
check("U2 urdu: مؤنث + مذکر + قواعد present", ["مؤنث", "مذکر", "قواعد"].every((t) => urdUrText.includes(t)));
check("U2 urdu: حرف جار + اسم ضمیر + اسم موصول + مندرجہ ذیل present", ["حرف جار", "اسم ضمیر", "اسم موصول", "مندرجہ ذیل"].every((t) => urdUrText.includes(t)));
const urdLatin = urdPairs.filter(([, v]) => /[A-Za-z]/.test(v ?? ""));
check("U2 urdu: zero Latin letters in any _ur field", urdLatin.length === 0, urdLatin.slice(0, 3).map(([l]) => l).join(", "));
const urdArCodepoints = urdPairs.filter(([, v]) => (v ?? "").includes(String.fromCharCode(0x064a)) || (v ?? "").includes(String.fromCharCode(0x0643)));
check("U2 urdu: no Arabic yeh/kaf codepoints (U+064A/U+0643) in any _ur field", urdArCodepoints.length === 0, urdArCodepoints.slice(0, 3).map(([l]) => l).join(", "));
const urdHonor = urdPairs.filter(([, v]) => HONOR_ABBR.test(v ?? ""));
check("U2 urdu: no Latin honorific abbreviations in any _ur field", urdHonor.length === 0, urdHonor.slice(0, 3).map(([l]) => l).join(", "));
check("U2 urdu: مؤنث occurs exactly 51× (uniform normalization)", (urdUrText.match(/مؤنث/g) || []).length === 51, `got ${(urdUrText.match(/مؤنث/g) || []).length}`);
const harfJaar = (urdUrText.match(/حرف جار/g) || []).length;
const harfJaarIzafat = (urdUrText.match(/حرفِ جار/g) || []).length;
const harfJarr = (urdUrText.match(/حرف جر/g) || []).length;
check("U2 urdu: حرف جار uniform class (25×), no izafat/variant forms", harfJaar === 25 && harfJaarIzafat === 0 && harfJarr === 0, `حرف جار ${harfJaar}, حرفِ جار ${harfJaarIzafat}, حرف جر ${harfJarr}`);

// ---------- §3E English bank (U2 subject 4) ----------
// U2 rewrote the English _ur fields (315 of 3000 changed; 245/500 items).
// This bank's subject matter IS English: quoted/tested English words,
// sentences, idioms and all 2000 options stay byte-identical Latin; the
// rewrite targets the instructional framing. Digit rule is STRICT on
// every field: the bank has ZERO digit-carrying fields, so strict
// multiset equality holds vacuously and any digit introduced fails.
// Latin rule is the MIRROR RULE: every Latin word in a _ur field must
// appear in the item's English fields (baseline: exactly 4 violations,
// the word "object" in ENG-185..188 explanations, fixed by the rewrite).
// Banned Latin frame words are checked on the FRAME REMAINDER only:
// quoted spans, ≥2-word option phrases, tense/form phrases, and ≥3-word
// verbatim English runs are removed first, so tested material is never
// flagged. Tense names stay Latin (guide §2H; Urdu-script tense tokens
// banned) — the dominant bank form, flagged for owner confirmation.
// "form" splits by collocation: شکل for inflected word-forms (جمع/مؤنث/
// ماضی کی شکل, 31×) vs صورت for named grammatical forms (فعل کی/تقابلی/
// عالیٰ/بنیادی صورت, 44×). "phrase" splits by sense: فقرہ for grammar
// phrases, عبارت for expressions/passages. فجائیہ (5×) is kept for
// exclamatory (brief's تعجبیہ reversed); اجتماعی اسم (7×) for collective
// (brief's مجموعی reversed); قابلِ شمار (15×) with izafat, symmetric
// with ناقابلِ شمار (11×) (brief's asymmetric pin reversed). موڈل is
// the bank form (موڈل فعل as noun, موڈل as adjective). تم is NOT
// banned: 1 subject-matter use (ENG-144 explanation, the "you" of the
// example sentence). Quoted-span preservation was coordinator-verified
// (1 regex-artifact warning, ENG-015, reviewed — see VERIFY report),
// not suite-pinned.
const eng = JSON.parse(fs.readFileSync(join(ROOT, "src/data/banks/english.json"), "utf8"));
check("U2 english: 500 items", eng.length === 500, `got ${eng.length}`);
const engIdsOk = eng.every((q, i) => q.id === `ENG-${String(i + 1).padStart(3, "0")}`);
check("U2 english: IDs ENG-001..ENG-500 in order", engIdsOk);
const engPairs = [];
for (const q of eng) {
  engPairs.push([`${q.id}:question_ur`, q.question_ur]);
  q.options_ur.forEach((o, i) => engPairs.push([`${q.id}:options_ur[${i}]`, o]));
  engPairs.push([`${q.id}:explanation_ur`, q.explanation_ur]);
}
const engQE = engPairs.filter(([l]) => !l.includes("options_ur"));
const ENG_BANNED = [...CONTENT_BANNED, "گرامر", "گرامری", "مونث", "مسواف", "موسوف", "معسوف", "چنیں",
  "پریزنٹ", "پاسٹ", "فیوچر", "سمپل", "کنٹینیوس", "پرفیکٹ", "تجریدی", "مجموعی", "تعجبیہ", "امر"];
const engBanned = bannedHits(engPairs, ENG_BANNED);
check("U2 english: no banned glossary/variant terms in any _ur field (token-aware)", engBanned.length === 0, engBanned.slice(0, 5).join(", "));
const ENG_PHRASES = ["درج ذیل", "قرآن مجید", "کون سی ضمیر", "قابل شمار", "ناقابل شمار"];
const engPhrases = engQE.filter(([, v]) => ENG_PHRASES.some((p) => (v ?? "").includes(p)));
const ENG_LATIN_PHRASES = ["part of speech", "passive voice", "active voice", "indirect speech", "direct speech", "helping verb", "main verb", "reported speech", "topic sentence", "phrasal verb", "yes/no"];
const engLatinPhrases = engQE.filter(([, v]) => ENG_LATIN_PHRASES.some((p) => (v ?? "").toLowerCase().includes(p)));
check("U2 english: no banned phrases in Q+E (echo glosses, درج ذیل, non-izafat قابل/ناقابل شمار, Latin frame phrases)",
  engPhrases.length === 0 && engLatinPhrases.length === 0,
  [...engPhrases.slice(0, 3).map(([l]) => l), ...engLatinPhrases.slice(0, 3).map(([l]) => l)].join(", "));
const engEmdash = engPairs.filter(([, v]) => (v ?? "").includes("—"));
check("U2 english: no em-dash in any _ur field", engEmdash.length === 0, engEmdash.slice(0, 3).map(([l]) => l).join(", "));
const engMarker = engPairs.filter(([, v]) => (v ?? "").includes("[Auto-Translated]"));
check("U2 english: no '[Auto-Translated]' literal in any _ur field", engMarker.length === 0, engMarker.slice(0, 3).map(([l]) => l).join(", "));
const engMojibake = engPairs.filter(([, v]) => (v ?? "").includes("�"));
check("U2 english: no U+FFFD in any _ur field", engMojibake.length === 0, engMojibake.slice(0, 3).map(([l]) => l).join(", "));
let engDigitBad = [];
for (const q of eng) {
  if (!sameMultiset(digitRuns(q.question), digitRuns(q.question_ur))) engDigitBad.push(`${q.id}:question_ur`);
  q.options.forEach((o, i) => {
    if (!sameMultiset(digitRuns(o), digitRuns(q.options_ur[i]))) engDigitBad.push(`${q.id}:options_ur[${i}]`);
  });
  if (!sameMultiset(digitRuns(q.explanation), digitRuns(q.explanation_ur))) engDigitBad.push(`${q.id}:explanation_ur`);
}
check("U2 english: digit preservation STRICT on all fields (questions/options/explanations)", engDigitBad.length === 0, engDigitBad.slice(0, 5).join(", "));
// Mirror rule: every Latin word in _ur must appear in the item's EN fields.
const engNormWords = (s) => (s.toLowerCase().match(/[a-z]+/g) || []).join(" ");
let engMirrorBad = [];
for (const q of eng) {
  const enWords = new Set(engNormWords([q.question, q.explanation, ...q.options].join(" ")).split(" ").filter(Boolean));
  for (const [loc, val] of [[`${q.id}:question_ur`, q.question_ur], [`${q.id}:explanation_ur`, q.explanation_ur], ...q.options_ur.map((o, i) => [`${q.id}:options_ur[${i}]`, o])]) {
    for (const w of engNormWords(val).split(" ").filter(Boolean)) {
      if (!enWords.has(w)) engMirrorBad.push(`${loc}:${w}`);
    }
  }
}
check("U2 english: mirror rule — every Latin word in _ur appears in the item's English fields", engMirrorBad.length === 0, engMirrorBad.slice(0, 5).join(" | "));
// Frame remainder: strip quoted spans, ≥2-word option phrases, tense/form
// phrases, and ≥3-word verbatim English runs; banned Latin frame words
// and Latin punctuation are checked on what remains (the Urdu frame).
const ENG_TENSE_PHRASES = ["present perfect continuous", "past perfect continuous", "future perfect continuous", "present perfect", "past perfect", "future perfect", "present continuous", "past continuous", "future continuous", "present simple", "past simple", "future simple", "present participle", "past participle"];
const engEscRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function engStripQuotes(s) {
  return s.replace(/"[^"]*"/g, " ").replace(/'[^']*'/g, " ").replace(/‘[^’]*’/g, " ").replace(/“[^”]*”/g, " ");
}
function engFrameRemainder(text, item) {
  let s = engStripQuotes(text);
  for (const o of item.options) {
    if (o.split(/\s+/).filter(Boolean).length >= 2) s = s.replace(new RegExp(engEscRe(o), "gi"), " ");
  }
  for (const p of ENG_TENSE_PHRASES) s = s.replace(new RegExp("\\b" + p.replace(/ /g, "\\s+") + "\\b", "gi"), " ");
  const enNorm = " " + engNormWords([item.question, item.explanation, ...item.options].join(" ")) + " ";
  s = s.replace(/[A-Za-z]+(?:[ ,.;:?!'\u2019-]+[A-Za-z]+){2,}[.?;:]?/g, (m) => {
    const nw = engNormWords(m);
    return nw && enNorm.includes(" " + nw + " ") ? " " : m;
  });
  return s;
}
const ENG_BANNED_LATIN = new Set(("preposition verb noun adjective adverb pronoun article tense clause sentence object subject phrase voice speech gerund infinitive conjunction interjection synonym antonym singular plural countable uncountable helping modal reported reporting form part word question statement order degree quality quantity number place time manner frequency agent opposite completed definite determiner determiners transitive intransitive finite compound complex dependent independent exclamatory declarative optative superlative comparative possessive demonstrative reflexive interrogative relative collective abstract common proper material personal indefinite irregular being been base topic main written phrasal imperative present past future simple continuous perfect participle yes no grammar grammatical").split(" "));
let engFrameBad = [];
let engPunctBad = [];
for (const q of eng) {
  for (const [loc, val] of [[`${q.id}:question_ur`, q.question_ur], [`${q.id}:explanation_ur`, q.explanation_ur]]) {
    const rem = engFrameRemainder(val, q);
    for (const w of (rem.toLowerCase().match(/[a-z]+/g) || [])) {
      if (ENG_BANNED_LATIN.has(w)) engFrameBad.push(`${loc}:${w}`);
    }
    const remPunct = rem.replace(/\.{2,}/g, " ");
    if (remPunct.match(/[.?;]/g)) engPunctBad.push(loc);
  }
}
check("U2 english: no banned Latin frame words in the frame remainder (Q+E)", engFrameBad.length === 0, engFrameBad.slice(0, 5).join(" | "));
check("U2 english: no Latin . ? ; punctuation in the frame remainder (Q+E; ellipsis runs allowed)", engPunctBad.length === 0, engPunctBad.slice(0, 5).join(", "));
const engOptUrdu = engPairs.filter(([l, v]) => l.includes("options_ur") && /[\u0600-\u06FF]/.test(v ?? ""));
check("U2 english: all 2000 options_ur elements pure English (zero Urdu-script runs)", engOptUrdu.length === 0, engOptUrdu.slice(0, 3).map(([l]) => l).join(", "));
const engHonor = engPairs.filter(([, v]) => HONOR_ABBR.test(v ?? ""));
check("U2 english: no Latin honorific abbreviations in any _ur field", engHonor.length === 0, engHonor.slice(0, 3).map(([l]) => l).join(", "));
const engArCodepoints = engPairs.filter(([, v]) => (v ?? "").includes(String.fromCharCode(0x064a)) || (v ?? "").includes(String.fromCharCode(0x0643)));
check("U2 english: no Arabic yeh/kaf codepoints (U+064A/U+0643) in any _ur field", engArCodepoints.length === 0, engArCodepoints.slice(0, 3).map(([l]) => l).join(", "));
let engEnScriptRuns = 0;
for (const q of eng) {
  engEnScriptRuns += (q.question.match(AR_RUN) || []).length + (q.explanation.match(AR_RUN) || []).length;
  q.options.forEach((o) => { engEnScriptRuns += (o.match(AR_RUN) || []).length; });
}
check("U2 english: zero Arabic-script runs in English fields (measured baseline; verbatim check vacuous)", engEnScriptRuns === 0, `got ${engEnScriptRuns}`);
const engUrText = engPairs.map(([, v]) => v ?? "").join("\n");
const engQEText = engQE.map(([, v]) => v ?? "").join("\n");
check("U2 english: glossary terms present (کلام کا کون سا جز, پَیسیو وائس, ان ڈائریکٹ اسپیچ, پریپوزیشن, آرٹیکل, زمانہ)",
  ["کلام کا کون سا جز", "پَیسیو وائس", "ان ڈائریکٹ اسپیچ", "پریپوزیشن", "آرٹیکل", "زمانہ"].every((t) => engQEText.includes(t)));
check("U2 english: glossary terms present (موضوعی جملہ, مرکب فعل, جیرنڈ, انفنیٹو, موڈل, فجائیہ, رپورٹنگ ورب, واول, کانسوننٹ)",
  ["موضوعی جملہ", "مرکب فعل", "جیرنڈ", "انفنیٹو", "موڈل", "فجائیہ", "رپورٹنگ ورب", "واول", "کانسوننٹ"].every((t) => engQEText.includes(t)));
const engCount = (re) => (engQEText.match(re) || []).length;
check("U2 english: exact counts — قابلِ شمار 15×, ناقابلِ شمار 11×, اجتماعی 7×, مجرد 2×",
  engCount(/قابلِ شمار/g) === 15 && engCount(/ناقابلِ شمار/g) === 11 && engCount(/اجتماعی/g) === 7 && engCount(/مجرد/g) === 2,
  `قابلِ شمار ${engCount(/قابلِ شمار/g)}, ناقابلِ شمار ${engCount(/ناقابلِ شمار/g)}, اجتماعی ${engCount(/اجتماعی/g)}, مجرد ${engCount(/مجرد/g)}`);
check("U2 english: exact counts — جیرنڈ 8×, انفنیٹو 8×, امریہ 8×, فجائیہ 5×, موضوعی جملہ 5×, مرکب فعل 6×, کلام کا کون سا جز 17×",
  engCount(/جیرنڈ/g) === 8 && engCount(/انفنیٹو/g) === 8 && engCount(/امریہ/g) === 8 && engCount(/فجائیہ/g) === 5 && engCount(/موضوعی جملہ/g) === 5 && engCount(/مرکب فعل/g) === 6 && engCount(/کلام کا کون سا جز/g) === 17,
  `جیرنڈ ${engCount(/جیرنڈ/g)}, انفنیٹو ${engCount(/انفنیٹو/g)}, امریہ ${engCount(/امریہ/g)}, فجائیہ ${engCount(/فجائیہ/g)}, موضوعی جملہ ${engCount(/موضوعی جملہ/g)}, مرکب فعل ${engCount(/مرکب فعل/g)}, کلام کا کون سا جز ${engCount(/کلام کا کون سا جز/g)}`);
check("U2 english: exact counts — شکل 31× (inflected forms), صورت 44× (named grammatical forms)",
  engCount(/شکل/g) === 31 && engCount(/صورت/g) === 44, `شکل ${engCount(/شکل/g)}, صورت ${engCount(/صورت/g)}`);
check("U2 english: Latin tense names present in _ur (past simple, present perfect, past participle)",
  ["past simple", "present perfect", "past participle"].every((t) => engQEText.toLowerCase().includes(t)));

// ---------- §3F Maths bank (U2 subject 5) ----------
// U2 rewrote the Maths _ur fields (691 of 3000 field-values changed;
// 275/500 items incl. 6 coordinator-normalization-only items).
// Numbers, equations, expressions and units are the TESTED MATERIAL:
// digit rule is STRICT on every field (2914/3000 fields carry digits;
// baseline measured 0 digit-multiset mismatches). Equations stay
// byte-identical. Latin rule is an ALLOWLIST: single letters (variables,
// labels) + the §3.1 set (SI units, function names, acronyms, variable
// products, Rs.) — no other Latin word may appear. Spelled-out English
// units in prose are gone (degrees→ڈگری 285×, years→سال, hours→گھنٹے,
// minutes→منٹ, seconds→سیکنڈ, days→دن, litres→لیٹر, sq→مربع,
// cubic→مکعب, square root→جذر المربع). Percentages in prose→فیصد;
// % survives only in calculation lines, bare-number options, and value
// references (MAT-082/083). Splits KEPT: تناسب (proportion, MAT-130
// only) vs نسبت (ratio); احاطہ (perimeter) vs محیط (circumference);
// مفرد (prime) vs مرکب (composite); عاد (number factors/divisors) vs
// عامل/عوامل (algebraic factors); مجموعہ = sum only (55×) vs سیٹ = set
// (60×) — the transliterated set family (سیٹ/یونین/انٹرسیکشن/ذیلی سیٹ)
// is kept because مجموعہ never means set and تقاطع already means
// cross-multiplication; زاویہ ارتفاع/انخفاض vs اونچائی (height);
// چت/پٹ/اکا for head/tail/ace (gap decisions, flagged for owner).
// ڈھلان is the single slope term (ڈھلوان normalized away, 6×).
// Coordinate compounds are hyphenated (x-محور, x-مختصہ, x-مقطع).
// The ؟ placeholder in number series (MAT-476..485) is a symbol
// standing for a number: "31، ؟" spacing is correct typography and
// exempt from the no-space-before-؟ rule; the Latin ? placeholder in
// MAT-164/169 questions is kept (inconsistent with ؟ — flagged).
const mat = JSON.parse(fs.readFileSync(join(ROOT, "src/data/banks/maths.json"), "utf8"));
check("U2 maths: 500 items", mat.length === 500, `got ${mat.length}`);
const matIdsOk = mat.every((q, i) => q.id === `MAT-${String(i + 1).padStart(3, "0")}`);
check("U2 maths: IDs MAT-001..MAT-500 in order", matIdsOk);
const matPairs = [];
for (const q of mat) {
  matPairs.push([`${q.id}:question_ur`, q.question_ur]);
  q.options_ur.forEach((o, i) => matPairs.push([`${q.id}:options_ur[${i}]`, o]));
  matPairs.push([`${q.id}:explanation_ur`, q.explanation_ur]);
}
const MAT_BANNED = [...CONTENT_BANNED, "چنیں", "مونث", "زوج", "فرد", "فریکشن", "نیومیریٹر", "ڈینومینیٹر", "فیکٹر", "ملٹیپل", "پرائم", "ایوریج", "میڈین", "موڈ", "پروبیبلٹی", "فنکشن", "ٹین", "سائن", "کوسائن", "رداس", "ڈھلوان"];
const matBanned = bannedHits(matPairs, MAT_BANNED);
check("U2 maths: no banned glossary/variant/transliteration terms in any _ur field (token-aware)", matBanned.length === 0, matBanned.slice(0, 5).join(", "));
const MAT_PHRASES = ["درج ذیل", "مربع جذر", "مطابق نمونہ", "مستقل رقم"];
const matPhrases = matPairs.filter(([, v]) => MAT_PHRASES.some((p) => (v ?? "").includes(p)));
check("U2 maths: no banned phrases in any _ur field (درج ذیل, مربع جذر, مطابق نمونہ, مستقل رقم)", matPhrases.length === 0, matPhrases.slice(0, 3).map(([l]) => l).join(", "));
const matEmdash = matPairs.filter(([, v]) => (v ?? "").includes("—"));
check("U2 maths: no em-dash in any _ur field", matEmdash.length === 0, matEmdash.slice(0, 3).map(([l]) => l).join(", "));
const matMarker = matPairs.filter(([, v]) => (v ?? "").includes("[Auto-Translated]"));
check("U2 maths: no '[Auto-Translated]' literal in any _ur field", matMarker.length === 0, matMarker.slice(0, 3).map(([l]) => l).join(", "));
const matMojibake = matPairs.filter(([, v]) => (v ?? "").includes("�"));
check("U2 maths: no U+FFFD in any _ur field", matMojibake.length === 0, matMojibake.slice(0, 3).map(([l]) => l).join(", "));
const matIndic = matPairs.filter(([, v]) => /[۰-۹]/.test(v ?? ""));
check("U2 maths: no Urdu-Indic digits in any _ur field", matIndic.length === 0, matIndic.slice(0, 3).map(([l]) => l).join(", "));
const matEllipsis = matPairs.filter(([, v]) => (v ?? "").includes("..."));
check("U2 maths: no ellipsis runs in any _ur field", matEllipsis.length === 0, matEllipsis.slice(0, 3).map(([l]) => l).join(", "));
let matDigitBad = [];
for (const q of mat) {
  if (!sameMultiset(digitRuns(q.question), digitRuns(q.question_ur))) matDigitBad.push(`${q.id}:question_ur`);
  q.options.forEach((o, i) => {
    if (!sameMultiset(digitRuns(o), digitRuns(q.options_ur[i]))) matDigitBad.push(`${q.id}:options_ur[${i}]`);
  });
  if (!sameMultiset(digitRuns(q.explanation), digitRuns(q.explanation_ur))) matDigitBad.push(`${q.id}:explanation_ur`);
}
check("U2 maths: digit preservation STRICT on all fields (questions/options/explanations)", matDigitBad.length === 0, matDigitBad.slice(0, 5).join(", "));
// Latin allowlist: single letters + the §3.1 set, nothing else.
const MAT_LATIN_ALLOWED = new Set(["cm", "km", "kg", "tan", "sin", "cos", "sec", "cosec", "cot", "log", "pi", "lcm", "hcf", "sas", "sss", "asa", "ssa", "rhs", "abc", "def", "pqr", "xyz", "lmn", "stu", "kx", "mx", "rs"]);
let matLatinBad = [];
for (const [loc, val] of matPairs) {
  for (const w of ((val ?? "").match(/[A-Za-z]+/g) || [])) {
    const lw = w.toLowerCase();
    if (lw.length > 1 && !MAT_LATIN_ALLOWED.has(lw)) matLatinBad.push(`${loc}:${w}`);
  }
}
check("U2 maths: Latin allowlist — every multi-letter Latin word in _ur is a unit/function/acronym/label", matLatinBad.length === 0, matLatinBad.slice(0, 5).join(" | "));
// Punctuation: Latin . ? ; only in the §5 exceptions (decimals, Rs.,
// a.m./p.m., and ? where the English field itself has ?); Latin comma
// only inside bracketed notation (depth-aware: (), [], {} incl. nested
// matrices and sets); no space before Urdu punctuation except the
// standalone ؟ series placeholder.
function matStripBrackets(s) {
  let out = "", depth = 0;
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
    else if (depth === 0) out += ch;
  }
  return out;
}
let matPunctBad = [], matCommaBad = [], matSpaceBad = [];
for (const q of mat) {
  const fields = [["question_ur", q.question_ur, q.question], ...q.options_ur.map((o, i) => [`options_ur[${i}]`, o, q.options[i]]), ["explanation_ur", q.explanation_ur, q.explanation]];
  for (const [loc, val, en] of fields) {
    let p = (val ?? "").replace(/\d\.\d/g, " ").replace(/Rs\./gi, " ").replace(/a\.m\./gi, " ").replace(/p\.m\./gi, " ");
    if ((en ?? "").includes("?")) p = p.replace(/\?/g, " ");
    if (p.match(/[.?;]/g)) matPunctBad.push(`${q.id}:${loc}`);
    if (matStripBrackets(p).includes(",")) matCommaBad.push(`${q.id}:${loc}`);
    const placeholderFree = (val ?? "").replace(/(^|[\s،])؟(?=[\s،:۔]|$)/g, "$1X");
    if (/ [،؟؛۔]/.test(placeholderFree)) matSpaceBad.push(`${q.id}:${loc}`);
  }
}
check("U2 maths: no Latin . ? ; punctuation outside the §5 exceptions", matPunctBad.length === 0, matPunctBad.slice(0, 5).join(", "));
check("U2 maths: no Latin comma outside bracketed notation", matCommaBad.length === 0, matCommaBad.slice(0, 5).join(", "));
check("U2 maths: no space before Urdu punctuation (standalone ؟ series placeholder exempt)", matSpaceBad.length === 0, matSpaceBad.slice(0, 5).join(", "));
const matHonor = matPairs.filter(([, v]) => HONOR_ABBR.test(v ?? ""));
check("U2 maths: no Latin honorific abbreviations in any _ur field", matHonor.length === 0, matHonor.slice(0, 3).map(([l]) => l).join(", "));
const matArCodepoints = matPairs.filter(([, v]) => (v ?? "").includes(String.fromCharCode(0x064a)) || (v ?? "").includes(String.fromCharCode(0x0643)));
check("U2 maths: no Arabic yeh/kaf codepoints (U+064A/U+0643) in any _ur field", matArCodepoints.length === 0, matArCodepoints.slice(0, 3).map(([l]) => l).join(", "));
let matEnScriptRuns = 0;
for (const q of mat) {
  matEnScriptRuns += (q.question.match(AR_RUN) || []).length + (q.explanation.match(AR_RUN) || []).length;
  q.options.forEach((o) => { matEnScriptRuns += (o.match(AR_RUN) || []).length; });
}
check("U2 maths: zero Arabic-script runs in English fields (measured baseline; verbatim check vacuous)", matEnScriptRuns === 0, `got ${matEnScriptRuns}`);
const matLatinQ = matPairs.filter(([, v]) => (v ?? "").includes("?")).map(([l]) => l);
check("U2 maths: Latin ? placeholder only in MAT-164 + MAT-169 questions",
  JSON.stringify(matLatinQ.sort()) === JSON.stringify(["MAT-164:question_ur", "MAT-169:question_ur"]), matLatinQ.join(", "));
const matUrText = matPairs.map(([, v]) => v ?? "").join("\n");
const matCount = (t) => matUrText.split(t).length - 1;
check("U2 maths: ؟ series placeholder typography — '، ؟' 10×, no '،؟', '؟ کی جگہ' 1×",
  matCount("، ؟") === 10 && matCount("،؟") === 0 && matCount("؟ کی جگہ") === 1,
  `، ؟ ${matCount("، ؟")}, ،؟ ${matCount("،؟")}, ؟ کی جگہ ${matCount("؟ کی جگہ")}`);
const matToks = matPairs.flatMap(([, v]) => tokens(v));
const matTokCount = (t) => matToks.filter((x) => x === t).length;
check("U2 maths: glossary terms present (ڈگری, جذر المربع, جذر المکعب, ضریب, ثابت جملہ, ہم جنس, استوانہ, ذوزنقہ, نصف قطر, ڈھلان)",
  ["ڈگری", "جذر المربع", "جذر المکعب", "ضریب", "ثابت جملہ", "ہم جنس", "استوانہ", "ذوزنقہ", "نصف قطر", "ڈھلان"].every((t) => matUrText.includes(t)));
check("U2 maths: glossary terms present (x-محور, x-مختصہ, x-مقطع, چت, پٹ, اکا, زاویہ ارتفاع, زاویہ انخفاض, 24 گھنٹے والی گھڑی, اعشاری عدد)",
  ["x-محور", "x-مختصہ", "x-مقطع", "چت", "پٹ", "اکا", "زاویہ ارتفاع", "زاویہ انخفاض", "24 گھنٹے والی گھڑی", "اعشاری عدد"].every((t) => matUrText.includes(t)));
check("U2 maths: exact counts — ڈگری 285×, فیصد 59×, سال 92×, گھنٹے 63×, منٹ 20×, سیکنڈ 8×, دن 16×, لیٹر 6× (substring counts)",
  matCount("ڈگری") === 285 && matCount("فیصد") === 59 && matCount("سال") === 92 && matCount("گھنٹے") === 63 && matCount("منٹ") === 20 && matCount("سیکنڈ") === 8 && matCount("دن") === 16 && matCount("لیٹر") === 6,
  `ڈگری ${matCount("ڈگری")}, فیصد ${matCount("فیصد")}, سال ${matCount("سال")}, گھنٹے ${matCount("گھنٹے")}, منٹ ${matCount("منٹ")}, سیکنڈ ${matCount("سیکنڈ")}, دن ${matCount("دن")}, لیٹر ${matCount("لیٹر")}`);
check("U2 maths: exact counts — جذر المربع 41×, جذر المکعب 2×, ضریب 8×, ثابت جملہ 6×, ہم جنس 2×, استوانہ 2×, ذوزنقہ 1×, ڈھلان 17×, نصف قطر 18×",
  matCount("جذر المربع") === 41 && matCount("جذر المکعب") === 2 && matCount("ضریب") === 8 && matCount("ثابت جملہ") === 6 && matCount("ہم جنس") === 2 && matCount("استوانہ") === 2 && matCount("ذوزنقہ") === 1 && matCount("ڈھلان") === 17 && matCount("نصف قطر") === 18,
  `جذر المربع ${matCount("جذر المربع")}, جذر المکعب ${matCount("جذر المکعب")}, ضریب ${matCount("ضریب")}, ثابت جملہ ${matCount("ثابت جملہ")}, ہم جنس ${matCount("ہم جنس")}, استوانہ ${matCount("استوانہ")}, ذوزنقہ ${matCount("ذوزنقہ")}, ڈھلان ${matCount("ڈھلان")}, نصف قطر ${matCount("نصف قطر")}`);
check("U2 maths: exact counts — مربع cm 67×, مربع m 9×, مکعب cm 15×, x-محور 7×, y-محور 10×, x-مختصہ 10×, y-مختصہ 1×, x-مقطع 5×, y-مقطع 5×",
  matCount("مربع cm") === 67 && matCount("مربع m") === 9 && matCount("مکعب cm") === 15 && matCount("x-محور") === 7 && matCount("y-محور") === 10 && matCount("x-مختصہ") === 10 && matCount("y-مختصہ") === 1 && matCount("x-مقطع") === 5 && matCount("y-مقطع") === 5,
  `مربع cm ${matCount("مربع cm")}, مربع m ${matCount("مربع m")}, مکعب cm ${matCount("مکعب cm")}, x-محور ${matCount("x-محور")}, y-محور ${matCount("y-محور")}, x-مختصہ ${matCount("x-مختصہ")}, y-مختصہ ${matCount("y-مختصہ")}, x-مقطع ${matCount("x-مقطع")}, y-مقطع ${matCount("y-مقطع")}`);
check("U2 maths: exact counts, token-aware splits — تناسب 1× vs نسبت 15×, احاطہ 14× vs محیط 8×, مجموعہ 55× vs سیٹ 60×, عاد 9× vs عوامل 3× + عامل 2×",
  matTokCount("تناسب") === 1 && matTokCount("نسبت") === 15 && matTokCount("احاطہ") === 14 && matTokCount("محیط") === 8 && matTokCount("مجموعہ") === 55 && matTokCount("سیٹ") === 60 && matTokCount("عاد") === 9 && matTokCount("عوامل") === 3 && matTokCount("عامل") === 2,
  `تناسب ${matTokCount("تناسب")}, نسبت ${matTokCount("نسبت")}, احاطہ ${matTokCount("احاطہ")}, محیط ${matTokCount("محیط")}, مجموعہ ${matTokCount("مجموعہ")}, سیٹ ${matTokCount("سیٹ")}, عاد ${matTokCount("عاد")}, عوامل ${matTokCount("عوامل")}, عامل ${matTokCount("عامل")}`);
check("U2 maths: exact counts — چت 12×, پٹ 11×, اکا 2× (token-aware; اکائی/بچتا substrings excluded), زاویہ ارتفاع 7×, زاویہ انخفاض 4×, جانچ 27×, اعشاری عدد 2×",
  matTokCount("چت") === 12 && matTokCount("پٹ") === 11 && matTokCount("اکا") === 2 && matCount("زاویہ ارتفاع") === 7 && matCount("زاویہ انخفاض") === 4 && matCount("جانچ") === 27 && matCount("اعشاری عدد") === 2,
  `چت ${matTokCount("چت")}, پٹ ${matTokCount("پٹ")}, اکا ${matTokCount("اکا")}, زاویہ ارتفاع ${matCount("زاویہ ارتفاع")}, زاویہ انخفاض ${matCount("زاویہ انخفاض")}, جانچ ${matCount("جانچ")}, اعشاری عدد ${matCount("اعشاری عدد")}`);
// % rule: prose % → فیصد (43 of 122 EN % signs removed); the 79 kept
// are calculation lines, bare-number options and value references
// (MAT-082/083). No % may ever be ADDED in _ur.
let matPctBad = [], matPctTotal = 0;
for (const q of mat) {
  const fields = [[q.question, q.question_ur], [q.explanation, q.explanation_ur], ...q.options.map((o, i) => [o, q.options_ur[i]])];
  for (const [en, ur] of fields) {
    const ce = (en.match(/%/g) || []).length, cu = (ur.match(/%/g) || []).length;
    matPctTotal += cu;
    if (cu > ce) matPctBad.push(q.id);
  }
}
check("U2 maths: % never added in any _ur field; 79 total kept (43 prose % → فیصد)", matPctBad.length === 0 && matPctTotal === 79, `added in ${matPctBad.slice(0, 3).join(", ")}, total ${matPctTotal}`);

// ---------- §3G Pak Studies bank (U2 subject 6) ----------
// U2 rewrote the Pak Studies _ur fields (118 of 3000 field-values
// changed; 91/500 items incl. 6 coordinator-normalization-only items).
// Dates, census figures, constitutional articles/amendments, and
// place/person names are the TESTED MATERIAL: digit rule is STRICT on
// questions/options (all 500) and explanations (PAK-046..500); the
// PAK-001..045 explanations keep the stage5e sub/super invariant
// (mixed-explanation echo: EN repeats each date twice, _ur once).
// Never "correct" a date, figure, or name. Dates stay day + Urdu
// month + year with digits preserved. Comma figures keep the EN
// format EVERYWHERE including prose (8,611 / 80,000) — the
// verbatim-option rule requires 40,000 in options and Q/E figures
// must stay consistent with the options as tested material; this
// overrides guide §6.2 (flagged for owner). Latin rule is an
// ALLOWLIST: single letters + K2 + CENTO/NATO/SEATO/RCD — the
// PAK-473 bare-acronym options stay Latin, byte-identical. Prose %
// → فیصد (PAK-411/412/443 explanations); % survives only in the 16
// bare-number options. Izafat is a PER-PHRASE convention in this
// bank, not a global rule: قراردادِ لاہور keeps its zer (guide
// §1.3), while قرارداد مقاصد / تحریک خلافت / اقوام متحدہ take the
// dominant zer-less forms (21×/13×/19×) — the tension is flagged
// for the owner. Splits KEPT (same EN, different Urdu grammar or
// register — not spelling variants): جداگانہ انتخاب (29×
// substring = 15 singular-only + 14 plural) vs جداگانہ انتخابات;
// مشترکہ انتخاب (7× substring = 5 + 2 plural); قرآن و سنت (1×,
// fixed phrase) vs قرآن اور سنت (9×); ووٹنگ (1×, activity sense)
// vs رائے دہی (4×, franchise sense); مقننہ (12×, generic) vs
// قانون ساز اسمبلی (4×, specific assemblies); فیڈریشن (4×, EN
// noun "federation") vs وفاق/وفاقی (different words); معاہدہ سندھ
// طاس (2×, sole form — the standard-order question is an owner
// call); مظفر آباد spaced (3×, sole form; asymmetry with joined
// حیدرآباد noted, no action); کس سال میں (8×) alongside کس سال
// (both grammatical). Sole forms kept: مجلس شوریٰ, معاہدۂ لکھنؤ,
// قرارداد پاکستان, باغ جناح, کوہ نمک, مفکر/مصور پاکستان, تحریک
// علی گڑھ, خلافت عثمانیہ. بنیادی جمہوریت پسند kept as-is (5×,
// established; flagged). The محمدن spelling survives ONLY inside
// the transliterated book title in PAK-108O3. No echo-gloss cases
// were found in this bank; no honorifics added.
const pak = JSON.parse(fs.readFileSync(join(ROOT, "src/data/banks/pakstudies.json"), "utf8"));
check("U2 pakstudies: 500 items", pak.length === 500, `got ${pak.length}`);
const pakIdsOk = pak.every((q, i) => q.id === `PAK-${String(i + 1).padStart(3, "0")}`);
check("U2 pakstudies: IDs PAK-001..PAK-500 in order", pakIdsOk);
const pakPairs = [];
for (const q of pak) {
  pakPairs.push([`${q.id}:question_ur`, q.question_ur]);
  q.options_ur.forEach((o, i) => pakPairs.push([`${q.id}:options_ur[${i}]`, o]));
  pakPairs.push([`${q.id}:explanation_ur`, q.explanation_ur]);
}
const PAK_BANNED = [...CONTENT_BANNED, "چنیں", "مونث", "قائداعظم", "وزیراعظم", "وژن", "خودمختاری", "کیسپین"];
const pakBanned = bannedHits(pakPairs, PAK_BANNED);
check("U2 pakstudies: no banned glossary/variant/transliteration terms in any _ur field (token-aware)", pakBanned.length === 0, pakBanned.slice(0, 5).join(", "));
const PAK_PHRASES = ["درج ذیل", "قرارداد لاہور", "قائدِ اعظم", "وزیرِ اعظم", "قراردادِ مقاصد", "تحریکِ خلافت", "اقوامِ متحدہ", "پر امن بقا", "آئین ساز باڈی", "آئین ساز اسمبلی", "ایک ایوانی", "پاکستان اسٹڈیز", "پاکستان سٹڈیز", "پاک اسٹڈیز", "بحیرہ کیسپین", "حیدر آباد", "قدیم ترین", "ہندوستان چھوڑو"];
const pakPhrases = pakPairs.filter(([, v]) => PAK_PHRASES.some((p) => (v ?? "").includes(p)));
check("U2 pakstudies: no banned phrases in any _ur field (variant spellings, zer-forms, dropped terms)", pakPhrases.length === 0, pakPhrases.slice(0, 3).map(([l]) => l).join(", "));
const pakEmdash = pakPairs.filter(([, v]) => (v ?? "").includes("—"));
check("U2 pakstudies: no em-dash in any _ur field", pakEmdash.length === 0, pakEmdash.slice(0, 3).map(([l]) => l).join(", "));
const pakMarker = pakPairs.filter(([, v]) => (v ?? "").includes("[Auto-Translated]"));
check("U2 pakstudies: no '[Auto-Translated]' literal in any _ur field", pakMarker.length === 0, pakMarker.slice(0, 3).map(([l]) => l).join(", "));
const pakMojibake = pakPairs.filter(([, v]) => (v ?? "").includes("�"));
check("U2 pakstudies: no U+FFFD in any _ur field", pakMojibake.length === 0, pakMojibake.slice(0, 3).map(([l]) => l).join(", "));
const pakIndic = pakPairs.filter(([, v]) => /[۰-۹]/.test(v ?? ""));
check("U2 pakstudies: no Urdu-Indic digits in any _ur field", pakIndic.length === 0, pakIndic.slice(0, 3).map(([l]) => l).join(", "));
const pakEllipsis = pakPairs.filter(([, v]) => (v ?? "").includes("...") || (v ?? "").includes("…"));
check("U2 pakstudies: no ellipsis runs in any _ur field", pakEllipsis.length === 0, pakEllipsis.slice(0, 3).map(([l]) => l).join(", "));
let pakDigitBad = [];
for (const q of pak) {
  if (!sameMultiset(digitRuns(q.question), digitRuns(q.question_ur))) pakDigitBad.push(`${q.id}:question_ur`);
  q.options.forEach((o, i) => {
    if (!sameMultiset(digitRuns(o), digitRuns(q.options_ur[i]))) pakDigitBad.push(`${q.id}:options_ur[${i}]`);
  });
  if (Number(q.id.slice(4)) > 45 && !sameMultiset(digitRuns(q.explanation), digitRuns(q.explanation_ur))) pakDigitBad.push(`${q.id}:explanation_ur`);
}
check("U2 pakstudies: digit preservation STRICT on questions/options (all 500) + explanations (PAK-046..500)", pakDigitBad.length === 0, pakDigitBad.slice(0, 5).join(", "));
function multisetSub(a, b) {
  const mA = {}; a.forEach((x) => { mA[x] = (mA[x] || 0) + 1; });
  const mB = {}; b.forEach((x) => { mB[x] = (mB[x] || 0) + 1; });
  return Object.entries(mA).every(([k, v]) => v <= (mB[k] || 0));
}
let pakSubBad = [];
for (const q of pak.slice(0, 45)) {
  const urD = digitRuns(q.explanation_ur), enD = digitRuns(q.explanationEn ?? ""), fullD = digitRuns(q.explanation ?? "");
  if (!multisetSub(enD, urD) || !multisetSub(urD, fullD)) pakSubBad.push(`${q.id}:explanation_ur`);
}
check("U2 pakstudies: PAK-001..045 explanations keep the stage5e sub/super digit invariant (explanationEn ⊆ _ur ⊆ full mixed explanation)", pakSubBad.length === 0, pakSubBad.slice(0, 5).join(", "));
// Latin allowlist: single letters (K in K2) + CENTO/NATO/SEATO/RCD, nothing else.
const PAK_LATIN_ALLOWED = new Set(["cento", "nato", "seato", "rcd"]);
let pakLatinBad = [];
for (const [loc, val] of pakPairs) {
  for (const w of ((val ?? "").match(/[A-Za-z]+/g) || [])) {
    const lw = w.toLowerCase();
    if (lw.length > 1 && !PAK_LATIN_ALLOWED.has(lw)) pakLatinBad.push(`${loc}:${w}`);
  }
}
check("U2 pakstudies: Latin allowlist — every multi-letter Latin word in _ur is CENTO/NATO/SEATO/RCD", pakLatinBad.length === 0, pakLatinBad.slice(0, 5).join(" | "));
let pakPunctBad = [], pakCommaBad = [], pakSpaceBad = [];
for (const q of pak) {
  const fields = [["question_ur", q.question_ur], ...q.options_ur.map((o, i) => [`options_ur[${i}]`, o]), ["explanation_ur", q.explanation_ur]];
  for (const [loc, val] of fields) {
    const p = (val ?? "").replace(/\d\.\d/g, " ");
    if (/[.?;]/.test(p)) pakPunctBad.push(`${q.id}:${loc}`);
    const stripped = (val ?? "").replace(/\d,\d/g, " ");
    if (stripped.includes(",")) pakCommaBad.push(`${q.id}:${loc}`);
    if (/ [،؟؛۔]/.test(val ?? "")) pakSpaceBad.push(`${q.id}:${loc}`);
  }
}
check("U2 pakstudies: no Latin . ? ; punctuation outside decimals (digit.digit)", pakPunctBad.length === 0, pakPunctBad.slice(0, 5).join(", "));
check("U2 pakstudies: Latin comma only between digits (comma figures)", pakCommaBad.length === 0, pakCommaBad.slice(0, 5).join(", "));
check("U2 pakstudies: no space before Urdu punctuation", pakSpaceBad.length === 0, pakSpaceBad.slice(0, 5).join(", "));
const pakHonor = pakPairs.filter(([, v]) => HONOR_ABBR.test(v ?? ""));
check("U2 pakstudies: no Latin honorific abbreviations in any _ur field", pakHonor.length === 0, pakHonor.slice(0, 3).map(([l]) => l).join(", "));
const pakArCodepoints = pakPairs.filter(([, v]) => (v ?? "").includes(String.fromCharCode(0x064a)) || (v ?? "").includes(String.fromCharCode(0x0643)));
check("U2 pakstudies: no Arabic yeh/kaf codepoints (U+064A/U+0643) in any _ur field", pakArCodepoints.length === 0, pakArCodepoints.slice(0, 3).map(([l]) => l).join(", "));
let pakEnScriptRuns = 0;
for (const q of pak) {
  pakEnScriptRuns += (q.question.match(AR_RUN) || []).length + (q.explanation.match(AR_RUN) || []).length;
  q.options.forEach((o) => { pakEnScriptRuns += (o.match(AR_RUN) || []).length; });
}
check("U2 pakstudies: zero Arabic-script runs in English fields (measured baseline)", pakEnScriptRuns === 0, `got ${pakEnScriptRuns}`);
const pakUrText = pakPairs.map(([, v]) => v ?? "").join("\n");
const pakCount = (t) => pakUrText.split(t).length - 1;
check("U2 pakstudies: glossary terms present (آئین, ترمیم, قرارداد, مردم شماری, تحریک, دستور ساز اسمبلی, جداگانہ انتخاب, مشترکہ انتخاب, بنیادی جمہوریت پسند, دریائے سندھ)",
  ["آئین", "ترمیم", "قرارداد", "مردم شماری", "تحریک", "دستور ساز اسمبلی", "جداگانہ انتخاب", "مشترکہ انتخاب", "بنیادی جمہوریت پسند", "دریائے سندھ"].every((t) => pakUrText.includes(t)));
check("U2 pakstudies: glossary terms present (اقوام متحدہ, عالمی بینک, تنظیم تعاون اسلامی, گورنر جنرل, مارشل لا, ڈومینین, خریف, ربیع, سطح مرتفع, مینگروو, مندرجہ ذیل, مطالعہ پاکستان, پرامن بقائے باہمی, آئین ساز مجلس, یک ایوانی, رائے دہی, بحیرہ قزوین, حیدرآباد, بنیادی غذا, خود مختاری, فیصد)",
  ["اقوام متحدہ", "عالمی بینک", "تنظیم تعاون اسلامی", "گورنر جنرل", "مارشل لا", "ڈومینین", "خریف", "ربیع", "سطح مرتفع", "مینگروو", "مندرجہ ذیل", "مطالعہ پاکستان", "پرامن بقائے باہمی", "آئین ساز مجلس", "یک ایوانی", "رائے دہی", "بحیرہ قزوین", "حیدرآباد", "بنیادی غذا", "خود مختاری", "فیصد"].every((t) => pakUrText.includes(t)));
check("U2 pakstudies: exact counts — قائد اعظم 16×, وزیر اعظم 72×, قراردادِ لاہور 8×, ویژن 9×, مطالعہ پاکستان 4×, پرامن بقائے باہمی 2×, مندرجہ ذیل 1× (substring counts)",
  pakCount("قائد اعظم") === 16 && pakCount("وزیر اعظم") === 72 && pakCount("قراردادِ لاہور") === 8 && pakCount("ویژن") === 9 && pakCount("مطالعہ پاکستان") === 4 && pakCount("پرامن بقائے باہمی") === 2 && pakCount("مندرجہ ذیل") === 1,
  `قائد اعظم ${pakCount("قائد اعظم")}, وزیر اعظم ${pakCount("وزیر اعظم")}, قراردادِ لاہور ${pakCount("قراردادِ لاہور")}, ویژن ${pakCount("ویژن")}, مطالعہ پاکستان ${pakCount("مطالعہ پاکستان")}, پرامن بقائے باہمی ${pakCount("پرامن بقائے باہمی")}, مندرجہ ذیل ${pakCount("مندرجہ ذیل")}`);
check("U2 pakstudies: exact counts — قرارداد مقاصد 21×, تحریک خلافت 13×, اقوام متحدہ 19×, دستور ساز اسمبلی 18×, آئین ساز مجلس 1×, یک ایوانی 2×, خود مختاری 7×, ہندوستان چھوڑ دو تحریک 6×",
  pakCount("قرارداد مقاصد") === 21 && pakCount("تحریک خلافت") === 13 && pakCount("اقوام متحدہ") === 19 && pakCount("دستور ساز اسمبلی") === 18 && pakCount("آئین ساز مجلس") === 1 && pakCount("یک ایوانی") === 2 && pakCount("خود مختاری") === 7 && pakCount("ہندوستان چھوڑ دو تحریک") === 6,
  `قرارداد مقاصد ${pakCount("قرارداد مقاصد")}, تحریک خلافت ${pakCount("تحریک خلافت")}, اقوام متحدہ ${pakCount("اقوام متحدہ")}, دستور ساز اسمبلی ${pakCount("دستور ساز اسمبلی")}, آئین ساز مجلس ${pakCount("آئین ساز مجلس")}, یک ایوانی ${pakCount("یک ایوانی")}, خود مختاری ${pakCount("خود مختاری")}, ہندوستان چھوڑ دو تحریک ${pakCount("ہندوستان چھوڑ دو تحریک")}`);
check("U2 pakstudies: exact counts — بحیرہ قزوین 2×, حیدرآباد 4×, بنیادی جمہوریت پسند 5×, بنیادی غذا 2×, فیصد 5×, جداگانہ انتخاب 29× (substring) + جداگانہ انتخابات 14×, مشترکہ انتخاب 7× (substring) + مشترکہ انتخابات 2×",
  pakCount("بحیرہ قزوین") === 2 && pakCount("حیدرآباد") === 4 && pakCount("بنیادی جمہوریت پسند") === 5 && pakCount("بنیادی غذا") === 2 && pakCount("فیصد") === 5 && pakCount("جداگانہ انتخاب") === 29 && pakCount("جداگانہ انتخابات") === 14 && pakCount("مشترکہ انتخاب") === 7 && pakCount("مشترکہ انتخابات") === 2,
  `بحیرہ قزوین ${pakCount("بحیرہ قزوین")}, حیدرآباد ${pakCount("حیدرآباد")}, بنیادی جمہوریت پسند ${pakCount("بنیادی جمہوریت پسند")}, بنیادی غذا ${pakCount("بنیادی غذا")}, فیصد ${pakCount("فیصد")}, جداگانہ انتخاب ${pakCount("جداگانہ انتخاب")}, جداگانہ انتخابات ${pakCount("جداگانہ انتخابات")}, مشترکہ انتخاب ${pakCount("مشترکہ انتخاب")}, مشترکہ انتخابات ${pakCount("مشترکہ انتخابات")}`);
check("U2 pakstudies: exact counts, kept splits — قرآن و سنت 1× vs قرآن اور سنت 9×, ووٹنگ 1× vs رائے دہی 4×, محمڈن 8× vs محمدن 1× (title only), معاہدہ سندھ طاس 2×, مقننہ 12× vs قانون ساز اسمبلی 4×, فیڈریشن 4×, مظفر آباد 3×",
  pakCount("قرآن و سنت") === 1 && pakCount("قرآن اور سنت") === 9 && pakCount("ووٹنگ") === 1 && pakCount("رائے دہی") === 4 && pakCount("محمڈن") === 8 && pakCount("محمدن") === 1 && pakCount("معاہدہ سندھ طاس") === 2 && pakCount("مقننہ") === 12 && pakCount("قانون ساز اسمبلی") === 4 && pakCount("فیڈریشن") === 4 && pakCount("مظفر آباد") === 3,
  `قرآن و سنت ${pakCount("قرآن و سنت")}, قرآن اور سنت ${pakCount("قرآن اور سنت")}, ووٹنگ ${pakCount("ووٹنگ")}, رائے دہی ${pakCount("رائے دہی")}, محمڈن ${pakCount("محمڈن")}, محمدن ${pakCount("محمدن")}, معاہدہ سندھ طاس ${pakCount("معاہدہ سندھ طاس")}, مقننہ ${pakCount("مقننہ")}, قانون ساز اسمبلی ${pakCount("قانون ساز اسمبلی")}, فیڈریشن ${pakCount("فیڈریشن")}, مظفر آباد ${pakCount("مظفر آباد")}`);
check("U2 pakstudies: exact counts, sole forms — مجلس شوریٰ 1×, معاہدۂ لکھنؤ 2×, قرارداد پاکستان 2×, باغ جناح 1×, کوہ نمک 3×, مفکر پاکستان 2×, مصور پاکستان 2×, تحریک علی گڑھ 4×, خلافت عثمانیہ 2×",
  pakCount("مجلس شوریٰ") === 1 && pakCount("معاہدۂ لکھنؤ") === 2 && pakCount("قرارداد پاکستان") === 2 && pakCount("باغ جناح") === 1 && pakCount("کوہ نمک") === 3 && pakCount("مفکر پاکستان") === 2 && pakCount("مصور پاکستان") === 2 && pakCount("تحریک علی گڑھ") === 4 && pakCount("خلافت عثمانیہ") === 2,
  `مجلس شوریٰ ${pakCount("مجلس شوریٰ")}, معاہدۂ لکھنؤ ${pakCount("معاہدۂ لکھنؤ")}, قرارداد پاکستان ${pakCount("قرارداد پاکستان")}, باغ جناح ${pakCount("باغ جناح")}, کوہ نمک ${pakCount("کوہ نمک")}, مفکر پاکستان ${pakCount("مفکر پاکستان")}, مصور پاکستان ${pakCount("مصور پاکستان")}, تحریک علی گڑھ ${pakCount("تحریک علی گڑھ")}, خلافت عثمانیہ ${pakCount("خلافت عثمانیہ")}`);
check("U2 pakstudies: exact counts — مارشل لا 12×, برصغیر 3×, دو قومی 6×, گورنر جنرل 18×, شملہ 22×, ڈھاکہ 23×, کوئٹہ 5×, راولپنڈی 10×, فیصل آباد 3×, اسلام آباد 21×, لاڑکانہ 3×",
  pakCount("مارشل لا") === 12 && pakCount("برصغیر") === 3 && pakCount("دو قومی") === 6 && pakCount("گورنر جنرل") === 18 && pakCount("شملہ") === 22 && pakCount("ڈھاکہ") === 23 && pakCount("کوئٹہ") === 5 && pakCount("راولپنڈی") === 10 && pakCount("فیصل آباد") === 3 && pakCount("اسلام آباد") === 21 && pakCount("لاڑکانہ") === 3,
  `مارشل لا ${pakCount("مارشل لا")}, برصغیر ${pakCount("برصغیر")}, دو قومی ${pakCount("دو قومی")}, گورنر جنرل ${pakCount("گورنر جنرل")}, شملہ ${pakCount("شملہ")}, ڈھاکہ ${pakCount("ڈھاکہ")}, کوئٹہ ${pakCount("کوئٹہ")}, راولپنڈی ${pakCount("راولپنڈی")}, فیصل آباد ${pakCount("فیصل آباد")}, اسلام آباد ${pakCount("اسلام آباد")}, لاڑکانہ ${pakCount("لاڑکانہ")}`);
check("U2 pakstudies: exact counts — آئین 99×, ترمیم 16×, مردم شماری 16×, دریائے سندھ 23×, عالمی بینک 5×, تنظیم تعاون اسلامی 6×, ڈومینین 14×, خریف 3×, ربیع 5×, سطح مرتفع 5×, مینگروو 3×, دو قومی نظریہ 5×",
  pakCount("آئین") === 99 && pakCount("ترمیم") === 16 && pakCount("مردم شماری") === 16 && pakCount("دریائے سندھ") === 23 && pakCount("عالمی بینک") === 5 && pakCount("تنظیم تعاون اسلامی") === 6 && pakCount("ڈومینین") === 14 && pakCount("خریف") === 3 && pakCount("ربیع") === 5 && pakCount("سطح مرتفع") === 5 && pakCount("مینگروو") === 3 && pakCount("دو قومی نظریہ") === 5,
  `آئین ${pakCount("آئین")}, ترمیم ${pakCount("ترمیم")}, مردم شماری ${pakCount("مردم شماری")}, دریائے سندھ ${pakCount("دریائے سندھ")}, عالمی بینک ${pakCount("عالمی بینک")}, تنظیم تعاون اسلامی ${pakCount("تنظیم تعاون اسلامی")}, ڈومینین ${pakCount("ڈومینین")}, خریف ${pakCount("خریف")}, ربیع ${pakCount("ربیع")}, سطح مرتفع ${pakCount("سطح مرتفع")}, مینگروو ${pakCount("مینگروو")}, دو قومی نظریہ ${pakCount("دو قومی نظریہ")}`);
// % rule: prose % → فیصد (3 explanations); the 16 kept are the
// bare-number options of PAK-132/411/412/443 (4 each). No % in any
// question or explanation. No % may ever be ADDED in _ur.
let pakPctBad = [], pakPctTotal = 0, pakPctQE = 0;
for (const q of pak) {
  const qe = (q.question_ur.match(/%/g) || []).length + (q.explanation_ur.match(/%/g) || []).length;
  pakPctQE += qe;
  const fields = [[q.question, q.question_ur], [q.explanation, q.explanation_ur], ...q.options.map((o, i) => [o, q.options_ur[i]])];
  for (const [en, ur] of fields) {
    const ce = (en.match(/%/g) || []).length, cu = (ur.match(/%/g) || []).length;
    pakPctTotal += cu;
    if (cu > ce) pakPctBad.push(q.id);
  }
}
check("U2 pakstudies: % never added in any _ur field; 16 total, all in bare-number options, 0 in questions/explanations", pakPctBad.length === 0 && pakPctTotal === 16 && pakPctQE === 0, `added in ${pakPctBad.slice(0, 3).join(", ")}, total ${pakPctTotal}, Q/E ${pakPctQE}`);

// ---------- §4 C2 flag-8 punctuation pins ----------
const analysisSrc = fs.readFileSync(join(ROOT, "src/app/analysis/page.tsx"), "utf8");
check("U1 punctuation: import message ends with ۔ in Urdu mode, . otherwise",
  analysisSrc.includes('(lang === "ur" ? "۔" : ".")'));
const mockSrc = fs.readFileSync(join(ROOT, "src/app/mock/[id]/page.tsx"), "utf8");
check("U1 punctuation: trusted-note separator is ۔ in Urdu mode, . otherwise",
  mockSrc.includes('{t("trustedNoteInMock")}{lang === "ur" ? "۔" : "."}') &&
  !mockSrc.includes('{t("trustedNoteInMock")}.'));

// ---------- §5 whole-tree mojibake scan (all surfaces, incl. un-rewritten) ----------
let treeBad = [];
const bankDir = join(ROOT, "src/data/banks");
for (const f of fs.readdirSync(bankDir).filter((x) => x.endsWith(".json"))) {
  if (fs.readFileSync(join(bankDir, f), "utf8").includes("�")) treeBad.push(f);
}
if (fs.readFileSync(join(ROOT, "src/data/content.json"), "utf8").includes("�")) treeBad.push("content.json");
if (i18nSrc.includes("�")) treeBad.push("i18n.tsx");
check("U1 tree: no U+FFFD in any bank, content.json, or i18n.tsx", treeBad.length === 0, treeBad.join(", "));

// ---------- summary ----------
if (failures > 0) {
  console.log(`\n${failures} idiomatic-Urdu test(s) FAILED.`);
  process.exit(1);
}
console.log("\nAll idiomatic-Urdu tests passed.");
