import { requestPasswordReset } from "@/lib/customer";
import { route, body, json } from "@/lib/api";

// POST { email } -> always 200 so account existence isn't leaked. The emailed link opens the web reset page.
export const POST = route(async ({ req }) => {
  const b = await body(req);
  await requestPasswordReset(b.email);
  return json({ ok: true, message: "If an account exists for that email, a reset link has been sent." });
}, { role: null });
