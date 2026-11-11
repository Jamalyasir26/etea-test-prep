// Vacancy Tracker — manually curated. No next-ESED date is invented.
import { VACANCIES } from "@/lib/data";

export default function Vacancies() {
  return (
    <div>
      <h1>Vacancy Tracker</h1>
      <div className="alert">
        <b>Manually curated — check <a href="https://etea.online/" target="_blank" rel="noreferrer">etea.online</a> for the latest.</b>{" "}
        No next ESED date is published here — the “Dec 2026/Jan 2027” claim is an unverified
        Facebook rumour.
      </div>
      <table>
        <thead>
          <tr>
            <th>Post</th>
            <th>BPS</th>
            <th>Vacancies</th>
            <th>Last date</th>
            <th>Eligibility</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {VACANCIES.map((v) => (
            <tr key={v.post}>
              <td>{v.post}</td>
              <td>{v.bps}</td>
              <td>{v.vac}</td>
              <td>{v.last}</td>
              <td>{v.elig}</td>
              <td>{v.src}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
