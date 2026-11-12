// Tutor language tests (Stage 1 P1 Tier 2) — plain node, no
// dependencies. Compiles the real ai.ts to CommonJS in /tmp with tsc
// (same pattern as scripts/test-fallback-chain.mjs) and tests the
// COMPILED real code. Covers: normalizeTutorLang accepts en/roman/ur/ar
// and falls back to en for anything else; the Arabic instruction reaches
// the generation prompt (stub impl captures the prompt — the library
// excerpts are untouched, the ANSWER language is what changes); and the
// wiring checks that all three API routes (tutor/explain/plan — they
// share the generation path) validate through the helper, and that the
// tutor page sends the tutor language with an Arabic option.
// Live Arabic answering needs a post-deploy live call — this suite
// proves the instruction reaches the model, not the model's reply.
// Run: node scripts/test-tutor-lang.mjs  (exit 0 = all pass)

process.env.GEMINI_API_KEY = "test-fake-key";
process.env.GROQ_API_KEY = "test-fake-key";
process.env.OPENROUTER_API_KEY = "test-fake-key";

import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/stage1p1-tutorlang";
execSync(
  `npx tsc src/lib/ai.ts --outDir ${OUT} --module commonjs --target es2020 --resolveJsonModule --esModuleInterop --skipLibCheck --moduleResolution node`,
  { cwd: ROOT, stdio: "ignore" },
);
const nmLink = path.join(OUT, "node_modules");
if (!fs.existsSync(nmLink)) fs.symlinkSync(path.join(ROOT, "node_modules"), nmLink, "dir");
const require = createRequire(import.meta.url);

const { normalizeTutorLang, TUTOR_LANGS, generateTutorAnswer } = require(path.join(OUT, "lib/ai.js"));

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// --- Validation: ar accepted, garbage falls back to en ---
check("normalizeTutorLang accepts en", normalizeTutorLang("en") === "en");
check("normalizeTutorLang accepts roman", normalizeTutorLang("roman") === "roman");
check("normalizeTutorLang accepts ur", normalizeTutorLang("ur") === "ur");
check("normalizeTutorLang accepts ar", normalizeTutorLang("ar") === "ar");
check("normalizeTutorLang rejects garbage -> en", normalizeTutorLang("xx") === "en");
check("normalizeTutorLang rejects undefined -> en", normalizeTutorLang(undefined) === "en");
check("normalizeTutorLang rejects null -> en", normalizeTutorLang(null) === "en");
check("normalizeTutorLang rejects a number -> en", normalizeTutorLang(123) === "en");
check("normalizeTutorLang is case-sensitive (AR -> en)", normalizeTutorLang("AR") === "en");
check("normalizeTutorLang rejects padded input -> en", normalizeTutorLang(" ar") === "en");
check("TUTOR_LANGS lists all four languages", JSON.stringify([...TUTOR_LANGS]) === JSON.stringify(["en", "roman", "ur", "ar"]));

// --- The Arabic instruction reaches the generation prompt ---
async function capturePrompt(lang) {
  let captured = "";
  const stub = async (prompt) => {
    captured = prompt;
    return "stub answer";
  };
  await generateTutorAnswer("Ikhfa kya hota hai?", lang, [], {
    gemini: stub,
    groq: stub,
    openrouter: stub,
  });
  return captured;
}
{
  const promptAr = await capturePrompt("ar");
  check("lang=ar -> prompt instructs Arabic", promptAr.includes("Answer in Arabic (العربية)."), promptAr.slice(-160));
  check("lang=ar -> prompt still carries the library excerpts", promptAr.includes("LIBRARY EXCERPTS"));
  check("lang=ar -> prompt still carries the user question", promptAr.includes("Ikhfa kya hota hai?"));
  const promptUr = await capturePrompt("ur");
  check("lang=ur -> prompt instructs Urdu", promptUr.includes("Answer in Urdu (اردو)."));
  const promptRoman = await capturePrompt("roman");
  check("lang=roman -> prompt instructs Roman Urdu", promptRoman.includes("Answer in Roman Urdu"));
  const promptEn = await capturePrompt("en");
  check("lang=en -> prompt instructs English", promptEn.includes("Answer in English."));
  const promptGarbage = await capturePrompt("xx");
  check("Unknown lang passed straight to the chain -> English fallback instruction", promptGarbage.includes("Answer in English."));
}

// --- Route + page wiring (static checks: no browser in this session) ---
for (const route of ["tutor", "explain", "plan"]) {
  const src = fs.readFileSync(path.join(ROOT, "src", "app", "api", route, "route.ts"), "utf8");
  check(`/${route} route validates lang through normalizeTutorLang`, src.includes("normalizeTutorLang(body.lang)"));
  check(`/${route} route has no stale 3-language allow-list`, !src.includes('["en", "roman", "ur"]'));
}
{
  const src = fs.readFileSync(path.join(ROOT, "src", "app", "tutor", "page.tsx"), "utf8");
  check("Tutor page offers an Arabic option (value ar)", src.includes('value: "ar"'));
  check("Tutor page labels the option العربية", src.includes("العربية"));
  check("Tutor page persists the tutor language under its own key", src.includes("etea_tutor_lang_next"));
  check("Tutor page sends the tutor language to /api/tutor", src.includes("lang: effectiveTutorLang"));
  check("Tutor page sends the tutor language to /api/explain", src.includes("questionId: id, lang: effectiveTutorLang"));
  check("Tutor page keeps the site-wide toggle untouched (still uses useLang)", src.includes("useLang()"));
}

console.log(failures === 0 ? "\nAll tutor language tests passed." : `\n${failures} test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
