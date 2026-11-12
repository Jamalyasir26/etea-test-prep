// Font delivery tests (Localization Pass 1) — plain node, no dependencies.
// Static checks over the real source: next/font/google is used (no
// external font <link> anywhere, as the CSP allows font-src 'self'
// data: only), and the owner's UPDATED font decision is wired: ONLY
// Noto Sans Arabic — headings, body and UI, in all languages. The
// earlier Noto Nastaliq Urdu decision was CANCELLED by the owner on
// 2026-11-12 (his own mobile testing); zero Nastaliq references may
// remain in src/. The built output — when a build exists — serves the
// font from the site's own origin.
// Run: node scripts/test-fonts.mjs  (exit 0 = all pass)
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

const layout = fs.readFileSync(join(ROOT, "src/app/layout.tsx"), "utf8");
const css = fs.readFileSync(join(ROOT, "src/app/globals.css"), "utf8");

check("layout imports next/font/google", layout.includes('from "next/font/google"'));
check("Noto Sans Arabic configured", layout.includes("Noto_Sans_Arabic"));
check("no Nastaliq font configured in layout", !layout.includes("Noto_Nastaliq_Urdu"));
check("Sans Arabic variable declared", layout.includes('"--font-sans-arabic"'));
check("no Nastaliq variable declared", !layout.includes("--font-nastaliq"));
check("font variable applied to <html>", layout.includes("sansArabic.variable"));
check("fonts use display: swap", layout.includes('display: "swap"'));
check("Sans Arabic uses arabic + latin subsets", /Noto_Sans_Arabic\(\{\s*subsets: \["arabic", "latin"\]/s.test(layout));
check("Sans Arabic weights 400-700", /weight: \["400", "500", "600", "700"\]/.test(layout));
check("headings use the Sans Arabic variable", /h1, h2, h3 \{[^}]*var\(--font-sans-arabic\)/s.test(css));
check("body uses the Sans Arabic variable", css.includes("var(--font-sans-arabic)"));
check("no Nastaliq-specific Urdu line-height rule", !css.includes('html[lang="ur"] h1'));
check("system fallbacks kept in body stack", css.includes("system-ui, -apple-system"));

// ZERO Nastaliq references anywhere under src/ (comments included:
// the cancellation is documented in CHANGELOG.md and the report, not
// in source comments).
const nastaliqHits = [];
function walkSrc(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkSrc(p);
    else {
      const src = fs.readFileSync(p, "utf8");
      if (/nastaliq/i.test(src)) nastaliqHits.push(p);
    }
  }
}
walkSrc(join(ROOT, "src"));
check("zero Nastaliq references in src/", nastaliqHits.length === 0, nastaliqHits.join(", "));

// No external font loading anywhere in the source.
let externalFontRefs = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|mjs|css)$/.test(e.name)) {
      const src = fs.readFileSync(p, "utf8");
      if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(src)) externalFontRefs.push(p);
    }
  }
}
walk(join(ROOT, "src"));
check("no Google Fonts URLs in src/", externalFontRefs.length === 0, externalFontRefs.join(", "));
check(
  "no font <link> tags in layout",
  !/<link[^>]*font/.test(layout) && !/fonts\.googleapis/.test(layout),
);

// Built output (when present): font files emitted under /_next/static.
const nextDir = join(ROOT, ".next");
if (fs.existsSync(nextDir)) {
  const found = [];
  (function walkBuild(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walkBuild(p);
      else if (/\.woff2$/.test(e.name)) found.push(p);
    }
  })(nextDir);
  check("build emits self-hosted woff2 font files", found.length > 0, "no .woff2 under .next — was the build run?");
  const cssFiles = [];
  (function walkCss(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walkCss(p);
      else if (/\.css$/.test(e.name)) cssFiles.push(p);
    }
  })(join(nextDir, "static"));
  const cssText = cssFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  check("built CSS references local font files only", !/fonts\.gstatic\.com/.test(cssText));
  check("built CSS defines the Sans Arabic variable", cssText.includes("--font-sans-arabic"));
  check("built CSS has no Nastaliq variable", !cssText.includes("--font-nastaliq"));
  check("built CSS has no Nastaliq font reference", !/nastaliq/i.test(cssText));
} else {
  console.log("SKIP  built-output checks (no .next — run `npm run build` first)");
}

console.log(failures === 0 ? `\nAll font tests passed.` : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
