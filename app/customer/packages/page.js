import { subNameMap } from "@/lib/linked";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { requestPackage } from "@/app/actions";
import CustomerTabs from "@/components/CustomerTabs";
import SubmitButton from "@/components/SubmitButton";
import { fmtDate } from "@/lib/dates";
import { categoryRank } from "@/lib/categories";

export default async function BuyPackages() {
  const label = await subNameMap();
  const rank = await categoryRank();
  const catName = new Map((await query("SELECT id, name FROM categories")).map((r) => [r.id, r.name]));
  const user = await requireRole("customer");
  const [packages, included, titles, mine, pkgCats] = await Promise.all([
    query("SELECT * FROM packages WHERE is_active = 1 ORDER BY price, id"),
    query(
    `SELECT pc.package_id, pc.category_id, MAX(t.category) AS category, COUNT(t.id) AS sets
     FROM package_categories pc JOIN tests t ON t.category_id = pc.category_id AND t.is_published = 1
     GROUP BY pc.package_id, pc.category_id ORDER BY category, pc.category_id`
  ),
    query(
    `SELECT pc.package_id, t.id, t.title, t.category, t.category_id, t.folder
     FROM package_categories pc JOIN tests t ON t.category_id = pc.category_id AND t.is_published = 1
     UNION
     SELECT pt.package_id, t.id, t.title, t.category, t.category_id, t.folder
     FROM package_tests pt JOIN tests t ON t.id = pt.test_id AND t.is_published = 1 ORDER BY id`
  ),
    query(
    `SELECT package_id, status, expires_at FROM purchases
     WHERE user_id = ? AND (status = 'pending' OR (status = 'active' AND expires_at > NOW()))`,
    [user.id]),
    query(
    `SELECT pt.package_id, t.category_id, t.category FROM package_tests pt JOIN tests t ON t.id = pt.test_id WHERE t.category_id IS NOT NULL`
  ),
  ]);

  // Only packages with at least one published set are on sale.
  const onSale = packages.filter((p) => titles.some((r) => r.package_id === p.id));

  const info = (p) => {
    const cats = included.filter((r) => r.package_id === p.id);
    const list = titles.filter((r) => r.package_id === p.id);
    const setCats = [...new Set(pkgCats.filter((r) => r.package_id === p.id).map((r) => r.category_id))].filter((c) => !cats.some((x) => x.category_id === c));
    return { cats, list, setCats };
  };
  // Sets sold one by one are grouped under their category, like Free Sets; whole-category / mixed packages stay standalone.
  const groups = new Map();
  const rest = [];
  for (const p of onSale) {
    const { cats, setCats } = info(p);
    if (cats.length === 0 && setCats.length === 1) groups.set(setCats[0], [...(groups.get(setCats[0]) || []), p]);
    else rest.push(p);
  }
  // One category-wide package per grouped category (created when first bought) is what the single card buys.
  const catPkg = new Map();
  const standalone = [];
  for (const p of rest) {
    const { cats, setCats } = info(p);
    if (cats.length === 1 && setCats.length === 0 && groups.has(cats[0].category_id) && !catPkg.has(cats[0].category_id)) catPkg.set(cats[0].category_id, p);
    else standalone.push(p);
  }
  const card = (p) => {
    const { cats, list, setCats } = info(p);
    const own = mine.find((m) => m.package_id === p.id);
    return (
        <div className="pkg" key={p.id}>
          {setCats.length > 0 && <h2 className="pkg-cat">{setCats.map((c) => label(c, catName.get(c))).join(", ")}</h2>}
          <div className="pkg-badges">
            <span className="pkg-badge solid">◷ {p.days} {p.days === 1 ? "day" : "days"}</span>
            <span className="pkg-badge">{list.length} {list.length === 1 ? "set" : "sets"}</span>
            {cats.map((c) => <span className="pkg-badge" key={c.category_id}>{String(c.sets).padStart(2, "0")} {label(c.category_id, c.category)}</span>)}
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
                <SubmitButton className="pkg-btn" pendingText="Requesting…">Buy Now</SubmitButton>
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
            {list.length > 0 && <ul>{list.map((t) => <li key={t.id}>{t.title}{t.category && <span className="muted"> · {label(t.category_id, t.category)}</span>}{t.folder && <span className="muted"> · 📁 {t.folder}</span>}</li>)}</ul>}
            {!p.description && list.length === 0 && <p className="muted">No details yet.</p>}
          </details>
        </div>
      );
  };

  const groupCard = (c, list) => {
          const p = list[0];
          const sets = list.flatMap((x) => info(x).list);
          const cp = catPkg.get(c);
          const cpOwn = cp && mine.find((m) => m.package_id === cp.id);
          const owns = list.map((x) => mine.find((m) => m.package_id === x.id));
          const active = cpOwn?.status === "active" || owns.every((o) => o?.status === "active");
          const pending = !active && (cpOwn?.status === "pending" || owns.every((o) => o));
          const until = cpOwn?.status === "active" ? cpOwn.expires_at : owns[0]?.expires_at;
          return (
            <div className="pkg" key={c}>
              <div className="pkg-badges">
                <span className="pkg-badge solid">◷ {p.days} {p.days === 1 ? "day" : "days"}</span>
                <span className="pkg-badge">{sets.length} {sets.length === 1 ? "set" : "sets"}</span>
              </div>
              <h3 className="pkg-name">{label(c, catName.get(c))}</h3>
              <div className="pkg-buy">
                <div className="pkg-price">
                  {p.original_price && <s>{Number(p.original_price)}</s>}
                  <b>{Number(p.price)}</b>
                </div>
                {!active && !pending && (
                  <form action={requestPackage}>
                    <input type="hidden" name="category" value={c} />
                    <SubmitButton className="pkg-btn" pendingText="Requesting…">Buy Now</SubmitButton>
                  </form>
                )}
                {pending && <button className="pkg-btn" disabled>Requested</button>}
                {active && <button className="pkg-btn" disabled>Active</button>}
              </div>
              {active && <div className="muted pkg-note">Active until {fmtDate(until)}</div>}
              {pending && <div className="muted pkg-note">Waiting for admin approval after payment.</div>}
              <details className="pkg-more">
                <summary>Learn More</summary>
                <ul>{sets.map((t) => <li key={t.id}>{t.title}{t.folder && <span className="muted"> · 📁 {t.folder}</span>}</li>)}</ul>
              </details>
            </div>
          );
  };

  // Cards follow the admin's category order (a package ranks by its earliest category).
  const pkgRank = (p) => { const { cats, setCats } = info(p); return Math.min(1e9, ...cats.map((c) => rank(c.category_id)), ...setCats.map(rank)); };
  const entries = [
    ...[...groups].map(([c, list]) => ({ r: rank(c), id: list[0].id, node: groupCard(c, list) })),
    ...standalone.map((p) => ({ r: pkgRank(p), id: p.id, node: card(p) })),
  ].sort((a, b) => a.r - b.r || a.id - b.id);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Packages</h1>
          <p className="muted">Choose a package to unlock its sets for a set number of days.</p>
        </div>
      </div>
      <CustomerTabs active="/customer/packages" />
      <div className="grid cols-2">
        {entries.map((e) => e.node)}
      </div>
      {onSale.length === 0 && <div className="card empty">No packages are on sale right now.</div>}
    </>
  );
}
