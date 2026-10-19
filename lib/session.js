import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { queryOne } from "./db";

const COOKIE = "session";
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET);

export async function createSession(user) {
  const token = await new SignJWT({ uid: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(key());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return await queryOne(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [payload.uid]
    );
  } catch {
    return null;
  }
}

export async function requireRole(role) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(user.role === "admin" ? "/admin" : "/customer");
  return user;
}
