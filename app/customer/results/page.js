import Link from "next/link";
import { query } from "@/lib/db";
import { getUser } from "@/lib/session";

export default async function MyResults() {
  const user = await getUser();
  const rows = await query(
    `SELECT a.id, a.score, a.total, a.timed_out, a.submitted_at, t.title
     FROM attempts a JOIN tests t ON t.id = a.test_id
     WHERE a.user_id = ? ORDER BY a.id DESC`,
    [user.id]
  );
  return (
    <>
      <div className="page-head">
        <div>
          <h1>My results</h1>
          <p className="muted">Your attempt history.</p>
        </div>
      </div>
      <div className="card flush">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Test</th><th>Score</th><th>Date</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => {
                const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
                return (
                  <tr key={r.id}>
                    <td data-label="Test"><strong>{r.title}</strong></td>
                    <td data-label="Score"><span className={`badge ${pct >= 50 ? "ok" : "bad"}`}>{r.score}/{r.total} · {pct}%</span>{r.timed_out ? <> <span className="badge bad">Incomplete</span></> : null}</td>
                    <td data-label="Date">{new Date(r.submitted_at).toLocaleString()}</td>
                    <td className="actions"><Link href={`/customer/results/${r.id}`} className="btn sm">Review</Link></td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td className="empty" colSpan={4}>No attempts yet. <Link href="/customer">Take a test</Link></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
