# VERIFY — Stage 4B: Quran Audio (local, 2026-11-14; NOT deployed)

Owner-approved ayah list linked to Tajweed notes + streaming audio
player + sticky mini player. Single-commit push + deploy + live
browser verification are the parent's job; this batch changed local
files only. Baseline: build PASS, tsc clean, 2477 checks / 32 suites
(Stage 4A tree, GitHub HEAD c2630dd).

## §1 The approved source of truth

`~/workspace/tajweed-ayah-proposals.md` — 21 entries, owner-APPROVED
2026-11-14 ~00:45 PKT ("Tajweed ki kutub ke ain mutabiq bilkul
sahih"). The owner also confirmed the omissions: Makharij, Sifaat,
and Hifz notes stay text-only (no specific ayah), and no Madd Silah
or extra Waqf-sign example was proposed.

## §2 Ayah-text re-verification (before any text entered the repo)

Every one of the 18 unique verses was re-fetched from
`api.quran.com/api/v4/verses/by_key/{key}?fields=text_uthmani`
TWICE (fetch 1: 2026-11-13T19:46:34Z, fetch 2: 2026-11-13T19:51:02Z
— both identical, all 18 keys PASS). The stored text is the API's
verbatim `text_uthmani`, trimmed of the leading space the API
returns on 4 verses (91:1, 110:1, 113:1, 114:1), written into
`src/data/quran-examples.json` by a generator script — never
hand-typed, never paraphrased.

Comparison against the owner-approved file: all 18 verses are
NFC-equal with identical base-letter sequences. The raw byte
differences are ONLY Unicode combining-mark order (e.g. shadda +
vowel vs vowel + shadda) — canonically the same text. The recorded
snapshot `scripts/quran-api-verified-2026-11-14.json` is what the
suite asserts the stored text against (exact + NFC).

Chapter names (`name_simple`, `name_arabic`) and verse counts came
from the same API (`/chapters?language=en`); global ayah numbers for
the fallback CDN were computed from those counts, never from memory.

Demo words: kept only where the approved demo word appears verbatim
(NFC) inside the mushaf text — 20 of 21. Two are null, deliberately:
- #3 Idgham without Ghunnah: the textbook spelling "مِن رَّبِّهِمْ"
  does not appear verbatim — the mushaf writes the assimilated form
  (مِّن رَّبِّهِمْ). Showing the textbook spelling as a quote would
  have been inexact, so no demo word is shown for this example.
- #21 Saktah: the same assimilation difference ("مَرْقَدِنَا ۜ" vs
  the mushaf's "مَّرْقَدِنَا ۜ"). No demo word shown.
Both examples still show the full verified verse, the rule label,
the reference, and the Play button.

## §3 Audio URL HEAD-checks (all 18 primary + all 18 fallback)

Checked 2026-11-13T19:48:05Z. Primary:
`https://everyayah.com/data/Alafasy_128kbps/{SSSA AA}.mp3`.
Fallback: `https://cdn.islamic.network/quran/audio/128/ar.alafasy/{global}.mp3`.
Every URL returned HTTP 200 + `audio/mpeg`, and the Content-Length
matched exactly between the two CDNs for every verse (same Alafasy
files). Zero non-200 rows — nothing hidden.

| Verse | Global | Primary | Fallback | Bytes |
|---|---|---|---|---|
| 1:1 | 1 | 200 audio/mpeg | 200 audio/mpeg | 146830 |
| 1:2 | 2 | 200 audio/mpeg | 200 audio/mpeg | 89988 |
| 1:7 | 7 | 200 audio/mpeg | 200 audio/mpeg | 212450 |
| 2:5 | 12 | 200 audio/mpeg | 200 audio/mpeg | 182357 |
| 2:8 | 15 | 200 audio/mpeg | 200 audio/mpeg | 193224 |
| 2:21 | 28 | 200 audio/mpeg | 200 audio/mpeg | 216629 |
| 2:27 | 34 | 200 audio/mpeg | 200 audio/mpeg | 376290 |
| 2:49 | 56 | 200 audio/mpeg | 200 audio/mpeg | 418504 |
| 4:17 | 510 | 200 audio/mpeg | 200 audio/mpeg | 472002 |
| 36:52 | 3757 | 200 audio/mpeg | 200 audio/mpeg | 264695 |
| 91:1 | 6044 | 200 audio/mpeg | 200 audio/mpeg | 50282 |
| 104:8 | 6187 | 200 audio/mpeg | 200 audio/mpeg | 91242 |
| 105:4 | 6192 | 200 audio/mpeg | 200 audio/mpeg | 149756 |
| 106:4 | 6197 | 200 audio/mpeg | 200 audio/mpeg | 217465 |
| 110:1 | 6214 | 200 audio/mpeg | 200 audio/mpeg | 111304 |
| 113:1 | 6226 | 200 audio/mpeg | 200 audio/mpeg | 56133 |
| 113:2 | 6227 | 200 audio/mpeg | 200 audio/mpeg | 58641 |
| 114:1 | 6231 | 200 audio/mpeg | 200 audio/mpeg | 98347 |

## §4 Note mapping (data, keyed by EXACT original title)

13 titles, 26 example slots, 21 approved entries, 18 unique verses.
Each title was asserted to exist exactly once in the Tajweed notes
(generator + suite). No note body was edited.

| Note title | Examples (proposal #) |
|---|---|
| Noon Sakinah and Tanween — Four Rules | #1 Izhar 1:7, #2 Idgham+Ghunnah 2:8, #3 Idgham−Ghunnah 2:5, #4 Iqlab 2:27, #5 Ikhfa 113:2, #20 Ghunnah 114:1 |
| Meem Sakinah — Three Rules | #6 Ikhfa Shafawi 105:4, #7 Idgham Shafawi 104:8, #8 Izhar Shafawi 1:7 |
| Madd — Lengthening the Sound | #10 Madd Tabee'i 1:2 |
| Ikhfa — Hiding the Noon Sound (إخفاء) | #5 Ikhfa 113:2 |
| Idgham — Merging into the Next Letter (إدغام) | #2 Idgham+Ghunnah 2:8, #3 Idgham−Ghunnah 2:5 |
| Qalqalah — The Echo Letters (قلقلة) | #9 Qalqalah 113:1 |
| Madd Types Compared — How Long to Stretch (مد) | #10 Madd Tabee'i 1:2, #11 Madd Muttasil 110:1, #12 Madd Munfasil 2:21 |
| Iqlab — Turning Noon into Meem (إقلاب) | #4 Iqlab 2:27 |
| Heavy and Light — Tafkheem, Tarqeeq, Raa and Laam | #15 Tafkheem 1:2, #16 Tarqeeq 2:49 |
| Sun and Moon Letters — Laam Qamariyyah and Shamsiyyah | #17 Qamariyyah 1:2, #18 Shamsiyyah 91:1 |
| Hamzatul Wasl and Hamzatul Qat' | #19 Hamzatul Wasl 1:1 |
| More Madd Types — Leen, Iwaz, Silah and Far'i | #13 Madd Leen 106:4, #14 Madd Iwaz 4:17 (NO Silah example) |
| Waqf Signs in the Mushaf — Ja, La, Sali, Qali and Saktah | #21 Saktah 36:52 |

Text-only (no mapping, by owner decision): all 11 remaining Tajweed
notes — Makharij (2), Sifaat (2), Hifz (3), Waqf overview, Quranic
Knowledge, Common Mistakes, Idgham Families.

Render sites checked: Library (`src/app/library/page.tsx`) is the
ONLY place note title/body cards render. The tutor cites note
titles as deep links only; tracks/topics/home use counts/links.
The examples block renders in Library only, below the recall-gated
body (always visible, so audio is reachable without revealing the
note text — a judgment call, reversible).

## §5 What changed (file:line)

NEW (8):
- `src/data/quran-examples.json` — verses + examples + mapping (generated).
- `src/lib/quranAudio.ts` — typed access, `getNoteAudio()`, URL builders.
- `src/components/QuranAudioProvider.tsx` — one global Audio element,
  preload="none", Play/Pause, Speed 0.5x/1x, Loop, Close, once-only
  fallback on error, honest error state.
- `src/components/StickyPlayer.tsx` — fixed bottom bar + 72px spacer.
- `src/components/NoteAudioExamples.tsx` — per-example blocks (ayah
  text RTL/lang="ar", reference, demo word, Play button, offline
  disabled state via `usePwa`).
- `scripts/test-stage4b-audio.mjs` — 85 checks (see §7).
- `scripts/quran-api-verified-2026-11-14.json` — API snapshot.
- `VERIFY-stage4b-audio.md` — this report.

CHANGED (7):
- `src/components/AppShell.tsx` — wraps the shell in
  `QuranAudioProvider`, renders `<StickyPlayer />` outside the inert
  region (after the shell div).
- `src/app/library/page.tsx` — renders `<NoteAudioExamples
  title={n.title} />` (original title) in each note card.
- `src/lib/i18n.tsx` — 14 new keys (en + roman + ur): quranListen*,
  quranPlay*, quranPause, quranRetry, quranRepeat, quranClosePlayer,
  quranPlayerLabel, quranSpeedToggle, quranAyahRef, quranDemoWord,
  quranAudioNeedsInternet, quranAudioUnavailable.
- `src/app/globals.css` — `.quran-player` (fixed, bottom 0, z-index
  40, safe-area padding), `.quran-player-label` (ellipsis, no wrap),
  `.quran-player-spacer` (72px), `.quran-example`, `.quran-ayah`
  (1.3rem, line-height 2, Noto Sans Arabic stack).
- `package.json` — `test:stage4b-audio` script.
- `scripts/test-step3b-audit1.mjs` — F21 nowrap allowlist gains the
  bounded `.quran-player-label` (see §7 note).
- `CHANGELOG.md` — Stage 4B entry.

NOT touched: any bank file, `content.json`, `data.ts`, `public/sw.js`
(no audio caching — the worker passes cross-origin requests through
untouched; suite-asserted), any PWA file except the shell
integration, any scoring/FSRS/flag/review/tutor logic.

## §6 Verification

- `npm run build` PASS. `npx tsc --noEmit` clean (strict).
- Suites: **2563 checks / 33 suites, 0 failures** (baseline 2477 →
  +85 new test-stage4b-audio, +1 audit1 bounding check). Zero Nastaliq.
- F21 note: the audit1 suite initially FAILED on the new
  `white-space: nowrap` in `.quran-player-label`. The fix updates the
  test, not the CSS: the label's nowrap is bounded (flex item,
  min-width: 0, overflow: hidden, ellipsis) and cannot overflow at
  360px the way the badge nowrap did; the updated check pins those
  bounding properties alongside the two-rule allowlist.
- Local prod server (ports 3149/3150, stopped after): all 14 routes
  HTTP 200; home counts unchanged (763/151/70/12/16); /review heading
  present with zero `pendingEnglish` occurrences; built CSS contains
  the fixed player rules; client chunks contain the ayah text,
  "Example recitation", and the everyayah builder. Library cards are
  client-rendered (Suspense + useSearchParams), so their HTML is not
  in the SSR response — rendering is verified in the browser pass.
- Diff vs `~/workspace/etea-prep-next-backup-pre-stage4/`: 17 new +
  12 changed + 0 deleted (Stage 4A + 4B combined); banks and
  `content.json` byte-identical.

NOT verified locally (no headless browser on this machine — for the
live browser pass after deploy):
1. Actual audio playback from everyayah.com (Play → sound, Pause,
   0.5x speed change, Repeat loop, Close hides the bar).
2. The fallback: primary failure → automatic islamic.network retry
   (hard to force live; code path is suite-asserted, playback of the
   fallback URL itself is HEAD-verified in §3).
3. Sticky player visibility while scrolling AND across navigation
   (Library → another page → back), and the spacer keeping the last
   content reachable.
4. 360px rendering of the bar (one row, no sideways scroll, all four
   controls tappable) — CSS inspection says the row cannot wrap, but
   the phone/browser check is the arbiter.
5. Offline disabled state on the Play buttons (PWA offline simulation).
6. The ayah text rendering (Uthmani diacritics in Noto Sans Arabic)
   and the demo-word lines on all 13 notes.
7. No regression: /review 15/200 + flags, tutor answers, Urdu 0/63,
   PWA install/offline (Stage 4A §5 list still applies).

## §7 Out of scope (per the brief)

Word-by-word highlighting (owner: verse-by-verse is enough);
pronunciation / Speak & Check (Stage 4C); any new ayah beyond the 21
approved entries; any change to note bodies, banks, or PWA files
beyond the shell integration.
