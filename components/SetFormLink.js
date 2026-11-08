"use client";

import { useActionState, useEffect, useState } from "react";
import { setFormLink } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";

// Saves a Google Form link on an existing set and shows a toast with the result.
export default function SetFormLink({ testId, url }) {
  const [state, action] = useActionState(setFormLink, null);
  const [dismissedAt, setDismissedAt] = useState(0);
  const toast = state && state.at !== dismissedAt ? state : null;

  useEffect(() => {
    if (!state) return;
    const t = setTimeout(() => setDismissedAt(state.at), 3500);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <form action={action} className="stack">
      <input type="hidden" name="id" value={testId} />
      <label>Google Form link<input name="form_url" type="url" required placeholder="https://docs.google.com/forms/..." defaultValue={url || ""} /></label>
      <div className="muted">Customers open this link directly instead of taking questions here.</div>
      <div><SubmitButton className="primary" pendingText="Saving…">Save link</SubmitButton></div>
      {toast && (
        <div className={`toast ${toast.ok ? "ok" : "bad"}`} role="status" aria-live="polite">
          <span className="toast-icon">{toast.ok ? "✓" : "!"}</span>
          {toast.message}
        </div>
      )}
    </form>
  );
}
