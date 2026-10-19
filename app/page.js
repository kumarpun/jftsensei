import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";

const FEATURES = [
  { icon: "⏱", title: "Timed tests", text: "Real exam conditions with a countdown that auto-submits when time is up." },
  { icon: "⚡", title: "Instant results", text: "Get your score the moment you submit — no waiting around." },
  { icon: "🔍", title: "Review answers", text: "See what you got right, what you missed, and the correct answers." },
];

export default async function Home() {
  const user = await getUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/customer/packages");
  return (
    <>
      <section className="hero">
        <span className="badge">Online mock tests</span>
        <h1 style={{ marginTop: 16 }}>Practice smarter with <span>mock tests</span></h1>
        <p>Take timed tests, track your scores and learn from every attempt. Log in with the username and access code you were given.</p>
        <div className="row">
          <Link href="/login" className="btn primary lg">Login</Link>
        </div>
      </section>
      <section className="grid cols-3" style={{ marginTop: 32 }}>
        {FEATURES.map((f) => (
          <div className="card feature" key={f.title}>
            <div className="icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p className="muted" style={{ margin: 0 }}>{f.text}</p>
          </div>
        ))}
      </section>
    </>
  );
}
