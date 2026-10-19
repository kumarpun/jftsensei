"use client";

import { useActionState } from "react";

export default function AuthForm({ action }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="stack">
      <label>Username<input name="identifier" autoComplete="username" autoCapitalize="none" required defaultValue={state?.identifier ?? ""} /></label>
      <label>
        Access code
        <input name="password" type="password" autoComplete="current-password" required placeholder="XXXX-XXXX-XXXX" />
      </label>
      {state?.error && <div className="error">{state.error}</div>}
      <button className="primary lg" disabled={pending}>{pending ? "Please wait…" : "Login"}</button>
    </form>
  );
}
