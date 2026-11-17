// U1 idiomatic Urdu + UI/UX: glossary consistency, digit preservation,
// placeholder preservation, no-literal-marker audit, and the C2 flag-8
// punctuation pins. Scoped to the REWRITTEN surfaces only: chrome
// (700 STRINGS keys), notes/flashcards/plan/mocks (content.json _ur),
// the Islamiyat pilot bank (500 items, U1) and the Tajweed bank
// (500 items, U2 subject 1). The other 12 banks keep their pre-U1 _ur
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
