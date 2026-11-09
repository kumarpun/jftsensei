import { changePassword, CHANGE_ERRORS } from "@/lib/customer";
import { getSessionId } from "@/lib/session";
import { route, body, json, fail } from "@/lib/api";

// POST { currentPassword, newPassword } (Bearer) -> { ok: true }. Other devices are signed out; this token stays valid.
export const POST = route(async ({ req, user }) => {
  const b = await body(req);
  const res = await changePassword(user, await getSessionId(), b.currentPassword, b.newPassword);
  if (res.error) return fail(res.error === "wrong_password" ? 403 : 400, CHANGE_ERRORS[res.error], res.error);
  return json({ ok: true });
});
