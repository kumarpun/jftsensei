import { query } from "@/lib/db";
import DeleteCustomerButton from "@/components/DeleteCustomerButton";

export default async function AdminCustomers() {
  const rows = await query(`
    SELECT u.id, u.name, u.username, u.email, u.created_at,
           (SELECT COUNT(*) FROM attempts a WHERE a.user_id = u.id) AS attempt_count
    FROM users u WHERE u.role = 'customer' ORDER BY u.id DESC`);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Customers</h1>
          <p className="muted">Students sign up themselves from the login page.</p>
        </div>
      </div>
      <div className="card flush">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Login</th><th>Attempts</th><th>Created</th><th /></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td data-label="Customer"><strong>{u.name}</strong>{u.email && <div className="muted">{u.email}</div>}</td>
                  <td data-label="Login">{u.username || u.email}</td>
                  <td data-label="Attempts">{u.attempt_count}</td>
                  <td data-label="Created">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="actions">
                    <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                      <DeleteCustomerButton id={u.id} />
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td className="empty" colSpan={5}>No customers yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
