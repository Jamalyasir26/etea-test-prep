// Language (English / Roman Urdu / اردو RTL) + dark mode, persisted in localStorage.
// UI CHROME is translated here: every user-facing UI string (headings,
// descriptions, buttons, placeholders, labels, nav, footer, health
// indicator, privacy disclosures) goes through STRINGS with en + ur.
// CONTENT (notes, MCQs, flashcards, tracks, patterns, vacancy rows) keeps
// its original wording in this pass — see LOCALIZATION-PLAN.md for the
// tri-language content structure (schema + fallback helper live in
// src/lib/data.ts; no content is translated yet).
//
// FALLBACK RULE (documented): t()/tf() look up the current language,
// then fall back to English, then to the key itself. Roman Urdu
// ("roman") has translations for short UI chrome (labels, buttons,
// headings); LONG explanatory paragraphs have no roman entry and fall
// back to English until a later pass translates them. Urdu ("ur") is
// complete for every key: the test suite fails if any key lacks ur.
// Deliberate exceptions (English kept, listed in the report): proper
// names (ETEA, KPPSC, Gemini, Groq, OpenRouter), IDs/codes, the scoring
// policy notes (factual precision statements), CORRECTIONS / the pattern
// banner (factual content), and format examples ("e.g. ISL-001").
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { safeRead, safeWrite } from "./tracking";

export type Lang = "en" | "roman" | "ur";
export type Theme = "light" | "dark";

export type StrEntry = { en: string; roman?: string; ur?: string };

const STRINGS: Record<string, StrEntry> = {
  // ---- Nav ----
  home: { en: "Home", roman: "Home", ur: "ہوم" },
  library: { en: "Library", roman: "Library", ur: "لائبریری" },
  practice: { en: "Practice", roman: "Practice", ur: "مشق" },
  mocks: { en: "Mock Tests", roman: "Mock Tests", ur: "موک ٹیسٹ" },
  flashcards: { en: "Flashcards", roman: "Flashcards", ur: "فلیش کارڈز" },
  tutor: { en: "AI Tutor", roman: "AI Tutor", ur: "اے آئی استاد" },
  plan: { en: "Study Plan", roman: "Study Plan", ur: "مطالعہ منصوبہ" },
  analysis: { en: "Analysis", roman: "Analysis", ur: "تجزیہ" },
  tracks: { en: "Post Tracks", roman: "Post Tracks", ur: "پوسٹ ٹریکس" },
  topics: { en: "Past-Paper Topics", roman: "Past-Paper Topics", ur: "پاسٹ پیپر موضوعات" },
  vacancies: { en: "Vacancies", roman: "Vacancies", ur: "آسامیاں" },
  links: { en: "Official Links", roman: "Official Links", ur: "سرکاری لنکس" },
  issues: { en: "Issues", roman: "Issues", ur: "مسائل" },
  review: { en: "Review", roman: "Review", ur: "جائزہ" },
  brandTagline: {
    en: "KP Government Jobs — personal preparation",
    roman: "KP Government Jobs — personal preparation",
    ur: "کے پی سرکاری ملازمتیں — ذاتی تیاری",
  },
  navMenuLabel: { en: "Navigation menu", roman: "Navigation menu", ur: "مینیو" },
  mainNavLabel: { en: "Main", roman: "Main", ur: "مرکزی" },
  languageLabel: { en: "Language", roman: "Language", ur: "زبان" },
  toggleDarkLabel: { en: "Toggle dark mode", roman: "Dark mode badlein", ur: "تاریک موڈ بدلیں" },
  light: { en: "Light", roman: "Light", ur: "روشن" },
  dark: { en: "Dark", roman: "Dark", ur: "تاریک" },

  // ---- App shell (Stage 3 foundation) ----
  sidebarCollapse: { en: "Collapse sidebar", roman: "Sidebar sametein", ur: "سائڈبار سمیٹیں" },
  sidebarExpand: { en: "Expand sidebar", roman: "Sidebar phelaein", ur: "سائڈبار پھیلائیں" },
  sidebarNavFilter: { en: "Filter navigation…", roman: "Navigation chhantein…", ur: "رہنمائی چھانٹیں…" },
  sidebarNavFilterLabel: { en: "Filter navigation links", roman: "Navigation links chhantein", ur: "رہنمائی روابط چھانٹیں" },
  closeMenu: { en: "Close navigation menu", roman: "Navigation menu band karein", ur: "رہنمائی مینیو بند کریں" },
  skipToContent: { en: "Skip to main content", roman: "Markazi mawad par jaein", ur: "مرکزی مواد پر جائیں" },
  reviewNow: { en: "Review now", roman: "Abhi dohraein", ur: "ابھی دہرائیں" },
  noNavResults: { en: "No matching pages", roman: "Koi mutabiq safha nahi", ur: "کوئی مطابق صفحہ نہیں" },

  // ---- Footer ----
  footerP1: {
    en: "All questions are original practice questions, not ETEA papers. Patterns are labelled per project — ETEA sets paper composition per project. Always verify against your specific advertisement / roll number slip.",
    ur: "تمام سوالات اصل مشقی سوالات ہیں، ETEA کے پرچے نہیں۔ پیٹرن ہر منصوبے کے لحاظ سے بتائے گئے ہیں — ETEA ہر منصوبے کے لیے پرچے کی ترکیب خود طے کرتا ہے۔ ہمیشہ اپنے مخصوص اشتہار / رول نمبر سلپ سے تصدیق کریں۔",
  },
  footerP2: {
    en: "AI Tutor answers are generated from this library only. All practice questions are AI-generated and unreviewed unless marked reviewed — mocks are provisional practice built from those unreviewed items. Trusted mode uses reviewed items only. No Hadith numbers, references, dates or quotes are invented on this site.",
    ur: "اے آئی استاد کے جوابات صرف اس لائبریری سے بنائے جاتے ہیں۔ تمام مشقی سوالات اے آئی سے بنے ہوئے اور غیر جائزہ شدہ ہیں جب تک ان پر جائزہ شدہ کا نشان نہ ہو — موک انہی غیر جائزہ شدہ اشیاء پر مبنی عارضی مشق ہیں۔ قابل اعتماد موڈ صرف جائزہ شدہ اشیاء استعمال کرتا ہے۔ اس سائٹ پر حدیث کے نمبر، حوالہ جات، تاریخیں یا اقتباسات گھڑے نہیں جاتے۔",
  },
  footerP3: {
    en: "Search engines are asked not to index this site (robots.txt / noindex), but that is not access control: anyone with the link can open it, and a real access gate is future work.",
    ur: "سرچ انجنوں سے کہا گیا ہے کہ اس سائٹ کو انڈیکس نہ کریں (robots.txt / noindex)، لیکن یہ رسائی کی پابندی نہیں ہے: لنک رکھنے والا کوئی بھی اسے کھول سکتا ہے، اور اصل رسائی گیٹ مستقبل کا کام ہے۔",
  },

  // ---- Shared chrome ----
  dashboard: { en: "Preparation Dashboard", roman: "Tayyari Dashboard", ur: "تیاری ڈیش بورڈ" },
  noAttempts: {
    en: "No attempts yet — take a quiz or a mock and your numbers will appear here.",
    roman: "Abhi koi attempt nahi — aik quiz ya mock dein, phir aap ke numbers yahan aayein ge.",
    ur: "ابھی کوئی کوشش نہیں — ایک کوئز یا موک دیں، پھر آپ کے نمبر یہاں آئیں گے۔",
  },
  start: { en: "Start", roman: "Shuru karein", ur: "شروع کریں" },
  next: { en: "Next", roman: "Agla", ur: "اگلا" },
  back: { en: "Back", roman: "Peechay", ur: "پیچھے" },
  submit: { en: "Submit", roman: "Submit karein", ur: "جمع کریں" },
  correct: { en: "Correct!", roman: "Sahi!", ur: "درست!" },
  wrong: { en: "Wrong", roman: "Ghalat", ur: "غلط" },
  score: { en: "Score", roman: "Score", ur: "نمبر" },
  accuracy: { en: "Accuracy", roman: "Accuracy", ur: "درستگی" },
  attempts: { en: "Attempts", roman: "Attempts", ur: "کوششیں" },
  streak: { en: "Day streak", roman: "Day streak", ur: "مسلسل دن" },
  // Phase 4A — Home stats loading skeleton (shown only until the real
  // computed values load after mount; never a fake number).
  statsLoading: { en: "Loading...", roman: "Loading...", ur: "لوڈ ہو رہا ہے..." },
  timeSpent: { en: "Time spent", roman: "Time spent", ur: "وقت" },
  weakAreas: { en: "Weak Areas", roman: "Weak Areas", ur: "کمزور حصے" },
  drill: { en: "Drill", roman: "Drill", ur: "مشق" },
  drillArrow: { en: "Drill →", roman: "Drill →", ur: "← مشق" },
  export: { en: "Export progress", roman: "Progress export karein", ur: "پیش رفت محفوظ کریں" },
  import: { en: "Import progress", roman: "Progress import karein", ur: "پیش رفت لائیں" },
  loading: { en: "Loading…", roman: "Loading…", ur: "لوڈ ہو رہا ہے…" },
  close: { en: "Close", roman: "Band karein", ur: "بند کریں" },
  cancel: { en: "Cancel", roman: "Cancel", ur: "منسوخ کریں" },
  subjectWord: { en: "Subject", roman: "Subject", ur: "مضمون" },
  totalWord: { en: "Total", roman: "Total", ur: "کل" },
  correctWord: { en: "Correct", roman: "Sahi", ur: "درست" },
  dateWord: { en: "Date", roman: "Date", ur: "تاریخ" },
  questionWord: { en: "Question", roman: "Sawal", ur: "سوال" },
  topicWord: { en: "Topic", roman: "Topic", ur: "موضوع" },
  sourceWord: { en: "Source", roman: "Source", ur: "ماخذ" },
  sourceLabel: { en: "Source:", roman: "Source:", ur: "ماخذ:" },
  allWord: { en: "All", roman: "All", ur: "تمام" },
  passWord: { en: "Pass", roman: "Pass", ur: "پاس" },
  problemWord: { en: "Problem", roman: "Problem", ur: "مسئلہ" },
  typeWord: { en: "Type", roman: "Type", ur: "قسم" },
  titleWord: { en: "Title", roman: "Title", ur: "عنوان" },
  modeWord: { en: "Mode", roman: "Mode", ur: "موڈ" },
  keyWord: { en: "Key", roman: "Key", ur: "کلید" },
  messageWord: { en: "Message", roman: "Message", ur: "پیغام" },
  minsLabel: { en: "{mins} min", roman: "{mins} min", ur: "{mins} منٹ" },
  weeksLabel: { en: "{n} weeks", roman: "{n} haftay", ur: "{n} ہفتے" },
  daysLabel: { en: "{n} days", roman: "{n} din", ur: "{n} دن" },
  marksLabel: { en: "marks", roman: "marks", ur: "نمبر" },
  scoringWord: { en: "Scoring:", roman: "Scoring:", ur: "نمبر بندی:" },
  statusWord: { en: "Status:", roman: "Status:", ur: "حالت:" },
  byWord: { en: "by", roman: "by", ur: "بذریعہ" },
  unreviewedWord: { en: "unreviewed", roman: "unreviewed", ur: "غیر جائزہ شدہ" },
  structuralWord: { en: "Structural:", roman: "Structural:", ur: "ساختی:" },

  // ---- Home ----
  homeIntro: {
    en: "Personal preparation — everything for upcoming KP tests in one place. {total} MCQs · {notes} notes · {cards} flashcards · {tracks} teaching post tracks · {mocks} mocks.",
    ur: "ذاتی تیاری — آنے والے کے پی ٹیسٹوں کے لیے سب کچھ ایک جگہ۔ {total} ایم سی کیوز · {notes} نوٹس · {cards} فلیش کارڈز · {tracks} تدریسی پوسٹ ٹریکس · {mocks} موک۔",
  },
  correctionsHeading: {
    en: "⚠️ Corrections — read first.",
    roman: "⚠️ Corrections — pehle parhein.",
    ur: "⚠️ تصحیحات — پہلے پڑھیں۔",
  },
  planTasksDone: { en: "Plan tasks done", roman: "Plan tasks done", ur: "منصوبے کے کام مکمل" },
  // Stage 3 part 2 — Command Center (home) + analysis charts.
  planProgressLabel: { en: "Plan progress", roman: "Plan progress", ur: "منصوبے کی پیش رفت" },
  chartDueForecast: { en: "Cards due — next 7 days", roman: "Cards due — agle 7 din", ur: "واجب کارڈز — اگلے 7 دن" },
  chartAccuracyTrend: { en: "Accuracy trend — last 14 days", roman: "Accuracy trend — aakhri 14 din", ur: "درستگی کا رجحان — آخری 14 دن" },
  chartNoData: { en: "No data for this chart yet.", roman: "Is chart ke liye abhi koi data nahi.", ur: "اس چارٹ کے لیے ابھی کوئی ڈیٹا نہیں۔" },
  chartDueWord: { en: "Due", roman: "Due", ur: "واجب" },
  chartAccuracyWord: { en: "Accuracy", roman: "Accuracy", ur: "درستگی" },
  chartQuestionsWord: { en: "Questions", roman: "Questions", ur: "سوالات" },
  fullAnalysis: { en: "Full analysis →", roman: "Full analysis →", ur: "← مکمل تجزیہ" },
  patternSelectorHeading: {
    en: "Pattern selector — pick the version your advert follows",
    roman: "Pattern selector — woh version chunein jo aap ke advert ke mutabiq ho",
    ur: "پیٹرن منتخب کریں — وہ ورژن چنیں جو آپ کے اشتہار کے مطابق ہو",
  },
  tutorLiveHeading: { en: "AI Tutor — live.", roman: "AI Tutor — live.", ur: "اے آئی استاد — براہ راست۔" },
  tutorLiveBody: {
    en: "The tutor calls Gemini (primary) with Groq and OpenRouter (free model) as fallbacks, server-side only. It answers from this library only, and says so when a question is outside the library. If live AI is down, the offline Study Assistant (library search) still works.",
    ur: "استاد Gemini (بنیادی) کو پکارتا ہے، اور Groq اور OpenRouter (مفت ماڈل) متبادل کے طور پر ہیں، صرف سرور پر۔ وہ صرف اس لائبریری سے جواب دیتا ہے، اور جب سوال لائبریری سے باہر ہو تو بتا دیتا ہے۔ اگر براہ راست اے آئی بند ہو تو آف لائن معاون (لائبریری تلاش) پھر بھی کام کرتا ہے۔",
  },
  quickLibraryDesc: {
    en: "151 notes with recall-first prompts",
    roman: "151 notes, recall-first prompts ke saath",
    ur: "151 نوٹس، پہلے یاد کرنے کی ترغیب کے ساتھ",
  },
  quickPracticeDesc: {
    en: "Topic quizzes, 20 per attempt",
    roman: "Topic quizzes, har attempt mein 20",
    ur: "موضوعی کوئز، ہر کوشش میں 20",
  },
  quickMocksDesc: {
    en: "{mocks} timed mocks / practice tests",
    roman: "{mocks} timed mocks / practice tests",
    ur: "{mocks} وقت والے موک / مشقی ٹیسٹ",
  },
  quickFlashDesc: {
    en: "70 cards, FSRS-7 adaptive spaced repetition",
    roman: "70 cards, FSRS-7 adaptive spaced repetition",
    ur: "70 کارڈ، FSRS-7 مطابقتی وقفہ تکرار",
  },
  quickTutorDesc: {
    en: "Live AI tutor (Gemini, Groq + OpenRouter fallbacks)",
    roman: "Live AI tutor (Gemini, Groq + OpenRouter fallbacks)",
    ur: "براہ راست اے آئی استاد (Gemini، Groq اور OpenRouter متبادل)",
  },
  quickPlanDesc: {
    en: "3 / 6 / 12-week study plans",
    roman: "3 / 6 / 12 hafton ke study plans",
    ur: "3 / 6 / 12 ہفتوں کے مطالعہ منصوبے",
  },
  quickAnalysisDesc: {
    en: "Live accuracy, trends, weak areas",
    roman: "Live accuracy, trends, weak areas",
    ur: "براہ راست درستگی، رجحانات، کمزور حصے",
  },
  quickTracksDesc: {
    en: "{tracks} post tracks with patterns",
    roman: "{tracks} post tracks, patterns ke saath",
    ur: "{tracks} پوسٹ ٹریکس، پیٹرن کے ساتھ",
  },

  // ---- Tutor ----
  tutorTitle: { en: "AI Tutor — Ustad", roman: "AI Tutor — Ustad", ur: "اے آئی استاد" },
  tutorIntro: {
    en: "This is the live tutor. It answers from this library only (RAG), in your selected language. If a question is outside the library, it says so instead of inventing. Mocks are provisional practice built from unreviewed AI-generated questions; Trusted mode uses reviewed items only.",
    ur: "یہ براہ راست استاد ہے۔ وہ صرف اس لائبریری سے جواب دیتا ہے (RAG)، آپ کی منتخب زبان میں۔ اگر سوال لائبریری سے باہر ہو تو گھڑنے کے بجائے بتا دیتا ہے۔ موک غیر جائزہ شدہ اے آئی سے بنے سوالات پر مبنی عارضی مشق ہیں؛ قابل اعتماد موڈ صرف جائزہ شدہ اشیاء استعمال کرتا ہے۔",
  },
  tutorPrivacy: {
    en: "Privacy: your question goes to Gemini, Groq or OpenRouter (the AI providers) to generate the answer. Don't share sensitive personal data. Your questions are not stored on this site.",
    ur: "رازداری: آپ کا سوال جواب بنانے کے لیے Gemini، Groq یا OpenRouter (اے آئی فراہم کنندگان) کو جاتا ہے۔ حساس ذاتی ڈیٹا شیئر نہ کریں۔ آپ کے سوالات اس سائٹ پر محفوظ نہیں ہوتے۔",
  },
  tutorAnnotationsOn: {
    en: "Your private note annotations are included in this chat (you enabled this in the Library). Turn it off there any time.",
    ur: "آپ کے نجی نوٹ حاشیے اس گفتگو میں شامل ہیں (آپ نے یہ لائبریری میں فعال کیا تھا)۔ وہاں سے کسی بھی وقت بند کر سکتے ہیں۔",
  },
  answerLanguage: { en: "Answer language:", roman: "Jawab ki language:", ur: "جواب کی زبان:" },
  answerLanguageHint: {
    en: "Answers come back in this language. The rest of the site keeps your selected language.",
    roman: "Jawab isi language mein aayein ge. Baqi site aap ki selected language mein rahe gi.",
    ur: "جوابات اسی زبان میں آئیں گے۔ باقی سائٹ آپ کی منتخب زبان میں رہے گی۔",
  },
  tutorLangAria: { en: "Tutor answer language", roman: "Tutor answer language", ur: "استاد کے جواب کی زبان" },
  tutorGreeting: {
    en: "Ustad — your AI tutor. Ask about any topic in this library, ask it to explain a wrong answer, or ask for a revision plan. Answers come from this library only.",
    roman: "Ustad — aap ka AI tutor. Is library ke kisi bhi topic par poochhein, ghalat jawab ki wazahat mangein, ya revision plan mangein. Jawab sirf is library se aate hain.",
    ur: "استاد — آپ کا اے آئی استاد۔ اس لائبریری کے کسی بھی موضوع پر پوچھیں، غلط جواب کی وضاحت مانگیں، یا نظر ثانی کا منصوبہ مانگیں۔ جوابات صرف اس لائبریری سے آتے ہیں۔",
  },
  thinking: { en: "Ustad is thinking…", roman: "Ustad soch raha hai…", ur: "استاد سوچ رہا ہے…" },
  askPlaceholder: {
    en: "Ask a question… e.g. What is scaffolding in pedagogy?",
    roman: "Sawal poochhein… masalan: What is scaffolding in pedagogy?",
    ur: "سوال پوچھیں… مثلاً: تدریس میں سکیفولڈنگ کیا ہے؟",
  },
  askLabel: { en: "Ask the tutor", roman: "Tutor se poochhein", ur: "استاد سے پوچھیں" },
  askButton: { en: "Ask", roman: "Poochhein", ur: "پوچھیں" },
  quickBloom: {
    en: "Explain Bloom's Taxonomy",
    roman: "Bloom's Taxonomy samjhayein",
    ur: "بلوم کی درجہ بندی سمجھائیں",
  },
  quickSurahs: { en: "Surahs in the Quran?", roman: "Quran mein Suratein?", ur: "قرآن میں سورتیں؟" },
  drillWeakest: {
    en: "Drill my weakest subject",
    roman: "Mere weakest subject ki drill karwayein",
    ur: "میرے کمزور ترین مضمون کی مشق کروائیں",
  },
  explainHeading: { en: "Explain one MCQ", roman: "Aik MCQ ki wazahat", ur: "ایک ایم سی کیو کی وضاحت" },
  explainDesc: {
    en: "Enter a question ID (e.g. ISL-001) to get a full explanation.",
    roman: "Mukammal wazahat ke liye question ID likhein (masalan ISL-001).",
    ur: "مکمل وضاحت کے لیے سوال کا نمبر لکھیں (مثلاً ISL-001)۔",
  },
  explainIdLabel: { en: "Question ID", roman: "Question ID", ur: "سوال کا نمبر" },
  explainButton: { en: "Explain", roman: "Wazahat karein", ur: "وضاحت کریں" },
  explaining: { en: "Explaining…", roman: "Wazahat ho rahi hai…", ur: "وضاحت ہو رہی ہے…" },
  explainError: {
    en: "Could not explain right now.",
    roman: "Abhi wazahat nahi ho saki.",
    ur: "ابھی وضاحت نہیں ہو سکی۔",
  },
  reachTutorError: {
    en: "Could not reach the tutor.",
    roman: "Tutor tak rasai nahi ho saki.",
    ur: "استاد تک رسائی نہیں ہو سکی۔",
  },
  reachTutorRetry: {
    en: "Could not reach the tutor. Check your connection and try again.",
    roman: "Tutor tak rasai nahi ho saki. Apna connection check karein aur dobara koshish karein.",
    ur: "استاد تک رسائی نہیں ہو سکی۔ اپنا کنکشن چیک کریں اور دوبارہ کوشش کریں۔",
  },
  liveUnavailable: {
    en: "Live AI is unavailable right now.",
    roman: "Live AI abhi available nahi hai.",
    ur: "براہ راست اے آئی ابھی دستیاب نہیں ہے۔",
  },
  offlineFound: {
    en: "Offline search in this library found:",
    roman: "Is library mein offline search ko mila:",
    ur: "اس لائبریری میں آف لائن تلاش کو ملا:",
  },
  offlineNoteLabel: { en: "Note", roman: "Note", ur: "نوٹ" },
  offlineMcqLabel: { en: "MCQ", roman: "MCQ", ur: "ایم سی کیو" },
  noMatchFallback: {
    en: "No matching note or question was found in this library either — try rephrasing, or use the Library section.",
    ur: "اس لائبریری میں کوئی مطابق نوٹ یا سوال نہیں ملا — دوبارہ لفظوں میں پوچھیں، یا لائبریری کا حصہ استعمال کریں۔",
  },
  yourAnnotations: {
    en: "Your annotations on this topic:",
    roman: "Is topic par aap ke hashiye:",
    ur: "اس موضوع پر آپ کے حاشیے:",
  },
  viaLine: {
    en: "— via {provider} (live AI)",
    roman: "— via {provider} (live AI)",
    ur: "— بذریعہ {provider} (براہ راست اے آئی)",
  },

  // ---- Tutor health indicator ----
  checkingStatus: {
    en: "Checking live AI status…",
    roman: "Live AI status check ho raha hai…",
    ur: "براہ راست اے آئی کی حالت چیک ہو رہی ہے…",
  },
  statusFailedSummary: {
    en: "Live AI status could not be checked ({reason}). The tutor page shows details, and the offline library search still works.",
    ur: "براہ راست اے آئی کی حالت چیک نہیں ہو سکی ({reason})۔ استاد کے صفحے پر تفصیل ہے، اور آف لائن لائبریری تلاش پھر بھی کام کرتی ہے۔",
  },
  statusFailedFull: {
    en: "Live AI status could not be checked ({reason}). The offline library search below still works.",
    ur: "براہ راست اے آئی کی حالت چیک نہیں ہو سکی ({reason})۔ نیچے آف لائن لائبریری تلاش پھر بھی کام کرتی ہے۔",
  },
  reasonHttp: {
    en: "the status check returned {status}",
    roman: "status check ne {status} diya",
    ur: "حالت کی جانچ نے {status} دیا",
  },
  reasonUnexpected: {
    en: "the status check returned an unexpected response",
    roman: "status check ne ghair mutawaqqa jawab diya",
    ur: "حالت کی جانچ نے غیر متوقع جواب دیا",
  },
  reasonTimeout: {
    en: "the status check timed out (cold start can take a while — try Refresh)",
    roman: "status check timeout ho gaya (cold start mein waqt lag sakta hai — Refresh karein)",
    ur: "حالت کی جانچ کا وقت ختم ہو گیا (کولڈ اسٹارٹ میں وقت لگ سکتا ہے — ریفریش کریں)",
  },
  reasonUnreachable: {
    en: "the status check could not be reached",
    roman: "status check tak rasai nahi ho saki",
    ur: "حالت کی جانچ تک رسائی نہیں ہو سکی",
  },
  refreshStatus: { en: "Refresh status", roman: "Status refresh karein", ur: "حالت تازہ کریں" },
  liveStatusNow: { en: "Live AI status now:", roman: "Live AI status ab:", ur: "براہ راست اے آئی کی حالت اب:" },
  noProvider: {
    en: "no provider is responding — the tutor will use the offline library search.",
    roman: "koi provider jawab nahi de raha — tutor offline library search use kare ga.",
    ur: "کوئی فراہم کنندہ جواب نہیں دے رہا — استاد آف لائن لائبریری تلاش استعمال کرے گا۔",
  },
  summaryResponding: { en: "{names} responding", roman: "{names} responding", ur: "{names} جواب دے رہا ہے" },
  summaryNotResponding: {
    en: "{names} not responding",
    roman: "{names} jawab nahi de raha",
    ur: "{names} جواب نہیں دے رہا",
  },
  coldStartNote: {
    en: "This check ran on a cold instance — a timeout here usually clears on retry.",
    ur: "یہ جانچ کولڈ انسٹینس پر چلی — یہاں کا ٹائم آؤٹ عام طور پر دوبارہ کوشش پر صاف ہو جاتا ہے۔",
  },
  statusResponding: { en: "responding", roman: "responding", ur: "جواب دے رہا ہے" },
  statusNotConfigured: { en: "not configured", roman: "not configured", ur: "ترتیب نہیں دی گئی" },
  statusError: { en: "error", roman: "error", ur: "خرابی" },
  statusErrorClass: { en: "error ({errorClass})", roman: "error ({errorClass})", ur: "خرابی ({errorClass})" },
  unknownModel: { en: "unknown model", roman: "unknown model", ur: "نامعلوم ماڈل" },

  // ---- Library ----
  libraryTitle: { en: "Library — Notes", roman: "Library — Notes", ur: "لائبریری — نوٹس" },
  libraryIntro1: {
    en: "Short, exam-focused, original notes.",
    roman: "Mukhtasar, exam par markooz, original notes.",
    ur: "مختصر، امتحان پر مرکوز، اصل نوٹس۔",
  },
  recallFirst: { en: "Recall first:", roman: "Pehle yaad karein:", ur: "پہلے یاد کریں:" },
  libraryIntro2: {
    en: "cover the note, recall it from memory, then read. Plain re-reading is low-utility; retrieval practice is high-utility.",
    ur: "نوٹ ڈھانپیں، حافظے سے یاد کریں، پھر پڑھیں۔ صرف دوبارہ پڑھنا کم فائدہ مند ہے؛ حافظے سے یاد کرنے کی مشق زیادہ فائدہ مند ہے۔",
  },
  optInLabel: {
    en: "Include my note annotations in tutor answers",
    roman: "Mere note annotations tutor ke jawabon mein shamil karein",
    ur: "میرے نوٹ حاشیے استاد کے جوابات میں شامل کریں",
  },
  optInDesc: {
    en: "Off by default. Your annotations are private notes stored on this device only — they are NOT sent to the AI tutor unless you enable this. When enabled, the tutor sees them as your own notes alongside the library.",
    ur: "بنیادی طور پر بند ہے۔ آپ کے حاشیے نجی نوٹ ہیں جو صرف اس ڈیوائس پر محفوظ ہیں — جب تک آپ یہ فعال نہ کریں، اے آئی استاد کو نہیں بھیجے جاتے۔ فعال ہونے پر استاد انہیں لائبریری کے ساتھ آپ کے اپنے نوٹ کے طور پر دیکھتا ہے۔",
  },
  searchNotesPlaceholder: { en: "Search notes…", roman: "Notes talash karein…", ur: "نوٹس تلاش کریں…" },
  searchNotesLabel: { en: "Search notes", roman: "Notes talash karein", ur: "نوٹس تلاش کریں" },
  noNotesMatch: {
    en: "No notes match that search.",
    roman: "Is search par koi note nahi mila.",
    ur: "اس تلاش پر کوئی نوٹ نہیں ملا۔",
  },
  recallReveal: {
    en: "Recall first — tap to reveal",
    roman: "Pehle yaad karein — zahir karne ke liye dabayein",
    ur: "پہلے یاد کریں — ظاہر کرنے کے لیے دبائیں",
  },
  hideAgain: { en: "Hide again", roman: "Dobara chhupayein", ur: "دوبارہ چھپائیں" },
  annotationLabel: {
    en: "Owner annotation (private — not sent to the tutor unless enabled above)",
    roman: "Owner annotation (private — tutor ko nahi bheja jata jab tak oopar enable na ho)",
    ur: "مالک کا حاشیہ (نجی — استاد کو نہیں بھیجا جاتا جب تک اوپر فعال نہ ہو)",
  },
  annotationPlaceholder: {
    en: "Your own note on this topic — a correction, a reminder, a link to check…",
    roman: "Is topic par aap ka apna note — aik correction, aik reminder, check karne ke liye link…",
    ur: "اس موضوع پر آپ کا اپنا نوٹ — ایک تصحیح، ایک یاد دہانی، چیک کرنے کے لیے لنک…",
  },
  saveAnnotation: { en: "Save annotation", roman: "Annotation save karein", ur: "حاشیہ محفوظ کریں" },
  annotationSaved: {
    en: "Saved privately on this device.",
    roman: "Is device par privately save ho gaya.",
    ur: "اس ڈیوائس پر نجی طور پر محفوظ ہو گیا۔",
  },
  annotationAria: {
    en: "Owner annotation for {title}",
    roman: "{title} ke liye owner annotation",
    ur: "{title} کے لیے مالک کا حاشیہ",
  },

  // ---- Practice ----
  practiceTitle: { en: "Practice — Topic Quizzes", roman: "Practice — Topic Quizzes", ur: "مشق — موضوعی کوئز" },
  practiceIntro1: {
    en: "20 questions per attempt, shuffled every time. Instant feedback after each question. All questions are original practice questions, labelled “AI-generated — not verified” (drafted by AI, structurally checked).",
    ur: "ہر کوشش میں 20 سوالات، ہر بار ملے جلے۔ ہر سوال کے بعد فوری تاثرات۔ تمام سوالات اصل مشقی سوالات ہیں، جن پر “AI-generated — not verified” کا لیبل ہے (اے آئی سے لکھے گئے، ساختی طور پر چیک شدہ)۔",
  },
  notEteaQuestions: {
    en: "They are not ETEA questions.",
    roman: "Ye ETEA ke questions nahi hain.",
    ur: "یہ ETEA کے سوالات نہیں ہیں۔",
  },
  newSet: { en: "New set (shuffle again)", roman: "Naya set (dobara shuffle)", ur: "نیا سیٹ (دوبارہ ملائیں)" },
  quizTitle: { en: "{subject} quiz — 20 questions", roman: "{subject} quiz — 20 questions", ur: "{subject} کوئز — 20 سوالات" },

  // ---- Mock list ----
  mockIntroA: {
    en: "Each mock states which pattern variant it follows. ZamungKor mocks are disjoint (no question repeats across them). Track mocks draw from the",
    ur: "ہر موک بتاتا ہے کہ وہ کس پیٹرن ورژن پر ہے۔ زمونگ کور موک الگ الگ ہیں (ان میں کوئی سوال دہرایا نہیں جاتا)۔ ٹریک موک",
  },
  mockIntroB: { en: "shared practice bank", roman: "shared practice bank", ur: "مشترکہ مشقی بینک" },
  mockIntroC: {
    en: "— questions may repeat across track mocks; this is stated on each mock because the 763-question bank cannot supply 8+ disjoint 100-question mocks.",
    ur: "سے بنتے ہیں — ٹریک موکوں میں سوالات دہرائے جا سکتے ہیں؛ یہ ہر موک پر لکھا ہے کیونکہ 763 سوالوں کا بینک 8 سے زیادہ الگ الگ 100 سوالوں والے موک نہیں دے سکتا۔",
  },
  mockIntroD: {
    en: "All mocks are practice mocks, not official ETEA papers.",
    roman: "Tamam mocks practice mocks hain, official ETEA papers nahi.",
    ur: "تمام موک مشقی موک ہیں، سرکاری ETEA پرچے نہیں۔",
  },
  mockProv1: {
    en: "Mocks are provisional practice built from unreviewed AI-generated questions.",
    roman: "Mocks ghair jaiza shuda AI-generated questions par mabni provisional practice hain.",
    ur: "موک غیر جائزہ شدہ اے آئی سے بنے سوالات پر مبنی عارضی مشق ہیں۔",
  },
  trustedModeLabel: { en: "Trusted mode", roman: "Trusted mode", ur: "قابل اعتماد موڈ" },
  mockProv2: {
    en: "uses reviewed questions only and returns fewer questions when not enough have been reviewed yet — it never fills the gap with unreviewed items.",
    ur: "صرف جائزہ شدہ سوالات استعمال کرتا ہے اور جب کافی جائزہ شدہ سوالات نہ ہوں تو کم سوالات دیتا ہے — خالی جگہ کبھی غیر جائزہ شدہ اشیاء سے نہیں بھرتا۔",
  },
  provisionalMode: { en: "Provisional (all questions)", roman: "Provisional (tamam questions)", ur: "عارضی (تمام سوالات)" },
  trustedMode: { en: "Trusted (reviewed only)", roman: "Trusted (sirf reviewed)", ur: "قابل اعتماد (صرف جائزہ شدہ)" },
  mockModeGroup: { en: "Mock mode", roman: "Mock mode", ur: "موک موڈ" },
  trustedAvailableRest: {
    en: "reviewed questions available in Trusted mode.",
    roman: "reviewed questions Trusted mode mein available hain.",
    ur: "جائزہ شدہ سوالات قابل اعتماد موڈ میں دستیاب ہیں۔",
  },
  noReviewedYet: {
    en: "No reviewed questions yet — provisional practice only.",
    roman: "Abhi koi reviewed questions nahi — sirf provisional practice.",
    ur: "ابھی کوئی جائزہ شدہ سوالات نہیں — صرف عارضی مشق۔",
  },
  mockOwnConfig: { en: " — this mock's own config.", roman: " — is mock ki apni config.", ur: " — اس موک کی اپنی ترتیب۔" },
  noPolicyNote: {
    en: " — ETEA has published no negative-marking policy for these projects.",
    ur: " — ان منصوبوں کے لیے ETEA نے منفی نمبروں کی کوئی پالیسی شائع نہیں کی۔",
  },
  scoringForRun: { en: "Scoring for this run: ", roman: "Is run ke liye scoring: ", ur: "اس کوشش کے لیے نمبر بندی: " },
  scoringForAria: { en: "Scoring for {title}", roman: "{title} ke liye scoring", ur: "{title} کے لیے نمبر بندی" },
  scoringDefaultOption: { en: "Mock default ({label})", roman: "Mock default ({label})", ur: "موک ڈیفالٹ ({label})" },
  scoringZeroOption: { en: "No penalty (policy unknown)", roman: "No penalty (policy unknown)", ur: "کوئی کٹوتی نہیں (پالیسی نامعلوم)" },
  scoringPenaltyOption: {
    en: "−0.25 per wrong answer (unverified assumption)",
    roman: "−0.25 per wrong answer (unverified assumption)",
    ur: "ہر غلط جواب پر 0.25 کٹوتی (غیر مصدقہ مفروضہ)",
  },
  startMock: { en: "Start mock", roman: "Mock shuru karein", ur: "موک شروع کریں" },
  startMockTrusted: { en: "Start mock (Trusted)", roman: "Mock shuru karein (Trusted)", ur: "موک شروع کریں (قابل اعتماد)" },

  // ---- Mock runner ----
  mockNotFound: { en: "Mock not found", roman: "Mock nahi mila", ur: "موک نہیں ملا" },
  backToMocks: { en: "Back to all mocks", roman: "Tamam mocks par wapas", ur: "تمام موکوں پر واپس" },
  trustedOnlyLabel: { en: "Trusted-only:", roman: "Trusted-only:", ur: "صرف قابل اعتماد:" },
  trustedNoteRest: {
    en: "questions — only owner-reviewed/approved items",
    roman: "questions — sirf owner-reviewed/approved items",
    ur: "سوالات — صرف مالک سے جائزہ شدہ/منظور شدہ اشیاء",
  },
  trustedNoteReviewed: { en: "{reviewed} reviewed", roman: "{reviewed} reviewed", ur: "{reviewed} جائزہ شدہ" },
  reviewedWord: { en: "reviewed", roman: "reviewed", ur: "جائزہ شدہ" },
  trustedNoteInMock: { en: "in this mock", roman: "is mock mein", ur: "اس موک میں" },
  trustedNoteShortfall: { en: "the shortfall is not filled.", roman: "kami poori nahi ki jati.", ur: "کمی پوری نہیں کی جاتی۔" },
  overrideSuffix: {
    en: " (you overrode the mock default on the mock list)",
    roman: " (aap ne mock list par mock default override kiya tha)",
    ur: " (آپ نے موک فہرست پر موک ڈیفالٹ تبدیل کیا تھا)",
  },

  // ---- Plan ----
  studyPlanHeading: { en: "Study Plan", roman: "Study Plan", ur: "مطالعہ منصوبہ" },
  daysWord: { en: "days", roman: "din", ur: "دن" },
  planAlertTitle: { en: "Sample timetable — adjust to your schedule.", roman: "Sample timetable — apne schedule ke mutabiq adjust karein.", ur: "نمونہ ٹائم ٹیبل — اپنے شیڈول کے مطابق بدلیں۔" },
  planAlertBody: {
    en: "No credible source prescribes 2–3 hours/day for ETEA. The base plan is 21 days, 2–3 hours/day, 63 tasks (~50 hours).",
    ur: "کوئی معتبر ماخذ ETEA کے لیے روزانہ 2–3 گھنٹے تجویز نہیں کرتا۔ بنیادی منصوبہ 21 دن، روزانہ 2–3 گھنٹے، 63 کام (~50 گھنٹے) ہے۔",
  },
  tasksDone: { en: "tasks done", roman: "tasks done", ur: "کام مکمل" },
  generateAiPlan: { en: "Generate AI plan", roman: "AI plan banayein", ur: "اے آئی منصوبہ بنائیں" },
  planPrivacy: {
    en: "Privacy: generating an AI plan sends your chosen length and weakest subjects to Gemini, Groq or OpenRouter (the AI providers). Don't share sensitive personal data.",
    ur: "رازداری: اے آئی منصوبہ بنانے سے آپ کی منتخب مدت اور کمزور ترین مضامین Gemini، Groq یا OpenRouter (اے آئی فراہم کنندگان) کو جاتے ہیں۔ حساس ذاتی ڈیٹا شیئر نہ کریں۔",
  },
  generatingPlan: { en: "Generating your plan…", roman: "Aap ka plan ban raha hai…", ur: "آپ کا منصوبہ بن رہا ہے…" },
  planError: { en: "Could not generate a plan right now.", roman: "Abhi plan nahi ban saka.", ur: "ابھی منصوبہ نہیں بن سکا۔" },
  aiPlanHeading: { en: "AI-generated plan ({weeks} weeks)", roman: "AI-generated plan ({weeks} haftay)", ur: "اے آئی سے بنایا گیا منصوبہ ({weeks} ہفتے)" },
  aiPlanNote: {
    en: "AI-generated — not verified. Sample timetable; adjust to your schedule.",
    roman: "AI-generated — not verified. Sample timetable; apne schedule ke mutabiq adjust karein.",
    ur: "اے آئی سے بنایا گیا — تصدیق نہیں ہوئی۔ نمونہ ٹائم ٹیبل؛ اپنے شیڈول کے مطابق بدلیں۔",
  },
  tasksDoneAria: { en: "{done} of {total} tasks done", roman: "{done} of {total} tasks done", ur: "{total} میں سے {done} کام مکمل" },

  // ---- Flashcards ----
  flashTitle: {
    en: "Flashcards — FSRS-7 (adaptive spaced repetition)",
    roman: "Flashcards — FSRS-7 (adaptive spaced repetition)",
    ur: "فلیش کارڈز — FSRS-7 (مطابقتی وقفہ تکرار)",
  },
  flashIntro: {
    en: "Answer before flipping the card (retrieval practice). Grade yourself: Again / Hard / Good / Easy. FSRS-7 adapts each card's interval from its stability and difficulty: new cards start with short same-day steps (about 1 and 10 minutes), and each grade button shows the exact interval that grade will set. Only cards due now (plus new cards) are in the session — future-due cards stay out unless you turn on cram mode.",
    ur: "کارڈ پلٹنے سے پہلے جواب دیں (حافظے سے یاد کرنے کی مشق)۔ خود کو درجہ دیں: دوبارہ / مشکل / اچھا / آسان۔ FSRS-7 ہر کارڈ کا وقفہ اس کے استحکام اور مشکل کے مطابق بناتا ہے: نئے کارڈ مختصر ہم روزہ مراحل (تقریباً 1 اور 10 منٹ) سے شروع ہوتے ہیں، اور ہر درجہ بٹن وہ درست وقفہ دکھاتا ہے جو وہ درجہ مقرر کرے گا۔ سیشن میں صرف ابھی واجب کارڈ (اور نئے کارڈ) ہوتے ہیں — مستقبل میں واجب کارڈ باہر رہتے ہیں جب تک آپ کرام موڈ فعال نہ کریں۔",
  },
  categoryLabel: { en: "Category", roman: "Category", ur: "زمرہ" },
  cramLabel: {
    en: "Cram mode (also show future-due cards)",
    roman: "Cram mode (future-due cards bhi dikhayein)",
    ur: "کرام موڈ (مستقبل میں واجب کارڈ بھی دکھائیں)",
  },
  sessionLabel: { en: "Session:", roman: "Session:", ur: "سیشن:" },
  recalledLabel: { en: "recalled", roman: "recalled", ur: "یاد کیے گئے" },
  sessionFinished: { en: "Session finished", roman: "Session mukammal", ur: "سیشن مکمل" },
  sessionFinishedBody: {
    en: "Recalled {fraction} cards. Cards still in learning were shown again this session; the rest return on their FSRS-scheduled day. Flashcard self-ratings are kept separate from quiz/mock accuracy on the Analysis page.",
    ur: "{fraction} کارڈ یاد کیے گئے۔ سیکھنے کے مرحلے میں موجود کارڈ اس سیشن میں دوبارہ دکھائے گئے؛ باقی اپنے FSRS مقررہ دن واپس آئیں گے۔ فلیش کارڈ کی خود درجہ بندی تجزیہ صفحے پر کوئز/موک درستگی سے الگ رکھی جاتی ہے۔",
  },
  reviewAgain: { en: "Review again", roman: "Dobara review karein", ur: "دوبارہ جائزہ لیں" },
  cardLabel: { en: "Card", roman: "Card", ur: "کارڈ" },
  // Stage 2 — FSRS card state line + migration notice. State names are
  // short chrome (roman included); the migration notice is a long
  // paragraph, so roman falls back to English per the fallback rule.
  stateNew: { en: "New", roman: "Naya", ur: "نیا" },
  stateLearning: { en: "Learning", roman: "Learning", ur: "سیکھنا" },
  stateReview: { en: "Review", roman: "Review", ur: "جائزہ" },
  stateRelearning: { en: "Relearning", roman: "Dobara seekhna", ur: "دوبارہ سیکھنا" },
  fsrsStateLine: {
    en: "FSRS: {state} · next review {due}",
    roman: "FSRS: {state} · agla review {due}",
    ur: "FSRS: {state} · اگلا جائزہ {due}",
  },
  flashGradedNextReview: {
    en: "Last card graded — next review {date} ({interval})",
    roman: "Pichla card grade ho gaya — agla review {date} ({interval})",
    ur: "پچھلا کارڈ درجہ بند ہو گیا — اگلا جائزہ {date} ({interval})",
  },
  flashMigratedNotice: {
    en: "Your flashcard schedule moved to FSRS-7 (adaptive spaced repetition). {migrated} card(s) kept their due dates (intervals restarted); {reset} card(s) had no usable schedule and started fresh. Your previous schedule was saved unchanged as a backup.",
    ur: "آپ کا فلیش کارڈ شیڈول FSRS-7 (مطابقتی وقفہ تکرار) پر منتقل ہو گیا۔ {migrated} کارڈ کی واجب تاریخیں برقرار رہیں (وقفے دوبارہ شروع ہوئے)؛ {reset} کارڈ کا کوئی قابل استعمال شیڈول نہیں تھا اور وہ نئے سرے سے شروع ہوئے۔ آپ کا پچھلا شیڈول بغیر تبدیلی کے بیک اپ کے طور پر محفوظ کر لیا گیا۔",
  },
  flashMigrationBackupFailed: {
    en: "The backup of your previous schedule could not be saved, so your previous schedule was left unchanged — the migration will retry on your next visit.",
    ur: "آپ کے پچھلے شیڈول کا بیک اپ محفوظ نہیں ہو سکا، اس لیے پچھلا شیڈول بغیر تبدیلی کے چھوڑ دیا گیا — اگلی بار منتقلی دوبارہ کوشش کرے گی۔",
  },
  cardsDueLabel: { en: "Cards due today", roman: "Cards due aaj", ur: "آج واجب کارڈز" },
  newCard: { en: "new card", roman: "naya card", ur: "نیا کارڈ" },
  flipCard: { en: "Flip card", roman: "Card paltein", ur: "کارڈ پلٹیں" },
  noCardsDue: { en: "No cards due today in this category.", roman: "Is category mein aaj koi card due nahi.", ur: "اس زمرے میں آج کوئی کارڈ واجب نہیں۔" },
  noCardsDueHint: {
    en: "Turn on cram mode to also review future-due cards, or pick another category.",
    roman: "Future-due cards bhi review karne ke liye cram mode on karein, ya doosri category chunein.",
    ur: "مستقبل میں واجب کارڈ بھی دیکھنے کے لیے کرام موڈ فعال کریں، یا دوسرا زمرہ چنیں۔",
  },

  // ---- Analysis ----
  mockWord: { en: "Mock", roman: "Mock", ur: "موک" },
  scoreWord: { en: "Score", roman: "Score", ur: "نمبر" },
  timeWord: { en: "Time", roman: "Time", ur: "وقت" },
  closeWord: { en: "Close", roman: "Band karein", ur: "بند کریں" },
  liveSuffix: { en: "— live", roman: "— live", ur: "— براہ راست" },
  storageWarningTitle: {
    en: "Saved-data problem — nothing was deleted.",
    roman: "Saved-data problem — kuch delete nahi hua.",
    ur: "محفوظ ڈیٹا کا مسئلہ — کچھ حذف نہیں ہوا۔",
  },
  quarantineBody: {
    en: "{n} stored value(s) could not be read (keys: {keys}). The raw text was quarantined verbatim — download it below to inspect or recover it by hand. The affected section shows its empty state until the stored value is repaired or replaced.",
    ur: "{n} محفوظ شدہ قیمت(یں) پڑھی نہیں جا سکیں (کلیدیں: {keys})۔ خام متن بعینہ قرنطینہ کر لیا گیا — ہاتھ سے جانچنے یا بحال کرنے کے لیے نیچے سے ڈاؤن لوڈ کریں۔ متاثرہ حصہ اس وقت تک خالی حالت دکھاتا ہے جب تک محفوظ شدہ قیمت درست یا تبدیل نہ ہو۔",
  },
  writeFailedA: { en: "A save failed", roman: "Aik save fail ho gaya", ur: "ایک محفوظ کاری ناکام ہوئی" },
  writeFailedB: {
    en: "Your progress may not have been stored — export it now from “Your data” below, then free up browser storage and try again.",
    ur: "آپ کی پیش رفت محفوظ نہیں ہوئی ہوگی — نیچے “آپ کا ڈیٹا” سے ابھی برآمد کریں، پھر براؤزر اسٹوریج خالی کریں اور دوبارہ کوشش کریں۔",
  },
  readFailedA: { en: "A stored value could not be read", roman: "Aik stored value parhi nahi ja saki", ur: "ایک محفوظ شدہ قیمت پڑھی نہیں جا سکی" },
  readFailedB: {
    en: "Check that this browser allows local storage for this site.",
    roman: "Check karein ke ye browser is site ke liye local storage allow karta hai.",
    ur: "چیک کریں کہ یہ براؤزر اس سائٹ کے لیے لوکل اسٹوریج کی اجازت دیتا ہے۔",
  },
  downloadQuarantine: { en: "Download quarantined data", roman: "Quarantined data download karein", ur: "قرنطینہ شدہ ڈیٹا ڈاؤن لوڈ کریں" },
  dismissQuarantine: {
    en: "Dismiss and clear quarantined data",
    roman: "Dismiss karein aur quarantined data clear karein",
    ur: "ختم کریں اور قرنطینہ شدہ ڈیٹا صاف کریں",
  },
  quarantineDownloadedMsg: {
    en: "Quarantined data downloaded as a JSON file (raw stored text, verbatim). Nothing was deleted.",
    ur: "قرنطینہ شدہ ڈیٹا JSON فائل کے طور پر ڈاؤن لوڈ ہو گیا (خام محفوظ شدہ متن، بعینہ)۔ کچھ حذف نہیں ہوا۔",
  },
  quarantineClearConfirm: {
    en: "Clear the quarantined data and dismiss this warning? Only do this after downloading a copy — the raw text will be removed.",
    ur: "قرنطینہ شدہ ڈیٹا صاف کریں اور یہ وارننگ ختم کریں؟ یہ صرف کاپی ڈاؤن لوڈ کرنے کے بعد کریں — خام متن ہٹ جائے گا۔",
  },
  quarantineClearedMsg: { en: "Quarantined data cleared by your choice.", roman: "Quarantined data aap ki choice se clear ho gaya.", ur: "قرنطینہ شدہ ڈیٹا آپ کی مرضی سے صاف ہو گیا۔" },
  mcqOnly: { en: "(MCQ only)", roman: "(MCQ only)", ur: "(صرف ایم سی کیو)" },
  mcqCorrectLabel: {
    en: "MCQ questions correct (first-pass)",
    roman: "MCQ questions correct (first-pass)",
    ur: "ایم سی کیو سوالات درست (پہلی کوشش)",
  },
  flashRecalledLabel: {
    en: "Flashcards recalled ({n} session(s) — self-rated, not in MCQ accuracy)",
    roman: "Flashcards recalled ({n} session(s) — self-rated, MCQ accuracy mein nahi)",
    ur: "فلیش کارڈز یاد کیے گئے ({n} سیشن — خود درجہ بندی، ایم سی کیو درستگی میں شامل نہیں)",
  },
  firstAnswerNote: {
    en: "Scores count your first answer to each question; corrected retries never change a score. Flashcard self-ratings are kept separate from MCQ accuracy.",
    ur: "نمبر ہر سوال کے آپ کے پہلے جواب پر ہوتے ہیں؛ درست شدہ دوبارہ کوششیں کبھی نمبر نہیں بدلتیں۔ فلیش کارڈ کی خود درجہ بندی ایم سی کیو درستگی سے الگ رکھی جاتی ہے۔",
  },
  perSubjectHeading: { en: "Per-subject accuracy", roman: "Per-subject accuracy", ur: "مضمون کے لحاظ سے درستگی" },
  noSubjectData: { en: "No subject data yet.", roman: "Abhi koi subject data nahi.", ur: "ابھی مضمون کا کوئی ڈیٹا نہیں۔" },
  weakHeatmap: { en: "Weak-area heatmap", roman: "Weak-area heatmap", ur: "کمزور حصوں کا نقشہ" },
  weakNeedData: {
    en: "Need at least 5 questions per subject before weak areas show.",
    roman: "Weak areas dikhane se pehle har subject mein kam az kam 5 questions chahiye.",
    ur: "کمزور حصے دکھانے سے پہلے ہر مضمون میں کم از کم 5 سوالات چاہیے۔",
  },
  weakOver: { en: "over {total} questions", roman: "{total} questions mein", ur: "{total} سوالات میں" },
  last14Heading: { en: "Last 14 days (MCQ questions per day)", roman: "Last 14 days (MCQ questions per day)", ur: "آخری 14 دن (روزانہ ایم سی کیو سوالات)" },
  noActivity: { en: "No activity yet.", roman: "Abhi koi activity nahi.", ur: "ابھی کوئی سرگرمی نہیں۔" },
  mockHistoryHeading: { en: "Mock history", roman: "Mock history", ur: "موک کی تاریخ" },
  noMocks: { en: "No mocks taken yet.", roman: "Abhi koi mock nahi diya.", ur: "ابھی کوئی موک نہیں دیا۔" },
  clickDetailTitle: { en: "Click to see the per-item table", roman: "Per-item table dekhne ke liye click karein", ur: "فی سوال جدول دیکھنے کے لیے کلک کریں" },
  allAttemptsHeading: { en: "All attempts (latest 20)", roman: "All attempts (latest 20)", ur: "تمام کوششیں (تازہ ترین 20)" },
  noAttemptsYet: { en: "No attempts yet.", roman: "Abhi koi attempt nahi.", ur: "ابھی کوئی کوشش نہیں۔" },
  retriesWord: { en: "Retries", roman: "Retries", ur: "دوبارہ کوششیں" },
  firstAnswerWord: { en: "First answer", roman: "Pehla jawab", ur: "پہلا جواب" },
  finalAnswerWord: { en: "Final answer", roman: "Aakhri jawab", ur: "آخری جواب" },
  answeredAtWord: { en: "Answered at", roman: "Jawab diya gaya", ur: "جواب دیا گیا" },
  responseTimeWord: { en: "Response time", roman: "Response time", ur: "جواب دینے کا وقت" },
  attemptDetailHeading: { en: "Attempt detail — {title} ({date})", roman: "Attempt detail — {title} ({date})", ur: "کوشش کی تفصیل — {title} ({date})" },
  flashSessionNote: {
    en: "Flashcard session (self-rated). No per-item MCQ table applies.",
    roman: "Flashcard session (self-rated). Koi per-item MCQ table nahi banti.",
    ur: "فلیش کارڈ سیشن (خود درجہ بندی)۔ فی سوال ایم سی کیو جدول لاگو نہیں ہوتا۔",
  },
  firstPassScore: { en: "First-pass score", roman: "First-pass score", ur: "پہلی کوشش کا نمبر" },
  retriesCounted: {
    en: "{n} corrected retr{plural} (not counted in the score)",
    roman: "{n} corrected retr{plural} (score mein nahi gina gaya)",
    ur: "{n} درست شدہ دوبارہ کوششیں (نمبر میں شامل نہیں)",
  },
  noRetries: { en: "no corrected retries", roman: "koi corrected retry nahi", ur: "کوئی درست شدہ دوبارہ کوشش نہیں" },
  noItemData: {
    en: "No per-item data recorded for this attempt — it was recorded before item-level tracking existed.",
    ur: "اس کوشش کے لیے فی سوال ڈیٹا ریکارڈ نہیں ہوا — یہ فی سوال ٹریکنگ آنے سے پہلے ریکارڈ ہوئی تھی۔",
  },
  yourDataHeading: { en: "Your data", roman: "Aap ka data", ur: "آپ کا ڈیٹا" },
  yourDataBody: {
    en: "Progress lives in this browser only (localStorage). Export it regularly so a cleared browser never loses your history. A full backup covers attempts, plan, flashcards, issues, preferences (language/theme) and in-progress sessions — and never contains API keys (there are none client-side). Import merges into what is already stored (attempts deduplicated by id; a live in-progress session is never overwritten by an import). If a stored value ever fails to parse, its raw text is quarantined — never deleted — and a warning appears at the top of this page with a download option.",
    ur: "پیش رفت صرف اس براؤزر میں رہتی ہے (localStorage)۔ اسے باقاعدگی سے برآمد کریں تاکہ براؤزر صاف ہونے پر آپ کی تاریخ کبھی ضائع نہ ہو۔ مکمل بیک اپ میں کوششیں، منصوبہ، فلیش کارڈز، مسائل، ترجیحات (زبان/تھیم) اور جاری سیشن شامل ہوتے ہیں — اور اس میں کبھی API کیز نہیں ہوتیں (کلائنٹ پر کوئی نہیں ہیں)۔ درآمد پہلے سے محفوظ ڈیٹا میں ضم ہو جاتی ہے (کوششیں نمبر سے دہرائی نہیں جاتیں؛ جاری سیشن درآمد سے کبھی اوور رائٹ نہیں ہوتا)۔ اگر کوئی محفوظ شدہ قیمت کبھی پڑھی نہ جا سکے تو اس کا خام متن قرنطینہ کر لیا جاتا ہے — کبھی حذف نہیں ہوتا — اور اس صفحے کے اوپر ڈاؤن لوڈ کے آپشن کے ساتھ وارننگ آ جاتی ہے۔",
  },
  deleteAttempts: { en: "Delete all attempts", roman: "Tamam attempts delete karein", ur: "تمام کوششیں حذف کریں" },
  deleteAttemptsConfirm: {
    en: "Delete all recorded attempts? This cannot be undone (export first if you want a copy).",
    ur: "تمام ریکارڈ شدہ کوششیں حذف کریں؟ یہ واپس نہیں ہو سکتا (اگر کاپی چاہیے تو پہلے برآمد کریں)۔",
  },
  attemptsDeletedMsg: { en: "All attempts deleted.", roman: "Tamam attempts delete ho gayein.", ur: "تمام کوششیں حذف ہو گئیں۔" },
  exportMsg: {
    en: "Progress exported as a JSON file (attempts, plan, flashcards, issues, preferences, in-progress sessions).",
    ur: "پیش رفت JSON فائل کے طور پر برآمد ہو گئی (کوششیں، منصوبہ، فلیش کارڈز، مسائل، ترجیحات، جاری سیشن)۔",
  },
  importMsg: {
    en: "Imported {a} new attempt(s), {i} issue(s), {s} session(s); merged {p} plan key(s), {f} flashcard(s)",
    ur: "{a} نئی کوشش(یں)، {i} مسئلہ/مسائل، {s} سیشن درآمد ہوئے؛ {p} منصوبہ کلید(یں)، {f} فلیش کارڈ ضم ہوئے",
  },
  importPrefs: { en: "; preferences applied", roman: "; preferences apply ho gayein", ur: "؛ ترجیحات لاگو ہو گئیں" },
  importSkipped: { en: "; skipped {n} invalid record(s)", roman: "; {n} invalid record(s) skip ho gaye", ur: "؛ {n} غلط ریکارڈ چھوڑ دیے گئے" },
  importFailed: { en: "Import failed.", roman: "Import fail ho gaya.", ur: "درآمد ناکام ہوئی۔" },
  importSimple: { en: "Imported {n} new attempts.", roman: "{n} naye attempts import ho gaye.", ur: "{n} نئی کوششیں درآمد ہوئیں۔" },

  // ---- Review ----
  reviewTitle: {
    en: "Local owner-review workspace — this device only",
    roman: "Local owner-review workspace — sirf is device par",
    ur: "مقامی مالک جائزہ ورک اسپیس — صرف اس ڈیوائس پر",
  },
  reviewAlertTitle: { en: "You are the verifier.", roman: "Aap verifier hain.", ur: "آپ تصدیق کنندہ ہیں۔" },
  reviewAlertBody1: {
    en: "Religious content (Islamiyat, Tajweed, Arabic, Fiqh) is verified by you, the owner — never by the AI. Items that pass the structural check stay",
    ur: "مذہبی مواد (اسلامیات، تجوید، عربی، فقہ) کی تصدیق آپ، یعنی مالک، کرتے ہیں — اے آئی کبھی نہیں کرتا۔ ساختی جانچ پاس کرنے والی اشیاء یہاں آپ کی تصدیق تک",
  },
  draftWord: { en: "draft", roman: "draft", ur: "مسودہ" },
  reviewAlertBody2: {
    en: "until you verify them here. Verified items feed Trusted Mode; everything else stays provisional.",
    ur: "رہتی ہیں۔ تصدیق شدہ اشیاء قابل اعتماد موڈ میں جاتی ہیں؛ باقی سب عارضی رہتا ہے۔",
  },
  zamProgressLabel: { en: "ZamungKor Mock 1 + 2 progress:", roman: "ZamungKor Mock 1 + 2 progress:", ur: "زمونگ کور موک 1 + 2 کی پیش رفت:" },
  verifiedWord: { en: "verified", roman: "verified", ur: "تصدیق شدہ" },
  zamProgressNone: {
    en: "Trusted Mode has no verified items yet, so it returns 0 questions. Verify items below to unlock it.",
    roman: "Trusted Mode mein abhi koi verified items nahi, is liye wo 0 questions deta hai. Unlock karne ke liye neeche items verify karein.",
    ur: "قابل اعتماد موڈ میں ابھی کوئی تصدیق شدہ اشیاء نہیں، اس لیے وہ 0 سوالات دیتا ہے۔ ان لاک کرنے کے لیے نیچے اشیاء کی تصدیق کریں۔",
  },
  zamProgressSome: {
    en: "these items are available in Trusted Mode.",
    roman: "ye items Trusted Mode mein available hain.",
    ur: "یہ اشیاء قابل اعتماد موڈ میں دستیاب ہیں۔",
  },
  countsLine: {
    en: "Current filter: {total} items — {draft} draft · {needs} needs review · {disputed} disputed · {verified} verified. Structural check: {pass} pass · {sneeds} needs review · {prob} problem.",
    ur: "موجودہ فلٹر: {total} اشیاء — {draft} مسودہ · {needs} جائزہ درکار · {disputed} متنازع · {verified} تصدیق شدہ۔ ساختی جانچ: {pass} پاس · {sneeds} جائزہ درکار · {prob} مسئلہ۔",
  },
  mockFilterLabel: { en: "Mock", roman: "Mock", ur: "موک" },
  postFilterLabel: { en: "Post", roman: "Post", ur: "عہدہ" },
  statusFilterLabel: { en: "Status", roman: "Status", ur: "حالت" },
  structuralFilterLabel: { en: "Structural", roman: "Structural", ur: "ساختی" },
  mockFilterZam12: {
    en: "ZamungKor Mock 1 + 2 (200) — TT + Qari first",
    roman: "ZamungKor Mock 1 + 2 (200) — TT + Qari pehle",
    ur: "زمونگ کور موک 1 + 2 (200) — ٹی ٹی + قاری پہلے",
  },
  mockFilterZam1: { en: "ZamungKor Mock 1 (100)", roman: "ZamungKor Mock 1 (100)", ur: "زمونگ کور موک 1 (100)" },
  mockFilterZam2: { en: "ZamungKor Mock 2 (100)", roman: "ZamungKor Mock 2 (100)", ur: "زمونگ کور موک 2 (100)" },
  mockFilterZam3: { en: "ZamungKor Mock 3 (100)", roman: "ZamungKor Mock 3 (100)", ur: "زمونگ کور موک 3 (100)" },
  mockFilterTTB: { en: "TT Mock — Version B (pool)", roman: "TT Mock — Version B (pool)", ur: "ٹی ٹی موک — ورژن B (پول)" },
  mockFilterQariB: { en: "Qari Mock — Version B (pool)", roman: "Qari Mock — Version B (pool)", ur: "قاری موک — ورژن B (پول)" },
  mockFilterATB: { en: "AT Mock — Version B (pool)", roman: "AT Mock — Version B (pool)", ur: "اے ٹی موک — ورژن B (پول)" },
  mockFilterAll: { en: "All draft items (whole bank)", roman: "All draft items (poora bank)", ur: "تمام مسودہ اشیاء (پورا بینک)" },
  allStatuses: { en: "All statuses", roman: "All statuses", ur: "تمام حالتیں" },
  statusDraft: { en: "Draft", roman: "Draft", ur: "مسودہ" },
  statusNeedsReview: { en: "Needs review", roman: "Needs review", ur: "جائزہ درکار" },
  statusDisputed: { en: "Disputed", roman: "Disputed", ur: "متنازع" },
  statusOwnerReviewed: { en: "Owner-reviewed", roman: "Owner-reviewed", ur: "مالک سے جائزہ شدہ" },
  statusApproved: { en: "Approved", roman: "Approved", ur: "منظور شدہ" },
  structuralPass: { en: "pass", roman: "pass", ur: "پاس" },
  structuralNeedsReview: { en: "needs-review", roman: "needs-review", ur: "جائزہ درکار" },
  structuralProblem: { en: "problem", roman: "problem", ur: "مسئلہ" },
  allPosts: { en: "All posts", roman: "All posts", ur: "تمام عہدے" },
  postTTFirst: { en: "TT (Theology Teacher) first", roman: "TT (Theology Teacher) pehle", ur: "ٹی ٹی (تھیالوجی ٹیچر) پہلے" },
  postQariFirst: { en: "Qari / Imam Masjid first", roman: "Qari / Imam Masjid pehle", ur: "قاری / امام مسجد پہلے" },
  showingRest: { en: "items in this filter.", roman: "items is filter mein.", ur: "اشیاء اس فلٹر میں۔" },
  showingWord: { en: "Showing", roman: "Showing", ur: "دکھا رہے ہیں" },
  noItemsMatch: { en: "No items match this filter.", roman: "Is filter par koi item nahi mila.", ur: "اس فلٹر پر کوئی شے نہیں ملی۔" },
  verifyAction: { en: "Verify", roman: "Verify karein", ur: "تصدیق کریں" },
  approveAction: { en: "Approve", roman: "Approve karein", ur: "منظور کریں" },
  needsReviewAction: { en: "Needs review", roman: "Needs review", ur: "جائزہ درکار" },
  disputedAction: { en: "Disputed", roman: "Disputed", ur: "متنازع" },
  resetDraftAction: { en: "Reset to draft", roman: "Draft par wapas le jayein", ur: "مسودے پر واپس لے جائیں" },
  showMore: { en: "Show 25 more", roman: "25 aur dikhayein", ur: "25 اور دکھائیں" },
  leftCount: { en: "({left} left)", roman: "({left} baqi)", ur: "({left} باقی)" },

  // ---- Issues ----
  issuesTitle: { en: "Issues — private correction inbox", roman: "Issues — private correction inbox", ur: "مسائل — نجی تصحیح ان باکس" },
  issuesIntro: {
    en: "Reports saved privately on this device only — nothing was sent anywhere. Review them here, fix the bank, then delete the resolved ones. Legacy reports (from before the reason / correction fields existed) show “—” for the missing fields.",
    ur: "رپورٹیں صرف اس ڈیوائس پر نجی طور پر محفوظ ہیں — کہیں نہیں بھیجی گئیں۔ یہاں ان کا جائزہ لیں، بینک درست کریں، پھر حل شدہ حذف کر دیں۔ پرانی رپورٹیں (وجہ / تصحیح والے خانوں سے پہلے کی) غائب خانوں کے لیے “—” دکھاتی ہیں۔",
  },
  filterReasonAria: { en: "Filter by reason", roman: "Reason se filter karein", ur: "وجہ سے فلٹر کریں" },
  allReasons: { en: "All reasons ({n})", roman: "All reasons ({n})", ur: "تمام وجوہات ({n})" },
  issueReasonWrongAnswer: { en: "Wrong answer", roman: "Ghalat jawab", ur: "غلط جواب" },
  issueReasonWrongExplanation: { en: "Wrong explanation", roman: "Ghalat wazahat", ur: "غلط وضاحت" },
  issueReasonTypo: { en: "Typo", roman: "Typo", ur: "ٹائپو" },
  issueReasonOutdated: { en: "Outdated", roman: "Outdated", ur: "پرانا" },
  issueReasonOther: { en: "Other", roman: "Other", ur: "دیگر" },
  noReason: { en: "No reason given", roman: "Koi reason nahi diya", ur: "کوئی وجہ نہیں دی گئی" },
  filterPlaceholder: {
    en: "Filter by subject or question id",
    roman: "Subject ya question id se filter karein",
    ur: "مضمون یا سوال کے نمبر سے فلٹر کریں",
  },
  exportJsonLabel: { en: "Export JSON", roman: "JSON export karein", ur: "JSON برآمد کریں" },
  exportCsvLabel: { en: "Export CSV", roman: "CSV export karein", ur: "CSV برآمد کریں" },
  deleteAll: { en: "Delete all", roman: "Tamam delete karein", ur: "تمام حذف کریں" },
  deleteAllConfirm: {
    en: "Delete all {n} issue report(s)? This cannot be undone (export first if you want a copy).",
    ur: "تمام {n} مسئلہ رپورٹ(یں) حذف کریں؟ یہ واپس نہیں ہو سکتا (اگر کاپی چاہیے تو پہلے برآمد کریں)۔",
  },
  allDeletedMsg: { en: "All issue reports deleted.", roman: "Tamam issue reports delete ho gayein.", ur: "تمام مسئلہ رپورٹیں حذف ہو گئیں۔" },
  exportedJsonMsg: { en: "Exported {n} report(s) as JSON.", roman: "{n} report(s) JSON mein export ho gayein.", ur: "{n} رپورٹ(یں) JSON میں برآمد ہوئیں۔" },
  exportedCsvMsg: { en: "Exported {n} report(s) as CSV.", roman: "{n} report(s) CSV mein export ho gayein.", ur: "{n} رپورٹ(یں) CSV میں برآمد ہوئیں۔" },
  noReports: { en: "No issue reports yet.", roman: "Abhi koi issue report nahi.", ur: "ابھی کوئی مسئلہ رپورٹ نہیں۔" },
  noReportsMatch: { en: "No reports match this filter.", roman: "Is filter par koi report nahi mili.", ur: "اس فلٹر پر کوئی رپورٹ نہیں ملی۔" },
  proposedCorrectionWord: { en: "Proposed correction", roman: "Proposed correction", ur: "تجویز شدہ تصحیح" },
  deleteWord: { en: "Delete", roman: "Delete karein", ur: "حذف کریں" },
  deleteConfirm: { en: "Delete this report ({qid})?", roman: "Is report ({qid}) ko delete karein?", ur: "اس رپورٹ ({qid}) کو حذف کریں؟" },
  telemetryHeading: { en: "Client errors (this device only)", roman: "Client errors (sirf is device par)", ur: "کلائنٹ خرابیاں (صرف اس ڈیوائس پر)" },
  telemetryIntro: {
    en: "Browser errors and hydration failures recorded on this device, newest first (kept: latest 50). Nothing here was sent anywhere. An empty list means no client error has been recorded since the list was last cleared.",
    ur: "براؤزر خرابیاں اور ہائیڈریشن ناکامیاں اس ڈیوائس پر ریکارڈ ہیں، نئی پہلے (رکھی جاتی ہیں: تازہ ترین 50)۔ یہاں سے کچھ کہیں نہیں بھیجا گیا۔ خالی فہرست کا مطلب ہے کہ فہرست صاف ہونے کے بعد سے کوئی کلائنٹ خرابی ریکارڈ نہیں ہوئی۔",
  },
  clearTelemetry: { en: "Clear client errors", roman: "Client errors clear karein", ur: "کلائنٹ خرابیاں صاف کریں" },
  clearTelemetryConfirm: {
    en: "Delete all {n} recorded client error(s)? This cannot be undone.",
    ur: "تمام {n} ریکارڈ شدہ کلائنٹ خرابی(اں) حذف کریں؟ یہ واپس نہیں ہو سکتا۔",
  },
  telemetryClearedMsg: { en: "Client-error telemetry cleared.", roman: "Client-error telemetry clear ho gayi.", ur: "کلائنٹ خرابی ٹیلی میٹری صاف ہو گئی۔" },
  noTelemetry: { en: "No client errors recorded.", roman: "Koi client error record nahi hua.", ur: "کوئی کلائنٹ خرابی ریکارڈ نہیں ہوئی۔" },
  timeUtcWord: { en: "Time (UTC)", roman: "Time (UTC)", ur: "وقت (UTC)" },
  routeWord: { en: "Route", roman: "Route", ur: "راستہ" },

  // ---- Vacancies ----
  vacTitle: { en: "Vacancy Tracker", roman: "Vacancy Tracker", ur: "خالی آسامیوں کی فہرست" },
  vacAlertA: { en: "Manually curated — check", roman: "Manually curated — check karein", ur: "دستی طور پر مرتب — تازہ ترین کے لیے" },
  vacAlertB: { en: "for the latest.", roman: "for the latest.", ur: "دیکھیں۔" },
  vacAlertC: {
    en: "No next ESED date is published here — the “Dec 2026/Jan 2027” claim is an unverified Facebook rumour.",
    ur: "اگلی ESED تاریخ یہاں شائع نہیں کی جاتی — “دسمبر 2026/جنوری 2027” کا دعویٰ غیر مصدقہ فیس بک افواہ ہے۔",
  },
  postWord: { en: "Post", roman: "Post", ur: "عہدہ" },
  vacanciesWord: { en: "Vacancies", roman: "Vacancies", ur: "آسامیاں" },
  lastDateWord: { en: "Last date", roman: "Last date", ur: "آخری تاریخ" },
  eligibilityWord: { en: "Eligibility", roman: "Eligibility", ur: "اہلیت" },
  vacTableAria: { en: "Vacancy table", roman: "Vacancy table", ur: "آسامیوں کی جدول" },

  // ---- Step 3a — teaching-only scope + coverage ledger ----
  teachingOnlyNote: {
    en: "Teaching posts only: non-teaching tracks, mocks and vacancy rows are hidden in this personal teaching-prep build. Their data is retained in the files and can be shown again.",
    ur: "صرف تدریسی عہدے: اس ذاتی تدریسی تیاری کے نسخے میں غیر تدریسی ٹریکس، موک اور آسامیوں کی قطاریں چھپائی گئی ہیں۔ ان کا ڈیٹا فائلوں میں محفوظ ہے اور دوبارہ دکھایا جا سکتا ہے۔",
  },
  tracksLedgerLink: {
    en: "See the vacancy coverage ledger",
    roman: "Vacancy coverage ledger dekhein",
    ur: "آسامیوں کے احاطے کی فہرست دیکھیں",
  },
  ledgerHeading: {
    en: "Vacancy Coverage Ledger",
    roman: "Vacancy Coverage Ledger",
    ur: "آسامیوں کے احاطے کی فہرست",
  },
  ledgerIntro: {
    en: "One row per teaching post. “Exact” means every blueprint subject has at least one note and one practice question — it is not a claim of depth or sufficiency; the per-subject counts show how thin or deep the material is. Sources were last verified on 11 Nov 2026; always re-check your own advertisement and roll-number slip.",
    ur: "ہر تدریسی عہدے کے لیے ایک قطار۔ “Exact” کا مطلب ہے کہ ہر نصابی مضمون کے لیے کم از کم ایک نوٹ اور ایک مشقی سوال موجود ہے — یہ گہرائی یا کفایت کا دعویٰ نہیں؛ ہر مضمون کی گنتی بتاتی ہے کہ مواد کتنا کم یا زیادہ ہے۔ ماخذ کی آخری تصدیق 11 نومبر 2026 کو ہوئی؛ ہمیشہ اپنا اشتہار اور رول نمبر سلپ دوبارہ دیکھیں۔",
  },
  ledgerSourceLabel: { en: "Official source", roman: "Official source", ur: "سرکاری ماخذ" },
  ledgerLastVerified: { en: "Last verified", roman: "Last verified", ur: "آخری تصدیق" },
  ledgerTotalLabel: { en: "Total", roman: "Total", ur: "کل" },
  ledgerTimeLabel: { en: "Time", roman: "Time", ur: "وقت" },
  ledgerLanguageLabel: { en: "Language", roman: "Language", ur: "زبان" },
  ledgerNegativeLabel: { en: "Negative marking", roman: "Negative marking", ur: "منفی نمبر" },
  ledgerAvailableLabel: {
    en: "Available material per subject",
    roman: "Available material per subject",
    ur: "ہر مضمون کے لیے دستیاب مواد",
  },
  ledgerSubjectCounts: {
    en: "{notes} notes · {mcqs} MCQs · {cards} cards",
    ur: "{notes} نوٹس · {mcqs} ایم سی کیوز · {cards} کارڈز",
  },
  ledgerMocksLabel: { en: "Mocks", roman: "Mocks", ur: "موک" },
  ledgerSharedMock: { en: "shared", roman: "shared", ur: "مشترکہ" },
  ledgerNoMock: { en: "No mock yet", roman: "Abhi koi mock nahi", ur: "ابھی کوئی موک نہیں" },
  ledgerBankReview: {
    en: "Owner-reviewed in bank: {n} of {total} MCQs (bank data — your on-device decisions may add more).",
    ur: "بینک میں مالک سے جائزہ شدہ: {total} ایم سی کیوز میں سے {n} (بینک کا ڈیٹا — آپ کے آلے کے فیصلے مزید شامل کر سکتے ہیں)۔",
  },
  ledgerMissingLabel: { en: "Missing", roman: "Missing", ur: "کمی" },
  ledgerNextLabel: { en: "Next action", roman: "Next action", ur: "اگلا اقدام" },
  ledgerViewTrack: { en: "View track", roman: "Track dekhein", ur: "ٹریک دیکھیں" },
  ledgerCoverageExact: { en: "Exact", roman: "Exact", ur: "عین مطابق" },
  ledgerCoverageExactDetail: {
    en: "Every blueprint subject has at least one note and one practice question, and a mock exists. Not a claim of depth.",
    ur: "ہر نصابی مضمون کے لیے کم از کم ایک نوٹ اور ایک مشقی سوال موجود ہے، اور موک بھی ہے۔ گہرائی کا دعویٰ نہیں۔",
  },
  ledgerCoverageProxy: { en: "Proxy", roman: "Proxy", ur: "متبادل" },
  ledgerCoverageProxyDetail: {
    en: "No official pattern — preparing on another post's pattern.",
    ur: "کوئی سرکاری پیٹرن نہیں — دوسرے عہدے کے پیٹرن پر تیاری۔",
  },
  ledgerCoveragePartial: { en: "Partial", roman: "Partial", ur: "جزوی" },
  ledgerCoveragePartialDetail: {
    en: "Pattern confirmed or provisional, but some subject has no material, or no mock exists.",
    ur: "پیٹرن مصدقہ یا عارضی ہے، لیکن کسی مضمون کا مواد نہیں یا موک نہیں۔",
  },
  ledgerCoverageUnknown: { en: "Unknown", roman: "Unknown", ur: "نامعلوم" },
  ledgerCoverageUnknownDetail: {
    en: "No verified pattern source.",
    ur: "پیٹرن کا کوئی مصدقہ ماخذ نہیں۔",
  },
  ledgerSourceConfirmed: { en: "Source Confirmed", roman: "Source Confirmed", ur: "ماخذ مصدقہ" },
  ledgerSourceConfirmedDetail: {
    en: "Pattern confirmed against a named official source.",
    ur: "پیٹرن کی تصدیق نام والے سرکاری ماخذ سے ہوئی۔",
  },
  ledgerSourceProvisional: { en: "Provisional", roman: "Provisional", ur: "عارضی" },
  ledgerSourceProvisionalDetail: {
    en: "Pattern breakdown provisional — verify against the official document.",
    ur: "پیٹرن کی تفصیل عارضی ہے — سرکاری دستاویز سے تصدیق کریں۔",
  },
  ledgerSourceUnavailable: {
    en: "Official scope unavailable",
    roman: "Official scope unavailable",
    ur: "سرکاری دائرہ دستیاب نہیں",
  },
  ledgerSourceUnavailableDetail: {
    en: "No published syllabus or pattern for this post.",
    ur: "اس عہدے کے لیے کوئی شائع شدہ نصاب یا پیٹرن نہیں۔",
  },

  // ---- Tracks ----
  mocksCount: { en: "{n} mock(s)", roman: "{n} mock(s)", ur: "{n} موک" },
  trackNotFound: { en: "Track not found", roman: "Track nahi mila", ur: "ٹریک نہیں ملا" },
  backToTracks: { en: "Back to all tracks", roman: "Tamam tracks par wapas", ur: "تمام ٹریکس پر واپس" },
  eligibilityHeading: { en: "Eligibility", roman: "Eligibility", ur: "اہلیت" },
  patternHeading: { en: "Pattern", roman: "Pattern", ur: "پیٹرن" },
  mocksForTrack: { en: "Mocks for this track", roman: "Is track ke mocks", ur: "اس ٹریک کے موک" },
  noMockYet: {
    en: "No mock yet — subject bank not built. Use the Library + Practice sections for the subjects in this pattern.",
    roman: "Abhi koi mock nahi — subject bank nahi bana. Is pattern ke subjects ke liye Library + Practice sections use karein.",
    ur: "ابھی کوئی موک نہیں — مضمون کا بینک نہیں بنا۔ اس پیٹرن کے مضامین کے لیے لائبریری + مشق کے حصے استعمال کریں۔",
  },
  allTracksLink: { en: "← All tracks", roman: "← All tracks", ur: "تمام ٹریکس →" },

  // ---- Topics ----
  topicsTitle: { en: "Practice from Past-Paper Topics", roman: "Practice from Past-Paper Topics", ur: "پاسٹ پیپر موضوعات سے مشق" },
  topicsAlertBold: {
    en: "No past-paper documents or PDFs are hosted here, and no past-paper question is copied verbatim.",
    ur: "یہاں پاسٹ پیپر کی کوئی دستاویز یا PDF میزبانی نہیں کی جاتی، اور پاسٹ پیپر کا کوئی سوال بعینہ نقل نہیں کیا گیا۔",
  },
  topicsAlertRest: {
    en: "Past papers were used only as a source for what topics and facts are tested. Every question below is written in our own words.",
    ur: "پاسٹ پیپر صرف اس کے لیے استعمال ہوئے کہ کن موضوعات اور حقائق کا امتحان ہوتا ہے۔ نیچے ہر سوال ہمارے اپنے الفاظ میں لکھا گیا ہے۔",
  },
  topicsLi1: {
    en: "Original practice questions are labelled: “Original practice question based on past-paper topics — not the actual paper”.",
    ur: "اصل مشقی سوالات پر لیبل ہے: “Original practice question based on past-paper topics — not the actual paper”۔",
  },
  topicsLi2: {
    en: "Reworded versions are labelled: “Same concept as a past-paper question, reworded in a different style — not the actual paper”.",
    ur: "دوبارہ لکھے گئے ورژن پر لیبل ہے: “Same concept as a past-paper question, reworded in a different style — not the actual paper”۔",
  },
  topicsOrigHeading: { en: "Original practice — {n} questions", roman: "Original practice — {n} questions", ur: "اصل مشق — {n} سوالات" },
  topicsRewordHeading: { en: "Same concepts, reworded — {n} questions", roman: "Same concepts, reworded — {n} questions", ur: "وہی تصورات، دوبارہ لکھے گئے — {n} سوالات" },
  topicsOrigTitle: {
    en: "Past-paper topics — original practice (20 questions)",
    roman: "Past-paper topics — original practice (20 questions)",
    ur: "پاسٹ پیپر موضوعات — اصل مشق (20 سوالات)",
  },
  topicsRewordTitle: {
    en: "Past-paper topics — same concepts, reworded (20 questions)",
    roman: "Past-paper topics — same concepts, reworded (20 questions)",
    ur: "پاسٹ پیپر موضوعات — وہی تصورات، دوبارہ لکھے گئے (20 سوالات)",
  },

  // ---- Links ----
  linksIntro: {
    en: "Link out only — no textbook or past-paper PDFs are hosted on this site. ETEA has published no model-MCQ book and collaborates with no prep institution.",
    ur: "صرف لنک — اس سائٹ پر نصابی کتاب یا پاسٹ پیپر کی کوئی PDF میزبانی نہیں کی جاتی۔ ETEA نے کوئی ماڈل ایم سی کیو کتاب شائع نہیں کی اور کسی تیاری کے ادارے سے تعاون نہیں کرتا۔",
  },

  // ---- QuizRunner ----
  reportIssue: { en: "Report an issue", roman: "Issue report karein", ur: "مسئلہ رپورٹ کریں" },
  issueSaved: {
    en: "Saved privately on this device only — nothing was sent. See the Issues page to review or export it.",
    roman: "Sirf is device par privately save ho gaya — kuch bheja nahi gaya. Review ya export ke liye Issues page dekhein.",
    ur: "صرف اس ڈیوائس پر نجی طور پر محفوظ ہو گیا — کچھ بھیجا نہیں گیا۔ جائزہ یا برآمد کے لیے مسائل کا صفحہ دیکھیں۔",
  },
  issuePrivateNote: {
    en: "Saved privately on this device only — nothing is sent anywhere.",
    roman: "Sirf is device par privately save hota hai — kahin nahi bheja jata.",
    ur: "صرف اس ڈیوائس پر نجی طور پر محفوظ ہوتا ہے — کہیں نہیں بھیجا جاتا۔",
  },
  reasonWord: { en: "Reason", roman: "Reason", ur: "وجہ" },
  chooseReason: { en: "Choose a reason…", roman: "Aik reason chunein…", ur: "ایک وجہ چنیں…" },
  correctionWord: { en: "Proposed correction", roman: "Proposed correction", ur: "تجویز شدہ تصحیح" },
  correctionPlaceholder: {
    en: "What should it say instead?",
    roman: "Is ki jagah kya likha hona chahiye?",
    ur: "اس کی جگہ کیا لکھا ہونا چاہیے؟",
  },
  sourceOptional: { en: "Source (optional)", roman: "Source (optional)", ur: "ماخذ (اختیاری)" },
  sourcePlaceholder: { en: "e.g. ETEA advert, textbook page", roman: "masalan ETEA advert, textbook page", ur: "مثلاً ETEA اشتہار، نصابی کتاب کا صفحہ" },
  savePrivately: { en: "Save privately", roman: "Privately save karein", ur: "نجی طور پر محفوظ کریں" },
  noQuestions: { en: "No questions available for this set.", roman: "Is set ke liye koi questions nahi hain.", ur: "اس سیٹ کے لیے کوئی سوالات نہیں ہیں۔" },
  provisionalBadge: { en: "Provisional — not verified", roman: "Provisional — not verified", ur: "عارضی — تصدیق نہیں ہوئی" },
  verifiedBadge: { en: "Verified items — owner-reviewed", roman: "Verified items — owner-reviewed", ur: "تصدیق شدہ اشیاء — مالک سے جائزہ شدہ" },
  trustedOnlyNote: {
    en: "Trusted-only (owner-reviewed/approved questions)",
    roman: "Trusted-only (owner-reviewed/approved questions)",
    ur: "صرف قابل اعتماد (مالک سے جائزہ شدہ/منظور شدہ سوالات)",
  },
  rawVsExam: { en: "Raw accuracy vs exam score", roman: "Raw accuracy vs exam score", ur: "خام درستگی بمقابلہ امتحانی نمبر" },
  rawAccuracyWord: { en: "Raw accuracy:", roman: "Raw accuracy:", ur: "خام درستگی:" },
  rawAccuracyNote: { en: "correct answers only, no penalty.", roman: "sirf sahi jawab, koi penalty nahi.", ur: "صرف درست جوابات، کوئی کٹوتی نہیں۔" },
  examScoreWord: { en: "Exam score:", roman: "Exam score:", ur: "امتحانی نمبر:" },
  flooredNote: {
    en: " (floored at 0 — the raw score was negative)",
    roman: " (0 par floor — raw score negative tha)",
    ur: " (0 پر محدود — خام نمبر منفی تھا)",
  },
  qrFirstAnswerNote: {
    en: "Score counts your first answer to each question. Changing an answer afterwards is a retry: it is recorded for learning, but it does not change the score.",
    ur: "نمبر ہر سوال کے آپ کے پہلے جواب پر ہوتا ہے۔ بعد میں جواب بدلنا دوبارہ کوشش ہے: یہ سیکھنے کے لیے ریکارڈ ہوتی ہے، لیکن نمبر نہیں بدلتی۔",
  },
  retriesLine: {
    en: "Corrected retries: {n} (not counted in the score).",
    roman: "Corrected retries: {n} (score mein nahi gine gaye).",
    ur: "درست شدہ دوبارہ کوششیں: {n} (نمبر میں شامل نہیں)۔",
  },
  unansweredWord: { en: "Unanswered", roman: "Unanswered", ur: "جواب نہیں دیا" },
  perSubjectFirst: { en: "Per subject (first-pass)", roman: "Per subject (first-pass)", ur: "فی مضمون (پہلی کوشش)" },
  badgeUnanswered: { en: "Unanswered", roman: "Unanswered", ur: "جواب نہیں دیا" },
  badgeCorrectFirst: { en: "Correct (first try)", roman: "Sahi (pehli koshish)", ur: "درست (پہلی کوشش)" },
  badgeWrongFirst: { en: "Wrong (first try)", roman: "Ghalat (pehli koshish)", ur: "غلط (پہلی کوشش)" },
  yourFirstAnswer: { en: " — your first answer", roman: " — aap ka pehla jawab", ur: " — آپ کا پہلا جواب" },
  yourFinalAnswer: { en: " — your final answer", roman: " — aap ka aakhri jawab", ur: " — آپ کا آخری جواب" },
  changedAnswer1: {
    en: "You changed this answer after feedback. First answer:",
    roman: "Aap ne feedback ke baad ye jawab badla. Pehla jawab:",
    ur: "آپ نے تاثرات کے بعد یہ جواب بدلا۔ پہلا جواب:",
  },
  changedAnswerMid: { en: "· Final answer:", roman: "· Aakhri jawab:", ur: "· آخری جواب:" },
  changedAnswerEnd: { en: "· Score uses the first answer.", roman: "· Score pehle jawab par hai.", ur: "· نمبر پہلے جواب پر ہے۔" },
  ownerReviewedLabel: { en: "owner-reviewed", roman: "owner-reviewed", ur: "مالک سے جائزہ شدہ" },
  notVerifiedLabel: { en: "not verified", roman: "not verified", ur: "تصدیق نہیں ہوئی" },
  restartButton: { en: "Restart (discard session)", roman: "Restart (session discard karein)", ur: "دوبارہ شروع کریں (سیشن ختم کریں)" },
  trustedOnlyLine: {
    en: "Trusted-only: only owner-reviewed/approved questions.",
    roman: "Trusted-only: sirf owner-reviewed/approved questions.",
    ur: "صرف قابل اعتماد: صرف مالک سے جائزہ شدہ/منظور شدہ سوالات۔",
  },
  timeLeft: { en: "left", roman: "baqi", ur: "باقی" },
  practiceMockNote: {
    en: "Practice mock — shares the practice bank; questions may repeat across track mocks.",
    roman: "Practice mock — practice bank share karta hai; track mocks mein questions repeat ho sakte hain.",
    ur: "مشقی موک — مشقی بینک مشترک ہے؛ ٹریک موکوں میں سوالات دہرائے جا سکتے ہیں۔",
  },
  firstPassSoFar: { en: "First-pass score so far:", roman: "First-pass score ab tak:", ur: "اب تک پہلی کوشش کا نمبر:" },
  correctCount: { en: "correct", roman: "sahi", ur: "درست" },
  retriesNotCounted: {
    en: "{n} corrected retr{plural} (not counted)",
    roman: "{n} corrected retr{plural} (nahi gina gaya)",
    ur: "{n} درست شدہ دوبارہ کوششیں (شامل نہیں)",
  },
  timerNote: {
    en: "The timer ends at a fixed time — reloading the page does not reset it.",
    roman: "Timer aik fixed time par khatam hota hai — page reload karne se reset nahi hota.",
    ur: "ٹائمر ایک مقررہ وقت پر ختم ہوتا ہے — صفحہ دوبارہ لوڈ کرنے سے ری سیٹ نہیں ہوتا۔",
  },
  restartConfirm: {
    en: "Discard this in-progress session and start again? Your recorded attempts are not affected.",
    ur: "یہ جاری سیشن ختم کر کے دوبارہ شروع کریں؟ آپ کی ریکارڈ شدہ کوششیں متاثر نہیں ہوں گی۔",
  },
  originalBadge: { en: "Original", roman: "Original", ur: "اصل" },
  rewordedBadge: { en: "Reworded", roman: "Reworded", ur: "دوبارہ لکھا گیا" },

  // ---- Step 2a — semantic badges, Start Here, nav groups, scroll regions, chart alternatives ----
  provisionalBadgeDetail: {
    en: "These items are unreviewed practice material — the owner has not checked them yet.",
    ur: "یہ سوالات غیر جائزہ شدہ مشقی مواد ہیں — مالک نے ابھی انہیں نہیں دیکھا۔",
  },
  verifiedBadgeDetail: {
    en: "All items in this run were reviewed by the owner on this device — personal review, not official certification.",
    ur: "اس رن کے تمام سوالات مالک نے اس آلے پر دیکھے — ذاتی جائزہ، سرکاری تصدیق نہیں۔",
  },
  mockScoringUnknown: { en: "Scoring policy unknown", roman: "Scoring policy unknown", ur: "اسکورنگ پالیسی نامعلوم" },
  mockScoringUnknownDetail: {
    en: "No official scoring policy is published for this mock; the zero-penalty default is used.",
    ur: "اس ٹیسٹ کی کوئی سرکاری اسکورنگ پالیسی شائع نہیں؛ صفر جرمانہ ڈیفالٹ استعمال ہوتا ہے۔",
  },
  navGroupStudy: { en: "Study", roman: "Study", ur: "مطالعہ" },
  navGroupProgress: { en: "Progress", roman: "Progress", ur: "پیش رفت" },
  navGroupResources: { en: "Exam Resources", roman: "Exam Resources", ur: "امتحانی وسائل" },
  navGroupQuality: { en: "Quality", roman: "Quality", ur: "معیار" },
  startHereHeading: { en: "Start here", roman: "Yahan se shuru karein", ur: "یہاں سے شروع کریں" },
  startHereFresh: {
    en: "Pick where to begin — everything below is built from your own study data.",
    ur: "منتخب کریں کہ کہاں سے شروع کرنا ہے — نیچے سب کچھ آپ کے اپنے مطالعے کے ڈیٹا سے بنایا گیا ہے۔",
  },
  startHereReturning: {
    en: "Pick up where you left off — these actions come from your saved progress.",
    ur: "جہاں چھوڑا تھا وہیں سے جاری رکھیں — یہ اقدامات آپ کی محفوظ پیش رفت سے ہیں۔",
  },
  startHerePractice: { en: "Start topic practice", roman: "Topic practice shuru karein", ur: "موضوع کی مشق شروع کریں" },
  startHereMock: { en: "Choose mock", roman: "Mock chunein", ur: "ٹیسٹ منتخب کریں" },
  startHereCards: { en: "Review due cards", roman: "Due cards review karein", ur: "واجب کارڈز کا جائزہ لیں" },
  startHerePlan: { en: "Build study plan", roman: "Study plan banayein", ur: "مطالعہ منصوبہ بنائیں" },
  startHereContinuePlan: { en: "Continue plan", roman: "Plan jaari rakhein", ur: "منصوبہ جاری رکھیں" },
  resumeSession: { en: "Resume: {title}", ur: "جاری رکھیں: {title}" },
  continuePractice: { en: "Continue practice: {subject}", ur: "مشق جاری رکھیں: {subject}" },
  cardsDueNew: { en: "{due} due · {fresh} new", ur: "{due} واجب · {fresh} نئے" },
  planNextLabel: { en: "Next:", roman: "Agla:", ur: "اگلا:" },
  planComplete: { en: "Study plan complete — all 63 tasks done.", ur: "مطالعہ منصوبہ مکمل — تمام 63 کام مکمل۔" },
  attemptsScope: { en: "{mcq} MCQ questions · {flash} flashcard reviews", ur: "{mcq} ایم سی کیو سوالات · {flash} فلیش کارڈ جائزے" },
  accuracySample: { en: "{correct} of {total} first-pass answers", ur: "پہلی کوشش کے {total} جوابات میں سے {correct} درست" },
  accuracyNoData: { en: "No answers yet", roman: "Abhi koi jawab nahi", ur: "ابھی کوئی جواب نہیں" },
  streakRule: { en: "Consecutive days with any study", ur: "مسلسل دن جن میں کوئی مطالعہ ہوا" },
  timeScope: { en: "Across all attempts", roman: "Tamam koshishon mein", ur: "تمام کوششوں میں" },
  correctionsAck: { en: "I have read these corrections", ur: "میں نے یہ تصحیحات پڑھ لی ہیں" },
  correctionsShowFull: { en: "Show full notice", roman: "Mukammal notice dikhayein", ur: "مکمل نوٹس دکھائیں" },
  correctionsShowCompact: { en: "Show compact notice", roman: "Mukhtasar notice dikhayein", ur: "مختصر نوٹس دکھائیں" },
  tableScrollHint: {
    en: "This table scrolls horizontally on narrow screens.",
    ur: "یہ جدول تنگ اسکرین پر افقی طور پر اسکرول ہوتی ہے۔",
  },
  perSubjectTableAria: { en: "Per-subject results table", ur: "فی مضمون نتائج کی جدول" },
  issuesTableAria: { en: "Reported issues table", ur: "رپورٹ شدہ مسائل کی جدول" },
  telemetryTableAria: { en: "On-device error telemetry table", ur: "آلے پر خرابی ٹیلی میٹری کی جدول" },
  analysisPerSubjectAria: { en: "Per-subject accuracy table", ur: "فی مضمون درستگی کی جدول" },
  mockHistoryTableAria: { en: "Mock history table", ur: "ٹیسٹ تاریخ کی جدول" },
  allAttemptsTableAria: { en: "All attempts table", ur: "تمام کوششوں کی جدول" },
  itemRecordsTableAria: { en: "Per-question attempt detail table", ur: "فی سوال کوشش کی تفصیل کی جدول" },
  chartViewData: { en: "View data as a table", roman: "Data table ki soorat mein dekhein", ur: "ڈیٹا جدول کی صورت میں دیکھیں" },
  chartDueAria: {
    en: "Bar chart: flashcards due each day for the next 7 days. The same data is in the table below.",
    ur: "بار چارٹ: اگلے 7 دنوں میں ہر دن واجب فلیش کارڈ۔ وہی ڈیٹا نیچے دی گئی جدول میں ہے۔",
  },
  chartAccuracyAria: {
    en: "Chart: daily MCQ accuracy and questions attempted over the last 14 days with attempts. The same data is in the table below.",
    ur: "چارٹ: پچھلے 14 دنوں میں روزانہ ایم سی کیو درستگی اور حل شدہ سوالات۔ وہی ڈیٹا نیچے دی گئی جدول میں ہے۔",
  },

  // ---- Step 2b — pre-start disclosure + session compatibility ----
  prestartHeading: { en: "Before you start", roman: "Shuru karne se pehle", ur: "شروع کرنے سے پہلے" },
  prestartSubjectLabel: { en: "Subject", roman: "Subject", ur: "مضمون" },
  prestartPatternLabel: { en: "Pattern", roman: "Pattern", ur: "پیٹرن" },
  prestartNoPattern: {
    en: "Subject drill — no exam pattern is claimed for this set.",
    ur: "مضمون کی ڈرل — اس سیٹ کے لیے کسی امتحانی پیٹرن کا دعویٰ نہیں۔",
  },
  prestartQuestions: { en: "{n} questions", roman: "{n} sawal", ur: "{n} سوالات" },
  prestartReviewed: { en: "{n} of {total} owner-reviewed", ur: "{n} از {total} مالک سے جائزہ شدہ" },
  prestartProvisional: {
    en: "{n} provisional (not owner-reviewed)",
    ur: "{n} عارضی (مالک سے جائزہ شدہ نہیں)",
  },
  prestartDurationLabel: { en: "Duration", roman: "Duration", ur: "دورانیہ" },
  prestartNoTimer: { en: "No timer", roman: "Koi timer nahi", ur: "کوئی ٹائمر نہیں" },
  prestartUnanswered: { en: "Unanswered questions score {marks} marks.", ur: "بلا جواب سوالات کے {marks} نمبر ملتے ہیں۔" },
  prestartAllocation: { en: "Questions by subject", roman: "Subject ke mutabiq sawal", ur: "مضمون کے مطابق سوالات" },
  prestartResumeNote: {
    en: "You have an unfinished session for this exact set.",
    ur: "اس عین سیٹ کے لیے آپ کا ایک نامکمل سیشن موجود ہے۔",
  },
  prestartIncompatible: {
    en: "Your previous session does not match this set ({reason}), so it will not be applied. Start fresh to begin with the current questions.",
    ur: "آپ کا پچھلا سیشن اس سیٹ سے مطابقت نہیں رکھتا ({reason})، اس لیے اسے لاگو نہیں کیا جائے گا۔ موجودہ سوالات سے شروع کرنے کے لیے نئے سرے سے شروع کریں۔",
  },
  incompatReasonVersion: { en: "the session format changed", ur: "سیشن کی شکل بدل گئی" },
  incompatReasonScope: { en: "the session belongs to a different quiz", ur: "سیشن کسی اور کوئز کا ہے" },
  incompatReasonSubject: { en: "the subject changed", ur: "مضمون بدل گیا" },
  incompatReasonMock: { en: "the mock changed", ur: "موک بدل گیا" },
  incompatReasonSeed: { en: "the question set changed", ur: "سوالات کا سیٹ بدل گیا" },
  incompatReasonQuestions: { en: "the questions changed", ur: "سوالات بدل گئے" },
  incompatReasonRevision: { en: "the answer-key version changed", ur: "جوابی کلید کا ورژن بدل گیا" },
  resumeButton: { en: "Resume", roman: "Resume karein", ur: "جاری رکھیں" },
  startFreshButton: { en: "Start fresh", roman: "Naye sire se shuru karein", ur: "نئے سرے سے شروع کریں" },
  questionMapToggle: { en: "Question map", roman: "Sawalon ka map", ur: "سوالات کا نقشہ" },
  questionMapLabel: { en: "Question map — jump to a question", ur: "سوالات کا نقشہ — کسی سوال پر جائیں" },
  questionMapAnswered: { en: "answered", roman: "answered", ur: "جواب دیا گیا" },
  questionMapCurrent: { en: "current", roman: "current", ur: "موجودہ" },
  questionMapFlagged: { en: "flagged", roman: "flagged", ur: "نشان زد" },
  questionMapUnanswered: { en: "unanswered", roman: "unanswered", ur: "بلا جواب" },
  flagButton: { en: "Flag for review", roman: "Review ke liye flag karein", ur: "جائزے کے لیے نشان زد کریں" },
  flaggedButton: { en: "Flagged — tap to unflag", roman: "Flagged — hatane ke liye tap karein", ur: "نشان زد — ہٹانے کے لیے تھپتھپائیں" },
  yourAnswerLine: { en: "Your answer: {answer}", ur: "آپ کا جواب: {answer}" },
  yourBlankLine: { en: "You left this blank.", roman: "Aap ne ise khaali chhoda.", ur: "آپ نے اسے خالی چھوڑا۔" },
  correctAnswerLine: { en: "Correct answer: {answer}", ur: "درست جواب: {answer}" },
  revealReasonLabel: { en: "Why", roman: "Kyun", ur: "کیوں" },
  sourceNoteLink: { en: "Open the related note in the Library", roman: "Mutalliqa note Library mein kholein", ur: "متعلقہ نوٹ لائبریری میں کھولیں" },
  firstPassAccuracyLine: {
    en: "First-pass accuracy: {correct} of {answered} answered ({pct}%)",
    ur: "پہلی کوشش کی درستگی: {answered} جواب شدہ میں سے {correct} درست ({pct}٪)",
  },
  provisionalContentLine: {
    en: "Provisional content: {n} of {total} questions are not owner-reviewed.",
    ur: "عارضی مواد: {total} سوالات میں سے {n} مالک سے جائزہ شدہ نہیں۔",
  },
  flaggedResultsLine: { en: "Flagged for review: {list}", ur: "جائزے کے لیے نشان زد: {list}" },
  noCorrectionChoice: {
    en: "I have no suggested correction",
    roman: "Mere paas koi tajweez shuda tasheeh nahi",
    ur: "میرے پاس کوئی تجویز شدہ تصحیح نہیں ہے",
  },
  issueValidationError: {
    en: "Choose a reason, and either write a correction or tick “I have no suggested correction”.",
    ur: "ایک وجہ چنیں، اور یا تو تصحیح لکھیں یا “میرے پاس کوئی تجویز شدہ تصحیح نہیں ہے” پر نشان لگائیں۔",
  },
  noSuggestedCorrectionLabel: { en: "No suggested correction", roman: "Koi tajweez shuda tasheeh nahi", ur: "کوئی تجویز شدہ تصحیح نہیں" },

  // ---- Step 2b — mock labels ----
  mockLabelFull: { en: "Full", roman: "Full", ur: "مکمل" },
  mockLabelFullDetail: {
    en: "All {total} questions are available in this mock.",
    ur: "اس موک میں تمام {total} سوالات دستیاب ہیں۔",
  },
  mockLabelPartial: { en: "Partial", roman: "Partial", ur: "جزوی" },
  mockLabelPartialDetail: {
    en: "Only {n} of {total} questions are available in this mock.",
    ur: "اس موک میں {total} میں سے صرف {n} سوالات دستیاب ہیں۔",
  },
  mockLabelProxy: { en: "Proxy", roman: "Proxy", ur: "متبادل" },
  mockLabelProxyDetail: {
    en: "A proxy mock: practises the pattern from practice items — not an official paper, and ZamungKor has no published syllabus.",
    ur: "متبادل موک: مشقی سوالات سے پیٹرن کی مشق کرواتا ہے — سرکاری پرچہ نہیں، اور زمونگ کور کا کوئی شائع شدہ نصاب نہیں۔",
  },
  mockLabelReviewedSubset: { en: "Reviewed subset", roman: "Reviewed subset", ur: "جائزہ شدہ حصہ" },
  mockLabelReviewedSubsetDetail: {
    en: "{n} of {total} questions are owner-reviewed; trusted mode uses only those.",
    ur: "{total} میں سے {n} سوالات مالک سے جائزہ شدہ ہیں؛ قابل اعتماد موڈ صرف انہی کو استعمال کرتا ہے۔",
  },
  startReviewedPractice: {
    en: "Start short reviewed practice — {n}/{total} available",
    roman: "Mukhtasar reviewed practice shuru karein — {n}/{total} dastiyab",
    ur: "مختصر جائزہ شدہ مشق شروع کریں — {n}/{total} دستیاب",
  },

  // ---- Step 2b — tutor warnings, citations, failure recovery ----
  tutorWarningFallback: {
    en: "Fallback order: Gemini first, then Groq, then OpenRouter (free model). If one provider fails, the next is tried automatically.",
    ur: "متبادل ترتیب: پہلے Gemini، پھر Groq، پھر OpenRouter (مفت ماڈل)۔ اگر ایک فراہم کنندہ ناکام ہو جائے تو اگلے کو خودکار طور پر آزمایا جاتا ہے۔",
  },
  tutorWarningRetention: {
    en: "Retention: the providers may process and keep your question under their own policies — this site does not control or see that retention. Your questions are not stored on this site.",
    ur: "برقرار رکھنا: فراہم کنندگان آپ کا سوال اپنی پالیسیوں کے تحت پروسیس اور رکھ سکتے ہیں — اس سائٹ کا اس پر کوئی کنٹرول یا نظر نہیں۔ آپ کے سوالات اس سائٹ پر محفوظ نہیں ہوتے۔",
  },
  citationsHeading: { en: "Sources from this library", roman: "Is library ke sources", ur: "اس لائبریری کے ماخذ" },
  citationNoteLabel: { en: "Note", roman: "Note", ur: "نوٹ" },
  aiNotAuthority: {
    en: "AI explanations are study help, not the answer key — always check the library note or question yourself.",
    ur: "اے آئی وضاحتیں مطالعے میں مدد ہیں، جوابی کلید نہیں — ہمیشہ لائبریری نوٹ یا سوال خود چیک کریں۔",
  },
  requestCancelled: {
    en: "Request cancelled — your question is back in the box below.",
    ur: "درخواست منسوخ — آپ کا سوال نیچے والے خانے میں واپس آ گیا ہے۔",
  },
  retryButton: { en: "Retry", roman: "Dobara koshish karein", ur: "دوبارہ کوشش کریں" },
  offlineSearchButton: { en: "Search the library offline", roman: "Library offline talaash karein", ur: "لائبریری آف لائن تلاش کریں" },
  tutorFailedNote: {
    en: "The live tutor could not answer. Your question is preserved below — retry, or search the library offline.",
    ur: "براہ راست استاد جواب نہیں دے سکا۔ آپ کا سوال نیچے محفوظ ہے — دوبارہ کوشش کریں، یا لائبریری آف لائن تلاش کریں۔",
  },
  checkedAgeNow: { en: "Checked just now.", roman: "Abhi check hua.", ur: "ابھی چیک ہوا۔" },
  checkedAgeMin: { en: "Checked {n} min ago.", roman: "{n} min pehle check hua.", ur: "{n} منٹ پہلے چیک ہوا۔" },
  checkedAgeOld: { en: "Checked over an hour ago.", roman: "Aik ghantay se zyada pehle check hua.", ur: "ایک گھنٹے سے زیادہ پہلے چیک ہوا۔" },
  refreshCooldownNote: {
    en: "Refresh is available again shortly — probes are rate-limited to protect provider quota.",
    ur: "ریفریش جلد دوبارہ دستیاب ہوگا — فراہم کنندہ کوٹہ بچانے کے لیے جانچ محدود ہے۔",
  },

  // ---- Step 2b — study plan: pacing, calendar, deep links ----
  planPacing3: { en: "21 study units paced over 21 days", ur: "21 مطالعہ یونٹس 21 دنوں میں" },
  planPacing6: { en: "21 study units paced over 42 days", ur: "21 مطالعہ یونٹس 42 دنوں میں" },
  planPacing12: { en: "21 study units · two cycles paced over 84 days", ur: "21 مطالعہ یونٹس · دو مراحل میں 84 دنوں میں" },
  planCalendarSpan: {
    en: "{study} study days + {rest} rest days over {total} calendar days",
    ur: "{total} کیلنڈر دنوں میں {study} مطالعہ دن + {rest} آرام دن",
  },
  planRestDay: { en: "Rest day", roman: "Aaram ka din", ur: "آرام کا دن" },
  planRestDayNote: { en: "No tasks — rest and recover.", roman: "Koi task nahi — aaram karein.", ur: "کوئی کام نہیں — آرام کریں۔" },
  planCatchUpLabel: { en: "Catch-up day", roman: "Catch-up din", ur: "تلافی کا دن" },
  planCatchUpNote: {
    en: "Redo anything missed before moving on.",
    roman: "Aage barhne se pehle chhoota hua kaam mukammal karein.",
    ur: "آگے بڑھنے سے پہلے چھوٹا ہوا کام مکمل کریں۔",
  },
  planCycle2Label: { en: "Cycle 2 revisit", roman: "Cycle 2 revisit", ur: "دوسرے مرحلے میں دہرائی" },
  planCycle2Note: {
    en: "Revisit this unit with unseen items and mixed practice — not the same questions repeated.",
    ur: "اس یونٹ کو نئے سوالات اور مخلوط مشق کے ساتھ دہرائیں — وہی سوالات دہرائے نہیں جاتے۔",
  },
  planCycle2Banner: {
    en: "12-week plan: two cycles. Cycle 1 builds the units; Cycle 2 revisits each unit with unseen items and mixed practice. One checkbox per task — checking it marks the task done in both cycles.",
    ur: "12 ہفتوں کا منصوبہ: دو مراحل۔ پہلا مرحلہ یونٹس بناتا ہے؛ دوسرا مرحلہ ہر یونٹ کو نئے سوالات اور مخلوط مشق کے ساتھ دہراتا ہے۔ ہر کام کے لیے ایک چیک باکس — اسے نشان زد کرنے سے کام دونوں مرحلوں میں مکمل شمار ہوتا ہے۔",
  },
  planWorkloadWord: { en: "Workload", roman: "Workload", ur: "کام کا بوجھ" },
  planStartDate: { en: "Plan starts: {date}", ur: "منصوبہ شروع: {date}" },
  planResetDates: { en: "Restart plan dates from today", roman: "Plan ki tareekhein aaj se dobara shuru karein", ur: "منصوبے کی تاریخیں آج سے دوبارہ شروع کریں" },
  planResetDatesNote: {
    en: "Only the dates change — your completed tasks stay checked.",
    ur: "صرف تاریخیں بدلتی ہیں — آپ کے مکمل شدہ کام نشان زد رہتے ہیں۔",
  },
  planTaskLinkLibrary: { en: "Open in Library", roman: "Library mein kholein", ur: "لائبریری میں کھولیں" },
  planTaskLinkPractice: { en: "Open practice drill", roman: "Practice drill kholein", ur: "مشقی ڈرل کھولیں" },
  planTaskLinkFlashcards: { en: "Open flashcards", roman: "Flashcards kholein", ur: "فلیش کارڈز کھولیں" },
  planTaskLinkMock: { en: "Open mock tests", roman: "Mock tests kholein", ur: "موک ٹیسٹ کھولیں" },
  planTaskLinkAnalysis: { en: "Open analysis", roman: "Analysis kholein", ur: "تجزیہ کھولیں" },

  // ---- Step 2b — flashcards counters + save failure ----
  flashNewLabel: { en: "New", roman: "New", ur: "نئے" },
  flashDueReviewsLabel: { en: "Due reviews", roman: "Due reviews", ur: "واجب دہرائی" },
  flashSessionReviewed: { en: "reviewed this session", roman: "is session mein reviewed", ur: "اس سیشن میں دہرائے گئے" },
  flashSaveFailed: {
    en: "Could not save this grade — the card's progress is not stored yet. Retry, or export your progress first.",
    ur: "یہ درجہ محفوظ نہیں ہو سکا — کارڈ کی پیش رفت ابھی محفوظ نہیں ہوئی۔ دوبارہ کوشش کریں، یا پہلے اپنی پیش رفت برآمد کریں۔",
  },
  flashRetrySave: { en: "Retry save", roman: "Save dobara karein", ur: "محفوظ کرنے کی دوبارہ کوشش کریں" },
  flashSaveRecovered: { en: "Saved.", roman: "Save ho gaya.", ur: "محفوظ ہو گیا۔" },

  // ---- Step 2b — analysis: denominators, provisional, filters, data ----
  analysisDenominators: {
    en: "Accuracy {pct}% is over {questions} questions in {attempts} MCQ attempts. Flashcard numbers are self-ratings and are never mixed into MCQ accuracy.",
    ur: "درستگی {pct}٪ {attempts} ایم سی کیو کوششوں کے {questions} سوالات پر مبنی ہے۔ فلیش کارڈ نمبر خود درجہ بندی ہیں اور کبھی ایم سی کیو درستگی میں نہیں ملائے جاتے۔",
  },
  provisionalHeading: { en: "Provisional — small sample", roman: "Provisional — chhota sample", ur: "عارضی — چھوٹا نمونہ" },
  provisionalSmallSample: { en: "provisional—small sample", roman: "provisional—chhota sample", ur: "عارضی—چھوٹا نمونہ" },
  provisionalIntro: {
    en: "These subjects have fewer than 5 answered questions, so their accuracy is provisional. They are shown here, not hidden.",
    ur: "ان مضامین کے 5 سے کم جواب شدہ سوالات ہیں، اس لیے ان کی درستگی عارضی ہے۔ انہیں یہاں دکھایا گیا ہے، چھپایا نہیں گیا۔",
  },
  run10Drill: { en: "Run 10-question drill", roman: "10 sawalon ki drill chalayein", ur: "10 سوالات کی ڈرل چلائیں" },
  filterDateAll: { en: "All time", roman: "Tamam waqt", ur: "تمام وقت" },
  filterDate7: { en: "Last 7 days", roman: "Pichhle 7 din", ur: "پچھلے 7 دن" },
  filterDate30: { en: "Last 30 days", roman: "Pichhle 30 din", ur: "پچھلے 30 دن" },
  filterTrackLabel: { en: "Track", roman: "Track", ur: "ٹریک" },
  filterAllSubjects: { en: "All subjects", roman: "Tamam subjects", ur: "تمام مضامین" },
  filterAllTracks: { en: "All tracks", roman: "Tamam tracks", ur: "تمام ٹریک" },
  filtersHeading: { en: "Filters", roman: "Filters", ur: "فلٹر" },
  filteredNote: { en: "Showing {n} of {total} attempts.", ur: "{total} میں سے {n} کوششیں دکھائی جا رہی ہیں۔" },
  lastExportLine: { en: "Last export: {date}", ur: "آخری برآمد: {date}" },
  lastImportLine: { en: "Last import: {date}", ur: "آخری درآمد: {date}" },
  neverExported: { en: "Never exported yet.", roman: "Abhi tak export nahi hua.", ur: "ابھی تک برآمد نہیں ہوا۔" },
  neverImported: { en: "Never imported yet.", roman: "Abhi tak import nahi hua.", ur: "ابھی تک درآمد نہیں ہوا۔" },

  // ---- Step 2b — library: scoped search, source text, related links ----
  searchAllSubjects: { en: "Search all subjects", roman: "Tamam subjects talaash karein", ur: "تمام مضامین تلاش کریں" },
  libraryMatchCount: { en: "{n} of {total} notes", ur: "{total} میں سے {n} نوٹ" },
  libraryMatchCountQuery: { en: "{n} notes match “{q}”", ur: "“{q}” سے {n} نوٹ ملتے ہیں" },
  englishSourceText: { en: "English source text", roman: "English source text", ur: "انگریزی ماخذ متن" },
  relatedLabel: { en: "Related:", roman: "Mutalliqa:", ur: "متعلقہ:" },
  relatedPractice: { en: "Related practice drill", roman: "Mutalliqa practice drill", ur: "متعلقہ مشقی ڈرل" },
  relatedFlashcards: { en: "Related flashcards", roman: "Mutalliqa flashcards", ur: "متعلقہ فلیش کارڈز" },
  relatedPlan: { en: "Related plan day", roman: "Mutalliqa plan din", ur: "متعلقہ منصوبہ دن" },

  // ---- Step 3b-audit2 (F02) — pending-English explanation label.
  // Phase 4A: the /review queue section (heading/intro/show-more) was
  // removed per owner decision; only the display-only label remains. ----
  explanationPendingLabel: {
    en: "Roman Urdu explanation — English version pending owner review",
    ur: "رومن اردو وضاحت — انگریزی نسخہ مالک کے جائزے کا منتظر ہے",
  },

  // ---- Step 3b-audit2 (F12) — durable flagged questions ----
  flagsHeading: { en: "Flagged questions", roman: "Flagged sawalat", ur: "نشاندہ سوالات" },
  flagsIntro: {
    en: "Questions you flagged during practice and mocks. Flags survive submitting the test and reloading the page. Remove them here when done.",
    ur: "وہ سوالات جنہیں آپ نے مشق اور موک ٹیسٹ کے دوران نشان زد کیا۔ نشان ٹیسٹ جمع کرانے اور صفحہ دوبارہ لوڈ کرنے کے بعد بھی رہتے ہیں۔ مکمل ہونے پر یہاں سے ہٹا دیں۔",
  },
  flagsEmpty: {
    en: "No flagged questions yet. Flag a question during practice or a mock to keep it here.",
    ur: "ابھی کوئی نشاندہ سوال نہیں ہے۔ کسی سوال کو یہاں رکھنے کے لیے مشق یا موک کے دوران اسے نشان زد کریں۔",
  },
  flagsRemove: { en: "Remove", roman: "Hata dein", ur: "ہٹا دیں" },
  flagsClearAll: { en: "Clear all flags", roman: "Tamam flags saaf karein", ur: "تمام نشانات صاف کریں" },
  flagsFromMock: { en: "Mock", roman: "Mock", ur: "موک" },
  flagsFromPractice: { en: "Practice", roman: "Practice", ur: "مشق" },
  flagsFlaggedOn: { en: "Flagged {date}", ur: "{date} کو نشان زد کیا گیا" },

  // ---- Step 3b-audit2 (F07/F08/F09) — storage failure + multi-tab warnings ----
  storageSaveFailed: {
    en: "A save failed — your latest changes may not be stored (storage may be full or blocked). Download a backup copy, free up space, then retry.",
    ur: "محفوظ کرنا ناکام ہو گیا — آپ کی تازہ ترین تبدیلیاں محفوظ نہیں ہوئی ہوں گی (اسٹوریج بھری ہوئی یا بند ہو سکتی ہے)۔ بیک اپ کی کاپی ڈاؤن لوڈ کریں، جگہ خالی کریں، پھر دوبارہ کوشش کریں۔",
  },
  storageOtherTab: {
    en: "Your study data was changed in another open tab. Reload this page to see the latest version before continuing — otherwise your changes here may overwrite it.",
    ur: "آپ کا مطالعاتی ڈیٹا کسی دوسرے کھلے ٹیب میں تبدیل ہو گیا ہے۔ جاری رکھنے سے پہلے تازہ ترین نسخہ دیکھنے کے لیے یہ صفحہ دوبارہ لوڈ کریں — ورنہ یہاں کی تبدیلیاں اسے مٹا سکتی ہیں۔",
  },
  storageReload: { en: "Reload page", roman: "Page dobara load karein", ur: "صفحہ دوبارہ لوڈ کریں" },
  storageDismiss: { en: "Dismiss", roman: "Band karein", ur: "بند کریں" },
  attemptSaveFailed: {
    en: "This result could not be saved — storage may be full. Your answers above are still on screen. Retry the save, or download this result so it is not lost.",
    ur: "یہ نتیجہ محفوظ نہیں ہو سکا — اسٹوریج بھری ہوئی ہو سکتی ہے۔ آپ کے جوابات اوپر اسکرین پر موجود ہیں۔ محفوظ کرنے کی دوبارہ کوشش کریں، یا یہ نتیجہ ڈاؤن لوڈ کریں تاکہ ضائع نہ ہو۔",
  },
  attemptRetrySave: { en: "Retry save", roman: "Save dobara karein", ur: "دوبارہ محفوظ کریں" },
  attemptDownloadResult: { en: "Download this result", roman: "Yeh natija download karein", ur: "یہ نتیجہ ڈاؤن لوڈ کریں" },
  attemptSaveRecovered: { en: "Result saved.", roman: "Natija save ho gaya.", ur: "نتیجہ محفوظ ہو گیا۔" },
  issueSaveFailed: {
    en: "This report could not be saved — storage may be full. Your text is still here. Try saving again.",
    ur: "یہ رپورٹ محفوظ نہیں ہو سکی — اسٹوریج بھری ہوئی ہو سکتی ہے۔ آپ کا متن یہیں موجود ہے۔ دوبارہ محفوظ کرنے کی کوشش کریں۔",
  },
};

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  t: (key: string) => string;
  /** Template lookup: replaces {name} tokens with the given values.
   *  Missing values become "" (never a raw "{name}" in the UI). */
  tf: (key: string, vars: Record<string, string | number>) => string;
};

const LangCtx = createContext<Ctx>({
  lang: "en",
  setLang: () => {},
  theme: "light",
  setTheme: () => {},
  t: (k) => STRINGS[k]?.en ?? k,
  tf: (k, vars) => replaceVars(STRINGS[k]?.en ?? k, vars),
});

function replaceVars(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name];
    return v === undefined ? "" : String(v);
  });
}

/** Plain-text bidi isolation for constructed messages (chat fallback
 *  text, tooltips): wraps a Latin-script run in Unicode LRI/PDI so its
 *  punctuation cannot jump in RTL context. Harmless in LTR text. In
 *  JSX, prefer <span dir="ltr"> / dir="auto" instead. */
export function lri(text: string): string {
  return "\u2066" + text + "\u2069";
}

export function useLang() {
  return useContext(LangCtx);
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [theme, setThemeState] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Stage 1 P1 Tier 2: safeRead/safeWrite never throw on blocked or
    // full storage — a SecurityError/QuotaExceededError is recorded as
    // a warning instead of crashing the effect.
    const l = safeRead("etea_lang_next") as Lang | null;
    const th = safeRead("etea_theme_next") as Theme | null;
    if (l === "en" || l === "roman" || l === "ur") setLangState(l);
    if (th === "light" || th === "dark") setThemeState(th);
    else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) setThemeState("dark");
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = lang === "ur" ? "ur" : "en";
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = theme;
    safeWrite("etea_lang_next", lang);
    safeWrite("etea_theme_next", theme);
  }, [lang, theme, ready]);

  const setLang = (l: Lang) => setLangState(l);
  const setTheme = (t: Theme) => setThemeState(t);
  const t = (key: string) => STRINGS[key]?.[lang] ?? STRINGS[key]?.en ?? key;
  const tf = (key: string, vars: Record<string, string | number>) =>
    replaceVars(STRINGS[key]?.[lang] ?? STRINGS[key]?.en ?? key, vars);

  return <LangCtx.Provider value={{ lang, setLang, theme, setTheme, t, tf }}>{children}</LangCtx.Provider>;
}
