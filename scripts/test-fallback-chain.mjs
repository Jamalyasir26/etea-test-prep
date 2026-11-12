// Fallback-chain + Tier 1 model/probe tests — plain node, no dependencies.
// ai.ts imports JSON (via data.ts) and extensionless ./data, which plain
// node cannot import from .ts, so — like scripts/test-retrieval.mjs — the
// script first compiles the real ai.ts to CommonJS in /tmp with tsc and
// tests the COMPILED real generateTutorAnswer() — not a copy of it.
// No live keys, no network: provider calls are stubbed through
// generateTutorAnswer's injectable `impls` argument.
// Covers: provider fallback order (Gemini -> Groq -> OpenRouter), first
// error preserved, unconfigured providers skipped, Tier 1 model constants
// (Groq gpt-oss-120b, OpenRouter gemma-4-31b :free), the 15 s probe bound,
// the timeout hint, and the /review attribution fallback (bank fields
// when no localStorage record exists).
// Run: node scripts/test-fallback-chain.mjs  (exit 0 = all pass)

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
const OUT = "/tmp/stage1p1-fallback";
execSync(
  `npx tsc src/lib/ai.ts --outDir ${OUT} --module commonjs --target es2020 --resolveJsonModule --esModuleInterop --skipLibCheck --moduleResolution node`,
  { cwd: ROOT, stdio: "ignore" },
);
// The compiled ai.js requires @google/genai + groq-sdk; point its /tmp
// tree at the project's installed deps.
const nmLink = path.join(OUT, "node_modules");
if (!fs.existsSync(nmLink)) fs.symlinkSync(path.join(ROOT, "node_modules"), nmLink, "dir");
const require = createRequire(import.meta.url);

const {
  GEMINI_MODEL,
  GROQ_MODEL,
  OPENROUTER_MODEL,
  PROBE_TIMEOUT_MS,
  TIMEOUT_HINT,
  generateTutorAnswer,
  classifyProviderError,
  AiError,
} = require(path.join(OUT, "lib/ai.js"));
const { reviewAttribution, BY_ID } = require(path.join(OUT, "lib/data.js"));

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const failWith = (msg) => async () => {
  throw new Error(msg);
};
const okWith = (text) => async () => text;

// --- Tier 1 model constants (researched 2026-11-12, see VERIFY-p1-tier1.md) ---
check("Groq model is openai/gpt-oss-120b (Groq's replacement for dead llama-3.3-70b)", GROQ_MODEL === "openai/gpt-oss-120b", GROQ_MODEL);
check("OpenRouter model is google/gemma-4-31b-it:free", OPENROUTER_MODEL === "google/gemma-4-31b-it:free", OPENROUTER_MODEL);
check("OpenRouter model is a :free model (can never incur a charge)", OPENROUTER_MODEL.endsWith(":free"));
check("Gemini model unchanged (gemini-3.6-flash)", GEMINI_MODEL === "gemini-3.6-flash", GEMINI_MODEL);
check("Probe bound is 15s (was 10s)", PROBE_TIMEOUT_MS === 15000, String(PROBE_TIMEOUT_MS));
check("Timeout hint tells the caller to retry once", /retry once/i.test(TIMEOUT_HINT));
check("Timeout error classifies as timeout", classifyProviderError(new Error("Gemini probe timed out after 15000ms")) === "timeout");
check("404 still classifies as model_not_found", classifyProviderError(new Error("404 model not found")) === "model_not_found");
check("402 classifies as payment (Groq paid-model risk is visible, not hidden)", classifyProviderError({ status: 402, message: "payment required" }) === "payment");

// --- Fallback chain order (stubbed impls, no network) ---
{
  const order = [];
  const rec = (name, fn) => async (prompt) => {
    order.push(name);
    return fn(prompt);
  };
  const r = await generateTutorAnswer("What is scaffolding?", "en", [], {
    gemini: rec("gemini", okWith("gemini answer")),
    groq: rec("groq", okWith("groq answer")),
    openrouter: rec("openrouter", okWith("openrouter answer")),
  });
  check("Gemini success: only Gemini called", order.join(",") === "gemini", order.join(","));
  check("Gemini success: provider is gemini", r.provider === "gemini" && r.text === "gemini answer");
}
{
  const order = [];
  const rec = (name, fn) => async (prompt) => {
    order.push(name);
    return fn(prompt);
  };
  const r = await generateTutorAnswer("What is scaffolding?", "en", [], {
    gemini: rec("gemini", failWith("Gemini 503 unavailable")),
    groq: rec("groq", okWith("groq answer")),
    openrouter: rec("openrouter", okWith("openrouter answer")),
  });
  check("Gemini fails -> Groq attempted next, OpenRouter NOT called", order.join(",") === "gemini,groq", order.join(","));
  check("Gemini fails -> Groq answers, provider is groq", r.provider === "groq" && r.text === "groq answer");
}
{
  const order = [];
  const rec = (name, fn) => async (prompt) => {
    order.push(name);
    return fn(prompt);
  };
  const r = await generateTutorAnswer("What is scaffolding?", "en", [], {
    gemini: rec("gemini", failWith("Gemini 503 unavailable")),
    groq: rec("groq", failWith("Groq 404 model not found")),
    openrouter: rec("openrouter", okWith("openrouter answer")),
  });
  check("Gemini+Groq fail -> OpenRouter attempted last", order.join(",") === "gemini,groq,openrouter", order.join(","));
  check("Gemini+Groq fail -> OpenRouter answers, provider is openrouter", r.provider === "openrouter");
}
{
  const order = [];
  const rec = (name, fn) => async (prompt) => {
    order.push(name);
    return fn(prompt);
  };
  let thrown = null;
  try {
    await generateTutorAnswer("What is scaffolding?", "en", [], {
      gemini: rec("gemini", failWith("Gemini first error")),
      groq: rec("groq", failWith("Groq second error")),
      openrouter: rec("openrouter", failWith("OpenRouter third error")),
    });
  } catch (e) {
    thrown = e;
  }
  check("All fail -> all three attempted in order", order.join(",") === "gemini,groq,openrouter", order.join(","));
  // The FIRST provider's error is preserved (mapped to its user-facing
  // message by classifyGeminiError) — never Groq's or OpenRouter's text.
  check(
    "All fail -> final message is Gemini's (first provider), not Groq/OpenRouter's",
    thrown instanceof AiError && thrown.message === "Gemini could not answer right now. Please try again in a moment.",
    thrown?.message ?? "no throw",
  );
  let thrownKey = null;
  try {
    await generateTutorAnswer("What is scaffolding?", "en", [], {
      gemini: rec("gemini", failWith("API key not valid. Please pass a valid API key.")),
      groq: rec("groq", failWith("Groq second error")),
      openrouter: rec("openrouter", failWith("OpenRouter third error")),
    });
  } catch (e) {
    thrownKey = e;
  }
  check(
    "All fail -> Gemini invalid-key error keeps its invalid-key message",
    thrownKey instanceof AiError && /invalid key/i.test(thrownKey.message),
    thrownKey?.message ?? "no throw",
  );
}
{
  // Groq unconfigured: skipped entirely, OpenRouter answers after Gemini fails.
  delete process.env.GROQ_API_KEY;
  const order = [];
  const rec = (name, fn) => async (prompt) => {
    order.push(name);
    return fn(prompt);
  };
  const r = await generateTutorAnswer("What is scaffolding?", "en", [], {
    gemini: rec("gemini", failWith("Gemini 503 unavailable")),
    groq: rec("groq", okWith("groq answer")),
    openrouter: rec("openrouter", okWith("openrouter answer")),
  });
  check("Groq unconfigured -> skipped, OpenRouter answers", order.join(",") === "gemini,openrouter" && r.provider === "openrouter", order.join(","));
  process.env.GROQ_API_KEY = "test-fake-key";
}

// --- /review attribution fallback (Stage 1 P1 Tier 1) ---
{
  const fakeQ = { id: "TST-001", reviewStatus: "owner-reviewed", reviewedBy: "owner", reviewedAt: "2026-11-11T22:23:00Z" };
  const a1 = reviewAttribution(fakeQ, null);
  check("Attribution: no override -> bank reviewedBy/reviewedAt", a1.by === "owner" && a1.at === "2026-11-11T22:23:00Z", JSON.stringify(a1));
  const a2 = reviewAttribution(fakeQ, { reviewedBy: "owner", reviewedAt: "2026-11-12T03:01:56Z" });
  check("Attribution: local override wins over bank", a2.by === "owner" && a2.at === "2026-11-12T03:01:56Z", JSON.stringify(a2));
  const a3 = reviewAttribution({ id: "TST-002" }, null);
  check("Attribution: draft item with neither source -> nulls", a3.by === null && a3.at === null, JSON.stringify(a3));

  // The 15 real owner-verified items (P1T0 deploy) must all render attribution now.
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const bankDir = path.join(dir, "..", "src", "data", "banks");
  const verifiedIds = [];
  for (const f of fs.readdirSync(bankDir)) {
    if (!f.endsWith(".json")) continue;
    const bank = JSON.parse(fs.readFileSync(path.join(bankDir, f), "utf8"));
    const qs = Array.isArray(bank) ? bank : bank.questions ?? [];
    for (const q of qs) if (q.reviewStatus === "owner-reviewed") verifiedIds.push(q.id);
  }
  check("Bank holds exactly 15 owner-reviewed items", verifiedIds.length === 15, verifiedIds.join(","));
  const bad = verifiedIds.filter((id) => {
    const q = BY_ID[id];
    if (!q) return true;
    const a = reviewAttribution(q, null);
    return a.by !== "owner" || typeof a.at !== "string" || a.at.length === 0;
  });
  check("All 15 verified items render owner attribution from bank fields", bad.length === 0, bad.join(","));
}

console.log(failures === 0 ? "\nAll fallback-chain tests passed." : `\n${failures} test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
