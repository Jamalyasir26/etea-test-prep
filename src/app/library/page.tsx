// Library — notes with "Recall first" prompts.
// Stage 1 P0.3 — owner annotations: a private text field on each note,
// stored locally only. Annotations are NEVER sent to the AI tutor unless
// the owner enables the opt-in below (default OFF).
//
// Step 2b — scoped search with a matching count + an explicit "Search
// all subjects" option; subject/query preserved in the URL (?subject=
// & ?q=) so tutor citations deep-link here; an "English source text"
// label where no translation exists; related MCQ / flashcard / plan
// deep links on every note.
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  flashcardCategoryForNote,
  hasTranslation,
  localizeNote,
  noteBankKey,
  NOTES,
  type Note,
} from "@/lib/data";
import { planDayForSubject } from "@/lib/plan";
import { lri, useLang } from "@/lib/i18n";
import ProvenanceBadge from "@/components/ProvenanceBadge";
import {
  loadAnnotationOptIn,
  loadAnnotations,
  saveAnnotation,
  setAnnotationOptIn,
} from "@/lib/tracking";

// Step 2b — the "Search all subjects" select value. Also the ?subject=
// URL value for the all-subjects scope.
const ALL_SUBJECTS = "all";

function LibraryInner() {
  const { lang, t, tf } = useLang();
  const params = useSearchParams();
  const subjects = useMemo(() => Object.keys(NOTES).sort(), []);
  // Step 2b — initial scope/query from the URL (tutor citations link
  // here). An unknown subject falls back to the first subject, never
  // a guessed one; "all" selects the all-subjects scope.
  const [subject, setSubject] = useState(() => {
    const s = params.get("subject") ?? "";
    if (s === ALL_SUBJECTS) return ALL_SUBJECTS;
    return s && NOTES[s] ? s : (subjects[0] ?? "");
  });
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  // Stage 1 P2 (B07) — annotations + opt-in load after mount, not in the
  // state initializers: the loaders return empty/false during SSR but
  // the stored values on the client, which mismatched the prerendered
  // textarea values and the opt-in checkbox whenever stored values
  // existed. The first render matches the server HTML; stored values
  // appear immediately after mount.
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  const [optIn, setOptIn] = useState(false);
  useEffect(() => {
    setAnnotations(loadAnnotations());
    setOptIn(loadAnnotationOptIn());
  }, []);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savedTick, setSavedTick] = useState<Record<string, number>>({});

  // Step 2b — keep the scope/query in the URL (shareable state) without
  // navigating: replaceState only, so typing never reloads the page.
  useEffect(() => {
    const sp = new URLSearchParams();
    sp.set("subject", subject);
    if (query.trim()) sp.set("q", query.trim());
    window.history.replaceState(null, "", `/library?${sp.toString()}`);
  }, [subject, query]);

  const scoped = useMemo(() => {
    const scopes = subject === ALL_SUBJECTS ? subjects : [subject];
    const out: { note: Note; subject: string; key: string }[] = [];
    for (const s of scopes) {
      for (const n of NOTES[s] ?? []) out.push({ note: n, subject: s, key: `${s}||${n.title}` });
    }
    return out;
  }, [subject, subjects]);

  const notes = useMemo(() => {
    if (!query.trim()) return scoped;
    const q = query.toLowerCase();
    return scoped.filter((e) => (e.note.title + " " + e.note.body).toLowerCase().includes(q));
  }, [scoped, query]);

  function toggleOptIn(on: boolean) {
    setOptIn(on);
    setAnnotationOptIn(on);
  }

  function saveNoteAnnotation(key: string) {
    const text = drafts[key] ?? annotations[key] ?? "";
    saveAnnotation(key, text);
    setAnnotations(loadAnnotations());
    setSavedTick((s) => ({ ...s, [key]: Date.now() }));
  }

  return (
    <div>
      <h1>{t("libraryTitle")}</h1>
      <p className="muted">
        {t("libraryIntro1")} <b>{t("recallFirst")}</b> {t("libraryIntro2")}
      </p>
      <div className="card">
        <label style={{ display: "block" }}>
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => toggleOptIn(e.target.checked)}
          />{" "}
          <b>{t("optInLabel")}</b>
        </label>
        <p className="muted">{t("optInDesc")}</p>
      </div>
      {/* Step 2a (P1.1) — the search input shrinks inside the viewport
          (flex:1 + min-width:0); the select is capped by the global
          `select { max-width: 100% }` rule. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select aria-label={t("subjectWord")} value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value={ALL_SUBJECTS}>{t("searchAllSubjects")}</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s} ({NOTES[s].length})
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder={t("searchNotesPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("searchNotesLabel")}
          style={{ flex: 1, minWidth: 0 }}
        />
      </div>
      {/* Step 2b — matching count, always shown: the scoped total when
          no query is typed, the match count + query when searching. */}
      <p className="muted">
        {query.trim() ? (
          <span dir="ltr">{tf("libraryMatchCountQuery", { n: notes.length, q: lri(query.trim()) })}</span>
        ) : (
          <span dir="ltr">{tf("libraryMatchCount", { n: notes.length, total: scoped.length })}</span>
        )}
      </p>
      {notes.length === 0 && <p>{t("noNotesMatch")}</p>}
      {notes.map((e, noteIndex) => {
        const n = e.note;
        const isHidden = hidden[e.key] ?? true;
        const draft = drafts[e.key] ?? annotations[e.key] ?? "";
        // Localization Pass 1 — TRI-LANGUAGE PROOF OF CONCEPT: the
        // rendered title/body go through localizeNote(), which falls
        // back to the English fields whenever no ur/roman translation
        // exists (today: every note — behaviour is unchanged). The
        // storage key and annotation lookup stay on the ORIGINAL
        // English title, so stored annotations are unaffected by the
        // display language.
        const shown = localizeNote(n, lang);
        // Step 2a — stable id for the reveal control's aria-controls:
        // the note key sanitized + the list index (the key alone can
        // contain spaces/punctuation, which are invalid in an id).
        const bodyId = `note-body-${noteIndex}-${e.key.replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
        // Step 2b — related deep links: practice drill for this
        // subject's bank (omitted when no exact bank exists, e.g.
        // Drawing/PE), flashcards (category-scoped when the subject
        // IS a flashcard category, else the plain page), and the first
        // plan day mentioning the subject (omitted when none does).
        const bankKey = noteBankKey(e.subject);
        const flashCategory = flashcardCategoryForNote(e.subject);
        const planDay = planDayForSubject(e.subject);
        return (
          <div className="card" key={e.key}>
            <h3 dir="auto">{shown.title}</h3>
            {/* Stage 1 P2 — provenance badge (renders only when the note
                carries a sourceKind, e.g. the 15 concept-extracted notes). */}
            <ProvenanceBadge source={n.source} sourceKind={n.sourceKind} syllabusClause={n.syllabusClause} />
            {/* Step 2b — translation status: in Urdu/Roman mode, notes
                without a translation for that language are labelled as
                English source text, so the English is never mistaken
                for a missing translation. */}
            {lang !== "en" && !hasTranslation(n, lang) && (
              <p>
                <span className="badge grey">{t("englishSourceText")}</span>
              </p>
            )}
            {n.source && (
              <p className="muted">
                <span dir="auto">{n.source}</span>
              </p>
            )}
            {/* Step 2a — ONE reveal control with aria-expanded +
                aria-controls; the body is always rendered and hidden
                with the `hidden` attribute (was a conditional render
                with two different buttons, invisible to assistive
                tech). Layout is unchanged: a hidden <p> takes no space. */}
            <p dir="auto" id={bodyId} hidden={isHidden}>
              {shown.body}
            </p>
            <button
              className="secondary"
              aria-expanded={!isHidden}
              aria-controls={bodyId}
              onClick={() => setHidden((h) => ({ ...h, [e.key]: !isHidden }))}
            >
              {isHidden ? t("recallReveal") : t("hideAgain")}
            </button>
            <p className="muted">
              {t("relatedLabel")}{" "}
              {bankKey && (
                <>
                  <Link href={`/practice?subject=${encodeURIComponent(bankKey)}`}>{t("relatedPractice")}</Link>
                  {" · "}
                </>
              )}
              <Link
                href={
                  flashCategory
                    ? `/flashcards?category=${encodeURIComponent(flashCategory)}`
                    : "/flashcards"
                }
              >
                {t("relatedFlashcards")}
              </Link>
              {planDay !== null && (
                <>
                  {" · "}
                  <Link href={`/plan#plan-day-${planDay}`}>{t("relatedPlan")}</Link>
                </>
              )}
            </p>
            <div style={{ marginTop: 12 }}>
              <label>
                <span className="muted">{t("annotationLabel")}</span>
                <textarea
                  aria-label={tf("annotationAria", { title: lri(n.title) })}
                  value={draft}
                  onChange={(e2) => setDrafts((d) => ({ ...d, [e.key]: e2.target.value }))}
                  rows={2}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  placeholder={t("annotationPlaceholder")}
                />
              </label>
              {/* Step 2a (P1.1) — the save row wraps at 360px. */}
              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
                <button className="secondary" onClick={() => saveNoteAnnotation(e.key)}>
                  {t("saveAnnotation")}
                </button>
                {savedTick[e.key] && (
                  <span className="muted">{t("annotationSaved")}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Library() {
  return (
    <Suspense>
      <LibraryInner />
    </Suspense>
  );
}
