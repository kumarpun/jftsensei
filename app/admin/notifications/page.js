import { listNotifications } from "@/lib/notifications";
import { markAdminNotificationsRead, deleteAdminNotification } from "@/app/actions";
import { fmtDate } from "@/lib/dates";
import Link from "next/link";
import { notificationHref } from "@/lib/notificationLinks";
import ConfirmButton from "@/components/ConfirmButton";

export const dynamic = "force-dynamic";

export default async function AdminNotifications() {
  const items = await listNotifications("admin", null, 100);
  const unread = items.filter((n) => !n.is_read).length;
  return (
    <>
      <div className="page-head">
        <h1>Notifications</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {unread > 0 && <form action={markAdminNotificationsRead}><button className="btn sm">Mark all read</button></form>}
          {items.length > 0 && <form action={deleteAdminNotification}><ConfirmButton className="btn sm" message="Permanently delete ALL notifications? This cannot be undone.">Clear all</ConfirmButton></form>}
        </div>
      </div>
      <div className="card flush">
        {items.length === 0 ? (
          <p className="muted" style={{ padding: 18 }}>No notifications yet.</p>
        ) : (
          <div className="notice-list">
            {items.map((n) => (
              <div key={n.id} className={`notice ${n.is_read ? "" : "unread"}`}>
                <Link href={notificationHref(n.kind, "admin")} style={{ display: "grid", gap: 2 }}>
                  <strong>{n.title}</strong>
                  <span>{n.body}</span>
                  <small>{fmtDate(n.created_at)}</small>
                </Link>
                <form action={deleteAdminNotification}>
                  <input type="hidden" name="id" value={n.id} />
                  <ConfirmButton className="btn sm" aria-label="Delete notification" message="Permanently delete this notification?">Delete</ConfirmButton>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
