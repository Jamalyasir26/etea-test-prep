// Library — notes with "Recall first" prompts.
"use client";

import { useMemo, useState } from "react";
import { NOTES } from "@/lib/data";

export default function Library() {
  const subjects = useMemo(() => Object.keys(NOTES).sort(), []);
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const notes = useMemo(() => {
    const list = (NOTES[subject] ?? []).map((n, i) => ({ ...n, key: `${subject}-${i}` }));
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((n) => (n.title + " " + n.body).toLowerCase().includes(q));
  }, [subject, query]);

  return (
    <div>
      <h1>Library — Notes</h1>
      <p className="muted">
        Short, exam-focused, original notes. <b>Recall first:</b> cover the note, recall it from
        memory, then read. Plain re-reading is low-utility; retrieval practice is high-utility.
      </p>
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
        return (
          <div className="card" key={n.key}>
            <h3>{n.title}</h3>
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
          </div>
        );
      })}
    </div>
  );
}
