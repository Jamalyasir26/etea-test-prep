// Mock runner — /mock/[id]
"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { buildMockQuestions, MOCKS } from "@/lib/data";
import QuizRunner from "@/components/QuizRunner";

export default function MockRun() {
  const params = useParams();
  const id = String(params.id ?? "");
  const mock = MOCKS.find((m) => m.id === id);
  const [seed] = useState(() => String(Date.now()));
  const questions = useMemo(
    () => (mock ? buildMockQuestions(mock, seed) : []),
    [mock, seed],
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
  return (
    <QuizRunner
      title={mock.title}
      questions={questions}
      minutes={mock.minutes}
      mode="mock"
      mockId={mock.id}
      trackId={mock.track}
      note={mock.note}
    />
  );
}
