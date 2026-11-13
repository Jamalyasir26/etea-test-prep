// Practice state — the current subject/round/seed is persisted so a
// reload resumes the SAME question set (and QuizRunner resumes its
// saved session for that scope) instead of silently shuffling a new
// set. "New set" bumps the round and stores a fresh seed. Moved out of
// src/app/practice/page.tsx (Step 2 fixes) so the initial-state
// decision is a pure, unit-tested function.
export const PRACTICE_STATE_KEY = "etea_practice_state_next";

export type PracticeState = { subjectKey: string; round: number; seed: number };

export function loadPracticeState(fallbackSubject: string): PracticeState {
  if (typeof window === "undefined") return { subjectKey: fallbackSubject, round: 0, seed: Date.now() };
  try {
    const raw = localStorage.getItem(PRACTICE_STATE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<PracticeState>;
      if (typeof p.subjectKey === "string" && typeof p.round === "number" && typeof p.seed === "number") {
        return { subjectKey: p.subjectKey, round: p.round, seed: p.seed };
      }
    }
  } catch {
    // fall through to a fresh state
  }
  return { subjectKey: fallbackSubject, round: 0, seed: Date.now() };
}

/** Step 2 fixes — resolve the practice run's initial subject/round/seed
 *  from the ?subject= param and the stored practice state. The stored
 *  round AND seed are restored whenever the run's subject IS the stored
 *  subject: that covers the bare URL (no param) and a param naming the
 *  stored subject. Before this fix the bare URL always generated a
 *  fresh seed, so the shuffled set never matched the stored session
 *  and QuizRunner's compatibility guard always reported a mismatch.
 *  A param naming a DIFFERENT valid subject starts a fresh set (round
 *  0, fresh seed): per-scope sessions are the intended design, and the
 *  old subject's stored session stays stored and resumable from Home —
 *  nothing stale is applied and no incompatibility prompt is shown on
 *  a subject change. An invalid param falls back to the stored subject
 *  (the page's long-standing fallback) and restores with it. Pure: the
 *  caller supplies the fresh seed (Date.now()) so tests stay
 *  deterministic. */
export function resolvePracticeInitial(
  param: string,
  stored: PracticeState,
  isValidSubject: (key: string) => boolean,
  freshSeed: number,
): PracticeState {
  const subjectKey = param !== "" && isValidSubject(param) ? param : stored.subjectKey;
  if (subjectKey === stored.subjectKey) {
    return { subjectKey, round: stored.round, seed: stored.seed };
  }
  return { subjectKey, round: 0, seed: freshSeed };
}
