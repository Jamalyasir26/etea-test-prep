// Phase 3 analysis topic-accuracy tests (W5) — source-pattern wiring
// checks on src/app/analysis/page.tsx. The section is specified in
// ~/workspace/phase3/BRIEF.md: topicStats memo from filteredAttempts
// via computeTopicStats, a new section after the provisional
// weak-areas block and before the last-14-days section, entry links
// to adaptive/revise practice, and NO drill links on topic rows
// (ItemRecord carries no subject key). Plain node, no dependencies.
// Run: node scripts/test-phase3-analysis.mjs (exit 0 = all pass).
// Checks match on distinctive substrings/regexes, never exact
// whitespace, so formatting changes do not break them.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(join(ROOT, "src/app/analysis/page.tsx"), "utf8");

let failures = 0;
let passes = 0;
function check(name, cond, detail = "") {
  if (cond) {
    passes += 1;
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---- bounds: the topic section runs from its heading key to the
// last-14-days heading key; the table block runs from <table> to
// </table> inside it. Drill-link assertions are bounded to the table
// block, so the entry links above the table do not trip them. ----
const sectionStart = src.indexOf('t("topicAccuracyHeading")');
const sectionEnd = src.indexOf("last14Heading", sectionStart);
const section = sectionStart >= 0 && sectionEnd > sectionStart ? src.slice(sectionStart, sectionEnd) : "";
const tableStart = section.indexOf("<table>");
const tableEnd = section.indexOf("</table>", tableStart);
const tableBlock =
  tableStart >= 0 && tableEnd > tableStart ? section.slice(tableStart, tableEnd + "</table>".length) : "";

check("analysis: topic section present before last14Heading", section.length > 0);
check(
  "analysis: topic section after provisional weak-areas block",
  src.indexOf("provisionalHeading") >= 0 &&
    src.indexOf("provisionalHeading") < sectionStart &&
    sectionStart < sectionEnd,
);
check("analysis: topic table block present inside section", tableBlock.length > 0);

// ---- §1 wiring: import + memo ----
check(
  "analysis: imports computeTopicStats from @/lib/practice-advance",
  /import\s*\{[^}]*computeTopicStats[^}]*\}\s*from\s*["']@\/lib\/practice-advance["']/.test(src),
);
check(
  "analysis: topicStats memo derives from filteredAttempts via computeTopicStats",
  /topicStats\s*=\s*useMemo\(\s*\(\)\s*=>\s*computeTopicStats\(filteredAttempts\)/.test(src),
);

// ---- §2 section copy keys ----
check("analysis: renders topicAccuracyHeading", section.includes('t("topicAccuracyHeading")'));
check("analysis: renders topicAccuracyIntro", section.includes('t("topicAccuracyIntro")'));
check(
  "analysis: empty state renders topicAccuracyEmpty when topicStats is empty",
  section.includes('topicStats.length === 0') && section.includes('t("topicAccuracyEmpty")'),
);

// ---- §3 table columns + provisional badge + LTR isolation ----
check("analysis: table column Topic uses topicWord", tableBlock.includes('t("topicWord")'));
check("analysis: table column Accuracy uses accuracy", tableBlock.includes('t("accuracy")'));
check("analysis: table column Correct uses correctWord", tableBlock.includes('t("correctWord")'));
check("analysis: table column Total uses totalWord", tableBlock.includes('t("totalWord")'));
check(
  "analysis: provisional badge when total < 5",
  tableBlock.includes('t("provisionalSmallSample")') && /total\s*<\s*5/.test(tableBlock),
);
check(
  "analysis: topic cells use dir=ltr with verbatim topic name",
  /dir="ltr">\s*\{s\.topic\}/.test(tableBlock),
);
check(
  "analysis: percentages isolated LTR",
  /<span dir="ltr">\s*\{Math\.round\(s\.accuracy\)\}%/.test(tableBlock),
);
check(
  "analysis: table uses scroll-region pattern with topicAccuracyTableAria",
  section.includes('className="table-scroll"') &&
    section.includes('role="region"') &&
    section.includes('t("topicAccuracyTableAria")') &&
    section.includes("tabIndex={0}"),
);

// ---- §4 NO drill links on topic rows ----
check("analysis: no drillHref() call inside topic-table block", !tableBlock.includes("drillHref("));
check("analysis: no Link inside topic-table block", !tableBlock.includes("<Link"));
check("analysis: no href built inside topic-table block", !tableBlock.includes("href="));

// ---- §5 entry links above the table ----
check(
  "analysis: entry links gated on stats.hasData",
  section.includes("stats.hasData") && section.indexOf("stats.hasData") < section.indexOf("<table>"),
);
check("analysis: adaptive entry link renders adaptiveDrillLink", section.includes('t("adaptiveDrillLink")'));
check("analysis: revise entry link renders reviseDrillLink", section.includes('t("reviseDrillLink")'));
check(
  "analysis: adaptive href appends mode=adaptive to drillHref of weakest subject",
  src.includes("stats.weakest[0]?.subject") &&
    src.includes("drillHref(weakestSubject)") &&
    src.includes("&mode=adaptive"),
);
check(
  "analysis: adaptive fallback is /practice?mode=adaptive when no weakest subject",
  src.includes('"/practice?mode=adaptive"'),
);
check(
  "analysis: revise href is /practice?mode=revise",
  section.includes('href="/practice?mode=revise"') && src.includes("/practice?mode=revise"),
);

if (failures > 0) {
  console.log(`\n${failures} FAILURES (${passes} passed)`);
  process.exit(1);
}
console.log(`\nAll Phase 3 analysis checks passed (${passes} checks).`);
