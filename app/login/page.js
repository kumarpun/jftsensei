import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import GoogleButton from "@/components/GoogleButton";
import { login } from "@/app/actions";

export default async function LoginPage({ searchParams }) {
  const { signedout, reset, google } = await searchParams;
  return (
    <div className="auth-wrap">
      <div className="card">
        <h1>Welcome back</h1>
        <p className="muted">Login to continue to your account.</p>
        {reset && <div className="notice" role="status" style={{ marginBottom: 12 }}>Password updated. Login with your new password.</div>}
        {signedout && (
          <div className="error" role="alert" style={{ marginBottom: 12 }}>
            <strong>📢 IMPORTANT NOTICE – JFTSENSEI TEAM</strong>
            <p style={{ margin: "8px 0" }}>You were signed out because this account was logged in on another device. Only one device can be logged in per account at a time.</p>
            <p style={{ margin: "8px 0" }}>हजुरहरूको सबै गतिविधि ट्र्याक भइरहेको छ। एउटा अकाउन्टबाट एक जनाले मात्र लगइन गर्नुहोला।</p>
            <p style={{ margin: 0 }}>Best of Luck! 🍀<br />JFTSENSEI TEAM</p>
          </div>
        )}
        {google && <div className="error" role="alert" style={{ marginBottom: 12 }}>{google === "admin" ? "Admin accounts must log in with email and password." : "Google sign-in didn't complete. Please try again."}</div>}
        <GoogleButton />
        <AuthForm action={login} />
        <p className="muted" style={{ textAlign: "center", marginBottom: 0 }}><Link href="/forgot-password">Forgot password?</Link></p>
      </div>
      <p className="muted" style={{ textAlign: "center" }}>New here? <Link href="/signup">Create an account</Link></p>
    </div>
  );
}
