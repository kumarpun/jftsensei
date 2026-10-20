"use client";

import { useActionState, useEffect, useState } from "react";
import { setCategoryPrice } from "@/app/actions";

// Default price for a category: sets made paid inside it use this price.
export default function CategoryPrice({ category, cat, paidCount, total }) {
  const [state, action, pending] = useActionState(setCategoryPrice, null);
  const [dismissedAt, setDismissedAt] = useState(0);
  const toast = state && state.at !== dismissedAt ? state : null;

  useEffect(() => {
    if (!state) return;
    const t = setTimeout(() => setDismissedAt(state.at), 3500);
    return () => clearTimeout(t);
  }, [state]);

  const priced = cat?.price !== null && cat?.price !== undefined;
  return (
    <details className="paid-control">
      <summary className={`badge ${priced ? "ok" : ""}`} style={{ cursor: "pointer" }}>
        {priced ? `Price ${Number(cat.price)} · ${cat.days}d · ${paidCount}/${total} sets paid` : "No price · set category price"}
      </summary>
      <form action={action} className="row" style={{ gap: 6, marginTop: 8, alignItems: "flex-end" }}>
        <input type="hidden" name="target" value={category} />
        <label style={{ width: 64 }}>Days<input name="days" type="number" min="1" required defaultValue={cat?.days ?? 5} /></label>
        <label style={{ width: 84 }}>Original price<input name="original_price" type="number" min="0" step="0.01" defaultValue={cat?.original_price ?? ""} /></label>
        <label style={{ width: 84 }}>Price<input name="price" type="number" min="0" step="0.01" required defaultValue={cat?.price ?? ""} /></label>
        <button className="sm primary" disabled={pending}>{pending ? "Saving…" : "Save price"}</button>
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
