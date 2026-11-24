// Phase 3 (W3) — QuizRunner timed mode tests. Plain node, no
// dependencies. Covers: (a) zero `mode === "mock" && minutes` gates
// left in QuizRunner.tsx; (b) the `timed` derivation exists and every
// timer site references it, while mock-only behaviour is untouched;
// (c) the mock runner page wiring is unchanged; (d) loadSession expiry
// behaviour (expired deadline -> null, future deadline -> session) via
// the real tracking.ts with the localStorage stub pattern from
// scripts/test-storage.mjs; (e) the practice page's timed wiring
// (minutes prop + `:t` scope marker, timed mode only) — owned by W6,
// so missing wiring is reported PENDING, never FAIL, until W6 lands.
// Run: node scripts/test-phase3-timed.mjs  (exit 0 = all pass)

// --- controllable browser stub (must exist before the import runs) ---
// Same pattern as scripts/test-storage.mjs: tracking.ts touches
// localStorage only inside functions (Node 23.6+ strips types on .ts
// imports), so a small in-memory localStorage + window stub is enough.
const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    store.set(k, String(v));
  },
  removeItem: (k) => {
    store.delete(k);
  },
};
// Silence the [storage] console.warn lines the code emits honestly.
const realWarn = console.warn;
console.warn = () => {};

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const { KEY_VERSION, loadSession, loadSessionRaw, saveSession } = await import("../src/lib/tracking.ts");

let failures = 0;
let passes = 0;
let pendings = 0;
function check(name, cond, detail = "") {
  if (cond) {
    passes += 1;
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
// PENDING = W6-owned wiring not present yet. Reported honestly, never
// counted as a failure of this worker's timed-mode change.
function pending(name, detail = "") {
  pendings += 1;
  console.log(`PENDING  ${name}${detail ? ` — ${detail}` : ""} (W6)`);
}

// --- (a) grep gates: no mock-gated timer machinery left ---
const qr = read("src/components/QuizRunner.tsx");
const gateCount = qr.split('mode === "mock" && minutes').length - 1;
check(
  "(a) zero `mode === \"mock\" && minutes` occurrences in QuizRunner.tsx",
  gateCount === 0,
  `found ${gateCount}`,
);
check(
  "(a) no negated mock-gate form left on the tick effect",
  !qr.includes('mode !== "mock" || minutes <= 0'),
);

// --- (b) `timed` derivation + every timer site references it ---
check(
  "(b) `timed` derivation exists",
  qr.includes("const timed = minutes > 0;"),
);
check(
  "(b) tick effect gated on `timed`",
  qr.includes("if (!timed || done) return;") && qr.includes("}, [timed, done]);"),
);
const beginFreshBody = qr.slice(qr.indexOf("function beginFresh()"), qr.indexOf("function beginResume()"));
check(
  "(b) beginFresh sets the deadline from `timed`",
  beginFreshBody.includes("setDeadlineTs(timed ? fresh + minutes * 60 * 1000 : null);"),
);
const restartBody = qr.slice(qr.indexOf("function restart()"), qr.indexOf("if (total === 0)"));
check(
  "(b) restart sets the deadline from `timed`",
  restartBody.includes("setDeadlineTs(timed ? fresh + minutes * 60 * 1000 : null);"),
);
check(
  "(b) auto-submit effect gated on `timed`",
  qr.includes("if (timed && deadlineTs !== null && secondsLeft === 0 && !done) {"),
);
const timerDisplayIdx = qr.indexOf("{timed && (");
check(
  "(b) timer display line gated on `timed`",
  timerDisplayIdx !== -1 && qr.slice(timerDisplayIdx, timerDisplayIdx + 200).includes("⏱"),
  "timer display block not found",
);
check(
  "(b) footer timerNote line gated on `timed`",
  qr.includes('{timed ? ` · ${t("timerNote")}` : ""}'),
);
// Mock-only behaviour untouched (guards against over-replacement).
check(
  "(b) practiceMockNote line still mock-only",
  qr.includes('{mode === "mock" && (') && qr.includes('t("practiceMockNote")'),
);
check(
  "(b) canAdvance rules still mock-aware",
  qr.includes('mode === "mock" || revealed'),
);
// UI/UX Program 2 (M03) — the mock-only picked inline style was
// DELIBERATELY deleted: it overrode U1's dark `.opt.picked` border
// (1.84:1 in dark mode). Both modes now share the neutral `.opt.picked`
// class before reveal (see the "in both modes" comment above the
// `cls += " picked"` branch). The guard now pins the unified style.
check(
  "(b) picked style is the shared .opt.picked class in both modes (M03)",
  !qr.includes('mode === "mock" && isPicked') &&
    qr.includes('cls += " picked"') &&
    qr.includes("Neutral \"picked\" style in both modes before reveal"),
);
check(
  "(b) pre-start disclosure still shows duration from `minutes`",
  qr.includes("tf(\"minsLabel\", { mins: minutes })"),
);
// Header + prop comments state the shared machinery.
check(
  "(b) header comment states timed practice reuses the deadline machinery",
  qr.includes("Timed practice (Phase 3)") && qr.includes("deadlineTs survives"),
);
check(
  "(b) `minutes` prop comment states the shared machinery",
  qr.includes("timed run (mock or timed practice)"),
);
// tracking.ts: the deadlineTs field comment only (comment-only edit).
const tracking = read("src/lib/tracking.ts");
const deadlineLine = tracking.split("\n").find((l) => l.includes("deadlineTs: number | null;")) ?? "";
check(
  "(b) tracking.ts deadlineTs comment covers timed runs",
  deadlineLine.includes("(timed runs: mock + timed practice)"),
  deadlineLine.trim(),
);
check(
  "(b) tracking.ts deadlineTs comment no longer says mock-only",
  !deadlineLine.includes("(mock only)"),
  deadlineLine.trim(),
);

// --- (c) mock runner page wiring unchanged ---
const mockPage = read("src/app/mock/[id]/page.tsx");
check(
  "(c) mock page still passes `minutes={mock.minutes}`",
  mockPage.includes("minutes={mock.minutes}"),
);
check(
  "(c) mock page still passes mode=\"mock\"",
  mockPage.includes('mode="mock"'),
);

// --- (d) loadSession expiry behaviour (the resume-after-deadline guarantee) ---
function makeSession(scope, mode, deadlineTs) {
  const now = Date.now();
  return {
    version: 3,
    id: `${scope}@${now}`,
    scope,
    mode,
    title: "Timed test run",
    questionIds: ["Q1"],
    questionSeed: "seed",
    optionSeed: now,
    answers: {},
    firstPass: {},
    retries: [],
    answeredAt: {},
    responseMs: {},
    idx: 0,
    startedAt: now,
    deadlineTs,
    minutes: 10,
    submitted: false,
    trustedOnly: false,
    contentRevision: KEY_VERSION,
    flags: {},
  };
}
function reset() {
  store.clear();
}

reset();
const expiredScope = "practice:islamiyat:0:t10";
check(
  "(d) expired timed session saves OK",
  saveSession(makeSession(expiredScope, "practice", Date.now() - 1000)) === true,
);
check(
  "(d) loadSession returns null for a stored session whose deadline has passed",
  loadSession(expiredScope) === null,
);
check(
  "(d) expired session is still visible via loadSessionRaw (raw read unaffected)",
  loadSessionRaw(expiredScope)?.scope === expiredScope,
);

reset();
const futureScope = "practice:islamiyat:0:t10";
check(
  "(d) future-deadline session saves OK",
  saveSession(makeSession(futureScope, "practice", Date.now() + 600000)) === true,
);
const resumed = loadSession(futureScope);
check(
  "(d) loadSession returns the session when the deadline is in the future",
  resumed !== null && resumed.scope === futureScope,
);

reset();
const boundaryScope = "practice:islamiyat:0:t10";
saveSession(makeSession(boundaryScope, "practice", Date.now()));
check(
  "(d) deadline exactly at now counts as expired (<= Date.now())",
  loadSession(boundaryScope) === null,
);

reset();
const untimedScope = "practice:islamiyat:0";
saveSession(makeSession(untimedScope, "practice", null));
check(
  "(d) untimed session (deadlineTs null) still resumes",
  loadSession(untimedScope)?.scope === untimedScope,
);

reset();
const mockScope = "mock:ct-B:0";
saveSession(makeSession(mockScope, "mock", Date.now() - 1000));
check(
  "(d) expiry is mode-agnostic: expired mock session also returns null",
  loadSession(mockScope) === null,
);

// --- (e) practice page timed wiring (W6-owned; pending until it lands) ---
const practice = read("src/app/practice/page.tsx");
const runnerBlock = practice.slice(
  practice.indexOf("<QuizRunner"),
  practice.indexOf("/>", practice.indexOf("<QuizRunner")),
);
check(
  "(e) practice page still mounts QuizRunner in practice mode",
  runnerBlock.includes('mode="practice"'),
);
if (runnerBlock.includes("minutes=")) {
  check(
    "(e) practice page passes a minutes prop to QuizRunner",
    true,
  );
  check(
    "(e) minutes prop is conditional (timed mode only, not always-on)",
    /minutes=\{[^}]*\?/.test(runnerBlock) || runnerBlock.includes("...("),
    "minutes prop present but not visibly conditional",
  );
} else {
  pending("(e) practice page passes a minutes prop to QuizRunner", "no minutes prop yet");
  pending("(e) minutes prop is conditional (timed mode only)", "no minutes prop yet");
}
if (practice.includes(":t${")) {
  check("(e) practice scope carries the `:t` timed marker", true);
} else {
  pending("(e) practice scope carries the `:t` timed marker", "no `:t` marker in scope yet");
}
if (/key=\{`[^`]*timed[^`]*\}/.test(practice) || /key=\{`[^`]*:t[^`]*\}/.test(practice)) {
  check("(e) QuizRunner key gains the timed marker (remount on toggle)", true);
} else {
  pending("(e) QuizRunner key gains the timed marker (remount on toggle)", "key has no timed marker yet");
}
// Hard guard in both states: an unconditional always-on timer must never appear.
check(
  "(e) no unconditional literal minutes value on the practice page",
  !/minutes=\{\d+\}/.test(practice) && !/minutes="\d+"/.test(practice),
);

console.warn = realWarn;
console.log(
  `\n${passes} passed, ${failures} failed, ${pendings} pending (W6).` +
    (failures === 0
      ? pendings > 0
        ? " Timed-mode checks passed; practice-page wiring awaits W6."
        : " All Phase 3 timed-mode tests passed."
      : " FAILURES PRESENT."),
);
process.exit(failures === 0 ? 0 : 1);
