"use client";

import { useActionState, useState } from "react";
import { createCustomer, resetCustomerCode, deleteCustomer } from "@/app/actions";

function Credentials({ result, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = `Username: ${result.username}\nAccess code: ${result.code}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cred-title">
      <div className="modal">
        <div className="modal-icon ok">🔑</div>
        <h2 id="cred-title">Login credentials</h2>
        <p className="muted">Share these with <strong>{result.name}</strong>. The code is shown only once and can&apos;t be viewed again — you can generate a new one later.</p>
        <div className="cred-box">
          <div><span className="muted">Username</span><strong>{result.username}</strong></div>
          <div><span className="muted">Access code</span><strong className="code">{result.code}</strong></div>
        </div>
        <button type="button" className="primary lg" onClick={copy}>{copied ? "Copied ✓" : "Copy credentials"}</button>
        <button type="button" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

export function CreateCustomerForm() {
  const [state, action, pending] = useActionState(createCustomer, null);
  const [dismissed, setDismissed] = useState(0);
  const show = state?.code && state.at !== dismissed;
  return (
    <form action={action} className="card stack">
      <h3>Create customer login</h3>
      <div className="row">
        <label className="grow" style={{ flex: "1 1 200px" }}>Full name<input name="name" required placeholder="e.g. Aiko Tanaka" /></label>
        <label className="grow" style={{ flex: "1 1 200px" }}>Unique username<input name="username" required placeholder="e.g. aiko.tanaka" autoCapitalize="none" autoComplete="off" /></label>
      </div>
      <p className="muted" style={{ margin: 0 }}>A random access code is generated automatically. Give the customer their username and code to log in.</p>
      {state?.error && <div className="error">{state.error}</div>}
      <div><button className="primary" disabled={pending}>{pending ? "Creating…" : "Generate login"}</button></div>
      {show && <Credentials result={state} onClose={() => setDismissed(state.at)} />}
    </form>
  );
}

export function ResetCodeButton({ id }) {
  const [state, action, pending] = useActionState(resetCustomerCode, null);
  const [dismissed, setDismissed] = useState(0);
  const show = state?.code && state.at !== dismissed;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Generate a new access code? The old code will stop working.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="sm" disabled={pending}>{pending ? "…" : "New code"}</button>
      {show && <Credentials result={state} onClose={() => setDismissed(state.at)} />}
    </form>
  );
}

export function DeleteCustomerButton({ id }) {
  return (
    <form
      action={deleteCustomer}
      onSubmit={(e) => {
        if (!confirm("Delete this customer and all their results?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="sm danger">Delete</button>
    </form>
  );
}
