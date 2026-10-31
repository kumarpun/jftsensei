import { registerCustomer } from "@/lib/customer";
import { issueToken } from "@/lib/session";
import { route, body, json, fail, publicUser } from "@/lib/api";

// POST { name, email, password } -> 201 { token, user }
export const POST = route(async ({ req }) => {
  const res = await registerCustomer(await body(req));
  if (res.error) return fail(400, res.error, "validation");
  return json({ token: await issueToken(res.user), user: publicUser(res.user) }, 201);
}, { role: null });
