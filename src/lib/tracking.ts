// Preparation tracking — localStorage-first (single user, single device).
// Every dashboard number is computed from real stored attempts only.
// Empty state = "no attempts yet". Never invented sample data.
// Export/import (JSON file) so progress is never trapped in one browser.
"use client";

export type Attempt = {
  id: string;
  kind: "quiz" | "mock" | "flash";
  subject?: string; // subject label, e.g. "Islamiyat"
  mockId?: string;
  trackId?: string;
  title: string;
  total: number;
  correct: number;
  seconds: number;
  date: string; // ISO timestamp
  perSubject?: Record<string, [number, number]>; // [correct, total]
};

export type FlashState = {
  [cardId: string]: { grade: "again" | "hard" | "good" | "easy"; due: string; interval: number; reps: number };
};

const ATTEMPTS_KEY = "etea_attempts_next";
const PLAN_KEY = "etea_plan_next";
const FLASH_KEY = "etea_flash_next";
const DAY_KEY = "etea_last_day_next";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadAttempts(): Attempt[] {
  if (typeof window === "undefined") return [];
  return safeParse<Attempt[]>(localStorage.getItem(ATTEMPTS_KEY), []);
}

export function recordAttempt(a: Omit<Attempt, "id" | "date"> & { date?: string }): Attempt {
  const rec: Attempt = {
    ...a,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: a.date ?? new Date().toISOString(),
  };
  const all = loadAttempts();
  all.push(rec);
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
  localStorage.setItem(DAY_KEY, new Date().toISOString().slice(0, 10));
  return rec;
}

export function clearAttempts() {
  localStorage.removeItem(ATTEMPTS_KEY);
}

// ---- study plan checkboxes ----
export function loadPlanState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, boolean>>(localStorage.getItem(PLAN_KEY), {});
}
export function savePlanState(s: Record<string, boolean>) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(s));
}

// ---- flashcards SM-2-style state ----
export function loadFlashState(): FlashState {
  if (typeof window === "undefined") return {};
  return safeParse<FlashState>(localStorage.getItem(FLASH_KEY), {});
}
export function saveFlashState(s: FlashState) {
  localStorage.setItem(FLASH_KEY, JSON.stringify(s));
}

/** SM-2-style scheduling aid (plain JS): Again=1d, Hard=2d, Good=3d→7d→14d, Easy=7d→14d→30d. */
export function nextDue(grade: FlashState[string]["grade"], interval: number): { due: string; interval: number } {
  const days =
    grade === "again" ? 1 : grade === "hard" ? 2 : grade === "good" ? (interval < 3 ? 3 : interval < 7 ? 7 : 14) : interval < 7 ? 7 : interval < 14 ? 14 : 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return { due: d.toISOString().slice(0, 10), interval: days };
}

// ---- live stats, computed only from real attempts ----
export type Stats = {
  totalAttempts: number;
  totalQuestions: number;
  totalCorrect: number;
  accuracy: number; // 0..100, null-safe -> 0 when no attempts
  totalMinutes: number;
  streakDays: number;
  perSubject: Record<string, { correct: number; total: number; attempts: number; accuracy: number }>;
  perTrack: Record<string, { correct: number; total: number; attempts: number; accuracy: number }>;
  mockHistory: Attempt[];
  daily: { date: string; correct: number; total: number; attempts: number }[];
  weakest: { subject: string; accuracy: number; total: number }[];
  strongest: { subject: string; accuracy: number; total: number }[];
  hasData: boolean;
};

export function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export function computeStats(attempts: Attempt[]): Stats {
  const hasData = attempts.length > 0;
  const totalQuestions = attempts.reduce((s, a) => s + a.total, 0);
  const totalCorrect = attempts.reduce((s, a) => s + a.correct, 0);
  const totalMinutes = Math.round(attempts.reduce((s, a) => s + a.seconds, 0) / 60);
  const perSubject: Stats["perSubject"] = {};
  const perTrack: Stats["perTrack"] = {};
  const dailyMap: Record<string, { correct: number; total: number; attempts: number }> = {};
  for (const a of attempts) {
    const dk = dayKey(a.date);
    const d = dailyMap[dk] ?? { correct: 0, total: 0, attempts: 0 };
    d.correct += a.correct;
    d.total += a.total;
    d.attempts += 1;
    dailyMap[dk] = d;
    const subs = a.perSubject ?? (a.subject ? { [a.subject]: [a.correct, a.total] as [number, number] } : {});
    for (const [subj, [c, t]] of Object.entries(subs)) {
      const e = perSubject[subj] ?? { correct: 0, total: 0, attempts: 0, accuracy: 0 };
      e.correct += c;
      e.total += t;
      e.attempts += 1;
      perSubject[subj] = e;
    }
    if (a.trackId) {
      const e = perTrack[a.trackId] ?? { correct: 0, total: 0, attempts: 0, accuracy: 0 };
      e.correct += a.correct;
      e.total += a.total;
      e.attempts += 1;
      perTrack[a.trackId] = e;
    }
  }
  for (const e of Object.values(perSubject)) e.accuracy = e.total ? (e.correct / e.total) * 100 : 0;
  for (const e of Object.values(perTrack)) e.accuracy = e.total ? (e.correct / e.total) * 100 : 0;
  const daily = Object.entries(dailyMap)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
  // streak: consecutive days ending today (or yesterday if no attempt today yet)
  const daySet = new Set(daily.map((d) => d.date));
  let streakDays = 0;
  const cursor = new Date();
  if (!daySet.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const subjList = Object.entries(perSubject)
    .map(([subject, v]) => ({ subject, accuracy: v.accuracy, total: v.total }))
    .filter((x) => x.total >= 5)
    .sort((a, b) => a.accuracy - b.accuracy);
  return {
    totalAttempts: attempts.length,
    totalQuestions,
    totalCorrect,
    accuracy: totalQuestions ? (totalCorrect / totalQuestions) * 100 : 0,
    totalMinutes,
    streakDays,
    perSubject,
    perTrack,
    mockHistory: attempts.filter((a) => a.kind === "mock").sort((a, b) => b.date.localeCompare(a.date)),
    daily,
    weakest: subjList.slice(0, 5),
    strongest: [...subjList].reverse().slice(0, 5),
    hasData,
  };
}

// ---- export / import ----
export function exportProgress(): string {
  const payload = {
    app: "etea-prep-next",
    version: 3,
    exportedAt: new Date().toISOString(),
    attempts: loadAttempts(),
    plan: loadPlanState(),
    flashcards: loadFlashState(),
  };
  return JSON.stringify(payload, null, 2);
}

export function importProgress(json: string): { ok: boolean; error?: string; imported?: number } {
  try {
    const p = JSON.parse(json);
    if (!p || p.app !== "etea-prep-next" || !Array.isArray(p.attempts)) {
      return { ok: false, error: "Not a valid ETEA Prep export file." };
    }
    const existing = loadAttempts();
    const seen = new Set(existing.map((a) => a.id));
    const fresh = p.attempts.filter((a: Attempt) => a && a.id && !seen.has(a.id));
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify([...existing, ...fresh]));
    if (p.plan && typeof p.plan === "object") savePlanState({ ...loadPlanState(), ...p.plan });
    if (p.flashcards && typeof p.flashcards === "object")
      saveFlashState({ ...loadFlashState(), ...p.flashcards });
    return { ok: true, imported: fresh.length };
  } catch {
    return { ok: false, error: "Could not read that file (invalid JSON)." };
  }
}

export function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
