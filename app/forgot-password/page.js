import Link from "next/link";
import { redirect } from "next/navigation";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import { forgotPassword } from "@/app/actions";
import { getUser } from "@/lib/session";

export default async function ForgotPasswordPage() {
  const user = await getUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/customer/packages");
  return (
    <div className="auth-wrap">
      <div className="card">
        <h1>Forgot password?</h1>
        <p className="muted">Enter your account email and we&apos;ll send you a reset link.</p>
        <ForgotPasswordForm action={forgotPassword} />
      </div>
      <p className="muted" style={{ textAlign: "center" }}><Link href="/login">Back to login</Link></p>
    </div>
  );
}
