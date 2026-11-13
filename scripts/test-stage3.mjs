// Stage 3 tests — foundation (Tailwind v4 coexistence, shadcn/ui setup,
// AppShell, dependency de-risking) + PART 2
// (motion, 3D flip, Recharts charts, Command Center, full shell
// migration, the two live-defect fixes).
// NOTE: §14 asserted pre-merge bundle isolation; after the 2026-11-13
// merge into the production folder it asserts the merged state instead
// (see VERIFY-stage3-merge.md). The pre-merge guard lives on in the
// stage3 record folder's copy of this test.
// Plain node, no dependencies. Source-markup + built-CSS assertions
// (no browser): interaction checks (sidebar at 360px, keyboard/Escape
// in a real browser, flip + chart rendering on device) are listed as
// post-deploy browser checks in VERIFY-stage3-part2.md.
// Run: node scripts/test-stage3.mjs  (exit 0 = all pass)
// Requires a prior `npm run build` for the built-CSS assertions.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

let failures = 0;
let skips = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
function skip(name, detail = "") {
  skips += 1;
  console.log(`SKIP  ${name}${detail ? ` — ${detail}` : ""}`);
}

// ---- 1. Files exist ----
for (const f of [
  "components.json",
  "postcss.config.mjs",
  "src/lib/utils.ts",
  "src/components/ui/button.tsx",
  "src/components/ui/card.tsx",
  "src/components/ui/badge.tsx",
  "src/components/ui/input.tsx",
  "src/components/ui/skeleton.tsx",
  "src/components/AppShell.tsx",
  "src/components/Sidebar.tsx",
  "src/components/ShellTopbar.tsx",
]) {
  check(`file exists: ${f}`, exists(f));
}

// ---- 2. Dependencies (record versions) ----
const pkg = JSON.parse(read("package.json"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
for (const [name, wantMajor] of [
  ["tailwindcss", 4],
  ["@tailwindcss/postcss", 4],
  ["class-variance-authority", 0],
  ["clsx", 2],
  ["tailwind-merge", 3],
  ["lucide-react", 1],
  ["motion", 14],
  ["recharts", 3],
]) {
  const v = deps[name];
  const major = v ? parseInt(v.replace(/^[^\d]*/, ""), 10) : NaN;
  check(`dep ${name} present (v${v || "MISSING"})`, !!v && major === wantMajor, `want major ${wantMajor}, got ${v}`);
}
check("tailwindcss is a devDependency", !!pkg.devDependencies?.tailwindcss);
check("@tailwindcss/postcss is a devDependency", !!pkg.devDependencies?.["@tailwindcss/postcss"]);
check("test:stage3 script present", pkg.scripts?.["test:stage3"] === "node scripts/test-stage3.mjs");

// ---- 3. shadcn config + PostCSS ----
const shadcn = JSON.parse(read("components.json"));
check("components.json prefix is tw", shadcn.tailwind?.prefix === "tw");
check("components.json css path", shadcn.tailwind?.css === "src/app/globals.css");
check("components.json cssVariables", shadcn.tailwind?.cssVariables === true);
check("components.json iconLibrary lucide", shadcn.iconLibrary === "lucide");
check("components.json ui alias", shadcn.aliases?.ui === "@/components/ui");
check("components.json utils alias", shadcn.aliases?.utils === "@/lib/utils");
check("postcss uses @tailwindcss/postcss", read("postcss.config.mjs").includes("@tailwindcss/postcss"));

// ---- 4. cn() helper ----
const utils = read("src/lib/utils.ts");
check("cn uses clsx + twMerge", utils.includes("clsx") && utils.includes("twMerge"));
check("cn imports only twMerge from tailwind-merge", utils.includes('import { twMerge } from "tailwind-merge"'));

// ---- 5. globals.css: Tailwind coexistence ----
const css = read("src/app/globals.css");
check("css imports theme.css without preflight", css.includes('@import "tailwindcss/theme.css"'));
check("css imports utilities.css", css.includes('@import "tailwindcss/utilities.css"'));
check("css has NO bare tailwind import", !css.includes('@import "tailwindcss";'));
check("css has NO preflight import", !css.includes("tailwindcss/preflight"));
check("css imports carry prefix(tw)", css.includes("prefix(tw)"));
check("css declares layer order theme,base,components,utilities", css.includes("@layer theme, base, components, utilities;"));
check("css wraps legacy rules in @layer base", css.includes("@layer base {"));
for (const token of ["#09555e", "#fdfbf1", "#f5a10b", "#1b272b"]) {
  check(`@theme brand token ${token}`, css.toLowerCase().includes(token));
}
check("@theme font-sans references next/font variable", css.includes("--font-sans: var(--font-sans-arabic)"));
check("@custom-variant dark uses data-theme", css.includes('@custom-variant dark (&:where([data-theme="dark"]'));
check("@theme inline maps background to legacy --paper", css.includes("--color-background: var(--paper);"));
check("@theme inline maps muted-foreground to legacy --muted", css.includes("--color-muted-foreground: var(--muted);"));
check("shadcn vars: --muted-surface defined", css.includes("--muted-surface:"));
check("shadcn vars: --ring defined", css.includes("--ring:"));
check("shadcn vars: --chart-1 defined", css.includes("--chart-1:"));
check("legacy --muted NOT redefined as a surface", !css.includes("--muted: #efece2") && !css.includes("--muted: #223236"));
for (const rule of [".topbar", ".card", ".badge", ".flashcard", ".nav-toggle"]) {
  check(`legacy rule survives: ${rule}`, css.includes(rule));
}
check("legacy .container max-width 1020px", css.includes("max-width: 1020px"));
check("shell flip helper present", css.includes('[dir="rtl"] .shell-flip-rtl'));
check("skip-link helper present", css.includes(".shell-skip-link"));

// ---- 6. Zero cancelled-font references in src/ ----
const FORBIDDEN = /nastaliq/i;
let forbiddenHits = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(e.name)) {
      if (FORBIDDEN.test(fs.readFileSync(p, "utf8"))) forbiddenHits.push(path.relative(ROOT, p));
    }
  }
})(path.join(ROOT, "src"));
check("zero cancelled-font references in src/", forbiddenHits.length === 0, forbiddenHits.join(", "));

// ---- 7. Shell i18n keys (en + ur, exact STRINGS format) ----
const i18n = read("src/lib/i18n.tsx");
for (const key of [
  "sidebarCollapse",
  "sidebarExpand",
  "sidebarNavFilter",
  "sidebarNavFilterLabel",
  "closeMenu",
  "skipToContent",
  "reviewNow",
  "noNavResults",
]) {
  const line = i18n.split("\n").find((l) => l.startsWith(`  ${key}: {`));
  check(`i18n key ${key} with ur`, !!line && line.includes('ur: "'));
}

// ---- 8. Sidebar ----
const sidebar = read("src/components/Sidebar.tsx");
for (const href of [
  "/",
  "/library",
  "/practice",
  "/mock",
  "/flashcards",
  "/tutor",
  "/plan",
  "/analysis",
  "/tracks",
  "/topics",
  "/vacancies",
  "/links",
  "/issues",
  "/review",
]) {
  check(`sidebar link ${href}`, sidebar.includes(`href: "${href}"`));
}
check("sidebar imports lucide icons", sidebar.includes('from "lucide-react"'));
check("sidebar uses Button", sidebar.includes("./ui/button"));
check("sidebar uses Card", sidebar.includes("./ui/card"));
check("sidebar uses Badge", sidebar.includes("./ui/badge"));
check("sidebar uses Input", sidebar.includes("./ui/input"));
check("sidebar uses Skeleton", sidebar.includes("./ui/skeleton"));
check("sidebar uses countDueFlashcards + FLASHCARDS", sidebar.includes("countDueFlashcards") && sidebar.includes("FLASHCARDS"));
check("sidebar has aria-expanded + aria-controls", sidebar.includes("aria-expanded") && sidebar.includes("aria-controls"));
check("sidebar has aria-current for active link", sidebar.includes('aria-current={active ? "page" : undefined}'));
check("sidebar Escape handler", sidebar.includes('"Escape"') && sidebar.includes('addEventListener("keydown"'));
check("sidebar returns focus to hamburger on Escape", sidebar.includes("returnFocusRef.current?.focus()"));
check("sidebar uses logical start-0", sidebar.includes("tw:start-0"));
check("sidebar uses logical border-e", sidebar.includes("tw:border-e"));
check("sidebar RTL off-canvas direction by lang", sidebar.includes('lang === "ur" ? "tw:translate-x-full" : "tw:-translate-x-full"'));
check("sidebar collapse chevron flips in RTL", sidebar.includes("shell-flip-rtl"));

// ---- 9. AppShell (part 2: shell on EVERY page) ----
// Foundation asserted a pathname switch (shell on home, legacy Nav
// elsewhere); part 2 migrates all pages, so those checks are replaced
// by the migration checks below. Nav.tsx is retired but kept in the
// tree (see AppShell.tsx header).
const shell = read("src/components/AppShell.tsx");
check("AppShell has no pathname switch", !shell.includes('pathname === "/"') && !shell.includes("<Nav />") && !shell.includes('<main className="container">'));
check("AppShell renders Footer", shell.includes("<Footer />"));
check("AppShell renders Sidebar + ShellTopbar", shell.includes("<Sidebar") && shell.includes("<ShellTopbar"));
check("AppShell skip link to #shell-main", shell.includes('href="#shell-main"') && shell.includes('id="shell-main"'));
check("AppShell persists collapse preference", shell.includes("etea_sidebar_collapsed"));

// ---- 10. ShellTopbar ----
const topbar = read("src/components/ShellTopbar.tsx");
check("topbar language select calls setLang", topbar.includes("setLang"));
check("topbar theme toggle calls setTheme", topbar.includes("setTheme"));
check("topbar hamburger controls app-sidebar", topbar.includes('aria-controls="app-sidebar"'));
check("topbar uses logical ms-auto", topbar.includes("tw:ms-auto"));

// ---- 11. layout.tsx composition ----
const layout = read("src/app/layout.tsx");
check("layout renders AppShell", layout.includes("<AppShell>") && layout.includes("AppShell"));
check("layout keeps TelemetryListener", layout.includes("<TelemetryListener />"));
check("layout keeps Noto Sans Arabic font", layout.includes("Noto_Sans_Arabic") && layout.includes("sansArabic.variable"));

// ---- 12. Part 2 — motion + charts are SHIPPED (not de-risk only) ----
// (Foundation §12 asserted NO shipped motion/recharts imports; part 2
// ships them, so that check is replaced by these wiring checks.)
const shipped = { motion: [], recharts: [] };
(function walkSrc(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkSrc(p);
    else if (/\.tsx?$/.test(e.name)) {
      const src = fs.readFileSync(p, "utf8");
      if (/from ["']motion\/react["']/.test(src)) shipped.motion.push(path.relative(ROOT, p));
      if (/from ["']recharts["']/.test(src)) shipped.recharts.push(path.relative(ROOT, p));
    }
  }
})(path.join(ROOT, "src"));
check("motion/react is imported by the motion helpers + flashcards page", shipped.motion.includes("src/components/motion.tsx") && shipped.motion.includes("src/app/flashcards/page.tsx"), shipped.motion.join(", "));
check("recharts is imported ONLY by the charts component", shipped.recharts.length === 1 && shipped.recharts[0] === "src/components/AnalysisCharts.tsx", shipped.recharts.join(", "));
check("no scratch route left behind", !exists("src/app/__scratch"));

// ---- 12a. Motion helpers (reduced-motion rule in one place) ----
const motionSrc = read("src/components/motion.tsx");
check("motion helpers exist", exists("src/components/motion.tsx"));
check("motion helpers gate on useReducedMotion", motionSrc.includes("useReducedMotion"));
check("motion helpers render a plain div when reduced motion is preferred", motionSrc.includes("if (reduce) return <div") || motionSrc.includes("if (reduce) return <>"));
check("PageFade is an entrance-only fade (no AnimatePresence exit)", motionSrc.includes("PageFade") && !motionSrc.includes("<AnimatePresence"));
check("AppShell wraps pages in PageFade keyed by pathname", read("src/components/AppShell.tsx").includes("<PageFade key={pathname}>"));

// ---- 12b. 3D flashcard flip ----
const flashSrc = read("src/app/flashcards/page.tsx");
const flipCss = read("src/app/globals.css");
check("flashcards page rotates the card on the Y axis", flashSrc.includes("rotateY: flipped ? 180 : 0"));
check("flip keeps native button semantics + reports pressed state", flashSrc.includes("motion.button") && flashSrc.includes("aria-pressed={flipped}"));
check("flip hides the non-visible face from screen readers", flashSrc.includes("aria-hidden={flipped}") && flashSrc.includes("aria-hidden={!flipped}"));
check("flip is skipped when reduced motion is preferred", flashSrc.includes("useReducedMotion") && flashSrc.includes("reduceMotion ?"));
check("flip CSS: perspective + preserve-3d + backface hidden", flipCss.includes(".flip-scene { perspective: 1200px; }") && flipCss.includes("transform-style: preserve-3d") && flipCss.includes("backface-visibility: hidden"));
check("flip back face is pre-rotated 180deg", flipCss.includes(".flip-back { transform: rotateY(180deg); }"));

// ---- 12c. Recharts charts (real data only) ----
const chartsSrc = read("src/components/AnalysisCharts.tsx");
check("charts component exists", exists("src/components/AnalysisCharts.tsx"));
check("due-forecast chart uses forecastDue (stored FSRS state)", chartsSrc.includes("forecastDue("));
check("accuracy chart uses the daily MCQ stats", chartsSrc.includes("daily") && chartsSrc.includes("accuracy"));
check("charts render a BarChart + a ComposedChart in ResponsiveContainer", chartsSrc.includes("<BarChart") && chartsSrc.includes("<ComposedChart") && chartsSrc.includes("<ResponsiveContainer"));
check("charts have an honest empty state", chartsSrc.includes("chartNoData"));
check("chart wrappers are dir=ltr (Recharts must not mirror in RTL)", chartsSrc.includes('dir="ltr"'));
check("chart tooltip uses theme variables (inline style)", chartsSrc.includes("var(--card)") && chartsSrc.includes("var(--line)"));
const analysisSrc = read("src/app/analysis/page.tsx");
check("analysis page renders both charts", analysisSrc.includes("<DueForecastChart") && analysisSrc.includes("<AccuracyTrendChart"));
check("analysis page loads stored flash state for the forecast (read-only)", analysisSrc.includes("loadFlashState()"));

// ---- 12d. Command Center (home) ----
const homeSrc = read("src/app/page.tsx");
check("home stats use shadcn Cards with staggered entrance", homeSrc.includes("FadeIn") && homeSrc.includes("<Card"));
check("home quick actions use lucide icons in Cards", homeSrc.includes("q.Icon") && homeSrc.includes("tw:text-brand-teal"));
check("home plan card has a progress bar (planDone / 63)", homeSrc.includes("planDone / 63") && homeSrc.includes("tw:bg-primary"));
check("home counts still come from COUNTS via homeIntro", homeSrc.includes('tf("homeIntro"') && homeSrc.includes("COUNTS.total") && homeSrc.includes("COUNTS.notes") && homeSrc.includes("COUNTS.cards"));

// ---- 13. Built CSS (requires npm run build) ----
const cssDir = path.join(ROOT, ".next/static/chunks");
const builtCss = exists(".next/static/chunks")
  ? fs.readdirSync(cssDir).filter((f) => f.endsWith(".css")).map((f) => path.join(cssDir, f))
  : [];
if (builtCss.length === 0) {
  skip("built-CSS assertions", "no .next build output — run npm run build first");
} else {
  const built = builtCss.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  check("built CSS contains prefixed utility .tw:flex", built.includes(".tw\\:flex"));
  check("built CSS contains brand token --tw-color-brand-teal", built.includes("--tw-color-brand-teal:#09555e"));
  check("built CSS contains font variable --font-sans-arabic", built.includes("--font-sans-arabic"));
  check("built CSS contains legacy .container rule", built.includes("max-width:1020px"));
  check("built CSS has NO preflight heading reset", !built.includes("font-size:inherit;font-weight:inherit"));
  check("built CSS has NO preflight universal border reset", !built.includes("border:0 solid"));
  check("built CSS contains logical utility .tw:start-0", built.includes(".tw\\:start-0"));
  check("built CSS contains flip perspective + backface rules", built.includes("perspective:1200px") && built.includes("backface-visibility:hidden"));
}

// ---- 14. MERGED STATE: Stage 3 is part of THIS tree (post-merge) ----
// Pre-merge, this section asserted Stage 3 files were ABSENT from the
// production folder (../etea-prep-next). After the owner-approved merge
// (2026-11-13), this folder IS the production tree, so the same 12
// checks assert the markers are PRESENT here instead. The pre-merge
// isolation guard lives on in the stage3 record folder's copy.
for (const f of [
  "components.json",
  "postcss.config.mjs",
  "src/lib/utils.ts",
  "src/components/ui",
  "src/components/AppShell.tsx",
  "src/components/Sidebar.tsx",
  "src/components/ShellTopbar.tsx",
  "src/components/motion.tsx",
  "src/components/AnalysisCharts.tsx",
  "scripts/test-stage3.mjs",
]) {
  check(`merged: ${f} present in this tree`, fs.existsSync(path.join(ROOT, f)));
}
const mergedPkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const mergedDeps = { ...mergedPkg.dependencies, ...mergedPkg.devDependencies };
check("merged: package.json has tailwindcss", !!mergedDeps.tailwindcss);
check("merged: package.json has motion + recharts", !!mergedDeps.motion && !!mergedDeps.recharts);

// ---- 15. LIVE DEFECT FIXES (Stage 2 live verification, 2026-11-13) ----
// (a) Home "Plan tasks done" showed "63 / 0" in Urdu mode: the fraction
// was the ONLY un-isolated one on the page. (b) /review countsLine
// rendered the structural-needs count blank: template {sneeds} vs
// caller `sNeeds`. Both are also covered by test-i18n §7; these are
// the source-level anchors.
check(
  "defect (a): home plan fraction is isolated LTR (no bare {planDone} / 63)",
  homeSrc.includes('<span dir="ltr">') && /\{\s*planDone\s*\}\s*\/\s*63/.test(homeSrc) && !/<b[^>]*>\s*\{planDone\}/.test(homeSrc),
);
const reviewSrc = read("src/app/review/page.tsx");
check("defect (b): review passes `sneeds` (template name, lowercase)", reviewSrc.includes("sneeds: counts.structuralNeeds"));
check("defect (b): no camelCase `sNeeds:` var key remains anywhere in src", !(() => {
  let found = false;
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && fs.readFileSync(p, "utf8").includes("sNeeds:")) found = true;
    }
  })(path.join(ROOT, "src"));
  return found;
})());

// ---- 16. FULL SHELL MIGRATION (pathname switch removed) ----
const shellSrc = read("src/components/AppShell.tsx");
check("AppShell does NOT import the retired legacy Nav", !shellSrc.includes('from "./Nav"'));
check("AppShell keeps the persisted collapse preference", shellSrc.includes("etea_sidebar_collapsed"));

// ---- 17. DARK MODE + TYPOGRAPHY (polish) ----
const cssSrc = read("src/app/globals.css");
check("dark theme defines --muted-surface (not --muted as a surface)", cssSrc.includes("--muted-surface: #223236") && cssSrc.includes("--muted-surface: #efece2"));
check(
  "legacy --muted keeps its TEXT colours; the surface mapping uses --muted-surface",
  cssSrc.includes("--muted: #5a6b70") && cssSrc.includes("--muted: #9fb3b5") && cssSrc.includes("--color-muted: var(--muted-surface)"),
);
check("charts use theme-safe series colours (readable on both themes)", chartsSrc.includes('"#F5A10B"') && chartsSrc.includes('"#14b8a6"'));
check("new part-2 i18n keys exist with ur", ["planProgressLabel", "chartDueForecast", "chartAccuracyTrend", "chartNoData", "chartDueWord", "chartAccuracyWord", "chartQuestionsWord"].every((k) => {
  const i18n = read("src/lib/i18n.tsx");
  return i18n.includes(`${k}: {`) && i18n.includes("ur:");
}));
check("zero cancelled-font refs in src (re-asserted)", !/nastaliq/i.test(
  (() => {
    let out = "";
    (function walk(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name) || /\.css$/.test(e.name)) out += fs.readFileSync(p, "utf8");
      }
    })(path.join(ROOT, "src"));
    return out;
  })(),
));

console.log(`\n${failures === 0 ? "ALL STAGE 3 CHECKS PASSED" : `${failures} CHECK(S) FAILED`}${skips ? ` (${skips} skipped)` : ""}`);
process.exit(failures ? 1 : 0);
