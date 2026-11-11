// POST /api/tutor — live AI Tutor (Gemini primary, Groq fallback, OpenRouter free-model fallback).
// GET /api/tutor — provider availability only (no key material, ever).
import { NextRequest, NextResponse } from "next/server";
import { AiError, generateTutorAnswer, providerStatus, rateLimitOk } from "@/lib/ai";
import { retrieve } from "@/lib/data";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "local";
}

export async function GET() {
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
    const rl = rateLimitOk(clientIp(req));
    if (!rl.ok) return NextResponse.json({ error: rl.message }, { status: 429 });
    const body = await req.json().catch(() => ({}));
    const message = String(body.message ?? "").trim();
    const lang = ["en", "roman", "ur"].includes(body.lang) ? body.lang : "en";
    if (!message) return NextResponse.json({ error: "Please type a question first." }, { status: 400 });
    if (message.length > 2000)
      return NextResponse.json({ error: "Please keep the question under 2000 characters." }, { status: 400 });
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const historyText = history
      .map((m: { role?: string; text?: string }) => `${m.role === "user" ? "Student" : "Ustad"}: ${String(m.text ?? "").slice(0, 500)}`)
      .join("\n");
    const prompt = historyText
      ? `Previous conversation (for context only):\n${historyText}\n\nNew question:\n${message}`
      : message;
    const { text, provider } = await generateTutorAnswer(prompt, lang);
    const { notes, questions } = retrieve(message, 3, 3);
    return NextResponse.json({
      answer: text,
      provider,
      sources: {
        notes: notes.map((n) => n.title),
        questions: questions.map((q) => q.id),
      },
    });
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "The tutor could not answer right now. Please try again." }, { status: 500 });
  }
}
