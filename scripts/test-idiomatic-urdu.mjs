// U1 idiomatic Urdu + UI/UX: glossary consistency, digit preservation,
// placeholder preservation, no-literal-marker audit, and the C2 flag-8
// punctuation pins. Scoped to the REWRITTEN surfaces only: chrome
// (700 STRINGS keys), notes/flashcards/plan/mocks (content.json _ur),
// the Islamiyat pilot bank (500 items, U1), the Tajweed bank
// (500 items, U2 subject 1), the Arabic bank (500 items, U2
// subject 2), the Urdu bank (500 items, U2 subject 3), the
// English bank (500 items, U2 subject 4), the Maths bank
// (500 items, U2 subject 5), the Pak Studies bank
// (500 items, U2 subject 6), the Pedagogy bank
// (500 items, U2 subject 7), the Science bank
// (500 items, U2 subject 8), the Social Studies bank
// (500 items, U2 subject 9), the GK bank
// (500 items, U2 subject 10), the IT bank
// (500 items, U2 subject 11) and the PE bank
// (500 items, U2 subject 12).
// The other 1 bank keeps its pre-U1 _ur
// wording until U2 and is NOT covered here (except the
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

// ---------- §3H Pedagogy bank (U2 subject 7) ----------
// U2 rewrote the Pedagogy _ur fields (339 of 3000 field-values
// changed; 212/500 items incl. 13 coordinator-normalization-only
// items). Pedagogy terminology is the TESTED MATERIAL: digit rule
// is STRICT on every field (all 500 questions, options, and
// explanations — no explanationEn, no mixed explanations,
// explanationUrdu null in all 500; baseline measured 0
// digit-multiset mismatches). Latin rule is an ALLOWLIST: single
// letters (option labels A–E in PED-324E, class labels A/B in
// PED-410Q, the letter S in PED-241Q) + ABCD (PED-243Q/244Q) +
// ZPD (gloss in PED-026E only). No Latin comma anywhere (EN
// commas 1100× all render as ،); no Latin . ? ; outside decimals.
// % survives only in the 8 bare-number options of PED-414/418
// (4 each); prose % → فیصد everywhere (13×). Splits KEPT (same
// EN, different sense, cluster, or grammar — not spelling
// variants): تقویم (13×, ONLY the 290/291/292/298 distinction
// cluster where assessment-vs-evaluation is the tested content)
// vs جائزہ (128×, everywhere else incl. course/programme/
// curriculum evaluation and Bloom's جائزہ لینا level —
// collapsing 337/387's تشکیلی/اختتامی جائزہ toward تقویم would
// split the formative/summative type names); سلیبس (12×, ONLY
// the technical curriculum-vs-syllabus distinction in
// 356/357/367/369) vs نصاب (185× substring, loose "course
// content" senses — guide §2A bans سلیبس; collapsing breaks
// PED-357, flagged as a guide conflict); گریڈ/گریڈنگ (14×/6×,
// grading system) vs درجہ بندی (50×, taxonomy + rating scale +
// rank ordering — collapsing collides); گروپ (17×, بز گروپ term
// + statistics comparison/norm group) vs گروہ (68×, all other
// generic groups); ٹیسٹ (70×, instrument/type) vs امتحان (66×,
// school-exam event/score + all EN "exam"); علمی (9×, Bloom's
// cognitive domain) vs ادراکی (11×, cognitive style only);
// شاگرد (15×, EN "pupil" only, guide-sanctioned) vs طالب علم /
// طلبہ / سیکھنے والا (student/learner); جماعت (60×, grade +
// formal class) vs standalone کلاس (group/setting senses +
// کلاس کوئز / کلاس رجسٹر compounds); نظام الاوقات (16×) vs
// ٹائم ٹیبل (3×, brief-protected); منصوبہ بند (38×) vs منصوبہ
// بندی شدہ (4×, parallel-participle + definition formula);
// کنٹرول (4×, managerial/behavioral) vs قابو (13×, mastery +
// overcome); مکمل (54×, complete) vs پورا (21×, whole);
// انفرادی (34×, individual) vs ذاتی (33×, personal); سمارٹ
// (2×, acronym kept transliterated, expansion in options —
// guide §5.1 Latin tension flagged, no Latin introduced).
// Coinages (flagged for owner): لمس سے سیکھنے والے (tactile),
// زبانی سیکھنے والے (verbal), پڑھانے والے طالب علم/طلبہ
// (tutor), بالغ عمر (adulthood, PED-051E), کثیر الوقوع (mode,
// Maths-aligned). Fidelity fixes (EN-mirroring, not fact
// changes): PED-335/336/337 تشخیص→جائزہ (EN "evaluation";
// تشخیص now diagnosis-only, PED-377 contrast clean);
// PED-352Q dropped a _ur-only second question; PED-370O1 مشاہد→
// مبصر; PED-305E "have not mastered" restored; PED-397E "to
// users" restored. PED-051 EN defect mirrored (Q asks "which
// stage", options are age ranges). PED-387O0 مجموعی جائزہ for
// "Summative evaluation" deliberately NOT اختتامی جائزہ (O3
// already uses it for "Terminal evaluation"). No echo-gloss
// cases; no honorifics added; theorist spellings uniform
// (وائیگاٹسکی, میسلو, پیاجے, سکنر, گارڈنر, برونر, ایرکسن,
// پاولوف, ڈیوی, مونٹیسوری, ہربارٹ, روسو, ٹائلر, ٹابا,
// کلپٹرک, کراتھول, اینڈرسن, سٹرن, بلوم).
const ped = JSON.parse(fs.readFileSync(join(ROOT, "src/data/banks/pedagogy.json"), "utf8"));
check("U2 pedagogy: 500 items", ped.length === 500, `got ${ped.length}`);
const pedIdsOk = ped.every((q, i) => q.id === `PED-${String(i + 1).padStart(3, "0")}`);
check("U2 pedagogy: IDs PED-001..PED-500 in order", pedIdsOk);
const pedPairs = [];
for (const q of ped) {
  pedPairs.push([`${q.id}:question_ur`, q.question_ur]);
  q.options_ur.forEach((o, i) => pedPairs.push([`${q.id}:options_ur[${i}]`, o]));
  pedPairs.push([`${q.id}:explanation_ur`, q.explanation_ur]);
}
const PED_BANNED = [...CONTENT_BANNED, "چنیں", "مونث", "مؤنث", "فارمیٹو", "سمٹیو", "سمیٹو", "ڈائیگناسٹک", "اسیسمنٹ", "اسکورز", "اسکورنگ", "فیڈ", "فیڈبیک", "لرنر", "لرنرز", "ویژول", "آڈیٹری", "ٹیکٹائل", "وربل", "ڈایاگرام", "کنیس", "اسکیفولڈنگ", "سرپل", "وائگٹسکی", "وائگوتسکی", "ماسلو", "ایریکسن", "اسپیچ", "پرائیویٹ", "گرامر", "ٹیکسانومی", "موڈ", "ٹیوٹر", "کشاکش", "بداعتمادی", "خودمختاری", "خوشخطی", "مشاہد", "ٹرم", "معاشرتی", "تعمیم", "مؤثر", "فورا", "تقریبا", "مثلا", "نسبتا"];
const pedBanned = bannedHits(pedPairs, PED_BANNED);
check("U2 pedagogy: no banned glossary/variant/transliteration terms in any _ur field (token-aware)", pedBanned.length === 0, pedBanned.slice(0, 5).join(", "));
const PED_PHRASES = ["درج ذیل", "کمرہ جماعت", "زون آف پراکسیمل", "پورے کلاس", "بہتر طور پر", "ہینڈز آن", "لیسن پلان", "جب کہ", "منتخب کریں", "تشخیص کنندگان", "مضمون والے", "نارم حوالہ", "کثیر الانتخابی", "سہار بندی", "سہارا دینے والی", "احساسِ جرم", "محنت بمقابلہ کمتری", "لگ بھگ", "سرپل نصاب", "فارمیٹو اسیسمنٹ", "سمٹیو اسیسمنٹ", "ڈائیگناسٹک اسیسمنٹ", "فیڈ بیک", "معمول کی کلاس روم میں"];
const pedPhrases = pedPairs.filter(([, v]) => PED_PHRASES.some((p) => (v ?? "").includes(p)));
check("U2 pedagogy: no banned phrases in any _ur field (variant spellings, dropped terms, agreement fix)", pedPhrases.length === 0, pedPhrases.slice(0, 3).map(([l]) => l).join(", "));
const pedEmdash = pedPairs.filter(([, v]) => (v ?? "").includes("—"));
check("U2 pedagogy: no em-dash in any _ur field", pedEmdash.length === 0, pedEmdash.slice(0, 3).map(([l]) => l).join(", "));
const pedMarker = pedPairs.filter(([, v]) => (v ?? "").includes("[Auto-Translated]"));
check("U2 pedagogy: no '[Auto-Translated]' literal in any _ur field", pedMarker.length === 0, pedMarker.slice(0, 3).map(([l]) => l).join(", "));
const pedMojibake = pedPairs.filter(([, v]) => (v ?? "").includes("�"));
check("U2 pedagogy: no U+FFFD in any _ur field", pedMojibake.length === 0, pedMojibake.slice(0, 3).map(([l]) => l).join(", "));
const pedIndic = pedPairs.filter(([, v]) => /[۰-۹]/.test(v ?? ""));
check("U2 pedagogy: no Urdu-Indic digits in any _ur field", pedIndic.length === 0, pedIndic.slice(0, 3).map(([l]) => l).join(", "));
const pedEllipsis = pedPairs.filter(([, v]) => (v ?? "").includes("...") || (v ?? "").includes("…"));
check("U2 pedagogy: no ellipsis runs in any _ur field", pedEllipsis.length === 0, pedEllipsis.slice(0, 3).map(([l]) => l).join(", "));
let pedDigitBad = [];
for (const q of ped) {
  if (!sameMultiset(digitRuns(q.question), digitRuns(q.question_ur))) pedDigitBad.push(`${q.id}:question_ur`);
  q.options.forEach((o, i) => {
    if (!sameMultiset(digitRuns(o), digitRuns(q.options_ur[i]))) pedDigitBad.push(`${q.id}:options_ur[${i}]`);
  });
  if (!sameMultiset(digitRuns(q.explanation), digitRuns(q.explanation_ur))) pedDigitBad.push(`${q.id}:explanation_ur`);
}
check("U2 pedagogy: digit preservation STRICT on every field (all 500 questions, options, explanations)", pedDigitBad.length === 0, pedDigitBad.slice(0, 5).join(", "));
// Latin allowlist: single letters + ABCD + ZPD, nothing else.
const PED_LATIN_ALLOWED = new Set(["abcd", "zpd"]);
let pedLatinBad = [];
for (const [loc, val] of pedPairs) {
  for (const w of ((val ?? "").match(/[A-Za-z]+/g) || [])) {
    const lw = w.toLowerCase();
    if (lw.length > 1 && !PED_LATIN_ALLOWED.has(lw)) pedLatinBad.push(`${loc}:${w}`);
  }
}
check("U2 pedagogy: Latin allowlist — every multi-letter Latin word in _ur is ABCD or ZPD", pedLatinBad.length === 0, pedLatinBad.slice(0, 5).join(" | "));
let pedPunctBad = [], pedCommaBad = [], pedSpaceBad = [];
for (const q of ped) {
  const fields = [["question_ur", q.question_ur], ...q.options_ur.map((o, i) => [`options_ur[${i}]`, o]), ["explanation_ur", q.explanation_ur]];
  for (const [loc, val] of fields) {
    const p = (val ?? "").replace(/\d\.\d/g, " ");
    if (/[.?;]/.test(p)) pedPunctBad.push(`${q.id}:${loc}`);
    if ((val ?? "").includes(",")) pedCommaBad.push(`${q.id}:${loc}`);
    if (/ [،؟؛۔]/.test(val ?? "")) pedSpaceBad.push(`${q.id}:${loc}`);
  }
}
check("U2 pedagogy: no Latin . ? ; punctuation outside decimals (digit.digit)", pedPunctBad.length === 0, pedPunctBad.slice(0, 5).join(", "));
check("U2 pedagogy: no Latin comma in any _ur field (EN commas render as ،)", pedCommaBad.length === 0, pedCommaBad.slice(0, 5).join(", "));
check("U2 pedagogy: no space before Urdu punctuation", pedSpaceBad.length === 0, pedSpaceBad.slice(0, 5).join(", "));
const pedHonor = pedPairs.filter(([, v]) => HONOR_ABBR.test(v ?? ""));
check("U2 pedagogy: no Latin honorific abbreviations in any _ur field", pedHonor.length === 0, pedHonor.slice(0, 3).map(([l]) => l).join(", "));
const pedArCodepoints = pedPairs.filter(([, v]) => (v ?? "").includes(String.fromCharCode(0x064a)) || (v ?? "").includes(String.fromCharCode(0x0643)));
check("U2 pedagogy: no Arabic yeh/kaf codepoints (U+064A/U+0643) in any _ur field", pedArCodepoints.length === 0, pedArCodepoints.slice(0, 3).map(([l]) => l).join(", "));
let pedEnScriptRuns = 0;
for (const q of ped) {
  pedEnScriptRuns += (q.question.match(AR_RUN) || []).length + (q.explanation.match(AR_RUN) || []).length;
  q.options.forEach((o) => { pedEnScriptRuns += (o.match(AR_RUN) || []).length; });
}
check("U2 pedagogy: zero Arabic-script runs in English fields (measured baseline)", pedEnScriptRuns === 0, `got ${pedEnScriptRuns}`);
const pedUrText = pedPairs.map(([, v]) => v ?? "").join("\n");
const pedCount = (t) => pedUrText.split(t).length - 1;
check("U2 pedagogy: glossary terms present (کلاس روم, تشکیلی جائزہ, اختتامی جائزہ, تشخیصی جائزہ, بازخورد, مندرجہ ذیل, سبق کا منصوبہ, حلزونی نصاب, قربِ نشوونما, سکیفولڈنگ, نمبر بندی, خرد تدریس, تقویم, جائزہ, نظر ثانی, درجہ بندی, نصاب, جائزہ لینا)",
  ["کلاس روم", "تشکیلی جائزہ", "اختتامی جائزہ", "تشخیصی جائزہ", "بازخورد", "مندرجہ ذیل", "سبق کا منصوبہ", "حلزونی نصاب", "قربِ نشوونما", "سکیفولڈنگ", "نمبر بندی", "خرد تدریس", "تقویم", "جائزہ", "نظر ثانی", "درجہ بندی", "نصاب", "جائزہ لینا"].every((t) => pedUrText.includes(t)));
check("U2 pedagogy: glossary terms present (وائیگاٹسکی, میسلو, پیاجے, بلوم, ٹائلر, ٹابا, ڈسٹریکٹر, سٹیم, روبرک, پرسنٹائل, تھنک پیئر شیئر, ایس ایل او, کثیر الوقوع, عمومیت, کثیر انتخابی, انشائی, علمی پہلو, ادراکی اسلوب, نفسی حرکی, سلیبس, گریڈ, نظام الاوقات, موسیقی ذہانت, جگسا)",
  ["وائیگاٹسکی", "میسلو", "پیاجے", "بلوم", "ٹائلر", "ٹابا", "ڈسٹریکٹر", "سٹیم", "روبرک", "پرسنٹائل", "تھنک پیئر شیئر", "ایس ایل او", "کثیر الوقوع", "عمومیت", "کثیر انتخابی", "انشائی", "علمی پہلو", "ادراکی اسلوب", "نفسی حرکی", "سلیبس", "گریڈ", "نظام الاوقات", "موسیقی ذہانت", "جگسا"].every((t) => pedUrText.includes(t)));
check("U2 pedagogy: exact counts — کلاس روم 85×, تشکیلی جائزہ 13×, اختتامی جائزہ 9×, تشخیصی جائزہ 9×, بازخورد 19×, مندرجہ ذیل 4×, سبق کا منصوبہ 8×, سبق کے منصوبے 4×, حلزونی نصاب 2×, قربِ نشوونما 6×, سکیفولڈنگ 12×, نمبر بندی 4×, نمبر 144×, چیزیں 3×, چیزوں 16×, جذر المربع 1×, جذر 1× (substring counts)",
  pedCount("کلاس روم") === 85 && pedCount("تشکیلی جائزہ") === 13 && pedCount("اختتامی جائزہ") === 9 && pedCount("تشخیصی جائزہ") === 9 && pedCount("بازخورد") === 19 && pedCount("مندرجہ ذیل") === 4 && pedCount("سبق کا منصوبہ") === 8 && pedCount("سبق کے منصوبے") === 4 && pedCount("حلزونی نصاب") === 2 && pedCount("قربِ نشوونما") === 6 && pedCount("سکیفولڈنگ") === 12 && pedCount("نمبر بندی") === 4 && pedCount("نمبر") === 144 && pedCount("چیزیں") === 3 && pedCount("چیزوں") === 16 && pedCount("جذر المربع") === 1 && pedCount("جذر") === 1,
  `کلاس روم ${pedCount("کلاس روم")}, تشکیلی جائزہ ${pedCount("تشکیلی جائزہ")}, اختتامی جائزہ ${pedCount("اختتامی جائزہ")}, تشخیصی جائزہ ${pedCount("تشخیصی جائزہ")}, بازخورد ${pedCount("بازخورد")}, مندرجہ ذیل ${pedCount("مندرجہ ذیل")}, سبق کا منصوبہ ${pedCount("سبق کا منصوبہ")}, سبق کے منصوبے ${pedCount("سبق کے منصوبے")}, حلزونی نصاب ${pedCount("حلزونی نصاب")}, قربِ نشوونما ${pedCount("قربِ نشوونما")}, سکیفولڈنگ ${pedCount("سکیفولڈنگ")}, نمبر بندی ${pedCount("نمبر بندی")}, نمبر ${pedCount("نمبر")}, چیزیں ${pedCount("چیزیں")}, چیزوں ${pedCount("چیزوں")}, جذر المربع ${pedCount("جذر المربع")}, جذر ${pedCount("جذر")}`);
check("U2 pedagogy: exact counts — بصری/سماعی/حرکی سیکھنے والے 6× each, پڑھ کر/لمس سے/زبانی سیکھنے والے 1× each, خاکے 5×, نجی گفتگو 4×, اندرونی گفتگو 3×, سماجی گفتگو 2×, خرد تدریس 8×, وائیگاٹسکی 11×, میسلو 11×, پیاجے 13×, سکنر 4×, گارڈنر 8×, برونر 10×, ایرکسن 10×",
  pedCount("بصری سیکھنے والے") === 6 && pedCount("سماعی سیکھنے والے") === 6 && pedCount("حرکی سیکھنے والے") === 6 && pedCount("پڑھ کر سیکھنے والے") === 1 && pedCount("لمس سے سیکھنے والے") === 1 && pedCount("زبانی سیکھنے والے") === 1 && pedCount("خاکے") === 5 && pedCount("نجی گفتگو") === 4 && pedCount("اندرونی گفتگو") === 3 && pedCount("سماجی گفتگو") === 2 && pedCount("خرد تدریس") === 8 && pedCount("وائیگاٹسکی") === 11 && pedCount("میسلو") === 11 && pedCount("پیاجے") === 13 && pedCount("سکنر") === 4 && pedCount("گارڈنر") === 8 && pedCount("برونر") === 10 && pedCount("ایرکسن") === 10,
  `بصری ${pedCount("بصری سیکھنے والے")}, سماعی ${pedCount("سماعی سیکھنے والے")}, حرکی ${pedCount("حرکی سیکھنے والے")}, پڑھ کر ${pedCount("پڑھ کر سیکھنے والے")}, لمس سے ${pedCount("لمس سے سیکھنے والے")}, زبانی ${pedCount("زبانی سیکھنے والے")}, خاکے ${pedCount("خاکے")}, نجی گفتگو ${pedCount("نجی گفتگو")}, اندرونی گفتگو ${pedCount("اندرونی گفتگو")}, سماجی گفتگو ${pedCount("سماجی گفتگو")}, خرد تدریس ${pedCount("خرد تدریس")}, وائیگاٹسکی ${pedCount("وائیگاٹسکی")}, میسلو ${pedCount("میسلو")}, پیاجے ${pedCount("پیاجے")}, سکنر ${pedCount("سکنر")}, گارڈنر ${pedCount("گارڈنر")}, برونر ${pedCount("برونر")}, ایرکسن ${pedCount("ایرکسن")}`);
check("U2 pedagogy: exact counts — پاولوف 1×, ڈیوی 10×, مونٹیسوری 2×, ہربارٹ 5×, روسو 2×, ٹائلر 14×, ٹابا 14×, کلپٹرک 5×, کراتھول 2×, اینڈرسن 2×, سٹرن 7×, بلوم 10×, تقویم 13×, جائزہ 128×, تشخیص 20× (incl. تشخیصی 11×), نظر ثانی 18×, دہرائی 5×",
  pedCount("پاولوف") === 1 && pedCount("ڈیوی") === 10 && pedCount("مونٹیسوری") === 2 && pedCount("ہربارٹ") === 5 && pedCount("روسو") === 2 && pedCount("ٹائلر") === 14 && pedCount("ٹابا") === 14 && pedCount("کلپٹرک") === 5 && pedCount("کراتھول") === 2 && pedCount("اینڈرسن") === 2 && pedCount("سٹرن") === 7 && pedCount("بلوم") === 10 && pedCount("تقویم") === 13 && pedCount("جائزہ") === 128 && pedCount("تشخیص") === 20 && pedCount("تشخیصی") === 11 && pedCount("نظر ثانی") === 18 && pedCount("دہرائی") === 5,
  `پاولوف ${pedCount("پاولوف")}, ڈیوی ${pedCount("ڈیوی")}, مونٹیسوری ${pedCount("مونٹیسوری")}, ہربارٹ ${pedCount("ہربارٹ")}, روسو ${pedCount("روسو")}, ٹائلر ${pedCount("ٹائلر")}, ٹابا ${pedCount("ٹابا")}, کلپٹرک ${pedCount("کلپٹرک")}, کراتھول ${pedCount("کراتھول")}, اینڈرسن ${pedCount("اینڈرسن")}, سٹرن ${pedCount("سٹرن")}, بلوم ${pedCount("بلوم")}, تقویم ${pedCount("تقویم")}, جائزہ ${pedCount("جائزہ")}, تشخیص ${pedCount("تشخیص")}, تشخیصی ${pedCount("تشخیصی")}, نظر ثانی ${pedCount("نظر ثانی")}, دہرائی ${pedCount("دہرائی")}`);
check("U2 pedagogy: exact counts — پوری کلاس 6×, بہترین وضاحت 9×, بہترین تعریف 11×, عمومیت 6×, جبکہ 55×, فوراً 15×, تقریباً 17×, مثلاً 6×, نسبتاً 7×, موثر 12×, کثیر انتخابی 8×, انشائی 9×, جائزہ لینا 9×, مدت 11×, معمول کے کلاس روم میں 3×, معمول کی کلاس روم تدریس 1×",
  pedCount("پوری کلاس") === 6 && pedCount("بہترین وضاحت") === 9 && pedCount("بہترین تعریف") === 11 && pedCount("عمومیت") === 6 && pedCount("جبکہ") === 55 && pedCount("فوراً") === 15 && pedCount("تقریباً") === 17 && pedCount("مثلاً") === 6 && pedCount("نسبتاً") === 7 && pedCount("موثر") === 12 && pedCount("کثیر انتخابی") === 8 && pedCount("انشائی") === 9 && pedCount("جائزہ لینا") === 9 && pedCount("مدت") === 11 && pedCount("معمول کے کلاس روم میں") === 3 && pedCount("معمول کی کلاس روم تدریس") === 1,
  `پوری کلاس ${pedCount("پوری کلاس")}, بہترین وضاحت ${pedCount("بہترین وضاحت")}, بہترین تعریف ${pedCount("بہترین تعریف")}, عمومیت ${pedCount("عمومیت")}, جبکہ ${pedCount("جبکہ")}, فوراً ${pedCount("فوراً")}, تقریباً ${pedCount("تقریباً")}, مثلاً ${pedCount("مثلاً")}, نسبتاً ${pedCount("نسبتاً")}, موثر ${pedCount("موثر")}, کثیر انتخابی ${pedCount("کثیر انتخابی")}, انشائی ${pedCount("انشائی")}, جائزہ لینا ${pedCount("جائزہ لینا")}, مدت ${pedCount("مدت")}, معمول کے ${pedCount("معمول کے کلاس روم میں")}, معمول کی تدریس ${pedCount("معمول کی کلاس روم تدریس")}`);
check("U2 pedagogy: exact counts, kept transliterations — ڈسٹریکٹر 6× (incl. ڈسٹریکٹرز 4×), سٹیم 9×, آپشن 16×, تھنک پیئر شیئر 4×, این سی پی 2×, ایس ایل او 10×, ڈرائیو 1×, میٹا کوگنیٹو 2×, نارم 6×, پرسنٹائل 6×, روبرک 9×, ٹائم ٹیبل 3×, کریکولم 2×, واجبات 1×, چیک لسٹ 9×, بلیو پرنٹ 2×, مارک اسکیمیں 1×, پورٹ فولیو 4×, سیشن 6×",
  pedCount("ڈسٹریکٹر") === 6 && pedCount("ڈسٹریکٹرز") === 4 && pedCount("سٹیم") === 9 && pedCount("آپشن") === 16 && pedCount("تھنک پیئر شیئر") === 4 && pedCount("این سی پی") === 2 && pedCount("ایس ایل او") === 10 && pedCount("ڈرائیو") === 1 && pedCount("میٹا کوگنیٹو") === 2 && pedCount("نارم") === 6 && pedCount("پرسنٹائل") === 6 && pedCount("روبرک") === 9 && pedCount("ٹائم ٹیبل") === 3 && pedCount("کریکولم") === 2 && pedCount("واجبات") === 1 && pedCount("چیک لسٹ") === 9 && pedCount("بلیو پرنٹ") === 2 && pedCount("مارک اسکیمیں") === 1 && pedCount("پورٹ فولیو") === 4 && pedCount("سیشن") === 6,
  `ڈسٹریکٹر ${pedCount("ڈسٹریکٹر")}, ڈسٹریکٹرز ${pedCount("ڈسٹریکٹرز")}, سٹیم ${pedCount("سٹیم")}, آپشن ${pedCount("آپشن")}, تھنک پیئر شیئر ${pedCount("تھنک پیئر شیئر")}, این سی پی ${pedCount("این سی پی")}, ایس ایل او ${pedCount("ایس ایل او")}, ڈرائیو ${pedCount("ڈرائیو")}, میٹا کوگنیٹو ${pedCount("میٹا کوگنیٹو")}, نارم ${pedCount("نارم")}, پرسنٹائل ${pedCount("پرسنٹائل")}, روبرک ${pedCount("روبرک")}, ٹائم ٹیبل ${pedCount("ٹائم ٹیبل")}, کریکولم ${pedCount("کریکولم")}, واجبات ${pedCount("واجبات")}, چیک لسٹ ${pedCount("چیک لسٹ")}, بلیو پرنٹ ${pedCount("بلیو پرنٹ")}, مارک اسکیمیں ${pedCount("مارک اسکیمیں")}, پورٹ فولیو ${pedCount("پورٹ فولیو")}, سیشن ${pedCount("سیشن")}`);
check("U2 pedagogy: exact counts, kept splits A — سلیبس 12×, نصاب 185× (substring, incl. نصابی), گریڈ 14× (incl. گریڈنگ 6×), درجہ بندی 50×, گروپ 17×, گروہ 68×, ٹیسٹ 70×, امتحان 66×, کورس 18×, نظام الاوقات 16×, سمارٹ 2×, شیئر 6×, علمی 9×, ادراکی 11×, علمی پہلو 6×, ادراکی اسلوب 11×",
  pedCount("سلیبس") === 12 && pedCount("نصاب") === 185 && pedCount("گریڈ") === 14 && pedCount("گریڈنگ") === 6 && pedCount("درجہ بندی") === 50 && pedCount("گروپ") === 17 && pedCount("گروہ") === 68 && pedCount("ٹیسٹ") === 70 && pedCount("امتحان") === 66 && pedCount("کورس") === 18 && pedCount("نظام الاوقات") === 16 && pedCount("سمارٹ") === 2 && pedCount("شیئر") === 6 && pedCount("علمی") === 9 && pedCount("ادراکی") === 11 && pedCount("علمی پہلو") === 6 && pedCount("ادراکی اسلوب") === 11,
  `سلیبس ${pedCount("سلیبس")}, نصاب ${pedCount("نصاب")}, گریڈ ${pedCount("گریڈ")}, گریڈنگ ${pedCount("گریڈنگ")}, درجہ بندی ${pedCount("درجہ بندی")}, گروپ ${pedCount("گروپ")}, گروہ ${pedCount("گروہ")}, ٹیسٹ ${pedCount("ٹیسٹ")}, امتحان ${pedCount("امتحان")}, کورس ${pedCount("کورس")}, نظام الاوقات ${pedCount("نظام الاوقات")}, سمارٹ ${pedCount("سمارٹ")}, شیئر ${pedCount("شیئر")}, علمی ${pedCount("علمی")}, ادراکی ${pedCount("ادراکی")}, علمی پہلو ${pedCount("علمی پہلو")}, ادراکی اسلوب ${pedCount("ادراکی اسلوب")}`);
check("U2 pedagogy: exact counts, kept splits B — شاگرد 15×, جماعت 60×, ہم جماعت 20×, اسکول 121×, کلاس کوئز 1×, کلاس رجسٹر 1×, سیکھنے والا 31×, سیکھنے والے 110×, طالب علم 133×, طلبہ 219×, استاد 139×, خصوصی 39×, خاص 7×, انفرادی 34×, ذاتی 33×, مکمل 54×, پورا 21×, واضح 57×",
  pedCount("شاگرد") === 15 && pedCount("جماعت") === 60 && pedCount("ہم جماعت") === 20 && pedCount("اسکول") === 121 && pedCount("کلاس کوئز") === 1 && pedCount("کلاس رجسٹر") === 1 && pedCount("سیکھنے والا") === 31 && pedCount("سیکھنے والے") === 110 && pedCount("طالب علم") === 133 && pedCount("طلبہ") === 219 && pedCount("استاد") === 139 && pedCount("خصوصی") === 39 && pedCount("خاص") === 7 && pedCount("انفرادی") === 34 && pedCount("ذاتی") === 33 && pedCount("مکمل") === 54 && pedCount("پورا") === 21 && pedCount("واضح") === 57,
  `شاگرد ${pedCount("شاگرد")}, جماعت ${pedCount("جماعت")}, ہم جماعت ${pedCount("ہم جماعت")}, اسکول ${pedCount("اسکول")}, کلاس کوئز ${pedCount("کلاس کوئز")}, کلاس رجسٹر ${pedCount("کلاس رجسٹر")}, سیکھنے والا ${pedCount("سیکھنے والا")}, سیکھنے والے ${pedCount("سیکھنے والے")}, طالب علم ${pedCount("طالب علم")}, طلبہ ${pedCount("طلبہ")}, استاد ${pedCount("استاد")}, خصوصی ${pedCount("خصوصی")}, خاص ${pedCount("خاص")}, انفرادی ${pedCount("انفرادی")}, ذاتی ${pedCount("ذاتی")}, مکمل ${pedCount("مکمل")}, پورا ${pedCount("پورا")}, واضح ${pedCount("واضح")}`);
check("U2 pedagogy: exact counts, gap keeps — تعاونی 8×, دائمیت پسندی 7×, پیداواریت 11×, جمود 10×, لاشعوری 4×, مقصدی 9×, تدریسی 16×, مشق 49×, قواعد 34×, تقویت 21×, ترغیب 7×, اعتمادیت 18×, جوازیت 49×, معیار 65×, مقصد 56×, فیصد 13×, کشمکش 15×, بے اعتمادی 4×, پہل قدمی 6×, احساس جرم 6×, محنت بمقابلہ احساس کمتری 8×, خود مختاری 6×, خودمختار 1×",
  pedCount("تعاونی") === 8 && pedCount("دائمیت پسندی") === 7 && pedCount("پیداواریت") === 11 && pedCount("جمود") === 10 && pedCount("لاشعوری") === 4 && pedCount("مقصدی") === 9 && pedCount("تدریسی") === 16 && pedCount("مشق") === 49 && pedCount("قواعد") === 34 && pedCount("تقویت") === 21 && pedCount("ترغیب") === 7 && pedCount("اعتمادیت") === 18 && pedCount("جوازیت") === 49 && pedCount("معیار") === 65 && pedCount("مقصد") === 56 && pedCount("فیصد") === 13 && pedCount("کشمکش") === 15 && pedCount("بے اعتمادی") === 4 && pedCount("پہل قدمی") === 6 && pedCount("احساس جرم") === 6 && pedCount("محنت بمقابلہ احساس کمتری") === 8 && pedCount("خود مختاری") === 6 && pedCount("خودمختار") === 1,
  `تعاونی ${pedCount("تعاونی")}, دائمیت پسندی ${pedCount("دائمیت پسندی")}, پیداواریت ${pedCount("پیداواریت")}, جمود ${pedCount("جمود")}, لاشعوری ${pedCount("لاشعوری")}, مقصدی ${pedCount("مقصدی")}, تدریسی ${pedCount("تدریسی")}, مشق ${pedCount("مشق")}, قواعد ${pedCount("قواعد")}, تقویت ${pedCount("تقویت")}, ترغیب ${pedCount("ترغیب")}, اعتمادیت ${pedCount("اعتمادیت")}, جوازیت ${pedCount("جوازیت")}, معیار ${pedCount("معیار")}, مقصد ${pedCount("مقصد")}, فیصد ${pedCount("فیصد")}, کشمکش ${pedCount("کشمکش")}, بے اعتمادی ${pedCount("بے اعتمادی")}, پہل قدمی ${pedCount("پہل قدمی")}, احساس جرم ${pedCount("احساس جرم")}, محنت بمقابلہ احساس کمتری ${pedCount("محنت بمقابلہ احساس کمتری")}, خود مختاری ${pedCount("خود مختاری")}, خودمختار ${pedCount("خودمختار")}`);
check("U2 pedagogy: exact counts, more gap keeps — منصوبہ بند 38×, منصوبہ بندی شدہ 4×, وصول 5×, سینٹریشن 11×, سکیما 8×, پروبنگ 2×, شیڈول 11×, موسیقی ذہانت 6×, جگسا 6×, زمانی عمر 4×, انتظار کا وقت 2×, ڈیزائن 6×, ذہانت کا حصہ 1×, قابو شدہ 1×, گائیڈ 4×, کنٹرول 4×, قابو 13×, ہوم ورک 2×, رینک 4×, رینج 2×, کثیر الوقوع 9×, نفسی حرکی 4×, نفسی جنسی 3×, اکائی کا منصوبہ 4×, ہفتہ وار منصوبہ 2×, تشریح 4×, ذخیرہ الفاظ 1×, جوانی 2×, بالغ عمر 1×, بالغ 6×, سہارے 2×, ہم مرتبہ 1×, نصابی کتاب 26×, سماجی 47×, تاثرات 4×",
  pedCount("منصوبہ بند") === 38 && pedCount("منصوبہ بندی شدہ") === 4 && pedCount("وصول") === 5 && pedCount("سینٹریشن") === 11 && pedCount("سکیما") === 8 && pedCount("پروبنگ") === 2 && pedCount("شیڈول") === 11 && pedCount("موسیقی ذہانت") === 6 && pedCount("جگسا") === 6 && pedCount("زمانی عمر") === 4 && pedCount("انتظار کا وقت") === 2 && pedCount("ڈیزائن") === 6 && pedCount("ذہانت کا حصہ") === 1 && pedCount("قابو شدہ") === 1 && pedCount("گائیڈ") === 4 && pedCount("کنٹرول") === 4 && pedCount("قابو") === 13 && pedCount("ہوم ورک") === 2 && pedCount("رینک") === 4 && pedCount("رینج") === 2 && pedCount("کثیر الوقوع") === 9 && pedCount("نفسی حرکی") === 4 && pedCount("نفسی جنسی") === 3 && pedCount("اکائی کا منصوبہ") === 4 && pedCount("ہفتہ وار منصوبہ") === 2 && pedCount("تشریح") === 4 && pedCount("ذخیرہ الفاظ") === 1 && pedCount("جوانی") === 2 && pedCount("بالغ عمر") === 1 && pedCount("بالغ") === 6 && pedCount("سہارے") === 2 && pedCount("ہم مرتبہ") === 1 && pedCount("نصابی کتاب") === 26 && pedCount("سماجی") === 47 && pedCount("تاثرات") === 4,
  `منصوبہ بند ${pedCount("منصوبہ بند")}, منصوبہ بندی شدہ ${pedCount("منصوبہ بندی شدہ")}, وصول ${pedCount("وصول")}, سینٹریشن ${pedCount("سینٹریشن")}, سکیما ${pedCount("سکیما")}, پروبنگ ${pedCount("پروبنگ")}, شیڈول ${pedCount("شیڈول")}, موسیقی ذہانت ${pedCount("موسیقی ذہانت")}, جگسا ${pedCount("جگسا")}, زمانی عمر ${pedCount("زمانی عمر")}, انتظار کا وقت ${pedCount("انتظار کا وقت")}, ڈیزائن ${pedCount("ڈیزائن")}, ذہانت کا حصہ ${pedCount("ذہانت کا حصہ")}, قابو شدہ ${pedCount("قابو شدہ")}, گائیڈ ${pedCount("گائیڈ")}, کنٹرول ${pedCount("کنٹرول")}, قابو ${pedCount("قابو")}, ہوم ورک ${pedCount("ہوم ورک")}, رینک ${pedCount("رینک")}, رینج ${pedCount("رینج")}, کثیر الوقوع ${pedCount("کثیر الوقوع")}, نفسی حرکی ${pedCount("نفسی حرکی")}, نفسی جنسی ${pedCount("نفسی جنسی")}, اکائی کا منصوبہ ${pedCount("اکائی کا منصوبہ")}, ہفتہ وار منصوبہ ${pedCount("ہفتہ وار منصوبہ")}, تشریح ${pedCount("تشریح")}, ذخیرہ الفاظ ${pedCount("ذخیرہ الفاظ")}, جوانی ${pedCount("جوانی")}, بالغ عمر ${pedCount("بالغ عمر")}, بالغ ${pedCount("بالغ")}, سہارے ${pedCount("سہارے")}, ہم مرتبہ ${pedCount("ہم مرتبہ")}, نصابی کتاب ${pedCount("نصابی کتاب")}, سماجی ${pedCount("سماجی")}, تاثرات ${pedCount("تاثرات")}`);
// % rule: prose % → فیصد; the 8 kept are the bare-number options
// of PED-414/418 (4 each). No % in any question or explanation.
// No % may ever be ADDED in _ur.
let pedPctBad = [], pedPctTotal = 0, pedPctQE = 0;
for (const q of ped) {
  const qe = (q.question_ur.match(/%/g) || []).length + (q.explanation_ur.match(/%/g) || []).length;
  pedPctQE += qe;
  const fields = [[q.question, q.question_ur], [q.explanation, q.explanation_ur], ...q.options.map((o, i) => [o, q.options_ur[i]])];
  for (const [en, ur] of fields) {
    const ce = (en.match(/%/g) || []).length, cu = (ur.match(/%/g) || []).length;
    pedPctTotal += cu;
    if (cu > ce) pedPctBad.push(q.id);
  }
}
check("U2 pedagogy: % never added in any _ur field; 8 total, all in bare-number options, 0 in questions/explanations", pedPctBad.length === 0 && pedPctTotal === 8 && pedPctQE === 0, `added in ${pedPctBad.slice(0, 3).join(", ")}, total ${pedPctTotal}, Q/E ${pedPctQE}`);

// ---------- §3I Science bank (U2 subject 8) ----------
// U2 rewrote the Science _ur fields (229 of 3000 field-values
// changed; 127/500 items incl. 1 coordinator-normalization-only
// item, SCI-489). Scientific terms, chemical symbols/formulas,
// units and numbers are the TESTED MATERIAL: digit rule is
// STRICT on every field (all 500 questions, options, and
// explanations — baseline measured 0 digit-multiset mismatches,
// including 0 against explanationEn for the original 30).
// SCI-001..030 are the Phase 1 originals: stored `explanation`
// is a pure Roman-Urdu original, English lives in
// `explanationEn` (30 items); U2 took meaning from
// `explanationEn`. explanationUrdu is null in all 500.
// Latin rule is an ALLOWLIST: single letters (x, V, I, R, H,
// O) + exactly CO (inside CO2), NaCl, Fe, Na, pH — chemical
// symbols/formulas only. The SCI-016..030 Latin residue (~100
// words) was fully rewritten to Urdu (molecule→مالیکیول,
// Evaporation→تبخیر, Mercury→عطارد, Arctic Ocean→بحر منجمد
// شمالی, SI→ایس آئی, vacuum→خلا, Iron→لوہا, Heater→ہیٹر).
// Latin comma survives ONLY in the SCI-352 digit-group figures
// (5 fields: 300,000 / 150,000 / 200,000 / 250,000 — the
// digit-group multiset requires the comma); every other Latin
// . / , became ۔ / ، (the SCI-401..418 pocket). No % anywhere
// in _ur (فیصد 5×). Splits KEPT (same EN, different sense,
// cluster, or grammar — not spelling variants): کرنٹ (63×,
// Electricity cluster) vs برقی رو (5×, Measurement cluster
// 360/371/372); سیل (13×: seal animal 192 + electric cell
// 304/317/318/333 + solar cell 474) vs خلیہ (biology);
// ایسڈ (27×, only inside specific acid names) vs تیزاب (16×,
// generic); فنگس (9×, fungus) vs پھپھوندی (4×, mould);
// مزاحمت (13×, technical) vs رکاوٹ (4×, generic barrier);
// اساس (8×, chemical base) vs قلوی (4×, alkaline);
// سیریز/پیرالل سرکٹ vs سلسلہ وار/متوازی (adverbial); نمو
// (12×, growth) vs افزائش (1×, breeding); طاقت (11×, power)
// vs قوت (60×, force); مادہ (26×, matter) vs مواد (9×,
// material); پگھلنا (verb) vs پگھلاؤ (noun); آئرن (7×,
// nutrient/option-label + compound names آئرن سلفائیڈ/سلفیٹ)
// vs لوہا/لوہے (16×/17×, metal/material — within-item
// distinction in SCI-224Q); گروپ (8×, ONLY blood groups,
// SCI-054) vs گروہ (22×, everything else); ارتعاش (3×) vs
// تھرتھراہٹ (3×, 3:3 tie, crosses clusters at SCI-472E);
// بانڈ (12×, bond-type terms) vs بندھنوں (1×, generic
// chemical bonds, SCI-278E); آبی بخارات (5×, condensation
// cluster) vs پانی کے بخارات (7×, transpiration + humidity);
// تھایامین (2×, EN thiamine, vitamin) vs تھائمین (2×, EN
// thymine, DNA base — DIFFERENT EN words, not a split);
// سیٹلائٹ (1×, bare EN "Satellite" distractor, SCI-400O2 —
// سیارہ would collide with "planet") vs سیارہ/سیارے/سیاروں
// (planet/satellite compounds قدرتی/مصنوعی سیارہ);
// فائبر آپٹک (2×, EN "fibre optic") vs آپٹکل فائبر (2×, EN
// "optical fibre"). تبخیر (22×) renders BOTH EN "evaporation"
// and EN "transpiration" (no within-item collision; no
// attested alternative — flagged for owner). Normalizations:
// فوٹو سنتھیسز→ضیائی تالیف, پروڈیوسر→پیدا کنندہ,
// ہربیوور→سبزی خور, گوئٹر→گلھڑ, سالمہ→مالیکیول,
// فریکوئنسی→تعدد, سلفرک→سلفیورک, فارن ہائیٹ→فارن ہائٹ,
// تقریبا→تقریباً, فورا→فوراً, جب کہ→جبکہ, اگاؤ→جرمینیشن,
// زیرگی→پولینیشن, پھول والے→پھول دار, غذائی سلسلہ→غذائی
// زنجیر, اسکیلیٹل→ڈھانچے کا عضلہ, کارڈیک→دل کا عضلہ,
// تھائروکسین→تھائی راکسین, نشوونما کا ہارمون→نمو کا ہارمون,
// خونی خلیہ→خون کا خلیہ, شمسی پینل→سولر پینل,
// بجلی کی موٹر→برقی موٹر (coordinator, 6:1). Echo-glosses
// dropped: (سلیوا), (vacuum), Iron (لوہا), (ہربیوور).
// "Best described" calques restructured per guide §3.2
// (SCI-217/391/403/468). Fidelity fixes: SCI-009E ہضم شدہ
// restored, SCI-281Q شیلفوں (was الماریوں), SCI-458O3
// جوار بھاٹا کی توانائی (was wave energy), SCI-087O3
// ارادی عضلہ (was رضاکارانہ). Flagged facts mirrored, not
// resolved: SCI-054/078/292/293/297/301/352/410/414/449/450.
const sci = JSON.parse(fs.readFileSync(join(ROOT, "src/data/banks/science.json"), "utf8"));
check("U2 science: 500 items", sci.length === 500, `got ${sci.length}`);
const sciIdsOk = sci.every((q, i) => q.id === `SCI-${String(i + 1).padStart(3, "0")}`);
check("U2 science: IDs SCI-001..SCI-500 in order", sciIdsOk);
const sciPairs = [];
for (const q of sci) {
  sciPairs.push([`${q.id}:question_ur`, q.question_ur]);
  q.options_ur.forEach((o, i) => sciPairs.push([`${q.id}:options_ur[${i}]`, o]));
  sciPairs.push([`${q.id}:explanation_ur`, q.explanation_ur]);
}
const SCI_BANNED = [...CONTENT_BANNED, "چنیں", "مونث", "مؤنث", "فوٹو", "سنتھیسز", "پروڈیوسر", "ہربیوور", "گوئٹر", "سالمہ", "فریکوئنسی", "سلفرک", "تقریبا", "فورا", "سلیوا", "اسکیلیٹل", "کارڈیک", "تھائروکسین", "اگاؤ", "زیرگی", "خونی"];
const sciBanned = bannedHits(sciPairs, SCI_BANNED);
check("U2 science: no banned glossary/variant/transliteration terms in any _ur field (token-aware)", sciBanned.length === 0, sciBanned.slice(0, 5).join(", "));
const SCI_PHRASES = ["درج ذیل", "فارن ہائیٹ", "جب کہ", "ایک دفعہ", "بہتر طور پر", "بہتر بیان", "نشوونما کا ہارمون", "پھول والے", "غذائی سلسلہ", "شمسی پینل", "بجلی کی موٹر"];
const sciPhrases = sciPairs.filter(([, v]) => SCI_PHRASES.some((p) => (v ?? "").includes(p)));
check("U2 science: no banned phrases in any _ur field (variant spellings, dropped terms, calques)", sciPhrases.length === 0, sciPhrases.slice(0, 3).map(([l]) => l).join(", "));
const sciEmdash = sciPairs.filter(([, v]) => (v ?? "").includes("—"));
check("U2 science: no em-dash in any _ur field", sciEmdash.length === 0, sciEmdash.slice(0, 3).map(([l]) => l).join(", "));
const sciMarker = sciPairs.filter(([, v]) => (v ?? "").includes("[Auto-Translated]"));
check("U2 science: no '[Auto-Translated]' literal in any _ur field", sciMarker.length === 0, sciMarker.slice(0, 3).map(([l]) => l).join(", "));
const sciMojibake = sciPairs.filter(([, v]) => (v ?? "").includes("�"));
check("U2 science: no U+FFFD in any _ur field", sciMojibake.length === 0, sciMojibake.slice(0, 3).map(([l]) => l).join(", "));
const sciIndic = sciPairs.filter(([, v]) => /[۰-۹]/.test(v ?? ""));
check("U2 science: no Urdu-Indic digits in any _ur field", sciIndic.length === 0, sciIndic.slice(0, 3).map(([l]) => l).join(", "));
const sciEllipsis = sciPairs.filter(([, v]) => (v ?? "").includes("...") || (v ?? "").includes("…"));
check("U2 science: no ellipsis runs in any _ur field", sciEllipsis.length === 0, sciEllipsis.slice(0, 3).map(([l]) => l).join(", "));
let sciDigitBad = [];
for (const q of sci) {
  if (!sameMultiset(digitRuns(q.question), digitRuns(q.question_ur))) sciDigitBad.push(`${q.id}:question_ur`);
  q.options.forEach((o, i) => {
    if (!sameMultiset(digitRuns(o), digitRuns(q.options_ur[i]))) sciDigitBad.push(`${q.id}:options_ur[${i}]`);
  });
  if (!sameMultiset(digitRuns(q.explanation), digitRuns(q.explanation_ur))) sciDigitBad.push(`${q.id}:explanation_ur`);
}
check("U2 science: digit preservation STRICT on every field (all 500 questions, options, explanations)", sciDigitBad.length === 0, sciDigitBad.slice(0, 5).join(", "));
// Latin allowlist: single letters + CO/NaCl/Fe/Na/pH (chemical symbols/formulas), nothing else.
const SCI_LATIN_ALLOWED = new Set(["co", "nacl", "fe", "na", "ph"]);
let sciLatinBad = [];
const sciLatinWords = {};
for (const [loc, val] of sciPairs) {
  for (const w of ((val ?? "").match(/[A-Za-z]+/g) || [])) {
    const lw = w.toLowerCase();
    if (lw.length > 1) {
      sciLatinWords[w] = (sciLatinWords[w] || 0) + 1;
      if (!SCI_LATIN_ALLOWED.has(lw)) sciLatinBad.push(`${loc}:${w}`);
    }
  }
}
check("U2 science: Latin allowlist — every multi-letter Latin word in _ur is CO, NaCl, Fe, Na, or pH", sciLatinBad.length === 0, sciLatinBad.slice(0, 5).join(" | "));
check("U2 science: Latin inventory exact — CO 3×, NaCl 3×, Fe 3×, Na 3×, pH 4× (16 multi-letter words total)",
  sciLatinWords["CO"] === 3 && sciLatinWords["NaCl"] === 3 && sciLatinWords["Fe"] === 3 && sciLatinWords["Na"] === 3 && sciLatinWords["pH"] === 4 && Object.keys(sciLatinWords).length === 5,
  JSON.stringify(sciLatinWords));
let sciPunctBad = [], sciCommaBad = [], sciSpaceBad = [];
const sciCommaFields = [];
for (const q of sci) {
  const fields = [["question_ur", q.question_ur], ...q.options_ur.map((o, i) => [`options_ur[${i}]`, o]), ["explanation_ur", q.explanation_ur]];
  for (const [loc, val] of fields) {
    const p = (val ?? "").replace(/\d\.\d/g, " ");
    if (/[.?;]/.test(p)) sciPunctBad.push(`${q.id}:${loc}`);
    const c = (val ?? "").replace(/\d,\d/g, " ");
    if (c.includes(",")) sciCommaBad.push(`${q.id}:${loc}`);
    if ((val ?? "").includes(",")) sciCommaFields.push(`${q.id}:${loc}`);
    if (/ [،؟؛۔]/.test(val ?? "")) sciSpaceBad.push(`${q.id}:${loc}`);
  }
}
check("U2 science: no Latin . ? ; punctuation outside decimals (digit.digit)", sciPunctBad.length === 0, sciPunctBad.slice(0, 5).join(", "));
check("U2 science: Latin comma ONLY between digits, in exactly the 5 SCI-352 fields", sciCommaBad.length === 0 && sciCommaFields.length === 5 && sciCommaFields.every((l) => l.startsWith("SCI-352:")), `${sciCommaBad.slice(0, 3).join(", ")} / ${sciCommaFields.join(", ")}`);
check("U2 science: no space before Urdu punctuation", sciSpaceBad.length === 0, sciSpaceBad.slice(0, 5).join(", "));
const sciHonor = sciPairs.filter(([, v]) => HONOR_ABBR.test(v ?? ""));
check("U2 science: no Latin honorific abbreviations in any _ur field", sciHonor.length === 0, sciHonor.slice(0, 3).map(([l]) => l).join(", "));
const sciArCodepoints = sciPairs.filter(([, v]) => (v ?? "").includes(String.fromCharCode(0x064a)) || (v ?? "").includes(String.fromCharCode(0x0643)));
check("U2 science: no Arabic yeh/kaf codepoints (U+064A/U+0643) in any _ur field", sciArCodepoints.length === 0, sciArCodepoints.slice(0, 3).map(([l]) => l).join(", "));
let sciEnScriptRuns = 0;
for (const q of sci) {
  sciEnScriptRuns += (q.question.match(AR_RUN) || []).length + (q.explanation.match(AR_RUN) || []).length;
  q.options.forEach((o) => { sciEnScriptRuns += (o.match(AR_RUN) || []).length; });
}
check("U2 science: zero Arabic-script runs in English fields (measured baseline)", sciEnScriptRuns === 0, `got ${sciEnScriptRuns}`);
const sciUrText = sciPairs.map(([, v]) => v ?? "").join("\n");
const sciCount = (t) => sciUrText.split(t).length - 1;
check("U2 science: glossary terms present (ضیائی تالیف, خلیہ, مالیکیول, ایٹم, عضو, وٹامن, کشش ثقل, تبخیر, تکثیف, انجماد, پگھلاؤ, گلھڑ, پیدا کنندہ, سبزی خور, تعدد, سلفیورک, فارن ہائٹ, جبکہ, فوراً, تقریباً)",
  ["ضیائی تالیف", "خلیہ", "مالیکیول", "ایٹم", "عضو", "وٹامن", "کشش ثقل", "تبخیر", "تکثیف", "انجماد", "پگھلاؤ", "گلھڑ", "پیدا کنندہ", "سبزی خور", "تعدد", "سلفیورک", "فارن ہائٹ", "جبکہ", "فوراً", "تقریباً"].every((t) => sciUrText.includes(t)));
check("U2 science: glossary terms present (بحر منجمد شمالی, بحر اوقیانوس, بحر الکاہل, بحر ہند, ایس آئی, اکائی, نیوٹن, پاسکل, جول, واٹ, ہائیڈروجن, آکسیجن, نائٹروجن, کاربن ڈائی آکسائیڈ, قابل تجدید, پن بجلی, فوسل ایندھن, موصل, آئینہ, عدسہ)",
  ["بحر منجمد شمالی", "بحر اوقیانوس", "بحر الکاہل", "بحر ہند", "ایس آئی", "اکائی", "نیوٹن", "پاسکل", "جول", "واٹ", "ہائیڈروجن", "آکسیجن", "نائٹروجن", "کاربن ڈائی آکسائیڈ", "قابل تجدید", "پن بجلی", "فوسل ایندھن", "موصل", "آئینہ", "عدسہ"].every((t) => sciUrText.includes(t)));
check("U2 science: exact counts — ضیائی تالیف 25×, خلیہ 26×, خلیات 43×, خلیوں 12×, مالیکیول 20×, ایٹم 27× (incl. ایٹموں 7×), عضو 16×, وٹامن 44×, کشش ثقل 19×, تبخیر 22×, تکثیف 7×, انجماد 6×, پگھلاؤ 6×, ابال 2×, گلھڑ 6×, پیدا کنندہ 14×, سبزی خور 9×, تعدد 3×, سلفیورک 2×, فارن ہائٹ 14× (substring counts)",
  sciCount("ضیائی تالیف") === 25 && sciCount("خلیہ") === 26 && sciCount("خلیات") === 43 && sciCount("خلیوں") === 12 && sciCount("مالیکیول") === 20 && sciCount("ایٹم") === 27 && sciCount("ایٹموں") === 7 && sciCount("عضو") === 16 && sciCount("وٹامن") === 44 && sciCount("کشش ثقل") === 19 && sciCount("تبخیر") === 22 && sciCount("تکثیف") === 7 && sciCount("انجماد") === 6 && sciCount("پگھلاؤ") === 6 && sciCount("ابال") === 2 && sciCount("گلھڑ") === 6 && sciCount("پیدا کنندہ") === 14 && sciCount("سبزی خور") === 9 && sciCount("تعدد") === 3 && sciCount("سلفیورک") === 2 && sciCount("فارن ہائٹ") === 14,
  `ضیائی تالیف ${sciCount("ضیائی تالیف")}, خلیہ ${sciCount("خلیہ")}, خلیات ${sciCount("خلیات")}, خلیوں ${sciCount("خلیوں")}, مالیکیول ${sciCount("مالیکیول")}, ایٹم ${sciCount("ایٹم")}, ایٹموں ${sciCount("ایٹموں")}, عضو ${sciCount("عضو")}, وٹامن ${sciCount("وٹامن")}, کشش ثقل ${sciCount("کشش ثقل")}, تبخیر ${sciCount("تبخیر")}, تکثیف ${sciCount("تکثیف")}, انجماد ${sciCount("انجماد")}, پگھلاؤ ${sciCount("پگھلاؤ")}, ابال ${sciCount("ابال")}, گلھڑ ${sciCount("گلھڑ")}, پیدا کنندہ ${sciCount("پیدا کنندہ")}, سبزی خور ${sciCount("سبزی خور")}, تعدد ${sciCount("تعدد")}, سلفیورک ${sciCount("سلفیورک")}, فارن ہائٹ ${sciCount("فارن ہائٹ")}`);
check("U2 science: exact counts — جبکہ 53×, فوراً 6×, تقریباً 15×, فیصد 5×, جرمینیشن 5×, پولینیشن 7×, پھول دار 4×, غذائی زنجیر 13×, ڈھانچے کا عضلہ 3×, دل کا عضلہ 4×, تھائی راکسین 3×, نمو کا ہارمون 3×, خون کا خلیہ 2×, سولر پینل 4×, ہوائی توانائی 6×, نمکیات 6×, برقی موٹر 8×, بہترین وضاحت 4×, بہترین تعریف 1×, بہترین طور پر 1×, مائٹوکونڈریا 6×, ایک بار 5×",
  sciCount("جبکہ") === 53 && sciCount("فوراً") === 6 && sciCount("تقریباً") === 15 && sciCount("فیصد") === 5 && sciCount("جرمینیشن") === 5 && sciCount("پولینیشن") === 7 && sciCount("پھول دار") === 4 && sciCount("غذائی زنجیر") === 13 && sciCount("ڈھانچے کا عضلہ") === 3 && sciCount("دل کا عضلہ") === 4 && sciCount("تھائی راکسین") === 3 && sciCount("نمو کا ہارمون") === 3 && sciCount("خون کا خلیہ") === 2 && sciCount("سولر پینل") === 4 && sciCount("ہوائی توانائی") === 6 && sciCount("نمکیات") === 6 && sciCount("برقی موٹر") === 8 && sciCount("بہترین وضاحت") === 4 && sciCount("بہترین تعریف") === 1 && sciCount("بہترین طور پر") === 1 && sciCount("مائٹوکونڈریا") === 6 && sciCount("ایک بار") === 5,
  `جبکہ ${sciCount("جبکہ")}, فوراً ${sciCount("فوراً")}, تقریباً ${sciCount("تقریباً")}, فیصد ${sciCount("فیصد")}, جرمینیشن ${sciCount("جرمینیشن")}, پولینیشن ${sciCount("پولینیشن")}, پھول دار ${sciCount("پھول دار")}, غذائی زنجیر ${sciCount("غذائی زنجیر")}, ڈھانچے کا عضلہ ${sciCount("ڈھانچے کا عضلہ")}, دل کا عضلہ ${sciCount("دل کا عضلہ")}, تھائی راکسین ${sciCount("تھائی راکسین")}, نمو کا ہارمون ${sciCount("نمو کا ہارمون")}, خون کا خلیہ ${sciCount("خون کا خلیہ")}, سولر پینل ${sciCount("سولر پینل")}, ہوائی توانائی ${sciCount("ہوائی توانائی")}, نمکیات ${sciCount("نمکیات")}, برقی موٹر ${sciCount("برقی موٹر")}, بہترین وضاحت ${sciCount("بہترین وضاحت")}, بہترین تعریف ${sciCount("بہترین تعریف")}, بہترین طور پر ${sciCount("بہترین طور پر")}, مائٹوکونڈریا ${sciCount("مائٹوکونڈریا")}, ایک بار ${sciCount("ایک بار")}`);
check("U2 science: exact counts, kept splits A — کرنٹ 63×, برقی رو 5×, سیل 13×, ایسڈ 27×, تیزاب 16×, فنگس 9×, پھپھوندی 4×, مزاحمت 13×, رکاوٹ 4×, اساس 8×, قلوی 4×, سیریز 1×, پیرالل 1×, سلسلہ وار 1×, متوازی 6×, نمو 12×, افزائش 1×, طاقت 11×, قوت 60×, مادہ 26×, مواد 9×, پگھلنا 2×",
  sciCount("کرنٹ") === 63 && sciCount("برقی رو") === 5 && sciCount("سیل") === 13 && sciCount("ایسڈ") === 27 && sciCount("تیزاب") === 16 && sciCount("فنگس") === 9 && sciCount("پھپھوندی") === 4 && sciCount("مزاحمت") === 13 && sciCount("رکاوٹ") === 4 && sciCount("اساس") === 8 && sciCount("قلوی") === 4 && sciCount("سیریز") === 1 && sciCount("پیرالل") === 1 && sciCount("سلسلہ وار") === 1 && sciCount("متوازی") === 6 && sciCount("نمو") === 12 && sciCount("افزائش") === 1 && sciCount("طاقت") === 11 && sciCount("قوت") === 60 && sciCount("مادہ") === 26 && sciCount("مواد") === 9 && sciCount("پگھلنا") === 2,
  `کرنٹ ${sciCount("کرنٹ")}, برقی رو ${sciCount("برقی رو")}, سیل ${sciCount("سیل")}, ایسڈ ${sciCount("ایسڈ")}, تیزاب ${sciCount("تیزاب")}, فنگس ${sciCount("فنگس")}, پھپھوندی ${sciCount("پھپھوندی")}, مزاحمت ${sciCount("مزاحمت")}, رکاوٹ ${sciCount("رکاوٹ")}, اساس ${sciCount("اساس")}, قلوی ${sciCount("قلوی")}, سیریز ${sciCount("سیریز")}, پیرالل ${sciCount("پیرالل")}, سلسلہ وار ${sciCount("سلسلہ وار")}, متوازی ${sciCount("متوازی")}, نمو ${sciCount("نمو")}, افزائش ${sciCount("افزائش")}, طاقت ${sciCount("طاقت")}, قوت ${sciCount("قوت")}, مادہ ${sciCount("مادہ")}, مواد ${sciCount("مواد")}, پگھلنا ${sciCount("پگھلنا")}`);
check("U2 science: exact counts, kept splits B — آئرن 7×, لوہا 16×, لوہے 17×, گروپ 8× (incl. گروپوں 1×), گروہ 22×, ارتعاش 3×, تھرتھراہٹ 3×, بانڈ 12×, بندھن 1×, آبی بخارات 5×, پانی کے بخارات 7×, تھایامین 2×, تھائمین 2×, سیٹلائٹ 1×, سیارہ 26×, سیارے 10×, سیاروں 8×, فائبر آپٹک 2×, آپٹکل فائبر 2×, پوٹینشل ڈفرنس 3×, مقناطیس بنانا 1×, یونیورسل ڈونر 2×, طلبہ 1×, ناقابل ہضم 2×, مرکزی غدود 2×",
  sciCount("آئرن") === 7 && sciCount("لوہا") === 16 && sciCount("لوہے") === 17 && sciCount("گروپ") === 8 && sciCount("گروپوں") === 1 && sciCount("گروہ") === 22 && sciCount("ارتعاش") === 3 && sciCount("تھرتھراہٹ") === 3 && sciCount("بانڈ") === 12 && sciCount("بندھن") === 1 && sciCount("آبی بخارات") === 5 && sciCount("پانی کے بخارات") === 7 && sciCount("تھایامین") === 2 && sciCount("تھائمین") === 2 && sciCount("سیٹلائٹ") === 1 && sciCount("سیارہ") === 26 && sciCount("سیارے") === 10 && sciCount("سیاروں") === 8 && sciCount("فائبر آپٹک") === 2 && sciCount("آپٹکل فائبر") === 2 && sciCount("پوٹینشل ڈفرنس") === 3 && sciCount("مقناطیس بنانا") === 1 && sciCount("یونیورسل ڈونر") === 2 && sciCount("طلبہ") === 1 && sciCount("ناقابل ہضم") === 2 && sciCount("مرکزی غدود") === 2,
  `آئرن ${sciCount("آئرن")}, لوہا ${sciCount("لوہا")}, لوہے ${sciCount("لوہے")}, گروپ ${sciCount("گروپ")}, گروپوں ${sciCount("گروپوں")}, گروہ ${sciCount("گروہ")}, ارتعاش ${sciCount("ارتعاش")}, تھرتھراہٹ ${sciCount("تھرتھراہٹ")}, بانڈ ${sciCount("بانڈ")}, بندھن ${sciCount("بندھن")}, آبی بخارات ${sciCount("آبی بخارات")}, پانی کے بخارات ${sciCount("پانی کے بخارات")}, تھایامین ${sciCount("تھایامین")}, تھائمین ${sciCount("تھائمین")}, سیٹلائٹ ${sciCount("سیٹلائٹ")}, سیارہ ${sciCount("سیارہ")}, سیارے ${sciCount("سیارے")}, سیاروں ${sciCount("سیاروں")}, فائبر آپٹک ${sciCount("فائبر آپٹک")}, آپٹکل فائبر ${sciCount("آپٹکل فائبر")}, پوٹینشل ڈفرنس ${sciCount("پوٹینشل ڈفرنس")}, مقناطیس بنانا ${sciCount("مقناطیس بنانا")}, یونیورسل ڈونر ${sciCount("یونیورسل ڈونر")}, طلبہ ${sciCount("طلبہ")}, ناقابل ہضم ${sciCount("ناقابل ہضم")}, مرکزی غدود ${sciCount("مرکزی غدود")}`);
check("U2 science: exact counts, planets/oceans/units — عطارد 11×, زہرہ 14×, مشتری 10×, مریخ 13×, زحل 5×, نیپچون 4×, یورینس 2×, بحر منجمد شمالی 3×, بحر اوقیانوس 2×, بحر الکاہل 3×, بحر ہند 2×, نیوٹن 18×, پاسکل 7×, جول 22×, واٹ 14×, ایس آئی 22×, اکائی 45×, ہائیڈروجن 20×, آکسیجن 65×, نائٹروجن 15×, کاربن ڈائی آکسائیڈ 27×, قابل تجدید 7×, غیر قابل تجدید 4×, پن بجلی 2×, فوسل ایندھن 3×, موصل 13×, انسولیٹر 2×, آئینہ 20×, عدسہ 24×, انعکاس 18×, انعطاف 4×, مدار 12×, فضا 20×",
  sciCount("عطارد") === 11 && sciCount("زہرہ") === 14 && sciCount("مشتری") === 10 && sciCount("مریخ") === 13 && sciCount("زحل") === 5 && sciCount("نیپچون") === 4 && sciCount("یورینس") === 2 && sciCount("بحر منجمد شمالی") === 3 && sciCount("بحر اوقیانوس") === 2 && sciCount("بحر الکاہل") === 3 && sciCount("بحر ہند") === 2 && sciCount("نیوٹن") === 18 && sciCount("پاسکل") === 7 && sciCount("جول") === 22 && sciCount("واٹ") === 14 && sciCount("ایس آئی") === 22 && sciCount("اکائی") === 45 && sciCount("ہائیڈروجن") === 20 && sciCount("آکسیجن") === 65 && sciCount("نائٹروجن") === 15 && sciCount("کاربن ڈائی آکسائیڈ") === 27 && sciCount("قابل تجدید") === 7 && sciCount("غیر قابل تجدید") === 4 && sciCount("پن بجلی") === 2 && sciCount("فوسل ایندھن") === 3 && sciCount("موصل") === 13 && sciCount("انسولیٹر") === 2 && sciCount("آئینہ") === 20 && sciCount("عدسہ") === 24 && sciCount("انعکاس") === 18 && sciCount("انعطاف") === 4 && sciCount("مدار") === 12 && sciCount("فضا") === 20,
  `عطارد ${sciCount("عطارد")}, زہرہ ${sciCount("زہرہ")}, مشتری ${sciCount("مشتری")}, مریخ ${sciCount("مریخ")}, زحل ${sciCount("زحل")}, نیپچون ${sciCount("نیپچون")}, یورینس ${sciCount("یورینس")}, بحر منجمد شمالی ${sciCount("بحر منجمد شمالی")}, بحر اوقیانوس ${sciCount("بحر اوقیانوس")}, بحر الکاہل ${sciCount("بحر الکاہل")}, بحر ہند ${sciCount("بحر ہند")}, نیوٹن ${sciCount("نیوٹن")}, پاسکل ${sciCount("پاسکل")}, جول ${sciCount("جول")}, واٹ ${sciCount("واٹ")}, ایس آئی ${sciCount("ایس آئی")}, اکائی ${sciCount("اکائی")}, ہائیڈروجن ${sciCount("ہائیڈروجن")}, آکسیجن ${sciCount("آکسیجن")}, نائٹروجن ${sciCount("نائٹروجن")}, کاربن ڈائی آکسائیڈ ${sciCount("کاربن ڈائی آکسائیڈ")}, قابل تجدید ${sciCount("قابل تجدید")}, غیر قابل تجدید ${sciCount("غیر قابل تجدید")}, پن بجلی ${sciCount("پن بجلی")}, فوسل ایندھن ${sciCount("فوسل ایندھن")}, موصل ${sciCount("موصل")}, انسولیٹر ${sciCount("انسولیٹر")}, آئینہ ${sciCount("آئینہ")}, عدسہ ${sciCount("عدسہ")}, انعکاس ${sciCount("انعکاس")}, انعطاف ${sciCount("انعطاف")}, مدار ${sciCount("مدار")}, فضا ${sciCount("فضا")}`);
check("U2 science: exact counts, gap keeps — ڈی این اے 15×, آر این اے 4×, سٹومیٹا 3×, گیمیٹ 9×, مٹر 10×, چکنائی 21×, سائز 8×, ریڈنگ 3×, کائی 51×, خمیر 10×, کرسٹ 5×, مینٹل 5×, کور 13×, ٹروپوسفیئر 4×, موثریت 1×, جوار بھاٹا 3×, سگنل 21×, ونڈ ٹربائن 4×, ٹربائن 10×, جنریٹر 6×, لیور 5×, وولٹیج 27×, ایمپیئر 17×, اوہم 19×, سرکٹ 20×, بیٹری 10×, مقناطیس 53×, مقناطیسی 23×, ایپکس 3×, فرٹیلائزیشن 14×, ہیموگلوبن 3×, انیمیا 2×, بیری بیری 4×, اسپوتنک 2×, چوڑیاں 2×, شیلف 5×, نمک 35×, نمکین 4×",
  sciCount("ڈی این اے") === 15 && sciCount("آر این اے") === 4 && sciCount("سٹومیٹا") === 3 && sciCount("گیمیٹ") === 9 && sciCount("مٹر") === 10 && sciCount("چکنائی") === 21 && sciCount("سائز") === 8 && sciCount("ریڈنگ") === 3 && sciCount("کائی") === 51 && sciCount("خمیر") === 10 && sciCount("کرسٹ") === 5 && sciCount("مینٹل") === 5 && sciCount("کور") === 13 && sciCount("ٹروپوسفیئر") === 4 && sciCount("موثریت") === 1 && sciCount("جوار بھاٹا") === 3 && sciCount("سگنل") === 21 && sciCount("ونڈ ٹربائن") === 4 && sciCount("ٹربائن") === 10 && sciCount("جنریٹر") === 6 && sciCount("لیور") === 5 && sciCount("وولٹیج") === 27 && sciCount("ایمپیئر") === 17 && sciCount("اوہم") === 19 && sciCount("سرکٹ") === 20 && sciCount("بیٹری") === 10 && sciCount("مقناطیس") === 53 && sciCount("مقناطیسی") === 23 && sciCount("ایپکس") === 3 && sciCount("فرٹیلائزیشن") === 14 && sciCount("ہیموگلوبن") === 3 && sciCount("انیمیا") === 2 && sciCount("بیری بیری") === 4 && sciCount("اسپوتنک") === 2 && sciCount("چوڑیاں") === 2 && sciCount("شیلف") === 5 && sciCount("نمک") === 35 && sciCount("نمکین") === 4,
  `ڈی این اے ${sciCount("ڈی این اے")}, آر این اے ${sciCount("آر این اے")}, سٹومیٹا ${sciCount("سٹومیٹا")}, گیمیٹ ${sciCount("گیمیٹ")}, مٹر ${sciCount("مٹر")}, چکنائی ${sciCount("چکنائی")}, سائز ${sciCount("سائز")}, ریڈنگ ${sciCount("ریڈنگ")}, کائی ${sciCount("کائی")}, خمیر ${sciCount("خمیر")}, کرسٹ ${sciCount("کرسٹ")}, مینٹل ${sciCount("مینٹل")}, کور ${sciCount("کور")}, ٹروپوسفیئر ${sciCount("ٹروپوسفیئر")}, موثریت ${sciCount("موثریت")}, جوار بھاٹا ${sciCount("جوار بھاٹا")}, سگنل ${sciCount("سگنل")}, ونڈ ٹربائن ${sciCount("ونڈ ٹربائن")}, ٹربائن ${sciCount("ٹربائن")}, جنریٹر ${sciCount("جنریٹر")}, لیور ${sciCount("لیور")}, وولٹیج ${sciCount("وولٹیج")}, ایمپیئر ${sciCount("ایمپیئر")}, اوہم ${sciCount("اوہم")}, سرکٹ ${sciCount("سرکٹ")}, بیٹری ${sciCount("بیٹری")}, مقناطیس ${sciCount("مقناطیس")}, مقناطیسی ${sciCount("مقناطیسی")}, ایپکس ${sciCount("ایپکس")}, فرٹیلائزیشن ${sciCount("فرٹیلائزیشن")}, ہیموگلوبن ${sciCount("ہیموگلوبن")}, انیمیا ${sciCount("انیمیا")}, بیری بیری ${sciCount("بیری بیری")}, اسپوتنک ${sciCount("اسپوتنک")}, چوڑیاں ${sciCount("چوڑیاں")}, شیلف ${sciCount("شیلف")}, نمک ${sciCount("نمک")}, نمکین ${sciCount("نمکین")}`);
// % rule: 0 % in any Science _ur field (فیصد 5× in prose).
// No % may ever be ADDED in _ur.
let sciPctBad = [], sciPctTotal = 0;
for (const q of sci) {
  const fields = [[q.question, q.question_ur], [q.explanation, q.explanation_ur], ...q.options.map((o, i) => [o, q.options_ur[i]])];
  for (const [en, ur] of fields) {
    const ce = (en.match(/%/g) || []).length, cu = (ur.match(/%/g) || []).length;
    sciPctTotal += cu;
    if (cu > ce) sciPctBad.push(q.id);
  }
}
check("U2 science: % never added in any _ur field; 0 total in the whole bank", sciPctBad.length === 0 && sciPctTotal === 0, `added in ${sciPctBad.slice(0, 3).join(", ")}, total ${sciPctTotal}`);

// ---------- §3J Social Studies bank (U2 subject 9) ----------
// U2 rewrote the Social Studies _ur fields (90 of 3000
// field-values changed; 66/500 items). Dates, census figures,
// constitutional articles/amendments, and place/person names
// are the TESTED MATERIAL: digit rule is STRICT on every field
// (all 500 questions, options, and explanations — baseline
// measured 0 digit-multiset mismatches). explanationUrdu is
// null in all 500. Latin rule is an ALLOWLIST: single letters
// (K inside K2) + exactly OIC, ECO, ASEAN, SAARC, UNESCO,
// UNICEF, FAO, WHO, GDP, IMF, PKR (guide §5.1 acronyms —
// bare-acronym options, "What does X stand for?" Q+E, and the
// PKR gloss mirroring EN). Latin comma survives ONLY in the
// SS-010E figure (8,611 — the digit-group multiset requires
// the comma). No % anywhere in _ur (فیصد 10×).
// Normalizations: وزیرِ اعظم/وزیراعظم→وزیر اعظم,
// قائدِ اعظم→قائد اعظم, قراردادِ پاکستان→قرارداد پاکستان,
// قراردادِ مقاصد→قرارداد مقاصد, مجلسِ دستور ساز→دستور ساز
// اسمبلی, محمدن→محمڈن (all Pak Studies alignment, parent
// mandate), جب کہ→جبکہ, تقریبا→تقریباً, درج ذیل→مندرجہ ذیل,
// ہجرت→نقل مکانی, ووٹرز→ووٹر/ووٹروں, ججز→ججوں/جج,
// گرین وچ→گرینچ, درجے/درجہ→ڈگری (longitude degrees only;
// درجہ survives only inside درجہ حرارت), قرآن مجید→قرآن پاک
// (guide §2J), گلیشیر بالترو→بالترو گلیشیر; SS-024E em-dash
// split; "best described/shows" calques restructured (SS-187/
// 260/309/343). Splits KEPT (different EN, sense, cluster, or
// grammar — not spelling variants): اشیا (economics "goods",
// EN-correspondence pinned below — DELIBERATE divergence from
// the Pak Studies suite-ban: every SS occurrence maps to EN
// "goods") vs سامان (cargo/carried goods); خودمختاری
// (sovereignty) vs خود مختاری (autonomy); ووٹنگ (polling) vs
// رائے دہی (secret ballot); معاشرتی (community) vs سماجی
// (social); دفعات (1973 Constitution articles/provisions) vs
// آرٹیکل (UDHR articles); ناقابل تجدید (in-bank pair with
// قابل تجدید — cross-bank tension with Science غیر قابل تجدید,
// flagged); طول بلد/عرض بلد (zer-less sole forms); بحیرہ
// (proper sea names) vs سمندر (generic); روپیہ (nominative) vs
// روپے (oblique); داخلی تجارت vs اندرونی نقل مکانی vs
// اندرونی حصے; محصول (historical tax) vs ٹیکس; کارکن vs
// مزدور; کسان (person) vs کاشتکاری (activity); دستور (WHO
// constitution) vs آئین; فیڈریشنوں (sporting) vs وفاق;
// سینیٹرز/سپلائرز/ہائی کورٹس kept (native targets 0× / Pak
// Studies keep precedent); گردش for both rotation and
// revolution (qualifiers carry the distinction); کس سال میں
// kept alongside کس سال (Pak Studies precedent). SS-329
// options flipped to masculine agreement (وقت, EN "it" = the
// time). Flagged facts mirrored, not resolved: SS-121,
// SS-316/318/319/320/327/328/329, SS-424, SS-456.
const ss = JSON.parse(fs.readFileSync(join(ROOT, "src/data/banks/socialstudies.json"), "utf8"));
check("U2 socialstudies: 500 items", ss.length === 500, `got ${ss.length}`);
const ssIdsOk = ss.every((q, i) => q.id === `SS-${String(i + 1).padStart(3, "0")}`);
check("U2 socialstudies: IDs SS-001..SS-500 in order", ssIdsOk);
const ssPairs = [];
for (const q of ss) {
  ssPairs.push([`${q.id}:question_ur`, q.question_ur]);
  q.options_ur.forEach((o, i) => ssPairs.push([`${q.id}:options_ur[${i}]`, o]));
  ssPairs.push([`${q.id}:explanation_ur`, q.explanation_ur]);
}
// اشیا is DELIBERATELY excluded from the banned list for this
// bank (brief §2 Keeps): every token occurrence maps to EN
// "goods" (economics cluster). The EN-correspondence check
// below pins that instead of banning the term.
const SS_BANNED = [...CONTENT_BANNED.filter((t) => t !== "اشیا"), "چنیں", "مونث", "مؤنث", "وزیراعظم", "تقریبا", "فورا", "محمدن", "ہجرت", "ووٹرز", "ججز", "درجے"];
const ssBanned = bannedHits(ssPairs, SS_BANNED);
check("U2 socialstudies: no banned glossary/variant/transliteration terms in any _ur field (token-aware; اشیا excepted, EN-pinned below)", ssBanned.length === 0, ssBanned.slice(0, 5).join(", "));
const SS_PHRASES = ["درج ذیل", "جب کہ", "ایک دفعہ", "بہتر طور پر", "بہتر بیان", "قراردادِ مقاصد", "قراردادِ پاکستان", "مجلسِ دستور ساز", "قائدِ اعظم", "وزیرِ اعظم", "گرین وچ", "قرآن مجید"];
const ssPhrases = ssPairs.filter(([, v]) => SS_PHRASES.some((p) => (v ?? "").includes(p)));
check("U2 socialstudies: no banned phrases in any _ur field (variant spellings, dropped terms, calques)", ssPhrases.length === 0, ssPhrases.slice(0, 3).map(([l]) => l).join(", "));
const ssEmdash = ssPairs.filter(([, v]) => (v ?? "").includes("—"));
check("U2 socialstudies: no em-dash in any _ur field", ssEmdash.length === 0, ssEmdash.slice(0, 3).map(([l]) => l).join(", "));
const ssMarker = ssPairs.filter(([, v]) => (v ?? "").includes("[Auto-Translated]"));
check("U2 socialstudies: no '[Auto-Translated]' literal in any _ur field", ssMarker.length === 0, ssMarker.slice(0, 3).map(([l]) => l).join(", "));
const ssMojibake = ssPairs.filter(([, v]) => (v ?? "").includes("�"));
check("U2 socialstudies: no U+FFFD in any _ur field", ssMojibake.length === 0, ssMojibake.slice(0, 3).map(([l]) => l).join(", "));
const ssIndic = ssPairs.filter(([, v]) => /[۰-۹]/.test(v ?? ""));
check("U2 socialstudies: no Urdu-Indic digits in any _ur field", ssIndic.length === 0, ssIndic.slice(0, 3).map(([l]) => l).join(", "));
const ssEllipsis = ssPairs.filter(([, v]) => (v ?? "").includes("...") || (v ?? "").includes("…"));
check("U2 socialstudies: no ellipsis runs in any _ur field", ssEllipsis.length === 0, ssEllipsis.slice(0, 3).map(([l]) => l).join(", "));
let ssDigitBad = [];
for (const q of ss) {
  if (!sameMultiset(digitRuns(q.question), digitRuns(q.question_ur))) ssDigitBad.push(`${q.id}:question_ur`);
  q.options.forEach((o, i) => {
    if (!sameMultiset(digitRuns(o), digitRuns(q.options_ur[i]))) ssDigitBad.push(`${q.id}:options_ur[${i}]`);
  });
  if (!sameMultiset(digitRuns(q.explanation), digitRuns(q.explanation_ur))) ssDigitBad.push(`${q.id}:explanation_ur`);
}
check("U2 socialstudies: digit preservation STRICT on every field (all 500 questions, options, explanations)", ssDigitBad.length === 0, ssDigitBad.slice(0, 5).join(", "));
// Latin allowlist: single letters + OIC/ECO/ASEAN/SAARC/UNESCO/UNICEF/FAO/WHO/GDP/IMF/PKR (guide §5.1 acronyms), nothing else.
const SS_LATIN_ALLOWED = new Set(["oic", "eco", "asean", "saarc", "unesco", "unicef", "fao", "who", "gdp", "imf", "pkr"]);
let ssLatinBad = [];
const ssLatinWords = {};
for (const [loc, val] of ssPairs) {
  for (const w of ((val ?? "").match(/[A-Za-z]+/g) || [])) {
    const lw = w.toLowerCase();
    if (lw.length > 1) {
      ssLatinWords[w] = (ssLatinWords[w] || 0) + 1;
      if (!SS_LATIN_ALLOWED.has(lw)) ssLatinBad.push(`${loc}:${w}`);
    }
  }
}
check("U2 socialstudies: Latin allowlist — every multi-letter Latin word in _ur is OIC, ECO, ASEAN, SAARC, UNESCO, UNICEF, FAO, WHO, GDP, IMF, or PKR", ssLatinBad.length === 0, ssLatinBad.slice(0, 5).join(" | "));
check("U2 socialstudies: Latin inventory exact — OIC 11×, ECO 10×, ASEAN 10×, SAARC 9×, UNESCO 6×, UNICEF 5×, FAO 5×, WHO 4×, GDP 2×, IMF 2×, PKR 1× (65 multi-letter words total)",
  ssLatinWords["OIC"] === 11 && ssLatinWords["ECO"] === 10 && ssLatinWords["ASEAN"] === 10 && ssLatinWords["SAARC"] === 9 && ssLatinWords["UNESCO"] === 6 && ssLatinWords["UNICEF"] === 5 && ssLatinWords["FAO"] === 5 && ssLatinWords["WHO"] === 4 && ssLatinWords["GDP"] === 2 && ssLatinWords["IMF"] === 2 && ssLatinWords["PKR"] === 1 && Object.keys(ssLatinWords).length === 11,
  JSON.stringify(ssLatinWords));
let ssPunctBad = [], ssCommaBad = [], ssSpaceBad = [];
const ssCommaFields = [];
for (const q of ss) {
  const fields = [["question_ur", q.question_ur], ...q.options_ur.map((o, i) => [`options_ur[${i}]`, o]), ["explanation_ur", q.explanation_ur]];
  for (const [loc, val] of fields) {
    const p = (val ?? "").replace(/\d\.\d/g, " ");
    if (/[.?;]/.test(p)) ssPunctBad.push(`${q.id}:${loc}`);
    const c = (val ?? "").replace(/\d,\d/g, " ");
    if (c.includes(",")) ssCommaBad.push(`${q.id}:${loc}`);
    if ((val ?? "").includes(",")) ssCommaFields.push(`${q.id}:${loc}`);
    if (/ [،؟؛۔]/.test(val ?? "")) ssSpaceBad.push(`${q.id}:${loc}`);
  }
}
check("U2 socialstudies: no Latin . ? ; punctuation outside decimals (digit.digit)", ssPunctBad.length === 0, ssPunctBad.slice(0, 5).join(", "));
check("U2 socialstudies: Latin comma ONLY between digits, in exactly the 1 SS-010E field (8,611 figure)", ssCommaBad.length === 0 && ssCommaFields.length === 1 && ssCommaFields[0] === "SS-010:explanation_ur", `${ssCommaBad.slice(0, 3).join(", ")} / ${ssCommaFields.join(", ")}`);
check("U2 socialstudies: no space before Urdu punctuation", ssSpaceBad.length === 0, ssSpaceBad.slice(0, 5).join(", "));
const ssHonor = ssPairs.filter(([, v]) => HONOR_ABBR.test(v ?? ""));
check("U2 socialstudies: no Latin honorific abbreviations in any _ur field", ssHonor.length === 0, ssHonor.slice(0, 3).map(([l]) => l).join(", "));
const ssArCodepoints = ssPairs.filter(([, v]) => (v ?? "").includes(String.fromCharCode(0x064a)) || (v ?? "").includes(String.fromCharCode(0x0643)));
check("U2 socialstudies: no Arabic yeh/kaf codepoints (U+064A/U+0643) in any _ur field", ssArCodepoints.length === 0, ssArCodepoints.slice(0, 3).map(([l]) => l).join(", "));
let ssEnScriptRuns = 0;
for (const q of ss) {
  ssEnScriptRuns += (q.question.match(AR_RUN) || []).length + (q.explanation.match(AR_RUN) || []).length;
  q.options.forEach((o) => { ssEnScriptRuns += (o.match(AR_RUN) || []).length; });
}
check("U2 socialstudies: zero Arabic-script runs in English fields (measured baseline)", ssEnScriptRuns === 0, `got ${ssEnScriptRuns}`);
const ssUrText = ssPairs.map(([, v]) => v ?? "").join("\n");
const ssCount = (t) => ssUrText.split(t).length - 1;
check("U2 socialstudies: glossary terms present (وزیر اعظم, قائد اعظم, قرارداد پاکستان, قرارداد مقاصد, دستور ساز اسمبلی, محمڈن, جبکہ, تقریباً, مندرجہ ذیل, نقل مکانی, ووٹر, ووٹروں, ججوں, گرینچ, ڈگری, درجہ حرارت, قرآن پاک, بالترو گلیشیر, فیصد, فوراً)",
  ["وزیر اعظم", "قائد اعظم", "قرارداد پاکستان", "قرارداد مقاصد", "دستور ساز اسمبلی", "محمڈن", "جبکہ", "تقریباً", "مندرجہ ذیل", "نقل مکانی", "ووٹر", "ووٹروں", "ججوں", "گرینچ", "ڈگری", "درجہ حرارت", "قرآن پاک", "بالترو گلیشیر", "فیصد", "فوراً"].every((t) => ssUrText.includes(t)));
check("U2 socialstudies: glossary terms present (آئین, مردم شماری, اقوام متحدہ, خط استوا, قطب شمالی, قطب جنوبی, سطح مرتفع, صحرا, طول بلد, عرض بلد, تجارت, حکومت, کونسل, صدر دفتر, سینیٹ, پارلیمنٹ, سپریم کورٹ, ہائی کورٹ, چیف جسٹس, سیاسی جماعت, عالمی ادارہ صحت, دریائے سندھ, دو قومی نظریہ, قومی اسمبلی, عالمی بینک, میونسپل, یونیسکو, یونیسیف, پاکستان بیورو آف سٹیٹسٹکس, تنظیم تعاون اسلامی, نصف النہار, نصف کرہ)",
  ["آئین", "مردم شماری", "اقوام متحدہ", "خط استوا", "قطب شمالی", "قطب جنوبی", "سطح مرتفع", "صحرا", "طول بلد", "عرض بلد", "تجارت", "حکومت", "کونسل", "صدر دفتر", "سینیٹ", "پارلیمنٹ", "سپریم کورٹ", "ہائی کورٹ", "چیف جسٹس", "سیاسی جماعت", "عالمی ادارہ صحت", "دریائے سندھ", "دو قومی نظریہ", "قومی اسمبلی", "عالمی بینک", "میونسپل", "یونیسکو", "یونیسیف", "پاکستان بیورو آف سٹیٹسٹکس", "تنظیم تعاون اسلامی", "نصف النہار", "نصف کرہ"].every((t) => ssUrText.includes(t)));
check("U2 socialstudies: exact counts, normalizations — وزیر اعظم 10×, قائد اعظم 1×, قرارداد پاکستان 2×, قرارداد مقاصد 4×, دستور ساز اسمبلی 1×, محمڈن 1×, جبکہ 28×, تقریباً 30×, مندرجہ ذیل 7×, نقل مکانی 12×, ووٹر 19× (incl. ووٹروں 8×), ووٹروں 8×, جج 8× (incl. ججوں 7×), ججوں 7×, گرینچ 33×, ڈگری 61×, درجہ حرارت 9×, قرآن پاک 3×, بالترو گلیشیر 2×, فیصد 10×, ایک بار 2×, کس سال میں 2×, فوراً 2×, بہترین وضاحت 5×, بہترین انداز 1×, بنیادی طور پر 87×, عام طور پر 21× (substring counts)",
  ssCount("وزیر اعظم") === 10 && ssCount("قائد اعظم") === 1 && ssCount("قرارداد پاکستان") === 2 && ssCount("قرارداد مقاصد") === 4 && ssCount("دستور ساز اسمبلی") === 1 && ssCount("محمڈن") === 1 && ssCount("جبکہ") === 28 && ssCount("تقریباً") === 30 && ssCount("مندرجہ ذیل") === 7 && ssCount("نقل مکانی") === 12 && ssCount("ووٹر") === 19 && ssCount("ووٹروں") === 8 && ssCount("جج") === 8 && ssCount("ججوں") === 7 && ssCount("گرینچ") === 33 && ssCount("ڈگری") === 61 && ssCount("درجہ حرارت") === 9 && ssCount("قرآن پاک") === 3 && ssCount("بالترو گلیشیر") === 2 && ssCount("فیصد") === 10 && ssCount("ایک بار") === 2 && ssCount("کس سال میں") === 2 && ssCount("فوراً") === 2 && ssCount("بہترین وضاحت") === 5 && ssCount("بہترین انداز") === 1 && ssCount("بنیادی طور پر") === 87 && ssCount("عام طور پر") === 21,
  `وزیر اعظم ${ssCount("وزیر اعظم")}, قائد اعظم ${ssCount("قائد اعظم")}, قرارداد پاکستان ${ssCount("قرارداد پاکستان")}, قرارداد مقاصد ${ssCount("قرارداد مقاصد")}, دستور ساز اسمبلی ${ssCount("دستور ساز اسمبلی")}, محمڈن ${ssCount("محمڈن")}, جبکہ ${ssCount("جبکہ")}, تقریباً ${ssCount("تقریباً")}, مندرجہ ذیل ${ssCount("مندرجہ ذیل")}, نقل مکانی ${ssCount("نقل مکانی")}, ووٹر ${ssCount("ووٹر")}, ووٹروں ${ssCount("ووٹروں")}, جج ${ssCount("جج")}, ججوں ${ssCount("ججوں")}, گرینچ ${ssCount("گرینچ")}, ڈگری ${ssCount("ڈگری")}, درجہ حرارت ${ssCount("درجہ حرارت")}, قرآن پاک ${ssCount("قرآن پاک")}, بالترو گلیشیر ${ssCount("بالترو گلیشیر")}, فیصد ${ssCount("فیصد")}, ایک بار ${ssCount("ایک بار")}, کس سال میں ${ssCount("کس سال میں")}, فوراً ${ssCount("فوراً")}, بہترین وضاحت ${ssCount("بہترین وضاحت")}, بہترین انداز ${ssCount("بہترین انداز")}, بنیادی طور پر ${ssCount("بنیادی طور پر")}, عام طور پر ${ssCount("عام طور پر")}`);
check("U2 socialstudies: exact counts, institutions/places — آئین 48×, مردم شماری 52×, اقوام متحدہ 29×, خط استوا 32×, قطب شمالی 9×, قطب جنوبی 7×, سطح مرتفع 14×, صحرا 25×, طول بلد 22×, عرض بلد 17×, تجارت 56×, حکومت 79×, کونسل 46×, صدر دفتر 25×, سینیٹ 14×, پارلیمنٹ 7×, سپریم کورٹ 9×, ہائی کورٹ 6×, چیف جسٹس 5×, سیاسی جماعت 8×, عالمی ادارہ صحت 5×, دریائے سندھ 5×, دو قومی نظریہ 2×, اسمبلی 44×, گورنر جنرل 2×, قومی اسمبلی 16×, عالمی بینک 5×, میونسپل 4×, یونیسکو 4×, یونیسیف 2×, پاکستان بیورو آف سٹیٹسٹکس 4×, حیدرآباد 1×, شملہ 2×, کوئٹہ 2×, لاڑکانہ 1×, تنظیم تعاون اسلامی 4×, نصف النہار 14×, نصف کرہ 28× (substring counts)",
  ssCount("آئین") === 48 && ssCount("مردم شماری") === 52 && ssCount("اقوام متحدہ") === 29 && ssCount("خط استوا") === 32 && ssCount("قطب شمالی") === 9 && ssCount("قطب جنوبی") === 7 && ssCount("سطح مرتفع") === 14 && ssCount("صحرا") === 25 && ssCount("طول بلد") === 22 && ssCount("عرض بلد") === 17 && ssCount("تجارت") === 56 && ssCount("حکومت") === 79 && ssCount("کونسل") === 46 && ssCount("صدر دفتر") === 25 && ssCount("سینیٹ") === 14 && ssCount("پارلیمنٹ") === 7 && ssCount("سپریم کورٹ") === 9 && ssCount("ہائی کورٹ") === 6 && ssCount("چیف جسٹس") === 5 && ssCount("سیاسی جماعت") === 8 && ssCount("عالمی ادارہ صحت") === 5 && ssCount("دریائے سندھ") === 5 && ssCount("دو قومی نظریہ") === 2 && ssCount("اسمبلی") === 44 && ssCount("گورنر جنرل") === 2 && ssCount("قومی اسمبلی") === 16 && ssCount("عالمی بینک") === 5 && ssCount("میونسپل") === 4 && ssCount("یونیسکو") === 4 && ssCount("یونیسیف") === 2 && ssCount("پاکستان بیورو آف سٹیٹسٹکس") === 4 && ssCount("حیدرآباد") === 1 && ssCount("شملہ") === 2 && ssCount("کوئٹہ") === 2 && ssCount("لاڑکانہ") === 1 && ssCount("تنظیم تعاون اسلامی") === 4 && ssCount("نصف النہار") === 14 && ssCount("نصف کرہ") === 28,
  `آئین ${ssCount("آئین")}, مردم شماری ${ssCount("مردم شماری")}, اقوام متحدہ ${ssCount("اقوام متحدہ")}, خط استوا ${ssCount("خط استوا")}, قطب شمالی ${ssCount("قطب شمالی")}, قطب جنوبی ${ssCount("قطب جنوبی")}, سطح مرتفع ${ssCount("سطح مرتفع")}, صحرا ${ssCount("صحرا")}, طول بلد ${ssCount("طول بلد")}, عرض بلد ${ssCount("عرض بلد")}, تجارت ${ssCount("تجارت")}, حکومت ${ssCount("حکومت")}, کونسل ${ssCount("کونسل")}, صدر دفتر ${ssCount("صدر دفتر")}, سینیٹ ${ssCount("سینیٹ")}, پارلیمنٹ ${ssCount("پارلیمنٹ")}, سپریم کورٹ ${ssCount("سپریم کورٹ")}, ہائی کورٹ ${ssCount("ہائی کورٹ")}, چیف جسٹس ${ssCount("چیف جسٹس")}, سیاسی جماعت ${ssCount("سیاسی جماعت")}, عالمی ادارہ صحت ${ssCount("عالمی ادارہ صحت")}, دریائے سندھ ${ssCount("دریائے سندھ")}, دو قومی نظریہ ${ssCount("دو قومی نظریہ")}, اسمبلی ${ssCount("اسمبلی")}, گورنر جنرل ${ssCount("گورنر جنرل")}, قومی اسمبلی ${ssCount("قومی اسمبلی")}, عالمی بینک ${ssCount("عالمی بینک")}, میونسپل ${ssCount("میونسپل")}, یونیسکو ${ssCount("یونیسکو")}, یونیسیف ${ssCount("یونیسیف")}, پاکستان بیورو آف سٹیٹسٹکس ${ssCount("پاکستان بیورو آف سٹیٹسٹکس")}, حیدرآباد ${ssCount("حیدرآباد")}, شملہ ${ssCount("شملہ")}, کوئٹہ ${ssCount("کوئٹہ")}, لاڑکانہ ${ssCount("لاڑکانہ")}, تنظیم تعاون اسلامی ${ssCount("تنظیم تعاون اسلامی")}, نصف النہار ${ssCount("نصف النہار")}, نصف کرہ ${ssCount("نصف کرہ")}`);
check("U2 socialstudies: exact counts, kept splits — خودمختاری 2×, خود مختاری 2×, ووٹنگ 2×, رائے دہی 2×, جداگانہ انتخابات 2×, فیڈریشنوں 1×, وفاق 37×, مقننہ 1×, دستور 3×, معاشرتی 7×, سماجی 23×, ناقابل تجدید 3×, قابل تجدید 5× (incl. ناقابل 3×), بحیرہ 8×, سمندر 35×, روپیہ 2×, روپے 1×, داخلی تجارت 2×, اندرونی نقل مکانی 2×, اندرونی حصے 4×, محصول 2×, ٹیکس 29×, کارکن 2×, مزدور 11×, دیہات 11×, گاؤں 17×, کسان 12×, کاشتکاری 14×, رائے دہندگان کی فہرست 3×, سینیٹرز 1×, سپلائرز 1×, ہائی کورٹس 1×, دفعات 8×, آرٹیکل 4×, سامان 13×, گردش 2×, سربراہِ مملکت 2×, جی ایم ٹی 2×, کنویکشنل 2×, سائیکلونک 1×, ریلیف 1×, فوارے 3×, برادری 10×, کاروبار 8×, ویمنز 2×, کینٹربری ٹیلز 2×, شاہ مکھی 2×, ویژن 2×, پرامن 9×, نامی 3× (substring counts)",
  ssCount("خودمختاری") === 2 && ssCount("خود مختاری") === 2 && ssCount("ووٹنگ") === 2 && ssCount("رائے دہی") === 2 && ssCount("جداگانہ انتخابات") === 2 && ssCount("فیڈریشنوں") === 1 && ssCount("وفاق") === 37 && ssCount("مقننہ") === 1 && ssCount("دستور") === 3 && ssCount("معاشرتی") === 7 && ssCount("سماجی") === 23 && ssCount("ناقابل تجدید") === 3 && ssCount("قابل تجدید") === 5 && ssCount("بحیرہ") === 8 && ssCount("سمندر") === 35 && ssCount("روپیہ") === 2 && ssCount("روپے") === 1 && ssCount("داخلی تجارت") === 2 && ssCount("اندرونی نقل مکانی") === 2 && ssCount("اندرونی حصے") === 4 && ssCount("محصول") === 2 && ssCount("ٹیکس") === 29 && ssCount("کارکن") === 2 && ssCount("مزدور") === 11 && ssCount("دیہات") === 11 && ssCount("گاؤں") === 17 && ssCount("کسان") === 12 && ssCount("کاشتکاری") === 14 && ssCount("رائے دہندگان کی فہرست") === 3 && ssCount("سینیٹرز") === 1 && ssCount("سپلائرز") === 1 && ssCount("ہائی کورٹس") === 1 && ssCount("دفعات") === 8 && ssCount("آرٹیکل") === 4 && ssCount("سامان") === 13 && ssCount("گردش") === 2 && ssCount("سربراہِ مملکت") === 2 && ssCount("جی ایم ٹی") === 2 && ssCount("کنویکشنل") === 2 && ssCount("سائیکلونک") === 1 && ssCount("ریلیف") === 1 && ssCount("فوارے") === 3 && ssCount("برادری") === 10 && ssCount("کاروبار") === 8 && ssCount("ویمنز") === 2 && ssCount("کینٹربری ٹیلز") === 2 && ssCount("شاہ مکھی") === 2 && ssCount("ویژن") === 2 && ssCount("پرامن") === 9 && ssCount("نامی") === 3,
  `خودمختاری ${ssCount("خودمختاری")}, خود مختاری ${ssCount("خود مختاری")}, ووٹنگ ${ssCount("ووٹنگ")}, رائے دہی ${ssCount("رائے دہی")}, جداگانہ انتخابات ${ssCount("جداگانہ انتخابات")}, فیڈریشنوں ${ssCount("فیڈریشنوں")}, وفاق ${ssCount("وفاق")}, مقننہ ${ssCount("مقننہ")}, دستور ${ssCount("دستور")}, معاشرتی ${ssCount("معاشرتی")}, سماجی ${ssCount("سماجی")}, ناقابل تجدید ${ssCount("ناقابل تجدید")}, قابل تجدید ${ssCount("قابل تجدید")}, بحیرہ ${ssCount("بحیرہ")}, سمندر ${ssCount("سمندر")}, روپیہ ${ssCount("روپیہ")}, روپے ${ssCount("روپے")}, داخلی تجارت ${ssCount("داخلی تجارت")}, اندرونی نقل مکانی ${ssCount("اندرونی نقل مکانی")}, اندرونی حصے ${ssCount("اندرونی حصے")}, محصول ${ssCount("محصول")}, ٹیکس ${ssCount("ٹیکس")}, کارکن ${ssCount("کارکن")}, مزدور ${ssCount("مزدور")}, دیہات ${ssCount("دیہات")}, گاؤں ${ssCount("گاؤں")}, کسان ${ssCount("کسان")}, کاشتکاری ${ssCount("کاشتکاری")}, رائے دہندگان کی فہرست ${ssCount("رائے دہندگان کی فہرست")}, سینیٹرز ${ssCount("سینیٹرز")}, سپلائرز ${ssCount("سپلائرز")}, ہائی کورٹس ${ssCount("ہائی کورٹس")}, دفعات ${ssCount("دفعات")}, آرٹیکل ${ssCount("آرٹیکل")}, سامان ${ssCount("سامان")}, گردش ${ssCount("گردش")}, سربراہِ مملکت ${ssCount("سربراہِ مملکت")}, جی ایم ٹی ${ssCount("جی ایم ٹی")}, کنویکشنل ${ssCount("کنویکشنل")}, سائیکلونک ${ssCount("سائیکلونک")}, ریلیف ${ssCount("ریلیف")}, فوارے ${ssCount("فوارے")}, برادری ${ssCount("برادری")}, کاروبار ${ssCount("کاروبار")}, ویمنز ${ssCount("ویمنز")}, کینٹربری ٹیلز ${ssCount("کینٹربری ٹیلز")}, شاہ مکھی ${ssCount("شاہ مکھی")}, ویژن ${ssCount("ویژن")}, پرامن ${ssCount("پرامن")}, نامی ${ssCount("نامی")}`);
check("U2 socialstudies: exact counts, economy/society/geography — کثافت 9×, شرح پیدائش 5×, شرح اموات 3×, شرح نمو 12×, برآمدات 5×, درآمدات 6×, بجٹ 3×, کرنسی 13×, بینک 43×, زراعت 6×, ثقافت 13×, ورثہ 2×, تہذیب 2×, شہریت 3×, فرائض 3×, انصاف 12×, عدلیہ 7×, قانون 45×, امن 33×, سفارت 2×, خارجہ 9×, زبان 48×, خاندان 29×, نقشہ 27×, پیمانہ 6×, جزیرہ 14×, جھیل 28×, پہاڑ 44×, وادی 27×, بندرگاہ 5×, جنگل 13×, آبادی 73×, زمین 77×, موسم 41×, آب و ہوا 5×, حقوق 50× (substring counts)",
  ssCount("کثافت") === 9 && ssCount("شرح پیدائش") === 5 && ssCount("شرح اموات") === 3 && ssCount("شرح نمو") === 12 && ssCount("برآمدات") === 5 && ssCount("درآمدات") === 6 && ssCount("بجٹ") === 3 && ssCount("کرنسی") === 13 && ssCount("بینک") === 43 && ssCount("زراعت") === 6 && ssCount("ثقافت") === 13 && ssCount("ورثہ") === 2 && ssCount("تہذیب") === 2 && ssCount("شہریت") === 3 && ssCount("فرائض") === 3 && ssCount("انصاف") === 12 && ssCount("عدلیہ") === 7 && ssCount("قانون") === 45 && ssCount("امن") === 33 && ssCount("سفارت") === 2 && ssCount("خارجہ") === 9 && ssCount("زبان") === 48 && ssCount("خاندان") === 29 && ssCount("نقشہ") === 27 && ssCount("پیمانہ") === 6 && ssCount("جزیرہ") === 14 && ssCount("جھیل") === 28 && ssCount("پہاڑ") === 44 && ssCount("وادی") === 27 && ssCount("بندرگاہ") === 5 && ssCount("جنگل") === 13 && ssCount("آبادی") === 73 && ssCount("زمین") === 77 && ssCount("موسم") === 41 && ssCount("آب و ہوا") === 5 && ssCount("حقوق") === 50,
  `کثافت ${ssCount("کثافت")}, شرح پیدائش ${ssCount("شرح پیدائش")}, شرح اموات ${ssCount("شرح اموات")}, شرح نمو ${ssCount("شرح نمو")}, برآمدات ${ssCount("برآمدات")}, درآمدات ${ssCount("درآمدات")}, بجٹ ${ssCount("بجٹ")}, کرنسی ${ssCount("کرنسی")}, بینک ${ssCount("بینک")}, زراعت ${ssCount("زراعت")}, ثقافت ${ssCount("ثقافت")}, ورثہ ${ssCount("ورثہ")}, تہذیب ${ssCount("تہذیب")}, شہریت ${ssCount("شہریت")}, فرائض ${ssCount("فرائض")}, انصاف ${ssCount("انصاف")}, عدلیہ ${ssCount("عدلیہ")}, قانون ${ssCount("قانون")}, امن ${ssCount("امن")}, سفارت ${ssCount("سفارت")}, خارجہ ${ssCount("خارجہ")}, زبان ${ssCount("زبان")}, خاندان ${ssCount("خاندان")}, نقشہ ${ssCount("نقشہ")}, پیمانہ ${ssCount("پیمانہ")}, جزیرہ ${ssCount("جزیرہ")}, جھیل ${ssCount("جھیل")}, پہاڑ ${ssCount("پہاڑ")}, وادی ${ssCount("وادی")}, بندرگاہ ${ssCount("بندرگاہ")}, جنگل ${ssCount("جنگل")}, آبادی ${ssCount("آبادی")}, زمین ${ssCount("زمین")}, موسم ${ssCount("موسم")}, آب و ہوا ${ssCount("آب و ہوا")}, حقوق ${ssCount("حقوق")}`);
// اشیا EN-correspondence: token اشیا occurs in exactly 36
// fields, and EVERY one maps to EN "goods" (economics
// cluster). Substring count 42 includes معاشیات (1×) and
// multi-occurrence fields.
let ssAshyaFields = 0, ssAshyaBad = [];
for (const q of ss) {
  const fields = [[q.question, q.question_ur], ...q.options.map((o, i) => [o, q.options_ur[i]]), [q.explanation, q.explanation_ur]];
  for (const [en, ur] of fields) {
    if (tokens(ur).includes("اشیا")) {
      ssAshyaFields += 1;
      if (!/goods/i.test(en)) ssAshyaBad.push(q.id);
    }
  }
}
check("U2 socialstudies: اشیا token in exactly 36 fields, every one with EN 'goods'", ssAshyaFields === 36 && ssAshyaBad.length === 0, `fields ${ssAshyaFields}, bad ${ssAshyaBad.slice(0, 3).join(", ")}`);
check("U2 socialstudies: اشیا substring count 42× (incl. معاشیات 1×)", ssCount("اشیا") === 42 && ssCount("معاشیات") === 1, `اشیا ${ssCount("اشیا")}, معاشیات ${ssCount("معاشیات")}`);
let ssDarjaBad = [];
for (const [loc, val] of ssPairs) {
  if (tokens(val).includes("درجہ") && !(val ?? "").includes("درجہ حرارت")) ssDarjaBad.push(loc);
}
check("U2 socialstudies: درجہ survives ONLY inside درجہ حرارت (9×)", ssDarjaBad.length === 0 && ssCount("درجہ حرارت") === 9, ssDarjaBad.slice(0, 3).join(", "));
// % rule: 0 % in any Social Studies _ur field (فیصد 10× in prose).
// No % may ever be ADDED in _ur.
let ssPctBad = [], ssPctTotal = 0;
for (const q of ss) {
  const fields = [[q.question, q.question_ur], [q.explanation, q.explanation_ur], ...q.options.map((o, i) => [o, q.options_ur[i]])];
  for (const [en, ur] of fields) {
    const ce = (en.match(/%/g) || []).length, cu = (ur.match(/%/g) || []).length;
    ssPctTotal += cu;
    if (cu > ce) ssPctBad.push(q.id);
  }
}
check("U2 socialstudies: % never added in any _ur field; 0 total in the whole bank", ssPctBad.length === 0 && ssPctTotal === 0, `added in ${ssPctBad.slice(0, 3).join(", ")}, total ${ssPctTotal}`);

// ---------- §3K GK bank (U2 subject 10) ----------
// U2 rewrote the GK _ur fields (142 of 3000
// field-values changed; 95/500 items). All 60 Current
// Affairs items carry a 4-digit year in EN Q+E, and years,
// dates, figures, and place/person names are the TESTED
// MATERIAL: digit rule is STRICT on every field (all 500
// questions, options, and explanations — baseline measured
// 0 digit-group-multiset mismatches, and the single-digit
// multiset also 0 for GKN-031..500). explanationUrdu is
// null in all 500; NO explanationEn field exists (no mixed
// explanations). Latin rule is an ALLOWLIST: single letters
// (K inside K2, I inside Artemis I, G inside G20, V inside
// Saturn V/Atlas V, b inside 58(2)(b)) + exactly FAO,
// UNICEF, UNHCR, WFP, ILO, COP, ChatGPT, FIFA, NATO, UNESCO,
// WHO, IMF, GPS, ATM, SIM, PIN, PDF, HTTP, HTML, CPU, RAM,
// LED, CCTV (guide §5.1 acronyms — tested labels in "What
// does X stand for?" items, bare-acronym options, and tested
// names). Latin comma survives ONLY in the 5 GKN-066 fields
// (7,708 figure — the digit-group multiset requires the
// comma). % survives ONLY in the 4 GKN-027 option fields
// (bare-number options, mirroring EN); prose GKN-027E uses
// فیصد (1×).
// Normalizations: قرآن مجید→قرآن پاک (8), سورۃ→سورہ (6),
// درج ذیل→مندرجہ ذیل (9), حیدر آباد→حیدرآباد (3), national
// motto Latin quote→Urdu script (GKN-016E), GKN-019E
// em-dash split, GKN-457..472 punctuation pocket (16 Q ?
// →؟, 16 E .→۔), مظفرآباد→مظفر آباد (2, Pak Studies
// alignment, parent mandate), لاہور قرارداد→قراردادِ لاہور
// (GKN-089E, Pak Studies alignment, parent mandate),
// انڈیا→بھارت (EN "India" only; book title keeps انڈیا),
// جمہوریہ جنوبی افریقہ→جنوبی افریقہ, بوینس آئرس→بیونس
// آئرس, بحر الکاہل→بحرالکاہل, ریاستہائے متحدہ→امریکہ,
// عالمی کپ→ورلڈ کپ (4), طلائی تمغے→سونے کے تمغے (2),
// گیمز→کھیلوں (Olympic Games only; event names keep
// گیمز), علامت→نشان (GKN-300E), سائنسوں→علوم,
// سلسلہ→جماعت (religious order, GKN-208), رکھا جانے
// والا→بھیجا جانے والا (placed into orbit, 3), قلبی→
// مرکزی علاقہ coinage for EN "heartland" (GKN-178,
// flagged for owner confirmation), GKN-387Q fidelity fix
// ("پہلی"→"اس سے پہلے کی", EN "earlier"), GKN-358Q
// restructure (agreement + buried question), comma-splice
// splits (GKN-348/352/357/382/393E). Splits KEPT
// (different EN, sense, cluster, or grammar — not
// spelling variants): فٹ بال (EN "football") vs فٹبال
// (EN "American football" ONLY, EN-correspondence pinned
// below); ترکی (EN "Turkey") vs ترکیہ (EN "Turkiye",
// EN-correspondence pinned below — the EN inconsistency
// is flagged, not resolved); انڈیا (book title "The
// Discovery of India" ONLY); ہجرت (EN "Hijrah" —
// DELIBERATE divergence from Social Studies نقل مکانی,
// whose EN was "migration"); درجہ حرارت (4) + درجے (1,
// EN "position") vs ڈگری 0× (no longitude items — do not
// import the SS ڈگری rule); آرٹیکل (1, constitutional
// article) vs دفعات 0× (cross-bank tension with SS,
// flagged); جنوبی قطب (the MOON's south pole, GKN-296)
// vs قطب جنوبی 0×; فیڈریشن (FIFA expansion, 4) vs
// وفاقی (federal adjective, 10×; bare وفاق token 0×);
// روپیہ (nominative) vs روپے (oblique); یونیسکو prose
// (5) vs UNESCO tested acronym (2); یونیسف 5; کس سال
// میں (3) vs کس سال (26); موسم (seasons) vs آب و ہوا
// 0×; اسلامی تعاون کی تنظیم (5) vs SS تنظیم تعاون
// اسلامی (cross-bank difference, flagged); جنگ zer-less
// (جنگِ 0×); مزار قائد (zer-less); سلطنت عثمانیہ
// (zer-less); ریال for both EN "riyal" and "rial";
// ایڈز کا عالمی دن (2) vs عالمی یوم (8); گیمز (event
// names ONLY, 4); گیٹ (GATT transliteration, GKN-242E)
// vs بل گیٹس (5); مقولہ (Olympic motto) vs نعرہ
// (national motto/slogan); قمری (lunar adjective) vs
// چاند (Moon); سیل (احتساب سیل) vs سیلاب; سامان
// (تجارتی سامان) vs اشیا/اشیاء 0× (suite-ban kept —
// DELIBERATE divergence from SS اشیا, whose EN was
// "goods"); پچاس ممالک (words, mirrors EN "Fifty
// states" — guide §6.1 exception). Flagged facts
// mirrored, not resolved: GKN-066, GKN-072, GKN-085,
// GKN-213, GKN-264, GKN-408, GKN-488, GKN-492, GKN-496,
// Turkey/Turkiye EN inconsistency.
const gk = JSON.parse(fs.readFileSync(join(ROOT, "src/data/banks/gk.json"), "utf8"));
check("U2 gk: 500 items", gk.length === 500, `got ${gk.length}`);
const gkIdsOk = gk.every((q, i) => q.id === `GKN-${String(i + 1).padStart(3, "0")}`);
check("U2 gk: IDs GKN-001..GKN-500 in order", gkIdsOk);
const gkPairs = [];
for (const q of gk) {
  gkPairs.push([`${q.id}:question_ur`, q.question_ur]);
  q.options_ur.forEach((o, i) => gkPairs.push([`${q.id}:options_ur[${i}]`, o]));
  gkPairs.push([`${q.id}:explanation_ur`, q.explanation_ur]);
}
const GK_BANNED = [...CONTENT_BANNED, "چنیں", "مونث", "مؤنث", "وزیراعظم", "تقریبا", "فورا", "محمدن", "ووٹرز", "ججز", "جمہوریہ", "قلبی", "طلائی", "سائنسوں"];
const gkBanned = bannedHits(gkPairs, GK_BANNED);
check("U2 gk: no banned glossary/variant/transliteration terms in any _ur field (token-aware; اشیا/اشیاء suite-ban kept, درجے excepted — EN 'position' keep)", gkBanned.length === 0, gkBanned.slice(0, 5).join(", "));
const GK_PHRASES = ["درج ذیل", "جب کہ", "ایک دفعہ", "بہتر طور پر", "بہتر بیان", "قرآن مجید", "حیدر آباد", "مظفرآباد", "لاہور قرارداد", "عالمی کپ", "رکھا جانے والا", "بوینس آئرس", "بحر الکاہل", "ریاستہائے متحدہ", "قطب جنوبی", "تنظیم تعاون اسلامی", "نقل مکانی", "جنگِ", "مزارِ"];
const gkPhrases = gkPairs.filter(([, v]) => GK_PHRASES.some((p) => (v ?? "").includes(p)));
check("U2 gk: no banned phrases in any _ur field (variant spellings, dropped terms, calques, cross-bank forms)", gkPhrases.length === 0, gkPhrases.slice(0, 3).map(([l]) => l).join(", "));
const gkEmdash = gkPairs.filter(([, v]) => (v ?? "").includes("—"));
check("U2 gk: no em-dash in any _ur field", gkEmdash.length === 0, gkEmdash.slice(0, 3).map(([l]) => l).join(", "));
const gkMarker = gkPairs.filter(([, v]) => (v ?? "").includes("[Auto-Translated]"));
check("U2 gk: no '[Auto-Translated]' literal in any _ur field", gkMarker.length === 0, gkMarker.slice(0, 3).map(([l]) => l).join(", "));
const gkMojibake = gkPairs.filter(([, v]) => (v ?? "").includes("�"));
check("U2 gk: no U+FFFD in any _ur field", gkMojibake.length === 0, gkMojibake.slice(0, 3).map(([l]) => l).join(", "));
const gkIndic = gkPairs.filter(([, v]) => /[۰-۹]/.test(v ?? ""));
check("U2 gk: no Urdu-Indic digits in any _ur field", gkIndic.length === 0, gkIndic.slice(0, 3).map(([l]) => l).join(", "));
const gkEllipsis = gkPairs.filter(([, v]) => (v ?? "").includes("...") || (v ?? "").includes("…"));
check("U2 gk: no ellipsis runs in any _ur field", gkEllipsis.length === 0, gkEllipsis.slice(0, 3).map(([l]) => l).join(", "));
let gkDigitBad = [];
for (const q of gk) {
  if (!sameMultiset(digitRuns(q.question), digitRuns(q.question_ur))) gkDigitBad.push(`${q.id}:question_ur`);
  q.options.forEach((o, i) => {
    if (!sameMultiset(digitRuns(o), digitRuns(q.options_ur[i]))) gkDigitBad.push(`${q.id}:options_ur[${i}]`);
  });
  if (!sameMultiset(digitRuns(q.explanation), digitRuns(q.explanation_ur))) gkDigitBad.push(`${q.id}:explanation_ur`);
}
check("U2 gk: digit preservation STRICT on every field (all 500 questions, options, explanations)", gkDigitBad.length === 0, gkDigitBad.slice(0, 5).join(", "));
// Latin allowlist: single letters + FAO/UNICEF/UNHCR/WFP/ILO/COP/ChatGPT/FIFA/NATO/UNESCO/WHO/IMF/GPS/ATM/SIM/PIN/PDF/HTTP/HTML/CPU/RAM/LED/CCTV (guide §5.1 acronyms), nothing else.
const GK_LATIN_ALLOWED = new Set(["fao", "unicef", "unhcr", "wfp", "ilo", "cop", "chatgpt", "fifa", "nato", "unesco", "who", "imf", "gps", "atm", "sim", "pin", "pdf", "http", "html", "cpu", "ram", "led", "cctv"]);
let gkLatinBad = [];
const gkLatinWords = {};
for (const [loc, val] of gkPairs) {
  for (const w of ((val ?? "").match(/[A-Za-z]+/g) || [])) {
    const lw = w.toLowerCase();
    if (lw.length > 1) {
      gkLatinWords[w] = (gkLatinWords[w] || 0) + 1;
      if (!GK_LATIN_ALLOWED.has(lw)) gkLatinBad.push(`${loc}:${w}`);
    }
  }
}
check("U2 gk: Latin allowlist — every multi-letter Latin word in _ur is FAO, UNICEF, UNHCR, WFP, ILO, COP, ChatGPT, FIFA, NATO, UNESCO, WHO, IMF, GPS, ATM, SIM, PIN, PDF, HTTP, HTML, CPU, RAM, LED, or CCTV", gkLatinBad.length === 0, gkLatinBad.slice(0, 5).join(" | "));
check("U2 gk: Latin inventory exact — FAO 2×, UNICEF 4×, UNHCR 2×, WFP 1×, ILO 1×, COP 6×, ChatGPT 2×, FIFA 2×, NATO 2×, UNESCO 2×, WHO 2×, IMF 2×, GPS 2×, ATM 2×, SIM 2×, PIN 3×, PDF 2×, HTTP 2×, HTML 2×, CPU 2×, RAM 2×, LED 2×, CCTV 2× (55 multi-letter words total)",
  gkLatinWords["FAO"] === 2 && gkLatinWords["UNICEF"] === 4 && gkLatinWords["UNHCR"] === 2 && gkLatinWords["WFP"] === 1 && gkLatinWords["ILO"] === 1 && gkLatinWords["COP"] === 6 && gkLatinWords["ChatGPT"] === 2 && gkLatinWords["FIFA"] === 2 && gkLatinWords["NATO"] === 2 && gkLatinWords["UNESCO"] === 2 && gkLatinWords["WHO"] === 2 && gkLatinWords["IMF"] === 2 && gkLatinWords["GPS"] === 2 && gkLatinWords["ATM"] === 2 && gkLatinWords["SIM"] === 2 && gkLatinWords["PIN"] === 3 && gkLatinWords["PDF"] === 2 && gkLatinWords["HTTP"] === 2 && gkLatinWords["HTML"] === 2 && gkLatinWords["CPU"] === 2 && gkLatinWords["RAM"] === 2 && gkLatinWords["LED"] === 2 && gkLatinWords["CCTV"] === 2 && Object.keys(gkLatinWords).length === 23,
  JSON.stringify(gkLatinWords));
let gkPunctBad = [], gkCommaBad = [], gkSpaceBad = [];
const gkCommaFields = [];
for (const q of gk) {
  const fields = [["question_ur", q.question_ur], ...q.options_ur.map((o, i) => [`options_ur[${i}]`, o]), ["explanation_ur", q.explanation_ur]];
  for (const [loc, val] of fields) {
    const p = (val ?? "").replace(/\d\.\d/g, " ");
    if (/[.?;]/.test(p)) gkPunctBad.push(`${q.id}:${loc}`);
    const c = (val ?? "").replace(/\d,\d/g, " ");
    if (c.includes(",")) gkCommaBad.push(`${q.id}:${loc}`);
    if ((val ?? "").includes(",")) gkCommaFields.push(`${q.id}:${loc}`);
    if (/ [،؟؛۔]/.test(val ?? "")) gkSpaceBad.push(`${q.id}:${loc}`);
  }
}
check("U2 gk: no Latin . ? ; punctuation outside decimals (digit.digit)", gkPunctBad.length === 0, gkPunctBad.slice(0, 5).join(", "));
check("U2 gk: Latin comma ONLY between digits, in exactly the 5 GKN-066 fields (7,708 figure)", gkCommaBad.length === 0 && gkCommaFields.length === 5 && gkCommaFields.every((f) => f.startsWith("GKN-066:")), `${gkCommaBad.slice(0, 3).join(", ")} / ${gkCommaFields.join(", ")}`);
check("U2 gk: no space before Urdu punctuation", gkSpaceBad.length === 0, gkSpaceBad.slice(0, 5).join(", "));
const gkHonor = gkPairs.filter(([, v]) => HONOR_ABBR.test(v ?? ""));
check("U2 gk: no Latin honorific abbreviations in any _ur field", gkHonor.length === 0, gkHonor.slice(0, 3).map(([l]) => l).join(", "));
const gkArCodepoints = gkPairs.filter(([, v]) => (v ?? "").includes(String.fromCharCode(0x064a)) || (v ?? "").includes(String.fromCharCode(0x0643)));
check("U2 gk: no Arabic yeh/kaf codepoints (U+064A/U+0643) in any _ur field", gkArCodepoints.length === 0, gkArCodepoints.slice(0, 3).map(([l]) => l).join(", "));
let gkEnScriptRuns = 0;
for (const q of gk) {
  gkEnScriptRuns += (q.question.match(AR_RUN) || []).length + (q.explanation.match(AR_RUN) || []).length;
  q.options.forEach((o) => { gkEnScriptRuns += (o.match(AR_RUN) || []).length; });
}
check("U2 gk: zero Arabic-script runs in English fields (measured baseline)", gkEnScriptRuns === 0, `got ${gkEnScriptRuns}`);
const gkUrText = gkPairs.map(([, v]) => v ?? "").join("\n");
const gkCount = (t) => gkUrText.split(t).length - 1;
check("U2 gk: glossary terms present (قرآن پاک, سورہ, سورت, مندرجہ ذیل, حیدرآباد, مظفر آباد, قراردادِ لاہور, فیصد, بھارت, جنوبی افریقہ, بیونس آئرس, بحرالکاہل, امریکہ, ورلڈ کپ, سونے کے تمغے, اولمپک کھیل, بھیجا جانے والا, مرکزی علاقے, جماعت, تقریباً, جبکہ)",
  ["قرآن پاک", "سورہ", "سورت", "مندرجہ ذیل", "حیدرآباد", "مظفر آباد", "قراردادِ لاہور", "فیصد", "بھارت", "جنوبی افریقہ", "بیونس آئرس", "بحرالکاہل", "امریکہ", "ورلڈ کپ", "سونے کے تمغے", "اولمپک کھیل", "بھیجا جانے والا", "مرکزی علاقے", "جماعت", "تقریباً", "جبکہ"].every((t) => gkUrText.includes(t)));
check("U2 gk: glossary terms present (وزیر اعظم, قائد اعظم, اقوام متحدہ, صدر دفتر, دریائے سندھ, دریائے جہلم, دریائے نیلم, حکومت, کونسل, سینیٹ, پارلیمنٹ, سپریم کورٹ, ہائی کورٹ, قومی اسمبلی, کرنسی, بینک, زبان, قانون, امن, تجارت, یونیسکو, یونیسف, اسلامی تعاون کی تنظیم, بحیرہ, سمندر, صحرا, پہاڑ, جھیل, جزیرہ, وادی, بندرگاہ, موسم, مسجد, مندر, حج, نبی, زکوٰۃ, کتاب, مصنف, شاعر, ویژن)",
  ["وزیر اعظم", "قائد اعظم", "اقوام متحدہ", "صدر دفتر", "دریائے سندھ", "دریائے جہلم", "دریائے نیلم", "حکومت", "کونسل", "سینیٹ", "پارلیمنٹ", "سپریم کورٹ", "ہائی کورٹ", "قومی اسمبلی", "کرنسی", "بینک", "زبان", "قانون", "امن", "تجارت", "یونیسکو", "یونیسف", "اسلامی تعاون کی تنظیم", "بحیرہ", "سمندر", "صحرا", "پہاڑ", "جھیل", "جزیرہ", "وادی", "بندرگاہ", "موسم", "مسجد", "مندر", "حج", "نبی", "زکوٰۃ", "کتاب", "مصنف", "شاعر", "ویژن"].every((t) => gkUrText.includes(t)));
check("U2 gk: exact counts, normalizations — قرآن پاک 8×, سورہ 6×, سورت 4× (incl. سورتیں 2×), مندرجہ ذیل 9×, حیدرآباد 3×, مظفر آباد 4×, قراردادِ لاہور 1×, فیصد 1×, بھارت 26×, انڈیا 2×, جنوبی افریقہ 10×, بیونس آئرس 3×, بحرالکاہل 7×, امریکہ 30×, ورلڈ کپ 18×, سونے کے تمغے 4×, اولمپک کھیل 14×, گیمز 4×, بھیجا جانے والا 3×, مرکزی علاقے 2×, جماعت 3×, تقریباً 3×, جبکہ 8×, بنیادی طور پر 11×, عام طور پر 6× (substring counts)",
  gkCount("قرآن پاک") === 8 && gkCount("سورہ") === 6 && gkCount("سورت") === 4 && gkCount("مندرجہ ذیل") === 9 && gkCount("حیدرآباد") === 3 && gkCount("مظفر آباد") === 4 && gkCount("قراردادِ لاہور") === 1 && gkCount("فیصد") === 1 && gkCount("بھارت") === 26 && gkCount("انڈیا") === 2 && gkCount("جنوبی افریقہ") === 10 && gkCount("بیونس آئرس") === 3 && gkCount("بحرالکاہل") === 7 && gkCount("امریکہ") === 30 && gkCount("ورلڈ کپ") === 18 && gkCount("سونے کے تمغے") === 4 && gkCount("اولمپک کھیل") === 14 && gkCount("گیمز") === 4 && gkCount("بھیجا جانے والا") === 3 && gkCount("مرکزی علاقے") === 2 && gkCount("جماعت") === 3 && gkCount("تقریباً") === 3 && gkCount("جبکہ") === 8 && gkCount("بنیادی طور پر") === 11 && gkCount("عام طور پر") === 6,
  `قرآن پاک ${gkCount("قرآن پاک")}, سورہ ${gkCount("سورہ")}, سورت ${gkCount("سورت")}, مندرجہ ذیل ${gkCount("مندرجہ ذیل")}, حیدرآباد ${gkCount("حیدرآباد")}, مظفر آباد ${gkCount("مظفر آباد")}, قراردادِ لاہور ${gkCount("قراردادِ لاہور")}, فیصد ${gkCount("فیصد")}, بھارت ${gkCount("بھارت")}, انڈیا ${gkCount("انڈیا")}, جنوبی افریقہ ${gkCount("جنوبی افریقہ")}, بیونس آئرس ${gkCount("بیونس آئرس")}, بحرالکاہل ${gkCount("بحرالکاہل")}, امریکہ ${gkCount("امریکہ")}, ورلڈ کپ ${gkCount("ورلڈ کپ")}, سونے کے تمغے ${gkCount("سونے کے تمغے")}, اولمپک کھیل ${gkCount("اولمپک کھیل")}, گیمز ${gkCount("گیمز")}, بھیجا جانے والا ${gkCount("بھیجا جانے والا")}, مرکزی علاقے ${gkCount("مرکزی علاقے")}, جماعت ${gkCount("جماعت")}, تقریباً ${gkCount("تقریباً")}, جبکہ ${gkCount("جبکہ")}, بنیادی طور پر ${gkCount("بنیادی طور پر")}, عام طور پر ${gkCount("عام طور پر")}`);
check("U2 gk: exact counts, institutions/places — وزیر اعظم 6×, قائد اعظم 1×, اقوام متحدہ 48×, صدر دفتر 17×, دریائے 68×, دریا 106× (incl. دریائے 68×), دریائے سندھ 7×, دریائے جہلم 7×, دریائے نیلم 2×, حکومت 62×, کونسل 29×, سینیٹ 3×, پارلیمنٹ 1×, سپریم کورٹ 1×, ہائی کورٹ 3×, قومی اسمبلی 6×, کرنسی 34×, بینک 16×, زبان 21×, قانون 13×, امن 34×, تجارت 15×, یونیسکو 5×, یونیسف 5×, اسلامی تعاون کی تنظیم 5×, بحیرہ 21×, سمندر 17×, صحرا 26×, پہاڑ 19×, جھیل 19×, جزیرہ 17×, وادی 6×, بندرگاہ 6×, زمین 19×, موسم 7×, آبادی 3×, مسجد 30×, مندر 26×, حج 21×, نبی 8×, زکوٰۃ 2×, کتاب 12×, مصنف 4×, شاعر 3×, ویژن 9× (substring counts)",
  gkCount("وزیر اعظم") === 6 && gkCount("قائد اعظم") === 1 && gkCount("اقوام متحدہ") === 48 && gkCount("صدر دفتر") === 17 && gkCount("دریائے") === 68 && gkCount("دریا") === 106 && gkCount("دریائے سندھ") === 7 && gkCount("دریائے جہلم") === 7 && gkCount("دریائے نیلم") === 2 && gkCount("حکومت") === 62 && gkCount("کونسل") === 29 && gkCount("سینیٹ") === 3 && gkCount("پارلیمنٹ") === 1 && gkCount("سپریم کورٹ") === 1 && gkCount("ہائی کورٹ") === 3 && gkCount("قومی اسمبلی") === 6 && gkCount("کرنسی") === 34 && gkCount("بینک") === 16 && gkCount("زبان") === 21 && gkCount("قانون") === 13 && gkCount("امن") === 34 && gkCount("تجارت") === 15 && gkCount("یونیسکو") === 5 && gkCount("یونیسف") === 5 && gkCount("اسلامی تعاون کی تنظیم") === 5 && gkCount("بحیرہ") === 21 && gkCount("سمندر") === 17 && gkCount("صحرا") === 26 && gkCount("پہاڑ") === 19 && gkCount("جھیل") === 19 && gkCount("جزیرہ") === 17 && gkCount("وادی") === 6 && gkCount("بندرگاہ") === 6 && gkCount("زمین") === 19 && gkCount("موسم") === 7 && gkCount("آبادی") === 3 && gkCount("مسجد") === 30 && gkCount("مندر") === 26 && gkCount("حج") === 21 && gkCount("نبی") === 8 && gkCount("زکوٰۃ") === 2 && gkCount("کتاب") === 12 && gkCount("مصنف") === 4 && gkCount("شاعر") === 3 && gkCount("ویژن") === 9,
  `وزیر اعظم ${gkCount("وزیر اعظم")}, قائد اعظم ${gkCount("قائد اعظم")}, اقوام متحدہ ${gkCount("اقوام متحدہ")}, صدر دفتر ${gkCount("صدر دفتر")}, دریائے ${gkCount("دریائے")}, دریا ${gkCount("دریا")}, دریائے سندھ ${gkCount("دریائے سندھ")}, دریائے جہلم ${gkCount("دریائے جہلم")}, دریائے نیلم ${gkCount("دریائے نیلم")}, حکومت ${gkCount("حکومت")}, کونسل ${gkCount("کونسل")}, سینیٹ ${gkCount("سینیٹ")}, پارلیمنٹ ${gkCount("پارلیمنٹ")}, سپریم کورٹ ${gkCount("سپریم کورٹ")}, ہائی کورٹ ${gkCount("ہائی کورٹ")}, قومی اسمبلی ${gkCount("قومی اسمبلی")}, کرنسی ${gkCount("کرنسی")}, بینک ${gkCount("بینک")}, زبان ${gkCount("زبان")}, قانون ${gkCount("قانون")}, امن ${gkCount("امن")}, تجارت ${gkCount("تجارت")}, یونیسکو ${gkCount("یونیسکو")}, یونیسف ${gkCount("یونیسف")}, اسلامی تعاون کی تنظیم ${gkCount("اسلامی تعاون کی تنظیم")}, بحیرہ ${gkCount("بحیرہ")}, سمندر ${gkCount("سمندر")}, صحرا ${gkCount("صحرا")}, پہاڑ ${gkCount("پہاڑ")}, جھیل ${gkCount("جھیل")}, جزیرہ ${gkCount("جزیرہ")}, وادی ${gkCount("وادی")}, بندرگاہ ${gkCount("بندرگاہ")}, زمین ${gkCount("زمین")}, موسم ${gkCount("موسم")}, آبادی ${gkCount("آبادی")}, مسجد ${gkCount("مسجد")}, مندر ${gkCount("مندر")}, حج ${gkCount("حج")}, نبی ${gkCount("نبی")}, زکوٰۃ ${gkCount("زکوٰۃ")}, کتاب ${gkCount("کتاب")}, مصنف ${gkCount("مصنف")}, شاعر ${gkCount("شاعر")}, ویژن ${gkCount("ویژن")}`);
check("U2 gk: exact counts, kept splits — فٹ بال 9×, فٹبال 2×, امریکی فٹبال 2×, ترکی 10× (incl. ترکیہ 2×), ترکیہ 2×, ترکیہ اور شام 2×, ہجرت 5×, درجہ حرارت 4×, درجہ 13× (incl. مندرجہ ذیل 9× + درجہ حرارت 4×), درجے 1×, آرٹیکل 1×, جنوبی قطب 2×, فیڈریشن 4×, وفاقی 10×, روپیہ 8×, روپے 1×, سامان 2×, احتساب سیل 2×, سیلاب 2×, کس سال میں 3×, کس سال 26×, جنگ بدر 3×, مزار قائد 3×, سلطنت عثمانیہ 2×, ریال 8×, ایڈز کا عالمی دن 2×, عالمی یوم 8×, بیلنس 1×, اسمگلنگ 1×, نشان 9×, علامتی 1×, گیٹ 6× (incl. بل گیٹس 5×), بل گیٹس 5×, مقولہ 2×, نعرہ 4×, قمری 1×, چاند 21×, علوم 13×, سلسلہ 4×, لانچ 17×, نرسنگ 3×, عظیم برطانیہ 2×, جمعیت اقوام 2×, قبل مسیح 6×, ٹائم زون 2×, خشکی میں گھرا ہوا 2×, پچاس ممالک 1×, کھیل 36×, اولمپک 27×, کرکٹ 15×, ہاکی 10×, تمغہ 4×, ریکارڈ 6×, خلائی 29×, کمپیوٹر 16×, سائنس 8×, سورج 3×, ستارہ 4×, ایمان، اتحاد، تنظیم 2×, دی ڈسکوری آف انڈیا 2× (substring counts)",
  gkCount("فٹ بال") === 9 && gkCount("فٹبال") === 2 && gkCount("امریکی فٹبال") === 2 && gkCount("ترکی") === 10 && gkCount("ترکیہ") === 2 && gkCount("ترکیہ اور شام") === 2 && gkCount("ہجرت") === 5 && gkCount("درجہ حرارت") === 4 && gkCount("درجہ") === 13 && gkCount("درجے") === 1 && gkCount("آرٹیکل") === 1 && gkCount("جنوبی قطب") === 2 && gkCount("فیڈریشن") === 4 && gkCount("وفاقی") === 10 && gkCount("روپیہ") === 8 && gkCount("روپے") === 1 && gkCount("سامان") === 2 && gkCount("احتساب سیل") === 2 && gkCount("سیلاب") === 2 && gkCount("کس سال میں") === 3 && gkCount("کس سال") === 26 && gkCount("جنگ بدر") === 3 && gkCount("مزار قائد") === 3 && gkCount("سلطنت عثمانیہ") === 2 && gkCount("ریال") === 8 && gkCount("ایڈز کا عالمی دن") === 2 && gkCount("عالمی یوم") === 8 && gkCount("بیلنس") === 1 && gkCount("اسمگلنگ") === 1 && gkCount("نشان") === 9 && gkCount("علامتی") === 1 && gkCount("گیٹ") === 6 && gkCount("بل گیٹس") === 5 && gkCount("مقولہ") === 2 && gkCount("نعرہ") === 4 && gkCount("قمری") === 1 && gkCount("چاند") === 21 && gkCount("علوم") === 13 && gkCount("سلسلہ") === 4 && gkCount("لانچ") === 17 && gkCount("نرسنگ") === 3 && gkCount("عظیم برطانیہ") === 2 && gkCount("جمعیت اقوام") === 2 && gkCount("قبل مسیح") === 6 && gkCount("ٹائم زون") === 2 && gkCount("خشکی میں گھرا ہوا") === 2 && gkCount("پچاس ممالک") === 1 && gkCount("کھیل") === 36 && gkCount("اولمپک") === 27 && gkCount("کرکٹ") === 15 && gkCount("ہاکی") === 10 && gkCount("تمغہ") === 4 && gkCount("ریکارڈ") === 6 && gkCount("خلائی") === 29 && gkCount("کمپیوٹر") === 16 && gkCount("سائنس") === 8 && gkCount("سورج") === 3 && gkCount("ستارہ") === 4 && gkCount("ایمان، اتحاد، تنظیم") === 2 && gkCount("دی ڈسکوری آف انڈیا") === 2,
  `فٹ بال ${gkCount("فٹ بال")}, فٹبال ${gkCount("فٹبال")}, امریکی فٹبال ${gkCount("امریکی فٹبال")}, ترکی ${gkCount("ترکی")}, ترکیہ ${gkCount("ترکیہ")}, ترکیہ اور شام ${gkCount("ترکیہ اور شام")}, ہجرت ${gkCount("ہجرت")}, درجہ حرارت ${gkCount("درجہ حرارت")}, درجہ ${gkCount("درجہ")}, درجے ${gkCount("درجے")}, آرٹیکل ${gkCount("آرٹیکل")}, جنوبی قطب ${gkCount("جنوبی قطب")}, فیڈریشن ${gkCount("فیڈریشن")}, وفاقی ${gkCount("وفاقی")}, روپیہ ${gkCount("روپیہ")}, روپے ${gkCount("روپے")}, سامان ${gkCount("سامان")}, احتساب سیل ${gkCount("احتساب سیل")}, سیلاب ${gkCount("سیلاب")}, کس سال میں ${gkCount("کس سال میں")}, کس سال ${gkCount("کس سال")}, جنگ بدر ${gkCount("جنگ بدر")}, مزار قائد ${gkCount("مزار قائد")}, سلطنت عثمانیہ ${gkCount("سلطنت عثمانیہ")}, ریال ${gkCount("ریال")}, ایڈز کا عالمی دن ${gkCount("ایڈز کا عالمی دن")}, عالمی یوم ${gkCount("عالمی یوم")}, بیلنس ${gkCount("بیلنس")}, اسمگلنگ ${gkCount("اسمگلنگ")}, نشان ${gkCount("نشان")}, علامتی ${gkCount("علامتی")}, گیٹ ${gkCount("گیٹ")}, بل گیٹس ${gkCount("بل گیٹس")}, مقولہ ${gkCount("مقولہ")}, نعرہ ${gkCount("نعرہ")}, قمری ${gkCount("قمری")}, چاند ${gkCount("چاند")}, علوم ${gkCount("علوم")}, سلسلہ ${gkCount("سلسلہ")}, لانچ ${gkCount("لانچ")}, نرسنگ ${gkCount("نرسنگ")}, عظیم برطانیہ ${gkCount("عظیم برطانیہ")}, جمعیت اقوام ${gkCount("جمعیت اقوام")}, قبل مسیح ${gkCount("قبل مسیح")}, ٹائم زون ${gkCount("ٹائم زون")}, خشکی میں گھرا ہوا ${gkCount("خشکی میں گھرا ہوا")}, پچاس ممالک ${gkCount("پچاس ممالک")}, کھیل ${gkCount("کھیل")}, اولمپک ${gkCount("اولمپک")}, کرکٹ ${gkCount("کرکٹ")}, ہاکی ${gkCount("ہاکی")}, تمغہ ${gkCount("تمغہ")}, ریکارڈ ${gkCount("ریکارڈ")}, خلائی ${gkCount("خلائی")}, کمپیوٹر ${gkCount("کمپیوٹر")}, سائنس ${gkCount("سائنس")}, سورج ${gkCount("سورج")}, ستارہ ${gkCount("ستارہ")}, ایمان، اتحاد، تنظیم ${gkCount("ایمان، اتحاد، تنظیم")}, دی ڈسکوری آف انڈیا ${gkCount("دی ڈسکوری آف انڈیا")}`);
// EN-correspondence: فٹبال (joined) occurs ONLY where EN
// says "American football" (2 fields); spaced فٹ بال occurs
// ONLY where EN says "football" without "American" (8 fields).
let gkFootballJoined = 0, gkFootballSpaced = 0, gkFootballBad = [];
for (const q of gk) {
  const fields = [[q.question, q.question_ur], ...q.options.map((o, i) => [o, q.options_ur[i]]), [q.explanation, q.explanation_ur]];
  for (const [en, ur] of fields) {
    if (tokens(ur).includes("فٹبال")) {
      gkFootballJoined += 1;
      if (!/american football/i.test(en)) gkFootballBad.push(q.id);
    }
    if ((ur ?? "").includes("فٹ بال")) {
      gkFootballSpaced += 1;
      if (!/football/i.test(en) || /american football/i.test(en)) gkFootballBad.push(q.id);
    }
  }
}
check("U2 gk: فٹبال token in exactly 2 fields, every one with EN 'American football'; فٹ بال in exactly 8 fields, every one with EN 'football' without 'American'", gkFootballJoined === 2 && gkFootballSpaced === 8 && gkFootballBad.length === 0, `joined ${gkFootballJoined}, spaced ${gkFootballSpaced}, bad ${gkFootballBad.slice(0, 3).join(", ")}`);
// EN-correspondence: ترکی token ↔ EN "Turkey" (8 fields);
// ترکیہ token ↔ EN "Turkiye" (2 fields). The EN
// inconsistency is pinned, not resolved.
let gkTurkey = 0, gkTurkiye = 0, gkTurkeyBad = [];
for (const q of gk) {
  const fields = [[q.question, q.question_ur], ...q.options.map((o, i) => [o, q.options_ur[i]]), [q.explanation, q.explanation_ur]];
  for (const [en, ur] of fields) {
    const tk = tokens(ur);
    if (tk.includes("ترکی")) {
      gkTurkey += 1;
      if (!/\bTurkey\b/.test(en)) gkTurkeyBad.push(q.id);
    }
    if (tk.includes("ترکیہ")) {
      gkTurkiye += 1;
      if (!/\bTurkiye\b/.test(en)) gkTurkeyBad.push(q.id);
    }
  }
}
check("U2 gk: ترکی token in exactly 8 fields, every one with EN 'Turkey'; ترکیہ token in exactly 2 fields, every one with EN 'Turkiye'", gkTurkey === 8 && gkTurkiye === 2 && gkTurkeyBad.length === 0, `Turkey ${gkTurkey}, Turkiye ${gkTurkiye}, bad ${gkTurkeyBad.slice(0, 3).join(", ")}`);
// EN-correspondence: انڈیا token occurs ONLY in the book
// title "The Discovery of India" (GKN-457 Q+E).
let gkIndiaFields = 0, gkIndiaBad = [];
for (const q of gk) {
  const fields = [[q.question, q.question_ur], ...q.options.map((o, i) => [o, q.options_ur[i]]), [q.explanation, q.explanation_ur]];
  for (const [en, ur] of fields) {
    if (tokens(ur).includes("انڈیا")) {
      gkIndiaFields += 1;
      if (!/The Discovery of India/.test(en)) gkIndiaBad.push(q.id);
    }
  }
}
check("U2 gk: انڈیا token in exactly 2 fields, both EN 'The Discovery of India' (book title)", gkIndiaFields === 2 && gkIndiaBad.length === 0, `fields ${gkIndiaFields}, bad ${gkIndiaBad.slice(0, 3).join(", ")}`);
let gkDarjaBad = [];
for (const [loc, val] of gkPairs) {
  if (tokens(val).includes("درجہ") && !(val ?? "").includes("درجہ حرارت")) gkDarjaBad.push(loc);
}
check("U2 gk: درجہ token survives ONLY inside درجہ حرارت (4×); ڈگری 0×", gkDarjaBad.length === 0 && gkCount("درجہ حرارت") === 4 && gkCount("ڈگری") === 0, gkDarjaBad.slice(0, 3).join(", "));
// % rule: % in exactly the 4 GKN-027 option fields,
// matching EN counts field-by-field; no % added anywhere;
// prose uses فیصد (1×, GKN-027E).
let gkPctBad = [], gkPctFields = [];
for (const q of gk) {
  const fields = [[q.question, q.question_ur], [q.explanation, q.explanation_ur], ...q.options.map((o, i) => [o, q.options_ur[i]])];
  for (const [en, ur] of fields) {
    const ce = (en.match(/%/g) || []).length, cu = (ur.match(/%/g) || []).length;
    if (cu > 0) gkPctFields.push(q.id);
    if (cu > ce) gkPctBad.push(q.id);
  }
}
check("U2 gk: % never added in any _ur field; exactly 4 % fields, all GKN-027 options; فیصد 1×", gkPctBad.length === 0 && gkPctFields.length === 4 && gkPctFields.every((id) => id === "GKN-027") && gkCount("فیصد") === 1, `added in ${gkPctBad.slice(0, 3).join(", ")}, fields ${gkPctFields.join(", ")}`);
// Bank structure: 60 Current Affairs items, each with a
// 4-digit year in EN Q and EN E (EN unchanged by rewrite).
const gkCA = gk.filter((q) => q.topic === "GK — Current Affairs");
const gkCABad = gkCA.filter((q) => !(/\b\d{4}\b/.test(q.question) && /\b\d{4}\b/.test(q.explanation)));
check("U2 gk: 60 Current Affairs items, each with a 4-digit year in EN question and EN explanation", gkCA.length === 60 && gkCABad.length === 0, `CA ${gkCA.length}, bad ${gkCABad.slice(0, 3).map((q) => q.id).join(", ")}`);
const gkById = new Map(gk.map((q) => [q.id, q]));
check("U2 gk: explanationUrdu null in all 500; no explanationEn field anywhere", gk.every((q) => q.explanationUrdu === null) && gk.every((q) => !("explanationEn" in q)));
check("U2 gk: exact-field pins — GKN-016E motto in Urdu script, GKN-083Q/E مظفر آباد, GKN-089E قراردادِ لاہور, GKN-178Q مرکزی علاقے, GKN-242E گیٹ (GATT transliteration), GKN-387Q اس سے پہلے کی, GKN-358Q جیولن تھرو کی دوری, GKN-027E فیصد, GKN-066E 7,708, GKN-028 honorifics on all 4 options + explanation",
  gkById.get("GKN-016").explanation_ur === "پاکستان کا قومی نعرہ 'ایمان، اتحاد، تنظیم' ہے۔" &&
  gkById.get("GKN-083").question_ur.includes("مظفر آباد") && gkById.get("GKN-083").explanation_ur.includes("مظفر آباد") &&
  gkById.get("GKN-089").explanation_ur.includes("قراردادِ لاہور") &&
  gkById.get("GKN-178").question_ur.includes("مرکزی علاقے") &&
  gkById.get("GKN-242").explanation_ur.includes("گیٹ") &&
  gkById.get("GKN-387").question_ur.includes("اس سے پہلے کی") &&
  gkById.get("GKN-358").question_ur.includes("جیولن تھرو کی دوری") &&
  gkById.get("GKN-027").explanation_ur.includes("فیصد") &&
  gkById.get("GKN-066").explanation_ur.includes("7,708") &&
  gkById.get("GKN-028").options_ur.every((o) => o.includes("رضی اللہ عنہ")) && gkById.get("GKN-028").explanation_ur.includes("رضی اللہ عنہ"));

// ---------- §3L IT bank (U2 subject 11) ----------
// U2 rewrote the IT _ur fields (2235 of 3000
// field-values changed; 493/500 items; 7 unchanged:
// ITC-458..463 + ITC-485, all Latin gate/button items).
// Bank split (Phase 1 + Phase 4 provenance, untouched
// since): ITC-001..030 keep ai-generated source +
// explanationEn + pure-Roman stored explanations (U2 took
// meaning from explanationEn); ITC-031..060 keep Phase 4
// provenance; ITC-061..500 are the Phase 1 append.
// explanationUrdu is null in all 500; explanationEn in
// exactly ITC-001..030. Digit rule is STRICT on every
// field vs EN; explanations of ITC-001..030 also vs
// explanationEn (baseline measured 0 mismatches on both).
// Latin rule is stripCode + allowlist (ported from the
// U2-IT central validator): code spans, HTML tags, quoted
// literals, formulas/cell refs, extensions/URLs/emails,
// shortcuts stripped; KEEP_PHRASES (exact UI labels);
// remaining Latin words must be all-caps acronyms/units,
// single letters, NAMES (products/keys/languages/code
// tokens), or field-scoped EXCEPTIONS (documented keeps).
// Verbatim-shaped options (suite isTechVerbatim + brief
// single-token rule) stay byte-identical and are exempt
// from per-field checks, EXCEPT the 31 EXACT_MAP entries
// (brief-ordered translations, exact equality). Logic-gate
// exception (guide §5.2): in ITC-458..464 ONLY, Latin
// gate/input/output stay; ITC-306 "gateway" is a network
// device -> گیٹ وے. Latin ? is 0 fields; Latin ;
// survives ONLY in ITC-147O0 (verbatim ";" option);
// Latin comma in exactly the 20 inventoried fields; % in
// exactly ITC-028O3 (verbatim option), prose uses فیصد
// (1×). Splits KEPT (different EN, sense, cluster, or
// grammar — not spelling variants): COPY 5-way (verb ->
// نقل کرنا; clipboard ops -> کاپی family; cache/stored
// copies -> کاپی; backup copies -> نقل/نقلیں; Mail-Merge
// copies -> کاپی; print copies -> نقل); PRINT 2-way
// (printer-as-agent -> پرنٹ کرنا; program output +
// physical production -> چھاپنا); LINE 4-way (text lines
// -> لکیر; book lines -> سطر, ITC-252 only, flagged;
// underline stroke -> خط, ITC-254/255; technical/
// compound/code lines -> لائن); SYSTEM (generic ->
// نظام; 10 compound names -> سسٹم, residual pinned);
// قدر = technical "value" vs قیمت = price/cost/paid;
// جدول generic vs "Table" Latin only at ITC-246;
// فنکشن for programming (DELIBERATE divergence from
// Maths تفاعل, whose EN was the mathematical function);
// اشیا KEPT for EN "goods"/"items sold" (3 fields;
// DELIBERATE divergence from Pak Studies/GK ban, Social
// Studies precedent); authentication -> آتھنٹیکیشن vs
// validation -> توثیق vs verification/verify -> تصدیق;
// ونڈو (OS window) vs کھڑکی (physical window, 2 fields)
// vs ونڈوز (Windows OS transliteration, 8× — Latin
// "Windows" also kept elsewhere, flagged); فل ONLY in
// the technical full-backup sense (6 fields); گروہ ONLY
// at ITC-117 (EN "group" of data) vs گروپ elsewhere;
// Mail Merge Latin at ITC-248 vs میل مرج at ITC-249;
// نیٹکٹ (439), سرقہ (440), ایرگونومکس noun (444) vs
// ایرگونومک adjective (096), انٹیجر (354),
// کمبینیشنل/سیکوینشل (465/466), انکریمنٹل/ڈیفرینشل
// (489), سپروائزڈ/ان سپروائزڈ/رینفورسمنٹ لرننگ (448),
// تسلسل/انتخاب/تکرار (337) — all flagged for owner
// confirmation. Normalizations: ITC-118 options reverted
// to verbatim Latin pairings; ITC-246 options added
// (feature names + کی خصوصیت); ITC-249 Mail Merge ->
// میل مرج; ITC-232/284 clipboard نقل -> کاپی + چسپاں
// -> پیسٹ; ITC-256 Dictionary/Translator restored to
// Latin; ITC-321 options reverted to EN field labels;
// ITC-489 "System Restore" proper casing; ITC-439
// Netiquette -> نیٹکٹ + سامان -> اشیا; بائٹ -> بائٹس
// plurals (151/154/155); ITC-471/472 نصب -> انسٹال +
// صارف -> گاہک (cloud-customer sense); ITC-482 روشنی
// -> چمک; ITC-492 نقلیں -> نقلی مشقیں; ITC-314 بیک اپ
// کاپیاں -> بیک اپ نقلیں; ITC-440 Plagiarism -> سرقہ;
// ITC-444 ergonomics -> ایرگونومکس; ڈیبگنگ -> ڈی بگنگ;
// ITC-483 ویب سائٹیں -> ویب سائٹس; فورا -> فوراً;
// round-2: شیئر family (6 fields), مصنوعہ (215),
// سیل (251), پاور کیبل (414), پروسیس/پروسیسنگ (8),
// پرنٹ/چھاپنا (7), مستقل کاپی (079O3), گروپ (448),
// پوائنٹنگ ڈیوائس (005E), جوابی پرچے (099O2),
// صحت کے ریکارڈز (476E), 449E fidelity + 473Q grammar
// fixes. Flagged facts mirrored, not resolved:
// ITC-184/185, ITC-255, ITC-118, ITC-147, ITC-424,
// ITC-246 + ~90 worker-flagged values (see
// VERIFY-u2-it.md §8).
const it = JSON.parse(fs.readFileSync(join(ROOT, "src/data/banks/it.json"), "utf8"));
check("U2 it: 500 items", it.length === 500, `got ${it.length}`);
const itIdsOk = it.every((q, i) => q.id === `ITC-${String(i + 1).padStart(3, "0")}`);
check("U2 it: IDs ITC-001..ITC-500 in order", itIdsOk);
const itPairs = [];
for (const q of it) {
  itPairs.push([`${q.id}:question_ur`, q.question_ur]);
  q.options_ur.forEach((o, i) => itPairs.push([`${q.id}:options_ur[${i}]`, o]));
  itPairs.push([`${q.id}:explanation_ur`, q.explanation_ur]);
}
// Validator tokenizer (validate-it-slices.cjs): the suite
// TOK_SPLIT splits on more separators, so the banned check
// uses the validator's tokenizer for exact parity.
const itTokens = (s) => (s ?? "").split(/[\s،؛۔؟:()\[\]""''«»]+/).filter(Boolean);
const IT_BANNED = ["پیڈاگوجی", "پریکٹس", "اسکور", "موکس", "سورۃ", "چنیں", "مونث", "مؤنث", "وزیراعظم", "تقریبا", "فورا", "محمدن", "ووٹرز", "ججز"];
const itBanned = [];
const itPrefixBad = [];
for (const [loc, val] of itPairs) {
  for (const tok of itTokens(val)) {
    if (IT_BANNED.includes(tok)) itBanned.push(`${loc}:${tok}`);
    else if (tok === "سکرین" || tok.startsWith("سکرین")) itPrefixBad.push(`${loc}:سکرین`);
    else if (tok === "سپیکر" || tok.startsWith("سپیکر")) itPrefixBad.push(`${loc}:سپیکر`);
    else if (tok === "ٹیبل" || (tok.startsWith("ٹیبل") && !tok.startsWith("ٹیبلیٹ"))) itPrefixBad.push(`${loc}:ٹیبل`);
  }
}
check("U2 it: no banned glossary/variant terms in any _ur field (token-aware; اشیا/اشیاء NOT banned — SS precedent, EN 'goods'/'items sold'; سکرین/سپیکر/ٹیبل prefix forms banned, ٹیبلیٹ exempt)", itBanned.length === 0 && itPrefixBad.length === 0, [...itBanned, ...itPrefixBad].slice(0, 5).join(", "));
const IT_PHRASES = ["درج ذیل", "جب کہ", "ایک دفعہ", "بہتر طور پر", "بہتر بیان", "قرآن مجید", "حیدر آباد", "ہارڈ کاپی", "سافٹ کاپی"];
const itPhrases = itPairs.filter(([, v]) => IT_PHRASES.some((p) => (v ?? "").includes(p)));
check("U2 it: no banned phrases in any _ur field (calques, variant spellings, hard/soft copy)", itPhrases.length === 0, itPhrases.slice(0, 3).map(([l]) => l).join(", "));
const itEmdash = itPairs.filter(([, v]) => (v ?? "").includes("—"));
check("U2 it: no em-dash in any _ur field", itEmdash.length === 0, itEmdash.slice(0, 3).map(([l]) => l).join(", "));
const itMarker = itPairs.filter(([, v]) => (v ?? "").includes("[Auto-Translated]"));
check("U2 it: no '[Auto-Translated]' literal in any _ur field", itMarker.length === 0, itMarker.slice(0, 3).map(([l]) => l).join(", "));
const itMojibake = itPairs.filter(([, v]) => (v ?? "").includes("�"));
check("U2 it: no U+FFFD in any _ur field", itMojibake.length === 0, itMojibake.slice(0, 3).map(([l]) => l).join(", "));
const itIndic = itPairs.filter(([, v]) => /[۰-۹]/.test(v ?? ""));
check("U2 it: no Urdu-Indic digits in any _ur field", itIndic.length === 0, itIndic.slice(0, 3).map(([l]) => l).join(", "));
const itEllipsis = itPairs.filter(([, v]) => (v ?? "").includes("...") || (v ?? "").includes("…"));
check("U2 it: no ellipsis runs in any _ur field", itEllipsis.length === 0, itEllipsis.slice(0, 3).map(([l]) => l).join(", "));
let itDigitBad = [];
for (const q of it) {
  if (!sameMultiset(digitRuns(q.question), digitRuns(q.question_ur))) itDigitBad.push(`${q.id}:question_ur`);
  q.options.forEach((o, i) => {
    if (!sameMultiset(digitRuns(o), digitRuns(q.options_ur[i]))) itDigitBad.push(`${q.id}:options_ur[${i}]`);
  });
  if (!sameMultiset(digitRuns(q.explanation), digitRuns(q.explanation_ur))) itDigitBad.push(`${q.id}:explanation_ur`);
  if (q.explanationEn && !sameMultiset(digitRuns(q.explanationEn), digitRuns(q.explanation_ur))) itDigitBad.push(`${q.id}:explanation_ur:en`);
}
check("U2 it: digit preservation STRICT on every field (all 500 questions, options, explanations; ITC-001..030 explanations also vs explanationEn)", itDigitBad.length === 0, itDigitBad.slice(0, 5).join(", "));
// Verbatim options: suite isTechVerbatim (copied EXACTLY
// from scripts/test-phase1-it.mjs — do not drift) + brief
// single-token code/password rule; EXACT_MAP carve-outs
// (brief-ordered translations, exact equality).
const IT_PURE_EXPR = /^[\d\s\/\.\+\-=\%\(\)xX\:\^\u2212,]+$/;
const IT_FORMULA = /^(?=.*\d)[A-Za-z0-9()]+$/;
function itIsTechVerbatim(opt) {
  const t = opt.trim();
  if (IT_PURE_EXPR.test(t) || IT_FORMULA.test(t)) return true;
  const nospace = t.replace(/\s+/g, "");
  if (/[+.<>\/\\@#:;=\-_()\[\]{}]/.test(nospace) && /^[A-Za-z0-9+.<>\/\\@#:;=\-_()\[\]{}%]+$/.test(nospace)) return true;
  if (/^([A-Z]{1,6}|\d+)(,\s*([A-Z]{1,6}|\d+))*$/.test(t)) return true;
  return false;
}
function itIsBriefVerbatim(opt) {
  const t = opt.trim();
  if (/\s/.test(t)) return false;
  if (!/^[A-Za-z0-9!'"~`$&*?^@#%:;=\-_+.<>\/\\()\[\]{}]+$/.test(t)) return false;
  if (/[0-9]/.test(t) && /[^A-Za-z0-9]/.test(t)) return true;
  if (/[!'\"~`$&*?^]/.test(t)) return true;
  return false;
}
const itIsVerbatim = (opt) => itIsTechVerbatim(opt) || itIsBriefVerbatim(opt);
const IT_EXACT_MAP = {
  "ITC-010": ["ٹیرا بائٹ (TB)", "کلو بائٹ (KB)", "میگا بائٹ (MB)", "گیگا بائٹ (GB)"],
  "ITC-329": { 2: "ای کامرس" },
  "ITC-465": { 2: "فلپ فلاپ سرکٹ" },
  "ITC-469": { 2: "فلپ فلاپ" },
  "ITC-288": ["وائیڈ ایریا نیٹ ورک (WAN)", "لوکل ایریا نیٹ ورک (LAN)", "میٹروپولیٹن ایریا نیٹ ورک (MAN)", "پرسنل ایریا نیٹ ورک (PAN)"],
  "ITC-289": ["لوکل ایریا نیٹ ورک (LAN)", "میٹروپولیٹن ایریا نیٹ ورک (MAN)", "پرسنل ایریا نیٹ ورک (PAN)", "وائیڈ ایریا نیٹ ورک (WAN)"],
  "ITC-290": ["میٹروپولیٹن ایریا نیٹ ورک (MAN)", "لوکل ایریا نیٹ ورک (LAN)", "وائیڈ ایریا نیٹ ورک (WAN)", "پرسنل ایریا نیٹ ورک (PAN)"],
  "ITC-291": ["وائیڈ ایریا نیٹ ورک (WAN)", "میٹروپولیٹن ایریا نیٹ ورک (MAN)", "پرسنل ایریا نیٹ ورک (PAN)", "کیمپس ایریا نیٹ ورک (CAN)"],
  "ITC-292": ["پرسنل ایریا نیٹ ورک (PAN)", "کیمپس ایریا نیٹ ورک (CAN)", "وائیڈ ایریا نیٹ ورک (WAN)", "میٹروپولیٹن ایریا نیٹ ورک (MAN)"],
  "ITC-298": { 0: "پیئر ٹو پیئر ماڈل", 1: "کلائنٹ سرور ماڈل" },
  "ITC-299": { 0: "لوکل ایریا نیٹ ورک (LAN)", 3: "پرسنل ایریا نیٹ ورک (PAN)" },
};
let itVerbatimBad = [];
for (const q of it) {
  const verbatimOpt = q.options.map((o) => itIsVerbatim(o));
  q.options.forEach((o, j) => {
    const em = IT_EXACT_MAP[q.id];
    const want = Array.isArray(em) ? em[j] : (em && em[j]);
    if (want !== undefined) {
      if (q.options_ur[j] !== want) itVerbatimBad.push(`${q.id}:opt${j}:exact`);
      return;
    }
    if (verbatimOpt[j] && q.options_ur[j] !== o) itVerbatimBad.push(`${q.id}:opt${j}`);
  });
}
check("U2 it: verbatim-shaped options byte-identical (suite + brief rules) except 31 EXACT_MAP entries at exact equality", itVerbatimBad.length === 0, itVerbatimBad.slice(0, 5).join(", "));
// Latin allowlist machinery, ported from the U2-IT central
// validator (validate-it-slices.cjs): stripCode,
// KEEP_PHRASES, NAMES, EXCEPTIONS (ITC-374 merged — the
// validator file carries a duplicate key whose second
// entry subsumes the first).
const IT_KEEP_PHRASES = [
  "Prevention of Electronic Crimes Act",
  "Rehearse Timings", "Conditional Formatting", "Find and Replace",
  "Disk Defragmenter", "Windows Security", "Slide Sorter", "Slide Master",
  "Reading View", "Outline View", "Normal View", "Recycle Bin",
  "Control Panel", "File Explorer", "Task Manager", "Print Preview",
  "User Accounts", "Windows Update", "System Restore", "Disk Cleanup",
  "Virtual Machine", "Data Validation", "Track Changes", "Freeze Panes",
  "Save As", "Safe Mode", "Home tab", "Insert tab", "Mail Merge",
  "Drop Cap", "Page Number", "Text Box", "Small Caps", "Word Count",
  "Spell Check", "Fill Handle", "Caps Lock", "Num Lock", "Page Up",
  "Page Down", "Blu-ray", "Wi-Fi", "MS-DOS",
  "MS Office", "MS Word", "MS Excel",
  "Device Manager", "End task", "Empty Recycle Bin", "Replace All",
  "Font Color", "Switch user", "Sign out", "Draft View",
  "Office Clipboard",
  "Normal view", "Slide Sorter view", "Reading view", "Outline view",
].sort((a, b) => b.length - a.length);
const IT_NAMES = new Set([
  "Microsoft", "Windows", "Google", "Chrome", "Linux", "Unix", "JavaScript",
  "Facebook", "IBM", "Word", "Excel", "PowerPoint", "Access", "Outlook",
  "OneNote", "Teams", "OneDrive", "SharePoint", "WordArt", "Notepad",
  "WordPad", "Paint", "Edge", "Opera", "Firefox", "Safari", "Android",
  "Bing", "Yahoo", "Wikipedia", "Amazon", "Daraz", "Photoshop", "AutoCAD",
  "MATLAB", "Norton", "McAfee", "Kaspersky", "Avast", "Intel", "Dell",
  "Apple", "Samsung", "Nokia", "Sony", "Canon", "Epson", "Huawei",
  "Xiaomi", "PTCL", "Jazz", "Telenor", "Zong", "Ufone", "Cortana",
  "ChatGPT", "Ethernet", "Unicode", "YouTube", "Twitter", "Instagram",
  "WhatsApp", "LinkedIn", "Skype", "Nvidia", "Oracle", "Cisco", "Adobe",
  "Thesaurus", "Taskbar",
  "IaaS", "PaaS", "SaaS", "NVMe", "PCIe",
  "Python", "Java", "Perl", "Swift", "Kotlin", "Rust", "Scala", "Pascal",
  "Ruby",
  "Ctrl", "Alt", "Shift", "Del", "Esc", "Tab", "Win", "Fn", "Enter",
  "Backspace", "Spacebar", "Delete",
  "WiFi", "macOS", "iOS", "IPv4", "IPv6", "microSD", "GHz", "MHz", "KHz",
  "Hz", "Kbps", "Mbps", "Gbps", "KBps", "MBps", "GBps",
  "href", "src", "alt", "ul", "ol", "img", "onclick",
  "true", "false", "True", "False", "Rs",
]);
const IT_ALL_CAPS = /^[A-Z0-9]{2,}$/;
function itStripCode(s) {
  let r = s;
  r = r.replace(/<[^<>]*>/g, " ");
  r = r.replace(/"[^"]*"/g, " ");
  r = r.replace(/'[^']*'/g, " ");
  r = r.replace(/=[A-Za-z]+\([^)]*\)/g, " ");
  r = r.replace(/(?<!\.)\b[A-Za-z]{1,3}\d+(:[A-Za-z]{1,3}\d+)?\b/g, " ");
  r = r.replace(/\b[1-4]GL\b/g, " ");
  r = r.replace(/\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b/g, " ");
  r = r.replace(/\b(https?:\/\/|www\.)\S+/g, " ");
  r = r.replace(/\b[\w-]+\.(docx|xlsx|pptx|ppsx|txt|jpg|jpeg|png|gif|bat|exe|zip|pdf|mp3|mp4|html|css|js|doc|csv|ppt|xls)\b/gi, " ");
  r = r.replace(/(?<![A-Za-z0-9])\.(docx|xlsx|pptx|ppsx|txt|jpg|jpeg|png|gif|bat|exe|zip|pdf|mp3|mp4|html|css|js|doc|csv|ppt|xls)\b/gi, " ");
  r = r.replace(/\b(Ctrl|Alt|Shift|Win)\s*\+\s*[A-Za-z0-9+]+/g, " ");
  r = r.replace(/\bRs\./g, "Rs");
  r = r.replace(/\bM\.2\b/g, " ");
  for (const p of IT_KEEP_PHRASES) r = r.split(p).join(" ");
  return r;
}
const IT_GATE_IDS = new Set(["ITC-458", "ITC-459", "ITC-460", "ITC-461", "ITC-462", "ITC-463", "ITC-464"]);
const IT_EXCEPTIONS = {
  "ITC-055": { "options_ur[0]": ["System"], "options_ur[1]": ["Secure"], "options_ur[2]": ["Server"], "options_ur[3]": ["Signal"], "explanation_ur": ["Secure"] },
  "ITC-058": { "options_ur[1]": ["password"] },
  "ITC-386": { "options_ur[0]": ["Date", "Time"], "options_ur[1]": ["Text"], "options_ur[2]": ["Number"], "options_ur[3]": ["Yes", "No"], "explanation_ur": ["Date", "Time", "Text", "Number", "Yes", "No"] },
  "ITC-375": { "options_ur[1]": ["head"] },
  "ITC-374": { "options_ur[0]": ["id"], "explanation_ur": ["color", "font", "size", "id"] },
  "ITC-378": { "explanation_ur": ["if"] },
  "ITC-354": { "explanation_ur": ["char"] },
  "ITC-402": { "question_ur": ["Total", "Price", "Quantity"], "explanation_ur": ["Total", "Price", "Quantity"] },
  "ITC-448": { "question_ur": ["cat", "dog"] },
  "ITC-405": { "question_ur": ["Vs"], "explanation_ur": ["Vs"] },
  "ITC-338": { "question_ur": ["total"], "explanation_ur": ["total"] },
  "ITC-244": { "options_ur[3]": ["Styles"] },
  "ITC-250": { "options_ur[0]": ["Margins"], "options_ur[1]": ["Columns"], "explanation_ur": ["Columns"] },
  "ITC-246": { "options_ur[0]": ["Columns"], "options_ur[1]": ["Table"], "options_ur[2]": [], "options_ur[3]": [], "explanation_ur": ["Columns"] },
  "ITC-256": { "options_ur[1]": ["Dictionary"], "options_ur[3]": ["Translator"] },
  "ITC-285": { "options_ur[1]": ["Help"], "explanation_ur": ["Redo", "Undo"] },
  "ITC-230": { "explanation_ur": ["Lock"] },
  "ITC-226": { "question_ur": ["Restore"], "explanation_ur": ["Restore"] },
  "ITC-485": { "question_ur": ["Close"] },
  "ITC-232": { "options_ur[0]": ["Home"], "options_ur[1]": ["Insert"], "options_ur[2]": ["View"], "options_ur[3]": ["Review"] },
  "ITC-243": { "options_ur[0]": ["Home"], "options_ur[1]": ["View"], "options_ur[2]": ["Insert"], "options_ur[3]": ["Review"] },
  "ITC-268": { "explanation_ur": ["AutoFill"] },
  "ITC-263": { "options_ur[0]": ["Fail"], "options_ur[3]": ["Pass"], "explanation_ur": ["Pass"] },
  "ITC-356": { "question_ur": ["Pass", "Fail"], "explanation_ur": ["Pass", "Fail"] },
  "ITC-113": { "explanation_ur": ["LEDs"] },
  "ITC-217": { "options_ur[3]": ["exFAT"] },
  "ITC-218": { "options_ur[2]": ["exFAT"], "explanation_ur": ["exFAT"] },
  "ITC-257": { "options_ur[0]": ["Spelling"], "options_ur[3]": ["Zoom"] },
  "ITC-283": { "explanation_ur": ["Space"] },
  "ITC-321": { "options_ur[0]": ["Subject"], "options_ur[1]": ["Attachment"], "options_ur[3]": ["Signature"] },
  "ITC-359": { "question_ur": ["Welcome"] },
  "ITC-370": { "options_ur[3]": ["title"], "explanation_ur": ["title"] },
  "ITC-371": { "options_ur[2]": ["title"], "explanation_ur": ["title"] },
  "ITC-464": { "question_ur": ["logic"], "explanation_ur": ["Logic"] },
  "ITC-284": { "explanation_ur": ["Office"] },
};
for (const id of Object.keys(IT_EXCEPTIONS)) for (const loc of Object.keys(IT_EXCEPTIONS[id])) IT_EXCEPTIONS[id][loc] = new Set(IT_EXCEPTIONS[id][loc]);
let itLatinBad = [], itGateBad = [], itPunctBad = [];
for (const q of it) {
  const verbatimOpt = q.options.map((o) => itIsVerbatim(o));
  const fields = [["question_ur", q.question_ur, false], ...q.options_ur.map((o, j) => [`options_ur[${j}]`, o, verbatimOpt[j]]), ["explanation_ur", q.explanation_ur, false]];
  for (const [loc, val, isVerb] of fields) {
    if (isVerb) continue;
    const gateProbe = itStripCode(val).replace(/Bill Gates/gi, " ");
    if (!IT_GATE_IDS.has(q.id) && /\b(gates?|inputs?|outputs?)\b/i.test(gateProbe)) itGateBad.push(`${q.id}:${loc}`);
    const stripped = itStripCode(val);
    const exc = (IT_EXCEPTIONS[q.id] && IT_EXCEPTIONS[q.id][loc]) || null;
    for (const w of (stripped.match(/[A-Za-z]+/g) || [])) {
      if (w.length === 1) continue;
      if (IT_GATE_IDS.has(q.id) && /^(gates?|inputs?|outputs?)$/i.test(w)) continue;
      if (IT_ALL_CAPS.test(w)) continue;
      if (IT_NAMES.has(w)) continue;
      if (exc && exc.has(w)) continue;
      itLatinBad.push(`${q.id}:${loc}:${w}`);
    }
    const p = stripped.replace(/\d+(?:\.\d+)+/g, " ");
    if (/[?;]/.test(p)) itPunctBad.push(`${q.id}:${loc}:?;`);
    if (/\./.test(p)) itPunctBad.push(`${q.id}:${loc}:dot`);
    const c = stripped.replace(/\d,\d/g, " ");
    if (/,/.test(c)) itPunctBad.push(`${q.id}:${loc}:comma`);
  }
}
check("U2 it: Latin allowlist on stripped non-verbatim fields — all-caps acronyms/units, single letters, NAMES, or field-scoped EXCEPTIONS only (verbatim options exempt; gate words exempt inside ITC-458..464)", itLatinBad.length === 0, itLatinBad.slice(0, 5).join(" | "));
check("U2 it: Latin gate/input/output ONLY in gate items ITC-458..464 (Bill Gates person name excluded from the probe)", itGateBad.length === 0, itGateBad.slice(0, 5).join(", "));
const itGateUseBad = [];
for (const q of it) {
  if (!IT_GATE_IDS.has(q.id)) continue;
  for (const [loc, val] of [["question_ur", q.question_ur], ["explanation_ur", q.explanation_ur]]) {
    if (!/\bgates?\b/i.test(val)) itGateUseBad.push(`${q.id}:${loc}:gate`);
    if (q.id !== "ITC-464") {
      if (!/\binputs?\b/i.test(val)) itGateUseBad.push(`${q.id}:${loc}:input`);
      if (!/\boutputs?\b/i.test(val)) itGateUseBad.push(`${q.id}:${loc}:output`);
    }
  }
}
check("U2 it: gate items ITC-458..464 actually USE the Latin exception — gate(s) in Q+E of all 7, input(s)/output(s) in Q+E of ITC-458..463", itGateUseBad.length === 0, itGateUseBad.slice(0, 5).join(", "));
check("U2 it: no Latin ? ; punctuation and no Latin . outside dotted-number runs; Latin comma ONLY between digits (stripped non-verbatim fields)", itPunctBad.length === 0, itPunctBad.slice(0, 5).join(", "));
const IT_COMMA_FIELDS = new Set([
  "ITC-043:options_ur[0]", "ITC-043:options_ur[1]", "ITC-043:options_ur[2]", "ITC-043:options_ur[3]", "ITC-043:explanation_ur",
  "ITC-044:options_ur[2]", "ITC-044:options_ur[3]", "ITC-044:explanation_ur",
  "ITC-155:options_ur[0]", "ITC-155:options_ur[1]", "ITC-155:options_ur[2]", "ITC-155:options_ur[3]", "ITC-155:explanation_ur",
  "ITC-184:options_ur[0]", "ITC-184:options_ur[2]", "ITC-184:explanation_ur",
  "ITC-185:options_ur[0]", "ITC-185:options_ur[3]", "ITC-185:explanation_ur",
  "ITC-263:question_ur",
]);
const itCommaFields = itPairs.filter(([, v]) => (v ?? "").includes(",")).map(([l]) => l);
check("U2 it: Latin comma in exactly the 20 inventoried fields (043 ×5, 044 ×3, 155 ×5, 184 ×3, 185 ×3, 263Q formula)", itCommaFields.length === 20 && itCommaFields.every((f) => IT_COMMA_FIELDS.has(f)), itCommaFields.join(", "));
const itSemiFields = itPairs.filter(([, v]) => (v ?? "").includes(";")).map(([l]) => l);
const itQuestFields = itPairs.filter(([, v]) => (v ?? "").includes("?")).map(([l]) => l);
check("U2 it: Latin ; in exactly ITC-147:options_ur[0] (verbatim ';' option); Latin ? in zero fields", itSemiFields.length === 1 && itSemiFields[0] === "ITC-147:options_ur[0]" && itQuestFields.length === 0, `; ${itSemiFields.join(",")} ? ${itQuestFields.join(",")}`);
let itPctBad = [], itPctFields = [];
for (const q of it) {
  const fields = [[q.question, q.question_ur], [q.explanation, q.explanation_ur], ...q.options.map((o, i) => [o, q.options_ur[i]])];
  for (const [en, ur] of fields) {
    const ce = (en.match(/%/g) || []).length, cu = (ur.match(/%/g) || []).length;
    if (cu > 0) itPctFields.push(q.id);
    if (cu > ce) itPctBad.push(q.id);
  }
}
const itUrText = itPairs.map(([, v]) => v ?? "").join("\n");
const itCount = (t) => itUrText.split(t).length - 1;
check("U2 it: % never added in any _ur field; exactly 1 % field, ITC-028O3 (verbatim option); فیصد 1×", itPctBad.length === 0 && itPctFields.length === 1 && itPctFields[0] === "ITC-028" && itCount("فیصد") === 1, `added in ${itPctBad.slice(0, 3).join(", ")}, fields ${itPctFields.join(", ")}`);
const itSpaceBad = itPairs.filter(([, v]) => / [،؟؛۔]/.test(v ?? ""));
check("U2 it: no space before Urdu punctuation", itSpaceBad.length === 0, itSpaceBad.slice(0, 3).map(([l]) => l).join(", "));
const itSymBad = itPairs.filter(([, v]) => /[√π°²³×÷≤≥•]/.test(v ?? ""));
check("U2 it: no banned non-ASCII symbols (√ π ° ² ³ × ÷ ≤ ≥ •) in any _ur field", itSymBad.length === 0, itSymBad.slice(0, 3).map(([l]) => l).join(", "));
const itHonor = itPairs.filter(([, v]) => HONOR_ABBR.test(v ?? ""));
check("U2 it: no Latin honorific abbreviations in any _ur field", itHonor.length === 0, itHonor.slice(0, 3).map(([l]) => l).join(", "));
const itCompact = itPairs.filter(([, v]) => (v ?? "").includes("ؓ"));
check("U2 it: no ؓ compact honorific in any _ur field", itCompact.length === 0, itCompact.slice(0, 3).map(([l]) => l).join(", "));
const itArCodepoints = itPairs.filter(([, v]) => (v ?? "").includes(String.fromCharCode(0x064a)) || (v ?? "").includes(String.fromCharCode(0x0643)));
check("U2 it: no Arabic yeh/kaf codepoints (U+064A/U+0643) in any _ur field", itArCodepoints.length === 0, itArCodepoints.slice(0, 3).map(([l]) => l).join(", "));
const IT_AR = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const itNoScript = it.filter((q) => !IT_AR.test(q.question_ur) || !IT_AR.test(q.explanation_ur)).map((q) => q.id);
check("U2 it: _ur question + explanation carry Urdu script in all 500 (options carry NO script requirement — Phase 1 convention)", itNoScript.length === 0, itNoScript.slice(0, 5).join(", "));
const itVerbatimExpl = it.filter((q) => q.explanation_ur === q.explanation || (q.explanationEn && q.explanation_ur === q.explanationEn)).map((q) => q.id);
check("U2 it: explanations are translated, not verbatim copies of the English explanation or explanationEn", itVerbatimExpl.length === 0, itVerbatimExpl.slice(0, 5).join(", "));
const IT_AR_RUN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;
const itFormBad = [];
for (const q of it) {
  const byNorm = new Map();
  for (const v of [q.question_ur, ...q.options_ur, q.explanation_ur]) {
    for (const r of (v.match(IT_AR_RUN) || []).filter((x) => x.trim().length > 0)) {
      const nn = r.normalize("NFKC");
      if (byNorm.has(nn) && byNorm.get(nn) !== r) itFormBad.push(q.id);
      else byNorm.set(nn, r);
    }
  }
}
check("U2 it: repeated Urdu script forms byte-identical within each item (NFKC)", itFormBad.length === 0, [...new Set(itFormBad)].slice(0, 5).join(", "));
let itEnScriptRuns = 0;
for (const q of it) {
  itEnScriptRuns += (q.question.match(AR_RUN) || []).length + (q.explanation.match(AR_RUN) || []).length;
  q.options.forEach((o) => { itEnScriptRuns += (o.match(AR_RUN) || []).length; });
}
check("U2 it: zero Arabic-script runs in English fields (measured baseline)", itEnScriptRuns === 0, `got ${itEnScriptRuns}`);
check("U2 it: explanationUrdu null in all 500; explanationEn in exactly ITC-001..ITC-030",
  it.every((q) => q.explanationUrdu === null) &&
  it.filter((q) => q.explanationEn).length === 30 &&
  it.filter((q) => q.explanationEn).every((q, i) => q.id === `ITC-${String(i + 1).padStart(3, "0")}`));
check("U2 it: glossary terms present (guide §2I + core: کمپیوٹر, فائل, پروگرام, ویب سائٹ, انٹرنیٹ, ان پٹ, آؤٹ پٹ, براؤزر, سرچ انجن, ہارڈ ویئر, سافٹ ویئر, ڈیٹا, صارف, متن, دستاویز, کنٹرول, اسکرین, فارم, صفحہ, فارمیٹ, نظام, پرنٹر, مشین, ویڈیو, ڈیجیٹل, ریکارڈ, لائن, آن لائن, فہرست, ڈرائیو, بٹن, اکاؤنٹ, ڈسک, ڈیوائس, ونڈو, نیٹ ورک, پاس ورڈ, ذخیرہ, جدول, کیبل, مانیٹر, سگنل, قدر, قیمت, چابی, غلطی, مندرجہ ذیل, جبکہ, تقریباً, فوراً, فیصد)",
  ["کمپیوٹر", "فائل", "پروگرام", "ویب سائٹ", "انٹرنیٹ", "ان پٹ", "آؤٹ پٹ", "براؤزر", "سرچ انجن", "ہارڈ ویئر", "سافٹ ویئر", "ڈیٹا", "صارف", "متن", "دستاویز", "کنٹرول", "اسکرین", "فارم", "صفحہ", "فارمیٹ", "نظام", "پرنٹر", "مشین", "ویڈیو", "ڈیجیٹل", "ریکارڈ", "لائن", "آن لائن", "فہرست", "ڈرائیو", "بٹن", "اکاؤنٹ", "ڈسک", "ڈیوائس", "ونڈو", "نیٹ ورک", "پاس ورڈ", "ذخیرہ", "جدول", "کیبل", "مانیٹر", "سگنل", "قدر", "قیمت", "چابی", "غلطی", "مندرجہ ذیل", "جبکہ", "تقریباً", "فوراً", "فیصد"].every((t) => itUrText.includes(t)));
check("U2 it: glossary terms present (gap pins + compounds + splits: میموری, کوڈ, ڈیٹا بیس, سلائیڈ, بائنری, پروسیسر, ٹوپولوجی, بیک اپ, لوپ, چارٹ, کیش, سرور, فنکشن, پروسیسنگ, ہیکساڈیسیمل, فولڈر, متغیر, کالم, کریکٹر, ڈیسک ٹاپ, ڈسپلے, کلاؤڈ, اسپریڈ شیٹ, فونٹ, شارٹ کٹ, کی بورڈ, کمانڈ, اسمبلی, بلاک, یوٹیلیٹی, ایپلی کیشن, ایکسٹینشن, ای میل, ماؤس, اسپیکر, آپریٹنگ سسٹم, وائرس, میلویئر, فشنگ, فائر وال, کوکی, پکسل, مدر بورڈ, پورٹ, چپ, رجسٹر, الگورتھم, فلو چارٹ, توثیق, تصدیق, آتھنٹیکیشن, خفیہ کاری, لاگ ان, ڈاؤن لوڈ, بک مارک, ٹیب, لنک, آئیکن, پوائنٹر, مصنوعی ذہانت, مشین لرننگ, ورچوئل رئیلٹی, انٹرنیٹ آف تھنگز, نیورل نیٹ ورک, ایکسپرٹ سسٹم, کمپیوٹر ویژن, روبوٹ, سینسر, ایمبیڈڈ, کمپائلر, انٹرپریٹر, راؤٹر, سوئچ, پروٹوکول, ایریا نیٹ ورک, ڈیٹا بس, کنٹرول بس, بس ٹوپولوجی, بار کوڈ, ٹرانزسٹر, مائیکروفون, پروجیکٹر, پلاٹر, اسکینر, لیزر پرنٹر, تھرمل پرنٹر, ریفریش ریٹ, ریزولوشن, ڈومین نیم, کلائنٹ, پرائمری کی, فری ویئر, شیئر ویئر, ملکیتی, اوپن سورس, نقل, کاپی, لکیر, سطر, گیٹ وے, ترتیبات, سسٹم, اشیا, چھاپنا, پرنٹ کرنا, پروسیس, شیئر, جانچ, مصنوعہ, مصنوعات, ماخذ, مجموعہ, پیٹرن, نجی, پرائیویٹ, پبلک, طریقہ, منطق, سیل, میل, ہسٹری, مرحلہ, قواعد, روشنی, خریداری, صحت, بحال, لوڈ, تربیت, رینج, پاور, بجلی, فزیکل, کیس, کام, ریفریش, کلاس, سروس, خدمات, اسٹائل, حفاظت, گروپ, نشان, علامت, گاہک, چمک, انسٹال, ہیڈر, فوٹر, ڈی بگنگ, نیٹکٹ, سرقہ, ایرگونومکس, فلپ فلاپ, کمبینیشنل, سیکوینشل, انکریمنٹل, ڈیفرینشل, سپروائزڈ, انٹیجر, بائٹس, بائٹ, ونڈوز, کاپی رائٹ, سلائیڈ شو, فلٹر)",
  ["میموری", "کوڈ", "ڈیٹا بیس", "سلائیڈ", "بائنری", "پروسیسر", "ٹوپولوجی", "بیک اپ", "لوپ", "چارٹ", "کیش", "سرور", "فنکشن", "پروسیسنگ", "ہیکساڈیسیمل", "فولڈر", "متغیر", "کالم", "کریکٹر", "ڈیسک ٹاپ", "ڈسپلے", "کلاؤڈ", "اسپریڈ شیٹ", "فونٹ", "شارٹ کٹ", "کی بورڈ", "کمانڈ", "اسمبلی", "بلاک", "یوٹیلیٹی", "ایپلی کیشن", "ایکسٹینشن", "ای میل", "ماؤس", "اسپیکر", "آپریٹنگ سسٹم", "وائرس", "میلویئر", "فشنگ", "فائر وال", "کوکی", "پکسل", "مدر بورڈ", "پورٹ", "چپ", "رجسٹر", "الگورتھم", "فلو چارٹ", "توثیق", "تصدیق", "آتھنٹیکیشن", "خفیہ کاری", "لاگ ان", "ڈاؤن لوڈ", "بک مارک", "ٹیب", "لنک", "آئیکن", "پوائنٹر", "مصنوعی ذہانت", "مشین لرننگ", "ورچوئل رئیلٹی", "انٹرنیٹ آف تھنگز", "نیورل نیٹ ورک", "ایکسپرٹ سسٹم", "کمپیوٹر ویژن", "روبوٹ", "سینسر", "ایمبیڈڈ", "کمپائلر", "انٹرپریٹر", "راؤٹر", "سوئچ", "پروٹوکول", "ایریا نیٹ ورک", "ڈیٹا بس", "کنٹرول بس", "بس ٹوپولوجی", "بار کوڈ", "ٹرانزسٹر", "مائیکروفون", "پروجیکٹر", "پلاٹر", "اسکینر", "لیزر پرنٹر", "تھرمل پرنٹر", "ریفریش ریٹ", "ریزولوشن", "ڈومین نیم", "کلائنٹ", "پرائمری کی", "فری ویئر", "شیئر ویئر", "ملکیتی", "اوپن سورس", "نقل", "کاپی", "لکیر", "سطر", "گیٹ وے", "ترتیبات", "سسٹم", "اشیا", "چھاپنا", "پرنٹ کرنا", "پروسیس", "شیئر", "جانچ", "مصنوعہ", "مصنوعات", "ماخذ", "مجموعہ", "پیٹرن", "نجی", "پرائیویٹ", "پبلک", "طریقہ", "منطق", "سیل", "میل", "ہسٹری", "مرحلہ", "قواعد", "روشنی", "خریداری", "صحت", "بحال", "لوڈ", "تربیت", "رینج", "پاور", "بجلی", "فزیکل", "کیس", "کام", "ریفریش", "کلاس", "سروس", "خدمات", "اسٹائل", "حفاظت", "گروپ", "نشان", "علامت", "گاہک", "چمک", "انسٹال", "ہیڈر", "فوٹر", "ڈی بگنگ", "نیٹکٹ", "سرقہ", "ایرگونومکس", "فلپ فلاپ", "کمبینیشنل", "سیکوینشل", "انکریمنٹل", "ڈیفرینشل", "سپروائزڈ", "انٹیجر", "بائٹس", "بائٹ", "ونڈوز", "کاپی رائٹ", "سلائیڈ شو", "فلٹر"].every((t) => itUrText.includes(t)));
function itCountsCheck(name, pairs) {
  const bad = pairs.filter(([t, n]) => itCount(t) !== n);
  check(name, bad.length === 0, bad.map(([t, n]) => `${t} ${itCount(t)}!=${n}`).join(", "));
}
itCountsCheck("U2 it: exact counts, core guide + dominants — کمپیوٹر 333×, فائل 237×, پروگرام 183×, ویب سائٹ 42×, انٹرنیٹ 64×, ان پٹ 27×, آؤٹ پٹ 16×, براؤزر 37×, سرچ انجن 5×, ہارڈ ویئر 42×, سافٹ ویئر 98×, ڈیٹا 305×, صارف 109×, متن 92×, دستاویز 61×, کنٹرول 64×, ویب 87× (incl. ویب سائٹ 42×), پرنٹ 101×, کارڈ 129×, زبان 48×, پتہ 45× (incl. پتہ چلنا idiom 1×), قطار 54×, اسکرین 69×, فارم 66×, صفحہ 19×, صفحات 27×, فارمیٹ 31×, نظام 61×, بٹ 97× (incl. بٹن 15×), پرنٹر 51×, مشین 40×, ویڈیو 26×, ڈیجیٹل 44×, ریکارڈ 98×, لائن 76×, آن لائن 26×, فہرست 38×, ربن 10×, فون 51× (incl. ہیڈ فون 5×), ڈرائیو 69×, بٹن 15×, اکاؤنٹ 22×, ڈسک 66×, ڈیوائس 85× (incl. ڈیوائسز 10×), ونڈو 26× (incl. ونڈوز 8×), نیٹ ورک 129×, پاس ورڈ 39×, ذخیرہ 33×, جدول 52×, کیبل 37×, مانیٹر 30×, سگنل 36×, مینیو 2×, قدر 100×, قیمت 11×, چابی 19×, چابیاں 7×, غلطی 34× (substring counts)",
  [["کمپیوٹر", 333], ["فائل", 237], ["پروگرام", 183], ["ویب سائٹ", 42], ["انٹرنیٹ", 64], ["ان پٹ", 27], ["آؤٹ پٹ", 16], ["براؤزر", 37], ["سرچ انجن", 5], ["ہارڈ ویئر", 42], ["سافٹ ویئر", 98], ["ڈیٹا", 305], ["صارف", 109], ["متن", 92], ["دستاویز", 61], ["کنٹرول", 64], ["ویب", 87], ["پرنٹ", 101], ["کارڈ", 129], ["زبان", 48], ["پتہ", 45], ["قطار", 54], ["اسکرین", 69], ["فارم", 66], ["صفحہ", 19], ["صفحات", 27], ["فارمیٹ", 31], ["نظام", 61], ["بٹ", 97], ["پرنٹر", 51], ["مشین", 40], ["ویڈیو", 26], ["ڈیجیٹل", 44], ["ریکارڈ", 98], ["لائن", 76], ["آن لائن", 26], ["فہرست", 38], ["ربن", 10], ["فون", 51], ["ڈرائیو", 69], ["بٹن", 15], ["اکاؤنٹ", 22], ["ڈسک", 66], ["ڈیوائس", 85], ["ونڈو", 26], ["نیٹ ورک", 129], ["پاس ورڈ", 39], ["ذخیرہ", 33], ["جدول", 52], ["کیبل", 37], ["مانیٹر", 30], ["سگنل", 36], ["مینیو", 2], ["قدر", 100], ["قیمت", 11], ["چابی", 19], ["چابیاں", 7], ["غلطی", 34]]);
itCountsCheck("U2 it: exact counts, gap pins + system internals — میموری 96×, کوڈ 103× (incl. سورس کوڈ 14× + مشین کوڈ 9× + سیوڈو کوڈ 3× + بار کوڈ 9×), ڈیٹا بیس 48×, سلائیڈ 64×, بائنری 55×, اعشاری 23×, پروسیسر 41×, ٹوپولوجی 32×, بیک اپ 37×, لوپ 31×, چارٹ 38×, کیش 65×, فیلڈ 24×, ریڈر 23×, سرور 30×, ڈرائیور 22×, فنکشن 19×, پروسیسنگ 19×, ہیکساڈیسیمل 20×, فولڈر 23×, متغیر 20×, کالم 30×, کریکٹر 28×, یونٹ 28×, ڈیسک ٹاپ 15×, ڈسپلے 17×, کلاؤڈ 15×, اسپریڈ شیٹ 15×, فونٹ 15×, شارٹ کٹ 13×, کی بورڈ 28×, کمانڈ 18×, اسمبلی 12×, بلاک 19×, یوٹیلیٹی 15×, ایپلی کیشن 19×, ایپ 37× (incl. ایپلی کیشن 19×), ایکسٹینشن 21×, ای میل 26×, ماؤس 6×, اسپیکر 15×, آپریٹنگ سسٹم 63×, وائرس 20×, ورم 7×, ٹروجن 2×, میلویئر 9×, فشنگ 7×, اسپام 1×, فائر وال 3×, کوکی 13×, پکسل 9×, مدر بورڈ 4×, پورٹ 19×, سلاٹ 9×, چپ 18× (incl. چپٹی 2×), رجسٹر 17×, ہدایت 16×, الگورتھم 10×, فلو چارٹ 10×, سیوڈو کوڈ 3×, سنٹیکس 2×, کوری 12×, توثیق 9×, تصدیق 11×, آتھنٹیکیشن 5×, خفیہ کاری 7×, لاگ ان 5×, ڈاؤن لوڈ 17×, اپ لوڈ 3×, بک مارک 4×, ٹیب 14×, ہائپر لنک 1×, لنک 27× (incl. ہائپر لنک 1×), آئیکن 3×, کرسر 1×, پوائنٹر 6×, ڈائیلاگ 2× (substring counts)",
  [["میموری", 96], ["کوڈ", 103], ["ڈیٹا بیس", 48], ["سلائیڈ", 64], ["بائنری", 55], ["اعشاری", 23], ["پروسیسر", 41], ["ٹوپولوجی", 32], ["بیک اپ", 37], ["لوپ", 31], ["چارٹ", 38], ["کیش", 65], ["فیلڈ", 24], ["ریڈر", 23], ["سرور", 30], ["ڈرائیور", 22], ["فنکشن", 19], ["پروسیسنگ", 19], ["ہیکساڈیسیمل", 20], ["فولڈر", 23], ["متغیر", 20], ["کالم", 30], ["کریکٹر", 28], ["یونٹ", 28], ["ڈیسک ٹاپ", 15], ["ڈسپلے", 17], ["کلاؤڈ", 15], ["اسپریڈ شیٹ", 15], ["فونٹ", 15], ["شارٹ کٹ", 13], ["کی بورڈ", 28], ["کمانڈ", 18], ["اسمبلی", 12], ["بلاک", 19], ["یوٹیلیٹی", 15], ["ایپلی کیشن", 19], ["ایپ", 37], ["ایکسٹینشن", 21], ["ای میل", 26], ["ماؤس", 6], ["اسپیکر", 15], ["آپریٹنگ سسٹم", 63], ["وائرس", 20], ["ورم", 7], ["ٹروجن", 2], ["میلویئر", 9], ["فشنگ", 7], ["اسپام", 1], ["فائر وال", 3], ["کوکی", 13], ["پکسل", 9], ["مدر بورڈ", 4], ["پورٹ", 19], ["سلاٹ", 9], ["چپ", 18], ["رجسٹر", 17], ["ہدایت", 16], ["الگورتھم", 10], ["فلو چارٹ", 10], ["سیوڈو کوڈ", 3], ["سنٹیکس", 2], ["کوری", 12], ["توثیق", 9], ["تصدیق", 11], ["آتھنٹیکیشن", 5], ["خفیہ کاری", 7], ["لاگ ان", 5], ["ڈاؤن لوڈ", 17], ["اپ لوڈ", 3], ["بک مارک", 4], ["ٹیب", 14], ["ہائپر لنک", 1], ["لنک", 27], ["آئیکن", 3], ["کرسر", 1], ["پوائنٹر", 6], ["ڈائیلاگ", 2]]);
itCountsCheck("U2 it: exact counts, AI/cloud/network + compounds — مصنوعی ذہانت 20×, مشین لرننگ 7×, ورچوئل رئیلٹی 4×, آگمینٹڈ رئیلٹی 4×, مکسڈ رئیلٹی 4×, انٹرنیٹ آف تھنگز 5×, نیورل نیٹ ورک 3×, ایکسپرٹ سسٹم 3×, کمپیوٹر ویژن 4×, پیٹرن ریکگنیشن 4×, قدرتی زبان 5×, روبوٹ 4×, ڈرون 3×, سینسر 18×, ایکچوایٹر 6×, ایمبیڈڈ 12×, وان نیومن 3×, سورس کوڈ 14×, مشین کوڈ 9×, اسمبلی زبان 8×, پروگرامنگ زبان 4×, کمپائلر 11×, انٹرپریٹر 7×, اسمبلر 5×, ایڈیٹر 1×, بگ 7×, بوٹ 14×, ری اسٹارٹ 1×, سلیپ 1×, ہائبرنیٹ 1×, ایڈمنسٹریٹر 5×, اجازت 20×, رسائی 19×, اینٹی وائرس 5×, راؤٹر 8×, سوئچ 9×, ہب 6×, برج 4×, ریپیٹر 4×, موڈیم 4×, بینڈ وڈتھ 3×, لیٹنسی 3×, پیکٹ 7×, پروٹوکول 15×, ایریا نیٹ ورک 29×, ڈیٹا بس 5×, کنٹرول بس 6×, ایڈریس بس 5×, بس ٹوپولوجی 6×, کنٹرول یونٹ 2×, ورڈ پروسیسر 5×, بار کوڈ 9×, ٹرانزسٹر 5×, لائٹ پین 2×, ٹچ پیڈ 3×, ٹریک بال 3×, جوائے اسٹک 4×, ویب کیم 4×, مائیکروفون 7×, ہیڈ فون 5×, پروجیکٹر 3×, پلاٹر 7×, اسکینر 6×, لیزر پرنٹر 5×, انک جیٹ 4×, ڈاٹ میٹرکس 5×, تھرمل پرنٹر 6×, ریفریش ریٹ 4×, ریزولوشن 3×, ڈومین نیم 4×, کلائنٹ 5×, پرائمری کی 4×, فارن کی 2×, پبلک ڈومین 2×, فری ویئر 6×, شیئر ویئر 6×, ملکیتی 5×, اوپن سورس 4×, ڈیٹا سورس 2×, فائل سسٹم 9×, ڈومین نیم سسٹم 2×, سسٹم سافٹ ویئر 6× (substring counts)",
  [["مصنوعی ذہانت", 20], ["مشین لرننگ", 7], ["ورچوئل رئیلٹی", 4], ["آگمینٹڈ رئیلٹی", 4], ["مکسڈ رئیلٹی", 4], ["انٹرنیٹ آف تھنگز", 5], ["نیورل نیٹ ورک", 3], ["ایکسپرٹ سسٹم", 3], ["کمپیوٹر ویژن", 4], ["پیٹرن ریکگنیشن", 4], ["قدرتی زبان", 5], ["روبوٹ", 4], ["ڈرون", 3], ["سینسر", 18], ["ایکچوایٹر", 6], ["ایمبیڈڈ", 12], ["وان نیومن", 3], ["سورس کوڈ", 14], ["مشین کوڈ", 9], ["اسمبلی زبان", 8], ["پروگرامنگ زبان", 4], ["کمپائلر", 11], ["انٹرپریٹر", 7], ["اسمبلر", 5], ["ایڈیٹر", 1], ["بگ", 7], ["بوٹ", 14], ["ری اسٹارٹ", 1], ["سلیپ", 1], ["ہائبرنیٹ", 1], ["ایڈمنسٹریٹر", 5], ["اجازت", 20], ["رسائی", 19], ["اینٹی وائرس", 5], ["راؤٹر", 8], ["سوئچ", 9], ["ہب", 6], ["برج", 4], ["ریپیٹر", 4], ["موڈیم", 4], ["بینڈ وڈتھ", 3], ["لیٹنسی", 3], ["پیکٹ", 7], ["پروٹوکول", 15], ["ایریا نیٹ ورک", 29], ["ڈیٹا بس", 5], ["کنٹرول بس", 6], ["ایڈریس بس", 5], ["بس ٹوپولوجی", 6], ["کنٹرول یونٹ", 2], ["ورڈ پروسیسر", 5], ["بار کوڈ", 9], ["ٹرانزسٹر", 5], ["لائٹ پین", 2], ["ٹچ پیڈ", 3], ["ٹریک بال", 3], ["جوائے اسٹک", 4], ["ویب کیم", 4], ["مائیکروفون", 7], ["ہیڈ فون", 5], ["پروجیکٹر", 3], ["پلاٹر", 7], ["اسکینر", 6], ["لیزر پرنٹر", 5], ["انک جیٹ", 4], ["ڈاٹ میٹرکس", 5], ["تھرمل پرنٹر", 6], ["ریفریش ریٹ", 4], ["ریزولوشن", 3], ["ڈومین نیم", 4], ["کلائنٹ", 5], ["پرائمری کی", 4], ["فارن کی", 2], ["پبلک ڈومین", 2], ["فری ویئر", 6], ["شیئر ویئر", 6], ["ملکیتی", 5], ["اوپن سورس", 4], ["ڈیٹا سورس", 2], ["فائل سسٹم", 9], ["ڈومین نیم سسٹم", 2], ["سسٹم سافٹ ویئر", 6]]);
itCountsCheck("U2 it: exact counts, kept splits I — نقل 74× (incl. منتقل 23× + نقلی 16× + نقلیں 12× + نقل و حرکت 1×), کاپی 32× (incl. کاپیاں 4× + کاپی رائٹ 5×), کاپیاں 4×, نقلیں 12×, لکیر 22×, لکیریں 2×, سطر 3× (incl. سطروں 2×), سطروں 2×, لائنیں 3×, کھڑکی 2×, گیٹ وے 2×, ترتیبات 17×, سسٹم 90×, توسیع 2×, خاکہ 2×, اشیا 3×, چیز 53×, چیزیں 9×, چھاپنا 8×, پرنٹ کرنا 5×, پروسیس 82× (incl. پروسیسنگ 19× + پروسیسر 41×), کارروائی 9×, شیئر 35×, بانٹنا 4×, مشترکہ 17×, اشتراک 2×, جانچ 79×, چیک کر 3×, مصنوعہ 1×, مصنوعے 5×, مصنوعات 4×, ماخذ 5×, ذریعہ 5×, مجموعہ 21×, نمونہ 5×, پیٹرن 12× (incl. پیٹرنز 7× + پیٹرن ریکگنیشن 4×), پیٹرنز 7×, سلسلہ 2×, تسلسل 2×, نجی 21×, عوامی 5×, پرائیویٹ 13×, پبلک 15×, طریقہ 16×, میتھڈز 1×, منطق 7×, لاجک 2×, سیل 56×, خانہ 1×, میل 44× (incl. ای میل 26×), پوائنٹس 3×, نقطے 3×, نقطہ 1×, ہسٹری 2×, سابقہ ریکارڈ 2×, ویژن 6×, بصارت 1×, مرحلہ 5×, قدم 18×, درجہ 15× (incl. مندرجہ ذیل 7×), اصول 9×, قواعد 14×, کمیونیکیشن 4×, لائٹ 14×, روشنی 12×, شاپنگ 1×, خریداری 3×, صحت 2×, بحال 15×, ریسٹور 2×, لوڈ 29×, تربیت 5×, ٹریننگ 1× (substring counts)",
  [["نقل", 74], ["کاپی", 32], ["کاپیاں", 4], ["نقلیں", 12], ["لکیر", 22], ["لکیریں", 2], ["سطر", 3], ["سطروں", 2], ["لائنیں", 3], ["کھڑکی", 2], ["گیٹ وے", 2], ["ترتیبات", 17], ["سسٹم", 90], ["توسیع", 2], ["خاکہ", 2], ["اشیا", 3], ["چیز", 53], ["چیزیں", 9], ["چھاپنا", 8], ["پرنٹ کرنا", 5], ["پروسیس", 82], ["کارروائی", 9], ["شیئر", 35], ["بانٹنا", 4], ["مشترکہ", 17], ["اشتراک", 2], ["جانچ", 79], ["چیک کر", 3], ["مصنوعہ", 1], ["مصنوعے", 5], ["مصنوعات", 4], ["ماخذ", 5], ["ذریعہ", 5], ["مجموعہ", 21], ["نمونہ", 5], ["پیٹرن", 12], ["پیٹرنز", 7], ["سلسلہ", 2], ["تسلسل", 2], ["نجی", 21], ["عوامی", 5], ["پرائیویٹ", 13], ["پبلک", 15], ["طریقہ", 16], ["میتھڈز", 1], ["منطق", 7], ["لاجک", 2], ["سیل", 56], ["خانہ", 1], ["میل", 44], ["پوائنٹس", 3], ["نقطے", 3], ["نقطہ", 1], ["ہسٹری", 2], ["سابقہ ریکارڈ", 2], ["ویژن", 6], ["بصارت", 1], ["مرحلہ", 5], ["قدم", 18], ["درجہ", 15], ["اصول", 9], ["قواعد", 14], ["کمیونیکیشن", 4], ["لائٹ", 14], ["روشنی", 12], ["شاپنگ", 1], ["خریداری", 3], ["صحت", 2], ["بحال", 15], ["ریسٹور", 2], ["لوڈ", 29], ["تربیت", 5], ["ٹریننگ", 1]]);
itCountsCheck("U2 it: exact counts, kept splits II + flags — پورا 11×, مقفل 4×, رینج 11×, انتباہ 4×, خبردار 1×, پاور 9×, بجلی 26×, فزیکل 6×, جسمانی 5×, طبعی 1×, کیس 27×, کام 182×, جابز 4×, ریفریش 10×, تازہ 4×, آبجیکٹ 7×, کلاس 20×, سروس 11×, خدمات 12×, خدمت 3×, شرح 1×, انداز 11×, اسٹائل 23×, اسٹائلز 9×, اسٹیٹس 3×, حفاظت 17×, سیکیورٹی 4×, پلیس ہولڈر 4×, ٹیکسٹ باکس 1×, زوم 1×, گروپ 12×, گروہ 2×, نشان 18×, علامت 12×, علامتیں 5×, اشارہ 5×, پوائنٹنگ 2×, گاہک 20×, چمک 7×, انسٹال 16×, نصب 1×, ہیڈر 8×, فوٹر 5×, مندرجہ ذیل 7×, جبکہ 120×, تقریباً 2×, فوراً 16×, فیصد 1×, ڈی بگنگ 3×, نیٹکٹ 2×, سرقہ 2×, ایرگونومکس 1×, ایرگونومک 3× (incl. ایرگونومکس 1×), فلپ فلاپ 4×, کمبینیشنل 2×, سیکوینشل 3×, انکریمنٹل 2×, ڈیفرینشل 2×, سپروائزڈ 4× (incl. ان سپروائزڈ 2×), ان سپروائزڈ 2×, رینفورسمنٹ 1×, انٹیجر 2×, بائٹس 10×, بائٹ 36× (incl. بائٹس 10×) (substring counts)",
  [["پورا", 11], ["مقفل", 4], ["رینج", 11], ["انتباہ", 4], ["خبردار", 1], ["پاور", 9], ["بجلی", 26], ["فزیکل", 6], ["جسمانی", 5], ["طبعی", 1], ["کیس", 27], ["کام", 182], ["جابز", 4], ["ریفریش", 10], ["تازہ", 4], ["آبجیکٹ", 7], ["کلاس", 20], ["سروس", 11], ["خدمات", 12], ["خدمت", 3], ["شرح", 1], ["انداز", 11], ["اسٹائل", 23], ["اسٹائلز", 9], ["اسٹیٹس", 3], ["حفاظت", 17], ["سیکیورٹی", 4], ["پلیس ہولڈر", 4], ["ٹیکسٹ باکس", 1], ["زوم", 1], ["گروپ", 12], ["گروہ", 2], ["نشان", 18], ["علامت", 12], ["علامتیں", 5], ["اشارہ", 5], ["پوائنٹنگ", 2], ["گاہک", 20], ["چمک", 7], ["انسٹال", 16], ["نصب", 1], ["ہیڈر", 8], ["فوٹر", 5], ["مندرجہ ذیل", 7], ["جبکہ", 120], ["تقریباً", 2], ["فوراً", 16], ["فیصد", 1], ["ڈی بگنگ", 3], ["نیٹکٹ", 2], ["سرقہ", 2], ["ایرگونومکس", 1], ["ایرگونومک", 3], ["فلپ فلاپ", 4], ["کمبینیشنل", 2], ["سیکوینشل", 3], ["انکریمنٹل", 2], ["ڈیفرینشل", 2], ["سپروائزڈ", 4], ["ان سپروائزڈ", 2], ["رینفورسمنٹ", 1], ["انٹیجر", 2], ["بائٹس", 10], ["بائٹ", 36]]);
itCountsCheck("U2 it: exact counts, general vocab + swamp decompositions — نمائش 1×, مرکزی 27×, سینٹرل 2×, مین 46×, فریم 13×, ڈیزائن 11×, ماڈل 11×, پلیٹ فارم 8×, مواد 15×, رابطہ 7×, کنکشن 22×, ڈیوائسز 10×, جائز 4×, درست 57×, سرٹیفکیٹ 2×, دفتر 16×, حملہ آور 5×, مقابلے 6×, کیبلوں 1×, کیبلنگ 3×, استعمال 262×, ٹچ 11×, ٹائپ 10×, گیم 7×, لیپ ٹاپ 11×, ٹیکنالوجی 6×, دکان 10×, بینک 19×, کمپنی 8×, گاہکوں 5×, اسکول 7×, طالب علم 10×, استاد 3×, کتاب 12×, اخبار 3×, تصویر 54×, آواز 28×, موسیقی 4×, کھیل 3×, ایڈریس 8×, سلائیڈ شو 11×, کل رقم 1×, مقررہ حد 2×, چیک آؤٹ 1×, چیک بک 1×, فلٹر 11×, ان لاک 2×, ونڈوز 8×, کاپی رائٹ 5×, پتہ چل 1×, ایڈریس بار 1×, چپٹی 2×, نقل و حرکت 1×, منتقل 23×, نقلی 16× (substring counts; bare کل/ریٹ/فل/لاک/حد/شو/بس substrings deliberately NOT pinned — substring swamps)",
  [["نمائش", 1], ["مرکزی", 27], ["سینٹرل", 2], ["مین", 46], ["فریم", 13], ["ڈیزائن", 11], ["ماڈل", 11], ["پلیٹ فارم", 8], ["مواد", 15], ["رابطہ", 7], ["کنکشن", 22], ["ڈیوائسز", 10], ["جائز", 4], ["درست", 57], ["سرٹیفکیٹ", 2], ["دفتر", 16], ["حملہ آور", 5], ["مقابلے", 6], ["کیبلوں", 1], ["کیبلنگ", 3], ["استعمال", 262], ["ٹچ", 11], ["ٹائپ", 10], ["گیم", 7], ["لیپ ٹاپ", 11], ["ٹیکنالوجی", 6], ["دکان", 10], ["بینک", 19], ["کمپنی", 8], ["گاہکوں", 5], ["اسکول", 7], ["طالب علم", 10], ["استاد", 3], ["کتاب", 12], ["اخبار", 3], ["تصویر", 54], ["آواز", 28], ["موسیقی", 4], ["کھیل", 3], ["ایڈریس", 8], ["سلائیڈ شو", 11], ["کل رقم", 1], ["مقررہ حد", 2], ["چیک آؤٹ", 1], ["چیک بک", 1], ["فلٹر", 11], ["ان لاک", 2], ["ونڈوز", 8], ["کاپی رائٹ", 5], ["پتہ چل", 1], ["ایڈریس بار", 1], ["چپٹی", 2], ["نقل و حرکت", 1], ["منتقل", 23], ["نقلی", 16]]);
const IT_ZERO_SUBSTRINGS = ["سامان", "ہیلتھ", "فونٹس", "تفاعل", "صارف نام", "لاگ آؤٹ", "ٹول بار", "ڈیبگر", "شٹ ڈاؤن", "بلوٹوتھ", "ہاٹ اسپاٹ", "بمقابلہ", "خلیہ", "ڈیبگنگ", "ویب سائٹیں", "پروڈکٹ", "فلم", "ری بوٹ", "چیک کرنا"];
const itZeroBad = IT_ZERO_SUBSTRINGS.filter((t) => itCount(t) !== 0);
const IT_ZERO_TOKENS = ["ہیکر", "ہیکرز", "تار", "تاروں"];
const itZeroTokBad = [];
for (const [loc, val] of itPairs) {
  for (const tok of tokens(val)) if (IT_ZERO_TOKENS.includes(tok)) itZeroTokBad.push(`${loc}:${tok}`);
}
check("U2 it: zero-count pins — سامان/ہیلتھ/فونٹس/تفاعل/صارف نام/لاگ آؤٹ/ٹول بار/ڈیبگر/شٹ ڈاؤن/بلوٹوتھ/ہاٹ اسپاٹ/بمقابلہ/خلیہ/ڈیبگنگ/ویب سائٹیں/پروڈکٹ/فلم/ری بوٹ/چیک کرنا 0× as substrings; ہیکر/ہیکرز/تار/تاروں 0× as tokens (تار substring lives inside رفتار, hence token-level)", itZeroBad.length === 0 && itZeroTokBad.length === 0, [...itZeroBad, ...itZeroTokBad].slice(0, 5).join(", "));
// EN-correspondence: سسٹم occurs ONLY inside the 10
// compound names (strip longest-first, residual 0).
const IT_SYSTEM_COMPOUNDS = ["ڈیٹا بیس مینجمنٹ سسٹم", "لرننگ مینجمنٹ سسٹم", "ڈومین نیم سسٹم", "یونائیٹڈ سسٹم بورڈ", "آپریٹنگ سسٹم", "ایکسپرٹ سسٹم", "سسٹم سافٹ ویئر", "فائل سسٹم", "سسٹم ڈرائیو", "سسٹم ٹیسٹنگ"].sort((a, b) => b.length - a.length);
let itSysResidual = itUrText;
for (const c of IT_SYSTEM_COMPOUNDS) itSysResidual = itSysResidual.split(c).join(" ");
check("U2 it: سسٹم occurs ONLY inside the 10 compound names (آپریٹنگ سسٹم 63×, فائل سسٹم 9×, سسٹم سافٹ ویئر 6×, ایکسپرٹ سسٹم 3×, ڈومین نیم سسٹم 2×, سسٹم ڈرائیو 2×, سسٹم ٹیسٹنگ 2×, ڈیٹا بیس مینجمنٹ سسٹم 1×, لرننگ مینجمنٹ سسٹم 1×, یونائیٹڈ سسٹم بورڈ 1× = 90×; residual 0)", itSysResidual.split("سسٹم").length - 1 === 0, `residual ${itSysResidual.split("سسٹم").length - 1}`);
// EN-correspondence: ونڈو (OS window) in exactly 23
// fields, every one with EN "window" (E fields use
// explanationEn when present); کھڑکی (physical window)
// in exactly 2 fields; گیٹ وے in exactly 2 fields.
const IT_WINDOW_FIELDS = new Set(["ITC-020:question_ur", "ITC-020:explanation_ur", "ITC-026:options_ur[3]", "ITC-032:explanation_ur", "ITC-095:options_ur[1]", "ITC-194:explanation_ur", "ITC-227:question_ur", "ITC-227:explanation_ur", "ITC-229:question_ur", "ITC-229:explanation_ur", "ITC-230:explanation_ur", "ITC-231:question_ur", "ITC-231:explanation_ur", "ITC-274:question_ur", "ITC-285:options_ur[1]", "ITC-287:explanation_ur", "ITC-368:question_ur", "ITC-388:options_ur[3]", "ITC-411:options_ur[3]", "ITC-412:explanation_ur", "ITC-415:explanation_ur", "ITC-415:options_ur[1]", "ITC-485:question_ur"]);
let itWindowFields = [], itWindowBad = [], itKhirkiFields = [], itKhirkiBad = [], itGatewayFields = [], itGatewayBad = [];
for (const q of it) {
  const fields = [["question_ur", q.question, q.question_ur], ...q.options.map((o, i) => [`options_ur[${i}]`, o, q.options_ur[i]]), ["explanation_ur", q.explanationEn ?? q.explanation, q.explanation_ur]];
  for (const [loc, en, ur] of fields) {
    const key = `${q.id}:${loc}`;
    if ((ur ?? "").includes("ونڈو")) {
      itWindowFields.push(key);
      if (!/window/i.test(en)) itWindowBad.push(key);
    }
    if (tokens(ur).includes("کھڑکی")) {
      itKhirkiFields.push(key);
      if (!/window/i.test(en)) itKhirkiBad.push(key);
    }
    if ((ur ?? "").includes("گیٹ وے")) {
      itGatewayFields.push(key);
      if (!/gateway/i.test(en)) itGatewayBad.push(key);
    }
  }
}
check("U2 it: ونڈو in exactly the 23 inventoried fields, every one with EN 'window'; کھڑکی token in exactly ITC-454:options_ur[2] + ITC-455:options_ur[1] (physical window); گیٹ وے in exactly ITC-306:options_ur[1] + ITC-306:explanation_ur (EN 'gateway')",
  itWindowFields.length === 23 && itWindowFields.every((f) => IT_WINDOW_FIELDS.has(f)) && itWindowBad.length === 0 &&
  itKhirkiFields.length === 2 && itKhirkiFields.includes("ITC-454:options_ur[2]") && itKhirkiFields.includes("ITC-455:options_ur[1]") && itKhirkiBad.length === 0 &&
  itGatewayFields.length === 2 && itGatewayFields.includes("ITC-306:options_ur[1]") && itGatewayFields.includes("ITC-306:explanation_ur") && itGatewayBad.length === 0,
  `window ${itWindowFields.length} bad ${itWindowBad.join(",")} / khirki ${itKhirkiFields.join(",")} / gateway ${itGatewayFields.join(",")}`);
// EN-correspondence: token-level pins for the swamp
// terms — فل (technical full-backup sense only),
// گروہ (ITC-117 only), سطر/سطروں (ITC-252 only), خط
// (letter + stroke senses, 9 fields), ریٹ (refresh/data
// rate only), چیک کر (look-at sense, 3 fields).
function itTokenFields(tok) {
  const out = [];
  for (const q of it) {
    const fields = [["question_ur", q.question_ur], ...q.options_ur.map((o, i) => [`options_ur[${i}]`, o]), ["explanation_ur", q.explanation_ur]];
    for (const [loc, val] of fields) if (tokens(val).includes(tok)) out.push(`${q.id}:${loc}`);
  }
  return out;
}
const itFullTok = itTokenFields("فل");
const itGirohTok = itTokenFields("گروہ");
const itSatrTok = itTokenFields("سطر");
const itSatronTok = itTokenFields("سطروں");
const itKhatTok = itTokenFields("خط");
const itRateTok = itTokenFields("ریٹ");
const itCheckKarFields = itPairs.filter(([, v]) => (v ?? "").includes("چیک کر")).map(([l]) => l);
const itSetEq = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
check("U2 it: فل token in exactly 6 fields (309E, 467Q/E, 489Q/O0/E); گروہ token in exactly ITC-117Q/E; سطر token in exactly ITC-252O3 + سطروں token in exactly ITC-252Q/E; خط token in exactly 9 fields (248Q/O0, 249O0/E, 254Q/E, 255Q/E, 259Q); ریٹ token in exactly 4 fields (115Q/E, 163Q/E); 'چیک کر' in exactly 3 fields (189Q, 496E, 499E)",
  itSetEq(itFullTok, ["ITC-309:explanation_ur", "ITC-467:question_ur", "ITC-467:explanation_ur", "ITC-489:question_ur", "ITC-489:options_ur[0]", "ITC-489:explanation_ur"]) &&
  itSetEq(itGirohTok, ["ITC-117:question_ur", "ITC-117:explanation_ur"]) &&
  itSetEq(itSatrTok, ["ITC-252:options_ur[3]"]) && itSetEq(itSatronTok, ["ITC-252:question_ur", "ITC-252:explanation_ur"]) &&
  itSetEq(itKhatTok, ["ITC-248:question_ur", "ITC-248:options_ur[0]", "ITC-249:options_ur[0]", "ITC-249:explanation_ur", "ITC-254:question_ur", "ITC-254:explanation_ur", "ITC-255:question_ur", "ITC-255:explanation_ur", "ITC-259:question_ur"]) &&
  itSetEq(itRateTok, ["ITC-115:question_ur", "ITC-115:explanation_ur", "ITC-163:question_ur", "ITC-163:explanation_ur"]) &&
  itSetEq(itCheckKarFields, ["ITC-189:question_ur", "ITC-496:explanation_ur", "ITC-499:explanation_ur"]),
  `فل ${itFullTok.join(",")} / گروہ ${itGirohTok.join(",")} / سطر ${itSatrTok.join(",")} سطروں ${itSatronTok.join(",")} / خط ${itKhatTok.join(",")} / ریٹ ${itRateTok.join(",")} / چیک کر ${itCheckKarFields.join(",")}`);
const itById = new Map(it.map((q) => [q.id, q]));
check("U2 it: exact-field pins, expansions + keeps — 026Q/032Q/040Q acronym questions, 032E/040E/054E/056E/081E/082E/112E/113E/174E/039E/041E E-spelled expansions, 302Q/381Q/491Q/175Q/178Q Q-spelled expansions, 054Q/056Q مخفف questions, 040O1 یونائیٹڈ سسٹم بورڈ distractor, 055/321/386/246 options byte-exact, 489O3 System Restore, 402Q/E Total/Price/Quantity, 448Q cat/dog, 405Q/E Vs, 338Q/E total, 248O0 Mail Merge Latin, 249 میل مرج 2×, 118Q USB pairings, 147O0 ';'",
  itById.get("ITC-026").question_ur === "WWW کا مطلب کیا ہے؟" &&
  itById.get("ITC-032").question_ur === "GUI کا مطلب کیا ہے؟" &&
  itById.get("ITC-040").question_ur === "USB کا مطلب کیا ہے؟" &&
  itById.get("ITC-054").question_ur.includes("URL کس کا مخفف ہے") &&
  itById.get("ITC-056").question_ur.includes("CC کس کا مخفف ہے") &&
  itById.get("ITC-032").explanation_ur.includes("گرافکل یوزر انٹرفیس") &&
  itById.get("ITC-040").explanation_ur.includes("یونیورسل سیریل بس") &&
  itById.get("ITC-054").explanation_ur.includes("یونیفارم ریسورس لوکیٹر (URL)") &&
  itById.get("ITC-056").explanation_ur.includes("کاربن کاپی (CC)") &&
  itById.get("ITC-081").explanation_ur.includes("میموری ایڈریس رجسٹر") &&
  itById.get("ITC-082").explanation_ur.includes("میموری ڈیٹا رجسٹر") &&
  itById.get("ITC-112").explanation_ur.includes("لکوڈ کرسٹل ڈسپلے") &&
  itById.get("ITC-113").explanation_ur.includes("آرگینک لائٹ ایمیٹنگ ڈائیوڈ") &&
  itById.get("ITC-174").explanation_ur.includes("ریوولیوشنز پر منٹ") &&
  itById.get("ITC-039").explanation_ur.includes("ویژول ڈسپلے یونٹ (VDU)") &&
  itById.get("ITC-041").explanation_ur.includes("سالڈ اسٹیٹ ڈرائیو (SSD)") &&
  itById.get("ITC-302").question_ur.includes("نیٹ ورک انٹرفیس کارڈ (NIC)") &&
  itById.get("ITC-381").question_ur.includes("ڈیٹا بیس مینجمنٹ سسٹم (DBMS)") &&
  itById.get("ITC-491").question_ur.includes("لرننگ مینجمنٹ سسٹم (LMS)") &&
  itById.get("ITC-175").question_ur.includes("سالڈ اسٹیٹ ڈرائیو (SSD)") &&
  itById.get("ITC-178").question_ur.includes("کمپیکٹ ڈسک (CD)") &&
  itById.get("ITC-040").options_ur[1] === "یونائیٹڈ سسٹم بورڈ" &&
  JSON.stringify(itById.get("ITC-055").options_ur) === JSON.stringify(["System", "Secure", "Server", "Signal"]) &&
  JSON.stringify(itById.get("ITC-321").options_ur) === JSON.stringify(["Subject", "Attachment", "BCC", "Signature"]) &&
  JSON.stringify(itById.get("ITC-386").options_ur) === JSON.stringify(["Date/Time", "Text", "Number", "Yes/No"]) &&
  JSON.stringify(itById.get("ITC-246").options_ur) === JSON.stringify(["Columns کی خصوصیت", "Table کی خصوصیت", "Text Box کی خصوصیت", "Drop Cap کی خصوصیت"]) &&
  itById.get("ITC-489").options_ur[3] === "System Restore" &&
  itById.get("ITC-402").question_ur.includes("Total") && itById.get("ITC-402").question_ur.includes("Price") && itById.get("ITC-402").question_ur.includes("Quantity") &&
  itById.get("ITC-402").explanation_ur.includes("Total") && itById.get("ITC-402").explanation_ur.includes("Price") && itById.get("ITC-402").explanation_ur.includes("Quantity") &&
  itById.get("ITC-448").question_ur.includes("cat") && itById.get("ITC-448").question_ur.includes("dog") &&
  itById.get("ITC-405").question_ur.includes("Vs") && itById.get("ITC-405").explanation_ur.includes("Vs") &&
  itById.get("ITC-338").question_ur.includes("total") && itById.get("ITC-338").explanation_ur.includes("total") &&
  itById.get("ITC-248").options_ur[0].includes("Mail Merge") &&
  [itById.get("ITC-249").question_ur, ...itById.get("ITC-249").options_ur, itById.get("ITC-249").explanation_ur].join(" ").split("میل مرج").length - 1 === 2 &&
  itById.get("ITC-118").question_ur.includes("USB 2.0 اور USB 3.0") && itById.get("ITC-118").question_ur.includes("نسخہ اور رفتار کا کون سا جوڑا درست ہے؟") &&
  itById.get("ITC-147").options_ur[0] === ";");
check("U2 it: exact-field pins, normalizations + splits — 306O1/E گیٹ وے, 368Q ونڈو, 251O2/E سیل, 215O3/E مصنوعے, 414O0/E پاور کیبل, 099O2 جوابی پرچے, 476E صحت کے ریکارڈز, 448O0/E گروپ, 079O3 مستقل کاپی, 109Q/199Q پرنٹ کرتا ہے, 350Q چھاپتا ہے, 454O2/E چھاپنا, 069Q/077Q/092O0/449Q پروسیس, 477O1/480E/491E/328O1 شیئر, 476O2 شیئر کرنا, 005E پوائنٹنگ ڈیوائس, 449E ڈھیلے انداز میں متاثر, 473Q مشینوں میں, 492Q نقلی مشقیں, 439Q/E نیٹکٹ, 440E سرقہ, 444Q ایرگونومکس, 284E کاپی شدہ + Office Clipboard, 232E کاپی کرنا اور پیسٹ کرنا, 093O3 تیر والی چابیوں, 472E گاہک + انسٹال, 155E 1,048,576 بائٹس, 483Q ویب سائٹس, 228E ترتیبات ایپ, 485Q Close, 252O3 سطر, 252Q/E سطروں",
  itById.get("ITC-306").options_ur[1].includes("گیٹ وے") && itById.get("ITC-306").explanation_ur.includes("گیٹ وے") &&
  itById.get("ITC-368").question_ur.includes("ونڈو") &&
  itById.get("ITC-251").options_ur[2].includes("سیل") && itById.get("ITC-251").explanation_ur.includes("سیل") &&
  itById.get("ITC-215").options_ur[3].includes("مصنوعے") && itById.get("ITC-215").explanation_ur.includes("مصنوعے") &&
  itById.get("ITC-414").options_ur[0].includes("پاور کیبل") && itById.get("ITC-414").explanation_ur.includes("پاور کیبلیں") &&
  itById.get("ITC-099").options_ur[2].includes("جوابی پرچے") &&
  itById.get("ITC-476").explanation_ur.includes("صحت کے ریکارڈز") &&
  itById.get("ITC-448").options_ur[0].includes("گروپ") && itById.get("ITC-448").explanation_ur.includes("گروپوں") &&
  itById.get("ITC-079").options_ur[3].includes("مستقل کاپی") &&
  itById.get("ITC-109").question_ur.includes("پرنٹ کرتا ہے") && itById.get("ITC-199").question_ur.includes("پرنٹ کرتا ہے") &&
  itById.get("ITC-350").question_ur.includes("چھاپتا ہے") &&
  itById.get("ITC-454").options_ur[2].includes("چھاپنا") && itById.get("ITC-454").explanation_ur.includes("چھاپنا") &&
  itById.get("ITC-069").question_ur.includes("پروسیس") && itById.get("ITC-077").question_ur.includes("پروسیس") &&
  itById.get("ITC-092").options_ur[0].includes("پروسیس") && itById.get("ITC-449").question_ur.includes("پروسیس") &&
  itById.get("ITC-477").options_ur[1].includes("شیئر") && itById.get("ITC-480").explanation_ur.includes("شیئر") &&
  itById.get("ITC-491").explanation_ur.includes("شیئر") && itById.get("ITC-328").options_ur[1].includes("شیئر") &&
  itById.get("ITC-476").options_ur[2].includes("شیئر کرنا") &&
  itById.get("ITC-005").explanation_ur.includes("پوائنٹنگ ڈیوائس") &&
  itById.get("ITC-449").explanation_ur.includes("ڈھیلے انداز میں متاثر") &&
  itById.get("ITC-473").question_ur.includes("مشینوں میں") &&
  itById.get("ITC-492").question_ur.includes("نقلی مشقیں") &&
  itById.get("ITC-439").question_ur.includes("نیٹکٹ") && itById.get("ITC-439").explanation_ur.includes("نیٹکٹ") &&
  itById.get("ITC-440").explanation_ur.includes("سرقہ") &&
  itById.get("ITC-444").question_ur.includes("ایرگونومکس") &&
  itById.get("ITC-284").explanation_ur.includes("کاپی شدہ") && itById.get("ITC-284").explanation_ur.includes("Office Clipboard") &&
  itById.get("ITC-232").explanation_ur.includes("کاپی کرنا اور پیسٹ کرنا") &&
  itById.get("ITC-093").options_ur[3].includes("تیر والی چابیوں") &&
  itById.get("ITC-472").explanation_ur.includes("گاہک") && itById.get("ITC-472").explanation_ur.includes("انسٹال") &&
  itById.get("ITC-155").explanation_ur.includes("1,048,576 بائٹس") &&
  itById.get("ITC-483").question_ur.includes("ویب سائٹس") &&
  itById.get("ITC-228").explanation_ur.includes("ترتیبات ایپ") &&
  itById.get("ITC-485").question_ur.includes("Close") &&
  itById.get("ITC-252").options_ur[3].includes("سطر") &&
  itById.get("ITC-252").question_ur.includes("سطروں") && itById.get("ITC-252").explanation_ur.includes("سطروں"));

// ---------- §3M PE bank (U2 subject 12) ----------
// U2 rewrote the PE _ur fields (533 of 3000
// field-values changed; 326/500 items; Q 176, O 110,
// E 247; 174 items unchanged, already idiomatic).
// File order is the Phase 1 order: the 10 legacy
// DRW-011..DRW-020 drawing cross-ref items first,
// then PE-001..PE-490 (PE-001..036 original +
// PE-037..490 Phase 1 append). The DRW-011..020 gap
// in drawing.json is deliberate (no collision) and
// the items are NOT renumbered or moved.
// explanationUrdu is null in all 500; explanationEn
// in exactly DRW-011/012/016/019 + PE-001 (the 5
// mixed-explanation originals, echo-dedup per U1
// ruling 1). Digit rule is STRICT on every field vs
// EN (digitRuns + sameMultiset, same helpers as §3L),
// with the relaxedDigitOk echo carve-out for exactly
// the 4 echo explanations (DRW-011/012/019, PE-001:
// EN carries the digit twice — English sentence +
// Roman echo — _ur states it once). Latin rule is
// the U2-PE central validator's allowlist (30 words:
// acronyms CPR/ATP-PC/FIFA/IOC/ICC/FITT/WHO/SMART/
// FIBA/DRABC/DOMS/CGF/POA/ODI/T20/VO2/BMI/WADA/PRICE/
// IPC/EPOC/RICE/FIH + km/m/max/key/U) + single
// letters; km and m are 0x after N2 (PE-026
// "4x100 m" -> "4x100 میٹر"); the only remaining
// single-letter Latin is x (dimension/event
// separator, e.g. 29x16, 4x100). Verbatim-shaped
// options (phase1-pe isTechVerbatim, copied here —
// do not drift) stay byte-identical; 0 violations,
// so NO exact-mapping carve-out was needed (unlike
// IT). Colon frames KEPT at PE-022/PE-030 (EN Q
// ends with ":" in both; options are fragments).
// Splits KEPT (different EN, sense, cluster, or
// grammar — not spelling variants): پوائنٹس 14
// fields (tennis/table-tennis/badminton/kabaddi
// points — DELIBERATE divergence from guide نمبر,
// flagged); پٹھا 27× vs عضلہ 3× (PE-034 gloss +
// PE-123 heart muscle only); قوت = Power-as-
// component label (7 option fields) vs طاقت =
// descriptive power/strength (PE-102/103 "great
// power" -> طاقت; PE-160 E MUST differ — power vs
// strength in one sentence — قوت vs طاقت); جال 29×
// (net in play phrases + goal nets) vs نیٹ token
// in exactly PE-003E + PE-017Q/E (net as object/
// height — P1a's deliberate choice, flagged);
// تحریک 11× = EN "movement/impulse" (Olympic
// Movement, gymnastics movement, nerve impulses)
// vs ترغیب 16× = EN "motivation" vs حوصلہ 5× =
// EN "encourage" (different senses, no conflict);
// اشیا KEPT for EN "items/things" physical only
// (4 fields; DELIBERATE divergence from Pak
// Studies/GK ban, Social Studies precedent);
// اسکور 12× for EN "score/scoring" (DELIBERATE
// cross-bank divergence — IT bans اسکور, PE keeps
// it, flagged); ٹارگٹ ہارٹ ریٹ زون kept Latin
// in exactly PE-174Q/E (tested label; plain
// "ہارٹ ریٹ" normalized to دل کی دھڑکن
// everywhere else, N6). Coinages/judgment calls
// flagged for owner confirmation: غیر کھلاڑیانہ
// رویہ (PE-331, unsportsmanlike), آسن (PE-065E +
// PE-202, yoga postures), باربل (PE-160Q, fresh
// transliteration), مساج (PE-207E; مالش 0×),
// فضلہ اجزا (PE-213E/216, waste products;
// فضلہ مادے 0×), واپسی (reversibility) + جمود
// (plateau), خودکار collision (PE-142E: the
// autonomous stage AND "automatic" share one
// word — no attested alternative). Normalizations
// N1–N6 (coordinator, asserted counts):
// N1 PE-131Q فزیالوجی -> فعلیات; N2 PE-026Q
// "4x100 m" -> "4x100 میٹر"; N3 PE-385Q/E
// رکاوٹ -> ہرڈل (P4b recommendation; PE-349
// already ہرڈل); N4 جب کہ -> جبکہ PE-312O0/E +
// PE-316E (74× dominant); N5 وارننگ -> انتباہ
// PE-310O0/O1/E + PE-347O0 (same EN "warning"
// as PE-024 card-warning انتباہ); N6 ہارٹ ریٹ ->
// دل کی دھڑکن PE-009Q/E, PE-118E, PE-119Q/E,
// PE-121Q, PE-126E (26× dominant). Flagged facts
// mirrored, not resolved: all S21–S23
// measurements (kho-kho 29×16, kabaddi sizes,
// basketball FIBA 28×15 vs NBA, football 105×68,
// cricket/hockey ball 0.1 g lower bound),
// PE-111 (DOMS/lactic-acid distractor), PE-138,
// PE-147 (WHO BMI bands), PE-407/408 (DRABC vs
// DRSABCD), CPR 30:2 + 100–120/min, Rescue 1122,
// PE-309, PE-489 (Serena years), PE-490 (PT Usha)
// — see VERIFY-u2-pe.md §8.
const pe = JSON.parse(fs.readFileSync(join(ROOT, "src/data/banks/pe.json"), "utf8"));
check("U2 pe: 500 items", pe.length === 500, `got ${pe.length}`);
const peIdsOk = pe.slice(0, 10).every((q, i) => q.id === `DRW-${String(11 + i).padStart(3, "0")}`) &&
  pe.slice(10).every((q, i) => q.id === `PE-${String(i + 1).padStart(3, "0")}`);
check("U2 pe: file order DRW-011..DRW-020 then PE-001..PE-490", peIdsOk);
const pePairs = [];
for (const q of pe) {
  pePairs.push([`${q.id}:question_ur`, q.question_ur]);
  q.options_ur.forEach((o, i) => pePairs.push([`${q.id}:options_ur[${i}]`, o]));
  pePairs.push([`${q.id}:explanation_ur`, q.explanation_ur]);
}
const peUrText = pePairs.map(([, v]) => v ?? "").join("\n");
const peCount = (t) => peUrText.split(t).length - 1;
const peTokens = (s) => tokens(s);
// Banned terms, token-aware (فورا/تقریبا checked as
// tokens: as substrings they live inside فوراً/تقریباً,
// so a substring check would false-positive 31×/17×).
const PE_BANNED = ["مونث", "مؤنث", "پیڈاگوجی", "سورۃ", "وزیراعظم", "محمدن", "ووٹرز", "ججز", "سکرین", "پریکٹس", "فورا", "تقریبا"];
const peBanned = bannedHits(pePairs, PE_BANNED);
check("U2 pe: no banned glossary/variant terms in any _ur field (token-aware; اسکور NOT banned — 12× for EN 'score', deliberate cross-bank divergence from IT; اشیا/اشیاء see below)", peBanned.length === 0, peBanned.slice(0, 5).join(", "));
const PE_PHRASES = ["درج ذیل", "جب کہ", "ورلڈ ہیلتھ", "ویٹ ٹریننگ", "فزیالوجی", "وارننگ", "ابتدائی طبی مدد", "کول ڈاؤن", "فضلہ مادے", "مالش", "قلبی وعائی", "اشیاء", "میڈل"];
const pePhrases = pePairs.filter(([, v]) => PE_PHRASES.some((p) => (v ?? "").includes(p)));
check("U2 pe: no banned phrases in any _ur field (درج ذیل/جب کہ/ورلڈ ہیلتھ/ویٹ ٹریننگ/فزیالوجی/وارننگ/ابتدائی طبی مدد/کول ڈاؤن/فضلہ مادے/مالش/قلبی وعائی/اشیاء/میڈل — medal is تمغے/تمغوں)", pePhrases.length === 0, pePhrases.slice(0, 3).map(([l]) => l).join(", "));
const peEmdash = pePairs.filter(([, v]) => (v ?? "").includes("—"));
check("U2 pe: no em-dash in any _ur field", peEmdash.length === 0, peEmdash.slice(0, 3).map(([l]) => l).join(", "));
const peMarker = pePairs.filter(([, v]) => (v ?? "").includes("[Auto-Translated]"));
check("U2 pe: no '[Auto-Translated]' literal in any _ur field", peMarker.length === 0, peMarker.slice(0, 3).map(([l]) => l).join(", "));
const peMojibake = pePairs.filter(([, v]) => (v ?? "").includes("�"));
check("U2 pe: no U+FFFD in any _ur field", peMojibake.length === 0, peMojibake.slice(0, 3).map(([l]) => l).join(", "));
const peIndic = pePairs.filter(([, v]) => /[۰-۹]/.test(v ?? ""));
check("U2 pe: no Urdu-Indic digits in any _ur field", peIndic.length === 0, peIndic.slice(0, 3).map(([l]) => l).join(", "));
const peYehKaf = pePairs.filter(([, v]) => /[\u064A\u0643]/.test(v ?? ""));
check("U2 pe: no Arabic yeh/kaf (U+064A/U+0643) in any _ur field", peYehKaf.length === 0, peYehKaf.slice(0, 3).map(([l]) => l).join(", "));
const pePct = pePairs.filter(([, v]) => (v ?? "").includes("%"));
check("U2 pe: no % in any _ur field", pePct.length === 0, pePct.slice(0, 3).map(([l]) => l).join(", "));
const peQmark = pePairs.filter(([, v]) => (v ?? "").includes("?"));
check("U2 pe: no Latin ? in any _ur field", peQmark.length === 0, peQmark.slice(0, 3).map(([l]) => l).join(", "));
const peSemi = pePairs.filter(([, v]) => (v ?? "").includes(";"));
check("U2 pe: no Latin ; in any _ur field", peSemi.length === 0, peSemi.slice(0, 3).map(([l]) => l).join(", "));
const peDotBad = pePairs.filter(([, v]) => (v ?? "").replace(/\d+\.\d+/g, " ").includes("."));
check("U2 pe: no Latin . outside decimal numbers in any _ur field", peDotBad.length === 0, peDotBad.slice(0, 3).map(([l]) => l).join(", "));
const peDashFields = pePairs.filter(([, v]) => (v ?? "").includes("–")).map(([l]) => l);
let peDashBad = [];
for (const [loc, v] of pePairs) {
  for (const m of (v ?? "").matchAll(/–/g)) {
    const i = m.index;
    if (!/\d/.test(v[i - 1] || "") || !/\d/.test(v[i + 1] || "")) peDashBad.push(loc);
  }
}
check("U2 pe: en-dash ONLY in PE-030 options (4 fields, between digits — resting heart-rate ranges)", peDashFields.length === 4 && peDashFields.every((f) => f.startsWith("PE-030:options_ur")) && peDashBad.length === 0, `${peDashFields.join(", ")} / bad ${peDashBad.join(", ")}`);
// Digit rule STRICT on every field, echo carve-out for exactly the 4 echo explanations.
const PE_ECHO_IDS = new Set(["DRW-011", "DRW-012", "DRW-019", "PE-001"]);
let peDigitBad = [];
for (const q of pe) {
  if (!sameMultiset(digitRuns(q.question), digitRuns(q.question_ur))) peDigitBad.push(`${q.id}:question_ur`);
  q.options.forEach((o, i) => {
    if (!sameMultiset(digitRuns(o), digitRuns(q.options_ur[i]))) peDigitBad.push(`${q.id}:options_ur[${i}]`);
  });
  if (!sameMultiset(digitRuns(q.explanation), digitRuns(q.explanation_ur))) {
    if (!(PE_ECHO_IDS.has(q.id) && relaxedDigitOk(q.explanation, q.explanation_ur))) peDigitBad.push(`${q.id}:explanation_ur`);
  }
}
check("U2 pe: digit preservation STRICT on every field (500 questions, options, explanations; echo carve-out ONLY for DRW-011/012/019 + PE-001 explanations)", peDigitBad.length === 0, peDigitBad.slice(0, 5).join(", "));
// Latin allowlist (U2-PE central validator, ported exactly).
const PE_LATIN_ALLOW = new Set([
  "CPR", "ATP-PC", "FIFA", "IOC", "ICC", "FITT", "WHO", "SMART", "FIBA", "DRABC",
  "DOMS", "CGF", "POA", "ODI", "T20", "VO2", "BMI", "WADA", "PRICE", "IPC", "EPOC",
  "RICE", "FIH", "km", "m", "max", "key", "U",
]);
function peLatinViolations(s) {
  let t = s.replace(/\b(VO2|T20)\b/g, " ");
  t = t.replace(/\d+\s*x\s*\d+/g, " ").replace(/\d+\.\d+/g, " ").replace(/\d+/g, " ");
  const bad = [];
  for (const w of t.match(/[A-Za-z][A-Za-z0-9.'-]*/g) || []) {
    if (w.length === 1) continue;
    if (!PE_LATIN_ALLOW.has(w)) bad.push(w);
  }
  return [...new Set(bad)];
}
const peLatinBad = [];
for (const [loc, v] of pePairs) {
  const lv = peLatinViolations(v ?? "");
  if (lv.length) peLatinBad.push(`${loc}:${lv.join(",")}`);
}
check("U2 pe: no Latin outside the 30-word allowlist in any _ur field (acronyms + km/m/max/key/U + single letters; km/m 0× after N2)", peLatinBad.length === 0, peLatinBad.slice(0, 5).join(", "));
// Verbatim options (phase1-pe isTechVerbatim, copied exactly — do not drift).
const PE_PURE_EXPR = /^[\d\s\/\.\+\-=\%\(\)xX\:\^\u2212,]+$/;
function peIsTechVerbatim(opt) {
  const t = opt.trim();
  if (PE_PURE_EXPR.test(t)) return true;
  if (/^([A-Z]{1,6}|\d+)(,\s*([A-Z]{1,6}|\d+))*$/.test(t)) return true;
  return false;
}
const peVerbatimBad = [];
for (const q of pe) {
  q.options.forEach((o, j) => {
    if (peIsTechVerbatim(o) && q.options_ur[j] !== o) peVerbatimBad.push(`${q.id}:opt${j}`);
  });
}
check("U2 pe: verbatim-shaped options byte-identical (no exact-mapping carve-out needed — 0 violations)", peVerbatimBad.length === 0, peVerbatimBad.slice(0, 5).join(", "));
check("U2 pe: explanationUrdu null in all 500; explanationEn in exactly DRW-011/012/016/019 + PE-001",
  pe.every((q) => q.explanationUrdu === null) &&
  pe.filter((q) => q.explanationEn).map((q) => q.id).join(",") === "DRW-011,DRW-012,DRW-016,DRW-019,PE-001");
let peEnScriptRuns = 0;
for (const q of pe) {
  peEnScriptRuns += (q.question.match(AR_RUN) || []).length + (q.explanation.match(AR_RUN) || []).length;
  q.options.forEach((o) => { peEnScriptRuns += (o.match(AR_RUN) || []).length; });
}
check("U2 pe: zero Arabic-script runs in English fields", peEnScriptRuns === 0, `got ${peEnScriptRuns}`);
let peFormBad = [];
for (const q of pe) {
  const byNorm = new Map();
  for (const f of [q.question_ur, ...q.options_ur, q.explanation_ur]) {
    for (const r of f.match(AR_RUN) || []) {
      const nn = r.normalize("NFKC");
      if (byNorm.has(nn) && byNorm.get(nn) !== r) peFormBad.push(q.id);
      else byNorm.set(nn, r);
    }
  }
}
check("U2 pe: repeated Urdu script forms byte-identical within each item (NFKC)", peFormBad.length === 0, [...new Set(peFormBad)].slice(0, 5).join(", "));
const peById = new Map(pe.map((q) => [q.id, q]));
check("U2 pe: colon frames kept at PE-022 + PE-030 (EN Q ends with ':' in both; options are fragments)",
  peById.get("PE-022").question.endsWith(":") && peById.get("PE-022").question_ur.endsWith(":") &&
  peById.get("PE-030").question.endsWith(":") && peById.get("PE-030").question_ur.endsWith(":"));
check("U2 pe: normalization pins — PE-131Q ورزش کی فعلیات (N1); PE-026Q 4x100 میٹر ریلے (N2)",
  peById.get("PE-131").question_ur === "ورزش کی فعلیات میں VO2 max سے کیا مراد ہے؟" &&
  peById.get("PE-026").question_ur === "4x100 میٹر ریلے ٹیم میں کتنے دوڑنے والے ہوتے ہیں؟");
function peCountsCheck(name, pairs) {
  const bad = pairs.filter(([t, n]) => peCount(t) !== n);
  check(name, bad.length === 0, bad.map(([t, n]) => `${t} ${peCount(t)}!=${n}`).join(", "));
}
peCountsCheck("U2 pe: exact counts, core guide + units — جسمانی تعلیم 48×, ورزش 158×, کھیل 392× (incl. کھیلوں 109×), کھلاڑی 326×, میدان 38×, وارم اپ 52×, کولنگ ڈاؤن 18×, میٹر 252× (incl. کلومیٹر 6×), فٹ 88× (incl. فٹنس 45× + فٹ بال 35× + bare فٹ 8×), انچ 23×, گز 53×, منٹ 131×, سیکنڈ 27×, گرام 80×, دل کی دھڑکن 33×, پٹھا 28×, عضلہ 4×, فٹنس 45×, کوچ 27×, ریفری 14×, امپائر 15×, کپتان 12×, گول کیپر 20×, پینلٹی 23×, فاؤل 15×, آف سائیڈ 12×, تمغے 9×, تمغوں 3×, طلائی 6×, لیور 21×, فلکرم 6×, کوشش 36×, بوجھ 25× (substring counts)",
  [["جسمانی تعلیم", 48], ["ورزش", 158], ["کھیل", 392], ["کھلاڑی", 326], ["میدان", 38], ["وارم اپ", 52], ["کولنگ ڈاؤن", 18], ["میٹر", 252], ["فٹ", 88], ["انچ", 23], ["گز", 53], ["منٹ", 131], ["سیکنڈ", 27], ["گرام", 80], ["دل کی دھڑکن", 33], ["پٹھا", 28], ["عضلہ", 4], ["فٹنس", 45], ["کوچ", 27], ["ریفری", 14], ["امپائر", 15], ["کپتان", 12], ["گول کیپر", 20], ["پینلٹی", 23], ["فاؤل", 15], ["آف سائیڈ", 12], ["تمغے", 9], ["تمغوں", 3], ["طلائی", 6], ["لیور", 21], ["فلکرم", 6], ["کوشش", 36], ["بوجھ", 25]]);
peCountsCheck("U2 pe: exact counts, adjudicated terms — ترغیب 16×, تحریک 11×, حوصلہ 5×, ہرڈل 10×, رکاوٹ 2×, اشیا 4×, پوائنٹس 18×, نمبر 5×, قوت 9×, طاقت 58×, ابتدائی طبی امداد 15×, انتباہ 8×, فعلیات 3×, مندرجہ ذیل 4×, جبکہ 77×, عالمی ادارہ صحت 2×, آسن 3×, وزن کی تربیت 2×, فضلہ اجزا 3×, مساج 1×, سیال 14×, قلبی عروقی 7×, غیر کھلاڑیانہ 2×, چربی سے پاک 2×, ہدایت اور کنٹرول 3×, ٹارگٹ ہارٹ ریٹ زون 2×, جسمانی خواندگی 2×, جاگنگ 14×, فٹ بالر 8×, لیکٹک ایسڈ 15×, سیٹ 13×, خودکار 7×, ادراکی 7×, ربطی 6×, باربل 1×, واپسی 14×, جمود 3×, موٹر لرننگ 2×, کاربوہائیڈریٹ 15×, گلائیکوجن 5×, الیکٹرولائٹس 5×, پروٹین 8×, وٹامن 5×, فائبر 3×, سپلیمنٹ 7×, اسکور 12×, جال 29× (substring counts; فوراً 31 fields + تقریباً 17 fields pinned token-level below, NOT as substrings)",
  [["ترغیب", 16], ["تحریک", 11], ["حوصلہ", 5], ["ہرڈل", 10], ["رکاوٹ", 2], ["اشیا", 4], ["پوائنٹس", 18], ["نمبر", 5], ["قوت", 9], ["طاقت", 58], ["ابتدائی طبی امداد", 15], ["انتباہ", 8], ["فعلیات", 3], ["مندرجہ ذیل", 4], ["جبکہ", 77], ["عالمی ادارہ صحت", 2], ["آسن", 3], ["وزن کی تربیت", 2], ["فضلہ اجزا", 3], ["مساج", 1], ["سیال", 14], ["قلبی عروقی", 7], ["غیر کھلاڑیانہ", 2], ["چربی سے پاک", 2], ["ہدایت اور کنٹرول", 3], ["ٹارگٹ ہارٹ ریٹ زون", 2], ["جسمانی خواندگی", 2], ["جاگنگ", 14], ["فٹ بالر", 8], ["لیکٹک ایسڈ", 15], ["سیٹ", 13], ["خودکار", 7], ["ادراکی", 7], ["ربطی", 6], ["باربل", 1], ["واپسی", 14], ["جمود", 3], ["موٹر لرننگ", 2], ["کاربوہائیڈریٹ", 15], ["گلائیکوجن", 5], ["الیکٹرولائٹس", 5], ["پروٹین", 8], ["وٹامن", 5], ["فائبر", 3], ["سپلیمنٹ", 7], ["اسکور", 12], ["جال", 29]]);
function peTokenFields(tok) {
  const out = [];
  for (const q of pe) {
    const fields = [["question_ur", q.question_ur], ...q.options_ur.map((o, i) => [`options_ur[${i}]`, o]), ["explanation_ur", q.explanation_ur]];
    for (const [loc, val] of fields) if (peTokens(val).includes(tok)) out.push(`${q.id}:${loc}`);
  }
  return out;
}
const peSetEq = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
check("U2 pe: فوراً token in exactly 31 fields + تقریباً token in exactly 17 fields (bare فورا/تقریبا tokens 0× — substring counts would false-positive)",
  peTokenFields("فوراً").length === 31 && peTokenFields("فورا").length === 0 &&
  peTokenFields("تقریباً").length === 17 && peTokenFields("تقریبا").length === 0,
  `فوراً ${peTokenFields("فوراً").length} فورا ${peTokenFields("فورا").length} تقریباً ${peTokenFields("تقریباً").length} تقریبا ${peTokenFields("تقریبا").length}`);
check("U2 pe: ہرڈل in exactly 6 fields (PE-349Q/O2/O3/E + PE-385Q/E, every one EN 'hurdle(s)'); رکاوٹ in exactly PE-412E + PE-413E (EN 'obstacle/blocked', NOT hurdles)",
  peSetEq(pePairs.filter(([, v]) => (v ?? "").includes("ہرڈل")).map(([l]) => l),
    ["PE-349:question_ur", "PE-349:options_ur[2]", "PE-349:options_ur[3]", "PE-349:explanation_ur", "PE-385:question_ur", "PE-385:explanation_ur"]) &&
  peSetEq(pePairs.filter(([, v]) => (v ?? "").includes("رکاوٹ")).map(([l]) => l),
    ["PE-412:explanation_ur", "PE-413:explanation_ur"]),
  `ہرڈل ${pePairs.filter(([, v]) => (v ?? "").includes("ہرڈل")).map(([l]) => l).join(", ")} / رکاوٹ ${pePairs.filter(([, v]) => (v ?? "").includes("رکاوٹ")).map(([l]) => l).join(", ")}`);
check("U2 pe: اشیا in exactly 4 fields (PE-390E shared items, PE-393O2/E damaged items, PE-398E falling objects — all EN physical 'items/things'; deliberate divergence from Pak Studies/GK ban, SS precedent)",
  peSetEq(pePairs.filter(([, v]) => (v ?? "").includes("اشیا")).map(([l]) => l),
    ["PE-390:explanation_ur", "PE-393:options_ur[2]", "PE-393:explanation_ur", "PE-398:explanation_ur"]),
  pePairs.filter(([, v]) => (v ?? "").includes("اشیا")).map(([l]) => l).join(", "));
check("U2 pe: ہارٹ ریٹ in exactly PE-174Q/E (inside ٹارگٹ ہارٹ ریٹ زون, the kept tested label); دل کی دھڑکن 33× everywhere else",
  peSetEq(pePairs.filter(([, v]) => (v ?? "").includes("ہارٹ ریٹ")).map(([l]) => l),
    ["PE-174:question_ur", "PE-174:explanation_ur"]) && peCount("دل کی دھڑکن") === 33,
  `ہارٹ ریٹ ${pePairs.filter(([, v]) => (v ?? "").includes("ہارٹ ریٹ")).map(([l]) => l).join(", ")} / دل کی دھڑکن ${peCount("دل کی دھڑکن")}`);
check("U2 pe: پوائنٹس in exactly 14 fields (PE-013Q/E, PE-015Q/E, PE-016Q/E, PE-341Q/O0/O2/O3/E, PE-344O0/E, PE-442O1 — tennis/table-tennis/badminton/kabaddi points; deliberate divergence from guide نمبر, flagged)",
  peSetEq(pePairs.filter(([, v]) => (v ?? "").includes("پوائنٹس")).map(([l]) => l),
    ["PE-013:question_ur", "PE-013:explanation_ur", "PE-015:question_ur", "PE-015:explanation_ur", "PE-016:question_ur", "PE-016:explanation_ur", "PE-341:question_ur", "PE-341:options_ur[0]", "PE-341:options_ur[2]", "PE-341:options_ur[3]", "PE-341:explanation_ur", "PE-344:options_ur[0]", "PE-344:explanation_ur", "PE-442:options_ur[1]"]),
  pePairs.filter(([, v]) => (v ?? "").includes("پوائنٹس")).map(([l]) => l).join(", "));
check("U2 pe: قوت = Power-as-component in exactly 7 option fields (PE-151O0, PE-157O2, PE-158O1, PE-160O0–O3); PE-160E contrasts قوت (power) vs طاقت (strength) in one sentence; PE-390O1 قوت مدافعت = EN 'resistance'",
  peSetEq(["PE-151:options_ur[0]", "PE-157:options_ur[2]", "PE-158:options_ur[1]", "PE-160:options_ur[0]", "PE-160:options_ur[1]", "PE-160:options_ur[2]", "PE-160:options_ur[3]"].filter((f) => pePairs.some(([l, v]) => l === f && (v ?? "").includes("قوت"))),
    ["PE-151:options_ur[0]", "PE-157:options_ur[2]", "PE-158:options_ur[1]", "PE-160:options_ur[0]", "PE-160:options_ur[1]", "PE-160:options_ur[2]", "PE-160:options_ur[3]"]) &&
  peById.get("PE-160").explanation_ur.includes("قوت کو ظاہر کرتا ہے، جو تیزی سے لگائی گئی طاقت ہے") &&
  peById.get("PE-390").options_ur[1].includes("قوت مدافعت"));
check("U2 pe: motor-learning stages — ادراکی/ربطی/خودکار in exactly PE-142O0–O3+E + PE-143O0/O1/O2+E (خودکار also = 'automatic' in PE-142E — collision flagged, no attested alternative)",
  peSetEq(peTokenFields("ادراکی"), ["PE-142:options_ur[0]", "PE-142:options_ur[1]", "PE-142:options_ur[2]", "PE-142:options_ur[3]", "PE-142:explanation_ur", "PE-143:options_ur[2]", "PE-143:explanation_ur"]) &&
  peSetEq(peTokenFields("ربطی"), ["PE-142:options_ur[0]", "PE-142:options_ur[1]", "PE-142:options_ur[2]", "PE-142:options_ur[3]", "PE-142:explanation_ur", "PE-143:options_ur[1]"]) &&
  peSetEq(peTokenFields("خودکار"), ["PE-142:options_ur[0]", "PE-142:options_ur[1]", "PE-142:options_ur[2]", "PE-142:options_ur[3]", "PE-142:explanation_ur", "PE-143:options_ur[0]"]) &&
  peById.get("PE-142").explanation_ur.includes("خودکار مرحلے سے، جب مہارت زیادہ مشق شدہ اور خودکار ہو جاتی ہے"),
  `ادراکی ${peTokenFields("ادراکی").join(", ")} / ربطی ${peTokenFields("ربطی").join(", ")} / خودکار ${peTokenFields("خودکار").join(", ")}`);
check("U2 pe: PE-147 verbatim digit-range options byte-identical + WHO name عالمی ادارہ صحت (WHO) in Q+E (BMI bands 18.5–24.9/25.0–29.9 mirrored, not resolved)",
  JSON.stringify(peById.get("PE-147").options_ur) === JSON.stringify(peById.get("PE-147").options) &&
  peById.get("PE-147").question_ur.includes("عالمی ادارہ صحت (WHO)") &&
  peById.get("PE-147").explanation_ur.includes("عالمی ادارہ صحت (WHO)"));
check("U2 pe: kept-split field sets — نیٹ token exactly PE-003E + PE-017Q/E (جال 29× elsewhere, flagged); آسن exactly PE-065E + PE-202O3/E; فضلہ اجزا exactly PE-213E + PE-216O2/E; مساج exactly PE-207E; باربل exactly PE-160Q; غیر کھلاڑیانہ exactly PE-331Q/E; چربی سے پاک exactly PE-153Q/E; ہدایت اور کنٹرول exactly PE-450E + PE-459O2/E; عالمی ادارہ صحت exactly PE-147Q/E; وزن کی تربیت exactly PE-229Q + PE-237O0; قلبی عروقی exactly 7 fields (PE-149O0/E, PE-153O0, PE-154Q/E, PE-155O1, PE-159O3); تمغے exactly 9 fields; انتباہ exactly 8 fields (PE-024O0/E, PE-310O0/O1/E, PE-347O0, PE-400Q, PE-427E); واپسی reversibility exactly PE-167O0 + PE-169O3/E + PE-170O3 + PE-172O0; جمود exactly PE-172O2 + PE-173O2/E",
  peSetEq(peTokenFields("نیٹ"), ["PE-003:explanation_ur", "PE-017:question_ur", "PE-017:explanation_ur"]) &&
  peSetEq(pePairs.filter(([, v]) => (v ?? "").includes("آسن")).map(([l]) => l), ["PE-065:explanation_ur", "PE-202:options_ur[3]", "PE-202:explanation_ur"]) &&
  peSetEq(pePairs.filter(([, v]) => (v ?? "").includes("فضلہ اجزا")).map(([l]) => l), ["PE-213:explanation_ur", "PE-216:options_ur[2]", "PE-216:explanation_ur"]) &&
  peSetEq(pePairs.filter(([, v]) => (v ?? "").includes("مساج")).map(([l]) => l), ["PE-207:explanation_ur"]) &&
  peSetEq(pePairs.filter(([, v]) => (v ?? "").includes("باربل")).map(([l]) => l), ["PE-160:question_ur"]) &&
  peSetEq(pePairs.filter(([, v]) => (v ?? "").includes("غیر کھلاڑیانہ")).map(([l]) => l), ["PE-331:question_ur", "PE-331:explanation_ur"]) &&
  peSetEq(pePairs.filter(([, v]) => (v ?? "").includes("چربی سے پاک")).map(([l]) => l), ["PE-153:question_ur", "PE-153:explanation_ur"]) &&
  peSetEq(pePairs.filter(([, v]) => (v ?? "").includes("ہدایت اور کنٹرول")).map(([l]) => l), ["PE-450:explanation_ur", "PE-459:options_ur[2]", "PE-459:explanation_ur"]) &&
  peSetEq(pePairs.filter(([, v]) => (v ?? "").includes("عالمی ادارہ صحت")).map(([l]) => l), ["PE-147:question_ur", "PE-147:explanation_ur"]) &&
  peSetEq(pePairs.filter(([, v]) => (v ?? "").includes("وزن کی تربیت")).map(([l]) => l), ["PE-229:question_ur", "PE-237:options_ur[0]"]) &&
  peSetEq(pePairs.filter(([, v]) => (v ?? "").includes("قلبی عروقی")).map(([l]) => l), ["PE-149:options_ur[0]", "PE-149:explanation_ur", "PE-153:options_ur[0]", "PE-154:question_ur", "PE-154:explanation_ur", "PE-155:options_ur[1]", "PE-159:options_ur[3]"]) &&
  peSetEq(pePairs.filter(([, v]) => (v ?? "").includes("تمغے")).map(([l]) => l), ["PE-047:options_ur[3]", "PE-073:options_ur[0]", "PE-255:explanation_ur", "PE-478:question_ur", "PE-478:explanation_ur", "PE-479:question_ur", "PE-479:explanation_ur", "PE-485:question_ur", "PE-485:explanation_ur"]) &&
  peSetEq(pePairs.filter(([, v]) => (v ?? "").includes("انتباہ")).map(([l]) => l), ["PE-024:options_ur[0]", "PE-024:explanation_ur", "PE-310:options_ur[0]", "PE-310:options_ur[1]", "PE-310:explanation_ur", "PE-347:options_ur[0]", "PE-400:question_ur", "PE-427:explanation_ur"]) &&
  ["PE-167:options_ur[0]", "PE-169:options_ur[3]", "PE-169:explanation_ur", "PE-170:options_ur[3]", "PE-172:options_ur[0]"].every((f) => peTokenFields("واپسی").includes(f)) &&
  peSetEq(peTokenFields("جمود"), ["PE-172:options_ur[2]", "PE-173:options_ur[2]", "PE-173:explanation_ur"]),
  `نیٹ ${peTokenFields("نیٹ").join(", ")} / انتباہ ${pePairs.filter(([, v]) => (v ?? "").includes("انتباہ")).map(([l]) => l).join(", ")} / واپسی ${peTokenFields("واپسی").join(", ")}`);

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
