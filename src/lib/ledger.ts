// Step 3a — Vacancy Coverage Ledger (teaching posts only).
// Pure module: no client imports, importable from plain node tests
// (same pattern as data.ts). One row per VISIBLE track. NOTHING here is
// invented:
//
// - Weightages come ONLY from the official documents named in the
//   owner-supplied improvement report: ETEA PDF 453 (ESED Version B),
//   the ETEA 2020 course-content PDF (SST-ETEA), ETEA PDF 435 (Social
//   Welfare — PROVISIONAL, see below), and the KPPSC 5th Schedule Feb
//   2026 (SST-KPPSC). The weightage table is written out explicitly per
//   post from the report's table — it is NOT copied from COMP_B, whose
//   CT entry (pakstudies 10) disagrees with the report's CT row
//   (Social Studies 10); see VERIFY-step3a.md. ZamungKor has NO
//   published syllabus: its row shows the proxy pattern the fixed
//   mocks actually use (verified against the ZAM_FIXED id lists),
//   labelled proxy / NOT VERIFIED.
// - Time / marks / language / negative-marking: stated ONLY where an
//   official source states them; everywhere else the label is
//   "Unknown". KPPSC −0.25 negative marking stays labelled UNVERIFIED
//   (prep guides only; no KPPSC source confirms it).
// - Available notes / MCQs / flashcards / mocks are COMPUTED from the
//   real banks at module load — never hardcoded. A subject with no
//   bank (the SST 60-question/60% subject portion) counts zero and
//   drives the Partial status.
// - "Last verified" is 11 Nov 2026 for every row: the date the
//   research pass read these sources live. The ledger intro tells the
//   user to re-check their own advertisement.
//
// Coverage rule (mechanical, documented — see coverageFor):
// - "unpublished" pattern (ZamungKor) -> Proxy.
// - "provisional" pattern (Social Welfare / PDF 435, whose primary
//   text the report pass did not directly verify) -> Partial.
// - "confirmed" pattern + every blueprint subject has >=1 note AND
//   >=1 MCQ + >=1 mock (shared mocks count, flagged as shared) ->
//   Exact. "Exact" means presence of material for every blueprint
//   subject — it is NOT a claim of depth or sufficiency (the ledger
//   intro says so, and the per-subject counts are shown).
// - "confirmed" pattern + any subject with zero notes AND zero MCQs,
//   or no mock -> Partial.
// - A post with no weightage at all -> Unknown (no teaching post is
//   Unknown today; the branch exists so a future post cannot silently
//   look covered).
//
// "Source Confirmed" (the green official tone) is used ONLY for rows
// whose pattern source is a named official document: PDF 453, the
// 2020 PDF, and the KPPSC 5th Schedule. Social Welfare is Provisional
// (PDF 435 not directly verified in the report pass) and ZamungKor is
// Official-scope-unavailable — neither gets the green badge.

import {
  BY_SUBJECT,
  FLASHCARDS,
  NOTES,
  TRACKS,
  VISIBLE_MOCKS,
  VISIBLE_TRACKS,
  type Track,
} from "./data";

export type LedgerCoverage = "exact" | "proxy" | "partial" | "unknown";
export type LedgerSourceState = "confirmed" | "provisional" | "unavailable";
export type LedgerPatternState = "confirmed" | "provisional" | "unpublished";

/** One blueprint subject within a post's weightage. `bankKeys` are the
 *  BY_SUBJECT keys whose questions practise this block (empty = no
 *  bank exists, e.g. the SST subject portion); `noteSubjects` are
 *  NOTES keys; `cardCategories` are FLASHCARDS categories. */
export type LedgerWeightageEntry = {
  label: string;
  /** Exact official figure: "30 Q" for 100-MCQ papers, "60%" for the
   *  KPPSC 45-MCQ paper (percentages of 45 do not divide evenly, so no
   *  question count is invented for KPPSC). */
  weightLabel: string;
  bankKeys: string[];
  noteSubjects: string[];
  cardCategories: string[];
};

export type LedgerSubjectRow = LedgerWeightageEntry & {
  notes: number;
  mcqs: number;
  cards: number;
};

/** The subject catalog: every blueprint subject mapped to the real
 *  banks/notes/card categories that serve it. Shared buckets are
 *  explicit: Drawing and Physical Education share the "Drawing/PE"
 *  notes; the Qari combined block sums the Tajweed + Islamiyat banks.
 *  The SST subject portion maps to NOTHING — there is no dedicated
 *  subject bank, and the ledger must show zero, not borrow a generic
 *  bank. Tests verify every mapped key exists in the real data. */
const SUBJECT_CATALOG: Record<
  string,
  { label: string; bankKeys: string[]; noteSubjects: string[]; cardCategories: string[] }
> = {
  islamiyat: {
    label: "Islamiyat",
    bankKeys: ["islamiyat"],
    noteSubjects: ["Islamiyat"],
    cardCategories: [],
  },
  english: {
    label: "English",
    bankKeys: ["english"],
    noteSubjects: ["English"],
    cardCategories: [],
  },
  urdu: { label: "Urdu", bankKeys: ["urdu"], noteSubjects: ["Urdu"], cardCategories: [] },
  pakstudies: {
    label: "Pak Studies",
    bankKeys: ["pakstudies"],
    noteSubjects: ["Pak Studies"],
    cardCategories: [],
  },
  maths: { label: "Maths", bankKeys: ["maths"], noteSubjects: ["Maths"], cardCategories: [] },
  pedagogy: {
    label: "Pedagogy",
    bankKeys: ["pedagogy"],
    noteSubjects: ["Pedagogy"],
    cardCategories: ["Pedagogy"],
  },
  tajweed: {
    label: "Tajweed",
    bankKeys: ["tajweed"],
    noteSubjects: ["Tajweed"],
    cardCategories: ["Tajweed"],
  },
  arabic: {
    label: "Arabic",
    bankKeys: ["arabic"],
    noteSubjects: ["Arabic"],
    cardCategories: ["Arabic"],
  },
  science: {
    label: "General Science",
    bankKeys: ["science"],
    noteSubjects: ["General Science"],
    cardCategories: ["General Science"],
  },
  it: {
    label: "IT / Computer",
    bankKeys: ["it"],
    noteSubjects: ["IT/Computer"],
    cardCategories: ["IT/Computer"],
  },
  gk: { label: "GK", bankKeys: ["gk"], noteSubjects: ["GK"], cardCategories: ["GK"] },
  socialstudies: {
    label: "Social Studies",
    bankKeys: ["socialstudies"],
    noteSubjects: ["Social Studies"],
    cardCategories: [],
  },
  drawing: {
    label: "Drawing",
    bankKeys: ["drawing"],
    noteSubjects: ["Drawing/PE"],
    cardCategories: [],
  },
  pe: {
    label: "Physical Education",
    bankKeys: ["pe"],
    noteSubjects: ["Drawing/PE"],
    cardCategories: [],
  },
  tajweedIslamiyat: {
    label: "Tajweed/Hifz + Islamiyat (combined block)",
    bankKeys: ["tajweed", "islamiyat"],
    noteSubjects: ["Tajweed", "Islamiyat"],
    cardCategories: ["Tajweed"],
  },
  sstSubject: {
    label: "Subject portion (Maths / Physics / Bio / Chem / IT)",
    bankKeys: [],
    noteSubjects: [],
    cardCategories: [],
  },
  gkKppsc: {
    label: "GK (Pak Studies + Islamiat)",
    bankKeys: ["gk"],
    noteSubjects: ["GK"],
    cardCategories: ["GK"],
  },
};

/** Build one weightage entry from the catalog. Throws on an unknown
 *  catalog key — a typo must fail loudly, never render an empty row. */
function w(catalogKey: string, weightLabel: string): LedgerWeightageEntry {
  const c = SUBJECT_CATALOG[catalogKey];
  if (!c) throw new Error(`ledger: unknown subject catalog key "${catalogKey}"`);
  return {
    label: c.label,
    weightLabel,
    bankKeys: [...c.bankKeys],
    noteSubjects: [...c.noteSubjects],
    cardCategories: [...c.cardCategories],
  };
}

const UNKNOWN_TIME = "Unknown — not stated in the official pattern document.";
const UNKNOWN_LANGUAGE = "Unknown — not stated in the official pattern document.";
const UNKNOWN_NEGATIVE = "Unknown — policy not stated; do not assume zero penalty.";
const LAST_VERIFIED = "11 Nov 2026";
const PDF_453_URL = "https://etea.online/advertisement/course_content/453_ESED_Contents.pdf";
const PDF_2020_URL =
  "https://etea.online/advertisement/course_content/ESED_course_content_ETEA_2020.pdf";
const PDF_435_URL =
  "https://etea.online/advertisement/course_content/435_social_welfare_january_2025_course_content.pdf";
const KPPSC_SCHEDULE_URL =
  "https://www.kppsc.gov.pk/public/assets/schedule/files/5th_schedule_SST_Ability_Tests_February_2026.pdf";

export type LedgerDef = {
  trackId: string;
  pattern: LedgerPatternState;
  sourceLabel: string;
  sourceUrl: string | null;
  totalLabel: string;
  timeLabel: string;
  languageLabel: string;
  negativeMarkingLabel: string;
  /** Extra pattern honesty note, rendered under the weightage (null
   *  for plain confirmed rows). */
  patternNote: string | null;
  weightage: LedgerWeightageEntry[];
  /** Mock ids listed under ANOTHER track that serve this post. CT has
   *  no mock of its own: the PST/CT mock (track "pst") serves it. The
   *  ledger shows shared mocks flagged as shared — never silently. */
  sharedMockIds: string[];
  missing: string;
  nextAction: string;
};

/** The per-post ledger definitions. Weightages are the report's
 *  official table (PDF 453 / 2020 PDF / PDF 435 / KPPSC schedule);
 *  ZamungKor's proxy weightage is the distribution the fixed mocks
 *  actually use (verified against the ZAM_FIXED id lists). */
const LEDGER_DEFS: LedgerDef[] = [
  {
    trackId: "tt",
    pattern: "confirmed",
    sourceLabel: "ETEA PDF 453 — ESED Contents (official-hosted)",
    sourceUrl: PDF_453_URL,
    totalLabel: "100 MCQs",
    timeLabel: UNKNOWN_TIME,
    languageLabel: UNKNOWN_LANGUAGE,
    negativeMarkingLabel: UNKNOWN_NEGATIVE,
    patternNote: null,
    weightage: [
      w("islamiyat", "30 Q"),
      w("english", "20 Q"),
      w("urdu", "10 Q"),
      w("socialstudies", "10 Q"),
      w("pedagogy", "10 Q"),
      w("maths", "10 Q"),
      w("gk", "10 Q"),
    ],
    sharedMockIds: [],
    missing: "No missing blueprint subject.",
    nextAction: "Run the TT Version B mock; verify draft Islamiyat items in Review.",
  },
  {
    trackId: "at",
    pattern: "confirmed",
    sourceLabel: "ETEA PDF 453 — ESED Contents (official-hosted)",
    sourceUrl: PDF_453_URL,
    totalLabel: "100 MCQs",
    timeLabel: UNKNOWN_TIME,
    languageLabel: UNKNOWN_LANGUAGE,
    negativeMarkingLabel: UNKNOWN_NEGATIVE,
    patternNote: null,
    weightage: [
      w("arabic", "30 Q"),
      w("english", "20 Q"),
      w("urdu", "10 Q"),
      w("socialstudies", "10 Q"),
      w("pedagogy", "10 Q"),
      w("maths", "10 Q"),
      w("gk", "10 Q"),
    ],
    sharedMockIds: [],
    missing: "No missing blueprint subject.",
    nextAction: "Run the AT Version B mock; verify draft Arabic items in Review.",
  },
  {
    trackId: "pst",
    pattern: "confirmed",
    sourceLabel: "ETEA PDF 453 — ESED Contents (official-hosted)",
    sourceUrl: PDF_453_URL,
    totalLabel: "100 MCQs",
    timeLabel: UNKNOWN_TIME,
    languageLabel: UNKNOWN_LANGUAGE,
    negativeMarkingLabel: UNKNOWN_NEGATIVE,
    patternNote: null,
    weightage: [
      w("english", "25 Q"),
      w("maths", "25 Q"),
      w("science", "20 Q"),
      w("socialstudies", "10 Q"),
      w("pedagogy", "10 Q"),
      w("gk", "10 Q"),
    ],
    sharedMockIds: [],
    missing: "No missing blueprint subject.",
    nextAction: "Run the PST / CT Version B mock.",
  },
  {
    trackId: "ct",
    pattern: "confirmed",
    sourceLabel: "ETEA PDF 453 — ESED Contents (official-hosted)",
    sourceUrl: PDF_453_URL,
    totalLabel: "100 MCQs",
    timeLabel: UNKNOWN_TIME,
    languageLabel: UNKNOWN_LANGUAGE,
    negativeMarkingLabel: UNKNOWN_NEGATIVE,
    patternNote:
      "Same weightage as PST (report's official table). Note: the stored COMP_B composition for CT lists Pak Studies 10 instead of Social Studies 10 — a pre-existing data inconsistency, flagged in VERIFY-step3a.md; the ledger follows the report.",
    weightage: [
      w("english", "25 Q"),
      w("maths", "25 Q"),
      w("science", "20 Q"),
      w("socialstudies", "10 Q"),
      w("pedagogy", "10 Q"),
      w("gk", "10 Q"),
    ],
    sharedMockIds: ["pst-B"],
    missing: "No missing blueprint subject. No mock is listed under CT itself — the PST / CT mock is shared.",
    nextAction: "Run the shared PST / CT Version B mock.",
  },
  {
    trackId: "ctit",
    pattern: "confirmed",
    sourceLabel: "ETEA PDF 453 — ESED Contents (official-hosted)",
    sourceUrl: PDF_453_URL,
    totalLabel: "100 MCQs",
    timeLabel: UNKNOWN_TIME,
    languageLabel: UNKNOWN_LANGUAGE,
    negativeMarkingLabel: UNKNOWN_NEGATIVE,
    patternNote: null,
    weightage: [
      w("it", "25 Q"),
      w("english", "25 Q"),
      w("maths", "20 Q"),
      w("socialstudies", "10 Q"),
      w("pedagogy", "10 Q"),
      w("gk", "10 Q"),
    ],
    sharedMockIds: [],
    missing: "IT/CS depth — 30 MCQs and 6 notes for a 25-question portion.",
    nextAction: "Step 3b adds IT/CS notes and MCQs (concept extraction only).",
  },
  {
    trackId: "dm",
    pattern: "confirmed",
    sourceLabel: "ETEA PDF 453 — ESED Contents (official-hosted)",
    sourceUrl: PDF_453_URL,
    totalLabel: "100 MCQs",
    timeLabel: UNKNOWN_TIME,
    languageLabel: UNKNOWN_LANGUAGE,
    negativeMarkingLabel: UNKNOWN_NEGATIVE,
    patternNote: null,
    weightage: [
      w("drawing", "20 Q"),
      w("english", "20 Q"),
      w("maths", "20 Q"),
      w("science", "20 Q"),
      w("gk", "10 Q"),
      w("pedagogy", "10 Q"),
    ],
    sharedMockIds: [],
    missing: "Drawing depth — 4 notes shared with Physical Education, 20 MCQs; no practical drawing module.",
    nextAction: "Step 3b adds Drawing notes and MCQs.",
  },
  {
    trackId: "pet",
    pattern: "confirmed",
    sourceLabel: "ETEA PDF 453 — ESED Contents (official-hosted)",
    sourceUrl: PDF_453_URL,
    totalLabel: "100 MCQs",
    timeLabel: UNKNOWN_TIME,
    languageLabel: UNKNOWN_LANGUAGE,
    negativeMarkingLabel: UNKNOWN_NEGATIVE,
    patternNote: null,
    weightage: [
      w("pe", "20 Q"),
      w("english", "20 Q"),
      w("maths", "20 Q"),
      w("science", "20 Q"),
      w("gk", "10 Q"),
      w("pedagogy", "10 Q"),
    ],
    sharedMockIds: [],
    missing: "Physical Education depth — 4 notes shared with Drawing, 20 MCQs; no physical/practical module.",
    nextAction: "Step 3b adds Physical Education notes and MCQs.",
  },
  {
    trackId: "qari",
    pattern: "confirmed",
    sourceLabel: "ETEA PDF 453 — ESED Contents (official-hosted)",
    sourceUrl: PDF_453_URL,
    totalLabel: "100 MCQs",
    timeLabel: UNKNOWN_TIME,
    languageLabel: UNKNOWN_LANGUAGE,
    negativeMarkingLabel: UNKNOWN_NEGATIVE,
    patternNote:
      "The 453 matrix specifies a combined Tajweed/Hifz + Islamiyat block of 30 — the mock splits it 20 Tajweed / 10 Islamiyat.",
    weightage: [
      w("tajweedIslamiyat", "30 Q"),
      w("english", "20 Q"),
      w("urdu", "10 Q"),
      w("maths", "10 Q"),
      w("socialstudies", "10 Q"),
      w("pedagogy", "10 Q"),
      w("gk", "10 Q"),
    ],
    sharedMockIds: [],
    missing: "Hifz component — no memorisation material; Tajweed rules only. Qualification ambiguous (see track).",
    nextAction: "Hifz revision via Quran audio (Stage 4); Tajweed notes and MCQs grow in Step 3b.",
  },
  {
    trackId: "swse",
    pattern: "provisional",
    sourceLabel: "ETEA PDF 435 — Social Welfare Jan 2025 (official-hosted)",
    sourceUrl: PDF_435_URL,
    totalLabel: "100 (percentages sum to 100)",
    timeLabel: UNKNOWN_TIME,
    languageLabel: UNKNOWN_LANGUAGE,
    negativeMarkingLabel: UNKNOWN_NEGATIVE,
    patternNote:
      "PROVISIONAL: the breakdown (Islamiyat 30, Pedagogy 30, Urdu 20, Social Studies 10, Maths 10) was not directly verified against PDF 435 in the report pass. A different post from ESED TT BPS-15 and from ZamungKor (no BPS) — never merge them.",
    weightage: [
      w("islamiyat", "30 Q"),
      w("pedagogy", "30 Q"),
      w("urdu", "20 Q"),
      w("socialstudies", "10 Q"),
      w("maths", "10 Q"),
    ],
    sharedMockIds: [],
    missing: "Pattern provisional — verify PDF 435 directly; eligibility not found in the PDFs read.",
    nextAction: "Verify the breakdown against PDF 435 directly; check the Jan 2025 advert for eligibility.",
  },
  {
    trackId: "sst-etea",
    pattern: "confirmed",
    sourceLabel: "ETEA ESED course-content PDF 2020 (official-hosted)",
    sourceUrl: PDF_2020_URL,
    totalLabel: "100 MCQs",
    timeLabel: UNKNOWN_TIME,
    languageLabel: UNKNOWN_LANGUAGE,
    negativeMarkingLabel: UNKNOWN_NEGATIVE,
    patternNote:
      "ETEA screening only — never mix with the KPPSC 45-MCQ route (separate track). SST-IT variant: subject 60, Pedagogy 15, English 15, Islamiyat 5, Pak Studies 5.",
    weightage: [
      w("sstSubject", "60 Q"),
      w("pedagogy", "10 Q"),
      w("english", "20 Q"),
      w("islamiyat", "5 Q"),
      w("pakstudies", "5 Q"),
    ],
    sharedMockIds: [],
    missing:
      "60-question subject portion — no dedicated Maths/Physics/Bio/Chem/IT subject bank; the mock covers only the 40-question non-subject part.",
    nextAction:
      "Use Library + Practice for the general subjects; a dedicated subject bank is future work.",
  },
  {
    trackId: "sst-kppsc",
    pattern: "confirmed",
    sourceLabel: "KPPSC 5th Schedule of Ability Tests, Feb 2026 (kppsc.gov.pk)",
    sourceUrl: KPPSC_SCHEDULE_URL,
    totalLabel: "45 MCQs",
    timeLabel: "1-hour slot (KPPSC ability-test schedules) — confirm on your roll-number slip.",
    languageLabel: UNKNOWN_LANGUAGE,
    negativeMarkingLabel:
      "−0.25 per wrong answer is claimed by prep guides only — UNVERIFIED: no KPPSC source confirms negative marking.",
    patternNote:
      "KPPSC route only — never mix with the ETEA 100-MCQ screening (separate track). Percentages are of 45 MCQs; no question counts are invented from them.",
    weightage: [
      w("sstSubject", "60%"),
      w("pedagogy", "5%"),
      w("english", "15%"),
      w("urdu", "10%"),
      w("gkKppsc", "10%"),
    ],
    sharedMockIds: [],
    missing:
      "60% subject portion — no dedicated subject bank; the mock approximates it from the general Science/Maths/Islamiyat banks.",
    nextAction:
      "Confirm the negative-marking policy on your roll-number slip; a dedicated subject bank is future work.",
  },
  {
    trackId: "zamungkor",
    pattern: "unpublished",
    sourceLabel: "etea.online — Project 891 listing + advert INF(P)5368/26",
    sourceUrl: "https://etea.online/",
    totalLabel: "Unknown — no published syllabus",
    timeLabel: "Unknown — no published syllabus.",
    languageLabel: "Unknown — no published syllabus.",
    negativeMarkingLabel: "Unknown — no published syllabus.",
    patternNote:
      "NO published syllabus (etea.online: Weightage/Syllabus = “Not Available”). The weightage below is the proxy pattern the fixed mocks actually use — the user-supplied Merged-Districts table (NOT VERIFIED). The track guidance names the ESED TT pattern as the closest proxy.",
    weightage: [
      w("islamiyat", "30 Q"),
      w("english", "15 Q"),
      w("urdu", "15 Q"),
      w("pakstudies", "15 Q"),
      w("maths", "15 Q"),
      w("pedagogy", "10 Q"),
    ],
    sharedMockIds: [],
    missing: "Official syllabus — none published; proxy pattern only.",
    nextAction: "Watch etea.online for the project notice; prepare on the TT proxy pattern meanwhile.",
  },
];

/** The coverage rule, as pure logic over primitives so every branch is
 *  unit-testable. `rows` are the computed subject rows; `mockCount`
 *  counts own + shared mocks. */
export function coverageFor(
  pattern: LedgerPatternState,
  rows: LedgerSubjectRow[],
  mockCount: number,
): { coverage: LedgerCoverage; reason: string } {
  if (pattern === "unpublished") {
    return {
      coverage: "proxy",
      reason: "No published syllabus — preparing on a proxy pattern.",
    };
  }
  if (pattern === "provisional") {
    return {
      coverage: "partial",
      reason: "Pattern provisional — breakdown not directly verified against the official document.",
    };
  }
  if (rows.length === 0) {
    return { coverage: "unknown", reason: "No verified pattern source." };
  }
  const empty = rows.filter((r) => r.notes === 0 && r.mcqs === 0);
  if (empty.length > 0) {
    return {
      coverage: "partial",
      reason: `No material for: ${empty.map((r) => r.label).join(", ")}.`,
    };
  }
  if (mockCount === 0) {
    return { coverage: "partial", reason: "No mock for this post." };
  }
  return {
    coverage: "exact",
    reason: "Every blueprint subject has at least one note and one practice question, and a mock exists.",
  };
}

export type LedgerRow = {
  trackId: string;
  trackName: string;
  bps: string;
  sourceLabel: string;
  sourceUrl: string | null;
  lastVerified: string;
  sourceState: LedgerSourceState;
  totalLabel: string;
  timeLabel: string;
  languageLabel: string;
  negativeMarkingLabel: string;
  patternNote: string | null;
  subjects: LedgerSubjectRow[];
  mocks: { id: string; title: string; shared: boolean }[];
  /** Owner-reviewed items in the BANK data for this post's subjects
   *  (bank-level reviewStatus only — the owner's on-device decisions
   *  may add more; the page labels this honestly). */
  trustedInBank: number;
  totalMcqs: number;
  coverage: LedgerCoverage;
  coverageReason: string;
  missing: string;
  nextAction: string;
};

function sourceStateFor(pattern: LedgerPatternState): LedgerSourceState {
  if (pattern === "unpublished") return "unavailable";
  if (pattern === "provisional") return "provisional";
  return "confirmed";
}

/** Count helper: sum of bank sizes / note counts / card counts for a
 *  weightage entry, from the REAL data. */
function countFor(entry: LedgerWeightageEntry): { notes: number; mcqs: number; cards: number } {
  let notes = 0;
  for (const s of entry.noteSubjects) notes += NOTES[s]?.length ?? 0;
  let mcqs = 0;
  for (const k of entry.bankKeys) mcqs += BY_SUBJECT[k]?.length ?? 0;
  let cards = 0;
  for (const c of entry.cardCategories) {
    cards += FLASHCARDS.filter((f) => f.category === c).length;
  }
  return { notes, mcqs, cards };
}

function trackById(id: string): Track | undefined {
  return TRACKS.find((t) => t.id === id);
}

/** One ledger row for a track id, or null when the track has no
 *  ledger definition (a visible track without a def is a data gap the
 *  test suite must catch — it must never render a half-empty row). */
export function ledgerRowFor(trackId: string): LedgerRow | null {
  const def = LEDGER_DEFS.find((d) => d.trackId === trackId);
  const track = trackById(trackId);
  if (!def || !track) return null;
  const subjects: LedgerSubjectRow[] = def.weightage.map((entry) => ({
    ...entry,
    ...countFor(entry),
  }));
  const ownMocks = VISIBLE_MOCKS.filter((m) => m.track === trackId).map((m) => ({
    id: m.id,
    title: m.title,
    shared: false,
  }));
  const sharedMocks = def.sharedMockIds
    .map((id) => VISIBLE_MOCKS.find((m) => m.id === id))
    .filter((m): m is (typeof VISIBLE_MOCKS)[number] => Boolean(m))
    .map((m) => ({ id: m.id, title: m.title, shared: true }));
  const mocks = [...ownMocks, ...sharedMocks];
  const bankKeys = [...new Set(def.weightage.flatMap((e) => e.bankKeys))];
  let trustedInBank = 0;
  let totalMcqs = 0;
  for (const k of bankKeys) {
    for (const q of BY_SUBJECT[k] ?? []) {
      totalMcqs += 1;
      if (q.reviewStatus === "owner-reviewed" || q.reviewStatus === "approved") trustedInBank += 1;
    }
  }
  const { coverage, reason } = coverageFor(def.pattern, subjects, mocks.length);
  return {
    trackId,
    trackName: track.name,
    bps: track.bps,
    sourceLabel: def.sourceLabel,
    sourceUrl: def.sourceUrl,
    lastVerified: LAST_VERIFIED,
    sourceState: sourceStateFor(def.pattern),
    totalLabel: def.totalLabel,
    timeLabel: def.timeLabel,
    languageLabel: def.languageLabel,
    negativeMarkingLabel: def.negativeMarkingLabel,
    patternNote: def.patternNote,
    subjects,
    mocks,
    trustedInBank,
    totalMcqs,
    coverage,
    coverageReason: reason,
    missing: def.missing,
    nextAction: def.nextAction,
  };
}

/** The full ledger: one row per visible track, in track-list order.
 *  Rows without a definition are omitted (the test suite asserts none
 *  are omitted). */
export function buildLedger(): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const track of VISIBLE_TRACKS) {
    const row = ledgerRowFor(track.id);
    if (row) rows.push(row);
  }
  return rows;
}

/** Ledger definitions, for tests (ids + pattern states only — the
 *  full defs stay module-private). */
export function ledgerDefIds(): { trackId: string; pattern: LedgerPatternState }[] {
  return LEDGER_DEFS.map((d) => ({ trackId: d.trackId, pattern: d.pattern }));
}
