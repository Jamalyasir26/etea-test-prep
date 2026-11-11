// Flashcards — simple spaced-review schedule (Again/Hard/Good/Easy).
// The due queue is FROZEN ONCE at session start (buildSessionQueue) and is
// never re-sorted by grading: gradeCard only appends an "again" card to the
// end of the session (same-session relearning). Future-due cards are not in
// the live queue unless the user explicitly picks cram mode. Card ids are
// stable hashes of front+back (never array indices), so stored scheduling
// state survives content edits; pre-Phase-2 `card-N` state is migrated
// once on load. Every grade is stored locally and feeds the Analysis page
// (flashcard attempts are self-ratings and are NOT mixed into MCQ accuracy).
"use client";

import { useEffect, useMemo, useState } from "react";
import { FLASHCARDS } from "@/lib/data";
import {
  buildSessionQueue,
  flashcardId,
  gradeButtonLabel,
  gradeCard,
  loadFlashState,
  migrateFlashState,
  nextDue,
  recordAttempt,
  saveFlashState,
  type FlashGrade,
  type FlashState,
} from "@/lib/tracking";

type CardWithId = { id: string; front: string; back: string; category: string };

export default function FlashcardsPage() {
  const [state, setState] = useState<FlashState>({});
  const [loaded, setLoaded] = useState(false);
  const [category, setCategory] = useState("All");
  const [cram, setCram] = useState(false);
  // Frozen session queue: set ONLY at session start and by gradeCard's
  // append. It is never recomputed from `state` during the session.
  const [queue, setQueue] = useState<string[]>([]);
  const [pos, setPos] = useState(0);
  const [dueTotal, setDueTotal] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [session, setSession] = useState({ correct: 0, total: 0 });
  const [sessionStart, setSessionStart] = useState(() => Date.now());
  const [done, setDone] = useState(false);

  const cards: CardWithId[] = useMemo(
    () => FLASHCARDS.map((c) => ({ ...c, id: flashcardId(c.front, c.back) })),
    [],
  );
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(FLASHCARDS.map((c) => c.category))).sort()],
    [],
  );
  const today = new Date().toISOString().slice(0, 10);

  function startSession(cat: string, cramMode: boolean, flash: FlashState) {
    const q = buildSessionQueue(cards, flash, today, { category: cat, cram: cramMode });
    setQueue(q);
    setDueTotal(q.length);
    setPos(0);
    setFlipped(false);
    setSession({ correct: 0, total: 0 });
    setSessionStart(Date.now());
    setDone(false);
  }

  useEffect(() => {
    const raw = loadFlashState();
    const { state: migrated, migrated: didMigrate } = migrateFlashState(raw, FLASHCARDS);
    if (didMigrate) saveFlashState(migrated);
    setState(migrated);
    setLoaded(true);
    startSession("All", false, migrated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = queue[pos] !== undefined ? byId.get(queue[pos]) : undefined;

  function grade(g: FlashGrade) {
    if (!card) return;
    const prev = state[card.id];
    const { due, interval } = nextDue(g, prev?.interval ?? 0);
    const next = { ...state, [card.id]: { grade: g, due, interval, reps: (prev?.reps ?? 0) + 1 } };
    setState(next);
    saveFlashState(next);
    const good = g === "good" || g === "easy";
    const newSession = { correct: session.correct + (good ? 1 : 0), total: session.total + 1 };
    setSession(newSession);
    const res = gradeCard(queue, pos, g);
    if (res.nextIndex >= res.queue.length) {
      setQueue(res.queue);
      setPos(res.nextIndex);
      setDone(true);
      recordAttempt({
        kind: "flash",
        subject: category === "All" ? undefined : category,
        title: `Flashcards — ${category}${cram ? " (cram)" : ""}`,
        total: newSession.total,
        correct: newSession.correct,
        seconds: Math.round((Date.now() - sessionStart) / 1000),
      });
    } else {
      setQueue(res.queue);
      setPos(res.nextIndex);
      setFlipped(false);
    }
  }

  const prevInterval = card ? (state[card.id]?.interval ?? 0) : 0;

  return (
    <div>
      <h1>Flashcards — simple spaced-review schedule</h1>
      <p className="muted">
        Answer <b>before</b> flipping the card (retrieval practice). Grade yourself: Again / Hard
        / Good / Easy. This is a simple spaced-review schedule (a fixed interval ladder, not
        SM-2): Hard returns in 2 days, Good in 3–14 days, Easy in 7–30 days. “Again” brings the
        card back later <b>this session</b> and keeps it due today. Only cards due today are in
        the session — future-due cards stay out unless you turn on cram mode.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select
          aria-label="Category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            startSession(e.target.value, cram, state);
          }}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={cram}
            onChange={(e) => {
              setCram(e.target.checked);
              startSession(category, e.target.checked, state);
            }}
          />
          Cram mode (also show future-due cards)
        </label>
        <span className="muted">
          Due today: <b>{dueTotal}</b> · Session: {session.correct}/{session.total} recalled
        </span>
      </div>
      {!loaded ? (
        <p>Loading…</p>
      ) : done ? (
        <div className="card">
          <h2>Session finished</h2>
          <p>
            Recalled {session.correct} of {session.total} cards. “Again” cards were shown once
            more this session; the rest return on their scheduled day. Flashcard self-ratings are
            kept separate from quiz/mock accuracy on the Analysis page.
          </p>
          <button
            onClick={() => {
              startSession(category, cram, state);
            }}
          >
            Review again
          </button>
        </div>
      ) : card ? (
        <div>
          <p className="muted">
            Card {pos + 1} of {queue.length} · {card.category}
            {state[card.id]
              ? ` · last grade: ${state[card.id].grade}, next due ${state[card.id].due}`
              : " · new card"}
          </p>
          <div className="card flashcard" onClick={() => setFlipped(!flipped)} role="button" tabIndex={0}>
            {flipped ? card.back : card.front}
          </div>
          {!flipped ? (
            <button onClick={() => setFlipped(true)}>Flip card</button>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="secondary" onClick={() => grade("again")}>
                {gradeButtonLabel("again", prevInterval)}
              </button>
              <button className="secondary" onClick={() => grade("hard")}>
                {gradeButtonLabel("hard", prevInterval)}
              </button>
              <button onClick={() => grade("good")}>{gradeButtonLabel("good", prevInterval)}</button>
              <button onClick={() => grade("easy")}>{gradeButtonLabel("easy", prevInterval)}</button>
            </div>
          )}
        </div>
      ) : (
        <p>
          No cards due today in this category.
          {cram
            ? ""
            : " Turn on cram mode to also review future-due cards, or pick another category."}
        </p>
      )}
    </div>
  );
}
