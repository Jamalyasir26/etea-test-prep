// Phase 3 — practice advance: pure topic/revise/adaptive logic.
//
// Pure functions only: no localStorage, no JSX, no "use client".
// Callers pass stored attempts in (via loadAttempts) and render the
// results; nothing here reads or writes any stored state.
//
// Frozen API (see ~/workspace/phase3/BRIEF.md): do not rename, reshape,
// or add parameters. The three functions share two documented
// limitations, stated on each function below:
//  - MCQ attempts only (kind "quiz" / "mock"). Flashcard attempts
//    (kind "flash") are self-ratings, not objective MCQ results, and
//    are excluded everywhere here, even if they carry itemRecords.
//  - Attempts WITHOUT itemRecords contribute nothing. Attempts
//    recorded before per-question tracking existed have no
//    itemRecords, so they do not appear in topic stats or the revise
//    queue. This is a data limitation, not a bug: the per-question
//    facts those views need were never recorded for such attempts.

import type { Attempt, ItemRecord } from "./tracking";
import type { Question } from "./data";
import { hashSeed, mulberry32 } from "./data";

export type TopicStat = {
  topic: string;
  correct: number;
  total: number;
  accuracy: number;
  attempts: number;
  lastAnsweredAt: string | null;
};

/**
 * Per-topic MCQ accuracy from stored attempts.
 *
 * Rules (frozen):
 * - MCQ attempts only (kind "quiz" / "mock"); "flash" attempts are
 *   excluded even if they carry itemRecords.
 * - Aggregates ItemRecord.topic with first-pass `correct` (retries
 *   never change the first-pass score).
 * - Records with an empty/blank topic are skipped. All other topics
 *   are grouped verbatim (no trimming/normalising of the topic key).
 * - Attempts WITHOUT itemRecords contribute nothing (see the file
 *   header: pre-tracking attempts do not appear in topic stats).
 * - `attempts` = number of attempts contributing >= 1 (non-skipped)
 *   record to the topic.
 * - `lastAnsweredAt` = max record `answeredAt` (ISO strings compare
 *   lexicographically); null when every included record has a null
 *   `answeredAt`.
 * - `accuracy` = (correct / total) * 100, unrounded, 0..100 — the
 *   same convention as computeStats in tracking.ts (callers round
 *   for display).
 * - Sort: accuracy ASC, then total DESC, then topic ASC (plain
 *   code-unit comparison, deterministic in every locale). Weakest
 *   topics first.
 *
 * The input array is never mutated.
 */
export function computeTopicStats(attempts: Attempt[]): TopicStat[] {
  type Acc = {
    correct: number;
    total: number;
    attemptIndexes: Set<number>;
    lastAnsweredAt: string | null;
  };
  const byTopic = new Map<string, Acc>();

  attempts.forEach((attempt, attemptIndex) => {
    if (attempt.kind !== "quiz" && attempt.kind !== "mock") return;
    const records: ItemRecord[] | undefined = attempt.itemRecords;
    if (!records) return;
    for (const record of records) {
      if (record.topic.trim() === "") continue;
      let acc = byTopic.get(record.topic);
      if (!acc) {
        acc = { correct: 0, total: 0, attemptIndexes: new Set(), lastAnsweredAt: null };
        byTopic.set(record.topic, acc);
      }
      acc.total += 1;
      if (record.correct) acc.correct += 1;
      acc.attemptIndexes.add(attemptIndex);
      if (
        record.answeredAt !== null &&
        (acc.lastAnsweredAt === null || record.answeredAt > acc.lastAnsweredAt)
      ) {
        acc.lastAnsweredAt = record.answeredAt;
      }
    }
  });

  const stats: TopicStat[] = [];
  for (const [topic, acc] of byTopic) {
    stats.push({
      topic,
      correct: acc.correct,
      total: acc.total,
      accuracy: acc.total ? (acc.correct / acc.total) * 100 : 0,
      attempts: acc.attemptIndexes.size,
      lastAnsweredAt: acc.lastAnsweredAt,
    });
  }
  stats.sort((a, b) => {
    if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
    if (a.total !== b.total) return b.total - a.total;
    if (a.topic === b.topic) return 0;
    return a.topic < b.topic ? -1 : 1;
  });
  return stats;
}

export type ReviseEntry = {
  questionId: string;
  topic: string;
  wrongCount: number;
  lastWrongAt: string | null;
  lastAnsweredAt: string | null;
};

/**
 * The revise queue: questions whose LATEST first-pass record is wrong.
 *
 * Rules (frozen):
 * - MCQ attempts only (kind "quiz" / "mock"); "flash" attempts are
 *   excluded even if they carry itemRecords. Attempts WITHOUT
 *   itemRecords contribute nothing (see the file header).
 * - Latest-record-wins: attempts are ordered by `date` ASC (stable —
 *   input order breaks ties, via the original index), records in
 *   array order; the LAST record seen for a questionId decides. The
 *   entry's `topic` comes from that deciding (latest) record.
 * - CLEARING RULE: an entry exists if and only if the latest record
 *   has correct === false. A later correct first-pass answer removes
 *   the question from the queue; a later wrong answer re-enters it.
 *   The queue is derived-only — nothing is stored or deleted.
 * - Unanswered records have correct === false and DO enter the queue
 *   (an unanswered question still needs revising).
 * - `wrongCount` = count of ALL records for the questionId with
 *   correct === false (across every attempt, not just the latest).
 * - `lastWrongAt` = `date` of the attempt holding the LATEST wrong
 *   record for the questionId (null only when no wrong record exists,
 *   which cannot happen for an emitted entry).
 * - `lastAnsweredAt` = max record `answeredAt` across ALL records for
 *   the questionId (null when every record has a null `answeredAt`).
 * - Output order: lastWrongAt DESC (nulls last), then questionId ASC
 *   (plain code-unit comparison). Most-recently-wrong first.
 * - Unlike computeTopicStats, records are NOT skipped for a blank
 *   topic: the queue is keyed by questionId, and a wrong answer still
 *   needs revising even when its topic label is blank.
 *
 * The input array is never mutated (the date ordering works on a
 * decorated copy).
 */
export function buildReviseQueue(attempts: Attempt[]): ReviseEntry[] {
  type Acc = {
    latest: ItemRecord;
    wrongCount: number;
    lastWrongAt: string | null;
    lastAnsweredAt: string | null;
  };
  const byQuestion = new Map<string, Acc>();

  // Decorate with the original index so equal dates keep input order
  // regardless of the engine's sort stability.
  const ordered = attempts
    .map((attempt, index) => ({ attempt, index }))
    .filter(({ attempt }) => attempt.kind === "quiz" || attempt.kind === "mock")
    .sort((a, b) => {
      if (a.attempt.date === b.attempt.date) return a.index - b.index;
      return a.attempt.date < b.attempt.date ? -1 : 1;
    });

  for (const { attempt } of ordered) {
    const records: ItemRecord[] | undefined = attempt.itemRecords;
    if (!records) continue;
    for (const record of records) {
      let acc = byQuestion.get(record.questionId);
      if (!acc) {
        acc = { latest: record, wrongCount: 0, lastWrongAt: null, lastAnsweredAt: null };
        byQuestion.set(record.questionId, acc);
      }
      // Records arrive in chronological order, so overwriting keeps
      // the latest record seen for this questionId.
      acc.latest = record;
      if (!record.correct) {
        acc.wrongCount += 1;
        acc.lastWrongAt = attempt.date;
      }
      if (
        record.answeredAt !== null &&
        (acc.lastAnsweredAt === null || record.answeredAt > acc.lastAnsweredAt)
      ) {
        acc.lastAnsweredAt = record.answeredAt;
      }
    }
  }

  const queue: ReviseEntry[] = [];
  for (const [questionId, acc] of byQuestion) {
    // Clearing rule: only a latest record with correct === false
    // (wrong or unanswered) produces an entry.
    if (acc.latest.correct) continue;
    queue.push({
      questionId,
      topic: acc.latest.topic,
      wrongCount: acc.wrongCount,
      lastWrongAt: acc.lastWrongAt,
      lastAnsweredAt: acc.lastAnsweredAt,
    });
  }
  queue.sort((a, b) => {
    if (a.lastWrongAt !== b.lastWrongAt) {
      if (a.lastWrongAt === null) return 1;
      if (b.lastWrongAt === null) return -1;
      return a.lastWrongAt < b.lastWrongAt ? 1 : -1;
    }
    if (a.questionId === b.questionId) return 0;
    return a.questionId < b.questionId ? -1 : 1;
  });
  return queue;
}

/**
 * A deterministic adaptive practice set: weak topics are picked more
 * often, without ever excluding any topic.
 *
 * Rules (frozen):
 * - Weight per question = weight of its topic (verbatim topic key).
 *   Topics with total >= 3 get 1 + 2 * (1 - accuracy/100): a 0%
 *   topic weighs 3x, a 100% topic weighs 1x. Topics with total < 3
 *   (too little history to judge) or absent from `topicStats` get
 *   weight 1 — unseen topics still appear, so there is no filter
 *   bubble. If `topicStats` ever held duplicate topics, the last
 *   entry wins.
 * - Weighted lottery WITHOUT replacement: each draw picks by
 *   cumulative weight among the remaining questions, using
 *   mulberry32(hashSeed(seed)) with exactly one RNG call per draw.
 * - Empty `topicStats` (or an empty bank) → plain uniform shuffle
 *   with the same RNG, slice(0, count). The shuffle loop below
 *   mirrors `shuffled()` in data.ts exactly (same Fisher-Yates order,
 *   same RNG consumption), so the no-history set is byte-identical to
 *   standard practice sampling with the same seed. `shuffled` itself
 *   is deliberately NOT imported: the frozen import list allows value
 *   imports from ./data only for hashSeed/mulberry32.
 * - `count` is clamped to [0, bank.length] (fractional counts floor;
 *   non-finite counts yield an empty set).
 * - Returns questions in DRAW order. Same inputs → byte-identical
 *   output (same ids in the same order).
 * - The input bank is never mutated, and the returned questions are
 *   the same object references (draw order only, no copies).
 */
export function buildAdaptiveSet(args: {
  bank: Question[];
  topicStats: TopicStat[];
  count: number;
  seed: string;
}): Question[] {
  const { bank, topicStats, count, seed } = args;
  const n = Number.isFinite(count)
    ? Math.max(0, Math.min(Math.floor(count), bank.length))
    : 0;
  const rand = mulberry32(hashSeed(seed));

  if (topicStats.length === 0 || bank.length === 0) {
    // Uniform fallback: identical to shuffled(bank, rand) — same
    // Fisher-Yates loop, same RNG consumption order.
    const shuffledBank = [...bank];
    for (let i = shuffledBank.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffledBank[i], shuffledBank[j]] = [shuffledBank[j], shuffledBank[i]];
    }
    return shuffledBank.slice(0, n);
  }

  const weightByTopic = new Map<string, number>();
  for (const stat of topicStats) {
    weightByTopic.set(
      stat.topic,
      stat.total >= 3 ? 1 + 2 * (1 - stat.accuracy / 100) : 1,
    );
  }

  const remaining = [...bank];
  const picked: Question[] = [];
  while (picked.length < n && remaining.length > 0) {
    let totalWeight = 0;
    for (const q of remaining) totalWeight += weightByTopic.get(q.topic) ?? 1;
    let r = rand() * totalWeight;
    let pickIndex = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      r -= weightByTopic.get(remaining[i].topic) ?? 1;
      if (r < 0) {
        pickIndex = i;
        break;
      }
    }
    picked.push(remaining[pickIndex]);
    remaining.splice(pickIndex, 1);
  }
  return picked;
}
