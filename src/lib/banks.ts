// Lazy bank loading — question banks load on demand via dynamic
// import(), one hashed chunk per bank under /_next/static/chunks/.
// A subject's data downloads only when the subject is opened or
// practised; the existing service-worker cache-first rule for
// /_next/static/* caches each chunk (no SW change needed) and serves
// it offline afterwards. content.json (notes, tracks, mocks, plan,
// flashcards) stays statically imported in data.ts.
//
// Counts and the id->bank map come from the GENERATED manifest
// (src/lib/bank-manifest.ts, regenerated on every build) — never
// hand-maintained, so availability labels and ledger counts cannot
// drift from the bank files. Nothing here reads or writes
// localStorage: stored sessions/attempts are untouched, and loadBank
// returns each bank array in FILE ORDER (sampling invariance: the
// same seed + bank order produces the same question sets as the old
// static imports — pinned by scripts/test-lazy-banks.mjs).
//
// Failure behaviour: a failed chunk load (e.g. offline, subject never
// opened online) rejects, and the failed promise is EVICTED from the
// cache so a retry re-attempts the load instead of replaying the
// rejection. Callers MUST show a loading state, then a failure/retry
// state — never mount QuizRunner with an empty list for a scope that
// will later receive questions (an empty set would write a session
// fingerprint that fails against the real set).
import type { Question } from "./data";
import { BANK_COUNTS, BANK_TRUSTED, ID_BANK } from "./bank-manifest";

export { BANK_COUNTS, BANK_TRUSTED, ID_BANK };

export const BANK_KEYS = [
  "arabic",
  "drawing",
  "english",
  "gk",
  "islamiyat",
  "it",
  "maths",
  "pakstudies",
  "pastpapers",
  "pastpapers_reworded",
  "pe",
  "pedagogy",
  "science",
  "socialstudies",
  "tajweed",
  "urdu",
] as const;

// NOTE: drawing_pe.json stays on disk but is deliberately NOT
// registered here: its 20 items live in the split drawing.json and
// pe.json banks (same rule as the old static BANKS map in data.ts).
const LOADERS: Record<string, () => Promise<Question[]>> = {
  arabic: async () => (await import("../data/banks/arabic.json")).default as unknown as Question[],
  drawing: async () => (await import("../data/banks/drawing.json")).default as unknown as Question[],
  english: async () => (await import("../data/banks/english.json")).default as unknown as Question[],
  gk: async () => (await import("../data/banks/gk.json")).default as unknown as Question[],
  islamiyat: async () =>
    (await import("../data/banks/islamiyat.json")).default as unknown as Question[],
  it: async () => (await import("../data/banks/it.json")).default as unknown as Question[],
  maths: async () => (await import("../data/banks/maths.json")).default as unknown as Question[],
  pakstudies: async () =>
    (await import("../data/banks/pakstudies.json")).default as unknown as Question[],
  pastpapers: async () =>
    (await import("../data/banks/pastpapers.json")).default as unknown as Question[],
  pastpapers_reworded: async () =>
    (await import("../data/banks/pastpapers_reworded.json")).default as unknown as Question[],
  pe: async () => (await import("../data/banks/pe.json")).default as unknown as Question[],
  pedagogy: async () => (await import("../data/banks/pedagogy.json")).default as unknown as Question[],
  science: async () => (await import("../data/banks/science.json")).default as unknown as Question[],
  socialstudies: async () =>
    (await import("../data/banks/socialstudies.json")).default as unknown as Question[],
  tajweed: async () => (await import("../data/banks/tajweed.json")).default as unknown as Question[],
  urdu: async () => (await import("../data/banks/urdu.json")).default as unknown as Question[],
};

const cache = new Map<string, Promise<Question[]>>();

/** Load one bank (cached promise: concurrent + repeat calls share one
 *  load). Unknown keys resolve to [] (same as the old `?? []`
 *  fallbacks). A failed load evicts its cache entry so retries work. */
export function loadBank(key: string): Promise<Question[]> {
  const hit = cache.get(key);
  if (hit) return hit;
  const loader = LOADERS[key];
  const p = (
    loader
      ? loader()
      : Promise.resolve([] as Question[])
  ).catch((err: unknown) => {
    if (cache.get(key) === p) cache.delete(key);
    throw err;
  });
  cache.set(key, p);
  return p;
}

/** Load several banks; result keyed by bank key. */
export async function loadBanks(keys: string[]): Promise<Record<string, Question[]>> {
  const out: Record<string, Question[]> = {};
  const lists = await Promise.all(keys.map((k) => loadBank(k)));
  keys.forEach((k, i) => {
    out[k] = lists[i];
  });
  return out;
}

/** All questions from all banks (cached per bank), in BANK_KEYS order
 *  with each bank in file order — the same order the old static
 *  QUESTIONS export had. Used only by surfaces that genuinely need
 *  everything: /review and tutor retrieval. */
export async function loadAllQuestions(): Promise<Question[]> {
  const lists = await Promise.all(BANK_KEYS.map((k) => loadBank(k)));
  return lists.flat();
}

/** Find one question by id, loading ONLY its bank (via the ID_BANK
 *  manifest). Unknown ids resolve to undefined without loading any
 *  bank chunk. */
export async function findQuestionById(id: string): Promise<Question | undefined> {
  const bank = ID_BANK[id];
  if (!bank) return undefined;
  const list = await loadBank(bank);
  return list.find((q) => q.id === id);
}

/** Find several questions by id, in id order, skipping unknown ids.
 *  Loads only the banks the ids belong to. */
export async function findQuestionsByIds(ids: string[]): Promise<Question[]> {
  const needed = [...new Set(ids.map((id) => ID_BANK[id]).filter((k): k is string => Boolean(k)))];
  const banks = await loadBanks(needed);
  const byId = new Map<string, Question>();
  for (const list of Object.values(banks)) {
    for (const q of list) byId.set(q.id, q);
  }
  return ids.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q));
}
