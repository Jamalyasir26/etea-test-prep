// Flashcards — SM-2-style spaced repetition (Again/Hard/Good/Easy).
// Due queue first; every grade is stored locally and feeds the Analysis page.
"use client";

import { useEffect, useMemo, useState } from "react";
import { FLASHCARDS } from "@/lib/data";
import { loadFlashState, nextDue, recordAttempt, saveFlashState, type FlashState } from "@/lib/tracking";

type Grade = "again" | "hard" | "good" | "easy";

export default function FlashcardsPage() {
  const [state, setState] = useState<FlashState>({});
  const [category, setCategory] = useState("All");
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [session, setSession] = useState({ correct: 0, total: 0 });
  const [done, setDone] = useState(false);

  useEffect(() => {
    setState(loadFlashState());
  }, []);

  const categories = useMemo(() => ["All", ...Array.from(new Set(FLASHCARDS.map((c) => c.category))).sort()], []);
  const today = new Date().toISOString().slice(0, 10);

  const deck = useMemo(() => {
    const list = FLASHCARDS.map((c, i) => ({ ...c, id: `card-${i}` })).filter(
      (c) => category === "All" || c.category === category,
    );
    const due = list.filter((c) => !state[c.id] || state[c.id].due <= today);
    const fresh = list.filter((c) => state[c.id] && state[c.id].due > today);
    return [...due, ...fresh];
  }, [category, state, today]);

  const card = deck[idx];
  const dueCount = deck.filter((c) => !state[c.id] || state[c.id].due <= today).length;

  function grade(g: Grade) {
    if (!card) return;
    const prev = state[card.id];
    const { due, interval } = nextDue(g, prev?.interval ?? 0);
    const next = { ...state, [card.id]: { grade: g, due, interval, reps: (prev?.reps ?? 0) + 1 } };
    setState(next);
    saveFlashState(next);
    const good = g === "good" || g === "easy";
    setSession((s) => ({ correct: s.correct + (good ? 1 : 0), total: s.total + 1 }));
    if (idx + 1 >= deck.length) {
      setDone(true);
      recordAttempt({
        kind: "flash",
        subject: card.category,
        title: `Flashcards — ${category}`,
        total: deck.length,
        correct: session.correct + (good ? 1 : 0),
        seconds: 0,
      });
    } else {
      setIdx(idx + 1);
      setFlipped(false);
    }
  }

  return (
    <div>
      <h1>Flashcards — Spaced Repetition (SM-2-style)</h1>
      <p className="muted">
        Answer <b>before</b> flipping the card (retrieval practice). Grade yourself: Again / Hard /
        Good / Easy. Cards come back after 1 / 3 / 7 / 14 days — a scheduling aid, not a
        prescription.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select aria-label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setIdx(0); setFlipped(false); setDone(false); setSession({ correct: 0, total: 0 }); }}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="muted">
          Due today: <b>{dueCount}</b> · Session: {session.correct}/{session.total} recalled
        </span>
      </div>
      {done ? (
        <div className="card">
          <h2>Deck finished</h2>
          <p>
            Recalled {session.correct} of {session.total} cards. Due cards will return on their
            scheduled day.
          </p>
          <button
            onClick={() => {
              setIdx(0);
              setDone(false);
              setSession({ correct: 0, total: 0 });
              setFlipped(false);
            }}
          >
            Review again
          </button>
        </div>
      ) : card ? (
        <div>
          <p className="muted">
            Card {idx + 1} of {deck.length} · {card.category}
            {state[card.id] ? ` · last grade: ${state[card.id].grade}, next due ${state[card.id].due}` : " · new card"}
          </p>
          <div className="card flashcard" onClick={() => setFlipped(!flipped)} role="button" tabIndex={0}>
            {flipped ? card.back : card.front}
          </div>
          {!flipped ? (
            <button onClick={() => setFlipped(true)}>Flip card</button>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="secondary" onClick={() => grade("again")}>Again (1d)</button>
              <button className="secondary" onClick={() => grade("hard")}>Hard (2d)</button>
              <button onClick={() => grade("good")}>Good</button>
              <button onClick={() => grade("easy")}>Easy</button>
            </div>
          )}
        </div>
      ) : (
        <p>No cards in this category.</p>
      )}
    </div>
  );
}
