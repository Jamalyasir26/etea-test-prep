// Answer-path timeouts + retries + overall deadline tests (Stage 1 P1
// Tier 2) — plain node, no dependencies. Like scripts/test-fallback-
// chain.mjs, the script compiles the real ai.ts to CommonJS in /tmp
// with tsc and tests the COMPILED real generateTutorAnswer() — not a
// copy of it. No live keys, no network: provider calls are stubbed
// through the injectable `impls` argument, and the bounds are injected
// through the `bounds` argument (tiny millisecond values) so the
// timeout/retry/deadline behaviour is proven in ms instead of real
// seconds. The production constants (8 s / 15 s) are asserted
// separately. Covers: per-provider abort at the bound, exactly one
// retry for transient errors only, no retry for non-transient errors,
// the overall deadline capping total time, retry logging markers, and
// first-error preservation with retries in the chain.
// Run: node scripts/test-timeouts.mjs  (exit 0 = all pass)

// Fake keys so providerStatus() reports all three providers configured.
// The stubs replace the real calls, so no network is ever touched.
process.env.GEMINI_API_KEY = "test-fake-key";
process.env.GROQ_API_KEY = "test-fake-key";
process.env.OPENROUTER_API_KEY = "test-fake-key";

import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/stage1p1-timeouts";
execSync(
  `npx tsc src/lib/ai.ts --outDir ${OUT} --module commonjs --target es2020 --resolveJsonModule --esModuleInterop --skipLibCheck --moduleResolution node`,
  { cwd: ROOT, stdio: "ignore" },
);
const nmLink = path.join(OUT, "node_modules");
if (!fs.existsSync(nmLink)) fs.symlinkSync(path.join(ROOT, "node_modules"), nmLink, "dir");
const require = createRequire(import.meta.url);

const {
  PROVIDER_TIMEOUT_MS,
  ANSWER_DEADLINE_MS,
  MAX_PROVIDER_ATTEMPTS,
  PROBE_TIMEOUT_MS,
  generateTutorAnswer,
  classifyProviderError,
  isTransientErrorClass,
  timedCall,
  AiError,
  DeadlineError,
} = require(path.join(OUT, "lib/ai.js"));

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BOUNDS = { providerTimeoutMs: 50, answerDeadlineMs: 500 };

// --- Production constants (the mechanism is tested with injected ms bounds) ---
check("Per-provider bound is 8s", PROVIDER_TIMEOUT_MS === 8000, String(PROVIDER_TIMEOUT_MS));
check("Overall deadline is 15s", ANSWER_DEADLINE_MS === 15000, String(ANSWER_DEADLINE_MS));
check("At most one retry per provider (2 attempts)", MAX_PROVIDER_ATTEMPTS === 2, String(MAX_PROVIDER_ATTEMPTS));
check("Health probe bound untouched at 15s", PROBE_TIMEOUT_MS === 15000, String(PROBE_TIMEOUT_MS));

// --- Transient classification drives the retry decision ---
check("timeout is transient", isTransientErrorClass("timeout"));
check("network is transient", isTransientErrorClass("network"));
check("quota (429) is transient", isTransientErrorClass("quota"));
check("http_500 is transient", isTransientErrorClass("http_500"));
check("http_503 is transient", isTransientErrorClass("http_503"));
check("invalid_key is NOT transient", !isTransientErrorClass("invalid_key"));
check("model_not_found is NOT transient", !isTransientErrorClass("model_not_found"));
check("payment is NOT transient", !isTransientErrorClass("payment"));
check("not_configured is NOT transient", !isTransientErrorClass("not_configured"));
check("unknown is NOT transient", !isTransientErrorClass("unknown"));
check("empty_response is NOT transient", !isTransientErrorClass("empty_response"));
check("http_400 is NOT transient", !isTransientErrorClass("http_400"));
check("429 error classifies as quota (transient)", isTransientErrorClass(classifyProviderError(new Error("429 quota exceeded"))));
check("503 error classifies as http_503 (transient)", isTransientErrorClass(classifyProviderError({ status: 503, message: "down" })));
check("402 error classifies as payment (NOT transient)", !isTransientErrorClass(classifyProviderError({ status: 402, message: "payment" })));

// --- A provider exceeding the bound is aborted, then retried once, then falls through ---
{
  const calls = [];
  const slowGemini = async (prompt, opts) => {
    calls.push({ attempt: opts?.attempt, signal: opts?.signal });
    await sleep(500); // far past the 50ms bound
    return "too slow";
  };
  const started = Date.now();
  const r = await generateTutorAnswer("What is scaffolding?", "en", [], {
    gemini: slowGemini,
    groq: async () => "groq answer",
    openrouter: async () => "openrouter answer",
  }, BOUNDS);
  const elapsed = Date.now() - started;
  check("Slow Gemini aborted -> Groq answers", r.provider === "groq" && r.text === "groq answer", r.provider);
  check("Slow Gemini was attempted exactly twice (first + one retry)", calls.length === 2, String(calls.length));
  check("Slow Gemini attempts numbered 1 then 2", calls.map((c) => c.attempt).join(",") === "1,2", calls.map((c) => c.attempt).join(","));
  check("Slow Gemini received an AbortSignal that fired", calls.every((c) => c.signal?.aborted === true));
  check("Slow-provider chain finished near the bounds, not after the 500ms sleep", elapsed < 400, `${elapsed}ms`);
}

// --- Transient failure retries exactly once, then succeeds ---
{
  let n = 0;
  const attempts = [];
  const flaky = async (prompt, opts) => {
    attempts.push(opts?.attempt);
    n += 1;
    if (n === 1) throw new Error("fetch failed");
    return "gemini answer after retry";
  };
  const r = await generateTutorAnswer("What is scaffolding?", "en", [], {
    gemini: flaky,
    groq: async () => "groq answer",
    openrouter: async () => "openrouter answer",
  }, BOUNDS);
  check("Transient network failure -> retry succeeds on Gemini", r.provider === "gemini" && r.text === "gemini answer after retry");
  check("Transient failure retried exactly once (2 calls, attempts 1+2)", n === 2 && attempts.join(",") === "1,2", `${n} calls, attempts ${attempts.join(",")}`);
}

// --- Transient failure twice -> falls through to the next provider ---
{
  let n = 0;
  const alwaysTimeout = async () => {
    n += 1;
    throw new Error("request timed out");
  };
  const r = await generateTutorAnswer("What is scaffolding?", "en", [], {
    gemini: alwaysTimeout,
    groq: async () => "groq answer",
    openrouter: async () => "openrouter answer",
  }, BOUNDS);
  check("Transient failure twice -> Groq answers", r.provider === "groq");
  check("Transient failure retried exactly once, never a third time", n === 2, `${n} calls`);
}

// --- Non-transient failures are NEVER retried ---
for (const [label, err] of [
  ["invalid_key", new Error("API key not valid. Please pass a valid API key.")],
  ["model_not_found", new Error("404 model not found")],
  ["payment", { status: 402, message: "payment required" }],
  ["unknown", new Error("something odd happened")],
  ["empty_response", new Error("Empty response from Gemini")],
]) {
  let n = 0;
  const failing = async () => {
    n += 1;
    throw err;
  };
  const r = await generateTutorAnswer("What is scaffolding?", "en", [], {
    gemini: failing,
    groq: async () => "groq answer",
    openrouter: async () => "openrouter answer",
  }, BOUNDS);
  check(`Non-transient ${label} -> called once, no retry, Groq answers`, n === 1 && r.provider === "groq", `${n} calls, provider ${r.provider}`);
}

// --- Overall deadline caps total time even with slow providers ---
{
  const hang = async () => sleep(5000);
  const started = Date.now();
  let thrown = null;
  try {
    await generateTutorAnswer("What is scaffolding?", "en", [], {
      gemini: hang,
      groq: hang,
      openrouter: hang,
    }, { providerTimeoutMs: 50, answerDeadlineMs: 200 });
  } catch (e) {
    thrown = e;
  }
  const elapsed = Date.now() - started;
  check("All providers hanging -> DeadlineError thrown", thrown instanceof DeadlineError, thrown?.constructor?.name ?? "no throw");
  check("Deadline error is an AiError with the honest deadline message", thrown instanceof AiError && /overall deadline/i.test(thrown.message), thrown?.message ?? "");
  check("Deadline caps total time near 200ms (not seconds)", elapsed < 600, `${elapsed}ms`);
  check("Deadline was actually waited out (not a fast failure)", elapsed >= 150, `${elapsed}ms`);
}

// --- Retry attempts are logged as separate attempts with a retry marker ---
{
  const lines = [];
  const realLog = console.log;
  console.log = (...args) => lines.push(args.join(" "));
  try {
    await timedCall("gemini", "gemini-3.6-flash", async () => "ok", { attempt: 1, retry: false });
    await timedCall("gemini", "gemini-3.6-flash", async () => "ok", { attempt: 2, retry: true }).catch(() => {});
    await timedCall("groq", "openai/gpt-oss-120b", async () => {
      throw new Error("fetch failed");
    }, { attempt: 2, retry: true }).catch(() => {});
  } finally {
    console.log = realLog;
  }
  const parsed = lines.map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  }).filter(Boolean);
  const attempts = parsed.filter((p) => p.event === "tutor_provider_attempt");
  check("timedCall logs one JSON line per attempt", attempts.length === 3, `${attempts.length} lines`);
  check("First attempt logged with attempt 1, retry false", attempts[0]?.attempt === 1 && attempts[0]?.retry === false, JSON.stringify(attempts[0]));
  check("Retry logged as a separate attempt with retry marker", attempts[1]?.attempt === 2 && attempts[1]?.retry === true, JSON.stringify(attempts[1]));
  check("Failed retry logs ok:false with a transient error class", attempts[2]?.ok === false && attempts[2]?.errorClass === "network", JSON.stringify(attempts[2]));
  check("Log lines carry provider + model + durationMs", attempts.every((a) => a.provider && a.model && typeof a.durationMs === "number"));
}

// --- First-error preservation still holds with retries in the chain ---
{
  const r = await (async () => {
    let thrown = null;
    try {
      await generateTutorAnswer("What is scaffolding?", "en", [], {
        gemini: async () => {
          throw new Error("request timed out");
        },
        groq: async () => {
          throw new Error("API key not valid");
        },
        openrouter: async () => {
          throw new Error("OpenRouter third error");
        },
      }, BOUNDS);
    } catch (e) {
      thrown = e;
    }
    return thrown;
  })();
  check(
    "All fail with retries -> final message is Gemini's (first provider), not Groq/OpenRouter's",
    r instanceof AiError && r.message === "Gemini could not answer right now. Please try again in a moment.",
    r?.message ?? "no throw",
  );
}

console.log(failures === 0 ? "\nAll timeout/retry/deadline tests passed." : `\n${failures} test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
