// UI/UX Program 2 — W2 (mobile: quiz + mock) + W3 (mobile: shell +
// content routes) source-pattern pins. W2 covers the W2-assigned audit
// items (QuizRunner, mock/[id], mock list, practice): M03, M19, M04,
// M27, M25 (task-labelled M29), M26, M24 (task-labelled M46-part).
// W3 covers the W3-assigned items (see the W3 section header below).
// Each item has at least one assertion; negative assertions pin the
// OLD pattern as gone, so the suite fails on pre-change code. No
// behaviour, wording, data-flow, or brand change is asserted (or
// permitted) here.
// Run: node scripts/test-uiux2.mjs  (exit 0 = all pass)
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

function read(rel) {
  return fs.readFileSync(join(ROOT, rel), "utf8");
}

function count(src, re) {
  return (src.match(re) ?? []).length;
}

// True when `fnName`'s body (up to the next top-level `function `
// after it) contains `needle`.
function fnContains(src, fnName, needle) {
  const start = src.indexOf(`function ${fnName}(`);
  if (start < 0) return false;
  const rest = src.slice(start);
  const next = rest.indexOf("\n  function ", 10);
  const body = next < 0 ? rest : rest.slice(0, next);
  return body.includes(needle);
}

const css = read("src/app/globals.css");
const qr = read("src/components/QuizRunner.tsx");
const mockRun = read("src/app/mock/[id]/page.tsx");
const practice = read("src/app/practice/page.tsx");

// --- M03 (P1): mock picked-option inline style deleted; .opt.picked rules ---
check("M03 mock picked inline style gone", !qr.includes('borderColor: "var(--teal)"'));
check(
  "M03 no mock-mode inline style on option button",
  !qr.includes('mode === "mock" && isPicked'),
);
check("M03 picked class still assigned", qr.includes('cls += " picked"'));
check(
  "M03 .opt.picked light rule still present (regression guard)",
  css.includes(".opt.picked { border-color: var(--teal); border-width: 2px; }"),
);
check(
  "M03 .opt.picked dark override still present (regression guard)",
  css.includes('[data-theme="dark"] .opt.picked { border-color: #7fd4d8; }'),
);

// --- M19 (P2): timer opens at 100:00, never 100:01 ---
check("M19 beginFresh syncs now", fnContains(qr, "beginFresh", "setNow(fresh)"));
check("M19 beginResume syncs now", fnContains(qr, "beginResume", "setNow(Date.now())"));
check(
  "M19 restart syncs now (same deadline mechanism)",
  fnContains(qr, "restart", "setNow(fresh)"),
);
check(
  "M19 secondsLeft still derives from the same now state",
  qr.includes("Math.ceil((deadlineTs - now) / 1000)"),
);
check(
  "M19 1s tick still drives now",
  qr.includes("setInterval(() => setNow(Date.now()), 1000)"),
);

// --- M04 (P1): empty trusted mock is not a dead end ---
check("M04 empty-questions guard present", mockRun.includes("questions.length === 0"));
check(
  "M04 empty guard shows the noQuestions message",
  mockRun.slice(mockRun.indexOf("questions.length === 0")).includes('t("noQuestions")'),
);
check(
  "M04 empty guard links back to mocks",
  mockRun.slice(mockRun.indexOf("questions.length === 0")).includes('t("backToMocks")'),
);

// --- M27 (P2): back-to-mocks link on the success path ---
check(
  "M27 backToMocks appears in all four branches",
  count(mockRun, /t\("backToMocks"\)/g) >= 4,
  `found ${count(mockRun, /t\("backToMocks"\)/g)}`,
);
check(
  "M27 success return renders the link above QuizRunner",
  (() => {
    const i = mockRun.lastIndexOf("<QuizRunner");
    if (i < 0) return false;
    const window = mockRun.slice(Math.max(0, i - 600), i);
    return window.includes('t("backToMocks")');
  })(),
);

// --- M25 (P2, task-labelled M29): practice timed-toggle checkbox row 44px ---
check(
  "M25 timed toggle label has 44px min-height",
  (() => {
    const i = practice.indexOf('t("timedToggleLabel")');
    if (i < 0) return false;
    const window = practice.slice(Math.max(0, i - 400), i);
    return window.includes("minHeight: 44") && window.includes('display: "flex"');
  })(),
);

// --- M26 (P2): revise-empty state offers a next action ---
check(
  "M26 revise-empty branch has a next-action button",
  (() => {
    const i = practice.indexOf('t("reviseEmpty")');
    if (i < 0) return false;
    const window = practice.slice(i, i + 400);
    return window.includes('setMode("standard")') && window.includes('t("practiceModeStandard")');
  })(),
);
check("M26 no new string: action reuses practiceModeStandard", practice.includes('t("practiceModeStandard")'));

// --- M24 (P2, task-labelled M46-part): IssueForm checkbox row 44px ---
check(
  "M24 IssueForm checkbox label has 44px min-height",
  (() => {
    const i = qr.indexOf('t("noCorrectionChoice")');
    if (i < 0) return false;
    const window = qr.slice(Math.max(0, i - 500), i);
    return window.includes("minHeight: 44") && window.includes('display: "flex"');
  })(),
);

// --- U1 regression guards (SW1/SW2) for the touched files ---
check(
  "SW1 reveal stays verdict-conditional",
  qr.includes('pickedCorrect ? "alert green" : "alert red"'),
);
check(
  "SW2 .opt.picked class rule untouched by M03",
  qr.includes('cls += " picked"') && css.includes(".opt.picked"),
);

// ==== W3 (mobile: shell + content routes) source-pattern pins ====
// Covers the W3-assigned audit items only (home, topbar, sidebar,
// review, library, flashcards, analysis, plan, StickyPlayer):
// M01, M02, M14, M15, M05, M32, M33, M34, M37, M28, M45, M46-part,
// M38, M39, M41, M42, M44, M10, M11, M13, M08, plus the scope-added
// theme-aware chart fills. M16 (TutorHealth summary retry) is NOT
// pinned: TutorHealth.tsx is outside W3's owned files and was left
// untouched. M13's NoteAudioExamples half is likewise not pinned:
// that component is outside W3's owned files.
const home = read("src/app/page.tsx");
const topbar = read("src/components/ShellTopbar.tsx");
const sidebar = read("src/components/Sidebar.tsx");
const review = read("src/app/review/page.tsx");
const library = read("src/app/library/page.tsx");
const flashcards = read("src/app/flashcards/page.tsx");
const analysis = read("src/app/analysis/page.tsx");
const charts = read("src/components/AnalysisCharts.tsx");
const plan = read("src/app/plan/page.tsx");
const player = read("src/components/StickyPlayer.tsx");
const appShell = read("src/components/AppShell.tsx");

// --- M01 (P1): both cardsDueNew spans are dir="auto", not dir="ltr" ---
check(
  "W3 M01 cardsDueNew spans dir=auto (2 sites)",
  count(home, /<span dir="auto">\s*\n?\s*\{tf\("cardsDueNew"/g) === 2,
  `found ${count(home, /<span dir="auto">\s*\n?\s*\{tf\("cardsDueNew"/g)}`,
);
check(
  "W3 M01 no dir=ltr cardsDueNew span remains",
  count(home, /<span dir="ltr">\s*\n?\s*\{tf\("cardsDueNew"/g) === 0,
);

// --- M02 (P1 @360): brand text hidden below 400px, icon kept ---
check(
  "W3 M02 brand text hidden below 400px",
  topbar.includes('tw:max-[400px]:hidden">ETEA Prep Library</span>'),
);
check("W3 M02 brand icon still rendered", topbar.includes("<BookOpen"));

// --- M14 (P2): correction-compact button in its own <p> ---
check(
  "W3 M14 compact correction button in own paragraph",
  home.includes('<p>\n            <button className="secondary" onClick={() => setCorrectionsExpanded(true)}>'),
);
check(
  "W3 M14 compact button no longer inline after the banner",
  !home.includes('<span dir="ltr">{PATTERN_BANNER}</span>{" "}\n          <button'),
);

// --- M15 (P2): Start Here actions in a flex row, not one <p> ---
check(
  "W3 M15 Start Here actions in a wrapping flex row",
  home.includes('<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>\n            {resumeAction'),
);
check(
  "W3 M15 Start Here actions no longer share one <p>",
  !home.includes("<p>\n            {resumeAction"),
);

// --- M05 (P1): review mock filters generated from VISIBLE_MOCKS ---
check(
  "W3 M05 review imports VISIBLE_MOCKS + resolveMockView",
  review.includes("VISIBLE_MOCKS") && review.includes("resolveMockView"),
);
check("W3 M05 static MOCK_FILTERS list is gone", !review.includes("const MOCK_FILTERS"));
check(
  "W3 M05 filters built from VISIBLE_MOCKS.map",
  review.includes("...VISIBLE_MOCKS.map((m) => ({"),
);
check(
  "W3 M05 combined pool first, all last",
  (() => {
    const block = review.slice(review.indexOf("const mockFilters = useMemo"));
    return (
      block.indexOf('value: "zam1+zam2"') < block.indexOf("VISIBLE_MOCKS.map") &&
      block.indexOf("VISIBLE_MOCKS.map") < block.indexOf('value: "all"')
    );
  })(),
);
check("W3 M05 default filter still zam1+zam2", review.includes('useState("zam1+zam2")'));
check(
  "W3 M05 old dedicated labels kept for the 7 pre-existing filters",
  ["mockFilterZam1", "mockFilterZam2", "mockFilterZam3", "mockFilterTTB", "mockFilterQariB", "mockFilterATB"].every(
    (k) => review.includes(`"${k}"`),
  ),
);
check(
  "W3 M05 new mocks fall back to their resolved mock title",
  review.includes("resolveMockView(m, lang).title"),
);

// --- M32 (P2): flashcard composition numbers isolated LTR ---
check(
  "W3 M32 fresh composition number in dir=ltr span",
  flashcards.includes('<span dir="ltr"><b>{composition.fresh}</b></span>'),
);
check(
  "W3 M32 due composition number in dir=ltr span",
  flashcards.includes('<span dir="ltr"><b>{composition.due}</b></span>'),
);
check(
  "W3 M32 no bare composition <b> remains",
  !flashcards.includes(': <b>{composition.fresh}</b>') &&
    !flashcards.includes('<b>{composition.due}</b> ·'),
);

// --- M33 (P2): flashcard faces align start, not center ---
check(
  "W3 M33 both flip faces text-align start",
  count(flashcards, /className="flip-face flip-(front|back)" style=\{\{ textAlign: "start" \}\}/g) === 2,
);
check(
  "W3 M33 reduced-motion card text-align start",
  flashcards.includes('className="card flashcard" style={{ textAlign: "start" }}'),
);

// --- M34 (P2): flip rotation mirrors in RTL ---
check(
  "W3 M34 flip rotates -180 in Urdu mode, +180 otherwise",
  flashcards.includes('rotateY: flipped ? (lang === "ur" ? -180 : 180) : 0'),
);
check("W3 M34 no direction-blind rotateY remains", !flashcards.includes("rotateY: flipped ? 180 : 0"));

// --- M37 (P2): flashcards none-due empty state has an action ---
check(
  "W3 M37 none-due state offers the cram action",
  flashcards.includes("startSession(category, true, state)") &&
    flashcards.includes('{t("cramLabel")}') &&
    flashcards.includes('{t("noCardsDue")}'),
);
check("W3 M37 cram action only when cram is off", flashcards.includes("{!cram && ("));

// --- M28 (P2): library no-match state has a clear-search action ---
check(
  "W3 M28 no-match state offers clear-search action",
  library.includes('{t("noNotesMatch")}') &&
    library.includes('setQuery("")') &&
    library.includes("setSubject(ALL_SUBJECTS)") &&
    library.includes('{t("searchAllSubjects")}'),
);

// --- M45 (P2): plan fraction + label in one dir=auto span ---
check(
  "W3 M45 plan fraction+label share one dir=auto span",
  plan.includes('<span dir="auto">\n            <span dir="ltr">\n              {doneCount}/{totalTasks}'),
);
check(
  "W3 M45 no bare LTR fraction + tasksDone adjacency remains",
  !plan.includes('</span>{" "}\n          {t("tasksDone")}'),
);

// --- M46-part (P2): plan checkbox rows are 44px hit areas ---
check("W3 M46 plan task label min-height 44px", plan.includes('minHeight: 44, padding: "6px 0"'));
check(
  "W3 M46 plan task label centers checkbox and text",
  plan.includes('alignItems: "center", minHeight: 44'),
);

// --- M38 (P2): chart data tables in .table-scroll regions ---
check(
  "W3 M38 both chart tables in table-scroll regions",
  count(charts, /className="table-scroll" role="region" aria-label=\{t\("chart(DueForecast|AccuracyTrend)"\)\} tabIndex=\{0\}/g) === 2,
);
check("W3 M38 chart tables carry the scroll hint", count(charts, /\{t\("tableScrollHint"\)\}/g) === 2);

// --- M39 (P2): due-forecast chart has an empty state ---
check(
  "W3 M39 forecast renders chartNoData when every bucket is 0",
  charts.includes("if (data.every((d) => d.due === 0))") &&
    charts.includes('<p className="muted">{t("chartNoData")}</p>'),
);

// --- M41 (P2): last-14 date span no longer fixed 96px ---
check("W3 M41 last-14 date span auto width, 56px floor", analysis.includes('style={{ width: "auto", minWidth: 56 }}'));
check("W3 M41 no fixed 96px date span remains", !analysis.includes("style={{ width: 96 }}"));

// --- M42 (P2): item-table question/answer columns bounded ---
check(
  "W3 M42 question + answer cells max-width 320 with wrapping",
  count(analysis, /maxWidth: 320, overflowWrap: "break-word"/g) === 3,
);

// --- M44 (P2): attempt-history rows keyboard-accessible + 44px ---
check(
  "W3 M44 both history rows are tabbable buttons",
  count(analysis, /tabIndex=\{0\}\n\s*role="button"/g) === 2,
);
check(
  "W3 M44 history rows open on Enter/Space",
  count(analysis, /if \(e\.key === "Enter" \|\| e\.key === " "\)/g) === 2,
);
check(
  "W3 M44 history rows 44px tall",
  count(analysis, /style=\{\{ cursor: "pointer", height: 44 \}\}/g) === 2,
);

// --- M10 (P2): chart <summary> targets are 44px ---
check(
  "W3 M10 both chart summaries min-height 44px",
  count(charts, /<summary style=\{\{ minHeight: 44, display: "flex", alignItems: "center" \}\}>/g) === 2,
);

// --- M11 (P2): brand links are 44px targets ---
check("W3 M11 topbar brand link min-h-11", topbar.includes("tw:flex tw:min-w-0 tw:min-h-11 tw:items-center"));
check("W3 M11 sidebar brand link min-h-11", sidebar.includes("tw:flex tw:min-w-0 tw:min-h-11 tw:flex-1 tw:items-center"));

// --- M13 (P2): sticky-player audio loading state ---
check("W3 M13 player distinguishes loading status", player.includes('const loading = status === "loading";'));
check(
  "W3 M13 toggle disabled while loading and shows loading string",
  player.includes("disabled={loading}") &&
    player.includes('{loading ? t("loading") : errored ? t("quranRetry")'),
);

// --- M08 (P2): sticky spacer safe-area calc ---
check(
  "W3 M08 spacer height includes safe-area inset",
  player.includes('style={{ height: "calc(72px + env(safe-area-inset-bottom))" }}'),
);
check(
  "W3 M08 no viewport-fit=cover added in W3 files",
  !appShell.includes("viewport-fit") && !/<meta[^>]*viewport-fit/.test(player),
);

// --- Chart fills (scope addition): theme-aware bars, no hardcoded amber ---
check(
  "W3 chart fills no hardcoded #F5A10B bar fill remains",
  !/<Bar[^>]*fill="#F5A10B"/.test(charts),
);
check(
  "W3 chart fills theme-aware in both charts (light #b45309 / dark #f5a10b)",
  count(charts, /const barFill = theme === "dark" \? "#f5a10b" : "#b45309";/g) === 2,
);
check(
  "W3 chart fills both bars use the theme-aware fill",
  count(charts, /fill=\{barFill\}/g) === 2,
);
check(
  "W3 chart fills questions bar opacity raised to 0.8 (was 0.35)",
  charts.includes("fillOpacity={0.8}") && !charts.includes("fillOpacity={0.35}"),
);

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
}
console.log("\nAll UIUX2 W2+W3 checks passed");
