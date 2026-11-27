# VERIFY — ZamungKor Current-Preparation Section (2026-11-27, local; NOT deployed)

Owner redirect 2026-11-27 ~22:43 PKT (supersedes the Design R / Design C choice): build a SEPARATE section for ZamungKor current preparation; NEW and OLD materials there SEPARATELY, aligned to the syllabus. Old zam1–3 mocks (100Q proxy) stay exactly as they are; all 15 owner-reviewed items stay in their mocks; new 60Q/45min official-syllabus mocks (Theology + Qari) live in the new section.

Official source: ETEA Project 891 course-content PNG, https://etea.online/advertisement/course_content/891_7f36d7dbbeb4261f575eea5659ff5f4f.png (verified live by parent 2026-11-27 ~22:18 PKT; table, no % sign, no total MCQs/duration/pass mark/negative marking printed; every row sums to 60 — parent's addition). Owner's decision (NOT in the official file): 60 MCQs, 45 minutes, computer-based test.

## 1. What was built

- **New route `/zamungkor`** (`src/app/zamungkor/page.tsx`, new file, client component in the `/mock` page pattern): H1 + intro + **Current half** (zam4 Theology + zam5 Qari) + **Previous half** (zam1/zam2/zam3) + links row (syllabus PNG, `/vacancies#ledger`, track page, mock list). Cards rendered from `VISIBLE_MOCKS` by id — no hardcoded titles/totals/minutes.
- **New Sidebar entry** (`src/components/Sidebar.tsx`): `/zamungkor`, key `zamungkor`, `ScrollText` icon, Study group, immediately after Mock Tests. Track page (`src/app/tracks/[id]/page.tsx`) gets a conditional `/zamungkor` link for the zamungkor track only.
- **New mocks** (inserted in `content.json` `mocks[]` immediately after zam3):
  - `zam4` ZamungKor Theology Mock — Project 891: variant `"891"`, 45 min, 60Q, fixed `zam4`. Composition ISL 20, PED 15, SCI 10, SS 10, PAK 5. List: ISL-091–110, PED-031–045, SCI-001–010, SS-001–010, PAK-046–050.
  - `zam5` ZamungKor Qari Mock — Project 891: variant `"891"`, 45 min, 60Q, fixed `zam5`. Composition TAJ 12 (incl. TAJ-464, "Hifz — Quranic Facts"), ISL 6, MAT 12, PED 12, SS 12, URD 6. List: TAJ-001–011 + TAJ-464, ISL-111–116, MAT-046–057, PED-046–057, SS-011–022, URD-046–051. The 12/6 Tajweed/Islamiyat split is implementer-chosen (ESED Qari 20/10 precedent) and labelled as such in the note + ledger.
  - Both notes trilingual at creation, stating the official composition + "45-minute timer and computer-based format are the owner's decision, not stated by ETEA — confirm on your roll-number slip" + "Disjoint from all other ZamungKor mocks. Not an official ETEA paper."
- **Track + ledger** (`content.json` track `zamungkor.pattern` rewritten; `src/lib/ledger.ts` zamungkor def → `pattern: "confirmed"`, source = 891 PNG, 10-row weightage (two papers), `totalLabel: "60 MCQs per paper (Theology + Qari — 2 papers)"`, `timeLabel` flags 45 min/CBT as owner's decision, `lastVerified: "27 Nov 2026"` via new optional `LedgerDef.lastVerified` field — other 11 rows stay 11 Nov 2026. Coverage: Exact (9/0/3); source states 11 confirmed / 1 provisional / 0 unavailable.
- **Corrections + links**: `CORRECTIONS[0]` rewritten (NO-BPS warning kept; syllabus now published; 60Q/45min/CBT owner-decided); `CORRECTIONS_VERSION` 1 → 2 (ack key name unchanged by design — stored value is compared); 891 PNG tuple appended to `links[]` after the corrigendum.
- **i18n**: 12 new keys (`zamungkor` nav + 11 section keys, EN/Roman/Urdu, copied verbatim from the design memo); `mockLabelProxyDetail` reworded generically (the "ZamungKor has no published syllabus" clause is now false — proxy mocks still exist).
- **Counts**: `counts.mocks` 28 → 30; home visible mocks 24 → 26 (automatic, track visibility); `counts.total` stays 8000; tracks 19; notes 301; cards 70.
- **Untouched by design**: zam1/zam2/zam3 defs + fixed lists (byte-identical — see §2), all bank files, plan21 (Days 18–20 still literally true; rewording would reset stored completions), /review metric (stays zam1+zam2 = 15/200), ESED tracks/mocks, `patterns`/`compMD`, the seven dynamic ESED "Expected pattern" notes.

## 2. Parent verification (independent, fresh clone of remote HEAD f8a0e3eb)

- **Diff vs remote HEAD: 48 files** (47 changed + `src/app/zamungkor/` new dir) + this report + CHANGELOG entry = 50 files in the push set. Full list in §6.
- **Old material byte-identical**: all 28 old mock defs identical; zamFixed zam1/zam2/zam3 lists identical (SHA-256 checked); plan21 identical; patterns/compMD identical; non-zam mock defs identical.
- **New lists verified by parse**: zam4 = ISL 20 / PED 15 / SCI 10 / SS 10 / PAK 5; zam5 = TAJ 12 / ISL 6 / MAT 12 / PED 12 / SS 12 / URD 6; all five lists pairwise disjoint, 420 unique IDs; **0 owner-reviewed items in the new lists** (all 15 stay in zam1/zam2); every new ID resolves in its bank; TAJ-464 topic is "Hifz — Quranic Facts".
- **Build PASS, `npx tsc --noEmit` clean.**
- **Battery: 4794 checks / 71 suites** (1824 + 1120 + 1796 + qa-540 53/53; new suite test-zamungkor-section.mjs 33/33). One in-battery failure: test-timeouts.mjs (wall-clock flake — "402ms vs 500ms sleep bound" under load); standalone re-run idle: **PASS** (pre-existing, no tutor code touched).
- **Structural check** re-run on expanded scope zam1+zam2+zam4+zam5: 320 items, 293 pass, 27 soft needs-review, 0 problems. Script fix adjudicated (not a weakening): `norm()` strips `-`, false-flagging MAT-055/056/057 ("-13"/"13" etc.) as duplicate options — a sign-preserving normalizer is now used ONLY for the duplicate-options comparison; plain `norm()` stays everywhere else. Minor nuance: hyphen-vs-space option pairs no longer collapse in that one check.
- **Suites**: pin updates only, none weakened (spot-checked: phase1 suites 28→30 / 3→5 lists; step3a 10-row weightage, per-paper 60+60, totalMcqs asserted against the deduped bank-key sum per the §10.4 trap, lastVerified per-row). test-step2b/phase4b1/b2 needed count-pin updates in the same files though their cited lines were unchanged.
- **Prod smoke** (suites worker, port 3101): `/zamungkor`, `/mock`, `/tracks/zamungkor`, `/review`, `/` all 200; section shows both half headings + zam4/zam5 + zam1/2/3 cards; home shows "8000 MCQs · … · 26 mocks".

## 3. Design decisions (from W2-DESIGN.md)

- Section home = new route `/zamungkor` (rejected: hub inside `/mock` — flat ungrouped list; track page as home — flat list, no separation).
- Mock IDs `zam4`/`zam5` follow the `zamN` scheme; variant `"891"` (project-number code, precedent `"435"`); renders Full automatically; detail page shows bare `891` verbatim (precedent: `435`, `KPPSC-5th`, `ETEA-2020`).
- Plan left untouched (text still true; rewording resets stored completions via `planTaskId` hash). /review untouched (metric 15/200; zam4/zam5 appear as automatic filter entries via generic code).
- Old notes' "Disjoint from Mocks 2–3" wording is now incomplete (still true) — left as-is per the owner order; needs an explicit later decision to fix.

## 4. Flags for the owner (say plainly in the delivery message)

- **Trusted Mode for the new mocks starts at 0/60 each** — disjointness forbids reusing any reviewed item in zam4/zam5, and the new slots (Science/Social Studies/Tajweed/Pedagogy) have no owner-reviewed items at all. A fresh review pass over the new-slot items is needed to build Trusted Mode. Nothing was lost: /review still reads 15/200 and zam1/zam2 Trusted Mode is still 9 + 6.
- **60 questions / 45 minutes / CBT is the owner's decision, NOT ETEA's** — the site labels it exactly that way everywhere it appears. Pakki tasdeeq roll-number slip / ETEA test notice se hogi.
- The Qari 12 Tajweed / 6 Islamiyat split is implementer-chosen (ESED precedent), not ETEA's — labelled as such on the mock note and in the ledger.
- Old notes' disjointness wording (above) and Day 21's "expected pattern" phrase are known-stale, deliberately untouched in this round.
- No test date / roll-number slip for 891 as of 27 Nov 2026.

## 5. Files changed (50 in push set)

Data: `src/data/content.json`, `src/data/structural-checks.json`. Source: `src/app/zamungkor/page.tsx` (new), `src/app/tracks/[id]/page.tsx`, `src/components/Sidebar.tsx`, `src/lib/data.ts`, `src/lib/i18n.tsx`, `src/lib/ledger.ts`. Config: `package.json`. Suites: `scripts/test-zamungkor-section.mjs` (new, 33 checks), `scripts/qa-540.mjs`, `scripts/structural-check-mocks.mjs`, `scripts/test-lazy-banks.mjs`, `scripts/test-phase2-mocks.mjs`, `scripts/test-phase3-mocks.mjs`, `scripts/test-phase4-organize.mjs`, `scripts/test-phase4b1.mjs`, `scripts/test-phase4b2.mjs`, `scripts/test-phase4-library.mjs`, `scripts/test-step3a.mjs`, `scripts/test-step2a.mjs`, `scripts/test-step2b.mjs`, `scripts/test-step2fixes.mjs`, `scripts/test-step3b-audit1.mjs`, `scripts/test-step3b-audit2.mjs`, `scripts/test-stage5a.mjs` … `test-stage5g.mjs` (7), `scripts/test-phase1-arabic.mjs`, `test-phase1-drawing.mjs`, `test-phase1-english.mjs`, `test-phase1-gk.mjs`, `test-phase1-islamiyat.mjs`, `test-phase1-it.mjs`, `test-phase1-maths.mjs`, `test-phase1-pakstudies.mjs`, `test-phase1-pe.mjs`, `test-phase1-pedagogy.mjs`, `test-phase1-science.mjs`, `test-phase1-socialstudies.mjs`, `test-phase1-tajweed.mjs`, `test-phase1-urdu.mjs`, `scripts/test-phase2-chrome.mjs`, `scripts/test-idiomatic-urdu.mjs`. Docs: `VERIFY-zamungkor-section.md` (new), `CHANGELOG.md`.

## 6. Working files (not pushed)

- `~/workspace/zamungkor-syllabus/W1-DESIGN.md` (first-dispatch audit; Design R/C superseded), `W2-DESIGN.md` (build spec), `W3-DATA-REPORT.md`, `W4-PATTERN-REPORT.md`, `W5-SUITES-REPORT.md`, `pre-edit-content.json` (sha256 `5e15ab26…e717`).
