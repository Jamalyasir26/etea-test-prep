// POST /api/tutor — live AI Tutor (Gemini primary, Groq fallback, OpenRouter free-model fallback).
// GET /api/tutor — provider availability only (no key material, ever).
import { NextRequest, NextResponse } from "next/server";
import { AiError, generateTutorAnswer, normalizeTutorLang, providerStatus, rateLimitOk } from "@/lib/ai";
import { clientIpFromHeaders, isSameOriginRequest } from "@/lib/apiGuard";
import { retrieve } from "@/lib/data";

// Stage 1 P1 Tier 3 — request order on POST: (1) same-origin check, so
// cross-origin callers never reach validation or consume quota; (2) parse
// + validate, so invalid requests do NOT consume quota; (3) rate limit
// (trusted Vercel header identity); (4) generate. See src/lib/apiGuard.ts
// for the honest limits of the same-origin check (it is not access control).
export async function GET(req: NextRequest) {
  if (!isSameOriginRequest(req.headers, "GET")) {
    return NextResponse.json(
      { error: "This API only accepts requests from the ETEA Prep site itself." },
      { status: 403 }
    );
  }
  const s = providerStatus();
  return NextResponse.json({
    live: s.gemini || s.groq || s.openrouter,
    gemini: s.gemini,
    groq: s.groq,
    openrouter: s.openrouter,
    limits: { perDay: 100, perMinute: 10 },
    health: "/api/tutor/health",
    note: "Keys are server-side only. If no provider is configured, the offline Study Assistant on the site still works. This endpoint reports key presence only — use /api/tutor/health for live responsiveness.",
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOriginRequest(req.headers, "POST")) {
      return NextResponse.json(
        { error: "This API only accepts requests from the ETEA Prep site itself." },
        { status: 403 }
      );
    }
    const body = await req.json().catch(() => ({}));
    const message = String(body.message ?? "").trim();
    // Stage 1 P1 Tier 2: "ar" (Arabic) is a valid tutor answer language;
    // unknown values fall back to "en" (the previous default).
    const lang = normalizeTutorLang(body.lang);
    if (!message) return NextResponse.json({ error: "Please type a question first." }, { status: 400 });
    if (message.length > 2000)
      return NextResponse.json({ error: "Please keep the question under 2000 characters." }, { status: 400 });
    // Rate limit AFTER validation: invalid requests above never consumed quota.
    const rl = rateLimitOk(clientIpFromHeaders(req.headers));
    if (!rl.ok) return NextResponse.json({ error: rl.message }, { status: 429 });
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const historyText = history
      .map((m: { role?: string; text?: string }) => `${m.role === "user" ? "Student" : "Ustad"}: ${String(m.text ?? "").slice(0, 500)}`)
      .join("\n");
    // Stage 1 P0.3 — owner annotations arrive ONLY when the owner enabled
    // the opt-in in the Library (default off). Validate shape and cap size;
    // anything malformed is dropped, never trusted blindly.
    const annotations = Array.isArray(body.annotations)
      ? body.annotations
          .slice(0, 20)
          .map((a: { note?: unknown; text?: unknown }) => ({
            note: String(a?.note ?? "").slice(0, 200),
            text: String(a?.text ?? "").slice(0, 1000),
          }))
          .filter((a: { note: string; text: string }) => a.note.length > 0 && a.text.trim().length > 0)
      : [];
    const prompt = historyText
      ? `Previous conversation (for context only):\n${historyText}\n\nNew question:\n${message}`
      : message;
    const { text, provider } = await generateTutorAnswer(prompt, lang, annotations);
    const { notes, questions } = retrieve(message, 3, 3);
    return NextResponse.json({
      answer: text,
      provider,
      // Step 2b — citations: note titles WITH their Library subject
      // (retrieve() attaches it) so the tutor page can deep-link each
      // citation; question ids link to the explain deep link.
      sources: {
        notes: notes.map((n) => ({ title: n.title, subject: n.subject })),
        questions: questions.map((q) => q.id),
      },
    });
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "The tutor could not answer right now. Please try again." }, { status: 500 });
  }
}
