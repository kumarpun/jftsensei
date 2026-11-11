import { route, json } from "@/lib/api";
import { listNotifications, unreadCount } from "@/lib/notifications";

export const GET = route(async ({ user }) => {
  const [items, unread] = await Promise.all([listNotifications("user", user.id), unreadCount("user", user.id)]);
  return json({
    unread,
    notifications: items.map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, read: Boolean(n.is_read), createdAt: n.created_at })),
  });
});
