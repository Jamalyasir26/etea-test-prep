// AI Tutor — live chat (Gemini primary, Groq fallback, OpenRouter free-model fallback) with offline fallback.
// The tutor never invents: answers are grounded in the local library (RAG).
// If live AI is down or unconfigured, the page falls back to library search.
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
import { useLang } from "@/lib/i18n";

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

type Msg = { role: "user" | "ai" | "sys"; text: string };

export default function Tutor() {
  const { lang } = useLang();
  const [status, setStatus] = useState<{ live: boolean; gemini: boolean; groq: boolean; openrouter: boolean } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "sys",
      text: "Ustad — your AI tutor. Ask about any topic in this library, ask it to explain a wrong answer, or ask for a revision plan. Answers come from this library only.",
    },
  ]);
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
    fetch("/api/tutor")
      .then((r) => r.json())
      .then((j) => setStatus({ live: j.live, gemini: j.gemini, groq: j.groq, openrouter: j.openrouter ?? false }))
      .catch(() => setStatus({ live: false, gemini: false, groq: false, openrouter: false }));
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
        // Offline fallback: search the library directly.
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
          j.error ?? "Live AI is unavailable right now.",
          notes.length || questions.length
            ? `\n\nOffline search in this library found:\n${notes.map((n) => `• Note: ${n.title}`).join("\n")}\n${questions.map((x) => `• MCQ ${x.id}: ${x.question} — ${x.options[x.correctIndex]}`).join("\n")}`
            : "\n\nNo matching note or question was found in this library either — try rephrasing, or use the Library section.",
          matchingAnnotations.length
            ? `\n\nYour annotations on this topic:\n${matchingAnnotations.map(([key, text]) => `• ${key.split("||")[1] ?? key}: ${text}`).join("\n")}`
            : "",
        ].join("");
        setMsgs((m) => [...m, { role: "ai", text: fb }]);
      } else {
        setMsgs((m) => [
          ...m,
          { role: "ai", text: `${j.answer}\n\n— via ${j.provider === "gemini" ? "Gemini" : j.provider === "groq" ? "Groq" : "OpenRouter (free model)"} (live AI)` },
        ]);
      }
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "Could not reach the tutor. Check your connection and try again." }]);
    } finally {
      setBusy(false);
    }
  }

  async function explainQuestion() {
    const id = explainId.trim().toUpperCase();
    if (!id) return;
    setExplainOut("Explaining…");
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: id, lang: effectiveTutorLang }),
      });
      const j = await res.json();
      setExplainOut(res.ok ? j.explanation : j.error ?? "Could not explain right now.");
    } catch {
      setExplainOut("Could not reach the tutor.");
    }
  }

  return (
    <div>
      <h1>AI Tutor — Ustad</h1>
      <p className="muted">
        <b>On-device study assistant is gone — this is the live tutor.</b> It answers from this
        library only (RAG), in your selected language. If a question is outside the library, it
        says so instead of inventing. Mocks are provisional practice built from
        unreviewed AI-generated questions; Trusted mode uses reviewed items only.
      </p>
      <div className={`alert ${status?.live ? "green" : "red"}`}>
        {status === null
          ? "Checking live AI status…"
          : status.live
            ? `Live AI keys are configured — Gemini: ${status.gemini ? "yes" : "no"}, Groq fallback: ${status.groq ? "yes" : "not set"}, OpenRouter fallback: ${status.openrouter ? "yes" : "not set"}. Keys configured — live responsiveness not health-checked.`
            : "Live AI is NOT configured on the server (no API key). The offline library search below still works."}
      </div>
      {annotationsOn && (
        <p className="muted">
          Your private note annotations are included in this chat (you enabled this in the
          Library). Turn it off there any time.
        </p>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <label htmlFor="tutor-lang">
          <b>Answer language:</b>
        </label>
        <select
          id="tutor-lang"
          value={effectiveTutorLang}
          onChange={(e) => setTutorLang(e.target.value)}
          aria-label="Tutor answer language"
        >
          {TUTOR_LANG_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="muted">
          Answers come back in this language. The rest of the site keeps your selected language.
        </span>
      </div>

      <div className="chatlog" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.text}
          </div>
        ))}
        {busy && <div className="msg ai">Ustad is thinking…</div>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Ask a question… e.g. What is scaffolding in pedagogy?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          aria-label="Ask the tutor"
          style={{ flex: 1 }}
        />
        <button onClick={() => send()} disabled={busy || !input.trim()}>
          Ask
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <button className="secondary" onClick={() => send("Explain Bloom's Taxonomy with an example.")}>
          Explain Bloom's Taxonomy
        </button>
        <button className="secondary" onClick={() => send("How many Surahs are in the Holy Quran?")}>
          Surahs in the Quran?
        </button>
        {weakest && (
          <button className="secondary" onClick={() => send(`My weakest subject is ${weakest}. Give me a focused revision drill for it.`)}>
            Drill my weakest subject ({weakest})
          </button>
        )}
      </div>

      <div className="card">
        <h3>Explain one MCQ</h3>
        <p className="muted">Enter a question ID (e.g. ISL-001) to get a full explanation.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="text" placeholder="e.g. ISL-001" value={explainId} onChange={(e) => setExplainId(e.target.value)} aria-label="Question ID" />
          <button className="secondary" onClick={explainQuestion}>Explain</button>
        </div>
        {explainOut && <p style={{ whiteSpace: "pre-wrap" }}>{explainOut}</p>}
      </div>
    </div>
  );
}
