// Track detail — /tracks/[id]
import Link from "next/link";
import { MOCKS, TRACKS } from "@/lib/data";

export default async function TrackDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tr = TRACKS.find((t) => t.id === id);
  if (!tr) {
    return (
      <div>
        <h1>Track not found</h1>
        <p>
          <Link href="/tracks">Back to all tracks</Link>
        </p>
      </div>
    );
  }
  const mocks = MOCKS.filter((m) => m.track === tr.id);
  return (
    <div>
      <h1>
        {tr.name} <span className="badge teal">{tr.bps}</span>
      </h1>
      <div className="card">
        <h3>Eligibility</h3>
        <p>{tr.elig}</p>
        <h3>Pattern</h3>
        <p>{tr.pattern}</p>
        <p>
          <span className={`badge ${tr.conf.includes("NOT VERIFIED") || tr.conf.includes("JOB-SITE") ? "red" : "green"}`}>
            {tr.conf}
          </span>
        </p>
      </div>
      <h2>Mocks for this track</h2>
      {mocks.length === 0 ? (
        <p className="muted">
          No mock yet — subject bank not built. Use the Library + Practice sections for the
          subjects in this pattern.
        </p>
      ) : (
        mocks.map((m) => (
          <div className="card" key={m.id}>
            <h3>
              {m.title} <span className="badge teal">{m.total} Q</span>{" "}
              <span className="badge grey">{m.minutes} min</span>
            </h3>
            <p className="muted">{m.note}</p>
            <Link className="btn" href={`/mock/${m.id}`}>
              Start mock
            </Link>
          </div>
        ))
      )}
      <p>
        <Link href="/tracks">← All tracks</Link>
      </p>
    </div>
  );
}
