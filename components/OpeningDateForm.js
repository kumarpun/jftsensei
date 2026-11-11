"use client";

import { useActionState, useState } from "react";
import { saveOpeningDate } from "@/app/actions";

const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

// Title + date/time are both required. The picker is in the admin's local time; the form sends an absolute ISO moment.
export default function OpeningDateForm({ label, at }) {
  const [state, action, pending] = useActionState(saveOpeningDate, null);
  const [local, setLocal] = useState(() => toLocalInput(at));
  const iso = local ? new Date(local).toISOString() : "";
  return (
    <form action={action} className="stack">
      <label>Title<input name="label" required maxLength={100} defaultValue={label} placeholder="e.g. JFT-Basic Form Opening Date" /></label>
      <label>Opens on<input type="datetime-local" required value={local} onChange={(e) => setLocal(e.target.value)} /></label>
      <input type="hidden" name="at" value={iso} />
      {state && <div className={state.ok ? "muted" : ""} style={state.ok ? undefined : { color: "var(--danger)" }} role="status">{state.message}</div>}
      <div className="row" style={{ gap: 8 }}>
        <button className="btn primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        {label && <button className="btn" name="clear" value="1" formNoValidate disabled={pending}>Remove</button>}
      </div>
    </form>
  );
}
