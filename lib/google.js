// Google sign-in (OAuth 2.0 authorization-code flow, no extra dependencies).
// Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET; the redirect URI to register in Google Cloud is
// ${APP_URL}/api/auth/google/callback.
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { query, queryOne } from "@/lib/db";

export const googleEnabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const redirectUri = () => `${(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}/api/auth/google/callback`;

export function authUrl(state) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

// Exchanges the code and returns { email, name } for a Google-verified address, or null.
export async function profileFromCode(code) {
  const tok = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!tok.ok) return null;
  const { access_token } = await tok.json();
  if (!access_token) return null;
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${access_token}` } });
  if (!res.ok) return null;
  const p = await res.json();
  const email = String(p.email || "").trim().toLowerCase();
  if (!p.email_verified || !email || email.length > 190) return null;
  return { email, name: String(p.name || email.split("@")[0]).trim().slice(0, 100) };
}

// Existing customer with this email signs in; otherwise a customer account is created.
// Returns { user } or { error } (admins must use the password login).
export async function findOrCreateCustomer({ email, name }) {
  const user = await queryOne("SELECT * FROM users WHERE email = ?", [email]);
  if (user) return user.role === "customer" ? { user } : { error: "admin" };
  // Random password: the account is Google-only until the customer uses "Forgot password" to set one.
  const hash = await bcrypt.hash(randomBytes(24).toString("base64url"), 10);
  const res = await query("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'customer')", [name, email, hash]);
  return { user: { id: res.insertId, name, email, role: "customer" } };
}

// Mobile app: verifies a Google ID token (obtained by the native Google SDK) and returns { email, name } or null.
// The token's audience must be GOOGLE_CLIENT_ID (the app passes it as serverClientId) or one of GOOGLE_EXTRA_CLIENT_IDS.
export async function profileFromIdToken(idToken) {
  if (!idToken || typeof idToken !== "string" || idToken.length > 4096) return null;
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) return null;
  const p = await res.json();
  const allowed = [process.env.GOOGLE_CLIENT_ID, ...(process.env.GOOGLE_EXTRA_CLIENT_IDS || "").split(",")].map((s) => (s || "").trim()).filter(Boolean);
  if (!allowed.includes(p.aud)) return null;
  const email = String(p.email || "").trim().toLowerCase();
  if (String(p.email_verified) !== "true" || !email || email.length > 190) return null;
  return { email, name: String(p.name || email.split("@")[0]).trim().slice(0, 100) };
}
