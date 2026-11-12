import { googleEnabled, profileFromIdToken, findOrCreateCustomer } from "@/lib/google";
import { issueToken } from "@/lib/session";
import { route, body, json, fail, publicUser } from "@/lib/api";

// POST { idToken } -> { token, user }. Signs in (or registers) a customer from a Google ID token.
export const POST = route(async ({ req }) => {
  if (!googleEnabled()) return fail(503, "Google sign-in is not configured.", "google_off");
  const b = await body(req);
  const profile = await profileFromIdToken(b.idToken);
  if (!profile) return fail(401, "Google sign-in failed. Try again.", "google_failed");
  const { user, error } = await findOrCreateCustomer(profile);
  if (error) return fail(403, "Admins must use the web dashboard.", "forbidden");
  return json({ token: await issueToken(user), user: publicUser(user) });
}, { role: null });
