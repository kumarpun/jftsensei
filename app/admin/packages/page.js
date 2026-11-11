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
  const active = purchases.filter((p) => p.status === "active" && !p.expired).length;
  const initial = (n) => String(n || "?").charAt(0).toUpperCase();

  return (
    <>
      <div className="page-head">
        <h1>Purchases</h1>
      </div>

      <div className="stat-row">
        <div className="mini-stat warn"><b>{pending}</b><span>Pending approval</span></div>
        <div className="mini-stat ok"><b>{active}</b><span>Active</span></div>
        <div className="mini-stat"><b>{purchases.length}</b><span>Total requests</span></div>
      </div>

      <div className="card flush">
        <div className="card-head"><h3>Purchase requests</h3>{pending > 0 && <span className="badge warn">{pending} pending</span>}</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Package</th><th>Requested</th><th>Status</th><th /></tr></thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td data-label="Customer">
                    <div className="who-cell"><span className="avatar">{initial(p.user_name)}</span><div><strong>{p.user_name}</strong><div className="muted">{p.username}</div></div></div>
                  </td>
                  <td data-label="Package"><span className="pkg-tag">{p.package_name}</span></td>
                  <td data-label="Requested">{fmtDate(p.requested_at)}</td>
                  <td data-label="Status">
                    {p.status === "active" && !p.expired && <><span className="badge ok dot">Active</span><div className="muted sub">until {fmtDate(p.expires_at)}</div></>}
                    {p.status === "active" && !!p.expired && <><span className="badge dot">Expired</span><div className="muted sub">{fmtDate(p.expires_at)}</div></>}
                    {p.status === "pending" && <span className="badge warn dot">Pending</span>}
                    {p.status === "rejected" && <span className="badge bad dot">Rejected</span>}
                  </td>
                  <td className="actions">
                    <form action={reviewPurchase} className="row act-row">
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
