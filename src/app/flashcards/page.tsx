// Flashcards — FSRS-7 adaptive spaced repetition (Again/Hard/Good/Easy).
// Scheduling is ts-fsrs 6.0.0 (see src/lib/fsrs.ts): each card carries
// stability/difficulty, due is a datetime, and learning steps are 1m/10m
// (same-day reviews). The session queue is built ONCE at session start
// (buildReviewQueue: due cards earliest-first, then new cards in bank
// order) and is never re-sorted by grading: advanceReviewQueue only
// appends a Learning/Relearning card to the end of the session
// (same-session relearning). Future-due cards are not in the live queue
// unless the user explicitly picks cram mode. Card ids are stable hashes
// of front+back (never array indices), so stored scheduling state
// survives content edits. On first load after Stage 2, the old
// fixed-ladder state is migrated (due dates preserved, intervals
// restarted) with the original state saved verbatim as a backup — see
// runFlashMigration in src/lib/tracking.ts. Every grade is stored
// locally and feeds the Analysis page (flashcard attempts are
// self-ratings and are NOT mixed into MCQ accuracy).
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { FLASHCARDS } from "@/lib/data";
import { lri, useLang } from "@/lib/i18n";
import {
  advanceReviewQueue,
  buildReviewQueue,
  download,
  exportProgress,
  flashcardId,
  gradeButtonLabel,
  recordAttempt,
  runFlashMigration,
  saveFlashState,
  type FlashGrade,
  type FlashMigrationInfo,
  type FlashState,
} from "@/lib/tracking";
import {
  formatFsrsInterval,
  formatLocalDueDate,
  initFsrsScheduler,
  previewFsrsGrades,
  reviewFsrsCard,
  type FsrsPreview,
  type FsrsScheduler,
} from "@/lib/fsrs";

type CardWithId = { id: string; front: string; back: string; category: string };

const STATE_KEY = ["stateNew", "stateLearning", "stateReview", "stateRelearning"] as const;

export default function FlashcardsPage() {
  return (
    <Suspense>
      <FlashcardsInner />
    </Suspense>
  );
}

function FlashcardsInner() {
  const { lang, t, tf } = useLang();
  const search = useSearchParams();
  // Step 2b — reduced-motion users get the plain instant-swap
  // card (no 3D rotation); everyone else gets the motion flip below.
  const reduceMotion = useReducedMotion();
  const [scheduler, setScheduler] = useState<FsrsScheduler | null>(null);
  const [state, setState] = useState<FlashState>({});
  const [loaded, setLoaded] = useState(false);
  const [migration, setMigration] = useState<FlashMigrationInfo | null>(null);
  const [migrationDismissed, setMigrationDismissed] = useState(false);
  // Step 2b — ?category= deep link (Library "related flashcards"
  // links point here). Validated against the real categories; an
  // unknown value falls back to "All", never a guessed category.
  const [category, setCategory] = useState(() => {
    const c = search.get("category");
    return c && FLASHCARDS.some((f) => f.category === c) ? c : "All";
  });
  const [cram, setCram] = useState(false);
  // Session queue: set ONLY at session start and by advanceReviewQueue's
  // append. It is never recomputed from `state` during the session.
  const [queue, setQueue] = useState<string[]>([]);
  const [pos, setPos] = useState(0);
  // Step 2b — session composition, snapshotted at session start: new
  // cards vs due reviews in THIS session's queue. Separate numbers,
  // never conflated into one single total.
  const [composition, setComposition] = useState({ fresh: 0, due: 0 });
  const [flipped, setFlipped] = useState(false);
  const [session, setSession] = useState({ correct: 0, total: 0 });
  const [sessionStart, setSessionStart] = useState(() => Date.now());
  const [done, setDone] = useState(false);
  // Step 2b — failed-save warning: set when a grade's save fails, with
  // retry + export actions. Cleared by the next successful save.
  const [saveFailed, setSaveFailed] = useState(false);
  const [saveRecovered, setSaveRecovered] = useState(false);
  // Step 2 fixes — the most recently graded card's next review: the
  // stored due datetime + the interval grading scheduled, captured at
  // grade time (the interval must not shrink as the clock moves).
  // Rendered as a local calendar date + the relative interval, and
  // cleared by startSession so it never describes a previous session.
  const [lastGraded, setLastGraded] = useState<{ dueAt: string; intervalMs: number } | null>(null);

  const cards: CardWithId[] = useMemo(
    () => FLASHCARDS.map((c) => ({ ...c, id: flashcardId(c.front, c.back) })),
    [],
  );
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(FLASHCARDS.map((c) => c.category))).sort()],
    [],
  );

  function startSession(cat: string, cramMode: boolean, flash: FlashState) {
    const q = buildReviewQueue(cards, flash, new Date(), { category: cat, cram: cramMode });
    setQueue(q);
    // Step 2b — snapshot the session composition from the built queue:
    // unique cards with no stored state are New; the rest are due
    // reviews. Computed from the same queue + state the session uses.
    const unique = [...new Set(q)];
    const fresh = unique.filter((id) => !flash[id]).length;
    setComposition({ fresh, due: unique.length - fresh });
    setPos(0);
    setFlipped(false);
    setSession({ correct: 0, total: 0 });
    setSessionStart(Date.now());
    setDone(false);
    setSaveFailed(false);
    setSaveRecovered(false);
    setLastGraded(null);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Scheduler creation is async (cached); the session starts only
      // once it is ready, so grade previews are always available.
      const s = await initFsrsScheduler();
      if (cancelled) return;
      setScheduler(s);
      const { state: migrated, info } = runFlashMigration(FLASHCARDS);
      if (cancelled) return;
      setMigration(info);
      setState(migrated);
      setLoaded(true);
      startSession(category, false, migrated);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = queue[pos] !== undefined ? byId.get(queue[pos]) : undefined;
  const cardState = card ? state[card.id] : undefined;

  // FSRS-computed intervals for the current card, one per grade. Pure
  // and fast (preview never mutates the card); recomputed on every
  // render so the labels always match the current card + state. Fuzz is
  // off, so these are exactly the intervals grading will apply.
  const previews: FsrsPreview[] | null =
    scheduler && card ? previewFsrsGrades(scheduler, cardState ?? null, new Date()) : null;
  const previewNow = Date.now();
  function intervalLabel(g: FlashGrade): string {
    const p = previews?.find((x) => x.grade === g);
    if (!p) return "";
    return formatFsrsInterval(p.dueAt.getTime() - previewNow, lang);
  }

  function grade(g: FlashGrade) {
    if (!card || !scheduler) return;
    const now = new Date();
    const updated = reviewFsrsCard(scheduler, cardState ?? null, g, now);
    // Step 2 fixes — remember this grade's scheduled next review so the
    // page shows the graded card's next-due calendar date (local
    // timezone) + the relative interval, instead of only the interval
    // that was on the grade button.
    setLastGraded({ dueAt: updated.dueAt, intervalMs: new Date(updated.dueAt).getTime() - now.getTime() });
    const next = { ...state, [card.id]: updated };
    setState(next);
    // Step 2b — the save result is no longer ignored: a failed save
    // shows the warning banner (retry/export) instead of silently
    // losing the grade. The in-memory state still advances, so grading
    // is never blocked; retry saves the latest state.
    const saved = saveFlashState(next);
    setSaveFailed(!saved);
    if (saved) setSaveRecovered(false);
    const good = g === "good" || g === "easy";
    const newSession = { correct: session.correct + (good ? 1 : 0), total: session.total + 1 };
    setSession(newSession);
    const res = advanceReviewQueue(queue, pos, updated.state);
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

  return (
    <div>
      <h1>{t("flashTitle")}</h1>
      <p className="muted">{t("flashIntro")}</p>
      {migration && !migrationDismissed && (
        <div className="alert">
          <p>
            {tf("flashMigratedNotice", {
              migrated: migration.migrated,
              reset: migration.reset,
            })}
          </p>
          {migration.backupFailed && <p>{t("flashMigrationBackupFailed")}</p>}
          <button className="secondary" onClick={() => setMigrationDismissed(true)}>
            {t("closeWord")}
          </button>
        </div>
      )}
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
          {/* Step 2b — New / Due reviews / Session total as SEPARATE
              numbers: the composition snapshot (this session's queue)
              plus the session's own reviewed/recalled counts. */}
          {t("flashNewLabel")}: <b>{composition.fresh}</b> · {t("flashDueReviewsLabel")}:{" "}
          <b>{composition.due}</b> · {t("sessionLabel")}{" "}
          <span dir="ltr">
            {session.total}
          </span>{" "}
          {t("flashSessionReviewed")} ·{" "}
          <span dir="ltr">
            {session.correct}
          </span>{" "}
          {t("recalledLabel")}
        </span>
      </div>
      {/* Step 2 fixes — the graded card's next review as a local
          calendar date + the relative interval. Rendered outside the
          card/done conditional so it stays visible on the finished
          screen too; startSession clears it. */}
      {lastGraded && (
        <p className="muted">
          {tf("flashGradedNextReview", {
            date: lri(formatLocalDueDate(lastGraded.dueAt)),
            interval: lri(formatFsrsInterval(lastGraded.intervalMs, lang)),
          })}
        </p>
      )}
      {saveFailed && (
        <div className="alert red">
          <p>{t("flashSaveFailed")}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                const ok = saveFlashState(state);
                setSaveFailed(!ok);
                if (ok) setSaveRecovered(true);
              }}
            >
              {t("flashRetrySave")}
            </button>
            <button
              className="secondary"
              onClick={() =>
                download(`etea-prep-progress-${new Date().toISOString().slice(0, 10)}.json`, exportProgress())
              }
            >
              {t("export")}
            </button>
          </div>
        </div>
      )}
      {saveRecovered && !saveFailed && <p className="muted">{t("flashSaveRecovered")}</p>}
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
            {cardState
              ? ` · ${tf("fsrsStateLine", {
                  state: t(STATE_KEY[cardState.state] ?? "stateNew"),
                  // Step 2 fixes — Learning/Relearning cards showed
                  // only the relative interval; the local calendar
                  // date now rides alongside it, so the current
                  // card's due date is visible in every state.
                  due: lri(
                    cardState.state === 1 || cardState.state === 3
                      ? `${formatFsrsInterval(new Date(cardState.dueAt).getTime() - Date.now(), lang)} · ${formatLocalDueDate(cardState.dueAt)}`
                      : formatLocalDueDate(cardState.dueAt),
                  ),
                })}`
              : ` · ${t("newCard")}`}
          </p>
          {/* Stage 3 part 2 — REAL 3D FLIP. The card surface is still
              a native <button> (Stage 1 P1 Tier 4, B05): Enter/Space
              flip it for free, with a visible focus outline. The
              button itself rotates on the Y axis (motion); both faces
              share one grid cell so the card height is the taller
              face, and the hidden face is aria-hidden so a screen
              reader hears only the visible side. aria-pressed reports
              the flip state. Reduced-motion renders the plain
              instant-swap button above this comment's branch.
              Card content stays dir="auto" (English + future
              Urdu/Arabic card text). */}
          {reduceMotion ? (
            <button type="button" className="card flashcard" onClick={() => setFlipped(!flipped)} aria-pressed={flipped}>
              <span dir="auto">{flipped ? card.back : card.front}</span>
            </button>
          ) : (
            <div className="flip-scene">
              <motion.button
                type="button"
                className="card flashcard flip-inner"
                onClick={() => setFlipped(!flipped)}
                aria-pressed={flipped}
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
              >
                <span dir="auto" className="flip-face flip-front" aria-hidden={flipped}>
                  {card.front}
                </span>
                <span dir="auto" className="flip-face flip-back" aria-hidden={!flipped}>
                  {card.back}
                </span>
              </motion.button>
            </div>
          )}
          {!flipped ? (
            <button onClick={() => setFlipped(true)}>{t("flipCard")}</button>
          ) : previews ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="secondary" onClick={() => grade("again")}>
                {gradeButtonLabel("again", intervalLabel("again"), lang)}
              </button>
              <button className="secondary" onClick={() => grade("hard")}>
                {gradeButtonLabel("hard", intervalLabel("hard"), lang)}
              </button>
              <button onClick={() => grade("good")}>{gradeButtonLabel("good", intervalLabel("good"), lang)}</button>
              <button onClick={() => grade("easy")}>{gradeButtonLabel("easy", intervalLabel("easy"), lang)}</button>
            </div>
          ) : null}
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
