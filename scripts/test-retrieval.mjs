// Retrieval tests — plain node, no dependencies.
// Verifies the Stage 1 P0.3 library gaps found in the Stage 0 live eval
// are closed: the tutor's RAG retrieval must now find the Ikhfa and
// Al-Fa'il material. src/lib/data.ts imports JSON, which plain node cannot
// import from .ts, so the script first compiles data.ts to CommonJS in
// /tmp with tsc (the same approach used to diagnose the gap) and tests
// the COMPILED real retrieve() — not a copy of it.
// Run: node scripts/test-retrieval.mjs  (exit 0 = all pass)
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/stage1p0-retrieval";
execSync(
  `npx tsc src/lib/data.ts --outDir ${OUT} --module commonjs --target es2020 --resolveJsonModule --esModuleInterop --skipLibCheck --moduleResolution node`,
  { cwd: ROOT, stdio: "ignore" },
);
const require = createRequire(import.meta.url);
const { retrieve, NOTES, QUESTIONS, BY_ID } = require(join(OUT, "lib/data.js"));

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
function noteTitles(r) {
  return r.notes.map((n) => n.title);
}

// --- The Stage 0 eval gaps ---
// V-L3 (Roman Urdu): "Ikhfa kya hota hai aur Noon Sakinah ke rules kya hain?"
// Before P0.3 the dedicated Ikhfa note did not exist; the tutor's excerpts
// held one sentence on Ikhfa inside a longer note. The bar is: the new
// dedicated Ikhfa note is picked up in the top 5 (contextBlock's window).
const vL3 = retrieve("Ikhfa kya hota hai aur Noon Sakinah ke rules kya hain?", 5, 5);
check(
  "V-L3: new Ikhfa note is picked up in the top 5",
  noteTitles(vL3).includes("Ikhfa — Hiding the Noon Sound (إخفاء)"),
  `top 5: ${noteTitles(vL3).join(" | ")}`,
);
check(
  "V-L3: a new Ikhfa MCQ (TAJ-031..050) is retrieved",
  vL3.questions.some((q) => /^TAJ-0(3[1-9]|4[0-9]|50)$/.test(q.id)),
  `questions: ${vL3.questions.map((q) => q.id).join(", ")}`,
);

// V-L4 (Arabic): "ما هو الفاعل في النحو؟" — before P0.3 this retrieved NOTHING.
const vL4 = retrieve("ما هو الفاعل في النحو؟", 5, 5);
check(
  "V-L4: new Al-Fa'il note is retrieved (Arabic script match)",
  noteTitles(vL4).includes("Al-Fa'il — The Doer (الفاعل) in Nahw (النحو)"),
  `top 5: ${noteTitles(vL4).join(" | ") || "(none)"}`,
);
check(
  "V-L4: a Fa'il MCQ is retrieved",
  vL4.questions.some((q) => ["ARB-061", "ARB-062", "ARB-063", "ARB-064"].includes(q.id)),
  `questions: ${vL4.questions.map((q) => q.id).join(", ") || "(none)"}`,
);

// --- Other new topics retrieve ---
const qalqalah = retrieve("What is Qalqalah and how many Qalqalah letters are there?", 5, 5);
check(
  "Qalqalah note retrieved",
  noteTitles(qalqalah).includes("Qalqalah — The Echo Letters (قلقلة)"),
  `top 5: ${noteTitles(qalqalah).join(" | ")}`,
);
const mafoul = retrieve("ما هو المفعول به؟", 5, 5);
check(
  "Maf'ul Bihi note retrieved (Arabic query)",
  noteTitles(mafoul).includes("Al-Maf'ul Bihi — The Object (المفعول به)"),
  `top 5: ${noteTitles(mafoul).join(" | ") || "(none)"}`,
);
const madd = retrieve("How many counts is Madd Lazim?", 5, 5);
check(
  "Madd note retrieved",
  noteTitles(madd).some((t) => t.includes("Madd")),
  `top 5: ${noteTitles(madd).join(" | ")}`,
);
const seerat = retrieve("In which year did the Hijrah take place?", 5, 5);
check(
  "Seerat/Hijrah note retrieved",
  noteTitles(seerat).some((t) => t.includes("Hijrah")),
  `top 5: ${noteTitles(seerat).join(" | ")}`,
);

// --- Regression: previously working retrieval still works ---
const vL1 = retrieve("What is scaffolding in pedagogy?", 5, 5);
check(
  "V-L1 regression: scaffolding note still retrieved",
  noteTitles(vL1).some((t) => t.toLowerCase().includes("scaffolding")),
  `top 5: ${noteTitles(vL1).join(" | ")}`,
);

// --- Out-of-scope sanity: the new notes must not hijack unrelated queries ---
const vL6 = retrieve("What is the capital of Australia?", 5, 5);
check(
  "V-L6 sanity: no Tajweed/Arabic note in top 5 for an out-of-scope query",
  !noteTitles(vL6).some((t) => /Ikhfa|Fa'il|Qalqalah|Madd|Maf'ul/.test(t)),
  `top 5: ${noteTitles(vL6).join(" | ")}`,
);

// --- New content is present, labelled, and draft ---
const newNoteTitles = [
  "Ikhfa — Hiding the Noon Sound (إخفاء)",
  "Idgham — Merging into the Next Letter (إدغام)",
  "Qalqalah — The Echo Letters (قلقلة)",
  "Madd Types Compared — How Long to Stretch (مد)",
  "Iqlab — Turning Noon into Meem (إقلاب)",
  "Common Tajweed Mistakes to Avoid",
  "Al-Fa'il — The Doer (الفاعل) in Nahw (النحو)",
  "Al-Maf'ul Bihi — The Object (المفعول به)",
  "Al-Mubtada' and Al-Khabar in Detail (المبتدأ والخبر)",
  "Sarf — Roots and Verb Patterns (صرف)",
  "I'rab Signs — How Case Endings Show (إعراب)",
  "Wahi — The First Revelation (وحی)",
  "Hadith — What It Is and How It Is Preserved (حدیث)",
  "Seerat — The Hijrah and the Madani Period (ہجرت)",
  "Fiqh — The Four Schools and Their Founders (فقہ)",
];
const allNotes = Object.values(NOTES).flat();
for (const t of newNoteTitles) {
  const n = allNotes.find((x) => x.title === t);
  check(
    `note present + labelled: ${t.slice(0, 40)}…`,
    !!n && typeof n.source === "string" && n.source.startsWith("Original content — concept-extracted from "),
    n ? `source: ${n.source}` : "missing",
  );
}
const newIds = [
  ...Array.from({ length: 20 }, (_, i) => `TAJ-${String(i + 31).padStart(3, "0")}`),
  ...Array.from({ length: 20 }, (_, i) => `ARB-${String(i + 61).padStart(3, "0")}`),
  ...Array.from({ length: 15 }, (_, i) => `ISL-${String(i + 91).padStart(3, "0")}`),
];
let draftBad = [];
let sourceBad = [];
for (const id of newIds) {
  const q = BY_ID[id];
  if (!q) {
    draftBad.push(`${id} missing`);
    continue;
  }
  if (q.reviewStatus !== "draft" || q.verified !== false) draftBad.push(id);
  if (typeof q.source !== "string" || !q.source.startsWith("Original content — concept-extracted from ")) sourceBad.push(id);
  if (q.options.length !== 4 || new Set(q.options.map((o) => o.trim().toLowerCase())).size !== 4) draftBad.push(`${id} options`);
  if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) draftBad.push(`${id} correctIndex`);
  if (typeof q.explanation !== "string" || q.explanation.length < 20) draftBad.push(`${id} explanation`);
}
check("all 55 new MCQs present, draft, unverified, 4 distinct options, valid correctIndex", draftBad.length === 0, draftBad.slice(0, 5).join(", "));
check("all 55 new MCQs carry the concept-extraction source label", sourceBad.length === 0, sourceBad.slice(0, 5).join(", "));
check("bank total is 645", QUESTIONS.length === 645, `got ${QUESTIONS.length}`);

console.log(failures === 0 ? "\nAll retrieval tests passed." : `\n${failures} retrieval test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
