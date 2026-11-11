import { route, json, body } from "@/lib/api";
import { deleteNotifications } from "@/lib/notifications";

// POST { id } deletes one; POST { all: true } clears the inbox.
export const POST = route(async ({ req, user }) => {
  const b = await body(req);
  if (b.all === true) await deleteNotifications("user", user.id);
  else if (Number.isInteger(b.id)) await deleteNotifications("user", user.id, b.id);
  return json({ ok: true });
});
