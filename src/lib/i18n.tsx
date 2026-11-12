// Language (English / Roman Urdu / اردو RTL) + dark mode, persisted in localStorage.
// UI chrome only — library content (notes/MCQs) keeps its original wording.
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { safeRead, safeWrite } from "./tracking";

export type Lang = "en" | "roman" | "ur";
export type Theme = "light" | "dark";

const STRINGS: Record<string, Record<Lang, string>> = {
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
  timeSpent: { en: "Time spent", roman: "Time spent", ur: "وقت" },
  weakAreas: { en: "Weak Areas", roman: "Weak Areas", ur: "کمزور حصے" },
  drill: { en: "Drill", roman: "Drill", ur: "مشق" },
  export: { en: "Export progress", roman: "Progress export karein", ur: "پیش رفت محفوظ کریں" },
  import: { en: "Import progress", roman: "Progress import karein", ur: "پیش رفت لائیں" },
  light: { en: "Light", roman: "Light", ur: "روشن" },
  dark: { en: "Dark", roman: "Dark", ur: "تاریک" },
};

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  t: (key: string) => string;
};

const LangCtx = createContext<Ctx>({
  lang: "en",
  setLang: () => {},
  theme: "light",
  setTheme: () => {},
  t: (k) => STRINGS[k]?.en ?? k,
});

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

  return <LangCtx.Provider value={{ lang, setLang, theme, setTheme, t }}>{children}</LangCtx.Provider>;
}
