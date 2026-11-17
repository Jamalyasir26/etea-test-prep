// UI/UX safe-wins tests (U1 program) — plain node, no dependencies.
// Source-pattern checks for the 12 approved safe wins (SW1–SW12) plus
// the conditional SW13, from ~/workspace/u1-idiomatic-urdu/UI-AUDIT.md
// §11. Each item has at least one assertion; negative assertions pin
// the OLD pattern as gone, so the suite fails on pre-change code.
// Presentation/attribute/ARIA-only changes: no behaviour, wording,
// data-flow, or brand change is asserted (or permitted) here.
// Run: node scripts/test-uiux.mjs  (exit 0 = all pass)
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

// True when `needle` is wrapped by the given dir within the preceding
// `windowChars` characters (covers both single-line and multi-line
// wrapper spans), and no other dir attribute intervenes.
function wrappedBy(src, needle, dir, windowChars = 60) {
  const i = src.indexOf(needle);
  if (i < 0) return false;
  const window = src.slice(Math.max(0, i - windowChars), i);
  const dirs = [...window.matchAll(/dir="(ltr|auto|rtl)"/g)].map((m) => m[1]);
  return dirs.length > 0 && dirs[dirs.length - 1] === dir;
}

const css = read("src/app/globals.css");
const qr = read("src/components/QuizRunner.tsx");
const sidebar = read("src/components/Sidebar.tsx");
const topbar = read("src/components/ShellTopbar.tsx");
const pwa = read("src/components/PwaInstall.tsx");
const badge = read("src/components/ui/badge.tsx");
const charts = read("src/components/AnalysisCharts.tsx");
const player = read("src/components/StickyPlayer.tsx");
const home = read("src/app/page.tsx");
const analysis = read("src/app/analysis/page.tsx");
const library = read("src/app/library/page.tsx");
const issues = read("src/app/issues/page.tsx");
const practice = read("src/app/practice/page.tsx");
const mockRun = read("src/app/mock/[id]/page.tsx");
const flashcards = read("src/app/flashcards/page.tsx");
const topics = read("src/app/topics/page.tsx");
const review = read("src/app/review/page.tsx");

// ---- SW1: reveal box conditional green/red by pickedCorrect ----
check(
  "SW1: reveal box is green only when pickedCorrect",
  qr.includes('<div className={pickedCorrect ? "alert green" : "alert red"}>'),
);
check("SW1: no unconditional alert-green reveal box remains", !qr.includes('<div className="alert green">'));
check("SW1: pickedCorrect is still computed from picked vs correctIndex", qr.includes("const pickedCorrect = picked !== null && picked === q.correctIndex;"));

// ---- SW2: .opt.picked CSS rule (teal 2px + dark override) ----
check("SW2: .opt.picked rule is a teal 2px border", css.includes(".opt.picked { border-color: var(--teal); border-width: 2px; }"));
check("SW2: .opt.picked dark override uses #7fd4d8", css.includes('[data-theme="dark"] .opt.picked { border-color: #7fd4d8; }'));
check("SW2: picked-correct/wrong rules untouched", css.includes(".opt.picked-correct { border-color: var(--green);") && css.includes(".opt.picked-wrong { border-color: var(--red);"));

// ---- SW3: sentence wrappers dir="ltr" -> dir="auto" (9 cited spans) ----
const sentenceSites = [
  ["quiz prestartReviewed", qr, 'tf("prestartReviewed"'],
  ["quiz prestartProvisional", qr, 'tf("prestartProvisional"'],
  ["quiz firstPassAccuracyLine", qr, 'tf("firstPassAccuracyLine"'],
  ["quiz provisionalContentLine", qr, 'tf("provisionalContentLine"'],
  ["quiz yourAnswerLine", qr, 'tf("yourAnswerLine"'],
  ["quiz correctAnswerLine", qr, 'tf("correctAnswerLine"'],
  ["analysis filteredNote", analysis, 'tf("filteredNote"'],
  ["library libraryMatchCountQuery", library, 'tf("libraryMatchCountQuery"'],
  ["library libraryMatchCount", library, 'tf("libraryMatchCount", {'],
];
for (const [label, src, needle] of sentenceSites) {
  check(`SW3: ${label} wrapper is dir="auto"`, wrappedBy(src, needle, "auto"));
}
check("SW3: lri() isolation kept on interpolated answers", qr.includes("answer: lri(q.options[picked])") && qr.includes("answer: lri(q.options[q.correctIndex])") && library.includes("q: lri(query.trim())"));
// §10 guards: numeric-label isolation is deliberate and untouched.
check("SW3 guard: prestartQuestions (numeric label) stays dir=ltr", wrappedBy(qr, 'tf("prestartQuestions"', "ltr"));
check("SW3 guard: policy note stays dir=ltr", qr.includes('<span dir="ltr">{scoring.policyNote}</span>'));
check("SW3 guard: quiz timer stays dir=ltr", qr.includes('<span dir="ltr">{mm}:{ss}</span>'));

// ---- SW4: .alert borders are logical (border-inline-start) ----
check("SW4: .alert uses border-inline-start", css.includes("border-inline-start: 6px solid var(--amber);"));
check("SW4: .alert.red/.green use border-inline-start-color", css.includes("border-inline-start-color: var(--red);") && css.includes("border-inline-start-color: var(--green);"));
check("SW4: no physical border-left remains in globals.css", !css.includes("border-left"));

// ---- SW5: sidebar group headings lose tracking-wide + uppercase ----
check("SW5: group heading has no tracking-wide/uppercase", sidebar.includes('className="tw:m-0 tw:px-3 tw:pb-1 tw:text-xs tw:font-semibold tw:text-muted-foreground"'));
check("SW5: no tracking-wide or uppercase left in Sidebar", !sidebar.includes("tracking-wide") && !sidebar.includes("uppercase"));

// ---- SW6: dark-mode teal contrast fixes ----
check("SW6: dark .bar fill is #7fd4d8", css.includes('[data-theme="dark"] .bar > i { background: #7fd4d8; }'));
check("SW6: light .bar fill still uses --teal", css.includes(".bar > i { display: block; height: 100%; background: var(--teal); }"));
check("SW6: home progress fill gains a dark override", home.includes('tw:bg-primary tw:dark:bg-[#7fd4d8]'));
check(
  "SW6: all 3 brand icons gain the dark override",
  count(home, /tw:dark:text-\[#7fd4d8\]/g) + count(sidebar, /tw:dark:text-\[#7fd4d8\]/g) + count(topbar, /tw:dark:text-\[#7fd4d8\]/g) === 3,
);
check("SW6: light brand-teal icon colour kept", home.includes("tw:text-brand-teal") && sidebar.includes("tw:text-brand-teal") && topbar.includes("tw:text-brand-teal"));
check("SW6: --teal token itself is NOT redefined in dark mode", !/\[data-theme="dark"\]\s*\{[^}]*--teal:/.test(css));

// ---- SW7: chart ticks/line theme-aware ----
check("SW7: tick fill branches dark #94a3b8 / light #5a6b70", charts.includes('theme === "dark" ? "#94a3b8" : "#5a6b70"') && count(charts, /theme === "dark" \? "#94a3b8" : "#5a6b70"/g) === 2);
check("SW7: accuracy line branches dark #14b8a6 / light #0f766e", charts.includes('const lineStroke = theme === "dark" ? "#14b8a6" : "#0f766e";'));
check("SW7: both chart components read theme from useLang", count(charts, /const \{ t, theme \} = useLang\(\);/g) === 2);
check("SW7: axes use the theme-aware tick, line uses lineStroke", count(charts, /tick=\{tick\}/g) === 5 && charts.includes("stroke={lineStroke}"));
check("SW7: hardcoded AXIS_TICK constant is gone", !charts.includes("AXIS_TICK"));
check("SW7: no hardcoded accuracy stroke remains", !charts.includes('stroke="#14b8a6"'));
check("SW7: grid + chart wrappers untouched", charts.includes('const GRID = { stroke: "#94a3b8", strokeOpacity: 0.25, vertical: false }') && count(charts, /<div dir="ltr" className="tw:h-64/g) === 2 && charts.includes('<td dir="ltr">{d.date.slice(5)}</td>') && charts.includes('<td dir="ltr">{p.date}</td>') && charts.includes('<span dir="ltr">{p.accuracy}%</span>'));

// ---- SW8: tap targets to 44px ----
check("SW8: language select is h-11", topbar.includes("tw:h-11 tw:rounded-md"));
check("SW8: no h-9 select remains in the topbar", !topbar.includes("tw:h-9"));
check("SW8: hamburger + theme toggle are both size-11", count(topbar, /tw:size-11/g) === 2);
check("SW8: theme toggle keeps size=icon (override is class-only)", topbar.includes('size="icon"'));
check("SW8: Review-now link gains min-h-11", sidebar.includes('cn(buttonVariants({ size: "sm" }), "tw:w-full tw:min-h-11")'));
check("SW8: collapse toggle gains min-h-11", sidebar.includes('cn("tw:w-full tw:min-h-11", collapsed ? "tw:justify-center" : "tw:justify-start")'));
check("SW8: PWA dismiss is size-11", pwa.includes('className="tw:size-11 tw:shrink-0"') && !pwa.includes("tw:size-8"));
check("SW8: PWA install button gains min-h-11", pwa.includes('<Button size="sm" className="tw:w-full tw:min-h-11"'));

// ---- SW9: 36px inline overrides removed ----
check("SW9: no minHeight: 36 override in analysis or issues pages", !analysis.includes("minHeight: 36") && !issues.includes("minHeight: 36"));
check("SW9: analysis Close + issues Delete keep class + handler", analysis.includes('<button className="secondary" onClick={() => setSelected(null)}>') && issues.includes('className="secondary"'));
check("SW9 guard: dead Nav.tsx copy untouched (no deletion route)", read("src/components/Nav.tsx").includes("minHeight: 36"));

// ---- SW10: issue-form errors use .alert.red, keep role="alert" ----
for (const key of ["issueValidationError", "issueSaveFailed"]) {
  const i = qr.indexOf(`t("${key}")`);
  const window = qr.slice(Math.max(0, i - 120), i);
  check(`SW10: ${key} renders inside an .alert.red role=alert div`, window.includes('<div className="alert red" role="alert">'));
}
check("SW10: no muted role=alert paragraph remains in QuizRunner", !qr.includes('<p role="alert" className="muted">'));

// ---- SW11: role="status" on loading paragraphs (+ analysis feedback) ----
check("SW11: practice has both loading paragraphs as status", count(practice, /role="status">\{t\("loading"\)\}<\/p>/g) === 2);
for (const [label, src] of [
  ["mock runner", mockRun],
  ["flashcards", flashcards],
  ["topics", topics],
  ["review", review],
  ["analysis", analysis],
]) {
  check(`SW11: ${label} loading paragraph has role=status`, count(src, /role="status">\{t\("loading"\)\}<\/p>/g) === 1);
}
check("SW11: no bare loading paragraph remains on those pages", [practice, mockRun, flashcards, topics, review, analysis].every((s) => !s.includes('<p className="muted">{t("loading")}</p>') && !s.includes("<p>{t(\"loading\")}</p>")));
check("SW11: analysis export/import feedback line has role=status", analysis.includes('<p dir="auto" className="muted" role="status">'));

// ---- SW12: overflow/truncation hardening bundle ----
check("SW12: sidebar nav labels expose the full label via title", sidebar.includes('<span className="tw:truncate" title={t(key)}>{t(key)}</span>'));
check("SW12: sidebar brand name + tagline expose full text via title", sidebar.includes('title="ETEA Prep Library"') && sidebar.includes('title={t("brandTagline")}'));
check("SW12: player label exposes the full label via title", player.includes('<p className="quran-player-label" dir="auto" title={labelTitle}>'));
check(
  "SW12: player title reuses the rendered pieces (no new strings)",
  player.includes("const labelTitle = errored") && player.includes('t("quranAudioUnavailable")') && player.includes('tf("quranAyahRef"') && player.includes("Mishary Alafasy"),
);
check("SW12: topbar brand link can shrink + brand text truncates", topbar.includes("tw:flex tw:min-w-0 tw:items-center") && topbar.includes('<span dir="ltr" className="tw:min-w-0 tw:truncate">ETEA Prep Library</span>'));
check("SW12: IssueForm button row wraps", !qr.includes('style={{ display: "flex", gap: 8 }}') && count(qr, /display: "flex", gap: 8, flexWrap: "wrap"/g) === 4);
check("SW12: shadcn Badge drops nowrap + overflow-hidden", !badge.includes("tw:whitespace-nowrap") && !badge.includes("tw:overflow-hidden"));
check("SW12: Badge keeps its other base utilities", badge.includes("tw:inline-flex") && badge.includes("tw:shrink-0") && badge.includes("tw:rounded-full"));

// ---- SW13 (conditional, implemented): home next-task resolves via the plan resolver ----
check("SW13: home imports resolvePlanTaskText from @/lib/plan", home.includes("resolvePlanTaskText } from \"@/lib/plan\""));
check("SW13: home reads lang from useLang", home.includes("const { t, tf, lang } = useLang();"));
check("SW13: next task resolves through the plan resolver", home.includes("nextTask = resolvePlanTaskText(tasks[ti], lang).text;"));
check("SW13: no raw English tuple read remains for nextTask", !home.includes("nextTask = tasks[ti][1];"));
check("SW13: task id still hashes the English fields", home.includes("planTaskId(PLAN21[di][0], tasks[ti][0], tasks[ti][1])"));
check("SW13: both next-task render sites keep dir=auto", count(home, /<span dir="auto">\{nextTask\}<\/span>/g) === 2);

console.log(failures === 0 ? `\nAll UI/UX safe-wins tests passed.` : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
