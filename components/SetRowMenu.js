"use client";

import { useEffect, useRef, useState } from "react";
import EditTestForm from "@/components/EditTestForm";
import { togglePublish, copyTest, deleteTest } from "@/app/actions";

// 3-dot menu for a set row: Edit (pop-up with name and details), Publish/Unpublish, Copy, Delete.
export default function SetRowMenu({ id, published, title, test, categories }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pos, setPos] = useState({});
  const btn = useRef(null);
  // The list is position:fixed so the set list's scroll area cannot clip it; it flips up near the screen bottom.
  const toggle = () => {
    if (!open && btn.current) {
      const r = btn.current.getBoundingClientRect();
      const up = window.innerHeight - r.bottom < 220;
      setPos({ position: "fixed", right: Math.max(8, window.innerWidth - r.right), ...(up ? { bottom: window.innerHeight - r.top + 4, top: "auto" } : { top: r.bottom + 4 }) });
    }
    setOpen((o) => !o);
  };
  useEffect(() => {
    if (!editing) return;
    const onKey = (e) => e.key === "Escape" && setEditing(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);
  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="setmenu-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`Options for ${title}`} ref={btn} onClick={toggle}>⋮</button>
      {open && (
        <>
          <div className="setmenu-shade" onClick={() => setOpen(false)} />
          <div className="setmenu-list" role="menu" style={{ minWidth: 160, ...pos }}>
            <button type="button" role="menuitem" onClick={() => { setOpen(false); setEditing(true); }}>Edit</button>
            <form action={togglePublish}><input type="hidden" name="id" value={id} /><button role="menuitem">{published ? "Unpublish" : "Publish"}</button></form>
            <form action={copyTest}><input type="hidden" name="id" value={id} /><button role="menuitem">Copy</button></form>
            <form action={deleteTest} onSubmit={(e) => { if (!confirm(`Delete "${title}"? This cannot be undone.`)) e.preventDefault(); }}>
              <input type="hidden" name="id" value={id} /><button role="menuitem" style={{ color: "var(--danger, #c62828)" }}>Delete</button>
            </form>
          </div>
        </>
      )}
      {editing && (
        <div className="modal-backdrop edit-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setEditing(false)}>
          <div className="wizard" role="dialog" aria-modal="true" aria-label={`Edit ${title}`}>
            <div className="wizard-head">
              <h2>Edit set</h2>
              <button type="button" className="sm" onClick={() => setEditing(false)} aria-label="Close">✕</button>
            </div>
            <EditTestForm test={test} categories={categories} onSaved={() => setEditing(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
