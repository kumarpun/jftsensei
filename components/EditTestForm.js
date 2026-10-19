"use client";

import { useActionState, useEffect, useState } from "react";
import { updateTest } from "@/app/actions";
import CategoryField from "@/components/CategoryField";
import DurationFields from "@/components/DurationFields";

export default function EditTestForm({ test, categories }) {
  const [state, action, pending] = useActionState(updateTest, null);
  const [dismissedAt, setDismissedAt] = useState(0);
  const toast = state && state.at !== dismissedAt ? state : null;

  useEffect(() => {
    if (!state) return;
    const t = setTimeout(() => setDismissedAt(state.at), 3500);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <details className="card">
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>Edit test details &amp; time limit</summary>
      <form action={action} className="stack" style={{ marginTop: 16 }}>
        <input type="hidden" name="id" value={test.id} />
        <label>Title<input name="title" required defaultValue={test.title} /></label>
        <CategoryField categories={categories} defaultValue={test.category} />
        <label>Description<textarea name="description" rows={2} defaultValue={test.description || ""} /></label>
        <label>Google Form link (optional)
          <input name="form_url" type="url" placeholder="https://docs.google.com/forms/..." defaultValue={test.form_url || ""} />
        </label>
        <div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Time limit (minimum 10 seconds)</div>
          <DurationFields seconds={test.duration_seconds} />
        </div>
        <div><button className="primary" disabled={pending}>{pending ? "Saving…" : "Save details"}</button></div>
      </form>
      {toast && (
        <div className={`toast ${toast.ok ? "ok" : "bad"}`} role="status" aria-live="polite">
          <span className="toast-icon">{toast.ok ? "✓" : "!"}</span>
          {toast.message}
        </div>
      )}
    </details>
  );
}
