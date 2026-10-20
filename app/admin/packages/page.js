import { query } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { reviewPurchase } from "@/app/actions";

export default async function AdminPurchases() {
  const purchases = await query(
    `SELECT pu.*, u.name AS user_name, u.username, p.name AS package_name,
            (pu.status = 'active' AND pu.expires_at <= NOW()) AS expired
     FROM purchases pu JOIN users u ON u.id = pu.user_id JOIN packages p ON p.id = pu.package_id
     ORDER BY (pu.status = 'pending') DESC, pu.id DESC LIMIT 100`
  );
  const pending = purchases.filter((p) => p.status === "pending").length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Purchases</h1>
          <p className="muted">Customers request paid categories and sets here. Approve once payment is received. Set prices from the category cards on the home page.</p>
        </div>
      </div>

      <div className="card flush">
        <div className="card-head"><h3>Purchase requests</h3><span className="muted">{pending} pending</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Package</th><th>Requested</th><th>Status</th><th /></tr></thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td data-label="Customer"><strong>{p.user_name}</strong><div className="muted">{p.username}</div></td>
                  <td data-label="Package">{p.package_name}</td>
                  <td data-label="Requested">{fmtDate(p.requested_at)}</td>
                  <td data-label="Status">
                    {p.status === "active" && !p.expired && <><span className="badge ok">Active</span><div className="muted">until {fmtDate(p.expires_at)}</div></>}
                    {p.status === "active" && p.expired && <span className="badge">Expired {fmtDate(p.expires_at)}</span>}
                    {p.status === "pending" && <span className="badge">Pending</span>}
                    {p.status === "rejected" && <span className="badge bad">Rejected</span>}
                  </td>
                  <td className="actions">
                    <form action={reviewPurchase} className="row" style={{ gap: 8 }}>
                      <input type="hidden" name="id" value={p.id} />
                      {p.status === "pending" ? (
                        <>
                          <button name="decision" value="approve" className="sm primary">Approve</button>
                          <button name="decision" value="reject" className="sm danger">Reject</button>
                        </>
                      ) : (
                        <button name="decision" value="remove" className="sm danger">Remove</button>
                      )}
                    </form>
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && <tr><td className="empty" colSpan={5}>No purchase requests yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

    </>
  );
}
