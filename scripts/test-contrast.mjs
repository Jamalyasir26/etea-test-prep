// Semantic token contrast tests (Step 2a) — plain node, no dependencies.
// Parses the ACTUAL token values from src/app/globals.css (light :root +
// [data-theme="dark"] blocks, var() aliases resolved against the legacy
// variables), computes WCAG 2.x contrast ratios from the raw values, and
// asserts thresholds on the FULL-PRECISION ratio — never by rounding.
// The report's claimed ratios are verified within ±0.1 (the report
// prints 2 decimals; the computation must reproduce them, not merely
// exceed a threshold). Prints every computed ratio for the record.
// Run: node scripts/test-contrast.mjs  (exit 0 = all pass)
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = fs.readFileSync(join(ROOT, "src/app/globals.css"), "utf8");

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---- parse custom-property blocks (no nested braces inside) ----
function blocksFor(selectorRe) {
  const out = [];
  const re = new RegExp(`${selectorRe.source}\\s*\\{([^}]*)\\}`, "g");
  for (const m of css.matchAll(re)) out.push(m[1]);
  return out;
}
function parseDecls(block) {
  const map = {};
  for (const m of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    map[m[1].trim()] = m[2].trim();
  }
  return map;
}
const rootBlocks = blocksFor(/:root/);
const darkBlocks = blocksFor(/\[data-theme="dark"\]/);
check("at least two :root blocks (legacy + Step 2a)", rootBlocks.length >= 2, `found ${rootBlocks.length}`);
check("at least two dark blocks (legacy + Step 2a)", darkBlocks.length >= 2, `found ${darkBlocks.length}`);
const step2aRoot = rootBlocks.find((b) => b.includes("--surface-page"));
const step2aDark = darkBlocks.find((b) => b.includes("--surface-page"));
check("Step 2a light token block present", !!step2aRoot);
check("Step 2a dark token block present", !!step2aDark);
// The Step 2a blocks come last in the file, so their values win the
// cascade for the tokens they define (the @theme inline block's :root
// sits earlier and maps shadcn variables, not these tokens).
check("Step 2a light block is last", rootBlocks[rootBlocks.length - 1].includes("--surface-page"));
check("Step 2a dark block is last", darkBlocks[darkBlocks.length - 1].includes("--surface-page"));

// Merge in cascade order (later wins): legacy light, legacy dark,
// Step 2a light, Step 2a dark.
const light = {};
const dark = {};
for (const b of rootBlocks) Object.assign(light, parseDecls(b));
for (const b of rootBlocks) Object.assign(dark, parseDecls(b));
for (const b of darkBlocks) Object.assign(dark, parseDecls(b));

// Resolve var(--x) chains (aliases like --surface-page: var(--paper)).
function resolve(map, name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`token cycle at --${name}`);
  seen.add(name);
  const v = map[name];
  if (v === undefined) throw new Error(`token --${name} not defined`);
  const m = /^var\(--([a-z0-9-]+)\)$/.exec(v);
  return m ? resolve(map, m[1], seen) : v;
}
function hex(map, name) {
  const v = resolve(map, name);
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) throw new Error(`--${name} resolved to non-hex "${v}"`);
  return v;
}

// ---- WCAG relative luminance / contrast (same formula as B04) ----
function luminance(hexColor) {
  const h = hexColor.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ---- the report's exact values must be present, verbatim ----
const exactValues = [
  ["light", "--border", "#a9b8b9"],
  ["light", "--selected-bg", "#d9f0ef"],
  ["light", "--status-warning-bg", "#fff4d6"],
  ["light", "--status-warning-text", "#7a4b00"],
  ["light", "--status-success-bg", "#dcfce7"],
  ["light", "--status-success-text", "#14532d"],
  ["light", "--status-error-bg", "#fde2e2"],
  ["light", "--status-error-text", "#8b1e1e"],
  ["dark", "--surface-card", "#172326"],
  ["dark", "--surface-raised", "#202a2d"],
  ["dark", "--text-secondary", "#b5c5c7"],
  ["dark", "--border", "#587276"],
  ["dark", "--brand-primary", "#7fd4d8"],
  ["dark", "--selected-bg", "#12383d"],
  ["dark", "--selected-text", "#d5f5f3"],
  ["dark", "--status-warning-bg", "#3b2800"],
  ["dark", "--status-warning-text", "#ffd166"],
  ["dark", "--status-success-bg", "#12351f"],
  ["dark", "--status-success-text", "#9be7b0"],
  ["dark", "--status-error-bg", "#4a1713"],
  ["dark", "--status-error-text", "#ffb4ab"],
];
for (const [theme, name, want] of exactValues) {
  const map = theme === "light" ? light : dark;
  const got = (map[name.slice(2)] ?? "").toLowerCase();
  check(`token ${name} (${theme}) is the report value ${want}`, got === want, `got "${got}"`);
}

// ---- claimed ratios, reproduced within ±0.1 ----
const claims = [
  // [theme, fg token, bg token, claimed ratio, label]
  ["light", "text-primary", "surface-page", 14.76, "primary/page"],
  ["light", "text-secondary", "surface-page", 5.37, "secondary/page"],
  ["light", "link", "surface-page", 8.19, "link/page"],
  ["light", "selected-text", "selected-bg", 12.88, "selected"],
  ["light", "on-primary", "brand-primary", 8.49, "white on teal"],
  ["light", "status-warning-text", "status-warning-bg", 6.76, "warning"],
  ["light", "status-success-text", "status-success-bg", 8.3, "success"],
  ["light", "status-error-text", "status-error-bg", 7.45, "error"],
  ["dark", "text-primary", "surface-page", 15.3, "primary/page"],
  ["dark", "text-secondary", "surface-page", 10.0, "secondary/page"],
  ["dark", "link", "surface-page", 10.45, "link/page"],
  ["dark", "selected-text", "selected-bg", 10.96, "selected"],
  ["dark", "on-primary", "brand-primary", 10.45, "ink on cyan"],
  ["dark", "status-warning-text", "status-warning-bg", 9.78, "warning"],
  ["dark", "status-success-text", "status-success-bg", 9.29, "success"],
  ["dark", "status-error-text", "status-error-bg", 8.69, "error"],
];
console.log("\nComputed ratios (report claims in parentheses):");
for (const [theme, fg, bg, claimed, label] of claims) {
  const map = theme === "light" ? light : dark;
  const ratio = contrast(hex(map, fg), hex(map, bg));
  console.log(`  ${theme} ${label}: ${ratio.toFixed(2)} (claim ${claimed.toFixed(2)})`);
  check(
    `claim reproduced: ${theme} ${label} ≈ ${claimed}`,
    Math.abs(ratio - claimed) <= 0.1,
    `computed ${ratio.toFixed(4)}`,
  );
  check(`text threshold: ${theme} ${label} >= 4.5:1`, ratio >= 4.5, `computed ${ratio.toFixed(4)}`);
}

// ---- Step 2a additions: reviewed + neutral badge pairs ----
for (const theme of ["light", "dark"]) {
  const map = theme === "light" ? light : dark;
  const reviewed = contrast(hex(map, "status-reviewed-text"), hex(map, "status-reviewed-bg"));
  const neutral = contrast(hex(map, "status-neutral-text"), hex(map, "status-neutral-bg"));
  console.log(`  ${theme} reviewed: ${reviewed.toFixed(2)}; neutral: ${neutral.toFixed(2)}`);
  check(`reviewed badge pair (${theme}) >= 4.5:1`, reviewed >= 4.5, `computed ${reviewed.toFixed(4)}`);
  check(`neutral badge pair (${theme}) >= 4.5:1`, neutral >= 4.5, `computed ${neutral.toFixed(4)}`);
  // Reviewed must NOT be the success green (different pair entirely).
  check(
    `reviewed pair differs from success pair (${theme})`,
    hex(map, "status-reviewed-bg") !== hex(map, "status-success-bg"),
  );
}

// ---- focus ring: >= 3:1 vs adjacent surface, and BETTER than the
// report's suggested purple (the reason teal was kept) ----
const purple = { light: ["#7C3AED", 5.49], dark: ["#C4B5FD", 9.66] };
for (const theme of ["light", "dark"]) {
  const map = theme === "light" ? light : dark;
  const focusRatio = contrast(hex(map, "focus-ring"), hex(map, "surface-page"));
  const [purpleHex, purpleClaim] = purple[theme];
  const purpleRatio = contrast(purpleHex, hex(map, "surface-page"));
  console.log(`  ${theme} focus-ring: ${focusRatio.toFixed(2)} (purple suggestion: ${purpleRatio.toFixed(2)})`);
  check(`focus ring (${theme}) >= 3:1 vs page`, focusRatio >= 3, `computed ${focusRatio.toFixed(4)}`);
  check(
    `focus ring (${theme}) beats the purple suggestion`,
    focusRatio > purpleRatio,
    `${focusRatio.toFixed(2)} vs ${purpleRatio.toFixed(2)}`,
  );
  check(
    `purple claim reproduces (${theme})`,
    Math.abs(purpleRatio - purpleClaim) <= 0.1,
    `computed ${purpleRatio.toFixed(4)}`,
  );
}

// ---- disabled pairs: below 4.5 by design (WCAG exempts inactive
// elements); the report proposes them at >= 3:1 and the values must
// reproduce the claimed ratios. ----
for (const [theme, claimed] of [
  ["light", 4.24],
  ["dark", 3.58],
]) {
  const map = theme === "light" ? light : dark;
  const ratio = contrast(hex(map, "disabled-text"), hex(map, "disabled-bg"));
  console.log(`  ${theme} disabled: ${ratio.toFixed(2)} (claim ${claimed})`);
  check(`disabled claim reproduces (${theme})`, Math.abs(ratio - claimed) <= 0.1, `computed ${ratio.toFixed(4)}`);
  check(`disabled pair (${theme}) >= 3:1`, ratio >= 3, `computed ${ratio.toFixed(4)}`);
}

// ---- the old 2.22:1 badge regression (Tier 4 B04) ----
// White on the old dark-green badge colour FAILS at 2.22:1 — the value
// is reproduced here so the regression stays visible, and the CURRENT
// dark success pair must pass 4.5:1 (already asserted above via the
// 9.29 claim; repeated explicitly as the regression's counterpart).
const old = contrast("#FFFFFF", "#4CC38A");
console.log(`  old dark badge (white on #4CC38A): ${old.toFixed(2)} (must stay ≈2.22, i.e. failing)`);
check("old 2.22:1 badge value reproduced", Math.abs(old - 2.22) < 0.02, `computed ${old.toFixed(4)}`);
check("old 2.22:1 pair still fails 4.5:1 (proves the test can fail)", old < 4.5);
check(
  "current dark success pair passes where the old pair failed",
  contrast(hex(dark, "status-success-text"), hex(dark, "status-success-bg")) >= 4.5,
);

console.log(failures === 0 ? `\nAll contrast tests passed.` : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
