import Link from "next/link";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/session";
import CustomerTabs from "@/components/CustomerTabs";
import { fmtDate } from "@/lib/dates";
import Countdown from "@/components/Countdown";

export default async function MyPackages() {
  const user = await requireRole("customer");
  const [purchases, tests] = await Promise.all([
    query(
    `SELECT pu.*, p.name, p.days, (pu.status = 'active' AND pu.expires_at > NOW()) AS live,
            DATEDIFF(pu.expires_at, NOW()) AS days_left, TIMESTAMPDIFF(SECOND, NOW(), pu.expires_at) AS secs_left
     FROM purchases pu JOIN packages p ON p.id = pu.package_id
     WHERE pu.user_id = ? AND pu.status <> 'rejected' ORDER BY pu.id DESC`,
    [user.id]),
    query(
    `SELECT DISTINCT pc.package_id, t.id, t.title FROM package_categories pc
     JOIN tests t ON t.category = pc.category AND t.is_published = 1 ORDER BY t.id`
  ),
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My Packages</h1>
          <p className="muted">Packages you have requested or unlocked.</p>
        </div>
      </div>
      <CustomerTabs active="/customer/my-packages" />
      <div className="grid cols-2">
        {purchases.map((p) => (
          <div className="pkg" key={p.id}>
            <div className="pkg-badges">
              {p.live ? <span className="pkg-badge solid">Active</span> : p.status === "pending" ? <span className="pkg-badge">Awaiting approval</span> : <span className="pkg-badge">Expired</span>}
              {p.live && <span className="pkg-badge">{Math.max(0, p.days_left)} days left · until {fmtDate(p.expires_at)}</span>}
              {p.live && <span className="pkg-badge danger">⏱ <Countdown seconds={Math.max(0, Number(p.secs_left))} /></span>}
            </div>
            <h3 className="pkg-name" style={{ gridColumn: "1 / -1" }}>{p.name}</h3>
            {p.live && (
              <div className="stack" style={{ gridColumn: "1 / -1", gap: 8 }}>
                {tests.filter((t) => t.package_id === p.package_id).map((t) => (
                  <div className="row between" key={t.id}>
                    <span>{t.title}</span>
                    <Link className="btn sm primary" href={`/customer/test/${t.id}`}>Start</Link>
                  </div>
                ))}
              </div>
            )}
            {p.status === "pending" && <div className="muted pkg-note" style={{ gridColumn: "1 / -1" }}>The admin will activate it once payment is confirmed.</div>}
            {p.status === "active" && !p.live && <Link className="btn sm" style={{ justifySelf: "start" }} href="/customer/packages">Buy again</Link>}
          </div>
        ))}
      </div>
      {purchases.length === 0 && (
        <div className="card empty">You have no packages yet. <Link href="/customer/packages">Browse packages</Link></div>
      )}
    </>
  );
}
