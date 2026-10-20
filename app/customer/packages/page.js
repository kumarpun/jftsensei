import { query } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { requestPackage } from "@/app/actions";
import CustomerTabs from "@/components/CustomerTabs";
import { fmtDate } from "@/lib/dates";

export default async function BuyPackages() {
  const user = await requireRole("customer");
  const [packages, included, titles, mine, pkgCats] = await Promise.all([
    query("SELECT * FROM packages WHERE is_active = 1 ORDER BY price, id"),
    query(
    `SELECT pc.package_id, pc.category, COUNT(t.id) AS sets
     FROM package_categories pc JOIN tests t ON t.category = pc.category AND t.is_published = 1
     GROUP BY pc.package_id, pc.category ORDER BY pc.category`
  ),
    query(
    `SELECT pc.package_id, t.id, t.title, t.category
     FROM package_categories pc JOIN tests t ON t.category = pc.category AND t.is_published = 1
     UNION
     SELECT pt.package_id, t.id, t.title, t.category
     FROM package_tests pt JOIN tests t ON t.id = pt.test_id AND t.is_published = 1 ORDER BY id`
  ),
    query(
    `SELECT package_id, status, expires_at FROM purchases
     WHERE user_id = ? AND (status = 'pending' OR (status = 'active' AND expires_at > NOW()))`,
    [user.id]),
    query(
    `SELECT pt.package_id, t.category FROM package_tests pt JOIN tests t ON t.id = pt.test_id WHERE t.category IS NOT NULL AND t.category <> ''`
  ),
  ]);

  // Only packages with at least one published set are on sale.
  const onSale = packages.filter((p) => titles.some((r) => r.package_id === p.id));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Packages</h1>
          <p className="muted">Choose a package to unlock its mock tests for a set number of days.</p>
        </div>
      </div>
      <CustomerTabs active="/customer/packages" />
      <div className="grid cols-2">
        {onSale.map((p) => {
          const cats = included.filter((r) => r.package_id === p.id);
          const list = titles.filter((r) => r.package_id === p.id);
          const setCats = [...new Set(pkgCats.filter((r) => r.package_id === p.id).map((r) => r.category))].filter((c) => !cats.some((x) => x.category === c));
          const own = mine.find((m) => m.package_id === p.id);
          return (
            <div className="pkg" key={p.id}>
              {setCats.length > 0 && <h2 className="pkg-cat">{setCats.join(", ")}</h2>}
              <div className="pkg-badges">
                <span className="pkg-badge solid">◷ {p.days} {p.days === 1 ? "day" : "days"}</span>
                <span className="pkg-badge">{list.length} mock {list.length === 1 ? "test" : "tests"}</span>
                {cats.map((c) => <span className="pkg-badge" key={c.category}>{String(c.sets).padStart(2, "0")} {c.category}</span>)}
              </div>
              <h3 className="pkg-name">{p.name}</h3>
              <div className="pkg-buy">
                <div className="pkg-price">
                  {p.original_price && <s>{Number(p.original_price)}</s>}
                  <b>{Number(p.price)}</b>
                </div>
                {!own && (
                  <form action={requestPackage}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="pkg-btn">Buy Now</button>
                  </form>
                )}
                {own?.status === "pending" && <button className="pkg-btn" disabled>Requested</button>}
                {own?.status === "active" && <button className="pkg-btn" disabled>Active</button>}
              </div>
              {own?.status === "active" && <div className="muted pkg-note">Active until {fmtDate(own.expires_at)}</div>}
              {own?.status === "pending" && <div className="muted pkg-note">Waiting for admin approval after payment.</div>}
              <details className="pkg-more">
                <summary>Learn More</summary>
                {p.description && <p>{p.description}</p>}
                {list.length > 0 && <ul>{list.map((t) => <li key={t.id}>{t.title}{t.category && <span className="muted"> · {t.category}</span>}</li>)}</ul>}
                {!p.description && list.length === 0 && <p className="muted">No details yet.</p>}
              </details>
            </div>
          );
        })}
      </div>
      {onSale.length === 0 && <div className="card empty">No packages are on sale right now.</div>}
    </>
  );
}
