// Post Tracks — 19 tracks with BPS, eligibility, pattern, confidence.
import Link from "next/link";
import { MOCKS, PATTERN_BANNER, TRACKS } from "@/lib/data";

export default function Tracks() {
  return (
    <div>
      <h1>Post Tracks</h1>
      <div className="alert">
        <b>{PATTERN_BANNER}</b>
      </div>
      {TRACKS.map((tr) => {
        const mocks = MOCKS.filter((m) => m.track === tr.id);
        return (
          <div className="card" key={tr.id}>
            <h3>
              <Link href={`/tracks/${tr.id}`}>{tr.name}</Link>{" "}
              <span className="badge teal">{tr.bps}</span>
            </h3>
            <p className="muted">{tr.pattern}</p>
            <p>
              <span className={`badge ${tr.conf.includes("NOT VERIFIED") || tr.conf.includes("JOB-SITE") ? "red" : "green"}`}>
                {tr.conf}
              </span>
              {mocks.length > 0 && (
                <span className="muted"> · {mocks.length} mock{mocks.length > 1 ? "s" : ""}</span>
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}
