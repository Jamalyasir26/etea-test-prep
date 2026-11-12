// Review dashboard — Stage 1 P0.2 (mock-first verification queue).
// The OWNER is the verifier: religious content (Islamiyat, Tajweed,
// Arabic, Fiqh) is verified here by the owner, never by the AI. Items
// that pass the structural check stay "draft" until the owner verifies
// them on this page. Decisions are stored in localStorage
// (`etea_reviews_next_v1`), included in the v5 backup export, and feed
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
  effectiveReviewStatus,
  reviewAttribution,
  type Question,
} from "@/lib/data";
import structural from "@/data/structural-checks.json";
import {
  loadReviews,
  setReview,
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

const MOCK_FILTERS: { value: string; label: string }[] = [
  { value: "zam1+zam2", label: "ZamungKor Mock 1 + 2 (200) — TT + Qari first" },
  { value: "zam1", label: "ZamungKor Mock 1 (100)" },
  { value: "zam2", label: "ZamungKor Mock 2 (100)" },
  { value: "zam3", label: "ZamungKor Mock 3 (100)" },
  { value: "tt-B", label: "TT Mock — Version B (pool)" },
  { value: "qari-B", label: "Qari Mock — Version B (pool)" },
  { value: "at-B", label: "AT Mock — Version B (pool)" },
  { value: "all", label: "All draft items (whole bank)" },
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

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "needs-review", label: "Needs review" },
  { value: "disputed", label: "Disputed" },
  { value: "owner-reviewed", label: "Owner-reviewed" },
  { value: "approved", label: "Approved" },
];

export default function ReviewDashboard() {
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
  useEffect(() => {
    setReviews(loadReviews());
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

  const shown = filtered.slice(0, visible);

  return (
    <div>
      <h1>Review Queue — Verification Dashboard</h1>
      <div className="alert">
        <b>You are the verifier.</b> Religious content (Islamiyat, Tajweed, Arabic, Fiqh) is
        verified by you, the owner — never by the AI. Items that pass the structural check stay{" "}
        <b>draft</b> until you verify them here. Verified items feed Trusted Mode; everything
        else stays provisional.
      </div>
      <div className="card">
        <p>
          <b>
            ZamungKor Mock 1 + 2 progress:{" "}
            {/* Stage 1 P1 Tier 4 (B03) — progress fraction isolated LTR. */}
            <span dir="ltr">
              {zamProgress.verified} / {zamProgress.total}
            </span>{" "}
            verified
          </b>
          {zamProgress.verified === 0
            ? " — Trusted Mode has no verified items yet, so it returns 0 questions. Verify items below to unlock it."
            : " — these items are available in Trusted Mode."}
        </p>
        <p className="muted">
          Current filter: {counts.total} items — {counts.draft} draft · {counts.needsReview} needs
          review · {counts.disputed} disputed · {counts.verified} verified. Structural check:{" "}
          {counts.structuralPass} pass · {counts.structuralNeeds} needs review ·{" "}
          {counts.structuralProblem} problem.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <label>
          Mock{" "}
          <select aria-label="Mock filter" value={mockFilter} onChange={(e) => { setMockFilter(e.target.value); setVisible(25); }}>
            {MOCK_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </label>
        <label>
          Post{" "}
          <select aria-label="Post filter" value={postFilter} onChange={(e) => { setPostFilter(e.target.value); setVisible(25); }}>
            <option value="all">All posts</option>
            <option value="tt">TT (Theology Teacher) first</option>
            <option value="qari">Qari / Imam Masjid first</option>
          </select>
        </label>
        <label>
          Status{" "}
          <select aria-label="Status filter" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setVisible(25); }}>
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </label>
        <label>
          Structural{" "}
          <select aria-label="Structural filter" value={structuralFilter} onChange={(e) => { setStructuralFilter(e.target.value); setVisible(25); }}>
            <option value="all">All</option>
            <option value="pass">Pass</option>
            <option value="needs-review">Needs review</option>
            <option value="problem">Problem</option>
          </select>
        </label>
      </div>
      <p className="muted">
        Showing{" "}
        <span dir="ltr">
          {shown.length} of {filtered.length}
        </span>{" "}
        items in this filter.
      </p>
      {shown.length === 0 && <p>No items match this filter.</p>}
      {shown.map((q) => {
        const status = effectiveReviewStatus(q, overrides);
        const st = structuralOf(q.id);
        // Stage 1 P1 Tier 1 — attribution falls back to the bank JSON's
        // reviewedBy/reviewedAt when no local decision exists (the 15
        // owner-verified items live in the bank since the P1T0 deploy;
        // reading only the localStorage map rendered them "unreviewed").
        const { by, at } = reviewAttribution(q, reviews[q.id]);
        return (
          <div className="card" key={q.id}>
            <p>
              <b>{q.id}</b> · {q.question}{" "}
              <span className="badge grey">{q.subject}</span>{" "}
              <span className="badge grey">{q.topic}</span>{" "}
              {/* Stage 1 P2 — provenance badge (renders only when the item
                  carries a sourceKind). */}
              <ProvenanceBadge source={q.source} sourceKind={q.sourceKind} syllabusClause={q.syllabusClause} />
            </p>
            {q.options.map((o, i) => (
              <p key={i} style={{ margin: "4px 0" }}>
                {i === q.correctIndex ? "✅ " : "· "}
                {o}
              </p>
            ))}
            <p className="muted">{q.explanation}</p>
            <p className="muted">
              Status: <b>{status}</b>
              {/* Stage 1 P2 (B07) — the timestamp renders only after
                  mount: toLocaleString() is timezone-dependent, so
                  rendering it during SSR/hydration mismatched. Before
                  mount, only the reviewer name shows (identical on
                  server and client). */}
              {by && at
                ? mounted
                  ? ` · by ${by} · ${new Date(at).toLocaleString()}`
                  : ` · by ${by}`
                : " · unreviewed"}
              {" · "}
              Structural: <b>{st.status}</b>
              {st.issues.length > 0 ? ` — ${st.issues.join("; ")}` : ""}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => act(q.id, "owner-reviewed")}>Verify</button>
              {status === "owner-reviewed" && (
                <button onClick={() => act(q.id, "approved")}>Approve</button>
              )}
              <button className="secondary" onClick={() => act(q.id, "needs-review")}>
                Needs review
              </button>
              <button className="secondary" onClick={() => act(q.id, "disputed")}>
                Disputed
              </button>
              <button className="secondary" onClick={() => act(q.id, "draft")}>
                Reset to draft
              </button>
            </div>
          </div>
        );
      })}
      {visible < filtered.length && (
        <button onClick={() => setVisible((v) => v + 25)}>
          Show 25 more{" "}
          <span dir="ltr">({filtered.length - visible} left)</span>
        </button>
      )}
    </div>
  );
}
