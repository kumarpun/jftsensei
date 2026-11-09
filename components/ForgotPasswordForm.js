"use client";

import { useActionState } from "react";

export default function ForgotPasswordForm({ action }) {
  const [state, formAction, pending] = useActionState(action, null);
  if (state?.sent) {
    return <div className="notice" role="status">If an account exists for <strong>{state.email}</strong>, we sent a reset link. Check your inbox (and spam). The link expires in 1 hour.</div>;
  }
  return (
    <form action={formAction} className="stack">
      <label>Email<input name="email" type="email" autoComplete="email" autoCapitalize="none" required /></label>
      <button className="primary lg" disabled={pending}>{pending ? "Please wait…" : "Send reset link"}</button>
    </form>
  );
}
