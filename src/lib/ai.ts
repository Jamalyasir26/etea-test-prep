// SERVER-ONLY AI layer. Never import this file from a client component.
// Keys are read only from process.env on the server and are never logged,
// returned, or embedded in any response. If a key is invalid, the caller gets
// a clear message — never a fake answer and never the key itself.
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { retrieve, PLAN21, type Question } from "./data";

export const GEMINI_MODEL = "gemini-2.0-flash";
export const GROQ_MODEL = "llama-3.3-70b-versatile";
// OpenRouter third fallback — a FREE model only (pricing $0 prompt / $0
// completion, verified against https://openrouter.ai/api/v1/models on
// 2026-11-11). A ":free" model can never incur a charge, so the key's
// spending limit is never touched by tutor calls.
export const OPENROUTER_MODEL = "google/gemma-4-26b-a4b-it:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Generous single-user limits (personal use: one person prepares here).
export const LIMITS = { perDay: 100, perMinute: 10 };

type Bucket = { day: string; dayCount: number; minute: number; minuteCount: number };
const buckets = new Map<string, Bucket>();

export function rateLimitOk(ip: string): { ok: boolean; message?: string } {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const minute = Math.floor(now.getTime() / 60000);
  const b = buckets.get(ip) ?? { day, dayCount: 0, minute, minuteCount: 0 };
  if (b.day !== day) {
    b.day = day;
    b.dayCount = 0;
  }
  if (b.minute !== minute) {
    b.minute = minute;
    b.minuteCount = 0;
  }
  if (b.dayCount >= LIMITS.perDay) {
    return { ok: false, message: `Daily limit reached (${LIMITS.perDay} tutor requests/day for one user). Please try again tomorrow — your quizzes, mocks and flashcards still work offline.` };
  }
  if (b.minuteCount >= LIMITS.perMinute) {
    return { ok: false, message: `Too many requests — please wait a minute and try again (${LIMITS.perMinute}/minute).` };
  }
  b.dayCount += 1;
  b.minuteCount += 1;
  buckets.set(ip, b);
  return { ok: true };
}

export function providerStatus() {
  return {
    gemini: Boolean(process.env.GEMINI_API_KEY),
    groq: Boolean(process.env.GROQ_API_KEY),
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
  };
}

export class AiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const LANG_NAME: Record<string, string> = {
  en: "English",
  roman: "Roman Urdu (Urdu written in Latin letters)",
  ur: "Urdu (اردو)",
};

const SYSTEM = `You are Ustad, a study tutor for KP government job tests (ETEA / KPPSC: ZamungKor, ESED TT/AT/PST/CT/Qari, SST).
Rules you must follow:
- Answer ONLY from the library excerpts given in the prompt. If the question is outside them, say so plainly and suggest the closest library topic — never invent facts.
- NEVER invent Hadith numbers, references, dates or quotes. NEVER invent a syllabus, weightage, BPS, deadline or result. If you are unsure, say "not verified in this library".
- Never claim to be ETEA, KPPSC or any official body. You are a practice tutor, not an official source.
- Keep answers short, exam-focused, and end with one quick self-test question when it fits.`;

function contextBlock(query: string): string {
  const { notes, questions } = retrieve(query, 5, 5);
  const n = notes
    .map((x) => `- [Note: ${x.title}] ${x.body.slice(0, 600)}`)
    .join("\n");
  const q = questions
    .map(
      (x: Question) =>
        `- [MCQ ${x.id} (${x.subject})] ${x.question} Answer: ${x.options[x.correctIndex]}. ${x.explanation.slice(0, 300)}`,
    )
    .join("\n");
  return `LIBRARY EXCERPTS (use only these):\nNOTES:\n${n || "(none found)"}\nMCQs:\n${q || "(none found)"}`;
}

function langInstruction(lang: string) {
  return `Answer in ${LANG_NAME[lang] ?? "English"}.`;
}

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError(503, "NO_GEMINI_KEY");
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: SYSTEM });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}

async function callGroq(prompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new AiError(503, "NO_GROQ_KEY");
  const groq = new Groq({ apiKey: key });
  const chat = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 1200,
  });
  const text = chat.choices[0]?.message?.content ?? "";
  if (!text) throw new Error("Empty response from Groq");
  return text;
}

async function callOpenRouter(prompt: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new AiError(503, "NO_OPENROUTER_KEY");
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://etea-test-prep.vercel.app/",
      "X-Title": "ETEA Prep Library",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1200,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) {
      throw new AiError(
        502,
        "The saved OpenRouter API key was rejected (invalid key). Please check the key in OpenRouter and update OPENROUTER_API_KEY in Vercel.",
      );
    }
    if (res.status === 402) {
      throw new AiError(
        502,
        "OpenRouter reported a payment/credit problem. The tutor uses a free model only, so please check the key's limits in OpenRouter.",
      );
    }
    throw new Error(`OpenRouter HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (json.error?.message) throw new Error(`OpenRouter error: ${json.error.message}`);
  const text = json.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Empty response from OpenRouter");
  return text;
}

function classifyGeminiError(err: unknown): AiError {
  const msg = err instanceof Error ? err.message : String(err);
  if (/API_KEY_INVALID|API key not valid|401|403/i.test(msg)) {
    return new AiError(
      502,
      "The saved Gemini API key was rejected by Google (invalid key). Please check the key in Google AI Studio and update GEMINI_API_KEY in Vercel — the offline Study Assistant on this site still works.",
    );
  }
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) {
    return new AiError(
      502,
      "Gemini's free quota is exhausted for now. Please try again later — your quizzes, mocks and flashcards still work offline.",
    );
  }
  return new AiError(502, "Gemini could not answer right now. Please try again in a moment.");
}

/** Try Gemini first, then Groq, then OpenRouter (free model). Never returns a fake answer. */
export async function generateTutorAnswer(
  userPrompt: string,
  lang: string,
): Promise<{ text: string; provider: "gemini" | "groq" | "openrouter" }> {
  const status = providerStatus();
  if (!status.gemini && !status.groq && !status.openrouter) {
    throw new AiError(
      503,
      "Live AI is not configured yet — no API key is set on the server. The offline Study Assistant on this site still works (it searches this library).",
    );
  }
  const prompt = `${contextBlock(userPrompt)}\n\n${langInstruction(lang)}\n\nUSER QUESTION:\n${userPrompt}`;
  // Try each configured provider in order; keep the first error for the final message.
  let firstError: unknown = null;
  let firstErrorProvider: "gemini" | "groq" | "openrouter" | null = null;
  if (status.gemini) {
    try {
      const text = await callGemini(prompt);
      return { text, provider: "gemini" };
    } catch (e) {
      if (e instanceof AiError && e.message === "NO_GEMINI_KEY") {
        // fall through to the next provider
      } else {
        firstError = e;
        firstErrorProvider = "gemini";
      }
    }
  }
  if (status.groq) {
    try {
      const text = await callGroq(prompt);
      return { text, provider: "groq" };
    } catch (e) {
      if (e instanceof AiError && e.message === "NO_GROQ_KEY") {
        // fall through to the next provider
      } else if (!firstError) {
        firstError = e;
        firstErrorProvider = "groq";
      }
    }
  }
  if (status.openrouter) {
    try {
      const text = await callOpenRouter(prompt);
      return { text, provider: "openrouter" };
    } catch (e) {
      // Keep the FIRST provider's error as the final message — it is the
      // most actionable (usually the Gemini key). OpenRouter's own clear
      // 401/402 message is used only when it is the only failure.
      if (!firstError) {
        firstError = e;
        firstErrorProvider = "openrouter";
      }
    }
  }
  // Every configured provider failed.
  if (firstError) {
    if (firstError instanceof AiError) throw firstError;
    if (firstErrorProvider === "groq") {
      throw new AiError(502, "Groq could not answer right now. Please try again in a moment.");
    }
    if (firstErrorProvider === "openrouter") {
      throw new AiError(502, "OpenRouter could not answer right now. Please try again in a moment.");
    }
    throw classifyGeminiError(firstError);
  }
  throw new AiError(502, "All AI providers failed just now. Please try again in a moment.");
}

export function planContext(weeks: number, weakSubjects: string[]): string {
  const spread = weeks === 3 ? 1 : weeks === 6 ? 2 : 4;
  const days = PLAN21.map(([day, tasks]) => {
    return `${day} (spread over ${spread} day(s) in the ${weeks}-week plan): ${tasks.map(([m, t]) => `${m} min — ${t}`).join("; ")}`;
  }).join("\n");
  return `BASE 21-DAY PLAN (63 tasks, ~50 hours, 2–3 hours/day — a sample timetable, not a prescription):\n${days}\n\nWEAK SUBJECTS FROM THE USER'S OWN SCORES: ${weakSubjects.length ? weakSubjects.join(", ") : "none recorded yet — use the base plan evenly."}`;
}
