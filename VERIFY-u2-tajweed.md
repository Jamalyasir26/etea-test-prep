# VERIFY — U2 Subject 1: Tajweed bank idiomatic Urdu rewrite (2026-11-18, local; NOT deployed)

Idiomatic (*bamuhawra*) Urdu rewrite of the `_ur` fields of all 500 Tajweed MCQs (TAJ-001..TAJ-500), per the U1 style guide + 276-term glossary (`~/workspace/idiomatic-urdu-guide.md`, working file, not pushed). First subject of the U2 program (U1 report §9 plan). Worked in 5 slices of 100 by slice-worker subagents, coordinator-validated, merged by script. No push/deploy (parent handles).

## §1 Style guide + glossary decisions

U1 glossary decisions applied and suite-pinned: تدریسیات, وضاحت, آپ, موک ٹیسٹ, مشق/مشقی, نمبر, سورت (سورۃ banned), ذوالحجہ/ذوالقعدہ, مندرجہ ذیل (درج ذیل banned), em-dash banned inside sentences, Urdu punctuation (۔ ، ؟ ؛), verb-final restructuring, no calque. Tajweed-specific decisions (brief §4 + coordinator adjudications; all flagged for owner confirmation in §8):

- **Duration "counts" → حرکات** (حرکت singular, حرکتوں oblique). Abstract "count / choice of counts" → لمبائی / لمبائی کا اختیار. گنتی banned (was 150 fields).
- **Madd stretch → کھینچنا** family; "stretched" options → کھینچی ہوئی / کھینچا ہوا. مد is feminine (ہوتی ہے، کھینچتی ہے).
- **Articulation → نکلتا** (آتا only for positional/sequence "comes first/last", never for articulation). بنتا kept for "is formed/produced".
- **Madd names → مد + name**, no izafat shadda (مدِّ banned); مد طبیعی (طبعی normalized); مد صلہ (see errata); مد کا حرف / مد کے حرف (مد والا/والے حرف normalized, 16 occurrences).
- **شمسی حروف / قمری حروف.** English `'Al-'` glosses → ال (37 occurrences; the only approved NEW Arabic run — see §3). الف لام kept where English spells "Alif Laam" and in الف لام میم.
- **'linking' → جوڑنا (linking)** on first use only (TAJ-081, suite-pinned as the sole Latin-letter field).
- **Rule terms as in bank:** اظہار / ادغام / اخفا / اقلاب / غنہ (غنّہ normalized) / وقف / قلقلہ / سکتہ / روم / اشمام; مخرج / مخارج، جوف، حلق، لسان، شفتان، خیشوم; قلقلہ کبریٰ / صغریٰ. "With no Ghunnah" in prose → بغیر غنہ کے; the term name stays ادغام بلا غنہ.
- **پڑھنے والا** for English "reader", **قاری** for "reciter". **قرآن پاک** always (bare قرآن banned, suite-pinned). واضح پڑھنا; چھپا کر پڑھا جاتا ہے.
- **Letter names normalized to dominant short forms:** واؤ (واو 19), را (راء 20, رے 4), با, تا, ثا, حا, خا, طا, ظا, فا, یا (ے/وئے forms 15). **زے KEPT** — the only form for Zay (17, no زا anywhere). ضاد / سین / شین / صاد / جیم / دال / ذال / عین / غین / قاف / کاف / لام / میم / نون / الف as in bank. **لا KEPT** — the وقف symbol (TAJ-068/450), not the letter Laam.
- **Brief errata** (brief §4 table spellings corrected against dominant bank forms): استعلا → **استعلاء**; رخوت → **رخاوہ**; صیلہ → **صلہ**; bare شدت → **شدّت** for the Shiddah sifah, distinct from **شدہ** (the doubling mark); standalone شد → شدہ (10 occurrences, all shaddah-sense).
- **Pre-existing typo fixed:** حمزہ → **ہمزہ** (5 occurrences, TAJ-043/045/046/048 — the letter name, not the personal name; 114 ہمزہ tokens elsewhere).
- **Further renderings:** "matching vowel" → مناسب حرکت; "triggered" → سبب بننا / ہوتا ہے / لگتا ہے; "connected recitation" → ملا کر پڑھنے; "held Ghunnah" (duration) → رکھا جاتا ہے; "acts on/applies" → لگتا ہے; reciter "applies a rule" → قاعدہ لگانا; غنہ کرنا → غنہ ملانا; اظہاری → اظہار شفوی کے حروف; "spelled-out letter" → حرف کے نام; "neighbouring letter" → ساتھ والا حرف; "treatments" → صورت / حالتیں; "tells the reciter" → نشاندہی کرتی ہے; "general region" → علاقہ, "detailed point" → مقام; "main point" → اصل مخرج; "grammar" → قواعد.
- **Juz → پارہ / پارے;** جز kept only in fixed names جز عم / جز الف لام میم.
- **Colon-label openers stripped** ("Sorting drill:", "Ghunnah check:", "Naming the Madd:", etc. — T3/T4/T5, ~70 items): the question is asked plainly. Digits carried only by a label were folded into the question (TAJ-374, TAJ-391). Whimsical openers stripped.
- **TAJ-470 gloss reworded** to "وہ سات آیات جو بار بار دہرائی جاتی ہیں" (seven oft-repeated verses, not "repeated seven times"). **TAJ-473** both "described as" hedges preserved as بتایا گیا ہے.
- **Agreement fixes:** نون / لام masculine; TAJ-436 تلفظ masculine.
- **U1 open questions for this bank:** echo-gloss divergence N/A (0 repeated-sentence echoes found in the baseline scan); Arabic-note transliterations N/A (notes out of scope); glossary gaps decided above and flagged in §8.

## §2 Coverage — what was rewritten

- **364 / 500 items changed, 136 unchanged** (already idiomatic, copied byte-identically). **778 / 3000 `_ur` fields changed:** questions 280, option elements 261, explanations 237.
- Per slice (items changed / unchanged, coordinator-verified): T1 (TAJ-001..100) 55/45; T2 (101..200) 80/20; T3 (201..300) 58/42; T4 (301..400) 75/25; T5 (401..500) 89/11. Slice-worker subtotal 357; the merge normalization (§6) touched 7 further items that were otherwise unchanged.
- English source fields, `_roman` fields, reviewStatus/verified/correctIndex, ids, topics, sources: **byte-identical** (parsed diff vs the pre-merge backup, §4). No bank/file deletions, no localStorage changes, no behavior changes. Item-level fallback + badge rules unchanged.
- Baseline scan (pre-rewrite): 10 em-dash fields, 48 سورۃ occurrences, 22 Latin-letter fields, 0 empty `_ur` fields, 0 explanations starting with اس لیے. All resolved except the single approved `(linking)` gloss.

## §3 Digit + Arabic invariants

- **Digit rule: STRICT digit-group multiset equality on EVERY field** (questions, each option, explanations) — stricter than U1 ruling 1, justified because the bank was verified strict-clean before the rewrite and `test-phase1-tajweed.mjs` enforces strict digits on new items. Suite-pinned in §3B of `test-idiomatic-urdu.mjs`.
- **Arabic script copied verbatim, never retyped.** Every Arabic run in an English field appears byte-identically in the `_ur` field (suite-pinned; the Phase 1 Tajweed suite also stays green). Quranic example words only from the approved `quran-examples.json` entries; none added or altered.
- **Pre-existing `_ur`-only Arabic content KEPT** (not new introductions; no suite forbids extra `_ur` runs; pedagogically useful): single-letter glyphs in TAJ-265..279 and TAJ-395..430 options, the TAJ-196 mnemonic خص ضغط قظ, and T5's names/glyphs (السبع المثانی، اقرا، معوذتین، جبل النور، التحیات، متشابہات). T4 had stripped the TAJ-395 glyphs; the coordinator restored them (§6) for consistency with TAJ-265..279.
- **The only approved new Arabic run is ال** (from English `'Al-'` glosses, 37 occurrences). No `[Auto-Translated]` marker inside any data field. No Latin honorific abbreviations. No U+FFFD.
- **TAJ-439 مد عارض stays short:** its English uses short "Madd Aarid" while all other items use full "Madd Aarid Lis Sukoon"; the Urdu mirrors the English per item.

## §4 Checks

- **Full battery: 4198 checks / 68 suites, ALL GREEN** (PASS-line count; baseline 4182/68 + 16 new Tajweed pins in `test-idiomatic-urdu.mjs` = 4198 exactly). Run in halves with `/tmp` harness-dir cleanup between halves (512M tmpfs fills with suite tsc OUT dirs; half 1: 34 suites / 1364; half 2: 33 suites / 2782; qa-540: 52). Zero failures.
- **New pins:** 16 checks in `scripts/test-idiomatic-urdu.mjs` §3B (500 items + ID order, token-aware banned glossary/variant terms, banned phrases, em-dash, no-literal-marker, no-U+FFFD, STRICT digits on all fields, Arabic-verbatim, positive glossary pins, bare-قرآن ban, sole-Latin `(linking)` pin, no Latin honorifics). No Dhul pins: no Dhul-Hijjah/Qadah forms occur in this bank. Header scope updated (Islamiyat + Tajweed rewritten; other 12 banks pending U2).
- **`npm run build`: PASS** (20/20 routes). **`npx tsc --noEmit`: clean.**
- **Merge verification:** `merge-tajweed.cjs` applied the 5 slices and verified every non-`_ur` field identical + key order + indent-1 + trailing-newline serialization (round-trip verified; bank 871,603 → 864,551 bytes). Independent parsed diff vs `~/workspace/u2-tajweed/pre-merge/tajweed.json`: 0 non-`_ur` failures. Slice files + validator + normalizer + merge script in `~/workspace/u2-tajweed/`.
- **`bank-manifest.ts` byte-identical** after regeneration (md5 `91a80167e75a8785116edeceb09f1ee1` before and after `npm run build` prebuild) — counts unchanged, not in the push set.
- **Production smoke** (fresh `next start`, stopped afterwards): 18 routes HTTP 200 (15 static + `/mock/tt-B` + `/tracks/tt` + `/sw.js`); home HTML carries 7040; `/sw.js` serves v3; the true Tajweed lazy chunk (782,312 bytes) carries rewritten strings (مناسب حرکت 6, شمسی حروف 16, قرآن پاک 40, مد طبیعی 17) and zero banned forms (گنتی 0, سورۃ 0, واو 0, حمزہ 0); zero server errors. One false alarm resolved during the smoke: a shared chunk contains one گنتی inside a Maths note ("قدرتی اعداد گنتی کے اعداد ہیں") — legitimate, unrelated to Tajweed. Limit: HTTP/chunk-level only — no rendered-DOM check was possible in this subagent; live click-through in Urdu mode is the parent's pass after deploy.

## §5 Deliberate assertion updates (adjudicated, none weakened)

1 existing suite failed after the merge. Inspected field-by-field; it traces to the deliberate U2 rewrite:

1. **`test-lazy-banks.mjs`** — 1 check: the tajweed byte-prefix assertion (backup bytes exact prefix + 418 appended) → non-`_ur` field comparison of the 82 backup items + the same append pins, exactly the U1 islamiyat adjudication pattern. Byte equality no longer applies (364 items' `_ur` rewritten); the check still proves the 82 backup items untouched in every other field. `test-phase1-tajweed.mjs`, `test-stage5b.mjs`, `test-trilanguage.mjs`, `test-phase4b2.mjs` all stayed green with no changes.

## §6 Coordinator corrections + merge normalization (data, not suites)

Applied to slice values BEFORE merge via `normalize-tajweed-slices.cjs` (token-exact replacement on delimiter-preserving splits, so word-internal matches like نکلتے / صفحے are never touched; every count asserted). Slices in `~/workspace/u2-tajweed/slices/` carry the normalized values; the merged tree matches the slices exactly:

- Letter-name normalization: واو→واؤ (19), راء→را (20), رے→را (4), ثے→ثا (2), تے→تا (2), طوئے→طا (2), ظوئے→ظا (2), فے→فا (3), حے→حا (2), خے→خا (2), یے→یا (3). بے→با scoped to TAJ-416's two letter-name uses only (بے قاعدہ / بے احتیاط / بے ترتیب prefix uses in TAJ-080/320/461 preserved).
- شد→شدہ (10, all shaddah-sense, contexts checked); حمزہ→ہمزہ (5, pre-existing typo); مد والا حرف→مد کا حرف (7), مد والے حرف→مد کے حرف (9) — case preserved.
- **TAJ-395 glyph restore:** options restored to "با (ب) اور تا (ت)" etc., keeping T4's با/تا alignment (see §3).
- No-ops verified before deciding: bare قرآن 0 (all slices already used قرآن پاک); استعلا/رخوت/صیلہ/طبعی/مدِّ/شدّہ/غنّہ already 0 in slices (workers normalized them); لا deliberately untouched (وقف symbol).

## §7 Worker flags carried forward (from slice reports)

- **T1:** مد feminine; واؤ normalized in TAJ-025/033/035/036/037; حرکات does double duty (counts + vowels — context disambiguates); پارہ/پاروں with (جز) gloss in question only (TAJ-030); قواعد for grammar (TAJ-070); حروفِ شمسیہ gloss kept in TAJ-061, (قمریہ) in TAJ-062; idiom زبان پر چڑھ جائے (TAJ-074); TAJ-048 "Ha" twice read as حا per the TAJ-004 list; TAJ-031 "trigger" → لازم کرتے ہیں; TAJ-029 mixed-English explanation rendered as a single `_ur` statement. Caught and fixed by the worker: TAJ-021 option shift, TAJ-014 typo اقلب→اقلاب.
- **T2:** general region → علاقہ, detailed point → مقام; بنتا kept for is-formed/produced; English spelling variants unified (Qaf/Qaaf→قاف، Kha→خا، Lam→لام، Raa/Ra→را، Tha→ثا); حا/ہا، طا/تا، ظا/زے، ذال/دال distinctions kept; soft upper palate → اوپر کے نرم تالو; کھینچا جانے والا واؤ (TAJ-105); TAJ-119 parallelism; TAJ-165..167 plain definition frames. Caught and fixed: TAJ-188 O0/O1 swap (English order Jahr, Hams). TAJ-196 kept خص ضغط قظ (English gives only Latin "Khas Daght Qiz") — see §3 keep-decision.
- **T3:** گنتی→حرکات throughout; واضح طور پر→واضح; bare compounds fixed with کے; سلوک/ملاقات/پڑوسی/عنوان calques replaced; Ghunnah "length" → مدت; TAJ-269 aligned to ادغام بلا غنہ; articulation adjudication (نکلتا kept; remaining آتا ہے positional). Pre-existing `_ur`-only glyphs in TAJ-265..279 retained — see §3.
- **T4:** abstract counts → لمبائی / لمبائی کا اختیار (TAJ-345/346/347-O2/353/361/370/375); "held nasal sound" → روک کر پڑھی جانے والی ناک کی آواز, kept identical across TAJ-396/399/400; 363-E's مد والے واؤ is a different construction and stays. Caught: مد صلہ spelling (bank-dominant, brief erratum — §1).
- **T5:** البقرۃ→البقرہ (53 سورۃ→سورہ/sورت fixes); قرآن→قرآن پاک (33 bare); 'Al-'→ال (TAJ-411..430); 455-E tautology merged; 494-E "ترتیب دینا"; 500-E dangling fixed. Ambiguous readings: TAJ-420, 430, 405-E, 427-Q, 448-O0 (readings chosen, not verified against any authority). T4 ambiguous readings: TAJ-312 "triggered before 15 letters" read as caused-by; TAJ-352 "what follower creates" read as what-following-thing causes; TAJ-358 "spelled-out letter" read as letter name; TAJ-323 "sorting by trigger letters" read as rule↔trigger pairing; TAJ-330 "name the rule" rendered as plain "which rule applies".
- **Faithful-meaning spot-checks:** T4 re-read 11 items against English (301, 312, 323, 331, 340, 352, 358, 371, 374, 391, 395) — meaning identical, correct answer unchanged in all 11. All slices passed mechanical validation (schema, ID order, strict digits, Arabic-verbatim, banned tokens, em-dash) with 0 failures, coordinator-verified independently.

## §8 Flags for the owner (honest list — nothing hidden)

1. **All §1 glossary-gap decisions need owner confirmation** — especially: حرکات for duration counts; کھینچنا for Madd stretch; نکلتا for articulation; مد کا حرف; ال for 'Al-'; letter-name normalizations (را، واؤ، زے kept); شدّت vs شدہ distinction; مناسب حرکت; لمبائی for abstract counts. The brief errata (استعلاء، رخاوہ، صلہ) likewise.
2. **English-source issues, mirrored faithfully, NOT fixed:** TAJ-393 E groups Madd Munfasil as "4 counts or 5 counts" only, contradicting TAJ-344/346 (2, 4 or 5 counts). TAJ-352 E, 360 E, 347 E use loose "follow(s)" direction (Madd types described as following Hamzah/Sukoon, when the Hamzah/Sukoon follows the Madd letter); the questions elsewhere state the order correctly. Owner to decide whether the English source should be corrected (that would be a source change, outside this rewrite's mandate).
3. **Ambiguous readings (§7):** TAJ-420, 430, 405-E, 427-Q, 448-O0; TAJ-312, 352, 358, 323, 330; TAJ-048 "Ha" read as حا; TAJ-029's mixed-English explanation. Owner checks while reading on `/review`.
4. **`_ur`-only Arabic glyphs kept (§3):** TAJ-265..279, TAJ-395..430, TAJ-196 mnemonic. Owner may want a uniform policy (keep vs strip) for the remaining banks.
5. **TAJ-439 مد عارض short** (§3) — mirrors the short English; owner may prefer the full form everywhere.
6. **Badge policy (standing U1 flag):** rewritten Urdu still carries the literal `[Auto-Translated]` badge — owner may want the badge policy revisited for rewritten content.
7. **2 warning banners stay English in Urdu mode** (standing factual-precision exception, U1).
8. **Past-paper banks (20+20) remain OUT of scope** pending the owner's past-paper labelling decision (unanswered since 2026-11-16).
9. **Standing open items unchanged:** Islamiyat mixed-explanation cleanup (33 ISL + 45 PAK + PPT-001); per-subject practice resume (design only, owner approval required); COMP_B.ct Pak Studies 10 vs Social Studies 10 inconsistency; 9 cross-bank overlapping facts; "Teachy.ai" source label on one Arabic note.

## §9 U2 remaining plan — the other 12 banks

Order (U1 §9): Arabic → Urdu → English → Maths → Pak Studies → Pedagogy → Science → Social Studies → GK → IT → PE → Drawing. Lessons from Tajweed for the next subjects:

- Check each bank's digit baseline FIRST: Tajweed was strict-clean (strict rule applied); Islamiyat needed ruling 1 (echo-dedup). Do not assume either.
- Fold the §1 brief errata into the worker brief before the next subject; re-audit letter-name / term variants per bank (each bank has its own dominant forms).
- Each bank's `test-lazy-banks.mjs` byte-prefix pin will need the same §5 adjudication when its turn comes (arabic 80, english 45, urdu 45, + the rest).
- Keep the slice/validate/normalize/merge pattern: 5 slices of 100, coordinator validator before merge, token-exact normalization with asserted counts, parsed-diff merge verification.
- The `_ur`-only Arabic-content policy (§8.4) should be settled by the owner before Arabic/Urdū, which carry the most Arabic-script content.

## §10 Deliberately left out

- No `_roman` changes; no English source changes (including the §8.2 issues); no reviewStatus/verified/correctIndex changes; no notes/flashcards/plan/mocks/chrome changes; no manifest change; no new suite file (pins added to the existing suite); no push/deploy/GitHub/Vercel/env changes. The 2 remaining U1 open questions (echo-gloss, Arabic-note transliterations) do not apply to this bank (§1).

## §11 Files changed (5)

1. `src/data/banks/tajweed.json` — `_ur` fields only (364/500 items, 778/3000 fields).
2. `scripts/test-idiomatic-urdu.mjs` — new §3B, 16 Tajweed pins + header scope update.
3. `scripts/test-lazy-banks.mjs` — 1 adjudicated check (tajweed byte-prefix → non-`_ur` comparison + append pins).
4. `VERIFY-u2-tajweed.md` — this report.
5. `CHANGELOG.md` — U2-Tajweed entry.

Working files (NOT pushed): `~/workspace/u2-tajweed/` (BRIEF.md, validate/normalize/merge scripts, slices T1..T5, pre-merge backup). `bank-manifest.ts` byte-identical — excluded from the push set.
