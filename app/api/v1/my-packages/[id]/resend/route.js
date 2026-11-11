import { queryOne } from "@/lib/db";
import { route, json, fail } from "@/lib/api";
import { notify, recentAdminNotice } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

// POST: customer nudges the admin about a pending request (once per 10 minutes).
export const POST = route(async ({ user, params }) => {
  const id = Number(params.id);
  const pu = await queryOne(
    "SELECT pu.id, p.name FROM purchases pu JOIN packages p ON p.id = pu.package_id WHERE pu.id = ? AND pu.user_id = ? AND pu.status = 'pending'",
    [id, user.id]
  );
  if (!pu) return fail(404, "No pending request found.", "not_found");
  if (await recentAdminNotice(id, "resend", 10)) return fail(429, "Already sent recently. Please wait a few minutes before resending.", "rate_limited");
  await notify({ audience: "admin", kind: "resend", title: `${user.name} re-sent a request`, body: `${pu.name} · ${user.email}`, purchaseId: id });
  revalidatePath("/admin/packages");
  return json({ ok: true });
});
