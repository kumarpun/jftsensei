import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { login } from "@/app/actions";

export default async function LoginPage({ searchParams }) {
  const { signedout } = await searchParams;
  return (
    <div className="auth-wrap">
      <div className="card">
        <h1>Welcome back</h1>
        <p className="muted">Login to continue to your account.</p>
        {signedout && (
          <div className="error" role="alert" style={{ marginBottom: 12 }}>
            You have been signed out. Each account can only be logged in on one device at a time — if you logged in on another device, this one was logged out. Please log in again.
          </div>
        )}
        <AuthForm action={login} />
      </div>
      <p className="muted" style={{ textAlign: "center" }}>New here? <Link href="/signup">Create an account</Link></p>
    </div>
  );
}
