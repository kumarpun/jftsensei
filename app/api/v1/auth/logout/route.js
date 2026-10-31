import { destroySession } from "@/lib/session";
import { route, json } from "@/lib/api";

export const POST = route(async () => {
  await destroySession();
  return json({ ok: true });
}, { role: null });
