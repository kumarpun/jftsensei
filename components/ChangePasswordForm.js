"use client";

import { useActionState, useEffect, useRef } from "react";

export default function ChangePasswordForm({ action }) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={formAction} className="stack">
      <label>Current password<input name="current" type="password" autoComplete="current-password" required /></label>
      <label>New password<input name="password" type="password" autoComplete="new-password" required minLength={6} placeholder="At least 6 characters" /></label>
      <label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" required minLength={6} /></label>
      {state?.error && <div className="error">{state.error}</div>}
      {state?.ok && <div className="notice" role="status">Password changed. Other devices were signed out.</div>}
      <button className="primary lg" disabled={pending}>{pending ? "Please wait…" : "Change password"}</button>
    </form>
  );
}
