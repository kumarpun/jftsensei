import Link from "next/link";
import { redirect } from "next/navigation";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import { resetPasswordAction } from "@/app/actions";
import { getUser } from "@/lib/session";

// Renders only a form; the token is consumed on submit, never on page load (mail scanners prefetch links).
export default async function ResetPasswordPage({ searchParams }) {
  const user = await getUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/customer/packages");
  const { token } = await searchParams;
  return (
    <div className="auth-wrap">
      <div className="card">
        <h1>Set a new password</h1>
        {token ? (
          <ResetPasswordForm action={resetPasswordAction} token={String(token)} />
        ) : (
          <div className="error">This reset link is invalid. <Link href="/forgot-password">Request a new one</Link>.</div>
        )}
      </div>
      <p className="muted" style={{ textAlign: "center" }}><Link href="/login">Back to login</Link></p>
    </div>
  );
}
