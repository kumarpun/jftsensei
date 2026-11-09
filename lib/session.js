import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import { query, queryOne } from "./db";

const COOKIE = "session";
// Devices a customer may be logged in on at once; a new login signs out the oldest. Admins are unlimited.
export const MAX_DEVICES = 1;
const TOUCH_AFTER_MINUTES = 5;
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET);

// Creates the sessions row (enforcing the device limit) and returns a signed 7-day token.
export async function issueToken(user) {
  const sid = randomUUID();
  await query("INSERT INTO sessions (id, user_id) VALUES (?, ?)", [sid, user.id]);
  if (user.role === "customer") {
    await query(
      `DELETE FROM sessions WHERE user_id = ? AND id NOT IN (
         SELECT id FROM (SELECT id FROM sessions WHERE user_id = ? ORDER BY created_at DESC, last_seen DESC LIMIT ${MAX_DEVICES}) keep
       )`,
      [user.id, user.id]
    );
  }
  const token = await new SignJWT({ uid: user.id, sid })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(key());
  return token;
}

export async function createSession(user) {
  const token = await issueToken(user);
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

// Web uses the httpOnly cookie; the mobile app sends `Authorization: Bearer <token>`.
async function readToken() {
  const bearer = (await headers()).get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer || (await cookies()).get(COOKIE)?.value || null;
}

// Session id (sid) of the current request's token, or null. Used to keep this device signed in after a password change.
export async function getSessionId() {
  const token = await readToken();
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload.sid ?? null;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const store = await cookies();
  const token = await readToken();
  if (token) {
    try {
      const { payload } = await jwtVerify(token, key());
      if (payload.sid) await query("DELETE FROM sessions WHERE id = ?", [payload.sid]);
    } catch {}
  }
  store.delete(COOKIE);
}

// cache(): layout + page share one lookup per request instead of two DB round trips.
export const getUser = cache(async function getUser() {
  const token = await readToken();
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    // The session row must still exist: a newer login on another device deletes it, which signs this device out.
    if (!payload.sid) return null;
    const row = await queryOne(
      `SELECT u.id, u.name, u.email, u.role, s.last_seen < NOW() - INTERVAL ${TOUCH_AFTER_MINUTES} MINUTE AS stale
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.user_id = ?`,
      [payload.sid, payload.uid]
    );
    if (!row) return null;
    if (row.stale) await query("UPDATE sessions SET last_seen = NOW() WHERE id = ?", [payload.sid]);
    const { stale, ...user } = row;
    return user;
  } catch {
    return null;
  }
});

export async function requireRole(role) {
  const user = await getUser();
  if (!user) redirect("/login?signedout=1");
  if (user.role !== role) redirect(user.role === "admin" ? "/admin" : "/customer/packages");
  return user;
}
