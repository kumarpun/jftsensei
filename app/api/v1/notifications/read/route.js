import { route, json } from "@/lib/api";
import { markAllRead } from "@/lib/notifications";

export const POST = route(async ({ user }) => {
  await markAllRead("user", user.id);
  return json({ ok: true });
});
