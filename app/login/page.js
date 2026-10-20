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
            <strong>📢 IMPORTANT NOTICE – JFTSENSEI TEAM</strong>
            <p style={{ margin: "8px 0" }}>You were signed out because this account was logged in on another device. Only one device can be logged in per account at a time.</p>
            <p style={{ margin: "8px 0" }}>हजुरहरूको सबै गतिविधि ट्र्याक भइरहेको छ। एउटा अकाउन्टबाट एक जनाले मात्र लगइन गर्नुहोला।</p>
            <p style={{ margin: "8px 0" }}>⚠️ Screenshot, screen recording वा screen sharing गरेको पाइएमा अकाउन्ट बन्द गरी कानुनी कारबाही हुन सक्छ।</p>
            <p style={{ margin: 0 }}>Best of Luck! 🍀<br />JFTSENSEI TEAM</p>
          </div>
        )}
        <AuthForm action={login} />
      </div>
      <p className="muted" style={{ textAlign: "center" }}>New here? <Link href="/signup">Create an account</Link></p>
    </div>
  );
}
