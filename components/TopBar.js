import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";

// Slim bar above the page content: notification bell with unread count (admin) and the profile menu.
export default function TopBar({ user, unread = 0, recent = [] }) {
  return (
    <header className="topbar">
      {user.role === "admin" && (
      <NotificationBell unread={unread} items={recent} />
      )}
      <ProfileMenu user={user} />
    </header>
  );
}
