import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/session";
import { findOrCreateCustomer, googleEnabled, profileFromCode } from "@/lib/google";

export async function GET(req) {
  const go = (path) => NextResponse.redirect(new URL(path, process.env.APP_URL || req.url));
  if (!googleEnabled()) return go("/login?google=off");
  const q = new URL(req.url).searchParams;
  const store = await cookies();
  const expected = store.get("g_state")?.value;
  store.delete("g_state");
  if (q.get("error") || !q.get("code") || !expected || q.get("state") !== expected) return go("/login?google=failed");
  let profile;
  try {
    profile = await profileFromCode(q.get("code"));
  } catch (e) {
    console.error("[google] sign-in failed", e);
  }
  if (!profile) return go("/login?google=failed");
  const res = await findOrCreateCustomer(profile);
  if (res.error) return go("/login?google=admin");
  await createSession(res.user);
  return go("/customer/packages");
}
