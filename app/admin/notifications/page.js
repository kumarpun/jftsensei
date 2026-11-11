import { listNotifications } from "@/lib/notifications";
import { markAdminNotificationsRead } from "@/app/actions";
import { fmtDate } from "@/lib/dates";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminNotifications() {
  const items = await listNotifications("admin", null, 100);
  const unread = items.filter((n) => !n.is_read).length;
  return (
    <>
      <div className="page-head">
        <h1>Notifications</h1>
        {unread > 0 && (
          <form action={markAdminNotificationsRead}><button className="btn sm">Mark all read</button></form>
        )}
      </div>
      <div className="card flush">
        {items.length === 0 ? (
          <p className="muted" style={{ padding: 18 }}>No notifications yet.</p>
        ) : (
          <div className="notice-list">
            {items.map((n) => (
              <Link key={n.id} href="/admin/packages" className={`notice ${n.is_read ? "" : "unread"}`}>
                <strong>{n.title}</strong>
                <span>{n.body}</span>
                <small>{fmtDate(n.created_at)}</small>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
