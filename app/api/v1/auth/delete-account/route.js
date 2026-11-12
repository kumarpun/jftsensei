import { deleteCustomerAccount } from "@/lib/customer";
import { route, json, fail } from "@/lib/api";

// POST (Bearer) -> { ok: true }. Permanently deletes the signed-in customer and all their data (sessions go with the row).
export const POST = route(async ({ user }) => {
  const res = await deleteCustomerAccount(user);
  if (res.error) return fail(403, "Only customer accounts can be deleted here.", res.error);
  return json({ ok: true });
});
