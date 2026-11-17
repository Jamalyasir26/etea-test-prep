# VERIFY — U1: Idiomatic Urdu rewrite + UI/UX improvements (2026-11-18, local; NOT deployed)

Owner order (2026-11-18 ~01:18 PKT): improve the UI/UX, and make everything read in natural, fluent, idiomatic Urdu (*bamuhawra* Urdu) when Urdu is selected — the current Urdu "ajeeb lagti hain". This batch (U1) delivers: a style guide + glossary, the idiomatic rewrite of ALL Urdu chrome (700 keys), all small surfaces (flashcards/plan/mocks), all 301 notes, and ONE pilot MCQ bank (Islamiyat, 500 items), plus 13 audited UI/UX safe wins. The other 13 banks' `_ur` rewrite is U2 — plan in §9. No push/deploy (parent handles).

Standing rules honored throughout: English source fields NEVER changed (id-pinning intact); only `_ur` fields rewritten (Roman untouched); no reviewStatus/verified/correctIndex changes; Arabic script copied verbatim, never retyped; Quranic text only from the API-verified proposals file; no `[Auto-Translated]` literal in data; Noto Nastaliq NONE (Noto Sans Arabic only); no file deletions; no localStorage schema changes; no behavior changes except the §3 UI items, each suite-pinned.

Working files (not pushed): `~/workspace/idiomatic-urdu-guide.md` (style guide), `~/workspace/u1-idiomatic-urdu/` (brief, coordinator log, glossary, slices, validation + merge scripts, pre-merge backups). The UI audit is `~/workspace/u1-idiomatic-urdu/UI-AUDIT.md` (not pushed).

## §1 Style guide + glossary decisions

The guide (`~/workspace/idiomatic-urdu-guide.md`, §§0–10 + Appendices A–D, 27 before→after pairs W1–W27) defines: verb-final natural sentence structure with proper postpositions; preferred Urdu words over transliterations where a good Urdu word exists; consistent terminology across all surfaces; natural question phrasing; fluent teacher-like explanations (not word-for-word); and what stays Latin (acronyms, proper names, codes, formulas). The glossary (`~/workspace/u1-idiomatic-urdu/glossary.json`, 276 terms) pins each term's approved Urdu form and its banned alternatives. Key decisions (all applied to every rewritten surface, suite-pinned in `test-idiomatic-urdu.mjs`):

| English / concept | Approved Urdu | Banned / replaced |
|---|---|---|
| Pedagogy | تدریسیات | پیڈاگوجی (the known split is settled: تدریسیات everywhere) |
| Explanation label | وضاحت | "کیوں:" as a label |
| Second person (user address) | آپ | تم (for user address; تم survives only in grammar content discussing the pronoun) |
| Review (owner verification) | جائزہ | — (kept for the verification sense only) |
| Review (revisiting / FSRS) | دہرائی | جائزہ / واجب for the FSRS sense |
| Review answers | جوابات کا جائزہ لیں | — |
| Mock test | موک ٹیسٹ | موکس (bare موک kept as a count noun, e.g. "24 موک") |
| Practice | مشق / مشقی | پریکٹس |
| Score / marks | نمبر | اسکور |
| FSRS "due" | دہرائی کے لیے تیار | واجب for due (واجب survives only in legitimate religious/technical senses — 6 note occurrences, all verified) |
| Items | name the thing | اشیاء / اشیا (token-aware check; معاشیات does NOT trip it — pinned live) |
| Proxy | متبادل | — |
| Version | نسخہ | — |
| Syllabus | نصاب | — |
| Pakistan Studies | مطالعہ پاکستان | — |
| Social Studies | سماجی علوم | — |
| Quran | قرآن پاک | — |
| Surah | سورت | سورۃ |
| Dhul-Hijjah / Dhul-Qadah | ذوالحجہ / ذوالقعدہ | ذی الحجہ / ذی القعدہ (normalized at merge, §6) |
| Honorifics | Arabic forms only (ﷺ / رضی اللہ عنہ) in Urdu script | Latin abbreviations |

Guide errata (recorded in the coordinator log): (1) number formatting — keep the English source formatting exactly ("1,000" stays "1,000"); digit preservation takes precedence over guide §6.2. (2) Guide example W26 conflates qari-B with tt-B (qari-B English has no repeat clause; the S1 worker followed the English source, correctly).

Glossary gaps flagged, NOT resolved (owner input welcome — see §8): no pinned term for "default" (ڈیفالٹ kept in exactly 2 chrome keys), "run", or the "Retention" heading.

## §2 Coverage — what was rewritten

All rewrite work was done by worker subagents as read-only slices (only `_ur` fields + locators); the coordinator validated every slice and merged with `merge-u1.cjs`, which verified all non-`_ur` content identical. Counts below are measured on the MERGED tree vs the pre-U1 tree:

| Surface | Total | Changed | Unchanged (already idiomatic) |
|---|---|---|---|
| Chrome STRINGS keys (`src/lib/i18n.tsx`) | 700 | 258 | 442 |
| Notes, title_ur/body_ur (`content.json`) | 301 | 273 | 28 |
| Flashcards, front/back/category_ur | 70 cards | 51 | 19 |
| Plan tasks, text_ur (63 tasks; 21 day labels unchanged) | 63 | 46 | 17 |
| Mock defs, title_ur/note_ur | 28 | 28 | 0 |
| Islamiyat MCQs, question/options/explanation_ur | 500 items | 246 items / 430 of 2000 fields | 254 items |

Notes on the counts: the slices delivered 277 changed notes; the merged tree shows 273 because the coordinator reverted 4 Urdu-subject notes to verbatim (§7). Islamiyat shows 246 changed items vs 244 in the slices because merge normalization (§6) changed 2 further items. Placeholders: every chrome key's `{placeholder}` multiset is identical en vs ur (suite-pinned; reordering is safe because `replaceVars` replaces by name). Zero missing keys. The 35-key Roman keep-list is untouched; no Roman field changed anywhere.

Digit preservation (coordinator ruling 1): questions/options/titles keep STRICT digit-multiset equality; explanations/bodies use SET equality + Urdu-multiset ⊆ English-multiset, because echo-dedup legitimately removes duplicated digit runs (the deleted "Roman Urdu:" echo gloss restated numbers already in the main text). 25 Islamiyat explanations + 8 note bodies pass relaxed-only, all verified echo-dedup cases. One documented exemption D4 (§6). Maths formula operators (= + − * × ÷ √) strictly preserved in note bodies; "%" spelled as فیصد and "/" as a prose separator in Urdu glosses are approved idiomatic forms (§6).

## §3 UI/UX improvements — SW1–SW13 (audit first, safe wins only)

The U0 audit (`UI-AUDIT.md`, 51 findings: P0 0, P1 19, P2 32) drove the work. The implementer applied the 12 coordinator-approved safe wins + conditional SW13, each covered by the new `test-uiux.mjs` suite (73 PASS lines). No behavior/data changes; no brand, color-scheme, or IA changes; audit §10 Checked-OK patterns untouched; §12 owner proposals + §13 queue NOT implemented (see §10). Before → after per item:

- **SW1 verdict-conditional reveal color** (`QuizRunner.tsx`): the post-answer alert was always `alert green`, so a wrong answer showed green. Now `pickedCorrect ? "alert green" : "alert red"` (existing `pickedCorrect` value). Mock inline picked style kept, per audit.
- **SW2 `.opt.picked` CSS rule** (`globals.css`): the picked-option class had no rule. Added `.opt.picked { border-color: var(--teal); border-width: 2px; }` + a dark-theme variant (`#7fd4d8`).
- **SW3 sentence `dir="auto"`** (9 spans, not 7 — the audit undercounted): 6 spans in `QuizRunner.tsx` (prestart/accuracy/answer lines), 1 in `analysis/page.tsx` (`filteredNote`), 2 in `library/page.tsx` (count spans). `dir="ltr"` → `dir="auto"`; all `lri()` kept; timer/policy-note spans deliberately left LTR.
- **SW4 logical alert borders** (`globals.css`): `.alert` `border-left: 6px` → `border-inline-start: 6px` (+ color variants), so the accent border follows RTL direction.
- **SW5 remove heading tracking** (`Sidebar.tsx`): group headings lost `tw:tracking-wide tw:uppercase` (letter-spacing + uppercase harm Urdu-script headings).
- **SW6 dark teal fixes** (`globals.css`, `Sidebar.tsx`, `ShellTopbar.tsx`, `page.tsx`): dark-theme teal accents (`#7fd4d8`) for progress bars, brand icons, and progress fill. First `tw:dark:` usage in the codebase — verified present in the built CSS with the `:where([data-theme=dark])` selector.
- **SW7 theme-aware chart colors** (`AnalysisCharts.tsx`): deleted the fixed `AXIS_TICK` const; both charts now read `theme` from `useLang()` (dark tick `#94a3b8` / light `#5a6b70`; trend line `#14b8a6` / `#0f766e`). Grid, wrappers, bar fills untouched.
- **SW8 44px tap targets** (5 controls): sidebar review-now link + collapse toggle (`tw:min-h-11`), topbar language select (`tw:h-9` → `tw:h-11`) + theme toggle (`tw:size-11`), PWA dismiss (`tw:size-8` → `tw:size-11`) + install button (`tw:min-h-11`).
- **SW9 remove 36px overrides**: the `minHeight: 36` inline styles on the analysis Close button and issues Delete button removed (they undercut the 44px target).
- **SW10 IssueForm error restyle** (`QuizRunner.tsx`): both muted `<p role="alert">` errors → `<div className="alert red" role="alert">`; `role="alert"` kept.
- **SW11 `role="status"` on loading/status paragraphs** (7): 2 in practice, 1 each in mock/flashcards/topics/review, + the analysis loading paragraph and its feedback line.
- **SW12 truncation/overflow hardening**: badge base dropped `tw:whitespace-nowrap` + `tw:overflow-hidden`; sidebar nav labels/brand/tagline gained `title` attributes; topbar brand link/span gained `tw:min-w-0` + `tw:truncate` (the extra `min-w-0` is required — a flex item cannot shrink without it, so truncation would never engage); IssueForm row gained `flexWrap: "wrap"`; sticky player label gained a composed `title` (existing strings only).
- **SW13 home "next task" in the chosen language** (`page.tsx`, F1.6): home rendered the next plan task in English always. Now `resolvePlanTaskText(tasks[ti], lang).text` (existing exported pure resolver; English mode returns `task[1]` byte-identically; no new strings; `planTaskId` still hashes English fields). No `[Auto-Translated]` badge added — the plan page itself renders task texts without a badge (only day labels get one), so home now matches the plan page. Suite-pinned (6 checks).

Deliberately NOT touched (audit §12/§13 + "explicitly NOT safe wins" list): F3.3 amber, F6.3 live-score, F1.4/F1.5, F2.4/F2.5, F8.2 spacer, dead `Nav.tsx`, the `.opt.show-correct` dead rule. No new user-facing strings anywhere in the UI work.

## §4 C2 flag-8 fix — Latin "." appended after Urdu text (coordinator)

Two call sites appended a Latin period after translated text. Minimal language-conditional fixes, suite-pinned in `test-idiomatic-urdu.mjs` (§4):

- `src/app/analysis/page.tsx` (import message): `+ "."` → `+ (lang === "ur" ? "۔" : ".")`. The Urdu `importMsg`/`importPrefs`/`importSkipped` values carry no terminal punctuation, so the appended mark is the only terminator — in Urdu mode it is now "۔".
- `src/app/mock/[id]/page.tsx` (trusted note): `{t("trustedNoteInMock")}.` → `{t("trustedNoteInMock")}{lang === "ur" ? "۔" : "."}`. `lang` was already in scope in both files. No new strings; English/Roman rendering byte-identical.

## §5 Checks

- **Full battery: 4182 checks / 68 suites, ALL GREEN** (PASS-line count; baseline 4077/66 + `test-uiux` 73 + `test-idiomatic-urdu` 32 = 4182 exactly). Run in halves with `/tmp` harness-dir cleanup between halves (512M tmpfs fills with suite tsc OUT dirs; a single full pass ENOSPC-fails late suites — environmental, not a code failure).
- **New suites:** `scripts/test-uiux.mjs` (SW1–SW13 pins incl. negative old-pattern assertions + §10 guards; fail-proof verified by temp-revert: exactly 4 failures, restored byte-identically) and `scripts/test-idiomatic-urdu.mjs` (32 checks: glossary consistency with token-aware banned-term checks, no-literal-marker audit, digit preservation with ruling-1 + D4, placeholder preservation, ذوالحجہ/ذوالقعدہ pins scoped to rewritten surfaces, C2 flag-8 pins, whole-tree mojibake scan). Both wired in `package.json` (`test:uiux`, `test:idiomaticurdu`).
- **`npm run build`: PASS** (20/20 routes). **`npx tsc --noEmit`: clean.**
- **Merge verification:** `merge-u1.cjs` verified all non-`_ur` content identical (content.json, islamiyat.json) and en/roman untouched (i18n.tsx); backups in `~/workspace/u1-idiomatic-urdu/pre-merge/`. Serialization preserved: content.json compact, no trailing newline; islamiyat.json indent-1 + trailing newline.
- **Mojibake:** whole-tree scan CLEAN — no U+FFFD in any bank, content.json, or i18n.tsx. The 2 old mojibake spots (Social Studies note 2 body_ur, GK[4] body_ur) were replaced by rewrites.
- **Id-pinning:** English fields untouched everywhere; flashcardId/planTaskId snapshot + Phase 2 suites green (FSRS state + plan completions survive).
- **Production smoke** (fresh `next start`, stopped afterwards): 17 routes HTTP 200 (15 static + `/mock/tt-B` + `/tracks/tt` dynamic); home HTML carries 7040 / 301 / 70 / "24 mocks"; served JS chunks contain idiomatic Urdu strings (`تدریسی عہدوں کے ٹریک`, `اگلی دہرائی`, `دہرائی کے لیے تیار`, ذوالحجہ, اسلامی معاشیات questions); zero server errors. Limit: HTTP/chunk-level only — no rendered-DOM check was possible in this subagent; live click-through in Urdu mode (home/practice/flashcards/plan/mock/library) is the parent's pass after deploy.

## §6 Deliberate assertion updates (adjudicated, none weakened)

11 existing suites failed after the merge + UI work. Each failure was inspected field-by-field; every one traces to a deliberate U1 change. Updates below keep each check's original intent and strength on the unchanged parts:

1. **`test-rtl.mjs`** — 1 check: the analysis status-message assertion required the exact string `<p dir="auto" className="muted">`; SW11 added `role="status"`. Updated to the new exact form; the `dir="auto"` isolation the check exists to verify is unchanged.
2. **`test-lazy-banks.mjs`** — 2 checks: (a) islamiyat byte-prefix assertion → non-`_ur` field comparison of the 105 backup items + the same append pins (byte equality no longer applies — all 500 `_ur` fields rewritten). (b) content.json revert-compare gained a documented U1 revert step restoring pre-existing notes' `_ur` fields from the backup before comparing; all other fields must still match exactly.
3. **`test-phase4-library.mjs`** — 16 checks: (a) 13 prefix hashes recomputed from the pre-U1 tree with `_ur` fields stripped (they pin English/_roman/source fields byte-identically; the `_ur` rewrite is the documented exception). (b) Digit check → ruling-1 semantics for `_ur`, strict for `_roman`, + D4 exemption. (c) Maths operator check → formula operators strict; `%`/`/` excluded for `_ur` prose only (see §2); `_roman` fully strict. (d) Urdu-verbatim check fixed by the §7 revert, no suite change.
4. **`test-phase3-mocks.mjs`** — 1 check: `STANDING_UR` updated to the U1 idiomatic rendering "یہ متوقع پیٹرن ہے، کیونکہ ETEA نے 2026 کا سرکاری نصاب شائع نہیں کیا۔" All 7 new defs still open with the standing label, uniformly; meaning + position preserved.
5. **`test-phase4a.mjs`** — 1 check: `statsLoading` ur literal "..." → "…" (ellipsis char; the rewrite's punctuation choice).
6. **`test-step2fixes.mjs`** — 1 check: `flashGradedNextReview` ur pin اگلا جائزہ → اگلی دہرائی (glossary fix: FSRS review = دہرائی).
7. **`test-step3a.mjs`** — 1 check: `homeIntro` ur pin تدریسی پوسٹ ٹریکس → تدریسی عہدوں کے ٹریک (still names the teaching scope).
8. **`test-stage5d.mjs`** — 2 checks (notes only; MCQ checks untouched): note digit check → ruling-1 for `_ur` (GK United Nations echo-dedup), strict for `_roman`; note operator check → prose-aware for `body_ur`, strict for `body_roman`.
9. **`test-stage5e.mjs`** — 2 gloss checks: Vitamins (gloss merged into the exam-tip sentence — `_ur` half now asserts the embedded content) and Bruner (gloss deleted as a pure echo — `_ur` half asserts the first-sentence content). `_roman` halves unchanged.
10. **`test-stage5f.mjs`** — 2 gloss checks: MS Word + Binary gloss sentences kept but reworded idiomatically (جیسے…اور; بٹ/بائٹ for bit/byte) — `_ur` halves updated to the new exact sentences. `_roman` halves unchanged.
11. **`test-stage5g.mjs`** — 2 checks: digit check → ruling-1 + D4 for `_ur`, strict for `_roman`; Drawing Basics gloss check → `_ur` half asserts the six-elements content (gloss sentence deleted as a pure echo; content is the first sentence). `_roman` halves unchanged.
12. **`test-stage5c.mjs`** — fixed by the §7 revert, no suite change.

**Merge normalization (coordinator ruling 2 + 4):** 10 occurrences of ذی الحجہ → ذوالحجہ and 1 of ذی القعدہ → ذوالقعدہ in slice values, normalized at merge. The other 13 banks keep their mixed forms until U2 (pinned scope: rewritten surfaces only).

**Documented exemption D4:** Drawing/PE "Hockey — The Basics" `body_ur` lacks digit "4" — it occurs ONLY in the deleted echo gloss; the main text spells "four" → چار کوارٹر. Pinned explicitly in 3 suites + the new suite.

## §7 Coordinator corrections (data, not suites)

4 Urdu-subject notes' `_ur` fields were REVERTED to verbatim copies of their source fields (title_ur = title, body_ur = body), restoring the Stage 5 verbatim invariant: the Urdu notes' source text IS Urdu, so `_ur` must duplicate it exactly (Urdu mode and English mode show the same text). The N5 worker had made small edits (قواعد for گرامر in a title; "کسی کام" insertion; "واحد اور جمع، مذکر اور مونث" title rewording; جملے for جملہ in a title). The verbatim rule takes precedence over micro-edits; whether جملہ or جملے is more correct is the owner's call on the SOURCE text, not a `_ur`-only divergence. Notes: اردو گرامر — اسم، فعل، صفت; مترادف اور متضاد الفاظ; واحد جمع اور مذکر مونث; جملہ کی قسمیں — سادہ، مرکب، ہم رتبہ. This restores `test-stage5c` + the P4L Urdu check. The slices in `~/workspace/u1-idiomatic-urdu/slices/` still carry the worker versions; the merged tree differs in exactly these 4 notes by coordinator decision.

## §8 Flags for the owner (honest list — nothing hidden)

1. **Echo-gloss divergence (accepted, follow-up noted):** N1/N2/N5 deleted pure-echo "Roman Urdu:" gloss sentences from `_ur` bodies; N6 RETAINED all 17 Roman-gloss sentences in IT/English notes (2 carry unique digits: IT13 F5, IT16 0/1/8/1). Both treatments preserve content; the inconsistency is visible to a careful reader. Follow-up normalization (one rule for all notes) is a U2-adjacent decision — owner to say which treatment he prefers.
2. **Arabic notes 11/13–22 keep LATIN transliterations** in `_ur` (N2, per the verbatim rule — the English source gives only Latin forms), departing from the old `_ur` Arabic-script forms. The owner (Arabic educator) should decide or supply verified Arabic-script forms; old forms are recoverable from remote HEAD 49b507cc.
3. **Teachy.ai source label** (carried from Phase 4): one new Arabic note's source label cites "Teachy.ai" — owner may want that label reviewed. Unchanged by U1.
4. **Glossary gaps:** no pinned term for "default" (ڈیفالٹ kept, 2 keys), "run", "Retention" heading. Owner to supply preferred Urdu terms if he wants them pinned.
5. **Worker content flags (flagged, NOT fixed — source facts untouched):** P1: source duplications ISL-007/025, ISL-027/058, ISL-001/091, ISL-002/094 (rewrites kept consistent); ISL-100 "1,000" kept per erratum #1. P3: ISL-213 narrower Urdu kept. P4: Qaswa unified to قصواء; ISL-380 dropped fact restored; ISL-379 "defectors" rendered descriptively. P5: Arabic book titles carried verbatim from existing `_ur`; ISL-455 keeps Latin `Algoritmi`; ISL-407 hedge kept. S1: FC61/FC41 source quirks kept; plan labels kept verbatim incl. Day 10 shorthand + bare قرآن (per guide §8). N5: T16 renderings + Urdu[5] fact looseness flagged. N4: book titles in Urdu script (choice flagged). N3: Pedagogy 19 keeps معدوم نصاب (least certain, already flagged in Phase 4). N2: see flag 2.
6. **Terminology choice flagged:** "flashcard index 21 Ha/Ha (ہ/ح) Roman disambiguation" and "پیڈاگوجی vs تدریسیات" from Phase 2 are now SETTLED (تدریسیات everywhere in rewritten surfaces; flashcard 21's `_ur` rewritten per the guide). The Roman Ha/Ha question is untouched (Roman out of scope).
7. **Mixed-explanation findings UNCHANGED:** 33 Islamiyat + all 45 Pak Studies + PPT-001 mixed-explanation flags from Stage 5 are still open (cleanup undecided by owner). U1 rewrote Islamiyat `_ur` explanations idiomatically but did NOT touch the mixed-explanation issue itself (English-source concern).
8. **Pre-existing inconsistencies UNCHANGED:** COMP_B.ct Pak Studies 10 vs Social Studies 10 (disclosed in ct-B note); SST-ETEA mock only 40Q non-subject part; 9 cross-bank overlapping facts; mock timer starts at 100:01; sidebar due widget stale until reload; flashcard session counter resets on navigation.
9. **Stale-cache note:** after deploy, the owner may need one reload / the update banner before the new Urdu shows (SW cache v3 from Phase 4; U1 did not bump the cache version — the v3 activation already evicts v2 caches, and the new build's hashed chunks are fresh by URL).
10. **Urdu-mode rendering** was verified at the served-chunk level only (§5); the owner should check Urdu mode on his phone (home, practice, flashcards, plan, mock, library) and report any wording that still feels odd — the guide + glossary make the next pass mechanical.

## §9 U2 PLAN — the other 13 banks' `_ur` rewrite

**Batch order** (pilot-proven process, largest-risk first — religious content first while the process is fresh, then the pattern of Phase 1): (1) Tajweed, (2) Arabic, (3) Urdu, (4) English, (5) Maths, (6) Pak Studies, (7) Pedagogy, (8) General Science, (9) Social Studies, (10) GK, (11) IT, (12) PE, (13) Drawing. Tajweed/Arabic first because honorific + Arabic-verbatim + Quranic-text rules are strictest there and the owner verifies religious content himself; Drawing/PE last (least terminology risk; the DRW-011..020 gap in pe.json stays unfilled, per Phase 1).

**Slice plan (same pattern as U1):** per subject, 5 workers × 100 items (P-style slices: question_ur/options_ur/explanation_ur + id locators, read-only on the repo). Keep slices small; re-dispatch split on worker error. Workers follow the guide + glossary + coordinator rulings 1–4 (§2/§6) and the standing rules (English untouched; digit preservation; Arabic verbatim; no invented facts; one correct answer; honorific convention). Each slice validated before merge (schema, id coverage, digit preservation with ruling-1 semantics, placeholder N/A for banks, mojibake scan, banned-term token scan, ذوالحجہ/ذوالقعدہ pins).

**Validation approach:** extend `test-idiomatic-urdu.mjs` per subject as banks land (move each bank from the un-rewritten set into the §3-style checks: banned terms, marker, mojibake, digits, Arabic runs, Dhul pins). Expect the same existing-suite adjudication pattern as §6: suites pinning old `_ur` strings (stage5a–g, phase4-library, lazy-banks byte-prefix checks for the rewritten bank) get deliberate assertion updates with before/after documentation — never weakenings. Per-subject: merge → battery green → build/tsc → prod smoke → report + CHANGELOG, same as Phase 1. Merge script pattern: reuse `merge-u1.cjs` with the subject's slices + normalization. Push per subject (or grouped only if the owner asks) so each batch is independently verifiable live.

**U2 also carries:** the echo-gloss normalization decision (§8.1), the Arabic transliteration decision (§8.2), and the glossary gaps (§8.4) — all need owner input before or during U2. The §8.5 worker flags for the OTHER banks will surface per subject as their slices land.

**Estimated scale:** 13 banks × 500 items × 4 `_ur` fields ≈ 26,000 fields (13,000 items; pastpapers banks' 20+20 items are out of scope pending the past-paper labelling decision — see §10).

## §10 Deliberately left out

- The other 13 banks' `_ur` rewrite (U2, §9). Past-paper banks untouched (labelling decision still pending owner).
- Roman fields: untouched everywhere (out of scope), including the Roman Ha/Ha disambiguation and "Mauzu/Mauzoo" variant.
- Audit §12 owner proposals (11 items) + §13 queue (19 concrete fixes): NOT implemented, awaiting coordinator/owner approval. No redesign, no brand/color/IA changes.
- Per-subject practice resume: still DESIGN ONLY (Phase 3 §3), owner approval required.
- Mixed-explanation cleanup: still undecided by owner.
- No cache-version bump (see §8.9). No tutor/provider changes. No Vercel env changes. No push/deploy/GitHub/Vercel actions (parent handles).
- `bank-manifest.ts`: regenerated by the build, byte-identical (counts + trusted counts + id map only; no content hashes) — NOT in the push set.
- The style guide + glossary + audit + slices stay in `~/workspace/` (working files, not pushed); this report is the pushed record.

## §11 Files changed (36)

Source/data (20): `src/lib/i18n.tsx`, `src/data/content.json`, `src/data/banks/islamiyat.json`, `src/app/globals.css`, `src/app/page.tsx`, `src/app/analysis/page.tsx`, `src/app/library/page.tsx`, `src/app/issues/page.tsx`, `src/app/practice/page.tsx`, `src/app/mock/[id]/page.tsx`, `src/app/flashcards/page.tsx`, `src/app/topics/page.tsx`, `src/app/review/page.tsx`, `src/components/QuizRunner.tsx`, `src/components/Sidebar.tsx`, `src/components/ShellTopbar.tsx`, `src/components/PwaInstall.tsx`, `src/components/ui/badge.tsx`, `src/components/AnalysisCharts.tsx`, `src/components/StickyPlayer.tsx`. Suites (2 new + 11 modified = 13): new `scripts/test-uiux.mjs`, `scripts/test-idiomatic-urdu.mjs`; modified `test-rtl`, `test-lazy-banks`, `test-phase3-mocks`, `test-phase4-library`, `test-phase4a`, `test-step2fixes`, `test-step3a`, `test-stage5d`, `test-stage5e`, `test-stage5f`, `test-stage5g` — plus `package.json` (2 new test scripts), this report, and the CHANGELOG entry. Total: 20 + 13 + package.json + report + CHANGELOG = 36 files. (`test-stage5c` needed no edit — fixed by the §7 revert.)

Counts: home total stays 7040, all 14 subjects at 500; mocks 28 defs / 24 visible; notes 301; flashcards 70. No count changed anywhere — U1 is wording + UI only.
