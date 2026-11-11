import { query, queryOne } from "@/lib/db";
import { route, json, fail } from "@/lib/api";
import { revalidatePath } from "next/cache";

// POST: customer cancels their own pending request. The purchase row and its admin notifications are deleted.
export const POST = route(async ({ user, params }) => {
  const id = Number(params.id);
  const pu = await queryOne("SELECT id FROM purchases WHERE id = ? AND user_id = ? AND status = 'pending'", [id, user.id]);
  if (!pu) return fail(404, "No pending request found.", "not_found");
  await query("DELETE FROM purchases WHERE id = ? AND user_id = ? AND status = 'pending'", [id, user.id]);
  // the notifications table is created lazily; ignore if it doesn't exist yet
  await query("DELETE FROM notifications WHERE purchase_id = ?", [id]).catch(() => {});
  revalidatePath("/admin/packages");
  revalidatePath("/admin/notifications");
  return json({ ok: true });
});
