// POST /api/plan — AI study plan (3/6/12 weeks) built on the 21-day base
// plan and the user's own weak subjects from saved scores.
import { NextRequest, NextResponse } from "next/server";
import { AiError, generateTutorAnswer, normalizeTutorLang, planContext, rateLimitOk } from "@/lib/ai";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "local";
}

export async function POST(req: NextRequest) {
  try {
    const rl = rateLimitOk(clientIp(req));
    if (!rl.ok) return NextResponse.json({ error: rl.message }, { status: 429 });
    const body = await req.json().catch(() => ({}));
    // Stage 1 P1 Tier 2: shares the tutor generation path, so it accepts
    // the same languages (including "ar"); unknown values fall back to "en".
    const lang = normalizeTutorLang(body.lang);
    const weeks = [3, 6, 12].includes(Number(body.weeks)) ? Number(body.weeks) : 3;
    const weakSubjects = Array.isArray(body.weakSubjects)
      ? body.weakSubjects.filter((s: unknown) => typeof s === "string").slice(0, 5)
      : [];
    const prompt =
      `Create a ${weeks}-week study plan for one student preparing for KP government job tests (ETEA/KPPSC).\n` +
      `${planContext(weeks, weakSubjects)}\n\n` +
      `Rules: spread the base plan over ${weeks} weeks; give weak subjects extra revision slots; ` +
      `keep daily load realistic (about 2–3 hours/day on the 3-week plan, less on longer plans); ` +
      `include one mock test per week and a final revision week; label the timetable as a sample, not a prescription; ` +
      `never invent a syllabus, date or deadline.`;
    const { text, provider } = await generateTutorAnswer(prompt, lang);
    return NextResponse.json({ plan: text, provider, weeks });
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Could not generate a plan right now." }, { status: 500 });
  }
}
