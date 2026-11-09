import { resetPassword, RESET_ERRORS } from "@/lib/customer";
import { route, body, json, fail } from "@/lib/api";

// POST { token, password } -> { ok: true }. All sessions for the account are revoked.
export const POST = route(async ({ req }) => {
  const b = await body(req);
  const res = await resetPassword(b.token, b.password);
  if (res.error) return fail(400, RESET_ERRORS[res.error], res.error);
  return json({ ok: true });
}, { role: null });
