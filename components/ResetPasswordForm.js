"use client";

import { useActionState } from "react";

export default function ResetPasswordForm({ action, token }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="token" value={token} />
      <label>New password<input name="password" type="password" autoComplete="new-password" required minLength={6} placeholder="At least 6 characters" /></label>
      {state?.error && <div className="error">{state.error}</div>}
      <button className="primary lg" disabled={pending}>{pending ? "Please wait…" : "Set new password"}</button>
    </form>
  );
}
