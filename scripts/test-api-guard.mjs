// API guard + rate limiter tests — plain node, no dependencies.
// apiGuard.ts has no imports, so it is imported directly (Node strips
// types on .ts imports). ai.ts imports JSON (via data.ts) and extensionless
// ./data, which plain node cannot import from .ts, so — like
// scripts/test-fallback-chain.mjs — the script first compiles the real
// ai.ts to CommonJS in /tmp with tsc and tests the COMPILED real
// rateLimitOk() — not a copy of it.
// Covers: same-origin decisions (pass/reject incl. the no-header GET vs
// POST rule), trusted client-IP extraction, limiter thresholds, and the
// validate-before-limit ordering of the three POST routes (source-order
// checks — the route handlers themselves need the Next.js runtime, so the
// ordering contract is proven by the position of the calls in the source,
// the same pattern scripts/test-tutor-lang.mjs uses for route wiring).
// Run: node scripts/test-api-guard.mjs  (exit 0 = all pass)

import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

const { isAllowedOrigin, isSameOriginRequest, clientIpFromHeaders } = await import(
  path.join(SRC, "lib", "apiGuard.ts")
);

const OUT = "/tmp/stage1p1-apiguard";
execSync(
  `npx tsc src/lib/ai.ts --outDir ${OUT} --module commonjs --target es2020 --resolveJsonModule --esModuleInterop --skipLibCheck --moduleResolution node`,
  { cwd: ROOT, stdio: "ignore" },
);
const nmLink = path.join(OUT, "node_modules");
if (!fs.existsSync(nmLink)) fs.symlinkSync(path.join(ROOT, "node_modules"), nmLink, "dir");
const require = createRequire(import.meta.url);
const { rateLimitOk, LIMITS } = require(path.join(OUT, "lib", "ai.js"));

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// --- header stand-in (case-insensitive, like NextRequest.headers) ---
function bag(entries = {}) {
  const map = new Map(Object.entries(entries).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name) => map.get(name.toLowerCase()) ?? null };
}

// --- 1. allowed origins ---
check("production origin allowed", isAllowedOrigin("https://etea-test-prep.vercel.app"));
check("production origin with whitespace trimmed", isAllowedOrigin("  https://etea-test-prep.vercel.app  "));
check("vercel preview deployment allowed", isAllowedOrigin("https://etea-test-prep-git-tier3-abc123.vercel.app"));
check("localhost any port allowed", isAllowedOrigin("http://localhost:3000") && isAllowedOrigin("http://localhost:3107"));
check("127.0.0.1 allowed", isAllowedOrigin("http://127.0.0.1:3000"));
check("foreign https origin rejected", !isAllowedOrigin("https://evil.example.com"));
check("lookalike subdomain rejected", !isAllowedOrigin("https://etea-test-prep.vercel.app.evil.com"));
check("lookalike suffix rejected", !isAllowedOrigin("https://etea-test-prep.vercel.appx.com"));
check("http (non-https) production origin rejected", !isAllowedOrigin("http://etea-test-prep.vercel.app"));
check("null origin rejected", !isAllowedOrigin("null"));
check("empty origin rejected", !isAllowedOrigin(""));

// --- 2. same-origin decisions ---
check(
  "POST with same-origin Origin passes",
  isSameOriginRequest(bag({ origin: "https://etea-test-prep.vercel.app" }), "POST")
);
check(
  "POST with localhost Origin passes",
  isSameOriginRequest(bag({ origin: "http://localhost:3000" }), "POST")
);
check(
  "POST with cross-origin Origin rejected",
  !isSameOriginRequest(bag({ origin: "https://evil.example.com" }), "POST")
);
check(
  "POST with no Origin but same-origin Referer passes",
  isSameOriginRequest(bag({ referer: "https://etea-test-prep.vercel.app/tutor" }), "POST")
);
check(
  "POST with no Origin but cross-origin Referer rejected",
  !isSameOriginRequest(bag({ referer: "https://evil.example.com/page" }), "POST")
);
check(
  "POST with neither Origin nor Referer rejected (not a browser fetch)",
  !isSameOriginRequest(bag({}), "POST")
);
check(
  "GET with neither header allowed (direct navigation / diagnostics)",
  isSameOriginRequest(bag({}), "GET")
);
check(
  "GET with cross-origin Origin rejected",
  !isSameOriginRequest(bag({ origin: "https://evil.example.com" }), "GET")
);
check(
  "GET with same-origin Referer passes",
  isSameOriginRequest(bag({ referer: "https://etea-test-prep.vercel.app/" }), "GET")
);
check(
  "POST with malformed Referer rejected",
  !isSameOriginRequest(bag({ referer: "::::not-a-url" }), "POST")
);
check(
  "Origin wins over Referer (cross-origin Origin + same-origin Referer rejected)",
  !isSameOriginRequest(
    bag({ origin: "https://evil.example.com", referer: "https://etea-test-prep.vercel.app/tutor" }),
    "POST"
  )
);
check(
  "header names case-insensitive",
  isSameOriginRequest(bag({ Origin: "https://etea-test-prep.vercel.app" }), "POST")
);
check(
  "method case-insensitive (post lower-case still guarded)",
  !isSameOriginRequest(bag({}), "post")
);

// --- 3. trusted client IP ---
check(
  "x-vercel-forwarded-for preferred over x-forwarded-for",
  clientIpFromHeaders(bag({ "x-vercel-forwarded-for": "203.0.113.7", "x-forwarded-for": "198.51.100.9" })) ===
    "203.0.113.7"
);
check(
  "first entry of a vercel list wins",
  clientIpFromHeaders(bag({ "x-vercel-forwarded-for": "203.0.113.7, 70.41.3.18" })) === "203.0.113.7"
);
check(
  "x-forwarded-for fallback, first entry wins",
  clientIpFromHeaders(bag({ "x-forwarded-for": "198.51.100.9, 70.41.3.18" })) === "198.51.100.9"
);
check("no headers -> local", clientIpFromHeaders(bag({})) === "local");
check(
  "empty vercel header falls through to x-forwarded-for",
  clientIpFromHeaders(bag({ "x-vercel-forwarded-for": "  ", "x-forwarded-for": "198.51.100.9" })) ===
    "198.51.100.9"
);
check(
  "spoofed x-forwarded-for ignored when vercel header present",
  clientIpFromHeaders(bag({ "x-vercel-forwarded-for": "203.0.113.7", "x-forwarded-for": "1.2.3.4" })) ===
    "203.0.113.7"
);

// --- 4. limiter thresholds (fresh IPs per group; buckets are module-global) ---
check("limits unchanged: 100/day + 10/min", LIMITS.perDay === 100 && LIMITS.perMinute === 10);
{
  const ip = "test-minute-1";
  let okCount = 0;
  for (let i = 0; i < 10; i++) if (rateLimitOk(ip).ok) okCount += 1;
  const eleventh = rateLimitOk(ip);
  const twelfth = rateLimitOk(ip);
  check("first 10 requests in a minute pass", okCount === 10);
  check("11th request in a minute gets 429", !eleventh.ok && /minute/i.test(eleventh.message ?? ""));
  check("12th request still 429 (counter does not grow past the limit)", !twelfth.ok);
}
{
  const ipA = "test-isolation-a";
  const ipB = "test-isolation-b";
  for (let i = 0; i < 10; i++) rateLimitOk(ipA);
  check("exhausted IP does not affect a different IP", rateLimitOk(ipB).ok);
  check("exhausted IP stays limited", !rateLimitOk(ipA).ok);
}

// --- 5. route wiring: order + trusted identity (source-order checks) ---
const ROUTES = [
  { name: "tutor", file: ["app", "api", "tutor", "route.ts"], validation: 'if (!message)' },
  { name: "explain", file: ["app", "api", "explain", "route.ts"], validation: 'if (!q)' },
  { name: "plan", file: ["app", "api", "plan", "route.ts"], validation: "const weeks =" },
];
for (const r of ROUTES) {
  const src = fs.readFileSync(path.join(SRC, ...r.file), "utf8");
  const originIdx = src.indexOf("isSameOriginRequest(req.headers");
  const limitIdx = src.indexOf("rateLimitOk(");
  const validIdx = src.indexOf(r.validation);
  check(`/${r.name}: same-origin check present`, originIdx !== -1);
  check(`/${r.name}: same-origin check runs before the rate limit`, originIdx !== -1 && limitIdx !== -1 && originIdx < limitIdx);
  check(
    `/${r.name}: validation runs before the rate limit (invalid requests consume no quota)`,
    validIdx !== -1 && limitIdx !== -1 && validIdx < limitIdx
  );
  check(`/${r.name}: uses trusted clientIpFromHeaders`, src.includes("clientIpFromHeaders(req.headers)"));
  check(`/${r.name}: no direct x-forwarded-for read`, !src.includes("x-forwarded-for"));
  check(`/${r.name}: no stale local clientIp helper`, !src.includes("function clientIp("));
}
{
  const health = fs.readFileSync(path.join(SRC, "app", "api", "tutor", "health", "route.ts"), "utf8");
  check("health: same-origin guard present", health.includes('isSameOriginRequest(req.headers, "GET")'));
  check("health: rate limit present (probes cost quota)", health.includes("rateLimitOk(clientIpFromHeaders(req.headers))"));
  check("health: guard runs before probing", health.indexOf("isSameOriginRequest") < health.indexOf("probeProviders()"));
}
{
  const tutor = fs.readFileSync(path.join(SRC, "app", "api", "tutor", "route.ts"), "utf8");
  check("GET /api/tutor: same-origin guard present", tutor.includes('isSameOriginRequest(req.headers, "GET")'));
}
{
  const guard = fs.readFileSync(path.join(SRC, "lib", "apiGuard.ts"), "utf8");
  check("apiGuard documents the spoofability limitation", /spoofable/i.test(guard) && /NOT access control/i.test(guard));
  check("apiGuard has no Next.js imports (node-testable)", !guard.includes("next/server"));
}

if (failures > 0) {
  console.log(`\n${failures} check(s) FAILED.`);
  process.exit(1);
}
console.log("\nAll API guard tests passed.");
