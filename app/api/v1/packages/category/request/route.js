import { requestPurchase, ensureCategoryPackage } from "@/lib/customer";
import { route, json, fail } from "@/lib/api";

// POST { category } -> { status: "pending", whatsappUrl } | { status: "active" }
// One purchase of a category-wide package unlocks every set in the category.
export const POST = route(async ({ user, req }) => {
  const body = await req.json().catch(() => ({}));
  const id = await ensureCategoryPackage(String(body.category || "").trim());
  const res = id ? await requestPurchase(user, id) : { error: "not_found" };
  if (res.error) return fail(404, "Package not found.", "not_found");
  return json({ status: res.status, whatsappUrl: res.whatsappUrl ?? null });
});
