// Library — notes with "Recall first" prompts.
// Stage 1 P0.3 — owner annotations: a private text field on each note,
// stored locally only. Annotations are NEVER sent to the AI tutor unless
// the owner enables the opt-in below (default OFF).
"use client";

import { useEffect, useMemo, useState } from "react";
import { NOTES, localizeNote } from "@/lib/data";
import { lri, useLang } from "@/lib/i18n";
import ProvenanceBadge from "@/components/ProvenanceBadge";
import {
  loadAnnotationOptIn,
  loadAnnotations,
  saveAnnotation,
  setAnnotationOptIn,
} from "@/lib/tracking";

export default function Library() {
  const { lang, t, tf } = useLang();
  const subjects = useMemo(() => Object.keys(NOTES).sort(), []);
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const [query, setQuery] = useState("");
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

  const notes = useMemo(() => {
    const list = (NOTES[subject] ?? []).map((n) => ({
      ...n,
      key: `${subject}||${n.title}`,
    }));
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((n) => (n.title + " " + n.body).toLowerCase().includes(q));
  }, [subject, query]);

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
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select aria-label={t("subjectWord")} value={subject} onChange={(e) => setSubject(e.target.value)}>
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
        />
      </div>
      {notes.length === 0 && <p>{t("noNotesMatch")}</p>}
      {notes.map((n) => {
        const isHidden = hidden[n.key] ?? true;
        const draft = drafts[n.key] ?? annotations[n.key] ?? "";
        // Localization Pass 1 — TRI-LANGUAGE PROOF OF CONCEPT: the
        // rendered title/body go through localizeNote(), which falls
        // back to the English fields whenever no ur/roman translation
        // exists (today: every note — behaviour is unchanged). The
        // storage key and annotation lookup stay on the ORIGINAL
        // English title, so stored annotations are unaffected by the
        // display language.
        const shown = localizeNote(n, lang);
        return (
          <div className="card" key={n.key}>
            <h3 dir="auto">{shown.title}</h3>
            {/* Stage 1 P2 — provenance badge (renders only when the note
                carries a sourceKind, e.g. the 15 concept-extracted notes). */}
            <ProvenanceBadge source={n.source} sourceKind={n.sourceKind} syllabusClause={n.syllabusClause} />
            {n.source && (
              <p className="muted">
                <span dir="auto">{n.source}</span>
              </p>
            )}
            {isHidden ? (
              <button className="secondary" onClick={() => setHidden((h) => ({ ...h, [n.key]: false }))}>
                {t("recallReveal")}
              </button>
            ) : (
              <>
                <p dir="auto">{shown.body}</p>
                <button className="secondary" onClick={() => setHidden((h) => ({ ...h, [n.key]: true }))}>
                  {t("hideAgain")}
                </button>
              </>
            )}
            <div style={{ marginTop: 12 }}>
              <label>
                <span className="muted">{t("annotationLabel")}</span>
                <textarea
                  aria-label={tf("annotationAria", { title: lri(n.title) })}
                  value={draft}
                  onChange={(e) => setDrafts((d) => ({ ...d, [n.key]: e.target.value }))}
                  rows={2}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  placeholder={t("annotationPlaceholder")}
                />
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                <button className="secondary" onClick={() => saveNoteAnnotation(n.key)}>
                  {t("saveAnnotation")}
                </button>
                {savedTick[n.key] && (
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
