# VERIFY — U2 Subject 3: Urdu bank idiomatic Urdu rewrite (2026-11-18, local; NOT deployed)

Idiomatic (*bamuhawra*) Urdu rewrite of the `_ur` fields of all 500 Urdu MCQs (URD-001..URD-500), per the U1 style guide + 276-term glossary (`~/workspace/idiomatic-urdu-guide.md`, working file, not pushed). Third subject of the U2 program (U1 report §9 plan; Tajweed was subject 1, Arabic subject 2). Worked in 5 slices of 100 by slice-worker subagents, coordinator-validated, merged by script. No push/deploy (parent handles).

## §1 Style guide + glossary decisions

U1 glossary decisions applied and suite-pinned: تدریسیات, وضاحت, آپ, موک ٹیسٹ, مشق/مشقی, نمبر, مندرجہ ذیل (درج ذیل banned), em-dash banned inside sentences, Urdu punctuation (۔ ، ؟ ؛), verb-final restructuring, no calque. Urdu-specific decisions (brief §4 + coordinator adjudications; all flagged for owner confirmation in §8):

- **Feminine → مؤنث** (مونث → مؤنث, 51 occurrences, uniform 1:1 — Arabic precedent: مونث fixed to مؤنث in ARB-067; here it was the uniform bank form). مذکر stays (42×). Suite-pinned to exactly 51×.
- **حرف جار KEPT** (uniform 25×) — the established Urdu-grammar term for preposition, distinct from Arabic's حرفِ جر. NOT izafat-ized, NOT changed to حرف جر. Suite-pinned: 25×, حرفِ جار 0, حرف جر 0.
- **اسم ضمیر KEPT** (25×, bank convention for the Ism-e-Marfa kind). **اسم موصول KEPT** (12×); **مسواف/موسوف/معسوف banned in every spelling** (0× — keep zero; the Phase 1 terminology correction stands, owner confirmation still pending).
- **Ism/Fi'l/Jumla/Harf/Bayan terms kept exactly:** اسم معرفہ / اسم نکرہ / اسم علم, فعل ماضی / فعل حال / فعل مستقبل / فعل امر / فعل معروف / فعل مجہول, جملہ اسمیہ / جملہ فعلیہ / جملہ خبریہ / جملہ استفہامیہ / جملہ امریہ / جملہ انشائیہ, حرف عطف / حرف تخصیص / حرف استثنا / حرف شرط, تشبیہ / استعارہ / کنایہ / تلمیح, قافیہ / ردیف / مطلع / مقطع, مصدر, اسم فاعل / اسم مفعول, نون غنہ, غیر منقوط / منقوط.
- **Latin echo-glosses DROPPED — zero Latin in `_ur`:** the only 14 Latin-letter `_ur` fields (parenthetical English glosses in URD-026..043 explanations: (noun), (verb), (pronoun), (adjective), (singular), (masculine), (feminine), (past tense), (future tense), (present tense), (proper noun), (common noun)) were all removed. The Urdu terms ARE the exam terms; the English added nothing in Urdu mode (Arabic precedent). Suite-pinned: zero `[A-Za-z]` in any `_ur` field. No new parenthetical glosses.
- **Echo-gloss rule (U2 Arabic decision, applied here):** drop restatement glosses, keep meaning glosses. The 14 Latin glosses were the bank's only parentheticals — all dropped.
- **Quoted material VERBATIM — the defining rule for this bank:** every ’...‘ quoted span (idioms, proverbs, example sentences, poet names, book titles, tested word forms) copied byte-identically from the current `_ur` field; the rewrite targets the instructional framing only. Coordinator-verified: 0 quote warnings across all 500 items. Straight-quote spans (80, incl. URD-120, URD-166..186, URD-379/381/384/390) preserved as-is, not normalized. Stray ۔ inside quotes in URD-251/252/253/261/262 preserved verbatim + flagged (§7/§8).
- **Codepoints:** Urdu ی (U+06CC) / ک (U+06A9) only; Arabic ي (U+064A) / ك (U+0643) banned (baseline zero, suite-pinned).
- **Frame normalizations (worker-applied, coordinator-verified):** بہ لحاظ معنی → معنی کے لحاظ سے (4×, URD-272..275, matching the bank's خبر/ترکیب کے لحاظ سے pattern); خبر کے لحاظ سے axis restored in URD-231/232 (matching siblings 226–230); فعل مجہول صورت → فعل مجہول کی صورت (3×, URD-148..150, matching فعل ماضی کی صورت); موضوع → مسند الیہ for EN "the subject" in tarkeeb explanations (URD-265/267 — remaining 3 موضوع uses are all the "theme" sense in poetry, legitimate); کس چیز پر → کس پر (URD-426/427); جمع مکسر for the broken-plural pattern (URD-297, restoring a dropped EN fact); مکمل کلام / طنزیہ لہجہ / زوال (URD-470/440/468, single uses restoring EN facts).
- **Gender agreement:** baseline already clean (0 errors); ضمیر/حرف/فعل/اسم/جملہ masculine, صفت/خبر feminine — kept clean. تم NOT banned (1 subject-matter use, URD-066 option). بے NOT banned (13 prefix uses).
- **U1 open questions for this bank:** echo-gloss divergence DECIDED per the Arabic rule above; Arabic-note transliterations N/A (notes out of scope); glossary gaps decided above and flagged in §8.

## §2 Coverage — what was rewritten

- **92 / 500 items changed, 408 unchanged** (already idiomatic, copied byte-identically — this bank's `_ur` was written in Urdu script at creation and was already fluent for most items). **118 / 3000 `_ur` fields changed:** questions 40, option elements 15, explanations 63.
- Per slice (items changed / unchanged, coordinator-verified): U1 (URD-001..100) 15/85, 23 fields; U2 (101..200) 11/89, 11 fields; U3 (201..300) 34/66, 51 fields; U4 (301..400) 4/96, 5 fields; U5 (401..500) 28/72, 28 fields. No merge normalization was needed (§6): workers applied every pinned decision and the slice union was already consistent (مونث 51→0, مؤنث 0→51, بہ لحاظ 4→0, straight-quote spans 80→80).
- English source fields, `_roman` fields, reviewStatus/verified/correctIndex, ids, topics, sources: **byte-identical** (parsed diff vs the pre-merge backup, §4). No bank/file deletions, no localStorage changes, no behavior changes. Item-level fallback + badge rules unchanged.
- Baseline scan (pre-rewrite): 0 digit-carrying fields, 14 Latin-letter fields (all echo glosses), 0 em-dash fields, 0 درج ذیل, 0 empty `_ur` fields, 0 Latin honorifics, 0 Latin punctuation, 0 explanations starting with اس لیے, 2 echo explanations (URD-001, URD-460 — both merged). All resolved except the deliberate keeps in §1/§3.

## §3 Digit + script invariants

- **Digit rule: STRICT digit-group multiset equality on EVERY field** (questions, each option, explanations) — vacuous in this bank (zero digit-carrying fields), so the rule bites only if a digit is ever introduced. Suite-pinned in §3D of `test-idiomatic-urdu.mjs`.
- **Script runs copied verbatim, never retyped.** Every script run in an English field appears byte-identically in the `_ur` field (suite-pinned; the 45 existing items URD-001..045 carry Urdu script in their English fields). Every quoted span in a current `_ur` field appears byte-identically in the rewrite (coordinator-verified, 0 warnings). No new quoted material, no altered poet names/titles/tested forms. No Quranic text, Hadith, dates, or references added or altered.
- **مونث→مؤنث adjudicated exemption:** the EN fields of URD-035..038 contain the misspelled run مونث itself (8 fields: Q + one option each), so the verbatim rule and the spelling correction conflict. The correction stands in `_ur`; the verbatim checks (§3D pin + `test-stage5c.mjs` §5) accept مؤنث for that run in `_ur` only. `_roman` keeps مونث verbatim (Roman untouched). The EN-source typo is flagged for the owner in §8 — a source change is outside this rewrite's mandate.
- **No `[Auto-Translated]` marker inside any data field. No Latin honorific abbreviations. No U+FFFD. Zero Latin letters in any `_ur` field.**

## §4 Checks

- **Full battery: 4232 checks / 68 suites, ALL GREEN** (PASS-line count; baseline 4216/68 + 16 new Urdu pins = 4232 exactly; halves with `/tmp` harness-dir cleanup between halves — half 1: 34 suites / 1398, half 2: 33 suites / 2782 + qa-540 / 52; zero failures in either halves run). No flakes observed in this batch.
- **New pins:** 16 checks in `scripts/test-idiomatic-urdu.mjs` §3D (500 items + ID order, token-aware banned glossary/variant terms, banned phrases incl. Latin echo glosses + درج ذیل, em-dash, no-literal-marker, no-U+FFFD, STRICT digits on all fields, script-verbatim with the مونث→مؤنث exemption, positive glossary pins, zero-Latin pin, no-Arabic-yeh/kaf pin, no Latin honorifics, مؤنث-exactly-51 pin, حرف جار uniformity pin). Header scope updated (Islamiyat + Tajweed + Arabic + Urdu rewritten; other 10 banks pending U2).
- **`npm run build`: PASS** (20/20 routes). **`npx tsc --noEmit`: clean.**
- **Merge verification:** `merge-urdu.cjs` applied the 5 slices and verified every non-`_ur` field identical + key order + indent-1 + trailing-newline serialization (round-trip verified; bank 726,122 → 726,316 bytes). Independent parsed diff vs `~/workspace/u2-urdu/pre-merge/urdu.json`: 0 non-`_ur` failures. Slice files + validator + merge script in `~/workspace/u2-urdu/`.
- **`bank-manifest.ts` byte-identical** after regeneration (md5 `91a80167e75a8785116edeceb09f1ee1` before and after `npm run build` prebuild) — counts unchanged, not in the push set.
- **Production smoke** (fresh `next start`, stopped afterwards; port 3109 free): 14 routes HTTP 200 (/, /library, /practice, /flashcards, /plan, /mock, /review, /analysis, /tracks, /issues, /topics, /mock/tt-B, /tracks/tt, /sw.js); home HTML carries 7040; the true Urdu lazy chunk (639,760 bytes, contains URD-500) carries rewritten strings at exact counts (مؤنث 51, حرف جار 25, اسم موصول 12, مندرجہ ذیل 2, مسند الیہ 12, جمع مکسر 1, معنی کے لحاظ سے 4) and zero banned forms in `_ur`; its 16 مونث occurrences are the untouched EN + `_roman` fields of URD-035..038 (verified field-by-field); its 2 `(noun)` hits are the untouched EN + `_roman` explanation of URD-026; zero server errors. Limit: HTTP/chunk-level only — no rendered-DOM check was possible in this subagent; live click-through in Urdu mode is the parent's pass after deploy.

## §5 Deliberate assertion updates (adjudicated, none weakened)

2 existing suites failed after the merge. Each inspected field-by-field; both trace to the deliberate U2 rewrite:

1. **`test-lazy-banks.mjs`** — 1 check: the urdu byte-prefix assertion (backup bytes exact prefix + 455 appended) → non-`_ur` field comparison of the 45 backup items + the same append pins, exactly the U1 islamiyat / U2 tajweed/arabic adjudication pattern. Byte equality no longer applies (92 items' `_ur` rewritten); the check still proves the 45 backup items untouched in every other field.
2. **`test-stage5c.mjs`** — §5 Arabic-verbatim audit: the EN run مونث (URD-035..038, 8 fields) is now satisfied by مؤنث in `_ur` only (see §3). Implemented by passing the language into `auditField` and exempting that single run for `lang === "ur"`; the `_roman` check is unchanged and still requires مونث verbatim. Every other script run in both languages is still required byte-identical. `test-phase1-urdu.mjs`, `test-trilanguage.mjs`, `test-step3b-audit2.mjs` all stayed green with no changes.

## §6 Coordinator corrections + merge normalization (data, not suites)

**None needed.** Unlike Tajweed/Arabic, no merge normalization was applied: all five workers wrote the pinned forms directly (مونث 51→0 / مؤنث 0→51, بہ لحاظ 4→0, خبر کے لحاظ سے 5→7, straight-quote spans 80→80, no new Latin, no new digits), and the coordinator's cross-slice consistency scan found no divergence requiring repair. The merged tree matches the slices exactly. Deliberately NOT normalized (adjudicated, documented): straight-vs-curly quote split (pre-existing style, preserved); stray ۔ inside quotes in URD-251/252/253/261/262 (preserved verbatim + flagged); موضوع "theme" uses (3, legitimate, distinct from the tarkeeb "subject" sense fixed to مسند الیہ); URD-253's stray ۔ (flagged in the brief, preserved).

## §7 Worker flags carried forward (from slice reports)

- **U1:** 14 Latin echo-gloss drops + مونث→مؤنث (10 fields) + URD-001 echo merge; URD-030 E "سے joins two words" teaching simplification mirrored; URD-014 weak distractor آرام left; ہم معنی vs مترادف variation in URD-021/025/044 left; URD-100 E omits the EN contrast about distractor forms — left deliberately (adding it would be new content). Spot-check: 27 items.
- **U2:** 11 surgical edits (passive-calque frame, agreement fixes, فعل مجہول کی صورت ×3, double-میں, باقی الفاظ); URD-179 quoted `حسن سبق لکھو` lacks the vocative comma of URD-184 — mirrors EN, left verbatim; straight-vs-curly quote split preserved; URD-190 Q/E omit EN "place, time, or purpose" — left (question still correct). Spot-check: 14 items.
- **U3:** 35 مونث fields + 16 framing rewrites (restored dropped EN qualifiers/axes in URD-205/231/232/297, verb-compression fix, بہ لحاظ normalization, مسند الیہ ×2, کس چیز→کس پر ×2); **taxonomy overlap flagged:** URD-234/236/237 classify "X اور Y" sentences as جملہ مرکب while URD-238/239/245 classify near-identical ones as جملہ ہم رتبہ (defensible — ہم رتبہ is a kind of مرکب — but inconsistent side by side); URD-217–220 treat کب/کہاں/کیا/کیسے as حرف استفہام (strict grammar: اسمائے استفہام); URD-292 names three nouns but tests one pair; URD-287 calls عورت the "feminine form" of مرد (counterpart, not morphological feminine); stray ۔ inside quotes in URD-251/252/253/261/262; straight-quote spans in URD-238/239/245/250 E/O clash with ’...‘ style — all preserved + flagged. Spot-check: 12 items.
- **U4:** 4 items / 5 fields (dangling participle URD-302, مونث ×3 fields, URD-384 ، اور join split); URD-305 E drops the EN "Arabic broken-plural pattern" fact; URD-382 E says only نصیحت (matches EN explanation); URD-350 "escape narrowly" → بمشکل بچ جانا (nuance softened, tested option untouched); URD-398 E مجرم کے ضمیر for "guilty conscience" (slightly strong); URD-313 Q singular بنی ہے with plural-form خبریں (cited-word agreement, left); quoted blank-sentences carry ۔ inside quotes consistently (7 items — the quoted sentence's own full stop, not stray); inflected idiom forms (ہاتھ بٹا دیا, ہوا ہو گیا) are correct inflections. Spot-check: 13 items.
- **U5:** 28 items (echo merges URD-456–470 incl. URD-460; restored dropped EN facts in URD-401/438/440/443/444/449/470; agreement/fluency fixes); all poet/book attributions checked consistent; title forms خدا سخن/شاعر مشرق/شاعر انقلاب left without izafat per bank convention; URD-449 تخلص kept for Premchand (قلمی نام would be more precise for a prose writer — owner may prefer it); URD-461 Q drops EN "measured by its syllable pattern" (restoring needs unsettled prosody terminology — left); URD-497–500 E keep bare verb-pairing statements (EN "since…" reasons not restored). Spot-check: 13 items.
- **Faithful-meaning spot-checks:** U1 27 items, U2 14, U3 12, U4 13, U5 13 — meaning identical, correct answer unchanged, explanations still support the correct option in all. All slices passed mechanical validation with 0 failures and 0 quote warnings, coordinator-verified independently.

## §8 Flags for the owner (honest list — nothing hidden)

1. **All §1 glossary-gap decisions need owner confirmation** — especially: مؤنث for feminine (vs the uniform-before مونث); حرف جار kept without izafat (vs Arabic حرفِ جر); مسند الیہ for tarkeeb "subject" (URD-265/267, vs loose موضوع); معنی کے لحاظ سے (URD-272..275); جمع مکسر (URD-297); مکمل کلام / طنزیہ لہجہ / زوال (single uses); تخلص for Premchand (URD-449, vs قلمی نام).
2. **EN-source typo (needs owner correction — a source change is outside this rewrite):** the English fields of URD-035..038 contain مونث (Q + one option each). The `_ur` fields now say مؤنث; the EN and `_roman` fields still say مونث. Owner to decide whether the English source should be corrected.
3. **English-source issues, mirrored faithfully, NOT fixed:** URD-234/236/237 vs URD-238/239/245 مرکب/ہم رتبہ overlap; URD-217–220 حرف استفہام vs اسمائے استفہام; URD-292 three-noun/one-pair; URD-287 عورت as "feminine form" of مرد; URD-030 E "سے joins two words" simplification; URD-014 weak distractor; URD-190/305/382/461/497–500 `_ur` omissions of EN detail (left deliberately — restoring would be new content or unsettled terminology). Owner to decide whether the English source should be corrected.
4. **Preserved quirks (verbatim rule — owner may want a uniform policy):** stray ۔ inside quotes (URD-251/252/253/261/262); straight-vs-curly quote split (80 straight spans incl. URD-120, URD-166..186, URD-379/381/384/390); quoted blank-sentences carrying ۔ inside quotes (7 items in U4).
5. **Ism-e-Mausool correction (standing Phase 1 flag, owner confirmation still pending):** URD-068–070 use اسم موصول; "Musawwaf" appears nowhere in the bank and is suite-banned. The research report §3.4 still says "Musawwaf".
6. **Badge policy (standing U1 flag):** rewritten Urdu still carries the literal `[Auto-Translated]` badge — owner may want the badge policy revisited for rewritten content.
7. **2 warning banners stay English in Urdu mode** (standing factual-precision exception, U1).
8. **`_ur`-only script-content policy (standing Tajweed/Arabic flag):** this bank keeps extensive Urdu-script content in `_ur` by design (the subject matter IS Urdu). No change proposed.
9. **Past-paper banks (20+20) remain OUT of scope** pending the owner's past-paper labelling decision (unanswered since 2026-11-16).
10. **Standing open items unchanged:** Islamiyat mixed-explanation cleanup (33 ISL + 45 PAK + PPT-001); per-subject practice resume (design only, owner approval required); COMP_B.ct Pak Studies 10 vs Social Studies 10 inconsistency; 9 cross-bank overlapping facts; "Teachy.ai" source label on one Arabic note; TAJ-393 contradiction (English-source, mirrored in U2-Tajweed); ARB-285/286/229 Arabic-form errors (left verbatim in U2-Arabic).

## §9 U2 remaining plan — the other 10 banks

Order (U1 §9): English → Maths → Pak Studies → Pedagogy → Science → Social Studies → GK → IT → PE → Drawing. Lessons from Urdu for the next subjects:

- Check each bank's digit AND Latin baselines FIRST (Urdu had zero of both — the lightest rewrite yet at 92/500 items; do not assume any bank needs heavy rewriting, and do not force rewrites where the text is already idiomatic).
- Check whether the ENGLISH fields carry script runs (Urdu's 45 existing items did — the verbatim rule then constrains the rewrite, and a source typo like مونث forces an adjudication; document it the same way).
- The مونث→مؤنث decision now spans two banks (Arabic 2×, Urdu 51×); the remaining banks should be scanned for مونث before their briefs are written.
- Each bank's `test-lazy-banks.mjs` byte-prefix pin will need the same §5 adjudication when its turn comes (english 45, maths 45, + the rest).
- Keep the slice/validate/merge pattern: 5 slices of 100, coordinator validator before merge, parsed-diff merge verification. Normalization is optional — skip it when the slice union is already consistent, and say so plainly.
- Battery lesson re-confirmed: run suites in halves with `/tmp` cleanup; count PASS lines in halves too (a single-pass count undercounts when late suites hit the 512M tmpfs limit).
- Smoke lesson: identify the TRUE lazy chunk by size + content counts (a shared chunk may also contain the bank's IDs); verify rewritten-string counts inside the lazy chunk itself, and explain any banned-form hits in EN/`_roman` fields field-by-field. Kill the smoke server by port/PID, never with a `pkill -f` pattern that matches the invoking command line.

## §10 Deliberately left out

- No `_roman` changes; no English source changes (including the §8.2/§8.3 issues); no reviewStatus/verified/correctIndex changes; no notes/flashcards/plan/mocks/chrome changes; no manifest change; no new suite file (pins added to the existing suite); no push/deploy/GitHub/Vercel/env changes. The 2 remaining U1 open questions are settled for this bank as in §1 (echo-gloss decided per the Arabic rule; Arabic-note transliterations N/A).

## §11 Files changed (6)

1. `src/data/banks/urdu.json` — `_ur` fields only (92/500 items, 118/3000 fields).
2. `scripts/test-idiomatic-urdu.mjs` — new §3D, 16 Urdu pins + header scope update.
3. `scripts/test-lazy-banks.mjs` — 1 adjudicated check (urdu byte-prefix → non-`_ur` comparison + append pins).
4. `scripts/test-stage5c.mjs` — §5 verbatim audit: مونث→مؤنث exemption for `_ur` only (narrow, documented).
5. `VERIFY-u2-urdu.md` — this report.
6. `CHANGELOG.md` — U2-Urdu entry.

Working files (NOT pushed): `~/workspace/u2-urdu/` (BRIEF.md, validate/merge scripts, slices U1..U5, pre-merge backup). No normalize script — none was needed (§6). `bank-manifest.ts` byte-identical — excluded from the push set.
