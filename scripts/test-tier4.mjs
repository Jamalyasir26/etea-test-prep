// Stage 1 P1 Tier 4 tests — B01–B05 UI/accessibility fixes.
// Plain node, no dependencies. Source-markup + CSS assertions (no
// browser): what needs a real render (360px layout, keyboard focus) is
// verified by inspection and listed as a post-deploy browser check in
// VERIFY-p1-tier4.md.
// Run: node scripts/test-tier4.mjs  (exit 0 = all pass)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const css = read("src/app/globals.css");
const nav = read("src/components/Nav.tsx");
const tutor = read("src/app/tutor/page.tsx");
const vacancies = read("src/app/vacancies/page.tsx");
const mockList = read("src/app/mock/page.tsx");
const mockRun = read("src/app/mock/[id]/page.tsx");
const quizRunner = read("src/components/QuizRunner.tsx");
const plan = read("src/app/plan/page.tsx");
const flashcards = read("src/app/flashcards/page.tsx");
const analysis = read("src/app/analysis/page.tsx");
const review = read("src/app/review/page.tsx");

// ---------------------------------------------------------------- B01
check("B01: tutor ask-row input has minWidth 0", /aria-label="Ask the tutor"[\s\S]{0,500}minWidth: 0/.test(tutor));
check("B01: tutor explain-row input has flex:1 + minWidth 0", /aria-label="Question ID"[\s\S]{0,500}flex: 1, minWidth: 0/.test(tutor));
check("B01: .msg wraps long URLs", /\.msg \{[\s\S]*?overflow-wrap: break-word/.test(css));
check("B01: .card wraps long unbroken strings", /\.card \{[\s\S]*?overflow-wrap: break-word/.test(css));
check("B01: .table-scroll is a horizontal-scroll region", /\.table-scroll \{[^}]*overflow-x: auto/.test(css));
check(
  "B01: vacancy table is wrapped in the scroll region",
  vacancies.includes('<div className="table-scroll"') &&
    vacancies.includes('role="region"') &&
    vacancies.includes('aria-label="Vacancy table"') &&
    vacancies.includes("tabIndex={0}") &&
    vacancies.includes("<table>"),
);
check("B01: mock mode buttons row wraps", /role="group" aria-label="Mock mode"/.test(mockList) && /display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16/.test(mockList));

// No fixed width above 360px anywhere (widths that would force
// horizontal overflow on a 360px phone). max-width is exempt: it only
// caps, never forces. Percentages and the 220px grid floor are fine.
{
  const badCss = [...css.matchAll(/(?<!max-)width:\s*(\d+)px|min-width:\s*(\d+)px/g)]
    .map((m) => Number(m[1] ?? m[2]))
    .filter((n) => n > 360);
  check("B01: no CSS width/min-width above 360px", badCss.length === 0, badCss.join(","));
  const tsxFiles = ["src/app/tutor/page.tsx", "src/app/analysis/page.tsx", "src/app/plan/page.tsx", "src/app/review/page.tsx", "src/app/flashcards/page.tsx", "src/app/mock/page.tsx", "src/components/QuizRunner.tsx", "src/components/Nav.tsx"];
  const badInline = [];
  for (const f of tsxFiles) {
    for (const m of read(f).matchAll(/(?:^|[^a-zA-Z])width:\s*(\d+)|minWidth:\s*(\d+)/g)) {
      const n = Number(m[1] ?? m[2]);
      if (n > 328) badInline.push(`${f}:${n}`);
    }
  }
  check("B01: no inline numeric width above 328px", badInline.length === 0, badInline.join(","));
}

// ---------------------------------------------------------------- B02
check("B02: hamburger is a real button with type=button", /<button[^>]*className="nav-toggle"/.test(nav) && /type="button"\s*\n?\s*className="nav-toggle"/.test(nav));
check("B02: toggle has aria-expanded + aria-controls=main-nav", nav.includes('aria-expanded={menuOpen}') && nav.includes('aria-controls="main-nav"'));
check("B02: nav has id=main-nav and .open class when open", nav.includes('id="main-nav"') && nav.includes('menuOpen ? "nav open" : "nav"'));
check("B02: menu closes on link click (nav onClick)", /<nav[\s\S]*?onClick=\{\(\) => setMenuOpen\(false\)\}/.test(nav));
check("B02: menu closes on Escape and refocuses the toggle", nav.includes('e.key === "Escape"') && nav.includes("toggleRef.current?.focus()"));
check("B02: toggle hidden on desktop, shown in the mobile query", /\.nav-toggle \{ display: none; \}/.test(css) && /@media \(max-width: 640px\) \{[\s\S]*?\.nav-toggle \{[^}]*display: inline-flex/.test(css));
check("B02: mobile nav hidden until .open, full-width column", /@media \(max-width: 640px\) \{[\s\S]*?\.nav \{ display: none; width: 100%; flex-direction: column/.test(css) && /\.nav\.open \{ display: flex; \}/.test(css));
check(
  "B02: all 14 links still present (12 in LINKS + issues + review)",
  (nav.match(/\{ href: "\//g) ?? []).length === 12 && // the LINKS array
    nav.includes('href="/issues"') &&
    nav.includes('href="/review"') &&
    (nav.match(/<Link /g) ?? []).length === 4, // brand + map + issues + review
);
check("B02: language selector + theme toggle untouched", nav.includes('aria-label="Language"') && nav.includes('aria-label="Toggle dark mode"'));
check("B02: focus-visible style exists (keyboard focus visible)", /:focus-visible \{ outline: 2px solid var\(--teal\)/.test(css) && /\.topbar :focus-visible \{ outline-color: #fff; \}/.test(css));

// ---------------------------------------------------------------- B03
function countDirLtr(src) {
  return (src.match(/dir="ltr"/g) ?? []).length;
}
check("B03: plan progress fraction isolated", plan.includes('<span dir="ltr">') && plan.includes("{doneCount}/{totalTasks}"));
check("B03: quiz score + raw accuracy + exam score isolated", countDirLtr(quizRunner) >= 4);
check("B03: quiz question counter + timer isolated", quizRunner.includes("{idx + 1} of {total}") && quizRunner.includes("{mm}:{ss}"));
check("B03: mock list trusted count isolated", mockList.includes('<span dir="ltr">') && mockList.includes("{trusted} of {m.total}"));
check("B03: mock runner note counts isolated", countDirLtr(mockRun) >= 2 && quizRunner.includes("note?: ReactNode"));
check("B03: review progress + showing + show-more isolated", countDirLtr(review) >= 3);
check("B03: flashcard session + recalled + card counter isolated", countDirLtr(flashcards) >= 3);
check("B03: analysis stat + daily + mock + attempt fractions isolated", countDirLtr(analysis) >= 6);

// No BARE fraction left in JSX: strip comments, aria-labels and every
// dir="ltr" span, then no `{a}/{b}` or `{a} / {b}` may remain in any
// .tsx under src/app or src/components.
{
  const strip = (s) =>
    s
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/aria-label=\{`[^`]*`\}/g, "")
      .replace(/<span dir="ltr">[\s\S]*?<\/span>/g, "")
      .replace(/<span dir="ltr"[^>]*>[\s\S]*?<\/span>/g, "");
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? walk(p) : p.endsWith(".tsx") ? [p] : [];
    });
  const bare = [];
  for (const f of [...walk(path.join(ROOT, "src/app")), ...walk(path.join(ROOT, "src/components"))]) {
    const clean = strip(fs.readFileSync(f, "utf8"));
    if (/\}\s*\/\s*\{/.test(clean)) bare.push(path.relative(ROOT, f));
  }
  check("B03: no bare {a}/{b} fraction left outside dir=ltr spans", bare.length === 0, bare.join(","));
}

// ---------------------------------------------------------------- B04
function luminance(hex) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
// Pairs mirror globals.css exactly (badge backgrounds + text colours).
const badgePairs = [
  ["light", "default (amber)", "#F5A10B", "#1B272B"],
  ["light", "teal", "#09555E", "#FFFFFF"],
  ["light", "red", "#B3261E", "#FFFFFF"],
  ["light", "green", "#1E7D46", "#FFFFFF"],
  ["light", "grey", "#E3E8E7", "#333344"],
  ["dark", "default (amber)", "#F5A10B", "#1B272B"],
  ["dark", "teal", "#09555E", "#FFFFFF"],
  ["dark", "red", "#FF8A80", "#3D0A06"],
  ["dark", "green", "#4CC38A", "#06231A"],
  ["dark", "grey", "#2C3F42", "#CFE0E0"],
];
for (const [theme, name, bg, fg] of badgePairs) {
  const r = contrast(bg, fg);
  check(`B04: ${theme} badge ${name} ${bg}/${fg} >= 4.5:1`, r >= 4.5, `${r.toFixed(2)}:1`);
}
check(
  "B04: old dark green pair really was 2.22:1 (bug documented)",
  Math.abs(contrast("#4CC38A", "#FFFFFF") - 2.22) < 0.02,
  contrast("#4CC38A", "#FFFFFF").toFixed(2),
);
check(
  "B04: dark-mode overrides exist in globals.css with the fixed colours",
  css.includes('[data-theme="dark"] .badge.green { background: var(--green); color: #06231a; }') &&
    css.includes('[data-theme="dark"] .badge.red { background: var(--red); color: #3d0a06; }'),
);

// ---------------------------------------------------------------- B05
check(
  "B05: card surface is a native button with type=button + flip handler",
  /<button type="button" className="card flashcard" onClick=\{\(\) => setFlipped\(!flipped\)\}>/.test(flashcards),
);
check("B05: no role=button/tabIndex hack left on the card", !flashcards.includes('role="button"') && !flashcards.includes("tabIndex={0}"));
check("B05: native Flip card button preserved", flashcards.includes(">Flip card</button>"));
check("B05: no aria-label hiding the card text (content is the name)", !/className="card flashcard"[\s\S]{0,120}aria-label/.test(flashcards));
check("B05: .flashcard sets ink text colour (button rule sets white)", /\.flashcard \{[\s\S]*?color: var\(--ink\)/.test(css));
check("B05: grade buttons untouched", flashcards.includes('grade("again")') && flashcards.includes('grade("easy")'));

console.log(failures === 0 ? "\nAll Tier 4 tests passed." : `\n${failures} Tier 4 test(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
