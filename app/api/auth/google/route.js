import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authUrl, googleEnabled } from "@/lib/google";

// Starts Google sign-in: remember a one-time state in a short-lived cookie, then send the browser to Google.
export async function GET(req) {
  if (!googleEnabled()) return NextResponse.redirect(new URL("/login?google=off", req.url));
  const state = randomBytes(16).toString("base64url");
  (await cookies()).set("g_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  return NextResponse.redirect(authUrl(state));
}
