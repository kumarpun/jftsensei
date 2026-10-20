"use client";

import { useActionState, useEffect, useState } from "react";
import { setSetPaid } from "@/app/actions";

// Free/Paid choice for one set. Paid uses the category's price.
export default function SetPaidSwitch({ testId, paid }) {
  const [state, action, pending] = useActionState(setSetPaid, null);
  const [dismissedAt, setDismissedAt] = useState(0);
  const toast = state && state.at !== dismissedAt ? state : null;

  useEffect(() => {
    if (!state) return;
    const t = setTimeout(() => setDismissedAt(state.at), 3500);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <form action={action} className="card row" style={{ gap: 16, alignItems: "center", marginBottom: 16 }}>
      <input type="hidden" name="id" value={testId} />
      <strong>Access:</strong>
      <label className="row" style={{ gap: 6, flexDirection: "row", alignItems: "center" }}>
        <input type="radio" name="paid" value="0" defaultChecked={!paid} style={{ width: "auto" }} /> Free
      </label>
      <label className="row" style={{ gap: 6, flexDirection: "row", alignItems: "center" }}>
        <input type="radio" name="paid" value="1" defaultChecked={paid} style={{ width: "auto" }} /> Paid (category price)
      </label>
      <button className="sm primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      {toast && (
        <div className={`toast ${toast.ok ? "ok" : "bad"}`} role="status" aria-live="polite">
          <span className="toast-icon">{toast.ok ? "✓" : "!"}</span>
          {toast.message}
        </div>
      )}
    </form>
  );
}
