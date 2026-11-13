// Step 2a UI-shell tests — plain node, no dependencies.
// §1 exercises the REAL badge label functions from src/lib/data.ts
// (compiled to CommonJS in /tmp with tsc, same approach as
// test-provenance.mjs). §2–§7 are source-pattern assertions over the
// components, pages, and CSS. §8 exercises the REAL tracking helpers
// (liveSessions, countFlashcardBuckets) via Node type-stripping with
// a localStorage stub, same pattern as test-fsrs.mjs.
// Run: node scripts/test-step2a.mjs  (exit 0 = all pass)
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
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

// ---------------------------------------------------------------- §1
// Badge label functions (real data.ts).
const OUT = "/tmp/step2a-data";
execSync(
  `npx tsc src/lib/data.ts --outDir ${OUT} --module commonjs --target es2020 --resolveJsonModule --esModuleInterop --skipLibCheck --moduleResolution node`,
  { cwd: ROOT, stdio: "ignore" },
);
const require = createRequire(import.meta.url);
const data = require(join(OUT, "lib/data.js"));
const { reviewStatusBadge, topicBadge, trackConfidenceBadge, TRACKS, PATTERNS, CORRECTIONS_VERSION } = data;

// --- reviewStatusBadge: every status, every tone, both languages ---
const statusCases = [
  ["owner-reviewed", "Owner-reviewed", "reviewed"],
  ["approved", "Approved", "reviewed"],
  ["needs-review", "Needs review", "partial"],
  ["disputed", "Disputed", "error"],
  ["draft", "Draft", "draft"],
  ["", "Draft", "draft"],
  [undefined, "Draft", "draft"],
  [null, "Draft", "draft"],
  ["bogus-status", "Unknown", "unknown"],
];
for (const [status, label, tone] of statusCases) {
  const b = reviewStatusBadge(status, "en");
  check(`reviewStatusBadge(${JSON.stringify(status)}) label+tone`, b.label === label && b.tone === tone, JSON.stringify(b));
  check(`reviewStatusBadge(${JSON.stringify(status)}) has detail`, typeof b.detail === "string" && b.detail.length > 10);
}
check(
  "owner-reviewed NEVER uses the official/success tone",
  reviewStatusBadge("owner-reviewed", "en").tone !== "official" &&
    reviewStatusBadge("approved", "en").tone !== "official",
);
check(
  "owner-reviewed detail says personal review, not certification",
  reviewStatusBadge("owner-reviewed", "en").detail.includes("personal review, not official certification"),
);
const urReviewed = reviewStatusBadge("owner-reviewed", "ur");
check("reviewStatusBadge ur label differs from en", urReviewed.label !== "Owner-reviewed" && urReviewed.label.length > 0);
check("reviewStatusBadge ur detail is Urdu", /[\u0600-\u06FF]/.test(urReviewed.detail));
check("reviewStatusBadge roman falls back to English", reviewStatusBadge("draft", "roman").label === "Draft");

// --- topicBadge: null without a ref; Original vs Reworded; disclosure ---
check("topicBadge null without ref", topicBadge(null) === null && topicBadge(undefined) === null && topicBadge("") === null);
const orig = topicBadge("Original practice question based on past-paper topics — not the actual paper", "en");
check("topicBadge original label leads with Topic-inspired", orig.label === "Topic-inspired · Original");
check("topicBadge original detail is the ref verbatim", orig.detail === "Original practice question based on past-paper topics — not the actual paper");
check("topicBadge original tone is topic", orig.tone === "topic");
const rew = topicBadge("Same concept as a past-paper question, reworded in a different style — not the actual paper", "en");
check("topicBadge reworded label", rew.label === "Topic-inspired · Reworded");
const urTopic = topicBadge("Original practice question based on past-paper topics — not the actual paper", "ur");
check("topicBadge ur detail carries the disclosure", urTopic.detail.includes("اصل پرچہ نہیں"));

// --- trackConfidenceBadge: every real track + every pattern ---
check("trackConfidenceBadge label is the conf string verbatim", TRACKS.every((tr) => trackConfidenceBadge(tr.conf).label === tr.conf));
const toneOf = (conf) => trackConfidenceBadge(conf).tone;
check("qari (mixed) -> partial", toneOf(TRACKS.find((t) => t.id === "qari").conf) === "partial");
check("rescue (JOB-SITE) -> unknown", toneOf(TRACKS.find((t) => t.id === "rescue").conf) === "unknown");
check(
  "all other tracks -> official",
  TRACKS.filter((t) => t.id !== "qari" && t.id !== "rescue").every((t) => toneOf(t.conf) === "official"),
);
check("MD pattern (starts NOT VERIFIED) -> unknown", toneOf(PATTERNS.MD.confidence) === "unknown");
check("Version B pattern -> official", toneOf(PATTERNS.B.confidence) === "official");
check("Version A pattern -> official", toneOf(PATTERNS.A.confidence) === "official");
check(
  "unknown detail says do not treat as official",
  trackConfidenceBadge("JOB-SITE ONLY — x").detail.includes("do not treat as official"),
);
check(
  "partial detail says part confirmed, part not",
  trackConfidenceBadge("CONFIRMED (x); qualification NOT VERIFIED").detail.includes("Part of this claim"),
);
// Distinct meanings, distinct tones: 7 report meanings -> 7 tones.
const tones = new Set([
  reviewStatusBadge("draft").tone,
  reviewStatusBadge("owner-reviewed").tone,
  trackConfidenceBadge("JOB-SITE ONLY").tone,
  trackConfidenceBadge("CONFIRMED (x); y NOT VERIFIED").tone,
  trackConfidenceBadge("CONFIRMED (x)").tone,
  topicBadge("Original practice question based on past-paper topics — not the actual paper").tone,
]);
check("six distinct meanings map to six distinct tones", tones.size === 6, [...tones].join(","));
check("CORRECTIONS_VERSION is 1", CORRECTIONS_VERSION === 1);

// ---------------------------------------------------------------- §2
// Badge components + application sites.
const statusBadges = read("src/components/StatusBadges.tsx");
for (const tone of ["draft", "reviewed", "proxy", "partial", "unknown", "official", "topic", "extracted", "error"]) {
  check(`StatusBadge tone icon map covers ${tone}`, statusBadges.includes(`${tone}: `));
}
check("StatusBadge renders title + aria-label with the detail", statusBadges.includes("title={detail}") && statusBadges.includes("aria-label={`${label}. ${detail}`}"));
check("StatusBadge renders the icon aria-hidden", statusBadges.includes('aria-hidden="true"'));
check("ReviewStatusBadge + TopicBadge + TrackConfidenceBadge exported", statusBadges.includes("export function ReviewStatusBadge") && statusBadges.includes("export function TopicBadge") && statusBadges.includes("export function TrackConfidenceBadge"));
check("TrackConfidenceBadge isolates its label LTR", statusBadges.includes('<span dir="ltr">'));

const prov = read("src/components/ProvenanceBadge.tsx");
check("ProvenanceBadge renders through StatusBadge", prov.includes("<StatusBadge"));
check("ProvenanceBadge maps official->official, extracted->extracted", prov.includes('official: "official"') && prov.includes('"concept-extracted": "extracted"'));
check("ProvenanceBadge maps proxy/partial to their own tones", prov.includes('proxy: "proxy"') && prov.includes('partial: "partial"'));
check("ProvenanceBadge has no legacy .badge class", !prov.includes("className={") || !prov.includes("badge "));

const qr = read("src/components/QuizRunner.tsx");
check("QuizRunner renders ReviewStatusBadge with effective status", qr.includes("<ReviewStatusBadge status={effectiveReviewStatus(q.question, overrides)} />"));
check("QuizRunner renders TopicBadge", qr.includes("<TopicBadge pastPaperRef={q.question.pastPaperRef} />"));
check("QuizRunner old plain Original/Reworded badge gone", !qr.includes('t("rewordedBadge")') && !qr.includes('t("originalBadge")'));
check("QuizRunner results provisional badge is semantic (draft tone)", qr.includes('tone="draft"') && qr.includes('t("provisionalBadgeDetail")'));
check("QuizRunner results verified badge uses reviewed tone, not green", qr.includes('tone="reviewed"') && qr.includes('t("verifiedBadgeDetail")') && !qr.includes('<span className="badge green">{t("verifiedBadge")}'));
check("QuizRunner loads review overrides after mount (B07 pattern)", qr.includes("useEffect(() => {") && qr.includes("loadReviews()") && qr.includes("setOverrides(o)"));
check("QuizRunner start/scoring logic untouched (finish + choose present)", qr.includes("function finish") || qr.includes("const finish") || qr.includes("finish()"));

const mockPage = read("src/app/mock/page.tsx");
// Step 2b supersedes the 2a coverage badges: labels now come from
// mockLabels() in data.ts (Full / Partial / Proxy + Reviewed subset +
// Scoring unknown, from real trusted/available counts). The old
// mockCoverageNone/Partial/Full keys were removed from i18n; the
// invariant — every mock card shows its coverage AND its scoring
// status — is asserted against the new labels.
check("mock cards render coverage badges (all three branches)", mockPage.includes("mockLabels(m, overrides)") && mockPage.includes('t("mockLabelFull")') && mockPage.includes('t("mockLabelPartial")') && mockPage.includes('t("mockLabelProxy")') && mockPage.includes('t("mockLabelReviewedSubset")'));
check("mock cards render scoring-unknown badge when no own config", mockPage.includes("labels.scoringUnknown") && mockPage.includes('t("mockScoringUnknown")'));
check("mock start flow untouched (startHref + Start link present)", mockPage.includes("startHref(m)") && mockPage.includes("function startHref"));

const tracksList = read("src/app/tracks/page.tsx");
const trackDetail = read("src/app/tracks/[id]/page.tsx");
check("tracks list uses TrackConfidenceBadge", tracksList.includes("<TrackConfidenceBadge conf={tr.conf} />"));
check("track detail uses TrackConfidenceBadge", trackDetail.includes("<TrackConfidenceBadge conf={tr.conf} />"));
check("tracks list old green/red conf badge gone", !tracksList.includes('"red" : "green"') && !tracksList.includes("'red' : 'green'"));
check("track detail old green/red conf badge gone", !trackDetail.includes('"red" : "green"') && !trackDetail.includes("'red' : 'green'"));

const library = read("src/app/library/page.tsx");
check("library still renders ProvenanceBadge (upgraded automatically)", library.includes("<ProvenanceBadge"));

// ---------------------------------------------------------------- §3
// Tokens + CSS.
const css = read("src/app/globals.css");
for (const token of ["--surface-page", "--surface-card", "--surface-raised", "--text-primary", "--text-secondary", "--border", "--brand-primary", "--on-primary", "--link", "--selected-bg", "--selected-text", "--focus-ring", "--status-warning-bg", "--status-warning-text", "--status-success-bg", "--status-success-text", "--status-error-bg", "--status-error-text", "--status-neutral-bg", "--status-neutral-text", "--status-reviewed-bg", "--status-reviewed-text", "--disabled-text", "--disabled-bg"]) {
  check(`token ${token} defined`, css.includes(`${token}:`));
}
for (const tone of ["draft", "reviewed", "proxy", "partial", "unknown", "official", "topic", "extracted", "error"]) {
  check(`.sbadge-${tone} class defined`, css.includes(`.sbadge-${tone} {`));
}
check("proxy badge differs by border style (dashed)", css.includes(".sbadge-proxy") && /\.sbadge-proxy \{[^}]*border-style: dashed/.test(css));
check("unknown badge differs by border style (dotted)", /\.sbadge-unknown \{[^}]*border-style: dotted/.test(css));
check("shell-nav-active uses a logical 2px border", css.includes(".shell-nav-active") && css.includes("border-inline-start: 2px solid"));
check("select max-width rule present", css.includes("select { max-width: 100%; }"));
check("focus-visible uses the focus token", css.includes(":focus-visible { outline: 2px solid var(--focus-ring);"));
check("NO body/html overflow-x hidden anywhere", !css.includes("overflow-x: hidden"));
check("table-scroll keeps overflow-x auto", css.includes(".table-scroll") && css.includes("overflow-x: auto"));

// ---------------------------------------------------------------- §4
// Sidebar groups + drawer hardening + AppShell inert.
const sidebar = read("src/components/Sidebar.tsx");
check("sidebar LINKS carry group fields", sidebar.includes('group: "study"') && sidebar.includes('group: "progress"') && sidebar.includes('group: "resources"') && sidebar.includes('group: "quality"') && sidebar.includes("group: null"));
check("Tutor is grouped under Study (documented placement)", sidebar.includes('{ href: "/tutor", key: "tutor", Icon: GraduationCap, group: "study" }'));
check("sidebar renders 4 group headings", sidebar.includes('id: "study"') && sidebar.includes('id: "progress"') && sidebar.includes('id: "resources"') && sidebar.includes('id: "quality"'));
check("sidebar groups use role=group + aria-labelledby", sidebar.includes('role="group"') && sidebar.includes("aria-labelledby={collapsed ? undefined : headingId}"));
check("sidebar hides empty groups when filtering", sidebar.includes("if (items.length === 0) return null;"));
check("sidebar filter label unchanged (Filter navigation)", sidebar.includes('aria-label={t("sidebarNavFilterLabel")}') && read("src/lib/i18n.tsx").includes('sidebarNavFilterLabel: { en: "Filter navigation'));
check("sidebar focus trap cycles Tab inside the drawer", sidebar.includes('e.key !== "Tab"') && sidebar.includes("querySelectorAll") && sidebar.includes("a[href], button:not([disabled])"));
check("sidebar Escape + focus return preserved", sidebar.includes('e.key === "Escape"') && sidebar.includes("returnFocusRef.current?.focus()"));
check("sidebar links have 44px minimum touch targets", sidebar.includes("tw:min-h-11"));
check("sidebar close button is 44px", sidebar.includes("tw:size-11 tw:md:hidden"));
check("sidebar drawer is instant under reduced motion", sidebar.includes("tw:motion-reduce:transition-none"));
check("sidebar active link uses the semantic selected class", sidebar.includes('"shell-nav-active"'));
check("sidebar keeps aria-current on the active route", sidebar.includes('aria-current={active ? "page" : undefined}'));

const topbar = read("src/components/ShellTopbar.tsx");
check("hamburger is 44px", topbar.includes("tw:size-11 tw:md:hidden"));

const shell = read("src/components/AppShell.tsx");
check("AppShell marks content inert while the drawer is open", shell.includes("inert={mobileOpen}"));
check("Topbar stays outside the inert region (focus return works)", shell.indexOf("<ShellTopbar") < shell.indexOf("inert={mobileOpen}"));
check("main + Footer are inside the inert region", shell.indexOf("inert={mobileOpen}") < shell.indexOf("<main") && shell.indexOf("<Footer />") > shell.indexOf("inert={mobileOpen}"));

// ---------------------------------------------------------------- §5
// Home: Start Here, metric denominators, correction versioning.
const home = read("src/app/page.tsx");
check("home has the Start Here card first (before the stats grid)", home.indexOf("startHereHeading") < home.indexOf("Command Center"));
check("home Start Here uses real live sessions", home.includes("liveSessions()") && home.includes("setResumeSession"));
check("home resume parses mock scopes deterministically", home.includes('parts[0] === "mock"') && home.includes("?mode=trusted"));
check("home practice scopes say Continue, not Resume", home.includes('tf("continuePractice"') && home.includes("/practice?subject="));
check("home fresh variant offers Choose mock", home.includes('t("startHereMock")'));
check("home returning variant offers Review due cards", home.includes('t("startHereCards")'));
check("home shows the New/Due split", home.includes("countFlashcardBuckets") && home.includes('tf("cardsDueNew"'));
check("home shows the real next plan task", home.includes("nextTask") && home.includes("PLAN21") && home.includes("planNextLabel"));
check("home attempts card shows MCQ/flash scope", home.includes('tf("attemptsScope"'));
check("home accuracy card shows sample size", home.includes('tf("accuracySample"'));
check("home streak card states the streak rule", home.includes('t("streakRule")'));
check("home time card states the time scope", home.includes('t("timeScope")'));
check("home empty state has an immediate action", home.includes('t("noAttempts")') && home.includes('<Link className="btn" href="/practice">'));
check("home correction ack is versioned", home.includes("CORRECTIONS_ACK_KEY") && home.includes("CORRECTIONS_VERSION") && home.includes("safeRead(CORRECTIONS_ACK_KEY) === String(CORRECTIONS_VERSION)"));
check("home correction acknowledge writes the version", home.includes("safeWrite(CORRECTIONS_ACK_KEY, String(CORRECTIONS_VERSION))"));
check("home compact notice keeps the banner + reopen control", home.includes('t("correctionsShowFull")') && home.includes("PATTERN_BANNER"));
check("home full notice is never removed (both forms render the alert)", (home.match(/className="alert red"/g) ?? []).length === 2);
check("home plan bar has progressbar semantics", home.includes('role="progressbar"') && home.includes("aria-valuenow={planDone}") && home.includes("aria-valuemax={63}"));
check("home 0/63 fraction stays isolated", home.includes("{planDone} / 63") && home.includes("<span dir=\"ltr\">"));
check("home pattern badge is the semantic confidence badge", home.includes("<TrackConfidenceBadge conf={p.confidence} />"));

// ---------------------------------------------------------------- §6
// Overflow: inputs shrink, tables scroll in labelled regions.
const issues = read("src/app/issues/page.tsx");
const vacancies = read("src/app/vacancies/page.tsx");
const analysis = read("src/app/analysis/page.tsx");
const tutor = read("src/app/tutor/page.tsx");
check("library search input shrinks (flex:1 + minWidth:0)", library.includes("style={{ flex: 1, minWidth: 0 }}"));
check("issues filter input shrinks (flex:1 + minWidth:0)", issues.includes("style={{ flex: 1, minWidth: 0 }}"));
check("tutor input rows keep min-width:0 (B01, verified not rebuilt)", (tutor.match(/minWidth: 0/g) ?? []).length >= 2);
check("library save row wraps", library.includes("flexWrap: \"wrap\""));
check("vacancies caption says the table scrolls", vacancies.includes('t("tableScrollHint")') && vacancies.indexOf('t("tableScrollHint")') < vacancies.indexOf("table-scroll"));
function scrollRegions(src) {
  return (src.match(/className="table-scroll" role="region"/g) ?? []).length;
}
check("issues has 2 scroll regions", scrollRegions(issues) === 2, `found ${scrollRegions(issues)}`);
check("analysis has 4 scroll regions", scrollRegions(analysis) === 4, `found ${scrollRegions(analysis)}`);
check("QuizRunner results table has 1 scroll region", scrollRegions(qr) === 1, `found ${scrollRegions(qr)}`);
check("vacancies keeps its scroll region", scrollRegions(vacancies) === 1);
for (const [name, src] of [["issues", issues], ["analysis", analysis], ["QuizRunner", qr], ["vacancies", vacancies]]) {
  const regions = src.match(/<div className="table-scroll"[^>]*>/g) ?? [];
  check(`${name}: every scroll region is keyboard-focusable + labelled`, regions.length > 0 && regions.every((r) => r.includes("tabIndex={0}") && r.includes("aria-label=")));
}
check("every scroll region has the visible scroll caption nearby", issues.includes('t("tableScrollHint")') && analysis.includes('t("tableScrollHint")') && qr.includes('t("tableScrollHint")'));

// ---------------------------------------------------------------- §7
// Keyboard / ARIA: reveal controls, progressbars, chart alternatives,
// flashcard surface smoke test.
check("library reveal: single button, aria-expanded + aria-controls", library.includes("aria-expanded={!isHidden}") && library.includes("aria-controls={bodyId}") && library.includes("hidden={isHidden}"));
check("library reveal: stable sanitized body id", library.includes("note-body-") && library.includes('.replace(/[^a-zA-Z0-9_-]+/g, "-")'));
const plan = read("src/app/plan/page.tsx");
check("plan progress bar has progressbar semantics", plan.includes('role="progressbar"') && plan.includes("aria-valuenow={doneCount}") && plan.includes("aria-valuemax={totalTasks}"));
check("QuizRunner has 2 progressbars (results + question progress)", (qr.match(/role="progressbar"/g) ?? []).length === 2);
check("QuizRunner progressbars carry numeric values", qr.includes("aria-valuenow={pct}") && qr.includes("aria-valuenow={idx + 1}"));
const charts = read("src/components/AnalysisCharts.tsx");
check("charts carry role=img + aria-label", (charts.match(/role="img"/g) ?? []).length === 2 && charts.includes('aria-label={t("chartDueAria")}') && charts.includes('aria-label={t("chartAccuracyAria")}'));
check("charts have data-table disclosures with the same data", (charts.match(/<details>/g) ?? []).length === 2 && charts.includes('t("chartViewData")') && charts.includes("{d.due}") && charts.includes("{p.accuracy}%") && charts.includes("{p.questions}"));
check("analysis daily bars are decorative with a text alternative", analysis.includes('aria-hidden="true"') && analysis.includes("{d.correct}/{d.total}"));
const flashcards = read("src/app/flashcards/page.tsx");
check("flashcard surface: native button in both branches", flashcards.includes('<button type="button" className="card flashcard"') && flashcards.includes("<motion.button"));
check("flashcard surface: aria-pressed on both branches", (flashcards.match(/aria-pressed/g) ?? []).length >= 2);
check("flashcard native Flip fallback kept", flashcards.includes('t("flipCard")') || flashcards.includes("flipCard"));
check("flashcard surface: no role=button/tabIndex hack", !flashcards.includes("role=\"button\"") && !flashcards.includes("tabIndex={0}"));

// ---------------------------------------------------------------- §8
// Tracking helpers (real tracking.ts, stubbed storage).
const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  get length() { return store.size; },
  key: (i) => [...store.keys()][i] ?? null,
};
const tracking = await import("../src/lib/tracking.ts");

// liveSessions: only live sessions, most recent first.
const SESSION_KEY = "etea_session_next_v2";
const nowMs = Date.now();
const sessions = {
  "mock:tt-1:provisional": { version: 2, scope: "mock:tt-1:provisional", title: "TT Mock 1", startedAt: nowMs - 1000, deadlineTs: null, submitted: false },
  "practice:islamiyat:0": { version: 2, scope: "practice:islamiyat:0", title: "Practice Islamiyat", startedAt: nowMs - 500, deadlineTs: null, submitted: false },
  "mock:old:provisional": { version: 2, scope: "mock:old:provisional", title: "Old", startedAt: nowMs - 2000, deadlineTs: null, submitted: true },
  "mock:expired:provisional": { version: 2, scope: "mock:expired:provisional", title: "Expired", startedAt: nowMs - 3000, deadlineTs: nowMs - 1000, submitted: false },
  "legacy:quiz": { version: 1, scope: "legacy:quiz", title: "Legacy", startedAt: nowMs - 100, deadlineTs: null, submitted: false },
};
store.set(SESSION_KEY, JSON.stringify(sessions));
const live = tracking.liveSessions();
check("liveSessions returns only live sessions", live.length === 2, `got ${live.length}`);
check("liveSessions excludes submitted/expired/legacy", live.every((s) => !s.submitted && s.version === 2 && (s.deadlineTs === null || s.deadlineTs > nowMs)));
check("liveSessions sorts most-recently-started first", live[0].scope === "practice:islamiyat:0" && live[1].scope === "mock:tt-1:provisional");
check("liveSessions is read-only (storage unchanged)", store.get(SESSION_KEY) === JSON.stringify(sessions));

// countFlashcardBuckets: fresh/due split, future-due in neither bucket.
const FLASH_KEY = "etea_flash_next";
const cards = [
  { front: "Q1", back: "A1", category: "Islamiyat" },
  { front: "Q2", back: "A2", category: "Islamiyat" },
  { front: "Q3", back: "A3", category: "English" },
];
store.delete(FLASH_KEY);
const empty = tracking.countFlashcardBuckets(cards, new Date());
check("buckets: empty storage means all fresh", empty.fresh === 3 && empty.due === 0, JSON.stringify(empty));
store.set(
  FLASH_KEY,
  JSON.stringify({
    "card-0": { grade: "good", due: "2020-01-01", interval: 1, reps: 1 },
    "card-1": { grade: "good", due: "2999-01-01", interval: 1, reps: 1 },
  }),
);
const mixed = tracking.countFlashcardBuckets(cards, new Date());
check("buckets: past-due legacy entry counts as due", mixed.due === 1, JSON.stringify(mixed));
check("buckets: future-due entry is in neither bucket", mixed.fresh === 1 && mixed.due === 1, JSON.stringify(mixed));
check(
  "buckets: fresh + due equals countDueFlashcards",
  mixed.fresh + mixed.due === tracking.countDueFlashcards(cards, new Date()),
);
check("buckets is read-only (storage unchanged)", JSON.parse(store.get(FLASH_KEY))["card-0"].grade === "good");

console.log(failures === 0 ? `\nAll Step 2a tests passed.` : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
