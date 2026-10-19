import { query } from "@/lib/db";

export default async function AdminResults() {
  const rows = await query(`
    SELECT a.id, a.score, a.total, a.submitted_at, u.name, u.username, u.email, t.title
    FROM attempts a JOIN users u ON u.id = a.user_id JOIN tests t ON t.id = a.test_id
    ORDER BY a.id DESC LIMIT 200`);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Results</h1>
          <p className="muted">Latest attempts from all customers.</p>
        </div>
      </div>
      <div className="card flush">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Test</th><th>Score</th><th>Submitted</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
                return (
                  <tr key={r.id}>
                    <td data-label="Customer"><strong>{r.name}</strong><div className="muted">{r.username || r.email}</div></td>
                    <td data-label="Test">{r.title}</td>
                    <td data-label="Score">
                      <span className={`badge ${pct >= 50 ? "ok" : "bad"}`}>{r.score}/{r.total} · {pct}%</span>
                    </td>
                    <td data-label="Submitted">{new Date(r.submitted_at).toLocaleString()}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td className="empty" colSpan={4}>No attempts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
