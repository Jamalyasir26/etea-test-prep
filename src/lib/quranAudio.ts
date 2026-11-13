// Quran audio examples — Stage 4B. DATA ONLY: the owner-approved
// Tajweed rule → example ayah mapping, plus the CDN audio URL builders.
//
// SOURCE OF TRUTH: src/data/quran-examples.json, generated
// programmatically at batch time from the owner-approved list
// (~/workspace/tajweed-ayah-proposals.md, approved 2026-11-14) with
// every ayah text verified verbatim against the Quran.com API
// (text_uthmani, two independent fetches, identical). Ayah text is
// NEVER hand-typed, invented, altered, or paraphrased here. No ayah
// beyond the 21 approved entries exists in this mapping; rules with
// no approved ayah (Makharij, Sifaat, Hifz, Madd Silah, other Waqf
// signs) have no entry and stay text-only, per the owner's decision.
//
// AUDIO: stream-only from free CDNs (reciter: Mishary Rashid
// Alafasy). Nothing is hosted on this server and nothing is
// downloaded or stored. Primary: everyayah.com per-ayah MP3s.
// Fallback: cdn.islamic.network per-ayah MP3s keyed by global ayah
// number (computed from the Quran.com chapters API verse counts).
import quranData from "../data/quran-examples.json";

export type QuranVerse = {
  surah: number;
  ayah: number;
  /** API name_simple, e.g. "Al-Fatihah" (proper name, kept English). */
  surahName: string;
  surahNameArabic: string;
  /** Uthmani text, verified verbatim against the Quran.com API. */
  text: string;
  /** 1-based ayah number across the whole Quran (for the fallback CDN). */
  globalAyah: number;
};

export type QuranExample = {
  /** Proposal number from the approved list ("1".."21"). */
  id: string;
  /** Rule label from the approved list, e.g. "Ikhfa". */
  ruleLabel: string;
  verseKey: `${number}:${number}`;
  /** Approved demo word, only when it appears verbatim in the mushaf
      text (null for #3 and #21 — the mushaf writes assimilated forms). */
  demoWord: string | null;
};

export type ResolvedExample = QuranExample & { verse: QuranVerse };

type QuranDataFile = {
  verses: Record<string, QuranVerse>;
  examples: Record<string, Omit<QuranExample, "id">>;
  noteAudio: Record<string, string[]>;
};

const DATA = quranData as unknown as QuranDataFile;

/** The 18 unique approved verses, keyed by "surah:ayah". */
export const QURAN_VERSES: Record<string, QuranVerse> = DATA.verses;

/** The 21 approved rule examples, keyed by proposal number. */
export const QURAN_EXAMPLES: Record<string, QuranExample> = Object.fromEntries(
  Object.entries(DATA.examples).map(([id, e]) => [id, { id, ...e }]),
);

/**
 * Audio examples for a note, matched by its EXACT original English
 * title (the mapping key — never a localized title). Returns [] for
 * every unmapped note: unmapped notes get no audio, by design.
 */
export function getNoteAudio(noteTitle: string): ResolvedExample[] {
  const ids = DATA.noteAudio[noteTitle] ?? [];
  return ids.flatMap((id) => {
    const e = QURAN_EXAMPLES[id];
    const verse = e ? QURAN_VERSES[e.verseKey] : undefined;
    return e && verse ? [{ ...e, verse }] : [];
  });
}

/** Primary CDN: everyayah.com, Alafasy 128kbps, SSSAAA.mp3. */
export function everyayahUrl(surah: number, ayah: number): string {
  const pad = (n: number) => String(n).padStart(3, "0");
  return `https://everyayah.com/data/Alafasy_128kbps/${pad(surah)}${pad(ayah)}.mp3`;
}

/** Fallback CDN: cdn.islamic.network, ar.alafasy, global ayah number. */
export function islamicNetworkUrl(globalAyah: number): string {
  return `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalAyah}.mp3`;
}

/** Both stream URLs for a verse, primary first. */
export function audioUrls(verse: QuranVerse): { primary: string; fallback: string } {
  return {
    primary: everyayahUrl(verse.surah, verse.ayah),
    fallback: islamicNetworkUrl(verse.globalAyah),
  };
}
