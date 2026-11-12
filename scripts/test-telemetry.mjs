// Telemetry tests (Stage 1 P2, B07) — plain node, no dependencies.
// Imports the real src/lib/telemetry.ts (Node strips types; the module
// touches window/localStorage only inside functions, so a small stub
// is enough — same pattern as scripts/test-storage.mjs).
// Covers: hydration-message detection; record/load round trip with
// route + timestamp; newest-first order; 50-entry cap; 300-char
// truncation; malformed stored data tolerated; clear; never throws
// when storage throws; no-ops without window (SSR).
// Run: node scripts/test-telemetry.mjs  (exit 0 = all pass)

const store = new Map();
const stub = { throwOnWrite: false, throwOnRead: false };
globalThis.window = globalThis;
globalThis.location = { pathname: "/review" };
globalThis.localStorage = {
  getItem: (k) => {
    if (stub.throwOnRead) throw new Error("blocked");
    return store.has(k) ? store.get(k) : null;
  },
  setItem: (k, v) => {
    if (stub.throwOnWrite) throw new Error("full");
    store.set(k, String(v));
  },
  removeItem: (k) => {
    store.delete(k);
  },
};

const {
  TELEMETRY_KEY,
  TELEMETRY_MAX_ENTRIES,
  looksLikeHydrationError,
  recordTelemetry,
  loadTelemetry,
  clearTelemetry,
} = await import("../src/lib/telemetry.ts");

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
function reset() {
  store.clear();
  stub.throwOnWrite = false;
  stub.throwOnRead = false;
}

// 1. Hydration detection.
check("detects 'hydration'", looksLikeHydrationError("Hydration failed because the initial UI does not match"));
check("detects lowercase hydration", looksLikeHydrationError("a hydration error occurred"));
check("detects React #418", looksLikeHydrationError("Minified React error #418; visit https://react.dev/errors/418"));
check("detects React #425", looksLikeHydrationError("Minified React error #425"));
check("detects React #419", looksLikeHydrationError("Minified React error #419"));
check("ordinary error is not hydration", !looksLikeHydrationError("Cannot read properties of undefined"));
check("empty string is not hydration", !looksLikeHydrationError(""));

// 2. Record/load round trip.
reset();
recordTelemetry("error", "boom", "/tutor");
const loaded = loadTelemetry();
check("one entry recorded", loaded.length === 1);
check("entry keeps kind + message", loaded[0].kind === "error" && loaded[0].message === "boom");
check("entry keeps explicit route", loaded[0].route === "/tutor");
check("entry timestamp is ISO UTC", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(loaded[0].at));
reset();
recordTelemetry("hydration", "mismatch");
check("route defaults to window location", loadTelemetry()[0].route === "/review");

// 3. Newest first + cap.
reset();
for (let i = 0; i < TELEMETRY_MAX_ENTRIES + 10; i++) recordTelemetry("error", `e${i}`, "/x");
const capped = loadTelemetry();
check("cap is 50", TELEMETRY_MAX_ENTRIES === 50);
check("entries capped at 50", capped.length === 50, `got ${capped.length}`);
check("newest first", capped[0].message === `e${TELEMETRY_MAX_ENTRIES + 9}`);
check("oldest dropped", !capped.some((e) => e.message === "e0"));

// 4. Truncation.
reset();
recordTelemetry("error", "x".repeat(500), "/x");
check("message truncated to 300 chars", loadTelemetry()[0].message.length === 300);

// 5. Malformed stored data tolerated.
reset();
store.set(TELEMETRY_KEY, "{not json");
check("malformed JSON loads as []", JSON.stringify(loadTelemetry()) === "[]");
store.set(TELEMETRY_KEY, JSON.stringify({ not: "an array" }));
check("non-array loads as []", JSON.stringify(loadTelemetry()) === "[]");
store.set(
  TELEMETRY_KEY,
  JSON.stringify([
    { at: "2026-11-12T00:00:00.000Z", route: "/x", kind: "error", message: "good" },
    { at: "bad" },
    "junk",
    null,
    { at: "2026-11-12T00:00:00.000Z", route: "/y", kind: "nope", message: "bad kind" },
  ]),
);
const cleaned = loadTelemetry();
check("invalid entries skipped, valid kept", cleaned.length === 1 && cleaned[0].message === "good");

// 6. Clear.
clearTelemetry();
check("clear removes the key", !store.has(TELEMETRY_KEY));
check("load after clear is []", loadTelemetry().length === 0);

// 7. Never throws when storage throws.
reset();
stub.throwOnWrite = true;
let threw = false;
try {
  recordTelemetry("error", "x", "/x");
  clearTelemetry();
} catch {
  threw = true;
}
check("record/clear never throw on write failure", !threw);
stub.throwOnWrite = false;
stub.throwOnRead = true;
threw = false;
let result = null;
try {
  result = loadTelemetry();
} catch {
  threw = true;
}
check("load never throws on read failure", !threw && Array.isArray(result) && result.length === 0);
stub.throwOnRead = false;

// 8. SSR safety: no window -> no-op / [].
const savedWindow = globalThis.window;
delete globalThis.window;
threw = false;
try {
  recordTelemetry("error", "x", "/x");
  result = loadTelemetry();
  clearTelemetry();
} catch {
  threw = true;
}
check("no-ops without window", !threw && Array.isArray(result) && result.length === 0);
globalThis.window = savedWindow;

// 9. Wiring: listener mounted in layout, section on /issues.
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
check(
  "TelemetryListener mounted in layout",
  fs.readFileSync(join(ROOT, "src/app/layout.tsx"), "utf8").includes("<TelemetryListener />"),
);
check(
  "telemetry section on /issues",
  fs.readFileSync(join(ROOT, "src/app/issues/page.tsx"), "utf8").includes("Client errors (this device only)"),
);
check(
  "listener wraps console.error once with a guard",
  fs.readFileSync(join(ROOT, "src/components/TelemetryListener.tsx"), "utf8").includes("__eteaTelemetryConsoleWrapped"),
);

console.log(failures === 0 ? `\nAll telemetry tests passed.` : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
