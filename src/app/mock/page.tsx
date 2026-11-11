// Mock Tests — list of all 20 mocks / practice tests.
import Link from "next/link";
import { MOCKS, PATTERN_BANNER } from "@/lib/data";

export default function MockList() {
  return (
    <div>
      <h1>Mock Tests</h1>
      <div className="alert">
        <b>{PATTERN_BANNER}</b>
      </div>
      <p className="muted">
        Each mock states which pattern variant it follows. ZamungKor mocks are disjoint (no question
        repeats across them). Track mocks draw from the <b>shared practice bank</b> — questions may
        repeat across track mocks; this is stated on each mock because the 540-question bank cannot
        supply 8+ disjoint 100-question mocks. All mocks are <b>practice mocks, not official ETEA
        papers</b>.
      </p>
      {MOCKS.map((m) => (
        <div className="card" key={m.id}>
          <h3>
            {m.title}{" "}
            <span className="badge teal">{m.total} Q</span>
            <span className="badge grey">{m.minutes} min</span>
          </h3>
          <p className="muted">{m.note}</p>
          <Link className="btn" href={`/mock/${m.id}`}>
            Start mock
          </Link>
        </div>
      ))}
    </div>
  );
}
