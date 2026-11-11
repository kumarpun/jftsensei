"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { markAdminNotificationRead, markAdminNotificationsRead } from "@/app/actions";
import { notificationHref } from "@/lib/notificationLinks";

const ICON = { request: "🛒", resend: "🔁" };

const ago = (iso) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
};

// Bell with a pop-up of recent notifications; each item opens the page for its kind.
export default function NotificationBell({ unread = 0, items = [] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Pick up new notifications without a manual reload.
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && router.refresh(), 30000);
    return () => clearInterval(t);
  }, [router]);

  const go = (n) => {
    setOpen(false);
    if (!n.is_read) markAdminNotificationRead(n.id);
  };

  return (
    <div className="notif">
      <button type="button" className="bell" aria-haspopup="dialog" aria-expanded={open} aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"} title="Notifications" onClick={() => setOpen((o) => !o)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2zM10 21h4" /></svg>
        {unread > 0 && <span className="bell-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <>
          <div className="setmenu-shade" onClick={() => setOpen(false)} />
          <div className="notif-pop" role="dialog" aria-label="Notifications">
            <div className="notif-head">
              <strong>Notifications</strong>
              {unread > 0 && <button type="button" className="notif-link" onClick={() => markAdminNotificationsRead()}>Mark all read</button>}
            </div>
            <div className="notif-list">
              {items.length === 0 && <p className="muted notif-empty">No notifications yet.</p>}
              {items.map((n) => (
                <Link key={n.id} href={notificationHref(n.kind, "admin")} className={`notif-item${n.is_read ? "" : " unread"}`} onClick={() => go(n)}>
                  <span className="notif-ico" aria-hidden="true">{ICON[n.kind] || "🔔"}</span>
                  <span className="notif-txt">
                    <strong>{n.title}</strong>
                    {n.body && <span>{n.body}</span>}
                    <small>{ago(n.at)}</small>
                  </span>
                  {!n.is_read && <span className="notif-dot" aria-label="Unread" />}
                </Link>
              ))}
            </div>
            <Link href="/admin/notifications" className="notif-all" onClick={() => setOpen(false)}>View all notifications</Link>
          </div>
        </>
      )}
    </div>
  );
}
