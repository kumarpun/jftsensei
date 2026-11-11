import { requestPurchase, ensureCategoryPackage } from "@/lib/customer";
import { queryOne } from "@/lib/db";
import { route, json, fail } from "@/lib/api";

// POST { category } -> { status: "pending", whatsappUrl } | { status: "active" }
// One purchase of a category-wide package unlocks every set in the category.
export const POST = route(async ({ user, req }) => {
  const body = await req.json().catch(() => ({}));
  // `category` is the category id (a legacy client may still send the name: resolve it to the first match).
  const raw = String(body.category ?? "").trim();
  let catId = /^\d+$/.test(raw) ? Number(raw) : null;
  if (!catId && raw) catId = (await queryOne("SELECT id FROM categories WHERE name = ? ORDER BY id LIMIT 1", [raw]))?.id ?? null;
  const id = catId ? await ensureCategoryPackage(catId) : null;
  const res = id ? await requestPurchase(user, id) : { error: "not_found" };
  if (res.error) return fail(404, "Package not found.", "not_found");
  return json({ status: res.status, whatsappUrl: res.whatsappUrl ?? null });
});
