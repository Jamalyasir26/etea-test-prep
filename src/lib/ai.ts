// SERVER-ONLY AI layer. Never import this file from a client component.
// Keys are read only from process.env on the server and are never logged,
// returned, or embedded in any response. If a key is invalid, the caller gets
// a clear message — never a fake answer and never the key itself.
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { retrieve, PLAN21, type Question } from "./data";

// Stage 0 re-pin (2026-11-12): `gemini-2.0-flash` was SHUT DOWN by Google on
// 1 June 2026 (ai.google.dev/gemini-api/docs/deprecations) — that dead model
// is why the live tutor never answered. Google's recommended replacement is
// `gemini-3.6-flash` (Stable, released 21 July 2026, no shutdown announced).
// SDK migrated at the same time: @google/generative-ai 0.24.1 (deprecated,
// sunset 30 Nov 2025) → @google/genai 3.2.0 (requires Node >= 22).
export const GEMINI_MODEL = "gemini-3.6-flash";
// Stage 1 P1 Tier 1 (2026-11-12): `llama-3.3-70b-versatile` was SHUT DOWN
// for free/developer accounts on 16 Aug 2026 and is now Enterprise-only
// (Groq docs: console.groq.com/docs/deprecations — Groq's own recommended
// replacement is `openai/gpt-oss-120b`; models page confirms it is a
// Production model on the Developer plan, 500 tok/s, 131K context).
// GPT-OSS is a REASONING model: it spends the output-token budget on
// reasoning first, so the health probe must allow more than a few tokens
// or the visible reply comes back empty — see probeGroq (max_tokens 128).
// Free-plan limits for GPT-OSS (Groq free-plan guide): 30 RPM / 1K RPD,
// 8K TPM shared input+output — ample for a single-user fallback.
export const GROQ_MODEL = "openai/gpt-oss-120b";
// OpenRouter third fallback — a FREE model only. Stage 1 P1 Tier 1
// (2026-11-12): the previous `google/gemma-4-26b-a4b-it:free` is STILL on
// OpenRouter's free list (verified against the public
// https://openrouter.ai/api/v1/models on 2026-11-12: 13 free models,
// pricing $0/$0), but its upstream provider rate-limited it (HTTP 429)
// on two consecutive live health runs. Switched to the sibling
// `google/gemma-4-31b-it:free` — same Gemma 4 family, also $0/$0 on the
// same list, 262K context, but a separate upstream capacity pool. If this
// one 429s live too, the next option is the `openrouter/free` router
// (auto-picks a free model with capacity) — not adopted now because the
// health probe should report one deterministic model. A ":free" model can
// never incur a charge, so the key's spending limit is never touched.
export const OPENROUTER_MODEL = "google/gemma-4-31b-it:free";
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

// ---------------------------------------------------------------------------
// Stage 0 — per-provider diagnostics (added 2026-11-12).
// Every provider attempt is logged as ONE JSON line to stdout (Vercel runtime
// logs capture it): provider, model, durationMs, ok, and — on failure — an
// error class + a TRUNCATED, secret-scrubbed error message (max 200 chars).
// NEVER logged: any key material, key prefix/suffix, or full credential.
// Error messages are scrubbed for key-shaped strings before logging, so even
// an SDK that echoes a credential in its error text cannot leak it.
// ---------------------------------------------------------------------------

export type ProviderName = "gemini" | "groq" | "openrouter";

export type ProviderAttempt = {
  provider: ProviderName;
  model: string;
  ok: boolean;
  durationMs: number;
  errorClass?: string;
  errorMessage?: string;
  // Stage 1 P1 Tier 2 — attempt numbering for the bounded retry: 1 is the
  // first try, 2 is the single retry. `retry: true` marks retry attempts
  // so the logs stay truthful about what was tried and when.
  attempt?: number;
  retry?: boolean;
};

/** Redact anything shaped like an API key/credential from a string. */
export function scrubSecrets(text: string): string {
  let out = text;
  // Google AI Studio keys (legacy AIza… and current AQ.Ab8… auth keys).
  out = out.replace(/AIza[0-9A-Za-z_\-]{10,}/g, "[REDACTED_KEY]");
  out = out.replace(/AQ\.Ab8[0-9A-Za-z_\-]{10,}/g, "[REDACTED_KEY]");
  // Groq keys.
  out = out.replace(/gsk_[0-9A-Za-z]{10,}/g, "[REDACTED_KEY]");
  // OpenRouter keys.
  out = out.replace(/sk-or-v1-[0-9A-Za-z_\-]{10,}/g, "[REDACTED_KEY]");
  // Bearer tokens and key= query values.
  out = out.replace(/Bearer\s+[0-9A-Za-z_\-.~+/=]{10,}/gi, "Bearer [REDACTED_KEY]");
  out = out.replace(/([?&](?:key|api_key|apikey)=)[^&\s]{6,}/gi, "$1[REDACTED_KEY]");
  return out;
}

/**
 * Map a thrown error to a short, stable error class (no key material).
 * Message tokens are checked FIRST: some errors wrap an upstream status
 * (e.g. our own AiError carries status 502 while its message reports a
 * 401 from the provider), so the numeric status alone would misclassify.
 */
export function classifyProviderError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: unknown; status?: unknown; statusCode?: unknown } | null);
  const status =
    typeof code?.status === "number"
      ? code.status
      : typeof code?.statusCode === "number"
        ? code.statusCode
        : undefined;
  const codeStr = typeof code?.code === "string" ? code.code : "";
  if (/NO_(GEMINI|GROQ|OPENROUTER)_KEY/.test(msg)) return "not_configured";
  if (
    status === 401 ||
    status === 403 ||
    /(^|[^0-9])401([^0-9]|$)/.test(msg) ||
    /(^|[^0-9])403([^0-9]|$)/.test(msg) ||
    /API_KEY_INVALID|API key not valid|invalid_api_key|invalid api key|invalid key|unauthenticated|ACCESS_TOKEN_TYPE_UNSUPPORTED|User not found/i.test(msg)
  ) {
    return "invalid_key";
  }
  if (status === 429 || /(^|[^0-9])429([^0-9]|$)/.test(msg) || /quota|RESOURCE_EXHAUSTED|rate.?limit/i.test(msg)) return "quota";
  if (status === 404 || /(^|[^0-9])404([^0-9]|$)/.test(msg) || /model not found|NOT_FOUND/i.test(msg)) return "model_not_found";
  if (/timeout|timed out|AbortError|aborted/i.test(msg) || codeStr === "ETIMEDOUT") return "timeout";
  if (/fetch failed|network|connection error|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|socket hang up|EPROTO|wrong version number/i.test(msg)) return "network";
  if (/Empty response/i.test(msg)) return "empty_response";
  if (status === 402 || /payment|insufficient.*credit/i.test(msg)) return "payment";
  if (status !== undefined) return `http_${status}`;
  return "unknown";
}

function logAttempt(a: ProviderAttempt): void {
  // One JSON line per attempt; safe to grep in Vercel runtime logs.
  console.log(JSON.stringify({ event: "tutor_provider_attempt", ...a }));
}

/** Time one provider call, log the attempt (success or failure), rethrow errors.
 *  `extra` carries the Tier 2 attempt number / retry marker into the log
 *  line. Exported for the node test suite (scripts/test-timeouts.mjs),
 *  which proves the retry marker is logged — production callers use the
 *  provider functions below, never this directly. */
export async function timedCall<T>(
  provider: ProviderName,
  model: string,
  fn: () => Promise<T>,
  extra?: { attempt?: number; retry?: boolean },
): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    logAttempt({ provider, model, ok: true, durationMs: Date.now() - started, ...extra });
    return result;
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    logAttempt({
      provider,
      model,
      ok: false,
      durationMs: Date.now() - started,
      errorClass: classifyProviderError(err),
      errorMessage: scrubSecrets(raw).slice(0, 200),
      ...extra,
    });
    throw err;
  }
}

/** Reject after `ms` with a timeout error (used only by probes/eval, never the answer path). */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export type ProviderHealth = {
  configured: boolean;
  status: "ok" | "error" | "not_configured";
  latencyMs: number;
  model: string;
  errorClass?: string;
  errorMessage?: string;
  // Stage 1 P1 Tier 1: set only when errorClass is "timeout". A probe
  // timeout on a cold instance is usually warm-up, not a dead provider —
  // the health response says so plainly instead of just reporting "down".
  timeoutHint?: string;
};

// Stage 1 P1 Tier 1 (2026-11-12) — probe bound 10 s → 15 s. The old 10 s
// bound timed out Gemini on the first (cold) health call while warm calls
// answer in ~2 s. The bound — not the platform — was the problem:
// Vercel's official Functions limits (vercel.com/docs/functions/limits,
// updated 2026-08-24) give Hobby 300 s default AND maximum duration with
// Fluid compute, so the old "10 s Hobby timeout" in third-party blogs is
// outdated. This route sets maxDuration = 30 and the three probes run in
// parallel, so a 15 s bound finishes in ~15 s worst case — inside the
// route budget with margin, inside the Hobby budget by 20x.
// NO warm-up cron was added: Vercel's own cron docs
// (vercel.com/docs/cron-jobs/usage-and-pricing) limit Hobby crons to once
// per day, while a serverless instance stays warm only minutes after an
// invocation — a daily ping cannot keep the function warm for an on-demand
// health check, so it would burn a cron slot and fix nothing. The honest
// fix is the longer bound + the coldStart flag in the health route.
export const PROBE_TIMEOUT_MS = 15000;

// Shown on a provider whose probe timed out: a timeout on a cold
// instance is usually warm-up, not a dead provider — retry once.
export const TIMEOUT_HINT =
  "Probe hit its 15s bound — on a cold instance this is usually warm-up, not a dead provider; wait a few seconds and retry once.";

// Stage 1 P1 Tier 2 (2026-11-12) — ANSWER-path bounds. The health probe
// keeps its own separate 15 s PROBE_TIMEOUT_MS above — untouched.
// Per-provider bound: 8 s on EVERY provider call in the answer path.
// Overall deadline: 15 s for the whole attempt across providers, so a
// slow provider plus its one retry can never hang the tutor past it.
// Both fit easily inside the Vercel Hobby 300 s Fluid-compute budget
// (vercel.com/docs/functions/limits) and the answer route's budget.
export const PROVIDER_TIMEOUT_MS = 8000;
export const ANSWER_DEADLINE_MS = 15000;
// At most ONE retry per provider (2 attempts total), and only for
// transient errors — see isTransientErrorClass below.
export const MAX_PROVIDER_ATTEMPTS = 2;

/**
 * Transient error classes: safe to retry ONCE. Everything else must
 * NEVER be retried — retrying an invalid key, a dead model, a payment
 * failure or a bad request only burns quota and delays the honest
 * answer. Transient: timeout, network, quota (429), and any 5xx
 * (http_5xx). Non-transient: invalid_key, model_not_found, payment,
 * not_configured, unknown, empty_response, http_4xx.
 */
export function isTransientErrorClass(errorClass: string): boolean {
  return (
    errorClass === "timeout" ||
    errorClass === "network" ||
    errorClass === "quota" ||
    /^http_5\d\d$/.test(errorClass)
  );
}

const PROBE_PROMPT = "Reply with exactly the word OK and nothing else.";

async function probeGemini(): Promise<Omit<ProviderHealth, "configured">> {
  const started = Date.now();
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return { status: "not_configured", latencyMs: 0, model: GEMINI_MODEL };
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await withTimeout(
      ai.models.generateContent({ model: GEMINI_MODEL, contents: PROBE_PROMPT }),
      PROBE_TIMEOUT_MS,
      "Gemini probe",
    );
    const text = response.text ?? "";
    return { status: "ok", latencyMs: Date.now() - started, model: GEMINI_MODEL, errorMessage: scrubSecrets(text).slice(0, 50) };
  } catch (err) {
    const errorClass = classifyProviderError(err);
    return {
      status: "error",
      latencyMs: Date.now() - started,
      model: GEMINI_MODEL,
      errorClass,
      errorMessage: scrubSecrets(err instanceof Error ? err.message : String(err)).slice(0, 200),
      ...(errorClass === "timeout" ? { timeoutHint: TIMEOUT_HINT } : {}),
    };
  }
}

async function probeGroq(): Promise<Omit<ProviderHealth, "configured">> {
  const started = Date.now();
  try {
    const key = process.env.GROQ_API_KEY;
    if (!key) return { status: "not_configured", latencyMs: 0, model: GROQ_MODEL };
    const groq = new Groq({ apiKey: key });
    const chat = await withTimeout(
      groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: PROBE_PROMPT }],
        temperature: 0,
        // GPT-OSS is a reasoning model: it spends the output budget on
        // reasoning before the visible reply, so max_tokens: 5 (fine for
        // Llama) would come back empty. 128 leaves room for a short
        // reasoning trace + "OK".
        max_tokens: 128,
      }),
      PROBE_TIMEOUT_MS,
      "Groq probe",
    );
    const text = chat.choices[0]?.message?.content ?? "";
    if (!text) throw new Error("Empty response from Groq");
    return { status: "ok", latencyMs: Date.now() - started, model: GROQ_MODEL };
  } catch (err) {
    const errorClass = classifyProviderError(err);
    return {
      status: "error",
      latencyMs: Date.now() - started,
      model: GROQ_MODEL,
      errorClass,
      errorMessage: scrubSecrets(err instanceof Error ? err.message : String(err)).slice(0, 200),
      ...(errorClass === "timeout" ? { timeoutHint: TIMEOUT_HINT } : {}),
    };
  }
}

async function probeOpenRouter(): Promise<Omit<ProviderHealth, "configured">> {
  const started = Date.now();
  try {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return { status: "not_configured", latencyMs: 0, model: OPENROUTER_MODEL };
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
        messages: [{ role: "user", content: PROBE_PROMPT }],
        temperature: 0,
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenRouter HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("Empty response from OpenRouter");
    return { status: "ok", latencyMs: Date.now() - started, model: OPENROUTER_MODEL };
  } catch (err) {
    const errorClass = classifyProviderError(err);
    return {
      status: "error",
      latencyMs: Date.now() - started,
      model: OPENROUTER_MODEL,
      errorClass,
      errorMessage: scrubSecrets(err instanceof Error ? err.message : String(err)).slice(0, 200),
      ...(errorClass === "timeout" ? { timeoutHint: TIMEOUT_HINT } : {}),
    };
  }
}

/**
 * Probe each configured provider's RESPONSIVENESS (not just key presence).
 * Cheap: one tiny generation per provider, 10 s bound each, run in parallel.
 * Returns per-provider status; never includes key material.
 */
export async function probeProviders(): Promise<Record<ProviderName, ProviderHealth>> {
  const status = providerStatus();
  const [gemini, groq, openrouter] = await Promise.all([
    probeGemini(),
    probeGroq(),
    probeOpenRouter(),
  ]);
  return {
    gemini: { configured: status.gemini, ...gemini },
    groq: { configured: status.groq, ...groq },
    openrouter: { configured: status.openrouter, ...openrouter },
  };
}

export class AiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Thrown when the overall answer deadline (Tier 2) is hit. The chain
 *  stops immediately on this error instead of trying the next provider —
 *  there is no time left for it. An AiError, so routes return 502 with
 *  the honest message. */
export class DeadlineError extends AiError {
  constructor(deadlineMs: number) {
    super(
      502,
      `The tutor took too long to answer (${Math.round(deadlineMs / 1000)}s overall deadline). Please try again in a moment.`,
    );
    this.name = "DeadlineError";
  }
}

const LANG_NAME: Record<string, string> = {
  en: "English",
  roman: "Roman Urdu (Urdu written in Latin letters)",
  ur: "Urdu (اردو)",
  // Stage 1 P1 Tier 2 — Arabic answer language. The library excerpts
  // stay as they are; the ANSWER comes back in Arabic.
  ar: "Arabic (العربية)",
};

// Stage 1 P1 Tier 2 — the tutor's answer languages. The API routes
// (tutor / explain / plan) validate `lang` through this helper; unknown
// values fall back to "en" (the previous default). The site-wide UI
// toggle (en/roman/ur) is untouched — Arabic is a TUTOR answer language
// only, chosen on the tutor page itself.
export const TUTOR_LANGS = ["en", "roman", "ur", "ar"] as const;
export type TutorLang = (typeof TUTOR_LANGS)[number];
export function normalizeTutorLang(value: unknown): TutorLang {
  return value === "en" || value === "roman" || value === "ur" || value === "ar" ? value : "en";
}

const SYSTEM = `You are Ustad, a study tutor for KP government job tests (ETEA / KPPSC: ZamungKor, ESED TT/AT/PST/CT/Qari, SST).
Rules you must follow:
- Answer ONLY from the library excerpts given in the prompt. If the question is outside them, say so plainly and suggest the closest library topic — never invent facts.
- NEVER invent Hadith numbers, references, dates or quotes. NEVER invent a syllabus, weightage, BPS, deadline or result. If you are unsure, say "not verified in this library".
- Never claim to be ETEA, KPPSC or any official body. You are a practice tutor, not an official source.
- Keep answers short, exam-focused, and end with one quick self-test question when it fits.`;

function contextBlock(query: string, ownerAnnotations?: { note: string; text: string }[]): string {
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
  // Stage 1 P0.3 — owner annotations, included ONLY because the owner
  // enabled the opt-in. They are the owner's own notes, labelled as such,
  // not library facts; the model must not present them as verified facts.
  const a =
    ownerAnnotations && ownerAnnotations.length > 0
      ? `\nOWNER ANNOTATIONS (the owner's own private notes, included only because the owner enabled this — treat them as the owner's notes, not as verified library facts):\n${ownerAnnotations
          .map((x) => `- [Owner note on: ${x.note}] ${x.text.slice(0, 500)}`)
          .join("\n")}`
      : "";
  return `LIBRARY EXCERPTS (use only these):\nNOTES:\n${n || "(none found)"}\nMCQs:\n${q || "(none found)"}${a}`;
}

function langInstruction(lang: string) {
  return `Answer in ${LANG_NAME[lang] ?? "English"}.`;
}

/** Options passed from the answer chain into each provider call (Tier 2):
 *  `signal` aborts the underlying request at the bound; `attempt` is 1
 *  for the first try, 2 for the single bounded retry (logged). */
export type ProviderCallOptions = {
  signal?: AbortSignal;
  attempt?: number;
};

/** Attempt marker for the log line: attempt 1 = first try, 2 = retry. */
function attemptMarker(opts?: ProviderCallOptions): { attempt: number; retry: boolean } {
  const attempt = opts?.attempt ?? 1;
  return { attempt, retry: attempt > 1 };
}

async function callGemini(prompt: string, opts?: ProviderCallOptions): Promise<string> {
  return timedCall(
    "gemini",
    GEMINI_MODEL,
    async () => {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new AiError(503, "NO_GEMINI_KEY");
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        // Tier 2: abortSignal cancels the request client-side at the
        // bound (GenerateContentConfig supports it in @google/genai
        // 3.2.0). The withTimeout race in the chain is the backstop.
        config: {
          systemInstruction: SYSTEM,
          ...(opts?.signal ? { abortSignal: opts.signal } : {}),
        },
      });
      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini");
      return text;
    },
    attemptMarker(opts),
  );
}

async function callGroq(prompt: string, opts?: ProviderCallOptions): Promise<string> {
  return timedCall(
    "groq",
    GROQ_MODEL,
    async () => {
      const key = process.env.GROQ_API_KEY;
      if (!key) throw new AiError(503, "NO_GROQ_KEY");
      const groq = new Groq({ apiKey: key });
      const chat = await groq.chat.completions.create(
        {
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 1200,
        },
        // Tier 2: the SDK's RequestOptions carry the abort signal.
        opts?.signal ? { signal: opts.signal } : undefined,
      );
      const text = chat.choices[0]?.message?.content ?? "";
      if (!text) throw new Error("Empty response from Groq");
      return text;
    },
    attemptMarker(opts),
  );
}

async function callOpenRouter(prompt: string, opts?: ProviderCallOptions): Promise<string> {
  return timedCall(
    "openrouter",
    OPENROUTER_MODEL,
    async () => {
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
        // Tier 2: fetch aborts promptly at the bound.
        ...(opts?.signal ? { signal: opts.signal } : {}),
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
    },
    attemptMarker(opts),
  );
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

/** Try Gemini first, then Groq, then OpenRouter (free model). Never returns a fake answer.
 *  ownerAnnotations (Stage 1 P0.3): the owner's private note annotations,
 *  passed ONLY when the owner enabled the opt-in — otherwise [].
 *  `impls` (Stage 1 P1 Tier 1): test seam only — the three provider calls
 *  as an injectable object so node tests can stub failures and prove the
 *  fallback order (Gemini → Groq → OpenRouter) without live keys or
 *  network. Production callers never pass it; the default is the real
 *  provider calls. NO live kill-switch is added anywhere: the health
 *  probe already tests each provider independently, so a health run
 *  showing Groq ok IS the per-provider proof — disabling Gemini live to
 *  test a fallback is unnecessary.
 *  Tier 2 bounds: every provider attempt is bounded by min(8s, remaining
 *  overall budget) via an AbortSignal AND a race (the signal cancels
 *  fetch/Groq/Gemini promptly; the race enforces the bound even if an
 *  SDK ignored the signal). Each provider gets at most ONE retry, only
 *  for transient errors (timeout/network/quota/5xx). The whole attempt
 *  is capped by the 15s overall deadline: when it hits, the chain stops
 *  and returns the honest deadline error — it never hangs.
 *  `bounds` (Tier 2): test seam only — node tests inject tiny bounds so
 *  the timeout/retry/deadline behaviour is proven in milliseconds
 *  instead of real seconds. Production callers never pass it. */
export type TutorProviderImpls = {
  gemini: (prompt: string, opts?: ProviderCallOptions) => Promise<string>;
  groq: (prompt: string, opts?: ProviderCallOptions) => Promise<string>;
  openrouter: (prompt: string, opts?: ProviderCallOptions) => Promise<string>;
};

export type TutorAnswerBounds = {
  providerTimeoutMs?: number;
  answerDeadlineMs?: number;
};

const defaultTutorImpls: TutorProviderImpls = {
  gemini: callGemini,
  groq: callGroq,
  openrouter: callOpenRouter,
};

export async function generateTutorAnswer(
  userPrompt: string,
  lang: string,
  ownerAnnotations: { note: string; text: string }[] = [],
  impls: TutorProviderImpls = defaultTutorImpls,
  bounds: TutorAnswerBounds = {},
): Promise<{ text: string; provider: "gemini" | "groq" | "openrouter" }> {
  const status = providerStatus();
  if (!status.gemini && !status.groq && !status.openrouter) {
    throw new AiError(
      503,
      "Live AI is not configured yet — no API key is set on the server. The offline Study Assistant on this site still works (it searches this library).",
    );
  }
  const providerTimeoutMs = bounds.providerTimeoutMs ?? PROVIDER_TIMEOUT_MS;
  const answerDeadlineMs = bounds.answerDeadlineMs ?? ANSWER_DEADLINE_MS;
  const startedAt = Date.now();
  const remainingMs = () => answerDeadlineMs - (Date.now() - startedAt);
  const prompt = `${contextBlock(userPrompt, ownerAnnotations)}\n\n${langInstruction(lang)}\n\nUSER QUESTION:\n${userPrompt}`;

  // Try ONE provider with at most one bounded retry for transient
  // errors. The attempt's AbortSignal bound is min(8s, remaining
  // overall budget), so a slow provider plus its retry can never blow
  // past the 15s deadline. Retries are logged as separate attempts
  // with the retry marker (see timedCall / attemptMarker).
  const tryProvider = async (
    name: ProviderName,
    call: (prompt: string, opts?: ProviderCallOptions) => Promise<string>,
  ): Promise<string> => {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= MAX_PROVIDER_ATTEMPTS; attempt++) {
      if (remainingMs() <= 0) throw new DeadlineError(answerDeadlineMs);
      const bound = Math.min(providerTimeoutMs, remainingMs());
      try {
        return await withTimeout(
          call(prompt, { signal: AbortSignal.timeout(bound), attempt }),
          bound,
          `${name} answer`,
        );
      } catch (e) {
        lastError = e;
        // NO_*_KEY: the provider is not really configured — never retry,
        // fall through immediately (existing behaviour).
        if (e instanceof AiError && /^NO_(GEMINI|GROQ|OPENROUTER)_KEY$/.test(e.message)) throw e;
        // Deadline hit: stop the whole chain now, do not try the next provider.
        if (e instanceof DeadlineError) throw e;
        const canRetry =
          attempt < MAX_PROVIDER_ATTEMPTS &&
          isTransientErrorClass(classifyProviderError(e)) &&
          remainingMs() > 0;
        if (!canRetry) throw e;
        // Otherwise loop once: the single bounded retry.
      }
    }
    throw lastError;
  };

  // Try each configured provider in order; keep the first error for the final message.
  let firstError: unknown = null;
  let firstErrorProvider: "gemini" | "groq" | "openrouter" | null = null;
  if (status.gemini) {
    try {
      const text = await tryProvider("gemini", impls.gemini);
      return { text, provider: "gemini" };
    } catch (e) {
      if (e instanceof DeadlineError) throw e;
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
      const text = await tryProvider("groq", impls.groq);
      return { text, provider: "groq" };
    } catch (e) {
      if (e instanceof DeadlineError) throw e;
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
      const text = await tryProvider("openrouter", impls.openrouter);
      return { text, provider: "openrouter" };
    } catch (e) {
      if (e instanceof DeadlineError) throw e;
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
