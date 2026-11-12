// Font delivery tests (Stage 1 P2) — plain node, no dependencies.
// Static checks over the real source: next/font/google is used (no
// external font <link> anywhere, as the CSP allows font-src 'self'
// data: only), the owner's FINAL fonts are wired (Nastaliq headings,
// Sans Arabic body) via CSS variables, and the built output — when a
// build exists — serves the fonts from the site's own origin.
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
check("Noto Nastaliq Urdu configured", layout.includes("Noto_Nastaliq_Urdu"));
check("Noto Sans Arabic configured", layout.includes("Noto_Sans_Arabic"));
check("Nastaliq variable declared", layout.includes('"--font-nastaliq"'));
check("Sans Arabic variable declared", layout.includes('"--font-sans-arabic"'));
check("font variables applied to <html>", layout.includes("nastaliq.variable") && layout.includes("sansArabic.variable"));
check("fonts use display: swap", layout.includes('display: "swap"'));
check("Nastaliq uses the arabic subset", /Noto_Nastaliq_Urdu\(\{\s*subsets: \["arabic"\]/s.test(layout));
check("Sans Arabic uses arabic + latin subsets", /Noto_Sans_Arabic\(\{\s*subsets: \["arabic", "latin"\]/s.test(layout));
check("headings use the Nastaliq variable", css.includes("var(--font-nastaliq)"));
check("body uses the Sans Arabic variable", css.includes("var(--font-sans-arabic)"));
check("heading rule falls back to Sans Arabic", /h1, h2, h3 \{[^}]*var\(--font-sans-arabic\)/s.test(css));
check("system fallbacks kept in body stack", css.includes("system-ui, -apple-system"));
check("Urdu-mode headings get taller line-height", css.includes('html[lang="ur"] h1') && css.includes("line-height: 2"));

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
  check("built CSS defines the font variables", cssText.includes("--font-nastaliq") && cssText.includes("--font-sans-arabic"));
} else {
  console.log("SKIP  built-output checks (no .next — run `npm run build` first)");
}

console.log(failures === 0 ? `\nAll font tests passed.` : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
