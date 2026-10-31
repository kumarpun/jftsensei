import { requestPurchase } from "@/lib/customer";
import { route, json, fail } from "@/lib/api";

// POST -> { status: "pending", whatsappUrl } | { status: "active" }
export const POST = route(async ({ user, params }) => {
  const res = await requestPurchase(user, Number(params.id));
  if (res.error) return fail(404, "Package not found.", "not_found");
  return json({ status: res.status, whatsappUrl: res.whatsappUrl ?? null });
});
