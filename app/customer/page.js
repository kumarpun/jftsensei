import { formatDuration } from "@/lib/duration";
import Link from "next/link";
import { query } from "@/lib/db";
import CustomerTabs from "@/components/CustomerTabs";
import { GATED_SQL } from "@/lib/access";
import { mergeLinkedFree } from "@/lib/linked";
import AnnouncementCard from "@/components/AnnouncementCard";
import { requireRole } from "@/lib/session";

export default async function CustomerTests({ searchParams }) {
  const user = await requireRole("customer");
  const { cat } = await searchParams;
  // Sets sold through an active package (whole category or individually) live under My Packages / Buy Packages; All Tests shows only free ones.
  const allTests = await mergeLinkedFree(await query(
    `SELECT t.*, (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) AS question_count,
            (SELECT MAX(a.score / a.total) FROM attempts a WHERE a.test_id = t.id AND a.user_id = ? AND a.total > 0) AS best,
            0 AS locked
     FROM tests t WHERE t.is_published = 1
       AND NOT ${GATED_SQL}
       ORDER BY t.id DESC`,
    [user.id]
  ));
  const featured = await query("SELECT id, title, body, has_image, image_url, featured, created_at, 1 AS secs_left FROM announcements WHERE featured = 1 ORDER BY id DESC");
  const categories = [...new Set(allTests.map((t) => t.category).filter(Boolean))].sort();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hi, {user.name.split(" ")[0]} 👋</h1>
          <p className="muted">Pick a set and start practising.</p>
        </div>
      </div>
      <CustomerTabs active="/customer" />
      {featured.length > 0 && <div className="stack" style={{ marginBottom: 16 }}>{featured.map((a) => <AnnouncementCard key={a.id} a={a} />)}</div>}
      {(() => {
        const setCard = (list) => (
          <>{list.map((t) => (
          <div className="card stack" key={t.id}>
            <div className="row between">
              <div><h3 style={{ margin: 0 }}>{t.title}</h3>{t.category && <span className="badge" style={{ marginTop: 6 }}>{t.category}</span>}</div>
              {t.best !== null && <span className="badge ok">Best {Math.round(t.best * 100)}%</span>}
            </div>
            <div className="row between" style={{ marginTop: "auto" }}>
              <span className="muted">
                {t.question_count > 0 ? `${t.question_count} questions${t.duration_seconds > 0 ? ` · ${formatDuration(t.duration_seconds)}` : ""}` : t.form_url ? `Google Form${t.duration_seconds > 0 ? ` · ${formatDuration(t.duration_seconds)}` : ""}` : ""}
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
          ))}</>
        );
        const none = allTests.filter((t) => !t.category);
        return (
          <div className="stack" style={{ gap: 14 }}>
            {categories.map((c) => {
              const list = allTests.filter((t) => t.category === c);
              return (
                <details className="cat-card" key={c} open={cat === c || categories.length === 1}>
                  <summary>
                    <div className="pkg-badges"><span className="pkg-badge solid">{list.length} {list.length === 1 ? "set" : "sets"}</span></div>
                    <div className="cat-title">{c}</div>
                    <span className="cat-more">View sets <span className="cat-chev" aria-hidden="true">⌄</span></span>
                  </summary>
                  <div className="grid cols-2" style={{ marginTop: 14 }}>{setCard(list)}</div>
                </details>
              );
            })}
            {none.length > 0 && <div className="grid cols-2">{setCard(none)}</div>}
          </div>
        );
      })()}
      {allTests.length === 0 && <div className="card empty">No free sets available yet. Check back soon.</div>}
    </>
  );
}
