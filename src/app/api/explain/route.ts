// POST /api/explain — explain one MCQ: why the correct answer is right
// and why the other options are wrong, grounded in the library.
import { NextRequest, NextResponse } from "next/server";
import { AiError, generateTutorAnswer, normalizeTutorLang, rateLimitOk } from "@/lib/ai";
import { clientIpFromHeaders, isSameOriginRequest } from "@/lib/apiGuard";
import { BY_ID } from "@/lib/data";

export async function POST(req: NextRequest) {
  try {
    // Stage 1 P1 Tier 3 — same order as /api/tutor: same-origin check
    // first, then validation, then the rate limit (see src/lib/apiGuard.ts).
    if (!isSameOriginRequest(req.headers, "POST")) {
      return NextResponse.json(
        { error: "This API only accepts requests from the ETEA Prep site itself." },
        { status: 403 }
      );
    }
    const body = await req.json().catch(() => ({}));
    // Stage 1 P1 Tier 2: shares the tutor generation path, so it accepts
    // the same languages (including "ar"); unknown values fall back to "en".
    const lang = normalizeTutorLang(body.lang);
    const q = BY_ID[String(body.questionId ?? "")];
    if (!q) return NextResponse.json({ error: "Question not found." }, { status: 404 });
    // Rate limit AFTER validation: unknown question IDs never consumed quota.
    const rl = rateLimitOk(clientIpFromHeaders(req.headers));
    if (!rl.ok) return NextResponse.json({ error: rl.message }, { status: 429 });
    const prompt =
      `Explain this practice MCQ to a student preparing for a KP government job test.\n` +
      `Question: ${q.question}\n` +
      `Options: ${q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join(" | ")}\n` +
      `Correct answer: ${q.options[q.correctIndex]}. Given explanation: ${q.explanation}\n` +
      `Explain in simple words why the correct answer is right and why each other option is wrong. ` +
      `Do not invent any fact, date, reference or Hadith number beyond the library. If the given explanation is wrong, say so.`;
    const { text, provider } = await generateTutorAnswer(prompt, lang);
    return NextResponse.json({ explanation: text, provider, questionId: q.id });
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Could not explain this question right now." }, { status: 500 });
  }
}
