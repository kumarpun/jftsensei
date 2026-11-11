import Link from "next/link";
import ProfileMenu from "./ProfileMenu";

// Slim bar above the page content: notification bell with unread count (admin) and the profile menu.
export default function TopBar({ user, unread = 0 }) {
  return (
    <header className="topbar">
      {user.role === "admin" && (
      <Link href="/admin/notifications" className="bell" aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"} title="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2zM10 21h4" /></svg>
        {unread > 0 && <span className="bell-badge">{unread > 99 ? "99+" : unread}</span>}
      </Link>
      )}
      <ProfileMenu user={user} />
    </header>
  );
}
