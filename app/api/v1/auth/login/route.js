import { authenticate } from "@/lib/customer";
import { issueToken } from "@/lib/session";
import { route, body, json, fail, publicUser } from "@/lib/api";

// POST { identifier, password } -> { token, user }. The mobile app is customer-only.
export const POST = route(async ({ req }) => {
  const b = await body(req);
  const user = await authenticate(b.identifier ?? b.email, b.password);
  if (!user) return fail(401, "Invalid email or password", "invalid_credentials");
  if (user.role !== "customer") return fail(403, "Admins must use the web dashboard.", "forbidden");
  return json({ token: await issueToken(user), user: publicUser(user) });
}, { role: null });
