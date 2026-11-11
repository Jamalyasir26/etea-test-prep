// Mock runner — /mock/[id]?mode=trusted|provisional
// Trusted mode passes { trustedOnly: true } to buildMockQuestions: only
// owner-reviewed/approved items are used and the shortfall is NEVER filled,
// so a trusted mock may have fewer questions than the mock's total.
// The question seed comes from the live session (if one exists for this
// scope) so a reload resumes the SAME questions; otherwise a fresh seed is
// used and QuizRunner persists it in the session. QuizRunner is keyed by
// scope so switching modes remounts it instead of leaking state.
"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { buildMockQuestions, MOCKS, trustedOnlyCount } from "@/lib/data";
import { loadSession } from "@/lib/tracking";
import QuizRunner from "@/components/QuizRunner";

function MockRunInner() {
  const params = useParams();
  const search = useSearchParams();
  const id = String(params.id ?? "");
  const mock = MOCKS.find((m) => m.id === id);
  const trustedOnly = search.get("mode") === "trusted";
  const scope = `mock:${id}:${trustedOnly ? "trusted" : "provisional"}`;

  const [questionSeed] = useState(() => {
    const live = loadSession(scope);
    return live?.questionSeed ? live.questionSeed : String(Date.now());
  });
  const questions = useMemo(
    () => (mock ? buildMockQuestions(mock, questionSeed, { trustedOnly }) : []),
    [mock, questionSeed, trustedOnly],
  );

  if (!mock) {
    return (
      <div>
        <h1>Mock not found</h1>
        <p>
          <Link href="/mock">Back to all mocks</Link>
        </p>
      </div>
    );
  }
  const note = trustedOnly
    ? `Trusted-only: ${questions.length} of ${mock.total} questions — only owner-reviewed/approved items (${trustedOnlyCount(mock)} reviewed in this mock); the shortfall is not filled. ${mock.note}`
    : mock.note;
  return (
    <QuizRunner
      key={scope}
      title={mock.title}
      questions={questions}
      minutes={mock.minutes}
      mode="mock"
      mockId={mock.id}
      trackId={mock.track}
      note={note}
      trustedOnly={trustedOnly}
      sessionScope={scope}
      questionSeed={questionSeed}
    />
  );
}

export default function MockRun() {
  return (
    <Suspense>
      <MockRunInner />
    </Suspense>
  );
}
