import { queryOne } from "@/lib/db";

export default async function AdminDashboard() {
  const stats = await queryOne(`
    SELECT (SELECT COUNT(*) FROM tests) AS tests,
           (SELECT COUNT(*) FROM questions) AS questions,
           (SELECT COUNT(*) FROM attempts) AS attempts,
           (SELECT COUNT(*) FROM users WHERE role = 'customer') AS customers`);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">See how customers are doing.</p>
        </div>
      </div>
      <div className="grid cols-4 keep2" style={{ marginBottom: 16 }}>
        {[["Tests", stats.tests], ["Questions", stats.questions], ["Attempts", stats.attempts], ["Customers", stats.customers]].map(([label, num]) => (
          <div className="card stat" key={label}>
            <span className="num">{num}</span>
            <span className="label">{label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
