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
import { lri, useLang } from "@/lib/i18n";
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
  const { lang, t, tf } = useLang();
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
      <h1>{t("flashTitle")}</h1>
      <p className="muted">{t("flashIntro")}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select
          aria-label={t("categoryLabel")}
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
          {t("cramLabel")}
        </label>
        <span className="muted">
          {t("dueToday")} <b>{dueTotal}</b> · {t("sessionLabel")}{" "}
          {/* Stage 1 P1 Tier 4 (B03) — session fraction isolated LTR. */}
          <span dir="ltr">
            {session.correct}/{session.total}
          </span>{" "}
          {t("recalledLabel")}
        </span>
      </div>
      {!loaded ? (
        <p>{t("loading")}</p>
      ) : done ? (
        <div className="card">
          <h2>{t("sessionFinished")}</h2>
          <p>
            {tf("sessionFinishedBody", {
              fraction: lri(`${session.correct} of ${session.total}`),
            })}
          </p>
          <button
            onClick={() => {
              startSession(category, cram, state);
            }}
          >
            {t("reviewAgain")}
          </button>
        </div>
      ) : card ? (
        <div>
          <p className="muted">
            {t("cardLabel")}{" "}
            <span dir="ltr">
              {pos + 1} of {queue.length}
            </span>{" "}
            · <span dir="ltr">{card.category}</span>
            {state[card.id]
              ? ` · ${tf("lastGrade", { grade: lri(state[card.id].grade), due: lri(state[card.id].due) })}`
              : ` · ${t("newCard")}`}
          </p>
          {/* Stage 1 P1 Tier 4 (B05) — the card surface is a native
              <button>: Enter/Space flip it for free, with a visible
              focus outline (see :focus-visible in globals.css). No
              aria-label: the card text itself is the button's
              accessible name, so screen readers hear the question /
              answer. The separate native "Flip card" button below is
              preserved. Localization Pass 1 — card content is
              dir="auto" so English and future Urdu/Arabic card text
              both render with their punctuation on the right side. */}
          <button type="button" className="card flashcard" onClick={() => setFlipped(!flipped)}>
            <span dir="auto">{flipped ? card.back : card.front}</span>
          </button>
          {!flipped ? (
            <button onClick={() => setFlipped(true)}>{t("flipCard")}</button>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="secondary" onClick={() => grade("again")}>
                {gradeButtonLabel("again", prevInterval, lang)}
              </button>
              <button className="secondary" onClick={() => grade("hard")}>
                {gradeButtonLabel("hard", prevInterval, lang)}
              </button>
              <button onClick={() => grade("good")}>{gradeButtonLabel("good", prevInterval, lang)}</button>
              <button onClick={() => grade("easy")}>{gradeButtonLabel("easy", prevInterval, lang)}</button>
            </div>
          )}
        </div>
      ) : (
        <p>
          {t("noCardsDue")}
          {cram ? "" : ` ${t("noCardsDueHint")}`}
        </p>
      )}
    </div>
  );
}
