// Phase 3 practice-page UI tests (W6) — source-pattern wiring checks
// on src/app/practice/page.tsx: mode selector + ?mode= parsing, the
// PRACTICE_STATE_KEY write gated to standard mode, byte-identical
// standard/untimed scope + key, the :t scope suffix iff timed, revise
// scope/queue/empty-state wiring, adaptive scope/set/statsHash, the
// transparency line keys, and the timed minutes options. Plain node,
// no dependencies. Run: node scripts/test-phase3-practice-ui.mjs
// (exit 0 = all pass). Checks use distinctive substrings, not exact
// whitespace, so formatting churn does not break them.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

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
const read = (p) => fs.readFileSync(join(ROOT, p), "utf8");

const src = read("src/app/practice/page.tsx");

// ---- §1 imports: the page codes against the frozen BRIEF APIs ----
check(
  "imports buildAdaptiveSet/buildReviseQueue/computeTopicStats from @/lib/practice-advance",
  src.includes('from "@/lib/practice-advance"') &&
    src.includes("buildAdaptiveSet") &&
    src.includes("buildReviseQueue") &&
    src.includes("computeTopicStats"),
);
check("imports findQuestionsByIds from @/lib/data", src.includes("findQuestionsByIds") && src.includes('from "@/lib/data"'));
check("imports loadAttempts from @/lib/tracking", src.includes("loadAttempts") && src.includes('from "@/lib/tracking"'));

// ---- §2 mode selector + ?mode= parsing ----
check("mode selector select carries aria-label practiceModeLabel", src.includes('aria-label={t("practiceModeLabel")}'));
check(
  "mode options use practiceModeStandard/Revise/Adaptive keys",
  src.includes('t("practiceModeStandard")') &&
    src.includes('t("practiceModeRevise")') &&
    src.includes('t("practiceModeAdaptive")'),
);
check(
  "mode options carry standard/revise/adaptive values",
  src.includes('value="standard"') && src.includes('value="revise"') && src.includes('value="adaptive"'),
);
check(
  "initial mode parses ?mode=: revise|adaptive, else standard",
  src.includes('params.get("mode")') &&
    src.includes('modeParam === "revise"') &&
    src.includes('modeParam === "adaptive"'),
);

// ---- §3 PRACTICE_STATE_KEY write gated to standard mode ----
check(
  "write effect returns early outside standard mode",
  src.includes('if (mode !== "standard") return;'),
);
check(
  "standard write payload unchanged (subjectKey/round/seed)",
  src.includes("safeWrite(PRACTICE_STATE_KEY, JSON.stringify({ subjectKey, round, seed }))"),
);
check("write effect depends on mode + standard state", src.includes("}, [mode, subjectKey, round, seed]);"));
check(
  "mode rule documented: only standard writes, P1 resume not implemented",
  src.includes("ONLY standard mode writes PRACTICE_STATE_KEY") &&
    src.includes("P1 per-subject resume is NOT implemented"),
);
check(
  "revise/adaptive use in-memory round/seed (Date.now() at mount)",
  src.includes("altRound") && src.includes("altSeed") && src.includes("useState(() => Date.now())"),
);

// ---- §4 standard mode: byte-identical untimed behaviour ----
check(
  "standard scope base template unchanged",
  src.includes("practice:${subjectKey}:${round}"),
);
check("standard scope count suffix stays :c<count> when count != 20", src.includes("`:c${count}`"));
check(
  "standard sampling unchanged (seeded shuffle, slice count)",
  src.includes("hashSeed(`${subjectKey}-${round}-${seed}`)") &&
    src.includes("shuffled(bank ?? [], rand).slice(0, count)"),
);
check(
  "standard restore unchanged (pure resolver call)",
  src.includes("resolvePracticeInitial(initial, stored"),
);
check("standard QuizRunner key base unchanged", src.includes("`${subjectKey}-${round}-${count}${timedKeySuffix}`"));
check("standard QuizRunner questionSeed unchanged", src.includes("questionSeed={String(seed)}"));
check("?count= clamp stays 5–20", src.includes("Math.min(20, Math.max(5, Math.floor(countParam)))"));

// ---- §5 timed toggle: :t suffix present iff timed ----
check(
  "timed scope suffix is exactly one gated definition",
  (src.match(/:t\$\{timedMinutes\}/g) || []).length === 1 &&
    src.includes("timedEnabled ? `:t${timedMinutes}` : \"\""),
);
check(
  "timed key suffix is exactly one gated definition",
  (src.match(/-t\$\{timedMinutes\}/g) || []).length === 1 &&
    src.includes("timedEnabled ? `-t${timedMinutes}` : \"\""),
);
check(
  "both timed scopes (standard + adaptive) use the gated suffix",
  src.includes("standardScope") &&
    src.includes("adaptiveScope") &&
    (src.match(/timedScopeSuffix/g) || []).length >= 3,
);
check("timed toggle defaults OFF, default 10 minutes", src.includes("useState(false)") && src.includes("useState(10)"));
check(
  "timed controls use timedToggleLabel/timedMinutesLabel/timedMinutesAria keys",
  src.includes('t("timedToggleLabel")') &&
    src.includes('t("timedMinutesLabel")') &&
    src.includes('aria-label={t("timedMinutesAria")}'),
);
check("timed expiry note shown when ON", src.includes('t("timedExpiryNote")'));
check("timed minutes options are 5/10/15/20/30", src.includes("[5, 10, 15, 20, 30]"));
check(
  "minutes prop passed conditionally (standard + adaptive only)",
  (src.match(/minutes=\{timedEnabled \? timedMinutes : 0\}/g) || []).length === 2,
);
check(
  "no unconditional literal minutes value",
  !/minutes=\{\d+\}/.test(src) && !/minutes="\d+"/.test(src),
);

// ---- §6 revise mode ----
const subjIdx = src.indexOf('aria-label={t("subjectWord")}');
check(
  "subject selector hidden in revise mode",
  subjIdx > 0 && src.slice(Math.max(0, subjIdx - 300), subjIdx).includes('mode !== "revise"'),
);
check("revise queue derived via buildReviseQueue(loadAttempts())", src.includes("buildReviseQueue(loadAttempts())"));
check("revise takes first count ids", src.includes("queue.slice(0, count)"));
check("revise loads questions with findQuestionsByIds", src.includes("findQuestionsByIds(queueIds)"));
check(
  "queueHash = hashSeed(queueIds.join(','))",
  src.includes('hashSeed(reviseQueueIds.join(","))'),
);
check("revise scope is practice:revise:<queueHash>", src.includes("practice:revise:${queueHash}"));
check("revise questionSeed is String(queueHash)", src.includes("questionSeed={String(queueHash)}"));
check("revise QuizRunner key includes queueHash + count", src.includes("`revise-${queueHash}-${count}`"));
check("revise QuizRunner title is reviseTitle", src.includes('title={t("reviseTitle")}'));
check(
  "revise shows queue count (tf {n}) + cleared note",
  src.includes('tf("reviseQueueCount", { n: reviseQueueLength })') && src.includes('t("reviseClearedNote")'),
);
check(
  "empty queue / all ids missing renders empty state, no QuizRunner mount",
  src.includes("reviseQuestions.length === 0") &&
    src.includes('t("reviseEmpty")') &&
    src.indexOf('t("reviseEmpty")') < src.indexOf("practice:revise:${queueHash}"),
);
check(
  "revise loading/error mirrors the bank pattern (offline/error + retry)",
  src.includes('t(reviseError === "offline" ? "bankLoadFailedOffline" : "bankLoadFailed")') &&
    src.includes("setReviseRetryNonce((n) => n + 1)"),
);
check("revise new-set re-derives the queue", src.includes("setReviseNonce((n) => n + 1)"));

// ---- §7 adaptive mode ----
check("adaptive topic stats via computeTopicStats(loadAttempts())", src.includes("computeTopicStats(loadAttempts())"));
check(
  "statsHash = hashSeed(topic:correct/total joined by |)",
  src.includes("statsHash") && src.includes("s.topic}:${s.correct}/${s.total}") && src.includes('.join("|")'),
);
check(
  "adaptive set built with buildAdaptiveSet + seed string",
  src.includes("buildAdaptiveSet({ bank: bank ?? [], topicStats, count, seed: adaptiveSeed })") &&
    src.includes("adaptiveSeed = `${altSubjectKey}-${altRound}-${altSeed}-${statsHash}`"),
);
check(
  "adaptive scope is practice:adaptive:<subject>:<round>[:c][:t]",
  src.includes("practice:adaptive:${altSubjectKey}:${altRound}${countScopeSuffix}${timedScopeSuffix}"),
);
check("adaptive questionSeed is the seed string", src.includes("questionSeed={adaptiveSeed}"));
check(
  "adaptive QuizRunner key includes subject/round/count/timed/statsHash",
  src.includes("`adaptive-${altSubjectKey}-${altRound}-${count}${timedKeySuffix}-${statsHash}`"),
);
check(
  "adaptive new-set bumps in-memory round + fresh seed",
  src.includes("setAltRound((r) => r + 1)") && src.includes("setAltSeed(Date.now())"),
);
check(
  "transparency line: weak filter total>=3 + accuracy<70, worst-first top 3",
  src.includes("s.total >= 3 && s.accuracy < 70") && src.includes(".slice(0, 3)"),
);
check(
  "transparency line uses adaptivePickedLine tf {topics} + adaptiveUniformLine",
  src.includes('tf("adaptivePickedLine", { topics: weakNames })') && src.includes('t("adaptiveUniformLine")'),
);
check(
  "picked topic names isolated in a dir=ltr span",
  src.includes('<span dir="ltr">{weakNames}</span>'),
);

// ---- §8 standing rules ----
check(
  "standard new-set still bumps round + fresh seed",
  src.includes("setRound((r) => r + 1)") && src.includes("setSeed(Date.now())"),
);
check(
  "subject change still starts a fresh set",
  src.includes("setSubjectKey(e.target.value)") && src.includes("setRound(0)"),
);
check(
  "no denylisted hardcoded English strings in the page",
  !src.includes("Practice — Topic Quizzes") && !src.includes("New set (shuffle again)"),
);
check(
  "bank loading + failure + retry states retained",
  src.includes('t("loading")') && src.includes("bankLoadFailed") && src.includes('t("retryButton")') && src.includes("retryNonce"),
);
check("QuizRunner never mounts on a null bank", src.includes("bank === null") && src.includes("<QuizRunner"));

console.log(failures === 0 ? `\nAll ${passes} Phase 3 practice-UI tests passed.` : `\n${failures} Phase 3 practice-UI test(s) FAILED (${passes} passed).`);
process.exit(failures === 0 ? 0 : 1);
