// AI Tutor — live chat (Gemini primary, Groq fallback, OpenRouter free-model fallback) with offline fallback.
// The tutor never invents: answers are grounded in the local library (RAG).
// If live AI is down or unconfigured, the page falls back to library search.
// Localization Pass 1 — every UI string via i18n.tsx (the owner found the
// tutor page untranslated in Urdu mode). The quick-ask buttons SEND
// English questions (the tutor answers in the selected answer language
// regardless); only their labels are translated.
"use client";

import { useEffect, useState } from "react";
import { retrieve, tokenize } from "@/lib/data";
import {
  computeStats,
  loadAnnotationOptIn,
  loadAnnotations,
  loadAttempts,
  safeRead,
  safeWrite,
} from "@/lib/tracking";
import { lri, useLang } from "@/lib/i18n";
import TutorHealth from "@/components/TutorHealth";

// Stage 1 P1 Tier 2 — the tutor's ANSWER language, separate from the
// site-wide UI toggle (en/roman/ur, untouched). Persisted under its own
// key; when the owner has never chosen one, the tutor follows the site
// language. Arabic ("ar") answers in Arabic; the library excerpts stay
// as they are.
const TUTOR_LANG_KEY = "etea_tutor_lang_next";
const TUTOR_LANG_OPTIONS = [
  { value: "en", label: "English" },
  { value: "roman", label: "Roman Urdu" },
  { value: "ur", label: "اردو" },
  { value: "ar", label: "العربية (Arabic)" },
] as const;

function isTutorLang(v: string | null): v is (typeof TUTOR_LANG_OPTIONS)[number]["value"] {
  return v === "en" || v === "roman" || v === "ur" || v === "ar";
}

// Localization Pass 1 — the greeting is stored as a sentinel and
// translated at RENDER time, so it always matches the current UI
// language (a useState initializer would freeze the first-render
// language, which is always English before the stored language loads).
const GREETING = "__GREETING__";

type Msg = { role: "user" | "ai" | "sys"; text: string };

export default function Tutor() {
  const { lang, t, tf } = useLang();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "sys", text: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [explainId, setExplainId] = useState("");
  const [explainOut, setExplainOut] = useState("");
  const [weakest, setWeakest] = useState<string>("");
  // Stage 1 P0.3 — owner annotations are included in tutor requests ONLY
  // when the owner enabled the opt-in in the Library (default OFF).
  const [annotationsOn, setAnnotationsOn] = useState(false);
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  // Stage 1 P1 Tier 2 — explicit tutor answer language, or null to
  // follow the site language (the previous behaviour).
  const [tutorLang, setTutorLangState] = useState<string | null>(null);
  const effectiveTutorLang = tutorLang ?? lang;

  useEffect(() => {
    const saved = safeRead(TUTOR_LANG_KEY);
    if (isTutorLang(saved)) setTutorLangState(saved);
  }, []);

  function setTutorLang(l: string) {
    if (!isTutorLang(l)) return;
    setTutorLangState(l);
    safeWrite(TUTOR_LANG_KEY, l);
  }

  useEffect(() => {
    setAnnotationsOn(loadAnnotationOptIn());
    setAnnotations(loadAnnotations());
  }, []);

  useEffect(() => {
    // Stage 1 P2 (B06) — the old key-presence check (GET /api/tutor) and
    // its "keys configured — responsiveness not health-checked" wording
    // are gone; live responsiveness now comes from <TutorHealth />, which
    // fetches /api/tutor/health. This effect only computes the weakest
    // subject for the drill button.
    const s = computeStats(loadAttempts());
    setWeakest(s.weakest.length ? s.weakest[0].subject : "");
  }, []);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    const history = msgs.filter((m) => m.role !== "sys").map((m) => ({ role: m.role, text: m.text }));
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    // Stage 1 P0.3 — annotations leave this device ONLY when the owner
    // enabled the opt-in in the Library. Otherwise nothing is sent.
    const annotationsToSend = annotationsOn
      ? Object.entries(annotations)
          .map(([key, text]) => ({ note: key.split("||")[1] ?? key, text: text.slice(0, 1000) }))
          .slice(0, 20)
      : [];
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history, lang: effectiveTutorLang, annotations: annotationsToSend }),
      });
      const j = await res.json();
      if (!res.ok) {
        // Offline fallback: search the library directly. Content runs
        // (note titles, MCQ text) are wrapped in bidi isolates so their
        // punctuation cannot jump when the bubble is RTL.
        const { notes, questions } = retrieve(q, 3, 3);
        const terms = tokenize(q);
        const matchingAnnotations = annotationsOn
          ? Object.entries(annotations)
              .filter(([key, text]) => {
                const hay = `${key} ${text}`.toLowerCase();
                return terms.some((t) => hay.includes(t));
              })
              .slice(0, 3)
          : [];
        const fb = [
          j.error ?? t("liveUnavailable"),
          notes.length || questions.length
            ? `\n\n${t("offlineFound")}\n${notes.map((n) => `• ${t("offlineNoteLabel")}: ${lri(n.title)}`).join("\n")}\n${questions.map((x) => `• ${t("offlineMcqLabel")} ${lri(x.id)}: ${lri(x.question)} — ${lri(x.options[x.correctIndex])}`).join("\n")}`
            : `\n\n${t("noMatchFallback")}`,
          matchingAnnotations.length
            ? `\n\n${t("yourAnnotations")}\n${matchingAnnotations.map(([key, text]) => `• ${lri(key.split("||")[1] ?? key)}: ${text}`).join("\n")}`
            : "",
        ].join("");
        setMsgs((m) => [...m, { role: "ai", text: fb }]);
      } else {
        const providerName =
          j.provider === "gemini" ? "Gemini" : j.provider === "groq" ? "Groq" : "OpenRouter (free model)";
        setMsgs((m) => [
          ...m,
          { role: "ai", text: `${j.answer}\n\n${tf("viaLine", { provider: lri(providerName) })}` },
        ]);
      }
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: t("reachTutorRetry") }]);
    } finally {
      setBusy(false);
    }
  }

  async function explainQuestion() {
    const id = explainId.trim().toUpperCase();
    if (!id) return;
    setExplainOut(t("explaining"));
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: id, lang: effectiveTutorLang }),
      });
      const j = await res.json();
      setExplainOut(res.ok ? j.explanation : (j.error ?? t("explainError")));
    } catch {
      setExplainOut(t("reachTutorError"));
    }
  }

  return (
    <div>
      <h1>{t("tutorTitle")}</h1>
      <p className="muted">{t("tutorIntro")}</p>
      <TutorHealth variant="full" />
      {/* Stage 1 P2 — API privacy disclosure, shown before the chat form:
          the question leaves this device for the AI providers. */}
      <p className="muted">{t("tutorPrivacy")}</p>
      {annotationsOn && <p className="muted">{t("tutorAnnotationsOn")}</p>}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <label htmlFor="tutor-lang">
          <b>{t("answerLanguage")}</b>
        </label>
        <select
          id="tutor-lang"
          value={effectiveTutorLang}
          onChange={(e) => setTutorLang(e.target.value)}
          aria-label={t("tutorLangAria")}
        >
          {TUTOR_LANG_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="muted">{t("answerLanguageHint")}</span>
      </div>

      <div className="chatlog" aria-live="polite">
        {msgs.map((m, i) => (
          // Localization Pass 1 (RTL) — dir="auto": the bubble direction
          // follows the message's own first strong character, so English
          // and Urdu/Arabic answers both keep their punctuation.
          <div key={i} dir="auto" className={`msg ${m.role}`}>
            {m.text === GREETING ? t("tutorGreeting") : m.text}
          </div>
        ))}
        {busy && (
          <div dir="auto" className="msg ai">
            {t("thinking")}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder={t("askPlaceholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          aria-label={t("askLabel")}
          // Stage 1 P1 Tier 4 (B01) — flex items refuse to shrink below
          // their content width unless min-width is 0; without it the
          // input + Ask button ran off-screen at 360px.
          style={{ flex: 1, minWidth: 0 }}
        />
        <button onClick={() => send()} disabled={busy || !input.trim()}>
          {t("askButton")}
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <button className="secondary" onClick={() => send("Explain Bloom's Taxonomy with an example.")}>
          {t("quickBloom")}
        </button>
        <button className="secondary" onClick={() => send("How many Surahs are in the Holy Quran?")}>
          {t("quickSurahs")}
        </button>
        {weakest && (
          <button className="secondary" onClick={() => send(`My weakest subject is ${weakest}. Give me a focused revision drill for it.`)}>
            {t("drillWeakest")} <span dir="ltr">({weakest})</span>
          </button>
        )}
      </div>

      <div className="card">
        <h3>{t("explainHeading")}</h3>
        <p className="muted">{t("explainDesc")}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            // Format example ("e.g. ISL-001") kept literal in all
            // languages — it shows the ID format, not a sentence.
            placeholder="e.g. ISL-001"
            value={explainId}
            onChange={(e) => setExplainId(e.target.value)}
            aria-label={t("explainIdLabel")}
            // Stage 1 P1 Tier 4 (B01) — same min-width: 0 fix as the ask
            // row: the input must shrink so the Explain button stays
            // on-screen at 360px.
            style={{ flex: 1, minWidth: 0 }}
          />
          <button className="secondary" onClick={explainQuestion}>
            {t("explainButton")}
          </button>
        </div>
        {explainOut && (
          <p dir="auto" style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
            {explainOut}
          </p>
        )}
      </div>
    </div>
  );
}
