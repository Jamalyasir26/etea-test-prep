// Library — notes with "Recall first" prompts.
// Stage 1 P0.3 — owner annotations: a private text field on each note,
// stored locally only. Annotations are NEVER sent to the AI tutor unless
// the owner enables the opt-in below (default OFF).
"use client";

import { useMemo, useState } from "react";
import { NOTES } from "@/lib/data";
import {
  loadAnnotationOptIn,
  loadAnnotations,
  saveAnnotation,
  setAnnotationOptIn,
} from "@/lib/tracking";

export default function Library() {
  const subjects = useMemo(() => Object.keys(NOTES).sort(), []);
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [annotations, setAnnotations] = useState<Record<string, string>>(() => loadAnnotations());
  const [optIn, setOptIn] = useState(() => loadAnnotationOptIn());
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
      <h1>Library — Notes</h1>
      <p className="muted">
        Short, exam-focused, original notes. <b>Recall first:</b> cover the note, recall it from
        memory, then read. Plain re-reading is low-utility; retrieval practice is high-utility.
      </p>
      <div className="card">
        <label style={{ display: "block" }}>
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => toggleOptIn(e.target.checked)}
          />{" "}
          <b>Include my note annotations in tutor answers</b>
        </label>
        <p className="muted">
          Off by default. Your annotations are private notes stored on this device only — they are
          NOT sent to the AI tutor unless you enable this. When enabled, the tutor sees them as
          your own notes alongside the library.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s} ({NOTES[s].length})
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search notes"
        />
      </div>
      {notes.length === 0 && <p>No notes match that search.</p>}
      {notes.map((n) => {
        const isHidden = hidden[n.key] ?? true;
        const draft = drafts[n.key] ?? annotations[n.key] ?? "";
        return (
          <div className="card" key={n.key}>
            <h3>{n.title}</h3>
            {n.source && <p className="muted">{n.source}</p>}
            {isHidden ? (
              <button className="secondary" onClick={() => setHidden((h) => ({ ...h, [n.key]: false }))}>
                Recall first — tap to reveal
              </button>
            ) : (
              <>
                <p>{n.body}</p>
                <button className="secondary" onClick={() => setHidden((h) => ({ ...h, [n.key]: true }))}>
                  Hide again
                </button>
              </>
            )}
            <div style={{ marginTop: 12 }}>
              <label>
                <span className="muted">Owner annotation (private — not sent to the tutor unless enabled above)</span>
                <textarea
                  aria-label={`Owner annotation for ${n.title}`}
                  value={draft}
                  onChange={(e) => setDrafts((d) => ({ ...d, [n.key]: e.target.value }))}
                  rows={2}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  placeholder="Your own note on this topic — a correction, a reminder, a link to check…"
                />
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                <button className="secondary" onClick={() => saveNoteAnnotation(n.key)}>
                  Save annotation
                </button>
                {savedTick[n.key] && (
                  <span className="muted">Saved privately on this device.</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
