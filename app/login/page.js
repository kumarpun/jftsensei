import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { login } from "@/app/actions";

export default function LoginPage() {
  return (
    <div className="auth-wrap">
      <div className="card">
        <h1>Welcome back</h1>
        <p className="muted">Login to continue to your account.</p>
        <AuthForm action={login} />
      </div>
      <p className="muted" style={{ textAlign: "center" }}>New here? <Link href="/signup">Create an account</Link></p>
    </div>
  );
}
