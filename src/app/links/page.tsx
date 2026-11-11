// Official Links — link out only. No textbook or past-paper PDFs hosted.
import { OFFICIAL_LINKS } from "@/lib/data";

export default function Links() {
  return (
    <div>
      <h1>Official Links</h1>
      <p className="muted">
        Link out only — no textbook or past-paper PDFs are hosted on this site. ETEA has published
        no model-MCQ book and collaborates with no prep institution.
      </p>
      {OFFICIAL_LINKS.map(([name, url, note]) => (
        <div className="card" key={url}>
          <h3>
            <a href={url} target="_blank" rel="noreferrer">
              {name} ↗
            </a>
          </h3>
          <p className="muted">{note}</p>
        </div>
      ))}
    </div>
  );
}
