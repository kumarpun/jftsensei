import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import PackageFields from "@/components/PackageFields";
import { fmtDate } from "@/lib/dates";
import { createPackage, updatePackage, togglePackage, deletePackage, reviewPurchase } from "@/app/actions";

export default async function AdminPackages({ searchParams }) {
  const { edit } = await searchParams;
  const editId = Number(edit) || null;
  const categories = await query(
    `SELECT category, COUNT(*) AS test_count FROM tests WHERE category IS NOT NULL AND category <> '' GROUP BY category ORDER BY category`
  );
  const tests = await query("SELECT id, title, category FROM tests ORDER BY category, id");
  const packages = await query(
    `SELECT p.*, (SELECT COUNT(*) FROM tests t WHERE t.category IN (SELECT pc.category FROM package_categories pc WHERE pc.package_id = p.id)
              OR t.id IN (SELECT pt.test_id FROM package_tests pt WHERE pt.package_id = p.id)) AS test_count,
            (SELECT GROUP_CONCAT(t.title ORDER BY t.id SEPARATOR ', ') FROM package_tests pt JOIN tests t ON t.id = pt.test_id WHERE pt.package_id = p.id) AS set_list,
            (SELECT GROUP_CONCAT(pc.category ORDER BY pc.category SEPARATOR ', ') FROM package_categories pc WHERE pc.package_id = p.id) AS category_list
     FROM packages p ORDER BY p.id DESC`
  );
  const purchases = await query(
    `SELECT pu.*, u.name AS user_name, u.username, p.name AS package_name,
            (pu.status = 'active' AND pu.expires_at <= NOW()) AS expired
     FROM purchases pu JOIN users u ON u.id = pu.user_id JOIN packages p ON p.id = pu.package_id
     ORDER BY (pu.status = 'pending') DESC, pu.id DESC LIMIT 100`
  );
  const editing = editId ? packages.find((p) => p.id === editId) : null;
  const selected = editing
    ? (await query("SELECT category FROM package_categories WHERE package_id = ?", [editing.id])).map((r) => r.category)
    : [];
  const selectedTests = editing
    ? (await query("SELECT test_id FROM package_tests WHERE package_id = ?", [editing.id])).map((r) => r.test_id)
    : [];
  const pending = purchases.filter((p) => p.status === "pending").length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Packages</h1>
          <p className="muted">Sell time-limited access to sets of tests. Customers request a package and you approve it once paid.</p>
        </div>
      </div>

      {editing ? (
        <form action={updatePackage} className="card stack">
          <h3>Edit package</h3>
          <input type="hidden" name="id" value={editing.id} />
          <PackageFields p={editing} categories={categories} tests={tests} selected={selected} selectedTests={selectedTests} />
          <div className="row"><button className="primary">Save package</button><Link href="/admin/packages" className="btn">Cancel</Link></div>
        </form>
      ) : (
        <form action={createPackage} className="card stack">
          <h3>Create a package</h3>
          <PackageFields categories={categories} tests={tests} />
          <div><button className="primary">Create package</button></div>
        </form>
      )}

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

      <div className="card flush">
        <div className="card-head"><h3>All packages</h3><span className="muted">{packages.length} total</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Package</th><th>Days</th><th>Price</th><th>Contents</th><th>Status</th><th /></tr></thead>
            <tbody>
              {packages.map((p) => (
                <tr key={p.id}>
                  <td data-label="Package"><strong>{p.name}</strong></td>
                  <td data-label="Days">{p.days}</td>
                  <td data-label="Price">{p.original_price && <s className="muted">{Number(p.original_price)} </s>}{Number(p.price)}</td>
                  <td data-label="Contents">{p.category_list && <div>Categories: {p.category_list}</div>}{p.set_list && <div>Sets: {p.set_list}</div>}<div className="muted">{p.test_count} sets</div></td>
                  <td data-label="Status"><span className={`badge ${p.is_active ? "ok" : ""}`}>{p.is_active ? "On sale" : "Hidden"}</span></td>
                  <td className="actions">
                    <div className="row" style={{ gap: 8 }}>
                      <Link href={`/admin/packages?edit=${p.id}`} className="btn sm">Edit</Link>
                      <form action={togglePackage}><input type="hidden" name="id" value={p.id} /><button className="sm">{p.is_active ? "Hide" : "Show"}</button></form>
                      <form action={deletePackage}><input type="hidden" name="id" value={p.id} /><button className="sm danger">Delete</button></form>
                    </div>
                  </td>
                </tr>
              ))}
              {packages.length === 0 && <tr><td className="empty" colSpan={6}>No packages yet — create your first one above.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
