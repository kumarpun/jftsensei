import { formatDuration } from "@/lib/duration";
import Link from "next/link";
import { query } from "@/lib/db";
import { getCategories } from "@/lib/categories";
import CustomerTabs from "@/components/CustomerTabs";
import { getUser } from "@/lib/session";

export default async function CustomerTests({ searchParams }) {
  const user = await getUser();
  const { cat } = await searchParams;
  const categories = await getCategories(true);
  const active = categories.includes(cat) ? cat : null;
  const tests = await query(
    `SELECT t.*, (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) AS question_count,
            (SELECT MAX(a.score / a.total) FROM attempts a WHERE a.test_id = t.id AND a.user_id = ? AND a.total > 0) AS best,
            (EXISTS (SELECT 1 FROM package_categories pc JOIN packages p ON p.id = pc.package_id WHERE pc.category = t.category AND p.is_active = 1)
              AND NOT EXISTS (SELECT 1 FROM package_categories pc JOIN purchases pu ON pu.package_id = pc.package_id
                WHERE pc.category = t.category AND pu.user_id = ? AND pu.status = 'active' AND pu.expires_at > NOW())) AS locked
     FROM tests t WHERE t.is_published = 1 ${active ? "AND t.category = ?" : ""} ORDER BY t.id DESC`,
    active ? [user.id, user.id, active] : [user.id, user.id]
  );
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hi, {user.name.split(" ")[0]} 👋</h1>
          <p className="muted">Pick a test and start practising.</p>
        </div>
      </div>
      <CustomerTabs active="/customer" />
      {categories.length > 0 && (
        <div className="row" style={{ gap: 8, marginBottom: 16 }} aria-label="Filter by category">
          <Link className={`btn sm ${!active ? "primary" : ""}`} href="/customer">All</Link>
          {categories.map((c) => (
            <Link key={c} className={`btn sm ${active === c ? "primary" : ""}`} href={`/customer?cat=${encodeURIComponent(c)}`}>{c}</Link>
          ))}
        </div>
      )}
      <div className="grid cols-2">
        {tests.map((t) => (
          <div className="card stack" key={t.id}>
            <div className="row between">
              <div><h3 style={{ margin: 0 }}>{t.title}</h3>{t.category && <span className="badge" style={{ marginTop: 6 }}>{t.category}</span>}</div>
              {t.best !== null && <span className="badge ok">Best {Math.round(t.best * 100)}%</span>}
            </div>
            <p className="muted" style={{ margin: 0 }}>{t.description || "No description."}</p>
            <div className="row between" style={{ marginTop: "auto" }}>
              <span className="muted">
                {t.question_count > 0 ? `${t.question_count} questions · ${formatDuration(t.duration_seconds)}` : t.form_url ? "Google Form" : ""}
              </span>
              <div className="row" style={{ gap: 8 }}>
                {t.form_url && (
                  <a className={`btn ${t.question_count > 0 ? "" : "primary"}`} href={t.form_url} target="_blank" rel="noopener noreferrer">
                    Open Google Form ↗
                  </a>
                )}
                {t.question_count > 0 && t.locked
                  ? <Link className="btn" href="/customer/packages">🔒 Get a package</Link>
                  : t.question_count > 0
                  ? <Link className="btn primary" href={`/customer/test/${t.id}`}>{t.best !== null ? "Retake" : "Start"}</Link>
                  : !t.form_url && <span className="badge">Coming soon</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {tests.length === 0 && <div className="card empty">No tests available yet. Check back soon.</div>}
    </>
  );
}
