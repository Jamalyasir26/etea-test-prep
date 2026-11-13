// AI Tutor — live chat (Gemini primary, Groq fallback, OpenRouter free-model fallback) with offline fallback.
// The tutor never invents: answers are grounded in the local library (RAG).
// If live AI is down or unconfigured, the page falls back to library search.
// Localization Pass 1 — every UI string via i18n.tsx (the owner found the
// tutor page untranslated in Urdu mode). The quick-ask buttons SEND
// English questions (the tutor answers in the selected answer language
// regardless); only their labels are translated.
//
// Step 2b — third-party processing warning BEFORE the prompt (provider
// names + fallback order + retention limits + sensitive-data warning);
// citations on answers (note title + question ID + deep link, never
// presented as answer-key authority); Cancel during loading; on
// failure the prompt is preserved with Retry + offline library search;
// ?explain=<id> deep-links into the explain box (used by citations).
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { providerDisplayName } from "@/lib/tutorHealth";
import TutorHealth from "@/components/TutorHealth";
import BoldText from "@/components/BoldText";

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

// Step 2b — citation payload attached to AI messages: the library
// notes (title + Library subject for the deep link) and question ids
// the answer was grounded in. Rendered as links below the answer.
type MsgSources = { notes: { title: string; subject: string }[]; questions: string[] };
type Msg = { role: "user" | "ai" | "sys"; text: string; sources?: MsgSources };

/** Normalize the API's sources payload. The current API returns note
 *  objects ({title, subject}); older shapes (plain title strings) are
 *  tolerated so a cached deployment never breaks the render. */
function normalizeSources(raw: unknown): MsgSources {
  if (!raw || typeof raw !== "object") return { notes: [], questions: [] };
  const r = raw as { notes?: unknown; questions?: unknown };
  const notes = Array.isArray(r.notes)
    ? r.notes.flatMap((n) => {
        if (typeof n === "string") return [{ title: n, subject: "" }];
        if (n && typeof n === "object") {
          const o = n as { title?: unknown; subject?: unknown };
          if (typeof o.title === "string") {
            return [{ title: o.title, subject: typeof o.subject === "string" ? o.subject : "" }];
          }
        }
        return [];
      })
    : [];
  const questions = Array.isArray(r.questions) ? r.questions.filter((q): q is string => typeof q === "string") : [];
  return { notes, questions };
}

function TutorInner() {
  const { lang, t, tf } = useLang();
  const search = useSearchParams();
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
  // Step 2b — cancel + failure recovery. The abort controller cancels
  // the in-flight request; failedPrompt preserves the question after a
  // failure so the user can Retry or search the library offline.
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const [failedPrompt, setFailedPrompt] = useState<string | null>(null);

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

  // Step 2b — offline library search, shared by the automatic fallback
  // (live request failed) and the manual "Search the library offline"
  // button. Returns the message text + citation payload; the caller
  // decides the prefix line (live error vs. manual search).
  function offlineResult(q: string, prefix: string): { text: string; sources: MsgSources } {
    const { notes, questions } = retrieve(q, 3, 3);
    const terms = tokenize(q);
    const matchingAnnotations = annotationsOn
      ? Object.entries(annotations)
          .filter(([key, text]) => {
            const hay = `${key} ${text}`.toLowerCase();
            return terms.some((term) => hay.includes(term));
          })
          .slice(0, 3)
      : [];
    const text = [
      prefix,
      notes.length || questions.length
        ? `\n\n${t("offlineFound")}\n${notes.map((n) => `• ${t("offlineNoteLabel")}: ${lri(n.title)}`).join("\n")}\n${questions.map((x) => `• ${t("offlineMcqLabel")} ${lri(x.id)}: ${lri(x.question)} — ${lri(x.options[x.correctIndex])}`).join("\n")}`
        : `\n\n${t("noMatchFallback")}`,
      matchingAnnotations.length
        ? `\n\n${t("yourAnnotations")}\n${matchingAnnotations.map(([key, text]) => `• ${lri(key.split("||")[1] ?? key)}: ${text}`).join("\n")}`
        : "",
    ]
      .join("")
      // Manual offline search passes an empty prefix: strip the
      // leading blank lines so the results start at the heading.
      .replace(/^\n+/, "");
    return {
      text,
      sources: {
        notes: notes.map((n) => ({ title: n.title, subject: n.subject })),
        questions: questions.map((x) => x.id),
      },
    };
  }

  function runOfflineSearch(q: string) {
    const { text, sources } = offlineResult(q, "");
    setMsgs((m) => [...m, { role: "ai", text, sources }]);
    setFailedPrompt(null);
  }

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    setFailedPrompt(null);
    cancelledRef.current = false;
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
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history, lang: effectiveTutorLang, annotations: annotationsToSend }),
        signal: ctrl.signal,
      });
      const j = await res.json();
      if (!res.ok) {
        // Offline fallback: search the library directly (same content
        // as before, now with clickable citations). The prompt is
        // preserved in the input + Retry/offline actions below.
        const { text: fb, sources } = offlineResult(q, j.error ?? t("liveUnavailable"));
        setMsgs((m) => [...m, { role: "ai", text: fb, sources }]);
        setInput(q);
        setFailedPrompt(q);
      } else {
        // Step 3b-audit F14/F18 — name only a provider the API
        // actually reported; unknown values omit the via-line rather
        // than misattributing the answer.
        const providerName = providerDisplayName(j.provider);
        const answerText = providerName
          ? `${j.answer}\n\n${tf("viaLine", { provider: lri(providerName) })}`
          : j.answer;
        setMsgs((m) => [
          ...m,
          {
            role: "ai",
            text: answerText,
            sources: normalizeSources(j.sources),
          },
        ]);
      }
    } catch (e) {
      if (cancelledRef.current || (e instanceof DOMException && e.name === "AbortError")) {
        setMsgs((m) => [...m, { role: "sys", text: t("requestCancelled") }]);
        setInput(q);
      } else {
        setMsgs((m) => [...m, { role: "ai", text: t("reachTutorRetry") }]);
        setInput(q);
        setFailedPrompt(q);
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  function cancelRequest() {
    cancelledRef.current = true;
    abortRef.current?.abort();
  }

  async function explainQuestion(idArg?: string) {
    const id = (idArg ?? explainId).trim().toUpperCase();
    if (!id) return;
    setExplainId(id);
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

  // Step 2b — ?explain=<id> deep link (citation links point here):
  // prefill the explain box and run it once per id. The ref guard
  // keeps a re-render from re-running the same explanation.
  const autoExplainRef = useRef<string | null>(null);
  const explainParam = search.get("explain") ?? "";
  useEffect(() => {
    const id = explainParam.trim().toUpperCase();
    if (!id || autoExplainRef.current === id) return;
    autoExplainRef.current = id;
    explainQuestion(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explainParam]);

  return (
    <div>
      <h1>{t("tutorTitle")}</h1>
      <p className="muted">{t("tutorIntro")}</p>
      <TutorHealth variant="full" />
      {/* Stage 1 P2 — API privacy disclosure, shown before the chat form:
          the question leaves this device for the AI providers. Step 2b
          strengthens it: provider names + fallback order, retention
          limitations, and the sensitive-data warning (in tutorPrivacy). */}
      <div className="alert">
        <p className="muted">{t("tutorPrivacy")}</p>
        <p className="muted">{t("tutorWarningFallback")}</p>
        <p className="muted">{t("tutorWarningRetention")}</p>
      </div>
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
            {/* Stage 2 — `**bold**` in answers renders as <strong>
                (BoldText: React text nodes, XSS-safe by construction). */}
            {m.text === GREETING ? t("tutorGreeting") : <BoldText text={m.text} />}
            {/* Step 2b — citations: note titles + question ids as deep
                links, with the not-the-answer-key disclaimer. Rendered
                only when the message carries sources. */}
            {m.role === "ai" && m.sources && (m.sources.notes.length > 0 || m.sources.questions.length > 0) && (
              <div style={{ marginTop: 8 }}>
                <p style={{ margin: "0 0 4px" }}>
                  <b>{t("citationsHeading")}</b>
                </p>
                <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                  {m.sources.notes.map((n, ni) => (
                    <li key={`n${ni}`}>
                      {t("citationNoteLabel")}:{" "}
                      <Link
                        href={`/library?subject=${encodeURIComponent(n.subject || "all")}&q=${encodeURIComponent(n.title)}`}
                      >
                        <span dir="auto">{n.title}</span>
                      </Link>
                    </li>
                  ))}
                  {m.sources.questions.map((id) => (
                    <li key={id}>
                      {t("questionWord")}{" "}
                      <Link href={`/tutor?explain=${encodeURIComponent(id)}`}>
                        <span dir="ltr">{id}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {t("aiNotAuthority")}
                </p>
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div dir="auto" className="msg ai">
            {t("thinking")}
          </div>
        )}
      </div>
      {/* Step 2b — failure recovery: the preserved prompt is back in
          the input; Retry re-sends it, offline search answers from the
          library without the network. */}
      {failedPrompt && !busy && (
        <div className="alert">
          <p>{t("tutorFailedNote")}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => send(failedPrompt)}>{t("retryButton")}</button>
            <button className="secondary" onClick={() => runOfflineSearch(failedPrompt)}>
              {t("offlineSearchButton")}
            </button>
          </div>
        </div>
      )}
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
        {busy ? (
          <button className="secondary" onClick={cancelRequest}>
            {t("cancel")}
          </button>
        ) : (
          <button onClick={() => send()} disabled={!input.trim()}>
            {t("askButton")}
          </button>
        )}
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
          <button className="secondary" onClick={() => explainQuestion()}>
            {t("explainButton")}
          </button>
        </div>
        {explainOut && (
          <p dir="auto" style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
            <BoldText text={explainOut} />
          </p>
        )}
      </div>
    </div>
  );
}

export default function Tutor() {
  return (
    <Suspense>
      <TutorInner />
    </Suspense>
  );
}
