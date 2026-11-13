// Phase 4A tests: (1) the 196-item translation-verification queue is
// REMOVED from /review (owner decision — personal use, no manual
// verification needed) while the pending labels, bank data, and
// displayExplanation() logic stay; (2) the Home stats loading skeleton
// renders while stats/plan/due data loads and the real values replace
// it after mount. Plain node, no dependencies; source-level assertions
// (the repo's suites cannot mount React — the live browser check
// confirms the visual swap). Run: node scripts/test-phase4a.mjs
// (exit 0 = all pass)
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(join(ROOT, p), "utf8");

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// --------------------------------- §1 queue removal (/review)
const review = read("src/app/review/page.tsx");
check("4A queue section gone: no heading key", !review.includes("pendingEnglishHeading"));
check("4A queue section gone: no intro key", !review.includes("pendingEnglishIntro"));
check("4A queue section gone: no show-more key", !review.includes("pendingEnglishShowMore"));
check("4A queue section gone: no paging state", !review.includes("pendingVisible"));
check("4A queue section gone: no helper call", !review.includes("pendingEnglishExplanations()"));
check("4A queue section gone: no pendingShown list", !review.includes("pendingShown"));
check("4A review still renders displayExplanation on cards", review.includes("displayExplanation(q, lang)"));
check("4A review cards still show the pending label", review.includes("explanationPendingLabel"));
check("4A review still lists durable flags", review.includes("loadFlags()") && review.includes("flagsHeading") && review.includes("flagsRemove") && review.includes("flagsClearAll"));
check("4A review heading + filters intact", review.includes("reviewTitle") && review.includes("mockFilterLabel") && review.includes("postFilterLabel"));

// --------------------------------- §2 labels + data + logic kept
const data = read("src/lib/data.ts");
check("4A displayExplanation kept", data.includes("export function displayExplanation"));
check("4A pendingEnglishExplanations helper kept (tests)", data.includes("export function pendingEnglishExplanations"));
check("4A helper comment notes the Phase 4A removal", data.includes("Phase 4A: the /review queue UI"));
const qr = read("src/components/QuizRunner.tsx");
check("4A QuizRunner still renders displayExplanation + pending label", qr.includes("displayExplanation(p.question, lang)") && qr.includes("explanationPendingLabel"));
const i18n = read("src/lib/i18n.tsx");
check("4A explanationPendingLabel key kept", i18n.includes("explanationPendingLabel:"));
check("4A queue keys removed from i18n", !i18n.includes("pendingEnglishHeading:") && !i18n.includes("pendingEnglishIntro:") && !i18n.includes("pendingEnglishShowMore:"));

// --------------------------------- §3 Home stats skeleton
const home = read("src/app/page.tsx");
check("4A home imports the Skeleton primitive", home.includes('import { Skeleton } from "@/components/ui/skeleton"'));
check("4A skeleton renders only while stats is null", home.includes("{stats ? (") && home.includes("aria-busy=\"true\""));
check("4A skeleton has a status announcement", home.includes('role="status"') && home.includes('t("statsLoading")'));
check("4A skeleton grid mirrors the 6-card grid shape", home.includes('[0, 1, 2, 3, 4, 5].map((i) => (') && home.includes('aria-hidden="true"'));
check("4A skeleton bars are Skeleton primitives, not numbers", home.includes("<Skeleton className=\"tw:h-9 tw:w-24\"") && home.includes("<Skeleton className=\"tw:h-4 tw:w-32\"") && home.includes("<Skeleton className=\"tw:h-3 tw:w-40\""));
check("4A real grid still gated on loaded stats", home.includes("stats.totalAttempts") && home.includes("stats.streakDays") && home.includes("{planDone} / 63"));
check("4A skeleton branch carries no computed values", (() => {
  const start = home.indexOf("aria-busy=\"true\"");
  const branch = home.slice(start, home.indexOf("Step 2a — the empty state", start));
  return !branch.includes("stats.") && !branch.includes("planDone") && !branch.includes("dueCards") && !branch.includes("buckets");
})());
check("4A statsLoading key present (en + ur)", i18n.includes("statsLoading:") && i18n.includes('en: "Loading..."') && i18n.includes('ur: "لوڈ ہو رہا ہے..."'));
check("4A Start Here card still gated (no wrong-variant flash)", home.includes("Rendered only once stats load") && home.includes("{stats && ("));

// --------------------------------- §4 bank data: Phase 4A added none;
// Phase 4B1 added 56 MCQs (30 IT + 26 PE) and Phase 4B2 added 62
// (30 Drawing + 32 Tajweed) to the 645 F02-audited items.
// (drawing_pe.json is the legacy combined file data.ts does not load;
// excluding it, the banks hold exactly the 763 items.)
const bankFiles = fs.readdirSync(join(ROOT, "src/data/banks")).filter((f) => f.endsWith(".json") && f !== "drawing_pe.json");
let bankQs = [];
for (const f of bankFiles) bankQs = bankQs.concat(JSON.parse(fs.readFileSync(join(ROOT, "src/data/banks", f), "utf8")));
check("4A bank total still 763 questions", bankQs.length === 763, String(bankQs.length));
check("4A explanationEn count still 124", bankQs.filter((q) => q.explanationEn).length === 124);
check("4A roman-marker count still 196", bankQs.filter((q) => q.explanationLang === "roman").length === 196);

if (failures > 0) {
  console.log(`\n${failures} FAILURES`);
  process.exit(1);
} else {
  console.log("\nAll Phase 4A tests passed.");
}
