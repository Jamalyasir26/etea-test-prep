// Practice from Past-Paper Topics — original + reworded.
// NO past-paper documents, PDFs or verbatim questions are hosted here.
"use client";

import { BY_SUBJECT } from "@/lib/data";
import QuizRunner from "@/components/QuizRunner";

export default function Topics() {
  const original = BY_SUBJECT["pastpapers"] ?? [];
  const reworded = BY_SUBJECT["pastpapers_reworded"] ?? [];
  return (
    <div>
      <h1>Practice from Past-Paper Topics</h1>
      <div className="alert">
        <b>No past-paper documents or PDFs are hosted here, and no past-paper question is copied
        verbatim.</b>{" "}
        Past papers were used only as a source for <b>what topics and facts are tested</b>. Every
        question below is written in our own words.
      </div>
      <ul>
        <li>
          Original practice questions are labelled: “Original practice question based on past-paper
          topics — not the actual paper”.
        </li>
        <li>
          Reworded versions are labelled: “Same concept as a past-paper question, reworded in a
          different style — not the actual paper”.
        </li>
      </ul>
      <h2>Original practice — {original.length} questions</h2>
      <QuizRunner
        title="Past-paper topics — original practice (20 questions)"
        questions={original}
        mode="practice"
        subject="Past-Paper Topics"
      />
      <h2>Same concepts, reworded — {reworded.length} questions</h2>
      <QuizRunner
        title="Past-paper topics — same concepts, reworded (20 questions)"
        questions={reworded}
        mode="practice"
        subject="Past-Paper Topics (Reworded)"
      />
    </div>
  );
}
