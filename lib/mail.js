// Sends the password reset email over SMTP via nodemailer.
// Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, APP_URL (SMTP_SECURE=true for port 465).
import nodemailer from "nodemailer";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const transporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  const port = Number(SMTP_PORT || 587);
  return (globalThis._mailer ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: SMTP_SECURE ? SMTP_SECURE === "true" : port === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  }));
};

export async function sendPasswordResetEmail(user, token) {
  // Link base comes from config only, never from request headers (host-header injection).
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const link = `${base}/reset-password?token=${encodeURIComponent(token)}`;
  const { SMTP_HOST, MAIL_FROM } = process.env;

  if (!SMTP_HOST || !MAIL_FROM) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP_HOST / MAIL_FROM not set");
    console.log(`[mail] (dev, no SMTP_HOST) reset link for ${user.email}: ${link}`);
    return;
  }

  await transporter().sendMail({
    from: MAIL_FROM,
    to: user.email,
    subject: "Reset your JFT Sensei password",
    text: `Hi ${user.name},\n\nReset your password using this link (valid for 1 hour):\n${link}\n\nIf you didn't request this, ignore this email.`,
    html: `<p>Hi ${esc(user.name)},</p><p><a href="${esc(link)}">Reset your password</a> (link valid for 1 hour).</p><p>If you didn't request this, ignore this email.</p>`,
  });
}
