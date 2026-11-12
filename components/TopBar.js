import Link from "next/link";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";

// Slim bar above the page content: notification bell with unread count (admin) and the profile menu.
export default function TopBar({ user, unread = 0, recent = [] }) {
  return (
    <header className="topbar">
      {user.role === "customer" && (
        <Link href="/customer" className="brand topbar-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="" className="brand-logo" />
          <span>JFTSENSEI</span>
        </Link>
      )}
      {user.role === "admin" && (
      <NotificationBell unread={unread} items={recent} />
      )}
      <ProfileMenu user={user} />
    </header>
  );
}
