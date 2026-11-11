"use client";

import { useActionState, useEffect, useState } from "react";
import { copyCategory, deleteCategory, renameCategory, setCategoryPrice, setCategoryTime } from "@/app/actions";
import DurationFields from "@/components/DurationFields";
import { formatDuration } from "@/lib/duration";

// Category settings: default price (sets made paid inside it use it) and time limit (every set inside it uses it).
// A 3-dot menu opens a pop-up for each.
export default function CategoryPrice({ category, name, cat, paidCount, total }) {
  const [state, action, pending] = useActionState(setCategoryPrice, null);
  const [dismissedAt, setDismissedAt] = useState(0);
  const [menu, setMenu] = useState(false);
  const [up, setUp] = useState(false); // open the menu upward when there is no room below the button
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState(0);
  const [tState, tAction, tPending] = useActionState(setCategoryTime, null);
  const [tDismissedAt, setTDismissedAt] = useState(0);
  const [tOpen, setTOpen] = useState(false);
  const [tSeenAt, setTSeenAt] = useState(0);
  const [rState, rAction, rPending] = useActionState(renameCategory, null);
  const [rOpen, setROpen] = useState(false);
  const [rSeenAt, setRSeenAt] = useState(0);
  const [rDismissedAt, setRDismissedAt] = useState(0);
  const rToast = rState && rState.at !== rDismissedAt ? rState : null;
  const toast = state && state.at !== dismissedAt ? state : null;
  const tToast = tState && tState.at !== tDismissedAt ? tState : null;

  // Close a pop-up once its save succeeds (adjust state during render, not in an effect).
  if (state && state.at !== seenAt) {
    setSeenAt(state.at);
    if (state.ok) setOpen(false);
  }
  if (rState && rState.at !== rSeenAt) {
    setRSeenAt(rState.at);
    if (rState.ok) setROpen(false);
  }
  if (tState && tState.at !== tSeenAt) {
    setTSeenAt(tState.at);
    if (tState.ok) setTOpen(false);
  }

  useEffect(() => {
    if (!state) return;
    const t = setTimeout(() => setDismissedAt(state.at), 3500);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    if (!tState) return;
    const t = setTimeout(() => setTDismissedAt(tState.at), 3500);
    return () => clearTimeout(t);
  }, [tState]);

  useEffect(() => {
    if (!rState) return;
    const t = setTimeout(() => setRDismissedAt(rState.at), 3500);
    return () => clearTimeout(t);
  }, [rState]);

  useEffect(() => {
    if (!open && !tOpen && !rOpen) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      setTOpen(false);
      setROpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, tOpen, rOpen]);

  const priced = cat?.price !== null && cat?.price !== undefined;
  const limit = Number(cat?.duration_seconds) || 0;
  return (
    <div className="row" style={{ gap: 8, alignItems: "center", position: "relative" }}>
      <span className={`badge ${priced ? "ok" : ""}`}>
        {priced ? `Price ${Number(cat.price)} · ${cat.days}d · ${paidCount}/${total} sets paid` : "No price set"}
      </span>
      {limit > 0 && <span className="badge">{formatDuration(limit)}</span>}
      <button type="button" className="setmenu-btn" aria-haspopup="menu" aria-expanded={menu} aria-label="Category options" onClick={(e) => { setUp(window.innerHeight - e.currentTarget.getBoundingClientRect().bottom < 260); setMenu((m) => !m); }}>⋮</button>
      {menu && (
        <>
          <div className="setmenu-shade" onClick={() => setMenu(false)} />
          <div className={`setmenu-list${up ? " up" : ""}`} role="menu">
            <button type="button" role="menuitem" onClick={() => { setMenu(false); setROpen(true); }}><span className="mi">✎</span>Rename / sub name</button>
            <button type="button" role="menuitem" onClick={() => { setMenu(false); setOpen(true); }}><span className="mi">₹</span>Price / days</button>
            <button type="button" role="menuitem" onClick={() => { setMenu(false); setTOpen(true); }}><span className="mi">⏱</span>Set time limit</button>
            <form action={copyCategory} onSubmit={(e) => { if (!confirm(`Copy "${name}" with all its sets?`)) e.preventDefault(); }}>
              <input type="hidden" name="category" value={category} />
              <button role="menuitem"><span className="mi">⧉</span>Copy category</button>
            </form>
            <div className="menu-sep" />
            <form action={deleteCategory} onSubmit={(e) => { if (!confirm(`Delete category "${name}" and all ${total} set(s) in it, with their questions and results? This cannot be undone.`)) e.preventDefault(); }}>
              <input type="hidden" name="category" value={category} />
              <button role="menuitem" className="menu-danger"><span className="mi">🗑</span>Delete category</button>
            </form>
          </div>
        </>
      )}
      <div className="modal-backdrop edit-backdrop" hidden={!open} onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
        <form action={action} className="wizard" role="dialog" aria-modal="true" aria-label="Category price">
          <div className="wizard-head">
            <h2>Price · {name}</h2>
            <button type="button" className="sm" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>
          <input type="hidden" name="target" value={category} />
          <div className="stack">
            <label>Days<input name="days" type="number" min="1" defaultValue={cat?.days ?? 5} /></label>
            <label>Original price<input name="original_price" type="number" min="0" step="0.01" defaultValue={cat?.original_price ?? ""} /></label>
            <label>Price<input name="price" type="number" min="0" step="0.01" placeholder="No price" defaultValue={cat?.price ?? ""} /></label>
          </div>
          <div className="wizard-actions">
            <button className="primary" disabled={pending}>{pending ? "Saving…" : "Save price"}</button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop edit-backdrop" hidden={!tOpen} onMouseDown={(e) => e.target === e.currentTarget && setTOpen(false)}>
        <form action={tAction} className="wizard" role="dialog" aria-modal="true" aria-label="Category time limit">
          <div className="wizard-head">
            <h2>Time limit · {name}</h2>
            <button type="button" className="sm" onClick={() => setTOpen(false)} aria-label="Close">✕</button>
          </div>
          <input type="hidden" name="target" value={category} />
          <div className="stack">
            <DurationFields seconds={limit} optional />
            <div className="muted">Applies to every set in this category, including sets added later. Leave empty for no limit.</div>
          </div>
          <div className="wizard-actions">
            <button className="primary" disabled={tPending}>{tPending ? "Saving…" : "Save time limit"}</button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop edit-backdrop" hidden={!rOpen} onMouseDown={(e) => e.target === e.currentTarget && setROpen(false)}>
        <form action={rAction} className="wizard" role="dialog" aria-modal="true" aria-label="Rename category">
          <div className="wizard-head">
            <h2>Category name</h2>
            <button type="button" className="sm" onClick={() => setROpen(false)} aria-label="Close">✕</button>
          </div>
          <input type="hidden" name="target" value={category} />
          <div className="stack">
            <label>Category name<input name="name" required maxLength={100} defaultValue={name} autoFocus={rOpen} /></label>
            <label>Sub category name<input name="sub_name" maxLength={100} defaultValue={cat?.sub_name ?? ""} placeholder="Optional, e.g. Nepali 4 days" /></label>
            <div className="muted">Free sets show the category name. Paid sets and packages show the sub category name (leave empty to use the category name).</div>
          </div>
          <div className="wizard-actions">
            <button className="primary" disabled={rPending}>{rPending ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
      {rToast && (
        <div className={`toast ${rToast.ok ? "ok" : "bad"}`} role="status" aria-live="polite">
          <span className="toast-icon">{rToast.ok ? "✓" : "!"}</span>
          {rToast.message}
        </div>
      )}
      {tToast && (
        <div className={`toast ${tToast.ok ? "ok" : "bad"}`} role="status" aria-live="polite">
          <span className="toast-icon">{tToast.ok ? "✓" : "!"}</span>
          {tToast.message}
        </div>
      )}
      {toast && (
        <div className={`toast ${toast.ok ? "ok" : "bad"}`} role="status" aria-live="polite">
          <span className="toast-icon">{toast.ok ? "✓" : "!"}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}
