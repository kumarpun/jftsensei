"use client";

import { useActionState, useState } from "react";

export default function AuthForm({ action, mode = "login" }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [show, setShow] = useState(false);
  const signup = mode === "signup";
  return (
    <form action={formAction} className="stack">
      {signup && <label>Full name<input name="name" autoComplete="name" required defaultValue={state?.name ?? ""} /></label>}
      <label>Email<input name={signup ? "email" : "identifier"} type="email" autoComplete="email" autoCapitalize="none" required defaultValue={(signup ? state?.email : state?.identifier) ?? ""} /></label>
      <label>
        Password
        <span className="pw-wrap">
          <input name="password" type={show ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 6 : undefined} placeholder={signup ? "At least 6 characters" : undefined} />
          <button type="button" className="pw-toggle" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {show ? (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <path d="M1 1l22 22" />
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        </span>
      </label>
      {state?.error && <div className="error">{state.error}</div>}
      <button className="primary lg" disabled={pending}>{pending ? "Please wait…" : signup ? "Create account" : "Login"}</button>
    </form>
  );
}
