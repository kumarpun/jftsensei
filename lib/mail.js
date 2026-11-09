// Sends the password reset email via Resend's HTTP API (no SDK). Env: RESEND_API_KEY, MAIL_FROM, APP_URL.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export async function sendPasswordResetEmail(user, token) {
  // Link base comes from config only, never from request headers (host-header injection).
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const link = `${base}/reset-password?token=${encodeURIComponent(token)}`;
  const { RESEND_API_KEY, MAIL_FROM } = process.env;

  if (!RESEND_API_KEY || !MAIL_FROM) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY / MAIL_FROM not set");
    console.log(`[mail] (dev, no RESEND_API_KEY) reset link for ${user.email}: ${link}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: MAIL_FROM,
      to: [user.email],
      subject: "Reset your JFT Sensei password",
      text: `Hi ${user.name},\n\nReset your password using this link (valid for 1 hour):\n${link}\n\nIf you didn't request this, ignore this email.`,
      html: `<p>Hi ${esc(user.name)},</p><p><a href="${esc(link)}">Reset your password</a> (link valid for 1 hour).</p><p>If you didn't request this, ignore this email.</p>`,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
