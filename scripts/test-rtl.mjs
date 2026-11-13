// RTL isolation tests (Localization Pass 1) — plain node, no dependencies.
// Targeted static checks: every site fixed for the RTL punctuation bug
// (English phrases/sentences rendered inside RTL flow) must carry an
// explicit isolation — dir="ltr" for identifiers/counts/codes, dir="auto"
// for free-form content that may be mixed-script, lri() (Unicode
// LRI/PDI) for plain-text constructed messages. Visual confirmation
// still needs a real browser post-deploy; these checks prove the
// isolation attributes are present at the fixed sites.
// Also guards the bidi-isolate byte trap: invisible isolate characters
// must appear ONLY as explicit "\u2066"/"\u2069" escapes, never as raw
// characters (a raw typed "isolate" was once U+0085, not U+2066).
// Run: node scripts/test-rtl.mjs  (exit 0 = all pass)
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function read(rel) {
  return fs.readFileSync(join(ROOT, rel), "utf8");
}

// ---- Tutor: bubbles + explain output + fallback content ----
const tutor = read("src/app/tutor/page.tsx");
check("tutor: chat bubbles are dir=auto", /<div key=\{i\} dir="auto" className=\{`msg/.test(tutor));
check("tutor: thinking bubble is dir=auto", /<div dir="auto" className="msg ai">/.test(tutor));
check("tutor: explain output is dir=auto", /<p dir="auto" style=\{\{ whiteSpace: "pre-wrap"/.test(tutor));
check("tutor: drill-button subject isolated LTR", tutor.includes('<span dir="ltr">({weakest})</span>'));
check("tutor: offline fallback wraps content in lri()", (tutor.match(/lri\(/g) ?? []).length >= 4);
check("tutor: via-line provider wrapped in lri()", tutor.includes("provider: lri(providerName)"));

// ---- QuizRunner: question/options/explanation/policy ----
const qr = read("src/components/QuizRunner.tsx");
check("quiz: question text in dir=auto span", qr.includes('<span dir="auto">{q.question.question}</span>'));
check("quiz: Q prefix isolated LTR", /<span dir="ltr">\s*<b>Q\{idx \+ 1\}\.<\/b>/.test(qr));
check("quiz: subject badge isolated LTR", qr.includes('<span dir="ltr" className="badge grey">'));
check("quiz: option letter LTR + option text auto", qr.includes('<span dir="ltr">{String.fromCharCode(65 + i)}.</span>') && qr.includes('<span dir="auto">{o}</span>'));
// Step 3b-audit2 (F02) — the explanation renders go through
// displayExplanation; the dir=auto isolation is unchanged, only the
// expression inside the span differs.
check("quiz: feedback explanation in dir=auto span", qr.includes('<span dir="auto">{currentExpl?.text ?? q.question.explanation}</span>'));
check("quiz: policy note isolated LTR", qr.includes('<span dir="ltr">{examResult.config.policyNote}</span>'));
check("quiz: review question/options/explanation isolated", qr.includes('<span dir="auto">{p.question.question}</span>') && qr.includes('<span dir="auto">{expl.text}</span>') && qr.includes('<span dir="auto">{p.question.pastPaperRef}</span>'));
check("quiz: changed-answer options isolated", (qr.match(/<span dir="auto">\{p\.options\[/g) ?? []).length === 2);

// ---- Library: note title/body/source ----
const library = read("src/app/library/page.tsx");
check("library: note title dir=auto", library.includes("<h3 dir=\"auto\">{shown.title}</h3>"));
check("library: note body dir=auto", library.includes('<p dir="auto" id={bodyId} hidden={isHidden}>') && library.includes("{shown.body}"));
check("library: reveal control has aria-expanded + aria-controls", library.includes("aria-expanded={!isHidden}") && library.includes("aria-controls={bodyId}"));
check("library: source line dir=auto", library.includes('<span dir="auto">{n.source}</span>'));
check("library: annotation aria-label wraps title in lri()", library.includes("tf(\"annotationAria\", { title: lri(n.title) })"));
// Step 2b — the key is built in the scoped-notes memo (loop variable
// `s`, original note `n` from NOTES); annotations still look up by
// that key, never by the localized title.
check("library: storage key stays on the original title", library.includes("key: `${s}||${n.title}`") && library.includes("annotations[e.key]"));

// ---- Home: brand, corrections, banner, weak areas, pattern ----
const home = read("src/app/page.tsx");
check("home: brand name isolated LTR", home.includes('<span dir="ltr">ETEA Prep Library — KP Government Jobs</span>'));
check("home: correction items dir=ltr", home.includes('<li key={c} dir="ltr">'));
check("home: pattern banner isolated LTR", home.includes('<span dir="ltr">{PATTERN_BANNER}</span>'));
check("home: weak-area subject isolated LTR", home.includes('<span dir="ltr">{w.subject}</span>'));
check("home: pattern name dir=auto", home.includes('<span dir="auto">{p.name}</span>'));
// Step 2a — the confidence badge is now the semantic TrackConfidenceBadge;
// the LTR isolation lives inside that component (dir="ltr" wrapper).
const statusBadges = read("src/components/StatusBadges.tsx");
check(
  "home: confidence badge isolated LTR",
  home.includes("<TrackConfidenceBadge conf={p.confidence} />") &&
    statusBadges.includes('<span dir="ltr">') &&
    statusBadges.includes("<StatusBadge label={badge.label}"),
);

// ---- Mock list + runner ----
const mockList = read("src/app/mock/page.tsx");
check("mock list: banner isolated LTR", mockList.includes('<span dir="ltr">{PATTERN_BANNER}</span>'));
check("mock list: title + note dir=auto", mockList.includes('<span dir="auto">{m.title}</span>') && mockList.includes('<span dir="auto">{m.note}</span>'));
const mockRun = read("src/app/mock/[id]/page.tsx");
check("mock runner: note dir=auto", mockRun.includes('<span dir="auto">{mock.note}</span>'));
check("mock runner: policy note isolated LTR", mockRun.includes('<span dir="ltr">{scoring.policyNote}</span>'));

// ---- Plan: day headings, task text, AI plan ----
const plan = read("src/app/plan/page.tsx");
check("plan: day heading dir=auto", plan.includes('<span dir="auto">{day}</span>'));
check("plan: task text dir=auto", plan.includes('<span dir="auto">{text}</span>'));
check("plan: AI plan output dir=auto", plan.includes('<p dir="auto" style={{ whiteSpace: "pre-wrap" }}>'));

// ---- Flashcards: card content, category, FSRS state line ----
const flash = read("src/app/flashcards/page.tsx");
check("flashcards: card content dir=auto", flash.includes('<span dir="auto">{flipped ? card.back : card.front}</span>'));
check("flashcards: category isolated LTR", flash.includes('<span dir="ltr">{card.category}</span>'));
// Stage 2: the old last-grade line is replaced by the FSRS state line;
// the due value (a date or interval label) is wrapped in lri() so it
// cannot flip the Urdu sentence order.
check("flashcards: FSRS state-line due value wrapped in lri()", flash.includes('tf("fsrsStateLine"') && flash.includes("due: lri("));

// ---- Analysis: data cells + messages ----
const analysis = read("src/app/analysis/page.tsx");
check("analysis: title cells dir=auto", (analysis.match(/<td dir="auto">\{[am]\.title\}<\/td>/g) ?? []).length === 2);
check("analysis: date/kind/mode/key/time cells dir=ltr", analysis.includes('<td dir="ltr">{m.date.slice(0, 10)}</td>') && analysis.includes('<td dir="ltr">{a.kind}</td>') && analysis.includes('<td dir="ltr">{r.mode}</td>') && analysis.includes('<td dir="ltr">{fmtMs(r.responseMs)}</td>'));
check("analysis: item question/answers dir=auto", analysis.includes('<td dir="auto">{r.question}</td>') && analysis.includes('<td dir="auto">{r.firstAnswer ?? "—"}</td>'));
check("analysis: status message dir=auto", analysis.includes('<p dir="auto" className="muted">'));
check("analysis: quarantine keys wrapped in lri()", analysis.includes("keys: lri("));

// ---- Review: ids, content, attribution ----
const review = read("src/app/review/page.tsx");
check("review: question id isolated LTR", review.includes('<span dir="ltr">{q.id}</span>'));
// Step 3b-audit2 (F02) — the review card renders the display
// explanation (expl.text); the pending-English queue renders the raw
// Roman Urdu explanation. Both must stay in dir=auto spans.
check("review: question/options/explanation dir=auto", review.includes('<span dir="auto">{q.question}</span>') && review.includes('<span dir="auto">{o}</span>') && review.includes('<span dir="auto">{expl.text}</span>') && review.includes('<span dir="auto">{q.explanation}</span>'));
check("review: reviewer + timestamp isolated LTR", review.includes('<span dir="ltr">{by}</span>') && review.includes('<span dir="ltr">{new Date(at).toLocaleString()}</span>'));
check("review: structural issues dir=auto", review.includes('<span dir="auto">{st.issues.join("; ")}</span>'));

// ---- Issues: ids/dates LTR, free text auto ----
const issues = read("src/app/issues/page.tsx");
check("issues: date/qid/subject isolated LTR", issues.includes('<td dir="ltr">{i.date.slice(0, 10)}</td>') && issues.includes('<code dir="ltr">{i.qid}</code>') && issues.includes('<td dir="ltr">{i.subject ?? "—"}</td>'));
// Step 2b — the correction cell keeps dir="auto" and the "—" fallback,
// with the explicit no-suggested-correction choice rendered instead
// of an empty dash when the reporter chose it.
check("issues: correction/source dir=auto", issues.includes('i.noSuggestedCorrection ? t("noSuggestedCorrectionLabel") : (i.proposedCorrection ?? "—")') && issues.includes('<td dir="auto">{i.source ?? "—"}</td>') && issues.includes("<td dir=\"auto\">"));
check("issues: telemetry message dir=auto", issues.includes('<td dir="auto" style={{ overflowWrap: "break-word" }}>'));

// ---- Vacancies / tracks / topics / links ----
const vac = read("src/app/vacancies/page.tsx");
check("vacancies: post/elig/src dir=auto, bps/last LTR", vac.includes('<td dir="auto">{v.post}</td>') && vac.includes('<td dir="ltr">{v.bps}</td>') && vac.includes('<td dir="ltr">{v.last}</td>'));
check("vacancies: etea.online link isolated LTR", vac.includes('<a dir="ltr" href="https://etea.online/"'));
const tracks = read("src/app/tracks/page.tsx");
check("tracks: name/pattern dir=auto, bps/conf LTR", tracks.includes('<span dir="auto">{tr.name}</span>') && tracks.includes('<span dir="auto">{tr.pattern}</span>') && tracks.includes('<span dir="ltr" className="badge teal">'));
const trackDetail = read("src/app/tracks/[id]/page.tsx");
check("track detail: content isolated", trackDetail.includes('<p dir="auto">{tr.elig}</p>') && trackDetail.includes('<p dir="auto">{tr.pattern}</p>') && trackDetail.includes('<span dir="auto">{m.note}</span>'));
const topics = read("src/app/topics/page.tsx");
check("topics: label list items dir=auto", (topics.match(/<li dir="auto">/g) ?? []).length === 2);
const links = read("src/app/links/page.tsx");
check("links: name link LTR, note dir=auto", links.includes('<a dir="ltr" href={url}') && links.includes('<span dir="auto">{note}</span>'));

// ---- Components: Nav brand, TutorHealth provider/latency ----
const nav = read("src/components/Nav.tsx");
check("nav: brand name isolated LTR", nav.includes('<span dir="ltr">📚 ETEA Prep Library</span>'));
const health = read("src/components/TutorHealth.tsx");
check("health: provider+model isolated LTR", /<span dir="ltr">\s*\{PROVIDER_LABELS\[key\] \?\? key\} \(\{p\.model/.test(health));
check("health: latency isolated LTR", health.includes('<span dir="ltr">{p.latencyMs} ms</span>'));

// ---- Bidi-isolate byte trap: escapes only, never raw characters ----
const i18n = read("src/lib/i18n.tsx");
check("lri() uses explicit U+2066/U+2069 escapes", i18n.includes('"\\u2066"') && i18n.includes('"\\u2069"'));
const data = read("src/lib/data.ts");
check("data.ts LRI/PDI use explicit escapes", data.includes('const LRI = "\\u2066"') && data.includes('const PDI = "\\u2069"'));

const rawHits = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else {
      const src = fs.readFileSync(p, "utf8");
      // Raw LRI/PDI (U+2066/U+2069) or C1 controls (U+0080-U+009F,
      // including the U+0085 NEL that once impersonated an isolate)
      // must never appear literally in source.
      if (/[\u2066\u2069\u0080-\u009F]/.test(src)) rawHits.push(p);
    }
  }
}
walk(join(ROOT, "src"));
check("no raw isolate/control characters in src/", rawHits.length === 0, rawHits.join(", "));

// ---- Step 2a — duration isolation: every minsLabel render must sit
// inside a dir="ltr" span (a bare duration lets its number jump in RTL
// mode). Each file's render is checked against its own wrapping code.
function isolatedBefore(src, needle, windowChars = 120) {
  const i = src.indexOf(needle);
  if (i < 0) return false;
  return src.slice(Math.max(0, i - windowChars), i).includes('dir="ltr"');
}
const planPage = read("src/app/plan/page.tsx");
const analysisPage = read("src/app/analysis/page.tsx");
check("rtl: home time card duration isolated", isolatedBefore(home, 'tf("minsLabel", { mins: stats.totalMinutes })'));
check("rtl: plan task duration isolated", isolatedBefore(planPage, 'tf("minsLabel", { mins })'));
check("rtl: quiz results duration isolated", isolatedBefore(qr, 'tf("minsLabel", { mins: Math.round((Date.now() - startTs) / 60000) })'));
check("rtl: analysis time stat duration isolated", isolatedBefore(analysisPage, 'tf("minsLabel", { mins: stats.totalMinutes })'));
check("rtl: analysis mock-history duration isolated", isolatedBefore(analysisPage, 'tf("minsLabel", { mins: Math.round(m.seconds / 60) })'));
check("rtl: analysis detail duration isolated", isolatedBefore(analysisPage, 'tf("minsLabel", { mins: Math.round(selected.seconds / 60) })'));
const mockListPage = read("src/app/mock/page.tsx");
const trackDetailPage = read("src/app/tracks/[id]/page.tsx");
check("rtl: mock card duration isolated", isolatedBefore(mockListPage, 'tf("minsLabel", { mins: m.minutes })'));
check("rtl: track detail duration isolated", isolatedBefore(trackDetailPage, 'tf("minsLabel", { mins: m.minutes })'));
// Percentages: the per-subject accuracy cell and the chart table cell.
check("rtl: analysis per-subject percentage isolated", analysisPage.includes("<span dir=\"ltr\">{Math.round(v.accuracy)}%</span>"));
const charts = read("src/components/AnalysisCharts.tsx");
check("rtl: chart table percentage isolated", charts.includes("<span dir=\"ltr\">{p.accuracy}%</span>"));
// Meaning icons are never flipped: scaleX(-1) appears exactly once,
// on the collapse chevron only (.shell-flip-rtl).
const css = read("src/app/globals.css");
check("rtl: only the collapse chevron flips", (css.match(/scaleX\(-1\)/g) ?? []).length === 1 && css.includes(".shell-flip-rtl"));
// "0 / 63" regression: the home plan fraction stays an isolated span.
check("rtl: home plan fraction stays isolated (0/63 regression)", home.includes("<span dir=\"ltr\">") && home.includes("{planDone} / 63"));

console.log(failures === 0 ? `\nAll RTL tests passed.` : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
