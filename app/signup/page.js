import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { signup } from "@/app/actions";
import { getUser } from "@/lib/session";

export default async function SignupPage() {
  const user = await getUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/customer/packages");
  return (
    <div className="auth-wrap">
      <div className="card">
        <h1>Create your account</h1>
        <p className="muted">Sign up to take mock tests and buy packages.</p>
        <AuthForm action={signup} mode="signup" />
      </div>
      <p className="muted" style={{ textAlign: "center" }}>Already have an account? <Link href="/login">Login</Link></p>
    </div>
  );
}
