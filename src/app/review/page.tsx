// Review dashboard — Stage 1 P0.2 (mock-first verification queue).
// The OWNER is the verifier: religious content (Islamiyat, Tajweed,
// Arabic, Fiqh) is verified here by the owner, never by the AI. Items
// that pass the structural check stay "draft" until the owner verifies
// them on this page. Decisions are stored in localStorage
// (`etea_reviews_next_v1`), included in the v6 backup export, and feed
// Trusted Mode (see src/lib/data.ts — isTrusted with overrides).
// Structural badges come from scripts/structural-check-mocks.mjs
// (src/data/structural-checks.json); re-run that script to refresh them.
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BY_ID,
  BY_SUBJECT,
  MOCKS,
  QUESTIONS,
  ZAM_FIXED,
  displayExplanation,
  effectiveReviewStatus,
  reviewAttribution,
  type Question,
} from "@/lib/data";
import structural from "@/data/structural-checks.json";
import { useLang } from "@/lib/i18n";
import {
  clearFlags,
  loadFlags,
  loadReviews,
  removeFlag,
  setReview,
  type DurableFlag,
  type ReviewRecord,
  type ReviewStatus,
} from "@/lib/tracking";
import ProvenanceBadge from "@/components/ProvenanceBadge";

type StructuralStatus = "pass" | "needs-review" | "problem";
const STRUCTURAL: Record<string, { status: StructuralStatus; issues: string[] }> =
  (structural as { items: Record<string, { status: StructuralStatus; issues: string[] }> }).items ?? {};

function structuralOf(qid: string): { status: StructuralStatus; issues: string[] } {
  return STRUCTURAL[qid] ?? { status: "pass", issues: [] };
}

const MOCK_FILTERS: { value: string; labelKey: string }[] = [
  { value: "zam1+zam2", labelKey: "mockFilterZam12" },
  { value: "zam1", labelKey: "mockFilterZam1" },
  { value: "zam2", labelKey: "mockFilterZam2" },
  { value: "zam3", labelKey: "mockFilterZam3" },
  { value: "tt-B", labelKey: "mockFilterTTB" },
  { value: "qari-B", labelKey: "mockFilterQariB" },
  { value: "at-B", labelKey: "mockFilterATB" },
  { value: "all", labelKey: "mockFilterAll" },
];

function mockPool(mockId: string): Question[] {
  if (mockId === "all") return QUESTIONS;
  if (mockId === "zam1+zam2") {
    return [...(ZAM_FIXED.zam1 ?? []), ...(ZAM_FIXED.zam2 ?? [])]
      .map((id) => BY_ID[id])
      .filter(Boolean);
  }
  if (ZAM_FIXED[mockId]) return ZAM_FIXED[mockId].map((id) => BY_ID[id]).filter(Boolean);
  const mock = MOCKS.find((m) => m.id === mockId);
  if (!mock?.comp) return QUESTIONS;
  // Dynamic mock: the pool is every bank item whose subject can appear in it.
  const keys = Object.keys(mock.comp);
  const out: Question[] = [];
  for (const k of keys) {
    if (k === "drawing_pe") out.push(...(BY_SUBJECT.drawing ?? []), ...(BY_SUBJECT.pe ?? []));
    else out.push(...(BY_SUBJECT[k] ?? []));
  }
  return [...new Map(out.map((q) => [q.id, q])).values()];
}

const STATUS_FILTERS: { value: string; labelKey: string }[] = [
  { value: "all", labelKey: "allStatuses" },
  { value: "draft", labelKey: "statusDraft" },
  { value: "needs-review", labelKey: "statusNeedsReview" },
  { value: "disputed", labelKey: "statusDisputed" },
  { value: "owner-reviewed", labelKey: "statusOwnerReviewed" },
  { value: "approved", labelKey: "statusApproved" },
];

// Localization Pass 1 — stored status values are stable English keys;
// only their DISPLAY labels are translated. effectiveReviewStatus
// returns string, so the map is keyed by string.
const STATUS_DISPLAY_KEY: Record<string, string> = {
  draft: "statusDraft",
  "needs-review": "statusNeedsReview",
  disputed: "statusDisputed",
  "owner-reviewed": "statusOwnerReviewed",
  approved: "statusApproved",
};
const STRUCTURAL_DISPLAY_KEY: Record<StructuralStatus, string> = {
  pass: "structuralPass",
  "needs-review": "structuralNeedsReview",
  problem: "structuralProblem",
};

export default function ReviewDashboard() {
  const { t, tf, lang } = useLang();
  // Stage 1 P2 (B07) — hydration safety. This page is prerendered, so
  // the first client render must match the server HTML exactly. Two
  // things broke that: (1) loadReviews() returns {} on the server but
  // the stored decisions on the client, so any stored decision changed
  // the counts/statuses between server and client render; (2) the
  // attribution timestamp used toLocaleString(), which renders in the
  // server's timezone (UTC) but the browser's timezone locally. Both
  // are now mount-gated: the first render uses the bank data only, and
  // local decisions + the local-time timestamp appear after mount.
  const [reviews, setReviews] = useState<Record<string, ReviewRecord>>({});
  const [mounted, setMounted] = useState(false);
  // Step 3b-audit2 (F12) — durable flags, loaded after mount (B07:
  // storage reads in initializers would mismatch the server HTML).
  const [flags, setFlags] = useState<DurableFlag[]>([]);
  useEffect(() => {
    setReviews(loadReviews());
    setFlags(loadFlags());
    setMounted(true);
  }, []);
  const [mockFilter, setMockFilter] = useState("zam1+zam2");
  const [postFilter, setPostFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [structuralFilter, setStructuralFilter] = useState("all");
  const [visible, setVisible] = useState(25);

  const overrides: Record<string, string> = useMemo(() => {
    const o: Record<string, string> = {};
    for (const [qid, r] of Object.entries(reviews)) o[qid] = r.reviewStatus;
    return o;
  }, [reviews]);

  const pool = useMemo(() => mockPool(mockFilter), [mockFilter]);
  const filtered = useMemo(() => {
    return pool.filter((q) => {
      if (postFilter !== "all" && !q.post.includes(postFilter)) return false;
      if (statusFilter !== "all" && effectiveReviewStatus(q, overrides) !== statusFilter) return false;
      if (structuralFilter !== "all" && structuralOf(q.id).status !== structuralFilter) return false;
      return true;
    });
  }, [pool, postFilter, statusFilter, structuralFilter, overrides]);

  const counts = useMemo(() => {
    const c = { total: pool.length, draft: 0, needsReview: 0, disputed: 0, verified: 0, structuralPass: 0, structuralNeeds: 0, structuralProblem: 0 };
    for (const q of pool) {
      const s = effectiveReviewStatus(q, overrides);
      if (s === "draft") c.draft++;
      else if (s === "needs-review") c.needsReview++;
      else if (s === "disputed") c.disputed++;
      else c.verified++; // owner-reviewed + approved
      const st = structuralOf(q.id).status;
      if (st === "pass") c.structuralPass++;
      else if (st === "needs-review") c.structuralNeeds++;
      else c.structuralProblem++;
    }
    return c;
  }, [pool, overrides]);

  const zamProgress = useMemo(() => {
    const ids = [...(ZAM_FIXED.zam1 ?? []), ...(ZAM_FIXED.zam2 ?? [])];
    const verified = ids.filter((id) => {
      const q = BY_ID[id];
      return q && (effectiveReviewStatus(q, overrides) === "owner-reviewed" || effectiveReviewStatus(q, overrides) === "approved");
    }).length;
    return { verified, total: ids.length };
  }, [overrides]);

  function act(qid: string, status: ReviewStatus) {
    setReviews(setReview(qid, status));
  }

  // Step 3b-audit2 (F12) — flag removal refreshes from storage so the
  // list always shows what is actually stored.
  function unflag(qid: string) {
    removeFlag(qid);
    setFlags(loadFlags());
  }
  function unflagAll() {
    clearFlags();
    setFlags([]);
  }

  const shown = filtered.slice(0, visible);

  return (
    <div>
      <h1>{t("reviewTitle")}</h1>
      <div className="alert">
        <b>{t("reviewAlertTitle")}</b> {t("reviewAlertBody1")} <b>{t("draftWord")}</b>{" "}
        {t("reviewAlertBody2")}
      </div>
      <div className="card">
        <p>
          <b>
            {t("zamProgressLabel")}{" "}
            {/* Stage 1 P1 Tier 4 (B03) — progress fraction isolated LTR. */}
            <span dir="ltr">
              {zamProgress.verified} / {zamProgress.total}
            </span>{" "}
            {t("verifiedWord")}
          </b>
          {zamProgress.verified === 0 ? ` — ${t("zamProgressNone")}` : ` — ${t("zamProgressSome")}`}
        </p>
        <p className="muted">
          {/* Stage 3 part 2 — LIVE DEFECT (b) ROOT CAUSE: the template
              uses {sneeds} (lowercase) but the call used to pass
              `sNeeds` (camelCase). replaceVars() is case-sensitive, so
              vars["sneeds"] was undefined and rendered as "" — the
              middle count showed blank ("186 pass · needs review ·
              0 problem."). Fixed by matching the template name exactly
              below. */}
          {tf("countsLine", {
            total: counts.total,
            draft: counts.draft,
            needs: counts.needsReview,
            disputed: counts.disputed,
            verified: counts.verified,
            pass: counts.structuralPass,
            sneeds: counts.structuralNeeds,
            prob: counts.structuralProblem,
          })}
        </p>
      </div>
      {/* Step 3b-audit2 (F12) — durable flags. Mount-gated: the list
          comes from localStorage, so it renders only after mount to
          keep the first render identical to the server HTML. */}
      {mounted && (
        <div className="card">
          <h2>{t("flagsHeading")}</h2>
          <p className="muted">{t("flagsIntro")}</p>
          {flags.length === 0 ? (
            <p className="muted">{t("flagsEmpty")}</p>
          ) : (
            <>
              {flags.map((f) => {
                const q = BY_ID[f.qid];
                return (
                  <p key={f.qid} style={{ margin: "8px 0" }}>
                    <b>
                      <span dir="ltr">{f.qid}</span>
                    </b>{" "}
                    {q && (
                      <>
                        <span dir="ltr" className="badge grey">
                          {q.subject}
                        </span>{" "}
                        <span dir="ltr" className="badge grey">
                          {q.topic}
                        </span>{" "}
                        <span dir="auto">{q.question}</span>{" "}
                      </>
                    )}
                    <span className="muted">
                      · {f.source === "mock" ? t("flagsFromMock") : t("flagsFromPractice")} ·{" "}
                      <span dir="auto">{f.title}</span> ·{" "}
                      {tf("flagsFlaggedOn", { date: new Date(f.flaggedAt).toLocaleString() })}
                    </span>{" "}
                    <button className="secondary" onClick={() => unflag(f.qid)}>
                      {t("flagsRemove")}
                    </button>
                  </p>
                );
              })}
              <button className="secondary" onClick={unflagAll}>
                {t("flagsClearAll")}
              </button>
            </>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <label>
          {t("mockFilterLabel")}{" "}
          <select aria-label={t("mockFilterLabel")} value={mockFilter} onChange={(e) => { setMockFilter(e.target.value); setVisible(25); }}>
            {MOCK_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{t(f.labelKey)}</option>
            ))}
          </select>
        </label>
        <label>
          {t("postFilterLabel")}{" "}
          <select aria-label={t("postFilterLabel")} value={postFilter} onChange={(e) => { setPostFilter(e.target.value); setVisible(25); }}>
            <option value="all">{t("allPosts")}</option>
            <option value="tt">{t("postTTFirst")}</option>
            <option value="qari">{t("postQariFirst")}</option>
          </select>
        </label>
        <label>
          {t("statusFilterLabel")}{" "}
          <select aria-label={t("statusFilterLabel")} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setVisible(25); }}>
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{t(f.labelKey)}</option>
            ))}
          </select>
        </label>
        <label>
          {t("structuralFilterLabel")}{" "}
          <select aria-label={t("structuralFilterLabel")} value={structuralFilter} onChange={(e) => { setStructuralFilter(e.target.value); setVisible(25); }}>
            <option value="all">{t("allWord")}</option>
            <option value="pass">{t("passWord")}</option>
            <option value="needs-review">{t("statusNeedsReview")}</option>
            <option value="problem">{t("problemWord")}</option>
          </select>
        </label>
      </div>
      <p className="muted">
        {t("showingWord")}{" "}
        <span dir="ltr">
          {shown.length} of {filtered.length}
        </span>{" "}
        {t("showingRest")}
      </p>
      {shown.length === 0 && <p>{t("noItemsMatch")}</p>}
      {shown.map((q) => {
        const status = effectiveReviewStatus(q, overrides);
        const st = structuralOf(q.id);
        // Step 3b-audit2 (F02) — English mode shows the faithful
        // English explanation; untranslated Roman Urdu text carries
        // the honest pending label.
        const expl = displayExplanation(q, lang);
        // Stage 1 P1 Tier 1 — attribution falls back to the bank JSON's
        // reviewedBy/reviewedAt when no local decision exists (the 15
        // owner-verified items live in the bank since the P1T0 deploy;
        // reading only the localStorage map rendered them "unreviewed").
        const { by, at } = reviewAttribution(q, reviews[q.id]);
        return (
          <div className="card" key={q.id}>
            <p>
              <b>
                <span dir="ltr">{q.id}</span>
              </b>{" "}
              · <span dir="auto">{q.question}</span>{" "}
              <span dir="ltr" className="badge grey">
                {q.subject}
              </span>{" "}
              <span dir="ltr" className="badge grey">
                {q.topic}
              </span>{" "}
              {/* Stage 1 P2 — provenance badge (renders only when the item
                  carries a sourceKind). */}
              <ProvenanceBadge source={q.source} sourceKind={q.sourceKind} syllabusClause={q.syllabusClause} />
            </p>
            {q.options.map((o, i) => (
              <p key={i} style={{ margin: "4px 0" }}>
                {i === q.correctIndex ? "✅ " : "· "}
                <span dir="auto">{o}</span>
              </p>
            ))}
            <p className="muted">
              <span dir="auto">{expl.text}</span>
              {expl.pendingEnglish && (
                <>
                  {" "}
                  <span className="badge grey">{t("explanationPendingLabel")}</span>
                </>
              )}
            </p>
            <p className="muted">
              {t("statusWord")}: <b>{t(STATUS_DISPLAY_KEY[status])}</b>
              {/* Stage 1 P2 (B07) — the timestamp renders only after
                  mount: toLocaleString() is timezone-dependent, so
                  rendering it during SSR/hydration mismatched. Before
                  mount, only the reviewer name shows (identical on
                  server and client). */}
              {by && at ? (
                mounted ? (
                  <>
                    {" · "}
                    {t("byWord")} <span dir="ltr">{by}</span> ·{" "}
                    <span dir="ltr">{new Date(at).toLocaleString()}</span>
                  </>
                ) : (
                  <>
                    {" · "}
                    {t("byWord")} <span dir="ltr">{by}</span>
                  </>
                )
              ) : (
                <> · {t("unreviewedWord")}</>
              )}
              {" · "}
              {t("structuralWord")}: <b>{t(STRUCTURAL_DISPLAY_KEY[st.status])}</b>
              {st.issues.length > 0 ? (
                <>
                  {" — "}
                  <span dir="auto">{st.issues.join("; ")}</span>
                </>
              ) : (
                ""
              )}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => act(q.id, "owner-reviewed")}>{t("verifyAction")}</button>
              {status === "owner-reviewed" && (
                <button onClick={() => act(q.id, "approved")}>{t("approveAction")}</button>
              )}
              <button className="secondary" onClick={() => act(q.id, "needs-review")}>
                {t("needsReviewAction")}
              </button>
              <button className="secondary" onClick={() => act(q.id, "disputed")}>
                {t("disputedAction")}
              </button>
              <button className="secondary" onClick={() => act(q.id, "draft")}>
                {t("resetDraftAction")}
              </button>
            </div>
          </div>
        );
      })}
      {visible < filtered.length && (
        <button onClick={() => setVisible((v) => v + 25)}>
          {t("showMore")}{" "}
          <span dir="ltr">{tf("leftCount", { left: filtered.length - visible })}</span>
        </button>
      )}
    </div>
  );
}
